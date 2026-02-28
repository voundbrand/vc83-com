import type {
  DesktopCaptureAdapter,
  DesktopCaptureRecordingResult,
} from "./desktopCapture";
import {
  AV_APPROVAL_INVARIANT,
  AV_RUNTIME_AUTHORITY_PRECEDENCE,
  DEFAULT_AV_RETRY_POLICY,
  type AvFallbackReason,
  type AvRetryPolicy,
  evaluateAvFallbackPolicy,
  normalizeAvRetryPolicy,
  resolveRetryDelayMs,
} from "../runtime/avFallbackPolicy";
import type { MediaSessionCaptureFrame } from "../session/mediaSessionContract";

export const DEFAULT_DESKTOP_CAPTURE_FALLBACK_HISTORY_LIMIT = 25;

export type DesktopCaptureOrchestrationStatus =
  | "idle"
  | "running"
  | "paused"
  | "stopped";
export type DesktopCaptureCaptureMode = "screenshot" | "record";

export interface DesktopCaptureRuntimePolicy {
  runtimeAuthorityPrecedence?: string;
  policyRestricted?: boolean;
  approvalRequired?: boolean;
  approvalGranted?: boolean;
}

interface ResolvedDesktopCaptureRuntimePolicy {
  runtimeAuthorityPrecedence: string;
  policyRestricted: boolean;
  approvalRequired: boolean;
  approvalGranted: boolean;
}

export interface DesktopCaptureFallbackEvent {
  atMs: number;
  mode: DesktopCaptureCaptureMode;
  reason: Exclude<AvFallbackReason, "none">;
  attempt: number;
  maxAttempts: number;
  retryAllowed: boolean;
  errorMessage?: string;
}

export interface DesktopCaptureOrchestrationSnapshot {
  status: DesktopCaptureOrchestrationStatus;
  liveSessionId?: string;
  sourceId?: string;
  deviceId?: string;
  runtimePolicy: {
    runtimeAuthorityPrecedence: string;
    policyRestricted: boolean;
    approvalRequired: boolean;
    approvalGranted: boolean;
    nativePolicyPrecedence: typeof AV_RUNTIME_AUTHORITY_PRECEDENCE;
    approvalInvariant: typeof AV_APPROVAL_INVARIANT;
  };
  retryPolicy: AvRetryPolicy;
  captureCount: number;
  fallbackCount: number;
  lastFallbackReason: AvFallbackReason;
  lastCaptureAtMs?: number;
  clock: {
    startedAtMs?: number;
    pausedAtMs?: number;
    stoppedAtMs?: number;
    updatedAtMs: number;
  };
  fallbackHistory: DesktopCaptureFallbackEvent[];
}

export interface DesktopCaptureStartRequest {
  liveSessionId: string;
  sourceId?: string;
  deviceId?: string;
  runtimePolicy?: DesktopCaptureRuntimePolicy;
}

export interface DesktopCaptureCaptureRequestBase {
  liveSessionId?: string;
  sourceId?: string;
  runtimePolicy?: DesktopCaptureRuntimePolicy;
  retryPolicy?: Partial<AvRetryPolicy>;
}

export interface DesktopCaptureScreenshotCaptureRequest
  extends DesktopCaptureCaptureRequestBase {
  mode: "screenshot";
  deviceId?: string;
}

export interface DesktopCaptureRecordCaptureRequest
  extends DesktopCaptureCaptureRequestBase {
  mode: "record";
  durationMs: number;
  frameRate?: number;
  withMicAudio?: boolean;
  withSystemAudio?: boolean;
}

export type DesktopCaptureCaptureRequest =
  | DesktopCaptureScreenshotCaptureRequest
  | DesktopCaptureRecordCaptureRequest;

export interface DesktopCaptureCaptureSuccess {
  status: "success";
  mode: DesktopCaptureCaptureMode;
  attemptCount: number;
  fallbackReason: "none";
  frame?: MediaSessionCaptureFrame;
  recording?: DesktopCaptureRecordingResult;
  snapshot: DesktopCaptureOrchestrationSnapshot;
}

