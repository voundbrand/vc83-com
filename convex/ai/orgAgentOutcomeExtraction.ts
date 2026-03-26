import {
  ORG_ACTION_TARGET_SYSTEM_CLASS_VALUES,
} from "../schemas/orgAgentActionRuntimeSchemas";

export const ORG_AGENT_OUTCOME_ENVELOPE_CONTRACT_VERSION =
  "org_agent_outcome_envelope_v1" as const;

export type OrgAgentOutcomeSource = "agent_session" | "conversation";

export type OrgAgentOutcomeSentiment = "positive" | "neutral" | "negative";

export interface OrgAgentOutcomeCandidateRef {
  objectId?: string;
  externalIdentifier?: string;
  confidence?: number;
}

export interface OrgAgentOutcomeActionCandidate {
  actionKey: string;
  title: string;
  confidence: number;
  targetSystemClass: (typeof ORG_ACTION_TARGET_SYSTEM_CLASS_VALUES)[number];
  approvalRequired: boolean;
  payload?: Record<string, unknown>;
}

export interface OrgAgentOutcomeEnvelopeV1 {
  contractVersion: typeof ORG_AGENT_OUTCOME_ENVELOPE_CONTRACT_VERSION;
  source: OrgAgentOutcomeSource;
  organizationId: string;
  channel: string;
  capturedAt: number;
  sessionId?: string;
  conversationId?: string;
  agentId?: string;
  summary: string;
  sentiment?: OrgAgentOutcomeSentiment;
  contactCandidate?: OrgAgentOutcomeCandidateRef;
  organizationCandidate?: OrgAgentOutcomeCandidateRef;
  actionCandidates: OrgAgentOutcomeActionCandidate[];
  checkpoints: string[];
  metadata?: Record<string, unknown>;
}

export interface BuildOrgAgentOutcomeEnvelopeInput {
  source: OrgAgentOutcomeSource;
  organizationId: string;
  channel: string;
  capturedAt?: number;
  sessionId?: string;
  conversationId?: string;
  agentId?: string;
  summary?: string;
  messageText?: string;
  sentiment?: OrgAgentOutcomeSentiment;
  contactCandidate?: OrgAgentOutcomeCandidateRef;
  organizationCandidate?: OrgAgentOutcomeCandidateRef;
  actionCandidates?: OrgAgentOutcomeActionCandidate[];
  checkpoints?: string[];
  metadata?: Record<string, unknown>;
}

const HEURISTIC_RULES: Array<{
  actionKey: string;
  title: string;
  tokens: string[];
  targetSystemClass: OrgAgentOutcomeActionCandidate["targetSystemClass"];
  approvalRequired: boolean;
  confidence: number;
}> = [
  {
    actionKey: "schedule_follow_up",
    title: "Schedule follow-up",
    tokens: ["follow up", "follow-up", "callback", "call back"],
    targetSystemClass: "platform_internal",
    approvalRequired: true,
    confidence: 0.66,
  },
  {
    actionKey: "send_email_follow_up",
    title: "Send follow-up email",
    tokens: ["email", "mail", "send details", "write to"],
    targetSystemClass: "platform_internal",
    approvalRequired: true,
    confidence: 0.62,
  },
  {
    actionKey: "book_appointment",
    title: "Book appointment",
    tokens: ["appointment", "booking", "book a slot", "schedule meeting"],
    targetSystemClass: "platform_internal",
    approvalRequired: true,
    confidence: 0.68,
  },
  {
    actionKey: "create_crm_note",
    title: "Create CRM note",
    tokens: ["note", "document", "logged", "timeline"],
    targetSystemClass: "platform_internal",
    approvalRequired: false,
    confidence: 0.56,
  },
];

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value < 0 || value > 1) {
    return null;
  }
  return Number(value.toFixed(4));
}

function normalizeCandidateRef(
  value: OrgAgentOutcomeCandidateRef | undefined,
): OrgAgentOutcomeCandidateRef | undefined {
  if (!value) {
    return undefined;
  }
  const objectId = normalizeNonEmptyString(value.objectId) ?? undefined;
  const externalIdentifier =
    normalizeNonEmptyString(value.externalIdentifier) ?? undefined;
  const confidence = normalizeConfidence(value.confidence) ?? undefined;
  if (!objectId && !externalIdentifier) {
    return undefined;
  }
  return {
    objectId,
    externalIdentifier,
    confidence,
  };
}

