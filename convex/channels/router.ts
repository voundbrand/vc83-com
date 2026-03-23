/**
 * CHANNEL ROUTER
 *
 * Routes outbound messages to the correct provider for a given org + channel.
 * Reads channel_provider_binding objects from the ontology to determine routing.
 *
 * Binding object (type="channel_provider_binding") customProperties:
 * {
 *   channel: "whatsapp",
 *   providerId: "chatwoot",
 *   priority: 1,
 *   enabled: true,
 *   providerConnectionId: "oauthConnections:...",
 *   providerInstallationId: "team_or_waba_or_bot_identity",
 *   providerProfileId: "app_profile_identity",
 *   providerProfileType: "organization" | "platform",
 *   routeKey: "provider:installation:route",
 *   allowPlatformFallback: false,
 * }
 */

import { query, internalQuery, internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getProvider } from "./registry";
import { withRetry, CHANNEL_RETRY_POLICIES } from "../ai/retryPolicy";
import type { Doc, Id } from "../_generated/dataModel";

const { internal: internalApi } = require("../_generated/api") as {
  internal: Record<string, Record<string, Record<string, unknown>>>;
};
import type {
  ChannelProvider,
  ChannelProviderBindingContract,
  ChannelType,
  ProviderId,
  OutboundMessage,
  ProviderProfileType,
  SendResult,
  ProviderCredentialField,
  ProviderCredentials,
} from "./types";

const ENCRYPTED_CHANNEL_FIELDS = new Set<ProviderCredentialField>([
  "whatsappAccessToken",
  "slackBotToken",
  "telegramBotToken",
  "telegramWebhookSecret",
  "chatwootApiToken",
  "manychatApiKey",
  "resendApiKey",
  "directCallApiKey",
  "directCallWebhookSecret",
]);

const APPOINTMENT_OUTREACH_CONTRACT_VERSION = "appointment_outreach_v1" as const;
const TELEPHONY_ARTIFACT_CONTRACT_VERSION = "telephony_artifact_v1" as const;
const TELEPHONY_AUDIT_CONTRACT_VERSION = "telephony_audit_v1" as const;
const APPOINTMENT_OUTREACH_DEFAULT_MAX_ATTEMPTS = 4;
const APPOINTMENT_OUTREACH_MAX_WINDOW_MS = 48 * 60 * 60 * 1000;
const APPOINTMENT_OUTREACH_RETRY_DELAY_MS = 2 * 60 * 60 * 1000;
const APPOINTMENT_OUTREACH_VOICEMAIL_DELAY_MS = 4 * 60 * 60 * 1000;
const APPOINTMENT_OUTREACH_DEFAULT_ALLOWED_HOURS = {
  start: "09:00",
  end: "17:00",
  timezone: "UTC",
} as const;

export const TELEPHONY_AUDIT_EVENT_NAMES = {
  callConsentRecorded: "trust.guardrail.telephony_consent_recorded.v1",
  callExecutionRecorded: "trust.lifecycle.telephony_call_execution_recorded.v1",
  transcriptIngestionRecorded: "trust.knowledge.telephony_transcript_ingested.v1",
  outcomeMutationRecorded: "trust.lifecycle.telephony_outcome_mutation_recorded.v1",
} as const;

export const TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES = {
  callConsent: "telephony_consent_evidence_artifact",
  callExecution: "telephony_call_execution_evidence_artifact",
  transcriptIngestion: "telephony_transcript_ingest_evidence_artifact",
  outcomeMutation: "telephony_outcome_mutation_evidence_artifact",
} as const;

const TELEPHONY_AUDIT_BASE_IMMUTABLE_FIELD_KEYS = [
  "contractVersion",
  "eventId",
  "eventName",
  "eventVersion",
  "evidenceArtifactType",
  "recordedAt",
  "providerId",
  "providerCallId",
  "providerConversationId",
  "callRecordId",
  "sourceArtifactId",
  "missionId",
  "attemptId",
  "bookingId",
  "idempotencyKey",
  "mutationSource",
  "payload",
] as const;

export const TELEPHONY_AUDIT_IMMUTABLE_FIELD_KEYS = {
  callConsent: [
    ...TELEPHONY_AUDIT_BASE_IMMUTABLE_FIELD_KEYS,
    "payload.consentScope",
    "payload.recordingDisclosureStatus",
    "payload.recordingConsentStatus",
    "payload.callFallbackApproved",
    "payload.callConsentDisclosurePresent",
    "payload.autonomyPromotionApprovalId",
    "payload.autonomyPromotionReason",
    "payload.domainAutonomyLevel",
    "payload.promotionCriteriaMet",
  ],
  callExecution: [
    ...TELEPHONY_AUDIT_BASE_IMMUTABLE_FIELD_KEYS,
    "payload.recipientIdentifier",
    "payload.providerMessageId",
    "payload.sendSuccess",
    "payload.sendError",
    "payload.scriptCharacterCount",
    "payload.outcomeStatus",
    "payload.disposition",
    "payload.voicemailDetected",
  ],
  transcriptIngestion: [
    ...TELEPHONY_AUDIT_BASE_IMMUTABLE_FIELD_KEYS,
    "payload.priorTranscriptStatus",
    "payload.nextTranscriptStatus",
    "payload.priorCapturedAt",
    "payload.nextCapturedAt",
    "payload.transcriptCharacterCount",
    "payload.transcriptSegmentCount",
  ],
  outcomeMutation: [
    ...TELEPHONY_AUDIT_BASE_IMMUTABLE_FIELD_KEYS,
    "payload.priorOutcome",
    "payload.nextOutcome",
    "payload.priorDisposition",
    "payload.nextDisposition",
    "payload.durationSeconds",
    "payload.endedAt",
    "payload.voicemailDetected",
    "payload.errorMessagePresent",
  ],
} as const;

type TelephonyAuditEvidenceKind =
  keyof typeof TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES;

export const APPOINTMENT_OUTREACH_LIMITS = Object.freeze({
  defaultMaxAttempts: APPOINTMENT_OUTREACH_DEFAULT_MAX_ATTEMPTS,
  maxWindowMs: APPOINTMENT_OUTREACH_MAX_WINDOW_MS,
  retryDelayMs: APPOINTMENT_OUTREACH_RETRY_DELAY_MS,
  voicemailDelayMs: APPOINTMENT_OUTREACH_VOICEMAIL_DELAY_MS,
});

export type AppointmentChannel = "sms" | "email" | "telegram" | "phone_call";
type AppointmentMissionOutcome =
  | "BOOKED"
  | "OUTREACH_DELIVERED"
  | "UNRESOLVED_WITH_REASON";

interface AppointmentAllowedHours {
  start: string;
  end: string;
  timezone: string;
}

export interface AppointmentMissionStep {
  channel: AppointmentChannel;
  reasonCode: string;
  requiresApproval?: boolean;
}

interface AppointmentMissionSnapshot {
  bookingId?: string;
  missionStartedAt?: number;
  missionDeadlineAt?: number;
  maxAttempts?: number;
  nextAttemptAt?: number;
  domainAutonomyLevel?: "sandbox" | "live";
  callFallbackApproved?: boolean;
  callConsentDisclosure?: string;
  autonomyPromotionApprovalId?: string;
  autonomyPromotionReason?: string;
  attemptLadder?: AppointmentMissionStep[];
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    telegram?: string;
  };
  outreachPreferences?: {
    preferredChannel?: AppointmentChannel;
    fallbackMethod?: AppointmentChannel | "none";
    allowedHours?: {
      start?: string;
      end?: string;
      timezone?: string;
    };
  };
  lastAttemptAt?: number;
  attemptCount?: number;
  awaitingCallOutcome?: boolean;
  outcome?: AppointmentMissionOutcome;
  outcomeReason?: string;
  completedAt?: number;
}

interface ChannelBindingResolutionHints {
  providerId?: ProviderId;
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: ProviderProfileType;
  routeKey?: string;
}

const TELEPHONY_BINDING_IDENTITY_PRECEDENCE = [
  "providerConnectionId",
  "providerInstallationId",
  "providerProfileType",
  "routeKey",
] as const;

type TelephonyBindingIdentityField =
  (typeof TELEPHONY_BINDING_IDENTITY_PRECEDENCE)[number];

type ObjectId = Id<"objects">;
type OrganizationId = Id<"organizations">;
type ObjectDoc = Doc<"objects">;
type OrganizationDoc = Doc<"organizations">;
type RouterActionCtx = {
  db?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query?: (table: "objects" | "organizations") => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      withIndex: (indexName: string, cb: (q: any) => any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collect: () => Promise<any[]>;
      };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get?: (id: ObjectId | OrganizationId) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    insert?: (table: "objects", value: any) => Promise<ObjectId>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patch?: (id: ObjectId, value: any) => Promise<void>;
  };
  runQuery?: unknown;
  runMutation?: unknown;
};

function toObjectId(value: unknown): ObjectId | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? (normalized as ObjectId) : null;
}

function isObjectDoc(value: unknown): value is ObjectDoc {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as { _id?: unknown; type?: unknown; organizationId?: unknown };
  return (
    typeof candidate._id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.organizationId === "string"
  );
}

async function listObjectsByOrgTypeRecord(
  ctx: RouterActionCtx,
  organizationId: OrganizationId,
  type: string
): Promise<ObjectDoc[]> {
  if (ctx.db?.query) {
    const rows = await ctx.db
      .query("objects")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_org_type", (q: any) =>
        q.eq("organizationId", organizationId).eq("type", type)
      )
      .collect();
    return rows as ObjectDoc[];
  }
  if (typeof ctx.runQuery === "function") {
    return ((ctx.runQuery as Function)(
      internalApi.channels.router.listObjectsByOrgTypeInternal,
      { organizationId, type }
    ) as Promise<ObjectDoc[]>) || [];
  }
  throw new Error("Router context does not support object list query");
}

async function listObjectsByTypeRecord(
  ctx: RouterActionCtx,
  type: string
): Promise<ObjectDoc[]> {
  if (ctx.db?.query) {
    const rows = await ctx.db
      .query("objects")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_type", (q: any) => q.eq("type", type))
      .collect();
    return rows as ObjectDoc[];
  }
  if (typeof ctx.runQuery === "function") {
    return ((ctx.runQuery as Function)(
      internalApi.channels.router.listObjectsByTypeInternal,
      { type }
    ) as Promise<ObjectDoc[]>) || [];
  }
  throw new Error("Router context does not support object type query");
}

async function getObjectRecord(
  ctx: RouterActionCtx,
  objectId: ObjectId
): Promise<ObjectDoc | null> {
  if (ctx.db?.get) {
    const doc = await ctx.db.get(objectId);
    return isObjectDoc(doc) ? doc : null;
  }
  if (typeof ctx.runQuery === "function") {
    const doc = await (ctx.runQuery as Function)(
      internalApi.channels.router.getObjectByIdInternal,
      { objectId }
    );
    return isObjectDoc(doc) ? doc : null;
  }
  throw new Error("Router context does not support object get");
}

async function getOrganizationRecord(
  ctx: RouterActionCtx,
  organizationId: OrganizationId
): Promise<OrganizationDoc | null> {
  if (ctx.db?.get) {
    const doc = await ctx.db.get(organizationId);
    if (doc && typeof doc === "object") {
      return doc as OrganizationDoc;
    }
    return null;
  }
  if (typeof ctx.runQuery === "function") {
    return (await (ctx.runQuery as Function)(
      internalApi.channels.router.getOrganizationByIdInternal,
      { organizationId }
    )) as OrganizationDoc | null;
  }
  throw new Error("Router context does not support organization get");
}

async function insertObjectRecord(
  ctx: RouterActionCtx,
  value: {
    organizationId: OrganizationId;
    type: string;
    subtype?: string;
    name: string;
    status: string;
    customProperties?: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
  }
): Promise<ObjectId> {
  if (ctx.db?.insert) {
    return (await ctx.db.insert("objects", value)) as ObjectId;
  }
  if (typeof ctx.runMutation === "function") {
    return (await (ctx.runMutation as Function)(
      internalApi.channels.router.insertObjectInternal,
      value
    )) as ObjectId;
  }
  throw new Error("Router context does not support object insert");
}

async function patchObjectRecord(
  ctx: RouterActionCtx,
  objectId: ObjectId,
  patch: {
    status?: string;
    customProperties?: Record<string, unknown>;
    updatedAt?: number;
  }
): Promise<void> {
  if (ctx.db?.patch) {
    await ctx.db.patch(objectId, patch);
    return;
  }
  if (typeof ctx.runMutation === "function") {
    await (ctx.runMutation as Function)(internalApi.channels.router.patchObjectInternal, {
      objectId,
      ...patch,
    });
    return;
  }
  throw new Error("Router context does not support object patch");
}

function normalizeEncryptedFields(
  value: unknown
): ProviderCredentialField[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value.filter(
    (field): field is ProviderCredentialField =>
      typeof field === "string" &&
      ENCRYPTED_CHANNEL_FIELDS.has(field as ProviderCredentialField)
  );

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
  return normalized.length > 0 ? normalized : undefined;
}

function stripUndefinedProperties(
  value: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}

function appendUniqueReference(
  existing: unknown,
  nextValue: string | undefined
): string[] | undefined {
  const normalized = normalizeOptionalStringArray(existing) || [];
  const candidate = normalizeOptionalString(nextValue);
  if (!candidate) {
    return normalized.length > 0 ? normalized : undefined;
  }
  if (normalized.includes(candidate)) {
    return normalized;
  }
  normalized.push(candidate);
  return normalized;
}

function normalizeProviderProfileType(value: unknown): ProviderProfileType | undefined {
  return value === "platform" || value === "organization" ? value : undefined;
}

function normalizeHourMinute(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalized) ? normalized : fallback;
}

function normalizeAppointmentChannel(value: unknown): AppointmentChannel | undefined {
  if (
    value === "sms" ||
    value === "email" ||
    value === "telegram" ||
    value === "phone_call"
  ) {
    return value;
  }
  return undefined;
}

function resolveMissionAllowedHours(props: AppointmentMissionSnapshot): AppointmentAllowedHours {
  const allowedHours = props.outreachPreferences?.allowedHours || {};
  return {
    start: normalizeHourMinute(
      allowedHours.start,
      APPOINTMENT_OUTREACH_DEFAULT_ALLOWED_HOURS.start
    ),
    end: normalizeHourMinute(
      allowedHours.end,
      APPOINTMENT_OUTREACH_DEFAULT_ALLOWED_HOURS.end
    ),
    timezone:
      normalizeOptionalString(allowedHours.timezone) ||
      APPOINTMENT_OUTREACH_DEFAULT_ALLOWED_HOURS.timezone,
  };
}

function parseHourMinuteMinutes(value: string): number {
  const [hourToken, minuteToken] = value.split(":");
  const hours = Number.parseInt(hourToken || "0", 10);
  const minutes = Number.parseInt(minuteToken || "0", 10);
  return hours * 60 + minutes;
}

function resolveLocalMinutes(now: number, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(now));
    const hourPart = parts.find((part) => part.type === "hour");
    const minutePart = parts.find((part) => part.type === "minute");
    const hours = Number.parseInt(hourPart?.value || "", 10);
    const minutes = Number.parseInt(minutePart?.value || "", 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }
    return hours * 60 + minutes;
  } catch {
    return null;
  }
}

function isWithinAllowedHours(args: {
  now: number;
  start: string;
  end: string;
  timeZone: string;
}): boolean {
  const localMinutes = resolveLocalMinutes(args.now, args.timeZone);
  if (localMinutes === null) {
    return true;
  }
  const startMinutes = parseHourMinuteMinutes(args.start);
  const endMinutes = parseHourMinuteMinutes(args.end);
  if (startMinutes === endMinutes) {
    return true;
  }
  if (startMinutes < endMinutes) {
    return localMinutes >= startMinutes && localMinutes < endMinutes;
  }
  return localMinutes >= startMinutes || localMinutes < endMinutes;
}

function resolveNextAllowedTimestamp(args: {
  now: number;
  start: string;
  end: string;
  timeZone: string;
}): number {
  const stepMs = 15 * 60 * 1000;
  let cursor = args.now + stepMs;
  const horizonMs = 3 * 24 * 60 * 60 * 1000;
  const deadline = args.now + horizonMs;
  while (cursor <= deadline) {
    if (
      isWithinAllowedHours({
        now: cursor,
        start: args.start,
        end: args.end,
        timeZone: args.timeZone,
      })
    ) {
      return cursor;
    }
    cursor += stepMs;
  }
  return args.now + 24 * 60 * 60 * 1000;
}

