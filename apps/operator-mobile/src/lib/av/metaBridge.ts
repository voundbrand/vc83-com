import {
  createDefaultMetaBridgeSnapshot,
  type MetaBridgeSnapshot,
} from './metaBridge-contracts';

type FrameIngressInput = {
  timestampMs?: number;
  droppedFrames?: number;
};

type AudioIngressInput = {
  timestampMs?: number;
  sampleRate?: number;
  packets?: number;
};

type NativeMetaGlassesBridge = {
  connect: () => Promise<MetaBridgeSnapshot>;
  disconnect: () => Promise<MetaBridgeSnapshot>;
  getStatus: () => Promise<MetaBridgeSnapshot>;
  recordFrameIngress: (payload: FrameIngressInput) => Promise<MetaBridgeSnapshot>;
  recordAudioIngress: (payload: AudioIngressInput) => Promise<MetaBridgeSnapshot>;
};

type ReactNativeMetaBridgeAdapter = {
  NativeModules: Record<string, unknown>;
  NativeEventEmitter: new (module: unknown) => {
    addListener: (
      eventName: string,
      listener: (payload: MetaBridgeSnapshot) => void,
    ) => { remove: () => void };
  };
};

declare global {
  var __META_BRIDGE_RN__: ReactNativeMetaBridgeAdapter | undefined;
}

const MODULE_NAME = 'MetaGlassesBridge';
const STATUS_EVENT_NAME = 'metaBridgeStatusDidChange';

function resolveReactNativeAdapter(): ReactNativeMetaBridgeAdapter {
  if (globalThis.__META_BRIDGE_RN__) {
    return globalThis.__META_BRIDGE_RN__;
  }
  try {
    const reactNativeModule = require('react-native') as {
      NativeEventEmitter?: ReactNativeMetaBridgeAdapter['NativeEventEmitter'];
      NativeModules?: Record<string, unknown>;
    };
    if (reactNativeModule.NativeEventEmitter && reactNativeModule.NativeModules) {
      return {
        NativeEventEmitter: reactNativeModule.NativeEventEmitter,
        NativeModules: reactNativeModule.NativeModules,
      };
    }
  } catch {
    // Ignore non-RN runtimes.
  }

  class NoopNativeEventEmitter {
    addListener() {
      return { remove: () => {} };
    }
  }

  return {
    NativeEventEmitter: NoopNativeEventEmitter as unknown as ReactNativeMetaBridgeAdapter['NativeEventEmitter'],
    NativeModules: {},
  };
}

const { NativeEventEmitter, NativeModules } = resolveReactNativeAdapter();

const nativeBridge: NativeMetaGlassesBridge | undefined =
  NativeModules[MODULE_NAME] as NativeMetaGlassesBridge | undefined;

// Native DAT integrations should publish runtime events via platform hooks:
// Android -> MetaGlassesBridgeRuntimeHooks, iOS -> MetaGlassesBridgeRuntime.

function normalizeSnapshot(snapshot: Partial<MetaBridgeSnapshot> | null | undefined): MetaBridgeSnapshot {
  const base = createDefaultMetaBridgeSnapshot();
  if (!snapshot) {
    return {
      ...base,
      datSdkAvailable: Boolean(nativeBridge),
    };
  }

  return {
    ...base,
    ...snapshot,
    datSdkAvailable:
      typeof snapshot.datSdkAvailable === 'boolean'
        ? snapshot.datSdkAvailable
        : Boolean(nativeBridge),
    activeDevice: snapshot.activeDevice ?? null,
    frameIngress: {
      ...base.frameIngress,
      ...(snapshot.frameIngress || {}),
    },
    audioIngress: {
      ...base.audioIngress,
      ...(snapshot.audioIngress || {}),
    },
    failure: snapshot.failure ?? null,
  };
}

function fallbackSnapshot(reasonCode: string): MetaBridgeSnapshot {
  return normalizeSnapshot({
    ...createDefaultMetaBridgeSnapshot(),
    failure: {
      reasonCode,
      message: 'Meta bridge native module unavailable.',
      recoverable: true,
      atMs: Date.now(),
    },
  });
}

async function callNative(
  runner: (module: NativeMetaGlassesBridge) => Promise<MetaBridgeSnapshot>,
): Promise<MetaBridgeSnapshot> {
  if (!nativeBridge) {
    return fallbackSnapshot('native_module_unavailable');
  }

  try {
    return normalizeSnapshot(await runner(nativeBridge));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return normalizeSnapshot({
      ...fallbackSnapshot('native_bridge_call_failed'),
      failure: {
        reasonCode: 'native_bridge_call_failed',
        message,
        recoverable: true,
        atMs: Date.now(),
      },
    });
  }
}

export const metaBridge = {
  isNativeAvailable(): boolean {
    return Boolean(nativeBridge);
  },

  async connect(): Promise<MetaBridgeSnapshot> {
    return callNative((module) => module.connect());
  },

  async disconnect(): Promise<MetaBridgeSnapshot> {
    return callNative((module) => module.disconnect());
  },

  async getStatus(): Promise<MetaBridgeSnapshot> {
    return callNative((module) => module.getStatus());
  },

  async recordFrameIngress(payload: FrameIngressInput): Promise<MetaBridgeSnapshot> {
    return callNative((module) => module.recordFrameIngress(payload));
  },

  async recordAudioIngress(payload: AudioIngressInput): Promise<MetaBridgeSnapshot> {
    return callNative((module) => module.recordAudioIngress(payload));
  },

  subscribe(listener: (snapshot: MetaBridgeSnapshot) => void): () => void {
    if (!nativeBridge) {
      return () => {};
    }

    const emitter = new NativeEventEmitter(nativeBridge as never);
    const subscription = emitter.addListener(
      STATUS_EVENT_NAME,
      (snapshot: Partial<MetaBridgeSnapshot>) => {
        listener(normalizeSnapshot(snapshot));
      },
    );

    return () => {
      subscription.remove();
    };
  },
};

export type { MetaBridgeSnapshot } from './metaBridge-contracts';
