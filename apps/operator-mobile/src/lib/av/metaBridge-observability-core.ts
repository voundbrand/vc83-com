import {
  createDefaultMetaBridgeDiagnostics,
  type MetaBridgeConnectionState,
  type MetaBridgeDebugEvent,
  type MetaBridgeDebugSeverity,
  type MetaBridgeLifecycleStage,
  type MetaBridgeRuntimeDiagnostics,
  type MetaBridgeSnapshot,
} from './metaBridge-contracts';

export const META_BRIDGE_OBSERVABILITY_SCHEMA_VERSION = 1;
export const DEFAULT_META_BRIDGE_PERSISTED_EVENT_LIMIT = 2_000;
export const DEFAULT_META_BRIDGE_MAX_PERSISTED_BYTES = 1_500_000;
export const DEFAULT_META_BRIDGE_SNAPSHOT_INTERVAL_MS = 15_000;
export const DEFAULT_META_BRIDGE_UPLOAD_BATCH_SIZE = 100;
export const DEFAULT_META_BRIDGE_UPLOAD_MAX_FREQUENCY_MS = 60_000;
export const DEFAULT_META_BRIDGE_UPLOAD_BASE_BACKOFF_MS = 2_000;
export const DEFAULT_META_BRIDGE_UPLOAD_MAX_BACKOFF_MS = 5 * 60_000;
export const META_BRIDGE_UPLOAD_CONTRACT_VERSION = 'meta_bridge_observability_upload_v1';
export const META_BRIDGE_UPLOAD_LEGACY_CONTRACT_VERSION = 'meta_bridge_observability_upload_legacy_v0';
export const META_BRIDGE_UPLOAD_SOURCE = 'operator_mobile';

const REDACTED_VALUE = '[REDACTED]';
const REDACTED_EMAIL = '[REDACTED_EMAIL]';
const REDACTED_BEARER = 'Bearer [REDACTED]';
const REDACTED_JWT = '[REDACTED_JWT]';

const SENSITIVE_KEY_PATTERN =
  /token|authorization|auth|api[-_]?key|secret|password|cookie|session|email|phone|ssn|credit|card/i;