export interface DesktopCaptureCaptureFallback {
  status: "fallback";
  mode: DesktopCaptureCaptureMode;
  attemptCount: number;
  fallbackReason: Exclude<AvFallbackReason, "none">;
  retryExhausted: boolean;
  errorMessage: string;
  snapshot: DesktopCaptureOrchestrationSnapshot;
}

export type DesktopCaptureCaptureResult =
  | DesktopCaptureCaptureSuccess
  | DesktopCaptureCaptureFallback;

export interface DesktopCaptureOrchestrationOptions {
  adapter: DesktopCaptureAdapter;
  now?: () => number;
  wait?: (delayMs: number) => Promise<void>;
  retryPolicy?: Partial<AvRetryPolicy>;
  fallbackHistoryLimit?: number;
}

export interface DesktopCaptureOrchestration {
  start(request: DesktopCaptureStartRequest): DesktopCaptureOrchestrationSnapshot;
  pause(): DesktopCaptureOrchestrationSnapshot;
  stop(): DesktopCaptureOrchestrationSnapshot;
  capture(request: DesktopCaptureCaptureRequest): Promise<DesktopCaptureCaptureResult>;
  getSnapshot(): DesktopCaptureOrchestrationSnapshot;
}

interface DesktopCaptureOrchestrationState {
  status: DesktopCaptureOrchestrationStatus;
  liveSessionId?: string;
  sourceId?: string;
  deviceId?: string;
  runtimePolicy: ResolvedDesktopCaptureRuntimePolicy;
  retryPolicy: AvRetryPolicy;
  captureCount: number;
  fallbackCount: number;
  lastFallbackReason: AvFallbackReason;
  lastCaptureAtMs?: number;
  startedAtMs?: number;
  pausedAtMs?: number;
  stoppedAtMs?: number;
  updatedAtMs: number;
  fallbackHistory: DesktopCaptureFallbackEvent[];
}

interface DesktopCaptureOrchestrationSettings {
  adapter: DesktopCaptureAdapter;
  now: () => number;
  wait: (delayMs: number) => Promise<void>;
  retryPolicy: AvRetryPolicy;
  fallbackHistoryLimit: number;
}

function normalizeRequiredString(
  value: string | undefined,
  fieldName: string
): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`Desktop capture orchestration requires ${fieldName}.`);
  }
  return normalized;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function normalizeFallbackHistoryLimit(limit: number | undefined): number {
  return normalizePositiveInteger(
    limit,
    DEFAULT_DESKTOP_CAPTURE_FALLBACK_HISTORY_LIMIT
  );
}

function resolveRuntimePolicy(
  runtimePolicy?: DesktopCaptureRuntimePolicy
): ResolvedDesktopCaptureRuntimePolicy {
  const runtimeAuthorityPrecedence =
    normalizeOptionalString(runtimePolicy?.runtimeAuthorityPrecedence)
    ?? AV_RUNTIME_AUTHORITY_PRECEDENCE;
  const approvalRequired = runtimePolicy?.approvalRequired === true;
  return {
    runtimeAuthorityPrecedence,
    policyRestricted: runtimePolicy?.policyRestricted === true,
    approvalRequired,
    approvalGranted: approvalRequired
      ? runtimePolicy?.approvalGranted === true
      : true,
  };
}

function resolveSettings(
  options: DesktopCaptureOrchestrationOptions
): DesktopCaptureOrchestrationSettings {
  return {
    adapter: options.adapter,
    now: options.now ?? Date.now,
    wait:
      options.wait
      ?? (async (delayMs: number) => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, Math.max(0, Math.floor(delayMs)));
        });
      }),
    retryPolicy: normalizeAvRetryPolicy(options.retryPolicy ?? DEFAULT_AV_RETRY_POLICY),
    fallbackHistoryLimit: normalizeFallbackHistoryLimit(options.fallbackHistoryLimit),
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
    return error.name;
  }
  if (typeof error === "string") {
    const message = error.trim();
    if (message) {
      return message;
    }
  }
  return "Desktop capture orchestration failed.";
}

