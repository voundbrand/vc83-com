/**
 * HTTP ENDPOINTS (REFACTORED)
 *
 * This is the refactored version using the payment provider abstraction.
 * Once tested, this will replace http.ts
 *
 * Key Changes:
 * - Uses payment provider for webhook signature verification
 * - Provider-agnostic webhook handling
 * - Cleaner error handling
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { getProviderByCode } from "./paymentProviders";
import { getCorsHeaders, handleOptionsRequest } from "./api/v1/corsHeaders";
import type { Id } from "./_generated/dataModel";
import type Stripe from "stripe";
import { SLACK_INTEGRATION_CONFIG } from "./oauth/config";
import { normalizeClaimTokenForResponse } from "./onboarding/claimTokenResponse";
import { decodeAndVerifyBetaAutoApproveToken } from "./lib/betaAutoApproveToken";
import { verifySlackRequestSignature } from "./channels/providers/slackProvider";
import { verifyWhatsAppWebhookSignature } from "./channels/providers/whatsappSignature";
import {
  ELEVEN_TELEPHONY_ROUTE_KEY_PREFIX,
  type ProviderCredentials,
} from "./channels/types";
import { addRateLimitHeaders, checkRateLimit } from "./middleware/rateLimit";
import {
  WEBCHAT_BOOTSTRAP_CONTRACT_VERSION,
  WEBCHAT_CUSTOMIZATION_FIELDS,
} from "./webchatCustomizationContract";
import { evaluateIngressAdmission } from "./ai/admissionController";

const generatedApi: any = require("./_generated/api");

// Helper to get error message from unknown error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Helper to check if error has data property with code
function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { code?: string } }).data;
    return data?.code;
  }
  return undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

type SlackVerificationContext = {
  organizationId?: Id<"organizations">;
  teamId?: string;
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: "platform" | "organization";
  routeKey?: string;
  signingSecrets: string[];
};

function extractSlackEventRoutingHints(payload: Record<string, unknown>): {
  teamId?: string;
  appId?: string;
} {
  const authorizations = Array.isArray(payload.authorizations)
    ? (payload.authorizations as Array<Record<string, unknown>>)
    : [];
  const firstAuthorization = authorizations[0] || {};

  return {
    teamId:
      asNonEmptyString(payload.team_id) ||
      asNonEmptyString(firstAuthorization.team_id),
    appId: asNonEmptyString(payload.api_app_id),
  };
}

async function resolveSlackVerificationContext(
  ctx: unknown,
  args: { teamId?: string; appId?: string }
): Promise<SlackVerificationContext | null> {
  const context = await (ctx as any).runQuery(
    generatedApi.internal.channels.webhooks.resolveSlackWebhookVerificationContext,
    {
      teamId: args.teamId,
      appId: args.appId,
    }
  );

  if (!context || typeof context !== "object") {
    return null;
  }

  const signingSecrets = Array.isArray((context as { signingSecrets?: unknown }).signingSecrets)
    ? ((context as { signingSecrets: unknown[] }).signingSecrets
        .map((secret) => asNonEmptyString(secret))
        .filter((secret): secret is string => Boolean(secret)))
    : [];

  return {
    organizationId: asNonEmptyString(
      (context as { organizationId?: unknown }).organizationId
    ) as Id<"organizations"> | undefined,
    teamId: asNonEmptyString((context as { teamId?: unknown }).teamId),
    providerConnectionId: asNonEmptyString(
      (context as { providerConnectionId?: unknown }).providerConnectionId
    ),
    providerAccountId: asNonEmptyString(
      (context as { providerAccountId?: unknown }).providerAccountId
    ),
    providerInstallationId: asNonEmptyString(
      (context as { providerInstallationId?: unknown }).providerInstallationId
    ),
    providerProfileId: asNonEmptyString(
      (context as { providerProfileId?: unknown }).providerProfileId
    ),
    providerProfileType:
      ((context as { providerProfileType?: unknown }).providerProfileType === "platform" ||
        (context as { providerProfileType?: unknown }).providerProfileType ===
          "organization")
        ? ((context as { providerProfileType: "platform" | "organization" })
            .providerProfileType)
        : undefined,
    routeKey: asNonEmptyString((context as { routeKey?: unknown }).routeKey),
    signingSecrets,
  };
}

type WebhookIngressStatus = "success" | "warning" | "error" | "skipped";
type WebhookIngressOutcome = "accepted" | "warning" | "error" | "skipped";

function normalizeWebhookIngressStatus(value: unknown): WebhookIngressStatus {
  if (value === "warning" || value === "error" || value === "skipped") {
    return value;
  }
  return "success";
}

function resolveWebhookIngressOutcome(status: WebhookIngressStatus): WebhookIngressOutcome {
  if (status === "error") return "error";
  if (status === "skipped") return "skipped";
  if (status === "warning") return "warning";
  return "accepted";
}

async function recordIngressWebhookEvent(args: {
  ctx: unknown;
  organizationId?: Id<"organizations"> | null;
  provider: string;
  endpoint: string;
  action: string;
  status: unknown;
  message?: string;
  errorMessage?: string;
  providerEventId?: string;
  providerConnectionId?: string;
  providerAccountId?: string;
  routeKey?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  processedAt?: number;
}): Promise<void> {
  if (!args.organizationId) {
    return;
  }

  const eventStatus = normalizeWebhookIngressStatus(args.status);

  try {
    await (args.ctx as any).runMutation(
      generatedApi.internal.channels.webhooks.recordWebhookEvent,
      {
        organizationId: args.organizationId,
        provider: args.provider,
        endpoint: args.endpoint,
        eventName: `ingress.${args.action}.${eventStatus}`,
        eventStatus,
        outcome: resolveWebhookIngressOutcome(eventStatus),
        message: args.message,
        errorMessage: args.errorMessage,
        providerEventId: args.providerEventId,
        providerConnectionId: args.providerConnectionId,
        providerAccountId: args.providerAccountId,
        routeKey: args.routeKey,
        channel: args.channel,
        metadata: args.metadata,
        processedAt: args.processedAt ?? Date.now(),
      }
    );
  } catch (error) {
    console.warn("[Webhook] Failed to persist ingress event from HTTP boundary:", error);
  }
}

const TELEPHONY_WEBHOOK_SIGNATURE_VERSION = "v1";
const TELEPHONY_WEBHOOK_REPLAY_WINDOW_SECONDS = 60 * 5;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function resolveTelephonyWebhookEventTimestampMs(value: unknown): number | undefined {
  const numeric = asNumber(value);
  if (typeof numeric === "number") {
    return numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

function normalizeTelephonySignatureHeader(
  signatureHeader: string | null | undefined
): string | undefined {
  const normalizedHeader = asNonEmptyString(signatureHeader);
  if (!normalizedHeader) {
    return undefined;
  }

  const signature = normalizedHeader.startsWith(
    `${TELEPHONY_WEBHOOK_SIGNATURE_VERSION}=`
  )
    ? normalizedHeader.slice(3)
    : normalizedHeader;
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return undefined;
  }

  return signature.toLowerCase();
}

async function computeTelephonyWebhookSignature(
  secret: string,
  body: string,
  timestampSeconds: number
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const payload = `${TELEPHONY_WEBHOOK_SIGNATURE_VERSION}:${timestampSeconds}:${body}`;
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(new Uint8Array(digest));
}

async function verifyTelephonyWebhookSignature(args: {
  body: string;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  signingSecret?: string;
  nowMs?: number;
  replayWindowSeconds?: number;
}): Promise<{
  valid: boolean;
  reason?:
    | "missing_signing_secret"
    | "missing_signature_headers"
    | "invalid_signature_timestamp"
    | "stale_signature_timestamp"
    | "invalid_signature";
  timestampSeconds?: number;
}> {
  const signingSecret = asNonEmptyString(args.signingSecret);
  if (!signingSecret) {
    return { valid: false, reason: "missing_signing_secret" };
  }

  const signature = normalizeTelephonySignatureHeader(args.signatureHeader);
  const timestampRaw = asNonEmptyString(args.timestampHeader);
  if (!signature || !timestampRaw) {
    return { valid: false, reason: "missing_signature_headers" };
  }

  const timestampSeconds = Number.parseInt(timestampRaw, 10);
  if (!Number.isFinite(timestampSeconds)) {
    return { valid: false, reason: "invalid_signature_timestamp" };
  }

  const replayWindow =
    args.replayWindowSeconds ?? TELEPHONY_WEBHOOK_REPLAY_WINDOW_SECONDS;
  const nowSeconds = Math.floor((args.nowMs ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > replayWindow) {
    return {
      valid: false,
      reason: "stale_signature_timestamp",
      timestampSeconds,
    };
  }

  const expectedSignature = await computeTelephonyWebhookSignature(
    signingSecret,
    args.body,
    timestampSeconds
  );
  if (!timingSafeEqual(expectedSignature, signature)) {
    return {
      valid: false,
      reason: "invalid_signature",
      timestampSeconds,
    };
  }

  return { valid: true, timestampSeconds };
}

function extractTelephonyRoutingIdentity(
  payload: Record<string, unknown>,
  request: Request
): {
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: "platform" | "organization";
  routeKey?: string;
} {
  const metadata =
    payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? (payload.metadata as Record<string, unknown>)
      : {};
  const providerProfileType =
    payload.providerProfileType === "platform" ||
    payload.providerProfileType === "organization"
      ? payload.providerProfileType
      : metadata.providerProfileType === "platform" ||
          metadata.providerProfileType === "organization"
        ? metadata.providerProfileType
        : undefined;

  return {
    providerConnectionId:
      asNonEmptyString(request.headers.get("x-telephony-provider-connection-id")) ||
      asNonEmptyString(request.headers.get("x-eleven-provider-connection-id")) ||
      asNonEmptyString(payload.providerConnectionId) ||
      asNonEmptyString(metadata.providerConnectionId),
    providerAccountId:
      asNonEmptyString(request.headers.get("x-telephony-provider-account-id")) ||
      asNonEmptyString(request.headers.get("x-eleven-provider-account-id")) ||
      asNonEmptyString(payload.providerAccountId) ||
      asNonEmptyString(metadata.providerAccountId),
    providerInstallationId:
      asNonEmptyString(request.headers.get("x-telephony-provider-installation-id")) ||
      asNonEmptyString(request.headers.get("x-eleven-provider-installation-id")) ||
      asNonEmptyString(payload.providerInstallationId) ||
      asNonEmptyString(metadata.providerInstallationId),
    providerProfileId:
      asNonEmptyString(request.headers.get("x-telephony-provider-profile-id")) ||
      asNonEmptyString(request.headers.get("x-eleven-provider-profile-id")) ||
      asNonEmptyString(payload.providerProfileId) ||
      asNonEmptyString(metadata.providerProfileId),
    providerProfileType,
    routeKey:
      asNonEmptyString(request.headers.get("x-telephony-route-key")) ||
      asNonEmptyString(request.headers.get("x-provider-route-key")) ||
      asNonEmptyString(request.headers.get("x-eleven-route-key")) ||
      asNonEmptyString(payload.routeKey) ||
      asNonEmptyString(payload.bindingRouteKey) ||
      asNonEmptyString(payload.providerRouteKey) ||
      asNonEmptyString(metadata.routeKey) ||
      asNonEmptyString(metadata.bindingRouteKey) ||
      asNonEmptyString(metadata.providerRouteKey),
  };
}

function resolveTelephonyWebhookProviderCallId(
  payload: Record<string, unknown>
): string | undefined {
  return (
    asNonEmptyString(payload.providerCallId) ||
    asNonEmptyString(payload.callId) ||
    asNonEmptyString(payload.id)
  );
}

type TelephonyWebhookDirection = "inbound" | "outbound";

const TELEPHONY_CALLER_TRANSCRIPT_ROLES = new Set([
  "user",
  "caller",
  "customer",
  "human",
  "contact",
  "patient",
  "guest",
]);

const TELEPHONY_CALLER_TRANSCRIPT_ROLE_PREFIX =
  /^(user|caller|customer|human|contact|patient|guest)\s*:\s*/i;
const TELEPHONY_AGENT_TRANSCRIPT_ROLE_PREFIX =
  /^(agent|assistant|ai)\s*:\s*/i;

function resolveTranscriptSegmentText(
  segment: Record<string, unknown>
): string | undefined {
  return (
    asNonEmptyString(segment.text) ||
    asNonEmptyString(segment.message) ||
    asNonEmptyString(segment.transcript) ||
    asNonEmptyString(segment.content)
  );
}

function resolveTranscriptSegmentRole(
  segment: Record<string, unknown>
): string | undefined {
  return (
    asNonEmptyString(segment.role) ||
    asNonEmptyString(segment.speaker) ||
    asNonEmptyString(segment.source)
  );
}

function resolveTelephonyWebhookParticipantIdentifier(
  ...candidates: unknown[]
): string | undefined {
  for (const candidate of candidates) {
    const normalized = asNonEmptyString(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function normalizeTelephonyWebhookDirection(
  value: unknown
): TelephonyWebhookDirection | undefined {
  const normalized = asNonEmptyString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized.startsWith("inbound") ||
    normalized === "incoming" ||
    normalized === "received"
  ) {
    return "inbound";
  }
  if (
    normalized.startsWith("outbound") ||
    normalized === "outgoing" ||
    normalized === "placed" ||
    normalized === "sent"
  ) {
    return "outbound";
  }
  return undefined;
}

function normalizeTelephonyComparableIdentifier(
  value: unknown
): string | undefined {
  const normalized = asNonEmptyString(value);
  if (!normalized) {
    return undefined;
  }
  const digits = normalized.replace(/[^\d+]/g, "");
  return digits.length > 0 ? digits : normalized.toLowerCase();
}

function telephonyIdentifiersMatch(
  left: unknown,
  right: unknown
): boolean {
  const normalizedLeft = normalizeTelephonyComparableIdentifier(left);
  const normalizedRight = normalizeTelephonyComparableIdentifier(right);
  return Boolean(
    normalizedLeft &&
      normalizedRight &&
      normalizedLeft === normalizedRight
  );
}

function buildCallerTranscriptTextFromSegments(
  transcriptSegments: Array<Record<string, unknown>> | undefined
): string | undefined {
  if (!transcriptSegments || transcriptSegments.length === 0) {
    return undefined;
  }

  const text = transcriptSegments
    .map((segment) => {
      const resolved = resolveTranscriptSegmentText(segment);
      if (!resolved) {
        return null;
      }
      const role = resolveTranscriptSegmentRole(segment)?.toLowerCase();
      if (!role || !TELEPHONY_CALLER_TRANSCRIPT_ROLES.has(role)) {
        return null;
      }
      return resolved;
    })
    .filter((segment): segment is string => Boolean(segment))
    .join("\n")
    .trim();

  return text.length > 0 ? text : undefined;
}

function extractCallerTranscriptText(
  transcriptText: string | undefined
): string | undefined {
  const normalized = asNonEmptyString(transcriptText);
  if (!normalized) {
    return undefined;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return undefined;
  }

  const callerLines = lines
    .filter((line) => TELEPHONY_CALLER_TRANSCRIPT_ROLE_PREFIX.test(line))
    .map((line) =>
      line.replace(TELEPHONY_CALLER_TRANSCRIPT_ROLE_PREFIX, "").trim()
    )
    .filter((line) => line.length > 0);

  if (callerLines.length > 0) {
    return callerLines.join("\n");
  }

  if (lines.some((line) => TELEPHONY_AGENT_TRANSCRIPT_ROLE_PREFIX.test(line))) {
    return undefined;
  }

  return normalized;
}

function buildTranscriptTextFromSegments(
  transcriptSegments: Array<Record<string, unknown>>
): string | undefined {
  const text = transcriptSegments
    .map((segment) => {
      const resolved = resolveTranscriptSegmentText(segment);
      if (!resolved) {
        return null;
      }
      const role = resolveTranscriptSegmentRole(segment);
      return role ? `${role}: ${resolved}` : resolved;
    })
    .filter((segment): segment is string => Boolean(segment))
    .join("\n")
    .trim();

  return text.length > 0 ? text : undefined;
}

function normalizeTelephonyTranscriptSegments(
  transcript: unknown
): Array<Record<string, unknown>> | undefined {
  const segments = asArray(transcript)
    ?.map((segment) => asRecord(segment))
    .filter((segment): segment is Record<string, unknown> => Boolean(segment));
  return segments && segments.length > 0 ? segments : undefined;
}

function deriveTelephonyWebhookOutcome(args: {
  payload: Record<string, unknown>;
  eventType?: string;
  analysis?: Record<string, unknown> | null;
  errorMessage?: string;
}): string | undefined {
  const explicitOutcome =
    asNonEmptyString(args.payload.outcome) ||
    asNonEmptyString(args.payload.status) ||
    asNonEmptyString(args.payload.eventType);
  if (explicitOutcome) {
    return explicitOutcome;
  }

  if (args.eventType === "call_initiation_failure") {
    return "failed";
  }

  if (args.eventType === "post_call_transcription") {
    const callSuccessful = args.analysis?.call_successful;
    if (callSuccessful === false) {
      return "completed";
    }
    return "completed";
  }

  if (args.errorMessage) {
    return "failed";
  }

  return undefined;
}

export function normalizeTelephonyWebhookPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const envelopeData = asRecord(payload.data);
  if (!envelopeData) {
    return payload;
  }

  const topLevelMetadata = asRecord(payload.metadata) || {};
  const envelopeMetadata = asRecord(envelopeData.metadata);
  const metadataBody = asRecord(envelopeMetadata?.body);
  const initiationClientData = asRecord(
    envelopeData.conversation_initiation_client_data
  );
  const dynamicVariables = asRecord(initiationClientData?.dynamic_variables) || {};
  const analysis = asRecord(envelopeData.analysis);
  const transcriptSegments = normalizeTelephonyTranscriptSegments(
    envelopeData.transcript
  );
  const transcriptText =
    asNonEmptyString(payload.transcriptText) ||
    asNonEmptyString(payload.transcript) ||
    buildTranscriptTextFromSegments(transcriptSegments || []);
  const providerConversationId =
    asNonEmptyString(payload.providerConversationId) ||
    asNonEmptyString(payload.conversationId) ||
    asNonEmptyString(envelopeData.conversation_id);
  const providerCallId =
    resolveTelephonyWebhookProviderCallId(payload) ||
    asNonEmptyString(envelopeData.provider_call_id) ||
    asNonEmptyString(envelopeData.call_id) ||
    asNonEmptyString(envelopeData.callSid) ||
    asNonEmptyString(metadataBody?.call_sid) ||
    asNonEmptyString(metadataBody?.CallSid) ||
    providerConversationId;
  const errorMessage =
    asNonEmptyString(payload.errorMessage) ||
    asNonEmptyString(payload.error) ||
    asNonEmptyString(envelopeData.failure_reason) ||
    asNonEmptyString(envelopeData.reason);
  const eventType =
    asNonEmptyString(payload.eventType) ||
    asNonEmptyString(payload.type);
  const endedAt =
    resolveTelephonyWebhookEventTimestampMs(payload.endedAt) ||
    resolveTelephonyWebhookEventTimestampMs(envelopeData.ended_at) ||
    resolveTelephonyWebhookEventTimestampMs(payload.event_timestamp) ||
    resolveTelephonyWebhookEventTimestampMs(envelopeData.event_timestamp);
  const durationSeconds =
    asNumber(payload.durationSeconds) ||
    asNumber(envelopeData.duration_seconds) ||
    asNumber(envelopeMetadata?.call_duration_secs);
  const providerTimestamp =
    resolveTelephonyWebhookEventTimestampMs(payload.providerTimestamp) ||
    resolveTelephonyWebhookEventTimestampMs(payload.event_timestamp) ||
    resolveTelephonyWebhookEventTimestampMs(envelopeData.event_timestamp);
  const routeKey =
    asNonEmptyString(payload.routeKey) ||
    asNonEmptyString(payload.bindingRouteKey) ||
    asNonEmptyString(payload.providerRouteKey) ||
    asNonEmptyString(dynamicVariables.routeKey) ||
    asNonEmptyString(dynamicVariables.bindingRouteKey) ||
    asNonEmptyString(dynamicVariables.providerRouteKey);
  const callerIdentifier = resolveTelephonyWebhookParticipantIdentifier(
    payload.callerIdentifier,
    payload.from,
    payload.fromNumber,
    payload.caller,
    payload.callerNumber,
    payload.phoneNumberFrom,
    envelopeData.caller_identifier,
    envelopeData.from,
    envelopeData.from_number,
    envelopeData.caller,
    envelopeData.caller_id,
    envelopeMetadata?.from,
    metadataBody?.from,
    metadataBody?.From,
    dynamicVariables.callerIdentifier,
    dynamicVariables.from
  );
  const recipientIdentifier = resolveTelephonyWebhookParticipantIdentifier(
    payload.recipientIdentifier,
    payload.to,
    payload.toNumber,
    payload.recipient,
    payload.phoneNumber,
    envelopeData.recipient_identifier,
    envelopeData.to,
    envelopeData.to_number,
    envelopeData.recipient,
    envelopeData.phone_number,
    envelopeMetadata?.to,
    metadataBody?.to,
    metadataBody?.To,
    dynamicVariables.recipientIdentifier,
    dynamicVariables.to
  );
  const direction =
    normalizeTelephonyWebhookDirection(payload.direction) ||
    normalizeTelephonyWebhookDirection(payload.callDirection) ||
    normalizeTelephonyWebhookDirection(payload.call_direction) ||
    normalizeTelephonyWebhookDirection(envelopeData.direction) ||
    normalizeTelephonyWebhookDirection(envelopeData.callDirection) ||
    normalizeTelephonyWebhookDirection(envelopeData.call_direction) ||
    normalizeTelephonyWebhookDirection(envelopeMetadata?.direction) ||
    normalizeTelephonyWebhookDirection(
      (envelopeMetadata as Record<string, unknown> | undefined)?.callDirection
    ) ||
    normalizeTelephonyWebhookDirection(
      (envelopeMetadata as Record<string, unknown> | undefined)?.call_direction
    ) ||
    normalizeTelephonyWebhookDirection(metadataBody?.direction) ||
    normalizeTelephonyWebhookDirection(metadataBody?.Direction) ||
    normalizeTelephonyWebhookDirection(dynamicVariables.direction) ||
    normalizeTelephonyWebhookDirection(dynamicVariables.callDirection) ||
    normalizeTelephonyWebhookDirection(dynamicVariables.call_direction);
  const normalizedMetadata = {
    ...topLevelMetadata,
    ...(envelopeMetadata || {}),
    ...dynamicVariables,
  };

  return {
    ...payload,
    eventId:
      asNonEmptyString(payload.eventId) ||
      asNonEmptyString(payload.event_id),
    eventType,
    telephonyProviderIdentity:
      asNonEmptyString(payload.telephonyProviderIdentity) ||
      asNonEmptyString(payload.providerIdentity) ||
      asNonEmptyString(dynamicVariables.telephonyProviderIdentity) ||
      "eleven_telephony",
    providerCallId,
    providerConversationId,
    conversationId:
      asNonEmptyString(payload.conversationId) || providerConversationId,
    outcome: deriveTelephonyWebhookOutcome({
      payload,
      eventType,
      analysis,
      errorMessage,
    }),
    status:
      asNonEmptyString(payload.status) ||
      deriveTelephonyWebhookOutcome({
        payload,
        eventType,
        analysis,
        errorMessage,
      }),
    disposition:
      asNonEmptyString(payload.disposition) ||
      asNonEmptyString(envelopeData.failure_reason) ||
      asNonEmptyString(envelopeData.reason),
    transcriptText,
    transcript:
      asNonEmptyString(payload.transcript) || transcriptText,
    transcriptSegments:
      Array.isArray(payload.transcriptSegments) && payload.transcriptSegments.length > 0
        ? payload.transcriptSegments
        : transcriptSegments,
    durationSeconds,
    endedAt,
    providerTimestamp,
    voicemailDetected:
      payload.voicemailDetected === true ||
      envelopeData.voicemail_detected === true,
    errorMessage,
    error:
      asNonEmptyString(payload.error) || errorMessage,
    callerIdentifier,
    recipientIdentifier,
    direction,
    organizationId:
      asNonEmptyString(payload.organizationId) ||
      asNonEmptyString(dynamicVariables.organizationId),
    providerConnectionId:
      asNonEmptyString(payload.providerConnectionId) ||
      asNonEmptyString(dynamicVariables.providerConnectionId),
    providerAccountId:
      asNonEmptyString(payload.providerAccountId) ||
      asNonEmptyString(dynamicVariables.providerAccountId),
    providerInstallationId:
      asNonEmptyString(payload.providerInstallationId) ||
      asNonEmptyString(dynamicVariables.providerInstallationId),
    providerProfileId:
      asNonEmptyString(payload.providerProfileId) ||
      asNonEmptyString(dynamicVariables.providerProfileId),
    providerProfileType:
      payload.providerProfileType === "platform" ||
      payload.providerProfileType === "organization"
        ? payload.providerProfileType
        : dynamicVariables.providerProfileType === "platform" ||
            dynamicVariables.providerProfileType === "organization"
          ? dynamicVariables.providerProfileType
          : undefined,
    routeKey,
    bindingRouteKey:
      asNonEmptyString(payload.bindingRouteKey) || routeKey,
    providerRouteKey:
      asNonEmptyString(payload.providerRouteKey) || routeKey,
    metadata: normalizedMetadata,
  };
}

function resolveTelephonyWebhookSigningSecret(
  credentials: ProviderCredentials | null
): string | undefined {
  return (
    asNonEmptyString(credentials?.twilioVoiceWebhookSecret) ||
    asNonEmptyString(credentials?.elevenTelephonyWebhookSecret) ||
    asNonEmptyString(credentials?.directCallWebhookSecret) ||
    asNonEmptyString(process.env.ELEVEN_TELEPHONY_WEBHOOK_SECRET) ||
    asNonEmptyString(process.env.DIRECT_CALL_WEBHOOK_SECRET)
  );
}

function isElevenTelephonyIngress(args: {
  payload: Record<string, unknown>;
  routeKey?: string;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
}): boolean {
  const telephonyProviderIdentity =
    asNonEmptyString(args.payload.telephonyProviderIdentity) ||
    asNonEmptyString(args.payload.providerIdentity) ||
    asNonEmptyString(
      (args.payload.metadata as Record<string, unknown> | undefined)
        ?.telephonyProviderIdentity
    );

  return Boolean(
    args.signatureHeader ||
      args.timestampHeader ||
      telephonyProviderIdentity === "eleven_telephony" ||
      args.routeKey?.startsWith(`${ELEVEN_TELEPHONY_ROUTE_KEY_PREFIX}:`)
  );
}

function resolveTelephonyBindingLineIdentifier(
  credentials: ProviderCredentials | null
): string | undefined {
  return (
    asNonEmptyString(credentials?.elevenTelephonyFromNumber) ||
    asNonEmptyString(credentials?.twilioVoiceFromNumber) ||
    asNonEmptyString(credentials?.directCallFromNumber)
  );
}

type ElevenInboundTelephonyRuntimeSkipReason =
  | "non_inbound_call"
  | "ambiguous_direction"
  | "missing_external_contact_identifier"
  | "missing_inbound_message";

type ElevenInboundTelephonyRuntimeDecision =
  | {
      shouldEnsureCallRecord: false;
      shouldDispatch: false;
      reasonCode: "non_inbound_call" | "ambiguous_direction";
      direction?: TelephonyWebhookDirection;
      callerIdentifier?: string;
      recipientIdentifier?: string;
    }
  | {
      shouldEnsureCallRecord: true;
      shouldDispatch: false;
      reasonCode:
        | "missing_external_contact_identifier"
        | "missing_inbound_message";
      direction: "inbound";
      callerIdentifier?: string;
      recipientIdentifier?: string;
    }
  | {
      shouldEnsureCallRecord: true;
      shouldDispatch: true;
      direction: "inbound";
      callerIdentifier?: string;
      recipientIdentifier?: string;
      externalContactIdentifier: string;
      message: string;
      metadata: Record<string, unknown>;
    };

export function resolveElevenInboundTelephonyRuntimeDecision(args: {
  payload: Record<string, unknown>;
  organizationId: string;
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: "platform" | "organization";
  routeKey?: string;
  telephonyProviderIdentity?: string;
  lineIdentifier?: string;
}): ElevenInboundTelephonyRuntimeDecision {
  const callerIdentifier = asNonEmptyString(args.payload.callerIdentifier);
  const recipientIdentifier = asNonEmptyString(args.payload.recipientIdentifier);
  const explicitDirection = normalizeTelephonyWebhookDirection(
    args.payload.direction
  );
  const lineIdentifier = asNonEmptyString(args.lineIdentifier);
  const callerMatchesLine = telephonyIdentifiersMatch(
    callerIdentifier,
    lineIdentifier
  );
  const recipientMatchesLine = telephonyIdentifiersMatch(
    recipientIdentifier,
    lineIdentifier
  );

  let direction = explicitDirection;
  if (!direction) {
    if (recipientMatchesLine && !callerMatchesLine) {
      direction = "inbound";
    } else if (callerMatchesLine && !recipientMatchesLine) {
      direction = "outbound";
    }
  }

  if (direction === "outbound") {
    return {
      shouldEnsureCallRecord: false,
      shouldDispatch: false,
      reasonCode: "non_inbound_call",
      direction,
      callerIdentifier,
      recipientIdentifier,
    };
  }

  if (direction !== "inbound") {
    return {
      shouldEnsureCallRecord: false,
      shouldDispatch: false,
      reasonCode: "ambiguous_direction",
      direction,
      callerIdentifier,
      recipientIdentifier,
    };
  }

  if (!callerIdentifier) {
    return {
      shouldEnsureCallRecord: true,
      shouldDispatch: false,
      reasonCode: "missing_external_contact_identifier",
      direction,
      callerIdentifier,
      recipientIdentifier,
    };
  }

  const transcriptSegments = Array.isArray(args.payload.transcriptSegments)
    ? (args.payload.transcriptSegments as Array<Record<string, unknown>>)
    : undefined;
  const transcriptText =
    asNonEmptyString(args.payload.transcriptText) ||
    asNonEmptyString(args.payload.transcript);
  const callerTranscriptText =
    buildCallerTranscriptTextFromSegments(transcriptSegments) ||
    extractCallerTranscriptText(transcriptText);
  const messageSource = transcriptText || callerTranscriptText;

  if (!messageSource) {
    return {
      shouldEnsureCallRecord: true,
      shouldDispatch: false,
      reasonCode: "missing_inbound_message",
      direction,
      callerIdentifier,
      recipientIdentifier,
    };
  }

  const providerCallId = asNonEmptyString(args.payload.providerCallId);
  const providerConversationId = asNonEmptyString(
    args.payload.providerConversationId
  );
  const eventId = asNonEmptyString(args.payload.eventId);
  const telephonyProviderIdentity =
    asNonEmptyString(args.telephonyProviderIdentity) ||
    asNonEmptyString(args.payload.telephonyProviderIdentity) ||
    "eleven_telephony";
  const message = transcriptText
    ? `Inbound phone call transcript for post-call processing:\n${transcriptText}`
    : callerTranscriptText!;
  const metadata: Record<string, unknown> = {
    providerId: "direct",
    skipOutbound: true,
    direction,
    source: "eleven_telephony_webhook",
    telephonyIngressSource: "eleven_telephony_webhook",
    telephonyProviderIdentity,
    callerIdentifier,
    ...(recipientIdentifier ? { recipientIdentifier } : {}),
    ...(providerCallId ? { providerCallId, providerMessageId: providerCallId } : {}),
    ...(providerConversationId ? { providerConversationId, conversationId: providerConversationId } : {}),
    ...(eventId ? { providerEventId: eventId } : {}),
    ...(args.providerConnectionId ? { providerConnectionId: args.providerConnectionId } : {}),
    ...(args.providerAccountId ? { providerAccountId: args.providerAccountId } : {}),
    ...(args.providerInstallationId ? { providerInstallationId: args.providerInstallationId } : {}),
    ...(args.providerProfileId ? { providerProfileId: args.providerProfileId } : {}),
    ...(args.providerProfileType ? { providerProfileType: args.providerProfileType } : {}),
    ...(args.routeKey
      ? {
          routeKey: args.routeKey,
          bindingRouteKey: args.routeKey,
          providerRouteKey: args.routeKey,
        }
      : {}),
    ...(callerTranscriptText ? { callerTranscriptText } : {}),
    ...(transcriptText ? { transcriptText } : {}),
    ...(asNonEmptyString(args.payload.eventType)
      ? { telephonyWebhookEventType: asNonEmptyString(args.payload.eventType) }
      : {}),
    ...(typeof args.payload.durationSeconds === "number"
      ? { durationSeconds: args.payload.durationSeconds }
      : {}),
    ...(typeof args.payload.endedAt === "number"
      ? { endedAt: args.payload.endedAt }
      : {}),
    ...(typeof args.payload.providerTimestamp === "number"
      ? {
          providerTimestamp: args.payload.providerTimestamp,
          timestamp: args.payload.providerTimestamp,
        }
      : {}),
    idempotencyKey: `telephony_inbound:${args.organizationId}:${providerCallId || providerConversationId || callerIdentifier}`,
  };

  if (transcriptText) {
    metadata.voiceRuntime = {
      transcript: transcriptText,
    };
  }

  return {
    shouldEnsureCallRecord: true,
    shouldDispatch: true,
    direction,
    callerIdentifier,
    recipientIdentifier,
    externalContactIdentifier: callerIdentifier,
    message,
    metadata,
  };
}

function buildTelephonyWebhookRejectResponse(
  status: number,
  reasonCode: string
): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "telephony_webhook_rejected",
      reasonCode,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function encodeArrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function computeTwilioRequestSignature(args: {
  url: string;
  params: URLSearchParams;
  authToken: string;
}): Promise<string> {
  let payload = args.url;
  const pairs = Array.from(args.params.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  for (const [key, value] of pairs) {
    payload += `${key}${value}`;
  }

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(args.authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  return encodeArrayBufferToBase64(digest);
}

async function verifyTwilioRequestSignature(args: {
  request: Request;
  body: string;
  authToken?: string | null;
}): Promise<{ valid: boolean; reason?: string; params: URLSearchParams }> {
  const params = new URLSearchParams(args.body);
  const expectedToken = asNonEmptyString(args.authToken);
  if (!expectedToken) {
    return { valid: false, reason: "missing_twilio_auth_token", params };
  }

  const headerSignature = asNonEmptyString(
    args.request.headers.get("x-twilio-signature"),
  );
  if (!headerSignature) {
    return { valid: false, reason: "missing_twilio_signature", params };
  }

  const computed = await computeTwilioRequestSignature({
    url: args.request.url,
    params,
    authToken: expectedToken,
  });
  if (!timingSafeEqual(computed, headerSignature)) {
    return { valid: false, reason: "invalid_twilio_signature", params };
  }

  return { valid: true, params };
}

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTwilioInboundGreetingTwiml(args: {
  greeting: string;
  actionUrl: string;
}): string {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    `<Say>${escapeXml(args.greeting)}</Say>`,
    `<Record action="${escapeXml(args.actionUrl)}" method="POST" maxLength="120" playBeep="true" trim="trim-silence"/>`,
    "<Say>We did not receive a recording. Goodbye.</Say>",
    "<Hangup/>",
    "</Response>",
  ].join("");
}

function buildTwilioInboundCompletionTwiml(): string {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    "<Say>Thank you. Goodbye.</Say>",
    "<Hangup/>",
    "</Response>",
  ].join("");
}

function normalizeTwilioCallStatus(value: string | null): string | undefined {
  const normalized = asNonEmptyString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "completed") return "completed";
  if (normalized === "busy") return "busy";
  if (normalized === "no-answer") return "no_answer";
  if (normalized === "failed" || normalized === "canceled") return "failed";
  if (normalized === "in-progress" || normalized === "ringing" || normalized === "queued") {
    return "queued";
  }
  return normalized;
}

