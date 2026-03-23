/**
 * CAL.COM INTEGRATION
 *
 * Universal Cal.com integration for authenticated platform users.
 *
 * Rules:
 * - Every customer org must configure its own API key (BYOK).
 * - Only super admins operating on the platform org may configure and use the
 *   platform-managed default credentials.
 * - No booking URLs are hardcoded into the integration contract. Consumers use
 *   event types, availability, and booking APIs.
 */

import {
  action,
  internalAction,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import {
  CALCOM_DEFAULT_API_BASE_URL,
  CALCOM_DEFAULT_API_VERSION,
  CALCOM_SLOTS_API_VERSION,
  normalizeCalcomApiBaseUrl,
  normalizePositiveInteger,
  normalizeTrimmedString,
  resolvePlatformOrgIdFromEnv,
  type CalcomCredentialMode,
} from "./calcomShared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

type CalcomSettingsRecord = {
  enabled?: boolean;
  credentialMode?: CalcomCredentialMode;
  apiKey?: string;
  apiBaseUrl?: string;
  defaultEventTypeId?: number | string;
  defaultEventTypeName?: string;
  defaultEventTypeSlug?: string;
  encryptedFields?: string[];
};

type CalcomResolvedCredentials = {
  apiKey: string;
  apiBaseUrl: string;
  defaultEventTypeId: number | null;
  defaultEventTypeName: string | null;
  defaultEventTypeSlug: string | null;
  source: "org" | "platform";
  credentialMode: CalcomCredentialMode;
};

type SessionOrgContext = {
  session: { userId: Id<"users"> };
  user: { _id: Id<"users">; defaultOrgId: Id<"organizations">; global_role_id?: Id<"roles"> | null };
  organizationId: Id<"organizations">;
  isSuperAdmin: boolean;
  platformOrgId: Id<"organizations"> | null;
  canUsePlatformManaged: boolean;
};

type CalcomEventTypeSummary = {
  id: number;
  slug: string | null;
  name: string;
  lengthInMinutes: number | null;
  schedulingType: string | null;
};

type CalcomSlotSummary = {
  start: string;
  end: string | null;
};

function resolveSettingsMode(
  settings: CalcomSettingsRecord | null,
): CalcomCredentialMode {
  return settings?.credentialMode === "platform" ? "platform" : "byok";
}

function isIntegrationEnabled(settings: CalcomSettingsRecord | null): boolean {
  return settings?.enabled !== false;
}

function normalizeEventTypeId(value: unknown): number | null {
  return normalizePositiveInteger(value);
}

async function isUserSuperAdminByUserDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  user: { global_role_id?: Id<"roles"> | null },
): Promise<boolean> {
  if (!user.global_role_id) {
    return false;
  }
  const role = await ctx.db.get(user.global_role_id);
  return Boolean(role && role.name === "super_admin");
}

async function requireSessionOrgContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: string,
): Promise<SessionOrgContext> {
  const session = await ctx.db.get(sessionId as Id<"sessions">);
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Invalid or expired session");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.defaultOrgId) {
    throw new Error("User not found or no organization");
  }

  const isSuperAdmin = await isUserSuperAdminByUserDoc(ctx, user);
  const platformOrgIdRaw = resolvePlatformOrgIdFromEnv();
  const platformOrgId = platformOrgIdRaw
    ? (platformOrgIdRaw as Id<"organizations">)
    : null;
  const canUsePlatformManaged =
    Boolean(platformOrgId) &&
    isSuperAdmin &&
    user.defaultOrgId === platformOrgId;

  return {
    session,
    user,
    organizationId: user.defaultOrgId as Id<"organizations">,
    isSuperAdmin,
    platformOrgId,
    canUsePlatformManaged,
  };
}

async function getSettingsObject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
) {
  return await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "calcom_settings"),
    )
    .first();
}

function normalizeEventTypeName(value: unknown): string | null {
  return normalizeTrimmedString(value);
}

function normalizeEventTypeSlug(value: unknown): string | null {
  return normalizeTrimmedString(value);
}