function resolveAttemptLadder(args: {
  preferredChannel?: AppointmentChannel;
  fallbackMethod?: AppointmentChannel | "none";
  hasSms: boolean;
  hasEmail: boolean;
  hasTelegram: boolean;
  hasPhone: boolean;
  callFallbackApproved: boolean;
  domainAutonomyLevel: "sandbox" | "live";
  maxAttempts: number;
}): AppointmentMissionStep[] {
  const availableAsync = new Set<AppointmentChannel>();
  if (args.hasSms) availableAsync.add("sms");
  if (args.hasEmail) availableAsync.add("email");
  if (args.hasTelegram) availableAsync.add("telegram");

  const orderedAsync: AppointmentChannel[] = [];
  if (
    args.preferredChannel &&
    args.preferredChannel !== "phone_call" &&
    availableAsync.has(args.preferredChannel)
  ) {
    orderedAsync.push(args.preferredChannel);
  }

  for (const channel of ["sms", "email", "telegram"] as const) {
    if (!availableAsync.has(channel)) {
      continue;
    }
    if (orderedAsync.includes(channel)) {
      continue;
    }
    orderedAsync.push(channel);
  }

  if (
    args.fallbackMethod &&
    args.fallbackMethod !== "none" &&
    args.fallbackMethod !== "phone_call" &&
    availableAsync.has(args.fallbackMethod)
  ) {
    if (!orderedAsync.includes(args.fallbackMethod)) {
      orderedAsync.push(args.fallbackMethod);
    }
  }

  const ladder: AppointmentMissionStep[] = orderedAsync.map((channel, index) => ({
    channel,
    reasonCode: index === 0 ? "initial_outreach" : "async_fallback_retry",
  }));

  if (
    args.hasPhone &&
    args.callFallbackApproved &&
    args.domainAutonomyLevel === "live"
  ) {
    const minimumAsyncBeforeCall = orderedAsync.length >= 2 ? 2 : orderedAsync.length;
    while (ladder.length < minimumAsyncBeforeCall) {
      ladder.push({
        channel: orderedAsync[ladder.length] || orderedAsync[0] || "sms",
        reasonCode: "async_retry_before_call",
      });
    }
    ladder.push({
      channel: "phone_call",
      reasonCode: "approved_call_fallback",
      requiresApproval: true,
    });
  }

  if (ladder.length === 0 && args.hasPhone) {
    ladder.push({
      channel: "phone_call",
      reasonCode:
        args.callFallbackApproved && args.domainAutonomyLevel === "live"
          ? "approved_call_only_channel"
          : "call_blocked_missing_promotion",
      requiresApproval: true,
    });
  }

  return ladder.slice(0, Math.max(1, args.maxAttempts));
}

export function buildAppointmentOutreachAttemptLadder(args: {
  preferredChannel?: AppointmentChannel;
  fallbackMethod?: AppointmentChannel | "none";
  hasSms: boolean;
  hasEmail: boolean;
  hasTelegram: boolean;
  hasPhone: boolean;
  callFallbackApproved: boolean;
  domainAutonomyLevel: "sandbox" | "live";
  maxAttempts: number;
}): AppointmentMissionStep[] {
  return resolveAttemptLadder(args);
}

function mapTelephonySendOutcome(result: SendResult): {
  transcriptStatus: "pending" | "captured" | "failed";
  outcomeStatus: string;
  voicemailDetected: boolean;
} {
  if (!result.success) {
    return {
      transcriptStatus: "failed",
      outcomeStatus: "failed_to_start",
      voicemailDetected: false,
    };
  }
  const transcriptAvailable = Boolean(
    normalizeOptionalString(result.telephony?.transcriptText)
  );
  return {
    transcriptStatus: transcriptAvailable ? "captured" : "pending",
    outcomeStatus:
      normalizeOptionalString(result.telephony?.outcome) || "queued",
    voicemailDetected: result.telephony?.voicemailDetected === true,
  };
}

function buildTelephonyAuditEventId(args: {
  providerCallId: string;
  evidenceKind: TelephonyAuditEvidenceKind;
  recordedAt: number;
}): string {
  return `telephony_audit:${args.providerCallId}:${args.evidenceKind}:${args.recordedAt}`;
}

async function appendAuditArtifactReference(args: {
  ctx: RouterActionCtx;
  objectId: ObjectId;
  auditArtifactId: string;
  auditArtifactType: string;
  updatedAt: number;
}): Promise<void> {
  const target = await getObjectRecord(args.ctx, args.objectId);
  if (!target) {
    return;
  }
  const props = (target.customProperties || {}) as Record<string, unknown>;
  await patchObjectRecord(args.ctx, args.objectId, {
    customProperties: {
      ...props,
      auditTrailArtifactIds: appendUniqueReference(
        props.auditTrailArtifactIds,
        args.auditArtifactId
      ),
      auditTrailArtifactTypes: appendUniqueReference(
        props.auditTrailArtifactTypes,
        args.auditArtifactType
      ),
      auditContractVersion:
        normalizeOptionalString(props.auditContractVersion) ||
        TELEPHONY_AUDIT_CONTRACT_VERSION,
    },
    updatedAt: args.updatedAt,
  });
}

async function createTelephonyAuditEvidenceArtifact(args: {
  ctx: RouterActionCtx;
  organizationId: OrganizationId;
  providerId: ProviderId;
  providerCallId: string;
  providerConversationId?: string;
  callRecordId?: string;
  sourceArtifactId?: string;
  missionId?: string;
  attemptId?: string;
  bookingId?: string;
  idempotencyKey?: string;
  evidenceKind: TelephonyAuditEvidenceKind;
  mutationSource: "send_result" | "webhook_outcome";
  payload: Record<string, unknown>;
  recordedAt: number;
}): Promise<string> {
  const eventNameMap = {
    callConsent: TELEPHONY_AUDIT_EVENT_NAMES.callConsentRecorded,
    callExecution: TELEPHONY_AUDIT_EVENT_NAMES.callExecutionRecorded,
    transcriptIngestion: TELEPHONY_AUDIT_EVENT_NAMES.transcriptIngestionRecorded,
    outcomeMutation: TELEPHONY_AUDIT_EVENT_NAMES.outcomeMutationRecorded,
  } as const;
  const evidenceArtifactType =
    TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES[args.evidenceKind];
  const immutableFieldKeys =
    TELEPHONY_AUDIT_IMMUTABLE_FIELD_KEYS[args.evidenceKind];
  const eventId = buildTelephonyAuditEventId({
    providerCallId: args.providerCallId,
    evidenceKind: args.evidenceKind,
    recordedAt: args.recordedAt,
  });
  const payload = stripUndefinedProperties(args.payload);
  const auditArtifactId = await insertObjectRecord(args.ctx, {
    organizationId: args.organizationId,
    type: evidenceArtifactType,
    subtype: args.providerId,
    name: `${eventNameMap[args.evidenceKind]} ${args.providerCallId}`,
    status: "recorded",
    customProperties: stripUndefinedProperties({
      contractVersion: TELEPHONY_AUDIT_CONTRACT_VERSION,
      telephonyArtifactContractVersion: TELEPHONY_ARTIFACT_CONTRACT_VERSION,
      eventId,
      eventName: eventNameMap[args.evidenceKind],
      eventVersion: "v1",
      evidenceKind: args.evidenceKind,
      evidenceArtifactType,
      immutableFieldKeys: [...immutableFieldKeys],
      recordedAt: args.recordedAt,
      providerId: args.providerId,
      providerCallId: args.providerCallId,
      providerConversationId: args.providerConversationId,
      callRecordId: args.callRecordId,
      sourceArtifactId: args.sourceArtifactId,
      missionId: args.missionId,
      attemptId: args.attemptId,
      bookingId: args.bookingId,
      idempotencyKey: args.idempotencyKey,
      mutationSource: args.mutationSource,
      payload,
    }),
    createdAt: args.recordedAt,
    updatedAt: args.recordedAt,
  });

  if (args.callRecordId) {
    const callRecordObjectId = toObjectId(args.callRecordId);
    if (callRecordObjectId) {
      await appendAuditArtifactReference({
        ctx: args.ctx,
        objectId: callRecordObjectId,
        auditArtifactId: String(auditArtifactId),
        auditArtifactType: evidenceArtifactType,
        updatedAt: args.recordedAt,
      });
    }
  }

  if (args.sourceArtifactId) {
    const sourceArtifactObjectId = toObjectId(args.sourceArtifactId);
    if (sourceArtifactObjectId) {
      await appendAuditArtifactReference({
        ctx: args.ctx,
        objectId: sourceArtifactObjectId,
        auditArtifactId: String(auditArtifactId),
        auditArtifactType: evidenceArtifactType,
        updatedAt: args.recordedAt,
      });
    }
  }

  return String(auditArtifactId);
}

async function persistTelephonyCallArtifacts(args: {
  ctx: RouterActionCtx;
  organizationId: OrganizationId;
  providerId: ProviderId;
  recipientIdentifier: string;
  content: string;
  providerConversationId?: string;
  idempotencyKey?: string;
  missionId?: string;
  attemptId?: string;
  bookingId?: string;
  result: SendResult;
}): Promise<void> {
  const now = Date.now();
  const providerCallId =
    normalizeOptionalString(args.result.telephony?.providerCallId) ||
    normalizeOptionalString(args.result.providerMessageId) ||
    normalizeOptionalString(args.idempotencyKey) ||
    `call_${now}`;
  const transcriptText = normalizeOptionalString(
    args.result.telephony?.transcriptText
  );
  const telephonyOutcome = mapTelephonySendOutcome(args.result);

  const transcriptArtifactId = await insertObjectRecord(args.ctx, {
    organizationId: args.organizationId,
    type: "telephony_transcript_artifact",
    subtype: args.providerId,
    name: `Call transcript ${providerCallId}`,
    status: telephonyOutcome.transcriptStatus,
    customProperties: {
      contractVersion: TELEPHONY_ARTIFACT_CONTRACT_VERSION,
      providerId: args.providerId,
      providerCallId,
      transcriptStatus: telephonyOutcome.transcriptStatus,
      transcriptText,
      transcriptSegments: Array.isArray(args.result.telephony?.transcriptSegments)
        ? args.result.telephony?.transcriptSegments
        : [],
      capturedAt: transcriptText ? now : undefined,
      missionId: args.missionId,
      attemptId: args.attemptId,
      bookingId: args.bookingId,
      auditContractVersion: TELEPHONY_AUDIT_CONTRACT_VERSION,
      auditEventName: TELEPHONY_AUDIT_EVENT_NAMES.transcriptIngestionRecorded,
      immutableEvidenceArtifactType:
        TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES.transcriptIngestion,
    },
    createdAt: now,
    updatedAt: now,
  });

  const outcomeArtifactId = await insertObjectRecord(args.ctx, {
    organizationId: args.organizationId,
    type: "telephony_outcome_artifact",
    subtype: args.providerId,
    name: `Call outcome ${providerCallId}`,
    status: args.result.success ? "pending" : "failed",
    customProperties: {
      contractVersion: TELEPHONY_ARTIFACT_CONTRACT_VERSION,
      providerId: args.providerId,
      providerCallId,
      outcome: telephonyOutcome.outcomeStatus,
      disposition: normalizeOptionalString(args.result.telephony?.disposition),
      durationSeconds:
        typeof args.result.telephony?.durationSeconds === "number"
          ? args.result.telephony?.durationSeconds
          : undefined,
      endedAt:
        typeof args.result.telephony?.endedAt === "number"
          ? args.result.telephony?.endedAt
          : undefined,
      voicemailDetected: telephonyOutcome.voicemailDetected,
      sendSuccess: args.result.success,
      sendError: args.result.error,
      missionId: args.missionId,
      attemptId: args.attemptId,
      bookingId: args.bookingId,
      auditContractVersion: TELEPHONY_AUDIT_CONTRACT_VERSION,
      auditEventName: TELEPHONY_AUDIT_EVENT_NAMES.outcomeMutationRecorded,
      immutableEvidenceArtifactType:
        TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES.outcomeMutation,
    },
    createdAt: now,
    updatedAt: now,
  });

  const callRecordId = await insertObjectRecord(args.ctx, {
    organizationId: args.organizationId,
    type: "telephony_call_record",
    subtype: args.providerId,
    name: `Call ${providerCallId}`,
    status: args.result.success ? "active" : "failed",
    customProperties: {
      contractVersion: TELEPHONY_ARTIFACT_CONTRACT_VERSION,
      providerId: args.providerId,
      providerCallId,
      providerMessageId: args.result.providerMessageId,
      recipientIdentifier: args.recipientIdentifier,
      script: args.content,
      providerConversationId: args.providerConversationId,
      sendSuccess: args.result.success,
      sendError: args.result.error,
      idempotencyKey: args.idempotencyKey,
      missionId: args.missionId,
      attemptId: args.attemptId,
      bookingId: args.bookingId,
      transcriptArtifactId,
      outcomeArtifactId,
      outcome: telephonyOutcome.outcomeStatus,
      disposition: normalizeOptionalString(args.result.telephony?.disposition),
      voicemailDetected: telephonyOutcome.voicemailDetected,
      durationSeconds:
        typeof args.result.telephony?.durationSeconds === "number"
          ? args.result.telephony?.durationSeconds
          : undefined,
      endedAt:
        typeof args.result.telephony?.endedAt === "number"
          ? args.result.telephony?.endedAt
          : undefined,
      createdAt: now,
      auditContractVersion: TELEPHONY_AUDIT_CONTRACT_VERSION,
      auditEventNames: {
        ...TELEPHONY_AUDIT_EVENT_NAMES,
      },
      immutableEvidenceArtifactTypes: {
        ...TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES,
      },
    },
    createdAt: now,
    updatedAt: now,
  });

  let missionProps:
    | (AppointmentMissionSnapshot & Record<string, unknown>)
    | undefined;
  const missionObjectId = toObjectId(args.missionId);
  if (missionObjectId) {
    const mission = await getObjectRecord(args.ctx, missionObjectId);
    if (mission && mission.type === "appointment_outreach_mission") {
      missionProps = (mission.customProperties || {}) as AppointmentMissionSnapshot &
        Record<string, unknown>;
    }
  }

  await createTelephonyAuditEvidenceArtifact({
    ctx: args.ctx,
    organizationId: args.organizationId,
    providerId: args.providerId,
    providerCallId,
    providerConversationId: args.providerConversationId,
    callRecordId: String(callRecordId),
    missionId: args.missionId,
    attemptId: args.attemptId,
    bookingId: args.bookingId,
    idempotencyKey: args.idempotencyKey,
    evidenceKind: "callConsent",
    mutationSource: "send_result",
    recordedAt: now,
    payload: {
      consentScope: args.missionId ? "appointment_outreach" : "telephony_call",
      recordingDisclosureStatus:
        normalizeOptionalString(missionProps?.callConsentDisclosure)
          ? "disclosed"
          : "not_captured",
      recordingConsentStatus:
        missionProps?.callFallbackApproved === true &&
        normalizeOptionalString(missionProps?.callConsentDisclosure)
          ? "evidence_present"
          : args.missionId
            ? "evidence_missing"
            : "not_applicable",
      callFallbackApproved: missionProps?.callFallbackApproved === true,
      callConsentDisclosurePresent: Boolean(
        normalizeOptionalString(missionProps?.callConsentDisclosure)
      ),
      autonomyPromotionApprovalId: normalizeOptionalString(
        missionProps?.autonomyPromotionApprovalId
      ),
      autonomyPromotionReason: normalizeOptionalString(
        missionProps?.autonomyPromotionReason
      ),
      domainAutonomyLevel: normalizeOptionalString(missionProps?.domainAutonomyLevel),
      promotionCriteriaMet:
        normalizeOptionalBoolean(missionProps?.promotionCriteriaMet) ?? false,
    },
  });

  await createTelephonyAuditEvidenceArtifact({
    ctx: args.ctx,
    organizationId: args.organizationId,
    providerId: args.providerId,
    providerCallId,
    providerConversationId: args.providerConversationId,
    callRecordId: String(callRecordId),
    missionId: args.missionId,
    attemptId: args.attemptId,
    bookingId: args.bookingId,
    idempotencyKey: args.idempotencyKey,
    evidenceKind: "callExecution",
    mutationSource: "send_result",
    recordedAt: now,
    payload: {
      recipientIdentifier: args.recipientIdentifier,
      providerMessageId: normalizeOptionalString(args.result.providerMessageId),
      sendSuccess: args.result.success,
      sendError: normalizeOptionalString(args.result.error),
      scriptCharacterCount: args.content.length,
      outcomeStatus: telephonyOutcome.outcomeStatus,
      disposition: normalizeOptionalString(args.result.telephony?.disposition),
      voicemailDetected: telephonyOutcome.voicemailDetected,
    },
  });

  if (
    transcriptText ||
    Array.isArray(args.result.telephony?.transcriptSegments)
  ) {
    await createTelephonyAuditEvidenceArtifact({
      ctx: args.ctx,
      organizationId: args.organizationId,
      providerId: args.providerId,
      providerCallId,
      providerConversationId: args.providerConversationId,
      callRecordId: String(callRecordId),
      sourceArtifactId: String(transcriptArtifactId),
      missionId: args.missionId,
      attemptId: args.attemptId,
      bookingId: args.bookingId,
      idempotencyKey: args.idempotencyKey,
      evidenceKind: "transcriptIngestion",
      mutationSource: "send_result",
      recordedAt: now,
      payload: {
        priorTranscriptStatus: "missing",
        nextTranscriptStatus: telephonyOutcome.transcriptStatus,
        priorCapturedAt: undefined,
        nextCapturedAt: transcriptText ? now : undefined,
        transcriptCharacterCount: transcriptText?.length || 0,
        transcriptSegmentCount: Array.isArray(args.result.telephony?.transcriptSegments)
          ? args.result.telephony?.transcriptSegments.length
          : 0,
      },
    });
  }

  await createTelephonyAuditEvidenceArtifact({
    ctx: args.ctx,
    organizationId: args.organizationId,
    providerId: args.providerId,
    providerCallId,
    providerConversationId: args.providerConversationId,
    callRecordId: String(callRecordId),
    sourceArtifactId: String(outcomeArtifactId),
    missionId: args.missionId,
    attemptId: args.attemptId,
    bookingId: args.bookingId,
    idempotencyKey: args.idempotencyKey,
    evidenceKind: "outcomeMutation",
    mutationSource: "send_result",
    recordedAt: now,
    payload: {
      priorOutcome: "missing",
      nextOutcome: telephonyOutcome.outcomeStatus,
      priorDisposition: undefined,
      nextDisposition: normalizeOptionalString(args.result.telephony?.disposition),
      durationSeconds:
        typeof args.result.telephony?.durationSeconds === "number"
          ? args.result.telephony?.durationSeconds
          : undefined,
      endedAt:
        typeof args.result.telephony?.endedAt === "number"
          ? args.result.telephony?.endedAt
          : undefined,
      voicemailDetected: telephonyOutcome.voicemailDetected,
      errorMessagePresent: Boolean(normalizeOptionalString(args.result.error)),
    },
  });

  if (args.attemptId) {
    try {
      const attemptId = toObjectId(args.attemptId);
      const attempt = attemptId
        ? await getObjectRecord(args.ctx, attemptId)
        : null;
      if (attempt) {
        const existing = (attempt.customProperties || {}) as Record<string, unknown>;
        await patchObjectRecord(args.ctx, attempt._id, {
          status: args.result.success ? "active" : "failed",
          customProperties: {
            ...existing,
            callRecordId,
            providerCallId,
            telephonyOutcome: telephonyOutcome.outcomeStatus,
            telephonyDisposition: normalizeOptionalString(
              args.result.telephony?.disposition
            ),
            voicemailDetected: telephonyOutcome.voicemailDetected,
            sendSuccess: args.result.success,
            sendError: args.result.error,
            completedAt: now,
          },
          updatedAt: now,
        });
      }
    } catch (error) {
      console.warn("[Router] Failed to attach telephony call record to outreach attempt:", error);
    }
  }
}

