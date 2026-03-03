/**
 * ONBOARDING AUDIT DELIVERABLE
 *
 * Generates and persists the One of One audit workflow PDF deliverable.
 * Includes deterministic file naming and replay-safe idempotency for the same
 * audit session + normalized input payload.
 */

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { createDocxDocumentTool } from "../ai/tools/docxTools";
import { generatePdfFromTemplate } from "../lib/generatePdf";
import { buildAuditLifecycleEventKey } from "./funnelEvents";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

const AUDIT_RECOMMENDATION_TEMPLATE_CODE = "audit_recommendation_v1";
const AUDIT_WORKFLOW_TEMPLATE_CODE_LEGACY = "leadmagnet_audit_workflow_report_v1";

const auditChannelValidator = v.union(v.literal("webchat"), v.literal("native_guest"));

const actionPlanItemValidator = v.object({
  step: v.string(),
  owner: v.string(),
  timing: v.optional(v.string()),
});

const auditDeliverableInputValidator = v.object({
  language: v.optional(v.string()),
  labels: v.optional(v.any()),
  title: v.optional(v.string()),
  subtitle: v.optional(v.string()),
  author: v.optional(v.string()),
  authorLogo: v.optional(v.string()),
  clientName: v.optional(v.string()),
  businessType: v.optional(v.string()),
  revenueRange: v.optional(v.string()),
  teamSize: v.optional(v.string()),
  workflowName: v.optional(v.string()),
  workflowSummary: v.optional(v.string()),
  workflowOutcome: v.optional(v.string()),
  weeklyHoursRecovered: v.optional(v.number()),
  actionPlan: v.optional(v.array(actionPlanItemValidator)),
  guardrails: v.optional(v.array(v.string())),
  toolingRecommendations: v.optional(v.array(v.string())),
  ctaLine: v.optional(v.string()),
  brandColor: v.optional(v.string()),
  footerText: v.optional(v.string()),
  outputFormats: v.optional(v.array(v.union(v.literal("pdf"), v.literal("docx")))),
});

type AuditChannel = "webchat" | "native_guest";
type AuditQuestionId =
  | "business_revenue"
  | "team_size"
  | "monday_priority"
  | "delegation_gap"
  | "reclaimed_time";

type ActionPlanItem = {
  step: string;
  owner: string;
  timing?: string;
};

type AuditDeliverableInput = {
  language?: string;
  labels?: Record<string, string>;
  title?: string;
  subtitle?: string;
  author?: string;
  authorLogo?: string;
  clientName?: string;
  businessType?: string;
  revenueRange?: string;
  teamSize?: string;
  workflowName?: string;
  workflowSummary?: string;
  workflowOutcome?: string;
  weeklyHoursRecovered?: number;
  actionPlan?: ActionPlanItem[];
  guardrails?: string[];
  toolingRecommendations?: string[];
  ctaLine?: string;
  brandColor?: string;
  footerText?: string;
  outputFormats?: DeliverableFormat[];
};

type DeliverableFormat = "pdf" | "docx";

type DeliverableRenderSource = "apitemplate_io_v2_create_pdf_from_html";

type RequestedFormatRecord = {
  format: DeliverableFormat;
  status: "generated" | "unsupported";
  blockedReasonCode?: "docx_renderer_unavailable";
  blockedReasonDetail?: string;
};

type AuditTemplateData = {
  language: string;
  labels: Record<string, string>;
  title: string;
  subtitle?: string;
  generatedDate: string;
  author: string;
  authorLogo?: string;
  clientName: string;
  businessType: string;
  revenueRange: string;
  teamSize: string;
  workflowName: string;
  workflowSummary: string;
  workflowOutcome: string;
  weeklyHoursRecovered: number;
  actionPlan: ActionPlanItem[];
  guardrails: string[];
  toolingRecommendations: string[];
  ctaLine?: string;
  brandColor?: string;
  footerText?: string;
};

type StoredDeliverableRecord = {
  deliverableKey: string;
  inputFingerprint: string;
  templateCode: string;
  templateVersion: string;
  renderSource: DeliverableRenderSource;
  requestedFormats: RequestedFormatRecord[];
  fileName: string;
  storageId: string;
  downloadUrl?: string;
  sourceDownloadUrl?: string;
  docxFileName?: string;
  docxStorageId?: string;
  docxDownloadUrl?: string;
  generatedAt: number;
};

function resolveAuditChannelFallbackOrder(channel: AuditChannel): AuditChannel[] {
  if (channel === "native_guest") {
    return ["native_guest", "webchat"];
  }
  return ["webchat", "native_guest"];
}

function normalizeOptionalString(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, maxLength);
}

function normalizeRequiredString(value: unknown, fallback: string, maxLength = 500): string {
  return normalizeOptionalString(value, maxLength) || fallback;
}

function normalizeOptionalColor(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : undefined;
}