const EMAIL_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi;
const BEARER_PATTERN =
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_PATTERN =
  /\b[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g;

export type MetaBridgePersistedLogKind = 'debug_event' | 'snapshot';

export type MetaBridgePersistedLogEvent = {
  id: string;
  kind: MetaBridgePersistedLogKind;
  atMs: number;
  stage: MetaBridgeLifecycleStage;
  severity: MetaBridgeDebugSeverity;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  connectionState: MetaBridgeConnectionState;
  diagnostics: MetaBridgeRuntimeDiagnostics;
};

export type MetaBridgePersistedLogBundle = {
  version: number;
  updatedAtMs: number;
  events: MetaBridgePersistedLogEvent[];
};

export type MetaBridgeUploadSourceMetadata = {
  source: typeof META_BRIDGE_UPLOAD_SOURCE;
  platform: 'ios' | 'android' | 'unknown';
  runtime: 'expo';
};

export type MetaBridgeUploadPayload = {
  contractVersion: string;
  schemaVersion: number;
  generatedAtMs: number;
  source: MetaBridgeUploadSourceMetadata;
  events: MetaBridgePersistedLogEvent[];
};

export type MetaBridgeUploadValidationResult =
  | {
    ok: true;
    payload: MetaBridgeUploadPayload;
  }
  | {
    ok: false;
    error: string;
  };

export type MetaBridgeUploadFailureCategory = 'transient' | 'permanent' | null;

export type MetaBridgeUploadQueueState = {
  queueEventIds: string[];
  retryCount: number;
  lastAttemptAtMs: number | null;
  lastUploadAtMs: number | null;
  lastError: string | null;
  nextRetryAtMs: number | null;
  lastFailureCategory: MetaBridgeUploadFailureCategory;
};

export type MetaBridgeRetentionResult = {
  bundle: MetaBridgePersistedLogBundle;
  byteSize: number;
  droppedCount: number;
};

export type MetaBridgeUploadAttemptConfig = {
  batchSize: number;
  maxFrequencyMs: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
};

export type MetaBridgeUploadAttemptResult = {
  state: MetaBridgeUploadQueueState;
  attempted: boolean;
  uploadedCount: number;
  skippedReason: 'empty_queue' | 'backoff' | 'frequency' | 'non_retryable' | null;
};

export type MetaBridgeUploadTransportResult = {
  ok: boolean;
  status: number;
  body?: string;
};

export type MetaBridgeUploadTransport = (
  payload: MetaBridgeUploadPayload
) => Promise<MetaBridgeUploadTransportResult>;

function cloneDiagnostics(
  diagnostics: MetaBridgeRuntimeDiagnostics | null | undefined
): MetaBridgeRuntimeDiagnostics {
  const base = createDefaultMetaBridgeDiagnostics();
  if (!diagnostics) {
    return base;
  }
  return {
    ...base,
    ...diagnostics,
    permissions: {
      ...(base.permissions || {}),
      ...((diagnostics.permissions || {}) as Record<string, unknown>),
    },
    discoveredDevices: Array.isArray(diagnostics.discoveredDevices)
      ? diagnostics.discoveredDevices.map((entry) => ({ ...entry }))
      : [],
    pairedDevices: Array.isArray(diagnostics.pairedDevices)
      ? diagnostics.pairedDevices.map((entry) => ({ ...entry }))
      : [],
  };
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeAtMs(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.floor(value);
}

function normalizeSeverity(value: unknown): MetaBridgeDebugSeverity {
  if (value === 'warn' || value === 'error') {
    return value;
  }
  return 'info';
}

function normalizeStage(value: unknown): MetaBridgeLifecycleStage {
  const stage = normalizeString(value, 'status');
  const supportedStages: MetaBridgeLifecycleStage[] = [
    'status',
    'initiated',
    'discovering',
    'connecting',
    'handshake',
    'success',
    'failure',
    'disconnecting',
    'disconnected',
  ];
  return supportedStages.includes(stage as MetaBridgeLifecycleStage)
    ? (stage as MetaBridgeLifecycleStage)
    : 'status';
}

function estimateUtf8Bytes(raw: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(raw).length;
  }
  return raw.length * 2;
}

export function createEmptyPersistedLogBundle(
  nowMs: number = Date.now()
): MetaBridgePersistedLogBundle {
  return {
    version: META_BRIDGE_OBSERVABILITY_SCHEMA_VERSION,
    updatedAtMs: nowMs,
    events: [],
  };
}

export function createEmptyUploadQueueState(): MetaBridgeUploadQueueState {
  return {
    queueEventIds: [],
    retryCount: 0,
    lastAttemptAtMs: null,
    lastUploadAtMs: null,
    lastError: null,
    nextRetryAtMs: null,
    lastFailureCategory: null,
  };
}

export function normalizePersistedBundle(
  value: unknown,
  nowMs: number = Date.now()
): MetaBridgePersistedLogBundle {
  if (!value || typeof value !== 'object') {
    return createEmptyPersistedLogBundle(nowMs);
  }

  const payload = value as Record<string, unknown>;
  const events = Array.isArray(payload.events)
    ? payload.events
      .map((entry): MetaBridgePersistedLogEvent | null => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const event = entry as Record<string, unknown>;
        return {
          id: normalizeString(event.id, `meta_bridge_log_${nowMs}`),
          kind: event.kind === 'snapshot' ? 'snapshot' : 'debug_event',
          atMs: normalizeAtMs(event.atMs, nowMs),
          stage: normalizeStage(event.stage),
          severity: normalizeSeverity(event.severity),
          code: normalizeString(event.code, 'event'),
          message: normalizeString(event.message, 'Meta bridge event'),
          details: toRecord(event.details),
          connectionState: normalizeConnectionState(event.connectionState),
          diagnostics: cloneDiagnostics(
            event.diagnostics as MetaBridgeRuntimeDiagnostics | null | undefined
          ),
        };
      })
      .filter((entry): entry is MetaBridgePersistedLogEvent => entry !== null)
    : [];

  return {
    version: META_BRIDGE_OBSERVABILITY_SCHEMA_VERSION,
    updatedAtMs: normalizeAtMs(payload.updatedAtMs, nowMs),
    events,
  };
}

