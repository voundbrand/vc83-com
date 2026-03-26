import type { Id } from "../../../_generated/dataModel";
import {
  MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  resolveMobileNodeCommandPolicyDecision,
  resolveMobileSourceAttestationContract,
  type MobileNodeCommandPolicyDecision,
  type MobileSourceAttestationContract,
} from "../../mobileRuntimeHardening";
import {
  ORG_BOOKING_CONCIERGE_TOOL_ACTION,
  isBookingConciergeToolAction,
} from "../../tools/bookingTool";
import { DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY } from "./runtimeModule";

const MEETING_CONCIERGE_CONFIRM_PATTERN =
  /\b(confirm|book it|book this|go ahead|proceed|schedule it|yes[,]?\s+book|execute now)\b/i;
const MEETING_CONCIERGE_NEGATION_PATTERN =
  /\b(don't|do not|not yet|cancel|stop|hold off)\b/i;
const MEETING_CONCIERGE_PREVIEW_PATTERN =
  /\b(preview|draft|show me|propose|plan first|before booking)\b/i;
const MEETING_CONCIERGE_EMAIL_PATTERN =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const MEETING_CONCIERGE_PHONE_PATTERN =
  /(?:\+?\d{1,2}[\s-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/;

const MOBILE_TRANSPORT_SESSION_ATTESTATION_CONTRACT_VERSION =
  "tcg_mobile_transport_session_attestation_v1" as const;

type MobileTransportSessionAttestationStatus =
  | "not_required"
  | "verified"
  | "failed";

interface MobileTransportSessionAttestationContract {
  contractVersion: typeof MOBILE_TRANSPORT_SESSION_ATTESTATION_CONTRACT_VERSION;
  required: boolean;
  status: MobileTransportSessionAttestationStatus;
  verified: boolean;
  reasonCodes: string[];
  canonicalLiveSessionId?: string;
  observedLiveSessionIds: string[];
  transportMode?: string;
}

interface MeetingConciergeExtractedPayload {
  personName?: string;
  personEmail?: string;
  personPhone?: string;
  company?: string;
  meetingTitle?: string;
  meetingDurationMinutes: number;
  schedulingWindowStart: string;
  schedulingWindowEnd: string;
  confirmationChannel: "auto" | "sms" | "email" | "none";
  confirmationRecipient?: string;
  conciergeIdempotencyKey: string;
}

export interface InboundMeetingConciergeIntent {
  enabled: boolean;
  runtimeModuleKey?: string;
  extractedPayloadReady: boolean;
  autoTriggerPreview: boolean;
  explicitConfirmDetected: boolean;
  previewIntentDetected: boolean;
  missingRequiredFields: string[];
  fallbackReasons: string[];
  ingestLatencyMs?: number;
  sourceAttestation: MobileSourceAttestationContract;
  transportSessionAttestation: MobileTransportSessionAttestationContract;
  commandPolicy: MobileNodeCommandPolicyDecision;
  payload?: MeetingConciergeExtractedPayload;
}

function normalizeInboundRouteString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function firstInboundString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const normalized = normalizeInboundRouteString(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function normalizeInboundTimestamp(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.floor(value);
}

function firstInboundTimestamp(...values: unknown[]): number | undefined {
  for (const value of values) {
    const normalized = normalizeInboundTimestamp(value);
    if (typeof normalized === "number") {
      return normalized;
    }
  }
  return undefined;
}

function normalizeInboundObjectValue(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeInboundSessionToken(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeInboundSourceClassToken(value: unknown): string | undefined {
  const normalized = normalizeInboundSessionToken(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized.replace(/[^a-z0-9._:-]+/g, "_");
}

function isInboundMetaGlassesSourceClass(sourceClass: string | undefined): boolean {
  if (!sourceClass) {
    return false;
  }
  return sourceClass === "meta_glasses" || sourceClass === "glasses_stream_meta";
}

function resolveInboundTransportSessionAttestationContract(args: {
  metadata: Record<string, unknown>;
}): MobileTransportSessionAttestationContract {
  const cameraRuntime = normalizeInboundObjectValue(args.metadata.cameraRuntime);
  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const conversationRuntime = normalizeInboundObjectValue(args.metadata.conversationRuntime);
  const transportRuntime = normalizeInboundObjectValue(args.metadata.transportRuntime);
  const avObservability = normalizeInboundObjectValue(args.metadata.avObservability);
  const transportObservability = normalizeInboundObjectValue(
    transportRuntime?.observability,
  );

  const sessionCandidates = [
    normalizeInboundSessionToken(args.metadata.liveSessionId),
    normalizeInboundSessionToken(args.metadata.realtimeSessionId),
    normalizeInboundSessionToken(cameraRuntime?.liveSessionId),
    normalizeInboundSessionToken(voiceRuntime?.liveSessionId),
    normalizeInboundSessionToken(transportRuntime?.liveSessionId),
    normalizeInboundSessionToken(transportObservability?.liveSessionId),
    normalizeInboundSessionToken(avObservability?.liveSessionId),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const observedLiveSessionIds = Array.from(new Set(sessionCandidates));
  const canonicalLiveSessionId = observedLiveSessionIds[0];

  const cameraSourceClass = normalizeInboundSourceClassToken(
    firstInboundString(cameraRuntime?.sourceClass, cameraRuntime?.sourceId),
  );
  const voiceSourceClass = normalizeInboundSourceClassToken(
    firstInboundString(voiceRuntime?.sourceClass, voiceRuntime?.sourceId),
  );
  const metaSourceDetected =
    isInboundMetaGlassesSourceClass(cameraSourceClass)
    || isInboundMetaGlassesSourceClass(voiceSourceClass)
    || normalizeInboundSourceClassToken(args.metadata.sourceMode) === "meta_glasses"
    || normalizeInboundSourceClassToken(conversationRuntime?.sourceMode) === "meta_glasses"
    || normalizeInboundSourceClassToken(conversationRuntime?.requestedEyesSource) === "meta_glasses";
  const required = metaSourceDetected || observedLiveSessionIds.length > 0;

  if (!required) {
    return {
      contractVersion: MOBILE_TRANSPORT_SESSION_ATTESTATION_CONTRACT_VERSION,
      required: false,
      status: "not_required",
      verified: true,
      reasonCodes: [],
      observedLiveSessionIds: [],
    };
  }

  const reasonCodes = new Set<string>();
  if (observedLiveSessionIds.length > 1) {
    reasonCodes.add("live_session_id_mismatch");
  }

  const transportModeRaw = firstInboundString(
    transportRuntime?.transport,
    transportRuntime?.mode,
    transportObservability?.transport,
    transportObservability?.mode,
    cameraRuntime?.transport,
    voiceRuntime?.transport,
  );
  const transportMode = transportModeRaw?.trim().toLowerCase();
  if (metaSourceDetected && transportMode !== "webrtc") {
    reasonCodes.add("meta_transport_must_be_webrtc");
  }

  const providerToken = firstInboundString(
    cameraRuntime?.providerId,
    voiceRuntime?.providerId,
  )?.toLowerCase();
  if (metaSourceDetected && (!providerToken || !providerToken.startsWith("meta_"))) {
    reasonCodes.add("meta_provider_contract_required");
  }

  const relayPolicy = firstInboundString(
    cameraRuntime?.relayPolicy,
    normalizeInboundObjectValue(cameraRuntime?.metadata)?.relayPolicy,
    args.metadata.relayPolicy,
  );
  if (metaSourceDetected && relayPolicy !== "meta_dat_webrtc_required") {
    reasonCodes.add("meta_relay_policy_marker_missing");
  }

  const verified = reasonCodes.size === 0;
  return {
    contractVersion: MOBILE_TRANSPORT_SESSION_ATTESTATION_CONTRACT_VERSION,
    required: true,
    status: verified ? "verified" : "failed",
    verified,
    reasonCodes: Array.from(reasonCodes).sort(),
    canonicalLiveSessionId,
    observedLiveSessionIds,
    transportMode,
  };
}

function hashRuntimeSeed(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function normalizeConciergeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeConciergeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function collectMeetingConciergeTextCandidates(args: {
  metadata: Record<string, unknown>;
  message: string;
}): string[] {
  const segments = new Set<string>();
  const push = (value: unknown) => {
    const normalized = normalizeConciergeOptionalString(value);
    if (normalized) {
      segments.add(normalized);
    }
  };

  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const cameraRuntime = normalizeInboundObjectValue(args.metadata.cameraRuntime);
  const concierge = normalizeInboundObjectValue(args.metadata.concierge);

  push(args.message);
  push(concierge?.notes);
  push(concierge?.meetingTitle);
  push(concierge?.personName);
  push(concierge?.company);
  push(voiceRuntime?.transcript);
  push(voiceRuntime?.text);
  push(voiceRuntime?.finalTranscript);
  push(voiceRuntime?.latestTranscript);
  push(cameraRuntime?.detectedText);
  push(cameraRuntime?.ocrText);
  push(cameraRuntime?.sceneSummary);

  const attachments = Array.isArray(args.metadata.attachments)
    ? args.metadata.attachments
    : [];
  for (const attachment of attachments.slice(0, 8)) {
    if (!attachment || typeof attachment !== "object") {
      continue;
    }
    const record = attachment as Record<string, unknown>;
    push(record.name);
    push(record.description);
    push(record.caption);
  }

  return Array.from(segments);
}

function resolveMeetingConciergeWindow(args: {
  metadata: Record<string, unknown>;
  now: number;
}): {
  schedulingWindowStart: string;
  schedulingWindowEnd: string;
  fallbackApplied: boolean;
} {
  const concierge = normalizeInboundObjectValue(args.metadata.concierge);
  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const cameraRuntime = normalizeInboundObjectValue(args.metadata.cameraRuntime);

  const explicitStart = firstInboundString(
    concierge?.schedulingWindowStart,
    voiceRuntime?.schedulingWindowStart,
    cameraRuntime?.schedulingWindowStart,
    args.metadata.schedulingWindowStart,
  );
  const explicitEnd = firstInboundString(
    concierge?.schedulingWindowEnd,
    voiceRuntime?.schedulingWindowEnd,
    cameraRuntime?.schedulingWindowEnd,
    args.metadata.schedulingWindowEnd,
  );

  if (explicitStart && explicitEnd) {
    return {
      schedulingWindowStart: explicitStart,
      schedulingWindowEnd: explicitEnd,
      fallbackApplied: false,
    };
  }

  const windowStart = args.now + 30 * 60 * 1000;
  const windowEnd = args.now + 7 * 24 * 60 * 60 * 1000;
  return {
    schedulingWindowStart: new Date(windowStart).toISOString(),
    schedulingWindowEnd: new Date(windowEnd).toISOString(),
    fallbackApplied: true,
  };
}

function extractMeetingConciergeDurationMinutes(args: {
  metadata: Record<string, unknown>;
  textCandidates: string[];
}): number {
  const concierge = normalizeInboundObjectValue(args.metadata.concierge);
  const explicitDuration = normalizeConciergeNumber(concierge?.meetingDurationMinutes);
  if (typeof explicitDuration === "number" && explicitDuration > 0) {
    return Math.max(15, Math.min(180, Math.round(explicitDuration)));
  }
  for (const candidate of args.textCandidates) {
    const match = candidate.match(/(\d{1,3})\s*(minutes?|mins?|hours?|hrs?)/i);
    if (!match) {
      continue;
    }
    const quantity = Number.parseInt(match[1], 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }
    const unit = match[2].toLowerCase();
    const minutes = unit.startsWith("hour") || unit.startsWith("hr")
      ? quantity * 60
      : quantity;
    return Math.max(15, Math.min(180, minutes));
  }
  return 30;
}

function resolveMeetingConciergeIngestLatencyMs(args: {
  metadata: Record<string, unknown>;
  now: number;
}): number | undefined {
  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const cameraRuntime = normalizeInboundObjectValue(args.metadata.cameraRuntime);
  const observedAt = firstInboundTimestamp(
    args.metadata.timestamp,
    args.metadata.receivedAt,
    args.metadata.providerTimestamp,
    voiceRuntime?.capturedAt,
    voiceRuntime?.stoppedAt,
    cameraRuntime?.lastFrameCapturedAt,
    cameraRuntime?.capturedAt,
  );
  if (typeof observedAt !== "number" || observedAt > args.now) {
    return undefined;
  }
  return Math.max(0, args.now - observedAt);
}

export function resolveInboundMeetingConciergeIntent(args: {
  organizationId: Id<"organizations">;
  channel: string;
  externalContactIdentifier?: string;
  metadata: Record<string, unknown>;
  message: string;
  runtimeModuleKey?: string | null;
  now?: number;
}): InboundMeetingConciergeIntent {
  const now = typeof args.now === "number" ? args.now : Date.now();
  const sourceAttestation = resolveMobileSourceAttestationContract({
    metadata: args.metadata,
    nowMs: now,
  });
  const transportSessionAttestation = resolveInboundTransportSessionAttestationContract({
    metadata: args.metadata,
  });
  const runtimeModuleKey = normalizeConciergeOptionalString(args.runtimeModuleKey);
  const derTerminmacherRuntimeActive =
    runtimeModuleKey === DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY;
  const liveSignal = Boolean(
    firstInboundString(args.metadata.liveSessionId)
    || normalizeInboundObjectValue(args.metadata.cameraRuntime)
    || normalizeInboundObjectValue(args.metadata.voiceRuntime),
  );
  const enabled = (
    args.channel === "desktop"
    || (derTerminmacherRuntimeActive && args.channel === "native_guest")
  ) && liveSignal;
  const messageLower = args.message.toLowerCase();
  const explicitConfirmDetected =
    MEETING_CONCIERGE_CONFIRM_PATTERN.test(messageLower)
    && !MEETING_CONCIERGE_NEGATION_PATTERN.test(messageLower);
  const previewIntentDetected =
    MEETING_CONCIERGE_PREVIEW_PATTERN.test(messageLower) || !explicitConfirmDetected;
  const commandPolicy = resolveMobileNodeCommandPolicyDecision({
    metadata: args.metadata,
    requiredCommands: [
      "assemble_concierge_payload",
      "preview_meeting_concierge",
      ...(explicitConfirmDetected ? ["execute_meeting_concierge"] : []),
    ],
    enforceForLiveIngress: enabled,
  });
  const cameraRuntimeRaw = normalizeInboundObjectValue(args.metadata.cameraRuntime);
  const voiceRuntimeRaw = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const conversationRuntimeRaw = normalizeInboundObjectValue(args.metadata.conversationRuntime);
  const avObservabilityRaw = normalizeInboundObjectValue(args.metadata.avObservability);
  const conversationSourceModeToken = firstInboundString(
    conversationRuntimeRaw?.sourceMode,
    conversationRuntimeRaw?.requestedEyesSource,
    conversationRuntimeRaw?.mode,
  )?.toLowerCase();
  const sourceModeToken = firstInboundString(
    args.metadata.sourceMode,
    conversationSourceModeToken,
    avObservabilityRaw?.sourceMode,
    cameraRuntimeRaw?.sourceMode,
    voiceRuntimeRaw?.sourceMode,
  )?.toLowerCase();
  const metaSourceRequested =
    sourceModeToken === "meta_glasses"
    || firstInboundString(cameraRuntimeRaw?.sourceClass)?.toLowerCase() === "meta_glasses"
    || firstInboundString(voiceRuntimeRaw?.sourceClass)?.toLowerCase() === "meta_glasses";
  const metaSourceVerified =
    Array.isArray(sourceAttestation.evidences)
    && sourceAttestation.evidences.some(
      (evidence) =>
        evidence.sourceClass === "meta_glasses"
        && evidence.verificationStatus === "verified",
    );
  if (!enabled) {
    return {
      enabled: false,
      runtimeModuleKey,
      extractedPayloadReady: false,
      autoTriggerPreview: false,
      explicitConfirmDetected,
      previewIntentDetected,
      missingRequiredFields: [],
      fallbackReasons: [],
      sourceAttestation,
      transportSessionAttestation,
      commandPolicy,
    };
  }

  const sourceMetadataTrusted =
    !sourceAttestation.verificationRequired || sourceAttestation.verified;
  const transportSessionTrusted =
    !transportSessionAttestation.required || transportSessionAttestation.verified;
  const metaSourceTrusted = !metaSourceRequested || metaSourceVerified;
  const trustedSourceContext =
    sourceMetadataTrusted && transportSessionTrusted && metaSourceTrusted;
  const metadataForExtraction = trustedSourceContext
    ? args.metadata
    : {
      ...args.metadata,
      cameraRuntime: undefined,
      voiceRuntime: undefined,
    };
  const textCandidates = collectMeetingConciergeTextCandidates({
    metadata: metadataForExtraction,
    message: args.message,
  });
  const normalizedCorpus = textCandidates.join("\n");
  const concierge = normalizeInboundObjectValue(metadataForExtraction.concierge);
  const voiceRuntime = normalizeInboundObjectValue(metadataForExtraction.voiceRuntime);

  const emailMatch = normalizedCorpus.match(MEETING_CONCIERGE_EMAIL_PATTERN);
  const phoneMatch = normalizedCorpus.match(MEETING_CONCIERGE_PHONE_PATTERN);
  const personNamePattern =
    normalizedCorpus.match(/\b(?:my name is|this is|i am)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/i)
    || normalizedCorpus.match(/\bmeet(?:ing)?\s+with\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/i);
  const companyPattern =
    normalizedCorpus.match(/\b(?:at|from)\s+([A-Z][A-Za-z0-9&.\- ]{2,40})/);

  const personEmail =
    normalizeConciergeOptionalString(concierge?.personEmail)
    || normalizeConciergeOptionalString(voiceRuntime?.personEmail)
    || (emailMatch ? emailMatch[0].toLowerCase() : undefined);
  const phoneCallIdentity =
    args.channel === "phone_call"
      ? normalizeConciergeOptionalString(args.externalContactIdentifier)
      : undefined;
  const personPhone =
    normalizeConciergeOptionalString(concierge?.personPhone)
    || normalizeConciergeOptionalString(voiceRuntime?.personPhone)
    || phoneCallIdentity
    || (phoneMatch ? phoneMatch[0] : undefined);
  const personName =
    normalizeConciergeOptionalString(concierge?.personName)
    || normalizeConciergeOptionalString(voiceRuntime?.personName)
    || (personNamePattern ? personNamePattern[1].trim() : undefined);
  const company =
    normalizeConciergeOptionalString(concierge?.company)
    || normalizeConciergeOptionalString(voiceRuntime?.company)
    || (companyPattern ? companyPattern[1].trim() : undefined);

  const { schedulingWindowStart, schedulingWindowEnd, fallbackApplied } =
    resolveMeetingConciergeWindow({
      metadata: metadataForExtraction,
      now,
    });
  const meetingDurationMinutes = extractMeetingConciergeDurationMinutes({
    metadata: metadataForExtraction,
    textCandidates,
  });
  const meetingTitle =
    normalizeConciergeOptionalString(concierge?.meetingTitle)
    || normalizeConciergeOptionalString(voiceRuntime?.meetingTitle)
    || (personName ? `Meeting with ${personName}` : undefined);

  const missingRequiredFields: string[] = [];
  if (args.channel === "phone_call") {
    if (!personEmail && !personPhone) {
      missingRequiredFields.push("personPhone");
    }
  } else if (!personEmail) {
    missingRequiredFields.push("personEmail");
  }

  const fallbackReasons: string[] = [];
  if (fallbackApplied) {
    fallbackReasons.push("scheduling_window_defaulted_7d");
  }
  if (args.channel === "phone_call") {
    if (!personEmail && !personPhone) {
      fallbackReasons.push("missing_person_phone");
    } else if (!personEmail && personPhone) {
      fallbackReasons.push("phone_safe_identity_phone_only");
    }
  } else if (!personEmail) {
    fallbackReasons.push("missing_person_email");
  }
  if (!sourceMetadataTrusted) {
    fallbackReasons.push("source_metadata_quarantined");
    for (const reasonCode of sourceAttestation.reasonCodes) {
      fallbackReasons.push(`source_attestation:${reasonCode}`);
    }
  }
  if (!transportSessionTrusted) {
    fallbackReasons.push("transport_session_metadata_quarantined");
    for (const reasonCode of transportSessionAttestation.reasonCodes) {
      fallbackReasons.push(`transport_session_attestation:${reasonCode}`);
    }
  }
  if (!metaSourceTrusted) {
    fallbackReasons.push("meta_source_attestation_missing_or_unverified");
  }
  if (!commandPolicy.allowed) {
    fallbackReasons.push(`command_policy_blocked:${commandPolicy.reasonCode}`);
  }
  if (derTerminmacherRuntimeActive) {
    if (!normalizeInboundObjectValue(args.metadata.voiceRuntime)) {
      fallbackReasons.push("der_terminmacher_assumption_voice_missing");
    }
    if (!normalizeInboundObjectValue(args.metadata.cameraRuntime)) {
      fallbackReasons.push("der_terminmacher_assumption_vision_missing");
    }
  }

  const payloadReady =
    missingRequiredFields.length === 0
    && trustedSourceContext
    && commandPolicy.allowed;
  const idempotencySeed = [
    args.organizationId,
    firstInboundString(args.metadata.liveSessionId) ?? "live",
    personEmail ?? personPhone ?? "unknown",
    schedulingWindowStart,
    schedulingWindowEnd,
  ].join(":");

  return {
    enabled: true,
    runtimeModuleKey,
    extractedPayloadReady: payloadReady,
    autoTriggerPreview: payloadReady && commandPolicy.allowed,
    explicitConfirmDetected,
    previewIntentDetected,
    missingRequiredFields,
    fallbackReasons,
    sourceAttestation,
    transportSessionAttestation,
    commandPolicy,
    ingestLatencyMs: resolveMeetingConciergeIngestLatencyMs({
      metadata: metadataForExtraction,
      now,
    }),
    payload: payloadReady
      ? {
        personName,
        personEmail,
        personPhone,
        company,
        meetingTitle,
        meetingDurationMinutes,
        schedulingWindowStart,
        schedulingWindowEnd,
        confirmationChannel: personPhone ? "sms" : personEmail ? "email" : "none",
        confirmationRecipient: personPhone ?? personEmail,
        conciergeIdempotencyKey: `mobile_concierge:${hashRuntimeSeed(idempotencySeed)}`,
      }
      : undefined,
  };
}

function hasMeetingConciergeToolCall(args: {
  toolCalls: Array<Record<string, unknown>>;
  mode?: "preview" | "execute";
}): boolean {
  const targetMode = args.mode;
  return args.toolCalls.some((toolCall) => {
    const toolName = normalizeConciergeOptionalString(
      (toolCall.function as Record<string, unknown> | undefined)?.name,
    );
    if (toolName !== "manage_bookings") {
      return false;
    }
    const rawArguments = (toolCall.function as Record<string, unknown> | undefined)?.arguments;
    if (typeof rawArguments !== "string") {
      return false;
    }
    try {
      const parsed = JSON.parse(rawArguments) as Record<string, unknown>;
      if (!isBookingConciergeToolAction(normalizeConciergeOptionalString(parsed.action))) {
        return false;
      }
      if (!targetMode) {
        return true;
      }
      return normalizeConciergeOptionalString(parsed.mode) === targetMode;
    } catch {
      return false;
    }
  });
}

export function injectAutoPreviewMeetingConciergeToolCall(args: {
  toolCalls: Array<Record<string, unknown>>;
  meetingConciergeIntent: InboundMeetingConciergeIntent;
  now?: number;
}): Array<Record<string, unknown>> {
  if (
    hasMeetingConciergeToolCall({
      toolCalls: args.toolCalls,
      mode: "preview",
    })
  ) {
    return args.toolCalls;
  }

  const previewToolCall = buildAutoPreviewMeetingConciergeToolCall(
    args.meetingConciergeIntent,
    args.now,
  );
  if (!previewToolCall) {
    return args.toolCalls;
  }

  // Prepend to enforce preview-first ordering when model emitted execute directly.
  return [previewToolCall, ...args.toolCalls];
}

function buildAutoPreviewMeetingConciergeToolCall(
  intent: InboundMeetingConciergeIntent,
  now?: number,
): Record<string, unknown> | null {
  if (!intent.autoTriggerPreview || !intent.payload) {
    return null;
  }
  const timestamp = typeof now === "number" ? now : Date.now();

  return {
    id: `mobile_concierge_preview_${timestamp.toString(36)}`,
    type: "function",
    function: {
      name: "manage_bookings",
      arguments: JSON.stringify({
        action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
        mode: "preview",
        ...intent.payload,
      }),
    },
  };
}
