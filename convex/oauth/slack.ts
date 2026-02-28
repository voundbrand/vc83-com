/**
 * Slack OAuth Integration
 *
 * Handles OAuth flow for Slack workspace connections.
 */

import {
  action,
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { SLACK_INTEGRATION_CONFIG } from "./config";
import {
  normalizeIntegrationBaseUrl,
  resolveIntegrationEndpoints,
} from "../integrations/endpointResolver";

const generatedApi: any = require("../_generated/api");

const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

const SLACK_BASE_SCOPES = [
  "app_mentions:read",
  "channels:history",
  "channels:read",
  "chat:write",
];
const SLACK_DM_SCOPES = ["im:history"];
const SLACK_AI_APP_SCOPES = ["assistant:write"];

const SLACK_SETTINGS_OBJECT_TYPE = "slack_settings";
const VACATION_POLICY_OBJECT_TYPE = "vacation_policy";
const VACATION_POLICY_SUBTYPE = "pharmacist_team_v1";
const DEFAULT_VACATION_TIMEZONE = "UTC";
const DEFAULT_VACATION_MIN_LEAD_DAYS = 7;
const DEFAULT_VACATION_MAX_FUTURE_DAYS = 365;
const DEFAULT_VACATION_MAX_CONCURRENT_AWAY = 1;
const DEFAULT_VACATION_MIN_ON_DUTY_TOTAL = 1;
const DEFAULT_VACATION_PHARMACIST_ROLE_FLOOR = 1;
const DEFAULT_VACATION_ALTERNATIVE_WINDOWS = 3;
const DEFAULT_VACATION_ALTERNATIVE_WINDOW_DAYS = 14;
const VACATION_ROLE_TAG_PHARMACIST = "pharmacist";
const GOOGLE_CALENDAR_READ_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];
const GOOGLE_CALENDAR_WRITE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

type SlackSetupMode = "platform_managed" | "organization_byoa";
type SlackInteractionMode = "mentions_only" | "mentions_and_dm";
type VacationBlockedPeriodRecurrence = "none" | "yearly";

export function getSlackRequestedScopes(
  slashCommandsEnabled = SLACK_INTEGRATION_CONFIG.slashCommandsEnabled,
  interactionMode: SlackInteractionMode = "mentions_only",
  aiAppFeaturesEnabled = false
): string[] {
  const scopes = [...SLACK_BASE_SCOPES];
  if (interactionMode === "mentions_and_dm") {
    scopes.push(...SLACK_DM_SCOPES);
  }
  if (aiAppFeaturesEnabled) {
    scopes.push(...SLACK_AI_APP_SCOPES);
  }
  if (slashCommandsEnabled) {
    scopes.push("commands");
  }
  return Array.from(new Set(scopes));
}

function normalizeWorkspaceIdentifier(teamName: string | undefined, teamId: string): string {
  const normalizedName = (teamName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalizedName.length > 0 ? normalizedName : teamId.toLowerCase();
}

function parseScopeList(value: unknown): string[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return value
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeOptionalString(entry))
        .filter((entry): entry is string => Boolean(entry))
    )
  );
}

function hasAnyScope(
  scopes: string[] | undefined,
  requiredScopes: readonly string[]
): boolean {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return false;
  }
  return scopes.some((scope) => requiredScopes.includes(scope));
}

function getGoogleCalendarScopeReadiness(scopes: string[] | undefined): {
  canAccessCalendar: boolean;
  canWriteCalendar: boolean;
} {
  return {
    canAccessCalendar: hasAnyScope(scopes, GOOGLE_CALENDAR_READ_SCOPES),
    canWriteCalendar: hasAnyScope(scopes, GOOGLE_CALENDAR_WRITE_SCOPES),
  };
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Math.max(0, Math.floor(fallback));
  }
  return Math.max(0, Math.floor(value));
}

function normalizeVacationRecurrence(
  value: unknown
): VacationBlockedPeriodRecurrence {
  return value === "yearly" ? "yearly" : "none";
}

function normalizeVacationIsoDate(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}

function normalizeVacationBlockedPeriods(
  value: unknown
): Array<{
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  recurrence: VacationBlockedPeriodRecurrence;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  const periods: Array<{
    id: string;
    startDate: string;
    endDate: string;
    reason?: string;
    recurrence: VacationBlockedPeriodRecurrence;
  }> = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const startDate = normalizeVacationIsoDate(record.startDate);
    const endDate = normalizeVacationIsoDate(record.endDate);
    if (!startDate || !endDate) {
      continue;
    }
    periods.push({
      id:
        normalizeOptionalString(record.id) ||
        `${startDate}:${endDate}:${periods.length + 1}`,
      startDate,
      endDate,
      reason: normalizeOptionalString(record.reason),
      recurrence: normalizeVacationRecurrence(record.recurrence),
    });
  }
  return periods;
}

function normalizeVacationRoleFloors(
  value: unknown
): Array<{ roleTag: string; minOnDuty: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  const floors: Array<{ roleTag: string; minOnDuty: number }> = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const roleTag = normalizeOptionalString(record.roleTag);
    const minOnDuty = toNonNegativeInteger(record.minOnDuty, -1);
    if (!roleTag || minOnDuty < 0) {
      continue;
    }
    floors.push({ roleTag, minOnDuty });
  }
  return floors;
}

function normalizeVacationOverrideAuthority(
  value: unknown
): {
  allowedRoleIds: string[];
  allowedUserIds: string[];
  requireReason: boolean;
  requireOwnerApproval: boolean;
} {
  const override =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    allowedRoleIds: normalizeStringArray(override.allowedRoleIds),
    allowedUserIds: normalizeStringArray(override.allowedUserIds),
    requireReason: override.requireReason === true,
    requireOwnerApproval: override.requireOwnerApproval === true,
  };
}

function normalizeProviderProfileType(
  value: unknown
): "platform" | "organization" | undefined {
  return value === "platform" || value === "organization" ? value : undefined;
}

function normalizeSlackSetupMode(value: unknown): SlackSetupMode {
  return value === "organization_byoa"
    ? "organization_byoa"
    : "platform_managed";
}

function normalizeSlackInteractionMode(value: unknown): SlackInteractionMode {
  return value === "mentions_and_dm"
    ? "mentions_and_dm"
    : "mentions_only";
}

function normalizeSlackAiAppFeaturesEnabled(value: unknown): boolean {
  return value === true;
}

function resolveConnectionProfileType(
  connection: Record<string, unknown>
): "platform" | "organization" {
  const metadata = (connection.customProperties || {}) as Record<string, unknown>;
  return (
    normalizeProviderProfileType(connection.providerProfileType) ||
    normalizeProviderProfileType(metadata.providerProfileType) ||
    normalizeProviderProfileType(metadata.profileType) ||
    "organization"
  );
}

function readSlackRouteScope(
  connection: Record<string, unknown>
): {
  teamId?: string;
  routeKey?: string;
  channelId?: string;
  workspaceName?: string;
  workspaceDomain?: string;
} {
  const metadata = (connection.customProperties || {}) as Record<string, unknown>;
  return {
    teamId:
      normalizeOptionalString(connection.providerAccountId) ||
      normalizeOptionalString(metadata.teamId),
    routeKey:
      normalizeOptionalString(connection.providerRouteKey) ||
      normalizeOptionalString(metadata.providerRouteKey) ||
      normalizeOptionalString(metadata.routeKey),
    channelId:
      normalizeOptionalString(metadata.incomingWebhookChannelId) ||
      normalizeOptionalString(metadata.channelId),
    workspaceName: normalizeOptionalString(metadata.teamName),
    workspaceDomain: normalizeOptionalString(metadata.teamDomain),
  };
}

function matchesSlackPolicyScope(args: {
  policyObject: Record<string, unknown>;
  slackConnectionId?: string;
  teamId?: string;
  routeKey?: string;
}): boolean {
  const props = (args.policyObject.customProperties || {}) as Record<string, unknown>;
  const integrations = (props.integrations || {}) as Record<string, unknown>;
  const slackIntegration = (integrations.slack || {}) as Record<string, unknown>;

  const policyConnectionId = normalizeOptionalString(
    slackIntegration.providerConnectionId
  );
  const policyTeamId = normalizeOptionalString(slackIntegration.teamId);
  const policyRouteKey = normalizeOptionalString(slackIntegration.routeKey);

  if (policyConnectionId && args.slackConnectionId && policyConnectionId !== args.slackConnectionId) {
    return false;
  }
  if (policyTeamId && args.teamId && policyTeamId !== args.teamId) {
    return false;
  }
  if (policyRouteKey && args.routeKey && policyRouteKey !== args.routeKey) {
    return false;
  }

  return true;
}