export function normalizeUploadQueueState(value: unknown): MetaBridgeUploadQueueState {
  if (!value || typeof value !== 'object') {
    return createEmptyUploadQueueState();
  }
  const payload = value as Record<string, unknown>;
  const lastFailureCategory =
    payload.lastFailureCategory === 'transient' || payload.lastFailureCategory === 'permanent'
      ? payload.lastFailureCategory
      : null;
  return {
    queueEventIds: Array.isArray(payload.queueEventIds)
      ? payload.queueEventIds.filter((entry): entry is string => typeof entry === 'string')
      : [],
    retryCount:
      typeof payload.retryCount === 'number' && Number.isFinite(payload.retryCount)
        ? Math.max(0, Math.floor(payload.retryCount))
        : 0,
    lastAttemptAtMs:
      typeof payload.lastAttemptAtMs === 'number' && Number.isFinite(payload.lastAttemptAtMs)
        ? Math.floor(payload.lastAttemptAtMs)
        : null,
    lastUploadAtMs:
      typeof payload.lastUploadAtMs === 'number' && Number.isFinite(payload.lastUploadAtMs)
        ? Math.floor(payload.lastUploadAtMs)
        : null,
    lastError: typeof payload.lastError === 'string' ? payload.lastError : null,
    nextRetryAtMs:
      typeof payload.nextRetryAtMs === 'number' && Number.isFinite(payload.nextRetryAtMs)
        ? Math.floor(payload.nextRetryAtMs)
        : null,
    lastFailureCategory,
  };
}

