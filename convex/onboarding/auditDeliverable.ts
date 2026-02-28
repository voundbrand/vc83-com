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
import { generatePdfFromTemplate } from "../lib/generatePdf";
import { buildAuditLifecycleEventKey } from "./funnelEvents";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

const AUDIT_WORKFLOW_TEMPLATE_CODE = "leadmagnet_audit_workflow_report_v1";

const auditChannelValidator = v.union(v.literal("webchat"), v.literal("native_guest"));

const actionPlanItemValidator = v.object({
  step: v.string(),
  owner: v.string(),
  timing: v.optional(v.string()),
});

const auditDeliverableInputValidator = v.object({
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
};

type AuditTemplateData = {
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
  fileName: string;
  storageId: string;
  downloadUrl?: string;
  sourceDownloadUrl?: string;
  generatedAt: number;
};

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
  const inputFingerprint = normalizeOptionalString(record.inputFingerprint, 120);
  const generatedAt = typeof record.generatedAt === "number" ? record.generatedAt : undefined;
  if (!storageId || !fileName || !templateCode || !inputFingerprint || !generatedAt) {
    return null;
  }
  return {
    deliverableKey,
    storageId,
    fileName,
    templateCode,
    inputFingerprint,
    generatedAt,
    downloadUrl: normalizeOptionalString(record.downloadUrl, 2000),
    sourceDownloadUrl: normalizeOptionalString(record.sourceDownloadUrl, 2000),
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
  return {
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
    actionPlan: templateData.actionPlan.map((item) => ({
      step: item.step,
      owner: item.owner,
      timing: item.timing || "",
    })),
    guardrails: [...templateData.guardrails],
    toolingRecommendations: [...templateData.toolingRecommendations],
    ctaLine: templateData.ctaLine || "",
    brandColor: templateData.brandColor || "",
    footerText: templateData.footerText || "",
  };
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
      templateCode: AUDIT_WORKFLOW_TEMPLATE_CODE,
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

    const explicitKey = normalizeOptionalString(args.auditSessionKey, 256);
    const deterministicKey = resolveDeterministicAuditSessionKey({
      channel: args.channel,
      organizationId: args.organizationId,
      sessionToken: normalizedSessionToken,
    });
    const candidateKeys = explicitKey && explicitKey !== deterministicKey
      ? [explicitKey, deterministicKey]
      : [deterministicKey];

    for (const key of candidateKeys) {
      const direct = await ctx.db
        .query("onboardingAuditSessions")
        .withIndex("by_audit_session_key", (q) => q.eq("auditSessionKey", key))
        .first();

      if (
        direct
        && String(direct.organizationId) === String(args.organizationId)
        && direct.channel === args.channel
      ) {
        return direct;
      }
    }

    const bySessionToken = await ctx.db
      .query("onboardingAuditSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", normalizedSessionToken))
      .collect();

    return bySessionToken
      .filter((session) =>
        String(session.organizationId) === String(args.organizationId)
        && session.channel === args.channel
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  },
});

export const persistAuditDeliverableInternal = internalMutation({
  args: {
    sessionId: v.id("onboardingAuditSessions"),
    deliverableKey: v.string(),
    inputFingerprint: v.string(),
    templateCode: v.string(),
    fileName: v.string(),
    storageId: v.id("_storage"),
    downloadUrl: v.optional(v.string()),
    sourceDownloadUrl: v.optional(v.string()),
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
      fileName: args.fileName,
      storageId: String(args.storageId),
      downloadUrl: args.downloadUrl,
      sourceDownloadUrl: args.sourceDownloadUrl,
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

    const template = await (ctx as any).runQuery(
      generatedApi.internal.pdfTemplateQueries.resolvePdfTemplateByCodeInternal,
      {
        organizationId: args.organizationId,
        templateCode: AUDIT_WORKFLOW_TEMPLATE_CODE,
      }
    );

    if (!template) {
      return {
        success: false,
        errorCode: "missing_template",
        message: `Template '${AUDIT_WORKFLOW_TEMPLATE_CODE}' is not available in template registry.`,
      } as const;
    }

    const now = Date.now();
    const templateData = buildAuditTemplateData({
      session,
      input: args.input as AuditDeliverableInput | undefined,
      now,
    });
    const canonicalPayload = buildCanonicalPayload(templateData);
    const canonicalPayloadJson = JSON.stringify(canonicalPayload);
    const inputFingerprint = await sha256Hex(
      `${session.auditSessionKey}:${AUDIT_WORKFLOW_TEMPLATE_CODE}:${canonicalPayloadJson}`
    );
    const deliverableKey = `${AUDIT_WORKFLOW_TEMPLATE_CODE}:${session.auditSessionKey}:${inputFingerprint}`;
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
          occurredAt: existingRecord.generatedAt,
          dedupedGeneration: true,
        });

        return {
          success: true,
          deduped: true,
          auditSessionKey: session.auditSessionKey,
          templateCode: AUDIT_WORKFLOW_TEMPLATE_CODE,
          inputFingerprint,
          fileName: existingRecord.fileName,
          storageId: existingRecord.storageId,
          downloadUrl: existingUrl,
          sourceDownloadUrl: existingRecord.sourceDownloadUrl,
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
      templateCode: AUDIT_WORKFLOW_TEMPLATE_CODE,
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
    const generatedAt = Date.now();

    await (ctx as any).runMutation(
      generatedApi.internal.onboarding.auditDeliverable.persistAuditDeliverableInternal,
      {
        sessionId: session._id,
        deliverableKey,
        inputFingerprint,
        templateCode: AUDIT_WORKFLOW_TEMPLATE_CODE,
        fileName,
        storageId,
        downloadUrl: downloadUrl || undefined,
        sourceDownloadUrl: generationResult.download_url,
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
      occurredAt: generatedAt,
      dedupedGeneration: false,
    });

    return {
      success: true,
      deduped: false,
      auditSessionKey: session.auditSessionKey,
      templateCode: AUDIT_WORKFLOW_TEMPLATE_CODE,
      inputFingerprint,
      fileName,
      storageId: String(storageId),
      downloadUrl: downloadUrl || null,
      sourceDownloadUrl: generationResult.download_url,
      generatedAt,
    } as const;
  },
});