function resolvePharmacistRoleFloor(
  roleFloors: Array<{ roleTag: string; minOnDuty: number }>
): number {
  const pharmacist = roleFloors.find(
    (floor) => floor.roleTag === VACATION_ROLE_TAG_PHARMACIST
  );
  return pharmacist?.minOnDuty ?? DEFAULT_VACATION_PHARMACIST_ROLE_FLOOR;
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

function uniqueNonEmpty(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeOptionalString(value))
        .filter((value): value is string => Boolean(value))
    )
  );
}

async function getSlackSettingsObject(
  ctx: unknown,
  organizationId: Id<"organizations">
): Promise<Record<string, unknown> | null> {
  const hasDb = Boolean((ctx as any).db);
  const settings = hasDb
    ? await (ctx as any).db
        .query("objects")
        .withIndex("by_org_type", (q: any) =>
          q.eq("organizationId", organizationId).eq("type", SLACK_SETTINGS_OBJECT_TYPE)
        )
        .first()
    : await (ctx as any).runQuery(
        generatedApi.internal.oauth.slack.getSlackSettingsObjectInternal,
        { organizationId }
      );
  return (settings as Record<string, unknown> | null) || null;
}

async function listActiveSlackConnectionsForOrg(
  ctx: unknown,
  organizationId: Id<"organizations">
): Promise<Array<Record<string, unknown>>> {
  return (await (ctx as any).db
    .query("oauthConnections")
    .withIndex("by_org_and_provider", (q: any) =>
      q.eq("organizationId", organizationId).eq("provider", "slack")
    )
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect()) as Array<Record<string, unknown>>;
}

async function listVacationPoliciesForOrg(
  ctx: unknown,
  organizationId: Id<"organizations">
): Promise<Array<Record<string, unknown>>> {
  return (await (ctx as any).db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", VACATION_POLICY_OBJECT_TYPE)
    )
    .collect()) as Array<Record<string, unknown>>;
}

async function resolveConnectionBlockingCalendarIds(
  ctx: unknown,
  args: {
    organizationId: Id<"organizations">;
    connectionId?: Id<"oauthConnections"> | null;
  }
): Promise<{
  exists: boolean;
  blockingCalendarIds: string[];
  explicitBlockingConfigured: boolean;
}> {
  if (!args.connectionId) {
    return {
      exists: false,
      blockingCalendarIds: ["primary"],
      explicitBlockingConfigured: false,
    };
  }

  const links = await (ctx as any).db
    .query("objectLinks")
    .withIndex("by_org_link_type", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("linkType", "calendar_linked_to")
    )
    .collect();
  const blockingIds = new Set<string>();
  let explicitBlockingConfigured = false;

  for (const link of links as Array<Record<string, unknown>>) {
    const props = (link.properties || {}) as Record<string, unknown>;
    if (String(props.connectionId || "") !== String(args.connectionId)) {
      continue;
    }
    const blocking = normalizeStringArray(props.blockingCalendarIds);
    if (blocking.length > 0) {
      explicitBlockingConfigured = true;
    }
    for (const calendarId of blocking) {
      blockingIds.add(calendarId);
    }
  }

  const blockingCalendarIds = Array.from(blockingIds);
  return {
    exists: true,
    blockingCalendarIds:
      blockingCalendarIds.length > 0 ? blockingCalendarIds : ["primary"],
    explicitBlockingConfigured,
  };
}

function readSlackSettingsProps(
  settingsObject: Record<string, unknown> | null
): Record<string, unknown> {
  if (!settingsObject) {
    return {};
  }
  const props = settingsObject.customProperties as Record<string, unknown> | undefined;
  return props || {};
}

function resolveSelectedSlackProfileType(
  setupMode: SlackSetupMode
): "platform" | "organization" {
  return setupMode === "organization_byoa" ? "organization" : "platform";
}

function resolveGoogleConnectionReadiness(
  connection: Record<string, unknown> | null
): {
  hasConnection: boolean;
  connectionId: Id<"oauthConnections"> | null;
  connectionType: "personal" | "organizational" | null;
  status: string | null;
  syncEnabled: boolean;
  canAccessCalendar: boolean;
  canWriteCalendar: boolean;
  calendarWriteReady: boolean;
  email: string | null;
} {
  if (!connection) {
    return {
      hasConnection: false,
      connectionId: null,
      connectionType: null,
      status: null,
      syncEnabled: false,
      canAccessCalendar: false,
      canWriteCalendar: false,
      calendarWriteReady: false,
      email: null,
    };
  }

  const syncSettings = (connection.syncSettings || {}) as Record<string, unknown>;
  const syncEnabled = syncSettings.calendar === true;
  const status = normalizeOptionalString(connection.status) || null;
  const scopeReadiness = getGoogleCalendarScopeReadiness(
    Array.isArray(connection.scopes)
      ? (connection.scopes as string[])
      : undefined
  );
  return {
    hasConnection: true,
    connectionId: connection._id as Id<"oauthConnections">,
    connectionType:
      connection.connectionType === "personal"
        ? "personal"
        : connection.connectionType === "organizational"
          ? "organizational"
          : null,
    status,
    syncEnabled,
    canAccessCalendar: scopeReadiness.canAccessCalendar,
    canWriteCalendar: scopeReadiness.canWriteCalendar,
    calendarWriteReady:
      status === "active" && syncEnabled && scopeReadiness.canWriteCalendar,
    email: normalizeOptionalString(connection.providerEmail) || null,
  };
}

function selectGoogleWorkConnection(args: {
  connections: Array<Record<string, unknown>>;
  userId: Id<"users">;
}): Record<string, unknown> | null {
  const activeConnections = args.connections.filter(
    (connection) => normalizeOptionalString(connection.status) === "active"
  );
  const organizational = activeConnections.find(
    (connection) => connection.connectionType === "organizational"
  );
  if (organizational) {
    return organizational;
  }

  const personal = activeConnections.find(
    (connection) =>
      connection.connectionType === "personal" && connection.userId === args.userId
  );
  if (personal) {
    return personal;
  }

  return activeConnections[0] || null;
}

async function decryptOptionalSecret(
  ctx: unknown,
  encrypted: string | undefined
): Promise<string | undefined> {
  if (!encrypted) {
    return undefined;
  }

  const decrypted = await (ctx as any).runAction(
    generatedApi.internal.oauth.encryption.decryptToken,
    { encrypted }
  );
  return normalizeOptionalString(decrypted);
}

