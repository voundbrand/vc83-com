import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MetaBridgeObservabilityService,
} from '../../../apps/operator-mobile/src/lib/av/metaBridge-observability';
import { createDefaultMetaBridgeSnapshot } from '../../../apps/operator-mobile/src/lib/av/metaBridge-contracts';

type TestStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function createMemoryStorage(): TestStorage {
  const store = new Map<string, string>();
  return {
    async getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
  };
}

function createSnapshot(updatedAtMs: number) {
  return {
    ...createDefaultMetaBridgeSnapshot(updatedAtMs),
    connectionState: 'connected' as const,
    datSdkAvailable: true,
    diagnostics: {
      platform: 'ios' as const,
      permissions: {
        bluetooth: 'granted',
      },
      discoveredDevices: [],
      pairedDevices: [],
    },
    frameIngress: {
      fps: 24,
      totalFrames: 64,
      droppedFrames: 0,
    },
    audioIngress: {
      sampleRate: 24_000,
      packetCount: 10,
    },
  };
}

describe('meta bridge observability service', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('captures idle snapshots on cadence, dedupes unchanged content, and pauses in background', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    let appStateListener: ((state: string) => void) | null = null;
    const flushAsyncWork = async () => {
      await Promise.resolve();
      await Promise.resolve();
    };
    const service = new MetaBridgeObservabilityService({
      storage: createMemoryStorage(),
      nowMs: () => Date.now(),
      appStateAdapter: {
        addEventListener: (_eventType, listener) => {
          appStateListener = listener;
          return { remove: () => {} };
        },
      },
    });

    await service.recordSnapshot(createSnapshot(1_700_000_000_000));
    expect(service.getStatus().persistedEventCount).toBe(0);

    await vi.advanceTimersByTimeAsync(15_000);
    await flushAsyncWork();
    expect(service.getStatus().persistedEventCount).toBe(1);

    await vi.advanceTimersByTimeAsync(15_000);
    await flushAsyncWork();
    expect(service.getStatus().persistedEventCount).toBe(1);

    appStateListener?.('background');
    expect((service as unknown as { snapshotTimer: unknown }).snapshotTimer).toBeNull();

    await vi.advanceTimersByTimeAsync(45_000);
    await flushAsyncWork();
    expect(service.getStatus().persistedEventCount).toBe(1);

    appStateListener?.('active');
    expect((service as unknown as { snapshotTimer: unknown }).snapshotTimer).not.toBeNull();

    const changedSnapshot = {
      ...createSnapshot(1_700_000_100_000),
      frameIngress: {
        fps: 24,
        totalFrames: 65,
        droppedFrames: 0,
      },
    };
    await service.recordSnapshot(changedSnapshot);
    expect(service.getStatus().persistedEventCount).toBe(2);
  });

  it('exports with deterministic fallback order', async () => {
    const fileSystem = {
      cacheDirectory: 'file:///tmp/',
      documentDirectory: null,
      EncodingType: {
        UTF8: 'utf8',
      },
      writeAsStringAsync: vi.fn(async () => {}),
    };
    const fileService = new MetaBridgeObservabilityService({
      storage: createMemoryStorage(),
      nowMs: () => 1_700_000_000_000,
      fileSystemResolver: () => fileSystem,
    });

    const fileShare = await fileService.exportLogsWithFallback({
      tryShareFile: async (file) => ({
        ok: file.uri.startsWith('file:///tmp/meta-bridge-observability-'),
        reason: 'shared file',
      }),
      tryShareJson: async () => ({ ok: true, reason: 'json shared' }),
      tryClipboard: async () => ({ ok: true, reason: 'clipboard' }),
    });
    expect(fileShare.ok).toBe(true);
    expect(fileShare.strategy).toBe('file_share');
    expect(fileShare.uri).toContain('meta-bridge-observability-');

    const service = new MetaBridgeObservabilityService({
      storage: createMemoryStorage(),
      nowMs: () => 1_700_000_000_000,
      fileSystemResolver: () => null,
    });

    const jsonFallback = await service.exportLogsWithFallback({
      tryShareFile: async () => ({ ok: false, reason: 'file unavailable' }),
      tryShareJson: async () => ({ ok: true, reason: 'shared json' }),
      tryClipboard: async () => ({ ok: true, reason: 'clipboard' }),
    });
    expect(jsonFallback.ok).toBe(true);
    expect(jsonFallback.strategy).toBe('json_share');
    expect(jsonFallback.reason).toBe('shared json');

    const clipboardFallback = await service.exportLogsWithFallback({
      tryShareFile: async () => ({ ok: false, reason: 'file unavailable' }),
      tryShareJson: async () => ({ ok: false, reason: 'share unavailable' }),
      tryClipboard: async () => ({ ok: true, reason: 'copied to clipboard' }),
    });
    expect(clipboardFallback.ok).toBe(true);
    expect(clipboardFallback.strategy).toBe('clipboard');

    const failedFallback = await service.exportLogsWithFallback({
      tryShareFile: async () => ({ ok: false, reason: 'file unavailable' }),
      tryShareJson: async () => ({ ok: false, reason: 'share unavailable' }),
      tryClipboard: async () => ({ ok: false, reason: 'clipboard unavailable' }),
    });
    expect(failedFallback.ok).toBe(false);
    expect(failedFallback.strategy).toBe('failed');
    expect(failedFallback.reason).toContain('Clipboard fallback failed');
  });
});