function normalizeConnectionState(value: unknown): MetaBridgeConnectionState {
  if (
    value === 'connected'
    || value === 'connecting'
    || value === 'error'
    || value === 'disconnected'
  ) {
    return value;
  }
  return 'disconnected';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeUploadSourceMetadata(
  value: unknown,
  allowLegacy: boolean
): { ok: true; source: MetaBridgeUploadSourceMetadata } | { ok: false; error: string } {
  if (typeof value === 'string') {
    if (value !== META_BRIDGE_UPLOAD_SOURCE) {
      return {
        ok: false,
        error: `Invalid source value "${value}". Expected "${META_BRIDGE_UPLOAD_SOURCE}".`,
      };
    }
    return {
      ok: true,
      source: {
        source: META_BRIDGE_UPLOAD_SOURCE,
        platform: 'unknown',
        runtime: 'expo',
      },
    };
  }

  if (!isPlainObject(value)) {
    if (allowLegacy) {
      return {
        ok: true,
        source: {
          source: META_BRIDGE_UPLOAD_SOURCE,
          platform: 'unknown',
          runtime: 'expo',
        },
      };
    }
    return {
      ok: false,
      error: 'Missing required source metadata.',
    };
  }

  const source = value.source;
  if (source !== META_BRIDGE_UPLOAD_SOURCE) {
    return {
      ok: false,
      error: `Invalid source metadata. source must equal "${META_BRIDGE_UPLOAD_SOURCE}".`,
    };
  }

  const platformRaw = value.platform;
  const platform = platformRaw === 'ios' || platformRaw === 'android' || platformRaw === 'unknown'
    ? platformRaw
    : null;
  if (!platform) {
    return {
      ok: false,
      error: 'Invalid source metadata. platform must be one of "ios", "android", or "unknown".',
    };
  }

  const runtime = value.runtime === 'expo' ? 'expo' : null;
  if (!runtime) {
    return {
      ok: false,
      error: 'Invalid source metadata. runtime must be "expo".',
    };
  }

  return {
    ok: true,
    source: {
      source: META_BRIDGE_UPLOAD_SOURCE,
      platform,
      runtime,
    },
  };
}

function validatePersistedUploadEvent(
  value: unknown,
  index: number
): { ok: true; event: MetaBridgePersistedLogEvent } | { ok: false; error: string } {
  if (!isPlainObject(value)) {
    return { ok: false, error: `Invalid events[${index}] entry. Expected an object.` };
  }

  const diagnostics = value.diagnostics;
  if (!isPlainObject(diagnostics)) {
    return { ok: false, error: `Invalid events[${index}].diagnostics. Expected an object.` };
  }

  const platform = diagnostics.platform;
  if (platform !== 'ios' && platform !== 'android' && platform !== 'unknown') {
    return {
      ok: false,
      error: `Invalid events[${index}].diagnostics.platform. Expected "ios", "android", or "unknown".`,
    };
  }

  const kind = value.kind === 'snapshot' ? 'snapshot' : value.kind === 'debug_event' ? 'debug_event' : null;
  if (!kind) {
    return {
      ok: false,
      error: `Invalid events[${index}].kind. Expected "debug_event" or "snapshot".`,
    };
  }

  if (!isNonEmptyString(value.id)) {
    return { ok: false, error: `Invalid events[${index}].id. Expected a non-empty string.` };
  }
  if (typeof value.atMs !== 'number' || !Number.isFinite(value.atMs)) {
    return { ok: false, error: `Invalid events[${index}].atMs. Expected a finite number.` };
  }

  const stage = normalizeStage(value.stage);
  if (stage !== value.stage) {
    return {
      ok: false,
      error: `Invalid events[${index}].stage. Unsupported lifecycle stage.`,
    };
  }

  const severity = normalizeSeverity(value.severity);
  if (severity !== value.severity) {
    return {
      ok: false,
      error: `Invalid events[${index}].severity. Expected "info", "warn", or "error".`,
    };
  }

  if (!isNonEmptyString(value.code)) {
    return { ok: false, error: `Invalid events[${index}].code. Expected a non-empty string.` };
  }
  if (!isNonEmptyString(value.message)) {
    return { ok: false, error: `Invalid events[${index}].message. Expected a non-empty string.` };
  }

  const connectionState = normalizeConnectionState(value.connectionState);
  if (connectionState !== value.connectionState) {
    return {
      ok: false,
      error: `Invalid events[${index}].connectionState.`,
    };
  }

  if (value.details !== undefined && !isPlainObject(value.details)) {
    return {
      ok: false,
      error: `Invalid events[${index}].details. Expected an object when provided.`,
    };
  }

  return {
    ok: true,
    event: {
      id: value.id,
      kind,
      atMs: Math.floor(value.atMs),
      stage,
      severity,
      code: value.code,
      message: value.message,
      details: toRecord(value.details),
      connectionState,
      diagnostics: cloneDiagnostics(diagnostics as MetaBridgeRuntimeDiagnostics),
    },
  };
}

export function buildMetaBridgeUploadPayload(args: {
  nowMs: number;
  events: MetaBridgePersistedLogEvent[];
  schemaVersion?: number;
  source?: Partial<MetaBridgeUploadSourceMetadata>;
}): MetaBridgeUploadPayload {
  const platform = args.source?.platform
    || args.events.find((event) => (
      event.diagnostics.platform === 'ios'
      || event.diagnostics.platform === 'android'
      || event.diagnostics.platform === 'unknown'
    ))?.diagnostics.platform
    || 'unknown';
  return {
    contractVersion: META_BRIDGE_UPLOAD_CONTRACT_VERSION,
    schemaVersion: args.schemaVersion ?? META_BRIDGE_OBSERVABILITY_SCHEMA_VERSION,
    generatedAtMs: Math.floor(args.nowMs),
    source: {
      source: META_BRIDGE_UPLOAD_SOURCE,
      platform,
      runtime: 'expo',
    },
    events: args.events.map((event) => ({
      ...event,
      diagnostics: cloneDiagnostics(event.diagnostics),
      details: toRecord(event.details),
    })),
  };
}

export function validateMetaBridgeUploadPayload(
  value: unknown,
  options: {
    allowLegacy?: boolean;
  } = {}
): MetaBridgeUploadValidationResult {
  if (!isPlainObject(value)) {
    return {
      ok: false,
      error: 'Invalid upload payload. Expected an object body.',
    };
  }

  const allowLegacy = options.allowLegacy !== false;
  const contractVersion = isNonEmptyString(value.contractVersion)
    ? value.contractVersion.trim()
    : allowLegacy
      ? META_BRIDGE_UPLOAD_LEGACY_CONTRACT_VERSION
      : '';
  if (!isNonEmptyString(contractVersion)) {
    return {
      ok: false,
      error: 'Missing required contractVersion.',
    };
  }

  const sourceMetadata = normalizeUploadSourceMetadata(value.source, allowLegacy);
  if (!sourceMetadata.ok) {
    return sourceMetadata;
  }

  if (typeof value.schemaVersion !== 'number' || !Number.isFinite(value.schemaVersion)) {
    return {
      ok: false,
      error: 'Invalid schemaVersion. Expected a finite number.',
    };
  }

  if (typeof value.generatedAtMs !== 'number' || !Number.isFinite(value.generatedAtMs)) {
    return {
      ok: false,
      error: 'Invalid generatedAtMs. Expected a finite number.',
    };
  }

  if (!Array.isArray(value.events) || value.events.length === 0) {
    return {
      ok: false,
      error: 'Invalid events array. At least one event is required.',
    };
  }

  const events: MetaBridgePersistedLogEvent[] = [];
  for (let index = 0; index < value.events.length; index += 1) {
    const validatedEvent = validatePersistedUploadEvent(value.events[index], index);
    if (!validatedEvent.ok) {
      return validatedEvent;
    }
    events.push(validatedEvent.event);
  }

  return {
    ok: true,
    payload: {
      contractVersion,
      schemaVersion: Math.floor(value.schemaVersion),
      generatedAtMs: Math.floor(value.generatedAtMs),
      source: sourceMetadata.source,
      events,
    },
  };
}

export function parseMetaBridgeUploadPayload(
  value: unknown,
  options: {
    allowLegacy?: boolean;
  } = {}
): MetaBridgeUploadPayload {
  const validated = validateMetaBridgeUploadPayload(value, options);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  return validated.payload;
}

export function isTransientUploadStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export function createPersistedEventFromDebugEvent(args: {
  event: MetaBridgeDebugEvent;
  snapshot: Pick<MetaBridgeSnapshot, 'connectionState' | 'diagnostics'>;
}): MetaBridgePersistedLogEvent {
  const { event, snapshot } = args;
  return {
    id: `debug:${event.id}`,
    kind: 'debug_event',
    atMs: event.atMs,
    stage: event.stage,
    severity: event.severity,
    code: event.code,
    message: event.message,
    details: toRecord(event.details),
    connectionState: snapshot.connectionState,
    diagnostics: cloneDiagnostics(snapshot.diagnostics),
  };
}

export function createSnapshotPersistedEvent(args: {
  snapshot: Pick<
    MetaBridgeSnapshot,
    | 'connectionState'
    | 'diagnostics'
    | 'failure'
    | 'fallbackReason'
    | 'activeDevice'
    | 'frameIngress'
    | 'audioIngress'
    | 'updatedAtMs'
  >;
  atMs?: number;
}): MetaBridgePersistedLogEvent {
  const atMs = args.atMs ?? Date.now();
  return {
    id: `snapshot:${atMs}`,
    kind: 'snapshot',
    atMs,
    stage: 'status',
    severity: 'info',
    code: 'snapshot',
    message: 'Periodic bridge snapshot',
    details: {
      failure: args.snapshot.failure || undefined,
      fallbackReason: args.snapshot.fallbackReason,
      activeDevice: args.snapshot.activeDevice || undefined,
      frameIngress: args.snapshot.frameIngress,
      audioIngress: args.snapshot.audioIngress,
      updatedAtMs: args.snapshot.updatedAtMs,
    },
    connectionState: args.snapshot.connectionState,
    diagnostics: cloneDiagnostics(args.snapshot.diagnostics),
  };
}

export function buildSnapshotFingerprint(snapshot: Pick<
  MetaBridgeSnapshot,
  | 'connectionState'
  | 'diagnostics'
  | 'failure'
  | 'fallbackReason'
  | 'activeDevice'
  | 'frameIngress'
  | 'audioIngress'
  | 'updatedAtMs'
>): string {
  return JSON.stringify({
    connectionState: snapshot.connectionState,
    diagnostics: cloneDiagnostics(snapshot.diagnostics),
    failure: snapshot.failure || null,
    fallbackReason: snapshot.fallbackReason || null,
    activeDevice: snapshot.activeDevice || null,
    frameIngress: snapshot.frameIngress,
    audioIngress: snapshot.audioIngress,
    updatedAtMs: snapshot.updatedAtMs,
  });
}

export function buildSnapshotFingerprintFromPersistedEvent(
  event: MetaBridgePersistedLogEvent
): string | null {
  if (event.kind !== 'snapshot') {
    return null;
  }
  const details = toRecord(event.details) || {};
  return JSON.stringify({
    connectionState: event.connectionState,
    diagnostics: cloneDiagnostics(event.diagnostics),
    failure: details.failure ?? null,
    fallbackReason: details.fallbackReason ?? null,
    activeDevice: details.activeDevice ?? null,
    frameIngress: details.frameIngress ?? null,
    audioIngress: details.audioIngress ?? null,
    updatedAtMs: details.updatedAtMs ?? null,
  });
}

export function serializePersistedBundle(bundle: MetaBridgePersistedLogBundle): string {
  return JSON.stringify(bundle);
}

export function enforceRetentionPolicy(args: {
  existing: MetaBridgePersistedLogEvent[];
  incoming: MetaBridgePersistedLogEvent[];
  maxEvents: number;
  maxBytes: number;
  nowMs?: number;
}): MetaBridgeRetentionResult {
  const nowMs = args.nowMs ?? Date.now();
  const maxEvents = Math.max(1, Math.floor(args.maxEvents));
  const maxBytes = Math.max(8_192, Math.floor(args.maxBytes));

  const merged = [...args.existing, ...args.incoming];
  const seenIds = new Set<string>();
  const dedupedReverse: MetaBridgePersistedLogEvent[] = [];
  for (let index = merged.length - 1; index >= 0; index -= 1) {
    const entry = merged[index];
    if (seenIds.has(entry.id)) {
      continue;
    }
    seenIds.add(entry.id);
    dedupedReverse.push(entry);
  }
  let retained = dedupedReverse.reverse();

  if (retained.length > maxEvents) {
    retained = retained.slice(retained.length - maxEvents);
  }

  let bundle = normalizePersistedBundle(
    {
      version: META_BRIDGE_OBSERVABILITY_SCHEMA_VERSION,
      updatedAtMs: nowMs,
      events: retained,
    },
    nowMs
  );
  let serialized = serializePersistedBundle(bundle);
  let byteSize = estimateUtf8Bytes(serialized);

  while (bundle.events.length > 0 && byteSize > maxBytes) {
    const trimBy = Math.max(1, Math.ceil(bundle.events.length * 0.05));
    bundle = {
      ...bundle,
      events: bundle.events.slice(trimBy),
    };
    serialized = serializePersistedBundle(bundle);
    byteSize = estimateUtf8Bytes(serialized);
  }

  return {
    bundle,
    byteSize,
    droppedCount: merged.length - bundle.events.length,
  };
}

function redactStringValue(value: string): string {
  let next = value.replace(BEARER_PATTERN, REDACTED_BEARER);
  next = next.replace(JWT_PATTERN, REDACTED_JWT);
  next = next.replace(EMAIL_PATTERN, REDACTED_EMAIL);
  return next;
}

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (depth > 10) {
    return REDACTED_VALUE;
  }
  if (typeof value === 'string') {
    return redactStringValue(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, depth + 1));
  }
  if (typeof value === 'object') {
    const payload = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(payload)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = REDACTED_VALUE;
        continue;
      }
      output[key] = redactValue(payload[key], depth + 1);
    }
    return output;
  }
  return REDACTED_VALUE;
}