async function resolveSlackOauthProfileForOrg(
  ctx: unknown,
  organizationId: Id<"organizations">
): Promise<{
  setupMode: SlackSetupMode;
  interactionMode: SlackInteractionMode;
  aiAppFeaturesEnabled: boolean;
  profileType: "platform" | "organization";
  clientId: string;
  clientSecretCandidates: string[];
  signingSecret?: string;
  signingSecretPrevious?: string;
  signingSecretCandidates: string[];
}> {
  const settingsObject = await getSlackSettingsObject(ctx, organizationId);
  const props = readSlackSettingsProps(settingsObject);
  const setupMode = normalizeSlackSetupMode(props.setupMode);
  const interactionMode = normalizeSlackInteractionMode(props.interactionMode);
  const aiAppFeaturesEnabled = normalizeSlackAiAppFeaturesEnabled(
    props.aiAppFeaturesEnabled
  );

  if (setupMode === "organization_byoa") {
    const byoaClientId = normalizeOptionalString(props.byoaClientId);
    const byoaClientSecret = await decryptOptionalSecret(
      ctx,
      normalizeOptionalString(props.byoaClientSecretEncrypted)
    );
    const byoaClientSecretPrevious = await decryptOptionalSecret(
      ctx,
      normalizeOptionalString(props.byoaClientSecretPreviousEncrypted)
    );
    const byoaSigningSecret = await decryptOptionalSecret(
      ctx,
      normalizeOptionalString(props.byoaSigningSecretEncrypted)
    );
    const byoaSigningSecretPrevious = await decryptOptionalSecret(
      ctx,
      normalizeOptionalString(props.byoaSigningSecretPreviousEncrypted)
    );

    const clientSecretCandidates = uniqueNonEmpty([
      byoaClientSecret,
      byoaClientSecretPrevious,
    ]);
    const signingSecretCandidates = uniqueNonEmpty([
      byoaSigningSecret,
      byoaSigningSecretPrevious,
    ]);

    if (!byoaClientId || clientSecretCandidates.length === 0 || signingSecretCandidates.length === 0) {
      throw new Error(
        "Slack BYOA setup is incomplete. Add client ID, client secret, and signing secret first."
      );
    }

    return {
      setupMode,
      interactionMode,
      aiAppFeaturesEnabled,
      profileType: "organization",
      clientId: byoaClientId,
      clientSecretCandidates,
      signingSecret: byoaSigningSecret,
      signingSecretPrevious: byoaSigningSecretPrevious,
      signingSecretCandidates,
    };
  }

  if (!SLACK_INTEGRATION_CONFIG.clientId || SLACK_INTEGRATION_CONFIG.clientSecretCandidates.length === 0) {
    throw new Error("Slack platform app credentials are not configured");
  }

  return {
    setupMode,
    interactionMode,
    aiAppFeaturesEnabled,
    profileType: "platform",
    clientId: SLACK_INTEGRATION_CONFIG.clientId,
    clientSecretCandidates: SLACK_INTEGRATION_CONFIG.clientSecretCandidates,
    signingSecret: SLACK_INTEGRATION_CONFIG.signingSecret,
    signingSecretPrevious: SLACK_INTEGRATION_CONFIG.signingSecretPrevious,
    signingSecretCandidates: SLACK_INTEGRATION_CONFIG.signingSecretCandidates,
  };
}

export function getMissingSlackScopes(
  grantedScopes: string[],
  requiredScopes: string[]
): string[] {
  const granted = new Set(grantedScopes);
  return requiredScopes.filter((scope) => !granted.has(scope));
}

function getSlackRedirectUri(): string {
  const apiBaseUrl =
    normalizeIntegrationBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeIntegrationBaseUrl(process.env.NEXT_PUBLIC_API_ENDPOINT_URL);

  if (!apiBaseUrl) {
    throw new Error(
      "Slack OAuth requires NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_API_ENDPOINT_URL"
    );
  }

  return resolveIntegrationEndpoints({
    provider: "slack",
    apiBaseUrl,
  }).oauthCallbackUrl;
}

export async function exchangeSlackToken(args: {
  code: string;
  redirectUri: string;
}, overrides?: {
  clientId?: string | null;
  clientSecretCandidates?: string[];
  fetchImpl?: typeof fetch;
}): Promise<Record<string, unknown>> {
  const clientId = overrides?.clientId ?? SLACK_INTEGRATION_CONFIG.clientId;
  const clientSecretCandidates = overrides?.clientSecretCandidates ?? SLACK_INTEGRATION_CONFIG.clientSecretCandidates;
  const fetchImpl = overrides?.fetchImpl ?? fetch;
  if (!clientId || clientSecretCandidates.length === 0) {
    throw new Error("Slack OAuth client credentials are not configured");
  }

  let lastError = "unknown_error";
  for (let index = 0; index < clientSecretCandidates.length; index += 1) {
    const clientSecret = clientSecretCandidates[index];
    const response = await fetchImpl(SLACK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: args.code,
        redirect_uri: args.redirectUri,
      }),
    });

    const responseText = await response.text();
    let tokenData: Record<string, unknown> = {};
    try {
      tokenData = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      tokenData = {};
    }

    if (response.ok && tokenData.ok === true) {
      return tokenData;
    }

    const slackError =
      typeof tokenData.error === "string" ? tokenData.error : undefined;
    lastError = slackError || `http_${response.status}`;
    const hasFallback = index < clientSecretCandidates.length - 1;
    const shouldTryFallback =
      hasFallback &&
      (slackError === "invalid_client" ||
        response.status === 401 ||
        response.status === 403);

    if (!shouldTryFallback) {
      throw new Error(`Slack OAuth error: ${lastError}`);
    }
  }

  throw new Error(`Slack OAuth error: ${lastError}`);
}

async function logSlackAuditEvent(
  ctx: unknown,
  args: {
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    action: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: args.userId,
      organizationId: args.organizationId,
      action: args.action,
      resource: "oauth_connections",
      success: args.success,
      errorMessage: args.errorMessage,
      metadata: {
        provider: "slack",
        ...(args.metadata || {}),
      },
    });
  } catch (error) {
    console.error("[Slack OAuth] Failed to write audit event", error);
  }
}

/**
 * Get Slack setup mode + BYOA readiness for current org.
 */
export const getSlackSetupConfig = query({
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

    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: user.defaultOrgId,
    });
    if (!canManage) {
      return null;
    }

    const settingsObject = await getSlackSettingsObject(ctx, user.defaultOrgId);
    const props = readSlackSettingsProps(settingsObject);
    const setupMode = normalizeSlackSetupMode(props.setupMode);
    const interactionMode = normalizeSlackInteractionMode(props.interactionMode);
    const aiAppFeaturesEnabled = normalizeSlackAiAppFeaturesEnabled(
      props.aiAppFeaturesEnabled
    );
    const byoaClientId = normalizeOptionalString(props.byoaClientId);
    const hasByoaClientSecret = Boolean(
      normalizeOptionalString(props.byoaClientSecretEncrypted)
    );
    const hasByoaSigningSecret = Boolean(
      normalizeOptionalString(props.byoaSigningSecretEncrypted)
    );
    const byoaConfigured = Boolean(
      byoaClientId && hasByoaClientSecret && hasByoaSigningSecret
    );

    const activeConnection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("provider", "slack")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    const activeMetadata = (activeConnection?.customProperties || {}) as Record<
      string,
      unknown
    >;
    const activeProfileType =
      normalizeProviderProfileType(activeConnection?.providerProfileType) ||
      normalizeProviderProfileType(activeMetadata.providerProfileType) ||
      normalizeProviderProfileType(activeMetadata.profileType);

    return {
      setupMode,
      interactionMode,
      aiAppFeaturesEnabled,
      canManageSettings: isSuperAdmin,
      canUsePlatformManaged: isSuperAdmin,
      byoa: {
        configured: byoaConfigured,
        clientId: byoaClientId,
        hasClientSecret: hasByoaClientSecret,
        hasSigningSecret: hasByoaSigningSecret,
      },
      activeConnectionProfileType: activeProfileType || null,
    };
  },
});

/**
 * Save Slack setup mode and optional BYOA credentials for current org.
 */
