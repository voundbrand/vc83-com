import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Id, type Doc } from "./_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "./rbacHelpers";
import {
  buildComplianceActionLifecycleAuditSnapshot,
  resolveComplianceActionRuntimeGate,
} from "./ai/orgActionPolicy";

const generatedApi: any = require("./_generated/api");

export const COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE = "compliance_avv_outreach";
export const COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE = "provider_dossier";

const AVV_OUTREACH_STATE_VALUES = [
  "draft",
  "pending_confirmation",
  "queued",
  "sent",
  "awaiting_response",
  "response_received",
  "approved",
  "rejected",
  "escalated",
  "closed_blocked",
] as const;

const avvOutreachStateValidator = v.union(
  v.literal("draft"),
  v.literal("pending_confirmation"),
  v.literal("queued"),
  v.literal("sent"),
  v.literal("awaiting_response"),
  v.literal("response_received"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("escalated"),
  v.literal("closed_blocked"),
);

export type ComplianceAvvOutreachState = (typeof AVV_OUTREACH_STATE_VALUES)[number];

const ALLOWED_STATE_TRANSITIONS: Record<ComplianceAvvOutreachState, ComplianceAvvOutreachState[]> = {
  draft: ["pending_confirmation", "closed_blocked"],
  pending_confirmation: ["draft", "queued", "closed_blocked"],
  queued: ["sent", "closed_blocked"],
  sent: ["awaiting_response", "escalated", "closed_blocked"],
  awaiting_response: ["response_received", "escalated", "closed_blocked"],
  response_received: ["approved", "rejected", "awaiting_response", "closed_blocked"],
  approved: ["closed_blocked"],
  rejected: ["closed_blocked", "pending_confirmation"],
  escalated: ["response_received", "approved", "rejected", "closed_blocked"],
  closed_blocked: ["draft", "pending_confirmation"],
};

const AVV_OUTREACH_EMAIL_QUEUE_TYPE = "compliance_avv_outreach";
const AVV_OUTREACH_MAX_RETRIES = 3;
const AVV_OUTREACH_RETRY_DELAYS_MS = [
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
] as const;
const AVV_OUTREACH_REMINDER_CADENCE_MS = 24 * 60 * 60 * 1000;
const AVV_OUTREACH_DEFAULT_ESCALATION_DELAY_MS = 72 * 60 * 60 * 1000;
const AVV_OUTREACH_MAX_REMINDER_ALERTS = 3;
const COMPLIANCE_EVIDENCE_OBJECT_TYPE = "compliance_evidence";
const AVV_RESPONSE_INTAKE_MODE_VALUES = ["manual_upload", "parser_assisted"] as const;
const AVV_RESPONSE_OUTCOME_VALUES = [
  "signed_avv_received",
  "delivery_eta_provided",
  "declined",
  "unknown",
] as const;
const EVIDENCE_RETENTION_CLASS_VALUES = [
  "90_days",
  "1_year",
  "3_years",
  "7_years",
] as const;
const EVIDENCE_REVIEW_CADENCE_VALUES = [
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
] as const;
const AVV_OUTREACH_RESPONSE_CAPTURE_ELIGIBLE_STATES: ComplianceAvvOutreachState[] = [
  "sent",
  "awaiting_response",
  "response_received",
  "escalated",
];
const REVIEW_CADENCE_TO_MS: Record<(typeof EVIDENCE_REVIEW_CADENCE_VALUES)[number], number> = {
  monthly: 30 * 24 * 60 * 60 * 1000,
  quarterly: 90 * 24 * 60 * 60 * 1000,
  semi_annual: 182 * 24 * 60 * 60 * 1000,
  annual: 365 * 24 * 60 * 60 * 1000,
};
const RETENTION_CLASS_TO_MS: Record<(typeof EVIDENCE_RETENTION_CLASS_VALUES)[number], number> = {
  "90_days": 90 * 24 * 60 * 60 * 1000,
  "1_year": 365 * 24 * 60 * 60 * 1000,
  "3_years": 3 * 365 * 24 * 60 * 60 * 1000,
  "7_years": 7 * 365 * 24 * 60 * 60 * 1000,
};

const avvResponseIntakeModeValidator = v.union(
  v.literal("manual_upload"),
  v.literal("parser_assisted"),
);
const avvResponseOutcomeValidator = v.union(
  v.literal("signed_avv_received"),
  v.literal("delivery_eta_provided"),
  v.literal("declined"),
  v.literal("unknown"),
);
const evidenceRetentionClassValidator = v.union(
  v.literal("90_days"),
  v.literal("1_year"),
  v.literal("3_years"),
  v.literal("7_years"),
);
const evidenceReviewCadenceValidator = v.union(
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("semi_annual"),
  v.literal("annual"),
);

export type ComplianceAvvResponseIntakeMode = (typeof AVV_RESPONSE_INTAKE_MODE_VALUES)[number];
export type ComplianceAvvResponseOutcome = (typeof AVV_RESPONSE_OUTCOME_VALUES)[number];

type OrgAccessContext = {
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  isSuperAdmin: boolean;
  isOrgOwner: boolean;
};

export type ComplianceAvvOutreachRow = {
  dossierObjectId: Id<"objects">;
  organizationId: Id<"organizations">;
  providerName: string | null;
  providerEmail: string | null;
  ownerUserId: string | null;
  backupOwnerUserId: string | null;
  serviceCategory: string | null;
  state: ComplianceAvvOutreachState;
  stateReason: string | null;
  slaFirstDueAt: number | null;
  slaReminderAt: number | null;
  slaEscalationAt: number | null;
  lastContactedAt: number | null;
  respondedAt: number | null;
  approvedAt: number | null;
  rejectedAt: number | null;
  reminderAlertCount: number;
  lastReminderAlertAt: number | null;
  nextReminderAlertAt: number | null;
  escalationAlertedAt: number | null;
  linkedEvidenceObjectIds: string[];
  notes: string | null;
  contractValid: boolean;
  validationErrors: string[];
  updatedAt: number;
  createdAt: number;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function normalizeNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const dedupe = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeString(entry);
    if (!normalized) {
      continue;
    }
    dedupe.add(normalized);
  }
  return Array.from(dedupe).sort((left, right) => left.localeCompare(right));
}

function normalizeState(value: unknown): ComplianceAvvOutreachState {
  if (typeof value === "string" && AVV_OUTREACH_STATE_VALUES.includes(value as ComplianceAvvOutreachState)) {
    return value as ComplianceAvvOutreachState;
  }
  return "draft";
}

function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Provider email must be a valid email address.");
  }
  return normalized;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "undefined") {
      compacted[key] = value;
    }
  }
  return compacted;
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = normalizeString(value);
  return normalized ?? undefined;
}

function isOutreachTerminalState(state: ComplianceAvvOutreachState): boolean {
  return state === "approved"
    || state === "rejected"
    || state === "closed_blocked";
}

function isOutreachSlaEligibleState(state: ComplianceAvvOutreachState): boolean {
  return state === "sent" || state === "awaiting_response";
}

