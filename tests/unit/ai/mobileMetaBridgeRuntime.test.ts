import { beforeEach, describe, expect, it, vi } from "vitest";

type StatusListener = (snapshot: Record<string, unknown>) => void;

describe("mobile meta bridge runtime integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    (globalThis as { __META_BRIDGE_RN__?: unknown }).__META_BRIDGE_RN__ = undefined;
  });

  it("fails closed when native bridge module is unavailable", async () => {
    (globalThis as { __META_BRIDGE_RN__?: unknown }).__META_BRIDGE_RN__ = {
      NativeModules: {},
      NativeEventEmitter: class {
        addListener() {
          return { remove() {} };
        }
      },
    };

    const { metaBridge } = await import(
      "../../../apps/operator-mobile/src/lib/av/metaBridge"
    );
    const snapshot = await metaBridge.connect();

    expect(snapshot.connectionState).toBe("disconnected");
    expect(snapshot.failure?.reasonCode).toBe("native_module_unavailable");
  });

  it("propagates DAT status events from native runtime to JS listeners", async () => {
    const listenersByEvent = new Map<string, Set<StatusListener>>();
    const snapshot = {
      connectionState: "connected",
      activeDevice: {
        sourceId: "meta_glasses:meta_dat_bridge:rayban_meta",
        sourceClass: "meta_glasses",
        providerId: "meta_dat_bridge",
        deviceId: "meta_device_1",
        deviceLabel: "Ray-Ban Meta",
      },
      frameIngress: {
        fps: 24,
        totalFrames: 48,
        droppedFrames: 1,
      },
      audioIngress: {
        sampleRate: 16_000,
        packetCount: 32,
      },
      failure: null,
      updatedAtMs: 1_701_000_000_000,
    };

    const nativeModule = {
      connect: vi.fn(async () => snapshot),
      disconnect: vi.fn(async () => snapshot),
      getStatus: vi.fn(async () => snapshot),
      recordFrameIngress: vi.fn(async () => snapshot),
      recordAudioIngress: vi.fn(async () => snapshot),
    };

    (globalThis as { __META_BRIDGE_RN__?: unknown }).__META_BRIDGE_RN__ = {
      NativeModules: {
        MetaGlassesBridge: nativeModule,
      },
      NativeEventEmitter: class {
        addListener(eventName: string, listener: StatusListener) {
          const listeners = listenersByEvent.get(eventName) || new Set<StatusListener>();
          listeners.add(listener);
          listenersByEvent.set(eventName, listeners);
          return {
            remove() {
              listeners.delete(listener);
            },
          };
        }
      },
    };

    const { metaBridge } = await import(
      "../../../apps/operator-mobile/src/lib/av/metaBridge"
    );

    const emitted: Array<Record<string, unknown>> = [];
    const unsubscribe = metaBridge.subscribe((status) => {
      emitted.push(status as unknown as Record<string, unknown>);
    });

    const listeners = listenersByEvent.get("metaBridgeStatusDidChange");
    expect(listeners?.size).toBe(1);
    listeners?.forEach((listener) => listener(snapshot));

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.connectionState).toBe("connected");
    expect(
      (emitted[0]?.activeDevice as { sourceId?: string } | undefined)?.sourceId
    ).toBe("meta_glasses:meta_dat_bridge:rayban_meta");

    unsubscribe();
  });
});
