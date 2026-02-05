/**
 * PLATFORM SMS CONFIGURATION
 *
 * Org-level sender configuration for platform-owned SMS (L4YERCAK3 SMS).
 * Orgs can choose:
 *   A) Alphanumeric sender (free, instant, outbound-only)
 *   B) Dedicated VLN number (paid via Stripe subscription, two-way SMS)
 *
 * Uses the platform's Infobip account (env vars) with CPaaS X multi-tenant
 * isolation (application + entity per org).
 *
 * Config stored as type="platform_sms_config" in the objects table.
 */

import { action, mutation, query, internalMutation, internalAction, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api: apiRef, internal: internalRef } = require("../_generated/api") as {
  api: Record<string, Record<string, Record<string, unknown>>>;
  internal: Record<string, Record<string, Record<string, unknown>>>;
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get platform SMS config for the current org (public query for UI).
 * Returns sender type, alphanumeric name, VLN status — no sensitive data.
 */
export const getPlatformSmsConfig = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) return null;

    const orgId = user.defaultOrgId as Id<"organizations">;

    const config = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "platform_sms_config")
      )
      .first();

    if (!config) {
      return { configured: false };
    }

    const props = config.customProperties as Record<string, unknown>;

    return {
      configured: true,
      senderType: props.senderType as string,
      // Alphanumeric
      alphanumericSender: props.alphanumericSender as string | undefined,
      // VLN
      vlnNumber: props.vlnNumber as string | undefined,
      vlnCountry: props.vlnCountry as string | undefined,
      vlnStatus: props.vlnStatus as string | undefined,
      vlnOurSetupFee: props.vlnOurSetupFee as number | undefined,
      vlnOurMonthlyFee: props.vlnOurMonthlyFee as number | undefined,
      // Timestamps
      configuredAt: props.configuredAt as number | undefined,
      vlnProvisionedAt: props.vlnProvisionedAt as number | undefined,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Save an alphanumeric sender name for the org.
 * Instant, free, outbound-only.
 */
export const saveAlphanumericSender = mutation({
  args: {
    sessionId: v.string(),
    senderName: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User not found or no organization");
    }

    const orgId = user.defaultOrgId as Id<"organizations">;

    // Verify permission
    const canManage = await (ctx.runQuery as Function)(apiRef.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: orgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    // Validate sender name: 1-11 chars, alphanumeric + spaces
    const sanitized = args.senderName.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    if (sanitized.length < 1 || sanitized.length > 11) {
      throw new Error("Sender name must be 1-11 alphanumeric characters");
    }

    // Upsert platform_sms_config
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "platform_sms_config")
      )
      .first();

    const configData = {
      senderType: "alphanumeric",
      alphanumericSender: sanitized,
      configuredAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        customProperties: configData,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("objects", {
        type: "platform_sms_config",
        name: "Platform SMS Config",
        organizationId: orgId,
        status: "active",
        customProperties: configData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Audit log
    await (ctx.runMutation as Function)(internalRef.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: existing ? "update" : "create",
      resource: "platform_sms_config",
      success: true,
      metadata: {
        senderType: "alphanumeric",
        senderName: sanitized,
      },
    });

    return { success: true, senderName: sanitized };
  },
});

/**
 * Disconnect platform SMS — removes sender config.
 */
export const disconnectPlatformSms = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User not found or no organization");
    }

    const orgId = user.defaultOrgId as Id<"organizations">;

    // Verify permission
    const canManage = await (ctx.runQuery as Function)(apiRef.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: orgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    const config = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "platform_sms_config")
      )
      .first();

    if (config) {
      const props = config.customProperties as Record<string, unknown>;

      // If VLN with active Stripe subscription, schedule cancellation
      if (props.senderType === "vln" && props.stripeSubscriptionId) {
        await ctx.scheduler.runAfter(
          0,
          internalRef.channels.platformSms.cancelVlnSubscription as any,
          {
            organizationId: orgId,
            stripeSubscriptionId: props.stripeSubscriptionId as string,
          }
        );
      }

      await ctx.db.delete(config._id);
    }

    // Audit log
    await (ctx.runMutation as Function)(internalRef.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: "delete",
      resource: "platform_sms_config",
      success: true,
    });

    return { success: true };
  },
});

// ============================================================================
// VLN — Available Numbers (Phase 2)
// ============================================================================

/**
 * Browse available numbers from Infobip by country.
 * Returns offers with our markup pricing.
 */
