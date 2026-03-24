/**
 * FRONTEND OIDC INTEGRATION
 *
 * Reusable per-organization OIDC settings for frontend portals.
 * Storage model:
 * - objects.type = "integration_settings"
 * - objects.subtype = "frontend_oidc"
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkPermission, requireAuthenticatedUser } from "./rbacHelpers";
import type { Id } from "./_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("./_generated/api");

const FRONTEND_OIDC_SETTINGS_TYPE = "integration_settings";
const FRONTEND_OIDC_SETTINGS_SUBTYPE = "frontend_oidc";
const DEFAULT_PROVIDER_ID = "frontend_oidc";
const DEFAULT_PROVIDER_NAME = "Organization OIDC";
const CLIENT_SECRET_ENCRYPTED_KEY = "clientSecretEncrypted";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeProviderId(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, unknown>;
}

function hasUsableOidcEndpoints(config: {
  issuer: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
}): boolean {
  if (config.issuer) {
    return true;
  }
  return Boolean(config.authorizationUrl && config.tokenUrl && config.userinfoUrl);
}

function setOptionalStringProp(
  props: Record<string, unknown>,
  key: string,
  value: string | undefined
): void {
  if (value === undefined) {
    return;
  }

  const normalized = normalizeOptionalString(value);
  if (normalized) {
    props[key] = normalized;
    return;
  }

  delete props[key];
}

function ensureEncryptedFieldMarker(
  props: Record<string, unknown>,
  fieldName: string
): void {
  const existing = Array.isArray(props.encryptedFields)
    ? (props.encryptedFields as unknown[])
    : [];
  const normalized = existing
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .filter((item) => item !== fieldName);

  props.encryptedFields = [...normalized, fieldName];
}

async function resolveAuthorizedOrganizationId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    sessionId: string;
    organizationId?: Id<"organizations">;
  }
): Promise<{ userId: Id<"users">; organizationId: Id<"organizations"> }> {
  const { userId, organizationId: sessionOrganizationId } =
    await requireAuthenticatedUser(ctx, args.sessionId);
  const organizationId = args.organizationId || sessionOrganizationId;

  const canManageIntegrations = await checkPermission(
    ctx,
    userId,
    "manage_integrations",
    organizationId
  );

  if (!canManageIntegrations) {
    throw new Error("Permission denied: manage_integrations required");
  }

  return { userId, organizationId };
}

/**
 * Read frontend OIDC integration settings for admin UI.
 * Secret material is never returned.
 */