function normalizeStringList(value: unknown, maxItems = 8, maxLength = 240): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const results: string[] = [];
  for (const entry of value) {
    const normalized = normalizeOptionalString(entry, maxLength);
    if (!normalized) {
      continue;
    }
    results.push(normalized);
    if (results.length >= maxItems) {
      break;
    }
  }
  return results;
}

function normalizeActionPlanItems(value: unknown, maxItems = 6): ActionPlanItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: ActionPlanItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const step = normalizeOptionalString(record.step, 300);
    const owner = normalizeOptionalString(record.owner, 120);
    const timing = normalizeOptionalString(record.timing, 120);
    if (!step || !owner) {
      continue;
    }
    normalized.push({ step, owner, timing });
    if (normalized.length >= maxItems) {
      break;
    }
  }
  return normalized;
}

function normalizeMetadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function resolveDeterministicAuditSessionKey(args: {
  channel: AuditChannel;
  organizationId: Id<"organizations">;
  sessionToken?: string;
}): string {
  const normalizedSessionToken = normalizeOptionalString(args.sessionToken, 256);
  if (normalizedSessionToken) {
    return `audit:${args.channel}:${normalizedSessionToken}`;
  }
  return `audit:${args.channel}:${String(args.organizationId)}`;
}

function getAuditAnswer(session: Doc<"onboardingAuditSessions">, questionId: AuditQuestionId): string | undefined {
  const questionState = session.questionState?.[questionId] as
    | { answer?: string }
    | undefined;
  return normalizeOptionalString(questionState?.answer, 2000);
}

function extractBusinessAndRevenue(answer?: string): { businessType?: string; revenueRange?: string } {
  if (!answer) {
    return {};
  }

  const atSplit = answer.split(/\s+at\s+/i);
  if (atSplit.length === 2) {
    return {
      businessType: normalizeOptionalString(atSplit[0], 240),
      revenueRange: normalizeOptionalString(atSplit[1], 240),
    };
  }

  const revenueMatch = answer.match(
    /((?:\$|€|£)\s?\d[\d.,]*(?:\s?(?:k|m|b|arr|mrr|million|billion))?(?:\s*-\s*(?:\$|€|£)?\s?\d[\d.,]*(?:\s?(?:k|m|b|arr|mrr|million|billion))?)?)/i
  );

  if (!revenueMatch) {
    return { businessType: normalizeOptionalString(answer, 240) };
  }

  const revenueRange = normalizeOptionalString(revenueMatch[1], 240);
  const withoutRevenue = normalizeOptionalString(
    answer.replace(revenueMatch[1], "").replace(/\s{2,}/g, " ").trim().replace(/[,-]\s*$/, ""),
    240
  );

  return {
    businessType: withoutRevenue,
    revenueRange,
  };
}

function extractHoursFromAnswer(answer?: string): number | undefined {
  if (!answer) {
    return undefined;
  }
  const match = answer.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return undefined;
  }
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.max(1, Math.min(168, Math.round(parsed)));
}

function slugify(value: string, maxLength = 40): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
  return slug || "audit-session";
}

function buildDeterministicFileName(auditSessionKey: string, inputFingerprint: string): string {
  const sessionSlug = slugify(auditSessionKey, 44);
  const shortFingerprint = inputFingerprint.slice(0, 12);
  return `audit-workflow-${sessionSlug}-${shortFingerprint}.pdf`;
}

function stripPdfExtension(fileName: string): string {
  return fileName.toLowerCase().endsWith(".pdf") ? fileName.slice(0, -4) : fileName;
}

function replacePdfWithDocx(fileName: string): string {
  return fileName.toLowerCase().endsWith(".pdf")
    ? `${fileName.slice(0, -4)}.docx`
    : `${fileName}.docx`;
}

function normalizeRequestedOutputFormats(value: unknown): DeliverableFormat[] {
  if (!Array.isArray(value)) {
    return ["pdf"];
  }
  const normalized = Array.from(
    new Set(
      value.filter((entry): entry is DeliverableFormat => entry === "pdf" || entry === "docx")
    )
  ).sort((left, right) => left.localeCompare(right));
  return normalized.length > 0 ? normalized : ["pdf"];
}

