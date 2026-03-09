import {
  DEFAULT_META_BRIDGE_MAX_PERSISTED_BYTES,
  DEFAULT_META_BRIDGE_PERSISTED_EVENT_LIMIT,
  DEFAULT_META_BRIDGE_SNAPSHOT_INTERVAL_MS,
  DEFAULT_META_BRIDGE_UPLOAD_BASE_BACKOFF_MS,
  DEFAULT_META_BRIDGE_UPLOAD_BATCH_SIZE,
  DEFAULT_META_BRIDGE_UPLOAD_MAX_BACKOFF_MS,
  DEFAULT_META_BRIDGE_UPLOAD_MAX_FREQUENCY_MS,
  buildSnapshotFingerprint,
  buildSnapshotFingerprintFromPersistedEvent,
  createEmptyPersistedLogBundle,
  createEmptyUploadQueueState,
  createPersistedEventFromDebugEvent,
  createSnapshotPersistedEvent,
  executeExportFallbackChain,
  enforceRetentionPolicy,
  executeUploadAttempt,
  normalizePersistedBundle,
  normalizeUploadQueueState,
  pruneQueueToRetainedEvents,
  queueEventIds,
  type MetaBridgeExportAttemptResult,
  type MetaBridgeExportFallbackResult,
  type MetaBridgePersistedLogBundle,
  type MetaBridgePersistedLogEvent,
  type MetaBridgeUploadQueueState,
} from './metaBridge-observability-core';
import { createDefaultMetaBridgeSnapshot, type MetaBridgeSnapshot } from './metaBridge-contracts';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type AppStateSubscription = {
  remove: () => void;
};

type AppStateAdapter = {
  addEventListener: (
    eventType: 'change',
    listener: (state: string) => void
  ) => AppStateSubscription;
};

type FileSystemLegacyAdapter = {
  cacheDirectory: string | null;
  documentDirectory: string | null;
  EncodingType?: {
    UTF8?: string;
  };
  writeAsStringAsync: (
    fileUri: string,
    content: string,
    options?: Record<string, unknown>
  ) => Promise<void>;
  deleteAsync?: (fileUri: string, options?: Record<string, unknown>) => Promise<void>;
};

type MetaBridgeObservabilityPreferences = {
  persistentCaptureEnabled: boolean;
  remoteUploadEnabled: boolean;
};

export type MetaBridgeObservabilityStatus = {
  initialized: boolean;
  persistentCaptureEnabled: boolean;
  remoteUploadEnabled: boolean;
  remoteUploadConfigured: boolean;
  persistedEventCount: number;
  persistedSizeBytes: number;
  queuedUploadCount: number;
  lastUploadAtMs: number | null;
  lastUploadError: string | null;
  nextRetryAtMs: number | null;
  isUploadInFlight: boolean;
  lastStorageError: string | null;
};

export type MetaBridgeExportResult = {
  uri: string;
  payload: string;
  eventCount: number;
  sizeBytes: number;
};

export type MetaBridgeExportPayload = {
  payload: string;
  eventCount: number;
  sizeBytes: number;
};

export type MetaBridgeExportWithFallbackResult = MetaBridgeExportFallbackResult & {
  eventCount: number;
  sizeBytes: number;
  uri: string | null;
};

type MetaBridgeExportFallbackAdapters = {
  tryShareFile: (file: MetaBridgeExportResult) => Promise<MetaBridgeExportAttemptResult>;
  tryShareJson: (jsonPayload: MetaBridgeExportPayload) => Promise<MetaBridgeExportAttemptResult>;
  tryClipboard: (jsonPayload: MetaBridgeExportPayload) => Promise<MetaBridgeExportAttemptResult>;
};

const STORAGE_KEYS = {
  bundle: '@meta_bridge_observability_bundle_v1',
  queue: '@meta_bridge_observability_upload_queue_v1',
  preferences: '@meta_bridge_observability_preferences_v1',
} as const;

const DEFAULT_PREFERENCES: MetaBridgeObservabilityPreferences = {
  persistentCaptureEnabled: true,
  remoteUploadEnabled: false,
};
const DEFAULT_META_BRIDGE_UPLOAD_ENDPOINT =
  'https://app.l4yercak3.com/api/v1/mobile/meta-bridge-observability';

const inMemoryStorageMap = new Map<string, string>();