function normalizeChannelBindingResolutionHints(
  value: ChannelBindingResolutionHints
): ChannelBindingResolutionHints {
  return {
    providerId: normalizeOptionalString(value.providerId) as ProviderId | undefined,
    providerConnectionId: normalizeOptionalString(value.providerConnectionId),
    providerAccountId: normalizeOptionalString(value.providerAccountId),
    providerInstallationId: normalizeOptionalString(value.providerInstallationId),
    providerProfileId: normalizeOptionalString(value.providerProfileId),
    providerProfileType: normalizeProviderProfileType(value.providerProfileType),
    routeKey: normalizeOptionalString(value.routeKey),
  };
}

function hasChannelBindingResolutionHints(hints: ChannelBindingResolutionHints): boolean {
  return Boolean(
    hints.providerId ||
      hints.providerConnectionId ||
      hints.providerAccountId ||
      hints.providerInstallationId ||
      hints.providerProfileId ||
      hints.providerProfileType ||
      hints.routeKey
  );
}

function hasTelephonyBindingIdentityHints(
  hints: ChannelBindingResolutionHints
): boolean {
  return TELEPHONY_BINDING_IDENTITY_PRECEDENCE.some((field) => {
    switch (field) {
      case "providerConnectionId":
        return Boolean(hints.providerConnectionId);
      case "providerInstallationId":
        return Boolean(hints.providerInstallationId);
      case "providerProfileType":
        return Boolean(hints.providerProfileType);
      case "routeKey":
        return Boolean(hints.routeKey);
    }
  });
}

function hasTrustedTelephonyRouteIdentity(
  hints: ChannelBindingResolutionHints
): boolean {
  return Boolean(
    hints.providerConnectionId ||
      hints.providerInstallationId ||
      hints.routeKey
  );
}

function readTelephonyIdentityField(args: {
  hints?: ChannelBindingResolutionHints;
  identity?: ProviderRoutingIdentityHints | null;
  field: TelephonyBindingIdentityField;
}): string | undefined {
  switch (args.field) {
    case "providerConnectionId":
      return args.hints?.providerConnectionId ?? args.identity?.providerConnectionId;
    case "providerInstallationId":
      return (
        args.hints?.providerInstallationId ?? args.identity?.providerInstallationId
      );
    case "providerProfileType":
      return args.hints?.providerProfileType ?? args.identity?.providerProfileType;
    case "routeKey":
      return args.hints?.routeKey ?? args.identity?.routeKey;
  }
}

function filterTelephonyBindingsByIdentityPrecedence<T extends Record<string, unknown>>(
  bindings: T[],
  hints: ChannelBindingResolutionHints
): T[] {
  let matching = bindings;

  // Non-telephony helper fields can still narrow the candidate set, but tenant routing
  // is resolved only from the canonical telephony precedence tuple below.
  const auxiliaryHints: ChannelBindingResolutionHints = {
    providerId: hints.providerId,
    providerAccountId: hints.providerAccountId,
    providerProfileId: hints.providerProfileId,
  };
  if (hasChannelBindingResolutionHints(auxiliaryHints)) {
    matching = matching.filter((binding) =>
      bindingMatchesResolutionHints(binding, auxiliaryHints)
    );
  }

  for (const field of TELEPHONY_BINDING_IDENTITY_PRECEDENCE) {
    const expected = readTelephonyIdentityField({ hints, field });
    if (!expected) {
      continue;
    }
    matching = matching.filter((binding) => {
      const identity = normalizeBindingRoutingIdentity(binding);
      const actual = readTelephonyIdentityField({ identity, field });
      return Boolean(actual && actual === expected);
    });
  }

  return matching;
}

function bindingMatchesTelephonyIdentityPrecedence(
  binding: Record<string, unknown>,
  hints: ChannelBindingResolutionHints
): boolean {
  return filterTelephonyBindingsByIdentityPrecedence([binding], hints).length === 1;
}

function bindingMatchesResolutionHints(
  binding: Record<string, unknown>,
  hints: ChannelBindingResolutionHints
): boolean {
  const identity = normalizeBindingRoutingIdentity(binding);
  if (!identity) {
    return false;
  }

  const checks: Array<[string | undefined, string | undefined]> = [
    [hints.providerId, identity.providerId],
    [hints.providerConnectionId, identity.providerConnectionId],
    [hints.providerAccountId, identity.providerAccountId],
    [hints.providerInstallationId, identity.providerInstallationId],
    [hints.providerProfileId, identity.providerProfileId],
    [hints.routeKey, identity.routeKey],
  ];

  for (const [expected, actual] of checks) {
    if (!expected) {
      continue;
    }
    if (!actual || actual !== expected) {
      return false;
    }
  }

  if (hints.providerProfileType) {
    if (!identity.providerProfileType || identity.providerProfileType !== hints.providerProfileType) {
      return false;
    }
  }

  return true;
}

function readBindingPriority(binding: Record<string, unknown>): number {
  const priority = (binding.customProperties as Record<string, unknown>)?.priority;
  return typeof priority === "number" && Number.isFinite(priority) ? priority : 99;
}

interface ProviderRoutingIdentityHints {
  providerId: ProviderId;
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: ProviderProfileType;
  routeKey?: string;
  allowPlatformFallback?: boolean;
}

function normalizeBindingRoutingIdentity(
  binding: Record<string, unknown> | null
): ProviderRoutingIdentityHints | null {
  if (!binding) {
    return null;
  }

  const props = (binding.customProperties || {}) as ChannelProviderBindingContract &
    Record<string, unknown>;
  const providerId = normalizeOptionalString(props.providerId);
  if (!providerId) {
    return null;
  }

  const providerConnectionId = normalizeOptionalString(
    props.providerConnectionId ?? props.oauthConnectionId
  );
  const providerInstallationId = normalizeOptionalString(
    props.providerInstallationId ?? props.installationId
  );
  const providerProfileId = normalizeOptionalString(
    props.providerProfileId ?? props.appProfileId
  );
  const providerProfileType = normalizeProviderProfileType(
    props.providerProfileType ?? props.profileType
  );

  return {
    providerId: providerId as ProviderId,
    providerConnectionId,
    providerAccountId: normalizeOptionalString(props.providerAccountId),
    providerInstallationId,
    providerProfileId,
    providerProfileType,
    routeKey: normalizeOptionalString(props.routeKey ?? props.bindingRouteKey),
    allowPlatformFallback: normalizeOptionalBoolean(
      props.allowPlatformFallback ??
        props.allowPlatformCredentialFallback ??
        props.enablePlatformFallback
    ),
  };
}

export interface CredentialBoundaryBindingHints {
  providerConnectionId?: string;
  providerInstallationId?: string;
  providerProfileType?: ProviderProfileType;
  routeKey?: string;
}

export function shouldAllowPlatformCredentialFallback(args: {
  hasBinding: boolean;
  providerId: ProviderId;
  bindingProfileType?: ProviderProfileType;
  bindingAllowPlatformFallback?: boolean;
  slackTokenPolicy?: string;
}): boolean {
  if (args.hasBinding) {
    return (
      args.bindingProfileType === "platform" &&
      args.bindingAllowPlatformFallback === true
    );
  }

  if (args.providerId === "infobip" || args.providerId === "telegram") {
    return true;
  }

  if (args.providerId === "slack") {
    const tokenPolicy =
      args.slackTokenPolicy ??
      process.env.SLACK_BOT_TOKEN_POLICY ??
      "oauth_connection_only";
    return tokenPolicy === "oauth_or_env_fallback";
  }

  return false;
}

export function validateCredentialBoundary(args: {
  binding: CredentialBoundaryBindingHints | null;
  credentials: ProviderCredentials;
}): { ok: boolean; reason?: string } {
  const binding = args.binding;
  if (!binding) {
    return { ok: true };
  }

  const bindingProfileType = normalizeProviderProfileType(binding.providerProfileType);
  const credentialProfileType = normalizeProviderProfileType(
    args.credentials.providerProfileType
  );
  const credentialSource = args.credentials.credentialSource;

  if (bindingProfileType === "organization") {
    if (credentialProfileType === "platform") {
      return {
        ok: false,
        reason: "organization binding resolved to platform credential profile",
      };
    }
    if (
      credentialSource === "platform_fallback" ||
      credentialSource === "env_fallback"
    ) {
      return {
        ok: false,
        reason: "organization binding attempted platform credential fallback",
      };
    }
  }

  if (
    bindingProfileType === "platform" &&
    credentialProfileType === "organization"
  ) {
    return {
      ok: false,
      reason: "platform binding resolved to organization credential profile",
    };
  }

  const bindingConnectionId = normalizeOptionalString(binding.providerConnectionId);
  const credentialConnectionId = normalizeOptionalString(
    args.credentials.providerConnectionId
  );
  if (
    bindingConnectionId &&
    credentialConnectionId &&
    bindingConnectionId !== credentialConnectionId
  ) {
    return {
      ok: false,
      reason: `providerConnectionId mismatch (${bindingConnectionId} != ${credentialConnectionId})`,
    };
  }

  const bindingInstallationId = normalizeOptionalString(
    binding.providerInstallationId
  );
  const credentialInstallationId = normalizeOptionalString(
    args.credentials.providerInstallationId
  );
  if (
    bindingInstallationId &&
    credentialInstallationId &&
    bindingInstallationId !== credentialInstallationId
  ) {
    return {
      ok: false,
      reason: `providerInstallationId mismatch (${bindingInstallationId} != ${credentialInstallationId})`,
    };
  }

  const bindingRouteKey = normalizeOptionalString(binding.routeKey);
  const credentialRouteKey = normalizeOptionalString(args.credentials.bindingRouteKey);
  if (bindingRouteKey && credentialRouteKey && bindingRouteKey !== credentialRouteKey) {
    return {
      ok: false,
      reason: `routeKey mismatch (${bindingRouteKey} != ${credentialRouteKey})`,
    };
  }

  return { ok: true };
}

export function providerSupportsChannel(
  provider: ChannelProvider,
  channel: string
): boolean {
  return provider.capabilities.supportedChannels.includes(channel as ChannelType);
}

export function credentialFieldRequiresDecryption(
  credentials: ProviderCredentials,
  field: ProviderCredentialField
): boolean {
  if (
    credentials.credentialSource !== "oauth_connection" &&
    credentials.credentialSource !== "object_settings"
  ) {
    return false;
  }
  return (
    Array.isArray(credentials.encryptedFields) &&
    credentials.encryptedFields.includes(field)
  );
}

/**
 * Get the active provider binding for an org + channel.
 * Returns the highest-priority enabled binding.
 */
export const getChannelBinding = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    providerId: v.optional(v.string()),
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    providerInstallationId: v.optional(v.string()),
    providerProfileId: v.optional(v.string()),
    providerProfileType: v.optional(
      v.union(v.literal("platform"), v.literal("organization"))
    ),
    routeKey: v.optional(v.string()),
    failClosedOnAmbiguousIdentity: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const normalizedHints = normalizeChannelBindingResolutionHints({
      providerId: args.providerId as ProviderId | undefined,
      providerConnectionId: args.providerConnectionId,
      providerAccountId: args.providerAccountId,
      providerInstallationId: args.providerInstallationId,
      providerProfileId: args.providerProfileId,
      providerProfileType: args.providerProfileType,
      routeKey: args.routeKey,
    });
    const hasHints = hasChannelBindingResolutionHints(normalizedHints);

    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "channel_provider_binding")
      )
      .collect();

    const matching = bindings
      .filter((b) => {
        const props = b.customProperties as Record<string, unknown>;
        return props?.channel === args.channel && props?.enabled === true;
      })
      .filter((binding) => {
        if (!hasHints) {
          return true;
        }
        if (args.channel === "phone_call" && hasTelephonyBindingIdentityHints(normalizedHints)) {
          return bindingMatchesTelephonyIdentityPrecedence(
            binding as unknown as Record<string, unknown>,
            normalizedHints
          );
        }
        return bindingMatchesResolutionHints(
          binding as unknown as Record<string, unknown>,
          normalizedHints
        );
      })
      .sort((a, b) => {
        const priorityDelta = readBindingPriority(
          a as unknown as Record<string, unknown>
        ) - readBindingPriority(b as unknown as Record<string, unknown>);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return String(a._id).localeCompare(String(b._id));
      });

    if (matching.length > 1 && args.failClosedOnAmbiguousIdentity === true) {
      return null;
    }

    return matching[0] ?? null;
  },
});

export type TelephonyWebhookIngressResolution =
  | {
      status: "resolved";
      organizationId: Id<"organizations">;
      bindingId: ObjectId;
      providerId: ProviderId;
      providerConnectionId?: string;
      providerAccountId?: string;
      providerInstallationId?: string;
      providerProfileId?: string;
      providerProfileType?: ProviderProfileType;
      routeKey?: string;
    }
  | {
      status: "missing_route_identity" | "route_not_found" | "ambiguous_route";
      organizationId?: undefined;
      bindingId?: undefined;
      providerId?: ProviderId;
      providerConnectionId?: string;
      providerAccountId?: string;
      providerInstallationId?: string;
      providerProfileId?: string;
      providerProfileType?: ProviderProfileType;
      routeKey?: string;
      matchCount?: number;
    };

/**
 * Resolve telephony webhook ingress to exactly one org from route identity.
 * This is cross-tenant and must fail closed when identity is absent or ambiguous.
 */
