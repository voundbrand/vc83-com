/**
 * TWILIO INTEGRATION
 *
 * Supports organization-managed BYOK credentials plus explicit super-admin
 * platform credential grants. Phone inventory and runtime probes are provider-
 * backed so operators can prepare live telephony honestly before a demo.
 */

import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "../rbacHelpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const INTEGRATION_ACCESS_POLICY_OBJECT_TYPE = "integration_access_policy";
const INTEGRATION_ACCESS_POLICY_OBJECT_NAME =
  "Organization Integration Access Policy";
const INTEGRATION_ACCESS_POLICY_CONTRACT_VERSION =
  "org_integration_access_v1";
const TWILIO_ACCOUNT_BASE_URL = "https://api.twilio.com/2010-04-01";

type StoredTwilioSettings = {
  accountSid?: string;
  authToken?: string;
  accountSidLast4?: string;
  credentialSource?: string;
  encryptedFields: string[];
  verifyServiceSid?: string;
  smsPhoneNumber?: string;
  enabled: boolean;
};

type TwilioRuntimeBinding = {
  accountSid: string | null;
  authToken: string | null;
  accountSidLast4: string | null;
  verifyServiceSid: string | null;
  smsPhoneNumber: string | null;
  enabled: boolean;
  usePlatformCredentials: boolean;
  hasOrgCredentials: boolean;
  hasPlatformCredentials: boolean;
  source: "org" | "platform" | null;
};

type TwilioIncomingPhoneNumber = {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  voiceEnabled: boolean;
  smsEnabled: boolean;
  mmsEnabled: boolean;
  voiceUrl: string | null;
  smsUrl: string | null;
  statusCallback: string | null;
  trunkSid: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return normalizeString(value) ?? undefined;
}

function toStoredString(value: unknown): string {
  return normalizeString(value) ?? "";
}

function normalizeAccountSidLast4(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const collapsed = normalized.replace(/^\.\.\./, "");
  return collapsed.length > 4 ? collapsed.slice(-4) : collapsed;
}

function formatAccountSidLast4(value: string | null): string | undefined {
  return value ? `...${value}` : undefined;
}

function canonicalizePhoneNumber(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return normalized.replace(/[^\d+]/g, "");
}

function hasStoredTwilioCredentials(settings: StoredTwilioSettings | null): boolean {
  return Boolean(settings?.accountSid && settings?.authToken);
}

function getPlatformTwilioCredentials(): {
  accountSid: string | null;
  authToken: string | null;
  accountSidLast4: string | null;
  verifyServiceSid: string | null;
} {
  const accountSid = normalizeString(process.env.TWILIO_ACCOUNT_SID);
  const authToken = normalizeString(process.env.TWILIO_AUTH_TOKEN);
  const verifyServiceSid = normalizeString(process.env.TWILIO_VERIFY_SERVICE_SID);

  return {
    accountSid,
    authToken,
    accountSidLast4: accountSid ? accountSid.slice(-4) : null,
    verifyServiceSid,
  };
}

function normalizeStoredTwilioSettings(
  value: unknown,
): StoredTwilioSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const typed = value as Record<string, unknown>;
  return {
    accountSid: normalizeOptionalString(typed.accountSid),
    authToken: normalizeOptionalString(typed.authToken),
    accountSidLast4: normalizeAccountSidLast4(typed.accountSidLast4) ?? undefined,
    credentialSource: normalizeOptionalString(typed.credentialSource),
    encryptedFields: Array.isArray(typed.encryptedFields)
      ? typed.encryptedFields.filter(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
        )
      : [],
    verifyServiceSid: normalizeOptionalString(typed.verifyServiceSid),
    smsPhoneNumber: normalizeOptionalString(typed.smsPhoneNumber),
    enabled: typed.enabled !== false,
  };
}

async function getIntegrationAccessPolicyDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<{
  _id: Id<"objects">;
  customProperties?: Record<string, unknown>;
} | null> {
  return (await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q
        .eq("organizationId", organizationId)
        .eq("type", INTEGRATION_ACCESS_POLICY_OBJECT_TYPE),
    )
    .first()) as {
    _id: Id<"objects">;
    customProperties?: Record<string, unknown>;
  } | null;
}

function readTwilioPlatformAccessGrant(
  customProperties: Record<string, unknown> | undefined,
): boolean {
  const value = customProperties?.twilio;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return (value as Record<string, unknown>).usePlatformCredentials === true;
}

async function getTwilioPlatformAccessGrant(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<{
  policyObjectId: Id<"objects"> | null;
  usePlatformCredentials: boolean;
}> {
  const policyDoc = await getIntegrationAccessPolicyDoc(db, organizationId);
  return {
    policyObjectId: policyDoc?._id ?? null,
    usePlatformCredentials: readTwilioPlatformAccessGrant(
      policyDoc?.customProperties,
    ),
  };
}

async function getTwilioSettingsDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
) {
  return await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "twilio_settings"),
    )
    .first();
}

function resolveTwilioEnabled(
  settings: StoredTwilioSettings | null,
  usePlatformCredentials: boolean,
): boolean {
  if (settings) {
    return settings.enabled;
  }
  return usePlatformCredentials;
}