function buildCalcomHeaders(args: {
  apiKey: string;
  apiVersion: string;
  extraHeaders?: Record<string, string>;
}): HeadersInit {
  return {
    Authorization: `Bearer ${args.apiKey}`,
    "cal-api-version": args.apiVersion,
    ...(args.extraHeaders ?? {}),
  };
}

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractCalcomErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const typed = payload as Record<string, unknown>;
  if (typeof typed.message === "string" && typed.message.trim()) {
    return typed.message.trim();
  }
  if (typeof typed.error === "string" && typed.error.trim()) {
    return typed.error.trim();
  }
  const nested = typed.error;
  if (nested && typeof nested === "object") {
    const message = (nested as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }
  return null;
}

async function fetchCalcomJson(args: {
  apiBaseUrl: string;
  path: string;
  apiKey: string;
  apiVersion: string;
  method?: "GET" | "POST";
  body?: unknown;
}): Promise<unknown> {
  const response = await fetch(`${args.apiBaseUrl}${args.path}`, {
    method: args.method ?? "GET",
    headers: buildCalcomHeaders({
      apiKey: args.apiKey,
      apiVersion: args.apiVersion,
      extraHeaders: args.body
        ? { "Content-Type": "application/json" }
        : undefined,
    }),
    body: args.body ? JSON.stringify(args.body) : undefined,
  });

  const text = await response.text();
  const payload = parseJsonSafely(text);
  if (!response.ok) {
    throw new Error(
      extractCalcomErrorMessage(payload) ||
        `Cal.com request failed (${response.status})`,
    );
  }

  return payload;
}

function normalizeEventTypesResponse(payload: unknown): CalcomEventTypeSummary[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const data = root.data;
  const rows: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).eventTypes)
      ? ((data as Record<string, unknown>).eventTypes as unknown[])
      : [];

  const eventTypes: CalcomEventTypeSummary[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const record = row as Record<string, unknown>;
    const id = normalizeEventTypeId(record.id);
    const name =
      normalizeTrimmedString(record.title) ||
      normalizeTrimmedString(record.name);
    if (!id || !name) {
      continue;
    }
    eventTypes.push({
      id,
      slug: normalizeEventTypeSlug(record.slug),
      name,
      lengthInMinutes: normalizePositiveInteger(record.lengthInMinutes),
      schedulingType: normalizeTrimmedString(record.schedulingType),
    });
  }

  return eventTypes;
}

function normalizeSlotsResponse(payload: unknown): CalcomSlotSummary[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = (payload as Record<string, unknown>).data;
  if (!data || typeof data !== "object") {
    return [];
  }

  const rows: CalcomSlotSummary[] = [];
  for (const slotGroup of Object.values(data as Record<string, unknown>)) {
    if (!Array.isArray(slotGroup)) {
      continue;
    }
    for (const slot of slotGroup) {
      if (!slot || typeof slot !== "object") {
        continue;
      }
      const record = slot as Record<string, unknown>;
      const start = normalizeTrimmedString(record.start);
      if (!start) {
        continue;
      }
      rows.push({
        start,
        end: normalizeTrimmedString(record.end),
      });
    }
  }

  return rows;
}

function normalizeCreatedBookingResponse(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const data = (payload as Record<string, unknown>).data;
  if (!data || typeof data !== "object") {
    return null;
  }
  return data as Record<string, unknown>;
}