function formatGeneratedDate(now: number): string {
  return new Date(now).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function resolveExistingDeliverableRecord(
  session: Doc<"onboardingAuditSessions">,
  deliverableKey: string
): StoredDeliverableRecord | null {
  const metadata = normalizeMetadataRecord(session.metadata);
  const deliverables = metadata.auditDeliverables;
  if (!deliverables || typeof deliverables !== "object" || Array.isArray(deliverables)) {
    return null;
  }
  const entry = (deliverables as Record<string, unknown>)[deliverableKey];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const storageId = normalizeOptionalString(record.storageId, 256);
  const fileName = normalizeOptionalString(record.fileName, 256);
  const templateCode = normalizeOptionalString(record.templateCode, 120);
  const templateVersion = normalizeOptionalString(record.templateVersion, 64) || "1.0";
  const renderSource = normalizeOptionalString(record.renderSource, 120);
  const inputFingerprint = normalizeOptionalString(record.inputFingerprint, 120);
  const generatedAt = typeof record.generatedAt === "number" ? record.generatedAt : undefined;
  if (!storageId || !fileName || !templateCode || !inputFingerprint || !generatedAt) {
    return null;
  }
  const requestedFormatsRaw = Array.isArray(record.requestedFormats)
    ? record.requestedFormats
    : [];
  const requestedFormats: RequestedFormatRecord[] = requestedFormatsRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const parsed = entry as Record<string, unknown>;
      const format = normalizeOptionalString(parsed.format, 16);
      const status = normalizeOptionalString(parsed.status, 24);
      if ((format !== "pdf" && format !== "docx") || (status !== "generated" && status !== "unsupported")) {
        return null;
      }
      return {
        format,
        status,
        blockedReasonCode:
          normalizeOptionalString(parsed.blockedReasonCode, 80) || undefined,
        blockedReasonDetail:
          normalizeOptionalString(parsed.blockedReasonDetail, 500) || undefined,
      } as RequestedFormatRecord;
    })
    .filter((entry): entry is RequestedFormatRecord => Boolean(entry));
  return {
    deliverableKey,
    storageId,
    fileName,
    templateCode,
    templateVersion,
    renderSource:
      renderSource === "apitemplate_io_v2_create_pdf_from_html"
        ? renderSource
        : "apitemplate_io_v2_create_pdf_from_html",
    requestedFormats:
      requestedFormats.length > 0 ? requestedFormats : [{ format: "pdf", status: "generated" }],
    inputFingerprint,
    generatedAt,
    downloadUrl: normalizeOptionalString(record.downloadUrl, 2000),
    sourceDownloadUrl: normalizeOptionalString(record.sourceDownloadUrl, 2000),
    docxFileName: normalizeOptionalString(record.docxFileName, 256),
    docxStorageId: normalizeOptionalString(record.docxStorageId, 256),
    docxDownloadUrl: normalizeOptionalString(record.docxDownloadUrl, 2000),
  };
}

function buildDefaultActionPlan(args: {
  mondayPriority?: string;
  delegationGap?: string;
}): ActionPlanItem[] {
  return [
    {
      step: `Map the current Monday bottleneck: ${args.mondayPriority || "your highest-friction intake and triage flow"}.`,
      owner: "Founder",
      timing: "Day 1",
    },
    {
      step: `Define delegation rules for: ${args.delegationGap || "the task nobody executes at your quality bar yet"}.`,
      owner: "Operator",
      timing: "Day 2",
    },
    {
      step: "Launch a monitored workflow with daily review checkpoints and explicit rollback criteria.",
      owner: "Operator",
      timing: "Day 3-7",
    },
  ];
}

