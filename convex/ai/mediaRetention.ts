import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "../_generated/server";
import { requireAuthenticatedUser } from "../rbacHelpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

export const OPERATOR_MEDIA_RETENTION_MODE_VALUES = [
  "off",
  "metadata_only",
  "full",
] as const;
export type OperatorMediaRetentionMode =
  (typeof OPERATOR_MEDIA_RETENTION_MODE_VALUES)[number];

export const OPERATOR_RETAINED_MEDIA_TYPE_VALUES = [
  "audio_chunk",
  "audio_final",
  "assistant_audio_chunk",
  "assistant_audio_final",
  "video_frame",
  "video_keyframe",
] as const;
export type OperatorRetainedMediaType =
  (typeof OPERATOR_RETAINED_MEDIA_TYPE_VALUES)[number];

export const OPERATOR_MEDIA_REDACTION_STATUS_VALUES = [
  "none",
  "pending",
  "applied",
] as const;
export type OperatorMediaRedactionStatus =
  (typeof OPERATOR_MEDIA_REDACTION_STATUS_VALUES)[number];

export const OPERATOR_MEDIA_ENCRYPTION_MODE_VALUES = [
  "convex_managed",
  "customer_managed",
] as const;
export type OperatorMediaEncryptionMode =
  (typeof OPERATOR_MEDIA_ENCRYPTION_MODE_VALUES)[number];

const DEFAULT_AUDIO_TTL_HOURS = 72;
const DEFAULT_VIDEO_TTL_HOURS = 24;
const DEFAULT_VIDEO_SAMPLE_EVERY_N_FRAMES = 1;
const DEFAULT_CLEANUP_LIMIT = 100;
const MAX_QUERY_LIMIT = 200;

export interface OperatorMediaRetentionConfig {
  enabled: boolean;
  mode: OperatorMediaRetentionMode;
  failClosed: boolean;
  audioTtlMs: number;
  videoTtlMs: number;
  videoSampleEveryNFrames: number;
  videoRetainKeyframesOnly: boolean;
  redactionStatus: OperatorMediaRedactionStatus;
  redactionProfileId?: string;
  encryptionMode: OperatorMediaEncryptionMode;
  encryptionKeyRef?: string;
}

export interface OperatorMediaRetentionDecision {
  enabled: boolean;
  mode: OperatorMediaRetentionMode;
  shouldPersistMetadata: boolean;
  shouldPersistPayload: boolean;
  failClosed: boolean;
  ttlMs: number;
  sampled: boolean;
  reason: string;
}

export interface OperatorMediaRetentionWriteRequest {
  organizationId: Id<"organizations">;
  conversationId?: Id<"aiConversations">;
  interviewSessionId: Id<"agentSessions">;
  liveSessionId: string;
  mediaType: OperatorRetainedMediaType;
  mimeType: string;
  capturedAt: number;
  sourceClass?: string;
  sourceId?: string;
  sourceSequence?: number;
  voiceSessionId?: string;
  videoSessionId?: string;
  payloadBase64?: string;
  idempotencyKey: string;
  retentionMode: Exclude<OperatorMediaRetentionMode, "off">;
  ttlExpiresAt: number;
  redaction?: {
    status: OperatorMediaRedactionStatus;
    profileId?: string;
  };
  encryption?: {
    atRest: OperatorMediaEncryptionMode;
    keyRef?: string;
  };
  metadata?: Record<string, unknown>;
  policy: {
    sampled: boolean;
    reason: string;
    failClosed: boolean;
  };
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return undefined;
}

function normalizePositiveInteger(
  value: unknown,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? Math.floor(value)
      : Number.parseInt(normalizeString(value) ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function normalizeRetentionMode(value: unknown): OperatorMediaRetentionMode {
  const normalized = normalizeString(value)?.toLowerCase();
  if (normalized === "metadata_only" || normalized === "full" || normalized === "off") {
    return normalized;
  }
  return "off";
}

function normalizeRedactionStatus(value: unknown): OperatorMediaRedactionStatus {
  const normalized = normalizeString(value)?.toLowerCase();
  if (normalized === "pending" || normalized === "applied" || normalized === "none") {
    return normalized;
  }
  return "none";
}

function normalizeEncryptionMode(value: unknown): OperatorMediaEncryptionMode {
  const normalized = normalizeString(value)?.toLowerCase();
  if (normalized === "customer_managed" || normalized === "convex_managed") {
    return normalized;
  }
  return "convex_managed";
}

function clampTimestampMs(value: unknown): number {
  const now = Date.now();
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return now;
  }
  return Math.floor(value);
}

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96) || "unknown";
}

