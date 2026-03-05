import { describe, expect, it, vi } from 'vitest';

import {
  META_BRIDGE_UPLOAD_CONTRACT_VERSION,
  buildMetaBridgeUploadPayload,
  createEmptyPersistedLogBundle,
  createPersistedEventFromDebugEvent,
  createSnapshotPersistedEvent,
  createEmptyUploadQueueState,
  enforceRetentionPolicy,
  executeExportFallbackChain,
  executeUploadAttempt,
  redactSensitiveFields,
  serializePersistedBundle,
  validateMetaBridgeUploadPayload,
  type MetaBridgePersistedLogEvent,
} from '../../../apps/operator-mobile/src/lib/av/metaBridge-observability-core';
import type { MetaBridgeSnapshot } from '../../../apps/operator-mobile/src/lib/av/metaBridge-contracts';

function buildEvent(eventId: string, atMs: number): MetaBridgePersistedLogEvent {
  return {
    id: eventId,
    kind: 'debug_event',
    atMs,
    stage: 'status',
    severity: 'info',
    code: 'event',
    message: `Event ${eventId}`,
    details: { marker: eventId },
    connectionState: 'connected',
    diagnostics: {
      platform: 'ios',
      permissions: {
        bluetooth: 'granted',
      },
      discoveredDevices: [],
      pairedDevices: [],
    },
  };
}