function buildAuditTemplateData(args: {
  session: Doc<"onboardingAuditSessions">;
  input?: AuditDeliverableInput;
  now: number;
}): AuditTemplateData {
  const resolvedLanguage = normalizeOptionalString(args.input?.language, 32)?.toLowerCase() || "en";
  const normalizedLabelsInput = (() => {
    if (!args.input?.labels || typeof args.input.labels !== "object" || Array.isArray(args.input.labels)) {
      return {} as Record<string, string>;
    }
    const output: Record<string, string> = {};
    for (const [key, value] of Object.entries(args.input.labels)) {
      const normalized = normalizeOptionalString(value, 120);
      if (normalized) {
        output[key] = normalized;
      }
    }
    return output;
  })();
  const labelsByLang: Record<string, Record<string, string>> = {
    en: {
      documentLabel: "AUDIT RECOMMENDATION",
      generatedPrefix: "Generated",
      kpiLabel: "Expected Weekly Lift",
      clientSnapshotTitle: "Client Snapshot",
      clientLabel: "Client",
      businessLabel: "Business",
      revenueLabel: "Revenue",
      teamLabel: "Team",
      workflowTitle: "Recommended Workflow",
      actionPlanTitle: "7-Day Action Plan",
      guardrailsTitle: "Execution Guardrails",
      toolingTitle: "Tooling Recommendations",
      nextMoveLabel: "Next Move",
      preparedByPrefix: "Prepared by",
      confidentialityNote: "Confidential: Prepared for internal planning use.",
    },
    de: {
      documentLabel: "AUDIT-EMPFEHLUNG",
      generatedPrefix: "Erstellt",
      kpiLabel: "Erwarteter Wochengewinn",
      clientSnapshotTitle: "Kundenprofil",
      clientLabel: "Kunde",
      businessLabel: "Business",
      revenueLabel: "Umsatz",
      teamLabel: "Team",
      workflowTitle: "Empfohlener Workflow",
      actionPlanTitle: "7-Tage-Aktionsplan",
      guardrailsTitle: "Umsetzungsleitplanken",
      toolingTitle: "Tooling-Empfehlungen",
      nextMoveLabel: "Nächster Schritt",
      preparedByPrefix: "Erstellt von",
      confidentialityNote: "Vertraulich: Nur für interne Planung bestimmt.",
    },
  };
  const languageFamily = resolvedLanguage.split("-")[0] || "en";
  const resolvedLabels = {
    ...(labelsByLang[languageFamily] || labelsByLang.en),
    ...normalizedLabelsInput,
  };
  const businessRevenueAnswer = getAuditAnswer(args.session, "business_revenue");
  const teamSizeAnswer = getAuditAnswer(args.session, "team_size");
  const mondayPriorityAnswer = getAuditAnswer(args.session, "monday_priority");
  const delegationGapAnswer = getAuditAnswer(args.session, "delegation_gap");
  const reclaimedTimeAnswer = getAuditAnswer(args.session, "reclaimed_time");
  const parsedBusinessRevenue = extractBusinessAndRevenue(businessRevenueAnswer);

  const workflowSummary = normalizeRequiredString(
    args.input?.workflowSummary || args.session.workflowRecommendation,
    "Your highest-leverage next step is to operationalize one workflow so execution quality compounds without founder bottlenecks.",
    1400
  );

  const weeklyHoursRecovered =
    (typeof args.input?.weeklyHoursRecovered === "number" && Number.isFinite(args.input.weeklyHoursRecovered)
      ? Math.max(1, Math.min(168, Math.round(args.input.weeklyHoursRecovered)))
      : undefined)
    || extractHoursFromAnswer(reclaimedTimeAnswer)
    || 10;

  const actionPlan = normalizeActionPlanItems(args.input?.actionPlan);
  const guardrails = normalizeStringList(args.input?.guardrails, 8, 240);
  const toolingRecommendations = normalizeStringList(args.input?.toolingRecommendations, 8, 240);

  return {
    language: resolvedLanguage,
    labels: resolvedLabels,
    title: normalizeRequiredString(args.input?.title, "Your One Workflow Report", 140),
    subtitle: normalizeOptionalString(args.input?.subtitle, 240),
    generatedDate: formatGeneratedDate(args.now),
    author: normalizeRequiredString(args.input?.author, "One of One Operator", 140),
    authorLogo: normalizeOptionalString(args.input?.authorLogo, 2000),
    clientName: normalizeRequiredString(
      args.input?.clientName || args.session.capturedName,
      "Business Owner",
      160
    ),
    businessType: normalizeRequiredString(
      args.input?.businessType || parsedBusinessRevenue.businessType || businessRevenueAnswer,
      "Business in active growth stage",
      220
    ),
    revenueRange: normalizeRequiredString(
      args.input?.revenueRange || parsedBusinessRevenue.revenueRange,
      "Revenue range not specified",
      220
    ),
    teamSize: normalizeRequiredString(args.input?.teamSize || teamSizeAnswer, "Team size not specified", 120),
    workflowName: normalizeRequiredString(args.input?.workflowName, "Founder Priority Workflow", 200),
    workflowSummary,
    workflowOutcome: normalizeRequiredString(
      args.input?.workflowOutcome,
      `Recover ${weeklyHoursRecovered} founder hours weekly while preserving your quality bar.`,
      420
    ),
    weeklyHoursRecovered,
    actionPlan: actionPlan.length > 0
      ? actionPlan
      : buildDefaultActionPlan({
          mondayPriority: mondayPriorityAnswer,
          delegationGap: delegationGapAnswer,
        }),
    guardrails: guardrails.length > 0
      ? guardrails
      : [
          "Keep high-value decisions in approval mode until confidence is proven.",
          "Log every workflow action for auditability and rollback.",
          "Escalate anomalies to manual review within the same business day.",
        ],
    toolingRecommendations: toolingRecommendations.length > 0
      ? toolingRecommendations
      : [
          "Use one source-of-truth inbox or CRM trigger for intake events.",
          "Route exceptions to a single owner to avoid fragmented follow-up.",
        ],
    ctaLine: normalizeOptionalString(args.input?.ctaLine, 280),
    brandColor: normalizeOptionalColor(args.input?.brandColor) || "#1D4ED8",
    footerText: normalizeOptionalString(
      args.input?.footerText,
      300
    ) || "One of One - Audit deliverable generated from live intake conversation.",
  };
}