function inMemoryStorage(): StorageAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      return inMemoryStorageMap.has(key) ? (inMemoryStorageMap.get(key) as string) : null;
    },
    async setItem(key: string, value: string): Promise<void> {
      inMemoryStorageMap.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      inMemoryStorageMap.delete(key);
    },
  };
}

function resolveStorageAdapter(): StorageAdapter {
  try {
    const asyncStorageModule = require('@react-native-async-storage/async-storage') as {
      default?: StorageAdapter;
    };
    if (asyncStorageModule?.default) {
      return asyncStorageModule.default;
    }
  } catch {
    // Non-RN runtime.
  }
  return inMemoryStorage();
}

function resolveAppStateAdapter(): AppStateAdapter | null {
  try {
    const reactNativeModule = require('react-native') as {
      AppState?: AppStateAdapter;
    };
    if (reactNativeModule.AppState) {
      return reactNativeModule.AppState;
    }
  } catch {
    // Non-RN runtime.
  }
  return null;
}

function resolveLegacyFileSystem(): FileSystemLegacyAdapter | null {
  try {
    return require('expo-file-system/legacy') as FileSystemLegacyAdapter;
  } catch {
    // Continue with fallback path.
  }
  try {
    return require('expo/node_modules/expo-file-system/legacy') as FileSystemLegacyAdapter;
  } catch {
    // Non-Expo runtime.
  }
  return null;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function normalizePreferences(
  value: unknown
): MetaBridgeObservabilityPreferences {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_PREFERENCES };
  }
  const payload = value as Record<string, unknown>;
  return {
    persistentCaptureEnabled: toBoolean(
      payload.persistentCaptureEnabled,
      DEFAULT_PREFERENCES.persistentCaptureEnabled
    ),
    remoteUploadEnabled: toBoolean(
      payload.remoteUploadEnabled,
      DEFAULT_PREFERENCES.remoteUploadEnabled
    ),
  };
}