export function computeComplianceAvvOutreachSlaCadence(args: {
  state: ComplianceAvvOutreachState;
  now: number;
  slaFirstDueAt: number | null;
  slaReminderAt: number | null;
  slaEscalationAt: number | null;
  reminderAlertCount?: number;
  nextReminderAlertAt?: number | null;
  reminderCadenceMs?: number;
  defaultEscalationDelayMs?: number;
  maxReminderAlerts?: number;
}): {
  reminderAnchorAt: number | null;
  escalationAt: number | null;
  nextReminderAt: number | null;
  reminderAlertCount: number;
  reminderDue: boolean;
  escalationDue: boolean;
  nextMilestoneAt: number | null;
} {
  const reminderCadenceMs =
    typeof args.reminderCadenceMs === "number" && Number.isFinite(args.reminderCadenceMs) && args.reminderCadenceMs > 0
      ? args.reminderCadenceMs
      : AVV_OUTREACH_REMINDER_CADENCE_MS;
  const defaultEscalationDelayMs =
    typeof args.defaultEscalationDelayMs === "number"
      && Number.isFinite(args.defaultEscalationDelayMs)
      && args.defaultEscalationDelayMs > 0
      ? args.defaultEscalationDelayMs
      : AVV_OUTREACH_DEFAULT_ESCALATION_DELAY_MS;
  const maxReminderAlerts =
    typeof args.maxReminderAlerts === "number" && Number.isFinite(args.maxReminderAlerts) && args.maxReminderAlerts > 0
      ? Math.floor(args.maxReminderAlerts)
      : AVV_OUTREACH_MAX_REMINDER_ALERTS;

  const reminderAlertCount = normalizeNonNegativeInteger(args.reminderAlertCount);
  const reminderAnchorAt = args.slaReminderAt ?? args.slaFirstDueAt;
  const escalationAt = args.slaEscalationAt ?? (
    reminderAnchorAt !== null ? reminderAnchorAt + defaultEscalationDelayMs : null
  );
  const eligibleState = isOutreachSlaEligibleState(args.state);
  const escalatedState = args.state === "escalated";
  const escalationDue =
    (eligibleState || escalatedState)
    && escalationAt !== null
    && args.now >= escalationAt;

  let nextReminderAt: number | null = null;
  if (eligibleState && reminderAlertCount < maxReminderAlerts) {
    const persistedNextReminderAt =
      typeof args.nextReminderAlertAt === "number" && Number.isFinite(args.nextReminderAlertAt)
        ? args.nextReminderAlertAt
        : null;
    nextReminderAt = persistedNextReminderAt ?? reminderAnchorAt;
    if (nextReminderAt !== null && escalationAt !== null && nextReminderAt > escalationAt) {
      nextReminderAt = escalationAt;
    }
  }

  const reminderDue =
    eligibleState
    && !escalationDue
    && nextReminderAt !== null
    && args.now >= nextReminderAt;

  const nextMilestoneCandidates = [nextReminderAt, escalationAt]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .sort((left, right) => left - right);
  const nextMilestoneAt = nextMilestoneCandidates[0] ?? null;

  return {
    reminderAnchorAt,
    escalationAt,
    nextReminderAt,
    reminderAlertCount,
    reminderDue,
    escalationDue,
    nextMilestoneAt,
  };
}

type ComplianceAvvOutreachEmailDraft = {
  subject: string;
  textBody: string;
  htmlBody: string;
};

