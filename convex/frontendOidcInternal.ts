import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("./_generated/api");

const FRONTEND_OIDC_SETTINGS_TYPE = "integration_settings";
const FRONTEND_OIDC_SETTINGS_SUBTYPE = "frontend_oidc";
const DOMAIN_CONFIG_TYPE = "configuration";
const DOMAIN_CONFIG_SUBTYPE = "domain";
const DEFAULT_PROVIDER_ID = "frontend_oidc";
const DEFAULT_PROVIDER_NAME = "Organization OIDC";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeHostCandidate(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  let normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("://")) {
    try {
      normalized = new URL(normalized).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  normalized = normalized.split("/")[0].split(":")[0].replace(/\.$/, "");
  return normalized || null;
}

function domainMatchesHost(args: {
  host: string;
  domain: string;
  includeSubdomains: boolean;
}): boolean {
  if (args.host === args.domain) {
    return true;
  }
  return args.includeSubdomains && args.host.endsWith(`.${args.domain}`);
}

/**
 * Internal storage lookup for per-org frontend OIDC integration settings.
 */
export const getStoredFrontendOidcSettingsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", FRONTEND_OIDC_SETTINGS_TYPE)
      )
      .filter((q) => q.eq(q.field("subtype"), FRONTEND_OIDC_SETTINGS_SUBTYPE))
      .first();
  },
});

/**
 * Resolve organization scope for frontend apps from request host.
 * Uses active domain configuration objects as the source of truth.
 */
export const resolveFrontendOrganizationFromHostInternal = internalQuery({
  args: {
    host: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedHost = normalizeHostCandidate(args.host);
    if (!normalizedHost) {
      return {
        status: "missing",
        organizationId: null,
        matchedDomain: null,
        candidateCount: 0,
      };
    }

    const domainConfigs = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", DOMAIN_CONFIG_TYPE).eq("subtype", DOMAIN_CONFIG_SUBTYPE)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const candidatesByOrg = new Map<
      string,
      { organizationId: unknown; matchedDomain: string }
    >();

    for (const domainConfig of domainConfigs) {
      const props = toObject(domainConfig.customProperties);
      const domainName = normalizeHostCandidate(
        normalizeOptionalString(props.domainName)
      );
      if (!domainName) {
        continue;
      }

      const includeSubdomains = props.includeSubdomains === true;
      if (
        !domainMatchesHost({
          host: normalizedHost,
          domain: domainName,
          includeSubdomains,
        })
      ) {
        continue;
      }

      const mapKey = String(domainConfig.organizationId);
      const existing = candidatesByOrg.get(mapKey);
      if (!existing || domainName.length > existing.matchedDomain.length) {
        candidatesByOrg.set(mapKey, {
          organizationId: domainConfig.organizationId,
          matchedDomain: domainName,
        });
      }
    }

    if (candidatesByOrg.size === 1) {
      const resolved = Array.from(candidatesByOrg.values())[0];
      return {
        status: "resolved",
        organizationId: resolved.organizationId,
        matchedDomain: resolved.matchedDomain,
        candidateCount: 1,
      };
    }

    if (candidatesByOrg.size > 1) {
      return {
        status: "ambiguous",
        organizationId: null,
        matchedDomain: null,
        candidateCount: candidatesByOrg.size,
      };
    }

    return {
      status: "missing",
      organizationId: null,
      matchedDomain: null,
      candidateCount: 0,
    };
  },
});

/**
 * Internal runtime binding used by frontend portals (Hub-GW and future apps).
 * Returns decrypted runtime credentials when configuration is active and complete.
 */
export const getOrganizationFrontendOidcRuntimeBinding = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const settings = await (ctx as any).runQuery(
      generatedApi.internal.frontendOidcInternal.getStoredFrontendOidcSettingsInternal,
      { organizationId: args.organizationId }
    );

    if (!settings || settings.status !== "active") {
      return null;
    }

    const props = toObject(settings.customProperties);
    if (props.enabled === false) {
      return null;
    }

    const clientId = normalizeOptionalString(
      props.clientId ?? props.oidcClientId ?? props.providerClientId
    );

    let clientSecret = normalizeOptionalString(
      props.clientSecret ?? props.oidcClientSecret ?? props.providerClientSecret
    );

    const encryptedClientSecret = normalizeOptionalString(
      props.clientSecretEncrypted ??
        props.oidcClientSecretEncrypted ??
        props.providerClientSecretEncrypted
    );

    if (!clientSecret && encryptedClientSecret) {
      try {
        const decryptedClientSecret = await (ctx as any).runAction(
          generatedApi.internal.oauth.encryption.decryptToken,
          { encrypted: encryptedClientSecret }
        );
        clientSecret = normalizeOptionalString(decryptedClientSecret);
      } catch (error) {
        console.error(
          "[frontend-oidc] Failed to decrypt stored OIDC client secret",
          error
        );
        return null;
      }
    }

    if (!clientId || !clientSecret) {
      return null;
    }

    const issuer = normalizeOptionalString(props.issuer ?? props.oidcIssuer);
    const authorizationUrl = normalizeOptionalString(
      props.authorizationUrl ?? props.oidcAuthorizationUrl
    );
    const tokenUrl = normalizeOptionalString(props.tokenUrl ?? props.oidcTokenUrl);
    const userinfoUrl = normalizeOptionalString(
      props.userinfoUrl ?? props.oidcUserinfoUrl
    );

    if (
      !hasUsableOidcEndpoints({
        issuer,
        authorizationUrl,
        tokenUrl,
        userinfoUrl,
      })
    ) {
      return null;
    }

    return {
      providerId:
        normalizeOptionalString(props.providerId ?? props.oidcProviderId) ||
        DEFAULT_PROVIDER_ID,
      providerName:
        normalizeOptionalString(props.providerName ?? props.oidcProviderName) ||
        DEFAULT_PROVIDER_NAME,
      clientId,
      clientSecret,
      issuer,
      authorizationUrl,
      tokenUrl,
      userinfoUrl,
      scope: normalizeOptionalString(props.scope ?? props.oidcScope),
      subClaim: normalizeOptionalString(props.subClaim ?? props.oidcSubClaim),
      emailClaim: normalizeOptionalString(props.emailClaim ?? props.oidcEmailClaim),
      nameClaim: normalizeOptionalString(props.nameClaim ?? props.oidcNameClaim),
    };
  },
});