function normalizeActionCandidate(
  value: OrgAgentOutcomeActionCandidate,
): OrgAgentOutcomeActionCandidate | null {
  const actionKey = normalizeNonEmptyString(value.actionKey);
  const title = normalizeNonEmptyString(value.title);
  const confidence = normalizeConfidence(value.confidence);
  const targetSystemClass = normalizeNonEmptyString(value.targetSystemClass);
  if (!actionKey || !title || confidence === null || !targetSystemClass) {
    return null;
  }
  if (
    !(
      ORG_ACTION_TARGET_SYSTEM_CLASS_VALUES as readonly string[]
    ).includes(targetSystemClass)
  ) {
    return null;
  }
  return {
    actionKey,
    title,
    confidence,
    targetSystemClass:
      targetSystemClass as OrgAgentOutcomeActionCandidate["targetSystemClass"],
    approvalRequired: Boolean(value.approvalRequired),
    payload: value.payload,
  };
}

function normalizeSummary(input: BuildOrgAgentOutcomeEnvelopeInput): string {
  const summary =
    normalizeNonEmptyString(input.summary)
    || normalizeNonEmptyString(input.messageText)
    || "Outcome captured";
  return summary.length > 1200 ? summary.slice(0, 1200) : summary;
}

function normalizeCheckpoints(
  checkpoints: string[] | undefined,
  textForHints: string,
): string[] {
  const values = (checkpoints ?? [])
    .map((checkpoint) => normalizeNonEmptyString(checkpoint))
    .filter((checkpoint): checkpoint is string => Boolean(checkpoint));
  const text = textForHints.toLowerCase();
  if (text.includes("transfer") || text.includes("handoff")) {
    values.push("human_takeover_candidate");
  }
  if (text.includes("approval") || text.includes("approve")) {
    values.push("approval_signal");
  }
  if (text.includes("retry")) {
    values.push("retry_signal");
  }
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function deriveActionCandidatesFromSummary(
  summary: string,
): OrgAgentOutcomeActionCandidate[] {
  const normalizedSummary = summary.toLowerCase();
  const matches = HEURISTIC_RULES.filter((rule) =>
    rule.tokens.some((token) => normalizedSummary.includes(token)),
  );
  return matches
    .map<OrgAgentOutcomeActionCandidate>((rule) => ({
      actionKey: rule.actionKey,
      title: rule.title,
      confidence: rule.confidence,
      targetSystemClass: rule.targetSystemClass,
      approvalRequired: rule.approvalRequired,
    }))
    .sort((left, right) => left.actionKey.localeCompare(right.actionKey));
}

export function normalizeOrgAgentOutcomeEnvelope(
  value: unknown,
): OrgAgentOutcomeEnvelopeV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const contractVersion = normalizeNonEmptyString(record.contractVersion);
  const source = normalizeNonEmptyString(record.source);
  const organizationId = normalizeNonEmptyString(record.organizationId);
  const channel = normalizeNonEmptyString(record.channel);
  const summary = normalizeNonEmptyString(record.summary);
  const capturedAt =
    typeof record.capturedAt === "number" && Number.isFinite(record.capturedAt)
      ? record.capturedAt
      : NaN;
  if (
    contractVersion !== ORG_AGENT_OUTCOME_ENVELOPE_CONTRACT_VERSION
    || (source !== "agent_session" && source !== "conversation")
    || !organizationId
    || !channel
    || !summary
    || !Number.isFinite(capturedAt)
    || capturedAt <= 0
  ) {
    return null;
  }

  const providedActionCandidates = Array.isArray(record.actionCandidates)
    ? record.actionCandidates
    : [];
  const normalizedCandidateResults = providedActionCandidates.map((candidate) =>
    normalizeActionCandidate(candidate as OrgAgentOutcomeActionCandidate),
  );
  if (normalizedCandidateResults.some((candidate) => candidate === null)) {
    return null;
  }
  const normalizedActionCandidates = normalizedCandidateResults.filter(
    (candidate): candidate is OrgAgentOutcomeActionCandidate => Boolean(candidate),
  );
  const dedupedByKey = Array.from(
    normalizedActionCandidates.reduce((map, candidate) => {
      const existing = map.get(candidate.actionKey);
      if (!existing || candidate.confidence > existing.confidence) {
        map.set(candidate.actionKey, candidate);
      }
      return map;
    }, new Map<string, OrgAgentOutcomeActionCandidate>()),
  )
    .map(([, candidate]) => candidate)
    .sort((left, right) => left.actionKey.localeCompare(right.actionKey));

  const checkpoints = Array.isArray(record.checkpoints)
    ? normalizeCheckpoints(record.checkpoints as string[], summary)
    : [];

  return {
    contractVersion: ORG_AGENT_OUTCOME_ENVELOPE_CONTRACT_VERSION,
    source,
    organizationId,
    channel,
    capturedAt,
    sessionId: normalizeNonEmptyString(record.sessionId) ?? undefined,
    conversationId: normalizeNonEmptyString(record.conversationId) ?? undefined,
    agentId: normalizeNonEmptyString(record.agentId) ?? undefined,
    summary,
    sentiment:
      record.sentiment === "positive"
      || record.sentiment === "neutral"
      || record.sentiment === "negative"
        ? (record.sentiment as OrgAgentOutcomeSentiment)
        : undefined,
    contactCandidate: normalizeCandidateRef(
      record.contactCandidate as OrgAgentOutcomeCandidateRef | undefined,
    ),
    organizationCandidate: normalizeCandidateRef(
      record.organizationCandidate as OrgAgentOutcomeCandidateRef | undefined,
    ),
    actionCandidates: dedupedByKey,
    checkpoints,
    metadata:
      record.metadata && typeof record.metadata === "object"
        ? (record.metadata as Record<string, unknown>)
        : undefined,
  };
}

