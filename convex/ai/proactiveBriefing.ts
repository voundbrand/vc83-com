import type { ConversationContinuityTelemetry } from "./conversations";

export const MORNING_BRIEFING_CONTRACT_VERSION =
  "yai_morning_briefing_v1" as const;

export type MorningBriefingPrimaryChannel =
  | "desktop"
  | "iphone"
  | "android"
  | "webchat"
  | "voice";

export type MorningBriefingPrivacyMode =
  | "cloud"
  | "prefer_local"
  | "local_only";

export type MorningBriefingTrustGate = "allow" | "soft_gate" | "hard_gate";
export type MorningBriefingIntent = "read_only" | "proposal" | "commit";
export type MorningBriefingDecision =
  | "deliver_read_only"
  | "proposal_required"
  | "blocked"
  | "commit_allowed";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LOCAL_HOUR = 7;
const DEFAULT_LOCAL_MINUTE = 0;
const DEFAULT_WINDOW_MINUTES = 30;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampInteger(value: number, min: number, max: number): number {
  const rounded = Math.trunc(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export interface MorningBriefingWindowInput {
  utcOffsetMinutes: number;
  referenceTimestamp?: number;
  localHour?: number;
  localMinute?: number;
  windowDurationMinutes?: number;
}

export interface MorningBriefingWindow {
  contractVersion: typeof MORNING_BRIEFING_CONTRACT_VERSION;
  utcOffsetMinutes: number;
  localHour: number;
  localMinute: number;
  windowDurationMinutes: number;
  windowStartAt: number;
  windowEndAt: number;
}

/**
 * Compute the next local morning briefing window in UTC time.
 */
export function computeNextMorningBriefingWindow(
  input: MorningBriefingWindowInput
): MorningBriefingWindow {
  if (!isFiniteNumber(input.utcOffsetMinutes)) {
    throw new Error("Morning briefing window requires numeric utcOffsetMinutes.");
  }

  const utcOffsetMinutes = clampInteger(input.utcOffsetMinutes, -720, 840);
  const localHour = clampInteger(
    input.localHour ?? DEFAULT_LOCAL_HOUR,
    0,
    23
  );
  const localMinute = clampInteger(
    input.localMinute ?? DEFAULT_LOCAL_MINUTE,
    0,
    59
  );
  const windowDurationMinutes = clampInteger(
    input.windowDurationMinutes ?? DEFAULT_WINDOW_MINUTES,
    5,
    180
  );
  const referenceTimestamp =
    isFiniteNumber(input.referenceTimestamp) && input.referenceTimestamp > 0
      ? Math.trunc(input.referenceTimestamp)
      : Date.now();

  const offsetMs = utcOffsetMinutes * 60 * 1000;
  const localReferenceMs = referenceTimestamp + offsetMs;
  const localReference = new Date(localReferenceMs);
  let localWindowStartMs = Date.UTC(
    localReference.getUTCFullYear(),
    localReference.getUTCMonth(),
    localReference.getUTCDate(),
    localHour,
    localMinute,
    0,
    0
  );
  if (localWindowStartMs <= localReferenceMs) {
    localWindowStartMs += DAY_MS;
  }

  const windowStartAt = localWindowStartMs - offsetMs;
  const windowEndAt = windowStartAt + windowDurationMinutes * 60 * 1000;

  return {
    contractVersion: MORNING_BRIEFING_CONTRACT_VERSION,
    utcOffsetMinutes,
    localHour,
    localMinute,
    windowDurationMinutes,
    windowStartAt,
    windowEndAt,
  };
}

export interface MorningBriefingTemplateInput {
  localDateLabel: string;
  primaryChannel: MorningBriefingPrimaryChannel;
  privacyMode: MorningBriefingPrivacyMode;
  continuity: ConversationContinuityTelemetry;
  highlights: string[];
  pendingApprovals?: number;
  pendingProposals?: number;
  generatedAt?: number;
}

export interface MorningBriefingTemplateSection {
  id: "priorities" | "continuity" | "governance" | "privacy";
  title: string;
  lines: string[];
}

export interface MorningBriefingTemplate {
  contractVersion: typeof MORNING_BRIEFING_CONTRACT_VERSION;
  generatedAt: number;
  primaryChannel: MorningBriefingPrimaryChannel;
  title: string;
  summary: string;
  sections: MorningBriefingTemplateSection[];
}

export function buildMorningBriefingTemplate(
  input: MorningBriefingTemplateInput
): MorningBriefingTemplate {
  const localDateLabel =
    toNonEmptyString(input.localDateLabel) || "Today";
  const generatedAt =
    isFiniteNumber(input.generatedAt) && input.generatedAt > 0
      ? Math.trunc(input.generatedAt)
      : Date.now();
  const highlights = input.highlights
    .map((item) => toNonEmptyString(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, 6);
  if (highlights.length === 0) {
    highlights.push(
      "No urgent updates were detected since your last conversation window."
    );
  }

  const pendingApprovals = Math.max(
    0,
    Math.trunc(input.pendingApprovals ?? 0)
  );
  const pendingProposals = Math.max(
    0,
    Math.trunc(input.pendingProposals ?? 0)
  );
  const privacyLine =
    input.privacyMode === "cloud"
      ? "Cloud mode enabled: approved commits may execute through native tool gates."
      : "Local privacy mode active: all action suggestions remain proposal-only until approved cloud execution exists.";
  const crossChannelLine = input.continuity.crossChannelContinuation
    ? `Cross-channel continuity restored from ${input.continuity.previousIngressSurface} to ${input.continuity.ingressSurface}.`
    : `Continuity remains on ${input.continuity.ingressSurface} without channel handoff drift.`;

  return {
    contractVersion: MORNING_BRIEFING_CONTRACT_VERSION,
    generatedAt,
    primaryChannel: input.primaryChannel,
    title: `${localDateLabel} briefing`,
    summary:
      `Primary channel: ${input.primaryChannel}. ` +
      `Route continuity key: ${input.continuity.continuityKey}.`,
    sections: [
      {
        id: "priorities",
        title: "Top priorities",
        lines: highlights,
      },
      {
        id: "continuity",
        title: "Conversation continuity",
        lines: [
          crossChannelLine,
          `Lineage: ${input.continuity.lineageId ?? "not_set"}.`,
          `Replay status: ${input.continuity.idempotency.replayOutcome}.`,
        ],
      },
      {
        id: "governance",
        title: "Approvals and proposals",
        lines: [
          `Pending approvals: ${pendingApprovals}.`,
          `Pending proposals: ${pendingProposals}.`,
        ],
      },
      {
        id: "privacy",
        title: "Privacy boundary",
        lines: [privacyLine],
      },
    ],
  };
}

export interface MorningBriefingMutationPolicyInput {
  privacyMode: MorningBriefingPrivacyMode;
  trustGate: MorningBriefingTrustGate;
  mutatingActionRequested: boolean;
  requestedIntent?: MorningBriefingIntent;
  approvalTokenId?: string;
}

export interface MorningBriefingMutationPolicyDecision {
  contractVersion: typeof MORNING_BRIEFING_CONTRACT_VERSION;
  decision: MorningBriefingDecision;
  enforcedIntent: MorningBriefingIntent;
  requiresApproval: boolean;
  approvalTokenAccepted: boolean;
  shouldEmitTrustEvent: boolean;
  trustEventName:
    | "trust.guardrail.policy_evaluated.v1"
    | "trust.guardrail.policy_blocked.v1";
  reason:
    | "read_only_briefing"
    | "trust_hard_gate"
    | "trust_soft_gate_requires_review"
    | "privacy_local_requires_proposal"
    | "approval_token_required"
    | "approval_token_present";
}

/**
 * Fail-closed policy contract for morning briefing initiated actions.
 */
export function evaluateMorningBriefingMutationPolicy(
  input: MorningBriefingMutationPolicyInput
): MorningBriefingMutationPolicyDecision {
  const approvalTokenId = toNonEmptyString(input.approvalTokenId);
  const approvalTokenAccepted = typeof approvalTokenId === "string";
  const requestedIntent = input.requestedIntent ?? "read_only";

  if (!input.mutatingActionRequested || requestedIntent === "read_only") {
    return {
      contractVersion: MORNING_BRIEFING_CONTRACT_VERSION,
      decision: "deliver_read_only",
      enforcedIntent: "read_only",
      requiresApproval: false,
      approvalTokenAccepted,
      shouldEmitTrustEvent: false,
      trustEventName: "trust.guardrail.policy_evaluated.v1",
      reason: "read_only_briefing",
    };
  }

  if (input.trustGate === "hard_gate") {
    return {
      contractVersion: MORNING_BRIEFING_CONTRACT_VERSION,
      decision: "blocked",
      enforcedIntent: "read_only",
      requiresApproval: true,
      approvalTokenAccepted,
      shouldEmitTrustEvent: true,
      trustEventName: "trust.guardrail.policy_blocked.v1",
      reason: "trust_hard_gate",
    };
  }

  if (input.trustGate === "soft_gate") {
    return {
      contractVersion: MORNING_BRIEFING_CONTRACT_VERSION,
      decision: "proposal_required",
      enforcedIntent: "proposal",
      requiresApproval: true,
      approvalTokenAccepted,
      shouldEmitTrustEvent: true,
      trustEventName: "trust.guardrail.policy_evaluated.v1",
      reason: "trust_soft_gate_requires_review",
    };
  }

  if (input.privacyMode !== "cloud") {
    return {
      contractVersion: MORNING_BRIEFING_CONTRACT_VERSION,
      decision: "proposal_required",
      enforcedIntent: "proposal",
      requiresApproval: true,
      approvalTokenAccepted,
      shouldEmitTrustEvent: true,
      trustEventName: "trust.guardrail.policy_evaluated.v1",
      reason: "privacy_local_requires_proposal",
    };
  }

  if (!approvalTokenAccepted) {
    return {
      contractVersion: MORNING_BRIEFING_CONTRACT_VERSION,
      decision: "proposal_required",
      enforcedIntent: "proposal",
      requiresApproval: true,
      approvalTokenAccepted: false,
      shouldEmitTrustEvent: true,
      trustEventName: "trust.guardrail.policy_evaluated.v1",
      reason: "approval_token_required",
    };
  }

  return {
    contractVersion: MORNING_BRIEFING_CONTRACT_VERSION,
    decision: "commit_allowed",
    enforcedIntent: "commit",
    requiresApproval: true,
    approvalTokenAccepted: true,
    shouldEmitTrustEvent: true,
    trustEventName: "trust.guardrail.policy_evaluated.v1",
    reason: "approval_token_present",
  };
}

export interface MorningBriefingRolloutSample {
  primaryChannel: MorningBriefingPrimaryChannel;
  continuity: ConversationContinuityTelemetry;
  delivered: boolean;
  acknowledged: boolean;
  responseLatencyMs?: number;
}

export interface MorningBriefingRolloutMetrics {
  contractVersion: typeof MORNING_BRIEFING_CONTRACT_VERSION;
  totalBriefings: number;
  deliveredBriefings: number;
  acknowledgedBriefings: number;
  deliveryRate: number;
  acknowledgmentRate: number;
  crossChannelContinuationRate: number;
  replayRate: number;
  medianResponseLatencyMs: number | null;
  channelCounts: Array<{ channel: MorningBriefingPrimaryChannel; count: number }>;
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const ordered = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 0) {
    return (ordered[midpoint - 1] + ordered[midpoint]) / 2;
  }
  return ordered[midpoint];
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

export function computeMorningBriefingRolloutMetrics(
  samples: MorningBriefingRolloutSample[]
): MorningBriefingRolloutMetrics {
  const totalBriefings = samples.length;
  let deliveredBriefings = 0;
  let acknowledgedBriefings = 0;
  let crossChannelContinuations = 0;
  let replayCount = 0;
  const channelCounter = new Map<MorningBriefingPrimaryChannel, number>();
  const latencyValues: number[] = [];

  for (const sample of samples) {
    channelCounter.set(
      sample.primaryChannel,
      (channelCounter.get(sample.primaryChannel) ?? 0) + 1
    );
    if (sample.delivered) {
      deliveredBriefings += 1;
    }
    if (sample.acknowledged) {
      acknowledgedBriefings += 1;
    }
    if (sample.continuity.crossChannelContinuation) {
      crossChannelContinuations += 1;
    }
    if (sample.continuity.idempotency.isReplay) {
      replayCount += 1;
    }
    if (isFiniteNumber(sample.responseLatencyMs) && sample.responseLatencyMs >= 0) {
      latencyValues.push(sample.responseLatencyMs);
    }
  }

  const channelCounts = Array.from(channelCounter.entries())
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => a.channel.localeCompare(b.channel));

  return {
    contractVersion: MORNING_BRIEFING_CONTRACT_VERSION,
    totalBriefings,
    deliveredBriefings,
    acknowledgedBriefings,
    deliveryRate: ratio(deliveredBriefings, totalBriefings),
    acknowledgmentRate: ratio(acknowledgedBriefings, deliveredBriefings),
    crossChannelContinuationRate: ratio(crossChannelContinuations, totalBriefings),
    replayRate: ratio(replayCount, totalBriefings),
    medianResponseLatencyMs: calculateMedian(latencyValues),
    channelCounts,
  };
}
