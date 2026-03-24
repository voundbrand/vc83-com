/**
 * AUTO-REPLENISH CREDIT SYSTEM
 *
 * Automatic credit purchases when balance drops below a configured threshold.
 * Uses Stripe off-session PaymentIntents with saved payment methods.
 *
 * Flow:
 * 1. deductCreditsInternal() detects balance below threshold after deduction
 * 2. Schedules checkAndTriggerReplenish (internalMutation) via scheduler
 * 3. Mutation validates eligibility (cooldown, circuit breaker), sets cooldown, schedules action
 * 4. executeReplenishPayment (internalAction) creates off-session Stripe PaymentIntent
 * 5. On success: calls addPurchasedCredits + resetReplenishFailures
 * 6. On failure: calls recordReplenishFailure + notification
 */

import { v, ConvexError } from "convex/values";
import {
  query,
  mutation,
  action,
  internalMutation,
  internalAction,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import Stripe from "stripe";
import { calculateCreditsFromAmount, PRESET_AMOUNTS } from "../stripe/creditCheckout";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

// --- Constants ---

const REPLENISH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between triggers
const MAX_CONSECUTIVE_FAILURES = 3; // Circuit breaker threshold

const getStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(apiKey, { apiVersion: "2025-10-29.clover" });
};

// --- Internal: Gate-keeping mutation ---

export const checkAndTriggerReplenish = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    currentTotalBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!balance?.autoReplenish?.enabled) {
      return { triggered: false, reason: "not_enabled" };
    }

    const config = balance.autoReplenish;

    // Circuit breaker: too many consecutive failures
    if (config.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      return { triggered: false, reason: "max_failures_reached" };
    }

    // Cooldown: prevent rapid-fire triggers
    if (config.cooldownUntil && Date.now() < config.cooldownUntil) {
      return { triggered: false, reason: "cooldown_active" };
    }

    // Re-read actual total balance (concurrent deductions may have changed it)
    const gifted = balance.giftedCredits ?? 0;
    const total =
      gifted +
      balance.dailyCredits +
      balance.monthlyCredits +
      balance.purchasedCredits;

    if (total >= config.thresholdCredits) {
      return { triggered: false, reason: "above_threshold" };
    }

    // Set cooldown atomically before scheduling payment
    const idempotencyKey = `auto_replenish_${args.organizationId}_${Date.now()}`;

    await ctx.db.patch(balance._id, {
      autoReplenish: {
        ...config,
        cooldownUntil: Date.now() + REPLENISH_COOLDOWN_MS,
        lastTriggeredAt: Date.now(),
      },
    });

    // Schedule the Stripe payment action (fire-and-forget)
    await (ctx.scheduler as any).runAfter(
      0,
      generatedApi.internal.credits.autoReplenish.executeReplenishPayment,
      {
        organizationId: args.organizationId,
        amountEur: config.amountEur,
        stripeCustomerId: config.stripeCustomerId,
        stripePaymentMethodId: config.stripePaymentMethodId,
        idempotencyKey,
      }
    );

    return { triggered: true, idempotencyKey };
  },
});

// --- Internal: Stripe off-session payment ---

export const executeReplenishPayment = internalAction({
  args: {
    organizationId: v.id("organizations"),
    amountEur: v.number(),
    stripeCustomerId: v.string(),
    stripePaymentMethodId: v.string(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();
    const amountCents = Math.round(args.amountEur * 100);
    const { credits } = calculateCreditsFromAmount(args.amountEur);

    try {
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: "eur",
          customer: args.stripeCustomerId,
          payment_method: args.stripePaymentMethodId,
          off_session: true,
          confirm: true,
          description: `Auto-replenish: ${credits} AI credits`,
          metadata: {
            organizationId: args.organizationId,
            type: "credit-auto-replenish",
            credits: credits.toString(),
            amountEur: args.amountEur.toString(),
            idempotencyKey: args.idempotencyKey,
            platform: "l4yercak3",
          },
        },
        { idempotencyKey: args.idempotencyKey }
      );

      if (paymentIntent.status === "succeeded") {
        // Fulfill credits using existing addPurchasedCredits
        await (ctx as any).runMutation(
          generatedApi.internal.credits.index.addPurchasedCredits,
          {
            organizationId: args.organizationId,
            credits,
            packId: `auto-replenish-${args.amountEur}eur`,
            stripePaymentIntentId: paymentIntent.id,
            reason: "purchased_auto_replenish",
            idempotencyKey: args.idempotencyKey,
          }
        );

        // Reset failure counter
        await (ctx as any).runMutation(
          generatedApi.internal.credits.autoReplenish.resetReplenishFailures,
          { organizationId: args.organizationId }
        );

        // Notify success
        await (ctx as any).runAction(
          generatedApi.internal.credits.autoReplenish.notifyReplenishResult,
          {
            organizationId: args.organizationId,
            success: true,
            credits,
            amountEur: args.amountEur,
          }
        );

        console.log(
          `[AutoReplenish] Success for org ${args.organizationId}: ${credits} credits (EUR ${args.amountEur})`
        );
      } else {
        // Payment requires authentication or is in a non-succeeded state
        await (ctx as any).runMutation(
          generatedApi.internal.credits.autoReplenish.recordReplenishFailure,
          {
            organizationId: args.organizationId,
            reason: `Payment status: ${paymentIntent.status}. Customer authentication may be required.`,
          }
        );

        await (ctx as any).runAction(
          generatedApi.internal.credits.autoReplenish.notifyReplenishResult,
          {
            organizationId: args.organizationId,
            success: false,
            credits: 0,
            amountEur: args.amountEur,
            errorMessage: `Payment requires action (status: ${paymentIntent.status})`,
          }
        );
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown Stripe error";
      console.error(
        `[AutoReplenish] Payment failed for org ${args.organizationId}:`,
        errorMessage
      );

      await (ctx as any).runMutation(
        generatedApi.internal.credits.autoReplenish.recordReplenishFailure,
        {
          organizationId: args.organizationId,
          reason: errorMessage.slice(0, 500),
        }
      );

      await (ctx as any).runAction(
        generatedApi.internal.credits.autoReplenish.notifyReplenishResult,
        {
          organizationId: args.organizationId,
          success: false,
          credits: 0,
          amountEur: args.amountEur,
          errorMessage: errorMessage.slice(0, 200),
        }
      );
    }
  },
});