export function redactSensitiveFields<T>(value: T): T {
  return redactValue(value, 0) as T;
}

export type MetaBridgeExportStrategy = 'file_share' | 'json_share' | 'clipboard' | 'failed';

export type MetaBridgeExportAttemptResult = {
  ok: boolean;
  reason: string;
};

export type MetaBridgeExportFallbackResult = {
  ok: boolean;
  strategy: MetaBridgeExportStrategy;
  reason: string;
};

export async function executeExportFallbackChain(args: {
  tryFileShare: () => Promise<MetaBridgeExportAttemptResult>;
  tryJsonShare: () => Promise<MetaBridgeExportAttemptResult>;
  tryClipboard: () => Promise<MetaBridgeExportAttemptResult>;
}): Promise<MetaBridgeExportFallbackResult> {
  const fileResult = await args.tryFileShare();
  if (fileResult.ok) {
    return {
      ok: true,
      strategy: 'file_share',
      reason: fileResult.reason,
    };
  }

  const jsonShareResult = await args.tryJsonShare();
  if (jsonShareResult.ok) {
    return {
      ok: true,
      strategy: 'json_share',
      reason: jsonShareResult.reason,
    };
  }

  const clipboardResult = await args.tryClipboard();
  if (clipboardResult.ok) {
    return {
      ok: true,
      strategy: 'clipboard',
      reason: clipboardResult.reason,
    };
  }

  return {
    ok: false,
    strategy: 'failed',
    reason: [
      `File share fallback failed: ${fileResult.reason}`,
      `JSON share fallback failed: ${jsonShareResult.reason}`,
      `Clipboard fallback failed: ${clipboardResult.reason}`,
    ].join(' | '),
  };
}