export function buildOrgAgentOutcomeEnvelope(
  input: BuildOrgAgentOutcomeEnvelopeInput,
): OrgAgentOutcomeEnvelopeV1 {
  const organizationId = normalizeNonEmptyString(input.organizationId);
  const channel = normalizeNonEmptyString(input.channel);
  if (!organizationId || !channel) {
    throw new Error(
      "Outcome extraction requires non-empty organizationId and channel.",
    );
  }

  const summary = normalizeSummary(input);
  const heuristics = deriveActionCandidatesFromSummary(summary);
  const provided = (input.actionCandidates ?? [])
    .map((candidate) => normalizeActionCandidate(candidate))
    .filter((candidate): candidate is OrgAgentOutcomeActionCandidate =>
      Boolean(candidate),
    );
  const actionCandidates = Array.from(
    [...provided, ...heuristics].reduce((map, candidate) => {
      const existing = map.get(candidate.actionKey);
      if (!existing || candidate.confidence > existing.confidence) {
        map.set(candidate.actionKey, candidate);
      }
      return map;
    }, new Map<string, OrgAgentOutcomeActionCandidate>()),
  )
    .map(([, candidate]) => candidate)
    .sort((left, right) => left.actionKey.localeCompare(right.actionKey));

  const normalized = normalizeOrgAgentOutcomeEnvelope({
    contractVersion: ORG_AGENT_OUTCOME_ENVELOPE_CONTRACT_VERSION,
    source: input.source,
    organizationId,
    channel,
    capturedAt:
      typeof input.capturedAt === "number" && Number.isFinite(input.capturedAt)
        ? input.capturedAt
        : Date.now(),
    sessionId: normalizeNonEmptyString(input.sessionId) ?? undefined,
    conversationId: normalizeNonEmptyString(input.conversationId) ?? undefined,
    agentId: normalizeNonEmptyString(input.agentId) ?? undefined,
    summary,
    sentiment: input.sentiment,
    contactCandidate: normalizeCandidateRef(input.contactCandidate),
    organizationCandidate: normalizeCandidateRef(input.organizationCandidate),
    actionCandidates,
    checkpoints: normalizeCheckpoints(
      input.checkpoints,
      normalizeNonEmptyString(input.messageText) || summary,
    ),
    metadata: input.metadata,
  });

  if (!normalized) {
    throw new Error("Failed to build normalized org-agent outcome envelope.");
  }
  return normalized;
}