export const saveSlackSetupConfig = mutation({
  args: {
    sessionId: v.string(),
    setupMode: v.union(
      v.literal("platform_managed"),
      v.literal("organization_byoa")
    ),
    interactionMode: v.optional(
      v.union(v.literal("mentions_only"), v.literal("mentions_and_dm"))
    ),
    aiAppFeaturesEnabled: v.optional(v.boolean()),
    byoaClientId: v.optional(v.string()),
    byoaClientSecret: v.optional(v.string()),
    byoaSigningSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User not found");
    }
    const isSuperAdmin = await isUserSuperAdminByUserDoc(ctx, user);

    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: user.defaultOrgId,
    });
    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }
    if (!isSuperAdmin) {
      throw new Error("Permission denied: super_admin required to manage Slack settings");
    }

    const settingsObject = await getSlackSettingsObject(ctx, user.defaultOrgId);
    const existingProps = readSlackSettingsProps(settingsObject);
    const interactionMode = normalizeSlackInteractionMode(
      args.interactionMode ?? existingProps.interactionMode
    );
    const aiAppFeaturesEnabled = normalizeSlackAiAppFeaturesEnabled(
      args.aiAppFeaturesEnabled ?? existingProps.aiAppFeaturesEnabled
    );

    const providedClientId = normalizeOptionalString(args.byoaClientId);
    const providedClientSecret = normalizeOptionalString(args.byoaClientSecret);
    const providedSigningSecret = normalizeOptionalString(args.byoaSigningSecret);

    const byoaClientId =
      providedClientId || normalizeOptionalString(existingProps.byoaClientId);
    let byoaClientSecretEncrypted = normalizeOptionalString(
      existingProps.byoaClientSecretEncrypted
    );
    let byoaClientSecretPreviousEncrypted = normalizeOptionalString(
      existingProps.byoaClientSecretPreviousEncrypted
    );
    let byoaSigningSecretEncrypted = normalizeOptionalString(
      existingProps.byoaSigningSecretEncrypted
    );
    let byoaSigningSecretPreviousEncrypted = normalizeOptionalString(
      existingProps.byoaSigningSecretPreviousEncrypted
    );

    if (providedClientSecret) {
      if (byoaClientSecretEncrypted) {
        byoaClientSecretPreviousEncrypted = byoaClientSecretEncrypted;
      }
      byoaClientSecretEncrypted = await (ctx as any).runAction(
        generatedApi.internal.oauth.encryption.encryptToken,
        { plaintext: providedClientSecret }
      );
    }

    if (providedSigningSecret) {
      if (byoaSigningSecretEncrypted) {
        byoaSigningSecretPreviousEncrypted = byoaSigningSecretEncrypted;
      }
      byoaSigningSecretEncrypted = await (ctx as any).runAction(
        generatedApi.internal.oauth.encryption.encryptToken,
        { plaintext: providedSigningSecret }
      );
    }

    if (args.setupMode === "organization_byoa") {
      if (!byoaClientId || !byoaClientSecretEncrypted || !byoaSigningSecretEncrypted) {
        throw new Error(
          "Slack BYOA mode requires client ID, client secret, and signing secret."
        );
      }
    }

    const customProperties: Record<string, unknown> = {
      ...existingProps,
      setupMode: args.setupMode,
      interactionMode,
      aiAppFeaturesEnabled,
      byoaClientId: byoaClientId || undefined,
      byoaClientSecretEncrypted: byoaClientSecretEncrypted || undefined,
      byoaClientSecretPreviousEncrypted:
        byoaClientSecretPreviousEncrypted || undefined,
      byoaSigningSecretEncrypted: byoaSigningSecretEncrypted || undefined,
      byoaSigningSecretPreviousEncrypted:
        byoaSigningSecretPreviousEncrypted || undefined,
      updatedAt: Date.now(),
    };

    if (settingsObject && settingsObject._id) {
      await ctx.db.patch(settingsObject._id as Id<"objects">, {
        status: "active",
        customProperties,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("objects", {
        organizationId: user.defaultOrgId,
        type: SLACK_SETTINGS_OBJECT_TYPE,
        name: "Slack Setup Settings",
        status: "active",
        customProperties,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await logSlackAuditEvent(ctx, {
      userId: user._id,
      organizationId: user.defaultOrgId,
      action: "update_setup_mode",
      success: true,
      metadata: {
        setupMode: args.setupMode,
        interactionMode,
        aiAppFeaturesEnabled,
        byoaConfigured: Boolean(
          byoaClientId && byoaClientSecretEncrypted && byoaSigningSecretEncrypted
        ),
      },
    });

    return {
      success: true,
      setupMode: args.setupMode,
      interactionMode,
      aiAppFeaturesEnabled,
      byoaConfigured: Boolean(
        byoaClientId && byoaClientSecretEncrypted && byoaSigningSecretEncrypted
      ),
    };
  },
});

/**
 * Resolve owner-facing pharmacist vacation policy config + integration readiness.
 * Uses existing Slack + Google connection contracts and keeps org scope boundaries strict.
 */
export const getPharmacistVacationPolicyConfig = query({
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

    const canManagePolicy = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: user.defaultOrgId,
    });
    if (!canManagePolicy) {
      return null;
    }

    const settingsObject = await getSlackSettingsObject(ctx, user.defaultOrgId);
    const settingsProps = readSlackSettingsProps(settingsObject);
    const setupMode = normalizeSlackSetupMode(settingsProps.setupMode);
    const selectedProfileType = resolveSelectedSlackProfileType(setupMode);
    const activeSlackConnections = await listActiveSlackConnectionsForOrg(
      ctx,
      user.defaultOrgId
    );
    const selectedSlackConnection =
      activeSlackConnections.find(
        (connection) => resolveConnectionProfileType(connection) === selectedProfileType
      ) || null;

    const slackScope = selectedSlackConnection
      ? readSlackRouteScope(selectedSlackConnection)
      : {};
    const selectedSlackConnectionId = selectedSlackConnection
      ? String(selectedSlackConnection._id)
      : undefined;

    const allPolicies = await listVacationPoliciesForOrg(ctx, user.defaultOrgId);
    const activePolicies = allPolicies.filter(
      (policy) => normalizeOptionalString(policy.status) === "active"
    );
    const scopedPolicies =
      selectedSlackConnectionId || slackScope.teamId || slackScope.routeKey
        ? activePolicies.filter((policy) =>
            matchesSlackPolicyScope({
              policyObject: policy,
              slackConnectionId: selectedSlackConnectionId,
              teamId: slackScope.teamId,
              routeKey: slackScope.routeKey,
            })
          )
        : activePolicies;
    const selectedPolicy =
      scopedPolicies.sort((a, b) => {
        const updatedA = toNonNegativeInteger(a.updatedAt, 0);
        const updatedB = toNonNegativeInteger(b.updatedAt, 0);
        return updatedB - updatedA;
      })[0] || null;
    const selectedPolicyProps = (selectedPolicy?.customProperties ||
      {}) as Record<string, unknown>;

    const googleConnections = (await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("provider", "google")
      )
      .filter((q) => q.neq(q.field("status"), "revoked"))
      .collect()) as Array<Record<string, unknown>>;
    const googleWorkConnection = selectGoogleWorkConnection({
      connections: googleConnections,
      userId: user._id,
    });
    const googleWorkReadiness = resolveGoogleConnectionReadiness(googleWorkConnection);

    const selectedIntegrations = (selectedPolicyProps.integrations ||
      {}) as Record<string, unknown>;
    const selectedGoogleIntegration = (selectedIntegrations.googleCalendar ||
      {}) as Record<string, unknown>;
    const policyGoogleConnectionId = normalizeOptionalString(
      selectedGoogleIntegration.providerConnectionId
    );
    const effectiveGoogleConnectionId =
      policyGoogleConnectionId || (googleWorkReadiness.connectionId as string | null);
    const blockingSnapshot = await resolveConnectionBlockingCalendarIds(ctx, {
      organizationId: user.defaultOrgId,
      connectionId: effectiveGoogleConnectionId
        ? (effectiveGoogleConnectionId as Id<"oauthConnections">)
        : null,
    });
    const roleFloors = normalizeVacationRoleFloors(
      selectedPolicyProps.minOnDutyByRole
    );
    const pharmacistRoleFloor = resolvePharmacistRoleFloor(roleFloors);
    const requestWindow = (selectedPolicyProps.requestWindow ||
      {}) as Record<string, unknown>;
    const overrideAuthority = normalizeVacationOverrideAuthority(
      selectedPolicyProps.overrideAuthority
    );
    const policySlackIntegration = (selectedIntegrations.slack ||
      {}) as Record<string, unknown>;

    return {
      canManagePolicy,
      setupMode,
      selectedProfileType,
      slack: {
        connected: Boolean(selectedSlackConnection),
        providerConnectionId: selectedSlackConnectionId || null,
        workspaceName: slackScope.workspaceName || null,
        workspaceDomain: slackScope.workspaceDomain || null,
        teamId: slackScope.teamId || null,
        routeKey: slackScope.routeKey || null,
        channelId:
          normalizeOptionalString(policySlackIntegration.channelId) ||
          slackScope.channelId ||
          null,
      },
      googleCalendar: {
        work: googleWorkReadiness,
        effectiveConnectionId: effectiveGoogleConnectionId || null,
        blockingCalendarIds: normalizeStringArray(
          selectedGoogleIntegration.blockingCalendarIds
        ).length
          ? normalizeStringArray(selectedGoogleIntegration.blockingCalendarIds)
          : blockingSnapshot.blockingCalendarIds,
        pushCalendarId:
          normalizeOptionalString(selectedGoogleIntegration.pushCalendarId) ||
          blockingSnapshot.blockingCalendarIds[0] ||
          "primary",
      },
      policy: {
        exists: Boolean(selectedPolicy),
        objectId: selectedPolicy ? String(selectedPolicy._id) : null,
        status: normalizeOptionalString(selectedPolicy?.status) || null,
        timezone:
          normalizeOptionalString(selectedPolicyProps.timezone) ||
          DEFAULT_VACATION_TIMEZONE,
        maxConcurrentAway: toNonNegativeInteger(
          selectedPolicyProps.maxConcurrentAway,
          DEFAULT_VACATION_MAX_CONCURRENT_AWAY
        ),
        minOnDutyTotal: toNonNegativeInteger(
          selectedPolicyProps.minOnDutyTotal,
          DEFAULT_VACATION_MIN_ON_DUTY_TOTAL
        ),
        pharmacistRoleFloor,
        requestWindow: {
          minLeadDays: toNonNegativeInteger(
            requestWindow.minLeadDays,
            DEFAULT_VACATION_MIN_LEAD_DAYS
          ),
          maxFutureDays: toNonNegativeInteger(
            requestWindow.maxFutureDays,
            DEFAULT_VACATION_MAX_FUTURE_DAYS
          ),
        },
        blockedPeriods: normalizeVacationBlockedPeriods(
          selectedPolicyProps.blockedPeriods
        ),
        overrideAuthority: {
          requireReason: overrideAuthority.requireReason,
          requireOwnerApproval: overrideAuthority.requireOwnerApproval,
          allowedRoleIdsCount: overrideAuthority.allowedRoleIds.length,
          allowedUserIdsCount: overrideAuthority.allowedUserIds.length,
        },
        updatedAt:
          typeof selectedPolicyProps.updatedAt === "number"
            ? selectedPolicyProps.updatedAt
            : null,
      },
    };
  },
});

