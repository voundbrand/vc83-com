import {
  createDefaultMetaBridgeSnapshot,
  type MetaBridgeSnapshot,
} from './metaBridge-contracts';
import {
  NativeEventEmitter as ReactNativeEventEmitter,
  NativeModules as ReactNativeNativeModules,
} from 'react-native';

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
  return {
    NativeEventEmitter: ReactNativeEventEmitter as unknown as ReactNativeMetaBridgeAdapter['NativeEventEmitter'],
    NativeModules: ReactNativeNativeModules as unknown as Record<string, unknown>,
  };
}

const { NativeEventEmitter, NativeModules } = resolveReactNativeAdapter();

const nativeBridge: NativeMetaGlassesBridge | undefined =
  NativeModules[MODULE_NAME] as NativeMetaGlassesBridge | undefined;

// Native DAT integrations should publish runtime events via platform hooks:
// Android -> MetaGlassesBridgeRuntimeHooks, iOS -> MetaGlassesBridgeRuntime.

function fallbackSnapshot(reasonCode: string): MetaBridgeSnapshot {
  return {
    ...createDefaultMetaBridgeSnapshot(),
    failure: {
      reasonCode,
      message: 'Meta bridge native module unavailable.',
      recoverable: true,
      atMs: Date.now(),
    },
  };
}

async function callNative(
  runner: (module: NativeMetaGlassesBridge) => Promise<MetaBridgeSnapshot>,
): Promise<MetaBridgeSnapshot> {
  if (!nativeBridge) {
    return fallbackSnapshot('native_module_unavailable');
  }

  try {
    return await runner(nativeBridge);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...fallbackSnapshot('native_bridge_call_failed'),
      failure: {
        reasonCode: 'native_bridge_call_failed',
        message,
        recoverable: true,
        atMs: Date.now(),
      },
    };
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
      (snapshot: MetaBridgeSnapshot) => {
        listener(snapshot);
      },
    );

    return () => {
      subscription.remove();
    };
  },
};

export type { MetaBridgeSnapshot } from './metaBridge-contracts';
