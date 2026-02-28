/**
 * ONBOARDING NURTURE SCHEDULER
 *
 * Day 0-3 nurture orchestration with per-user state and first-win SLA tracking.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { onboardingChannelValidator } from "../schemas/webchatSchemas";
import type { Id } from "../_generated/dataModel";

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

export const FIRST_WIN_GUARANTEE_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SOUL_REPORT_SCHEDULE_DELAY_MS = 3 * DAY_MS;
const SPECIALIST_PREVIEW_SCHEDULE_DELAY_MS = 5 * DAY_MS;

export const NURTURE_STEP_KEYS = [
  "day0_first_win",
  "day1_activation",
  "day2_value_capture",
  "day3_momentum",
] as const;
export type NurtureStepKey = (typeof NURTURE_STEP_KEYS)[number];

export type OnboardingNurtureChannel =
  | "webchat"
  | "native_guest"
  | "telegram"
  | "whatsapp"
  | "slack"
  | "sms"
  | "platform_web"
  | "unknown";

type NurtureStepStatus = "pending" | "sent" | "failed";

type NurtureStepState = {
  status: NurtureStepStatus;
  scheduledFor: number;
  processedAt?: number;
  deliveryChannel?: OnboardingNurtureChannel;
  recipientIdentifier?: string;
  error?: string;
};

export type NurtureStepStateMap = Record<NurtureStepKey, NurtureStepState>;

type NurtureStepTemplate = {
  stepKey: NurtureStepKey;
  offsetMs: number;
  message: string;
};

const NURTURE_STEP_TEMPLATES: readonly NurtureStepTemplate[] = [
  {
    stepKey: "day0_first_win",
    offsetMs: 5 * 60 * 1000,
    message:
      "Quick win: ask your agent to draft one reply for a real customer question, then ship it today.",
  },
  {
    stepKey: "day1_activation",
    offsetMs: DAY_MS,
    message:
      "Day 1 checkpoint: connect one live channel and run a real inbound-to-reply loop end-to-end.",
  },
  {
    stepKey: "day2_value_capture",
    offsetMs: 2 * DAY_MS,
    message:
      "Day 2 move: capture your top 3 recurring customer questions and save reusable response patterns.",
  },
  {
    stepKey: "day3_momentum",
    offsetMs: 3 * DAY_MS,
    message:
      "Day 3 momentum: review wins, remove one friction point, and lock in your next weekly automation.",
  },
];

const NURTURE_STEP_KEY_VALIDATOR = v.union(
  v.literal("day0_first_win"),
  v.literal("day1_activation"),
  v.literal("day2_value_capture"),
  v.literal("day3_momentum"),
);

const DIRECT_DELIVERY_CHANNELS = new Set<OnboardingNurtureChannel>([
  "telegram",
  "whatsapp",
  "slack",
  "sms",
]);

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveStepTemplate(stepKey: NurtureStepKey): NurtureStepTemplate {
  const template = NURTURE_STEP_TEMPLATES.find((item) => item.stepKey === stepKey);
  if (!template) {
    throw new Error(`Unknown nurture step key: ${stepKey}`);
  }
  return template;
}

function ensureStepStateRecord(
  value: unknown,
  startedAt: number,
): NurtureStepStateMap {
  const defaults = resolveNurtureStepSchedule(startedAt);
  if (!value || typeof value !== "object") {
    return defaults;
  }

  const record = value as Record<string, unknown>;
  const merged = { ...defaults };
  for (const key of NURTURE_STEP_KEYS) {
    const candidate = record[key];
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const candidateRecord = candidate as Record<string, unknown>;
    const status =
      candidateRecord.status === "pending"
      || candidateRecord.status === "sent"
      || candidateRecord.status === "failed"
        ? candidateRecord.status
        : merged[key].status;
    const scheduledFor =
      typeof candidateRecord.scheduledFor === "number" && Number.isFinite(candidateRecord.scheduledFor)
        ? Math.floor(candidateRecord.scheduledFor)
        : merged[key].scheduledFor;
    merged[key] = {
      status,
      scheduledFor,
      processedAt:
        typeof candidateRecord.processedAt === "number" && Number.isFinite(candidateRecord.processedAt)
          ? Math.floor(candidateRecord.processedAt)
          : undefined,
      deliveryChannel:
        candidateRecord.deliveryChannel === "webchat"
        || candidateRecord.deliveryChannel === "native_guest"
        || candidateRecord.deliveryChannel === "telegram"
        || candidateRecord.deliveryChannel === "whatsapp"
        || candidateRecord.deliveryChannel === "slack"
        || candidateRecord.deliveryChannel === "sms"
        || candidateRecord.deliveryChannel === "platform_web"
        || candidateRecord.deliveryChannel === "unknown"
          ? candidateRecord.deliveryChannel
          : undefined,
      recipientIdentifier: normalizeOptionalString(candidateRecord.recipientIdentifier),
      error: normalizeOptionalString(candidateRecord.error),
    };
  }
  return merged;
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

export function resolveNurtureStepSchedule(startedAt: number): NurtureStepStateMap {
  const schedule = {} as NurtureStepStateMap;
  for (const step of NURTURE_STEP_TEMPLATES) {
    schedule[step.stepKey] = {
      status: "pending",
      scheduledFor: startedAt + step.offsetMs,
    };
  }
  return schedule;
}

export function resolveFirstWinSlaState(args: {
  firstWinDueAt: number;
  firstWinDeliveredAt?: number;
  now: number;
}): "met" | "pending" | "breached" {
  if (typeof args.firstWinDeliveredAt === "number") {
    return args.firstWinDeliveredAt <= args.firstWinDueAt ? "met" : "breached";
  }
  return args.now <= args.firstWinDueAt ? "pending" : "breached";
}

export const startNurtureJourney = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    sourceChannel: onboardingChannelValidator,
    preferredChannel: v.optional(onboardingChannelValidator),
    recipientIdentifier: v.optional(v.string()),
    firstWinSeededAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    startReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const journeyKey = `${String(args.organizationId)}:${String(args.userId)}`;
    const recipientIdentifier = normalizeOptionalString(args.recipientIdentifier);
    const firstWinSeededAt =
      typeof args.firstWinSeededAt === "number" && Number.isFinite(args.firstWinSeededAt)
        ? Math.floor(args.firstWinSeededAt)
        : undefined;

    const existing = await ctx.db
      .query("onboardingNurtureJourneys")
      .withIndex("by_journey_key", (q) => q.eq("journeyKey", journeyKey))
      .first();

    if (existing) {
      const patch: Record<string, unknown> = {
        preferredChannel: args.preferredChannel || existing.preferredChannel,
        sourceChannel: args.sourceChannel || existing.sourceChannel,
        recipientIdentifier: recipientIdentifier || existing.recipientIdentifier,
        metadata:
          args.metadata && typeof args.metadata === "object"
            ? {
                ...(existing.metadata && typeof existing.metadata === "object"
                  ? (existing.metadata as Record<string, unknown>)
                  : {}),
                ...(args.metadata as Record<string, unknown>),
              }
            : existing.metadata,
        updatedAt: now,
      };
      if (!existing.firstWinDeliveredAt && firstWinSeededAt) {
        patch.firstWinDeliveredAt = firstWinSeededAt;
      }
      await ctx.db.patch(existing._id, patch);
      return {
        journeyId: existing._id,
        journeyKey,
        created: false,
      };
    }

    const startedAt = now;
    const stepState = resolveNurtureStepSchedule(startedAt);
    const firstWinDueAt = startedAt + FIRST_WIN_GUARANTEE_MS;

    const journeyId = await ctx.db.insert("onboardingNurtureJourneys", {
      journeyKey,
      organizationId: args.organizationId,
      userId: args.userId,
      sourceChannel: args.sourceChannel,
      preferredChannel: args.preferredChannel,
      recipientIdentifier,
      status: "active",
      firstWinDueAt,
      firstWinDeliveredAt: firstWinSeededAt,
      stepState,
      metadata:
        args.metadata && typeof args.metadata === "object"
          ? {
              ...(args.metadata as Record<string, unknown>),
              startReason: normalizeOptionalString(args.startReason) || "unspecified",
            }
          : {
              startReason: normalizeOptionalString(args.startReason) || "unspecified",
            },
      startedAt,
      createdAt: now,
      updatedAt: now,
    });

    for (const step of NURTURE_STEP_TEMPLATES) {
      await ctx.scheduler.runAfter(
        step.offsetMs,
        getInternal().onboarding.nurtureScheduler.dispatchNurtureStep,
        {
          journeyId,
          stepKey: step.stepKey,
        },
      );
    }

    await ctx.scheduler.runAfter(
      SOUL_REPORT_SCHEDULE_DELAY_MS,
      getInternal().onboarding.soulReportScheduler.generateSoulReport,
      {
        journeyId,
      },
    );

    await ctx.scheduler.runAfter(
      SPECIALIST_PREVIEW_SCHEDULE_DELAY_MS,
      getInternal().onboarding.soulReportScheduler.dispatchSpecialistPreview,
      {
        journeyId,
      },
    );

    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: "onboarding.nurture.journey.started",
      resource: "onboardingNurtureJourneys",
      resourceId: journeyKey,
      metadata: {
        journeyId,
        sourceChannel: args.sourceChannel,
        preferredChannel: args.preferredChannel,
        firstWinDueAt,
        firstWinSeededAt,
      },
      success: true,
      createdAt: now,
    });

    return {
      journeyId,
      journeyKey,
      created: true,
      firstWinDueAt,
    };
  },
});

export const dispatchNurtureStep = internalMutation({
  args: {
    journeyId: v.id("onboardingNurtureJourneys"),
    stepKey: NURTURE_STEP_KEY_VALIDATOR,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      return {
        success: false,
        skipped: true,
        reason: "journey_not_found",
      };
    }

    if (journey.status !== "active") {
      return {
        success: false,
        skipped: true,
        reason: `journey_${journey.status}`,
      };
    }

    const stepState = ensureStepStateRecord(journey.stepState, journey.startedAt);
    const currentStep = stepState[args.stepKey];
    if (currentStep.processedAt) {
      return {
        success: true,
        deduped: true,
        stepKey: args.stepKey,
      };
    }

    const template = resolveStepTemplate(args.stepKey);
    const recipientIdentifier = normalizeOptionalString(journey.recipientIdentifier);
    const deliveryChannel = resolvePreferredDeliveryChannel({
      preferredChannel: journey.preferredChannel as OnboardingNurtureChannel | undefined,
      sourceChannel: journey.sourceChannel as OnboardingNurtureChannel,
    });

    let deliverySucceeded = false;
    let sendError: string | undefined;
    let resolvedDeliveryChannel: OnboardingNurtureChannel =
      deliveryChannel || "platform_web";

    if (deliveryChannel && recipientIdentifier) {
      try {
        await ctx.scheduler.runAfter(
          0,
          getInternal().channels.router.sendMessage,
          {
            organizationId: journey.organizationId,
            channel: deliveryChannel,
            recipientIdentifier,
            content: template.message,
            idempotencyKey: `onboarding-nurture:${journey.journeyKey}:${args.stepKey}`,
            failClosedRouting: false,
          },
        );
        deliverySucceeded = true;
      } catch (error) {
        deliverySucceeded = false;
        sendError = String(error);
      }
    } else {
      deliverySucceeded = true;
      resolvedDeliveryChannel = "platform_web";
    }

    stepState[args.stepKey] = {
      status: deliverySucceeded ? "sent" : "failed",
      scheduledFor: currentStep.scheduledFor,
      processedAt: now,
      deliveryChannel: resolvedDeliveryChannel,
      recipientIdentifier,
      error: sendError,
    };

    const allProcessed = NURTURE_STEP_KEYS.every(
      (stepKey) => typeof stepState[stepKey].processedAt === "number",
    );
    const firstWinDeliveredAt =
      journey.firstWinDeliveredAt
      || (args.stepKey === "day0_first_win" && deliverySucceeded ? now : undefined);

    const firstWinSlaState = resolveFirstWinSlaState({
      firstWinDueAt: journey.firstWinDueAt,
      firstWinDeliveredAt,
      now,
    });

    await ctx.db.patch(journey._id, {
      stepState,
      firstWinDeliveredAt,
      firstWinBreachedAt:
        journey.firstWinBreachedAt ||
        (firstWinSlaState === "breached" && !firstWinDeliveredAt ? now : undefined),
      status: allProcessed ? "completed" : "active",
      completedAt: allProcessed ? now : journey.completedAt,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: journey.organizationId,
      userId: journey.userId,
      action: deliverySucceeded
        ? "onboarding.nurture.step.sent"
        : "onboarding.nurture.step.failed",
      resource: "onboardingNurtureJourneys",
      resourceId: journey.journeyKey,
      metadata: {
        journeyId: journey._id,
        stepKey: args.stepKey,
        scheduledFor: currentStep.scheduledFor,
        processedAt: now,
        deliveryChannel: resolvedDeliveryChannel,
        recipientIdentifier,
        firstWinSlaState,
        error: sendError,
      },
      success: deliverySucceeded,
      createdAt: now,
    });

    return {
      success: deliverySucceeded,
      stepKey: args.stepKey,
      firstWinSlaState,
      error: sendError,
    };
  },
});

export const auditFirstWinGuarantees = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit =
      typeof args.limit === "number" && Number.isFinite(args.limit)
        ? Math.max(1, Math.min(200, Math.floor(args.limit)))
        : 100;

    const overdueJourneys = await ctx.db
      .query("onboardingNurtureJourneys")
      .withIndex("by_status_and_first_win_due", (q) =>
        q.eq("status", "active").lt("firstWinDueAt", now)
      )
      .take(limit);

    let breachedCount = 0;
    for (const journey of overdueJourneys) {
      if (journey.firstWinDeliveredAt || journey.firstWinBreachedAt) {
        continue;
      }

      breachedCount += 1;
      await ctx.db.patch(journey._id, {
        firstWinBreachedAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("auditLogs", {
        organizationId: journey.organizationId,
        userId: journey.userId,
        action: "onboarding.nurture.first_win.breached",
        resource: "onboardingNurtureJourneys",
        resourceId: journey.journeyKey,
        metadata: {
          journeyId: journey._id,
          firstWinDueAt: journey.firstWinDueAt,
          checkedAt: now,
        },
        success: false,
        createdAt: now,
      });
    }

    return {
      checked: overdueJourneys.length,
      breached: breachedCount,
    };
  },
});
