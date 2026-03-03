import type { Id } from "../_generated/dataModel";
import type {
  IdempotencyIntentType,
  RuntimeIdempotencyContract,
  TurnQueueConflictLabel,
} from "../schemas/aiSchemas";

export const IDEMPOTENCY_TUPLE_CONTRACT_VERSION = "tcg_idempotency_tuple_v1" as const;

export interface CanonicalIdempotencyTupleContract {
  contractVersion: typeof IDEMPOTENCY_TUPLE_CONTRACT_VERSION;
  ingressKey: string;
  scopeKey: string;
  payloadHash: string;
  intentType: IdempotencyIntentType;
  ttlMs: number;
  tupleHash: string;
}

export interface IdempotencyTupleEvaluation {
  tuple: CanonicalIdempotencyTupleContract | null;
  scopeKey?: string;
  payloadHash?: string;
  replayConflictLabel: TurnQueueConflictLabel;
  replayOutcome: RuntimeIdempotencyContract["replayOutcome"];
  allowScopePayloadHashReplayMatch: boolean;
}

function normalizeTupleString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeMessageForPayloadHash(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1aHashBase36(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function resolveReplayConflictLabel(intentType: IdempotencyIntentType): TurnQueueConflictLabel {
  if (intentType === "proposal") {
    return "replay_duplicate_proposal";
  }
  if (intentType === "commit") {
    return "replay_duplicate_commit";
  }
  return "replay_duplicate_ingress";
}

function resolveReplayOutcome(
  intentType: IdempotencyIntentType
): RuntimeIdempotencyContract["replayOutcome"] {
  return intentType === "proposal" || intentType === "commit"
    ? "replay_previous_result"
    : "duplicate_acknowledged";
}

function resolveScopePayloadHashReplayPolicy(args: {
  channel: string;
  intentType: IdempotencyIntentType;
}): boolean {
  return !(args.channel === "native_guest" && args.intentType !== "proposal" && args.intentType !== "commit");
}

export function buildDeterministicIdempotencyPayloadHash(args: {
  organizationId: Id<"organizations"> | string;
  message: string;
  metadata: Record<string, unknown>;
  workflowKey: string;
  collaboration?: {
    lineageId?: string;
    threadId?: string;
  };
}): string {
  const providerEventId = normalizeTupleString(
    args.metadata.providerEventId
      ?? args.metadata.eventId
      ?? args.metadata.providerMessageId
  ) ?? "";
  const seed = [
    normalizeTupleString(String(args.organizationId)) ?? "org:unknown",
    normalizeTupleString(args.workflowKey) ?? "message_ingress",
    normalizeTupleString(args.collaboration?.lineageId) ?? "",
    normalizeTupleString(args.collaboration?.threadId) ?? "",
    providerEventId,
    normalizeMessageForPayloadHash(args.message),
  ].join(":");
  return fnv1aHashBase36(seed);
}

export function buildCanonicalIdempotencyTupleContract(args: {
  ingressKey: string;
  scopeKey: string;
  payloadHash: string;
  intentType: IdempotencyIntentType;
  ttlMs: number;
}): CanonicalIdempotencyTupleContract {
  const normalizedTuple = {
    ingressKey: normalizeTupleString(args.ingressKey) ?? "ingress:unknown",
    scopeKey: normalizeTupleString(args.scopeKey) ?? "scope:unknown",
    payloadHash: normalizeTupleString(args.payloadHash) ?? "payload:unknown",
    intentType: args.intentType,
    ttlMs: Math.max(1, Math.floor(args.ttlMs)),
  };

  return {
    contractVersion: IDEMPOTENCY_TUPLE_CONTRACT_VERSION,
    ...normalizedTuple,
    tupleHash: fnv1aHashBase36(stableStringify(normalizedTuple)),
  };
}

export function evaluateInboundIdempotencyTuple(args: {
  channel: string;
  ingressKey: string;
  idempotencyContract?: RuntimeIdempotencyContract | null;
}): IdempotencyTupleEvaluation {
  const intentType = args.idempotencyContract?.intentType ?? "ingress";
  const scopeKey = normalizeTupleString(args.idempotencyContract?.scopeKey);
  const payloadHash = normalizeTupleString(args.idempotencyContract?.payloadHash);
  const ttlMs = args.idempotencyContract?.ttlMs;

  return {
    tuple:
      scopeKey && payloadHash && typeof ttlMs === "number" && Number.isFinite(ttlMs) && ttlMs > 0
        ? buildCanonicalIdempotencyTupleContract({
            ingressKey: args.ingressKey,
            scopeKey,
            payloadHash,
            intentType,
            ttlMs,
          })
        : null,
    scopeKey,
    payloadHash,
    replayConflictLabel: resolveReplayConflictLabel(intentType),
    replayOutcome: resolveReplayOutcome(intentType),
    allowScopePayloadHashReplayMatch: resolveScopePayloadHashReplayPolicy({
      channel: args.channel,
      intentType,
    }),
  };
}