function buildCanonicalPayload(templateData: AuditTemplateData): Record<string, unknown> {
  const actionPlan = templateData.actionPlan.map((item, index) => ({
    step: item.step,
    owner: item.owner,
    timing: item.timing || "",
  }));
  const actionSteps = templateData.actionPlan.map((item, index) => ({
    step: index + 1,
    title: item.step,
    description: item.timing ? `Execution window: ${item.timing}` : "",
    owner: item.owner as "Founder" | "Operator",
    day: item.timing || "",
  }));
  return {
    // Legacy camelCase contract
    title: templateData.title,
    subtitle: templateData.subtitle || "",
    generatedDate: templateData.generatedDate,
    author: templateData.author,
    authorLogo: templateData.authorLogo || "",
    clientName: templateData.clientName,
    businessType: templateData.businessType,
    revenueRange: templateData.revenueRange,
    teamSize: templateData.teamSize,
    workflowName: templateData.workflowName,
    workflowSummary: templateData.workflowSummary,
    workflowOutcome: templateData.workflowOutcome,
    weeklyHoursRecovered: templateData.weeklyHoursRecovered,
    actionPlan,
    guardrails: [...templateData.guardrails],
    toolingRecommendations: [...templateData.toolingRecommendations],
    ctaLine: templateData.ctaLine || "",
    brandColor: templateData.brandColor || "",
    footerText: templateData.footerText || "",
    language: templateData.language,
    labels: templateData.labels,

    // New snake_case contract (audit_recommendation_v1)
    logo_url: templateData.authorLogo || "",
    highlight_color: templateData.brandColor || "",
    client_name: templateData.clientName,
    business_type: templateData.businessType,
    revenue: templateData.revenueRange,
    team_size: templateData.teamSize,
    weekly_lift_hours: templateData.weeklyHoursRecovered,
    lift_summary: templateData.workflowOutcome,
    workflow_name: templateData.workflowName,
    workflow_description: templateData.workflowSummary,
    action_steps: actionSteps,
    tooling_recommendations: [...templateData.toolingRecommendations],
    next_move: templateData.ctaLine || "",
    generated_date: templateData.generatedDate,
    label_document: templateData.labels.documentLabel || "",
    label_generated_prefix: templateData.labels.generatedPrefix || "",
    label_kpi: templateData.labels.kpiLabel || "",
    label_client_snapshot: templateData.labels.clientSnapshotTitle || "",
    label_client: templateData.labels.clientLabel || "",
    label_business: templateData.labels.businessLabel || "",
    label_revenue: templateData.labels.revenueLabel || "",
    label_team: templateData.labels.teamLabel || "",
    label_workflow: templateData.labels.workflowTitle || "",
    label_action_plan: templateData.labels.actionPlanTitle || "",
    label_guardrails: templateData.labels.guardrailsTitle || "",
    label_tooling: templateData.labels.toolingTitle || "",
    label_next_move: templateData.labels.nextMoveLabel || "",
    label_prepared_by: templateData.labels.preparedByPrefix || "",
    label_confidentiality: templateData.labels.confidentialityNote || "",
  };
}

function buildDocxSectionsFromTemplateData(templateData: AuditTemplateData): Array<{
  heading?: string;
  paragraphs: string[];
}> {
  return [
    {
      heading: "Executive Summary",
      paragraphs: [
        `Client: ${templateData.clientName}`,
        `Business: ${templateData.businessType}`,
        `Revenue Range: ${templateData.revenueRange}`,
        `Team Size: ${templateData.teamSize}`,
        templateData.workflowSummary,
        templateData.workflowOutcome,
      ],
    },
    {
      heading: "Action Plan",
      paragraphs: templateData.actionPlan.map((item) =>
        `${item.step} (Owner: ${item.owner}${item.timing ? `, Timing: ${item.timing}` : ""})`
      ),
    },
    {
      heading: "Guardrails",
      paragraphs: templateData.guardrails,
    },
    {
      heading: "Tooling Recommendations",
      paragraphs: templateData.toolingRecommendations,
    },
  ];
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function emitAuditDeliverableGeneratedEvent(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  channel: AuditChannel;
  session: Doc<"onboardingAuditSessions">;
  sessionToken: string;
  inputFingerprint: string;
  templateCode: string;
  occurredAt: number;
  dedupedGeneration: boolean;
}) {
  const claimTokenId = normalizeOptionalString(args.session.claimTokenId, 256);
  const eventKey = buildAuditLifecycleEventKey({
    eventName: "onboarding.funnel.audit_deliverable_generated",
    channel: args.channel,
    auditSessionKey: args.session.auditSessionKey,
    sessionToken: args.sessionToken,
    claimTokenId,
  });

  await args.ctx.runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
    eventName: "onboarding.funnel.audit_deliverable_generated",
    channel: args.channel,
    organizationId: args.organizationId,
    sessionToken: args.sessionToken,
    claimTokenId,
    auditSessionKey: args.session.auditSessionKey,
    eventKey,
    occurredAt: args.occurredAt,
    metadata: {
      source: "onboarding.auditDeliverable.generateAuditWorkflowDeliverable",
      inputFingerprint: args.inputFingerprint,
      templateCode: args.templateCode,
      dedupedGeneration: args.dedupedGeneration,
    },
  });
}

export const resolveAuditSessionForDeliverableInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    channel: auditChannelValidator,
    sessionToken: v.string(),
    auditSessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedSessionToken = normalizeOptionalString(args.sessionToken, 256);
    if (!normalizedSessionToken) {
      return null;
    }

    const channelFallbackOrder = resolveAuditChannelFallbackOrder(args.channel);
    const keyToChannel = new Map<string, AuditChannel>();
    for (const channel of channelFallbackOrder) {
      const deterministicKey = resolveDeterministicAuditSessionKey({
        channel,
        organizationId: args.organizationId,
        sessionToken: normalizedSessionToken,
      });
      keyToChannel.set(deterministicKey, channel);
    }
    const explicitKey = normalizeOptionalString(args.auditSessionKey, 256);
    if (explicitKey) {
      keyToChannel.set(explicitKey, args.channel);
    }

    const candidateSessions: Doc<"onboardingAuditSessions">[] = [];
    for (const [key, preferredChannel] of keyToChannel.entries()) {
      const direct = await ctx.db
        .query("onboardingAuditSessions")
        .withIndex("by_audit_session_key", (q) => q.eq("auditSessionKey", key))
        .first();

      if (
        direct
        && String(direct.organizationId) === String(args.organizationId)
        && (
          direct.channel === preferredChannel
          || channelFallbackOrder.includes(direct.channel as AuditChannel)
        )
      ) {
        candidateSessions.push(direct);
      }
    }
    if (candidateSessions.length > 0) {
      const channelPriority = new Map<AuditChannel, number>(
        channelFallbackOrder.map((channel, index) => [channel, index])
      );
      const sorted = candidateSessions.sort((left, right) => {
        const leftPriority = channelPriority.get(left.channel as AuditChannel) ?? 99;
        const rightPriority = channelPriority.get(right.channel as AuditChannel) ?? 99;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return right.updatedAt - left.updatedAt;
      });
      return sorted[0];
    }

    const bySessionToken = await ctx.db
      .query("onboardingAuditSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", normalizedSessionToken))
      .collect();

    const byChannel = bySessionToken
      .filter((session) =>
        String(session.organizationId) === String(args.organizationId)
        && channelFallbackOrder.includes(session.channel as AuditChannel)
      );
    if (byChannel.length === 0) {
      return null;
    }
    const channelPriority = new Map<AuditChannel, number>(
      channelFallbackOrder.map((channel, index) => [channel, index])
    );
    return byChannel.sort((left, right) => {
      const leftPriority = channelPriority.get(left.channel as AuditChannel) ?? 99;
      const rightPriority = channelPriority.get(right.channel as AuditChannel) ?? 99;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return right.updatedAt - left.updatedAt;
    })[0] || null;
  },
});

export const persistAuditDeliverableInternal = internalMutation({
  args: {
    sessionId: v.id("onboardingAuditSessions"),
    deliverableKey: v.string(),
    inputFingerprint: v.string(),
    templateCode: v.string(),
    templateVersion: v.string(),
    renderSource: v.string(),
    requestedFormats: v.array(
      v.object({
        format: v.union(v.literal("pdf"), v.literal("docx")),
        status: v.union(v.literal("generated"), v.literal("unsupported")),
        blockedReasonCode: v.optional(v.string()),
        blockedReasonDetail: v.optional(v.string()),
      })
    ),
    fileName: v.string(),
    storageId: v.id("_storage"),
    downloadUrl: v.optional(v.string()),
    sourceDownloadUrl: v.optional(v.string()),
    docxFileName: v.optional(v.string()),
    docxStorageId: v.optional(v.string()),
    docxDownloadUrl: v.optional(v.string()),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Audit session not found while persisting deliverable");
    }

    const metadata = normalizeMetadataRecord(session.metadata);
    const deliverablesRaw = metadata.auditDeliverables;
    const deliverables =
      deliverablesRaw && typeof deliverablesRaw === "object" && !Array.isArray(deliverablesRaw)
        ? { ...(deliverablesRaw as Record<string, unknown>) }
        : {};

    const record: StoredDeliverableRecord = {
      deliverableKey: args.deliverableKey,
      inputFingerprint: args.inputFingerprint,
      templateCode: args.templateCode,
      templateVersion: args.templateVersion,
      renderSource:
        args.renderSource === "apitemplate_io_v2_create_pdf_from_html"
          ? "apitemplate_io_v2_create_pdf_from_html"
          : "apitemplate_io_v2_create_pdf_from_html",
      requestedFormats: args.requestedFormats.map((formatRecord) => {
        const blockedReasonCode =
          formatRecord.blockedReasonCode === "docx_renderer_unavailable"
            ? "docx_renderer_unavailable"
            : undefined;
        return {
          format: formatRecord.format,
          status: formatRecord.status,
          blockedReasonCode,
          blockedReasonDetail: formatRecord.blockedReasonDetail,
        };
      }),
      fileName: args.fileName,
      storageId: String(args.storageId),
      downloadUrl: args.downloadUrl,
      sourceDownloadUrl: args.sourceDownloadUrl,
      docxFileName: args.docxFileName,
      docxStorageId: args.docxStorageId,
      docxDownloadUrl: args.docxDownloadUrl,
      generatedAt: args.generatedAt,
    };

    deliverables[args.deliverableKey] = record;

    await ctx.db.patch(args.sessionId, {
      status: session.status === "handoff_opened" ? "handoff_opened" : "deliverable_generated",
      deliverableGeneratedAt: session.deliverableGeneratedAt || args.generatedAt,
      metadata: {
        ...metadata,
        auditDeliverables: deliverables,
        lastAuditDeliverableKey: args.deliverableKey,
        lastAuditDeliverable: record,
      },
      updatedAt: args.generatedAt,
      lastActivityAt: args.generatedAt,
    });

    return record;
  },
});

