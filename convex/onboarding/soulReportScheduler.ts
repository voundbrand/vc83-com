/**
 * ONBOARDING SOUL REPORT + DAY 5 SPECIALIST PREVIEW CONTRACTS
 *
 * Generates data-backed Soul Reports and enforces channel-safe specialist preview
 * delivery contracts for Day 5 onboarding touchpoints.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { NURTURE_STEP_KEYS, resolveFirstWinSlaState } from "./nurtureScheduler";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../_generated/api").internal;
  }
  return _internalCache;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HIGHLIGHT_LENGTH = 180;
const MAX_SUMMARY_LENGTH = 420;
const MAX_PREVIEW_LENGTH = 560;

export const SOUL_REPORT_VERSION = "onboarding_soul_report.v1";
export const SOUL_REPORT_GENERATION_DELAY_MS = 3 * DAY_MS;
export const SPECIALIST_PREVIEW_DELAY_MS = 5 * DAY_MS;

export type OnboardingNurtureChannel =
  | "webchat"
  | "native_guest"
  | "telegram"
  | "whatsapp"
  | "slack"
  | "sms"
  | "platform_web"
  | "unknown";

type FirstWinSlaState = "met" | "pending" | "breached";

const DIRECT_DELIVERY_CHANNELS = new Set<OnboardingNurtureChannel>([
  "telegram",
  "whatsapp",
  "slack",
  "sms",
]);

const ONBOARDING_FUNNEL_SIGNAL_EVENT_NAMES = new Set([
  "onboarding.funnel.first_touch",
  "onboarding.funnel.activation",
  "onboarding.funnel.signup",
  "onboarding.funnel.claim",
  "onboarding.funnel.upgrade",
  "onboarding.funnel.credit_purchase",
  "onboarding.funnel.channel_first_message_latency",
  "onboarding.funnel.audit_started",
  "onboarding.funnel.audit_question_answered",
  "onboarding.funnel.audit_completed",
  "onboarding.funnel.audit_deliverable_generated",
  "onboarding.funnel.audit_handoff_opened",
]);

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeChannel(value: unknown): OnboardingNurtureChannel {
  if (
    value === "webchat"
    || value === "native_guest"
    || value === "telegram"
    || value === "whatsapp"
    || value === "slack"
    || value === "sms"
    || value === "platform_web"
    || value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function normalizeAsciiText(value: string, maxLength: number): string {
  const asciiOnly = value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (asciiOnly.length <= maxLength) {
    return asciiOnly;
  }
  return `${asciiOnly.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

export function sanitizeChannelSafeText(value: string, maxLength: number): string {
  return normalizeAsciiText(value, maxLength);
}

function resolveCompletedNurtureSteps(stepState: unknown): number {
  if (!stepState || typeof stepState !== "object") {
    return 0;
  }
  const record = stepState as Record<string, unknown>;
  let completed = 0;
  for (const key of NURTURE_STEP_KEYS) {
    const candidate = record[key];
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const status = (candidate as { status?: unknown }).status;
    if (status === "sent") {
      completed += 1;
    }
  }
  return completed;
}

function resolvePreferredDeliveryChannel(args: {
  preferredChannel?: OnboardingNurtureChannel;
  sourceChannel: OnboardingNurtureChannel;
}): OnboardingNurtureChannel | undefined {
  if (args.preferredChannel && DIRECT_DELIVERY_CHANNELS.has(args.preferredChannel)) {
    return args.preferredChannel;
  }
  if (DIRECT_DELIVERY_CHANNELS.has(args.sourceChannel)) {
    return args.sourceChannel;
  }
  return undefined;
}

function resolveContractKey(journeyKey: string): string {
  return `${journeyKey}:day5_specialist_preview`;
}

type SoulReportQualityGates = {
  dataBacked: boolean;
  channelSafe: boolean;
};

export function resolveSoulReportQualityGates(args: {
  completedNurtureSteps: number;
  funnelEventCount: number;
  firstWinSlaState: FirstWinSlaState;
  summary: string;
  highlights: string[];
}): SoulReportQualityGates {
  const dataBacked =
    args.completedNurtureSteps > 0
    || args.funnelEventCount > 0
    || args.firstWinSlaState !== "pending";
  const channelSafe =
    args.summary.length > 0
    && args.summary.length <= MAX_SUMMARY_LENGTH
    && args.highlights.length > 0
    && args.highlights.every(
      (line) => line.length > 0
        && line.length <= MAX_HIGHLIGHT_LENGTH
        && /^[\x20-\x7E]+$/.test(line),
    );

  return {
    dataBacked,
    channelSafe,
  };
}

export function buildSoulReportSummary(args: {
  completedNurtureSteps: number;
  funnelEventCount: number;
  firstWinSlaState: FirstWinSlaState;
  firstMessageLatencyChannelCount: number;
}): string {
  const body =
    `Day 3 Soul Report: completed ${args.completedNurtureSteps}/${NURTURE_STEP_KEYS.length} nurture steps, `
    + `captured ${args.funnelEventCount} onboarding signals, first-win SLA is ${args.firstWinSlaState}, `
    + `and ${args.firstMessageLatencyChannelCount} connected channel latency signals are on record.`;
  return sanitizeChannelSafeText(body, MAX_SUMMARY_LENGTH);
}

function buildSoulReportHighlights(args: {
  completedNurtureSteps: number;
  firstWinSlaState: FirstWinSlaState;
  firstMessageLatencyChannels: OnboardingNurtureChannel[];
  funnelEventCount: number;
}): string[] {
  const highlights: string[] = [];
  highlights.push(
    sanitizeChannelSafeText(
      `Nurture progression: ${args.completedNurtureSteps}/${NURTURE_STEP_KEYS.length} steps sent.`,
      MAX_HIGHLIGHT_LENGTH,
    ),
  );
  highlights.push(
    sanitizeChannelSafeText(
      `First-win guarantee status: ${args.firstWinSlaState}.`,
      MAX_HIGHLIGHT_LENGTH,
    ),
  );
  if (args.firstMessageLatencyChannels.length > 0) {
    highlights.push(
      sanitizeChannelSafeText(
        `Connected channels with first-message latency telemetry: ${args.firstMessageLatencyChannels.join(", ")}.`,
        MAX_HIGHLIGHT_LENGTH,
      ),
    );
  }
  highlights.push(
    sanitizeChannelSafeText(
      `Onboarding funnel evidence points since journey start: ${args.funnelEventCount}.`,
      MAX_HIGHLIGHT_LENGTH,
    ),
  );
  return highlights.slice(0, 4);
}

export function buildSpecialistPreviewMessage(args: {
  summary: string;
  highlights: string[];
}): string {
  const topHighlights = args.highlights.slice(0, 2);
  const content = [
    "Day 5 Specialist Preview is now unlocked.",
    args.summary,
    ...topHighlights.map((line) => `- ${line}`),
    "Specialists remain channel-safe and preserve your primary-agent voice.",
  ].join(" ");
  return sanitizeChannelSafeText(content, MAX_PREVIEW_LENGTH);
}

type JourneyRecord = {
  _id: string;
  journeyKey: string;
  organizationId: string;
  userId: string;
  sourceChannel: OnboardingNurtureChannel;
  preferredChannel?: OnboardingNurtureChannel;
  recipientIdentifier?: string;
  firstWinDueAt: number;
  firstWinDeliveredAt?: number;
  stepState?: unknown;
  startedAt: number;
};

type FunnelEventRecord = {
  eventName: string;
  channel: OnboardingNurtureChannel;
  userId?: string;
  createdAt: number;
};

function filterJourneyFunnelEvents(args: {
  rows: unknown[];
  userId: string;
  sourceChannel: OnboardingNurtureChannel;
  startedAt: number;
}): FunnelEventRecord[] {
  const normalizedUserId = String(args.userId);
  const filtered: FunnelEventRecord[] = [];
  for (const row of args.rows) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const record = row as Record<string, unknown>;
    const createdAt = typeof record.createdAt === "number" ? record.createdAt : 0;
    if (createdAt < args.startedAt) {
      continue;
    }
    const eventName = normalizeOptionalString(record.eventName);
    if (!eventName || !ONBOARDING_FUNNEL_SIGNAL_EVENT_NAMES.has(eventName)) {
      continue;
    }
    const channel = normalizeChannel(record.channel);
    const userId = normalizeOptionalString(record.userId);
    const userMatch = userId === normalizedUserId;
    const sourceChannelMatch = !userId && channel === args.sourceChannel;
    if (!userMatch && !sourceChannelMatch) {
      continue;
    }
    filtered.push({
      eventName,
      channel,
      userId,
      createdAt,
    });
  }
  return filtered;
}

function resolveFirstMessageLatencyChannels(
  events: FunnelEventRecord[],
): OnboardingNurtureChannel[] {
  return Array.from(
    new Set(
      events
        .filter((event) => event.eventName === "onboarding.funnel.channel_first_message_latency")
        .map((event) => event.channel),
    ),
  );
}

export const generateSoulReport = internalMutation({
  args: {
    journeyId: v.id("onboardingNurtureJourneys"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = ctx.db;
    const journeyDoc = await db.get(args.journeyId);
    if (!journeyDoc) {
      return {
        success: false,
        skipped: true,
        reason: "journey_not_found",
      };
    }

    const journey = journeyDoc as JourneyRecord;
    const sourceChannel = normalizeChannel(journey.sourceChannel);
    const normalizedPreferredChannel = normalizeChannel(journey.preferredChannel);
    const preferredChannel =
      normalizedPreferredChannel === "unknown" ? undefined : normalizedPreferredChannel;
    const recipientIdentifier = normalizeOptionalString(journey.recipientIdentifier);
    const deliveryChannel = resolvePreferredDeliveryChannel({
      preferredChannel,
      sourceChannel,
    });

    const funnelRows = await db
      .query("onboardingFunnelEvents")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_org_and_time", (q: any) => q.eq("organizationId", journey.organizationId))
      .order("desc")
      .take(200);
    const funnelEvents = filterJourneyFunnelEvents({
      rows: funnelRows,
      userId: journey.userId,
      sourceChannel,
      startedAt: journey.startedAt,
    });

    const completedNurtureSteps = resolveCompletedNurtureSteps(journey.stepState);
    const firstWinSlaState = resolveFirstWinSlaState({
      firstWinDueAt: journey.firstWinDueAt,
      firstWinDeliveredAt: journey.firstWinDeliveredAt,
      now,
    });
    const firstMessageLatencyChannels = resolveFirstMessageLatencyChannels(funnelEvents);

    const summary = buildSoulReportSummary({
      completedNurtureSteps,
      funnelEventCount: funnelEvents.length,
      firstWinSlaState,
      firstMessageLatencyChannelCount: firstMessageLatencyChannels.length,
    });
    const highlights = buildSoulReportHighlights({
      completedNurtureSteps,
      firstWinSlaState,
      firstMessageLatencyChannels,
      funnelEventCount: funnelEvents.length,
    });
    const qualityGates = resolveSoulReportQualityGates({
      completedNurtureSteps,
      funnelEventCount: funnelEvents.length,
      firstWinSlaState,
      summary,
      highlights,
    });
    const reportStatus =
      qualityGates.dataBacked && qualityGates.channelSafe
        ? "ready"
        : "insufficient_data";

    const reportKey = journey.journeyKey;
    const existingReport = await db
      .query("onboardingSoulReports")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_report_key", (q: any) => q.eq("reportKey", reportKey))
      .first();

    let reportId = existingReport?._id;
    if (existingReport) {
      await db.patch(existingReport._id, {
        status: reportStatus,
        reportVersion: SOUL_REPORT_VERSION,
        summary,
        highlights,
        evidence: {
          completedNurtureSteps,
          funnelEventCount: funnelEvents.length,
          firstWinSlaState,
          firstMessageLatencyChannelCount: firstMessageLatencyChannels.length,
        },
        qualityGates,
        generatedAt: now,
        deliveryChannel: deliveryChannel || "platform_web",
        recipientIdentifier,
        metadata: {
          generatedBy: "onboarding.soulReportScheduler.generateSoulReport",
          sourceChannel,
        },
        updatedAt: now,
      });
    } else {
      reportId = await db.insert("onboardingSoulReports", {
        reportKey,
        journeyId: journey._id,
        journeyKey: journey.journeyKey,
        organizationId: journey.organizationId,
        userId: journey.userId,
        status: reportStatus,
        reportVersion: SOUL_REPORT_VERSION,
        summary,
        highlights,
        evidence: {
          completedNurtureSteps,
          funnelEventCount: funnelEvents.length,
          firstWinSlaState,
          firstMessageLatencyChannelCount: firstMessageLatencyChannels.length,
        },
        qualityGates,
        generatedAt: now,
        deliveryChannel: deliveryChannel || "platform_web",
        recipientIdentifier,
        metadata: {
          generatedBy: "onboarding.soulReportScheduler.generateSoulReport",
          sourceChannel,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    const contractKey = resolveContractKey(journey.journeyKey);
    const availableAt = journey.startedAt + SPECIALIST_PREVIEW_DELAY_MS;
    const previewStatus =
      qualityGates.dataBacked && qualityGates.channelSafe
        ? (now >= availableAt ? "ready" : "scheduled")
        : "blocked";
    const previewMessage = buildSpecialistPreviewMessage({
      summary,
      highlights,
    });
    const existingContract = await db
      .query("onboardingSpecialistPreviewContracts")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_contract_key", (q: any) => q.eq("contractKey", contractKey))
      .first();

    if (existingContract) {
      await db.patch(existingContract._id, {
        status: previewStatus,
        sourceSoulReportId: reportId,
        previewMessage,
        qualityGateStatus:
          qualityGates.dataBacked && qualityGates.channelSafe ? "pass" : "blocked",
        deliveryChannel: deliveryChannel || "platform_web",
        recipientIdentifier,
        readyAt: previewStatus === "ready" ? now : existingContract.readyAt,
        metadata: {
          generatedBy: "onboarding.soulReportScheduler.generateSoulReport",
          sourceChannel,
        },
        updatedAt: now,
      });
    } else {
      await db.insert("onboardingSpecialistPreviewContracts", {
        contractKey,
        journeyId: journey._id,
        journeyKey: journey.journeyKey,
        organizationId: journey.organizationId,
        userId: journey.userId,
        status: previewStatus,
        teamAccessMode: "invisible",
        availableAt,
        readyAt: previewStatus === "ready" ? now : undefined,
        sourceSoulReportId: reportId,
        previewMessage,
        deliveryChannel: deliveryChannel || "platform_web",
        recipientIdentifier,
        qualityGateStatus:
          qualityGates.dataBacked && qualityGates.channelSafe ? "pass" : "blocked",
        metadata: {
          generatedBy: "onboarding.soulReportScheduler.generateSoulReport",
          sourceChannel,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.insert("auditLogs", {
      organizationId: journey.organizationId,
      userId: journey.userId,
      action:
        reportStatus === "ready"
          ? "onboarding.soul_report.generated"
          : "onboarding.soul_report.blocked",
      resource: "onboardingSoulReports",
      resourceId: reportKey,
      metadata: {
        reportId,
        reportStatus,
        qualityGates,
        funnelEventCount: funnelEvents.length,
        completedNurtureSteps,
        firstWinSlaState,
      },
      success: reportStatus === "ready",
      createdAt: now,
    });

    return {
      success: reportStatus === "ready",
      reportId,
      reportStatus,
      qualityGates,
      funnelEventCount: funnelEvents.length,
      completedNurtureSteps,
    };
  },
});

export const dispatchSpecialistPreview = internalMutation({
  args: {
    journeyId: v.id("onboardingNurtureJourneys"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = ctx.db;
    const journeyDoc = await db.get(args.journeyId);
    if (!journeyDoc) {
      return {
        success: false,
        skipped: true,
        reason: "journey_not_found",
      };
    }

    const journey = journeyDoc as JourneyRecord;
    const sourceChannel = normalizeChannel(journey.sourceChannel);
    const normalizedPreferredChannel = normalizeChannel(journey.preferredChannel);
    const preferredChannel =
      normalizedPreferredChannel === "unknown" ? undefined : normalizedPreferredChannel;
    const deliveryChannel = resolvePreferredDeliveryChannel({
      preferredChannel,
      sourceChannel,
    });
    const recipientIdentifier =
      normalizeOptionalString(journey.recipientIdentifier);
    const contractKey = resolveContractKey(journey.journeyKey);
    const availableAt = journey.startedAt + SPECIALIST_PREVIEW_DELAY_MS;

    const report = await db
      .query("onboardingSoulReports")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_report_key", (q: any) => q.eq("reportKey", journey.journeyKey))
      .first();
    const contract = await db
      .query("onboardingSpecialistPreviewContracts")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_contract_key", (q: any) => q.eq("contractKey", contractKey))
      .first();

    if (contract?.status === "sent" && contract.deliveredAt) {
      return {
        success: true,
        deduped: true,
        contractId: contract._id,
      };
    }

    if (!report || (report.status !== "ready" && report.status !== "delivered")) {
      const previewMessage = buildSpecialistPreviewMessage({
        summary:
          "Day 5 Specialist Preview is blocked until a data-backed and channel-safe Soul Report is available.",
        highlights: [],
      });
      if (contract) {
        await db.patch(contract._id, {
          status: "blocked",
          previewMessage,
          qualityGateStatus: "blocked",
          updatedAt: now,
        });
      } else {
        await db.insert("onboardingSpecialistPreviewContracts", {
          contractKey,
          journeyId: journey._id,
          journeyKey: journey.journeyKey,
          organizationId: journey.organizationId,
          userId: journey.userId,
          status: "blocked",
          teamAccessMode: "invisible",
          availableAt,
          previewMessage,
          deliveryChannel: deliveryChannel || "platform_web",
          recipientIdentifier,
          qualityGateStatus: "blocked",
          metadata: {
            reason: "soul_report_not_ready",
          },
          createdAt: now,
          updatedAt: now,
        });
      }

      await db.insert("auditLogs", {
        organizationId: journey.organizationId,
        userId: journey.userId,
        action: "onboarding.specialist_preview.blocked",
        resource: "onboardingSpecialistPreviewContracts",
        resourceId: contractKey,
        metadata: {
          reason: "soul_report_not_ready",
          reportStatus: report?.status,
        },
        success: false,
        createdAt: now,
      });
      return {
        success: false,
        skipped: true,
        reason: "soul_report_not_ready",
      };
    }

    if (now < availableAt) {
      if (contract) {
        await db.patch(contract._id, {
          status: "scheduled",
          sourceSoulReportId: report._id,
          updatedAt: now,
        });
      }
      return {
        success: false,
        skipped: true,
        reason: "preview_not_available_yet",
      };
    }

    const summary = sanitizeChannelSafeText(String(report.summary || ""), MAX_SUMMARY_LENGTH);
    const rawHighlights: unknown[] = Array.isArray(report.highlights)
      ? (report.highlights as unknown[])
      : [];
    const highlights = rawHighlights
      .filter((line: unknown): line is string => typeof line === "string")
      .map((line: string) => sanitizeChannelSafeText(line, MAX_HIGHLIGHT_LENGTH))
      .filter((line: string) => line.length > 0);
    const previewMessage = buildSpecialistPreviewMessage({
      summary,
      highlights,
    });

    let sendSucceeded = false;
    let sendError: string | undefined;
    let resolvedDeliveryChannel: OnboardingNurtureChannel = deliveryChannel || "platform_web";
    if (deliveryChannel && recipientIdentifier) {
      try {
        await ctx.scheduler.runAfter(
          0,
          getInternal().channels.router.sendMessage,
          {
            organizationId: journey.organizationId,
            channel: deliveryChannel,
            recipientIdentifier,
            content: previewMessage,
            idempotencyKey: `onboarding-specialist-preview:${journey.journeyKey}`,
            failClosedRouting: false,
          },
        );
        sendSucceeded = true;
      } catch (error) {
        sendError = String(error);
      }
    } else {
      sendSucceeded = true;
      resolvedDeliveryChannel = "platform_web";
    }

    if (contract) {
      await db.patch(contract._id, {
        status: sendSucceeded ? "sent" : "blocked",
        sourceSoulReportId: report._id,
        previewMessage,
        deliveryChannel: resolvedDeliveryChannel,
        recipientIdentifier,
        qualityGateStatus: sendSucceeded ? "pass" : "blocked",
        readyAt: contract.readyAt || now,
        deliveredAt: sendSucceeded ? now : contract.deliveredAt,
        metadata: {
          ...(contract.metadata && typeof contract.metadata === "object"
            ? contract.metadata
            : {}),
          sendError,
        },
        updatedAt: now,
      });
    } else {
      await db.insert("onboardingSpecialistPreviewContracts", {
        contractKey,
        journeyId: journey._id,
        journeyKey: journey.journeyKey,
        organizationId: journey.organizationId,
        userId: journey.userId,
        status: sendSucceeded ? "sent" : "blocked",
        teamAccessMode: "invisible",
        availableAt,
        readyAt: now,
        deliveredAt: sendSucceeded ? now : undefined,
        sourceSoulReportId: report._id,
        previewMessage,
        deliveryChannel: resolvedDeliveryChannel,
        recipientIdentifier,
        qualityGateStatus: sendSucceeded ? "pass" : "blocked",
        metadata: {
          sendError,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.patch(report._id, {
      status: sendSucceeded ? "delivered" : "failed",
      deliveredAt: sendSucceeded ? now : report.deliveredAt,
      deliveryChannel: resolvedDeliveryChannel,
      recipientIdentifier,
      updatedAt: now,
    });

    await db.insert("auditLogs", {
      organizationId: journey.organizationId,
      userId: journey.userId,
      action: sendSucceeded
        ? "onboarding.specialist_preview.sent"
        : "onboarding.specialist_preview.blocked",
      resource: "onboardingSpecialistPreviewContracts",
      resourceId: contractKey,
      metadata: {
        reportId: report._id,
        deliveryChannel: resolvedDeliveryChannel,
        recipientIdentifier,
        sendError,
      },
      success: sendSucceeded,
      createdAt: now,
    });

    return {
      success: sendSucceeded,
      reportId: report._id,
      contractKey,
      deliveryChannel: resolvedDeliveryChannel,
      error: sendError,
    };
  },
});