export function buildComplianceAvvOutreachEmailDraft(args: {
  providerName: string;
  organizationName: string;
  customMessage?: string;
}): ComplianceAvvOutreachEmailDraft {
  const providerName = args.providerName.trim();
  const organizationName = args.organizationName.trim();
  const customMessage = args.customMessage?.trim();

  const subject = `Action required: AVV confirmation request from ${organizationName}`;
  const textBody = [
    `Hello ${providerName},`,
    "",
    `${organizationName} is requesting an updated data processing agreement (AVV) for compliance evidence.`,
    "Please reply with one of the following:",
    "1) Signed AVV attached, or",
    "2) Expected delivery date and responsible contact.",
    "",
    customMessage ? `Additional context: ${customMessage}` : null,
    "This request remains open until supporting AVV evidence is received.",
    "",
    `Regards,`,
    `${organizationName} Compliance Operations`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const htmlBody = [
    "<!DOCTYPE html>",
    "<html><body style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #111827;\">",
    `<p>Hello ${providerName},</p>`,
    `<p>${organizationName} is requesting an updated data processing agreement (AVV) for compliance evidence.</p>`,
    "<p>Please reply with one of the following:</p>",
    "<ol>",
    "<li>Signed AVV attached, or</li>",
    "<li>Expected delivery date and responsible contact.</li>",
    "</ol>",
    customMessage
      ? `<p><strong>Additional context:</strong> ${customMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
      : null,
    "<p>This request remains open until supporting AVV evidence is received.</p>",
    `<p>Regards,<br/>${organizationName} Compliance Operations</p>`,
    "</body></html>",
  ]
    .filter((line) => line !== null)
    .join("");

  return {
    subject,
    textBody,
    htmlBody,
  };
}

export function computeComplianceAvvOutreachRetryPlan(args: {
  retryCount: number;
  now: number;
  maxRetries?: number;
}): {
  willRetry: boolean;
  nextRetryAt: number | null;
  backoffMs: number | null;
} {
  const maxRetries = Number.isFinite(args.maxRetries) && (args.maxRetries ?? 0) > 0
    ? Math.floor(args.maxRetries as number)
    : AVV_OUTREACH_MAX_RETRIES;
  if (args.retryCount >= maxRetries) {
    return {
      willRetry: false,
      nextRetryAt: null,
      backoffMs: null,
    };
  }

  const delayIndex = Math.min(
    Math.max(args.retryCount - 1, 0),
    AVV_OUTREACH_RETRY_DELAYS_MS.length - 1,
  );
  const backoffMs = AVV_OUTREACH_RETRY_DELAYS_MS[delayIndex];
  return {
    willRetry: true,
    nextRetryAt: args.now + backoffMs,
    backoffMs,
  };
}

function normalizeReviewCadence(
  value: unknown,
): (typeof EVIDENCE_REVIEW_CADENCE_VALUES)[number] {
  if (typeof value === "string" && (EVIDENCE_REVIEW_CADENCE_VALUES as readonly string[]).includes(value)) {
    return value as (typeof EVIDENCE_REVIEW_CADENCE_VALUES)[number];
  }
  return "annual";
}

function normalizeRetentionClass(
  value: unknown,
): (typeof EVIDENCE_RETENTION_CLASS_VALUES)[number] {
  if (typeof value === "string" && (EVIDENCE_RETENTION_CLASS_VALUES as readonly string[]).includes(value)) {
    return value as (typeof EVIDENCE_RETENTION_CLASS_VALUES)[number];
  }
  return "3_years";
}

function buildAvvResponseStateReason(outcome: ComplianceAvvResponseOutcome): string {
  switch (outcome) {
    case "signed_avv_received":
      return "Provider response captured with signed AVV evidence.";
    case "delivery_eta_provided":
      return "Provider response captured with AVV delivery ETA; follow-up remains open.";
    case "declined":
      return "Provider response captured; AVV request declined.";
    default:
      return "Provider response captured; follow-up classification pending.";
  }
}

type ComplianceAvvResponseEvidenceDraft = {
  title: string;
  description: string;
  subtype: "avv_provider";
  sourceType: "provider_response";
  sensitivity: "confidential";
  lifecycleStatus: "active";
  inheritanceScope: "none";
  inheritanceEligible: false;
  riskReferences: Array<{
    riskId: "R-002";
    controlId: "provider_avv";
    note: string;
  }>;
  retentionClass: (typeof EVIDENCE_RETENTION_CLASS_VALUES)[number];
  reviewCadence: (typeof EVIDENCE_REVIEW_CADENCE_VALUES)[number];
  nextReviewAt: number;
  retentionDeleteAt: number;
  providerName: string;
  notes: string;
  tags: string[];
};

export function buildComplianceAvvResponseEvidenceDraft(args: {
  providerName: string;
  responseSummary: string;
  intakeMode: ComplianceAvvResponseIntakeMode;
  outcome: ComplianceAvvResponseOutcome;
  now: number;
  evidenceTitle?: string;
  evidenceDescription?: string;
  reviewCadence?: (typeof EVIDENCE_REVIEW_CADENCE_VALUES)[number];
  retentionClass?: (typeof EVIDENCE_RETENTION_CLASS_VALUES)[number];
  nextReviewAt?: number;
  retentionDeleteAt?: number;
}): ComplianceAvvResponseEvidenceDraft {
  const providerName = args.providerName.trim();
  if (providerName.length === 0) {
    throw new Error("Provider name is required for AVV response evidence.");
  }
  const responseSummary = args.responseSummary.trim();
  if (responseSummary.length === 0) {
    throw new Error("Response summary is required for AVV response evidence.");
  }
  if (!Number.isFinite(args.now)) {
    throw new Error("A finite timestamp is required for AVV response evidence.");
  }

  const reviewCadence = normalizeReviewCadence(args.reviewCadence);
  const retentionClass = normalizeRetentionClass(args.retentionClass);
  const defaultNextReviewAt = args.now + REVIEW_CADENCE_TO_MS[reviewCadence];
  const nextReviewAt =
    typeof args.nextReviewAt === "number" && Number.isFinite(args.nextReviewAt)
      ? args.nextReviewAt
      : defaultNextReviewAt;
  const defaultRetentionDeleteAt = args.now + RETENTION_CLASS_TO_MS[retentionClass];
  const retentionDeleteAt =
    typeof args.retentionDeleteAt === "number" && Number.isFinite(args.retentionDeleteAt)
      ? args.retentionDeleteAt
      : defaultRetentionDeleteAt;
  if (retentionDeleteAt <= nextReviewAt) {
    throw new Error("Retention delete timestamp must be after next review timestamp.");
  }

  const dateLabel = new Date(args.now).toISOString().slice(0, 10);
  const title = normalizeOptionalString(args.evidenceTitle) ?? `AVV response - ${providerName} (${dateLabel})`;
  const description = normalizeOptionalString(args.evidenceDescription)
    ?? `Inbound AVV response captured via ${args.intakeMode.replace("_", " ")}.`;
  const notePrefix = buildAvvResponseStateReason(args.outcome);
  const notes = `${notePrefix} Summary: ${responseSummary}`;
  const tags = [
    "avv",
    "outreach",
    "provider_response",
    args.intakeMode,
    args.outcome,
  ]
    .map((tag) => tag.toLowerCase())
    .filter((tag, index, values) => values.indexOf(tag) === index)
    .sort((left, right) => left.localeCompare(right));

  return {
    title,
    description,
    subtype: "avv_provider",
    sourceType: "provider_response",
    sensitivity: "confidential",
    lifecycleStatus: "active",
    inheritanceScope: "none",
    inheritanceEligible: false,
    riskReferences: [
      {
        riskId: "R-002",
        controlId: "provider_avv",
        note: `outcome:${args.outcome}`,
      },
    ],
    retentionClass,
    reviewCadence,
    nextReviewAt,
    retentionDeleteAt,
    providerName,
    notes,
    tags,
  };
}

async function getMembershipRoleName(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
): Promise<string | null> {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) => q.eq("userId", userId).eq("organizationId", organizationId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();
  if (!membership) {
    return null;
  }
  const role = await ctx.db.get(membership.role);
  return role?.name ?? null;
}

async function resolveOrgAccessContext(
  ctx: QueryCtx | MutationCtx,
  args: {
    sessionId: string;
    organizationId?: Id<"organizations">;
  },
): Promise<OrgAccessContext> {
  const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
  const organizationId = args.organizationId ?? authenticated.organizationId;
  const userContext = await getUserContext(ctx, authenticated.userId, organizationId);
  const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
  if (!isSuperAdmin && authenticated.organizationId !== organizationId) {
    throw new Error("Cross-organization AVV outreach access is not allowed.");
  }
  const roleName = await getMembershipRoleName(ctx, authenticated.userId, organizationId);
  const isOrgOwner = roleName === "org_owner";
  if (!isOrgOwner && !isSuperAdmin) {
    throw new Error("Only organization owners or super admins can access AVV outreach workflows.");
  }

  return {
    organizationId,
    userId: authenticated.userId,
    isSuperAdmin,
    isOrgOwner,
  };
}

async function requireAvvDossierObject(
  ctx: QueryCtx | MutationCtx,
  args: {
    dossierObjectId: Id<"objects">;
    organizationId: Id<"organizations">;
  },
): Promise<Doc<"objects">> {
  const dossierObject = await ctx.db.get(args.dossierObjectId);
  if (
    !dossierObject
    || dossierObject.type !== COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE
    || dossierObject.subtype !== COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE
  ) {
    throw new Error("AVV outreach provider dossier not found.");
  }
  if (String(dossierObject.organizationId) !== String(args.organizationId)) {
    throw new Error("Cross-organization AVV outreach access is not allowed.");
  }
  return dossierObject;
}

export function canTransitionAvvOutreachState(
  current: ComplianceAvvOutreachState,
  next: ComplianceAvvOutreachState,
): boolean {
  if (current === next) {
    return true;
  }
  return ALLOWED_STATE_TRANSITIONS[current].includes(next);
}

export function mapAvvOutreachObjectToRow(object: Doc<"objects">): ComplianceAvvOutreachRow {
  const props = asRecord(object.customProperties);
  const providerName = normalizeString(props.providerName);
  const providerEmail = normalizeString(props.providerEmail);
  const slaFirstDueAt = normalizeTimestamp(props.slaFirstDueAt);
  const validationErrors: string[] = [];
  if (!providerName) {
    validationErrors.push("provider_name_required");
  }
  if (!providerEmail || !providerEmail.includes("@")) {
    validationErrors.push("provider_email_invalid");
  }
  if (slaFirstDueAt === null) {
    validationErrors.push("sla_first_due_required");
  }

  return {
    dossierObjectId: object._id,
    organizationId: object.organizationId,
    providerName,
    providerEmail,
    ownerUserId: normalizeString(props.ownerUserId),
    backupOwnerUserId: normalizeString(props.backupOwnerUserId),
    serviceCategory: normalizeString(props.serviceCategory),
    state: normalizeState(object.status),
    stateReason: normalizeString(props.stateReason),
    slaFirstDueAt,
    slaReminderAt: normalizeTimestamp(props.slaReminderAt),
    slaEscalationAt: normalizeTimestamp(props.slaEscalationAt),
    lastContactedAt: normalizeTimestamp(props.lastContactedAt),
    respondedAt: normalizeTimestamp(props.respondedAt),
    approvedAt: normalizeTimestamp(props.approvedAt),
    rejectedAt: normalizeTimestamp(props.rejectedAt),
    reminderAlertCount: normalizeNonNegativeInteger(props.reminderAlertCount),
    lastReminderAlertAt: normalizeTimestamp(props.lastReminderAlertAt),
    nextReminderAlertAt: normalizeTimestamp(props.nextReminderAlertAt),
    escalationAlertedAt: normalizeTimestamp(props.escalationAlertedAt),
    linkedEvidenceObjectIds: normalizeStringList(props.linkedEvidenceObjectIds),
    notes: normalizeString(props.notes),
    contractValid: validationErrors.length === 0,
    validationErrors,
    updatedAt: object.updatedAt,
    createdAt: object.createdAt,
  };
}

export function summarizeAvvOutreachRows(args: {
  rows: ComplianceAvvOutreachRow[];
  now: number;
}): {
  total: number;
  invalidCount: number;
  openCount: number;
  overdueCount: number;
  awaitingResponseCount: number;
  reminderDueCount: number;
  escalationDueCount: number;
  nextDueAt: number | null;
  byState: Record<ComplianceAvvOutreachState, number>;
} {
  const byState: Record<ComplianceAvvOutreachState, number> = {
    draft: 0,
    pending_confirmation: 0,
    queued: 0,
    sent: 0,
    awaiting_response: 0,
    response_received: 0,
    approved: 0,
    rejected: 0,
    escalated: 0,
    closed_blocked: 0,
  };
  let invalidCount = 0;
  let openCount = 0;
  let overdueCount = 0;
  let awaitingResponseCount = 0;
  let reminderDueCount = 0;
  let escalationDueCount = 0;
  let nextDueAt: number | null = null;

  for (const row of args.rows) {
    byState[row.state] += 1;
    if (!row.contractValid) {
      invalidCount += 1;
    }

    const terminalState = isOutreachTerminalState(row.state);
    if (!terminalState) {
      openCount += 1;
      if (row.slaFirstDueAt !== null && row.slaFirstDueAt <= args.now) {
        overdueCount += 1;
      }
      if (row.slaFirstDueAt !== null && (nextDueAt === null || row.slaFirstDueAt < nextDueAt)) {
        nextDueAt = row.slaFirstDueAt;
      }
    }
    if (row.state === "awaiting_response") {
      awaitingResponseCount += 1;
    }
    const cadence = computeComplianceAvvOutreachSlaCadence({
      state: row.state,
      now: args.now,
      slaFirstDueAt: row.slaFirstDueAt,
      slaReminderAt: row.slaReminderAt,
      slaEscalationAt: row.slaEscalationAt,
      reminderAlertCount: row.reminderAlertCount,
      nextReminderAlertAt: row.nextReminderAlertAt,
    });
    if (cadence.reminderDue) {
      reminderDueCount += 1;
    }
    if (cadence.escalationDue) {
      escalationDueCount += 1;
    }
  }

  return {
    total: args.rows.length,
    invalidCount,
    openCount,
    overdueCount,
    awaitingResponseCount,
    reminderDueCount,
    escalationDueCount,
    nextDueAt,
    byState,
  };
}

export const listAvvOutreachProviderDossiers = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    state: v.optional(avvOutreachStateValidator),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    const rows = (await ctx.db
      .query("objects")
      .withIndex("by_org_type_subtype", (q) =>
        q.eq("organizationId", access.organizationId)
          .eq("type", COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE)
          .eq("subtype", COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE),
      )
      .collect())
      .map(mapAvvOutreachObjectToRow)
      .filter((row) => (args.state ? row.state === args.state : true))
      .sort((left, right) => {
        const leftDueAt = left.slaFirstDueAt ?? Number.MAX_SAFE_INTEGER;
        const rightDueAt = right.slaFirstDueAt ?? Number.MAX_SAFE_INTEGER;
        if (leftDueAt !== rightDueAt) {
          return leftDueAt - rightDueAt;
        }
        return (left.providerName ?? "").localeCompare(right.providerName ?? "");
      });

    return {
      organizationId: access.organizationId,
      rows,
      summary: summarizeAvvOutreachRows({
        rows,
        now: Date.now(),
      }),
    };
  },
});

export const saveAvvOutreachProviderDossier = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    dossierObjectId: v.optional(v.id("objects")),
    providerName: v.string(),
    providerEmail: v.string(),
    ownerUserId: v.optional(v.id("users")),
    backupOwnerUserId: v.optional(v.id("users")),
    serviceCategory: v.optional(v.string()),
    slaFirstDueAt: v.number(),
    slaReminderAt: v.optional(v.number()),
    slaEscalationAt: v.optional(v.number()),
    state: v.optional(avvOutreachStateValidator),
    stateReason: v.optional(v.string()),
    notes: v.optional(v.string()),
    linkedEvidenceObjectIds: v.optional(v.array(v.id("objects"))),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    if (!access.isOrgOwner) {
      throw new Error("Only organization owners can modify AVV outreach provider dossiers.");
    }

    const providerName = normalizeString(args.providerName);
    if (!providerName) {
      throw new Error("Provider name is required.");
    }
    const providerEmail = normalizeEmail(args.providerEmail);
    const slaFirstDueAt = normalizeTimestamp(args.slaFirstDueAt);
    if (slaFirstDueAt === null) {
      throw new Error("slaFirstDueAt is required.");
    }
    const slaReminderAt = normalizeTimestamp(args.slaReminderAt);
    const slaEscalationAt = normalizeTimestamp(args.slaEscalationAt);
    if (slaReminderAt !== null && slaReminderAt < slaFirstDueAt) {
      throw new Error("slaReminderAt cannot be before slaFirstDueAt.");
    }
    if (slaEscalationAt !== null && slaEscalationAt < (slaReminderAt ?? slaFirstDueAt)) {
      throw new Error("slaEscalationAt cannot be before reminder/due milestones.");
    }

    const now = Date.now();
    const state = args.state ?? "draft";
    const linkedEvidenceObjectIds = Array.from(
      new Set((args.linkedEvidenceObjectIds ?? []).map((entry) => String(entry))),
    ).sort((left, right) => left.localeCompare(right));
    const customProperties = compactRecord({
      providerName,
      providerEmail,
      ownerUserId: args.ownerUserId ? String(args.ownerUserId) : String(access.userId),
      backupOwnerUserId: args.backupOwnerUserId ? String(args.backupOwnerUserId) : undefined,
      serviceCategory: normalizeString(args.serviceCategory),
      slaFirstDueAt,
      slaReminderAt: slaReminderAt ?? undefined,
      slaEscalationAt: slaEscalationAt ?? undefined,
      stateReason: normalizeString(args.stateReason),
      notes: normalizeString(args.notes),
      linkedEvidenceObjectIds: linkedEvidenceObjectIds.length > 0 ? linkedEvidenceObjectIds : undefined,
      updatedBy: String(access.userId),
      updatedAt: now,
    });

    let dossierObjectId: Id<"objects">;
    if (args.dossierObjectId) {
      const existing = await ctx.db.get(args.dossierObjectId);
      if (
        !existing
        || existing.type !== COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE
        || existing.subtype !== COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE
      ) {
        throw new Error("AVV outreach provider dossier not found.");
      }
      if (String(existing.organizationId) !== String(access.organizationId)) {
        throw new Error("Cross-organization AVV outreach update is not allowed.");
      }

      await ctx.db.patch(existing._id, {
        name: providerName,
        status: state,
        customProperties: compactRecord({
          ...asRecord(existing.customProperties),
          ...customProperties,
        }),
        updatedAt: now,
      });
      dossierObjectId = existing._id;
    } else {
      dossierObjectId = await ctx.db.insert("objects", {
        organizationId: access.organizationId,
        type: COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE,
        subtype: COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE,
        name: providerName,
        description: `AVV outreach dossier for ${providerName}`,
        status: state,
        customProperties: compactRecord({
          ...customProperties,
          createdBy: String(access.userId),
          createdAt: now,
        }),
        createdBy: access.userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("objectActions", {
      organizationId: access.organizationId,
      objectId: dossierObjectId,
      actionType: "compliance_avv_outreach_dossier_saved",
      actionData: compactRecord({
        providerName,
        providerEmail,
        state,
        slaFirstDueAt,
        slaReminderAt,
        slaEscalationAt,
        ownerUserId: args.ownerUserId ? String(args.ownerUserId) : String(access.userId),
      }),
      performedBy: access.userId,
      performedAt: now,
    });

    return {
      success: true,
      dossierObjectId,
      state,
      updatedAt: now,
    };
  },
});

export const transitionAvvOutreachState = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    dossierObjectId: v.id("objects"),
    nextState: avvOutreachStateValidator,
    stateReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    if (!access.isOrgOwner) {
      throw new Error("Only organization owners can transition AVV outreach states.");
    }

    const dossierObject = await ctx.db.get(args.dossierObjectId);
    if (
      !dossierObject
      || dossierObject.type !== COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE
      || dossierObject.subtype !== COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE
    ) {
      throw new Error("AVV outreach provider dossier not found.");
    }
    if (String(dossierObject.organizationId) !== String(access.organizationId)) {
      throw new Error("Cross-organization AVV outreach transition is not allowed.");
    }

    const currentState = normalizeState(dossierObject.status);
    if (!canTransitionAvvOutreachState(currentState, args.nextState)) {
      throw new Error(`Invalid AVV outreach transition: ${currentState} -> ${args.nextState}.`);
    }

    const now = Date.now();
    const customProperties = asRecord(dossierObject.customProperties);
    await ctx.db.patch(dossierObject._id, {
      status: args.nextState,
      customProperties: compactRecord({
        ...customProperties,
        stateReason: normalizeString(args.stateReason),
        lastTransitionAt: now,
        lastTransitionBy: String(access.userId),
        ...(args.nextState === "sent" || args.nextState === "awaiting_response"
          ? { lastContactedAt: now }
          : {}),
        ...(args.nextState === "response_received" ? { respondedAt: now } : {}),
        ...(args.nextState === "approved" ? { approvedAt: now } : {}),
        ...(args.nextState === "rejected" ? { rejectedAt: now } : {}),
      }),
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: access.organizationId,
      objectId: dossierObject._id,
      actionType: "compliance_avv_outreach_state_transitioned",
      actionData: compactRecord({
        fromState: currentState,
        toState: args.nextState,
        stateReason: normalizeString(args.stateReason),
      }),
      performedBy: access.userId,
      performedAt: now,
    });

    return {
      success: true,
      dossierObjectId: dossierObject._id,
      previousState: currentState,
      nextState: args.nextState,
      transitionedAt: now,
    };
  },
});

export const confirmAndQueueAvvOutreachEmail = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    dossierObjectId: v.id("objects"),
    operatorConfirmed: v.boolean(),
    confirmationNote: v.optional(v.string()),
    customMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    if (!access.isOrgOwner) {
      throw new Error("Only organization owners can confirm AVV outreach sends.");
    }
    if (!args.operatorConfirmed) {
      throw new Error("Operator confirmation is required before AVV outreach emails can be queued.");
    }

    const dossierObject = await requireAvvDossierObject(ctx, {
      dossierObjectId: args.dossierObjectId,
      organizationId: access.organizationId,
    });
    const dossierRow = mapAvvOutreachObjectToRow(dossierObject);
    if (!dossierRow.contractValid || !dossierRow.providerName || !dossierRow.providerEmail) {
      throw new Error("AVV outreach dossier is incomplete. Resolve required metadata before sending.");
    }
    if (dossierRow.state !== "pending_confirmation") {
      throw new Error("AVV outreach send requires dossier state 'pending_confirmation'.");
    }
    const runtimeGate = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_queue_avv_outreach_email",
      riskLevel: "high",
      channel: "compliance_outbound_email",
      targetSystemClass: "external_connector",
      requiresExplicitOutboundConfirmation: true,
      humanApprovalGranted: args.operatorConfirmed && access.isOrgOwner,
    });
    if (runtimeGate.gate.status !== "passed") {
      throw new Error(`Compliance runtime gate blocked (${runtimeGate.gate.reasonCode}).`);
    }

    const organization = await ctx.db.get(access.organizationId);
    const organizationName = normalizeString(organization?.name) ?? "Your organization";
    const draft = buildComplianceAvvOutreachEmailDraft({
      providerName: dossierRow.providerName,
      organizationName,
      customMessage: normalizeOptionalString(args.customMessage),
    });

    const now = Date.now();
    const emailQueueId = await ctx.db.insert("emailQueue", {
      organizationId: access.organizationId,
      dossierObjectId: dossierObject._id,
      operatorConfirmedByUserId: access.userId,
      operatorConfirmedAt: now,
      to: dossierRow.providerEmail,
      subject: draft.subject,
      htmlBody: draft.htmlBody,
      textBody: draft.textBody,
      type: AVV_OUTREACH_EMAIL_QUEUE_TYPE,
      status: "pending",
      retryCount: 0,
      maxRetries: AVV_OUTREACH_MAX_RETRIES,
      nextRetryAt: now,
      workflowMetadata: compactRecord({
        providerName: dossierRow.providerName,
        ownerUserId: dossierRow.ownerUserId ?? String(access.userId),
        confirmationNote: normalizeOptionalString(args.confirmationNote),
      }),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(dossierObject._id, {
      status: "queued",
      customProperties: compactRecord({
        ...asRecord(dossierObject.customProperties),
        stateReason: normalizeOptionalString(args.confirmationNote) ?? "Queued after owner confirmation.",
        lastQueuedEmailId: String(emailQueueId),
        lastQueuedAt: now,
        operatorConfirmedBy: String(access.userId),
        operatorConfirmedAt: now,
      }),
      updatedAt: now,
    });

    const queuedActionId = await ctx.db.insert("objectActions", {
      organizationId: access.organizationId,
      objectId: dossierObject._id,
      actionType: "compliance_avv_outreach_email_queued",
      actionData: compactRecord({
        queueId: String(emailQueueId),
        providerEmail: dossierRow.providerEmail,
        confirmationNote: normalizeOptionalString(args.confirmationNote),
        runtimeContractVersion: runtimeGate.contractVersion,
        runtimeStageOrder: [...runtimeGate.stageOrder],
        runtimeGateStatus: runtimeGate.gate.status,
        runtimeGateReasonCode: runtimeGate.gate.reasonCode,
        runtimePolicyDecision: runtimeGate.policyDecision,
        runtimePolicyReasonCode: runtimeGate.policyReasonCode,
        runtimeApprovalCheckpoint: runtimeGate.approval.checkpoint,
        runtimeApprovalRequired: runtimeGate.approval.required,
        runtimeApprovalSatisfied: runtimeGate.approval.satisfied,
      }),
      performedBy: access.userId,
      performedAt: now,
    });
    const runtimeLifecycle = buildComplianceActionLifecycleAuditSnapshot({
      gateResult: runtimeGate,
      plannedAt: now,
      executeAt: now,
      verifyAt: now,
      verifyPassed: true,
      auditAt: now,
      auditRef: `objectActions:${String(queuedActionId)}`,
    });

    await (ctx.scheduler as any).runAfter(
      0,
      generatedApi.internal.complianceOutreachAgent.processQueuedAvvOutreachEmail,
      { emailQueueId },
    );

    return {
      success: true,
      dossierObjectId: dossierObject._id,
      emailQueueId,
      nextState: "queued" as ComplianceAvvOutreachState,
      queuedAt: now,
      runtimeLifecycle,
    };
  },
});

export const captureAvvOutreachResponseAndMapEvidence = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    dossierObjectId: v.id("objects"),
    intakeMode: avvResponseIntakeModeValidator,
    outcome: avvResponseOutcomeValidator,
    responseSummary: v.string(),
    responseReceivedAt: v.optional(v.number()),
    evidenceObjectId: v.optional(v.id("objects")),
    evidenceTitle: v.optional(v.string()),
    evidenceDescription: v.optional(v.string()),
    evidenceChecksumSha256: v.optional(v.string()),
    evidenceStoragePointer: v.optional(v.string()),
    evidenceStorageProvider: v.optional(v.string()),
    evidenceContentLengthBytes: v.optional(v.number()),
    evidenceMediaId: v.optional(v.string()),
    retentionClass: v.optional(evidenceRetentionClassValidator),
    reviewCadence: v.optional(evidenceReviewCadenceValidator),
    nextReviewAt: v.optional(v.number()),
    retentionDeleteAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    if (!access.isOrgOwner) {
      throw new Error("Only organization owners can capture AVV outreach responses.");
    }

    const responseSummary = normalizeString(args.responseSummary);
    if (!responseSummary) {
      throw new Error("Response summary is required for AVV outreach response capture.");
    }

    const dossierObject = await requireAvvDossierObject(ctx, {
      dossierObjectId: args.dossierObjectId,
      organizationId: access.organizationId,
    });
    const dossierRow = mapAvvOutreachObjectToRow(dossierObject);
    if (!dossierRow.providerName) {
      throw new Error("Provider name is required on dossier before capturing a response.");
    }
    if (!AVV_OUTREACH_RESPONSE_CAPTURE_ELIGIBLE_STATES.includes(dossierRow.state)) {
      throw new Error(
        `AVV response capture requires dossier state in ${AVV_OUTREACH_RESPONSE_CAPTURE_ELIGIBLE_STATES.join(", ")}.`,
      );
    }
    const runtimeGate = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_capture_avv_outreach_response",
      riskLevel: "medium",
      channel: "compliance_inbound_response",
      targetSystemClass: "platform_internal",
      humanApprovalGranted: access.isOrgOwner,
    });
    if (runtimeGate.gate.status !== "passed") {
      throw new Error(`Compliance runtime gate blocked (${runtimeGate.gate.reasonCode}).`);
    }

    const now = Date.now();
    const respondedAt = normalizeTimestamp(args.responseReceivedAt) ?? now;
    let evidenceObjectId: Id<"objects"> | undefined = args.evidenceObjectId;
    let createdEvidenceEntry = false;

    if (evidenceObjectId) {
      const evidenceObject = await ctx.db.get(evidenceObjectId);
      if (!evidenceObject || evidenceObject.type !== COMPLIANCE_EVIDENCE_OBJECT_TYPE) {
        throw new Error("Provided evidenceObjectId is not a compliance evidence record.");
      }
      if (String(evidenceObject.organizationId) !== String(access.organizationId)) {
        throw new Error("Cross-organization evidence linking is not allowed for AVV response capture.");
      }

      const mappedRow = await (ctx as any).runQuery(generatedApi.api.complianceEvidenceVault.getEvidenceMetadata, {
        sessionId: args.sessionId,
        organizationId: access.organizationId,
        evidenceObjectId,
      });
      if (!mappedRow?.contractValid) {
        throw new Error("Provided evidence metadata contract is invalid; AVV response mapping is blocked.");
      }
      if (mappedRow.subtype !== "avv_provider") {
        throw new Error("Provided evidence must use subtype='avv_provider' for AVV response mapping.");
      }
      if (mappedRow.sourceType === "platform_inherited") {
        throw new Error("Platform-inherited evidence cannot be used as inbound provider response evidence.");
      }

      const hasProviderAvvRiskLink = Array.isArray(mappedRow.riskReferences)
        && mappedRow.riskReferences.some((entry: Record<string, unknown>) => (
          entry.riskId === "R-002" && entry.controlId === "provider_avv"
        ));
      if (!hasProviderAvvRiskLink) {
        await (ctx as any).runMutation(generatedApi.api.complianceEvidenceVault.linkEvidenceToRisk, {
          sessionId: args.sessionId,
          organizationId: access.organizationId,
          evidenceObjectId,
          riskId: "R-002",
          controlId: "provider_avv",
          note: "Linked from AVV outreach inbound response capture.",
        });
      }
    } else {
      if (args.intakeMode === "manual_upload") {
        throw new Error("manual_upload intake requires an existing evidenceObjectId.");
      }

      const checksumSha256 = normalizeString(args.evidenceChecksumSha256);
      const storagePointer = normalizeString(args.evidenceStoragePointer);
      const storageProvider = normalizeString(args.evidenceStorageProvider) ?? "provider_parser_ingest";
      if (!checksumSha256 || !storagePointer) {
        throw new Error(
          "Parser-assisted intake requires evidenceChecksumSha256 and evidenceStoragePointer to map evidence.",
        );
      }
      if (
        typeof args.evidenceContentLengthBytes === "number"
        && (!Number.isFinite(args.evidenceContentLengthBytes) || args.evidenceContentLengthBytes < 0)
      ) {
        throw new Error("evidenceContentLengthBytes must be a finite non-negative number when provided.");
      }

      const evidenceDraft = buildComplianceAvvResponseEvidenceDraft({
        providerName: dossierRow.providerName,
        responseSummary,
        intakeMode: args.intakeMode,
        outcome: args.outcome,
        now,
        evidenceTitle: normalizeOptionalString(args.evidenceTitle),
        evidenceDescription: normalizeOptionalString(args.evidenceDescription),
        reviewCadence: args.reviewCadence,
        retentionClass: args.retentionClass,
        nextReviewAt: args.nextReviewAt,
        retentionDeleteAt: args.retentionDeleteAt,
      });

      const createdEvidence = await (ctx as any).runMutation(generatedApi.api.complianceEvidenceVault.saveEvidenceMetadata, {
        sessionId: args.sessionId,
        organizationId: access.organizationId,
        title: evidenceDraft.title,
        description: evidenceDraft.description,
        subtype: evidenceDraft.subtype,
        sourceType: evidenceDraft.sourceType,
        sensitivity: evidenceDraft.sensitivity,
        lifecycleStatus: evidenceDraft.lifecycleStatus,
        inheritanceScope: evidenceDraft.inheritanceScope,
        inheritanceEligible: evidenceDraft.inheritanceEligible,
        riskReferences: evidenceDraft.riskReferences,
        integrity: compactRecord({
          checksumSha256,
          storagePointer,
          storageProvider,
          contentLengthBytes: args.evidenceContentLengthBytes,
          mediaId: normalizeOptionalString(args.evidenceMediaId),
        }),
        retentionClass: evidenceDraft.retentionClass,
        retentionDeleteAt: evidenceDraft.retentionDeleteAt,
        reviewCadence: evidenceDraft.reviewCadence,
        nextReviewAt: evidenceDraft.nextReviewAt,
        providerName: evidenceDraft.providerName,
        notes: evidenceDraft.notes,
        tags: evidenceDraft.tags,
      });
      evidenceObjectId = createdEvidence.evidenceObjectId;
      createdEvidenceEntry = true;
    }

    if (!evidenceObjectId) {
      throw new Error("AVV response capture failed: evidence mapping did not produce an evidence object.");
    }

    const linkedEvidenceObjectIds = Array.from(
      new Set([...dossierRow.linkedEvidenceObjectIds, String(evidenceObjectId)]),
    ).sort((left, right) => left.localeCompare(right));
    const stateReason = buildAvvResponseStateReason(args.outcome);

    await ctx.db.patch(dossierObject._id, {
      status: "response_received",
      customProperties: compactRecord({
        ...asRecord(dossierObject.customProperties),
        stateReason,
        respondedAt,
        lastInboundResponseAt: respondedAt,
        lastResponseIntakeMode: args.intakeMode,
        lastResponseOutcome: args.outcome,
        lastResponseSummary: responseSummary,
        lastResponseEvidenceObjectId: String(evidenceObjectId),
        linkedEvidenceObjectIds,
        lastTransitionAt: now,
        lastTransitionBy: String(access.userId),
      }),
      updatedAt: now,
    });

    const captureActionId = await ctx.db.insert("objectActions", {
      organizationId: access.organizationId,
      objectId: dossierObject._id,
      actionType: "compliance_avv_outreach_response_captured",
      actionData: compactRecord({
        intakeMode: args.intakeMode,
        outcome: args.outcome,
        responseSummary,
        respondedAt,
        evidenceObjectId: String(evidenceObjectId),
        evidenceCreated: createdEvidenceEntry,
        runtimeContractVersion: runtimeGate.contractVersion,
        runtimeStageOrder: [...runtimeGate.stageOrder],
        runtimeGateStatus: runtimeGate.gate.status,
        runtimeGateReasonCode: runtimeGate.gate.reasonCode,
        runtimePolicyDecision: runtimeGate.policyDecision,
        runtimePolicyReasonCode: runtimeGate.policyReasonCode,
        runtimeApprovalCheckpoint: runtimeGate.approval.checkpoint,
        runtimeApprovalRequired: runtimeGate.approval.required,
        runtimeApprovalSatisfied: runtimeGate.approval.satisfied,
      }),
      performedBy: access.userId,
      performedAt: now,
    });
    const runtimeLifecycle = buildComplianceActionLifecycleAuditSnapshot({
      gateResult: runtimeGate,
      plannedAt: now,
      executeAt: now,
      verifyAt: now,
      verifyPassed: linkedEvidenceObjectIds.includes(String(evidenceObjectId)),
      verifyReasonCode: linkedEvidenceObjectIds.includes(String(evidenceObjectId))
        ? undefined
        : "evidence_link_missing_after_capture",
      auditAt: now,
      auditRef: `objectActions:${String(captureActionId)}`,
    });

    return {
      success: true,
      dossierObjectId: dossierObject._id,
      nextState: "response_received" as ComplianceAvvOutreachState,
      evidenceObjectId,
      evidenceCreated: createdEvidenceEntry,
      intakeMode: args.intakeMode,
      outcome: args.outcome,
      respondedAt,
      linkedEvidenceObjectIds,
      stateReason,
      runtimeLifecycle,
    };
  },
});

export const linkEvidenceToAvvOutreachDossier = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    dossierObjectId: v.id("objects"),
    evidenceObjectId: v.id("objects"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    if (!access.isOrgOwner) {
      throw new Error("Only organization owners can link evidence to AVV outreach dossiers.");
    }

    const dossierObject = await requireAvvDossierObject(ctx, {
      dossierObjectId: args.dossierObjectId,
      organizationId: access.organizationId,
    });
    const dossierRow = mapAvvOutreachObjectToRow(dossierObject);

    const evidenceObject = await ctx.db.get(args.evidenceObjectId);
    if (!evidenceObject || evidenceObject.type !== COMPLIANCE_EVIDENCE_OBJECT_TYPE) {
      throw new Error("Evidence object was not found or is not a compliance evidence record.");
    }
    if (String(evidenceObject.organizationId) !== String(access.organizationId)) {
      throw new Error("Cross-organization evidence linking is not allowed.");
    }

    const evidenceRow = await (ctx as any).runQuery(generatedApi.api.complianceEvidenceVault.getEvidenceMetadata, {
      sessionId: args.sessionId,
      organizationId: access.organizationId,
      evidenceObjectId: args.evidenceObjectId,
    });
    if (!evidenceRow?.contractValid) {
      throw new Error("Evidence metadata contract is invalid; dossier linking is blocked.");
    }
    if (evidenceRow.subtype !== "avv_provider") {
      throw new Error("Only avv_provider evidence can be linked to AVV outreach dossiers.");
    }
    if (evidenceRow.sourceType === "platform_inherited") {
      throw new Error("Platform-inherited evidence cannot be linked as provider outreach response evidence.");
    }

    const hasProviderAvvRiskLink = Array.isArray(evidenceRow.riskReferences)
      && evidenceRow.riskReferences.some((entry: Record<string, unknown>) => (
        entry.riskId === "R-002" && entry.controlId === "provider_avv"
      ));
    if (!hasProviderAvvRiskLink) {
      await (ctx as any).runMutation(generatedApi.api.complianceEvidenceVault.linkEvidenceToRisk, {
        sessionId: args.sessionId,
        organizationId: access.organizationId,
        evidenceObjectId: args.evidenceObjectId,
        riskId: "R-002",
        controlId: "provider_avv",
        note: "Linked from AVV outreach one-click evidence action.",
      });
    }

    const now = Date.now();
    const linkedEvidenceObjectIds = Array.from(
      new Set([...dossierRow.linkedEvidenceObjectIds, String(args.evidenceObjectId)]),
    ).sort((left, right) => left.localeCompare(right));
    const runtimeGate = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_link_avv_outreach_evidence",
      riskLevel: "medium",
      channel: "compliance_vault",
      targetSystemClass: "platform_internal",
      humanApprovalGranted: access.isOrgOwner,
    });
    if (runtimeGate.gate.status !== "passed") {
      throw new Error(`Compliance runtime gate blocked (${runtimeGate.gate.reasonCode}).`);
    }
    const note = normalizeOptionalString(args.note);
    const shouldMarkResponseReceived = dossierRow.state === "sent"
      || dossierRow.state === "awaiting_response"
      || dossierRow.state === "escalated";
    const nextState = shouldMarkResponseReceived ? "response_received" : dossierRow.state;

    await ctx.db.patch(dossierObject._id, {
      status: nextState,
      customProperties: compactRecord({
        ...asRecord(dossierObject.customProperties),
        linkedEvidenceObjectIds,
        stateReason: note ?? "Evidence linked to dossier from inbox panel.",
        lastLinkedEvidenceObjectId: String(args.evidenceObjectId),
        lastLinkedEvidenceAt: now,
        respondedAt: shouldMarkResponseReceived ? now : dossierRow.respondedAt ?? undefined,
        lastTransitionAt: now,
        lastTransitionBy: String(access.userId),
      }),
      updatedAt: now,
    });

    const linkActionId = await ctx.db.insert("objectActions", {
      organizationId: access.organizationId,
      objectId: dossierObject._id,
      actionType: "compliance_avv_outreach_evidence_linked",
      actionData: compactRecord({
        evidenceObjectId: String(args.evidenceObjectId),
        note,
        nextState,
        runtimeContractVersion: runtimeGate.contractVersion,
        runtimeStageOrder: [...runtimeGate.stageOrder],
        runtimeGateStatus: runtimeGate.gate.status,
        runtimeGateReasonCode: runtimeGate.gate.reasonCode,
        runtimePolicyDecision: runtimeGate.policyDecision,
        runtimePolicyReasonCode: runtimeGate.policyReasonCode,
        runtimeApprovalCheckpoint: runtimeGate.approval.checkpoint,
        runtimeApprovalRequired: runtimeGate.approval.required,
        runtimeApprovalSatisfied: runtimeGate.approval.satisfied,
      }),
      performedBy: access.userId,
      performedAt: now,
    });
    const runtimeLifecycle = buildComplianceActionLifecycleAuditSnapshot({
      gateResult: runtimeGate,
      plannedAt: now,
      executeAt: now,
      verifyAt: now,
      verifyPassed: linkedEvidenceObjectIds.includes(String(args.evidenceObjectId)),
      verifyReasonCode: linkedEvidenceObjectIds.includes(String(args.evidenceObjectId))
        ? undefined
        : "evidence_link_missing_after_link",
      auditAt: now,
      auditRef: `objectActions:${String(linkActionId)}`,
    });

    return {
      success: true,
      dossierObjectId: dossierObject._id,
      evidenceObjectId: args.evidenceObjectId,
      linkedEvidenceObjectIds,
      nextState,
      linkedAt: now,
      runtimeLifecycle,
    };
  },
});

type AvvOutreachSlaCadenceMutationOutcome =
  | { outcome: "skipped"; reason: string }
  | { outcome: "reminder_alerted"; reminderSequence: number; nextState: ComplianceAvvOutreachState }
  | { outcome: "escalated" };

function buildAvvOutreachReminderAlertReason(reminderSequence: number): string {
  return `SLA reminder ${reminderSequence} due: provider response remains outstanding.`;
}

async function applyAvvOutreachSlaCadenceMutationForDossier(args: {
  ctx: MutationCtx;
  dossierObject: Doc<"objects">;
  now: number;
}): Promise<AvvOutreachSlaCadenceMutationOutcome> {
  const { ctx, dossierObject, now } = args;
  if (
    dossierObject.type !== COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE
    || dossierObject.subtype !== COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE
  ) {
    return {
      outcome: "skipped",
      reason: "wrong_type_or_subtype",
    };
  }

  const row = mapAvvOutreachObjectToRow(dossierObject);
  if (!row.contractValid) {
    return {
      outcome: "skipped",
      reason: "invalid_contract",
    };
  }
  if (row.respondedAt !== null || isOutreachTerminalState(row.state)) {
    return {
      outcome: "skipped",
      reason: "response_or_terminal_state",
    };
  }
  if (!isOutreachSlaEligibleState(row.state)) {
    return {
      outcome: "skipped",
      reason: "state_not_eligible",
    };
  }

  const cadence = computeComplianceAvvOutreachSlaCadence({
    state: row.state,
    now,
    slaFirstDueAt: row.slaFirstDueAt,
    slaReminderAt: row.slaReminderAt,
    slaEscalationAt: row.slaEscalationAt,
    reminderAlertCount: row.reminderAlertCount,
    nextReminderAlertAt: row.nextReminderAlertAt,
  });
  if (!cadence.reminderDue && !cadence.escalationDue) {
    return {
      outcome: "skipped",
      reason: "not_due",
    };
  }

  const customProperties = asRecord(dossierObject.customProperties);
  if (cadence.escalationDue) {
    await ctx.db.patch(dossierObject._id, {
      status: "escalated",
      customProperties: compactRecord({
        ...customProperties,
        stateReason: "SLA escalation alert: provider response breach remains unresolved.",
        escalationAlertedAt: now,
        escalationBreachedAt: cadence.escalationAt ?? now,
        nextReminderAlertAt: undefined,
        lastSlaCadenceCheckAt: now,
        lastTransitionAt: now,
        lastTransitionBy: "system:avv_sla_cadence",
      }),
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: dossierObject.organizationId,
      objectId: dossierObject._id,
      actionType: "compliance_avv_outreach_sla_escalation_alerted",
      actionData: compactRecord({
        escalationAt: cadence.escalationAt ?? undefined,
        reminderAlertCount: row.reminderAlertCount,
        stateBefore: row.state,
      }),
      performedAt: now,
    });

    return {
      outcome: "escalated",
    };
  }

  const reminderSequence = row.reminderAlertCount + 1;
  const nextReminderCandidateAt = now + AVV_OUTREACH_REMINDER_CADENCE_MS;
  const nextReminderAlertAt =
    reminderSequence >= AVV_OUTREACH_MAX_REMINDER_ALERTS
      ? undefined
      : cadence.escalationAt !== null && nextReminderCandidateAt >= cadence.escalationAt
        ? undefined
        : nextReminderCandidateAt;
  const nextState: ComplianceAvvOutreachState =
    row.state === "sent" ? "awaiting_response" : row.state;

  await ctx.db.patch(dossierObject._id, {
    status: nextState,
    customProperties: compactRecord({
      ...customProperties,
      stateReason: buildAvvOutreachReminderAlertReason(reminderSequence),
      reminderAlertCount: reminderSequence,
      lastReminderAlertAt: now,
      nextReminderAlertAt,
      lastSlaCadenceCheckAt: now,
      lastTransitionAt: now,
      lastTransitionBy: "system:avv_sla_cadence",
    }),
    updatedAt: now,
  });

  await ctx.db.insert("objectActions", {
    organizationId: dossierObject.organizationId,
    objectId: dossierObject._id,
    actionType: "compliance_avv_outreach_sla_reminder_alerted",
    actionData: compactRecord({
      reminderSequence,
      nextReminderAlertAt,
      escalationAt: cadence.escalationAt ?? undefined,
      stateBefore: row.state,
      stateAfter: nextState,
    }),
    performedAt: now,
  });

  return {
    outcome: "reminder_alerted",
    reminderSequence,
    nextState,
  };
}

export const processAvvOutreachSlaCadenceSweepInternal = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit =
      typeof args.limit === "number" && Number.isFinite(args.limit) && args.limit > 0
        ? Math.floor(args.limit)
        : 500;

    const rows = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE)
          .eq("subtype", COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE),
      )
      .collect();
    const orderedRows = [...rows].sort((left, right) => {
      if (left.updatedAt !== right.updatedAt) {
        return left.updatedAt - right.updatedAt;
      }
      return String(left._id).localeCompare(String(right._id));
    });
    const targetRows = orderedRows.slice(0, limit);

    let reminderAlertedCount = 0;
    let escalatedCount = 0;
    let skippedCount = 0;

    for (const dossierObject of targetRows) {
      const outcome = await applyAvvOutreachSlaCadenceMutationForDossier({
        ctx,
        dossierObject,
        now,
      });
      if (outcome.outcome === "reminder_alerted") {
        reminderAlertedCount += 1;
      } else if (outcome.outcome === "escalated") {
        escalatedCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    return {
      success: true,
      scannedCount: targetRows.length,
      reminderAlertedCount,
      escalatedCount,
      skippedCount,
      processedAt: now,
    };
  },
});

export const getQueuedAvvOutreachEmailInternal = internalQuery({
  args: {
    emailQueueId: v.id("emailQueue"),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailQueueId);
    if (!email) {
      return null;
    }
    if (email.type !== AVV_OUTREACH_EMAIL_QUEUE_TYPE) {
      return null;
    }
    return email;
  },
});

export const markQueuedAvvOutreachEmailSentInternal = internalMutation({
  args: {
    emailQueueId: v.id("emailQueue"),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailQueueId);
    if (!email || email.type !== AVV_OUTREACH_EMAIL_QUEUE_TYPE) {
      throw new Error("Queued AVV outreach email not found.");
    }
    if (!email.organizationId || !email.dossierObjectId) {
      throw new Error("Queued AVV outreach email is missing organization/dossier context.");
    }

    const dossierObject = await requireAvvDossierObject(ctx, {
      dossierObjectId: email.dossierObjectId,
      organizationId: email.organizationId,
    });
    const now = Date.now();

    await ctx.db.patch(args.emailQueueId, {
      status: "sent",
      sentAt: now,
      externalId: normalizeOptionalString(args.messageId),
      updatedAt: now,
      nextRetryAt: undefined,
    });

    await ctx.db.patch(dossierObject._id, {
      status: "sent",
      customProperties: compactRecord({
        ...asRecord(dossierObject.customProperties),
        stateReason: "Outreach email delivered; awaiting provider response.",
        lastContactedAt: now,
        lastSentEmailId: String(args.emailQueueId),
        lastSentAt: now,
      }),
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: email.organizationId,
      objectId: dossierObject._id,
      actionType: "compliance_avv_outreach_email_sent",
      actionData: compactRecord({
        queueId: String(args.emailQueueId),
        messageId: normalizeOptionalString(args.messageId),
      }),
      performedAt: now,
    });

    await (ctx as any).runMutation(generatedApi.internal.communicationTracking.logEmailCommunication, {
      organizationId: email.organizationId,
      recipientEmail: email.to,
      subject: email.subject,
      emailType: "compliance_avv_outreach",
      success: true,
      messageId: normalizeOptionalString(args.messageId),
      metadata: compactRecord({
        queueId: String(args.emailQueueId),
        dossierObjectId: String(dossierObject._id),
      }),
    });

    return {
      success: true,
      emailQueueId: args.emailQueueId,
      sentAt: now,
    };
  },
});

export const markQueuedAvvOutreachEmailFailedInternal = internalMutation({
  args: {
    emailQueueId: v.id("emailQueue"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailQueueId);
    if (!email || email.type !== AVV_OUTREACH_EMAIL_QUEUE_TYPE) {
      throw new Error("Queued AVV outreach email not found.");
    }
    if (!email.organizationId || !email.dossierObjectId) {
      throw new Error("Queued AVV outreach email is missing organization/dossier context.");
    }

    const dossierObject = await requireAvvDossierObject(ctx, {
      dossierObjectId: email.dossierObjectId,
      organizationId: email.organizationId,
    });

    const now = Date.now();
    const retryCount = (typeof email.retryCount === "number" ? email.retryCount : 0) + 1;
    const maxRetries = typeof email.maxRetries === "number" ? email.maxRetries : AVV_OUTREACH_MAX_RETRIES;
    const retryPlan = computeComplianceAvvOutreachRetryPlan({
      retryCount,
      now,
      maxRetries,
    });

    await ctx.db.patch(email._id, {
      status: retryPlan.willRetry ? "pending" : "failed",
      retryCount,
      maxRetries,
      lastError: args.errorMessage,
      nextRetryAt: retryPlan.nextRetryAt ?? undefined,
      updatedAt: now,
    });

    await ctx.db.patch(dossierObject._id, {
      status: retryPlan.willRetry ? "queued" : "escalated",
      customProperties: compactRecord({
        ...asRecord(dossierObject.customProperties),
        stateReason: retryPlan.willRetry
          ? "Email delivery failed; retry scheduled."
          : "Email delivery failed; retries exhausted.",
        lastQueueError: args.errorMessage,
        lastQueueErrorAt: now,
        lastRetryAt: retryPlan.willRetry ? retryPlan.nextRetryAt : undefined,
      }),
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: email.organizationId,
      objectId: dossierObject._id,
      actionType: retryPlan.willRetry
        ? "compliance_avv_outreach_email_retry_scheduled"
        : "compliance_avv_outreach_email_failed_terminal",
      actionData: compactRecord({
        queueId: String(email._id),
        retryCount,
        maxRetries,
        nextRetryAt: retryPlan.nextRetryAt ?? undefined,
        errorMessage: args.errorMessage,
      }),
      performedAt: now,
    });

    await (ctx as any).runMutation(generatedApi.internal.communicationTracking.logEmailCommunication, {
      organizationId: email.organizationId,
      recipientEmail: email.to,
      subject: email.subject,
      emailType: "compliance_avv_outreach",
      success: false,
      errorMessage: args.errorMessage,
      metadata: compactRecord({
        queueId: String(email._id),
        dossierObjectId: String(dossierObject._id),
        retryCount,
        maxRetries,
      }),
    });

    if (retryPlan.willRetry && retryPlan.backoffMs !== null) {
      await (ctx.scheduler as any).runAfter(
        retryPlan.backoffMs,
        generatedApi.internal.complianceOutreachAgent.processQueuedAvvOutreachEmail,
        { emailQueueId: email._id },
      );
    }

    return {
      success: true,
      emailQueueId: email._id,
      retryCount,
      willRetry: retryPlan.willRetry,
      nextRetryAt: retryPlan.nextRetryAt,
      terminalFailure: !retryPlan.willRetry,
    };
  },
});

export const processQueuedAvvOutreachEmail = internalAction({
  args: {
    emailQueueId: v.id("emailQueue"),
  },
  handler: async (ctx, args) => {
    const email = await (ctx as any).runQuery(
      generatedApi.internal.complianceOutreachAgent.getQueuedAvvOutreachEmailInternal,
      { emailQueueId: args.emailQueueId },
    );
    if (!email) {
      return { success: false, skipped: true, reason: "missing_or_wrong_type" };
    }
    if (email.status !== "pending") {
      return { success: true, skipped: true, reason: "not_pending" };
    }

    const now = Date.now();
    if (typeof email.nextRetryAt === "number" && email.nextRetryAt > now) {
      return {
        success: true,
        skipped: true,
        reason: "retry_not_due",
        nextRetryAt: email.nextRetryAt,
      };
    }
    if (!email.organizationId || !email.dossierObjectId) {
      await (ctx as any).runMutation(
        generatedApi.internal.complianceOutreachAgent.markQueuedAvvOutreachEmailFailedInternal,
        {
          emailQueueId: args.emailQueueId,
          errorMessage: "Queue item is missing required organization or dossier context.",
        },
      );
      return { success: false, reason: "invalid_queue_context" };
    }

    try {
      const sendResult = await (ctx as any).runAction(generatedApi.internal.emailDelivery.sendEmailWithDefaultSender, {
        to: email.to,
        subject: email.subject,
        html: email.htmlBody,
        text: email.textBody,
      });

      if (!sendResult?.success) {
        const errorMessage = normalizeOptionalString(sendResult?.error) ?? "Unknown outbound delivery failure.";
        await (ctx as any).runMutation(
          generatedApi.internal.complianceOutreachAgent.markQueuedAvvOutreachEmailFailedInternal,
          {
            emailQueueId: args.emailQueueId,
            errorMessage,
          },
        );
        return {
          success: false,
          reason: "delivery_failed",
          error: errorMessage,
        };
      }

      await (ctx as any).runMutation(
        generatedApi.internal.complianceOutreachAgent.markQueuedAvvOutreachEmailSentInternal,
        {
          emailQueueId: args.emailQueueId,
          messageId: normalizeOptionalString(sendResult.messageId),
        },
      );

      return {
        success: true,
        emailQueueId: args.emailQueueId,
        messageId: normalizeOptionalString(sendResult.messageId),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown outbound delivery exception.";
      await (ctx as any).runMutation(
        generatedApi.internal.complianceOutreachAgent.markQueuedAvvOutreachEmailFailedInternal,
        {
          emailQueueId: args.emailQueueId,
          errorMessage,
        },
      );
      return {
        success: false,
        reason: "delivery_exception",
        error: errorMessage,
      };
    }
  },
});
