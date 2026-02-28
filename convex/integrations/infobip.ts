/**
 * INFOBIP SMS INTEGRATION
 *
 * Infobip SMS provider integration for outbound SMS messaging.
 * Each org connects their own Infobip account via API key + base URL.
 *
 * Configuration stored in objects table as type="infobip_settings".
 * Channel bindings stored as type="channel_provider_binding".
 *
 * Infobip API Reference: https://www.infobip.com/docs/api
 */

import {
  action,
  mutation,
  query,
  internalQuery,
  internalAction,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
const generatedApi: any = require("../_generated/api");

const INFOBIP_BILLING_SOURCE_VALUES = ["platform", "byok", "private"] as const;
const INFOBIP_CREDENTIAL_POLICY_VALUES = [
  "byok_only",
  "byok_or_platform_fallback",
] as const;

type InfobipBillingSource = (typeof INFOBIP_BILLING_SOURCE_VALUES)[number];
type InfobipCredentialPolicy = (typeof INFOBIP_CREDENTIAL_POLICY_VALUES)[number];

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeInfobipBillingSource(value: unknown): InfobipBillingSource | null {
  if (
    value === "platform" ||
    value === "byok" ||
    value === "private"
  ) {
    return value;
  }
  return null;
}

function normalizeInfobipCredentialPolicy(value: unknown): InfobipCredentialPolicy | null {
  if (value === "byok_only" || value === "byok_or_platform_fallback") {
    return value;
  }
  return null;
}

async function isUserSuperAdminByUserDoc(
  ctx: unknown,
  user: { global_role_id?: Id<"roles"> | null }
): Promise<boolean> {
  if (!user.global_role_id) {
    return false;
  }
  const role = await (ctx as any).db.get(user.global_role_id);
  return Boolean(role && role.name === "super_admin");
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get Infobip settings for the current org (public query for UI).
 * NEVER returns the API key — only connection status and non-sensitive config.
 */
export const getInfobipSettings = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) return null;
    const canUsePlatformManaged = await isUserSuperAdminByUserDoc(ctx, user);

    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", user.defaultOrgId as Id<"organizations">)
          .eq("type", "infobip_settings")
      )
      .first();

    if (!settings) {
      return { configured: false, enabled: false, canUsePlatformManaged };
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      configured: true,
      enabled: props.enabled as boolean,
      baseUrl: props.infobipBaseUrl as string | undefined,
      senderId: props.infobipSmsSenderId as string | undefined,
      voiceBridgeEndpoint: props.infobipVoiceBridgeEndpoint as string | undefined,
      ownerPhone: props.infobipOwnerPhone as string | undefined,
      billingSource:
        normalizeInfobipBillingSource(props.billingSource) || "byok",
      credentialPolicy:
        normalizeInfobipCredentialPolicy(props.credentialPolicy) ||
        "byok_or_platform_fallback",
      canUsePlatformManaged,
    };
  },
});

/**
 * Internal query for settings with credentials (used by router/channel system).
 */
export const getSettingsInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "infobip_settings")
      )
      .first();

    if (!settings) return null;
    return settings.customProperties as Record<string, unknown>;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Save Infobip connection settings and create channel bindings.
 */