async function resolveSavedCredentials(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    canUsePlatformManaged: boolean;
  },
): Promise<CalcomResolvedCredentials | null> {
  const settings = (await ctx.runQuery(
    generatedApi.internal.integrations.calcom.getSettingsInternal,
    { organizationId: args.organizationId },
  )) as CalcomSettingsRecord | null;

  if (!settings || !isIntegrationEnabled(settings) || !settings.apiKey) {
    return null;
  }

  const credentialMode = resolveSettingsMode(settings);
  if (credentialMode === "platform" && !args.canUsePlatformManaged) {
    return null;
  }

  const encryptedFields = Array.isArray(settings.encryptedFields)
    ? settings.encryptedFields
    : [];
  const apiKey = encryptedFields.includes("apiKey")
    ? ((await ctx.runAction(
        generatedApi.internal.oauth.encryption.decryptToken,
        { encrypted: settings.apiKey },
      )) as string)
    : settings.apiKey;

  const normalizedApiKey = normalizeTrimmedString(apiKey);
  if (!normalizedApiKey) {
    return null;
  }

  return {
    apiKey: normalizedApiKey,
    apiBaseUrl:
      normalizeCalcomApiBaseUrl(settings.apiBaseUrl) ??
      CALCOM_DEFAULT_API_BASE_URL,
    defaultEventTypeId: normalizeEventTypeId(settings.defaultEventTypeId),
    defaultEventTypeName: normalizeEventTypeName(settings.defaultEventTypeName),
    defaultEventTypeSlug: normalizeEventTypeSlug(settings.defaultEventTypeSlug),
    source: credentialMode === "platform" ? "platform" : "org",
    credentialMode,
  };
}

async function resolveActionCredentials(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    sessionId: string;
    apiKey?: string;
    apiBaseUrl?: string;
  },
): Promise<CalcomResolvedCredentials> {
  const directApiKey = normalizeTrimmedString(args.apiKey);
  if (directApiKey) {
    return {
      apiKey: directApiKey,
      apiBaseUrl:
        normalizeCalcomApiBaseUrl(args.apiBaseUrl) ??
        CALCOM_DEFAULT_API_BASE_URL,
      defaultEventTypeId: null,
      defaultEventTypeName: null,
      defaultEventTypeSlug: null,
      source: "org",
      credentialMode: "byok",
    };
  }

  const context = await requireSessionOrgContext(ctx, args.sessionId);
  const resolved = (await ctx.runAction(
    generatedApi.internal.integrations.calcom.resolveCredentials,
    {
      organizationId: context.organizationId,
      allowPlatformManaged: context.canUsePlatformManaged,
    },
  )) as CalcomResolvedCredentials | null;

  if (!resolved) {
    throw new Error("Cal.com is not configured for this organization.");
  }

  return resolved;
}

function canRuntimeUsePlatformManagedForOrganization(
  organizationId: Id<"organizations">,
): boolean {
  const platformOrgIdRaw = resolvePlatformOrgIdFromEnv();
  return Boolean(platformOrgIdRaw) && platformOrgIdRaw === organizationId;
}

async function resolveOrganizationActionCredentials(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
): Promise<CalcomResolvedCredentials> {
  const resolved = await resolveSavedCredentials(ctx, {
    organizationId,
    canUsePlatformManaged: canRuntimeUsePlatformManagedForOrganization(
      organizationId,
    ),
  });

  if (!resolved) {
    throw new Error("Cal.com is not configured for this organization.");
  }

  return resolved;
}

async function getAvailabilityWithResolvedCredentials(args: {
  credentials: CalcomResolvedCredentials;
  eventTypeId?: number;
  start: string;
  end: string;
  timeZone?: string;
  duration?: number;
  bookingUidToReschedule?: string;
}): Promise<{
  success: true;
  eventTypeId: number;
  eventTypeName: string | null;
  eventTypeSlug: string | null;
  slots: CalcomSlotSummary[];
  source: "org" | "platform";
}> {
  const eventTypeId =
    normalizeEventTypeId(args.eventTypeId) ??
    args.credentials.defaultEventTypeId;
  if (!eventTypeId) {
    throw new Error("No Cal.com event type is configured.");
  }
  const normalizedDuration = normalizePositiveInteger(args.duration);

  const params = new URLSearchParams({
    eventTypeId: String(eventTypeId),
    start: args.start,
    end: args.end,
    format: "range",
  });
  const normalizedTimeZone = normalizeTrimmedString(args.timeZone);
  if (normalizedTimeZone) {
    params.set("timeZone", normalizedTimeZone);
  }
  if (normalizedDuration) {
    params.set("duration", String(normalizedDuration));
  }
  const normalizedBookingUidToReschedule = normalizeTrimmedString(
    args.bookingUidToReschedule,
  );
  if (normalizedBookingUidToReschedule) {
    params.set("bookingUidToReschedule", normalizedBookingUidToReschedule);
  }

  const payload = await fetchCalcomJson({
    apiBaseUrl: args.credentials.apiBaseUrl,
    path: `/slots?${params.toString()}`,
    apiKey: args.credentials.apiKey,
    apiVersion: CALCOM_SLOTS_API_VERSION,
  });

  const usesDefaultEventType =
    args.credentials.defaultEventTypeId !== null &&
    eventTypeId === args.credentials.defaultEventTypeId;

  return {
    success: true,
    eventTypeId,
    eventTypeName: usesDefaultEventType
      ? args.credentials.defaultEventTypeName
      : null,
    eventTypeSlug: usesDefaultEventType
      ? args.credentials.defaultEventTypeSlug
      : null,
    slots: normalizeSlotsResponse(payload),
    source: args.credentials.source,
  };
}