// --- Internal: Reset failures on success ---

export const resetReplenishFailures = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (balance?.autoReplenish) {
      await ctx.db.patch(balance._id, {
        autoReplenish: {
          ...balance.autoReplenish,
          consecutiveFailures: 0,
          lastFailureReason: undefined,
        },
      });
    }
  },
});

// --- Internal: Record failure + circuit breaker ---

export const recordReplenishFailure = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!balance?.autoReplenish) return;

    const newFailures = balance.autoReplenish.consecutiveFailures + 1;
    const shouldDisable = newFailures >= MAX_CONSECUTIVE_FAILURES;

    await ctx.db.patch(balance._id, {
      autoReplenish: {
        ...balance.autoReplenish,
        consecutiveFailures: newFailures,
        lastFailureReason: args.reason,
        enabled: shouldDisable ? false : balance.autoReplenish.enabled,
      },
    });

    if (shouldDisable) {
      console.warn(
        `[AutoReplenish] Circuit breaker tripped for org ${args.organizationId} after ${newFailures} failures`
      );
    }
  },
});

// --- Internal: Pushover notification ---

export const notifyReplenishResult = internalAction({
  args: {
    organizationId: v.id("organizations"),
    success: v.boolean(),
    credits: v.number(),
    amountEur: v.number(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reason = args.success
      ? "auto_replenish_success"
      : "auto_replenish_failure";
    const cooldown = args.success ? 5 * 60 * 1000 : 60 * 60 * 1000;

    const last = await (ctx as any).runQuery(
      generatedApi.internal.credits.notifications.getLastNotification,
      { organizationId: args.organizationId, reason }
    );

    if (last) {
      const notifiedAt = (last.customProperties as Record<string, unknown>)
        ?.notifiedAt as number;
      if (notifiedAt && Date.now() - notifiedAt < cooldown) return;
    }

    const settings = await (ctx as any).runQuery(
      generatedApi.internal.integrations.pushover.getOrgPushoverSettings,
      { organizationId: args.organizationId }
    );

    if (!settings?.enabled) return;

    const title = args.success
      ? "Credits Auto-Replenished"
      : "Auto-Replenish Failed";
    const message = args.success
      ? `${args.credits} credits were automatically purchased (EUR ${args.amountEur}).`
      : `Auto-replenish payment failed: ${args.errorMessage || "Unknown error"}. Check your payment method.`;

    await (ctx as any).runAction(
      generatedApi.internal.integrations.pushover.sendPushoverNotification,
      {
        organizationId: args.organizationId,
        title,
        message,
        priority: args.success ? 0 : 1,
      }
    );

    await (ctx as any).runMutation(
      generatedApi.internal.credits.notifications.recordNotification,
      { organizationId: args.organizationId, reason }
    );
  },
});

// --- Public: Get auto-replenish status ---

export const getAutoReplenishStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!balance?.autoReplenish) {
      return { configured: false as const };
    }

    const config = balance.autoReplenish;
    const { credits } = calculateCreditsFromAmount(config.amountEur);

    return {
      configured: true as const,
      enabled: config.enabled,
      thresholdCredits: config.thresholdCredits,
      amountEur: config.amountEur,
      creditsPerReplenish: credits,
      consecutiveFailures: config.consecutiveFailures,
      lastTriggeredAt: config.lastTriggeredAt ?? null,
      lastFailureReason: config.lastFailureReason ?? null,
      isCircuitBroken: config.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES,
      paymentMethodLast4: null as string | null, // Resolved client-side via listPaymentMethods
    };
  },
});