export const generateAuditWorkflowDeliverable = internalAction({
  args: {
    organizationId: v.id("organizations"),
    channel: auditChannelValidator,
    sessionToken: v.string(),
    auditSessionKey: v.optional(v.string()),
    input: v.optional(auditDeliverableInputValidator),
  },
  handler: async (ctx, args) => {
    const sessionToken = normalizeOptionalString(args.sessionToken, 256);
    if (!sessionToken) {
      return {
        success: false,
        errorCode: "missing_session_token",
        message: "sessionToken is required to generate the audit deliverable.",
      } as const;
    }

    const session = (await (ctx as any).runQuery(
      generatedApi.internal.onboarding.auditDeliverable.resolveAuditSessionForDeliverableInternal,
      {
        organizationId: args.organizationId,
        channel: args.channel,
        sessionToken,
        auditSessionKey: args.auditSessionKey,
      }
    )) as Doc<"onboardingAuditSessions"> | null;

    if (!session) {
      return {
        success: false,
        errorCode: "audit_session_not_found",
        message: "Audit session not found for deliverable generation.",
      } as const;
    }

    if (session.answeredQuestionCount < 5) {
      return {
        success: false,
        errorCode: "audit_not_completed",
        message: "Audit session does not have all required answers yet.",
      } as const;
    }

    const preferredTemplate = await (ctx as any).runQuery(
      generatedApi.internal.pdfTemplateQueries.resolvePdfTemplateByCodeInternal,
      {
        organizationId: args.organizationId,
        templateCode: AUDIT_RECOMMENDATION_TEMPLATE_CODE,
      }
    );
    const legacyTemplate = !preferredTemplate
      ? await (ctx as any).runQuery(
        generatedApi.internal.pdfTemplateQueries.resolvePdfTemplateByCodeInternal,
        {
          organizationId: args.organizationId,
          templateCode: AUDIT_WORKFLOW_TEMPLATE_CODE_LEGACY,
        }
      )
      : null;
    const selectedTemplateCode = preferredTemplate
      ? AUDIT_RECOMMENDATION_TEMPLATE_CODE
      : AUDIT_WORKFLOW_TEMPLATE_CODE_LEGACY;
    const template = preferredTemplate || legacyTemplate;

    if (!template) {
      return {
        success: false,
        errorCode: "missing_template",
        message: `Template '${AUDIT_RECOMMENDATION_TEMPLATE_CODE}' is not available in template registry.`,
      } as const;
    }

    const now = Date.now();
    const templateData = buildAuditTemplateData({
      session,
      input: args.input as AuditDeliverableInput | undefined,
      now,
    });
    const requestedOutputFormats = normalizeRequestedOutputFormats(args.input?.outputFormats);
    const requestedFormats: RequestedFormatRecord[] = [
      {
        format: "pdf",
        status: "generated",
      },
    ];
    const canonicalPayload = buildCanonicalPayload(templateData);
    const canonicalPayloadJson = JSON.stringify(canonicalPayload);
    const inputFingerprint = await sha256Hex(
      `${session.auditSessionKey}:${selectedTemplateCode}:${requestedOutputFormats.join(",")}:${canonicalPayloadJson}`
    );
    const deliverableKey = `${selectedTemplateCode}:${session.auditSessionKey}:${inputFingerprint}`;
    const fileName = buildDeterministicFileName(session.auditSessionKey, inputFingerprint);

    const existingRecord = resolveExistingDeliverableRecord(session, deliverableKey);
    if (existingRecord?.storageId) {
      const existingUrl = await ctx.storage.getUrl(existingRecord.storageId as Id<"_storage">);
      if (existingUrl) {
        await emitAuditDeliverableGeneratedEvent({
          ctx,
          organizationId: args.organizationId,
          channel: args.channel,
          session,
          sessionToken,
          inputFingerprint,
          templateCode: selectedTemplateCode,
          occurredAt: existingRecord.generatedAt,
          dedupedGeneration: true,
        });

        return {
          success: true,
          deduped: true,
          auditSessionKey: session.auditSessionKey,
          templateCode: selectedTemplateCode,
          templateVersion: existingRecord.templateVersion,
          renderSource: existingRecord.renderSource,
          requestedFormats: existingRecord.requestedFormats,
          inputFingerprint,
          fileName: existingRecord.fileName,
          storageId: existingRecord.storageId,
          downloadUrl: existingUrl,
          sourceDownloadUrl: existingRecord.sourceDownloadUrl,
          docxFileName: existingRecord.docxFileName,
          docxStorageId: existingRecord.docxStorageId,
          docxDownloadUrl: existingRecord.docxDownloadUrl,
          generatedAt: existingRecord.generatedAt,
        } as const;
      }
    }

    const apiKey = process.env.API_TEMPLATE_IO_KEY;
    if (!apiKey) {
      return {
        success: false,
        errorCode: "missing_api_key",
        message: "API_TEMPLATE_IO_KEY environment variable not set.",
      } as const;
    }

    const generationResult = await generatePdfFromTemplate({
      apiKey,
      templateCode: selectedTemplateCode,
      filename: stripPdfExtension(fileName),
      paperSize: "Letter",
      data: canonicalPayload,
    });

    if (generationResult.status === "error" || !generationResult.download_url) {
      return {
        success: false,
        errorCode:
          generationResult.error === "TEMPLATE_NOT_FOUND"
            ? "missing_template"
            : "pdf_generation_failed",
        message:
          generationResult.message
          || generationResult.error
          || "Audit deliverable PDF generation failed.",
      } as const;
    }

    const pdfResponse = await fetch(generationResult.download_url);
    if (!pdfResponse.ok) {
      return {
        success: false,
        errorCode: "pdf_generation_failed",
        message: `Failed to download generated audit deliverable PDF (${pdfResponse.status}).`,
      } as const;
    }

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const storageId = await ctx.storage.store(
      new Blob([pdfArrayBuffer], { type: "application/pdf" })
    );
    const downloadUrl = await ctx.storage.getUrl(storageId);

    let docxFileName: string | undefined;
    let docxStorageId: string | undefined;
    let docxDownloadUrl: string | undefined;
    if (requestedOutputFormats.includes("docx")) {
      docxFileName = replacePdfWithDocx(fileName);
      const docxResult = await createDocxDocumentTool.execute(ctx as any, {
        fileName: docxFileName,
        title: templateData.title,
        subtitle: templateData.subtitle,
        sections: buildDocxSectionsFromTemplateData(templateData),
        saveToMediaLibrary: false,
      });
      const resultRecord =
        docxResult && typeof docxResult === "object" && !Array.isArray(docxResult)
          ? (docxResult as Record<string, unknown>)
          : {};
      const generatedDocxStorageId = normalizeOptionalString(resultRecord.storageId, 256);
      if (resultRecord.success === true && generatedDocxStorageId) {
        docxStorageId = generatedDocxStorageId;
        docxDownloadUrl = normalizeOptionalString(resultRecord.downloadUrl, 2000);
        requestedFormats.unshift({
          format: "docx",
          status: "generated",
        });
      } else {
        requestedFormats.unshift({
          format: "docx",
          status: "unsupported",
          blockedReasonCode: "docx_renderer_unavailable",
          blockedReasonDetail:
            normalizeOptionalString(resultRecord.message, 500)
            || "DOCX generation request failed in backend tool path.",
        });
      }
    }
    const generatedAt = Date.now();

    await (ctx as any).runMutation(
      generatedApi.internal.onboarding.auditDeliverable.persistAuditDeliverableInternal,
      {
        sessionId: session._id,
        deliverableKey,
        inputFingerprint,
        templateCode: selectedTemplateCode,
        templateVersion: normalizeOptionalString(template.version, 64) || "1.0",
        renderSource: "apitemplate_io_v2_create_pdf_from_html",
        requestedFormats,
        fileName,
        storageId,
        downloadUrl: downloadUrl || undefined,
        sourceDownloadUrl: generationResult.download_url,
        docxFileName,
        docxStorageId,
        docxDownloadUrl,
        generatedAt,
      }
    );

    await emitAuditDeliverableGeneratedEvent({
      ctx,
      organizationId: args.organizationId,
      channel: args.channel,
      session,
      sessionToken,
      inputFingerprint,
      templateCode: selectedTemplateCode,
      occurredAt: generatedAt,
      dedupedGeneration: false,
    });

    return {
      success: true,
      deduped: false,
      auditSessionKey: session.auditSessionKey,
      templateCode: selectedTemplateCode,
      templateVersion: normalizeOptionalString(template.version, 64) || "1.0",
      renderSource: "apitemplate_io_v2_create_pdf_from_html" as const,
      requestedFormats,
      inputFingerprint,
      fileName,
      storageId: String(storageId),
      downloadUrl: downloadUrl || null,
      sourceDownloadUrl: generationResult.download_url,
      docxFileName: docxFileName || null,
      docxStorageId: docxStorageId || null,
      docxDownloadUrl: docxDownloadUrl || null,
      generatedAt,
    } as const;
  },
});