async function createBookingWithResolvedCredentials(args: {
  credentials: CalcomResolvedCredentials;
  eventTypeId?: number;
  start: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeTimeZone: string;
  attendeePhoneNumber?: string;
  lengthInMinutes?: number;
  bookingFieldsResponses?: unknown;
  guests?: string[];
}): Promise<{
  success: true;
  eventTypeId: number;
  eventTypeName: string | null;
  eventTypeSlug: string | null;
  booking: Record<string, unknown> | null;
  source: "org" | "platform";
}> {
  const eventTypeId =
    normalizeEventTypeId(args.eventTypeId) ??
    args.credentials.defaultEventTypeId;
  if (!eventTypeId) {
    throw new Error("No Cal.com event type is configured.");
  }

  const attendeeName = normalizeTrimmedString(args.attendeeName);
  const attendeeEmail = normalizeTrimmedString(args.attendeeEmail);
  const attendeeTimeZone = normalizeTrimmedString(args.attendeeTimeZone);
  if (!attendeeName || !attendeeEmail || !attendeeTimeZone) {
    throw new Error("Attendee name, email, and time zone are required.");
  }
  const normalizedLengthInMinutes = normalizePositiveInteger(
    args.lengthInMinutes,
  );

  const payload = await fetchCalcomJson({
    apiBaseUrl: args.credentials.apiBaseUrl,
    path: "/bookings",
    apiKey: args.credentials.apiKey,
    apiVersion: CALCOM_DEFAULT_API_VERSION,
    method: "POST",
    body: {
      eventTypeId,
      start: args.start,
      attendee: {
        name: attendeeName,
        email: attendeeEmail,
        timeZone: attendeeTimeZone,
        phoneNumber:
          normalizeTrimmedString(args.attendeePhoneNumber) ?? undefined,
      },
      ...(normalizedLengthInMinutes
        ? { lengthInMinutes: normalizedLengthInMinutes }
        : {}),
      ...(Array.isArray(args.guests) && args.guests.length > 0
        ? { guests: args.guests }
        : {}),
      ...(args.bookingFieldsResponses
        ? { bookingFieldsResponses: args.bookingFieldsResponses }
        : {}),
    },
  });

  const usesDefaultEventType =
    args.credentials.defaultEventTypeId !== null &&
    eventTypeId === args.credentials.defaultEventTypeId;

  return {
    success: true,
    eventTypeId,
    eventTypeName: usesDefaultEventType
      ? args.credentials.defaultEventTypeName
      : null,
    eventTypeSlug: usesDefaultEventType
      ? args.credentials.defaultEventTypeSlug
      : null,
    booking: normalizeCreatedBookingResponse(payload),
    source: args.credentials.source,
  };
}