// --- Public: Enable auto-replenish ---

export const enableAutoReplenish = mutation({
  args: {
    organizationId: v.id("organizations"),
    thresholdCredits: v.number(),
    amountEur: v.number(),
    stripePaymentMethodId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.thresholdCredits < 1) {
      throw new ConvexError({
        code: "INVALID_THRESHOLD",
        message: "Threshold must be at least 1 credit.",
      });
    }

    const validAmounts = PRESET_AMOUNTS as readonly number[];
    if (!validAmounts.includes(args.amountEur)) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: `Amount must be one of: EUR ${validAmounts.join(", ")}.`,
      });
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org?.stripeCustomerId) {
      throw new ConvexError({
        code: "NO_STRIPE_CUSTOMER",
        message:
          "Organization has no Stripe customer. Complete a manual credit purchase first.",
      });
    }

    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!balance) {
      throw new ConvexError({
        code: "NO_BALANCE",
        message: "Credit balance not found. Use the platform first to initialize credits.",
      });
    }

    await ctx.db.patch(balance._id, {
      autoReplenish: {
        enabled: true,
        thresholdCredits: Math.floor(args.thresholdCredits),
        amountEur: args.amountEur,
        stripeCustomerId: org.stripeCustomerId,
        stripePaymentMethodId: args.stripePaymentMethodId,
        consecutiveFailures: 0,
      },
    });

    return { success: true };
  },
});

// --- Public: Disable auto-replenish ---

export const disableAutoReplenish = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!balance?.autoReplenish) return { success: true };

    await ctx.db.patch(balance._id, {
      autoReplenish: {
        ...balance.autoReplenish,
        enabled: false,
      },
    });

    return { success: true };
  },
});

// --- Public: Update auto-replenish settings ---

export const updateAutoReplenish = mutation({
  args: {
    organizationId: v.id("organizations"),
    thresholdCredits: v.optional(v.number()),
    amountEur: v.optional(v.number()),
    stripePaymentMethodId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!balance?.autoReplenish) {
      throw new ConvexError({
        code: "NOT_CONFIGURED",
        message: "Auto-replenish is not configured. Enable it first.",
      });
    }

    if (args.thresholdCredits !== undefined && args.thresholdCredits < 1) {
      throw new ConvexError({
        code: "INVALID_THRESHOLD",
        message: "Threshold must be at least 1 credit.",
      });
    }

    if (args.amountEur !== undefined) {
      const validAmounts = PRESET_AMOUNTS as readonly number[];
      if (!validAmounts.includes(args.amountEur)) {
        throw new ConvexError({
          code: "INVALID_AMOUNT",
          message: `Amount must be one of: EUR ${validAmounts.join(", ")}.`,
        });
      }
    }

    const updates: Record<string, unknown> = { ...balance.autoReplenish };
    if (args.thresholdCredits !== undefined)
      updates.thresholdCredits = Math.floor(args.thresholdCredits);
    if (args.amountEur !== undefined) updates.amountEur = args.amountEur;
    if (args.stripePaymentMethodId !== undefined)
      updates.stripePaymentMethodId = args.stripePaymentMethodId;

    await ctx.db.patch(balance._id, {
      autoReplenish: updates as typeof balance.autoReplenish,
    });

    return { success: true };
  },
});

// --- Public: Create Stripe SetupIntent for saving a payment method ---

export const createSetupIntent = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    const org = await (ctx as any).runQuery(
      generatedApi.internal.organizations.getOrganization,
      { organizationId: args.organizationId }
    );

    if (!org?.stripeCustomerId) {
      throw new ConvexError({
        code: "NO_STRIPE_CUSTOMER",
        message:
          "Organization has no Stripe customer. Complete a manual credit purchase first.",
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: org.stripeCustomerId,
      payment_method_types: ["card"],
      metadata: {
        organizationId: args.organizationId,
        purpose: "auto-replenish",
        platform: "l4yercak3",
      },
    });

    return {
      clientSecret: setupIntent.client_secret,
      stripeCustomerId: org.stripeCustomerId,
    };
  },
});

// --- Public: List saved payment methods ---

export const listPaymentMethods = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    const org = await (ctx as any).runQuery(
      generatedApi.internal.organizations.getOrganization,
      { organizationId: args.organizationId }
    );

    if (!org?.stripeCustomerId) return { methods: [] };

    const methods = await stripe.paymentMethods.list({
      customer: org.stripeCustomerId,
      type: "card",
    });

    return {
      methods: methods.data.map((m) => ({
        id: m.id,
        brand: m.card?.brand ?? "unknown",
        last4: m.card?.last4 ?? "????",
        expMonth: m.card?.exp_month ?? 0,
        expYear: m.card?.exp_year ?? 0,
      })),
    };
  },
});