type TelegramWebhookAuthContext =
  | { mode: "platform" }
  | { mode: "custom"; organizationId: Id<"organizations"> };

async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveTelegramWebhookAuthContext(
  ctx: unknown,
  secretTokenHeader: string | null
): Promise<TelegramWebhookAuthContext | null> {
  const secretToken = asNonEmptyString(secretTokenHeader);
  if (!secretToken) {
    return null;
  }

  const platformSecret = asNonEmptyString(process.env.TELEGRAM_WEBHOOK_SECRET);
  if (platformSecret && secretToken === platformSecret) {
    return { mode: "platform" };
  }

  const secretFingerprint = await sha256Hex(secretToken);
  const context = await (ctx as any).runQuery(
    generatedApi.internal.channels.telegramBotSetup.resolveWebhookSecretContext,
    {
      secretToken,
      secretFingerprint,
    }
  );

  const organizationId = asNonEmptyString(
    (context as { organizationId?: unknown } | null)?.organizationId
  );
  if (!organizationId) {
    return null;
  }

  return {
    mode: "custom",
    organizationId: organizationId as Id<"organizations">,
  };
}

function extractWhatsAppPhoneNumberId(payload: Record<string, unknown>): string | undefined {
  const entries = Array.isArray(payload.entry)
    ? (payload.entry as Array<Record<string, unknown>>)
    : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes)
      ? (entry.changes as Array<Record<string, unknown>>)
      : [];
    for (const change of changes) {
      const value = (change.value || {}) as Record<string, unknown>;
      const metadata = (value.metadata || {}) as Record<string, unknown>;
      const phoneNumberId = asNonEmptyString(metadata.phone_number_id);
      if (phoneNumberId) {
        return phoneNumberId;
      }
    }
  }

  return undefined;
}

function resolveWebchatHitlQuickActionMessage(args: {
  action: "takeover" | "resume";
  status?: string;
}): string {
  if (args.action === "takeover") {
    if (args.status === "taken_over" || args.status === "noop_already_taken_over") {
      return "Human takeover is active for this conversation.";
    }
    if (args.status === "invalid_takeover_state") {
      return "Takeover is only available while escalation is pending.";
    }
    return "Unable to start takeover for this conversation.";
  }

  if (
    args.status === "resumed_after_dismissal" ||
    args.status === "resumed_after_resolution" ||
    args.status === "noop_already_resumed"
  ) {
    return "Agent resumed autonomous handling for this conversation.";
  }
  if (args.status === "invalid_resume_state") {
    return "Resume is only available when the conversation is escalated or taken over.";
  }
  return "Unable to resume this conversation.";
}

const http = httpRouter();

/**
 * STRIPE WEBHOOK ENDPOINT (REFACTORED)
 *
 * Receives events from Stripe (Connect account updates, payments, etc.)
 * Now uses the payment provider for signature verification.
 *
 * Events handled:
 * - account.updated: Auto-sync Connect account status
 * - account.external_account.created: Log bank account additions
 * - account.application.deauthorized: Handle user disconnect
 * - payment_intent.succeeded: Payment completion
 * - payment_intent.payment_failed: Failed payments
 * - charge.refunded: Refund handling
 * - invoice.* : Invoice events (future)
 */