export const getCalcomSettings = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      return null;
    }

    const isSuperAdmin = await isUserSuperAdminByUserDoc(ctx, user);
    const platformOrgIdRaw = resolvePlatformOrgIdFromEnv();
    const platformOrgId = platformOrgIdRaw
      ? (platformOrgIdRaw as Id<"organizations">)
      : null;
    const isPlatformOrg =
      Boolean(platformOrgId) && user.defaultOrgId === platformOrgId;
    const canUsePlatformManaged = Boolean(platformOrgId) && isSuperAdmin && isPlatformOrg;

    const settingsObject = await getSettingsObject(
      ctx,
      user.defaultOrgId as Id<"organizations">,
    );
    const settings = (settingsObject?.customProperties ?? null) as CalcomSettingsRecord | null;
    const credentialMode = resolveSettingsMode(settings);
    const enabled = isIntegrationEnabled(settings);
    const hasApiKey = Boolean(settings?.apiKey);
    const source =
      enabled &&
      hasApiKey &&
      (credentialMode === "byok" || canUsePlatformManaged)
        ? (credentialMode === "platform" ? "platform" : "org")
        : null;

    return {
      configured: Boolean(settingsObject),
      hasOrganizationSettings: Boolean(settingsObject),
      enabled,
      credentialMode,
      source,
      hasApiKey,
      apiBaseUrl:
        normalizeCalcomApiBaseUrl(settings?.apiBaseUrl) ??
        CALCOM_DEFAULT_API_BASE_URL,
      defaultEventTypeId: normalizeEventTypeId(settings?.defaultEventTypeId),
      defaultEventTypeName: normalizeEventTypeName(settings?.defaultEventTypeName),
      defaultEventTypeSlug: normalizeEventTypeSlug(settings?.defaultEventTypeSlug),
      canUsePlatformManaged,
      isPlatformOrg,
      isSuperAdmin,
    };
  },
});

export const getSettingsInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settingsObject = await getSettingsObject(ctx, args.organizationId);
    if (!settingsObject) {
      return null;
    }
    return settingsObject.customProperties as Record<string, unknown>;
  },
});

export const saveCalcomSettings = mutation({
  args: {
    sessionId: v.string(),
    enabled: v.boolean(),
    credentialMode: v.union(v.literal("platform"), v.literal("byok")),
    apiKey: v.optional(v.string()),
    apiBaseUrl: v.optional(v.string()),
    defaultEventTypeId: v.optional(v.number()),
    defaultEventTypeName: v.optional(v.string()),
    defaultEventTypeSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const context = await requireSessionOrgContext(ctx, args.sessionId);
    const canManage = await (ctx as any).runQuery(
      generatedApi.api.auth.canUserPerform,
      {
        sessionId: args.sessionId,
        permission: "manage_integrations",
        resource: "settings",
        organizationId: context.organizationId,
      },
    );

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    const existing = await getSettingsObject(ctx, context.organizationId);
    const existingSettings = (existing?.customProperties ?? null) as CalcomSettingsRecord | null;
    const existingCredentialMode = resolveSettingsMode(existingSettings);
    const touchesPlatformManagedMode =
      args.credentialMode === "platform" || existingCredentialMode === "platform";
    if (touchesPlatformManagedMode && !context.canUsePlatformManaged) {
      throw new Error(
        "Permission denied: only a super admin on the platform org can configure platform-managed Cal.com.",
      );
    }

    const existingEncryptedApiKey = normalizeTrimmedString(existingSettings?.apiKey);
    const normalizedApiKey = normalizeTrimmedString(args.apiKey);

    let encryptedApiKey = existingEncryptedApiKey || undefined;
    if (normalizedApiKey) {
      encryptedApiKey = (await (ctx as any).runAction(
        generatedApi.internal.oauth.encryption.encryptToken,
        { plaintext: normalizedApiKey },
      )) as string;
    }

    if (args.enabled && !encryptedApiKey) {
      throw new Error("Cal.com API key is required before enabling the integration.");
    }

    const defaultEventTypeId = normalizeEventTypeId(args.defaultEventTypeId);
    const existingDefaultEventTypeId = normalizeEventTypeId(
      existingSettings?.defaultEventTypeId,
    );
    const preservesExistingDefaultEventTypeMetadata =
      Boolean(defaultEventTypeId) &&
      defaultEventTypeId === existingDefaultEventTypeId;
    const settingsData: CalcomSettingsRecord = {
      enabled: args.enabled,
      credentialMode: args.credentialMode,
      apiKey: encryptedApiKey,
      apiBaseUrl:
        normalizeCalcomApiBaseUrl(args.apiBaseUrl) ??
        normalizeCalcomApiBaseUrl(existingSettings?.apiBaseUrl) ??
        CALCOM_DEFAULT_API_BASE_URL,
      defaultEventTypeId: defaultEventTypeId ?? undefined,
      defaultEventTypeName:
        !defaultEventTypeId
          ? undefined
          : normalizeEventTypeName(args.defaultEventTypeName) ??
            (preservesExistingDefaultEventTypeMetadata
              ? normalizeEventTypeName(existingSettings?.defaultEventTypeName)
              : null) ??
            undefined,
      defaultEventTypeSlug:
        !defaultEventTypeId
          ? undefined
          : normalizeEventTypeSlug(args.defaultEventTypeSlug) ??
            (preservesExistingDefaultEventTypeMetadata
              ? normalizeEventTypeSlug(existingSettings?.defaultEventTypeSlug)
              : null) ??
            undefined,
      encryptedFields: encryptedApiKey ? ["apiKey"] : [],
    };

    let settingsId: Id<"objects">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        customProperties: settingsData,
        updatedAt: Date.now(),
      });
      settingsId = existing._id;
    } else {
      settingsId = await ctx.db.insert("objects", {
        type: "calcom_settings",
        name: "Cal.com Settings",
        organizationId: context.organizationId,
        status: "active",
        customProperties: settingsData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: context.user._id,
      organizationId: context.organizationId,
      action: existing ? "update" : "create",
      resource: "calcom_settings",
      success: true,
      metadata: {
        enabled: args.enabled,
        credentialMode: args.credentialMode,
        defaultEventTypeId: defaultEventTypeId ?? null,
      },
    });

    return { success: true, settingsId };
  },
});