function resolveFileExtensionFromMimeType(mimeType: string): string {
  const canonical = mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  switch (canonical) {
    case "audio/webm":
      return "webm";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "audio/flac":
      return "flac";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/mp4":
    case "audio/m4a":
      return "m4a";
    case "video/jpeg":
    case "image/jpeg":
      return "jpg";
    case "video/png":
    case "image/png":
      return "png";
    case "video/webp":
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

function normalizeHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}

function fallbackChecksumHex(bytes: Uint8Array): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x811c9dc5;
  for (let index = 0; index < bytes.length; index += 1) {
    const value = bytes[index] ?? 0;
    hashA ^= value;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= value + ((index + 1) * 17);
    hashB = Math.imul(hashB, 0x01000193);
  }
  return `${normalizeHex32(hashA)}${normalizeHex32(hashB)}`;
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_CHAR_MAP = new Map<string, number>(
  Array.from(BASE64_ALPHABET).map((char, index) => [char, index]),
);

export function decodeBase64Payload(payload: string): Uint8Array {
  const normalized = payload.replace(/[\s\r\n\t]/g, "");
  if (!normalized) {
    return new Uint8Array(0);
  }
  const standard = normalized.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${standard}${"=".repeat((4 - (standard.length % 4)) % 4)}`;
  const bytes: number[] = [];
  for (let index = 0; index < padded.length; index += 4) {
    const a = padded[index];
    const b = padded[index + 1];
    const c = padded[index + 2];
    const d = padded[index + 3];
    if (!a || !b || !c || !d) {
      throw new Error("Invalid base64 payload length.");
    }
    const valueA = BASE64_CHAR_MAP.get(a);
    const valueB = BASE64_CHAR_MAP.get(b);
    const valueC = c === "=" ? 0 : BASE64_CHAR_MAP.get(c);
    const valueD = d === "=" ? 0 : BASE64_CHAR_MAP.get(d);
    if (
      valueA === undefined ||
      valueB === undefined ||
      valueC === undefined ||
      valueD === undefined
    ) {
      throw new Error("Invalid base64 payload characters.");
    }
    const chunk = (valueA << 18) | (valueB << 12) | (valueC << 6) | valueD;
    bytes.push((chunk >> 16) & 0xff);
    if (c !== "=") {
      bytes.push((chunk >> 8) & 0xff);
    }
    if (d !== "=") {
      bytes.push(chunk & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

async function computeChecksumHex(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength === 0) {
    return fallbackChecksumHex(bytes);
  }
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return fallbackChecksumHex(bytes);
  }
  try {
    const digestInput = new Uint8Array(bytes);
    const digest = await crypto.subtle.digest("SHA-256", digestInput.buffer);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return fallbackChecksumHex(bytes);
  }
}

function buildStoragePath(args: {
  organizationId: Id<"organizations">;
  liveSessionId: string;
  mediaType: OperatorRetainedMediaType;
  capturedAt: number;
  checksum: string;
  mimeType: string;
}): string {
  const date = new Date(args.capturedAt);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const extension = resolveFileExtensionFromMimeType(args.mimeType);
  const checksumPrefix = args.checksum.slice(0, 16) || "checksum";
  return [
    "org",
    sanitizePathSegment(String(args.organizationId)),
    "operator_mobile_media_retention",
    year,
    month,
    day,
    sanitizePathSegment(args.liveSessionId),
    sanitizePathSegment(args.mediaType),
    `${Math.floor(args.capturedAt)}_${checksumPrefix}.${extension}`,
  ].join("/");
}

function normalizeRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeSourceSequence(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : undefined;
}

function normalizeQueryLimit(value: unknown, fallback = 50): number {
  return normalizePositiveInteger(value, fallback, 1, MAX_QUERY_LIMIT);
}

export function resolveOperatorMediaRetentionConfig(
  env: Record<string, string | undefined> = process.env,
): OperatorMediaRetentionConfig {
  const mode = normalizeRetentionMode(env.OPERATOR_MEDIA_RETENTION_MODE);
  const enabledFlag = normalizeBoolean(env.OPERATOR_MEDIA_RETENTION_ENABLED) ?? false;
  const failClosed = normalizeBoolean(env.OPERATOR_MEDIA_RETENTION_FAIL_CLOSED) ?? true;
  const audioTtlHours = normalizePositiveInteger(
    env.OPERATOR_MEDIA_RETENTION_AUDIO_TTL_HOURS,
    DEFAULT_AUDIO_TTL_HOURS,
  );
  const videoTtlHours = normalizePositiveInteger(
    env.OPERATOR_MEDIA_RETENTION_VIDEO_TTL_HOURS,
    DEFAULT_VIDEO_TTL_HOURS,
  );
  const videoSampleEveryNFrames = normalizePositiveInteger(
    env.OPERATOR_MEDIA_RETENTION_VIDEO_SAMPLE_EVERY_N_FRAMES,
    DEFAULT_VIDEO_SAMPLE_EVERY_N_FRAMES,
  );
  const videoRetainKeyframesOnly =
    normalizeBoolean(env.OPERATOR_MEDIA_RETENTION_VIDEO_KEYFRAMES_ONLY) ?? false;

  return {
    enabled: enabledFlag && mode !== "off",
    mode,
    failClosed,
    audioTtlMs: audioTtlHours * 60 * 60 * 1000,
    videoTtlMs: videoTtlHours * 60 * 60 * 1000,
    videoSampleEveryNFrames,
    videoRetainKeyframesOnly,
    redactionStatus: normalizeRedactionStatus(
      env.OPERATOR_MEDIA_RETENTION_REDACTION_STATUS,
    ),
    redactionProfileId:
      normalizeString(env.OPERATOR_MEDIA_RETENTION_REDACTION_PROFILE_ID) ?? undefined,
    encryptionMode: normalizeEncryptionMode(
      env.OPERATOR_MEDIA_RETENTION_ENCRYPTION_MODE,
    ),
    encryptionKeyRef:
      normalizeString(env.OPERATOR_MEDIA_RETENTION_ENCRYPTION_KEY_REF) ?? undefined,
  };
}

function isVideoMediaType(mediaType: OperatorRetainedMediaType): boolean {
  return mediaType === "video_frame" || mediaType === "video_keyframe";
}

export function resolveOperatorMediaRetentionDecision(args: {
  config: OperatorMediaRetentionConfig;
  mediaType: OperatorRetainedMediaType;
  sourceSequence?: number;
  isKeyframe?: boolean;
}): OperatorMediaRetentionDecision {
  if (!args.config.enabled || args.config.mode === "off") {
    return {
      enabled: false,
      mode: "off",
      shouldPersistMetadata: false,
      shouldPersistPayload: false,
      failClosed: false,
      ttlMs: 0,
      sampled: false,
      reason: "retention_disabled",
    };
  }

  const isVideo = isVideoMediaType(args.mediaType);
  if (isVideo) {
    if (args.config.videoRetainKeyframesOnly && !args.isKeyframe) {
      return {
        enabled: true,
        mode: args.config.mode,
        shouldPersistMetadata: false,
        shouldPersistPayload: false,
        failClosed: false,
        ttlMs: args.config.videoTtlMs,
        sampled: false,
        reason: "video_non_keyframe_skipped",
      };
    }
    if (
      args.config.videoSampleEveryNFrames > 1 &&
      typeof args.sourceSequence === "number" &&
      Number.isFinite(args.sourceSequence) &&
      Math.floor(args.sourceSequence) % args.config.videoSampleEveryNFrames !== 0
    ) {
      return {
        enabled: true,
        mode: args.config.mode,
        shouldPersistMetadata: false,
        shouldPersistPayload: false,
        failClosed: false,
        ttlMs: args.config.videoTtlMs,
        sampled: false,
        reason: `video_sampling_skip_every_${args.config.videoSampleEveryNFrames}`,
      };
    }
  }

  return {
    enabled: true,
    mode: args.config.mode,
    shouldPersistMetadata: true,
    shouldPersistPayload: args.config.mode === "full",
    failClosed: args.config.failClosed,
    ttlMs: isVideo ? args.config.videoTtlMs : args.config.audioTtlMs,
    sampled: true,
    reason: args.config.mode === "full" ? "retention_full" : "retention_metadata_only",
  };
}

export function buildOperatorMediaRetentionIdempotencyKey(args: {
  organizationId: Id<"organizations">;
  liveSessionId: string;
  mediaType: OperatorRetainedMediaType;
  sourceSequence?: number;
  voiceSessionId?: string;
  videoSessionId?: string;
  capturedAt: number;
}): string {
  const sequenceToken =
    typeof args.sourceSequence === "number" && Number.isFinite(args.sourceSequence)
      ? String(Math.floor(args.sourceSequence))
      : "na";
  const streamToken = sanitizePathSegment(
    args.voiceSessionId ?? args.videoSessionId ?? args.liveSessionId,
  );
  return [
    "operator_media_retention_v1",
    sanitizePathSegment(String(args.organizationId)),
    sanitizePathSegment(args.liveSessionId),
    sanitizePathSegment(args.mediaType),
    streamToken,
    sequenceToken,
    String(Math.floor(args.capturedAt)),
  ].join(":");
}

export function buildOperatorMediaRetentionWriteRequest(args: {
  config: OperatorMediaRetentionConfig;
  organizationId: Id<"organizations">;
  conversationId?: Id<"aiConversations">;
  interviewSessionId: Id<"agentSessions">;
  liveSessionId: string;
  mediaType: OperatorRetainedMediaType;
  mimeType: string;
  capturedAt: number;
  sourceClass?: string;
  sourceId?: string;
  sourceSequence?: number;
  voiceSessionId?: string;
  videoSessionId?: string;
  isKeyframe?: boolean;
  payloadBase64?: string;
  metadata?: Record<string, unknown>;
}): OperatorMediaRetentionWriteRequest | null {
  const normalizedMimeType = normalizeString(args.mimeType) ?? "application/octet-stream";
  const liveSessionId = normalizeString(args.liveSessionId);
  if (!liveSessionId) {
    return null;
  }

  const sourceSequence = normalizeSourceSequence(args.sourceSequence);
  const decision = resolveOperatorMediaRetentionDecision({
    config: args.config,
    mediaType: args.mediaType,
    sourceSequence,
    isKeyframe: args.isKeyframe,
  });
  if (!decision.shouldPersistMetadata) {
    return null;
  }

  const capturedAt = clampTimestampMs(args.capturedAt);
  const ttlExpiresAt = capturedAt + decision.ttlMs;
  const idempotencyKey = buildOperatorMediaRetentionIdempotencyKey({
    organizationId: args.organizationId,
    liveSessionId,
    mediaType: args.mediaType,
    sourceSequence,
    voiceSessionId: args.voiceSessionId,
    videoSessionId: args.videoSessionId,
    capturedAt,
  });

  return {
    organizationId: args.organizationId,
    conversationId: args.conversationId,
    interviewSessionId: args.interviewSessionId,
    liveSessionId,
    mediaType: args.mediaType,
    mimeType: normalizedMimeType,
    capturedAt,
    sourceClass: normalizeString(args.sourceClass) ?? undefined,
    sourceId: normalizeString(args.sourceId) ?? undefined,
    sourceSequence,
    voiceSessionId: normalizeString(args.voiceSessionId) ?? undefined,
    videoSessionId: normalizeString(args.videoSessionId) ?? undefined,
    payloadBase64: normalizeString(args.payloadBase64) ?? undefined,
    idempotencyKey,
    retentionMode: decision.shouldPersistPayload ? "full" : "metadata_only",
    ttlExpiresAt,
    redaction: {
      status: args.config.redactionStatus,
      profileId: args.config.redactionProfileId,
    },
    encryption: {
      atRest: args.config.encryptionMode,
      keyRef: args.config.encryptionKeyRef,
    },
    metadata: args.metadata,
    policy: {
      sampled: decision.sampled,
      reason: decision.reason,
      failClosed: decision.failClosed,
    },
  };
}

export function assertOperatorMediaRetentionOrgScope(args: {
  authenticatedOrganizationId: Id<"organizations">;
  requestedOrganizationId?: Id<"organizations">;
  recordOrganizationId?: Id<"organizations">;
}) {
  if (
    args.requestedOrganizationId &&
    String(args.requestedOrganizationId) !== String(args.authenticatedOrganizationId)
  ) {
    throw new Error("Unauthorized: media retention organization scope mismatch.");
  }
  if (
    args.recordOrganizationId &&
    String(args.recordOrganizationId) !== String(args.authenticatedOrganizationId)
  ) {
    throw new Error("Unauthorized: media retention record belongs to another organization.");
  }
}

export async function materializeOperatorMediaRetentionPayload(args: {
  organizationId: Id<"organizations">;
  liveSessionId: string;
  mediaType: OperatorRetainedMediaType;
  capturedAt: number;
  mimeType: string;
  payloadBase64?: string;
}): Promise<{
  payloadBytes?: Uint8Array;
  sizeBytes: number;
  checksum: string;
  storagePath: string;
}> {
  const payloadBase64 = normalizeString(args.payloadBase64);
  const payloadBytes = payloadBase64 ? decodeBase64Payload(payloadBase64) : undefined;
  const sizeBytes = payloadBytes?.byteLength ?? 0;
  const checksum = payloadBytes
    ? await computeChecksumHex(payloadBytes)
    : fallbackChecksumHex(
        new TextEncoder().encode(
          `${args.organizationId}:${args.liveSessionId}:${args.mediaType}:${args.capturedAt}:${args.mimeType}`,
        ),
      );
  const storagePath = buildStoragePath({
    organizationId: args.organizationId,
    liveSessionId: args.liveSessionId,
    mediaType: args.mediaType,
    capturedAt: args.capturedAt,
    checksum,
    mimeType: args.mimeType,
  });
  return {
    payloadBytes,
    sizeBytes,
    checksum,
    storagePath,
  };
}

async function deleteStoredPayloadIfPresent(
  ctx: MutationCtx,
  row: {
    storageId?: Id<"_storage">;
  },
): Promise<void> {
  if (!row.storageId) {
    return;
  }
  try {
    await ctx.storage.delete(row.storageId);
  } catch (error) {
    const message = normalizeString(error instanceof Error ? error.message : null)?.toLowerCase();
    if (message?.includes("not found") || message?.includes("does not exist")) {
      return;
    }
    throw error;
  }
}

const retainedMediaTypeValidator = v.union(
  v.literal("audio_chunk"),
  v.literal("audio_final"),
  v.literal("assistant_audio_chunk"),
  v.literal("assistant_audio_final"),
  v.literal("video_frame"),
  v.literal("video_keyframe"),
);

const operatorMediaRetentionModeValidator = v.union(
  v.literal("metadata_only"),
  v.literal("full"),
);

const redactionMetadataValidator = v.object({
  status: v.union(v.literal("none"), v.literal("pending"), v.literal("applied")),
  profileId: v.optional(v.string()),
});

const encryptionMetadataValidator = v.object({
  atRest: v.union(v.literal("convex_managed"), v.literal("customer_managed")),
  keyRef: v.optional(v.string()),
});

const persistRetainedMediaCommonArgs = {
  organizationId: v.id("organizations"),
  conversationId: v.optional(v.id("aiConversations")),
  interviewSessionId: v.id("agentSessions"),
  liveSessionId: v.string(),
  mediaType: retainedMediaTypeValidator,
  mimeType: v.string(),
  capturedAt: v.number(),
  sourceClass: v.optional(v.string()),
  sourceId: v.optional(v.string()),
  sourceSequence: v.optional(v.number()),
  voiceSessionId: v.optional(v.string()),
  videoSessionId: v.optional(v.string()),
  idempotencyKey: v.string(),
  retentionMode: operatorMediaRetentionModeValidator,
  ttlExpiresAt: v.number(),
  redaction: v.optional(redactionMetadataValidator),
  encryption: v.optional(encryptionMetadataValidator),
  metadata: v.optional(v.any()),
  policy: v.object({
    sampled: v.boolean(),
    reason: v.string(),
    failClosed: v.boolean(),
  }),
} as const;

export const persistRetainedMediaMetadata = internalMutation({
  args: {
    ...persistRetainedMediaCommonArgs,
    sizeBytes: v.number(),
    checksum: v.string(),
    storagePath: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("operatorMediaRetention")
      .withIndex("by_org_idempotency", (q) =>
        q.eq("organizationId", args.organizationId).eq("idempotencyKey", args.idempotencyKey),
      )
      .first();
    if (existing) {
      return {
        retentionId: existing._id,
        storageId: existing.storageId ?? null,
        idempotent: true,
      };
    }

    const now = Date.now();
    const retentionId = await ctx.db.insert("operatorMediaRetention", {
      organizationId: args.organizationId,
      conversationId: args.conversationId,
      interviewSessionId: args.interviewSessionId,
      liveSessionId: args.liveSessionId,
      mediaType: args.mediaType,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      checksum: args.checksum,
      capturedAt: args.capturedAt,
      sourceClass: args.sourceClass,
      sourceId: args.sourceId,
      sourceSequence: args.sourceSequence,
      voiceSessionId: args.voiceSessionId,
      videoSessionId: args.videoSessionId,
      storageId: args.storageId,
      storagePath: args.storagePath,
      storageDisposition: args.retentionMode === "full" ? "stored" : "metadata_only",
      retentionMode: args.retentionMode,
      ttlExpiresAt: args.ttlExpiresAt,
      redaction: args.redaction,
      encryption: args.encryption,
      metadata: normalizeRecord(args.metadata),
      idempotencyKey: args.idempotencyKey,
      policy: args.policy,
      createdAt: now,
      updatedAt: now,
    });

    return {
      retentionId,
      storageId: args.storageId ?? null,
      idempotent: false,
    };
  },
});

export const persistRetainedMediaPayload = internalAction({
  args: {
    ...persistRetainedMediaCommonArgs,
    payloadBase64: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const materialized = await materializeOperatorMediaRetentionPayload({
      organizationId: args.organizationId,
      liveSessionId: args.liveSessionId,
      mediaType: args.mediaType,
      capturedAt: args.capturedAt,
      mimeType: args.mimeType,
      payloadBase64: args.payloadBase64,
    });

    let storageId: Id<"_storage"> | undefined;
    if (args.retentionMode === "full") {
      if (!materialized.payloadBytes || materialized.payloadBytes.byteLength === 0) {
        throw new Error(
          "operator_media_retention_full_mode_requires_non_empty_payload",
        );
      }
      storageId = await ctx.storage.store(
        new Blob([new Uint8Array(materialized.payloadBytes)], { type: args.mimeType }),
      );
    }

    const persisted = (await ctx.runMutation(
      generatedApi.internal.ai.mediaRetention.persistRetainedMediaMetadata,
      {
        organizationId: args.organizationId,
        conversationId: args.conversationId,
        interviewSessionId: args.interviewSessionId,
        liveSessionId: args.liveSessionId,
        mediaType: args.mediaType,
        mimeType: args.mimeType,
        capturedAt: args.capturedAt,
        sourceClass: args.sourceClass,
        sourceId: args.sourceId,
        sourceSequence: args.sourceSequence,
        voiceSessionId: args.voiceSessionId,
        videoSessionId: args.videoSessionId,
        idempotencyKey: args.idempotencyKey,
        retentionMode: args.retentionMode,
        ttlExpiresAt: args.ttlExpiresAt,
        redaction: args.redaction,
        encryption: args.encryption,
        metadata: args.metadata,
        policy: args.policy,
        sizeBytes: materialized.sizeBytes,
        checksum: materialized.checksum,
        storagePath: materialized.storagePath,
        storageId,
      },
    )) as {
      retentionId: Id<"operatorMediaRetention">;
      storageId: Id<"_storage"> | null;
      idempotent: boolean;
    };

    if (persisted.idempotent && storageId) {
      try {
        await ctx.storage.delete(storageId);
      } catch {
        // Best-effort cleanup for duplicate races.
      }
    }

    return persisted;
  },
});

export const listRetainedMedia = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    conversationId: v.optional(v.id("aiConversations")),
    interviewSessionId: v.optional(v.id("agentSessions")),
    liveSessionId: v.optional(v.string()),
    mediaType: v.optional(retainedMediaTypeValidator),
    includeDeleted: v.optional(v.boolean()),
    includeStorageUrl: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    assertOperatorMediaRetentionOrgScope({
      authenticatedOrganizationId: auth.organizationId,
      requestedOrganizationId: args.organizationId,
    });

    const limit = normalizeQueryLimit(args.limit, 50);
    const includeDeleted = Boolean(args.includeDeleted);
    const rows = await ctx.db
      .query("operatorMediaRetention")
      .withIndex("by_org_captured_at", (q) => q.eq("organizationId", auth.organizationId))
      .order("desc")
      .take(Math.max(limit * 3, limit));

    const filtered = rows.filter((row) => {
      if (!includeDeleted && typeof row.deletedAt === "number") {
        return false;
      }
      if (args.conversationId && String(row.conversationId) !== String(args.conversationId)) {
        return false;
      }
      if (
        args.interviewSessionId &&
        String(row.interviewSessionId) !== String(args.interviewSessionId)
      ) {
        return false;
      }
      if (args.liveSessionId && row.liveSessionId !== args.liveSessionId) {
        return false;
      }
      if (args.mediaType && row.mediaType !== args.mediaType) {
        return false;
      }
      return true;
    }).slice(0, limit);

    return await Promise.all(
      filtered.map(async (row) => {
        const url =
          args.includeStorageUrl &&
          row.storageId &&
          row.storageDisposition === "stored" &&
          !row.deletedAt
            ? await ctx.storage.getUrl(row.storageId)
            : null;
        return {
          ...row,
          storageUrl: url,
        };
      }),
    );
  },
});

export const getRetainedMedia = query({
  args: {
    sessionId: v.string(),
    retentionId: v.id("operatorMediaRetention"),
    includeStorageUrl: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const row = await ctx.db.get(args.retentionId);
    if (!row) {
      return null;
    }
    assertOperatorMediaRetentionOrgScope({
      authenticatedOrganizationId: auth.organizationId,
      recordOrganizationId: row.organizationId,
    });
    const storageUrl =
      args.includeStorageUrl &&
      row.storageId &&
      row.storageDisposition === "stored" &&
      !row.deletedAt
        ? await ctx.storage.getUrl(row.storageId)
        : null;
    return {
      ...row,
      storageUrl,
    };
  },
});

export const deleteRetainedMedia = mutation({
  args: {
    sessionId: v.string(),
    retentionId: v.id("operatorMediaRetention"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const row = await ctx.db.get(args.retentionId);
    if (!row) {
      throw new Error("Retained media record not found.");
    }
    assertOperatorMediaRetentionOrgScope({
      authenticatedOrganizationId: auth.organizationId,
      recordOrganizationId: row.organizationId,
    });
    if (typeof row.deletedAt === "number") {
      return {
        success: true,
        alreadyDeleted: true,
      };
    }

    await deleteStoredPayloadIfPresent(ctx, row);

    const now = Date.now();
    await ctx.db.patch(row._id, {
      deletedAt: now,
      deletedByUserId: auth.userId,
      deletedReason: normalizeString(args.reason) ?? "manual_delete",
      storageDeletedAt: row.storageId ? now : undefined,
      storageDisposition: row.storageId ? "deleted" : row.storageDisposition,
      updatedAt: now,
    });
    return {
      success: true,
      alreadyDeleted: false,
    };
  },
});

export const cleanupExpiredRetainedMedia = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = normalizeQueryLimit(args.limit, DEFAULT_CLEANUP_LIMIT);
    const candidates = await ctx.db
      .query("operatorMediaRetention")
      .withIndex("by_ttl_expires_at", (q) => q.lt("ttlExpiresAt", now))
      .take(limit);

    let scanned = 0;
    let deleted = 0;
    let skipped = 0;
    for (const candidate of candidates) {
      scanned += 1;
      if (typeof candidate.deletedAt === "number") {
        skipped += 1;
        continue;
      }
      await deleteStoredPayloadIfPresent(ctx, candidate);
      await ctx.db.patch(candidate._id, {
        deletedAt: now,
        deletedReason: "ttl_expired",
        storageDeletedAt: candidate.storageId ? now : undefined,
        storageDisposition: candidate.storageId ? "deleted" : candidate.storageDisposition,
        updatedAt: now,
      });
      deleted += 1;
    }

    return {
      scanned,
      deleted,
      skipped,
      now,
      limit,
    };
  },
});