export const getAvailableNumbers = action({
  args: {
    sessionId: v.string(),
    country: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate session via canUserPerform (lightweight check)
    const canAccess = await (ctx.runQuery as Function)(apiRef.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
    });
    if (!canAccess) {
      throw new Error("Invalid session or permission denied");
    }

    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL;
    if (!apiKey || !baseUrl) {
      throw new Error("Platform Infobip not configured");
    }

    // Validate country (DACH only for now)
    const validCountries = ["DE", "AT", "CH"];
    if (!validCountries.includes(args.country.toUpperCase())) {
      throw new Error("Country must be DE, AT, or CH");
    }

    try {
      const response = await fetch(
        `${baseUrl}/numbers/1/numbers/available?capabilities=SMS&country=${args.country.toUpperCase()}`,
        {
          headers: { Authorization: `App ${apiKey}` },
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Infobip API ${response.status}: ${errText.substring(0, 200)}`);
      }

      const data = (await response.json()) as {
        numberCount?: number;
        numbers?: Array<{
          numberKey?: string;
          number?: string;
          country?: string;
          type?: string;
          capabilities?: string[];
          setupPrice?: number;
          monthlyPrice?: number;
          currency?: string;
          // Other fields
          [key: string]: unknown;
        }>;
      };

      // Apply markup (35%) and return
      const MARKUP = 1.35;
      const offers = (data.numbers || []).map((n) => ({
        numberKey: n.numberKey,
        number: n.number,
        country: n.country,
        type: n.type,
        capabilities: n.capabilities,
        // Infobip pricing
        infobipSetupPrice: n.setupPrice,
        infobipMonthlyPrice: n.monthlyPrice,
        currency: n.currency || "EUR",
        // Our pricing (with markup, rounded to .99)
        ourSetupPrice: n.setupPrice
          ? Math.ceil((n.setupPrice * MARKUP) * 100 - 1) / 100
          : undefined,
        ourMonthlyPrice: n.monthlyPrice
          ? Math.ceil((n.monthlyPrice * MARKUP) * 100 - 1) / 100
          : undefined,
      }));

      return {
        success: true,
        country: args.country.toUpperCase(),
        numberCount: data.numberCount || offers.length,
        offers,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        offers: [],
      };
    }
  },
});

// ============================================================================
// VLN — Order & Provisioning (Phase 2)
// ============================================================================

/**
 * Save a VLN order with compliance details.
 * Status starts as "pending_payment" — Stripe checkout happens next.
 */
export const saveVlnOrder = mutation({
  args: {
    sessionId: v.string(),
    country: v.string(),
    numberKey: v.string(),
    number: v.string(),
    infobipSetupPrice: v.number(),
    infobipMonthlyPrice: v.number(),
    ourSetupPrice: v.number(),
    ourMonthlyPrice: v.number(),
    companyName: v.string(),
    useCase: v.string(),
    optInFlow: v.string(),
    optOutFlow: v.string(),
    messageExample: v.string(),
    monthlyOutboundEstimate: v.optional(v.string()),
    monthlyInboundEstimate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User not found or no organization");
    }

    const orgId = user.defaultOrgId as Id<"organizations">;

    // Verify permission
    const canManage = await (ctx.runQuery as Function)(apiRef.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: orgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    // Upsert platform_sms_config with VLN order
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "platform_sms_config")
      )
      .first();

    const configData = {
      senderType: "vln",
      vlnNumber: args.number,
      vlnCountry: args.country.toUpperCase(),
      vlnStatus: "pending_payment",
      vlnInfobipNumberKey: args.numberKey,
      vlnSetupFee: args.infobipSetupPrice,
      vlnMonthlyFee: args.infobipMonthlyPrice,
      vlnOurSetupFee: args.ourSetupPrice,
      vlnOurMonthlyFee: args.ourMonthlyPrice,
      companyName: args.companyName,
      useCase: args.useCase,
      optInFlow: args.optInFlow,
      optOutFlow: args.optOutFlow,
      messageExample: args.messageExample,
      monthlyOutboundEstimate: args.monthlyOutboundEstimate,
      monthlyInboundEstimate: args.monthlyInboundEstimate,
      configuredAt: Date.now(),
    };

    let configId: Id<"objects">;

    if (existing) {
      await ctx.db.patch(existing._id, {
        customProperties: configData,
        updatedAt: Date.now(),
      });
      configId = existing._id;
    } else {
      configId = await ctx.db.insert("objects", {
        type: "platform_sms_config",
        name: "Platform SMS Config",
        organizationId: orgId,
        status: "active",
        customProperties: configData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true, configId };
  },
});

/**
 * Activate VLN after Stripe payment succeeds.
 * Called by Stripe webhook handler.
 */
export const activateVln = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "platform_sms_config")
      )
      .first();

    if (!config) {
      throw new Error("No platform SMS config found for org");
    }

    const props = config.customProperties as Record<string, unknown>;
    await ctx.db.patch(config._id, {
      customProperties: {
        ...props,
        vlnStatus: "pending_provisioning",
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeSubscriptionStatus: "active",
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update VLN status after Infobip provisioning.
 */
export const updateVlnStatus = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    status: v.string(),
    vlnNumber: v.optional(v.string()),
    vlnInfobipNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "platform_sms_config")
      )
      .first();

    if (!config) return;

    const props = config.customProperties as Record<string, unknown>;
    const updates: Record<string, unknown> = {
      ...props,
      vlnStatus: args.status,
    };

    if (args.vlnNumber) updates.vlnNumber = args.vlnNumber;
    if (args.vlnInfobipNumberId) updates.vlnInfobipNumberId = args.vlnInfobipNumberId;
    if (args.status === "active") updates.vlnProvisionedAt = Date.now();

    await ctx.db.patch(config._id, {
      customProperties: updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Purchase a number on Infobip and associate with the org's CPaaS X entity.
 * Called after Stripe payment succeeds.
 */
export const purchaseInfobipNumber = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL;
    if (!apiKey || !baseUrl) {
      throw new Error("Platform Infobip not configured");
    }

    // Get the VLN config
    const config = await (ctx.runQuery as Function)(
      internalRef.channels.platformSms.getVlnConfigInternal,
      { organizationId: args.organizationId }
    ) as Record<string, unknown> | null;

    if (!config) {
      throw new Error("No VLN config found");
    }

    const numberKey = config.vlnInfobipNumberKey as string;
    if (!numberKey) {
      throw new Error("No number key in VLN config");
    }

    // Purchase the number via Infobip API
    try {
      const response = await fetch(`${baseUrl}/numbers/1/numbers`, {
        method: "POST",
        headers: {
          Authorization: `App ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ numberKey }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`[PlatformSMS] Number purchase failed: HTTP ${response.status} — ${errText.substring(0, 300)}`);
        await (ctx.runMutation as Function)(
          internalRef.channels.platformSms.updateVlnStatus,
          { organizationId: args.organizationId, status: "error" }
        );
        return;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const numberId = data.numberId as string || data.numberKey as string;

      // Associate number with CPaaS X entity
      const entityId = await (ctx.runQuery as Function)(
        internalRef.channels.infobipCpaasX.getOrgEntityId,
        { organizationId: args.organizationId }
      ) as string | null;

      const applicationId = process.env.INFOBIP_APPLICATION_ID;

      if (entityId && applicationId) {
        try {
          await fetch(`${baseUrl}/provisioning/1/associations`, {
            method: "POST",
            headers: {
              Authorization: `App ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              applicationId,
              entityId,
              channel: "SMS",
              numberKey,
            }),
          });
        } catch (e) {
          console.error("[PlatformSMS] Resource association failed (non-blocking):", e);
        }
      }

      // Update status to active
      await (ctx.runMutation as Function)(
        internalRef.channels.platformSms.updateVlnStatus,
        {
          organizationId: args.organizationId,
          status: "active",
          vlnInfobipNumberId: numberId,
        }
      );
    } catch (error) {
      console.error("[PlatformSMS] Number purchase error:", error);
      await (ctx.runMutation as Function)(
        internalRef.channels.platformSms.updateVlnStatus,
        { organizationId: args.organizationId, status: "error" }
      );
    }
  },
});

// ============================================================================
// INTERNAL QUERIES (for router and webhook use)
// ============================================================================

/**
 * Get VLN config internals (used by purchaseInfobipNumber action).
 */
export const getVlnConfigInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "platform_sms_config")
      )
      .first();

    if (!config) return null;
    return config.customProperties as Record<string, unknown>;
  },
});

/**
 * Cancel VLN Stripe subscription and clean up Infobip entity.
 * Called when user disconnects platform SMS (VLN).
 */
export const cancelVlnSubscription = internalAction({
  args: {
    organizationId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Cancel the Stripe subscription
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-10-29.clover",
    });

    try {
      await stripe.subscriptions.cancel(args.stripeSubscriptionId);
      console.log(`[PlatformSMS] Cancelled Stripe subscription ${args.stripeSubscriptionId}`);
    } catch (error) {
      console.error("[PlatformSMS] Failed to cancel Stripe subscription:", error);
    }

    // Clean up Infobip CPaaS X entity (non-blocking)
    try {
      await (ctx.runAction as Function)(
        internalRef.channels.infobipCpaasX.deleteOrgEntity,
        { organizationId: args.organizationId }
      );
    } catch (e) {
      console.error("[PlatformSMS] Entity cleanup failed (non-blocking):", e);
    }
  },
});