export const disconnectCalcom = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const context = await requireSessionOrgContext(ctx, args.sessionId);
    const canManage = await (ctx as any).runQuery(
      generatedApi.api.auth.canUserPerform,
      {
        sessionId: args.sessionId,
        permission: "manage_integrations",
        resource: "settings",
        organizationId: context.organizationId,
      },
    );

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    const settings = await getSettingsObject(ctx, context.organizationId);
    const existingSettings = (settings?.customProperties ?? null) as CalcomSettingsRecord | null;
    if (
      resolveSettingsMode(existingSettings) === "platform" &&
      !context.canUsePlatformManaged
    ) {
      throw new Error(
        "Permission denied: only a super admin on the platform org can configure platform-managed Cal.com.",
      );
    }

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: context.user._id,
      organizationId: context.organizationId,
      action: "delete",
      resource: "calcom_settings",
      success: true,
    });

    return { success: true };
  },
});

export const testCalcomConnection = action({
  args: {
    apiKey: v.string(),
    apiBaseUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = normalizeTrimmedString(args.apiKey);
    if (!apiKey) {
      return { success: false, error: "Cal.com API key is required." };
    }

    const apiBaseUrl =
      normalizeCalcomApiBaseUrl(args.apiBaseUrl) ??
      CALCOM_DEFAULT_API_BASE_URL;

    try {
      await fetchCalcomJson({
        apiBaseUrl,
        path: "/event-types?limit=1",
        apiKey,
        apiVersion: CALCOM_DEFAULT_API_VERSION,
      });
      return { success: true, apiBaseUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const listCalcomEventTypes = action({
  args: {
    sessionId: v.string(),
    apiKey: v.optional(v.string()),
    apiBaseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const credentials = await resolveActionCredentials(ctx, args);
      const payload = await fetchCalcomJson({
        apiBaseUrl: credentials.apiBaseUrl,
        path: "/event-types",
        apiKey: credentials.apiKey,
        apiVersion: CALCOM_DEFAULT_API_VERSION,
      });

      return {
        success: true,
        eventTypes: normalizeEventTypesResponse(payload),
        source: credentials.source,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventTypes: [] as CalcomEventTypeSummary[],
      };
    }
  },
});

export const getCalcomAvailability = action({
  args: {
    sessionId: v.string(),
    eventTypeId: v.optional(v.number()),
    start: v.string(),
    end: v.string(),
    timeZone: v.optional(v.string()),
    duration: v.optional(v.number()),
    bookingUidToReschedule: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const credentials = await resolveActionCredentials(ctx, {
        sessionId: args.sessionId,
      });
      return await getAvailabilityWithResolvedCredentials({
        credentials,
        eventTypeId: args.eventTypeId,
        start: args.start,
        end: args.end,
        timeZone: args.timeZone,
        duration: args.duration,
        bookingUidToReschedule: args.bookingUidToReschedule,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        slots: [] as CalcomSlotSummary[],
      };
    }
  },
});

export const createCalcomBooking = action({
  args: {
    sessionId: v.string(),
    eventTypeId: v.optional(v.number()),
    start: v.string(),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
    attendeeTimeZone: v.string(),
    attendeePhoneNumber: v.optional(v.string()),
    lengthInMinutes: v.optional(v.number()),
    bookingFieldsResponses: v.optional(v.any()),
    guests: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      const credentials = await resolveActionCredentials(ctx, {
        sessionId: args.sessionId,
      });
      return await createBookingWithResolvedCredentials({
        credentials,
        eventTypeId: args.eventTypeId,
        start: args.start,
        attendeeName: args.attendeeName,
        attendeeEmail: args.attendeeEmail,
        attendeeTimeZone: args.attendeeTimeZone,
        attendeePhoneNumber: args.attendeePhoneNumber,
        lengthInMinutes: args.lengthInMinutes,
        bookingFieldsResponses: args.bookingFieldsResponses,
        guests: args.guests,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        booking: null,
      };
    }
  },
});

export const resolveCredentials = internalAction({
  args: {
    organizationId: v.id("organizations"),
    allowPlatformManaged: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await resolveSavedCredentials(ctx, {
      organizationId: args.organizationId,
      canUsePlatformManaged: args.allowPlatformManaged === true,
    });
  },
});

export const getCalcomAvailabilityForOrganization = internalAction({
  args: {
    organizationId: v.id("organizations"),
    eventTypeId: v.optional(v.number()),
    start: v.string(),
    end: v.string(),
    timeZone: v.optional(v.string()),
    duration: v.optional(v.number()),
    bookingUidToReschedule: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const credentials = await resolveOrganizationActionCredentials(
        ctx,
        args.organizationId,
      );
      return await getAvailabilityWithResolvedCredentials({
        credentials,
        eventTypeId: args.eventTypeId,
        start: args.start,
        end: args.end,
        timeZone: args.timeZone,
        duration: args.duration,
        bookingUidToReschedule: args.bookingUidToReschedule,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        slots: [] as CalcomSlotSummary[],
      };
    }
  },
});

export const createCalcomBookingForOrganization = internalAction({
  args: {
    organizationId: v.id("organizations"),
    eventTypeId: v.optional(v.number()),
    start: v.string(),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
    attendeeTimeZone: v.string(),
    attendeePhoneNumber: v.optional(v.string()),
    lengthInMinutes: v.optional(v.number()),
    bookingFieldsResponses: v.optional(v.any()),
    guests: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      const credentials = await resolveOrganizationActionCredentials(
        ctx,
        args.organizationId,
      );
      return await createBookingWithResolvedCredentials({
        credentials,
        eventTypeId: args.eventTypeId,
        start: args.start,
        attendeeName: args.attendeeName,
        attendeeEmail: args.attendeeEmail,
        attendeeTimeZone: args.attendeeTimeZone,
        attendeePhoneNumber: args.attendeePhoneNumber,
        lengthInMinutes: args.lengthInMinutes,
        bookingFieldsResponses: args.bookingFieldsResponses,
        guests: args.guests,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        booking: null,
      };
    }
  },
});