/**
 * Save owner-configured pharmacist vacation policy with route-safe integration bindings.
 * This mutates only org-local `vacation_policy` objects and fails closed when scope is missing.
 */
export const savePharmacistVacationPolicyConfig = mutation({
  args: {
    sessionId: v.string(),
    policyObjectId: v.optional(v.id("objects")),
    timezone: v.optional(v.string()),
    maxConcurrentAway: v.number(),
    minOnDutyTotal: v.number(),
    pharmacistRoleFloor: v.number(),
    requestWindowMinLeadDays: v.optional(v.number()),
    requestWindowMaxFutureDays: v.optional(v.number()),
    slackChannelId: v.optional(v.string()),
    googleBlockingCalendarIds: v.optional(v.array(v.string())),
    googlePushCalendarId: v.optional(v.string()),
    overrideRequireReason: v.optional(v.boolean()),
    overrideRequireOwnerApproval: v.optional(v.boolean()),
    blockedPeriods: v.optional(
      v.array(
        v.object({
          id: v.optional(v.string()),
          startDate: v.string(),
          endDate: v.string(),
          reason: v.optional(v.string()),
          recurrence: v.optional(v.union(v.literal("none"), v.literal("yearly"))),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User not found");
    }

    const canManagePolicy = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: user.defaultOrgId,
    });
    if (!canManagePolicy) {
      throw new Error("Permission denied: manage_integrations required");
    }

    const now = Date.now();
    const settingsObject = await getSlackSettingsObject(ctx, user.defaultOrgId);
    const settingsProps = readSlackSettingsProps(settingsObject);
    const setupMode = normalizeSlackSetupMode(settingsProps.setupMode);
    const selectedProfileType = resolveSelectedSlackProfileType(setupMode);
    const activeSlackConnections = await listActiveSlackConnectionsForOrg(
      ctx,
      user.defaultOrgId
    );
    const selectedSlackConnection =
      activeSlackConnections.find(
        (connection) => resolveConnectionProfileType(connection) === selectedProfileType
      ) || null;
    if (!selectedSlackConnection) {
      throw new Error(
        "Slack workspace connection is required before saving vacation policy."
      );
    }

    const slackScope = readSlackRouteScope(selectedSlackConnection);
    const selectedSlackConnectionId = String(selectedSlackConnection._id);
    if (!slackScope.teamId) {
      throw new Error(
        "Slack team scope is missing from the connected workspace. Reconnect Slack first."
      );
    }

    const googleConnections = (await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("provider", "google")
      )
      .filter((q) => q.neq(q.field("status"), "revoked"))
      .collect()) as Array<Record<string, unknown>>;
    const googleWorkConnection = selectGoogleWorkConnection({
      connections: googleConnections,
      userId: user._id,
    });
    const googleWorkReadiness = resolveGoogleConnectionReadiness(googleWorkConnection);
    if (!googleWorkReadiness.connectionId) {
      throw new Error(
        "Google Calendar connection is required before saving vacation policy."
      );
    }

    const blockingSnapshot = await resolveConnectionBlockingCalendarIds(ctx, {
      organizationId: user.defaultOrgId,
      connectionId: googleWorkReadiness.connectionId,
    });

    const policies = await listVacationPoliciesForOrg(ctx, user.defaultOrgId);
    const activePolicies = policies.filter(
      (policy) => normalizeOptionalString(policy.status) === "active"
    );
    const scopedPolicies = activePolicies.filter((policy) =>
      matchesSlackPolicyScope({
        policyObject: policy,
        slackConnectionId: selectedSlackConnectionId,
        teamId: slackScope.teamId,
        routeKey: slackScope.routeKey,
      })
    );

    let targetPolicy: Record<string, unknown> | null = null;
    if (args.policyObjectId) {
      targetPolicy =
        (await ctx.db.get(args.policyObjectId as Id<"objects">)) as
          | Record<string, unknown>
          | null;
      if (
        !targetPolicy ||
        targetPolicy.organizationId !== user.defaultOrgId ||
        targetPolicy.type !== VACATION_POLICY_OBJECT_TYPE
      ) {
        throw new Error("Vacation policy not found in this organization.");
      }
    } else {
      targetPolicy =
        scopedPolicies.sort((a, b) => {
          const updatedA = toNonNegativeInteger(a.updatedAt, 0);
          const updatedB = toNonNegativeInteger(b.updatedAt, 0);
          return updatedB - updatedA;
        })[0] || null;
    }

    const existingProps = (targetPolicy?.customProperties ||
      {}) as Record<string, unknown>;
    const existingIntegrations = (existingProps.integrations ||
      {}) as Record<string, unknown>;
    const existingSlackIntegration = (existingIntegrations.slack ||
      {}) as Record<string, unknown>;
    const existingGoogleIntegration = (existingIntegrations.googleCalendar ||
      {}) as Record<string, unknown>;
    const existingConflictResolution = (existingProps.conflictResolution ||
      {}) as Record<string, unknown>;
    const existingRoleFloors = normalizeVacationRoleFloors(
      existingProps.minOnDutyByRole
    ).filter((floor) => floor.roleTag !== VACATION_ROLE_TAG_PHARMACIST);
    const pharmacistRoleFloor = toNonNegativeInteger(
      args.pharmacistRoleFloor,
      DEFAULT_VACATION_PHARMACIST_ROLE_FLOOR
    );
    const minOnDutyByRole = [
      ...existingRoleFloors,
      { roleTag: VACATION_ROLE_TAG_PHARMACIST, minOnDuty: pharmacistRoleFloor },
    ];

    const minOnDutyTotal = toNonNegativeInteger(
      args.minOnDutyTotal,
      DEFAULT_VACATION_MIN_ON_DUTY_TOTAL
    );
    const maxConcurrentAway = toNonNegativeInteger(
      args.maxConcurrentAway,
      DEFAULT_VACATION_MAX_CONCURRENT_AWAY
    );
    const existingRequestWindow = (existingProps.requestWindow ||
      {}) as Record<string, unknown>;
    const requestWindow = {
      minLeadDays: toNonNegativeInteger(
        args.requestWindowMinLeadDays,
        toNonNegativeInteger(
          existingRequestWindow.minLeadDays,
          DEFAULT_VACATION_MIN_LEAD_DAYS
        )
      ),
      maxFutureDays: toNonNegativeInteger(
        args.requestWindowMaxFutureDays,
        toNonNegativeInteger(
          existingRequestWindow.maxFutureDays,
          DEFAULT_VACATION_MAX_FUTURE_DAYS
        )
      ),
    };

    const blockedPeriods =
      args.blockedPeriods !== undefined
        ? normalizeVacationBlockedPeriods(args.blockedPeriods)
        : normalizeVacationBlockedPeriods(existingProps.blockedPeriods);
    const overrideAuthority = normalizeVacationOverrideAuthority(
      existingProps.overrideAuthority
    );
    const overrideAllowedUserIds = Array.from(
      new Set([String(user._id), ...overrideAuthority.allowedUserIds])
    );
    const googleBlockingCalendarIds = normalizeStringArray(
      args.googleBlockingCalendarIds
    );
    const effectiveBlockingCalendarIds =
      googleBlockingCalendarIds.length > 0
        ? googleBlockingCalendarIds
        : normalizeStringArray(existingGoogleIntegration.blockingCalendarIds).length > 0
          ? normalizeStringArray(existingGoogleIntegration.blockingCalendarIds)
          : blockingSnapshot.blockingCalendarIds;
    const effectivePushCalendarId =
      normalizeOptionalString(args.googlePushCalendarId) ||
      normalizeOptionalString(existingGoogleIntegration.pushCalendarId) ||
      effectiveBlockingCalendarIds[0] ||
      "primary";
    const slackChannelId =
      normalizeOptionalString(args.slackChannelId) ||
      normalizeOptionalString(existingSlackIntegration.channelId) ||
      slackScope.channelId;

    const staffingBaseline = {
      ...((existingProps.staffingBaseline || {}) as Record<string, unknown>),
      totalStaffCount: toNonNegativeInteger(
        (existingProps.staffingBaseline as Record<string, unknown> | undefined)
          ?.totalStaffCount,
        Math.max(minOnDutyTotal + 1, pharmacistRoleFloor + 1)
      ),
      byRole: {
        ...((((existingProps.staffingBaseline || {}) as Record<string, unknown>)
          .byRole || {}) as Record<string, unknown>),
        [VACATION_ROLE_TAG_PHARMACIST]: Math.max(pharmacistRoleFloor + 1, 1),
      },
    };

    const customProperties: Record<string, unknown> = {
      ...existingProps,
      policyVersion: 1,
      ownerUserId:
        normalizeOptionalString(existingProps.ownerUserId) || String(user._id),
      timezone:
        normalizeOptionalString(args.timezone) ||
        normalizeOptionalString(existingProps.timezone) ||
        DEFAULT_VACATION_TIMEZONE,
      maxConcurrentAway,
      minOnDutyTotal,
      minOnDutyByRole,
      blockedPeriods,
      requestWindow,
      overrideAuthority: {
        allowedRoleIds: overrideAuthority.allowedRoleIds,
        allowedUserIds: overrideAllowedUserIds,
        requireReason:
          args.overrideRequireReason ?? overrideAuthority.requireReason ?? true,
        requireOwnerApproval:
          args.overrideRequireOwnerApproval ??
          overrideAuthority.requireOwnerApproval ??
          false,
      },
      conflictResolution: {
        maxAlternativeWindows: toNonNegativeInteger(
          existingConflictResolution.maxAlternativeWindows,
          DEFAULT_VACATION_ALTERNATIVE_WINDOWS
        ),
        alternativeWindowDays: toNonNegativeInteger(
          existingConflictResolution.alternativeWindowDays,
          DEFAULT_VACATION_ALTERNATIVE_WINDOW_DAYS
        ),
        requireDirectColleagueDiscussion:
          existingConflictResolution.requireDirectColleagueDiscussion !== false,
        colleagueDiscussionTemplate:
          normalizeOptionalString(existingConflictResolution.colleagueDiscussionTemplate) ||
          "Please coordinate directly with a colleague to rebalance coverage before resubmitting.",
      },
      integrations: {
        ...existingIntegrations,
        slack: {
          ...existingSlackIntegration,
          providerConnectionId: selectedSlackConnectionId,
          teamId: slackScope.teamId,
          channelId: slackChannelId,
          routeKey: slackScope.routeKey,
        },
        googleCalendar: {
          ...existingGoogleIntegration,
          providerConnectionId: String(googleWorkReadiness.connectionId),
          blockingCalendarIds: effectiveBlockingCalendarIds,
          pushCalendarId: effectivePushCalendarId,
        },
      },
      staffingBaseline,
      updatedAt: now,
      updatedBy: String(user._id),
    };

    let policyObjectId: Id<"objects">;
    if (targetPolicy) {
      policyObjectId = targetPolicy._id as Id<"objects">;
      await ctx.db.patch(policyObjectId, {
        status: "active",
        subtype: VACATION_POLICY_SUBTYPE,
        customProperties,
        updatedAt: now,
      } as never);
    } else {
      policyObjectId = await ctx.db.insert("objects", {
        organizationId: user.defaultOrgId,
        type: VACATION_POLICY_OBJECT_TYPE,
        subtype: VACATION_POLICY_SUBTYPE,
        name: `Pharmacist Vacation Policy (${slackScope.workspaceName || slackScope.teamId})`,
        status: "active",
        customProperties,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Ensure deterministic single-active-policy behavior for the same Slack scope.
    for (const policy of scopedPolicies) {
      if (String(policy._id) === String(policyObjectId)) {
        continue;
      }
      await ctx.db.patch(policy._id as Id<"objects">, {
        status: "archived",
        updatedAt: now,
      } as never);
    }

    await logSlackAuditEvent(ctx, {
      userId: user._id,
      organizationId: user.defaultOrgId,
      action: "save_pharmacist_vacation_policy",
      success: true,
      metadata: {
        policyObjectId,
        maxConcurrentAway,
        minOnDutyTotal,
        pharmacistRoleFloor,
        blockedPeriodCount: blockedPeriods.length,
        slackTeamId: slackScope.teamId,
        slackRouteKey: slackScope.routeKey,
        googleConnectionId: googleWorkReadiness.connectionId,
        calendarWriteReady: googleWorkReadiness.calendarWriteReady,
      },
    });

    return {
      success: true,
      policyObjectId,
      maxConcurrentAway,
      minOnDutyTotal,
      pharmacistRoleFloor,
      blockedPeriodCount: blockedPeriods.length,
      calendarWriteReady: googleWorkReadiness.calendarWriteReady,
    };
  },
});

/**
 * Generate Slack OAuth authorization URL.
 */
export const initiateSlackOAuth = mutation({
  args: {
    sessionId: v.string(),
    connectionType: v.optional(
      v.union(v.literal("personal"), v.literal("organizational"))
    ),
    returnUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.defaultOrgId) {
      throw new Error("User must belong to an organization");
    }

    const connectionType = args.connectionType ?? "organizational";
    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: user.defaultOrgId,
    });
    if (!canManage) {
      await logSlackAuditEvent(ctx, {
        userId: user._id,
        organizationId: user.defaultOrgId,
        action: "initiate_oauth",
        success: false,
        errorMessage: "Permission denied: manage_integrations required",
        metadata: { connectionType },
      });
      throw new Error("Permission denied: manage_integrations required");
    }

    const oauthProfile = await resolveSlackOauthProfileForOrg(
      ctx,
      user.defaultOrgId
    );
    const state = crypto.randomUUID();
    await ctx.db.insert("oauthStates", {
      state,
      userId: user._id,
      organizationId: user.defaultOrgId,
      connectionType,
      provider: "slack",
      returnUrl: args.returnUrl,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const redirectUri = getSlackRedirectUri();
    const requestedScopes = getSlackRequestedScopes(
      SLACK_INTEGRATION_CONFIG.slashCommandsEnabled,
      oauthProfile.interactionMode,
      oauthProfile.aiAppFeaturesEnabled
    );
    const params = new URLSearchParams({
      client_id: oauthProfile.clientId,
      scope: requestedScopes.join(","),
      redirect_uri: redirectUri,
      state,
    });

    await logSlackAuditEvent(ctx, {
      userId: user._id,
      organizationId: user.defaultOrgId,
      action: "initiate_oauth",
      success: true,
      metadata: {
        connectionType,
        requestedScopes,
        setupMode: oauthProfile.setupMode,
        interactionMode: oauthProfile.interactionMode,
        aiAppFeaturesEnabled: oauthProfile.aiAppFeaturesEnabled,
        providerProfileType: oauthProfile.profileType,
      },
    });

    return {
      authUrl: `${SLACK_AUTH_URL}?${params.toString()}`,
      state,
      message: "Redirect user to authUrl to begin OAuth flow",
    };
  },
});

/**
 * Handle OAuth callback after user grants permission.
 */
export const handleSlackCallback = action({
  args: {
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    connectionId: Id<"oauthConnections">;
    workspaceName: string;
    returnUrl?: string;
  }> => {
    const stateRecord: {
      userId: Id<"users">;
      organizationId: Id<"organizations">;
      connectionType: "personal" | "organizational";
      returnUrl?: string;
    } | null = await (ctx as any).runQuery(generatedApi.internal.oauth.slack.verifyState, {
      state: args.state,
    });

    if (!stateRecord) {
      throw new Error("Invalid state token - possible CSRF attack");
    }

    const oauthProfile = await resolveSlackOauthProfileForOrg(
      ctx,
      stateRecord.organizationId
    );

    const redirectUri = getSlackRedirectUri();
    let tokenData: Record<string, unknown>;
    try {
      tokenData = await exchangeSlackToken({
        code: args.code,
        redirectUri,
      }, {
        clientId: oauthProfile.clientId,
        clientSecretCandidates: oauthProfile.clientSecretCandidates,
      });
    } catch (error) {
      await logSlackAuditEvent(ctx, {
        userId: stateRecord.userId,
        organizationId: stateRecord.organizationId,
        action: "connect_oauth",
        success: false,
        errorMessage: String(error),
        metadata: {
          phase: "token_exchange",
          setupMode: oauthProfile.setupMode,
          interactionMode: oauthProfile.interactionMode,
          aiAppFeaturesEnabled: oauthProfile.aiAppFeaturesEnabled,
          providerProfileType: oauthProfile.profileType,
        },
      });
      throw error;
    }

    const team = (tokenData.team || {}) as Record<string, unknown>;
    const authedUser = (tokenData.authed_user || {}) as Record<string, unknown>;
    const incomingWebhook = (tokenData.incoming_webhook || {}) as Record<string, unknown>;
    const teamId = typeof team.id === "string" ? team.id : "";
    const teamName = typeof team.name === "string" ? team.name : "Slack Workspace";
    if (!teamId) {
      throw new Error("Slack OAuth response missing team ID");
    }

    const accessToken =
      typeof tokenData.access_token === "string" ? tokenData.access_token : "";
    if (!accessToken) {
      throw new Error("Slack OAuth response missing bot access token");
    }

    const requiredScopes = getSlackRequestedScopes(
      SLACK_INTEGRATION_CONFIG.slashCommandsEnabled,
      oauthProfile.interactionMode,
      oauthProfile.aiAppFeaturesEnabled
    );
    const grantedScopes = Array.from(
      new Set([
        ...parseScopeList(tokenData.scope),
        ...parseScopeList(authedUser.scope),
      ])
    );
    const missingScopes = getMissingSlackScopes(grantedScopes, requiredScopes);
    if (missingScopes.length > 0) {
      await logSlackAuditEvent(ctx, {
        userId: stateRecord.userId,
        organizationId: stateRecord.organizationId,
        action: "connect_oauth",
        success: false,
        errorMessage: "Slack OAuth missing required scopes",
        metadata: {
          phase: "scope_validation",
          missingScopes,
          requiredScopes,
          grantedScopes,
        },
      });
      throw new Error(
        `Slack OAuth missing required scopes: ${missingScopes.join(", ")}`
      );
    }

    const scopes = Array.from(
      new Set(grantedScopes)
    );

    const workspaceIdentifier = normalizeWorkspaceIdentifier(teamName, teamId);
    const providerEmail = `${workspaceIdentifier}@slack.workspace`;
    const tokenExpiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
    const providerInstallationId = teamId;
    const appId =
      typeof tokenData.app_id === "string"
        ? tokenData.app_id
        : undefined;
    const providerProfileId =
      appId
        ? `${oauthProfile.profileType}:slack_app:${appId}`
        : oauthProfile.profileType === "organization"
          ? `organization:slack_app:${stateRecord.organizationId}`
          : "platform:slack_app:default";
    const providerProfileType = oauthProfile.profileType;
    const providerRouteKey = `slack:${providerInstallationId}`;

    const encryptedAccessToken = await (ctx as any).runAction(
      generatedApi.internal.oauth.encryption.encryptToken,
      { plaintext: accessToken }
    );
    const encryptedRefreshToken = encryptedAccessToken;

    const metadata = {
      teamName,
      teamDomain:
        typeof team.domain === "string" ? team.domain : undefined,
      appId,
      setupMode: oauthProfile.setupMode,
      interactionMode: oauthProfile.interactionMode,
      aiAppFeaturesEnabled: oauthProfile.aiAppFeaturesEnabled,
      slackSigningSecret: oauthProfile.signingSecret,
      slackSigningSecretPrevious: oauthProfile.signingSecretPrevious,
      slackSigningSecretCandidates: oauthProfile.signingSecretCandidates,
      botUserId:
        typeof tokenData.bot_user_id === "string"
          ? tokenData.bot_user_id
          : undefined,
      authedUserId:
        typeof authedUser.id === "string"
          ? authedUser.id
          : undefined,
      incomingWebhookChannelId:
        typeof incomingWebhook.channel_id === "string"
          ? incomingWebhook.channel_id
          : undefined,
      incomingWebhookChannel:
        typeof incomingWebhook.channel === "string"
          ? incomingWebhook.channel
          : undefined,
      incomingWebhookUrl:
        typeof incomingWebhook.url === "string"
          ? incomingWebhook.url
          : undefined,
      installationId: providerInstallationId,
      appProfileId: providerProfileId,
      profileType: providerProfileType,
      routeKey: providerRouteKey,
      providerInstallationId,
      providerProfileId,
      providerProfileType,
      providerRouteKey,
    };

    const connectionId: Id<"oauthConnections"> = await (ctx as any).runMutation(
      generatedApi.internal.oauth.slack.storeConnection,
      {
        userId: stateRecord.connectionType === "personal" ? stateRecord.userId : undefined,
        organizationId: stateRecord.organizationId,
        providerAccountId: teamId,
        providerEmail,
        connectionType: stateRecord.connectionType,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        scopes,
        metadata,
        providerInstallationId,
        providerProfileId,
        providerProfileType,
        providerRouteKey,
      }
    );

    await (ctx as any).runMutation(generatedApi.internal.oauth.slack.deleteState, {
      state: args.state,
    });

    await logSlackAuditEvent(ctx, {
      userId: stateRecord.userId,
      organizationId: stateRecord.organizationId,
      action: "connect_oauth",
      success: true,
      metadata: {
        teamId,
        teamName,
        connectionType: stateRecord.connectionType,
        setupMode: oauthProfile.setupMode,
        interactionMode: oauthProfile.interactionMode,
        aiAppFeaturesEnabled: oauthProfile.aiAppFeaturesEnabled,
        providerProfileType,
        requiredScopes,
        grantedScopes: scopes,
      },
    });

    return {
      success: true,
      connectionId,
      workspaceName: teamName,
      returnUrl: stateRecord.returnUrl,
    };
  },
});

/**
 * Disconnect Slack OAuth connection.
 */
export const disconnectSlack = mutation({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }
    if (connection.provider !== "slack") {
      throw new Error("Not a Slack connection");
    }

    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: connection.organizationId,
    });
    if (!canManage) {
      await logSlackAuditEvent(ctx, {
        userId: user._id,
        organizationId: connection.organizationId,
        action: "disconnect_oauth",
        success: false,
        errorMessage: "Permission denied: manage_integrations required",
        metadata: {
          teamId: connection.providerAccountId,
        },
      });
      throw new Error("Permission denied: manage_integrations required");
    }

    await ctx.db.patch(args.connectionId, {
      status: "revoked",
      updatedAt: Date.now(),
    });

    await logSlackAuditEvent(ctx, {
      userId: user._id,
      organizationId: connection.organizationId,
      action: "disconnect_oauth",
      success: true,
      metadata: {
        teamId: connection.providerAccountId,
      },
    });

    return { success: true };
  },
});