function readNumberEnv(
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = process.env[key];
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function readStringEnv(key: string, fallback: string = ''): string {
  const raw = process.env[key];
  if (typeof raw !== 'string') {
    return fallback;
  }
  return raw.trim();
}

const OBSERVABILITY_LIMITS = {
  persistedEventLimit: readNumberEnv(
    'EXPO_PUBLIC_META_BRIDGE_PERSISTED_EVENT_LIMIT',
    DEFAULT_META_BRIDGE_PERSISTED_EVENT_LIMIT,
    100,
    20_000
  ),
  maxPersistedBytes: readNumberEnv(
    'EXPO_PUBLIC_META_BRIDGE_MAX_PERSISTED_BYTES',
    DEFAULT_META_BRIDGE_MAX_PERSISTED_BYTES,
    32_768,
    8_000_000
  ),
  snapshotIntervalMs: readNumberEnv(
    'EXPO_PUBLIC_META_BRIDGE_SNAPSHOT_INTERVAL_MS',
    DEFAULT_META_BRIDGE_SNAPSHOT_INTERVAL_MS,
    2_000,
    120_000
  ),
  uploadBatchSize: readNumberEnv(
    'EXPO_PUBLIC_META_BRIDGE_UPLOAD_BATCH_SIZE',
    DEFAULT_META_BRIDGE_UPLOAD_BATCH_SIZE,
    1,
    500
  ),
  uploadMaxFrequencyMs: readNumberEnv(
    'EXPO_PUBLIC_META_BRIDGE_UPLOAD_MAX_FREQUENCY_MS',
    DEFAULT_META_BRIDGE_UPLOAD_MAX_FREQUENCY_MS,
    1_000,
    300_000
  ),
  uploadBaseBackoffMs: readNumberEnv(
    'EXPO_PUBLIC_META_BRIDGE_UPLOAD_BASE_BACKOFF_MS',
    DEFAULT_META_BRIDGE_UPLOAD_BASE_BACKOFF_MS,
    250,
    60_000
  ),
  uploadMaxBackoffMs: readNumberEnv(
    'EXPO_PUBLIC_META_BRIDGE_UPLOAD_MAX_BACKOFF_MS',
    DEFAULT_META_BRIDGE_UPLOAD_MAX_BACKOFF_MS,
    1_000,
    3_600_000
  ),
  uploadQueueLimit: readNumberEnv(
    'EXPO_PUBLIC_META_BRIDGE_UPLOAD_QUEUE_LIMIT',
    DEFAULT_META_BRIDGE_PERSISTED_EVENT_LIMIT * 3,
    100,
    40_000
  ),
};

const PERSIST_DEBOUNCE_MS = 600;
const FORCE_UPLOAD_BATCHES = 3;
const BACKGROUND_UPLOAD_BATCHES = 1;

type MetaBridgeObservabilityDependencies = {
  storage?: StorageAdapter;
  appStateAdapter?: AppStateAdapter | null;
  fileSystemResolver?: () => FileSystemLegacyAdapter | null;
  fetchImpl?: typeof fetch;
  nowMs?: () => number;
};

export class MetaBridgeObservabilityService {
  private readonly storage: StorageAdapter;
  private readonly appStateAdapter: AppStateAdapter | null;
  private readonly fileSystemResolver: () => FileSystemLegacyAdapter | null;
  private readonly fetchImpl: typeof fetch;
  private readonly nowMs: () => number;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private mutationQueue: Promise<void> = Promise.resolve();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: AppStateSubscription | null = null;
  private subscribers = new Set<(status: MetaBridgeObservabilityStatus) => void>();

  private bundle: MetaBridgePersistedLogBundle = createEmptyPersistedLogBundle();
  private queueState: MetaBridgeUploadQueueState = createEmptyUploadQueueState();
  private preferences: MetaBridgeObservabilityPreferences = { ...DEFAULT_PREFERENCES };
  private knownEventIds = new Set<string>();
  private lastSnapshotCaptureAtMs = 0;
  private lastSnapshotFingerprint: string | null = null;
  private latestSnapshot: MetaBridgeSnapshot | null = null;
  private isAppActive = true;
  private persistedSizeBytes = 0;
  private dirty = false;
  private isUploadInFlight = false;
  private lastStorageError: string | null = null;

  constructor(dependencies: MetaBridgeObservabilityDependencies = {}) {
    this.storage = dependencies.storage || resolveStorageAdapter();
    this.appStateAdapter = dependencies.appStateAdapter ?? resolveAppStateAdapter();
    this.fileSystemResolver = dependencies.fileSystemResolver || resolveLegacyFileSystem;
    this.fetchImpl = dependencies.fetchImpl || fetch;
    this.nowMs = dependencies.nowMs || (() => Date.now());
  }

  private get uploadEndpoint(): string {
    return readStringEnv(
      'EXPO_PUBLIC_META_BRIDGE_LOG_UPLOAD_ENDPOINT',
      DEFAULT_META_BRIDGE_UPLOAD_ENDPOINT
    );
  }

  private get uploadApiKey(): string {
    return readStringEnv('EXPO_PUBLIC_META_BRIDGE_LOG_UPLOAD_API_KEY', '');
  }

  private get isUploadConfigured(): boolean {
    return this.uploadEndpoint.length > 0;
  }

  private emitStatus(): void {
    const status = this.getStatus();
    for (const listener of this.subscribers) {
      listener(status);
    }
  }

  private attachAppStateListener(): void {
    if (this.appStateSubscription) {
      return;
    }
    if (!this.appStateAdapter) {
      return;
    }
    this.appStateSubscription = this.appStateAdapter.addEventListener('change', (state: string) => {
      this.isAppActive = state === 'active';
      this.syncSnapshotTimer();
      if (state === 'active') {
        void this.enqueueMutation(async () => {
          await this.maybeUpload(false);
        });
        return;
      }
      void this.flushToStorage(true);
    });
  }

  private enqueueMutation(
    task: () => Promise<void> | void
  ): Promise<void> {
    this.mutationQueue = this.mutationQueue
      .then(() => task())
      .catch((error) => {
        this.lastStorageError =
          error instanceof Error ? error.message : String(error);
      });
    return this.mutationQueue;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        const [bundleRaw, queueRaw, preferencesRaw] = await Promise.all([
          this.storage.getItem(STORAGE_KEYS.bundle),
          this.storage.getItem(STORAGE_KEYS.queue),
          this.storage.getItem(STORAGE_KEYS.preferences),
        ]);

        this.bundle = normalizePersistedBundle(
          bundleRaw ? JSON.parse(bundleRaw) : null
        );
        this.queueState = normalizeUploadQueueState(
          queueRaw ? JSON.parse(queueRaw) : null
        );
        this.preferences = normalizePreferences(
          preferencesRaw ? JSON.parse(preferencesRaw) : null
        );
      } catch (error) {
        this.lastStorageError =
          error instanceof Error ? error.message : String(error);
        this.bundle = createEmptyPersistedLogBundle();
        this.queueState = createEmptyUploadQueueState();
        this.preferences = { ...DEFAULT_PREFERENCES };
      }

      this.recomputeDerivedState();
      this.initialized = true;
      this.attachAppStateListener();
      if (this.dirty) {
        this.schedulePersist();
      }
      this.syncSnapshotTimer();
      this.emitStatus();
      await this.maybeUpload(false);
    })();

    await this.initializationPromise;
  }

  private recomputeDerivedState(): void {
    const retainedQueue = pruneQueueToRetainedEvents({
      queueEventIds: this.queueState.queueEventIds,
      retainedEvents: this.bundle.events,
    });
    if (retainedQueue.length !== this.queueState.queueEventIds.length) {
      this.queueState = {
        ...this.queueState,
        queueEventIds: retainedQueue,
      };
      this.dirty = true;
    }

    this.knownEventIds = new Set(this.bundle.events.map((event) => event.id));
    let latestSnapshotEvent: MetaBridgePersistedLogEvent | null = null;
    for (const event of this.bundle.events) {
      if (event.kind !== 'snapshot') {
        continue;
      }
      if (!latestSnapshotEvent || event.atMs >= latestSnapshotEvent.atMs) {
        latestSnapshotEvent = event;
      }
    }
    this.lastSnapshotCaptureAtMs = latestSnapshotEvent?.atMs || 0;
    this.lastSnapshotFingerprint = latestSnapshotEvent
      ? buildSnapshotFingerprintFromPersistedEvent(latestSnapshotEvent)
      : null;
    if (latestSnapshotEvent) {
      const details = (
        latestSnapshotEvent.details
        && typeof latestSnapshotEvent.details === 'object'
        && !Array.isArray(latestSnapshotEvent.details)
      )
        ? latestSnapshotEvent.details as Record<string, unknown>
        : {};
      const defaultSnapshot = createDefaultMetaBridgeSnapshot(this.nowMs());
      this.latestSnapshot = {
        ...defaultSnapshot,
        connectionState: latestSnapshotEvent.connectionState,
        diagnostics: latestSnapshotEvent.diagnostics,
        failure:
          details.failure && typeof details.failure === 'object'
            ? (details.failure as MetaBridgeSnapshot['failure'])
            : null,
        fallbackReason:
          typeof details.fallbackReason === 'string'
            ? details.fallbackReason
            : undefined,
        activeDevice:
          details.activeDevice && typeof details.activeDevice === 'object'
            ? (details.activeDevice as MetaBridgeSnapshot['activeDevice'])
            : null,
        frameIngress:
          details.frameIngress && typeof details.frameIngress === 'object'
            ? (details.frameIngress as MetaBridgeSnapshot['frameIngress'])
            : defaultSnapshot.frameIngress,
        audioIngress:
          details.audioIngress && typeof details.audioIngress === 'object'
            ? (details.audioIngress as MetaBridgeSnapshot['audioIngress'])
            : defaultSnapshot.audioIngress,
        updatedAtMs:
          typeof details.updatedAtMs === 'number' && Number.isFinite(details.updatedAtMs)
            ? Math.floor(details.updatedAtMs)
            : latestSnapshotEvent.atMs,
      };
    } else {
      this.latestSnapshot = null;
    }

    const retention = enforceRetentionPolicy({
      existing: [],
      incoming: this.bundle.events,
      maxEvents: OBSERVABILITY_LIMITS.persistedEventLimit,
      maxBytes: OBSERVABILITY_LIMITS.maxPersistedBytes,
    });
    if (retention.bundle.events.length !== this.bundle.events.length) {
      this.dirty = true;
    }
    this.bundle = retention.bundle;
    this.persistedSizeBytes = retention.byteSize;
    this.queueState = {
      ...this.queueState,
      lastFailureCategory: this.queueState.lastFailureCategory || null,
    };
  }

  private schedulePersist(): void {
    if (this.persistTimer) {
      return;
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.flushToStorage(false);
    }, PERSIST_DEBOUNCE_MS);
  }

  private scheduleRetryUpload(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (!this.queueState.nextRetryAtMs) {
      return;
    }
    const delayMs = Math.max(250, this.queueState.nextRetryAtMs - this.nowMs());
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.enqueueMutation(async () => {
        await this.maybeUpload(false);
      });
    }, delayMs);
  }

  private clearSnapshotTimer(): void {
    if (!this.snapshotTimer) {
      return;
    }
    clearTimeout(this.snapshotTimer);
    this.snapshotTimer = null;
  }

  private syncSnapshotTimer(): void {
    if (
      !this.initialized
      || !this.preferences.persistentCaptureEnabled
      || !this.isAppActive
      || !this.latestSnapshot
    ) {
      this.clearSnapshotTimer();
      return;
    }
    if (this.snapshotTimer) {
      return;
    }

    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null;
      void this.enqueueMutation(async () => {
        await this.initialize();
        const incoming: MetaBridgePersistedLogEvent[] = [];
        this.captureSnapshotIfDue(this.nowMs(), this.latestSnapshot, incoming);
        this.appendEvents(incoming);
        await this.maybeUpload(false);
        this.syncSnapshotTimer();
      });
    }, OBSERVABILITY_LIMITS.snapshotIntervalMs);
  }

  private captureSnapshotIfDue(
    nowMs: number,
    snapshot: MetaBridgeSnapshot | null,
    incoming: MetaBridgePersistedLogEvent[]
  ): void {
    if (!snapshot) {
      return;
    }
    if ((nowMs - this.lastSnapshotCaptureAtMs) < OBSERVABILITY_LIMITS.snapshotIntervalMs) {
      return;
    }

    const fingerprint = buildSnapshotFingerprint(snapshot);
    this.lastSnapshotCaptureAtMs = nowMs;
    if (fingerprint === this.lastSnapshotFingerprint) {
      return;
    }

    incoming.push(createSnapshotPersistedEvent({
      snapshot,
      atMs: nowMs,
    }));
    this.lastSnapshotFingerprint = fingerprint;
  }

  private async flushToStorage(force: boolean): Promise<void> {
    await this.initialize();
    if (!force && !this.dirty) {
      return;
    }
    try {
      await Promise.all([
        this.storage.setItem(STORAGE_KEYS.bundle, JSON.stringify(this.bundle)),
        this.storage.setItem(STORAGE_KEYS.queue, JSON.stringify(this.queueState)),
        this.storage.setItem(STORAGE_KEYS.preferences, JSON.stringify(this.preferences)),
      ]);
      this.lastStorageError = null;
      this.dirty = false;
    } catch (error) {
      this.lastStorageError =
        error instanceof Error ? error.message : String(error);
    }
    this.emitStatus();
  }

  private async maybeUpload(force: boolean): Promise<void> {
    if (!this.preferences.remoteUploadEnabled || !this.isUploadConfigured) {
      return;
    }
    if (this.isUploadInFlight) {
      return;
    }
    if (this.queueState.queueEventIds.length === 0) {
      return;
    }

    this.isUploadInFlight = true;
    this.emitStatus();

    try {
      const maxBatches = force ? FORCE_UPLOAD_BATCHES : BACKGROUND_UPLOAD_BATCHES;
      for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
        const result = await executeUploadAttempt({
          nowMs: this.nowMs(),
          force,
          queueState: this.queueState,
          bundle: this.bundle,
          config: {
            batchSize: OBSERVABILITY_LIMITS.uploadBatchSize,
            maxFrequencyMs: OBSERVABILITY_LIMITS.uploadMaxFrequencyMs,
            baseBackoffMs: OBSERVABILITY_LIMITS.uploadBaseBackoffMs,
            maxBackoffMs: OBSERVABILITY_LIMITS.uploadMaxBackoffMs,
          },
          transport: async (payload) => {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            if (this.uploadApiKey) {
              headers['x-api-key'] = this.uploadApiKey;
              headers['Authorization'] = `Bearer ${this.uploadApiKey}`;
            }

            const response = await this.fetchImpl(this.uploadEndpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
            });
            const body = await response.text().catch(() => '');
            return {
              ok: response.ok,
              status: response.status,
              body: body.slice(0, 600),
            };
          },
        });

        this.queueState = result.state;
        this.dirty = true;
        this.emitStatus();

        if (!result.attempted) {
          break;
        }
        if (result.uploadedCount === 0) {
          break;
        }
        if (this.queueState.queueEventIds.length === 0) {
          break;
        }
      }
    } finally {
      this.isUploadInFlight = false;
      this.scheduleRetryUpload();
      this.schedulePersist();
      this.emitStatus();
    }
  }

  private appendEvents(incoming: MetaBridgePersistedLogEvent[]): void {
    if (incoming.length === 0) {
      return;
    }

    const retention = enforceRetentionPolicy({
      existing: this.bundle.events,
      incoming,
      maxEvents: OBSERVABILITY_LIMITS.persistedEventLimit,
      maxBytes: OBSERVABILITY_LIMITS.maxPersistedBytes,
      nowMs: this.nowMs(),
    });
    this.bundle = retention.bundle;
    this.persistedSizeBytes = retention.byteSize;
    this.knownEventIds = new Set(this.bundle.events.map((event) => event.id));

    if (this.preferences.remoteUploadEnabled && this.isUploadConfigured) {
      const retainedIds = new Set(this.bundle.events.map((event) => event.id));
      const retainedIncoming = incoming.filter((event) => retainedIds.has(event.id));
      this.queueState = {
        ...this.queueState,
        queueEventIds: queueEventIds({
          queueEventIds: this.queueState.queueEventIds,
          incomingEvents: retainedIncoming,
          maxQueueSize: OBSERVABILITY_LIMITS.uploadQueueLimit,
        }),
      };
    } else {
      this.queueState = {
        ...this.queueState,
        queueEventIds: pruneQueueToRetainedEvents({
          queueEventIds: this.queueState.queueEventIds,
          retainedEvents: this.bundle.events,
        }),
      };
    }

    this.dirty = true;
    this.schedulePersist();
    this.emitStatus();
  }

  async recordSnapshot(snapshot: MetaBridgeSnapshot): Promise<void> {
    await this.enqueueMutation(async () => {
      await this.initialize();
      this.latestSnapshot = snapshot;
      this.syncSnapshotTimer();
      if (!this.preferences.persistentCaptureEnabled) {
        await this.maybeUpload(false);
        return;
      }

      const incoming: MetaBridgePersistedLogEvent[] = [];
      for (const event of snapshot.debugEvents || []) {
        const persisted = createPersistedEventFromDebugEvent({
          event,
          snapshot,
        });
        if (this.knownEventIds.has(persisted.id)) {
          continue;
        }
        incoming.push(persisted);
      }

      const nowMs = this.nowMs();
      this.captureSnapshotIfDue(nowMs, snapshot, incoming);

      this.appendEvents(incoming);
      this.syncSnapshotTimer();
      await this.maybeUpload(false);
    });
  }

  async setPersistentCaptureEnabled(enabled: boolean): Promise<void> {
    await this.enqueueMutation(async () => {
      await this.initialize();
      this.preferences = {
        ...this.preferences,
        persistentCaptureEnabled: enabled,
      };
      this.dirty = true;
      if (!enabled) {
        this.lastSnapshotCaptureAtMs = 0;
      }
      this.syncSnapshotTimer();
      this.schedulePersist();
      this.emitStatus();
    });
  }

  async setRemoteUploadEnabled(enabled: boolean): Promise<void> {
    await this.enqueueMutation(async () => {
      await this.initialize();
      const normalizedEnabled = enabled && this.isUploadConfigured;
      this.preferences = {
        ...this.preferences,
        remoteUploadEnabled: normalizedEnabled,
      };

      if (normalizedEnabled) {
        this.queueState = {
          ...this.queueState,
          queueEventIds: queueEventIds({
            queueEventIds: this.queueState.queueEventIds,
            incomingEvents: this.bundle.events,
            maxQueueSize: OBSERVABILITY_LIMITS.uploadQueueLimit,
          }),
        };
      }

      this.dirty = true;
      this.schedulePersist();
      this.emitStatus();
      await this.maybeUpload(false);
    });
  }

  async clearPersistedLogs(): Promise<void> {
    await this.enqueueMutation(async () => {
      await this.initialize();
      this.bundle = createEmptyPersistedLogBundle();
      this.queueState = {
        ...createEmptyUploadQueueState(),
      };
      this.persistedSizeBytes = 0;
      this.knownEventIds.clear();
      this.lastSnapshotCaptureAtMs = 0;
      this.lastSnapshotFingerprint = null;
      this.dirty = true;
      this.syncSnapshotTimer();
      await this.flushToStorage(true);
      this.emitStatus();
    });
  }

  async uploadNow(): Promise<void> {
    await this.enqueueMutation(async () => {
      await this.initialize();
      await this.maybeUpload(true);
      await this.flushToStorage(true);
    });
  }

  async buildExportPayload(): Promise<MetaBridgeExportPayload> {
    await this.initialize();
    await this.flushToStorage(true);

    return {
      payload: JSON.stringify(
        {
          schemaVersion: 1,
          exportedAtMs: this.nowMs(),
          configuration: {
            persistentCaptureEnabled: this.preferences.persistentCaptureEnabled,
            remoteUploadEnabled: this.preferences.remoteUploadEnabled,
            remoteUploadConfigured: this.isUploadConfigured,
            persistedEventLimit: OBSERVABILITY_LIMITS.persistedEventLimit,
            maxPersistedBytes: OBSERVABILITY_LIMITS.maxPersistedBytes,
            uploadBatchSize: OBSERVABILITY_LIMITS.uploadBatchSize,
            uploadMaxFrequencyMs: OBSERVABILITY_LIMITS.uploadMaxFrequencyMs,
          },
          status: this.getStatus(),
          queueState: this.queueState,
          bundle: this.bundle,
        },
        null,
        2
      ),
      eventCount: this.bundle.events.length,
      sizeBytes: this.persistedSizeBytes,
    };
  }

  private async writeExportPayloadToFile(
    jsonPayload: MetaBridgeExportPayload
  ): Promise<MetaBridgeExportResult> {
    const fileSystem = this.fileSystemResolver();
    if (!fileSystem) {
      throw new Error('File system module unavailable.');
    }

    const directory = fileSystem.cacheDirectory || fileSystem.documentDirectory;
    if (!directory) {
      throw new Error('No writable export directory available.');
    }

    const timestamp = new Date(this.nowMs()).toISOString().replace(/[:.]/g, '-');
    const fileUri = `${directory}meta-bridge-observability-${timestamp}.json`;
    await fileSystem.writeAsStringAsync(fileUri, jsonPayload.payload, {
      encoding: fileSystem.EncodingType?.UTF8 || 'utf8',
    });

    return {
      uri: fileUri,
      payload: jsonPayload.payload,
      eventCount: jsonPayload.eventCount,
      sizeBytes: jsonPayload.sizeBytes,
    };
  }

  async exportLogsToFile(): Promise<MetaBridgeExportResult> {
    const exportPayload = await this.buildExportPayload();
    return this.writeExportPayloadToFile(exportPayload);
  }

  async exportLogsWithFallback(
    adapters: MetaBridgeExportFallbackAdapters
  ): Promise<MetaBridgeExportWithFallbackResult> {
    const exportPayload = await this.buildExportPayload();
    let exportedFileUri: string | null = null;

    const result = await executeExportFallbackChain({
      tryFileShare: async () => {
        try {
          const fileResult = await this.writeExportPayloadToFile(exportPayload);
          exportedFileUri = fileResult.uri;
          return adapters.tryShareFile(fileResult);
        } catch (error) {
          return {
            ok: false,
            reason: error instanceof Error ? error.message : 'File export unavailable.',
          };
        }
      },
      tryJsonShare: async () => adapters.tryShareJson(exportPayload),
      tryClipboard: async () => adapters.tryClipboard(exportPayload),
    });

    return {
      ...result,
      eventCount: exportPayload.eventCount,
      sizeBytes: exportPayload.sizeBytes,
      uri: exportedFileUri,
    };
  }

  getStatus(): MetaBridgeObservabilityStatus {
    return {
      initialized: this.initialized,
      persistentCaptureEnabled: this.preferences.persistentCaptureEnabled,
      remoteUploadEnabled: this.preferences.remoteUploadEnabled,
      remoteUploadConfigured: this.isUploadConfigured,
      persistedEventCount: this.bundle.events.length,
      persistedSizeBytes: this.persistedSizeBytes,
      queuedUploadCount: this.queueState.queueEventIds.length,
      lastUploadAtMs: this.queueState.lastUploadAtMs,
      lastUploadError: this.queueState.lastError,
      nextRetryAtMs: this.queueState.nextRetryAtMs,
      isUploadInFlight: this.isUploadInFlight,
      lastStorageError: this.lastStorageError,
    };
  }

  subscribe(
    listener: (status: MetaBridgeObservabilityStatus) => void
  ): () => void {
    this.subscribers.add(listener);
    listener(this.getStatus());
    void this.initialize();
    return () => {
      this.subscribers.delete(listener);
    };
  }
}

export const metaBridgeObservability = new MetaBridgeObservabilityService();