http.route({
  path: "/stripe-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. Get raw body and signature header
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      if (!signature) {
        console.error("Webhook error: No signature provided");
        return new Response("Missing signature", { status: 400 });
      }

      // 2. Get Stripe provider
      let provider;
      try {
        provider = getProviderByCode("stripe-connect");
      } catch (error) {
        console.error("Stripe provider not configured:", error);
        return new Response("Payment provider not configured", { status: 500 });
      }

      // 3. Verify webhook signature using provider (async required in Convex runtime)
      const isValidSignature = await provider.verifyWebhookSignature(body, signature);

      if (!isValidSignature) {
        console.error("Webhook signature verification failed");
        return new Response("Invalid signature", { status: 400 });
      }

      // 4. Parse event
      const event = JSON.parse(body);
      console.log(`✓ Webhook received: ${event.type} (${event.id})`);

      // 5. Schedule async processing (returns quickly to Stripe)
      await (ctx as any).runAction(generatedApi.internal.stripeWebhooks.processWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: JSON.stringify(event.data.object),
        created: event.created,
        signature: signature,
      });

      // 6. Respond immediately (< 5 seconds required by Stripe)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

/**
 * STRIPE CONNECT WEBHOOK ENDPOINT (REFACTORED)
 *
 * Separate endpoint for Connect-specific events if needed.
 * Uses same provider-based verification.
 *
 * IMPORTANT: For development with Stripe CLI:
 * - Run `stripe listen --forward-to https://your-site.convex.site/stripe-connect-webhooks`
 * - Copy the webhook secret (starts with whsec_)
 * - Set it: `npx convex env set STRIPE_WEBHOOK_SECRET whsec_...`
 * - Restart Convex dev server
 */
http.route({
  path: "/stripe-connect-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    let responseStatus = 200;
    
    try {
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      console.log("[Connect Webhook] 📥 Received webhook request", {
        hasSignature: !!signature,
        bodyLength: body.length,
        url: request.url,
      });

      if (!signature) {
        console.error("[Connect Webhook] ❌ Missing signature header");
        responseStatus = 400;
        return new Response("Missing signature", { status: 400 });
      }

      // Get Stripe provider
      let provider;
      try {
        provider = getProviderByCode("stripe-connect");
      } catch (error) {
        console.error("[Connect Webhook] ❌ Stripe provider not configured:", error);
        responseStatus = 500;
        return new Response("Payment provider not configured", { status: 500 });
      }

      // Log current environment secret for debugging
      const envSecret = process.env.STRIPE_WEBHOOK_SECRET;
      console.log("[Connect Webhook] 🔑 Environment check", {
        envSecretConfigured: !!envSecret,
        envSecretPrefix: envSecret ? envSecret.substring(0, 15) + "..." : "not set",
        envSecretLength: envSecret?.length || 0,
      });

      // Try to parse event ID for idempotency check (before signature verification)
      let eventId: string | null = null;
      try {
        const event = JSON.parse(body);
        eventId = event.id;
      } catch {
        // If we can't parse, continue with signature verification
      }

      // Verify signature using provider (async required in Convex runtime)
      const isValidSignature = await provider.verifyWebhookSignature(body, signature);

      if (!isValidSignature) {
        // Check if this might be a retry of an already-processed event
        // (Stripe CLI sometimes modifies body slightly on retry, causing sig verification to fail)
        if (eventId) {
          const alreadyProcessed = await (ctx as any).runQuery(
            generatedApi.internal.stripeWebhooks.checkEventProcessed,
            { eventId }
          );
          
          if (alreadyProcessed) {
            console.log(`[Connect Webhook] ℹ️ Event ${eventId} already processed, returning 200 (idempotency)`);
            responseStatus = 200;
            return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        const eventType = eventId ? (() => {
          try {
            const event = JSON.parse(body);
            return event.type;
          } catch {
            return "unknown";
          }
        })() : "unknown";
        
        console.error("[Connect Webhook] ❌ Signature verification failed", {
          eventType,
          eventId: eventId || "unknown",
          hasSignature: !!signature,
          bodyLength: body.length,
          signaturePrefix: signature ? signature.substring(0, 30) + "..." : "missing",
        });
        console.error("[Connect Webhook] 💡 Tip: Ensure STRIPE_WEBHOOK_SECRET matches the secret from 'stripe listen' output");
        console.error("[Connect Webhook] 💡 Tip: Restart Convex dev server after updating environment variables");
        console.error("[Connect Webhook] 💡 Note: Stripe CLI may retry failed webhooks - this is normal");
        responseStatus = 400;
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event
      const event = JSON.parse(body);
      console.log(`[Connect Webhook] ✅ Signature verified: ${event.type} (${event.id})`);

      // Process Connect-specific events
      await (ctx as any).runAction(generatedApi.internal.stripeWebhooks.processWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: JSON.stringify(event.data.object),
        created: event.created,
        signature: signature,
      });

      const duration = Date.now() - startTime;
      console.log(`[Connect Webhook] ✅ Successfully processed ${event.type} in ${duration}ms`);
      
      responseStatus = 200;
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Connect Webhook] ❌ Error after ${duration}ms:`, error);
      responseStatus = 500;
      return new Response("Internal server error", { status: 500 });
    } finally {
      console.log(`[Connect Webhook] 📤 Responding with status ${responseStatus}`);
    }
  }),
});

/**
 * STRIPE INVOICE WEBHOOK ENDPOINT
 *
 * Handles Stripe webhooks for B2B invoicing.
 * Separate from AI subscriptions and Connect webhooks.
 *
 * Events handled:
 * - invoice.created - Invoice created in Stripe
 * - invoice.finalized - Invoice finalized (sealed)
 * - invoice.paid - Payment received
 * - invoice.payment_failed - Payment failed
 * - invoice.payment_action_required - Action required
 * - invoice.voided - Invoice voided
 * - invoice.marked_uncollectible - Marked uncollectible
 */
http.route({
  path: "/stripe-invoice-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("[Invoice Webhooks] 🔔 Received webhook request");

    try {
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      if (!signature) {
        console.error("[Invoice Webhooks] ❌ No signature provided");
        return new Response("Missing signature", { status: 400 });
      }

      // Verify webhook signature
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("[Invoice Webhooks] ❌ STRIPE_WEBHOOK_SECRET not configured");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      // Import Stripe for signature verification
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2025-10-29.clover",
      });

      // Verify signature - MUST use async version in Convex runtime
      let event: Stripe.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        console.log(`[Invoice Webhooks] ✅ Signature verified for event: ${event.type}`);
      } catch (error) {
        console.error("[Invoice Webhooks] ❌ Signature verification failed:", error);
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event
      console.log(`[Invoice Webhooks] 📦 Processing: ${event.type} (${event.id})`);

      // Schedule async processing
      await (ctx as any).runAction(generatedApi.internal.api.v1.stripeInvoiceWebhooks.processStripeInvoiceWebhook, {
        eventType: event.type,
        eventId: event.id,
        invoiceData: event.data.object as Stripe.Invoice,
        created: event.created,
      });

      console.log(`[Invoice Webhooks] ✅ Event queued for processing`);

      // Respond immediately (< 5 seconds required by Stripe)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Invoice Webhooks] ❌ Processing error:", error);
      console.error("[Invoice Webhooks] Stack:", (error as Error).stack);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

/**
 * AI SUBSCRIPTION WEBHOOK ENDPOINT
 *
 * Handles Stripe webhooks for AI subscription billing.
 * This is separate from Stripe Connect webhooks (which are for organization payment processing).
 *
 * IMPORTANT: This endpoint uses STRIPE_AI_WEBHOOK_SECRET for signature verification,
 * which is DIFFERENT from STRIPE_WEBHOOK_SECRET used for Stripe Connect webhooks.
 * These are two separate Stripe integrations:
 * 1. Platform-level: Organizations subscribe to YOUR platform (this endpoint)
 * 2. Organization-level: Organizations accept payments from THEIR customers (Stripe Connect)
 *
 * Events handled:
 * - customer.subscription.created - New AI subscription
 * - customer.subscription.updated - Subscription changes
 * - customer.subscription.deleted - Subscription cancellation
 * - invoice.payment_succeeded - Monthly payment success
 * - invoice.payment_failed - Payment failure
 */
http.route({
  path: "/stripe-ai-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("[AI Webhooks] 🔔 Received webhook request");

    try {
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      console.log("[AI Webhooks] 📝 Request details:", {
        hasSignature: !!signature,
        bodyLength: body.length,
        url: request.url
      });

      if (!signature) {
        console.error("[AI Webhooks] ❌ No signature provided");
        return new Response("Missing signature", { status: 400 });
      }

      // Verify webhook signature using AI-specific webhook secret
      // NOTE: This uses STRIPE_AI_WEBHOOK_SECRET, NOT the Stripe Connect webhook secret
      const webhookSecret = process.env.STRIPE_AI_WEBHOOK_SECRET;

      console.log("[AI Webhooks] 🔑 Webhook secret configured:", !!webhookSecret);

      if (!webhookSecret) {
        console.error("[AI Webhooks] ❌ STRIPE_AI_WEBHOOK_SECRET not configured");
        console.error("[AI Webhooks] 💡 Set this in Convex dashboard or use stripe listen secret");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      // Import Stripe for signature verification
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2025-10-29.clover",
      });

      // Verify signature - MUST use async version in Convex runtime
      let event: Stripe.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        console.log(`[AI Webhooks] ✅ Signature verified for event: ${event.type}`);
      } catch (error) {
        console.error("[AI Webhooks] ❌ Signature verification failed:", error);
        console.error("[AI Webhooks] 🔍 Webhook secret starts with:", webhookSecret.substring(0, 10) + "...");
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event (already parsed by constructEvent)
      console.log(`[AI Webhooks] 📦 Processing: ${event.type} (${event.id})`);
      const eventObject = event.data.object as unknown as Record<string, unknown>;
      console.log(`[AI Webhooks] 📧 Customer email: ${eventObject.customer_email || 'N/A'}`);

      // Schedule async processing
      await (ctx as any).runAction(generatedApi.internal.stripe.aiWebhooks.processAIWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: JSON.stringify(event.data.object),
        created: event.created,
      });

      console.log(`[AI Webhooks] ✅ Event queued for processing`);

      // Respond immediately (< 5 seconds required by Stripe)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[AI Webhooks] ❌ Processing error:", error);
      console.error("[AI Webhooks] Stack:", (error as Error).stack);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

/**
 * GENERIC PAYMENT WEBHOOK ENDPOINT (Future)
 *
 * This will handle webhooks from ANY payment provider (Stripe, PayPal, Square, etc.)
 * Provider is determined by a URL parameter or header.
 */
http.route({
  path: "/payment-webhooks/:providerCode",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Get provider code from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const providerCode = pathParts[pathParts.length - 1];

      const body = await request.text();
      const signature = request.headers.get("stripe-signature") ||
                       request.headers.get("paypal-transmission-sig") ||
                       request.headers.get("x-square-signature") ||
                       "";

      if (!signature) {
        console.error(`Webhook error: No signature for ${providerCode}`);
        return new Response("Missing signature", { status: 400 });
      }

      // Get provider
      let provider;
      try {
        provider = getProviderByCode(providerCode);
      } catch (error) {
        console.error(`Provider ${providerCode} not found:`, error);
        return new Response(`Provider ${providerCode} not configured`, { status: 404 });
      }

      // Verify signature (async required in Convex runtime)
      const isValidSignature = await provider.verifyWebhookSignature(body, signature);

      if (!isValidSignature) {
        console.error(`${providerCode} webhook signature verification failed`);
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event (provider-specific format)
      const event = JSON.parse(body);
      console.log(`✓ ${providerCode} webhook received: ${event.type || event.event_type} (${event.id})`);

      // TODO: Route to provider-specific webhook processor
      // For now, Stripe-only
      if (providerCode === "stripe-connect") {
        await (ctx as any).runAction(generatedApi.internal.stripeWebhooks.processWebhook, {
          eventType: event.type,
          eventId: event.id,
          eventData: JSON.stringify(event.data.object),
          created: event.created,
          signature: signature,
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Payment webhook error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

/**
 * HEALTH CHECK ENDPOINT
 * Verify the server is running
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: Date.now(),
        providers: ["stripe-connect"], // Could be dynamic
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

/**
 * ==========================================
 * ENTERPRISE API v1 ENDPOINTS
 * ==========================================
 *
 * External API for integration with customer websites.
 * Requires API key authentication via Authorization: Bearer <key>
 */

// Import API handlers
import {
  listEvents,
  createEvent,
  getEvent,
  updateEvent,
  getEventAttendees,
  getEventBySlug,
  getEventProducts,
  cancelEvent,
} from "./api/v1/events";
import {
  listProducts,
  handleProductsGet,
  handleProductsPost,
  handleProductsPatch,
  handleProductsDelete,
  handleOptions as productsHandleOptions,
} from "./api/v1/products";
import {
  listForms,
  createForm,
  getForm,
  getFormResponses,
  submitFormResponse,
  deleteForm,
  getPublicForm,
  submitPublicForm,
} from "./api/v1/forms";
import { triggerWorkflow } from "./api/v1/workflows";
import { getTransaction } from "./api/v1/transactions";
import {
  getTicketPdf,
  listTickets,
  validateTicket,
  handleTicketsGet,
  handleTicketsPost,
  handleOptions as ticketsHandleOptions,
} from "./api/v1/tickets";
import {
  getCheckoutConfig,
  createCheckoutSession,
  confirmPayment,
  listCheckoutSessions,
  handleCheckoutSessionsGet,
  handleCheckoutSessionsPost,
  handleOptions as checkoutHandleOptions,
} from "./api/v1/checkout";
import {
  createContactFromEvent,
  createContact,
  listContacts,
  getContact,
  updateContact,
  deleteContact,
  bulkImportContacts,
  exportContacts,
  listCrmOrganizations,
  createCrmOrganization,
  getCrmOrganization,
  updateCrmOrganization,
  dispatchCrmSyncOutbox,
} from "./api/v1/crm";
import { createBooking } from "./api/v1/bookings";
import {
  getCurrentUser,
  getCompleteProfile,
  getTransactions,
  getTickets,
  getEvents as getUserEvents,
  updateCurrentUser,
} from "./api/v1/users";
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  listMilestones,
  listTasks,
  listTeamMembers,
  listComments,
  getActivityLog,
} from "./api/v1/projects";
import {
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sealInvoice,
  sendInvoice,
  getInvoicePdf,
  syncInvoiceToStripe,
} from "./api/v1/invoices";
import {
  createBenefit,
  listBenefits,
  getBenefit,
  updateBenefit,
  deleteBenefit,
  createClaim,
  listClaims,
  createCommission,
  listCommissions,
  getCommission,
  createPayout,
  listPayouts,
} from "./api/v1/benefits";
import {
  listCertificates,
  getCertificate,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  batchIssueCertificates,
  verifyCertificate,
  getCertificatesByRecipient,
  handleOptions as certificatesHandleOptions,
  handleCertificatePost,
} from "./api/v1/certificates";
import {
  listPublishedPages,
  createPublishedPage,
  updatePublishedPage,
  deletePublishedPage,
  handlePublishingPost,
  handlePublishingGet,
  handleOptions as publishingHandleOptions,
} from "./api/v1/publishing";
import {
  listOAuthConnections,
  handleOAuthConnectionsGet,
  handleOAuthConnectionsPost,
  handleOAuthConnectionsPatch,
  handleOAuthConnectionsDelete,
  handleOptions as oauthConnectionsHandleOptions,
} from "./api/v1/oauthConnections";
import {
  listLocations,
  createLocation,
  getLocation,
  updateLocation,
  deleteLocation,
} from "./api/v1/locations";
import {
  getResourceAvailability,
  setWeeklySchedule,
  createException,
  createBlock,
  deleteAvailability,
  getAvailableSlots,
} from "./api/v1/availability";
import {
  listResourceBookings,
  createResourceBooking,
  getResourceBooking,
  confirmResourceBooking,
  checkInResourceBooking,
  completeResourceBooking,
  cancelResourceBooking,
  customerCheckout,
} from "./api/v1/resourceBookings";
import {
  handleOptions as aiChatHandleOptions,
  createConversation as aiChatCreateConversation,
  listConversations as aiChatListConversations,
  getConversation as aiChatGetConversation,
  sendMessage as aiChatSendMessage,
  getSettings as aiChatGetSettings,
  getModels as aiChatGetModels,
  listVoiceCatalog as aiChatListVoiceCatalog,
  updateVoicePreferences as aiChatUpdateVoicePreferences,
  resolveVoiceSession as aiChatResolveVoiceSession,
  openVoiceSession as aiChatOpenVoiceSession,
  closeVoiceSession as aiChatCloseVoiceSession,
  transcribeVoice as aiChatTranscribeVoice,
  synthesizeVoice as aiChatSynthesizeVoice,
  ingestVoiceFrame as aiChatIngestVoiceFrame,
  ingestVideoFrame as aiChatIngestVideoFrame,
  handleToolAction as aiChatHandleToolAction,
  getPendingTools as aiChatGetPendingTools,
  updateConversation as aiChatUpdateConversation,
  archiveConversation as aiChatArchiveConversation,
  listOrganizations as aiChatListOrganizations,
  switchOrganization as aiChatSwitchOrganization,
} from "./api/v1/aiChat";

// Agent Conversations API (wraps agentSessions for external REST access)
import {
  listConversations as agentListConversations,
  getConversation as agentGetConversation,
  getConversationMessages as agentGetConversationMessages,
  sendConversationMessage as agentSendConversationMessage,
  updateConversation as agentUpdateConversation,
} from "./api/v1/conversations";
import {
  handleOptions as supportHandleOptions,
  postSupportChat,
  getSupportChatSession,
  postSupportEscalate,
} from "./api/v1/support";

// Sub-Organizations API (parent-child org hierarchy for agency model)
import {
  createChildOrganization,
  listChildOrganizations,
  getChildOrganization,
  updateChildOrganization,
} from "./api/v1/subOrganizations";
import {
  handleOptions as creditsHandleOptions,
  getCreditsBalance,
  getCreditsHistory,
  redeemCreditsCode,
  getReferralProgramDashboard,
  ensureReferralProfile,
  trackReferralSignup,
} from "./api/credits";

/**
 * Layer 1: READ APIs (Before Checkout)
 */

// OPTIONS /api/credits/balance (CORS preflight)
http.route({
  path: "/api/credits/balance",
  method: "OPTIONS",
  handler: creditsHandleOptions,
});

// GET /api/credits/balance
http.route({
  path: "/api/credits/balance",
  method: "GET",
  handler: getCreditsBalance,
});

// OPTIONS /api/credits/history (CORS preflight)
http.route({
  path: "/api/credits/history",
  method: "OPTIONS",
  handler: creditsHandleOptions,
});

// GET /api/credits/history
http.route({
  path: "/api/credits/history",
  method: "GET",
  handler: getCreditsHistory,
});

// OPTIONS /api/credits/redeem (CORS preflight)
http.route({
  path: "/api/credits/redeem",
  method: "OPTIONS",
  handler: creditsHandleOptions,
});

// POST /api/credits/redeem
http.route({
  path: "/api/credits/redeem",
  method: "POST",
  handler: redeemCreditsCode,
});

// OPTIONS /api/credits/referral (CORS preflight)
http.route({
  path: "/api/credits/referral",
  method: "OPTIONS",
  handler: creditsHandleOptions,
});

// GET /api/credits/referral
http.route({
  path: "/api/credits/referral",
  method: "GET",
  handler: getReferralProgramDashboard,
});

// OPTIONS /api/credits/referral/profile (CORS preflight)
http.route({
  path: "/api/credits/referral/profile",
  method: "OPTIONS",
  handler: creditsHandleOptions,
});

// POST /api/credits/referral/profile
http.route({
  path: "/api/credits/referral/profile",
  method: "POST",
  handler: ensureReferralProfile,
});

// OPTIONS /api/credits/referral/track-signup (CORS preflight)
http.route({
  path: "/api/credits/referral/track-signup",
  method: "OPTIONS",
  handler: creditsHandleOptions,
});

// POST /api/credits/referral/track-signup
http.route({
  path: "/api/credits/referral/track-signup",
  method: "POST",
  handler: trackReferralSignup,
});

// OPTIONS /api/v1/events (CORS preflight)
http.route({
  path: "/api/v1/events",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/events (exact match - list all events)
http.route({
  path: "/api/v1/events",
  method: "GET",
  handler: listEvents,
});

// POST /api/v1/events (create event)
http.route({
  path: "/api/v1/events",
  method: "POST",
  handler: createEvent,
});

// OPTIONS /api/v1/events/by-slug/:slug (CORS preflight)
http.route({
  pathPrefix: "/api/v1/events/by-slug/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/events/by-slug/:slug (get event by slug)
http.route({
  pathPrefix: "/api/v1/events/by-slug/",
  method: "GET",
  handler: getEventBySlug,
});

// OPTIONS /api/v1/events/:eventId (CORS preflight for event paths)
http.route({
  pathPrefix: "/api/v1/events/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/events/:eventId/attendees (get event attendees)
http.route({
  path: "/api/v1/events/:eventId/attendees",
  method: "GET",
  handler: getEventAttendees,
});

// GET /api/v1/events/:eventId/products (get event products)
http.route({
  path: "/api/v1/events/:eventId/products",
  method: "GET",
  handler: getEventProducts,
});

// POST /api/v1/events/:eventId/cancel (cancel event)
// Uses pathPrefix because Convex doesn't support Express-style :param in path
http.route({
  pathPrefix: "/api/v1/events/",
  method: "POST",
  handler: cancelEvent,
});

// GET /api/v1/events/:eventId (get event by ID)
// Uses pathPrefix to handle dynamic eventId parameter
http.route({
  pathPrefix: "/api/v1/events/",
  method: "GET",
  handler: getEvent,
});

// PATCH /api/v1/events/:eventId (update event)
http.route({
  pathPrefix: "/api/v1/events/",
  method: "PATCH",
  handler: updateEvent,
});

// ============================================================================
// LAYER 4: PRODUCTS API (Full CRUD)
// ============================================================================

// GET /api/v1/products (list products)
http.route({
  path: "/api/v1/products",
  method: "GET",
  handler: listProducts,
});

// POST /api/v1/products (create product)
http.route({
  path: "/api/v1/products",
  method: "POST",
  handler: handleProductsPost,
});

// OPTIONS /api/v1/products (CORS preflight)
http.route({
  path: "/api/v1/products",
  method: "OPTIONS",
  handler: productsHandleOptions,
});

// GET /api/v1/products/:productId (get product by ID)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "GET",
  handler: handleProductsGet,
});

// POST /api/v1/products/:productId/* (publish, archive, price)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "POST",
  handler: handleProductsPost,
});

// PATCH /api/v1/products/:productId (update product)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "PATCH",
  handler: handleProductsPatch,
});

// DELETE /api/v1/products/:productId (delete product)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "DELETE",
  handler: handleProductsDelete,
});

// OPTIONS /api/v1/products/:productId/* (CORS preflight)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "OPTIONS",
  handler: productsHandleOptions,
});

// ============================================================================
// LAYER 5: FORMS API
// ============================================================================

// GET /api/v1/forms (list forms - authenticated)
http.route({
  path: "/api/v1/forms",
  method: "GET",
  handler: listForms,
});

// POST /api/v1/forms (create form - authenticated)
http.route({
  path: "/api/v1/forms",
  method: "POST",
  handler: createForm,
});

// GET /api/v1/forms/:formId/responses (get form responses - authenticated)
// Uses pathPrefix because Convex doesn't support Express-style :param in path
http.route({
  pathPrefix: "/api/v1/forms/",
  method: "GET",
  handler: getForm, // Handler checks for /responses suffix internally
});

// POST /api/v1/forms/:formId/responses (submit form response - authenticated)
// Uses pathPrefix because Convex doesn't support Express-style :param in path
http.route({
  pathPrefix: "/api/v1/forms/",
  method: "POST",
  handler: submitFormResponse, // Handler checks for /responses suffix internally
});

// DELETE /api/v1/forms/:formId (delete form - authenticated)
// Uses pathPrefix because Convex doesn't support Express-style :param in path
http.route({
  pathPrefix: "/api/v1/forms/",
  method: "DELETE",
  handler: deleteForm,
});

// OPTIONS /api/v1/forms/public/:formId (CORS preflight)
http.route({
  pathPrefix: "/api/v1/forms/public/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/forms/public/:formId (public access - no auth)
http.route({
  pathPrefix: "/api/v1/forms/public/",
  method: "GET",
  handler: getPublicForm,
});

// POST /api/v1/forms/public/:formId/submit (public submission - no auth)
http.route({
  pathPrefix: "/api/v1/forms/public/",
  method: "POST",
  handler: submitPublicForm,
});

/**
 * Layer 2: CHECKOUT APIs (Payment Processing + Session CRUD)
 */

// GET /api/v1/checkout/config - Get payment provider configuration
http.route({
  path: "/api/v1/checkout/config",
  method: "GET",
  handler: getCheckoutConfig,
});

// GET /api/v1/checkout/sessions - List checkout sessions
http.route({
  path: "/api/v1/checkout/sessions",
  method: "GET",
  handler: listCheckoutSessions,
});

// POST /api/v1/checkout/sessions - Create checkout session
http.route({
  path: "/api/v1/checkout/sessions",
  method: "POST",
  handler: createCheckoutSession,
});

// OPTIONS /api/v1/checkout/sessions (CORS preflight)
http.route({
  path: "/api/v1/checkout/sessions",
  method: "OPTIONS",
  handler: checkoutHandleOptions,
});

// GET /api/v1/checkout/sessions/:sessionId - Get session details
http.route({
  pathPrefix: "/api/v1/checkout/sessions/",
  method: "GET",
  handler: handleCheckoutSessionsGet,
});

// POST /api/v1/checkout/sessions/:sessionId/cancel - Cancel session
http.route({
  pathPrefix: "/api/v1/checkout/sessions/",
  method: "POST",
  handler: handleCheckoutSessionsPost,
});

// OPTIONS /api/v1/checkout/sessions/:sessionId/* (CORS preflight)
http.route({
  pathPrefix: "/api/v1/checkout/sessions/",
  method: "OPTIONS",
  handler: checkoutHandleOptions,
});

// POST /api/v1/checkout/confirm - Confirm payment and fulfill order
http.route({
  path: "/api/v1/checkout/confirm",
  method: "POST",
  handler: confirmPayment,
});

/**
 * Layer 3: WORKFLOW API (During Checkout)
 */

// OPTIONS /api/v1/workflows/trigger (CORS preflight)
http.route({
  path: "/api/v1/workflows/trigger",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// POST /api/v1/workflows/trigger
http.route({
  path: "/api/v1/workflows/trigger",
  method: "POST",
  handler: triggerWorkflow,
});

/**
 * Layer 4: RESULT APIs (After Checkout)
 */

// GET /api/v1/transactions/:transactionId
http.route({
  path: "/api/v1/transactions/:transactionId",
  method: "GET",
  handler: getTransaction,
});

/**
 * Layer 4b: TICKETS API
 *
 * Endpoints for managing event tickets.
 * Security: Dual auth (API keys + OAuth tokens with tickets:read/write scopes)
 */

// OPTIONS /api/v1/tickets - CORS preflight
http.route({
  path: "/api/v1/tickets",
  method: "OPTIONS",
  handler: ticketsHandleOptions,
});

// OPTIONS /api/v1/tickets/* - CORS preflight for all ticket paths
http.route({
  pathPrefix: "/api/v1/tickets/",
  method: "OPTIONS",
  handler: ticketsHandleOptions,
});

// GET /api/v1/tickets - List tickets
http.route({
  path: "/api/v1/tickets",
  method: "GET",
  handler: listTickets,
});

// POST /api/v1/tickets/validate - Validate ticket by QR code
http.route({
  path: "/api/v1/tickets/validate",
  method: "POST",
  handler: validateTicket,
});

// GET /api/v1/tickets/:ticketId or /pdf
// Combined handler routes based on URL path
http.route({
  pathPrefix: "/api/v1/tickets/",
  method: "GET",
  handler: handleTicketsGet,
});

// POST /api/v1/tickets/:ticketId/redeem or /void
// Combined handler routes based on URL path
http.route({
  pathPrefix: "/api/v1/tickets/",
  method: "POST",
  handler: handleTicketsPost,
});

/**
 * Layer 5: CRM APIs (Contact Management)
 */

// POST /api/v1/crm/contacts/from-event - Create contact from event registration
http.route({
  path: "/api/v1/crm/contacts/from-event",
  method: "POST",
  handler: createContactFromEvent,
});

// POST /api/v1/crm/contacts - Create generic contact
http.route({
  path: "/api/v1/crm/contacts",
  method: "POST",
  handler: createContact,
});

// GET /api/v1/crm/contacts - List contacts
http.route({
  path: "/api/v1/crm/contacts",
  method: "GET",
  handler: listContacts,
});

// POST /api/v1/crm/contacts/bulk - Bulk import contacts (Starter+ only)
http.route({
  path: "/api/v1/crm/contacts/bulk",
  method: "POST",
  handler: bulkImportContacts,
});

// GET /api/v1/crm/contacts/export - Export contacts (Starter+ only)
http.route({
  path: "/api/v1/crm/contacts/export",
  method: "GET",
  handler: exportContacts,
});

// GET /api/v1/crm/contacts/:contactId - Get contact details
// Uses pathPrefix to handle dynamic contactId parameter
// Uses the exported getContact handler from crm.ts which supports CLI sessions
http.route({
  pathPrefix: "/api/v1/crm/contacts/",
  method: "GET",
  handler: getContact,
});

// PATCH /api/v1/crm/contacts/:contactId - Update contact
http.route({
  pathPrefix: "/api/v1/crm/contacts/",
  method: "PATCH",
  handler: updateContact,
});

// DELETE /api/v1/crm/contacts/:contactId - Delete contact
http.route({
  pathPrefix: "/api/v1/crm/contacts/",
  method: "DELETE",
  handler: deleteContact,
});

/**
 * Layer 5b: CRM Organization APIs
 */

// GET /api/v1/crm/organizations - List CRM organizations
http.route({
  path: "/api/v1/crm/organizations",
  method: "GET",
  handler: listCrmOrganizations,
});

// POST /api/v1/crm/organizations - Create CRM organization
http.route({
  path: "/api/v1/crm/organizations",
  method: "POST",
  handler: createCrmOrganization,
});

// GET /api/v1/crm/organizations/:organizationId - Get CRM organization details
http.route({
  pathPrefix: "/api/v1/crm/organizations/",
  method: "GET",
  handler: getCrmOrganization,
});

// PATCH /api/v1/crm/organizations/:organizationId - Update CRM organization
http.route({
  pathPrefix: "/api/v1/crm/organizations/",
  method: "PATCH",
  handler: updateCrmOrganization,
});

// POST /api/v1/crm/sync/outbox - Dispatch narrow OAR CRM sync outbox batch
http.route({
  path: "/api/v1/crm/sync/outbox",
  method: "POST",
  handler: dispatchCrmSyncOutbox,
});

/**
 * Layer 6: USER PROFILE APIs (Session-Based Authentication)
 *
 * These endpoints allow logged-in users to access their own data.
 * Authentication: Session-based (NOT API key)
 * Users can ONLY access their own data.
 */

// GET /api/v1/users/me - Get current user profile
http.route({
  path: "/api/v1/users/me",
  method: "GET",
  handler: getCurrentUser,
});

// GET /api/v1/users/me/profile-complete - Get complete user profile with activity
http.route({
  path: "/api/v1/users/me/profile-complete",
  method: "GET",
  handler: getCompleteProfile,
});

// GET /api/v1/users/me/transactions - Get user's transactions
http.route({
  path: "/api/v1/users/me/transactions",
  method: "GET",
  handler: getTransactions,
});

// GET /api/v1/users/me/tickets - Get user's event tickets
http.route({
  path: "/api/v1/users/me/tickets",
  method: "GET",
  handler: getTickets,
});

// GET /api/v1/users/me/events - Get user's registered events
http.route({
  path: "/api/v1/users/me/events",
  method: "GET",
  handler: getUserEvents,
});

// PATCH /api/v1/users/me - Update user profile
http.route({
  path: "/api/v1/users/me",
  method: "PATCH",
  handler: updateCurrentUser,
});

/**
 * Layer 7: PROJECTS API (Project Management)
 */

// POST /api/v1/projects - Create project
http.route({
  path: "/api/v1/projects",
  method: "POST",
  handler: createProject,
});

// GET /api/v1/projects - List projects
http.route({
  path: "/api/v1/projects",
  method: "GET",
  handler: listProjects,
});

// GET /api/v1/projects/:projectId - Get project details
http.route({
  path: "/api/v1/projects/:projectId",
  method: "GET",
  handler: getProject,
});

// PATCH /api/v1/projects/:projectId - Update project
http.route({
  path: "/api/v1/projects/:projectId",
  method: "PATCH",
  handler: updateProject,
});

// DELETE /api/v1/projects/:projectId - Delete project
http.route({
  path: "/api/v1/projects/:projectId",
  method: "DELETE",
  handler: deleteProject,
});

// GET /api/v1/projects/:projectId/milestones - List milestones
http.route({
  path: "/api/v1/projects/:projectId/milestones",
  method: "GET",
  handler: listMilestones,
});

// GET /api/v1/projects/:projectId/tasks - List tasks
http.route({
  path: "/api/v1/projects/:projectId/tasks",
  method: "GET",
  handler: listTasks,
});

// GET /api/v1/projects/:projectId/team - List team members
http.route({
  path: "/api/v1/projects/:projectId/team",
  method: "GET",
  handler: listTeamMembers,
});

// GET /api/v1/projects/:projectId/comments - List comments
http.route({
  path: "/api/v1/projects/:projectId/comments",
  method: "GET",
  handler: listComments,
});

// GET /api/v1/projects/:projectId/activity - Get activity log
http.route({
  path: "/api/v1/projects/:projectId/activity",
  method: "GET",
  handler: getActivityLog,
});

/**
 * Layer 7.5: INVOICES API
 */

// POST /api/v1/invoices - Create draft invoice
http.route({
  path: "/api/v1/invoices",
  method: "POST",
  handler: createInvoice,
});

// GET /api/v1/invoices - List invoices
http.route({
  path: "/api/v1/invoices",
  method: "GET",
  handler: listInvoices,
});

// GET /api/v1/invoices/:invoiceId - Get invoice details
http.route({
  path: "/api/v1/invoices/:invoiceId",
  method: "GET",
  handler: getInvoice,
});

// PATCH /api/v1/invoices/:invoiceId - Update draft invoice
http.route({
  path: "/api/v1/invoices/:invoiceId",
  method: "PATCH",
  handler: updateInvoice,
});

// DELETE /api/v1/invoices/:invoiceId - Delete draft invoice
http.route({
  path: "/api/v1/invoices/:invoiceId",
  method: "DELETE",
  handler: deleteInvoice,
});

// POST /api/v1/invoices/:invoiceId/seal - Seal draft invoice
http.route({
  path: "/api/v1/invoices/:invoiceId/seal",
  method: "POST",
  handler: sealInvoice,
});

// POST /api/v1/invoices/:invoiceId/send - Send invoice
http.route({
  path: "/api/v1/invoices/:invoiceId/send",
  method: "POST",
  handler: sendInvoice,
});

// GET /api/v1/invoices/:invoiceId/pdf - Get invoice PDF
http.route({
  path: "/api/v1/invoices/:invoiceId/pdf",
  method: "GET",
  handler: getInvoicePdf,
});

// POST /api/v1/invoices/:invoiceId/sync-stripe - Sync invoice to Stripe (optional)
http.route({
  path: "/api/v1/invoices/:invoiceId/sync-stripe",
  method: "POST",
  handler: syncInvoiceToStripe,
});

// GET /api/v1/invoices/client/:crmOrganizationId - Get client's invoices
http.route({
  pathPrefix: "/api/v1/invoices/client/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. Verify API key
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid Authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const apiKey = authHeader.substring(7);
      const authContext = await (ctx as any).runQuery(generatedApi.internal.api.auth.verifyApiKey, {
        apiKey,
      });

      if (!authContext) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const { organizationId } = authContext;

      // 2. Update API key usage tracking
      // TODO: Implement async usage tracking - await (ctx.scheduler as any).runAfter(0, generatedApi.internal.apiKeys.trackUsage, { apiKeyId, ipAddress });

      // 3. Extract CRM organization ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const crmOrganizationId = pathParts[pathParts.length - 1];

      if (!crmOrganizationId) {
        return new Response(
          JSON.stringify({ error: "CRM organization ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 4. Parse query parameters
      const status = url.searchParams.get("status") || undefined;
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "50"),
        200
      );
      const offset = parseInt(url.searchParams.get("offset") || "0");

      // 5. Query invoices for client
      const result = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.invoicesInternal.getInvoicesForClientInternal,
        {
          organizationId,
          crmOrganizationId: crmOrganizationId as Id<"objects">,
          status,
          limit,
          offset,
        }
      );

      // 6. Return response
      return new Response(
        JSON.stringify({ success: true, ...result }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /invoices/client/:id error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Layer 7.6: BENEFITS API (Benefits & Commissions Management)
 *
 * Endpoints for managing benefits, claims, commissions, and payouts.
 * Security: Dual auth (API keys + OAuth tokens with benefits:read/write scopes)
 */

// OPTIONS /api/v1/benefits - CORS preflight
http.route({
  path: "/api/v1/benefits",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// OPTIONS /api/v1/benefits/:benefitId - CORS preflight
http.route({
  pathPrefix: "/api/v1/benefits/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// OPTIONS /api/v1/commissions - CORS preflight
http.route({
  path: "/api/v1/commissions",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// OPTIONS /api/v1/commissions/:commissionId - CORS preflight
http.route({
  pathPrefix: "/api/v1/commissions/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// POST /api/v1/benefits - Create benefit
http.route({
  path: "/api/v1/benefits",
  method: "POST",
  handler: createBenefit,
});

// GET /api/v1/benefits - List benefits
http.route({
  path: "/api/v1/benefits",
  method: "GET",
  handler: listBenefits,
});

// GET /api/v1/benefits/:benefitId - Get benefit details
http.route({
  path: "/api/v1/benefits/:benefitId",
  method: "GET",
  handler: getBenefit,
});

// PATCH /api/v1/benefits/:benefitId - Update benefit
http.route({
  path: "/api/v1/benefits/:benefitId",
  method: "PATCH",
  handler: updateBenefit,
});

// DELETE /api/v1/benefits/:benefitId - Delete benefit (draft only)
http.route({
  path: "/api/v1/benefits/:benefitId",
  method: "DELETE",
  handler: deleteBenefit,
});

// POST /api/v1/benefits/:benefitId/claims - Create claim
http.route({
  path: "/api/v1/benefits/:benefitId/claims",
  method: "POST",
  handler: createClaim,
});

// GET /api/v1/benefits/:benefitId/claims - List claims for benefit
http.route({
  path: "/api/v1/benefits/:benefitId/claims",
  method: "GET",
  handler: listClaims,
});

// POST /api/v1/commissions - Create commission
http.route({
  path: "/api/v1/commissions",
  method: "POST",
  handler: createCommission,
});

// GET /api/v1/commissions - List commissions
http.route({
  path: "/api/v1/commissions",
  method: "GET",
  handler: listCommissions,
});

// GET /api/v1/commissions/:commissionId - Get commission details
http.route({
  path: "/api/v1/commissions/:commissionId",
  method: "GET",
  handler: getCommission,
});

// POST /api/v1/commissions/:commissionId/payouts - Create payout
http.route({
  path: "/api/v1/commissions/:commissionId/payouts",
  method: "POST",
  handler: createPayout,
});

// GET /api/v1/commissions/:commissionId/payouts - List payouts
http.route({
  path: "/api/v1/commissions/:commissionId/payouts",
  method: "GET",
  handler: listPayouts,
});

/**
 * Layer 7.7: CERTIFICATES API (CE/CME/CPD Credits)
 *
 * Endpoints for managing certificates and continuing education credits.
 * Security: Dual auth (API keys + OAuth tokens with certificates:read/write scopes)
 */

// OPTIONS /api/v1/certificates - CORS preflight
http.route({
  path: "/api/v1/certificates",
  method: "OPTIONS",
  handler: certificatesHandleOptions,
});

// OPTIONS /api/v1/certificates/* - CORS preflight for all certificate paths
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "OPTIONS",
  handler: certificatesHandleOptions,
});

// GET /api/v1/certificates/verify/:certificateNumber - Verify certificate (PUBLIC - no auth)
// Must be before the pathPrefix route for /:certificateId
http.route({
  pathPrefix: "/api/v1/certificates/verify/",
  method: "GET",
  handler: verifyCertificate,
});

// GET /api/v1/certificates/recipient/:email - Get certificates by recipient
http.route({
  pathPrefix: "/api/v1/certificates/recipient/",
  method: "GET",
  handler: getCertificatesByRecipient,
});

// POST /api/v1/certificates/batch - Batch issue certificates
http.route({
  path: "/api/v1/certificates/batch",
  method: "POST",
  handler: batchIssueCertificates,
});

// POST /api/v1/certificates - Create certificate
http.route({
  path: "/api/v1/certificates",
  method: "POST",
  handler: createCertificate,
});

// GET /api/v1/certificates - List certificates
http.route({
  path: "/api/v1/certificates",
  method: "GET",
  handler: listCertificates,
});

// POST /api/v1/certificates/:certificateId/revoke or /reinstate
// Combined handler routes based on URL path suffix
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "POST",
  handler: handleCertificatePost,
});

// GET /api/v1/certificates/:certificateId - Get certificate details
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "GET",
  handler: getCertificate,
});

// PATCH /api/v1/certificates/:certificateId - Update certificate
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "PATCH",
  handler: updateCertificate,
});

// DELETE /api/v1/certificates/:certificateId - Delete certificate
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "DELETE",
  handler: deleteCertificate,
});

/**
 * Layer 8: BOOKINGS API (Event Registration)
 */

/**
 * Layer 7.8: PUBLISHING API (Published Pages Management)
 *
 * Endpoints for managing published pages via CLI/MCP.
 * Security: Dual auth (API keys + OAuth tokens with publishing:read/write scopes)
 */

// OPTIONS /api/v1/publishing/pages - CORS preflight
http.route({
  path: "/api/v1/publishing/pages",
  method: "OPTIONS",
  handler: publishingHandleOptions,
});

// OPTIONS /api/v1/publishing/pages/* - CORS preflight for all publishing paths
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "OPTIONS",
  handler: publishingHandleOptions,
});

// GET /api/v1/publishing/pages/:pageId or /analytics
// Combined handler routes based on URL path
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "GET",
  handler: handlePublishingGet,
});

// POST /api/v1/publishing/pages - Create published page
http.route({
  path: "/api/v1/publishing/pages",
  method: "POST",
  handler: createPublishedPage,
});

// GET /api/v1/publishing/pages - List published pages
http.route({
  path: "/api/v1/publishing/pages",
  method: "GET",
  handler: listPublishedPages,
});

// POST /api/v1/publishing/pages/:pageId/publish or /unpublish
// Combined handler routes based on URL path suffix
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "POST",
  handler: handlePublishingPost,
});

// PATCH /api/v1/publishing/pages/:pageId - Update page
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "PATCH",
  handler: updatePublishedPage,
});

// DELETE /api/v1/publishing/pages/:pageId - Delete page
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "DELETE",
  handler: deletePublishedPage,
});

/**
 * Layer 7.9: OAUTH CONNECTIONS API (OAuth Account Management)
 *
 * Endpoints for managing OAuth connections via CLI/MCP.
 * Security: Triple auth (API keys, OAuth tokens, CLI sessions) with oauth:read/write scopes
 * NOTE: Token values are NEVER exposed via these endpoints for security.
 */

// OPTIONS /api/v1/oauth/connections - CORS preflight
http.route({
  path: "/api/v1/oauth/connections",
  method: "OPTIONS",
  handler: oauthConnectionsHandleOptions,
});

// OPTIONS /api/v1/oauth/connections/* - CORS preflight for all oauth paths
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "OPTIONS",
  handler: oauthConnectionsHandleOptions,
});

// GET /api/v1/oauth/connections - List OAuth connections
http.route({
  path: "/api/v1/oauth/connections",
  method: "GET",
  handler: listOAuthConnections,
});

// GET /api/v1/oauth/connections/:connectionId - Get connection details
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "GET",
  handler: handleOAuthConnectionsGet,
});

// POST /api/v1/oauth/connections/:connectionId/disconnect - Disconnect connection
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "POST",
  handler: handleOAuthConnectionsPost,
});

// PATCH /api/v1/oauth/connections/:connectionId - Update sync settings
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "PATCH",
  handler: handleOAuthConnectionsPatch,
});

// DELETE /api/v1/oauth/connections/:connectionId - Delete connection permanently
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "DELETE",
  handler: handleOAuthConnectionsDelete,
});

// OPTIONS /api/v1/bookings/create - CORS preflight
http.route({
  path: "/api/v1/bookings/create",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

// POST /api/v1/bookings/create - Create event booking with tickets (with CORS)
http.route({
  path: "/api/v1/bookings/create",
  method: "POST",
  handler: createBooking,
});

/**
 * Layer 8: EXTERNAL FRONTEND CONTENT API
 *
 * Public API for external Next.js frontends to fetch CMS-configured content
 */

// OPTIONS /api/v1/published-content - CORS preflight
http.route({
  path: "/api/v1/published-content",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/published-content?org=vc83&page=/events
http.route({
  path: "/api/v1/published-content",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const orgSlug = url.searchParams.get("org");
    const pageSlug = url.searchParams.get("page");

    console.log("🌐 [GET /api/v1/published-content] Query params:", { orgSlug, pageSlug });

    // Validate parameters
    if (!orgSlug || !pageSlug) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: org and page"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request.headers.get("origin")),
          },
        }
      );
    }

    // Fetch content using the publishing ontology query
    const content = await (ctx as any).runQuery(generatedApi.api.publishingOntology.getPublishedContentForFrontend, {
      orgSlug,
      pageSlug,
    });

    if (!content) {
      return new Response(
        JSON.stringify({
          error: "Published page not found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request.headers.get("origin")),
          },
        }
      );
    }

    console.log("✅ [GET /api/v1/published-content] Content found:", {
      page: content.page.name,
      events: content.events.length,
      checkout: content.checkout ? "loaded" : "none",
      forms: content.forms.length,
    });

    // Return content
    return new Response(
      JSON.stringify(content),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(request.headers.get("origin")),
        },
      }
    );
  }),
});

/**
 * ==========================================
 * ZAPIER WEBHOOK ENDPOINTS
 * ==========================================
 *
 * REST Hook subscription management for Zapier integrations.
 * Allows Zapier to subscribe/unsubscribe to platform events.
 */

// POST /api/v1/webhooks/subscribe - Subscribe to webhook
http.route({
  path: "/api/v1/webhooks/subscribe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.json();
      const { event, target_url } = body;

      // Validate required fields
      if (!event || !target_url) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: event, target_url" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Call Convex mutation to create subscription
      const result = await (ctx as any).runMutation(generatedApi.api.zapier.webhooks.subscribeWebhook, {
        event,
        target_url,
      });

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      console.error("[Webhooks API] Subscribe error:", error);
      const errorCode = getErrorCode(error);
      return new Response(
        JSON.stringify({ error: getErrorMessage(error) || "Failed to subscribe webhook" }),
        {
          status: errorCode === "UNAUTHORIZED" ? 401 : 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// DELETE /api/v1/webhooks/:id - Unsubscribe from webhook
http.route({
  pathPrefix: "/api/v1/webhooks/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const subscriptionId = pathParts[pathParts.length - 1];

      if (!subscriptionId || subscriptionId === "webhooks") {
        return new Response(
          JSON.stringify({ error: "Subscription ID required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Call Convex mutation to delete subscription
      await (ctx as any).runMutation(generatedApi.api.zapier.webhooks.unsubscribeWebhook, {
        subscriptionId: subscriptionId as Id<"webhookSubscriptions">,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      console.error("[Webhooks API] Unsubscribe error:", error);
      const errorCode = getErrorCode(error);
      return new Response(
        JSON.stringify({ error: getErrorMessage(error) || "Failed to unsubscribe webhook" }),
        {
          status: errorCode === "UNAUTHORIZED" ? 401 : 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// GET /api/v1/community/subscriptions - List community subscriptions (for Zapier testing)
http.route({
  path: "/api/v1/community/subscriptions",
  method: "GET",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: httpAction(async (_ctx, _request) => {
    try {
      // This endpoint is for Zapier's "Load Sample Data" feature
      // Returns example community subscriptions for testing triggers

      // In production, this should query real data
      // For now, return sample data structure
      const sampleData = [
        {
          id: "sample-1",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          stripeSubscriptionId: "sub_sample123",
          customCourseAccess: ["foundations"],
          createdAt: Date.now(),
        },
      ];

      return new Response(JSON.stringify(sampleData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      console.error("[Community API] List subscriptions error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to list subscriptions" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * ==========================================
 * OAUTH 2.0 ENDPOINTS
 * ==========================================
 *
 * OAuth 2.0 Authorization Code flow with PKCE support.
 * Allows third-party apps (Zapier, Make, etc.) to access VC83 APIs.
 */

// Import OAuth handlers
import { authorize, authorizePost, token, revoke } from "./oauth/endpoints";

// GET /oauth/authorize - Show consent screen
http.route({
  path: "/oauth/authorize",
  method: "GET",
  handler: authorize,
});

// POST /oauth/authorize - Handle user approval/denial
http.route({
  path: "/oauth/authorize",
  method: "POST",
  handler: authorizePost,
});

// POST /oauth/token - Exchange authorization code for access token
http.route({
  path: "/oauth/token",
  method: "POST",
  handler: token,
});

// POST /oauth/revoke - Revoke access or refresh token
http.route({
  path: "/oauth/revoke",
  method: "POST",
  handler: revoke,
});

/**
 * BETA CODE VALIDATION ENDPOINT
 *
 * Public endpoint used by chat/native/web clients to validate beta codes
 * before attempting signup activation.
 */
http.route({
  path: "/api/beta/validate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const code = asNonEmptyString(body?.code);

      if (!code) {
        return new Response(
          JSON.stringify({
            error: "Missing required field: code",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(request.headers.get("origin")),
            },
          }
        );
      }

      const result = await (ctx as any).runQuery(generatedApi.api.betaCodes.validateBetaCodePublic, {
        code,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(request.headers.get("origin")),
        },
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error) || "Failed to validate beta code";
      return new Response(
        JSON.stringify({
          error: errorMessage,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request.headers.get("origin")),
          },
        }
      );
    }
  }),
});

// OPTIONS /api/beta/validate - CORS preflight
http.route({
  path: "/api/beta/validate",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

/**
 * ONE-CLICK BETA APPROVAL (Super Admin Email Link)
 *
 * Accepts a signed token from the admin notification email and auto-approves
 * the pending beta user.
 */
http.route({
  path: "/api/beta/auto-approve",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.l4yercak3.com";
    const dashboardUrl = `${appBaseUrl.replace(/\/+$/, "")}/?openWindow=organizations&panel=beta-access`;
    const token = asNonEmptyString(new URL(request.url).searchParams.get("token"));

    if (!token) {
      return new Response(
        `<html><body><h1>Invalid approval link</h1><p>Missing token.</p><p><a href="${dashboardUrl}">Open Beta Access Dashboard</a></p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const decoded = await decodeAndVerifyBetaAutoApproveToken(token);
    if (!decoded) {
      return new Response(
        `<html><body><h1>Approval link expired or invalid</h1><p>Please review the request in the dashboard.</p><p><a href="${dashboardUrl}">Open Beta Access Dashboard</a></p></body></html>`,
        { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const result = await (ctx as any).runMutation(
      generatedApi.internal.betaAccess.approveBetaAccessFromEmailLink,
      {
        userId: decoded.payload.userId as Id<"users">,
      }
    );

    if (!result?.success) {
      return new Response(
        `<html><body><h1>Approval failed</h1><p>User could not be approved from this link.</p><p><a href="${dashboardUrl}">Open Beta Access Dashboard</a></p></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const statusText = result.alreadyApproved
      ? "This beta user was already approved."
      : "Beta user approved successfully.";
    return new Response(
      `<html><body><h1>Success</h1><p>${statusText}</p><p><a href="${dashboardUrl}">Open Beta Access Dashboard</a></p></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }),
});

/**
 * SELF-SERVICE SIGNUP ENDPOINT
 *
 * Allows users to create free accounts with auto-organization creation.
 * Part of Starter Conversion Path: Template → Create account → Use platform → Upgrade
 */
http.route({
  path: "/api/signup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.json();
      const { email, password, firstName, lastName, organizationName, refcode } = body;
      const description = asNonEmptyString(body?.description);
      const industry = asNonEmptyString(body?.industry);
      const contactEmail = asNonEmptyString(body?.contactEmail) || asNonEmptyString(body?.contact_email);
      const contactPhone = asNonEmptyString(body?.contactPhone) || asNonEmptyString(body?.contact_phone);
      const timezone = asNonEmptyString(body?.timezone);
      const dateFormat = asNonEmptyString(body?.dateFormat) || asNonEmptyString(body?.date_format);
      const language = asNonEmptyString(body?.language);
      const referralCode = asNonEmptyString(refcode);
      const betaCode = asNonEmptyString(body?.betaCode)
        || asNonEmptyString(body?.beta_code)
        || asNonEmptyString(body?.inviteCode);
      const identityClaimToken = asNonEmptyString(body?.identityClaimToken)
        || asNonEmptyString(body?.identity_claim_token)
        || asNonEmptyString(body?.claimToken);

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: email, password, firstName, lastName",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(request.headers.get("origin")),
            },
          }
        );
      }

      // Call signup action
      const result = await (ctx as any).runAction(generatedApi.api.onboarding.signupFreeAccount, {
        email,
        password,
        firstName,
        lastName,
        organizationName,
        description,
        industry,
        contactEmail,
        contactPhone,
        timezone,
        dateFormat,
        language,
        betaCode,
        identityClaimToken,
      });

      if (referralCode) {
        try {
          await (ctx as any).runMutation(
            generatedApi.internal.credits.index.trackReferralSignupConversionInternal,
            {
              referralCode,
              referredUserId: result.user.id,
              referredOrganizationId: result.organization.id,
              source: "email_signup",
            }
          );
        } catch (referralError) {
          console.error("Signup referral attribution failed (non-blocking):", referralError);
        }
      }

      // Return success with session and API key
      return new Response(
        JSON.stringify(result),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request.headers.get("origin")),
          },
        }
      );
    } catch (error: unknown) {
      console.error("Signup error:", error);

      // Handle specific error codes
      const errorCode = getErrorCode(error);
      const errorMessage = errorCode === "EMAIL_EXISTS"
        ? "An account with this email already exists"
        : errorCode === "WEAK_PASSWORD"
        ? "Password must be at least 8 characters long"
        : errorCode === "INVALID_EMAIL"
        ? "Invalid email format"
        : errorCode === "DISPOSABLE_EMAIL"
        ? "Please use a permanent email address"
        : errorCode === "INVALID_BETA_CODE"
        ? "Beta code is invalid."
        : errorCode === "BETA_CODE_EXPIRED"
        ? "Beta code has expired."
        : errorCode === "BETA_CODE_EXHAUSTED"
        ? "Beta code has already been redeemed."
        : errorCode === "BETA_CODE_DEACTIVATED"
        ? "Beta code has been deactivated."
        : getErrorMessage(error) || "Signup failed";

      return new Response(
        JSON.stringify({
          error: errorMessage,
          code: errorCode,
        }),
        {
          status: errorCode === "EMAIL_EXISTS" ? 409 : 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request.headers.get("origin")),
          },
        }
      );
    }
  }),
});