/**
 * Get Slack connection status for current organization context.
 */
export const getSlackConnectionStatus = query({
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

    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: user.defaultOrgId,
    });
    if (!canManage) {
      return null;
    }

    const settingsObject = await getSlackSettingsObject(ctx, user.defaultOrgId);
    const settingsProps = readSlackSettingsProps(settingsObject);
    const setupMode = normalizeSlackSetupMode(settingsProps.setupMode);
    const interactionMode = normalizeSlackInteractionMode(
      settingsProps.interactionMode
    );
    const aiAppFeaturesEnabled = normalizeSlackAiAppFeaturesEnabled(
      settingsProps.aiAppFeaturesEnabled
    );
    const requiredScopes = getSlackRequestedScopes(
      SLACK_INTEGRATION_CONFIG.slashCommandsEnabled,
      interactionMode,
      aiAppFeaturesEnabled
    );
    const selectedProfileType = resolveSelectedSlackProfileType(setupMode);
    const activeConnections = await listActiveSlackConnectionsForOrg(
      ctx,
      user.defaultOrgId
    );

    const platformConnection =
      activeConnections.find(
        (connection) =>
          resolveConnectionProfileType(connection) ===
          "platform"
      ) || null;
    const organizationConnection =
      activeConnections.find(
        (connection) =>
          resolveConnectionProfileType(connection) ===
          "organization"
      ) || null;

    const selectedConnection =
      selectedProfileType === "organization"
        ? organizationConnection
        : platformConnection;

    if (!selectedConnection) {
      return {
        connected: false,
        requiredScopes,
        canManageSettings: isSuperAdmin,
        canUsePlatformManaged: isSuperAdmin,
        interactionMode,
        aiAppFeaturesEnabled,
        selectedProfileType,
        profiles: {
          platform: {
            connected: Boolean(platformConnection),
          },
          organization: {
            connected: Boolean(organizationConnection),
          },
        },
        connection: null,
      };
    }

    const metadata = (selectedConnection.customProperties || {}) as Record<
      string,
      unknown
    >;
    const resolvedProfileType = resolveConnectionProfileType(selectedConnection);
    const isExpiringSoon =
      toNonNegativeInteger(selectedConnection.tokenExpiresAt, 0) <
      Date.now() + 7 * 24 * 60 * 60 * 1000;

    return {
      connected: true,
      isExpiringSoon,
      requiredScopes,
      canManageSettings: isSuperAdmin,
      canUsePlatformManaged: isSuperAdmin,
      interactionMode,
      aiAppFeaturesEnabled,
      selectedProfileType,
      profiles: {
        platform: {
          connected: Boolean(platformConnection),
        },
        organization: {
          connected: Boolean(organizationConnection),
        },
      },
      connection: {
        id: selectedConnection._id,
        providerEmail: selectedConnection.providerEmail,
        workspaceId: selectedConnection.providerAccountId,
        workspaceName: metadata.teamName as string | undefined,
        workspaceDomain: metadata.teamDomain as string | undefined,
        botUserId: metadata.botUserId as string | undefined,
        appId: metadata.appId as string | undefined,
        setupMode: normalizeSlackSetupMode(metadata.setupMode),
        interactionMode: normalizeSlackInteractionMode(
          metadata.interactionMode ?? interactionMode
        ),
        aiAppFeaturesEnabled: normalizeSlackAiAppFeaturesEnabled(
          metadata.aiAppFeaturesEnabled ?? aiAppFeaturesEnabled
        ),
        profileType: resolvedProfileType,
        scopes: selectedConnection.scopes,
        connectedAt: selectedConnection.connectedAt,
        tokenExpiresAt: selectedConnection.tokenExpiresAt,
        status: selectedConnection.status,
      },
    };
  },
});

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