export const resolveTelephonyWebhookIngressContext = internalQuery({
  args: {
    providerId: v.optional(v.string()),
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    providerInstallationId: v.optional(v.string()),
    providerProfileId: v.optional(v.string()),
    providerProfileType: v.optional(
      v.union(v.literal("platform"), v.literal("organization"))
    ),
    routeKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TelephonyWebhookIngressResolution> => {
    const normalizedHints = normalizeChannelBindingResolutionHints({
      providerId: args.providerId as ProviderId | undefined,
      providerConnectionId: args.providerConnectionId,
      providerAccountId: args.providerAccountId,
      providerInstallationId: args.providerInstallationId,
      providerProfileId: args.providerProfileId,
      providerProfileType: args.providerProfileType,
      routeKey: args.routeKey,
    });

    // Profile/provider metadata may assert scope, but cross-org ingress still requires
    // a tenant-bound route identity from the canonical telephony tuple.
    if (!hasTrustedTelephonyRouteIdentity(normalizedHints)) {
      return {
        status: "missing_route_identity",
        providerId: normalizedHints.providerId,
        providerConnectionId: normalizedHints.providerConnectionId,
        providerAccountId: normalizedHints.providerAccountId,
        providerInstallationId: normalizedHints.providerInstallationId,
        providerProfileId: normalizedHints.providerProfileId,
        providerProfileType: normalizedHints.providerProfileType,
        routeKey: normalizedHints.routeKey,
      };
    }

    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "channel_provider_binding"))
      .collect();

    const matching = bindings
      .filter((binding) => {
        const props = binding.customProperties as Record<string, unknown>;
        return props?.channel === "phone_call" && props?.enabled === true;
      })
      .filter((binding) =>
        bindingMatchesTelephonyIdentityPrecedence(
          binding as unknown as Record<string, unknown>,
          normalizedHints
        )
      )
      .sort((a, b) => {
        const priorityDelta = readBindingPriority(
          a as unknown as Record<string, unknown>
        ) - readBindingPriority(b as unknown as Record<string, unknown>);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return String(a._id).localeCompare(String(b._id));
      });

    if (matching.length === 0) {
      return {
        status: "route_not_found",
        providerId: normalizedHints.providerId,
        providerConnectionId: normalizedHints.providerConnectionId,
        providerAccountId: normalizedHints.providerAccountId,
        providerInstallationId: normalizedHints.providerInstallationId,
        providerProfileId: normalizedHints.providerProfileId,
        providerProfileType: normalizedHints.providerProfileType,
        routeKey: normalizedHints.routeKey,
      };
    }

    if (matching.length !== 1) {
      return {
        status: "ambiguous_route",
        providerId: normalizedHints.providerId,
        providerConnectionId: normalizedHints.providerConnectionId,
        providerAccountId: normalizedHints.providerAccountId,
        providerInstallationId: normalizedHints.providerInstallationId,
        providerProfileId: normalizedHints.providerProfileId,
        providerProfileType: normalizedHints.providerProfileType,
        routeKey: normalizedHints.routeKey,
        matchCount: matching.length,
      };
    }

    const match = matching[0];
    const identity = normalizeBindingRoutingIdentity(
      match as unknown as Record<string, unknown>
    );
    if (!identity) {
      return {
        status: "route_not_found",
        providerId: normalizedHints.providerId,
        providerConnectionId: normalizedHints.providerConnectionId,
        providerAccountId: normalizedHints.providerAccountId,
        providerInstallationId: normalizedHints.providerInstallationId,
        providerProfileId: normalizedHints.providerProfileId,
        providerProfileType: normalizedHints.providerProfileType,
        routeKey: normalizedHints.routeKey,
      };
    }

    return {
      status: "resolved",
      organizationId: match.organizationId,
      bindingId: match._id,
      providerId: identity.providerId,
      providerConnectionId: identity.providerConnectionId,
      providerAccountId: identity.providerAccountId,
      providerInstallationId: identity.providerInstallationId,
      providerProfileId: identity.providerProfileId,
      providerProfileType: identity.providerProfileType,
      routeKey: identity.routeKey,
    };
  },
});

/**
 * Get provider credentials for an org.
 * Most providers: stored as type="{providerId}_settings" in the objects table.
 * WhatsApp: stored in oauthConnections table (per-org OAuth).
 */
export const getProviderCredentials = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    providerId: v.string(),
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    providerInstallationId: v.optional(v.string()),
    providerProfileId: v.optional(v.string()),
    providerProfileType: v.optional(
      v.union(v.literal("platform"), v.literal("organization"))
    ),
    routeKey: v.optional(v.string()),
    allowPlatformFallback: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const requestedProviderProfileType = normalizeProviderProfileType(
      args.providerProfileType
    );
    const allowPlatformFallback = args.allowPlatformFallback === true;

    const matchesRequestedProfileType = (connection: Record<string, unknown>) => {
      if (!requestedProviderProfileType) {
        return true;
      }

      const metadata = (connection.customProperties || {}) as Record<string, unknown>;
      const connectionProfileType =
        normalizeProviderProfileType(connection.providerProfileType) ||
        normalizeProviderProfileType(metadata.providerProfileType) ||
        normalizeProviderProfileType(metadata.profileType);

      if (!connectionProfileType) {
        return requestedProviderProfileType === "organization";
      }

      return connectionProfileType === requestedProviderProfileType;
    };

    const resolveActiveOAuthConnection = async (
      provider: "slack" | "whatsapp"
    ) => {
      const activeConnections = await ctx.db
        .query("oauthConnections")
        .withIndex("by_org_and_provider", (q) =>
          q.eq("organizationId", args.organizationId).eq("provider", provider)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const scopedActiveConnections = activeConnections.filter((connection) =>
        matchesRequestedProfileType(connection as unknown as Record<string, unknown>)
      );

      if (scopedActiveConnections.length === 0) {
        return null;
      }

      const providerConnectionId = normalizeOptionalString(args.providerConnectionId);
      if (providerConnectionId) {
        const byConnectionId = scopedActiveConnections.find(
          (connection) => String(connection._id) === providerConnectionId
        );
        if (byConnectionId) {
          return byConnectionId;
        }
      }

      const providerAccountId = normalizeOptionalString(args.providerAccountId);
      if (providerAccountId) {
        const byProviderAccount = scopedActiveConnections.find(
          (connection) => connection.providerAccountId === providerAccountId
        );
        if (byProviderAccount) {
          return byProviderAccount;
        }
      }

      const providerInstallationId = normalizeOptionalString(
        args.providerInstallationId
      );
      if (providerInstallationId) {
        const byInstallation = scopedActiveConnections.find((connection) => {
          const connectionRecord = connection as Record<string, unknown>;
          const metadata = (connection.customProperties || {}) as Record<
            string,
            unknown
          >;
          return (
            normalizeOptionalString(connectionRecord.providerInstallationId) ===
              providerInstallationId ||
            normalizeOptionalString(metadata.providerInstallationId) ===
              providerInstallationId ||
            normalizeOptionalString(metadata.installationId) ===
              providerInstallationId
          );
        });
        if (byInstallation) {
          return byInstallation;
        }
      }

      const providerProfileId = normalizeOptionalString(args.providerProfileId);
      if (providerProfileId) {
        const byProfileId = scopedActiveConnections.find((connection) => {
          const connectionRecord = connection as Record<string, unknown>;
          const metadata = (connection.customProperties || {}) as Record<
            string,
            unknown
          >;
          return (
            normalizeOptionalString(connectionRecord.providerProfileId) ===
              providerProfileId ||
            normalizeOptionalString(metadata.providerProfileId) === providerProfileId ||
            normalizeOptionalString(metadata.appProfileId) === providerProfileId
          );
        });
        if (byProfileId) {
          return byProfileId;
        }
      }

      const routeKey = normalizeOptionalString(args.routeKey);
      if (routeKey) {
        const byRouteKey = scopedActiveConnections.find((connection) => {
          const connectionRecord = connection as Record<string, unknown>;
          const metadata = (connection.customProperties || {}) as Record<
            string,
            unknown
          >;
          return (
            normalizeOptionalString(connectionRecord.providerRouteKey) === routeKey ||
            normalizeOptionalString(metadata.providerRouteKey) === routeKey ||
            normalizeOptionalString(metadata.routeKey) === routeKey
          );
        });
        if (byRouteKey) {
          return byRouteKey;
        }
      }

      // Fail closed: unresolved tenant/install identity cannot select an arbitrary connection.
      if (scopedActiveConnections.length > 1) {
        return null;
      }

      return scopedActiveConnections[0] ?? null;
    };

    const resolveConnectionIdentity = (
      connection: Record<string, unknown>,
      metadata: Record<string, unknown>,
      profileTypeFallback: ProviderProfileType
    ) => {
      const providerConnectionId =
        normalizeOptionalString(connection._id) ||
        normalizeOptionalString(args.providerConnectionId);
      const providerAccountId =
        normalizeOptionalString(connection.providerAccountId) ||
        normalizeOptionalString(args.providerAccountId);
      const providerInstallationId =
        normalizeOptionalString(connection.providerInstallationId) ||
        normalizeOptionalString(metadata.providerInstallationId) ||
        normalizeOptionalString(metadata.installationId) ||
        normalizeOptionalString(args.providerInstallationId) ||
        providerAccountId ||
        providerConnectionId;
      const providerProfileId =
        normalizeOptionalString(connection.providerProfileId) ||
        normalizeOptionalString(metadata.providerProfileId) ||
        normalizeOptionalString(metadata.appProfileId) ||
        normalizeOptionalString(args.providerProfileId);
      const providerProfileType =
        normalizeProviderProfileType(connection.providerProfileType) ||
        normalizeProviderProfileType(metadata.providerProfileType) ||
        normalizeProviderProfileType(metadata.profileType) ||
        normalizeProviderProfileType(args.providerProfileType) ||
        profileTypeFallback;
      const providerSegment =
        normalizeOptionalString(connection.provider) ||
        normalizeOptionalString(args.providerId) ||
        "provider";
      const routeKey =
        normalizeOptionalString(connection.providerRouteKey) ||
        normalizeOptionalString(metadata.providerRouteKey) ||
        normalizeOptionalString(metadata.routeKey) ||
        normalizeOptionalString(args.routeKey) ||
        (providerInstallationId
          ? `${providerSegment}:${providerInstallationId}`
          : undefined);

      return {
        providerConnectionId,
        providerAccountId,
        providerInstallationId,
        providerProfileId,
        providerProfileType,
        routeKey,
      };
    };

    // WhatsApp Direct uses oauthConnections, not objects table
    if (args.providerId === "whatsapp") {
      const connection = await resolveActiveOAuthConnection("whatsapp");

      if (!connection) return null;

      const connectionRecord = connection as Record<string, unknown>;
      const metadata = (connection.customProperties || {}) as Record<
        string,
        unknown
      >;
      const identity = resolveConnectionIdentity(
        connectionRecord,
        metadata,
        "organization"
      );
      return {
        providerId: "whatsapp",
        credentialSource: "oauth_connection",
        encryptedFields: ["whatsappAccessToken"],
        providerConnectionId: identity.providerConnectionId,
        providerAccountId: identity.providerAccountId,
        providerInstallationId: identity.providerInstallationId,
        providerProfileId: identity.providerProfileId,
        providerProfileType: identity.providerProfileType,
        bindingRouteKey: identity.routeKey,
        whatsappPhoneNumberId: metadata?.phoneNumberId as string,
        whatsappAccessToken: connection.accessToken, // Encrypted — decrypted in sendMessage action
        whatsappWabaId: metadata?.wabaId as string,
        whatsappOrganizationId: args.organizationId,
        webhookSecret: process.env.META_APP_SECRET,
      } as ProviderCredentials;
    }

    // Slack uses oauthConnections; optional env fallback is gated by policy.
    if (args.providerId === "slack") {
      const connection = await resolveActiveOAuthConnection("slack");

      if (connection) {
        const connectionRecord = connection as Record<string, unknown>;
        const metadata = (connection.customProperties || {}) as Record<
          string,
          unknown
        >;
        const identity = resolveConnectionIdentity(
          connectionRecord,
          metadata,
          "organization"
        );
        return {
          providerId: "slack",
          credentialSource: "oauth_connection",
          encryptedFields: ["slackBotToken"],
          providerConnectionId: identity.providerConnectionId,
          providerAccountId: identity.providerAccountId,
          providerInstallationId: identity.providerInstallationId,
          providerProfileId: identity.providerProfileId,
          providerProfileType: identity.providerProfileType,
          bindingRouteKey: identity.routeKey,
          // Stored encrypted in oauthConnections; decrypted at send time.
          slackBotToken: connection.accessToken,
          slackTeamId: connection.providerAccountId,
          slackBotUserId: metadata?.botUserId as string | undefined,
          slackAppId: metadata?.appId as string | undefined,
          slackSigningSecret:
            normalizeOptionalString(metadata?.slackSigningSecret) ||
            process.env.SLACK_SIGNING_SECRET,
          slackInteractionMode:
            normalizeOptionalString(metadata?.interactionMode) ===
            "mentions_and_dm"
              ? "mentions_and_dm"
              : "mentions_only",
          slackAiAppFeaturesEnabled: metadata?.aiAppFeaturesEnabled === true,
        } as ProviderCredentials;
      }

      const tokenPolicy = process.env.SLACK_BOT_TOKEN_POLICY || "oauth_connection_only";
      if (
        allowPlatformFallback &&
        requestedProviderProfileType !== "organization" &&
        tokenPolicy === "oauth_or_env_fallback" &&
        process.env.SLACK_BOT_TOKEN
      ) {
        return {
          providerId: "slack",
          credentialSource: "env_fallback",
          providerProfileId:
            normalizeOptionalString(args.providerProfileId) || "platform:slack:env",
          providerProfileType: "platform",
          bindingRouteKey:
            normalizeOptionalString(args.routeKey) || "slack:platform_env",
          slackBotToken: process.env.SLACK_BOT_TOKEN,
          slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
        } as ProviderCredentials;
      }

      return null;
    }

    // Default: query objects table for per-org settings
    const settingsType = `${args.providerId}_settings`;
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", settingsType)
      )
      .first();

    if (settings) {
      const props = settings.customProperties as Record<string, unknown>;
      const encryptedFields = normalizeEncryptedFields(props.encryptedFields);
      const telephonyProviderIdentity =
        normalizeOptionalString(props.telephonyProviderIdentity) || undefined;
      const providerProfileId =
        normalizeOptionalString(args.providerProfileId) ||
        normalizeOptionalString(props.providerProfileId) ||
        normalizeOptionalString(props.appProfileId);
      const providerProfileType =
        normalizeProviderProfileType(args.providerProfileType) ||
        normalizeProviderProfileType(props.providerProfileType) ||
        normalizeProviderProfileType(props.profileType) ||
        "organization";
      if (
        requestedProviderProfileType &&
        providerProfileType !== requestedProviderProfileType
      ) {
        return null;
      }
      const providerInstallationId =
        normalizeOptionalString(args.providerInstallationId) ||
        normalizeOptionalString(props.providerInstallationId) ||
        normalizeOptionalString(props.installationId) ||
        normalizeOptionalString(args.providerAccountId);
      const providerConnectionId =
        normalizeOptionalString(args.providerConnectionId) ||
        normalizeOptionalString(props.providerConnectionId) ||
        normalizeOptionalString(props.oauthConnectionId);
      const providerAccountId =
        normalizeOptionalString(args.providerAccountId) ||
        normalizeOptionalString(props.providerAccountId);
      const routeKey =
        normalizeOptionalString(args.routeKey) ||
        normalizeOptionalString(props.routeKey) ||
        normalizeOptionalString(props.bindingRouteKey);
      let elevenRuntimeBinding:
        | {
            apiKey: string | null;
            baseUrl: string;
            enabled: boolean;
          }
        | null = null;

      if (args.providerId === "direct" && telephonyProviderIdentity === "eleven_telephony") {
        elevenRuntimeBinding = (await ctx.runQuery(
          internalApi.integrations.elevenlabs
            .getOrganizationElevenLabsRuntimeBinding as any,
          {
            organizationId: args.organizationId,
          },
        )) as {
          apiKey: string | null;
          baseUrl: string;
          enabled: boolean;
        } | null;
      }

      return {
        providerId: args.providerId,
        credentialSource: "object_settings",
        ...props,
        encryptedFields,
        providerConnectionId,
        providerAccountId,
        providerInstallationId,
        providerProfileId,
        providerProfileType,
        bindingRouteKey: routeKey,
        ...(telephonyProviderIdentity === "eleven_telephony"
          ? {
              elevenTelephonyApiKey:
                normalizeOptionalString(props.elevenTelephonyApiKey) ||
                normalizeOptionalString(elevenRuntimeBinding?.apiKey) ||
                undefined,
              elevenTelephonyBaseUrl:
                normalizeOptionalString(props.elevenTelephonyBaseUrl) ||
                normalizeOptionalString(elevenRuntimeBinding?.baseUrl) ||
                undefined,
              providerIntegrationReady: elevenRuntimeBinding?.enabled === true,
            }
          : {}),
      } as ProviderCredentials;
    }

    if (
      args.providerId === "telegram" &&
      allowPlatformFallback &&
      requestedProviderProfileType !== "organization" &&
      process.env.TELEGRAM_BOT_TOKEN
    ) {
      return {
        providerId: "telegram",
        credentialSource: "platform_fallback",
        providerProfileId:
          normalizeOptionalString(args.providerProfileId) ||
          "platform:telegram:env",
        providerProfileType: "platform",
        providerInstallationId:
          normalizeOptionalString(args.providerInstallationId) ||
          "platform:telegram",
        bindingRouteKey:
          normalizeOptionalString(args.routeKey) || "telegram:platform",
        telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
        telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
        webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
      } as ProviderCredentials;
    }

    // Fallback: platform-owned Infobip account (env vars)
    if (args.providerId === "infobip" && allowPlatformFallback) {
      const apiKey = process.env.INFOBIP_API_KEY;
      const baseUrl = process.env.INFOBIP_BASE_URL;
      const globalSenderId = process.env.INFOBIP_SMS_SENDER_ID;
      if (apiKey && baseUrl && globalSenderId) {
        // Look up CPaaS X application + entity IDs for multi-tenant isolation
        const applicationId = process.env.INFOBIP_APPLICATION_ID || undefined;

        const entityObj = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("type", "infobip_entity")
          )
          .first();
        const entityId = (entityObj?.customProperties as Record<string, unknown>)
          ?.entityId as string | undefined;

        // Check for per-org sender config (platform_sms_config)
        const smsConfig = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("type", "platform_sms_config")
          )
          .first();

        let orgSenderId = globalSenderId;
        if (smsConfig) {
          const smsProps = smsConfig.customProperties as Record<string, unknown>;
          if (smsProps?.senderType === "alphanumeric" && smsProps?.alphanumericSender) {
            orgSenderId = smsProps.alphanumericSender as string;
          } else if (
            smsProps?.senderType === "vln" &&
            smsProps?.vlnStatus === "active" &&
            smsProps?.vlnNumber
          ) {
            orgSenderId = smsProps.vlnNumber as string;
          }
        }

        return {
          providerId: "infobip",
          credentialSource: "platform_fallback",
          providerProfileId:
            normalizeOptionalString(args.providerProfileId) ||
            "platform:infobip",
          providerProfileType: "platform",
          providerInstallationId:
            normalizeOptionalString(args.providerInstallationId) ||
            "platform:infobip",
          bindingRouteKey:
            normalizeOptionalString(args.routeKey) || "infobip:platform",
          infobipApiKey: apiKey,
          infobipBaseUrl: baseUrl,
          infobipSmsSenderId: orgSenderId,
          infobipApplicationId: applicationId,
          infobipEntityId: entityId,
        } as ProviderCredentials;
      }
    }

    return null;
  },
});

export const listObjectsByOrgTypeInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", args.type)
      )
      .collect();
  },
});

export const listObjectsByTypeInternal = internalQuery({
  args: {
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
  },
});

export const getObjectByIdInternal = internalQuery({
  args: {
    objectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.objectId);
  },
});

export const getOrganizationByIdInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

export const insertObjectInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.string(),
    subtype: v.optional(v.string()),
    name: v.string(),
    status: v.string(),
    customProperties: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: args.type,
      subtype: args.subtype,
      name: args.name,
      status: args.status,
      customProperties: args.customProperties,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
  },
});

export const insertObjectLinkInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    fromObjectId: v.id("objects"),
    toObjectId: v.id("objects"),
    linkType: v.string(),
    properties: v.optional(v.any()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.fromObjectId,
      toObjectId: args.toObjectId,
      linkType: args.linkType,
      properties: args.properties,
      createdAt: args.createdAt,
    });
  },
});

export const patchObjectInternal = internalMutation({
  args: {
    objectId: v.id("objects"),
    status: v.optional(v.string()),
    customProperties: v.optional(v.any()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    if (args.status !== undefined) {
      patch.status = args.status;
    }
    if (args.customProperties !== undefined) {
      patch.customProperties = args.customProperties;
    }
    if (args.updatedAt !== undefined) {
      patch.updatedAt = args.updatedAt;
    }
    await ctx.db.patch(args.objectId, patch);
  },
});

/**
 * Send a message through the correct provider for an org + channel.
 */
export const sendMessage = internalAction({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    recipientIdentifier: v.string(),
    content: v.string(),
    contentHtml: v.optional(v.string()),
    subject: v.optional(v.string()),
    providerConversationId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    missionId: v.optional(v.string()),
    attemptId: v.optional(v.string()),
    bookingId: v.optional(v.string()),
    providerId: v.optional(v.string()),
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    providerInstallationId: v.optional(v.string()),
    providerProfileId: v.optional(v.string()),
    providerProfileType: v.optional(
      v.union(v.literal("platform"), v.literal("organization"))
    ),
    routeKey: v.optional(v.string()),
    failClosedRouting: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<SendResult> => {
    const requestedBindingHints = normalizeChannelBindingResolutionHints({
      providerId: args.providerId as ProviderId | undefined,
      providerConnectionId: args.providerConnectionId,
      providerAccountId: args.providerAccountId,
      providerInstallationId: args.providerInstallationId,
      providerProfileId: args.providerProfileId,
      providerProfileType: args.providerProfileType,
      routeKey: args.routeKey,
    });
    const strictRoutingResolution =
      args.failClosedRouting === true ||
      hasChannelBindingResolutionHints(requestedBindingHints);
    const normalizedIdempotencyKey = normalizeOptionalString(args.idempotencyKey);
    const normalizedMissionId = normalizeOptionalString(args.missionId);
    const normalizedAttemptId = normalizeOptionalString(args.attemptId);
    const normalizedBookingId = normalizeOptionalString(args.bookingId);

    if (args.channel === "phone_call" && normalizedIdempotencyKey) {
      const existingCallRecords = await listObjectsByOrgTypeRecord(
        ctx as RouterActionCtx,
        args.organizationId,
        "telephony_call_record"
      );

      const prior = existingCallRecords.find((record) => {
        const props = (record.customProperties || {}) as Record<string, unknown>;
        return normalizeOptionalString(props.idempotencyKey) === normalizedIdempotencyKey;
      });

      if (prior) {
        const props = (prior.customProperties || {}) as Record<string, unknown>;
        const priorSuccess = props.sendSuccess === true;
        const priorError = normalizeOptionalString(props.sendError);
        const providerCallId =
          normalizeOptionalString(props.providerCallId) ||
          normalizeOptionalString(props.providerMessageId);
        return {
          success: priorSuccess,
          providerMessageId: providerCallId,
          error: priorSuccess ? undefined : priorError || "Replay from prior call attempt",
          telephony: {
            providerCallId,
            outcome: normalizeOptionalString(props.outcome),
            disposition: normalizeOptionalString(props.disposition),
            durationSeconds:
              typeof props.durationSeconds === "number"
                ? props.durationSeconds
                : undefined,
            endedAt:
              typeof props.endedAt === "number" ? props.endedAt : undefined,
            voicemailDetected: props.voicemailDetected === true,
          },
        };
      }
    }

    // 1. Find the provider binding for this channel
    const binding = await (ctx.runQuery as Function)(
      internalApi.channels.router.getChannelBinding,
      {
        organizationId: args.organizationId,
        channel: args.channel,
        providerId: requestedBindingHints.providerId,
        providerConnectionId: requestedBindingHints.providerConnectionId,
        providerAccountId: requestedBindingHints.providerAccountId,
        providerInstallationId: requestedBindingHints.providerInstallationId,
        providerProfileId: requestedBindingHints.providerProfileId,
        providerProfileType: requestedBindingHints.providerProfileType,
        routeKey: requestedBindingHints.routeKey,
        failClosedOnAmbiguousIdentity: strictRoutingResolution,
      }
    ) as Record<string, unknown> | null;
    const bindingIdentity = normalizeBindingRoutingIdentity(binding);

    const hasBinding = Boolean(binding);

    // Platform fallbacks when no per-org binding exists
    let providerId: ProviderId;
    if (!binding) {
      if (strictRoutingResolution) {
        return {
          success: false,
          error: `Unresolved channel binding identity for channel: ${args.channel}`,
        };
      }

      if (
        args.channel === "sms" &&
        process.env.INFOBIP_API_KEY &&
        process.env.INFOBIP_BASE_URL &&
        process.env.INFOBIP_SMS_SENDER_ID
      ) {
        providerId = "infobip";
      } else if (
        args.channel === "telegram" &&
        process.env.TELEGRAM_BOT_TOKEN
      ) {
        // Platform bot fallback — telegramProvider.sendMessage reads TELEGRAM_BOT_TOKEN from env
        providerId = "telegram";
      } else if (args.channel === "slack") {
        // Slack can resolve credentials from active OAuth connection or env fallback policy.
        providerId = "slack";
      } else {
        return {
          success: false,
          error: `No provider configured for channel: ${args.channel}`,
        };
      }
    } else {
      if (!bindingIdentity?.providerId) {
        return {
          success: false,
          error: `Channel binding missing provider identity for channel: ${args.channel}`,
        };
      }
      providerId = bindingIdentity.providerId;
    }

    const resolvedBindingIdentity = bindingIdentity ?? requestedBindingHints;
    const allowPlatformFallback = shouldAllowPlatformCredentialFallback({
      hasBinding,
      providerId,
      bindingProfileType: resolvedBindingIdentity.providerProfileType,
      bindingAllowPlatformFallback: bindingIdentity?.allowPlatformFallback,
    });
    const requestedProviderProfileType: ProviderProfileType | undefined =
      resolvedBindingIdentity.providerProfileType ||
      (!binding && (providerId === "infobip" || providerId === "telegram")
        ? "platform"
        : undefined);

    const provider = getProvider(providerId);
    if (!provider) {
      return { success: false, error: `Provider not found: ${providerId}` };
    }
    if (!providerSupportsChannel(provider, args.channel)) {
      return {
        success: false,
        error: `Provider ${providerId} does not support channel: ${args.channel}`,
      };
    }

    // 2. Get credentials
    let credentials = await (ctx.runQuery as Function)(
      internalApi.channels.router.getProviderCredentials,
      {
        organizationId: args.organizationId,
        providerId,
        providerConnectionId: resolvedBindingIdentity.providerConnectionId,
        providerAccountId: resolvedBindingIdentity.providerAccountId,
        providerInstallationId: resolvedBindingIdentity.providerInstallationId,
        providerProfileId: resolvedBindingIdentity.providerProfileId,
        providerProfileType: requestedProviderProfileType,
        routeKey: resolvedBindingIdentity.routeKey,
        allowPlatformFallback,
      }
    ) as ProviderCredentials | null;

    if (!credentials) {
      return {
        success: false,
        error: `No credentials for provider: ${providerId}`,
      };
    }

    const credentialBoundary = validateCredentialBoundary({
      binding: bindingIdentity
        ? {
            providerConnectionId: resolvedBindingIdentity.providerConnectionId,
            providerInstallationId: resolvedBindingIdentity.providerInstallationId,
            providerProfileType: resolvedBindingIdentity.providerProfileType,
            routeKey: resolvedBindingIdentity.routeKey,
          }
        : null,
      credentials,
    });
    if (!credentialBoundary.ok) {
      return {
        success: false,
        error: `Credential boundary violation for provider ${providerId}: ${credentialBoundary.reason}`,
      };
    }

    // 2b. Decrypt credential fields only at send-time boundary.
    const decryptCredentialField = async (
      field: ProviderCredentialField,
      value: string | undefined
    ): Promise<string | undefined> => {
      if (
        !value ||
        !credentialFieldRequiresDecryption(
          credentials as ProviderCredentials,
          field
        )
      ) {
        return value;
      }

      const decrypted = await (ctx.runAction as Function)(
        internalApi.oauth.encryption.decryptToken,
        { encrypted: value }
      ) as string;
      return decrypted;
    };

    if (providerId === "whatsapp") {
      credentials = {
        ...credentials,
        whatsappAccessToken: await decryptCredentialField(
          "whatsappAccessToken",
          credentials.whatsappAccessToken
        ),
      };
    }

    if (providerId === "slack") {
      credentials = {
        ...credentials,
        slackBotToken: await decryptCredentialField(
          "slackBotToken",
          credentials.slackBotToken
        ),
      };
    }

    if (providerId === "telegram") {
      const encryptedWebhookSecret =
        credentials.telegramWebhookSecret || credentials.webhookSecret;
      const decryptedWebhookSecret = await decryptCredentialField(
        "telegramWebhookSecret",
        encryptedWebhookSecret
      );
      credentials = {
        ...credentials,
        telegramBotToken: await decryptCredentialField(
          "telegramBotToken",
          credentials.telegramBotToken
        ),
        telegramWebhookSecret: decryptedWebhookSecret,
        webhookSecret: decryptedWebhookSecret,
      };
    }

    if (providerId === "chatwoot") {
      credentials = {
        ...credentials,
        chatwootApiToken: await decryptCredentialField(
          "chatwootApiToken",
          credentials.chatwootApiToken
        ),
      };
    }

    if (providerId === "manychat") {
      credentials = {
        ...credentials,
        manychatApiKey: await decryptCredentialField(
          "manychatApiKey",
          credentials.manychatApiKey
        ),
      };
    }

    if (providerId === "resend") {
      credentials = {
        ...credentials,
        resendApiKey: await decryptCredentialField(
          "resendApiKey",
          credentials.resendApiKey
        ),
      };
    }

    if (providerId === "direct") {
      const encryptedDirectSecret =
        credentials.directCallWebhookSecret || credentials.webhookSecret;
      const decryptedDirectSecret = await decryptCredentialField(
        "directCallWebhookSecret",
        encryptedDirectSecret
      );
      let twilioRuntimeBinding:
        | {
            accountSid: string | null;
            authToken: string | null;
            accountSidLast4: string | null;
            smsPhoneNumber: string | null;
            enabled: boolean;
            source: "platform" | "org" | null;
          }
        | null = null;
      if (credentials.telephonyProviderIdentity === "twilio_voice") {
        twilioRuntimeBinding = await (ctx.runAction as Function)(
          internalApi.integrations.twilio.getOrganizationTwilioRuntimeBinding,
          {
            organizationId: args.organizationId,
          }
        );
      }
      credentials = {
        ...credentials,
        directCallApiKey: await decryptCredentialField(
          "directCallApiKey",
          credentials.directCallApiKey
        ),
        directCallWebhookSecret: decryptedDirectSecret,
        twilioAccountSid:
          normalizeOptionalString(credentials.twilioAccountSid) ||
          normalizeOptionalString(twilioRuntimeBinding?.accountSid) ||
          undefined,
        twilioAuthToken:
          normalizeOptionalString(credentials.twilioAuthToken) ||
          normalizeOptionalString(twilioRuntimeBinding?.authToken) ||
          undefined,
        twilioVoiceFromNumber:
          normalizeOptionalString(credentials.twilioVoiceFromNumber) ||
          normalizeOptionalString(credentials.directCallFromNumber) ||
          normalizeOptionalString(credentials.elevenTelephonyFromNumber) ||
          normalizeOptionalString(twilioRuntimeBinding?.smsPhoneNumber) ||
          undefined,
        twilioVoiceWebhookSecret:
          normalizeOptionalString(credentials.twilioVoiceWebhookSecret) ||
          normalizeOptionalString(decryptedDirectSecret) ||
          normalizeOptionalString(credentials.elevenTelephonyWebhookSecret) ||
          undefined,
      };
    }

    // 3. Determine if this is a platform-owned send (no per-org binding)
    const isPlatformSms = !binding && args.channel === "sms";

    // 3b. Lazy provision CPaaS X entity for platform SMS (first send triggers provisioning)
    if (isPlatformSms && !credentials.infobipEntityId) {
      try {
        await (ctx.runAction as Function)(
          internalApi.channels.infobipCpaasX.provisionOrgEntity,
          { organizationId: args.organizationId }
        );
        // Re-fetch credentials to include the new entityId
        credentials = await (ctx.runQuery as Function)(
          internalApi.channels.router.getProviderCredentials,
          {
            organizationId: args.organizationId,
            providerId,
            providerConnectionId: resolvedBindingIdentity.providerConnectionId,
            providerAccountId: resolvedBindingIdentity.providerAccountId,
            providerInstallationId: resolvedBindingIdentity.providerInstallationId,
            providerProfileId: resolvedBindingIdentity.providerProfileId,
            providerProfileType: requestedProviderProfileType,
            routeKey: resolvedBindingIdentity.routeKey,
            allowPlatformFallback,
          }
        ) as ProviderCredentials;
        if (!credentials) {
          return { success: false, error: "Credentials lost after entity provisioning" };
        }
      } catch (e) {
        // Entity provisioning failure should not block SMS delivery
        console.error("[Router] CPaaS X entity provisioning failed (non-blocking):", e);
      }
    }

    // 3c. Ensure platform application exists (lazy, one-time)
    if (isPlatformSms && !credentials.infobipApplicationId) {
      try {
        await (ctx.runAction as Function)(
          internalApi.channels.infobipCpaasX.ensurePlatformApplication,
          {}
        );
        // Re-fetch credentials to include applicationId
        credentials = await (ctx.runQuery as Function)(
          internalApi.channels.router.getProviderCredentials,
          {
            organizationId: args.organizationId,
            providerId,
            providerConnectionId: resolvedBindingIdentity.providerConnectionId,
            providerAccountId: resolvedBindingIdentity.providerAccountId,
            providerInstallationId: resolvedBindingIdentity.providerInstallationId,
            providerProfileId: resolvedBindingIdentity.providerProfileId,
            providerProfileType: requestedProviderProfileType,
            routeKey: resolvedBindingIdentity.routeKey,
            allowPlatformFallback,
          }
        ) as ProviderCredentials;
        if (!credentials) {
          return { success: false, error: "Credentials lost after application provisioning" };
        }
      } catch (e) {
        console.error("[Router] CPaaS X application provisioning failed (non-blocking):", e);
      }
    }

    // 4. Send through provider with retry
    const message: OutboundMessage = {
      channel: args.channel as ChannelType,
      recipientIdentifier: args.recipientIdentifier,
      content: args.content,
      contentHtml: args.contentHtml,
      subject: args.subject,
      metadata: {
        providerConversationId: args.providerConversationId,
        idempotencyKey: normalizedIdempotencyKey,
        organizationId: String(args.organizationId),
        missionId: normalizedMissionId,
        attemptId: normalizedAttemptId,
        bookingId: normalizedBookingId,
        callContext:
          args.channel === "phone_call"
            ? {
                missionId: normalizedMissionId,
                attemptId: normalizedAttemptId,
                bookingId: normalizedBookingId,
              }
            : undefined,
      },
    };

    const retryPolicy = CHANNEL_RETRY_POLICIES[args.channel] || CHANNEL_RETRY_POLICIES.telegram;
    let result: SendResult;

    try {
      const retryResult = await withRetry(
        async () => {
          const sendResult = await provider.sendMessage(credentials, message);
          if (!sendResult.success) {
            throw buildProviderSendError(sendResult);
          }
          return sendResult;
        },
        retryPolicy
      );
      result = retryResult.result;

      if (retryResult.attempts > 1) {
        console.warn(
          `[Router] ${args.channel} send succeeded on attempt ${retryResult.attempts}`
        );
      }
    } catch (e) {
      // All retries exhausted — check if it's a markdown formatting issue
      if (isMarkdownParseError(e)) {
        try {
          const plainResult = await provider.sendMessage(credentials, {
            ...message,
            content: stripMarkdown(message.content),
            contentHtml: undefined,
          });
          if (plainResult.success) {
            result = plainResult;
          } else {
            result = { success: false, error: plainResult.error || "Plain text fallback also failed" };
          }
        } catch {
          result = {
            success: false,
            error: `All retries + plain text fallback failed: ${e instanceof Error ? e.message : String(e)}`,
          };
        }
      } else {
        result = {
          success: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    // 5. Deduct credits for platform SMS (per-org enterprise pays Infobip directly)
    if (isPlatformSms && result.success) {
      try {
        const smsCreditDeduction = await (ctx.runMutation as Function)(
          internalApi.credits.index.deductCreditsInternalMutation,
          {
            organizationId: args.organizationId,
            amount: 2, // sms_outbound cost
            action: "sms_outbound",
            description: `SMS to ${args.recipientIdentifier.slice(0, 6)}...`,
            softFailOnExhausted: true,
          }
        );

        if (!smsCreditDeduction.success) {
          console.warn("[Router] SMS credit deduction skipped:", {
            organizationId: args.organizationId,
            errorCode: smsCreditDeduction.errorCode,
            message: smsCreditDeduction.message,
            creditsRequired: smsCreditDeduction.creditsRequired,
            creditsAvailable: smsCreditDeduction.creditsAvailable,
          });
        }
      } catch (e) {
        // Credit deduction failure shouldn't block SMS delivery
        console.error("[Router] SMS credit deduction failed:", e);
      }
    }

    if (args.channel === "phone_call") {
      try {
        await persistTelephonyCallArtifacts({
          ctx,
          organizationId: args.organizationId,
          providerId,
          recipientIdentifier: args.recipientIdentifier,
          content: args.content,
          providerConversationId: args.providerConversationId,
          idempotencyKey: normalizedIdempotencyKey,
          missionId: normalizedMissionId,
          attemptId: normalizedAttemptId,
          bookingId: normalizedBookingId,
          result,
        });
      } catch (error) {
        console.error("[Router] Failed to persist telephony artifacts:", error);
      }
    }

    return result;
  },
});

/**
 * Get all configured channel bindings for an org.
 * Used by the agent config UI to show which channels have providers.
 */
// ============================================================================
// ERROR HELPERS
// ============================================================================

/**
 * Detect if an error is a markdown/formatting parse error from a provider.
 * Some providers reject messages with unsupported markdown syntax.
 */
function isMarkdownParseError(error: unknown): boolean {
  const message = String((error as Error)?.message || error || "").toLowerCase();
  return (
    message.includes("parse") ||
    message.includes("markdown") ||
    message.includes("formatting") ||
    message.includes("bad request: can't parse")
  );
}

function buildProviderSendError(
  sendResult: SendResult
): Error & {
  status?: number;
  statusCode?: number;
  retryAfterMs?: number;
  retryable?: boolean;
} {
  const error = new Error(sendResult.error || "Send returned failure") as Error & {
    status?: number;
    statusCode?: number;
    retryAfterMs?: number;
    retryable?: boolean;
  };
  if (typeof sendResult.statusCode === "number") {
    error.status = sendResult.statusCode;
    error.statusCode = sendResult.statusCode;
  }
  if (typeof sendResult.retryAfterMs === "number") {
    error.retryAfterMs = sendResult.retryAfterMs;
  }
  if (typeof sendResult.retryable === "boolean") {
    error.retryable = sendResult.retryable;
  }
  return error;
}

/**
 * Strip markdown formatting to plain text as a delivery fallback.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")  // bold
    .replace(/\*(.*?)\*/g, "$1")       // italic
    .replace(/__(.*?)__/g, "$1")       // bold alt
    .replace(/_(.*?)_/g, "$1")         // italic alt
    .replace(/~~(.*?)~~/g, "$1")       // strikethrough
    .replace(/`{3}[\s\S]*?`{3}/g, "")  // code blocks
    .replace(/`(.*?)`/g, "$1")         // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^#{1,6}\s+/gm, "")       // headings
    .replace(/^[-*+]\s+/gm, "- ")      // list items
    .replace(/^\d+\.\s+/gm, "")        // numbered lists
    .trim();
}

export const getConfiguredChannels = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "channel_provider_binding")
      )
      .collect();

    return bindings
      .filter((b) => {
        const props = b.customProperties as Record<string, unknown>;
        return props?.enabled === true;
      })
      .map((b) => {
        const props = b.customProperties as Record<string, unknown>;
        const routingIdentity = normalizeBindingRoutingIdentity(
          b as Record<string, unknown>
        );
        return {
          channel: props?.channel as string,
          providerId: props?.providerId as string,
          providerConnectionId: routingIdentity?.providerConnectionId,
          providerAccountId: routingIdentity?.providerAccountId,
          providerInstallationId: routingIdentity?.providerInstallationId,
          providerProfileId: routingIdentity?.providerProfileId,
          providerProfileType: routingIdentity?.providerProfileType,
          routeKey: routingIdentity?.routeKey,
          allowPlatformFallback: routingIdentity?.allowPlatformFallback,
        };
      });
  },
});