export const saveInfobipSettings = mutation({
  args: {
    sessionId: v.string(),
    infobipApiKey: v.optional(v.string()),
    infobipBaseUrl: v.optional(v.string()),
    infobipSmsSenderId: v.optional(v.string()),
    infobipVoiceBridgeEndpoint: v.optional(v.string()),
    infobipOwnerPhone: v.optional(v.string()),
    billingSource: v.optional(v.union(
      v.literal("platform"),
      v.literal("byok"),
      v.literal("private"),
    )),
    credentialPolicy: v.optional(v.union(
      v.literal("byok_only"),
      v.literal("byok_or_platform_fallback"),
    )),
    enabled: v.boolean(),
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
    const isSuperAdmin = await isUserSuperAdminByUserDoc(ctx, user);

    // Verify permission
    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: orgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    const billingSource =
      normalizeInfobipBillingSource(args.billingSource) || "byok";
    const normalizedCredentialPolicy = normalizeInfobipCredentialPolicy(
      args.credentialPolicy
    );
    const credentialPolicy =
      normalizedCredentialPolicy ||
      (isSuperAdmin ? "byok_or_platform_fallback" : "byok_only");
    const infobipApiKey = normalizeOptionalString(args.infobipApiKey);
    const infobipBaseUrl = normalizeOptionalString(args.infobipBaseUrl);
    const infobipSmsSenderId = normalizeOptionalString(args.infobipSmsSenderId);

    const requestsPlatformManagedMode =
      billingSource === "platform" || credentialPolicy === "byok_or_platform_fallback";
    if (requestsPlatformManagedMode && !isSuperAdmin) {
      throw new Error(
        "Permission denied: super_admin required to configure platform-managed Infobip mode.",
      );
    }

    if (
      args.enabled &&
      billingSource !== "platform" &&
      (!infobipApiKey || !infobipBaseUrl || !infobipSmsSenderId)
    ) {
      throw new Error(
        "Infobip API key, base URL, and sender ID are required when billingSource is not 'platform'.",
      );
    }

    const settingsData = {
      infobipApiKey: infobipApiKey || undefined,
      infobipBaseUrl: infobipBaseUrl?.replace(/\/+$/, ""), // Strip trailing slash
      infobipSmsSenderId: infobipSmsSenderId || undefined,
      infobipVoiceBridgeEndpoint: args.infobipVoiceBridgeEndpoint?.trim(),
      infobipOwnerPhone: args.infobipOwnerPhone?.trim(),
      billingSource,
      credentialPolicy,
      enabled: args.enabled,
    };

    // Upsert infobip_settings
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "infobip_settings")
      )
      .first();

    let settingsId: Id<"objects">;

    if (existing) {
      await ctx.db.patch(existing._id, {
        customProperties: settingsData,
        updatedAt: Date.now(),
      });
      settingsId = existing._id;
    } else {
      settingsId = await ctx.db.insert("objects", {
        type: "infobip_settings",
        name: "Infobip SMS Settings",
        organizationId: orgId,
        status: "active",
        customProperties: settingsData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Sync channel_provider_binding objects
    // Remove existing Infobip bindings
    const existingBindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    const infobipBindings = existingBindings.filter(
      (b) =>
        (b.customProperties as Record<string, unknown>)?.providerId ===
        "infobip"
    );

    for (const binding of infobipBindings) {
      await ctx.db.delete(binding._id);
    }

    // Create new binding for SMS channel if enabled
    if (args.enabled) {
      await ctx.db.insert("objects", {
        type: "channel_provider_binding",
        name: "sms via Infobip",
        organizationId: orgId,
        status: "active",
        customProperties: {
          channel: "sms",
          providerId: "infobip",
          priority: 1,
          enabled: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Audit log
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: existing ? "update" : "create",
      resource: "infobip_settings",
      success: true,
      metadata: {
        enabled: args.enabled,
        billingSource,
        credentialPolicy,
        channels: ["sms"],
      },
    });

    return { success: true, settingsId };
  },
});

/**
 * Disconnect Infobip — removes settings and all channel bindings.
 */
export const disconnectInfobip = mutation({
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
    const isSuperAdmin = await isUserSuperAdminByUserDoc(ctx, user);

    // Verify permission
    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: orgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    // Delete infobip_settings
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "infobip_settings")
      )
      .first();

    if (settings) {
      const props = settings.customProperties as Record<string, unknown>;
      const billingSource = normalizeInfobipBillingSource(props.billingSource) || "byok";
      const credentialPolicy =
        normalizeInfobipCredentialPolicy(props.credentialPolicy) ||
        "byok_or_platform_fallback";
      const isPlatformManaged =
        billingSource === "platform" || credentialPolicy === "byok_or_platform_fallback";
      if (isPlatformManaged && !isSuperAdmin) {
        throw new Error(
          "Permission denied: super_admin required to disconnect platform-managed Infobip settings.",
        );
      }
    }

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    // Delete all Infobip channel bindings
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    for (const binding of bindings) {
      if (
        (binding.customProperties as Record<string, unknown>)?.providerId ===
        "infobip"
      ) {
        await ctx.db.delete(binding._id);
      }
    }

    // Audit log
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: "delete",
      resource: "infobip_settings",
      success: true,
    });

    return { success: true };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Test Infobip connection by calling the account balance API.
 */
export const testInfobipConnection = action({
  args: {
    infobipApiKey: v.string(),
    infobipBaseUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const baseUrl = args.infobipBaseUrl.replace(/\/+$/, "");

    try {
      const response = await fetch(`${baseUrl}/account/1/balance`, {
        headers: { Authorization: `App ${args.infobipApiKey}` },
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${text.substring(0, 200)}`,
        };
      }

      const data = (await response.json()) as {
        balance?: number;
        currency?: string;
      };
      return {
        success: true,
        balance: `${data.balance} ${data.currency}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const resolveInfobipRuntimeConfigInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    allowPlatformFallback: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "infobip_settings")
      )
      .first();

    const props = (settings?.customProperties || {}) as Record<string, unknown>;
    const enabled = props.enabled === true;
    const billingSource = normalizeInfobipBillingSource(props.billingSource) || "byok";
    const credentialPolicy =
      normalizeInfobipCredentialPolicy(props.credentialPolicy) ||
      normalizeInfobipCredentialPolicy(process.env.INFOBIP_CREDENTIAL_POLICY) ||
      "byok_or_platform_fallback";
    const allowPlatformFallback = args.allowPlatformFallback !== false;

    const orgApiKey = normalizeOptionalString(props.infobipApiKey);
    const orgBaseUrl = normalizeOptionalString(props.infobipBaseUrl);
    const orgSenderId = normalizeOptionalString(props.infobipSmsSenderId);
    const orgVoiceBridgeEndpoint = normalizeOptionalString(props.infobipVoiceBridgeEndpoint);
    const orgOwnerPhone = normalizeOptionalString(props.infobipOwnerPhone);

    const hasOrgByok = Boolean(orgApiKey && orgBaseUrl && orgSenderId);
    if (enabled && billingSource !== "platform" && hasOrgByok) {
      return {
        success: true,
        source: "organization_setting",
        billingSource,
        credentialPolicy,
        infobipApiKey: orgApiKey,
        infobipBaseUrl: orgBaseUrl,
        infobipSmsSenderId: orgSenderId,
        infobipVoiceBridgeEndpoint: orgVoiceBridgeEndpoint || undefined,
        infobipOwnerPhone: orgOwnerPhone || undefined,
      } as const;
    }

    const platformApiKey = normalizeOptionalString(process.env.INFOBIP_API_KEY);
    const platformBaseUrl = normalizeOptionalString(process.env.INFOBIP_BASE_URL);
    const platformSenderId = normalizeOptionalString(process.env.INFOBIP_SMS_SENDER_ID);
    const platformVoiceBridgeEndpoint = normalizeOptionalString(process.env.INFOBIP_VOICE_BRIDGE_ENDPOINT);
    const platformOwnerPhone = normalizeOptionalString(process.env.INFOBIP_OWNER_PHONE);

    const hasPlatformCredentials = Boolean(platformApiKey && platformBaseUrl && platformSenderId);
    const platformAllowedByPolicy =
      credentialPolicy === "byok_or_platform_fallback" &&
      allowPlatformFallback &&
      billingSource !== "private";

    if (enabled && hasPlatformCredentials && platformAllowedByPolicy) {
      return {
        success: true,
        source: "platform_env",
        billingSource: "platform",
        credentialPolicy,
        infobipApiKey: platformApiKey,
        infobipBaseUrl: platformBaseUrl,
        infobipSmsSenderId: platformSenderId,
        infobipVoiceBridgeEndpoint:
          orgVoiceBridgeEndpoint || platformVoiceBridgeEndpoint || undefined,
        infobipOwnerPhone: orgOwnerPhone || platformOwnerPhone || undefined,
      } as const;
    }

    return {
      success: false,
      enabled,
      billingSource,
      credentialPolicy,
      reason: !enabled
        ? "integration_disabled"
        : billingSource === "private"
          ? "private_billing_no_platform_fallback"
          : hasOrgByok
            ? "byok_selected_but_not_resolved"
            : "credentials_not_available",
    } as const;
  },
});

/**
 * Trigger owner-first three-way call orchestration via Infobip Voice bridge endpoint.
 *
 * This expects voice-specific config to be present in infobip_settings.customProperties:
 * - infobipVoiceBridgeEndpoint (full URL to Infobip voice workflow endpoint)
 * - infobipOwnerPhone (default owner phone fallback)
 *
 * The endpoint receives a normalized payload and is responsible for:
 * 1) calling owner first
 * 2) calling lead second
 * 3) bridging both into a live conversation
 */
export const startFounderThreeWayCall = internalAction({
  args: {
    organizationId: v.id("organizations"),
    leadPhone: v.string(),
    leadName: v.optional(v.string()),
    ownerPhone: v.optional(v.string()),
    founderName: v.optional(v.string()),
    notes: v.optional(v.string()),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const runtimeConfig = await (ctx as any).runQuery(
      generatedApi.internal.integrations.infobip.resolveInfobipRuntimeConfigInternal,
      { organizationId: args.organizationId }
    );

    if (!runtimeConfig?.success) {
      return {
        success: false,
        skipped: true,
        reason: runtimeConfig?.reason || "infobip_not_configured",
      } as const;
    }

    const infobipApiKey = String(runtimeConfig.infobipApiKey || "").trim();
    const bridgeEndpoint = String(runtimeConfig.infobipVoiceBridgeEndpoint || "").trim();
    const configuredOwnerPhone = String(runtimeConfig.infobipOwnerPhone || "").trim();
    const resolvedOwnerPhone = (args.ownerPhone || configuredOwnerPhone || "").trim();

    if (!infobipApiKey || !bridgeEndpoint) {
      return {
        success: false,
        skipped: true,
        reason: "infobip_voice_bridge_not_configured",
        message:
          "Configure infobipVoiceBridgeEndpoint and infobipApiKey in infobip_settings before triggering founder bridge calls.",
      } as const;
    }

    if (!resolvedOwnerPhone) {
      return {
        success: false,
        skipped: true,
        reason: "owner_phone_missing",
        message:
          "No owner phone configured. Provide ownerPhone in the call request or set infobipOwnerPhone in infobip settings.",
      } as const;
    }

    const payload = {
      mode: "owner_first_three_way_bridge",
      lead: {
        phone: args.leadPhone,
        name: args.leadName || "Lead",
      },
      owner: {
        phone: resolvedOwnerPhone,
        name: args.founderName || "Remington",
      },
      notes: args.notes || "",
      context: args.context || {},
      requestedAt: new Date().toISOString(),
      organizationId: String(args.organizationId),
    };

    try {
      const response = await fetch(bridgeEndpoint, {
        method: "POST",
        headers: {
          Authorization: `App ${infobipApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawBody = await response.text();
      const parsedBody = (() => {
        try {
          return JSON.parse(rawBody);
        } catch {
          return null;
        }
      })();

      if (!response.ok) {
        return {
          success: false,
          error: `Infobip voice bridge request failed (${response.status})`,
          details: rawBody.slice(0, 500),
        } as const;
      }

      return {
        success: true,
        provider: "infobip",
        bridgeEndpoint,
        requestAccepted: true,
        callId:
          (parsedBody && (parsedBody.callId as string | undefined))
          || (parsedBody && (parsedBody.id as string | undefined))
          || undefined,
        conferenceId:
          (parsedBody && (parsedBody.conferenceId as string | undefined))
          || undefined,
        response: parsedBody || rawBody.slice(0, 500),
      } as const;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as const;
    }
  },
});