export const getSlackSettingsObjectInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", SLACK_SETTINGS_OBJECT_TYPE)
      )
      .first();
  },
});

export const verifyState = internalQuery({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    connectionType: "personal" | "organizational";
    returnUrl?: string;
  } | null> => {
    const stateRecord = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!stateRecord) return null;
    if (stateRecord.expiresAt < Date.now()) return null;
    if (stateRecord.provider !== "slack") return null;

    return {
      userId: stateRecord.userId,
      organizationId: stateRecord.organizationId,
      connectionType: stateRecord.connectionType,
      returnUrl: stateRecord.returnUrl,
    };
  },
});

export const storeConnection = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    organizationId: v.id("organizations"),
    providerAccountId: v.string(),
    providerEmail: v.string(),
    connectionType: v.union(v.literal("personal"), v.literal("organizational")),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    metadata: v.optional(v.any()),
    providerInstallationId: v.optional(v.string()),
    providerProfileId: v.optional(v.string()),
    providerProfileType: v.optional(
      v.union(v.literal("platform"), v.literal("organization"))
    ),
    providerRouteKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const metadataRecord = (args.metadata || {}) as Record<string, unknown>;
    const providerInstallationId =
      normalizeOptionalString(args.providerInstallationId) ||
      normalizeOptionalString(metadataRecord.providerInstallationId) ||
      normalizeOptionalString(metadataRecord.installationId) ||
      args.providerAccountId;
    const providerProfileType =
      normalizeProviderProfileType(args.providerProfileType) ||
      normalizeProviderProfileType(metadataRecord.providerProfileType) ||
      normalizeProviderProfileType(metadataRecord.profileType) ||
      "organization";
    const providerProfileId =
      normalizeOptionalString(args.providerProfileId) ||
      normalizeOptionalString(metadataRecord.providerProfileId) ||
      normalizeOptionalString(metadataRecord.appProfileId) ||
      `${providerProfileType}:slack_app:default`;
    const providerRouteKey =
      normalizeOptionalString(args.providerRouteKey) ||
      normalizeOptionalString(metadataRecord.providerRouteKey) ||
      normalizeOptionalString(metadataRecord.routeKey) ||
      `slack:${providerInstallationId}`;
    const metadata: Record<string, unknown> = {
      ...metadataRecord,
      installationId: providerInstallationId,
      appProfileId: providerProfileId,
      profileType: providerProfileType,
      routeKey: providerRouteKey,
      providerInstallationId,
      providerProfileId,
      providerProfileType,
      providerRouteKey,
    };

    const orgConnections = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "slack")
      )
      .collect();

    const resolveConnectionProfileType = (
      connection: Record<string, unknown>
    ): "platform" | "organization" => {
      const connectionMetadata = (connection.customProperties || {}) as Record<
        string,
        unknown
      >;
      return (
        normalizeProviderProfileType(connection.providerProfileType) ||
        normalizeProviderProfileType(connectionMetadata.providerProfileType) ||
        normalizeProviderProfileType(connectionMetadata.profileType) ||
        "organization"
      );
    };

    const scopedConnections = orgConnections.filter((connection) => {
      const connectionRecord = connection as unknown as Record<string, unknown>;
      return resolveConnectionProfileType(connectionRecord) === providerProfileType;
    });

    const existingConnection =
      scopedConnections.find(
        (connection) => connection.providerAccountId === args.providerAccountId
      ) ||
      (args.userId
        ? scopedConnections.find((connection) => connection.userId === args.userId)
        : null) ||
      scopedConnections[0] ||
      null;

    if (existingConnection) {
      await ctx.db.patch(existingConnection._id, {
        userId: args.userId,
        providerAccountId: args.providerAccountId,
        providerEmail: args.providerEmail,
        connectionType: args.connectionType,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        status: "active",
        providerInstallationId,
        providerProfileId,
        providerProfileType,
        providerRouteKey,
        customProperties: metadata,
        lastSyncError: undefined,
        lastSyncAt: Date.now(),
        updatedAt: Date.now(),
      } as never);
      return existingConnection._id;
    }

    return await ctx.db.insert("oauthConnections", {
      userId: args.userId,
      organizationId: args.organizationId,
      provider: "slack",
      providerAccountId: args.providerAccountId,
      providerEmail: args.providerEmail,
      connectionType: args.connectionType,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      providerInstallationId,
      providerProfileId,
      providerProfileType,
      providerRouteKey,
      scopes: args.scopes,
      syncSettings: {
        email: false,
        calendar: false,
        oneDrive: false,
        sharePoint: false,
      },
      status: "active",
      connectedAt: Date.now(),
      updatedAt: Date.now(),
      lastSyncAt: Date.now(),
      customProperties: metadata,
    } as never);
  },
});

export const deleteState = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const stateRecord = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (stateRecord) {
      await ctx.db.delete(stateRecord._id);
    }
  },
});

export const getConnection = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "slack")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});