function createInitialState(
  settings: DesktopCaptureOrchestrationSettings
): DesktopCaptureOrchestrationState {
  return {
    status: "idle",
    runtimePolicy: resolveRuntimePolicy(),
    retryPolicy: settings.retryPolicy,
    captureCount: 0,
    fallbackCount: 0,
    lastFallbackReason: "none",
    updatedAtMs: settings.now(),
    fallbackHistory: [],
  };
}

function cloneFallbackHistory(
  history: DesktopCaptureFallbackEvent[]
): DesktopCaptureFallbackEvent[] {
  return history.map((event) => ({ ...event }));
}

function snapshotFromState(
  state: DesktopCaptureOrchestrationState
): DesktopCaptureOrchestrationSnapshot {
  return {
    status: state.status,
    liveSessionId: state.liveSessionId,
    sourceId: state.sourceId,
    deviceId: state.deviceId,
    runtimePolicy: {
      runtimeAuthorityPrecedence: state.runtimePolicy.runtimeAuthorityPrecedence,
      policyRestricted: state.runtimePolicy.policyRestricted,
      approvalRequired: state.runtimePolicy.approvalRequired,
      approvalGranted: state.runtimePolicy.approvalGranted,
      nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
      approvalInvariant: AV_APPROVAL_INVARIANT,
    },
    retryPolicy: { ...state.retryPolicy },
    captureCount: state.captureCount,
    fallbackCount: state.fallbackCount,
    lastFallbackReason: state.lastFallbackReason,
    lastCaptureAtMs: state.lastCaptureAtMs,
    clock: {
      startedAtMs: state.startedAtMs,
      pausedAtMs: state.pausedAtMs,
      stoppedAtMs: state.stoppedAtMs,
      updatedAtMs: state.updatedAtMs,
    },
    fallbackHistory: cloneFallbackHistory(state.fallbackHistory),
  };
}

function appendFallbackEvent(args: {
  state: DesktopCaptureOrchestrationState;
  settings: DesktopCaptureOrchestrationSettings;
  mode: DesktopCaptureCaptureMode;
  reason: Exclude<AvFallbackReason, "none">;
  attempt: number;
  maxAttempts: number;
  retryAllowed: boolean;
  errorMessage?: string;
}) {
  args.state.fallbackCount += 1;
  args.state.lastFallbackReason = args.reason;
  args.state.updatedAtMs = args.settings.now();
  args.state.fallbackHistory.push({
    atMs: args.state.updatedAtMs,
    mode: args.mode,
    reason: args.reason,
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    retryAllowed: args.retryAllowed,
    errorMessage: args.errorMessage,
  });
  while (args.state.fallbackHistory.length > args.settings.fallbackHistoryLimit) {
    args.state.fallbackHistory.shift();
  }
}

function resolveRetryPolicy(
  basePolicy: AvRetryPolicy,
  overridePolicy?: Partial<AvRetryPolicy>
): AvRetryPolicy {
  if (!overridePolicy) {
    return basePolicy;
  }
  return normalizeAvRetryPolicy({
    maxAttempts: overridePolicy.maxAttempts ?? basePolicy.maxAttempts,
    baseDelayMs: overridePolicy.baseDelayMs ?? basePolicy.baseDelayMs,
    maxDelayMs: overridePolicy.maxDelayMs ?? basePolicy.maxDelayMs,
    backoffMultiplier:
      overridePolicy.backoffMultiplier ?? basePolicy.backoffMultiplier,
  });
}

function resolveCaptureLiveSessionId(
  requestLiveSessionId: string | undefined,
  currentLiveSessionId: string | undefined
): string | undefined {
  return normalizeOptionalString(requestLiveSessionId) ?? currentLiveSessionId;
}