function resolveMissionContactAddress(
  props: AppointmentMissionSnapshot,
  channel: AppointmentChannel
): string | null {
  const contact = props.contact || {};
  if (channel === "sms" || channel === "phone_call") {
    return normalizeOptionalString(contact.phone) || null;
  }
  if (channel === "email") {
    return normalizeOptionalString(contact.email) || null;
  }
  if (channel === "telegram") {
    return normalizeOptionalString(contact.telegram) || null;
  }
  return null;
}

function resolveMissionAttemptMessage(args: {
  channel: AppointmentChannel;
  mission: AppointmentMissionSnapshot;
  bookingName?: string;
  organizationName?: string;
}): string {
  const customer = normalizeOptionalString(args.mission.contact?.name) || "there";
  const organizationLabel = args.organizationName || "our team";
  if (args.channel === "phone_call") {
    return `Hello ${customer}, this is ${organizationLabel}. We are calling about your appointment booking request${args.bookingName ? ` for ${args.bookingName}` : ""}.`;
  }
  if (args.channel === "email") {
    return `Hi ${customer}, this is ${organizationLabel}. We are following up on your appointment request${args.bookingName ? ` (${args.bookingName})` : ""}. Please reply with your preferred confirmation details.`;
  }
  if (args.channel === "telegram") {
    return `Hi ${customer}, quick follow-up from ${organizationLabel} on your appointment request${args.bookingName ? ` (${args.bookingName})` : ""}.`;
  }
  return `Hi ${customer}, this is ${organizationLabel} following up on your appointment request${args.bookingName ? ` (${args.bookingName})` : ""}.`;
}

function resolveMissionMaxAttempts(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return APPOINTMENT_OUTREACH_DEFAULT_MAX_ATTEMPTS;
  }
  return Math.min(
    APPOINTMENT_OUTREACH_DEFAULT_MAX_ATTEMPTS,
    Math.max(1, Math.floor(value))
  );
}

function resolveCallOutcomeCategory(args: {
  outcome?: string;
  disposition?: string;
  voicemailDetected?: boolean;
}): "booked" | "voicemail" | "retryable_failure" | "neutral" {
  if (args.voicemailDetected) {
    return "voicemail";
  }
  const normalizedOutcome = (args.outcome || "").trim().toLowerCase();
  const normalizedDisposition = (args.disposition || "").trim().toLowerCase();
  const blob = `${normalizedOutcome}:${normalizedDisposition}`;
  if (
    blob.includes("booked") ||
    blob.includes("confirmed") ||
    blob.includes("connected") ||
    blob.includes("completed")
  ) {
    return "booked";
  }
  if (blob.includes("voicemail")) {
    return "voicemail";
  }
  if (
    blob.includes("no_answer") ||
    blob.includes("busy") ||
    blob.includes("failed") ||
    blob.includes("retry")
  ) {
    return "retryable_failure";
  }
  return "neutral";
}

function patchMissionCompletion(args: {
  status: string;
  customProperties: Record<string, unknown>;
  updatedAt: number;
}): {
  status: string;
  customProperties: Record<string, unknown>;
  updatedAt: number;
} {
  return {
    status: args.status,
    customProperties: {
      ...args.customProperties,
      completedAt:
        typeof args.customProperties.completedAt === "number"
          ? args.customProperties.completedAt
          : args.updatedAt,
      awaitingCallOutcome: false,
      nextAttemptAt: undefined,
    },
    updatedAt: args.updatedAt,
  };
}

export const initializeAppointmentOutreachMission = internalAction({
  args: {
    organizationId: v.id("organizations"),
    bookingId: v.id("objects"),
    serviceType: v.optional(v.string()),
    dateWindowStart: v.optional(v.number()),
    dateWindowEnd: v.optional(v.number()),
    locationPreference: v.optional(v.string()),
    outreachReason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    preferredChannel: v.optional(v.string()),
    fallbackMethod: v.optional(v.string()),
    allowedHoursStart: v.optional(v.string()),
    allowedHoursEnd: v.optional(v.string()),
    allowedHoursTimezone: v.optional(v.string()),
    callFallbackApproved: v.optional(v.boolean()),
    callConsentDisclosure: v.optional(v.string()),
    domainAutonomyLevel: v.optional(
      v.union(v.literal("sandbox"), v.literal("live"))
    ),
    autonomyPromotionApprovalId: v.optional(v.string()),
    autonomyPromotionReason: v.optional(v.string()),
    maxAttempts: v.optional(v.number()),
    runImmediately: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const idempotencyKey = normalizeOptionalString(args.idempotencyKey);

    if (idempotencyKey) {
      const existing = await listObjectsByOrgTypeRecord(
        ctx as RouterActionCtx,
        args.organizationId,
        "appointment_outreach_mission"
      );
      const replay = existing.find((record) => {
        const props = (record.customProperties || {}) as Record<string, unknown>;
        return (
          normalizeOptionalString(props.idempotencyKey) === idempotencyKey &&
          normalizeOptionalString(props.bookingId) === String(args.bookingId)
        );
      });
      if (replay) {
        return {
          success: true,
          replayed: true,
          missionId: replay._id,
          status: replay.status,
          message: "Existing outreach mission reused via idempotency key.",
        };
      }
    }

    const booking = await (ctx.runQuery as Function)(
      internalApi.bookingOntology.getBookingInternal,
      {
        bookingId: args.bookingId,
        organizationId: args.organizationId,
      }
    ) as {
      _id: string;
      name?: string;
      customProperties?: Record<string, unknown>;
    } | null;

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    const bookingProps = (booking.customProperties || {}) as Record<string, unknown>;
    const customerEmail = normalizeOptionalString(bookingProps.customerEmail);
    const customerPhone = normalizeOptionalString(bookingProps.customerPhone);
    const customerName =
      normalizeOptionalString(bookingProps.customerName) || "Customer";
    const bookingTimezone =
      normalizeOptionalString(bookingProps.timezone) ||
      APPOINTMENT_OUTREACH_DEFAULT_ALLOWED_HOURS.timezone;

    const matchingContacts = await listObjectsByOrgTypeRecord(
      ctx as RouterActionCtx,
      args.organizationId,
      "crm_contact"
    );
    const contact = matchingContacts.find((candidate) => {
      const props = (candidate.customProperties || {}) as Record<string, unknown>;
      const email = normalizeOptionalString(props.email);
      const phone = normalizeOptionalString(props.phone);
      return (
        (customerEmail && email && email.toLowerCase() === customerEmail.toLowerCase()) ||
        (customerPhone && phone && phone === customerPhone)
      );
    });
    const contactProps = (contact?.customProperties || {}) as Record<string, unknown>;
    const outreachPreferences = (contactProps.outreachPreferences || {}) as Record<
      string,
      unknown
    >;
    const contactAllowedHours = (outreachPreferences.allowedHours || {}) as Record<
      string,
      unknown
    >;

    const preferredChannel =
      normalizeAppointmentChannel(args.preferredChannel) ||
      normalizeAppointmentChannel(outreachPreferences.preferredChannel) ||
      "sms";
    const fallbackMethodRaw =
      normalizeOptionalString(args.fallbackMethod) ||
      normalizeOptionalString(outreachPreferences.fallbackMethod) ||
      "email";
    const fallbackMethod =
      fallbackMethodRaw === "none"
        ? "none"
        : normalizeAppointmentChannel(fallbackMethodRaw) || "email";
    const maxAttempts = resolveMissionMaxAttempts(args.maxAttempts);

    const requestedDomainLevel =
      args.domainAutonomyLevel === "live" ? "live" : "sandbox";
    const promotionCriteriaMet =
      requestedDomainLevel === "live" &&
      args.callFallbackApproved === true &&
      Boolean(normalizeOptionalString(args.callConsentDisclosure)) &&
      Boolean(normalizeOptionalString(args.autonomyPromotionApprovalId)) &&
      Boolean(normalizeOptionalString(args.autonomyPromotionReason));
    const domainAutonomyLevel: "sandbox" | "live" = promotionCriteriaMet
      ? "live"
      : "sandbox";

    const missionAllowedHours: AppointmentAllowedHours = {
      start: normalizeHourMinute(
        args.allowedHoursStart ?? contactAllowedHours.start,
        APPOINTMENT_OUTREACH_DEFAULT_ALLOWED_HOURS.start
      ),
      end: normalizeHourMinute(
        args.allowedHoursEnd ?? contactAllowedHours.end,
        APPOINTMENT_OUTREACH_DEFAULT_ALLOWED_HOURS.end
      ),
      timezone:
        normalizeOptionalString(args.allowedHoursTimezone) ||
        normalizeOptionalString(contactAllowedHours.timezone) ||
        bookingTimezone,
    };

    const telegramRecipient =
      normalizeOptionalString((contactProps.telegram as Record<string, unknown>)?.chatId) ||
      normalizeOptionalString(contactProps.telegramHandle) ||
      normalizeOptionalString(contactProps.telegramChatId);

    const attemptLadder = resolveAttemptLadder({
      preferredChannel,
      fallbackMethod,
      hasSms: Boolean(customerPhone),
      hasEmail: Boolean(customerEmail),
      hasTelegram: Boolean(telegramRecipient),
      hasPhone: Boolean(customerPhone),
      callFallbackApproved: args.callFallbackApproved === true,
      domainAutonomyLevel,
      maxAttempts,
    });

    const missionId = await insertObjectRecord(ctx as RouterActionCtx, {
      organizationId: args.organizationId,
      type: "appointment_outreach_mission",
      subtype: "appointment_booking",
      name: `Outreach mission ${booking.name || booking._id}`,
      status: "active",
      customProperties: {
        contractVersion: APPOINTMENT_OUTREACH_CONTRACT_VERSION,
        bookingId: String(args.bookingId),
        bookingName: booking.name,
        serviceType: normalizeOptionalString(args.serviceType),
        dateWindowStart: args.dateWindowStart,
        dateWindowEnd: args.dateWindowEnd,
        locationPreference: normalizeOptionalString(args.locationPreference),
        outreachReason: normalizeOptionalString(args.outreachReason),
        idempotencyKey,
        missionStartedAt: now,
        missionDeadlineAt: now + APPOINTMENT_OUTREACH_MAX_WINDOW_MS,
        maxAttempts,
        attemptCount: 0,
        nextAttemptAt: now,
        domainAutonomyLevel,
        callFallbackApproved: args.callFallbackApproved === true,
        callConsentDisclosure: normalizeOptionalString(args.callConsentDisclosure),
        autonomyPromotionApprovalId: normalizeOptionalString(
          args.autonomyPromotionApprovalId
        ),
        autonomyPromotionReason: normalizeOptionalString(
          args.autonomyPromotionReason
        ),
        promotionCriteriaMet,
        attemptLadder,
        contact: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          telegram: telegramRecipient,
        },
        outreachPreferences: {
          preferredChannel,
          fallbackMethod,
          allowedHours: missionAllowedHours,
        },
      },
      createdAt: now,
      updatedAt: now,
    });

    const runImmediately = args.runImmediately !== false;
    const firstAttempt = runImmediately
      ? await (ctx.runAction as Function)(
          internalApi.channels.router.runAppointmentOutreachMissionStep,
          {
            missionId,
          }
        )
      : null;

    return {
      success: true,
      missionId,
      domainAutonomyLevel,
      promotionCriteriaMet,
      attemptLadder,
      firstAttempt,
      message:
        domainAutonomyLevel === "sandbox"
          ? "Appointment outreach mission initialized in sandbox autonomy mode."
          : "Appointment outreach mission initialized in live autonomy mode.",
    };
  },
});

