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

const generatedApi: any = require("../_generated/api");

const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

const SLACK_BASE_SCOPES = [
  "app_mentions:read",
  "channels:history",
  "channels:read",
  "chat:write",
];

export function getSlackRequestedScopes(
  slashCommandsEnabled = SLACK_INTEGRATION_CONFIG.slashCommandsEnabled
): string[] {
  return slashCommandsEnabled
    ? [...SLACK_BASE_SCOPES, "commands"]
    : [...SLACK_BASE_SCOPES];
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

function normalizeProviderProfileType(
  value: unknown
): "platform" | "organization" | undefined {
  return value === "platform" || value === "organization" ? value : undefined;
}

export function getMissingSlackScopes(
  grantedScopes: string[],
  requiredScopes: string[]
): string[] {
  const granted = new Set(grantedScopes);
  return requiredScopes.filter((scope) => !granted.has(scope));
}

function getSlackRedirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/slack/callback`;
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
    const requestedScopes = getSlackRequestedScopes();
    const params = new URLSearchParams({
      client_id: SLACK_INTEGRATION_CONFIG.clientId || "",
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

    const redirectUri = getSlackRedirectUri();
    let tokenData: Record<string, unknown>;
    try {
      tokenData = await exchangeSlackToken({
        code: args.code,
        redirectUri,
      });
    } catch (error) {
      await logSlackAuditEvent(ctx, {
        userId: stateRecord.userId,
        organizationId: stateRecord.organizationId,
        action: "connect_oauth",
        success: false,
        errorMessage: String(error),
        metadata: { phase: "token_exchange" },
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

    const requiredScopes = getSlackRequestedScopes();
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
    const providerProfileId =
      typeof tokenData.app_id === "string"
        ? `slack_app:${tokenData.app_id}`
        : "slack_app:organization_default";
    const providerProfileType =
      SLACK_INTEGRATION_CONFIG.signingSecretCandidates.length > 0
        ? ("platform" as const)
        : ("organization" as const);
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
      appId:
        typeof tokenData.app_id === "string" ? tokenData.app_id : undefined,
      slackSigningSecret: SLACK_INTEGRATION_CONFIG.signingSecret,
      slackSigningSecretPrevious: SLACK_INTEGRATION_CONFIG.signingSecretPrevious,
      slackSigningSecretCandidates: SLACK_INTEGRATION_CONFIG.signingSecretCandidates,
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

    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: user.defaultOrgId,
    });
    if (!canManage) {
      return null;
    }

    const requiredScopes = getSlackRequestedScopes();
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("provider", "slack")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!connection) {
      return {
        connected: false,
        requiredScopes,
        connection: null,
      };
    }

    const metadata = (connection.customProperties || {}) as Record<string, unknown>;
    const isExpiringSoon = connection.tokenExpiresAt < Date.now() + 7 * 24 * 60 * 60 * 1000;

    return {
      connected: true,
      isExpiringSoon,
      requiredScopes,
      connection: {
        id: connection._id,
        providerEmail: connection.providerEmail,
        workspaceId: connection.providerAccountId,
        workspaceName: metadata.teamName as string | undefined,
        workspaceDomain: metadata.teamDomain as string | undefined,
        botUserId: metadata.botUserId as string | undefined,
        appId: metadata.appId as string | undefined,
        scopes: connection.scopes,
        connectedAt: connection.connectedAt,
        tokenExpiresAt: connection.tokenExpiresAt,
        status: connection.status,
      },
    };
  },
});

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

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
    const providerProfileId =
      normalizeOptionalString(args.providerProfileId) ||
      normalizeOptionalString(metadataRecord.providerProfileId) ||
      normalizeOptionalString(metadataRecord.appProfileId) ||
      "slack_app:organization_default";
    const providerProfileType =
      normalizeProviderProfileType(args.providerProfileType) ||
      normalizeProviderProfileType(metadataRecord.providerProfileType) ||
      normalizeProviderProfileType(metadataRecord.profileType) ||
      "organization";
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

    let existingConnection = null;

    if (args.userId) {
      existingConnection = await ctx.db
        .query("oauthConnections")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", args.userId).eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("provider"), "slack"))
        .first();
    }

    if (!existingConnection) {
      existingConnection = await ctx.db
        .query("oauthConnections")
        .withIndex("by_org_and_provider", (q) =>
          q.eq("organizationId", args.organizationId).eq("provider", "slack")
        )
        .first();
    }

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
