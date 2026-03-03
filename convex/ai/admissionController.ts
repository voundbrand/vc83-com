import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const ADMISSION_DENIAL_CONTRACT_VERSION = "admission_denial_v1" as const;

export type AdmissionIngressChannel =
  | "webchat"
  | "native_guest"
  | "slack"
  | "email"
  | "sms"
  | "whatsapp"
  | "api_test"
  | "unknown";
export const ADMISSION_DENIAL_STAGE_TAXONOMY = [
  "admission",
  "idempotency",
  "runtime",
] as const;
export type AdmissionDecisionStage = (typeof ADMISSION_DENIAL_STAGE_TAXONOMY)[number];

export const ADMISSION_DENIAL_REASON_CATALOG = [
  "agent_not_found",
  "channel_not_allowed",
  "context_invalid",
  "precondition_missing",
  "replay_duplicate",
  "tool_unavailable",
] as const;
export type AdmissionDenialReasonCode = (typeof ADMISSION_DENIAL_REASON_CATALOG)[number];

export type AdmissionIdempotencyClassification =
  | "ingress"
  | "orchestration"
  | "proposal"
  | "commit";

type AdmissionDenialMetadataValue = string | number | boolean | null;

export interface AdmissionDenialV1 {
  contractVersion: typeof ADMISSION_DENIAL_CONTRACT_VERSION;
  denied: true;
  stage: AdmissionDecisionStage;
  reasonCode: AdmissionDenialReasonCode;
  reason: string;
  httpStatusHint: number;
  userSafeMessage: string;
  channel: AdmissionIngressChannel;
  manifestHash?: string;
  idempotency?: {
    scopeKey: string;
    payloadHash: string;
    classification: AdmissionIdempotencyClassification;
  };
  metadata?: Record<string, AdmissionDenialMetadataValue>;
  deniedAt: number;
}

export type AdmissionDecision =
  | { allowed: true }
  | { allowed: false; denial: AdmissionDenialV1 };

function resolveAdmissionReason(reasonCode: AdmissionDenialReasonCode): string {
  switch (reasonCode) {
    case "agent_not_found":
      return "Agent not found for the requested context.";
    case "channel_not_allowed":
      return "Requested ingress channel is not enabled for this agent.";
    case "precondition_missing":
      return "A required runtime precondition is missing.";
    case "replay_duplicate":
      return "A duplicate ingress event was detected.";
    case "tool_unavailable":
      return "A required tool is unavailable in the current runtime scope.";
    case "context_invalid":
    default:
      return "Ingress context is invalid or unresolved.";
  }
}

export function buildAdmissionDenial(args: {
  channel: AdmissionIngressChannel;
  stage?: AdmissionDecisionStage;
  reasonCode: AdmissionDenialReasonCode;
  reason?: string;
  httpStatusHint?: number;
  userSafeMessage?: string;
  manifestHash?: string;
  idempotency?: {
    scopeKey: string;
    payloadHash: string;
    classification: AdmissionIdempotencyClassification;
  };
  metadata?: Record<string, AdmissionDenialMetadataValue>;
  deniedAtMs?: number;
}): AdmissionDenialV1 {
  return {
    contractVersion: ADMISSION_DENIAL_CONTRACT_VERSION,
    denied: true,
    stage: args.stage ?? "admission",
    reasonCode: args.reasonCode,
    reason: args.reason ?? resolveAdmissionReason(args.reasonCode),
    httpStatusHint: args.httpStatusHint ?? 403,
    userSafeMessage:
      args.userSafeMessage
      ?? "We could not process your message right now. Please try again.",
    channel: args.channel,
    manifestHash: args.manifestHash,
    idempotency: args.idempotency,
    metadata: args.metadata,
    deniedAt: args.deniedAtMs ?? Date.now(),
  };
}

export function evaluateIngressAdmission(args: {
  channel: AdmissionIngressChannel;
  contextResolved: boolean;
  agentFound?: boolean;
  channelAllowed?: boolean;
  deniedAtMs?: number;
}): AdmissionDecision {
  if (!args.contextResolved) {
    return {
      allowed: false,
      denial: buildAdmissionDenial({
        channel: args.channel,
        reasonCode: "context_invalid",
        deniedAtMs: args.deniedAtMs,
      }),
    };
  }

  if (args.agentFound === false) {
    return {
      allowed: false,
      denial: buildAdmissionDenial({
        channel: args.channel,
        reasonCode: "agent_not_found",
        deniedAtMs: args.deniedAtMs,
      }),
    };
  }

  if (args.channelAllowed === false) {
    return {
      allowed: false,
      denial: buildAdmissionDenial({
        channel: args.channel,
        reasonCode: "channel_not_allowed",
        deniedAtMs: args.deniedAtMs,
      }),
    };
  }

  return { allowed: true };
}

export const evaluatePublicIngressAdmission = internalQuery({
  args: {
    channel: v.union(v.literal("webchat"), v.literal("native_guest")),
    contextResolved: v.boolean(),
    agentFound: v.optional(v.boolean()),
    channelAllowed: v.optional(v.boolean()),
    deniedAtMs: v.optional(v.number()),
  },
  handler: async (_ctx, args) => evaluateIngressAdmission(args),
});
