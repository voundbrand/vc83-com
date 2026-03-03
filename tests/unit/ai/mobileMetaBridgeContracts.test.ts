import { describe, expect, it } from 'vitest';

import {
  buildGeminiLiveMetadata,
  createDefaultMetaBridgeSnapshot,
  evaluateVisionSourceReadiness,
  mapVisionReadinessReasonToConversationReason,
  negotiateVisionSource,
} from '../../../apps/operator-mobile/src/lib/av/metaBridge-contracts';

describe('mobile meta bridge contracts', () => {
  it('keeps iPhone source mode available even when Meta bridge is disconnected', () => {
    const bridge = createDefaultMetaBridgeSnapshot(1_701_000_000_000);

    const readiness = evaluateVisionSourceReadiness({
      sourceMode: 'iphone',
      bridge,
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.reasonCode).toBe('iphone_source_ready');
  });

  it('fails closed in Meta source mode when bridge is unavailable', () => {
    const bridge = createDefaultMetaBridgeSnapshot(1_701_000_000_000);

    const readiness = evaluateVisionSourceReadiness({
      sourceMode: 'meta_glasses',
      bridge,
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.reasonCode).toBe('meta_bridge_not_connected');
  });

  it('requires meta_glasses source class for bridge trust', () => {
    const bridge = {
      ...createDefaultMetaBridgeSnapshot(1_701_000_000_000),
      connectionState: 'connected' as const,
      datSdkAvailable: true,
      activeDevice: {
        sourceId: 'iphone_camera:ios_avfoundation:front_camera',
        sourceClass: 'meta_glasses' as const,
        providerId: 'meta_dat_bridge',
        deviceId: 'meta_device_1',
        deviceLabel: 'Ray-Ban Meta',
      },
    };

    const readiness = evaluateVisionSourceReadiness({
      sourceMode: 'meta_glasses',
      bridge,
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.reasonCode).toBe('meta_bridge_healthy');
  });

  it('fails closed in Meta source mode when DAT SDK is unavailable despite active bridge/device', () => {
    const bridge = {
      ...createDefaultMetaBridgeSnapshot(1_701_000_000_000),
      connectionState: 'connected' as const,
      datSdkAvailable: false,
      activeDevice: {
        sourceId: 'meta_glasses:meta_dat_bridge:rayban_meta',
        sourceClass: 'meta_glasses' as const,
        providerId: 'meta_dat_bridge',
        deviceId: 'meta_device_1',
        deviceLabel: 'Ray-Ban Meta',
      },
    };

    const readiness = evaluateVisionSourceReadiness({
      sourceMode: 'meta_glasses',
      bridge,
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.reasonCode).toBe('meta_bridge_dat_sdk_unavailable');
    expect(mapVisionReadinessReasonToConversationReason(readiness.reasonCode)).toBe('dat_sdk_unavailable');
  });

  it('negotiates preferred Meta source and falls back to iPhone when Meta is unavailable', () => {
    const bridge = createDefaultMetaBridgeSnapshot(1_701_000_000_000);
    const negotiation = negotiateVisionSource({
      preferredSourceMode: 'meta_glasses',
      bridge,
    });

    expect(negotiation.ready).toBe(true);
    expect(negotiation.selectedSourceMode).toBe('iphone');
    expect(negotiation.conversationReasonCode).toBe('device_unavailable');
  });

  it('enriches Gemini metadata with bridge diagnostics only for Meta source mode', () => {
    const bridge = {
      ...createDefaultMetaBridgeSnapshot(1_701_000_000_000),
      connectionState: 'connected' as const,
      datSdkAvailable: true,
      activeDevice: {
        sourceId: 'meta_glasses:meta_dat_bridge:rayban_meta',
        sourceClass: 'meta_glasses' as const,
        providerId: 'meta_dat_bridge',
        deviceId: 'meta_device_rb_meta',
        deviceLabel: 'Ray-Ban Meta',
      },
      frameIngress: {
        fps: 29.97,
        totalFrames: 200,
        droppedFrames: 3,
        lastFrameTs: 1_701_000_100_000,
      },
      audioIngress: {
        sampleRate: 16_000,
        packetCount: 420,
        lastPacketTs: 1_701_000_100_100,
      },
    };

    const iphonePayload = buildGeminiLiveMetadata({
      sourceMode: 'iphone',
      bridge,
    });
    const metaPayload = buildGeminiLiveMetadata({
      sourceMode: 'meta_glasses',
      bridge,
    });

    expect(iphonePayload.bridgeDiagnostics).toBeUndefined();
    expect(metaPayload.bridgeDiagnostics).toMatchObject({
      connectionState: 'connected',
      frameIngress: {
        totalFrames: 200,
        droppedFrames: 3,
      },
      audioIngress: {
        sampleRate: 16_000,
        packetCount: 420,
      },
    });
  });
});