export const getFrontendOidcIntegration = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await resolveAuthorizedOrganizationId(ctx, args);

    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("type", FRONTEND_OIDC_SETTINGS_TYPE)
      )
      .filter((q) => q.eq(q.field("subtype"), FRONTEND_OIDC_SETTINGS_SUBTYPE))
      .first();

    if (!settings) {
      return {
        configured: false,
        enabled: false,
        providerId: DEFAULT_PROVIDER_ID,
        providerName: DEFAULT_PROVIDER_NAME,
        clientId: null,
        hasClientSecret: false,
        clientSecretHint: null,
        issuer: null,
        authorizationUrl: null,
        tokenUrl: null,
        userinfoUrl: null,
        scope: null,
        subClaim: null,
        emailClaim: null,
        nameClaim: null,
        updatedAt: null,
      };
    }

    const props = toObject(settings.customProperties);
    const issuer = normalizeOptionalString(props.issuer ?? props.oidcIssuer);
    const authorizationUrl = normalizeOptionalString(
      props.authorizationUrl ?? props.oidcAuthorizationUrl
    );
    const tokenUrl = normalizeOptionalString(props.tokenUrl ?? props.oidcTokenUrl);
    const userinfoUrl = normalizeOptionalString(
      props.userinfoUrl ?? props.oidcUserinfoUrl
    );

    const clientId = normalizeOptionalString(
      props.clientId ?? props.oidcClientId ?? props.providerClientId
    );
    const hasClientSecret = Boolean(
      normalizeOptionalString(
        props.clientSecret ?? props.oidcClientSecret ?? props.providerClientSecret
      ) ||
        normalizeOptionalString(
          props.clientSecretEncrypted ??
            props.oidcClientSecretEncrypted ??
            props.providerClientSecretEncrypted
        )
    );
    const configured = Boolean(
      props.enabled !== false &&
        clientId &&
        hasClientSecret &&
        hasUsableOidcEndpoints({
          issuer,
          authorizationUrl,
          tokenUrl,
          userinfoUrl,
        })
    );

    return {
      configured,
      enabled: props.enabled !== false,
      providerId:
        normalizeProviderId(props.providerId ?? props.oidcProviderId) ||
        DEFAULT_PROVIDER_ID,
      providerName:
        normalizeOptionalString(props.providerName ?? props.oidcProviderName) ||
        DEFAULT_PROVIDER_NAME,
      clientId,
      hasClientSecret,
      clientSecretHint: normalizeOptionalString(props.clientSecretHint),
      issuer,
      authorizationUrl,
      tokenUrl,
      userinfoUrl,
      scope: normalizeOptionalString(props.scope ?? props.oidcScope),
      subClaim: normalizeOptionalString(props.subClaim ?? props.oidcSubClaim),
      emailClaim: normalizeOptionalString(props.emailClaim ?? props.oidcEmailClaim),
      nameClaim: normalizeOptionalString(props.nameClaim ?? props.oidcNameClaim),
      updatedAt: settings.updatedAt,
    };
  },
});

/**
 * Save frontend OIDC integration settings for an organization.
 * Client secret is encrypted before storage.
 */