export const runAppointmentOutreachMissionStep = internalAction({
  args: {
    missionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const mission = await getObjectRecord(ctx as RouterActionCtx, args.missionId);
    if (!mission || mission.type !== "appointment_outreach_mission") {
      return {
        success: false,
        error: "Mission not found",
      };
    }
    if (mission.status !== "active") {
      return {
        success: true,
        missionId: mission._id,
        status: mission.status,
        message: "Mission is no longer active.",
      };
    }

    const props = (mission.customProperties || {}) as AppointmentMissionSnapshot &
      Record<string, unknown>;
    const missionDeadlineAt =
      typeof props.missionDeadlineAt === "number"
        ? props.missionDeadlineAt
        : now + APPOINTMENT_OUTREACH_MAX_WINDOW_MS;
    const maxAttempts = resolveMissionMaxAttempts(props.maxAttempts);
    const attemptCount =
      typeof props.attemptCount === "number" ? props.attemptCount : 0;
    const nextAttemptAt =
      typeof props.nextAttemptAt === "number" ? props.nextAttemptAt : now;

    if (now > missionDeadlineAt) {
      await patchObjectRecord(ctx as RouterActionCtx, mission._id, patchMissionCompletion({
        status: "archived",
        customProperties: {
          ...props,
          outcome: "UNRESOLVED_WITH_REASON",
          outcomeReason: "retry_window_expired",
        },
        updatedAt: now,
      }));
      return {
        success: true,
        missionId: mission._id,
        status: "archived",
        message: "Mission retry window expired.",
      };
    }

    if (attemptCount >= maxAttempts) {
      await patchObjectRecord(ctx as RouterActionCtx, mission._id, patchMissionCompletion({
        status: "archived",
        customProperties: {
          ...props,
          outcome: "UNRESOLVED_WITH_REASON",
          outcomeReason: "max_attempts_reached",
        },
        updatedAt: now,
      }));
      return {
        success: true,
        missionId: mission._id,
        status: "archived",
        message: "Mission reached max attempts.",
      };
    }

    if (nextAttemptAt > now) {
      return {
        success: true,
        missionId: mission._id,
        status: "waiting",
        nextAttemptAt,
      };
    }

    if (props.awaitingCallOutcome === true) {
      await patchObjectRecord(ctx as RouterActionCtx, mission._id, {
        customProperties: {
          ...props,
          awaitingCallOutcome: false,
          nextAttemptAt: now + APPOINTMENT_OUTREACH_RETRY_DELAY_MS,
        },
        updatedAt: now,
      });
      return {
        success: true,
        missionId: mission._id,
        status: "waiting_call_outcome",
        nextAttemptAt: now + APPOINTMENT_OUTREACH_RETRY_DELAY_MS,
      };
    }

    const ladder = Array.isArray(props.attemptLadder)
      ? props.attemptLadder
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }
            const record = entry as {
              channel?: unknown;
              reasonCode?: unknown;
              requiresApproval?: unknown;
            };
            const channel = normalizeAppointmentChannel(record.channel);
            if (!channel) {
              return null;
            }
            const missionStep: AppointmentMissionStep = {
              channel,
              reasonCode:
                normalizeOptionalString(record.reasonCode) || "retry",
            };
            if (record.requiresApproval === true) {
              missionStep.requiresApproval = true;
            }
            return missionStep;
          })
          .filter((entry): entry is AppointmentMissionStep => Boolean(entry))
      : [];

    const step = ladder[attemptCount];
    if (!step) {
      await patchObjectRecord(ctx as RouterActionCtx, mission._id, patchMissionCompletion({
        status: "archived",
        customProperties: {
          ...props,
          outcome: "UNRESOLVED_WITH_REASON",
          outcomeReason: "attempt_ladder_exhausted",
        },
        updatedAt: now,
      }));
      return {
        success: true,
        missionId: mission._id,
        status: "archived",
        message: "No remaining ladder steps.",
      };
    }

    if (
      step.channel === "phone_call" &&
      (props.domainAutonomyLevel !== "live" || props.callFallbackApproved !== true)
    ) {
      await patchObjectRecord(ctx as RouterActionCtx, mission._id, patchMissionCompletion({
        status: "archived",
        customProperties: {
          ...props,
          outcome: "UNRESOLVED_WITH_REASON",
          outcomeReason: "call_fallback_not_permitted",
        },
        updatedAt: now,
      }));
      return {
        success: true,
        missionId: mission._id,
        status: "archived",
        message: "Call fallback blocked by autonomy policy.",
      };
    }

    if (step.channel === "phone_call") {
      const allowedHours = resolveMissionAllowedHours(props);
      const withinBusinessHours = isWithinAllowedHours({
        now,
        start: allowedHours.start,
        end: allowedHours.end,
        timeZone: allowedHours.timezone,
      });
      if (!withinBusinessHours) {
        const nextBusinessAttemptAt = resolveNextAllowedTimestamp({
          now,
          start: allowedHours.start,
          end: allowedHours.end,
          timeZone: allowedHours.timezone,
        });
        await patchObjectRecord(ctx as RouterActionCtx, mission._id, {
          customProperties: {
            ...props,
            nextAttemptAt: nextBusinessAttemptAt,
            outcomeReason: "outside_business_hours_guard",
          },
          updatedAt: now,
        });
        return {
          success: true,
          missionId: mission._id,
          status: "waiting_business_hours",
          nextAttemptAt: nextBusinessAttemptAt,
        };
      }
    }

    const recipientIdentifier = resolveMissionContactAddress(props, step.channel);
    const attemptIndex = attemptCount + 1;
    const attemptId = await insertObjectRecord(ctx as RouterActionCtx, {
      organizationId: mission.organizationId,
      type: "appointment_outreach_attempt",
      subtype: step.channel,
      name: `Attempt ${attemptIndex} via ${step.channel}`,
      status: "active",
      customProperties: {
        contractVersion: APPOINTMENT_OUTREACH_CONTRACT_VERSION,
        missionId: String(mission._id),
        bookingId: normalizeOptionalString(props.bookingId),
        attemptIndex,
        channel: step.channel,
        reasonCode: step.reasonCode,
        requestedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    if (!recipientIdentifier) {
      await patchObjectRecord(ctx as RouterActionCtx, attemptId, {
        status: "archived",
        customProperties: {
          missionId: String(mission._id),
          attemptIndex,
          channel: step.channel,
          reasonCode: step.reasonCode,
          requestedAt: now,
          completedAt: now,
          result: "skipped",
          resultReason: "missing_recipient_identifier",
        },
        updatedAt: now,
      });
      await patchObjectRecord(ctx as RouterActionCtx, mission._id, {
        customProperties: {
          ...props,
          attemptCount: attemptIndex,
          lastAttemptAt: now,
          nextAttemptAt: now + APPOINTMENT_OUTREACH_RETRY_DELAY_MS,
        },
        updatedAt: now,
      });
      return {
        success: true,
        missionId: mission._id,
        attemptId,
        status: "skipped_missing_recipient",
      };
    }

    const organization = await getOrganizationRecord(
      ctx as RouterActionCtx,
      mission.organizationId
    );
    const message = resolveMissionAttemptMessage({
      channel: step.channel,
      mission: props,
      bookingName: normalizeOptionalString(props.bookingName),
      organizationName: normalizeOptionalString(organization?.name),
    });
    const sendResult = await (ctx.runAction as Function)(
      internalApi.channels.router.sendMessage,
      {
        organizationId: mission.organizationId,
        channel: step.channel,
        recipientIdentifier,
        content: message,
        idempotencyKey: `appointment_outreach:${String(mission._id)}:${attemptIndex}:${step.channel}`,
        missionId: String(mission._id),
        attemptId: String(attemptId),
        bookingId: normalizeOptionalString(props.bookingId),
      }
    ) as SendResult;

    await patchObjectRecord(ctx as RouterActionCtx, attemptId, {
      status: sendResult.success ? "completed" : "failed",
      customProperties: {
        missionId: String(mission._id),
        attemptIndex,
        channel: step.channel,
        reasonCode: step.reasonCode,
        requestedAt: now,
        completedAt: Date.now(),
        result: sendResult.success
          ? step.channel === "phone_call"
            ? "call_initiated"
            : "delivered"
          : "failed",
        providerMessageId: normalizeOptionalString(sendResult.providerMessageId),
        error: normalizeOptionalString(sendResult.error),
        retryable: sendResult.retryable === true,
      },
      updatedAt: Date.now(),
    });

    if (sendResult.success && step.channel !== "phone_call") {
      await patchObjectRecord(ctx as RouterActionCtx, mission._id, patchMissionCompletion({
        status: "completed",
        customProperties: {
          ...props,
          attemptCount: attemptIndex,
          lastAttemptAt: now,
          outcome: "OUTREACH_DELIVERED",
          outcomeReason: `${step.channel}_delivered`,
          completedAt: now,
        },
        updatedAt: now,
      }));
      return {
        success: true,
        missionId: mission._id,
        attemptId,
        status: "completed",
        outcome: "OUTREACH_DELIVERED",
      };
    }

    if (sendResult.success && step.channel === "phone_call") {
      await patchObjectRecord(ctx as RouterActionCtx, mission._id, {
        customProperties: {
          ...props,
          attemptCount: attemptIndex,
          lastAttemptAt: now,
          awaitingCallOutcome: true,
          nextAttemptAt: now + APPOINTMENT_OUTREACH_VOICEMAIL_DELAY_MS,
        },
        updatedAt: now,
      });
      return {
        success: true,
        missionId: mission._id,
        attemptId,
        status: "awaiting_call_outcome",
      };
    }

    const candidateNextAttemptAt = now + APPOINTMENT_OUTREACH_RETRY_DELAY_MS;
    const noAttemptsRemaining = attemptIndex >= maxAttempts || attemptIndex >= ladder.length;
    const retryWindowExpired = candidateNextAttemptAt > missionDeadlineAt;
    if (noAttemptsRemaining || retryWindowExpired) {
      await patchObjectRecord(ctx as RouterActionCtx, mission._id, patchMissionCompletion({
        status: "archived",
        customProperties: {
          ...props,
          attemptCount: attemptIndex,
          lastAttemptAt: now,
          outcome: "UNRESOLVED_WITH_REASON",
          outcomeReason: "all_attempts_failed",
        },
        updatedAt: now,
      }));
      return {
        success: true,
        missionId: mission._id,
        attemptId,
        status: "archived",
        outcome: "UNRESOLVED_WITH_REASON",
      };
    }

    await patchObjectRecord(ctx as RouterActionCtx, mission._id, {
      customProperties: {
        ...props,
        attemptCount: attemptIndex,
        lastAttemptAt: now,
        nextAttemptAt: candidateNextAttemptAt,
      },
      updatedAt: now,
    });
    return {
      success: true,
      missionId: mission._id,
      attemptId,
      status: "scheduled_retry",
      nextAttemptAt: candidateNextAttemptAt,
    };
  },
});

export const processPendingAppointmentOutreachMissions = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    const missions = await listObjectsByTypeRecord(
      ctx as RouterActionCtx,
      "appointment_outreach_mission"
    );

    let scanned = 0;
    let executed = 0;
    for (const mission of missions) {
      if (mission.status !== "active") {
        continue;
      }
      scanned++;
      const props = (mission.customProperties || {}) as AppointmentMissionSnapshot;
      const nextAttemptAt =
        typeof props.nextAttemptAt === "number" ? props.nextAttemptAt : now;
      if (nextAttemptAt > now) {
        continue;
      }
      if (props.awaitingCallOutcome === true && nextAttemptAt > now) {
        continue;
      }

      await (ctx.runAction as Function)(
        internalApi.channels.router.runAppointmentOutreachMissionStep,
        {
          missionId: mission._id,
        }
      );
      executed++;
    }

    return {
      success: true,
      scanned,
      executed,
    };
  },
});