function resetSessionStateForStart(
  state: DesktopCaptureOrchestrationState,
  nowMs: number
) {
  state.captureCount = 0;
  state.fallbackCount = 0;
  state.lastFallbackReason = "none";
  state.lastCaptureAtMs = undefined;
  state.fallbackHistory = [];
  state.startedAtMs = nowMs;
  state.pausedAtMs = undefined;
  state.stoppedAtMs = undefined;
}

export function createDesktopCaptureOrchestration(
  options: DesktopCaptureOrchestrationOptions
): DesktopCaptureOrchestration {
  const settings = resolveSettings(options);
  const state = createInitialState(settings);

  return {
    start(request: DesktopCaptureStartRequest): DesktopCaptureOrchestrationSnapshot {
      const liveSessionId = normalizeRequiredString(
        request.liveSessionId,
        "liveSessionId"
      );
      const nowMs = settings.now();
      const nextSourceId =
        normalizeOptionalString(request.sourceId) ?? state.sourceId;
      const nextDeviceId =
        normalizeOptionalString(request.deviceId) ?? state.deviceId;
      const nextRuntimePolicy = resolveRuntimePolicy(
        request.runtimePolicy ?? state.runtimePolicy
      );

      const shouldReset =
        state.status === "idle" ||
        state.status === "stopped" ||
        state.liveSessionId !== liveSessionId;
      if (shouldReset) {
        resetSessionStateForStart(state, nowMs);
      }

      state.status = "running";
      state.liveSessionId = liveSessionId;
      state.sourceId = nextSourceId;
      state.deviceId = nextDeviceId;
      state.runtimePolicy = nextRuntimePolicy;
      state.updatedAtMs = nowMs;
      state.pausedAtMs = undefined;
      state.stoppedAtMs = undefined;
      return snapshotFromState(state);
    },

    pause(): DesktopCaptureOrchestrationSnapshot {
      if (state.status === "running") {
        state.status = "paused";
        state.pausedAtMs = settings.now();
        state.updatedAtMs = state.pausedAtMs;
      }
      return snapshotFromState(state);
    },

    stop(): DesktopCaptureOrchestrationSnapshot {
      if (state.status !== "idle") {
        state.status = "stopped";
        state.stoppedAtMs = settings.now();
        state.updatedAtMs = state.stoppedAtMs;
      }
      return snapshotFromState(state);
    },

    async capture(
      request: DesktopCaptureCaptureRequest
    ): Promise<DesktopCaptureCaptureResult> {
      const liveSessionId = resolveCaptureLiveSessionId(
        request.liveSessionId,
        state.liveSessionId
      );
      const runtimePolicy = resolveRuntimePolicy(
        request.runtimePolicy ?? state.runtimePolicy
      );
      const retryPolicy = resolveRetryPolicy(
        state.retryPolicy,
        request.retryPolicy
      );

      state.runtimePolicy = runtimePolicy;
      state.retryPolicy = retryPolicy;

      if (!liveSessionId) {
        appendFallbackEvent({
          state,
          settings,
          mode: request.mode,
          reason: "invalid_request",
          attempt: 0,
          maxAttempts: retryPolicy.maxAttempts,
          retryAllowed: false,
          errorMessage: "Desktop capture orchestration requires liveSessionId.",
        });
        return {
          status: "fallback",
          mode: request.mode,
          attemptCount: 0,
          fallbackReason: "invalid_request",
          retryExhausted: false,
          errorMessage: "Desktop capture orchestration requires liveSessionId.",
          snapshot: snapshotFromState(state),
        };
      }

      const preflightResolution = evaluateAvFallbackPolicy({
        sessionStatus: state.status,
        runtimeAuthorityPrecedence: runtimePolicy.runtimeAuthorityPrecedence,
        policyRestricted: runtimePolicy.policyRestricted,
        approvalRequired: runtimePolicy.approvalRequired,
        approvalGranted: runtimePolicy.approvalGranted,
        attempt: 1,
        maxAttempts: retryPolicy.maxAttempts,
      });

      if (preflightResolution.fallbackReason !== "none") {
        const reason = preflightResolution.fallbackReason;
        appendFallbackEvent({
          state,
          settings,
          mode: request.mode,
          reason,
          attempt: 0,
          maxAttempts: retryPolicy.maxAttempts,
          retryAllowed: false,
        });
        return {
          status: "fallback",
          mode: request.mode,
          attemptCount: 0,
          fallbackReason: reason,
          retryExhausted: false,
          errorMessage: `Desktop capture blocked: ${reason}.`,
          snapshot: snapshotFromState(state),
        };
      }

      let attempt = 1;
      while (attempt <= retryPolicy.maxAttempts) {
        try {
          if (request.mode === "screenshot") {
            const frame = await settings.adapter.captureScreenshot({
              liveSessionId,
              sourceId: normalizeOptionalString(request.sourceId) ?? state.sourceId,
              deviceId: request.deviceId ?? state.deviceId,
            });
            state.captureCount += 1;
            state.lastFallbackReason = "none";
            state.lastCaptureAtMs = settings.now();
            state.updatedAtMs = state.lastCaptureAtMs;
            return {
              status: "success",
              mode: request.mode,
              attemptCount: attempt,
              fallbackReason: "none",
              frame,
              snapshot: snapshotFromState(state),
            };
          }

          const recording = await settings.adapter.captureRecording({
            liveSessionId,
            sourceId: normalizeOptionalString(request.sourceId) ?? state.sourceId,
            durationMs: request.durationMs,
            frameRate: request.frameRate,
            withMicAudio: request.withMicAudio,
            withSystemAudio: request.withSystemAudio,
          });
          state.captureCount += 1;
          state.lastFallbackReason = "none";
          state.lastCaptureAtMs = settings.now();
          state.updatedAtMs = state.lastCaptureAtMs;
          return {
            status: "success",
            mode: request.mode,
            attemptCount: attempt,
            fallbackReason: "none",
            recording,
            snapshot: snapshotFromState(state),
          };
        } catch (error) {
          const resolution = evaluateAvFallbackPolicy({
            sessionStatus: state.status,
            runtimeAuthorityPrecedence: runtimePolicy.runtimeAuthorityPrecedence,
            policyRestricted: runtimePolicy.policyRestricted,
            approvalRequired: runtimePolicy.approvalRequired,
            approvalGranted: runtimePolicy.approvalGranted,
            error,
            attempt,
            maxAttempts: retryPolicy.maxAttempts,
          });
          const fallbackReason =
            resolution.fallbackReason === "none"
              ? "capture_provider_error"
              : resolution.fallbackReason;
          const retryAllowed =
            resolution.retryAllowed && attempt < retryPolicy.maxAttempts;
          const errorMessage = toErrorMessage(error);

          appendFallbackEvent({
            state,
            settings,
            mode: request.mode,
            reason: fallbackReason,
            attempt,
            maxAttempts: retryPolicy.maxAttempts,
            retryAllowed,
            errorMessage,
          });

          if (retryAllowed) {
            const retryDelayMs = resolveRetryDelayMs(attempt, retryPolicy);
            await settings.wait(retryDelayMs);
            attempt += 1;
            continue;
          }

          return {
            status: "fallback",
            mode: request.mode,
            attemptCount: attempt,
            fallbackReason,
            retryExhausted: fallbackReason === "retry_exhausted",
            errorMessage,
            snapshot: snapshotFromState(state),
          };
        }
      }

      appendFallbackEvent({
        state,
        settings,
        mode: request.mode,
        reason: "retry_exhausted",
        attempt: retryPolicy.maxAttempts,
        maxAttempts: retryPolicy.maxAttempts,
        retryAllowed: false,
        errorMessage: "Desktop capture retries exhausted.",
      });
      return {
        status: "fallback",
        mode: request.mode,
        attemptCount: retryPolicy.maxAttempts,
        fallbackReason: "retry_exhausted",
        retryExhausted: true,
        errorMessage: "Desktop capture retries exhausted.",
        snapshot: snapshotFromState(state),
      };
    },

    getSnapshot(): DesktopCaptureOrchestrationSnapshot {
      return snapshotFromState(state);
    },
  };
}