async function resolveOrganizationTwilioState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<{
  settingsDocId: Id<"objects"> | null;
  settings: StoredTwilioSettings | null;
  usePlatformCredentials: boolean;
  enabled: boolean;
  hasOrgCredentials: boolean;
  hasPlatformCredentials: boolean;
  hasEffectiveCredentials: boolean;
  runtimeSource: "org" | "platform" | null;
  accountSidLast4: string | null;
  verifyServiceSid: string | null;
  smsPhoneNumber: string | null;
}> {
  const settingsDoc = await getTwilioSettingsDoc(db, organizationId);
  const settings = normalizeStoredTwilioSettings(settingsDoc?.customProperties);
  const platformGrant = await getTwilioPlatformAccessGrant(db, organizationId);
  const platform = getPlatformTwilioCredentials();
  const enabled = resolveTwilioEnabled(settings, platformGrant.usePlatformCredentials);
  const hasOrgCredentials = hasStoredTwilioCredentials(settings);
  const hasPlatformCredentials = Boolean(
    platform.accountSid && platform.authToken,
  );

  const runtimeSource =
    enabled && platformGrant.usePlatformCredentials
      ? hasPlatformCredentials
        ? "platform"
        : null
      : enabled && hasOrgCredentials
        ? "org"
        : null;

  return {
    settingsDocId: settingsDoc?._id ?? null,
    settings,
    usePlatformCredentials: platformGrant.usePlatformCredentials,
    enabled,
    hasOrgCredentials,
    hasPlatformCredentials,
    hasEffectiveCredentials: runtimeSource !== null,
    runtimeSource,
    accountSidLast4:
      runtimeSource === "platform"
        ? platform.accountSidLast4
        : settings?.accountSidLast4 ?? null,
    verifyServiceSid:
      runtimeSource === "platform"
        ? settings?.verifyServiceSid ?? platform.verifyServiceSid
        : settings?.verifyServiceSid ?? null,
    smsPhoneNumber: settings?.smsPhoneNumber ?? null,
  };
}

async function isUserSuperAdminByUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  userId: Id<"users">,
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user?.global_role_id) {
    return false;
  }
  const role = await ctx.db.get(user.global_role_id);
  return Boolean(role && role.name === "super_admin");
}

async function authorizeTwilioOrganizationAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: string,
  organizationId: Id<"organizations">,
  requireSuperAdmin = false,
): Promise<{
  authenticated: {
    userId: Id<"users">;
    organizationId: Id<"organizations">;
  };
  isSuperAdmin: boolean;
}> {
  const authenticated = await requireAuthenticatedUser(ctx, sessionId);
  const userContext = await getUserContext(
    ctx,
    authenticated.userId,
    organizationId,
  );
  const isSuperAdmin =
    userContext.isGlobal && userContext.roleName === "super_admin";

  if (requireSuperAdmin && !isSuperAdmin) {
    throw new Error(
      "Permission denied: super_admin required to manage organization Twilio access.",
    );
  }

  if (authenticated.organizationId !== organizationId && !isSuperAdmin) {
    throw new Error("Organization mismatch while accessing Twilio settings.");
  }

  return {
    authenticated: {
      userId: authenticated.userId,
      organizationId: authenticated.organizationId,
    },
    isSuperAdmin,
  };
}