// OPTIONS /api/signup - CORS preflight
http.route({
  path: "/api/signup",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

/**
 * ==========================================
 * MUX WEBHOOK ENDPOINT
 * ==========================================
 *
 * Receives webhooks from Mux for video processing events.
 * Events handled:
 * - video.asset.created: Asset is being processed
 * - video.asset.ready: Video is ready for playback
 * - video.asset.errored: Processing failed
 * - video.live_stream.active: Live stream started
 * - video.live_stream.idle: Live stream stopped
 */
http.route({
  path: "/mux-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("[Mux Webhook] 📥 Received webhook request");

    try {
      const body = await request.text();
      const signature = request.headers.get("mux-signature");

      if (!signature) {
        console.error("[Mux Webhook] ❌ No signature provided");
        return new Response("Missing signature", { status: 400 });
      }

      // Verify webhook signature
      const webhookSecret = process.env.MUX_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("[Mux Webhook] ❌ MUX_WEBHOOK_SECRET not configured");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      // Verify signature using internal action (to avoid crypto bundler issues)
      const isValid = await (ctx as any).runAction(generatedApi.internal.muxWebhookVerify.verifyMuxWebhookSignature, {
        body,
        signature,
        secret: webhookSecret,
      });

      if (!isValid) {
        console.error("[Mux Webhook] ❌ Signature verification failed");
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event
      const event = JSON.parse(body);
      console.log(`[Mux Webhook] ✅ Verified event: ${event.type} (${event.id})`);

      // Process webhook
      await (ctx as any).runAction(generatedApi.internal.actions.mux.processMuxWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: event.data,
      });

      console.log(`[Mux Webhook] ✅ Event queued for processing`);

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Mux Webhook] ❌ Processing error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Import CLI auth HTTP handlers
import {
  validateSession as cliValidateSession,
  refreshSession as cliRefreshSession,
  revokeSession as cliRevokeSession,
  listOrganizations as cliListOrganizations,
  createOrganization as cliCreateOrganization,
  listApiKeys as cliListApiKeys,
  generateApiKey as cliGenerateApiKey,
  handleOptions as cliAuthHandleOptions,
} from "./api/v1/cliAuthHttp";

// Import Mobile OAuth handlers
import {
  mobileOAuthHandler,
  mobileOAuthOptionsHandler,
} from "./api/v1/mobileOAuth";

// Import Email/Password Auth handlers (platform users)
import {
  signUpHandler,
  signInHandler,
  signOutHandler,
  getCurrentAuthUserHandler,
  emailAuthOptionsHandler,
} from "./api/v1/emailAuth";

// Import Customer Auth handlers (frontend_users - requires API key)
import {
  customerSignUpHandler,
  customerSignInHandler,
  customerSignOutHandler,
  customerOAuthHandler,
  customerAuthOptionsHandler,
} from "./api/v1/customerAuth";

// Import Account Linking handlers
import {
  confirmLinking,
  rejectLinking,
  getLinkingStatus,
  claimIdentity,
  handleOptions as accountLinkingHandleOptions,
} from "./api/v1/accountLinking";

// Import Domain Lookup handlers
import {
  domainLookupHandler,
  domainLookupOptionsHandler,
} from "./api/v1/domainLookup";

// Import reusable Frontend OIDC handlers
import {
  frontendOidcStartHandler,
  frontendOidcCallbackHandler,
  frontendOidcOptionsHandler,
} from "./api/v1/frontendOidc";

/**
 * ==========================================
 * MOBILE OAUTH API
 * ==========================================
 *
 * Native mobile OAuth authentication for iOS/Android apps.
 * Accepts user info from native OAuth SDKs (Google Sign-In, Apple Sign-In)
 * and creates/logs into platform users.
 */

// OPTIONS /api/v1/auth/mobile-oauth - CORS preflight
http.route({
  path: "/api/v1/auth/mobile-oauth",
  method: "OPTIONS",
  handler: mobileOAuthOptionsHandler,
});

// POST /api/v1/auth/mobile-oauth - Native mobile OAuth authentication
http.route({
  path: "/api/v1/auth/mobile-oauth",
  method: "POST",
  handler: mobileOAuthHandler,
});

/**
 * ==========================================
 * EMAIL/PASSWORD AUTH API
 * ==========================================
 *
 * Traditional email/password authentication for mobile apps.
 * Complements the OAuth flows (Google Sign-In, Apple Sign-In).
 */

// OPTIONS /api/v1/auth/sign-up - CORS preflight
http.route({
  path: "/api/v1/auth/sign-up",
  method: "OPTIONS",
  handler: emailAuthOptionsHandler,
});

// POST /api/v1/auth/sign-up - Create new account with email/password
http.route({
  path: "/api/v1/auth/sign-up",
  method: "POST",
  handler: signUpHandler,
});

// OPTIONS /api/v1/auth/sign-in - CORS preflight
http.route({
  path: "/api/v1/auth/sign-in",
  method: "OPTIONS",
  handler: emailAuthOptionsHandler,
});

// POST /api/v1/auth/sign-in - Login with email/password
http.route({
  path: "/api/v1/auth/sign-in",
  method: "POST",
  handler: signInHandler,
});

// OPTIONS /api/v1/auth/sign-out - CORS preflight
http.route({
  path: "/api/v1/auth/sign-out",
  method: "OPTIONS",
  handler: emailAuthOptionsHandler,
});

// POST /api/v1/auth/sign-out - Logout (invalidate session)
http.route({
  path: "/api/v1/auth/sign-out",
  method: "POST",
  handler: signOutHandler,
});

// OPTIONS /api/v1/auth/me - CORS preflight
http.route({
  path: "/api/v1/auth/me",
  method: "OPTIONS",
  handler: emailAuthOptionsHandler,
});

// GET /api/v1/auth/me - Get current authenticated mobile user profile
http.route({
  path: "/api/v1/auth/me",
  method: "GET",
  handler: getCurrentAuthUserHandler,
});

/**
 * ==========================================
 * CUSTOMER AUTH API (API Key Required)
 * ==========================================
 *
 * Customer authentication endpoints that create frontend_users (not platform users).
 * Organization is determined by the API key used for authentication.
 * Creates frontend_user + CRM contact for each new customer.
 */

/**
 * Hub-GW OAuth note:
 * `/api/v1/auth/sync-user` and `/api/v1/auth/validate-token` are intentionally
 * not registered here. Hub-GW stage 1 uses a server-side admin Convex call into
 * `internal.auth.syncFrontendUser` from `apps/hub-gw/lib/server-convex.ts`.
 * HGO-014 will decide whether the legacy HTTP auth file is wired or deprecated.
 */

// OPTIONS /api/v1/auth/customer/* - CORS preflight for all customer auth
http.route({
  pathPrefix: "/api/v1/auth/customer/",
  method: "OPTIONS",
  handler: customerAuthOptionsHandler,
});

// POST /api/v1/auth/customer/sign-up - Customer email registration
http.route({
  path: "/api/v1/auth/customer/sign-up",
  method: "POST",
  handler: customerSignUpHandler,
});

// POST /api/v1/auth/customer/sign-in - Customer email login
http.route({
  path: "/api/v1/auth/customer/sign-in",
  method: "POST",
  handler: customerSignInHandler,
});

// POST /api/v1/auth/customer/sign-out - Customer logout
http.route({
  path: "/api/v1/auth/customer/sign-out",
  method: "POST",
  handler: customerSignOutHandler,
});

// POST /api/v1/auth/customer/oauth - Customer OAuth (Google/Apple)
http.route({
  path: "/api/v1/auth/customer/oauth",
  method: "POST",
  handler: customerOAuthHandler,
});

/**
 * ==========================================
 * REUSABLE FRONTEND OIDC API
 * ==========================================
 *
 * Reusable per-org OIDC authorization start/callback flow.
 * This is intentionally abstraction-owned in Convex so apps like Hub-GW
 * can consume it as a compatibility bridge.
 */

// OPTIONS /api/v1/frontend-oidc/* - CORS preflight
http.route({
  pathPrefix: "/api/v1/frontend-oidc/",
  method: "OPTIONS",
  handler: frontendOidcOptionsHandler,
});

// GET /api/v1/frontend-oidc/start - Start OIDC flow (query/redirect mode)
http.route({
  path: "/api/v1/frontend-oidc/start",
  method: "GET",
  handler: frontendOidcStartHandler,
});

// POST /api/v1/frontend-oidc/start - Start OIDC flow (JSON mode)
http.route({
  path: "/api/v1/frontend-oidc/start",
  method: "POST",
  handler: frontendOidcStartHandler,
});

// GET /api/v1/frontend-oidc/callback - Provider callback
http.route({
  path: "/api/v1/frontend-oidc/callback",
  method: "GET",
  handler: frontendOidcCallbackHandler,
});

// POST /api/v1/frontend-oidc/callback - Provider callback (form_post mode)
http.route({
  path: "/api/v1/frontend-oidc/callback",
  method: "POST",
  handler: frontendOidcCallbackHandler,
});

/**
 * ==========================================
 * WEBINAR API v1 ENDPOINTS
 * ==========================================
 */

// Import webinar API handlers (these are httpAction wrapped - use directly as handlers)
import {
  updateWebinar,
  deleteWebinar,
  webinarGetRouter,
  webinarPostRouter,
} from "./api/v1/webinars";

// OPTIONS /api/v1/webinars/* - CORS preflight
http.route({
  pathPrefix: "/api/v1/webinars/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/webinars/* - Master router for all GET requests
http.route({
  pathPrefix: "/api/v1/webinars/",
  method: "GET",
  handler: webinarGetRouter,
});

// POST /api/v1/webinars/* - Master router for all POST requests
http.route({
  pathPrefix: "/api/v1/webinars/",
  method: "POST",
  handler: webinarPostRouter,
});

// PATCH /api/v1/webinars/:id - Update webinar (authenticated)
http.route({
  pathPrefix: "/api/v1/webinars/",
  method: "PATCH",
  handler: updateWebinar,
});

// DELETE /api/v1/webinars/:id - Delete webinar (authenticated)
http.route({
  pathPrefix: "/api/v1/webinars/",
  method: "DELETE",
  handler: deleteWebinar,
});

/**
 * ==========================================
 * ACCOUNT LINKING API
 * ==========================================
 *
 * Handles account linking when a user signs in with a new OAuth provider
 * but their email matches an existing account.
 */

// OPTIONS /api/v1/auth/link-account/confirm - CORS preflight
http.route({
  path: "/api/v1/auth/link-account/confirm",
  method: "OPTIONS",
  handler: accountLinkingHandleOptions,
});

// POST /api/v1/auth/link-account/confirm - Confirm account linking
http.route({
  path: "/api/v1/auth/link-account/confirm",
  method: "POST",
  handler: confirmLinking,
});

// OPTIONS /api/v1/auth/link-account/reject - CORS preflight
http.route({
  path: "/api/v1/auth/link-account/reject",
  method: "OPTIONS",
  handler: accountLinkingHandleOptions,
});

// POST /api/v1/auth/link-account/reject - Reject account linking
http.route({
  path: "/api/v1/auth/link-account/reject",
  method: "POST",
  handler: rejectLinking,
});

// OPTIONS /api/v1/auth/link-account/status - CORS preflight
http.route({
  path: "/api/v1/auth/link-account/status",
  method: "OPTIONS",
  handler: accountLinkingHandleOptions,
});

// GET /api/v1/auth/link-account/status - Get linking status
http.route({
  path: "/api/v1/auth/link-account/status",
  method: "GET",
  handler: getLinkingStatus,
});

// OPTIONS /api/v1/auth/link-account/claim - CORS preflight
http.route({
  path: "/api/v1/auth/link-account/claim",
  method: "OPTIONS",
  handler: accountLinkingHandleOptions,
});

// POST /api/v1/auth/link-account/claim - Claim anonymous/Telegram identity token
http.route({
  path: "/api/v1/auth/link-account/claim",
  method: "POST",
  handler: claimIdentity,
});

/**
 * ==========================================
 * DOMAIN LOOKUP API
 * ==========================================
 *
 * Public endpoint for Next.js middleware to look up custom domain routing.
 * Returns project slug for a given hostname.
 */

// OPTIONS /api/v1/domain-lookup - CORS preflight
http.route({
  path: "/api/v1/domain-lookup",
  method: "OPTIONS",
  handler: domainLookupOptionsHandler,
});

// POST /api/v1/domain-lookup - Look up domain routing
http.route({
  path: "/api/v1/domain-lookup",
  method: "POST",
  handler: domainLookupHandler,
});

// OPTIONS /api/v1/auth/cli/validate - CORS preflight
http.route({
  path: "/api/v1/auth/cli/validate",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// GET /api/v1/auth/cli/validate - Validate CLI session
http.route({
  path: "/api/v1/auth/cli/validate",
  method: "GET",
  handler: cliValidateSession,
});

// OPTIONS /api/v1/auth/cli/refresh - CORS preflight
http.route({
  path: "/api/v1/auth/cli/refresh",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// POST /api/v1/auth/cli/refresh - Refresh CLI session
http.route({
  path: "/api/v1/auth/cli/refresh",
  method: "POST",
  handler: cliRefreshSession,
});

// OPTIONS /api/v1/auth/cli/revoke - CORS preflight
http.route({
  path: "/api/v1/auth/cli/revoke",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// POST /api/v1/auth/cli/revoke - Revoke CLI session (logout)
http.route({
  path: "/api/v1/auth/cli/revoke",
  method: "POST",
  handler: cliRevokeSession,
});

// OPTIONS /api/v1/auth/cli/organizations - CORS preflight
http.route({
  path: "/api/v1/auth/cli/organizations",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// GET /api/v1/auth/cli/organizations - List user's organizations
http.route({
  path: "/api/v1/auth/cli/organizations",
  method: "GET",
  handler: cliListOrganizations,
});

// POST /api/v1/auth/cli/organizations - Create organization
http.route({
  path: "/api/v1/auth/cli/organizations",
  method: "POST",
  handler: cliCreateOrganization,
});

// OPTIONS /api/v1/auth/cli/api-keys - CORS preflight
http.route({
  path: "/api/v1/auth/cli/api-keys",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// GET /api/v1/auth/cli/api-keys - List API keys
http.route({
  path: "/api/v1/auth/cli/api-keys",
  method: "GET",
  handler: cliListApiKeys,
});

// POST /api/v1/auth/cli/api-keys - Generate API key
http.route({
  path: "/api/v1/auth/cli/api-keys",
  method: "POST",
  handler: cliGenerateApiKey,
});

/**
 * ==========================================
 * CLI APPLICATIONS API
 * ==========================================
 *
 * Endpoints for CLI-connected application management.
 * Uses CLI session token authentication (Bearer token).
 */

// Import CLI applications handlers
import {
  registerApplication as cliRegisterApplication,
  listApplications as cliListApplications,
  getApplicationByPath as cliGetApplicationByPath,
  getApplication as cliGetApplication,
  updateApplication as cliUpdateApplication,
  syncApplication as cliSyncApplication,
  handleOptions as cliHandleOptions,
} from "./api/v1/cliApplications";

// OPTIONS /api/v1/cli/applications - CORS preflight
http.route({
  path: "/api/v1/cli/applications",
  method: "OPTIONS",
  handler: cliHandleOptions,
});

// POST /api/v1/cli/applications - Register new application
http.route({
  path: "/api/v1/cli/applications",
  method: "POST",
  handler: cliRegisterApplication,
});

// GET /api/v1/cli/applications - List all applications
http.route({
  path: "/api/v1/cli/applications",
  method: "GET",
  handler: cliListApplications,
});

// OPTIONS /api/v1/cli/applications/by-path - CORS preflight
http.route({
  path: "/api/v1/cli/applications/by-path",
  method: "OPTIONS",
  handler: cliHandleOptions,
});

// GET /api/v1/cli/applications/by-path?hash={hash} - Find by project path
http.route({
  path: "/api/v1/cli/applications/by-path",
  method: "GET",
  handler: cliGetApplicationByPath,
});

// GET /api/v1/cli/applications/:id - Get application details (uses pathPrefix for dynamic ID)
http.route({
  pathPrefix: "/api/v1/cli/applications/",
  method: "OPTIONS",
  handler: cliHandleOptions,
});

http.route({
  pathPrefix: "/api/v1/cli/applications/",
  method: "GET",
  handler: cliGetApplication,
});

// PATCH /api/v1/cli/applications/:id - Update application
http.route({
  pathPrefix: "/api/v1/cli/applications/",
  method: "PATCH",
  handler: cliUpdateApplication,
});

// POST /api/v1/cli/applications/:id/sync - Sync application data
http.route({
  pathPrefix: "/api/v1/cli/applications/",
  method: "POST",
  handler: cliSyncApplication,
});

// ============================================================================
// LOCATIONS API
// ============================================================================

// GET /api/v1/locations - List all locations
http.route({
  path: "/api/v1/locations",
  method: "GET",
  handler: listLocations,
});

// POST /api/v1/locations - Create location
http.route({
  path: "/api/v1/locations",
  method: "POST",
  handler: createLocation,
});

// GET /api/v1/locations/:id - Get location details
http.route({
  pathPrefix: "/api/v1/locations/",
  method: "GET",
  handler: getLocation,
});

// PATCH /api/v1/locations/:id - Update location
http.route({
  pathPrefix: "/api/v1/locations/",
  method: "PATCH",
  handler: updateLocation,
});

// DELETE /api/v1/locations/:id - Archive location
http.route({
  pathPrefix: "/api/v1/locations/",
  method: "DELETE",
  handler: deleteLocation,
});

// ============================================================================
// AVAILABILITY API
// ============================================================================

// GET /api/v1/resources/:id/availability - Get resource availability
http.route({
  pathPrefix: "/api/v1/resources/",
  method: "GET",
  handler: getResourceAvailability,
});

// POST /api/v1/resources/:id/availability/schedule - Set weekly schedule
http.route({
  pathPrefix: "/api/v1/resources/",
  method: "POST",
  handler: setWeeklySchedule,
});

// DELETE /api/v1/resources/:id/availability/:availId - Delete availability item
http.route({
  pathPrefix: "/api/v1/resources/",
  method: "DELETE",
  handler: deleteAvailability,
});

// ============================================================================
// RESOURCE BOOKINGS API
// ============================================================================

// GET /api/v1/resource-bookings - List all resource bookings
http.route({
  path: "/api/v1/resource-bookings",
  method: "GET",
  handler: listResourceBookings,
});

// POST /api/v1/resource-bookings - Create resource booking
http.route({
  path: "/api/v1/resource-bookings",
  method: "POST",
  handler: createResourceBooking,
});

// GET /api/v1/resource-bookings/:id - Get booking details
http.route({
  pathPrefix: "/api/v1/resource-bookings/",
  method: "GET",
  handler: getResourceBooking,
});

// OPTIONS /api/v1/resource-bookings/checkout - CORS preflight
http.route({
  path: "/api/v1/resource-bookings/checkout",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// POST /api/v1/resource-bookings/checkout - Customer checkout booking
http.route({
  path: "/api/v1/resource-bookings/checkout",
  method: "POST",
  handler: customerCheckout,
});

// POST /api/v1/resource-bookings/:id/confirm - Confirm booking
http.route({
  pathPrefix: "/api/v1/resource-bookings/",
  method: "POST",
  handler: confirmResourceBooking,
});

// ============================================================================
// AI CHAT API (Mobile App Integration)
// ============================================================================
//
// REST API for AI chat functionality, used by mobile apps (iOS/Android).
// Authentication: Bearer token (session ID from mobile OAuth)
//
// These endpoints wrap the existing Convex AI chat functions to provide
// HTTP access for mobile clients. Both web and mobile apps share the same
// underlying data and AI system.
// ============================================================================

// OPTIONS /api/v1/ai/conversations - CORS preflight
http.route({
  path: "/api/v1/ai/conversations",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// POST /api/v1/ai/conversations - Create new conversation
http.route({
  path: "/api/v1/ai/conversations",
  method: "POST",
  handler: aiChatCreateConversation,
});

// GET /api/v1/ai/conversations - List user's conversations
http.route({
  path: "/api/v1/ai/conversations",
  method: "GET",
  handler: aiChatListConversations,
});

// OPTIONS /api/v1/ai/conversations/:id - CORS preflight
http.route({
  pathPrefix: "/api/v1/ai/conversations/",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// GET /api/v1/ai/conversations/:id - Get conversation with messages
http.route({
  pathPrefix: "/api/v1/ai/conversations/",
  method: "GET",
  handler: aiChatGetConversation,
});

// PATCH /api/v1/ai/conversations/:id - Update conversation (rename)
http.route({
  pathPrefix: "/api/v1/ai/conversations/",
  method: "PATCH",
  handler: aiChatUpdateConversation,
});

// DELETE /api/v1/ai/conversations/:id - Archive conversation
http.route({
  pathPrefix: "/api/v1/ai/conversations/",
  method: "DELETE",
  handler: aiChatArchiveConversation,
});

// OPTIONS /api/v1/ai/chat - CORS preflight
http.route({
  path: "/api/v1/ai/chat",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// POST /api/v1/ai/chat - Send message and get AI response
http.route({
  path: "/api/v1/ai/chat",
  method: "POST",
  handler: aiChatSendMessage,
});

// OPTIONS /api/v1/ai/settings - CORS preflight
http.route({
  path: "/api/v1/ai/settings",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// GET /api/v1/ai/settings - Get organization AI settings
http.route({
  path: "/api/v1/ai/settings",
  method: "GET",
  handler: aiChatGetSettings,
});

// OPTIONS /api/v1/ai/models - CORS preflight
http.route({
  path: "/api/v1/ai/models",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// GET /api/v1/ai/models - Get available AI models
http.route({
  path: "/api/v1/ai/models",
  method: "GET",
  handler: aiChatGetModels,
});

// OPTIONS /api/v1/ai/voice/* - CORS preflight
http.route({
  pathPrefix: "/api/v1/ai/voice/",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// GET /api/v1/ai/voice/catalog - List ElevenLabs voices for mobile settings
http.route({
  path: "/api/v1/ai/voice/catalog",
  method: "GET",
  handler: aiChatListVoiceCatalog,
});

// PATCH /api/v1/ai/voice/preferences - Persist operator voice preference
http.route({
  path: "/api/v1/ai/voice/preferences",
  method: "PATCH",
  handler: aiChatUpdateVoicePreferences,
});

// POST /api/v1/ai/voice/session/resolve - Resolve conversation + interview session
http.route({
  path: "/api/v1/ai/voice/session/resolve",
  method: "POST",
  handler: aiChatResolveVoiceSession,
});

// POST /api/v1/ai/voice/session/open - Open voice runtime session
http.route({
  path: "/api/v1/ai/voice/session/open",
  method: "POST",
  handler: aiChatOpenVoiceSession,
});

// POST /api/v1/ai/voice/session/close - Close voice runtime session
http.route({
  path: "/api/v1/ai/voice/session/close",
  method: "POST",
  handler: aiChatCloseVoiceSession,
});

// POST /api/v1/ai/voice/transcribe - Transcribe audio bytes via voice runtime
http.route({
  path: "/api/v1/ai/voice/transcribe",
  method: "POST",
  handler: aiChatTranscribeVoice,
});

// POST /api/v1/ai/voice/synthesize - Synthesize provider-backed assistant audio
http.route({
  path: "/api/v1/ai/voice/synthesize",
  method: "POST",
  handler: aiChatSynthesizeVoice,
});

// POST /api/v1/ai/voice/audio/frame - Ingest realtime voice frame envelope
http.route({
  path: "/api/v1/ai/voice/audio/frame",
  method: "POST",
  handler: aiChatIngestVoiceFrame,
});

// POST /api/v1/ai/voice/video/frame - Ingest realtime video frame envelope
http.route({
  path: "/api/v1/ai/voice/video/frame",
  method: "POST",
  handler: aiChatIngestVideoFrame,
});

// OPTIONS /api/v1/ai/tools/:id/* - CORS preflight
http.route({
  pathPrefix: "/api/v1/ai/tools/",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// POST /api/v1/ai/tools/:id/approve - Approve tool execution
// POST /api/v1/ai/tools/:id/reject - Reject tool execution
http.route({
  pathPrefix: "/api/v1/ai/tools/",
  method: "POST",
  handler: aiChatHandleToolAction,
});

// ============================================================================
// ORGANIZATION MANAGEMENT API (Mobile App Integration)
// ============================================================================
//
// REST API for organization switching, used by mobile apps.
// Allows users to switch between organizations they have access to.
// ============================================================================

// OPTIONS /api/v1/auth/organizations - CORS preflight
http.route({
  path: "/api/v1/auth/organizations",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// GET /api/v1/auth/organizations - List user's organizations
http.route({
  path: "/api/v1/auth/organizations",
  method: "GET",
  handler: aiChatListOrganizations,
});

// OPTIONS /api/v1/auth/switch-organization - CORS preflight
http.route({
  path: "/api/v1/auth/switch-organization",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// POST /api/v1/auth/switch-organization - Switch active organization
http.route({
  path: "/api/v1/auth/switch-organization",
  method: "POST",
  handler: aiChatSwitchOrganization,
});

// ============================================================================
// ACTIVITY PROTOCOL API
// ============================================================================
// Activity monitoring, page detection, and event logging for connected apps

// Import Activity Protocol handlers
import {
  logEvent as activityLogEvent,
  getEvents as activityGetEvents,
  getStats as activityGetStats,
  registerPage as activityRegisterPage,
  bulkRegisterPages as activityBulkRegisterPages,
  getPages as activityGetPages,
  updatePageBindings as activityUpdatePageBindings,
  deletePage as activityDeletePage,
  getSettings as activityGetSettings,
  updateSettings as activityUpdateSettings,
  handleOptions as activityHandleOptions,
} from "./api/v1/activityProtocol";

// OPTIONS /api/v1/activity/events - CORS preflight
http.route({
  path: "/api/v1/activity/events",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// POST /api/v1/activity/events - Log an activity event
http.route({
  path: "/api/v1/activity/events",
  method: "POST",
  handler: activityLogEvent,
});

// GET /api/v1/activity/events - Get activity events
http.route({
  path: "/api/v1/activity/events",
  method: "GET",
  handler: activityGetEvents,
});

// OPTIONS /api/v1/activity/stats - CORS preflight
http.route({
  path: "/api/v1/activity/stats",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// GET /api/v1/activity/stats - Get activity statistics
http.route({
  path: "/api/v1/activity/stats",
  method: "GET",
  handler: activityGetStats,
});

// OPTIONS /api/v1/activity/pages - CORS preflight
http.route({
  path: "/api/v1/activity/pages",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// POST /api/v1/activity/pages - Register a single page
http.route({
  path: "/api/v1/activity/pages",
  method: "POST",
  handler: activityRegisterPage,
});

// GET /api/v1/activity/pages - Get application pages
http.route({
  path: "/api/v1/activity/pages",
  method: "GET",
  handler: activityGetPages,
});

// OPTIONS /api/v1/activity/pages/bulk - CORS preflight
http.route({
  path: "/api/v1/activity/pages/bulk",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// POST /api/v1/activity/pages/bulk - Bulk register pages
http.route({
  path: "/api/v1/activity/pages/bulk",
  method: "POST",
  handler: activityBulkRegisterPages,
});

// OPTIONS /api/v1/activity/pages/:id - CORS preflight for page operations
http.route({
  pathPrefix: "/api/v1/activity/pages/",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// PATCH /api/v1/activity/pages/:id/bindings - Update page bindings
http.route({
  pathPrefix: "/api/v1/activity/pages/",
  method: "PATCH",
  handler: activityUpdatePageBindings,
});

// DELETE /api/v1/activity/pages/:id - Delete a page
http.route({
  pathPrefix: "/api/v1/activity/pages/",
  method: "DELETE",
  handler: activityDeletePage,
});

// OPTIONS /api/v1/activity/settings - CORS preflight
http.route({
  path: "/api/v1/activity/settings",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// GET /api/v1/activity/settings - Get activity settings
http.route({
  path: "/api/v1/activity/settings",
  method: "GET",
  handler: activityGetSettings,
});

// PATCH /api/v1/activity/settings - Update activity settings
http.route({
  path: "/api/v1/activity/settings",
  method: "PATCH",
  handler: activityUpdateSettings,
});

// ============================================================================
// AGENT CONVERSATIONS API
// ============================================================================
//
// REST API for agent session conversations - used by builder-generated portals.
// Wraps internal agentSessions functions for external access.
// Scopes: conversations:read, conversations:write
// ============================================================================

// OPTIONS /api/v1/conversations - CORS preflight
http.route({
  path: "/api/v1/conversations",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/conversations - List agent conversations
http.route({
  path: "/api/v1/conversations",
  method: "GET",
  handler: agentListConversations,
});

// OPTIONS /api/v1/conversations/:sessionId - CORS preflight
http.route({
  pathPrefix: "/api/v1/conversations/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/conversations/:sessionId - Get conversation detail
http.route({
  pathPrefix: "/api/v1/conversations/",
  method: "GET",
  handler: agentGetConversation,
});

// PATCH /api/v1/conversations/:sessionId - Update conversation status
http.route({
  pathPrefix: "/api/v1/conversations/",
  method: "PATCH",
  handler: agentUpdateConversation,
});

// POST /api/v1/conversations/:sessionId/messages - Send human takeover message
http.route({
  pathPrefix: "/api/v1/conversations/",
  method: "POST",
  handler: agentSendConversationMessage,
});

// ============================================================================
// SUPPORT CHAT API
// ============================================================================
//
// Authenticated support-first API with deterministic escalation and ticket references.
// Scopes: conversations:read, conversations:write
// ============================================================================

// OPTIONS /api/support/chat - CORS preflight
http.route({
  path: "/api/support/chat",
  method: "OPTIONS",
  handler: supportHandleOptions,
});

// POST /api/support/chat - Send support message through agent runtime
http.route({
  path: "/api/support/chat",
  method: "POST",
  handler: postSupportChat,
});

// OPTIONS /api/support/chat/:sessionId - CORS preflight
http.route({
  pathPrefix: "/api/support/chat/",
  method: "OPTIONS",
  handler: supportHandleOptions,
});

// GET /api/support/chat/:sessionId - Fetch support session with escalation state
http.route({
  pathPrefix: "/api/support/chat/",
  method: "GET",
  handler: getSupportChatSession,
});

// OPTIONS /api/support/escalate - CORS preflight
http.route({
  path: "/api/support/escalate",
  method: "OPTIONS",
  handler: supportHandleOptions,
});

// POST /api/support/escalate - Deterministic escalation + ticket creation
http.route({
  path: "/api/support/escalate",
  method: "POST",
  handler: postSupportEscalate,
});

// ============================================================================
// SUB-ORGANIZATIONS API
// ============================================================================
//
// REST API for parent-child organization hierarchy (agency model).
// Agencies create sub-orgs for their clients; credit pools are shared.
// Scopes: organizations:read, organizations:write
// ============================================================================

// OPTIONS /api/v1/organizations/children - CORS preflight
http.route({
  path: "/api/v1/organizations/children",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// POST /api/v1/organizations/children - Create child organization
http.route({
  path: "/api/v1/organizations/children",
  method: "POST",
  handler: createChildOrganization,
});

// GET /api/v1/organizations/children - List child organizations
http.route({
  path: "/api/v1/organizations/children",
  method: "GET",
  handler: listChildOrganizations,
});

// OPTIONS /api/v1/organizations/children/:childId - CORS preflight
http.route({
  pathPrefix: "/api/v1/organizations/children/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/organizations/children/:childId - Get child organization
http.route({
  pathPrefix: "/api/v1/organizations/children/",
  method: "GET",
  handler: getChildOrganization,
});

// PATCH /api/v1/organizations/children/:childId - Update child organization
http.route({
  pathPrefix: "/api/v1/organizations/children/",
  method: "PATCH",
  handler: updateChildOrganization,
});

// ============================================================================
// WEBCHAT API (PUBLIC)
// ============================================================================
//
// Public API for the webchat widget. Embedded on any website to enable
// AI-powered chat with organization agents.
//
// Layer 4 in comms platform: End User ↔ AI Agent communications.
// No auth required - uses session tokens for visitor identification.
// Rate limited by IP address.
//
// See: docs/bring_it_all_together/05-WEBCHAT-WIDGET.md
// See: docs/bring_it_all_together/12-COMMS-PLATFORM-SPEC.md
// ============================================================================

// OPTIONS /api/v1/webchat/message - CORS preflight
http.route({
  path: "/api/v1/webchat/message",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    // Allow any origin for public webchat widget
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// POST /api/v1/webchat/message - Send message from webchat visitor
http.route({
  path: "/api/v1/webchat/message",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin || "*",
      "Content-Type": "application/json",
    };

    try {
      // Parse request body
      const body = await request.json();
      const {
        organizationId,
        agentId,
        sessionToken,
        onboardingSurface,
        idempotencyKey,
        requestCorrelationId,
        message,
        attachments,
        visitorInfo,
        deviceFingerprint,
        challengeToken,
        attribution,
        language,
        locale,
      } = body as {
        organizationId?: string;
        agentId?: string;
        sessionToken?: string;
        onboardingSurface?: string;
        idempotencyKey?: string;
        requestCorrelationId?: string;
        message: string;
        attachments?: Array<Record<string, unknown>>;
        visitorInfo?: { name?: string; email?: string; phone?: string };
        deviceFingerprint?: string;
        challengeToken?: string;
        language?: string;
        locale?: string;
        attribution?: {
          source?: string;
          medium?: string;
          campaign?: string;
          content?: string;
          term?: string;
          referrer?: string;
          landingPath?: string;
        };
      };

      // Validate required fields
      if ((!agentId && !sessionToken) || !message) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: agentId or sessionToken, message" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Get client IP for rate limiting
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || undefined;
      const requestId = `wc_${crypto.randomUUID()}`;
      const normalizedSessionToken =
        typeof sessionToken === "string" && sessionToken.trim().length > 0
          ? sessionToken.trim()
          : undefined;
      const normalizedOnboardingSurface =
        typeof onboardingSurface === "string" && onboardingSurface.trim().length > 0
          ? onboardingSurface.trim()
          : undefined;
      const normalizedIdempotencyKey =
        typeof idempotencyKey === "string" && idempotencyKey.trim().length > 0
          ? idempotencyKey.trim()
          : undefined;
      const normalizedRequestCorrelationId =
        typeof requestCorrelationId === "string" && requestCorrelationId.trim().length > 0
          ? requestCorrelationId.trim()
          : requestId;
      const normalizedDeviceFingerprint = typeof deviceFingerprint === "string" ? deviceFingerprint : undefined;
      const normalizedChallengeToken = typeof challengeToken === "string" ? challengeToken : undefined;
      const normalizedAttribution =
        attribution && typeof attribution === "object" ? attribution : undefined;
      const normalizedAcceptLanguage = request.headers.get("accept-language")?.split(",")[0]?.trim() || undefined;
      const normalizedLocale =
        typeof locale === "string" && locale.trim().length > 0
          ? locale.trim()
          : normalizedAcceptLanguage;
      const normalizedLanguageCandidate =
        typeof language === "string" && language.trim().length > 0
          ? language.trim().toLowerCase()
          : normalizedLocale?.split(/[-_]/)[0]?.trim().toLowerCase();
      const normalizedLanguage =
        normalizedLanguageCandidate && normalizedLanguageCandidate.length > 0
          ? normalizedLanguageCandidate
          : undefined;
      const normalizedAttachments = Array.isArray(attachments)
        ? attachments
            .filter((entry) => entry && typeof entry === "object")
            .slice(0, 4)
        : undefined;
      const normalizedOrganizationId =
        typeof organizationId === "string" && organizationId.trim().length > 0
          ? (organizationId as Id<"organizations">)
          : undefined;
      const normalizedAgentId =
        typeof agentId === "string" && agentId.trim().length > 0
          ? (agentId as Id<"objects">)
          : undefined;

      const resolvedContext = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.webchatApi.resolvePublicMessageContext,
        {
          organizationId: normalizedOrganizationId,
          agentId: normalizedAgentId,
          channel: "webchat",
          sessionToken: normalizedSessionToken,
          deploymentMode: normalizedSessionToken ? "platform_entry" : "direct_agent_entry",
        }
      );

      if (!resolvedContext) {
        const admission = evaluateIngressAdmission({
          channel: "webchat",
          contextResolved: false,
        });
        const contextFailureReason = normalizedSessionToken && normalizedAgentId
          ? "session_agent_context_mismatch"
          : normalizedSessionToken
            ? "session_context_unresolvable"
            : normalizedAgentId
              ? "agent_context_unresolvable"
              : "missing_context_inputs";
        await (ctx as any).runMutation(
          generatedApi.internal.api.v1.webchatApi.recordPublicMessageContextFailure,
          {
            channel: "webchat",
            requestId,
            reason: contextFailureReason,
            error: "Agent not found, disabled, or session context invalid",
            organizationId: normalizedOrganizationId,
            agentId: normalizedAgentId,
            sessionToken: normalizedSessionToken,
            ipAddress,
            userAgent,
          }
        );
        if (admission.allowed) {
          throw new Error("Admission decision mismatch for unresolved webchat context");
        }
        return new Response(
          JSON.stringify({
            error: admission.denial.reason,
            admission: admission.denial,
          }),
          { status: 403, headers: corsHeaders }
        );
      }

      if (resolvedContext.organizationIdStatus === "overrode_legacy" && normalizedOrganizationId) {
        console.warn("[Webchat] Ignoring client organizationId mismatch", {
          providedOrganizationId: normalizedOrganizationId,
          resolvedOrganizationId: resolvedContext.organizationId,
          resolvedAgentId: resolvedContext.agentId,
          source: resolvedContext.source,
        });
      }

      // Check rate limit
      const rateLimitResult = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.checkRateLimit, {
        ipAddress,
        organizationId: resolvedContext.organizationId,
        channel: "webchat",
        deviceFingerprint: normalizedDeviceFingerprint,
        sessionToken: normalizedSessionToken,
        userAgent,
        message,
      });

      if (!rateLimitResult.allowed && !rateLimitResult.requiresChallenge) {
        await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
          ipAddress,
          organizationId: resolvedContext.organizationId,
          channel: "webchat",
          deviceFingerprint: normalizedDeviceFingerprint,
          sessionToken: normalizedSessionToken,
          userAgent,
          message,
          outcome: "blocked",
          challengeState: "not_required",
          reason: rateLimitResult.reason || "velocity_block",
          riskScore: rateLimitResult.riskScore,
          requestId,
          shouldLogSignal: true,
        });

        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            retryAfterMs: rateLimitResult.retryAfterMs,
          }),
          { status: 429, headers: corsHeaders }
        );
      }

      let challengeState: "not_required" | "passed" = "not_required";
      if (rateLimitResult.requiresChallenge) {
        if (!normalizedChallengeToken || normalizedChallengeToken.trim().length === 0) {
          await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
            ipAddress,
            organizationId: resolvedContext.organizationId,
            channel: "webchat",
            deviceFingerprint: normalizedDeviceFingerprint,
            sessionToken: normalizedSessionToken,
            userAgent,
            message,
            outcome: "throttled",
            challengeState: "required",
            reason: rateLimitResult.challengeReason || "challenge_required",
            riskScore: rateLimitResult.riskScore,
            requestId,
            shouldLogSignal: true,
          });

          return new Response(
            JSON.stringify({
              error: "Additional verification required",
              retryAfterMs: rateLimitResult.retryAfterMs,
              challenge: {
                type: rateLimitResult.challengeType || "proof_of_human",
                reason: rateLimitResult.challengeReason || "adaptive_throttle",
              },
            }),
            { status: 429, headers: corsHeaders }
          );
        }

        const challengeResult = await (ctx as any).runAction(
          generatedApi.internal.api.v1.webchatApi.verifyAbuseChallenge,
          {
            channel: "webchat",
            ipAddress,
            challengeToken: normalizedChallengeToken,
            requestId,
          }
        );

        if (!challengeResult.verified) {
          await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
            ipAddress,
            organizationId: resolvedContext.organizationId,
            channel: "webchat",
            deviceFingerprint: normalizedDeviceFingerprint,
            sessionToken: normalizedSessionToken,
            userAgent,
            message,
            outcome: "throttled",
            challengeState: "failed",
            reason: challengeResult.reason || "challenge_failed",
            riskScore: rateLimitResult.riskScore,
            requestId,
            shouldLogSignal: true,
          });

          return new Response(
            JSON.stringify({
              error: "Challenge verification failed",
              retryAfterMs: rateLimitResult.retryAfterMs,
            }),
            { status: 429, headers: corsHeaders }
          );
        }

        challengeState = "passed";
      }

      await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
        ipAddress,
        organizationId: resolvedContext.organizationId,
        channel: "webchat",
        deviceFingerprint: normalizedDeviceFingerprint,
        sessionToken: normalizedSessionToken,
        userAgent,
        message,
        outcome: "allowed",
        challengeState,
        reason: rateLimitResult.reason,
        riskScore: rateLimitResult.riskScore,
        requestId,
      });

      // Handle the message
      const result = await (ctx as any).runAction(generatedApi.internal.api.v1.webchatApi.handleWebchatMessage, {
        organizationId: resolvedContext.organizationId,
        agentId: resolvedContext.agentId,
        channel: "webchat",
        sessionToken: normalizedSessionToken,
        idempotencyKey: normalizedIdempotencyKey,
        message,
        attachments: normalizedAttachments,
        visitorInfo,
        attribution: normalizedAttribution,
        language: normalizedLanguage,
        locale: normalizedLocale,
      });

      if (!result.success) {
        if (result.admissionDenial) {
          return new Response(
            JSON.stringify({
              error: result.admissionDenial.reason,
              admission: result.admissionDenial,
              sessionToken: result.sessionToken,
            }),
            { status: 403, headers: corsHeaders }
          );
        }
        return new Response(
          JSON.stringify({ error: result.error, sessionToken: result.sessionToken }),
          { status: 400, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          sessionToken: result.sessionToken,
          claimToken: normalizeClaimTokenForResponse(result.claimToken),
          response: result.response,
          agentName: result.agentName,
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      console.error("[Webchat] Error handling message:", error);
      return new Response(
        JSON.stringify({ error: getErrorMessage(error) }),
        { status: 500, headers: corsHeaders }
      );
    }
  }),
});

// OPTIONS /api/v1/webchat/hitl - CORS preflight
http.route({
  path: "/api/v1/webchat/hitl",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// POST /api/v1/webchat/hitl - Provider-native HITL quick actions for webchat
http.route({
  path: "/api/v1/webchat/hitl",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin || "*",
      "Content-Type": "application/json",
    };

    try {
      const body = await request.json();
      const { sessionToken, action, actorLabel, reason, note } = body as {
        sessionToken?: string;
        action?: string;
        actorLabel?: string;
        reason?: string;
        note?: string;
      };

      if (typeof sessionToken !== "string" || sessionToken.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Missing required field: sessionToken" }),
          { status: 400, headers: corsHeaders },
        );
      }

      if (action !== "takeover" && action !== "resume") {
        return new Response(
          JSON.stringify({ error: "Invalid action. Must be takeover or resume" }),
          { status: 400, headers: corsHeaders },
        );
      }

      const webchatSession = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.webchatApi.getWebchatSession,
        { sessionToken: sessionToken.trim() },
      ) as {
        agentSessionId?: Id<"agentSessions">;
      } | null;

      if (!webchatSession?.agentSessionId) {
        return new Response(
          JSON.stringify({ error: "Session not found or not ready for HITL actions" }),
          { status: 404, headers: corsHeaders },
        );
      }

      const quickActionResult = await (ctx as any).runMutation(
        generatedApi.internal.ai.escalation.handleProviderQuickActionInternal,
        {
          sessionId: webchatSession.agentSessionId,
          action,
          source: "webchat",
          actorExternalId: `webchat:${sessionToken.trim().slice(-12)}`,
          actorLabel: typeof actorLabel === "string" ? actorLabel : undefined,
          reason: typeof reason === "string" ? reason : undefined,
          note: typeof note === "string" ? note : undefined,
        },
      ) as {
        success?: boolean;
        status?: string;
      };

      const message = resolveWebchatHitlQuickActionMessage({
        action,
        status: quickActionResult?.status,
      });

      return new Response(
        JSON.stringify({
          success: Boolean(quickActionResult?.success),
          status: quickActionResult?.status || "unknown",
          sessionId: webchatSession.agentSessionId,
          message,
        }),
        { status: 200, headers: corsHeaders },
      );
    } catch (error) {
      console.error("[Webchat HITL] Error handling quick action:", error);
      return new Response(
        JSON.stringify({ error: getErrorMessage(error) }),
        { status: 500, headers: corsHeaders },
      );
    }
  }),
});

// OPTIONS /api/v1/native-guest/message - CORS preflight
http.route({
  path: "/api/v1/native-guest/message",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// POST /api/v1/native-guest/message - Send message from native pre-auth guest chat
http.route({
  path: "/api/v1/native-guest/message",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin || "*",
      "Content-Type": "application/json",
    };

    try {
      const body = await request.json();
      const {
        organizationId,
        agentId,
        sessionToken,
        onboardingSurface,
        idempotencyKey,
        requestCorrelationId,
        message,
        attachments,
        visitorInfo,
        deviceFingerprint,
        challengeToken,
        attribution,
        language,
        locale,
      } = body as {
        organizationId?: string;
        agentId?: string;
        sessionToken?: string;
        onboardingSurface?: string;
        idempotencyKey?: string;
        requestCorrelationId?: string;
        message: string;
        attachments?: Array<Record<string, unknown>>;
        visitorInfo?: { name?: string; email?: string; phone?: string };
        deviceFingerprint?: string;
        challengeToken?: string;
        language?: string;
        locale?: string;
        attribution?: {
          source?: string;
          medium?: string;
          campaign?: string;
          content?: string;
          term?: string;
          referrer?: string;
          landingPath?: string;
        };
      };

      if ((!agentId && !sessionToken) || !message) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: agentId or sessionToken, message" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || undefined;
      const requestId = `ng_${crypto.randomUUID()}`;
      const normalizedSessionToken =
        typeof sessionToken === "string" && sessionToken.trim().length > 0
          ? sessionToken.trim()
          : undefined;
      const normalizedOnboardingSurface =
        typeof onboardingSurface === "string" && onboardingSurface.trim().length > 0
          ? onboardingSurface.trim()
          : undefined;
      const normalizedIdempotencyKey =
        typeof idempotencyKey === "string" && idempotencyKey.trim().length > 0
          ? idempotencyKey.trim()
          : undefined;
      const normalizedRequestCorrelationId =
        typeof requestCorrelationId === "string" && requestCorrelationId.trim().length > 0
          ? requestCorrelationId.trim()
          : requestId;
      const normalizedDeviceFingerprint = typeof deviceFingerprint === "string" ? deviceFingerprint : undefined;
      const normalizedChallengeToken = typeof challengeToken === "string" ? challengeToken : undefined;
      const normalizedAttribution =
        attribution && typeof attribution === "object" ? attribution : undefined;
      const normalizedAcceptLanguage = request.headers.get("accept-language")?.split(",")[0]?.trim() || undefined;
      const normalizedLocale =
        typeof locale === "string" && locale.trim().length > 0
          ? locale.trim()
          : normalizedAcceptLanguage;
      const normalizedLanguageCandidate =
        typeof language === "string" && language.trim().length > 0
          ? language.trim().toLowerCase()
          : normalizedLocale?.split(/[-_]/)[0]?.trim().toLowerCase();
      const normalizedLanguage =
        normalizedLanguageCandidate && normalizedLanguageCandidate.length > 0
          ? normalizedLanguageCandidate
          : undefined;
      const normalizedAttachments = Array.isArray(attachments)
        ? attachments
            .filter((entry) => entry && typeof entry === "object")
            .slice(0, 4)
        : undefined;
      const normalizedOrganizationId =
        typeof organizationId === "string" && organizationId.trim().length > 0
          ? (organizationId as Id<"organizations">)
          : undefined;
      const normalizedAgentId =
        typeof agentId === "string" && agentId.trim().length > 0
          ? (agentId as Id<"objects">)
          : undefined;

      const resolvedContext = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.webchatApi.resolvePublicMessageContext,
        {
          organizationId: normalizedOrganizationId,
          agentId: normalizedAgentId,
          channel: "native_guest",
          sessionToken: normalizedSessionToken,
          deploymentMode: normalizedAgentId ? "direct_agent_entry" : "platform_entry",
        }
      );

      if (!resolvedContext) {
        const admission = evaluateIngressAdmission({
          channel: "native_guest",
          contextResolved: false,
        });
        const contextFailureReason = normalizedSessionToken && normalizedAgentId
          ? "session_agent_context_mismatch"
          : normalizedSessionToken
            ? "session_context_unresolvable"
            : normalizedAgentId
              ? "agent_context_unresolvable"
              : "missing_context_inputs";
        await (ctx as any).runMutation(
          generatedApi.internal.api.v1.webchatApi.recordPublicMessageContextFailure,
          {
            channel: "native_guest",
            requestId,
            reason: contextFailureReason,
            error: "Agent not found, disabled, or session context invalid",
            organizationId: normalizedOrganizationId,
            agentId: normalizedAgentId,
            sessionToken: normalizedSessionToken,
            ipAddress,
            userAgent,
          }
        );
        if (admission.allowed) {
          throw new Error("Admission decision mismatch for unresolved native_guest context");
        }
        return new Response(
          JSON.stringify({
            error: admission.denial.reason,
            admission: admission.denial,
          }),
          { status: 403, headers: corsHeaders }
        );
      }

      if (resolvedContext.organizationIdStatus === "overrode_legacy" && normalizedOrganizationId) {
        console.warn("[Native Guest] Ignoring client organizationId mismatch", {
          providedOrganizationId: normalizedOrganizationId,
          resolvedOrganizationId: resolvedContext.organizationId,
          resolvedAgentId: resolvedContext.agentId,
          source: resolvedContext.source,
        });
      }

      const rateLimitResult = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.checkRateLimit, {
        ipAddress,
        organizationId: resolvedContext.organizationId,
        channel: "native_guest",
        deviceFingerprint: normalizedDeviceFingerprint,
        sessionToken: normalizedSessionToken,
        userAgent,
        message,
      });

      if (!rateLimitResult.allowed && !rateLimitResult.requiresChallenge) {
        await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
          ipAddress,
          organizationId: resolvedContext.organizationId,
          channel: "native_guest",
          deviceFingerprint: normalizedDeviceFingerprint,
          sessionToken: normalizedSessionToken,
          userAgent,
          message,
          outcome: "blocked",
          challengeState: "not_required",
          reason: rateLimitResult.reason || "velocity_block",
          riskScore: rateLimitResult.riskScore,
          requestId,
          shouldLogSignal: true,
        });

        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            retryAfterMs: rateLimitResult.retryAfterMs,
          }),
          { status: 429, headers: corsHeaders }
        );
      }

      let challengeState: "not_required" | "passed" = "not_required";
      if (rateLimitResult.requiresChallenge) {
        if (!normalizedChallengeToken || normalizedChallengeToken.trim().length === 0) {
          await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
            ipAddress,
            organizationId: resolvedContext.organizationId,
            channel: "native_guest",
            deviceFingerprint: normalizedDeviceFingerprint,
            sessionToken: normalizedSessionToken,
            userAgent,
            message,
            outcome: "throttled",
            challengeState: "required",
            reason: rateLimitResult.challengeReason || "challenge_required",
            riskScore: rateLimitResult.riskScore,
            requestId,
            shouldLogSignal: true,
          });

          return new Response(
            JSON.stringify({
              error: "Additional verification required",
              retryAfterMs: rateLimitResult.retryAfterMs,
              challenge: {
                type: rateLimitResult.challengeType || "proof_of_human",
                reason: rateLimitResult.challengeReason || "adaptive_throttle",
              },
            }),
            { status: 429, headers: corsHeaders }
          );
        }

        const challengeResult = await (ctx as any).runAction(
          generatedApi.internal.api.v1.webchatApi.verifyAbuseChallenge,
          {
            channel: "native_guest",
            ipAddress,
            challengeToken: normalizedChallengeToken,
            requestId,
          }
        );

        if (!challengeResult.verified) {
          await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
            ipAddress,
            organizationId: resolvedContext.organizationId,
            channel: "native_guest",
            deviceFingerprint: normalizedDeviceFingerprint,
            sessionToken: normalizedSessionToken,
            userAgent,
            message,
            outcome: "throttled",
            challengeState: "failed",
            reason: challengeResult.reason || "challenge_failed",
            riskScore: rateLimitResult.riskScore,
            requestId,
            shouldLogSignal: true,
          });

          return new Response(
            JSON.stringify({
              error: "Challenge verification failed",
              retryAfterMs: rateLimitResult.retryAfterMs,
            }),
            { status: 429, headers: corsHeaders }
          );
        }

        challengeState = "passed";
      }

      await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
        ipAddress,
        organizationId: resolvedContext.organizationId,
        channel: "native_guest",
        deviceFingerprint: normalizedDeviceFingerprint,
        sessionToken: normalizedSessionToken,
        userAgent,
        message,
        outcome: "allowed",
        challengeState,
        reason: rateLimitResult.reason,
        riskScore: rateLimitResult.riskScore,
        requestId,
      });

      console.info("[NativeGuestReplayTrace] http_native_guest_message", {
        requestId,
        requestCorrelationId: normalizedRequestCorrelationId,
        organizationId: String(resolvedContext.organizationId),
        agentId: String(resolvedContext.agentId),
        hasSessionToken: Boolean(normalizedSessionToken),
        idempotencyKey: normalizedIdempotencyKey || null,
      });

      const result = await (ctx as any).runAction(generatedApi.internal.api.v1.webchatApi.handleWebchatMessage, {
        organizationId: resolvedContext.organizationId,
        agentId: resolvedContext.agentId,
        channel: "native_guest",
        sessionToken: normalizedSessionToken,
        onboardingSurface: normalizedOnboardingSurface,
        idempotencyKey: normalizedIdempotencyKey,
        requestCorrelationId: normalizedRequestCorrelationId,
        message,
        attachments: normalizedAttachments,
        visitorInfo,
        attribution: normalizedAttribution,
        language: normalizedLanguage,
        locale: normalizedLocale,
      });

      console.info("[NativeGuestReplayTrace] http_native_guest_result", {
        requestId,
        requestCorrelationId: normalizedRequestCorrelationId,
        success: Boolean(result.success),
        error: result.error || null,
        hasResponse: typeof result.response === "string" && result.response.trim().length > 0,
        sessionToken: result.sessionToken || null,
      });

      if (!result.success) {
        if (result.admissionDenial) {
          return new Response(
            JSON.stringify({
              error: result.admissionDenial.reason,
              admission: result.admissionDenial,
              sessionToken: result.sessionToken,
            }),
            { status: 403, headers: corsHeaders }
          );
        }
        return new Response(
          JSON.stringify({
            error: result.error || "Unable to process message",
            sessionToken: result.sessionToken,
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          sessionToken: result.sessionToken,
          claimToken: normalizeClaimTokenForResponse(result.claimToken),
          response: result.response,
          agentName: result.agentName,
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      console.error("[Native Guest] Error handling message:", error);
      return new Response(
        JSON.stringify({ error: "Unable to process message" }),
        { status: 500, headers: corsHeaders }
      );
    }
  }),
});

// OPTIONS /api/v1/webchat/bootstrap/:agentId - CORS preflight
http.route({
  pathPrefix: "/api/v1/webchat/bootstrap/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// GET /api/v1/webchat/bootstrap/:agentId - Get deployment bootstrap contract
http.route({
  pathPrefix: "/api/v1/webchat/bootstrap/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin || "*",
      "Content-Type": "application/json",
    };

    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const agentId = pathParts[pathParts.length - 1];
      if (!agentId) {
        return new Response(
          JSON.stringify({ error: "Missing agentId in path" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const requestedChannel = url.searchParams.get("channel");
      const channel = requestedChannel === "native_guest" ? "native_guest" : "webchat";

      const bootstrap = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.webchatApi.getPublicWebchatBootstrap,
        {
          agentId: agentId as Id<"objects">,
          channel,
        }
      );

      if (!bootstrap) {
        return new Response(
          JSON.stringify({ error: "Agent not found or channel not enabled" }),
          { status: 404, headers: corsHeaders }
        );
      }

      return new Response(JSON.stringify(bootstrap), { status: 200, headers: corsHeaders });
    } catch (error) {
      console.error("[Webchat] Error getting bootstrap contract:", error);
      return new Response(
        JSON.stringify({ error: getErrorMessage(error) }),
        { status: 500, headers: corsHeaders }
      );
    }
  }),
});

// OPTIONS /api/v1/webchat/config/:agentId - CORS preflight
http.route({
  pathPrefix: "/api/v1/webchat/config/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// GET /api/v1/webchat/config/:agentId - Get widget configuration
http.route({
  pathPrefix: "/api/v1/webchat/config/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin || "*",
      "Content-Type": "application/json",
    };

    try {
      // Extract agent ID from URL path
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const agentId = pathParts[pathParts.length - 1];

      if (!agentId) {
        return new Response(
          JSON.stringify({ error: "Missing agentId in path" }),
          { status: 400, headers: corsHeaders }
        );
      }
      const requestedChannel = url.searchParams.get("channel");
      const channel = requestedChannel === "native_guest" ? "native_guest" : "webchat";

      // Get webchat config
      const config = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatConfig, {
        agentId: agentId as Id<"objects">,
        channel,
      });

      if (!config) {
        return new Response(
          JSON.stringify({ error: "Agent not found or webchat not enabled" }),
          { status: 404, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          ...config,
          channel,
          contractVersion: WEBCHAT_BOOTSTRAP_CONTRACT_VERSION,
          customizationFields: WEBCHAT_CUSTOMIZATION_FIELDS,
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      console.error("[Webchat] Error getting config:", error);
      return new Response(
        JSON.stringify({ error: getErrorMessage(error) }),
        { status: 500, headers: corsHeaders }
      );
    }
  }),
});

// ============================================================================
// SLACK EVENTS API WEBHOOK
// ============================================================================

const slackEventsWebhookHandler = httpAction(async (ctx, request) => {
  if (!SLACK_INTEGRATION_CONFIG.enabled) {
    return new Response("Slack integration disabled", { status: 404 });
  }

  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitResult = await checkRateLimit(
    ctx as any,
    `slack_webhook:${requestIp}`,
    "ip",
    "free"
  );
  if (!rateLimitResult.allowed) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }

  let logOrganizationId: Id<"organizations"> | null = null;
  let logProviderConnectionId: string | undefined;
  let logProviderAccountId: string | undefined;
  let logRouteKey: string | undefined;
  let logEventId: string | undefined;

  try {
    const body = await request.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return addRateLimitHeaders(
        new Response("Invalid JSON payload", { status: 400 }),
        rateLimitResult
      );
    }
    logEventId =
      typeof payload.event_id === "string" ? payload.event_id : undefined;

    // Allow Slack URL verification before installation-specific context exists.
    // Slack sends this handshake during app setup, before we may have an active
    // oauthConnection to resolve signing-secret candidates from.
    if (payload.type === "url_verification") {
      const challenge = typeof payload.challenge === "string" ? payload.challenge : "";
      return addRateLimitHeaders(
        new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
        rateLimitResult
      );
    }

    const routingHints = extractSlackEventRoutingHints(payload);
    const verificationContext = await resolveSlackVerificationContext(ctx, {
      teamId: routingHints.teamId,
      appId: routingHints.appId,
    });
    logOrganizationId = verificationContext?.organizationId ?? null;
    logProviderConnectionId = verificationContext?.providerConnectionId;
    logProviderAccountId =
      verificationContext?.providerAccountId || routingHints.teamId || undefined;
    logRouteKey = verificationContext?.routeKey;

    if (!verificationContext || verificationContext.signingSecrets.length === 0) {
      const fallbackOrganizationId = routingHints.teamId
        ? ((await (ctx as any).runQuery(
            generatedApi.internal.channels.webhooks.resolveOrgFromSlackTeamId,
            { teamId: routingHints.teamId }
          )) as Id<"organizations"> | null)
        : null;
      await recordIngressWebhookEvent({
        ctx,
        organizationId: logOrganizationId || fallbackOrganizationId,
        provider: "slack",
        endpoint: "integrations/slack/events",
        action: "verified",
        status: "error",
        message: "Missing signing secret for resolved Slack installation",
        providerEventId: logEventId,
        providerConnectionId: logProviderConnectionId,
        providerAccountId: logProviderAccountId,
        routeKey: logRouteKey,
        metadata: {
          requestIp,
          teamId: routingHints.teamId,
          appId: routingHints.appId,
        },
      });
      console.error("[Slack Webhook] Missing signing secret for resolved installation:", {
        requestIp,
        teamId: routingHints.teamId,
        appId: routingHints.appId,
      });
      return addRateLimitHeaders(
        new Response("Invalid signature", { status: 401 }),
        rateLimitResult
      );
    }

    const signatureResult = await verifySlackRequestSignature({
      body,
      signatureHeader: request.headers.get("x-slack-signature"),
      timestampHeader: request.headers.get("x-slack-request-timestamp"),
      signingSecrets: verificationContext.signingSecrets,
    });

    if (!signatureResult.valid) {
      await recordIngressWebhookEvent({
        ctx,
        organizationId: logOrganizationId,
        provider: "slack",
        endpoint: "integrations/slack/events",
        action: "verified",
        status: "error",
        message: "Slack signature verification failed",
        errorMessage: signatureResult.reason,
        providerEventId: logEventId,
        providerConnectionId: logProviderConnectionId,
        providerAccountId: logProviderAccountId,
        routeKey: logRouteKey,
        metadata: {
          requestIp,
          teamId: routingHints.teamId,
          appId: routingHints.appId,
        },
      });
      console.error("[Slack Webhook] Signature verification failed:", {
        reason: signatureResult.reason,
        requestIp,
        teamId: routingHints.teamId,
        appId: routingHints.appId,
      });
      return addRateLimitHeaders(
        new Response("Invalid signature", { status: 401 }),
        rateLimitResult
      );
    }

    if (payload.type !== "event_callback") {
      await recordIngressWebhookEvent({
        ctx,
        organizationId: logOrganizationId,
        provider: "slack",
        endpoint: "integrations/slack/events",
        action: "received",
        status: "skipped",
        message: "Unsupported Slack payload type",
        providerEventId: logEventId,
        providerConnectionId: logProviderConnectionId,
        providerAccountId: logProviderAccountId,
        routeKey: logRouteKey,
        metadata: {
          payloadType: payload.type,
        },
      });
      return addRateLimitHeaders(
        new Response(JSON.stringify({ ok: true, ignored: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
        rateLimitResult
      );
    }

    const retryNumHeader = request.headers.get("x-slack-retry-num");
    const parsedRetryNum = retryNumHeader
      ? Number.parseInt(retryNumHeader, 10)
      : Number.NaN;
    const retryNum = Number.isFinite(parsedRetryNum)
      ? parsedRetryNum
      : undefined;
    const receivedAt = Date.now();

    await recordIngressWebhookEvent({
      ctx,
      organizationId: logOrganizationId,
      provider: "slack",
      endpoint: "integrations/slack/events",
      action: "received",
      status: "success",
      message: "Slack event accepted for async processing",
      providerEventId: logEventId,
      providerConnectionId: logProviderConnectionId,
      providerAccountId: logProviderAccountId,
      routeKey: logRouteKey,
      metadata: {
        retryNum,
        retryReason: request.headers.get("x-slack-retry-reason") || undefined,
      },
      processedAt: receivedAt,
    });

    await (ctx as any).scheduler.runAfter(
      0,
      generatedApi.internal.channels.webhooks.processSlackEvent,
      {
        payload: body,
        eventId: logEventId,
        teamId:
          routingHints.teamId ||
          verificationContext.teamId ||
          undefined,
        providerConnectionId: verificationContext.providerConnectionId,
        providerAccountId:
          verificationContext.providerAccountId ||
          routingHints.teamId ||
          verificationContext.teamId ||
          undefined,
        providerInstallationId: verificationContext.providerInstallationId,
        providerProfileId: verificationContext.providerProfileId,
        providerProfileType: verificationContext.providerProfileType,
        routeKey: verificationContext.routeKey,
        retryNum,
        retryReason: request.headers.get("x-slack-retry-reason") || undefined,
        signatureTimestamp: signatureResult.timestampSeconds,
        receivedAt,
      }
    );

    return addRateLimitHeaders(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  } catch (error) {
    await recordIngressWebhookEvent({
      ctx,
      organizationId: logOrganizationId,
      provider: "slack",
      endpoint: "integrations/slack/events",
      action: "received",
      status: "error",
      message: "Slack webhook handler error",
      errorMessage: getErrorMessage(error),
      providerEventId: logEventId,
      providerConnectionId: logProviderConnectionId,
      providerAccountId: logProviderAccountId,
      routeKey: logRouteKey,
    });
    console.error("[Slack Webhook] Error:", error);
    return addRateLimitHeaders(
      new Response("Internal server error", { status: 500 }),
      rateLimitResult
    );
  }
});

http.route({
  path: "/integrations/slack/events",
  method: "POST",
  handler: slackEventsWebhookHandler,
});

http.route({
  path: "/slack/events",
  method: "POST",
  handler: slackEventsWebhookHandler,
});

// ============================================================================
// SLACK SLASH COMMAND WEBHOOK
// ============================================================================

const slackSlashCommandWebhookHandler = httpAction(async (ctx, request) => {
  if (!SLACK_INTEGRATION_CONFIG.enabled) {
    return new Response("Slack integration disabled", { status: 404 });
  }

  if (!SLACK_INTEGRATION_CONFIG.slashCommandsEnabled) {
    return new Response(
      JSON.stringify({
        response_type: "ephemeral",
        text: "Slash commands are not enabled for this environment.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitResult = await checkRateLimit(
    ctx as any,
    `slack_command:${requestIp}`,
    "ip",
    "free"
  );
  if (!rateLimitResult.allowed) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          response_type: "ephemeral",
          text: "Rate limit exceeded. Please try again shortly.",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }

  try {
    const body = await request.text();
    const payload = new URLSearchParams(body);
    const teamId = payload.get("team_id")?.trim() || "";
    const channelId = payload.get("channel_id")?.trim() || "";
    const userId = payload.get("user_id")?.trim() || "";
    const command = payload.get("command")?.trim() || "";

    if (!teamId || !channelId || !userId || !command) {
      return addRateLimitHeaders(
        new Response("Missing slash command fields", { status: 400 }),
        rateLimitResult
      );
    }

    const verificationContext = await resolveSlackVerificationContext(ctx, {
      teamId,
      appId: payload.get("api_app_id")?.trim() || undefined,
    });
    if (!verificationContext || verificationContext.signingSecrets.length === 0) {
      console.error("[Slack Command] Missing signing secret for resolved installation:", {
        requestIp,
        teamId,
        appId: payload.get("api_app_id")?.trim() || undefined,
      });
      return addRateLimitHeaders(
        new Response("Invalid signature", { status: 401 }),
        rateLimitResult
      );
    }

    const signatureResult = await verifySlackRequestSignature({
      body,
      signatureHeader: request.headers.get("x-slack-signature"),
      timestampHeader: request.headers.get("x-slack-request-timestamp"),
      signingSecrets: verificationContext.signingSecrets,
    });

    if (!signatureResult.valid) {
      console.error("[Slack Command] Signature verification failed:", {
        reason: signatureResult.reason,
        requestIp,
        teamId,
      });
      return addRateLimitHeaders(
        new Response("Invalid signature", { status: 401 }),
        rateLimitResult
      );
    }

    const retryNumHeader = request.headers.get("x-slack-retry-num");
    const parsedRetryNum = retryNumHeader
      ? Number.parseInt(retryNumHeader, 10)
      : Number.NaN;
    const retryNum = Number.isFinite(parsedRetryNum)
      ? parsedRetryNum
      : undefined;

    await (ctx as any).scheduler.runAfter(
      0,
      generatedApi.internal.channels.webhooks.processSlackSlashCommand,
      {
        teamId,
        channelId,
        userId,
        userName: payload.get("user_name") || undefined,
        command,
        text: payload.get("text") || undefined,
        triggerId: payload.get("trigger_id") || undefined,
        responseUrl: payload.get("response_url") || undefined,
        providerConnectionId: verificationContext.providerConnectionId,
        providerAccountId: verificationContext.providerAccountId || teamId,
        providerInstallationId: verificationContext.providerInstallationId,
        providerProfileId: verificationContext.providerProfileId,
        providerProfileType: verificationContext.providerProfileType,
        routeKey: verificationContext.routeKey,
        retryNum,
        retryReason: request.headers.get("x-slack-retry-reason") || undefined,
        signatureTimestamp: signatureResult.timestampSeconds,
        receivedAt: Date.now(),
      }
    );

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          response_type: "ephemeral",
          text: "Processing command...",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error) {
    console.error("[Slack Command] Error:", error);
    return addRateLimitHeaders(
      new Response("Internal server error", { status: 500 }),
      rateLimitResult
    );
  }
});

http.route({
  path: "/integrations/slack/commands",
  method: "POST",
  handler: slackSlashCommandWebhookHandler,
});

http.route({
  path: "/slack/commands",
  method: "POST",
  handler: slackSlashCommandWebhookHandler,
});

// ============================================================================
// SLACK INTERACTIVITY WEBHOOK
// ============================================================================

const slackInteractivityWebhookHandler = httpAction(async (ctx, request) => {
  if (!SLACK_INTEGRATION_CONFIG.enabled) {
    return new Response("Slack integration disabled", { status: 404 });
  }

  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitResult = await checkRateLimit(
    ctx as any,
    `slack_interactivity:${requestIp}`,
    "ip",
    "free"
  );
  if (!rateLimitResult.allowed) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          response_type: "ephemeral",
          text: "Rate limit exceeded. Please try again shortly.",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }

  try {
    const body = await request.text();
    const formPayload = new URLSearchParams(body);
    const interactionPayloadRaw = formPayload.get("payload");
    const interactionPayload = interactionPayloadRaw
      ? (JSON.parse(interactionPayloadRaw) as Record<string, unknown>)
      : null;
    const teamId =
      formPayload.get("team_id")?.trim() ||
      asNonEmptyString(
        ((interactionPayload?.team as Record<string, unknown> | undefined)?.id as unknown)
      ) ||
      "";
    const appId =
      formPayload.get("api_app_id")?.trim() ||
      asNonEmptyString(interactionPayload?.api_app_id) ||
      undefined;

    if (!teamId) {
      return addRateLimitHeaders(
        new Response("Missing Slack team ID", { status: 400 }),
        rateLimitResult
      );
    }

    const verificationContext = await resolveSlackVerificationContext(ctx, {
      teamId,
      appId,
    });
    if (!verificationContext || verificationContext.signingSecrets.length === 0) {
      console.error("[Slack Interactivity] Missing signing secret for resolved installation:", {
        requestIp,
        teamId,
        appId,
      });
      return addRateLimitHeaders(
        new Response("Invalid signature", { status: 401 }),
        rateLimitResult
      );
    }

    const signatureResult = await verifySlackRequestSignature({
      body,
      signatureHeader: request.headers.get("x-slack-signature"),
      timestampHeader: request.headers.get("x-slack-request-timestamp"),
      signingSecrets: verificationContext.signingSecrets,
    });

    if (!signatureResult.valid) {
      console.error("[Slack Interactivity] Signature verification failed:", {
        reason: signatureResult.reason,
        requestIp,
        teamId,
        appId,
      });
      return addRateLimitHeaders(
        new Response("Invalid signature", { status: 401 }),
        rateLimitResult
      );
    }

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          response_type: "ephemeral",
          text: "Interactivity endpoint acknowledged.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error) {
    console.error("[Slack Interactivity] Error:", error);
    return addRateLimitHeaders(
      new Response("Internal server error", { status: 500 }),
      rateLimitResult
    );
  }
});

http.route({
  path: "/integrations/slack/interactivity",
  method: "POST",
  handler: slackInteractivityWebhookHandler,
});

// ============================================================================
// WHATSAPP WEBHOOK
// ============================================================================

const whatsappWebhookGetHandler = httpAction(async (_ctx, request) => {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedVerifyToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN;

  if (!expectedVerifyToken) {
    return new Response("Webhook verify token not configured", { status: 500 });
  }

  if (mode === "subscribe" && token === expectedVerifyToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
});

const whatsappWebhookPostHandler = httpAction(async (ctx, request) => {
  try {
    const payload = await request.text();
    const signatureHeader = request.headers.get("x-hub-signature-256");
    if (!signatureHeader) {
      return new Response("Missing signature", { status: 401 });
    }

    const boundarySignatureValid = await verifyWhatsAppWebhookSignature({
      payload,
      signatureHeader,
      appSecret: asNonEmptyString(process.env.META_APP_SECRET),
    });
    const actionSignatureValid = await (ctx as any).runAction(
      generatedApi.internal.channels.webhooks.verifyWhatsAppSignature,
      {
        payload,
        signature: signatureHeader,
      }
    );

    if (!boundarySignatureValid || !actionSignatureValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return new Response("Invalid JSON payload", { status: 400 });
    }

    if (parsedPayload.object !== "whatsapp_business_account") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const phoneNumberId = extractWhatsAppPhoneNumberId(parsedPayload);
    if (!phoneNumberId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    await (ctx as any).scheduler.runAfter(
      0,
      generatedApi.internal.channels.webhooks.processWhatsAppWebhook,
      {
        payload,
        phoneNumberId,
      }
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});

http.route({
  path: "/webhooks/whatsapp",
  method: "GET",
  handler: whatsappWebhookGetHandler,
});

http.route({
  path: "/webhooks/whatsapp",
  method: "POST",
  handler: whatsappWebhookPostHandler,
});

http.route({
  path: "/whatsapp-webhook",
  method: "GET",
  handler: whatsappWebhookGetHandler,
});

http.route({
  path: "/whatsapp-webhook",
  method: "POST",
  handler: whatsappWebhookPostHandler,
});

// ============================================================================
// DIRECT TELEPHONY WEBHOOK
// ============================================================================

async function resolveTwilioVoiceWebhookContext(args: {
  ctx: unknown;
  request: Request;
  body: string;
}): Promise<
  | {
      ok: true;
      organizationId: Id<"organizations">;
      providerConnectionId?: string;
      providerAccountId?: string;
      providerInstallationId?: string;
      providerProfileId?: string;
      providerProfileType?: "platform" | "organization";
      routeKey: string;
      params: URLSearchParams;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  const url = new URL(args.request.url);
  const routeKey = asNonEmptyString(url.searchParams.get("routeKey"));
  const presentedSecret = asNonEmptyString(url.searchParams.get("secret"));

  if (!routeKey) {
    return {
      ok: false,
      response: buildTelephonyWebhookRejectResponse(401, "missing_route_identity"),
    };
  }

  const resolvedContext = await (args.ctx as any).runQuery(
    generatedApi.internal.channels.router.resolveTelephonyWebhookIngressContext,
    {
      providerId: "direct",
      routeKey,
    }
  );

  if (resolvedContext.status !== "resolved") {
    return {
      ok: false,
      response: buildTelephonyWebhookRejectResponse(
        resolvedContext.status === "ambiguous_route" ? 403 : 401,
        resolvedContext.status,
      ),
    };
  }

  const credentials = (await (args.ctx as any).runQuery(
    generatedApi.internal.channels.router.getProviderCredentials,
    {
      organizationId: resolvedContext.organizationId,
      providerId: resolvedContext.providerId,
      providerConnectionId: resolvedContext.providerConnectionId,
      providerAccountId: resolvedContext.providerAccountId,
      providerInstallationId: resolvedContext.providerInstallationId,
      providerProfileId: resolvedContext.providerProfileId,
      providerProfileType: resolvedContext.providerProfileType || "organization",
      routeKey: resolvedContext.routeKey || routeKey,
      allowPlatformFallback: false,
    }
  )) as ProviderCredentials | null;

  if (
    asNonEmptyString(credentials?.telephonyProviderIdentity) !== "twilio_voice"
  ) {
    return {
      ok: false,
      response: buildTelephonyWebhookRejectResponse(409, "binding_not_twilio_voice"),
    };
  }

  const expectedSecret = resolveTelephonyWebhookSigningSecret(credentials);
  if (!expectedSecret || !presentedSecret || presentedSecret !== expectedSecret) {
    return {
      ok: false,
      response: buildTelephonyWebhookRejectResponse(401, "invalid_binding_secret"),
    };
  }

  const twilioRuntime = await (args.ctx as any).runAction(
    generatedApi.internal.integrations.twilio.getOrganizationTwilioRuntimeBinding,
    {
      organizationId: resolvedContext.organizationId,
    }
  );
  const signature = await verifyTwilioRequestSignature({
    request: args.request,
    body: args.body,
    authToken: (twilioRuntime as { authToken?: unknown } | null)?.authToken as
      | string
      | null
      | undefined,
  });
  if (!signature.valid) {
    return {
      ok: false,
      response: buildTelephonyWebhookRejectResponse(
        401,
        signature.reason || "invalid_twilio_signature",
      ),
    };
  }

  return {
    ok: true,
    organizationId: resolvedContext.organizationId,
    providerConnectionId: resolvedContext.providerConnectionId,
    providerAccountId: resolvedContext.providerAccountId,
    providerInstallationId: resolvedContext.providerInstallationId,
    providerProfileId: resolvedContext.providerProfileId,
    providerProfileType: resolvedContext.providerProfileType,
    routeKey: resolvedContext.routeKey || routeKey,
    params: signature.params,
  };
}

const twilioVoiceInboundWebhookHandler = httpAction(async (ctx, request) => {
  try {
    const body = await request.text();
    const context = await resolveTwilioVoiceWebhookContext({
      ctx,
      request,
      body,
    });
    if (!context.ok) {
      return context.response;
    }

    const callSid = asNonEmptyString(context.params.get("CallSid"));
    const from = asNonEmptyString(context.params.get("From"));
    const to = asNonEmptyString(context.params.get("To"));
    if (!callSid) {
      return buildTelephonyWebhookRejectResponse(400, "missing_provider_call_id");
    }

    await (ctx as any).runMutation(
      generatedApi.internal.channels.router.ensureTelephonyCallRecord,
      {
        organizationId: context.organizationId,
        providerId: "direct",
        providerCallId: callSid,
        providerConversationId: callSid,
        recipientIdentifier: to,
        callerIdentifier: from,
        routeKey: context.routeKey,
        telephonyProviderIdentity: "twilio_voice",
        direction: "inbound",
        source: "twilio_voice_inbound",
      }
    );

    const requestUrl = new URL(request.url);
    const stage = asNonEmptyString(requestUrl.searchParams.get("stage"));
    if (stage === "recording_complete") {
      const durationValue =
        asNumber(context.params.get("RecordingDuration")) ||
        asNumber(context.params.get("CallDuration"));
      await (ctx as any).runMutation(
        generatedApi.internal.channels.router.recordTelephonyWebhookOutcome,
        {
          organizationId: context.organizationId,
          providerCallId: callSid,
          providerConversationId: callSid,
          providerId: "direct",
          outcome:
            normalizeTwilioCallStatus(context.params.get("CallStatus")) || "completed",
          disposition: "voicemail",
          durationSeconds: durationValue,
          endedAt: Date.now(),
          voicemailDetected: true,
        }
      );

      return xmlResponse(buildTwilioInboundCompletionTwiml());
    }

    const greeting = await (ctx as any).runQuery(
      generatedApi.internal.integrations.telephony.getOrganizationTwilioVoiceGreeting,
      {
        organizationId: context.organizationId,
      }
    );
    requestUrl.searchParams.set("stage", "recording_complete");

    return xmlResponse(
      buildTwilioInboundGreetingTwiml({
        greeting:
          asNonEmptyString((greeting as { firstMessage?: unknown } | null)?.firstMessage) ||
          "Hello, please leave your name, number, and reason for calling after the tone.",
        actionUrl: requestUrl.toString(),
      })
    );
  } catch (error) {
    console.error("[Twilio Voice Inbound] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});

const twilioVoiceStatusWebhookHandler = httpAction(async (ctx, request) => {
  try {
    const body = await request.text();
    const context = await resolveTwilioVoiceWebhookContext({
      ctx,
      request,
      body,
    });
    if (!context.ok) {
      return context.response;
    }

    const callSid = asNonEmptyString(context.params.get("CallSid"));
    if (!callSid) {
      return buildTelephonyWebhookRejectResponse(400, "missing_provider_call_id");
    }

    const to = asNonEmptyString(context.params.get("To"));
    const from = asNonEmptyString(context.params.get("From"));
    const directionRaw = asNonEmptyString(context.params.get("Direction")) || "outbound-api";
    const direction = directionRaw.startsWith("inbound") ? "inbound" : "outbound";
    const answeredBy = asNonEmptyString(context.params.get("AnsweredBy"));
    const callStatus = normalizeTwilioCallStatus(context.params.get("CallStatus"));
    const durationSeconds = asNumber(context.params.get("CallDuration"));
    const isTerminal =
      callStatus === "completed" ||
      callStatus === "busy" ||
      callStatus === "no_answer" ||
      callStatus === "failed";

    await (ctx as any).runMutation(
      generatedApi.internal.channels.router.ensureTelephonyCallRecord,
      {
        organizationId: context.organizationId,
        providerId: "direct",
        providerCallId: callSid,
        providerConversationId: callSid,
        recipientIdentifier: to,
        callerIdentifier: from,
        routeKey: context.routeKey,
        telephonyProviderIdentity: "twilio_voice",
        direction,
        source: "twilio_voice_status_callback",
      }
    );

    await (ctx as any).runMutation(
      generatedApi.internal.channels.router.recordTelephonyWebhookOutcome,
      {
        organizationId: context.organizationId,
        providerCallId: callSid,
        providerConversationId: callSid,
        providerId: "direct",
        outcome: callStatus,
        disposition: answeredBy || callStatus,
        durationSeconds,
        endedAt: isTerminal ? Date.now() : undefined,
        voicemailDetected:
          answeredBy === "machine_start" || answeredBy === "machine_end_beep",
        errorMessage:
          callStatus === "failed" ? "twilio_voice_status_failed" : undefined,
      }
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Twilio Voice Status] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});

const directTelephonyWebhookHandler = httpAction(async (ctx, request) => {
  try {
    const body = await request.text();
    let rawPayload: Record<string, unknown>;
    try {
      rawPayload = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_json_body",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const payload = normalizeTelephonyWebhookPayload(rawPayload);
    const providerCallId = resolveTelephonyWebhookProviderCallId(payload);
    const signatureHeader =
      request.headers.get("x-eleven-signature") ||
      request.headers.get("x-telephony-signature") ||
      request.headers.get("x-direct-call-signature");
    const timestampHeader =
      request.headers.get("x-eleven-request-timestamp") ||
      request.headers.get("x-telephony-request-timestamp") ||
      request.headers.get("x-direct-call-request-timestamp");
    const routingIdentity = extractTelephonyRoutingIdentity(payload, request);
    const isElevenIngress = isElevenTelephonyIngress({
      payload,
      routeKey: routingIdentity.routeKey,
      signatureHeader,
      timestampHeader,
    });

    let organizationId: Id<"organizations"> | undefined;
    let providerConnectionId: string | undefined;
    let providerAccountId: string | undefined;
    let providerInstallationId: string | undefined;
    let providerProfileId: string | undefined;
    let providerProfileType: "platform" | "organization" | undefined;
    let telephonyCredentials: ProviderCredentials | null = null;
    let routeKey = routingIdentity.routeKey;
    let payloadOrganizationId = asNonEmptyString(payload.organizationId);

    if (isElevenIngress) {
      const resolvedContext = await (ctx as any).runQuery(
        generatedApi.internal.channels.router.resolveTelephonyWebhookIngressContext,
        {
          providerId: "direct",
          providerConnectionId: routingIdentity.providerConnectionId,
          providerAccountId: routingIdentity.providerAccountId,
          providerInstallationId: routingIdentity.providerInstallationId,
          providerProfileId: routingIdentity.providerProfileId,
          providerProfileType: routingIdentity.providerProfileType,
          routeKey: routingIdentity.routeKey,
        }
      );

      if (resolvedContext.status !== "resolved") {
        console.warn("[Direct Telephony Webhook] Rejected Eleven ingress route", {
          reasonCode: resolvedContext.status,
          providerCallId,
          routeKey: routingIdentity.routeKey,
          providerConnectionId: routingIdentity.providerConnectionId,
          providerInstallationId: routingIdentity.providerInstallationId,
          matchCount: resolvedContext.matchCount,
        });
        return buildTelephonyWebhookRejectResponse(
          resolvedContext.status === "ambiguous_route" ? 403 : 401,
          resolvedContext.status
        );
      }

      organizationId = resolvedContext.organizationId;
      providerConnectionId = resolvedContext.providerConnectionId;
      providerAccountId = resolvedContext.providerAccountId;
      providerInstallationId = resolvedContext.providerInstallationId;
      providerProfileId = resolvedContext.providerProfileId;
      providerProfileType = resolvedContext.providerProfileType;
      routeKey = resolvedContext.routeKey || routeKey;

      telephonyCredentials = (await (ctx as any).runQuery(
        generatedApi.internal.channels.router.getProviderCredentials,
        {
          organizationId,
          providerId: resolvedContext.providerId,
          providerConnectionId,
          providerAccountId,
          providerInstallationId,
          providerProfileId,
          providerProfileType: providerProfileType || "organization",
          routeKey,
          allowPlatformFallback: false,
        }
      )) as ProviderCredentials | null;
      const signingSecret = resolveTelephonyWebhookSigningSecret(telephonyCredentials);
      const signatureResult = await verifyTelephonyWebhookSignature({
        body,
        signatureHeader,
        timestampHeader,
        signingSecret,
      });

      if (!signatureResult.valid) {
        await recordIngressWebhookEvent({
          ctx,
          organizationId,
          provider: "direct",
          endpoint: "/webhooks/telephony/direct",
          action: "telephony_direct_ingress",
          status: "error",
          message: "Eleven telephony webhook rejected at HTTP boundary",
          errorMessage: signatureResult.reason,
          providerEventId: asNonEmptyString(payload.eventId),
          providerConnectionId,
          providerAccountId,
          routeKey,
          channel: "phone_call",
          metadata: {
            reasonCode: signatureResult.reason,
            providerCallId,
            providerInstallationId,
            providerProfileId,
            providerProfileType,
          },
        });
        return buildTelephonyWebhookRejectResponse(
          401,
          signatureResult.reason || "invalid_signature"
        );
      }
    } else {
      const expectedSecret = asNonEmptyString(process.env.DIRECT_CALL_WEBHOOK_SECRET);
      const presentedSecret =
        asNonEmptyString(request.headers.get("x-direct-call-secret")) ||
        asNonEmptyString(request.headers.get("x-telephony-webhook-secret")) ||
        asNonEmptyString(request.headers.get("authorization"))?.replace(
          /^Bearer\s+/i,
          ""
        );

      if (expectedSecret && presentedSecret !== expectedSecret) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (payloadOrganizationId) {
        organizationId = payloadOrganizationId as Id<"organizations">;
      }
    }

    if (!organizationId || !providerCallId) {
      if (isElevenIngress && organizationId) {
        await recordIngressWebhookEvent({
          ctx,
          organizationId,
          provider: "direct",
          endpoint: "/webhooks/telephony/direct",
          action: "telephony_direct_ingress",
          status: "error",
          message: "Eleven telephony webhook missing required call identity",
          errorMessage: "missing_provider_call_id",
          providerConnectionId,
          providerAccountId,
          routeKey,
          channel: "phone_call",
          metadata: {
            providerInstallationId,
            providerProfileId,
            providerProfileType,
          },
        });
      }
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            isElevenIngress
              ? "providerCallId is required"
              : "organizationId and providerCallId are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let telephonyCallRecordId: string | null = null;
    let telephonyCallRecordEnsureError: string | undefined;
    let runtimeDispatchStatus:
      | "not_attempted"
      | "dispatched"
      | "skipped"
      | "failed" = "not_attempted";
    let runtimeDispatchReasonCode: string | undefined;
    let runtimeDispatchError: string | undefined;
    let elevenRuntimeDecision: ElevenInboundTelephonyRuntimeDecision | null = null;

    if (isElevenIngress) {
      elevenRuntimeDecision = resolveElevenInboundTelephonyRuntimeDecision({
        payload,
        organizationId: String(organizationId),
        providerConnectionId,
        providerAccountId,
        providerInstallationId,
        providerProfileId,
        providerProfileType,
        routeKey,
        telephonyProviderIdentity: asNonEmptyString(
          payload.telephonyProviderIdentity
        ),
        lineIdentifier: resolveTelephonyBindingLineIdentifier(telephonyCredentials),
      });

      if (elevenRuntimeDecision.shouldEnsureCallRecord) {
        const ensureResult = await (ctx as any).runMutation(
          generatedApi.internal.channels.router.ensureTelephonyCallRecord,
          {
            organizationId: organizationId as Id<"organizations">,
            providerId: asNonEmptyString(payload.providerId) || "direct",
            providerCallId,
            providerConversationId: asNonEmptyString(payload.providerConversationId),
            recipientIdentifier: asNonEmptyString(payload.recipientIdentifier),
            callerIdentifier: asNonEmptyString(payload.callerIdentifier),
            routeKey,
            telephonyProviderIdentity:
              asNonEmptyString(payload.telephonyProviderIdentity) ||
              "eleven_telephony",
            direction: "inbound",
            source: "eleven_telephony_webhook_inbound",
          }
        );
        telephonyCallRecordId =
          asNonEmptyString(
            (ensureResult as { callRecordId?: unknown } | null)?.callRecordId
          ) || null;
        telephonyCallRecordEnsureError = asNonEmptyString(
          (ensureResult as { error?: unknown } | null)?.error
        );
      }
    }

    const outcomeMutationResult = await (ctx as any).runMutation(
      generatedApi.internal.channels.router.recordTelephonyWebhookOutcome,
      {
        organizationId: organizationId as Id<"organizations">,
        providerCallId,
        providerConversationId: asNonEmptyString(payload.providerConversationId),
        providerId: asNonEmptyString(payload.providerId),
        outcome:
          asNonEmptyString(payload.outcome) ||
          asNonEmptyString(payload.status),
        disposition: asNonEmptyString(payload.disposition),
        transcriptText:
          asNonEmptyString(payload.transcriptText) ||
          asNonEmptyString(payload.transcript),
        transcriptSegments: Array.isArray(payload.transcriptSegments)
          ? payload.transcriptSegments
          : undefined,
        durationSeconds:
          typeof payload.durationSeconds === "number"
            ? payload.durationSeconds
            : undefined,
        endedAt:
          typeof payload.endedAt === "number" ? payload.endedAt : undefined,
        voicemailDetected: payload.voicemailDetected === true,
        errorMessage:
          asNonEmptyString(payload.errorMessage) ||
          asNonEmptyString(payload.error),
      }
    );
    if (!telephonyCallRecordId) {
      telephonyCallRecordId =
        asNonEmptyString(
          (outcomeMutationResult as { callRecordId?: unknown } | null)?.callRecordId
        ) || null;
    }

    if (isElevenIngress && elevenRuntimeDecision) {
      if (elevenRuntimeDecision.shouldDispatch) {
        if (!telephonyCallRecordId) {
          runtimeDispatchStatus = "skipped";
          runtimeDispatchReasonCode = "missing_call_record_after_ingress";
        } else {
          try {
            await (ctx as any).runAction(
              generatedApi.api.ai.agentExecution.processInboundMessage,
              {
                organizationId: organizationId as Id<"organizations">,
                channel: "phone_call",
                externalContactIdentifier:
                  elevenRuntimeDecision.externalContactIdentifier,
                message: elevenRuntimeDecision.message,
                metadata: {
                  ...elevenRuntimeDecision.metadata,
                  telephonyCallRecordId,
                },
              }
            );
            runtimeDispatchStatus = "dispatched";
          } catch (dispatchError) {
            runtimeDispatchStatus = "failed";
            runtimeDispatchReasonCode = "dispatch_failed";
            runtimeDispatchError = getErrorMessage(dispatchError);
            console.error("[Direct Telephony Webhook] Failed to dispatch inbound runtime", {
              organizationId: String(organizationId),
              providerCallId,
              routeKey,
              telephonyCallRecordId,
              error: runtimeDispatchError,
            });
          }
        }
      } else {
        runtimeDispatchStatus = "skipped";
        runtimeDispatchReasonCode = elevenRuntimeDecision.reasonCode;
      }
    }

    if (isElevenIngress) {
      const payloadOrganizationIdMismatch =
        Boolean(payloadOrganizationId) && payloadOrganizationId !== organizationId;
      const runtimeDispatchWarning =
        runtimeDispatchStatus === "failed" ||
        (runtimeDispatchStatus === "skipped" &&
          runtimeDispatchReasonCode !== "non_inbound_call");
      await recordIngressWebhookEvent({
        ctx,
        organizationId,
        provider: "direct",
        endpoint: "/webhooks/telephony/direct",
        action: "telephony_direct_ingress",
        status:
          payloadOrganizationIdMismatch || runtimeDispatchWarning
            ? "warning"
            : "success",
        message: runtimeDispatchStatus === "failed"
          ? "Eleven telephony webhook accepted but inbound runtime dispatch failed"
          : runtimeDispatchStatus === "skipped" && runtimeDispatchWarning
            ? "Eleven telephony webhook accepted but inbound runtime dispatch was skipped"
            : payloadOrganizationIdMismatch
              ? "Eleven telephony webhook accepted with route-derived org override"
              : "Eleven telephony webhook accepted",
        providerEventId: asNonEmptyString(payload.eventId),
        providerConnectionId,
        providerAccountId,
        routeKey,
        channel: "phone_call",
        metadata: {
          providerCallId,
          providerInstallationId,
          providerProfileId,
          providerProfileType,
          payloadOrganizationId,
          resolvedOrganizationId: String(organizationId),
          payloadOrganizationIdIgnored: Boolean(payloadOrganizationId),
          payloadOrganizationIdMismatch,
          telephonyCallRecordId,
          telephonyCallRecordEnsureError,
          runtimeDispatchStatus,
          runtimeDispatchReasonCode,
          runtimeDispatchError,
          direction: asNonEmptyString(payload.direction),
          callerIdentifier: asNonEmptyString(payload.callerIdentifier),
          recipientIdentifier: asNonEmptyString(payload.recipientIdentifier),
        },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Direct Telephony Webhook] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});

http.route({
  path: "/webhooks/telephony/direct",
  method: "POST",
  handler: directTelephonyWebhookHandler,
});

http.route({
  path: "/telephony-webhook/direct",
  method: "POST",
  handler: directTelephonyWebhookHandler,
});

http.route({
  path: "/webhooks/twilio/voice/inbound",
  method: "POST",
  handler: twilioVoiceInboundWebhookHandler,
});

http.route({
  path: "/webhooks/twilio/voice/status",
  method: "POST",
  handler: twilioVoiceStatusWebhookHandler,
});

// ============================================================================
// TELEGRAM WEBHOOK
// ============================================================================

/**
 * Telegram Bot API webhook endpoint.
 *
 * Flow:
 * 1. Verify x-telegram-bot-api-secret-token at the HTTP boundary
 * 2. Parse Telegram update and identify the authenticated ownership context
 * 3. Resolve org routing (custom bot => authenticated org, platform => resolver)
 * 4. Feed message into agentExecution.processInboundMessage
 */
http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authContext = await resolveTelegramWebhookAuthContext(
        ctx,
        request.headers.get("x-telegram-bot-api-secret-token")
      );
      if (!authContext) {
        return new Response("Unauthorized", { status: 401 });
      }

      const body = await request.text();
      const update = JSON.parse(body);

      // Handle callback_query (inline button taps — soul approve/reject/rollback)
      if (update.callback_query) {
        const cbq = update.callback_query;
        const callbackData = cbq.data || "";
        const cbChatId = String(cbq.message?.chat?.id || "");
        const callbackQueryId = cbq.id;

        if (callbackData.startsWith("soul_approve:") || callbackData.startsWith("soul_reject:")) {
          await (ctx as any).runAction(generatedApi.api.ai.soulEvolution.handleTelegramCallback, {
            callbackData,
            telegramChatId: cbChatId,
            callbackQueryId,
          });
        } else if (callbackData.startsWith("esc_")) {
          // Escalation callbacks (esc_takeover / esc_resume / esc_dismiss)
          const callbackActorExternalId = cbq.from?.id
            ? `telegram:${String(cbq.from.id)}`
            : undefined;
          const callbackActorLabel = (
            cbq.from?.username
              ? [`@${cbq.from.username}`, cbq.from?.first_name, cbq.from?.last_name]
              : [cbq.from?.first_name, cbq.from?.last_name]
          )
            .filter(Boolean)
            .join(" ")
            .trim();
          await (ctx as any).runAction(generatedApi.api.ai.escalation.handleEscalationCallback, {
            callbackData,
            telegramChatId: cbChatId,
            callbackQueryId,
            actorExternalId: callbackActorExternalId,
            actorLabel: callbackActorLabel || undefined,
          });
        } else if (callbackData === "soul_history" || callbackData.startsWith("soul_rollback_")) {
          const callbackOrganizationId =
            authContext.mode === "custom"
              ? authContext.organizationId
              : (await (ctx as any).runQuery(
                  generatedApi.internal.onboarding.telegramResolver.getMappingByChatId,
                  { telegramChatId: cbChatId }
                ))?.organizationId;

          if (callbackOrganizationId) {
            const agent = await (ctx as any).runQuery(
              generatedApi.internal.agentOntology.getActiveAgentForOrg,
              { organizationId: callbackOrganizationId }
            );
            if (agent?._id) {
              await (ctx as any).runAction(generatedApi.internal.ai.soulEvolution.handleSoulHistoryCallback, {
                callbackData,
                telegramChatId: cbChatId,
                callbackQueryId,
                agentId: agent._id,
              });
            }
          }
        }

        return new Response("OK", { status: 200 });
      }

      // Extract message from the Telegram update
      const msg = update.message;
      if (!msg) {
        // Edited message, channel post, etc. — acknowledge silently.
        return new Response("OK", { status: 200 });
      }

      const chat = msg.chat;
      const from = msg.from;
      if (!chat?.id) {
        return new Response("OK", { status: 200 });
      }

      const chatId = String(chat.id);
      const text = msg.text || "";
      const senderName = [from?.first_name, from?.last_name]
        .filter(Boolean)
        .join(" ");

      // Extract /start parameter if present
      let startParam: string | undefined;
      if (text.startsWith("/start ")) {
        startParam = text.slice(7).trim();
      } else if (text === "/start") {
        startParam = undefined; // Plain /start with no param
      }

      let organizationId: Id<"organizations"> | null = null;
      let routeToSystemBot = false;
      let isNew = false;
      let resolvedAgentId: Id<"objects"> | null = null;
      let testingMode = false;
      let isExternalCustomer: boolean | null = null;

      if (authContext.mode === "custom") {
        organizationId = authContext.organizationId;
      } else {
        const resolution = await (ctx as any).runAction(
          generatedApi.api.onboarding.telegramResolver.resolveChatToOrg,
          {
            telegramChatId: chatId,
            senderName: senderName || undefined,
            startParam,
          }
        );

        if (!resolution?.organizationId) {
          console.error("[Telegram Webhook] Could not resolve org for chat", chatId);
          return new Response("OK", { status: 200 });
        }

        organizationId = resolution.organizationId as Id<"organizations">;
        routeToSystemBot = resolution.routeToSystemBot === true;
        isNew = resolution.isNew === true;
        resolvedAgentId = (resolution.resolvedAgentId as Id<"objects"> | undefined) || null;
        testingMode = resolution.testingMode === true;
        isExternalCustomer =
          typeof resolution.isExternalCustomer === "boolean"
            ? resolution.isExternalCustomer
            : null;
      }

      if (!organizationId) {
        return new Response("OK", { status: 200 });
      }

      const telegramMessage = text || "[media message]";
      const telegramRateRequestId = `tg_${chatId}_${Date.now()}`;
      const telegramRateLimit = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.webchatApi.checkRateLimit,
        {
          ipAddress: `telegram:${chatId}`,
          organizationId,
          channel: "telegram",
          deviceFingerprint: chatId,
          sessionToken: chatId,
          userAgent: request.headers.get("user-agent") || "telegram_bot",
          message: telegramMessage,
        }
      );

      if (!telegramRateLimit.allowed || telegramRateLimit.requiresChallenge) {
        await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
          ipAddress: `telegram:${chatId}`,
          organizationId,
          channel: "telegram",
          deviceFingerprint: chatId,
          sessionToken: chatId,
          userAgent: request.headers.get("user-agent") || "telegram_bot",
          message: telegramMessage,
          outcome: telegramRateLimit.allowed ? "throttled" : "blocked",
          challengeState: telegramRateLimit.requiresChallenge ? "required" : "not_required",
          reason: telegramRateLimit.challengeReason || telegramRateLimit.reason || "telegram_velocity",
          riskScore: telegramRateLimit.riskScore,
          requestId: telegramRateRequestId,
          shouldLogSignal: true,
        });

        return new Response("OK", { status: 200 });
      }

      await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.recordRateLimitEntry, {
        ipAddress: `telegram:${chatId}`,
        organizationId,
        channel: "telegram",
        deviceFingerprint: chatId,
        sessionToken: chatId,
        userAgent: request.headers.get("user-agent") || "telegram_bot",
        message: telegramMessage,
        outcome: "allowed",
        challengeState: "not_required",
        reason: telegramRateLimit.reason,
        riskScore: telegramRateLimit.riskScore,
        requestId: telegramRateRequestId,
      });

      // For /start commands with deep link params, resolveChatToOrg handles
      // sending the confirmation. If it's just "/start" with no text to process,
      // send a welcome and return.
      if (
        authContext.mode === "platform" &&
        (text === "/start" || text.startsWith("/start "))
      ) {
        // If this is a new user routed to System Bot, send a greeting
        if (routeToSystemBot && isNew) {
          await (ctx as any).runAction(generatedApi.api.ai.agentExecution.processInboundMessage, {
            organizationId,
            channel: "telegram",
            externalContactIdentifier: chatId,
            message: startParam
              ? `User clicked a /start link with param: ${startParam}`
              : "User just started the bot for the first time.",
            metadata: {
              providerId: "telegram",
              providerMessageId: String(msg.message_id || ""),
              senderName: senderName || undefined,
              isStartCommand: true,
              ...(resolvedAgentId ? { resolvedAgentId } : {}),
              ...(testingMode ? { testingMode: true } : {}),
              ...(isExternalCustomer !== null ? { isExternalCustomer } : {}),
            },
          });

          // The agent pipeline sends its own reply; we respond 200 immediately.
          return new Response("OK", { status: 200 });
        }

        // For returning users hitting /start, just ack — they'll send a real message next
        if (!startParam) {
          return new Response("OK", { status: 200 });
        }
      }

      // Skip non-text messages for now (voice, photo, etc. handled in future)
      const hasMedia = msg.voice || msg.photo || msg.document || msg.audio;
      if (!text && !hasMedia) {
        return new Response("OK", { status: 200 });
      }

      // 2. Feed into agent pipeline
      // Step 13 of the pipeline auto-sends the reply via channels.router → telegramProvider
      await (ctx as any).runAction(generatedApi.api.ai.agentExecution.processInboundMessage, {
        organizationId,
        channel: "telegram",
        externalContactIdentifier: chatId,
        message: telegramMessage,
        metadata: {
          providerId: "telegram",
          providerMessageId: String(msg.message_id || ""),
          senderName: senderName || undefined,
          ...(resolvedAgentId ? { resolvedAgentId } : {}),
          ...(testingMode ? { testingMode: true } : {}),
          ...(isExternalCustomer !== null ? { isExternalCustomer } : {}),
          raw: update,
        },
      });

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("[Telegram Webhook] Error:", error);
      // Always return 200 to Telegram to prevent retries
      return new Response("OK", { status: 200 });
    }
  }),
});

export default http;