describe('meta bridge observability core', () => {
  it('serializes and normalizes bridge debug payloads with snapshot context', () => {
    const snapshot: MetaBridgeSnapshot = {
      connectionState: 'connected',
      datSdkAvailable: true,
      activeDevice: null,
      frameIngress: {
        fps: 24,
        totalFrames: 64,
        droppedFrames: 1,
      },
      audioIngress: {
        sampleRate: 16_000,
        packetCount: 50,
      },
      failure: null,
      fallbackReason: undefined,
      diagnostics: {
        platform: 'ios',
        bluetoothAdapterState: 'poweredOn',
        permissions: {
          bluetooth: 'granted',
          camera: 'granted',
          microphone: 'granted',
        },
        discoveredDevices: [],
        pairedDevices: [],
      },
      debugEvents: [],
      updatedAtMs: 1_700_000_000_000,
    };

    const persistedEvent = createPersistedEventFromDebugEvent({
      event: {
        id: 'debug_1',
        atMs: 1_700_000_000_001,
        stage: 'handshake',
        severity: 'warn',
        code: 'bridge_handshake_slow',
        message: 'Bridge handshake took longer than expected.',
        details: {
          ms: 850,
        },
      },
      snapshot,
    });

    const snapshotEvent = createSnapshotPersistedEvent({
      snapshot,
      atMs: 1_700_000_000_010,
    });

    const bundle = createEmptyPersistedLogBundle(1_700_000_000_010);
    bundle.events = [persistedEvent, snapshotEvent];
    const serialized = serializePersistedBundle(bundle);

    expect(serialized).toContain('bridge_handshake_slow');
    expect(serialized).toContain('"connectionState":"connected"');
    expect(persistedEvent.diagnostics.permissions?.camera).toBe('granted');
    expect(snapshotEvent.code).toBe('snapshot');
  });

  it('enforces ring-buffer and byte-size retention limits', () => {
    const existing = Array.from({ length: 1_995 }, (_, index) =>
      buildEvent(`event_${index}`, 1_700_000_000_000 + index)
    );
    const incoming = Array.from({ length: 25 }, (_, index) =>
      buildEvent(`incoming_${index}`, 1_700_000_010_000 + index)
    );

    const retained = enforceRetentionPolicy({
      existing,
      incoming,
      maxEvents: 2_000,
      maxBytes: 32_000,
      nowMs: 1_700_000_020_000,
    });

    expect(retained.bundle.events.length).toBeLessThanOrEqual(2_000);
    expect(retained.byteSize).toBeLessThanOrEqual(32_000);
    expect(retained.droppedCount).toBeGreaterThan(0);
    expect(retained.bundle.events.at(-1)?.id).toBe('incoming_24');
  });

  it('redacts sensitive tokens, auth headers, and pii from payloads', () => {
    const payload = {
      Authorization: 'Bearer abcd.efgh.ijkl',
      apiKey: 'sk-secret-1234',
      details: {
        email: 'operator@example.com',
        nested: {
          sessionToken: 'abc123',
          note: 'Contact me at founder@example.org',
        },
      },
    };

    const redacted = redactSensitiveFields(payload);

    expect(redacted.Authorization).toBe('[REDACTED]');
    expect(redacted.apiKey).toBe('[REDACTED]');
    expect(redacted.details.email).toBe('[REDACTED]');
    expect(redacted.details.nested.sessionToken).toBe('[REDACTED]');
    expect(redacted.details.nested.note).toContain('[REDACTED_EMAIL]');
  });

  it('builds and validates a versioned upload payload contract', () => {
    const payload = buildMetaBridgeUploadPayload({
      nowMs: 1_700_000_000_500,
      events: [buildEvent('evt_1', 1_700_000_000_001)],
    });

    const validation = validateMetaBridgeUploadPayload(payload, {
      allowLegacy: false,
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }
    expect(validation.payload.contractVersion).toBe(META_BRIDGE_UPLOAD_CONTRACT_VERSION);
    expect(validation.payload.source.source).toBe('operator_mobile');
    expect(validation.payload.source.runtime).toBe('expo');
    expect(validation.payload.events).toHaveLength(1);
  });

  it('rejects invalid contract payloads before transport upload', () => {
    const invalidPayload = {
      schemaVersion: 1,
      generatedAtMs: 1_700_000_000_500,
      source: {
        source: 'operator_mobile',
        platform: 'ios',
        runtime: 'expo',
      },
      events: [],
    };

    const validation = validateMetaBridgeUploadPayload(invalidPayload, {
      allowLegacy: false,
    });

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      return;
    }
    expect(validation.error).toContain('contractVersion');
  });

  it('keeps queue on failure and drains it after retry success', async () => {
    const bundle = createEmptyPersistedLogBundle(1_700_000_000_000);
    bundle.events = [buildEvent('evt_1', 1_700_000_000_001), buildEvent('evt_2', 1_700_000_000_002)];

    const failedTransport = vi.fn(async () => ({
      ok: false,
      status: 500,
      body: 'temporary failure',
    }));
    const uploadOkTransport = vi.fn(async () => ({
      ok: true,
      status: 200,
    }));

    const initialState = {
      ...createEmptyUploadQueueState(),
      queueEventIds: ['evt_1', 'evt_2'],
    };

    const failed = await executeUploadAttempt({
      nowMs: 1_700_000_000_100,
      force: true,
      queueState: initialState,
      bundle,
      config: {
        batchSize: 1,
        maxFrequencyMs: 30_000,
        baseBackoffMs: 1_000,
        maxBackoffMs: 60_000,
      },
      transport: failedTransport,
    });

    expect(failed.attempted).toBe(true);
    expect(failed.uploadedCount).toBe(0);
    expect(failed.state.queueEventIds).toEqual(['evt_1', 'evt_2']);
    expect(failed.state.retryCount).toBe(1);
    expect(failed.state.lastFailureCategory).toBe('transient');
    expect(failed.state.nextRetryAtMs).toBeGreaterThan(1_700_000_000_100);

    const skipped = await executeUploadAttempt({
      nowMs: 1_700_000_000_500,
      force: false,
      queueState: failed.state,
      bundle,
      config: {
        batchSize: 1,
        maxFrequencyMs: 30_000,
        baseBackoffMs: 1_000,
        maxBackoffMs: 60_000,
      },
      transport: uploadOkTransport,
    });

    expect(skipped.attempted).toBe(false);
    expect(skipped.skippedReason).toBe('backoff');

    const succeeded = await executeUploadAttempt({
      nowMs: 1_700_000_010_000,
      force: true,
      queueState: failed.state,
      bundle,
      config: {
        batchSize: 1,
        maxFrequencyMs: 30_000,
        baseBackoffMs: 1_000,
        maxBackoffMs: 60_000,
      },
      transport: uploadOkTransport,
    });

    expect(succeeded.attempted).toBe(true);
    expect(succeeded.uploadedCount).toBe(1);
    expect(succeeded.state.queueEventIds).toEqual(['evt_2']);
    expect(succeeded.state.retryCount).toBe(0);
    expect(succeeded.state.lastError).toBeNull();
    expect(succeeded.state.lastFailureCategory).toBeNull();
  });

  it('marks 4xx contract failures as non-retryable until forced', async () => {
    const bundle = createEmptyPersistedLogBundle(1_700_000_000_000);
    bundle.events = [buildEvent('evt_1', 1_700_000_000_001)];

    const contractFailureTransport = vi.fn(async () => ({
      ok: false,
      status: 400,
      body: 'contract mismatch',
    }));
    const successTransport = vi.fn(async () => ({
      ok: true,
      status: 202,
    }));

    const failed = await executeUploadAttempt({
      nowMs: 1_700_000_000_100,
      force: true,
      queueState: {
        ...createEmptyUploadQueueState(),
        queueEventIds: ['evt_1'],
      },
      bundle,
      config: {
        batchSize: 1,
        maxFrequencyMs: 30_000,
        baseBackoffMs: 1_000,
        maxBackoffMs: 60_000,
      },
      transport: contractFailureTransport,
    });

    expect(failed.attempted).toBe(true);
    expect(failed.state.lastFailureCategory).toBe('permanent');
    expect(failed.state.nextRetryAtMs).toBeNull();
    expect(failed.state.queueEventIds).toEqual(['evt_1']);

    const skipped = await executeUploadAttempt({
      nowMs: 1_700_000_030_500,
      force: false,
      queueState: failed.state,
      bundle,
      config: {
        batchSize: 1,
        maxFrequencyMs: 30_000,
        baseBackoffMs: 1_000,
        maxBackoffMs: 60_000,
      },
      transport: successTransport,
    });

    expect(skipped.attempted).toBe(false);
    expect(skipped.skippedReason).toBe('non_retryable');

    const forced = await executeUploadAttempt({
      nowMs: 1_700_000_040_000,
      force: true,
      queueState: failed.state,
      bundle,
      config: {
        batchSize: 1,
        maxFrequencyMs: 30_000,
        baseBackoffMs: 1_000,
        maxBackoffMs: 60_000,
      },
      transport: successTransport,
    });

    expect(forced.attempted).toBe(true);
    expect(forced.uploadedCount).toBe(1);
    expect(forced.state.queueEventIds).toEqual([]);
    expect(forced.state.lastFailureCategory).toBeNull();
  });

  it('uses fallback export chain in deterministic order', async () => {
    const fileShareSuccess = await executeExportFallbackChain({
      tryFileShare: async () => ({ ok: true, reason: 'file shared' }),
      tryJsonShare: async () => ({ ok: true, reason: 'json shared' }),
      tryClipboard: async () => ({ ok: true, reason: 'clipboard' }),
    });
    expect(fileShareSuccess).toEqual({
      ok: true,
      strategy: 'file_share',
      reason: 'file shared',
    });

    const jsonShareFallback = await executeExportFallbackChain({
      tryFileShare: async () => ({ ok: false, reason: 'fs unavailable' }),
      tryJsonShare: async () => ({ ok: true, reason: 'json shared' }),
      tryClipboard: async () => ({ ok: true, reason: 'clipboard' }),
    });
    expect(jsonShareFallback).toEqual({
      ok: true,
      strategy: 'json_share',
      reason: 'json shared',
    });

    const clipboardFallback = await executeExportFallbackChain({
      tryFileShare: async () => ({ ok: false, reason: 'fs unavailable' }),
      tryJsonShare: async () => ({ ok: false, reason: 'share unavailable' }),
      tryClipboard: async () => ({ ok: true, reason: 'clipboard copy' }),
    });
    expect(clipboardFallback).toEqual({
      ok: true,
      strategy: 'clipboard',
      reason: 'clipboard copy',
    });

    const failed = await executeExportFallbackChain({
      tryFileShare: async () => ({ ok: false, reason: 'fs unavailable' }),
      tryJsonShare: async () => ({ ok: false, reason: 'share unavailable' }),
      tryClipboard: async () => ({ ok: false, reason: 'clipboard denied' }),
    });
    expect(failed.ok).toBe(false);
    expect(failed.strategy).toBe('failed');
    expect(failed.reason).toContain('File share fallback failed');
  });
});