async function syncTwilioSmsBindings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
  enabled: boolean,
) {
  const bindings = await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "channel_provider_binding"),
    )
    .collect();

  for (const binding of bindings) {
    if (
      (binding.customProperties as Record<string, unknown> | undefined)
        ?.providerId === "twilio"
    ) {
      await db.delete(binding._id);
    }
  }

  if (!enabled) {
    return;
  }

  await db.insert("objects", {
    type: "channel_provider_binding",
    name: "sms via Twilio",
    organizationId,
    status: "active",
    customProperties: {
      channel: "sms",
      providerId: "twilio",
      priority: 1,
      enabled: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

async function upsertTwilioSettingsDocument(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    enabled: boolean;
    verifyServiceSid?: string;
    smsPhoneNumber?: string;
    accountSid?: string;
    authToken?: string;
    accountSidLast4?: string;
    createWhenMissing?: boolean;
  },
): Promise<{
  settingsId: Id<"objects"> | null;
  existingAction: "create" | "update" | "noop";
}> {
  const existing = await getTwilioSettingsDoc(ctx.db, args.organizationId);
  const existingSettings = normalizeStoredTwilioSettings(existing?.customProperties);
  const nextProperties: Record<string, unknown> = {
    ...(existing?.customProperties || {}),
    enabled: args.enabled,
    verifyServiceSid: toStoredString(args.verifyServiceSid),
    smsPhoneNumber: toStoredString(args.smsPhoneNumber),
  };

  if (args.accountSid && args.authToken) {
    nextProperties.accountSid = args.accountSid;
    nextProperties.authToken = args.authToken;
    nextProperties.accountSidLast4 = normalizeAccountSidLast4(args.accountSidLast4) ?? "";
    nextProperties.credentialSource = "object_settings";
    nextProperties.encryptedFields = ["accountSid", "authToken"];
  } else if (existingSettings) {
    nextProperties.accountSidLast4 =
      existingSettings.accountSidLast4 ?? toStoredString(nextProperties.accountSidLast4);
    nextProperties.credentialSource =
      existingSettings.credentialSource ?? "object_settings";
    nextProperties.encryptedFields = existingSettings.encryptedFields;
  }

  if (existing?._id) {
    await ctx.db.patch(existing._id, {
      customProperties: nextProperties,
      updatedAt: Date.now(),
    });
    return {
      settingsId: existing._id,
      existingAction: "update",
    };
  }

  if (!args.createWhenMissing) {
    return {
      settingsId: null,
      existingAction: "noop",
    };
  }

  const settingsId = await ctx.db.insert("objects", {
    type: "twilio_settings",
    name: "Twilio Settings",
    organizationId: args.organizationId,
    status: "active",
    customProperties: nextProperties,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return {
    settingsId,
    existingAction: "create",
  };
}

function buildTwilioBasicAuthHeader(accountSid: string, authToken: string): string {
  return `Basic ${btoa(`${accountSid}:${authToken}`)}`;
}

function buildTwilioApiUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const url = new URL(
    `${TWILIO_ACCOUNT_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
  );
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function fetchTwilioJson(args: {
  accountSid: string;
  authToken: string;
  path: string;
  params?: Record<string, string | number | undefined>;
}): Promise<Record<string, unknown>> {
  const response = await fetch(
    buildTwilioApiUrl(args.path, args.params),
    {
      headers: {
        Authorization: buildTwilioBasicAuthHeader(
          args.accountSid,
          args.authToken,
        ),
      },
    },
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `Twilio HTTP ${response.status}: ${bodyText.trim().slice(0, 240) || "request failed"}`,
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

async function fetchTwilioForm(args: {
  accountSid: string;
  authToken: string;
  path: string;
  body: Record<string, string | number | undefined>;
}): Promise<Record<string, unknown>> {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(args.body)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    form.set(key, String(value));
  }

  const response = await fetch(buildTwilioApiUrl(args.path), {
    method: "POST",
    headers: {
      Authorization: buildTwilioBasicAuthHeader(args.accountSid, args.authToken),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `Twilio HTTP ${response.status}: ${bodyText.trim().slice(0, 240) || "request failed"}`,
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

function normalizeIncomingPhoneNumber(
  value: unknown,
): TwilioIncomingPhoneNumber | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const typed = value as Record<string, unknown>;
  const capabilities =
    typed.capabilities && typeof typed.capabilities === "object"
      ? (typed.capabilities as Record<string, unknown>)
      : {};
  const phoneNumber = normalizeString(typed.phone_number);
  const sid = normalizeString(typed.sid);

  if (!phoneNumber || !sid) {
    return null;
  }

  return {
    sid,
    phoneNumber,
    friendlyName:
      normalizeString(typed.friendly_name) ??
      normalizeString(typed.beta) ??
      phoneNumber,
    voiceEnabled:
      capabilities.voice === true ||
      capabilities.Voice === true,
    smsEnabled:
      capabilities.sms === true ||
      capabilities.SMS === true,
    mmsEnabled:
      capabilities.mms === true ||
      capabilities.MMS === true,
    voiceUrl: normalizeString(typed.voice_url),
    smsUrl: normalizeString(typed.sms_url),
    statusCallback: normalizeString(typed.status_callback),
    trunkSid: normalizeString(typed.trunk_sid),
  };
}

function summarizeRuntimeBlockedReason(
  runtime: Pick<
    TwilioRuntimeBinding,
    "enabled" | "usePlatformCredentials" | "accountSid" | "authToken"
  >,
): string {
  if (!runtime.enabled) {
    return "Twilio runtime is disabled for this organization.";
  }
  if (runtime.usePlatformCredentials) {
    return "Platform Twilio credentials are not configured.";
  }
  return "Twilio credentials are not configured for this organization.";
}

function resolveWebhookBaseUrl(): string {
  const candidates = [
    process.env.CONVEX_SITE_URL,
    process.env.NEXT_PUBLIC_API_ENDPOINT_URL,
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);
    if (normalized) {
      return normalized;
    }
  }

  throw new Error(
    "Missing webhook base URL env var. Set CONVEX_SITE_URL (preferred) or NEXT_PUBLIC_API_ENDPOINT_URL.",
  );
}

type OrganizationTelephonyBindingState = {
  directSettingsId: Id<"objects"> | null;
  providerKey: "elevenlabs" | "twilio_voice" | "custom_sip";
  providerIdentity: string | null;
  enabled: boolean;
  routeKey: string | null;
  fromNumber: string | null;
  webhookSecret: string | null;
  incomingNumberSid: string | null;
  directProps: Record<string, unknown>;
};

type TwilioVoiceBindingAuditArgs = {
  organizationId: Id<"organizations">;
  directSettingsId: Id<"objects">;
  directProps: Record<string, unknown>;
  userId: Id<"users">;
  phoneNumberSid: string;
  phoneNumber: string;
  inboundWebhookUrl: string;
  statusCallbackUrl: string;
  runtimeSource: "platform" | "org" | null;
  appliedAt: number;
};

async function getOrganizationDirectSettingsDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
) {
  return await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "direct_settings"),
    )
    .first();
}

async function getOrganizationPhoneBindingDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
) {
  const bindings = await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "channel_provider_binding"),
    )
    .collect();

  return (
    bindings.find((binding: { customProperties?: Record<string, unknown> }) =>
      binding.customProperties?.channel === "phone_call",
    ) ?? null
  );
}

async function resolveOrganizationTelephonyBindingState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<OrganizationTelephonyBindingState> {
  const directSettings = await getOrganizationDirectSettingsDoc(db, organizationId);
  const phoneBinding = await getOrganizationPhoneBindingDoc(db, organizationId);
  const directProps = (directSettings?.customProperties || {}) as Record<string, unknown>;
  const bindingProps = (phoneBinding?.customProperties || {}) as Record<string, unknown>;

  const providerKey = normalizeString(directProps.providerKey);
  return {
    directSettingsId: directSettings?._id ?? null,
    providerKey:
      providerKey === "twilio_voice" || providerKey === "custom_sip"
        ? providerKey
        : "elevenlabs",
    providerIdentity:
      normalizeString(bindingProps.telephonyProviderIdentity) ||
      normalizeString(directProps.telephonyProviderIdentity),
    enabled: bindingProps.enabled === true,
    routeKey:
      normalizeString(bindingProps.routeKey) ||
      normalizeString(bindingProps.bindingRouteKey) ||
      normalizeString(directProps.routeKey) ||
      normalizeString(directProps.bindingRouteKey),
    fromNumber:
      normalizeString(directProps.twilioVoiceFromNumber) ||
      normalizeString(directProps.directCallFromNumber) ||
      normalizeString(directProps.elevenTelephonyFromNumber),
    webhookSecret:
      normalizeString(directProps.twilioVoiceWebhookSecret) ||
      normalizeString(directProps.directCallWebhookSecret) ||
      normalizeString(directProps.elevenTelephonyWebhookSecret),
    incomingNumberSid: normalizeString(directProps.twilioVoiceIncomingNumberSid),
    directProps,
  };
}

function buildTwilioVoiceWebhookUrls(args: {
  routeKey: string;
  webhookSecret: string;
}): {
  inboundWebhookUrl: string;
  statusCallbackUrl: string;
} {
  const baseUrl = resolveWebhookBaseUrl();
  const inboundWebhookUrl = new URL(
    "/webhooks/twilio/voice/inbound",
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
  inboundWebhookUrl.searchParams.set("routeKey", args.routeKey);
  inboundWebhookUrl.searchParams.set("secret", args.webhookSecret);

  const statusCallbackUrl = new URL(
    "/webhooks/twilio/voice/status",
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
  statusCallbackUrl.searchParams.set("routeKey", args.routeKey);
  statusCallbackUrl.searchParams.set("secret", args.webhookSecret);

  return {
    inboundWebhookUrl: inboundWebhookUrl.toString(),
    statusCallbackUrl: statusCallbackUrl.toString(),
  };
}

async function resolveTwilioIncomingPhoneNumberRecord(args: {
  accountSid: string;
  authToken: string;
  phoneNumberSid?: string | null;
  phoneNumber?: string | null;
}): Promise<TwilioIncomingPhoneNumber | null> {
  const normalizedPhoneNumber = canonicalizePhoneNumber(args.phoneNumber);
  if (args.phoneNumberSid) {
    return normalizeIncomingPhoneNumber(
      await fetchTwilioJson({
        accountSid: args.accountSid,
        authToken: args.authToken,
        path: `/Accounts/${args.accountSid}/IncomingPhoneNumbers/${args.phoneNumberSid}.json`,
      }),
    );
  }

  if (!normalizedPhoneNumber) {
    return null;
  }

  const data = await fetchTwilioJson({
    accountSid: args.accountSid,
    authToken: args.authToken,
    path: `/Accounts/${args.accountSid}/IncomingPhoneNumbers.json`,
    params: {
      PageSize: 50,
      PhoneNumber: normalizedPhoneNumber,
    },
  });

  const rawNumbers = Array.isArray(data.incoming_phone_numbers)
    ? data.incoming_phone_numbers
    : [];

  return (
    rawNumbers
      .map((entry) => normalizeIncomingPhoneNumber(entry))
      .filter((entry): entry is TwilioIncomingPhoneNumber => Boolean(entry))
      .find(
        (entry) =>
          canonicalizePhoneNumber(entry.phoneNumber) === normalizedPhoneNumber,
      ) ?? null
  );
}

// ============================================================================
// QUERIES
// ============================================================================

export const getTwilioSettings = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    const resolved = await resolveOrganizationTwilioState(
      ctx.db,
      authenticated.organizationId,
    );

    return {
      configured: resolved.hasEffectiveCredentials,
      enabled: resolved.enabled,
      accountSidLast4: formatAccountSidLast4(resolved.accountSidLast4),
      verifyServiceSid: resolved.verifyServiceSid ?? undefined,
      smsPhoneNumber: resolved.smsPhoneNumber ?? undefined,
      runtimeSource: resolved.runtimeSource,
      platformAccessGranted: resolved.usePlatformCredentials,
      hasOrgCredentials: resolved.hasOrgCredentials,
      hasPlatformCredentials: resolved.hasPlatformCredentials,
      hasEffectiveCredentials: resolved.hasEffectiveCredentials,
    };
  },
});

export const getSettingsInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settingsDoc = await getTwilioSettingsDoc(ctx.db, args.organizationId);
    if (!settingsDoc) {
      return null;
    }
    return settingsDoc.customProperties as Record<string, unknown>;
  },
});

export const getOrganizationTwilioStoredStateInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settingsDoc = await getTwilioSettingsDoc(ctx.db, args.organizationId);
    const grant = await getTwilioPlatformAccessGrant(ctx.db, args.organizationId);
    return {
      settings: (settingsDoc?.customProperties || null) as Record<string, unknown> | null,
      usePlatformCredentials: grant.usePlatformCredentials,
    };
  },
});

export const getOrganizationTwilioActionAccessContext = internalQuery({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { authenticated, isSuperAdmin } =
      await authorizeTwilioOrganizationAccess(
        ctx,
        args.sessionId,
        args.organizationId,
      );
    return {
      userId: authenticated.userId,
      organizationId: args.organizationId,
      isSuperAdmin,
    };
  },
});

export const getOrganizationTelephonyBindingStateInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) =>
    resolveOrganizationTelephonyBindingState(ctx.db, args.organizationId),
});

export const recordTwilioVoiceNumberBindingAppliedInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    directSettingsId: v.id("objects"),
    directProps: v.any(),
    userId: v.id("users"),
    phoneNumberSid: v.string(),
    phoneNumber: v.string(),
    inboundWebhookUrl: v.string(),
    statusCallbackUrl: v.string(),
    runtimeSource: v.union(v.literal("platform"), v.literal("org"), v.null()),
    appliedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.directSettingsId, {
      customProperties: {
        ...(args.directProps as Record<string, unknown>),
        providerKey: "twilio_voice",
        telephonyProviderIdentity: "twilio_voice",
        twilioVoiceFromNumber: args.phoneNumber,
        directCallFromNumber: args.phoneNumber,
        elevenTelephonyFromNumber: args.phoneNumber,
        twilioVoiceIncomingNumberSid: args.phoneNumberSid,
        twilioVoiceInboundWebhookUrl: args.inboundWebhookUrl,
        twilioVoiceStatusCallbackUrl: args.statusCallbackUrl,
        twilioVoiceWebhookAppliedAt: args.appliedAt,
      },
      updatedAt: args.appliedAt,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.directSettingsId,
      actionType: "twilio_voice_number_binding_applied",
      actionData: {
        phoneNumberSid: args.phoneNumberSid,
        phoneNumber: args.phoneNumber,
        inboundWebhookUrl: args.inboundWebhookUrl,
        statusCallbackUrl: args.statusCallbackUrl,
        runtimeSource: args.runtimeSource,
      },
      performedBy: args.userId,
      performedAt: args.appliedAt,
    });
  },
});

export const getOrganizationTwilioAdminState = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await authorizeTwilioOrganizationAccess(
      ctx,
      args.sessionId,
      args.organizationId,
      true,
    );

    const resolved = await resolveOrganizationTwilioState(
      ctx.db,
      args.organizationId,
    );

    return {
      enabled: resolved.enabled,
      usePlatformCredentials: resolved.usePlatformCredentials,
      hasOrgCredentials: resolved.hasOrgCredentials,
      hasPlatformCredentials: resolved.hasPlatformCredentials,
      hasEffectiveCredentials: resolved.hasEffectiveCredentials,
      runtimeSource: resolved.runtimeSource,
      accountSidLast4: formatAccountSidLast4(resolved.accountSidLast4),
      verifyServiceSid: resolved.verifyServiceSid ?? null,
      smsPhoneNumber: resolved.smsPhoneNumber ?? null,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const saveTwilioSettings = mutation({
  args: {
    sessionId: v.string(),
    accountSid: v.string(),
    authToken: v.string(),
    verifyServiceSid: v.optional(v.string()),
    smsPhoneNumber: v.optional(v.string()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);

    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: authenticated.organizationId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    const normalizedSid = normalizeString(args.accountSid);
    const normalizedToken = normalizeString(args.authToken);
    if (!normalizedSid || !normalizedToken) {
      throw new Error("Account SID and Auth Token are required");
    }

    const encryptedSid = (await (ctx as any).runAction(
      generatedApi.internal.oauth.encryption.encryptToken,
      { plaintext: normalizedSid },
    )) as string;
    const encryptedToken = (await (ctx as any).runAction(
      generatedApi.internal.oauth.encryption.encryptToken,
      { plaintext: normalizedToken },
    )) as string;

    const { settingsId, existingAction } = await upsertTwilioSettingsDocument(ctx, {
      organizationId: authenticated.organizationId,
      enabled: args.enabled,
      verifyServiceSid: args.verifyServiceSid,
      smsPhoneNumber: args.smsPhoneNumber,
      accountSid: encryptedSid,
      authToken: encryptedToken,
      accountSidLast4: normalizedSid.slice(-4),
      createWhenMissing: true,
    });

    await syncTwilioSmsBindings(
      ctx.db,
      authenticated.organizationId,
      args.enabled,
    );

    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: authenticated.userId,
      organizationId: authenticated.organizationId,
      action: existingAction === "create" ? "create" : "update",
      resource: "twilio_settings",
      success: true,
      metadata: {
        enabled: args.enabled,
        hasVerifyService: Boolean(normalizeString(args.verifyServiceSid)),
        hasSmsPhoneNumber: Boolean(normalizeString(args.smsPhoneNumber)),
      },
    });

    return { success: true, settingsId };
  },
});

export const saveOrganizationTwilioAdminState = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
    usePlatformCredentials: v.boolean(),
    verifyServiceSid: v.optional(v.string()),
    smsPhoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { authenticated } = await authorizeTwilioOrganizationAccess(
      ctx,
      args.sessionId,
      args.organizationId,
      true,
    );

    const now = Date.now();
    const existingSettings = normalizeStoredTwilioSettings(
      (await getTwilioSettingsDoc(ctx.db, args.organizationId))?.customProperties,
    );
    const createWhenMissing =
      Boolean(existingSettings) ||
      args.enabled ||
      args.usePlatformCredentials ||
      Boolean(normalizeString(args.verifyServiceSid)) ||
      Boolean(normalizeString(args.smsPhoneNumber));

    const { settingsId } = await upsertTwilioSettingsDocument(ctx, {
      organizationId: args.organizationId,
      enabled: args.enabled,
      verifyServiceSid: args.verifyServiceSid,
      smsPhoneNumber: args.smsPhoneNumber,
      createWhenMissing,
    });

    const policyState = await getTwilioPlatformAccessGrant(
      ctx.db,
      args.organizationId,
    );
    let policyObjectId = policyState.policyObjectId;
    if (policyObjectId) {
      const policyDoc = await ctx.db.get(policyObjectId);
      await ctx.db.patch(policyObjectId, {
        customProperties: {
          ...(typeof policyDoc?.customProperties === "object" &&
          policyDoc?.customProperties !== null
            ? policyDoc.customProperties
            : {}),
          contractVersion: INTEGRATION_ACCESS_POLICY_CONTRACT_VERSION,
          twilio: {
            usePlatformCredentials: args.usePlatformCredentials,
            updatedAt: now,
            updatedByUserId: authenticated.userId,
          },
        },
        updatedAt: now,
      });
    } else if (args.usePlatformCredentials) {
      policyObjectId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: INTEGRATION_ACCESS_POLICY_OBJECT_TYPE,
        name: INTEGRATION_ACCESS_POLICY_OBJECT_NAME,
        status: "active",
        customProperties: {
          contractVersion: INTEGRATION_ACCESS_POLICY_CONTRACT_VERSION,
          twilio: {
            usePlatformCredentials: true,
            updatedAt: now,
            updatedByUserId: authenticated.userId,
          },
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    await syncTwilioSmsBindings(
      ctx.db,
      args.organizationId,
      args.enabled,
    );

    const actionObjectId = policyObjectId ?? settingsId;
    if (actionObjectId) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: actionObjectId,
        actionType: "integration_access_policy_saved",
        actionData: {
          providerId: "twilio",
          usePlatformCredentials: args.usePlatformCredentials,
          enabled: args.enabled,
          hasOrgCredentials: hasStoredTwilioCredentials(existingSettings),
          hasVerifyServiceSid: Boolean(normalizeString(args.verifyServiceSid)),
          hasSmsPhoneNumber: Boolean(normalizeString(args.smsPhoneNumber)),
        },
        performedBy: authenticated.userId,
        performedAt: now,
      });
    }

    const resolved = await resolveOrganizationTwilioState(
      ctx.db,
      args.organizationId,
    );

    return {
      success: true,
      enabled: resolved.enabled,
      usePlatformCredentials: resolved.usePlatformCredentials,
      hasOrgCredentials: resolved.hasOrgCredentials,
      hasPlatformCredentials: resolved.hasPlatformCredentials,
      hasEffectiveCredentials: resolved.hasEffectiveCredentials,
      runtimeSource: resolved.runtimeSource,
      accountSidLast4: formatAccountSidLast4(resolved.accountSidLast4),
      verifyServiceSid: resolved.verifyServiceSid,
      smsPhoneNumber: resolved.smsPhoneNumber,
    };
  },
});

export const disconnectTwilio = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);

    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: authenticated.organizationId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    const settings = await getTwilioSettingsDoc(ctx.db, authenticated.organizationId);
    if (settings?._id) {
      await ctx.db.delete(settings._id);
    }

    await syncTwilioSmsBindings(ctx.db, authenticated.organizationId, false);

    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: authenticated.userId,
      organizationId: authenticated.organizationId,
      action: "delete",
      resource: "twilio_settings",
      success: true,
    });

    return { success: true };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const testTwilioConnection = action({
  args: {
    accountSid: v.string(),
    authToken: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const normalizedSid = normalizeString(args.accountSid);
      const normalizedToken = normalizeString(args.authToken);
      if (!normalizedSid || !normalizedToken) {
        return {
          success: false,
          error: "Account SID and Auth Token are required.",
        };
      }

      const data = await fetchTwilioJson({
        accountSid: normalizedSid,
        authToken: normalizedToken,
        path: `/Accounts/${normalizedSid}.json`,
      });

      return {
        success: true,
        accountName: normalizeString(data.friendly_name) ?? normalizedSid,
        accountStatus: normalizeString(data.status) ?? "unknown",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const getOrganizationTwilioRuntimeBinding = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<TwilioRuntimeBinding> => {
    const stored = (await ctx.runQuery(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioStoredStateInternal,
      {
        organizationId: args.organizationId,
      },
    )) as {
      settings: Record<string, unknown> | null;
      usePlatformCredentials: boolean;
    };

    const settings = normalizeStoredTwilioSettings(stored?.settings);
    const platform = getPlatformTwilioCredentials();
    const enabled = resolveTwilioEnabled(settings, stored.usePlatformCredentials);
    const hasOrgCredentials = hasStoredTwilioCredentials(settings);
    const hasPlatformCredentials = Boolean(
      platform.accountSid && platform.authToken,
    );

    if (stored.usePlatformCredentials) {
      return {
        accountSid: enabled ? platform.accountSid : null,
        authToken: enabled ? platform.authToken : null,
        accountSidLast4: platform.accountSidLast4,
        verifyServiceSid:
          enabled && hasPlatformCredentials
            ? settings?.verifyServiceSid ?? platform.verifyServiceSid
            : settings?.verifyServiceSid ?? null,
        smsPhoneNumber: settings?.smsPhoneNumber ?? null,
        enabled,
        usePlatformCredentials: true,
        hasOrgCredentials,
        hasPlatformCredentials,
        source: enabled && hasPlatformCredentials ? "platform" : null,
      };
    }

    if (!enabled || !hasOrgCredentials || !settings?.accountSid || !settings.authToken) {
      return {
        accountSid: null,
        authToken: null,
        accountSidLast4: settings?.accountSidLast4 ?? null,
        verifyServiceSid: settings?.verifyServiceSid ?? null,
        smsPhoneNumber: settings?.smsPhoneNumber ?? null,
        enabled,
        usePlatformCredentials: false,
        hasOrgCredentials,
        hasPlatformCredentials,
        source: null,
      };
    }

    const shouldDecrypt = settings.encryptedFields.includes("accountSid");
    const accountSid = shouldDecrypt
      ? ((await ctx.runAction(
          generatedApi.internal.oauth.encryption.decryptToken,
          { encrypted: settings.accountSid },
        )) as string)
      : settings.accountSid;
    const authToken = shouldDecrypt
      ? ((await ctx.runAction(
          generatedApi.internal.oauth.encryption.decryptToken,
          { encrypted: settings.authToken },
        )) as string)
      : settings.authToken;

    return {
      accountSid,
      authToken,
      accountSidLast4:
        settings.accountSidLast4 ?? accountSid.slice(-4),
      verifyServiceSid: settings.verifyServiceSid ?? null,
      smsPhoneNumber: settings.smsPhoneNumber ?? null,
      enabled,
      usePlatformCredentials: false,
      hasOrgCredentials,
      hasPlatformCredentials,
      source: "org",
    };
  },
});

export const resolveCredentials = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.runAction(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioRuntimeBinding,
      { organizationId: args.organizationId },
    );
  },
});

export const probeOrganizationTwilioRuntime = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioActionAccessContext,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      },
    );

    const runtime = (await ctx.runAction(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioRuntimeBinding,
      { organizationId: args.organizationId },
    )) as TwilioRuntimeBinding;

    if (!runtime.enabled || !runtime.accountSid || !runtime.authToken) {
      return {
        success: false,
        source: runtime.source,
        reason: summarizeRuntimeBlockedReason(runtime),
        checkedAt: Date.now(),
      };
    }

    try {
      const data = await fetchTwilioJson({
        accountSid: runtime.accountSid,
        authToken: runtime.authToken,
        path: `/Accounts/${runtime.accountSid}.json`,
      });

      return {
        success: true,
        source: runtime.source,
        accountSidLast4: formatAccountSidLast4(runtime.accountSidLast4),
        accountName: normalizeString(data.friendly_name) ?? runtime.accountSid,
        accountStatus: normalizeString(data.status) ?? "unknown",
        checkedAt: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        source: runtime.source,
        reason: error instanceof Error ? error.message : String(error),
        checkedAt: Date.now(),
      };
    }
  },
});

export const listOrganizationTwilioIncomingPhoneNumbers = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioActionAccessContext,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      },
    );

    const runtime = (await ctx.runAction(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioRuntimeBinding,
      { organizationId: args.organizationId },
    )) as TwilioRuntimeBinding;

    if (!runtime.enabled || !runtime.accountSid || !runtime.authToken) {
      return {
        success: false,
        source: runtime.source,
        reason: summarizeRuntimeBlockedReason(runtime),
        phoneNumbers: [] as TwilioIncomingPhoneNumber[],
        loadedAt: Date.now(),
      };
    }

    const pageSize =
      typeof args.pageSize === "number" && Number.isFinite(args.pageSize)
        ? Math.max(1, Math.min(50, Math.floor(args.pageSize)))
        : 20;

    try {
      const data = await fetchTwilioJson({
        accountSid: runtime.accountSid,
        authToken: runtime.authToken,
        path: `/Accounts/${runtime.accountSid}/IncomingPhoneNumbers.json`,
        params: {
          PageSize: pageSize,
        },
      });

      const rawNumbers = Array.isArray(data.incoming_phone_numbers)
        ? data.incoming_phone_numbers
        : [];
      const phoneNumbers = rawNumbers
        .map((entry) => normalizeIncomingPhoneNumber(entry))
        .filter((entry): entry is TwilioIncomingPhoneNumber => Boolean(entry))
        .sort((left, right) => left.phoneNumber.localeCompare(right.phoneNumber));

      return {
        success: true,
        source: runtime.source,
        accountSidLast4: formatAccountSidLast4(runtime.accountSidLast4),
        phoneNumbers,
        loadedAt: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        source: runtime.source,
        reason: error instanceof Error ? error.message : String(error),
        phoneNumbers: [] as TwilioIncomingPhoneNumber[],
        loadedAt: Date.now(),
      };
    }
  },
});

export const validateOrganizationTwilioPhoneNumber = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioActionAccessContext,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      },
    );

    const runtime = (await ctx.runAction(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioRuntimeBinding,
      { organizationId: args.organizationId },
    )) as TwilioRuntimeBinding;

    const requestedPhoneNumber = canonicalizePhoneNumber(args.phoneNumber);
    if (!requestedPhoneNumber) {
      return {
        success: false,
        valid: false,
        source: runtime.source,
        reason: "A Twilio phone number is required for validation.",
        checkedAt: Date.now(),
      };
    }

    if (!runtime.enabled || !runtime.accountSid || !runtime.authToken) {
      return {
        success: false,
        valid: false,
        source: runtime.source,
        reason: summarizeRuntimeBlockedReason(runtime),
        checkedAt: Date.now(),
      };
    }

    try {
      const data = await fetchTwilioJson({
        accountSid: runtime.accountSid,
        authToken: runtime.authToken,
        path: `/Accounts/${runtime.accountSid}/IncomingPhoneNumbers.json`,
        params: {
          PageSize: 50,
          PhoneNumber: requestedPhoneNumber,
        },
      });

      const rawNumbers = Array.isArray(data.incoming_phone_numbers)
        ? data.incoming_phone_numbers
        : [];
      const match =
        rawNumbers
          .map((entry) => normalizeIncomingPhoneNumber(entry))
          .filter(
            (entry): entry is TwilioIncomingPhoneNumber => Boolean(entry),
          )
          .find(
            (entry) =>
              canonicalizePhoneNumber(entry.phoneNumber) === requestedPhoneNumber,
          ) ?? null;

      return {
        success: true,
        valid: Boolean(match),
        source: runtime.source,
        phoneNumber: requestedPhoneNumber,
        match,
        reason: match
          ? undefined
          : "The phone number was not found in the Twilio incoming number inventory for this runtime.",
        checkedAt: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        source: runtime.source,
        phoneNumber: requestedPhoneNumber,
        reason: error instanceof Error ? error.message : String(error),
        checkedAt: Date.now(),
      };
    }
  },
});

export const applyOrganizationTwilioVoiceNumberBinding = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    phoneNumberSid: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await ctx.runQuery(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioActionAccessContext,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      },
    );

    const runtime = (await ctx.runAction(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioRuntimeBinding,
      { organizationId: args.organizationId },
    )) as TwilioRuntimeBinding;

    if (!runtime.enabled || !runtime.accountSid || !runtime.authToken) {
      return {
        success: false,
        applied: false,
        source: runtime.source,
        reason: summarizeRuntimeBlockedReason(runtime),
        checkedAt: Date.now(),
      };
    }

    const telephonyBinding = (await ctx.runQuery(
      generatedApi.internal.integrations.twilio.getOrganizationTelephonyBindingStateInternal,
      { organizationId: args.organizationId },
    )) as OrganizationTelephonyBindingState;
    if (telephonyBinding.providerKey !== "twilio_voice") {
      return {
        success: false,
        applied: false,
        source: runtime.source,
        reason:
          "Phone-call binding is not set to Twilio Voice. Save the org phone binding with provider `twilio_voice` first.",
        checkedAt: Date.now(),
      };
    }
    if (!telephonyBinding.enabled) {
      return {
        success: false,
        applied: false,
        source: runtime.source,
        reason: "Phone-call binding is disabled for this organization.",
        checkedAt: Date.now(),
      };
    }
    if (!telephonyBinding.directSettingsId) {
      return {
        success: false,
        applied: false,
        source: runtime.source,
        reason: "Telephony direct settings were not found for this organization.",
        checkedAt: Date.now(),
      };
    }
    if (!telephonyBinding.routeKey) {
      return {
        success: false,
        applied: false,
        source: runtime.source,
        reason: "Phone-call binding is missing a route key.",
        checkedAt: Date.now(),
      };
    }
    if (!telephonyBinding.webhookSecret) {
      return {
        success: false,
        applied: false,
        source: runtime.source,
        reason: "Phone-call binding is missing a webhook secret. Save one before applying Twilio voice webhooks.",
        checkedAt: Date.now(),
      };
    }

    const targetNumber = await resolveTwilioIncomingPhoneNumberRecord({
      accountSid: runtime.accountSid,
      authToken: runtime.authToken,
      phoneNumberSid: normalizeString(args.phoneNumberSid),
      phoneNumber:
        normalizeString(args.phoneNumber) || telephonyBinding.fromNumber,
    });

    if (!targetNumber) {
      return {
        success: false,
        applied: false,
        source: runtime.source,
        reason:
          "The target Twilio incoming number could not be resolved. Load inventory and save the phone binding number first.",
        checkedAt: Date.now(),
      };
    }
    if (!targetNumber.voiceEnabled) {
      return {
        success: false,
        applied: false,
        source: runtime.source,
        reason: "The selected Twilio number does not have voice enabled.",
        checkedAt: Date.now(),
      };
    }
    if (
      telephonyBinding.fromNumber &&
      canonicalizePhoneNumber(telephonyBinding.fromNumber) !==
        canonicalizePhoneNumber(targetNumber.phoneNumber)
    ) {
      return {
        success: false,
        applied: false,
        source: runtime.source,
        reason:
          "The selected Twilio number does not match the current phone-call binding number. Save the phone binding first, then re-apply.",
        checkedAt: Date.now(),
      };
    }

    const webhookUrls = buildTwilioVoiceWebhookUrls({
      routeKey: telephonyBinding.routeKey,
      webhookSecret: telephonyBinding.webhookSecret,
    });

    await fetchTwilioForm({
      accountSid: runtime.accountSid,
      authToken: runtime.authToken,
      path: `/Accounts/${runtime.accountSid}/IncomingPhoneNumbers/${targetNumber.sid}.json`,
      body: {
        VoiceUrl: webhookUrls.inboundWebhookUrl,
        VoiceMethod: "POST",
        StatusCallback: webhookUrls.statusCallbackUrl,
        StatusCallbackMethod: "POST",
      },
    });

    const now = Date.now();
    await (ctx as any).runMutation(
      generatedApi.internal.integrations.twilio.recordTwilioVoiceNumberBindingAppliedInternal,
      {
        organizationId: args.organizationId,
        directSettingsId: telephonyBinding.directSettingsId,
        directProps: telephonyBinding.directProps,
        userId: access.userId,
        phoneNumberSid: targetNumber.sid,
        phoneNumber: targetNumber.phoneNumber,
        inboundWebhookUrl: webhookUrls.inboundWebhookUrl,
        statusCallbackUrl: webhookUrls.statusCallbackUrl,
        runtimeSource: runtime.source,
        appliedAt: now,
      } satisfies TwilioVoiceBindingAuditArgs,
    );

    return {
      success: true,
      applied: true,
      source: runtime.source,
      phoneNumberSid: targetNumber.sid,
      phoneNumber: targetNumber.phoneNumber,
      inboundWebhookUrl: webhookUrls.inboundWebhookUrl,
      statusCallbackUrl: webhookUrls.statusCallbackUrl,
      checkedAt: now,
      appliedAt: now,
    };
  },
});

export const validateOrganizationTwilioVoiceNumberBinding = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    phoneNumberSid: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioActionAccessContext,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      },
    );

    const runtime = (await ctx.runAction(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioRuntimeBinding,
      { organizationId: args.organizationId },
    )) as TwilioRuntimeBinding;

    if (!runtime.enabled || !runtime.accountSid || !runtime.authToken) {
      return {
        success: false,
        valid: false,
        source: runtime.source,
        reason: summarizeRuntimeBlockedReason(runtime),
        checkedAt: Date.now(),
      };
    }

    const telephonyBinding = (await ctx.runQuery(
      generatedApi.internal.integrations.twilio.getOrganizationTelephonyBindingStateInternal,
      { organizationId: args.organizationId },
    )) as OrganizationTelephonyBindingState;
    if (telephonyBinding.providerKey !== "twilio_voice") {
      return {
        success: false,
        valid: false,
        source: runtime.source,
        reason:
          "Phone-call binding is not set to Twilio Voice for this organization.",
        checkedAt: Date.now(),
      };
    }
    if (!telephonyBinding.routeKey || !telephonyBinding.webhookSecret) {
      return {
        success: false,
        valid: false,
        source: runtime.source,
        reason:
          "Phone-call binding is missing route-key or webhook-secret data required for validation.",
        checkedAt: Date.now(),
      };
    }

    const targetNumber = await resolveTwilioIncomingPhoneNumberRecord({
      accountSid: runtime.accountSid,
      authToken: runtime.authToken,
      phoneNumberSid:
        normalizeString(args.phoneNumberSid) || telephonyBinding.incomingNumberSid,
      phoneNumber:
        normalizeString(args.phoneNumber) || telephonyBinding.fromNumber,
    });

    if (!targetNumber) {
      return {
        success: false,
        valid: false,
        source: runtime.source,
        reason:
          "The configured Twilio incoming number could not be resolved from the live runtime.",
        checkedAt: Date.now(),
      };
    }

    const expected = buildTwilioVoiceWebhookUrls({
      routeKey: telephonyBinding.routeKey,
      webhookSecret: telephonyBinding.webhookSecret,
    });
    const valid =
      targetNumber.voiceUrl === expected.inboundWebhookUrl &&
      targetNumber.statusCallback === expected.statusCallbackUrl;

    return {
      success: true,
      valid,
      source: runtime.source,
      phoneNumberSid: targetNumber.sid,
      phoneNumber: targetNumber.phoneNumber,
      expected,
      actual: {
        voiceUrl: targetNumber.voiceUrl,
        statusCallback: targetNumber.statusCallback,
      },
      reason: valid
        ? undefined
        : "The live Twilio number webhook URLs do not match the expected app-managed bridge configuration.",
      checkedAt: Date.now(),
    };
  },
});