export const recordTelephonyWebhookOutcome = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    providerCallId: v.string(),
    providerConversationId: v.optional(v.string()),
    providerId: v.optional(v.string()),
    outcome: v.optional(v.string()),
    disposition: v.optional(v.string()),
    transcriptText: v.optional(v.string()),
    transcriptSegments: v.optional(v.array(v.any())),
    durationSeconds: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    voicemailDetected: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const providerCallId = normalizeOptionalString(args.providerCallId);
    const providerConversationId = normalizeOptionalString(
      args.providerConversationId
    );
    if (!providerCallId) {
      return { success: false, error: "providerCallId is required" };
    }

    const callRecords = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "telephony_call_record")
      )
      .collect();
    const callRecordByProviderCallId = callRecords.find((record) => {
      const props = (record.customProperties || {}) as Record<string, unknown>;
      return normalizeOptionalString(props.providerCallId) === providerCallId;
    });
    const callRecordByConversationId = !callRecordByProviderCallId &&
      providerConversationId
      ? callRecords.filter((record) => {
          const props = (record.customProperties || {}) as Record<string, unknown>;
          return (
            normalizeOptionalString(props.providerConversationId) ===
            providerConversationId
          );
        })
      : [];
    const callRecord =
      callRecordByProviderCallId ||
      (callRecordByConversationId.length === 1
        ? callRecordByConversationId[0]
        : undefined);

    const normalizedOutcome = normalizeOptionalString(args.outcome);
    const normalizedDisposition = normalizeOptionalString(args.disposition);
    const normalizedTranscript = normalizeOptionalString(args.transcriptText);
    const voicemailDetected = args.voicemailDetected === true;
    const normalizedErrorMessage = normalizeOptionalString(args.errorMessage);
    const auditProviderId =
      (normalizeOptionalString(args.providerId) as ProviderId | undefined) ||
      (normalizeOptionalString(
        (callRecord?.customProperties as Record<string, unknown> | undefined)?.providerId
      ) as ProviderId | undefined) ||
      "direct";

    let transcriptArtifactId =
      normalizeOptionalString(
        (callRecord?.customProperties as Record<string, unknown> | undefined)
          ?.transcriptArtifactId
      );
    let priorTranscriptStatus = "missing";
    let priorTranscriptCapturedAt: number | undefined;
    const transcriptArtifactObjectId = toObjectId(transcriptArtifactId);
    if (transcriptArtifactObjectId) {
      const transcriptArtifact = await ctx.db.get(transcriptArtifactObjectId);
      if (transcriptArtifact) {
        const transcriptProps = (transcriptArtifact.customProperties || {}) as Record<
          string,
          unknown
        >;
        priorTranscriptStatus =
          normalizeOptionalString(transcriptArtifact.status) || "missing";
        priorTranscriptCapturedAt =
          typeof transcriptProps.capturedAt === "number"
            ? transcriptProps.capturedAt
            : undefined;
        await ctx.db.patch(transcriptArtifactObjectId, {
          status: normalizedTranscript ? "captured" : transcriptArtifact.status,
          customProperties: {
            ...transcriptProps,
            transcriptText:
              normalizedTranscript ||
              normalizeOptionalString(transcriptProps.transcriptText),
            transcriptSegments: Array.isArray(args.transcriptSegments)
              ? args.transcriptSegments
              : transcriptProps.transcriptSegments,
            capturedAt: normalizedTranscript ? now : undefined,
            auditContractVersion:
              normalizeOptionalString(transcriptProps.auditContractVersion) ||
              TELEPHONY_AUDIT_CONTRACT_VERSION,
            auditEventName:
              normalizeOptionalString(transcriptProps.auditEventName) ||
              TELEPHONY_AUDIT_EVENT_NAMES.transcriptIngestionRecorded,
            immutableEvidenceArtifactType:
              normalizeOptionalString(transcriptProps.immutableEvidenceArtifactType) ||
              TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES.transcriptIngestion,
          },
          updatedAt: now,
        });
        transcriptArtifactId = String(transcriptArtifactObjectId);
      }
    }

    let outcomeArtifactId =
      normalizeOptionalString(
        (callRecord?.customProperties as Record<string, unknown> | undefined)
          ?.outcomeArtifactId
      );
    let priorOutcome = "missing";
    let priorDisposition: string | undefined;
    const outcomeArtifactObjectId = toObjectId(outcomeArtifactId);
    if (outcomeArtifactObjectId) {
      const outcomeArtifact = await ctx.db.get(outcomeArtifactObjectId);
      if (outcomeArtifact) {
        const outcomeProps = (outcomeArtifact.customProperties || {}) as Record<
          string,
          unknown
        >;
        priorOutcome =
          normalizeOptionalString(outcomeProps.outcome) ||
          normalizeOptionalString(outcomeArtifact.status) ||
          "missing";
        priorDisposition = normalizeOptionalString(outcomeProps.disposition);
        await ctx.db.patch(outcomeArtifactObjectId, {
          status: normalizedOutcome ? "completed" : outcomeArtifact.status,
          customProperties: {
            ...outcomeProps,
            outcome:
              normalizedOutcome ||
              normalizeOptionalString(outcomeProps.outcome),
            disposition:
              normalizedDisposition ||
              normalizeOptionalString(outcomeProps.disposition),
            durationSeconds:
              typeof args.durationSeconds === "number"
                ? args.durationSeconds
                : outcomeProps.durationSeconds,
            endedAt:
              typeof args.endedAt === "number"
                ? args.endedAt
                : outcomeProps.endedAt,
            voicemailDetected,
            errorMessage: normalizedErrorMessage,
            auditContractVersion:
              normalizeOptionalString(outcomeProps.auditContractVersion) ||
              TELEPHONY_AUDIT_CONTRACT_VERSION,
            auditEventName:
              normalizeOptionalString(outcomeProps.auditEventName) ||
              TELEPHONY_AUDIT_EVENT_NAMES.outcomeMutationRecorded,
            immutableEvidenceArtifactType:
              normalizeOptionalString(outcomeProps.immutableEvidenceArtifactType) ||
              TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES.outcomeMutation,
          },
          updatedAt: now,
        });
        outcomeArtifactId = String(outcomeArtifactObjectId);
      }
    }

    if (callRecord) {
      const callProps = (callRecord.customProperties || {}) as Record<string, unknown>;
      await ctx.db.patch(callRecord._id, {
        status:
          normalizedOutcome && normalizeOptionalString(normalizedOutcome) !== "queued"
            ? "completed"
            : callRecord.status,
        customProperties: {
          ...callProps,
          providerConversationId:
            providerConversationId ||
            normalizeOptionalString(callProps.providerConversationId),
          outcome: normalizedOutcome || normalizeOptionalString(callProps.outcome),
          disposition:
            normalizedDisposition || normalizeOptionalString(callProps.disposition),
          transcriptText:
            normalizedTranscript || normalizeOptionalString(callProps.transcriptText),
          transcriptSegments: Array.isArray(args.transcriptSegments)
            ? args.transcriptSegments
            : callProps.transcriptSegments,
          durationSeconds:
            typeof args.durationSeconds === "number"
              ? args.durationSeconds
              : callProps.durationSeconds,
          endedAt:
            typeof args.endedAt === "number" ? args.endedAt : callProps.endedAt,
          voicemailDetected:
            voicemailDetected || callProps.voicemailDetected === true,
          sendError: normalizedErrorMessage || callProps.sendError,
          auditContractVersion:
            normalizeOptionalString(callProps.auditContractVersion) ||
            TELEPHONY_AUDIT_CONTRACT_VERSION,
          auditEventNames:
            callProps.auditEventNames || { ...TELEPHONY_AUDIT_EVENT_NAMES },
          immutableEvidenceArtifactTypes:
            callProps.immutableEvidenceArtifactTypes || {
              ...TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES,
            },
        },
        updatedAt: now,
      });

      const attemptId = normalizeOptionalString(callProps.attemptId);
      const attemptObjectId = toObjectId(attemptId);
      if (attemptObjectId) {
        const attempt = await ctx.db.get(attemptObjectId);
        if (attempt) {
          const attemptProps = (attempt.customProperties || {}) as Record<string, unknown>;
          await ctx.db.patch(attemptObjectId, {
            status:
              normalizedOutcome && normalizedOutcome !== "queued"
                ? "completed"
                : attempt.status,
            customProperties: {
              ...attemptProps,
              completedAt: now,
              telephonyOutcome: normalizedOutcome || attemptProps.telephonyOutcome,
              telephonyDisposition:
                normalizedDisposition || attemptProps.telephonyDisposition,
              voicemailDetected:
                voicemailDetected || attemptProps.voicemailDetected === true,
              transcriptText:
                normalizedTranscript || attemptProps.transcriptText,
              error: normalizedErrorMessage || attemptProps.error,
            },
            updatedAt: now,
          });
        }
      }

      const missionId = normalizeOptionalString(callProps.missionId);
      const missionObjectId = toObjectId(missionId);
      if (missionObjectId) {
        const mission = await ctx.db.get(missionObjectId);
        if (mission && mission.type === "appointment_outreach_mission") {
          const missionProps = (mission.customProperties || {}) as Record<
            string,
            unknown
          > &
            AppointmentMissionSnapshot;
          const outcomeCategory = resolveCallOutcomeCategory({
            outcome: normalizedOutcome,
            disposition: normalizedDisposition,
            voicemailDetected,
          });
          const maxAttempts = resolveMissionMaxAttempts(missionProps.maxAttempts);
          const attemptCount =
            typeof missionProps.attemptCount === "number"
              ? missionProps.attemptCount
              : 0;
          const missionDeadlineAt =
            typeof missionProps.missionDeadlineAt === "number"
              ? missionProps.missionDeadlineAt
              : now + APPOINTMENT_OUTREACH_MAX_WINDOW_MS;

          if (outcomeCategory === "booked") {
            await ctx.db.patch(mission._id, patchMissionCompletion({
              status: "completed",
              customProperties: {
                ...missionProps,
                outcome: "BOOKED",
                outcomeReason: normalizedOutcome || "call_confirmed",
              },
              updatedAt: now,
            }));
          } else if (outcomeCategory === "voicemail") {
            const nextAttemptAt = now + APPOINTMENT_OUTREACH_VOICEMAIL_DELAY_MS;
            const shouldClose =
              nextAttemptAt > missionDeadlineAt || attemptCount >= maxAttempts;
            if (shouldClose) {
              await ctx.db.patch(mission._id, patchMissionCompletion({
                status: "archived",
                customProperties: {
                  ...missionProps,
                  outcome: "UNRESOLVED_WITH_REASON",
                  outcomeReason: "voicemail_no_remaining_attempts",
                },
                updatedAt: now,
              }));
            } else {
              await ctx.db.patch(mission._id, {
                customProperties: {
                  ...missionProps,
                  awaitingCallOutcome: false,
                  nextAttemptAt,
                  outcomeReason: "voicemail_detected",
                },
                updatedAt: now,
              });
            }
          } else if (outcomeCategory === "retryable_failure") {
            const nextAttemptAt = now + APPOINTMENT_OUTREACH_RETRY_DELAY_MS;
            const shouldClose =
              nextAttemptAt > missionDeadlineAt || attemptCount >= maxAttempts;
            if (shouldClose) {
              await ctx.db.patch(mission._id, patchMissionCompletion({
                status: "archived",
                customProperties: {
                  ...missionProps,
                  outcome: "UNRESOLVED_WITH_REASON",
                  outcomeReason: normalizedOutcome || "call_failed",
                },
                updatedAt: now,
              }));
            } else {
              await ctx.db.patch(mission._id, {
                customProperties: {
                  ...missionProps,
                  awaitingCallOutcome: false,
                  nextAttemptAt,
                  outcomeReason: normalizedOutcome || "call_retryable_failure",
                },
                updatedAt: now,
              });
            }
          } else {
            await ctx.db.patch(mission._id, {
              customProperties: {
                ...missionProps,
                awaitingCallOutcome: false,
                nextAttemptAt: now + APPOINTMENT_OUTREACH_RETRY_DELAY_MS,
              },
              updatedAt: now,
            });
          }
        }
      }

      if (normalizedTranscript || Array.isArray(args.transcriptSegments)) {
        await createTelephonyAuditEvidenceArtifact({
          ctx: ctx as RouterActionCtx,
          organizationId: args.organizationId,
          providerId: auditProviderId,
          providerCallId,
          providerConversationId,
          callRecordId: String(callRecord._id),
          sourceArtifactId: transcriptArtifactId,
          missionId: normalizeOptionalString(callProps.missionId),
          attemptId: normalizeOptionalString(callProps.attemptId),
          bookingId: normalizeOptionalString(callProps.bookingId),
          idempotencyKey: normalizeOptionalString(callProps.idempotencyKey),
          evidenceKind: "transcriptIngestion",
          mutationSource: "webhook_outcome",
          recordedAt: now,
          payload: {
            priorTranscriptStatus,
            nextTranscriptStatus: normalizedTranscript ? "captured" : priorTranscriptStatus,
            priorCapturedAt: priorTranscriptCapturedAt,
            nextCapturedAt:
              normalizedTranscript ? now : priorTranscriptCapturedAt,
            transcriptCharacterCount: normalizedTranscript?.length || 0,
            transcriptSegmentCount: Array.isArray(args.transcriptSegments)
              ? args.transcriptSegments.length
              : 0,
          },
        });
      }

      if (
        normalizedOutcome ||
        normalizedDisposition ||
        typeof args.durationSeconds === "number" ||
        typeof args.endedAt === "number" ||
        voicemailDetected ||
        normalizedErrorMessage
      ) {
        await createTelephonyAuditEvidenceArtifact({
          ctx: ctx as RouterActionCtx,
          organizationId: args.organizationId,
          providerId: auditProviderId,
          providerCallId,
          providerConversationId,
          callRecordId: String(callRecord._id),
          sourceArtifactId: outcomeArtifactId,
          missionId: normalizeOptionalString(callProps.missionId),
          attemptId: normalizeOptionalString(callProps.attemptId),
          bookingId: normalizeOptionalString(callProps.bookingId),
          idempotencyKey: normalizeOptionalString(callProps.idempotencyKey),
          evidenceKind: "outcomeMutation",
          mutationSource: "webhook_outcome",
          recordedAt: now,
          payload: {
            priorOutcome,
            nextOutcome: normalizedOutcome || priorOutcome,
            priorDisposition,
            nextDisposition: normalizedDisposition || priorDisposition,
            durationSeconds:
              typeof args.durationSeconds === "number"
                ? args.durationSeconds
                : callProps.durationSeconds,
            endedAt:
              typeof args.endedAt === "number" ? args.endedAt : callProps.endedAt,
            voicemailDetected:
              voicemailDetected || callProps.voicemailDetected === true,
            errorMessagePresent: Boolean(normalizedErrorMessage),
          },
        });
      }
    }

    return {
      success: true,
      callRecordId: callRecord?._id ?? null,
      transcriptArtifactId,
      outcomeArtifactId,
    };
  },
});

export const ensureTelephonyCallRecord = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    providerId: v.string(),
    providerCallId: v.string(),
    providerConversationId: v.optional(v.string()),
    recipientIdentifier: v.optional(v.string()),
    callerIdentifier: v.optional(v.string()),
    routeKey: v.optional(v.string()),
    telephonyProviderIdentity: v.optional(v.string()),
    direction: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const providerCallId = normalizeOptionalString(args.providerCallId);
    if (!providerCallId) {
      return { success: false, error: "providerCallId is required" };
    }

    const callRecords = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "telephony_call_record")
      )
      .collect();

    const existing = callRecords.find((record) => {
      const props = (record.customProperties || {}) as Record<string, unknown>;
      return normalizeOptionalString(props.providerCallId) === providerCallId;
    });

    const providerConversationId = normalizeOptionalString(args.providerConversationId);
    const providerId =
      (normalizeOptionalString(args.providerId) as ProviderId | undefined) || "direct";

    if (existing) {
      const props = (existing.customProperties || {}) as Record<string, unknown>;
      await ctx.db.patch(existing._id, {
        customProperties: {
          ...props,
          providerConversationId:
            providerConversationId || normalizeOptionalString(props.providerConversationId),
          recipientIdentifier:
            normalizeOptionalString(args.recipientIdentifier) ||
            normalizeOptionalString(props.recipientIdentifier),
          callerIdentifier:
            normalizeOptionalString(args.callerIdentifier) ||
            normalizeOptionalString(props.callerIdentifier),
          routeKey:
            normalizeOptionalString(args.routeKey) ||
            normalizeOptionalString(props.routeKey),
          telephonyProviderIdentity:
            normalizeOptionalString(args.telephonyProviderIdentity) ||
            normalizeOptionalString(props.telephonyProviderIdentity),
          direction:
            normalizeOptionalString(args.direction) ||
            normalizeOptionalString(props.direction),
          source:
            normalizeOptionalString(args.source) ||
            normalizeOptionalString(props.source),
        },
        updatedAt: now,
      });

      return {
        success: true,
        callRecordId: existing._id,
        created: false,
      };
    }

    const callRecordId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "telephony_call_record",
      subtype: providerId,
      name: `Call ${providerCallId}`,
      status: "active",
      customProperties: stripUndefinedProperties({
        contractVersion: TELEPHONY_ARTIFACT_CONTRACT_VERSION,
        providerId,
        providerCallId,
        providerConversationId,
        providerMessageId: providerCallId,
        recipientIdentifier: normalizeOptionalString(args.recipientIdentifier),
        callerIdentifier: normalizeOptionalString(args.callerIdentifier),
        routeKey: normalizeOptionalString(args.routeKey),
        telephonyProviderIdentity: normalizeOptionalString(
          args.telephonyProviderIdentity,
        ),
        direction: normalizeOptionalString(args.direction) || "inbound",
        source: normalizeOptionalString(args.source) || "webhook_inbound",
        createdAt: now,
        auditContractVersion: TELEPHONY_AUDIT_CONTRACT_VERSION,
        auditEventNames: {
          ...TELEPHONY_AUDIT_EVENT_NAMES,
        },
        immutableEvidenceArtifactTypes: {
          ...TELEPHONY_AUDIT_EVIDENCE_ARTIFACT_TYPES,
        },
      }),
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      callRecordId,
      created: true,
    };
  },
});