export function queueEventIds(args: {
  queueEventIds: string[];
  incomingEvents: MetaBridgePersistedLogEvent[];
  maxQueueSize: number;
}): string[] {
  const maxQueueSize = Math.max(1, Math.floor(args.maxQueueSize));
  const queue = [...args.queueEventIds];
  const queuedSet = new Set(queue);
  for (const event of args.incomingEvents) {
    if (queuedSet.has(event.id)) {
      continue;
    }
    queue.push(event.id);
    queuedSet.add(event.id);
  }
  if (queue.length > maxQueueSize) {
    return queue.slice(queue.length - maxQueueSize);
  }
  return queue;
}

export function computeUploadBackoffMs(args: {
  retryCount: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
}): number {
  const retryCount = Math.max(1, Math.floor(args.retryCount));
  const base = Math.max(250, Math.floor(args.baseBackoffMs));
  const max = Math.max(base, Math.floor(args.maxBackoffMs));
  const backoff = base * Math.pow(2, retryCount - 1);
  return Math.min(max, backoff);
}

export function pruneQueueToRetainedEvents(args: {
  queueEventIds: string[];
  retainedEvents: MetaBridgePersistedLogEvent[];
}): string[] {
  const retainedIds = new Set(args.retainedEvents.map((event) => event.id));
  return args.queueEventIds.filter((eventId) => retainedIds.has(eventId));
}