export const saveFrontendOidcIntegration = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    enabled: v.optional(v.boolean()),
    providerId: v.optional(v.string()),
    providerName: v.optional(v.string()),
    clientId: v.optional(v.string()),
    clientSecret: v.optional(v.string()),
    clearClientSecret: v.optional(v.boolean()),
    issuer: v.optional(v.string()),
    authorizationUrl: v.optional(v.string()),
    tokenUrl: v.optional(v.string()),
    userinfoUrl: v.optional(v.string()),
    scope: v.optional(v.string()),
    subClaim: v.optional(v.string()),
    emailClaim: v.optional(v.string()),
    nameClaim: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await resolveAuthorizedOrganizationId(ctx, args);

    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("type", FRONTEND_OIDC_SETTINGS_TYPE)
      )
      .filter((q) => q.eq(q.field("subtype"), FRONTEND_OIDC_SETTINGS_SUBTYPE))
      .first();

    const nextProps = {
      ...toObject(existing?.customProperties),
    } as Record<string, unknown>;

    if (args.enabled !== undefined) {
      nextProps.enabled = args.enabled;
    }

    if (args.providerId !== undefined) {
      const normalizedProviderId = normalizeProviderId(args.providerId);
      if (normalizedProviderId) {
        nextProps.providerId = normalizedProviderId;
      } else {
        delete nextProps.providerId;
      }
    }

    setOptionalStringProp(nextProps, "providerName", args.providerName);
    setOptionalStringProp(nextProps, "clientId", args.clientId);
    setOptionalStringProp(nextProps, "issuer", args.issuer);
    setOptionalStringProp(nextProps, "authorizationUrl", args.authorizationUrl);
    setOptionalStringProp(nextProps, "tokenUrl", args.tokenUrl);
    setOptionalStringProp(nextProps, "userinfoUrl", args.userinfoUrl);
    setOptionalStringProp(nextProps, "scope", args.scope);
    setOptionalStringProp(nextProps, "subClaim", args.subClaim);
    setOptionalStringProp(nextProps, "emailClaim", args.emailClaim);
    setOptionalStringProp(nextProps, "nameClaim", args.nameClaim);

    if (args.clearClientSecret === true) {
      delete nextProps.clientSecret;
      delete nextProps.oidcClientSecret;
      delete nextProps.providerClientSecret;
      delete nextProps.clientSecretEncrypted;
      delete nextProps.oidcClientSecretEncrypted;
      delete nextProps.providerClientSecretEncrypted;
      delete nextProps.clientSecretHint;
    }

    if (args.clientSecret !== undefined) {
      const normalizedClientSecret = normalizeOptionalString(args.clientSecret);
      if (!normalizedClientSecret) {
        delete nextProps.clientSecret;
        delete nextProps.oidcClientSecret;
        delete nextProps.providerClientSecret;
        delete nextProps.clientSecretEncrypted;
        delete nextProps.oidcClientSecretEncrypted;
        delete nextProps.providerClientSecretEncrypted;
        delete nextProps.clientSecretHint;
      } else {
        const encryptedClientSecret = (await (ctx as any).runAction(
          generatedApi.internal.oauth.encryption.encryptToken,
          { plaintext: normalizedClientSecret }
        )) as string;

        nextProps.clientSecretEncrypted = encryptedClientSecret;
        delete nextProps.clientSecret;
        delete nextProps.oidcClientSecret;
        delete nextProps.providerClientSecret;
        nextProps.clientSecretHint = normalizedClientSecret.slice(-4);
        ensureEncryptedFieldMarker(nextProps, CLIENT_SECRET_ENCRYPTED_KEY);
      }
    }

    const clientId = normalizeOptionalString(
      nextProps.clientId ?? nextProps.oidcClientId ?? nextProps.providerClientId
    );
    const hasClientSecret = Boolean(
      normalizeOptionalString(
        nextProps.clientSecret ??
          nextProps.oidcClientSecret ??
          nextProps.providerClientSecret
      ) ||
        normalizeOptionalString(
          nextProps.clientSecretEncrypted ??
            nextProps.oidcClientSecretEncrypted ??
            nextProps.providerClientSecretEncrypted
        )
    );
    const issuer = normalizeOptionalString(nextProps.issuer ?? nextProps.oidcIssuer);
    const authorizationUrl = normalizeOptionalString(
      nextProps.authorizationUrl ?? nextProps.oidcAuthorizationUrl
    );
    const tokenUrl = normalizeOptionalString(
      nextProps.tokenUrl ?? nextProps.oidcTokenUrl
    );
    const userinfoUrl = normalizeOptionalString(
      nextProps.userinfoUrl ?? nextProps.oidcUserinfoUrl
    );
    const enabled = nextProps.enabled !== false;

    if (enabled) {
      if (!clientId) {
        throw new Error("clientId is required when frontend OIDC is enabled");
      }
      if (!hasClientSecret) {
        throw new Error("clientSecret is required when frontend OIDC is enabled");
      }
      if (
        !hasUsableOidcEndpoints({
          issuer,
          authorizationUrl,
          tokenUrl,
          userinfoUrl,
        })
      ) {
        throw new Error(
          "OIDC endpoints are incomplete. Provide issuer or all three explicit endpoints."
        );
      }
    }

    const now = Date.now();
    let settingsId: Id<"objects">;

    if (existing) {
      await ctx.db.patch(existing._id, {
        customProperties: nextProps,
        updatedAt: now,
      });
      settingsId = existing._id;
    } else {
      settingsId = await ctx.db.insert("objects", {
        organizationId,
        type: FRONTEND_OIDC_SETTINGS_TYPE,
        subtype: FRONTEND_OIDC_SETTINGS_SUBTYPE,
        name: "Frontend OIDC Integration",
        status: "active",
        customProperties: nextProps,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      settingsId,
      enabled,
      configured: Boolean(
        enabled &&
          clientId &&
          hasClientSecret &&
          hasUsableOidcEndpoints({
            issuer,
            authorizationUrl,
            tokenUrl,
            userinfoUrl,
          })
      ),
    };
  },
});