export async function executeUploadAttempt(args: {
  nowMs: number;
  force: boolean;
  queueState: MetaBridgeUploadQueueState;
  bundle: MetaBridgePersistedLogBundle;
  config: MetaBridgeUploadAttemptConfig;
  transport: MetaBridgeUploadTransport;
}): Promise<MetaBridgeUploadAttemptResult> {
  const queueState: MetaBridgeUploadQueueState = {
    ...args.queueState,
    lastFailureCategory: args.queueState.lastFailureCategory || null,
    queueEventIds: pruneQueueToRetainedEvents({
      queueEventIds: args.queueState.queueEventIds,
      retainedEvents: args.bundle.events,
    }),
  };

  if (queueState.queueEventIds.length === 0) {
    return {
      state: queueState,
      attempted: false,
      uploadedCount: 0,
      skippedReason: 'empty_queue',
    };
  }

  if (!args.force && queueState.lastFailureCategory === 'permanent') {
    return {
      state: queueState,
      attempted: false,
      uploadedCount: 0,
      skippedReason: 'non_retryable',
    };
  }

  if (!args.force && queueState.nextRetryAtMs && queueState.nextRetryAtMs > args.nowMs) {
    return {
      state: queueState,
      attempted: false,
      uploadedCount: 0,
      skippedReason: 'backoff',
    };
  }

  if (
    !args.force
    && queueState.lastAttemptAtMs
    && (args.nowMs - queueState.lastAttemptAtMs) < args.config.maxFrequencyMs
  ) {
    return {
      state: queueState,
      attempted: false,
      uploadedCount: 0,
      skippedReason: 'frequency',
    };
  }

  const eventMap = new Map(args.bundle.events.map((event) => [event.id, event]));
  const batchIds = queueState.queueEventIds.slice(0, Math.max(1, args.config.batchSize));
  const batchEvents = batchIds
    .map((eventId) => eventMap.get(eventId))
    .filter((entry): entry is MetaBridgePersistedLogEvent => Boolean(entry));

  if (batchEvents.length === 0) {
    return {
      state: {
        ...queueState,
        queueEventIds: queueState.queueEventIds.slice(batchIds.length),
      },
      attempted: false,
      uploadedCount: 0,
      skippedReason: 'empty_queue',
    };
  }

  const payloadCandidate = buildMetaBridgeUploadPayload({
    nowMs: args.nowMs,
    events: redactSensitiveFields(batchEvents),
  });
  const payloadValidation = validateMetaBridgeUploadPayload(payloadCandidate, {
    allowLegacy: false,
  });
  if (!payloadValidation.ok) {
    return {
      state: {
        ...queueState,
        lastAttemptAtMs: args.nowMs,
        lastError: `Upload payload validation failed: ${payloadValidation.error}`,
        nextRetryAtMs: null,
        lastFailureCategory: 'permanent',
      },
      attempted: true,
      uploadedCount: 0,
      skippedReason: null,
    };
  }

  try {
    const result = await args.transport(payloadValidation.payload);

    if (result.ok) {
      return {
        state: {
          ...queueState,
          queueEventIds: queueState.queueEventIds.slice(batchEvents.length),
          retryCount: 0,
          lastAttemptAtMs: args.nowMs,
          lastUploadAtMs: args.nowMs,
          lastError: null,
          nextRetryAtMs: null,
          lastFailureCategory: null,
        },
        attempted: true,
        uploadedCount: batchEvents.length,
        skippedReason: null,
      };
    }

    const failureMessage = `Upload failed (${result.status})${result.body ? `: ${result.body.slice(0, 200)}` : ''}`;
    if (!isTransientUploadStatus(result.status)) {
      return {
        state: {
          ...queueState,
          lastAttemptAtMs: args.nowMs,
          lastError: failureMessage,
          nextRetryAtMs: null,
          lastFailureCategory: 'permanent',
        },
        attempted: true,
        uploadedCount: 0,
        skippedReason: null,
      };
    }

    const retryCount = queueState.retryCount + 1;
    const nextRetryAtMs = args.nowMs + computeUploadBackoffMs({
      retryCount,
      baseBackoffMs: args.config.baseBackoffMs,
      maxBackoffMs: args.config.maxBackoffMs,
    });

    return {
      state: {
        ...queueState,
        retryCount,
        lastAttemptAtMs: args.nowMs,
        lastError: failureMessage,
        nextRetryAtMs,
        lastFailureCategory: 'transient',
      },
      attempted: true,
      uploadedCount: 0,
      skippedReason: null,
    };
  } catch (error) {
    const retryCount = queueState.retryCount + 1;
    const nextRetryAtMs = args.nowMs + computeUploadBackoffMs({
      retryCount,
      baseBackoffMs: args.config.baseBackoffMs,
      maxBackoffMs: args.config.maxBackoffMs,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      state: {
        ...queueState,
        retryCount,
        lastAttemptAtMs: args.nowMs,
        lastError: errorMessage,
        nextRetryAtMs,
        lastFailureCategory: 'transient',
      },
      attempted: true,
      uploadedCount: 0,
      skippedReason: null,
    };
  }
}
