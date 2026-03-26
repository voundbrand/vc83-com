import { internalAction, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("./_generated/api");

const FRONTEND_OIDC_SETTINGS_TYPE = "integration_settings";
const FRONTEND_OIDC_SETTINGS_SUBTYPE = "frontend_oidc";
const DOMAIN_CONFIG_TYPE = "configuration";
const DOMAIN_CONFIG_SUBTYPE = "domain";
const DEFAULT_PROVIDER_ID = "frontend_oidc";
const DEFAULT_PROVIDER_NAME = "Organization OIDC";
const DEFAULT_SCOPE = "openid profile email";
const DEFAULT_SUB_CLAIM = "sub";
const DEFAULT_EMAIL_CLAIM = "email";
const DEFAULT_EMAIL_VERIFIED_CLAIM = "email_verified";
const DEFAULT_REQUIRE_VERIFIED_EMAIL = true;
const DEFAULT_NAME_CLAIM = "name";
const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000;
const MIN_STATE_TTL_MS = 60 * 1000;
const MAX_STATE_TTL_MS = 15 * 60 * 1000;
const STATE_ORG_DELIMITER = ".";
const CONTRACT_VERSION = "frontend_oidc_v1";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value === 1 || value === "1") {
    return true;
  }
  if (value === 0 || value === "0") {
    return false;
  }
  return null;
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

function normalizeIssuer(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  return normalized.replace(/\/+$/, "");
}

function normalizeScope(value: string | null | undefined): string {
  return normalizeOptionalString(value) || DEFAULT_SCOPE;
}

function normalizeClaimName(value: string | null | undefined, fallback: string): string {
  return normalizeOptionalString(value) || fallback;
}

function clampStateTtlMs(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_STATE_TTL_MS;
  }
  return Math.max(MIN_STATE_TTL_MS, Math.min(MAX_STATE_TTL_MS, Math.floor(value)));
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Uint8Array | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const paddingLength = (4 - (normalized.length % 4)) % 4;
    const padded = `${normalized}${"=".repeat(paddingLength)}`;
    const decoded = atob(padded);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

async function generatePkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomBase64Url(64);
  const challenge = await sha256Base64Url(verifier);
  return { verifier, challenge };
}

function buildStateToken(organizationId: Id<"organizations">): string {
  return `${organizationId}${STATE_ORG_DELIMITER}${randomBase64Url(32)}`;
}

function parseOrganizationIdFromState(state: string): Id<"organizations"> | null {
  const normalizedState = normalizeOptionalString(state);
  if (!normalizedState) {
    return null;
  }
  const delimiterIndex = normalizedState.indexOf(STATE_ORG_DELIMITER);
  if (delimiterIndex <= 0) {
    return null;
  }
  const prefix = normalizedState.slice(0, delimiterIndex);
  return normalizeOptionalString(prefix) as Id<"organizations"> | null;
}

function ensureHttpUrl(value: string, fieldName: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${fieldName} must be a valid absolute URL`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${fieldName} must use http or https`);
  }

  return parsed.toString();
}

function ensureReturnUrl(value: string): string {
  const normalized = value.trim();
  if (normalized.startsWith("/")) {
    return normalized;
  }
  return ensureHttpUrl(normalized, "returnUrl");
}

function getClaimByPath(claims: Record<string, unknown>, claimPath: string): unknown {
  const normalizedPath = normalizeOptionalString(claimPath);
  if (!normalizedPath) {
    return undefined;
  }

  const pathSegments = normalizedPath.split(".").filter(Boolean);
  let current: unknown = claims;
  for (const segment of pathSegments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function claimToString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return null;
}

function normalizeEmail(value: unknown): string | null {
  const asString = claimToString(value);
  return asString ? asString.toLowerCase() : null;
}

function decodeJwtPayload(idToken: string): Record<string, unknown> | null {
  const tokenParts = idToken.split(".");
  if (tokenParts.length < 2) {
    return null;
  }

  const payloadBytes = base64UrlDecode(tokenParts[1]);
  if (!payloadBytes) {
    return null;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeClaimsForResponse(claims: Record<string, unknown> | null): Record<string, unknown> {
  if (!claims) {
    return {};
  }

  const normalizedEntries: Array<[string, unknown]> = [];
  const keys = Object.keys(claims).sort((left, right) => left.localeCompare(right));

  for (const key of keys) {
    const value = claims[key];
    if (value === null) {
      normalizedEntries.push([key, null]);
      continue;
    }
    if (typeof value === "string") {
      normalizedEntries.push([key, value]);
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      normalizedEntries.push([key, value]);
      continue;
    }
    if (typeof value === "boolean") {
      normalizedEntries.push([key, value]);
      continue;
    }
    if (Array.isArray(value)) {
      const normalizedArray = value
        .map((item) => {
          if (item === null) return null;
          if (typeof item === "string") return item;
          if (typeof item === "number" && Number.isFinite(item)) return item;
          if (typeof item === "boolean") return item;
          return undefined;
        })
        .filter((item) => item !== undefined);
      normalizedEntries.push([key, normalizedArray]);
    }
  }

  return Object.fromEntries(normalizedEntries);
}

function validateIdTokenClaims(args: {
  idTokenClaims: Record<string, unknown>;
  expectedNonce: string;
  expectedClientId: string;
  expectedIssuer: string | null;
}): { valid: true } | { valid: false; code: string; message: string } {
  const nonce = claimToString(args.idTokenClaims.nonce);
  if (!nonce) {
    return {
      valid: false,
      code: "missing_nonce",
      message: "ID token is missing nonce claim",
    };
  }
  if (nonce !== args.expectedNonce) {
    return {
      valid: false,
      code: "invalid_nonce",
      message: "ID token nonce does not match start transaction",
    };
  }

  const expectedIssuer = normalizeIssuer(args.expectedIssuer);
  if (expectedIssuer) {
    const issuer = normalizeIssuer(claimToString(args.idTokenClaims.iss));
    if (!issuer || issuer !== expectedIssuer) {
      return {
        valid: false,
        code: "invalid_issuer",
        message: "ID token issuer does not match configured issuer",
      };
    }
  }

  const audience = args.idTokenClaims.aud;
  const audiences = Array.isArray(audience)
    ? audience.map((entry) => claimToString(entry)).filter(Boolean)
    : [claimToString(audience)].filter(Boolean);
  if (!audiences.includes(args.expectedClientId)) {
    return {
      valid: false,
      code: "invalid_audience",
      message: "ID token audience does not include configured client ID",
    };
  }

  const expiresAtSeconds = normalizeOptionalNumber(args.idTokenClaims.exp);
  if (typeof expiresAtSeconds === "number") {
    const expiresAtMs = expiresAtSeconds * 1000;
    if (expiresAtMs <= Date.now()) {
      return {
        valid: false,
        code: "expired_id_token",
        message: "ID token is expired",
      };
    }
  }

  return { valid: true };
}

type FrontendOidcRuntimeBinding = {
  providerId: string;
  providerName: string;
  clientId: string;
  clientSecret: string;
  issuer: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
  scope: string;
  subClaim: string;
  emailClaim: string;
  emailVerifiedClaim: string;
  requireVerifiedEmail: boolean;
  nameClaim: string;
};

type ResolvedOidcEndpoints = {
  issuer: string | null;
  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string | null;
};

async function resolveRuntimeBinding(
  ctx: unknown,
  organizationId: Id<"organizations">
): Promise<FrontendOidcRuntimeBinding | null> {
  const settings = await (ctx as any).runQuery(
    generatedApi.internal.frontendOidcInternal.getStoredFrontendOidcSettingsInternal,
    { organizationId }
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

  const issuer = normalizeIssuer(props.issuer ?? props.oidcIssuer);
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
    scope: normalizeScope(normalizeOptionalString(props.scope ?? props.oidcScope)),
    subClaim: normalizeClaimName(
      normalizeOptionalString(props.subClaim ?? props.oidcSubClaim),
      DEFAULT_SUB_CLAIM
    ),
    emailClaim: normalizeClaimName(
      normalizeOptionalString(props.emailClaim ?? props.oidcEmailClaim),
      DEFAULT_EMAIL_CLAIM
    ),
    emailVerifiedClaim: normalizeClaimName(
      normalizeOptionalString(
        props.emailVerifiedClaim ?? props.oidcEmailVerifiedClaim
      ),
      DEFAULT_EMAIL_VERIFIED_CLAIM
    ),
    requireVerifiedEmail:
      props.requireVerifiedEmail !== false &&
      props.oidcRequireVerifiedEmail !== false,
    nameClaim: normalizeClaimName(
      normalizeOptionalString(props.nameClaim ?? props.oidcNameClaim),
      DEFAULT_NAME_CLAIM
    ),
  };
}

async function resolveOidcEndpoints(
  runtime: FrontendOidcRuntimeBinding
): Promise<ResolvedOidcEndpoints> {
  const normalizedIssuer = normalizeIssuer(runtime.issuer);

  if (!normalizedIssuer) {
    const explicitAuthorizationUrl = normalizeOptionalString(runtime.authorizationUrl);
    const explicitTokenUrl = normalizeOptionalString(runtime.tokenUrl);
    const explicitUserinfoUrl = normalizeOptionalString(runtime.userinfoUrl);
    if (!explicitAuthorizationUrl || !explicitTokenUrl) {
      throw new Error(
        "OIDC endpoints are incomplete. Configure issuer or explicit authorization/token endpoints."
      );
    }

    return {
      issuer: null,
      authorizationUrl: explicitAuthorizationUrl,
      tokenUrl: explicitTokenUrl,
      userinfoUrl: explicitUserinfoUrl,
    };
  }

  const discoveryUrl = `${normalizedIssuer}/.well-known/openid-configuration`;
  let metadata: Record<string, unknown> | null = null;

  try {
    const discoveryResponse = await fetch(discoveryUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (discoveryResponse.ok) {
      metadata = toObject(await discoveryResponse.json());
    } else {
      console.error("[frontend-oidc] OIDC discovery failed", {
        discoveryUrl,
        status: discoveryResponse.status,
      });
    }
  } catch (error) {
    console.error("[frontend-oidc] OIDC discovery request failed", {
      discoveryUrl,
      error,
    });
  }

  const authorizationUrl =
    normalizeOptionalString(metadata?.authorization_endpoint) ||
    normalizeOptionalString(runtime.authorizationUrl);
  const tokenUrl =
    normalizeOptionalString(metadata?.token_endpoint) ||
    normalizeOptionalString(runtime.tokenUrl);
  const userinfoUrl =
    normalizeOptionalString(metadata?.userinfo_endpoint) ||
    normalizeOptionalString(runtime.userinfoUrl);

  if (!authorizationUrl || !tokenUrl) {
    throw new Error(
      "OIDC discovery did not provide required authorization/token endpoints"
    );
  }

  return {
    issuer: normalizedIssuer,
    authorizationUrl,
    tokenUrl,
    userinfoUrl,
  };
}

async function resolveOrganizationScopeFromHost(
  ctx: unknown,
  host: string
): Promise<Id<"organizations"> | null> {
  const resolution = await (ctx as any).runQuery(
    generatedApi.internal.frontendOidcInternal.resolveFrontendOrganizationFromHostInternal,
    {
      host,
    }
  );

  if (resolution?.status === "resolved" && resolution.organizationId) {
    return resolution.organizationId as Id<"organizations">;
  }

  if (resolution?.status === "ambiguous") {
    throw new Error("Multiple organizations match the provided request host");
  }

  return null;
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
    return await resolveRuntimeBinding(ctx, args.organizationId);
  },
});

export const startFrontendOidcAuthorizationInternal = internalAction({
  args: {
    organizationId: v.optional(v.id("organizations")),
    requestHost: v.optional(v.string()),
    redirectUri: v.string(),
    returnUrl: v.optional(v.string()),
    scope: v.optional(v.string()),
    loginHint: v.optional(v.string()),
    prompt: v.optional(v.string()),
    stateTtlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let organizationId = args.organizationId || null;
    if (!organizationId) {
      const normalizedHost = normalizeHostCandidate(args.requestHost);
      if (!normalizedHost) {
        throw new Error(
          "organizationId or requestHost is required to resolve frontend OIDC scope"
        );
      }
      organizationId = await resolveOrganizationScopeFromHost(ctx, normalizedHost);
    }

    if (!organizationId) {
      throw new Error("Unable to resolve organization for frontend OIDC start flow");
    }

    const runtime = await resolveRuntimeBinding(ctx, organizationId);
    if (!runtime) {
      throw new Error(
        "No active frontend OIDC integration is configured for the resolved organization"
      );
    }

    const resolvedRedirectUri = ensureHttpUrl(args.redirectUri, "redirectUri");
    const resolvedReturnUrl = normalizeOptionalString(args.returnUrl)
      ? ensureReturnUrl(args.returnUrl as string)
      : null;
    const effectiveScope = normalizeScope(args.scope || runtime.scope);
    const loginHint = normalizeOptionalString(args.loginHint);
    const prompt = normalizeOptionalString(args.prompt);

    const endpoints = await resolveOidcEndpoints(runtime);
    const state = buildStateToken(organizationId);
    const nonce = randomBase64Url(32);
    const pkce = await generatePkcePair();
    const now = Date.now();
    const expiresAt = now + clampStateTtlMs(args.stateTtlMs ?? null);

    await (ctx as any).runMutation(
      generatedApi.internal.frontendOidc.createFrontendOidcStateInternal,
      {
        organizationId,
        state,
        nonce,
        codeVerifier: pkce.verifier,
        codeChallenge: pkce.challenge,
        codeChallengeMethod: "S256",
        clientId: runtime.clientId,
        redirectUri: resolvedRedirectUri,
        returnUrl: resolvedReturnUrl || undefined,
        providerId: runtime.providerId,
        providerName: runtime.providerName,
        issuer: endpoints.issuer || undefined,
        authorizationUrl: endpoints.authorizationUrl,
        tokenUrl: endpoints.tokenUrl,
        userinfoUrl: endpoints.userinfoUrl || undefined,
        scope: effectiveScope,
        subClaim: runtime.subClaim,
        emailClaim: runtime.emailClaim,
        emailVerifiedClaim: runtime.emailVerifiedClaim,
        requireVerifiedEmail: runtime.requireVerifiedEmail,
        nameClaim: runtime.nameClaim,
        expiresAt,
      }
    );

    const authorizationUrl = new URL(endpoints.authorizationUrl);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", runtime.clientId);
    authorizationUrl.searchParams.set("redirect_uri", resolvedRedirectUri);
    authorizationUrl.searchParams.set("scope", effectiveScope);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);
    authorizationUrl.searchParams.set("code_challenge", pkce.challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    if (loginHint) {
      authorizationUrl.searchParams.set("login_hint", loginHint);
    }
    if (prompt) {
      authorizationUrl.searchParams.set("prompt", prompt);
    }

    return {
      success: true,
      contractVersion: CONTRACT_VERSION,
      organizationId,
      provider: {
        id: runtime.providerId,
        name: runtime.providerName,
        issuer: endpoints.issuer,
      },
      claimMapping: {
        subClaim: runtime.subClaim,
        emailClaim: runtime.emailClaim,
        nameClaim: runtime.nameClaim,
      },
      state,
      nonce,
      pkce: {
        codeChallenge: pkce.challenge,
        codeChallengeMethod: "S256",
      },
      redirectUri: resolvedRedirectUri,
      authorizationUrl: authorizationUrl.toString(),
      expiresAt,
    };
  },
});

export const completeFrontendOidcAuthorizationInternal = internalAction({
  args: {
    state: v.string(),
    code: v.optional(v.string()),
    error: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
    errorUri: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const state = normalizeOptionalString(args.state);
    if (!state) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        error: {
          code: "missing_state",
          message: "Missing state parameter",
        },
      };
    }

    const organizationId = parseOrganizationIdFromState(state);
    if (!organizationId) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        error: {
          code: "invalid_state",
          message: "State parameter format is invalid",
        },
      };
    }

    const consumedState = await (ctx as any).runMutation(
      generatedApi.internal.frontendOidc.consumeFrontendOidcStateInternal,
      {
        organizationId,
        state,
      }
    );

    if (consumedState?.status !== "consumed") {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        error: {
          code:
            consumedState?.status === "already_used"
              ? "state_already_used"
              : consumedState?.status === "expired"
                ? "state_expired"
                : "state_not_found",
          message:
            consumedState?.status === "already_used"
              ? "State token has already been used"
              : consumedState?.status === "expired"
                ? "State token has expired"
                : "State token was not found",
        },
      };
    }

    const runtime = await resolveRuntimeBinding(ctx, organizationId);
    if (!runtime) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        error: {
          code: "oidc_configuration_missing",
          message: "No active frontend OIDC integration is configured",
        },
      };
    }

    const consumedValue = toObject(consumedState.value);
    const providerId =
      normalizeOptionalString(consumedValue.providerId) || runtime.providerId;
    const providerName =
      normalizeOptionalString(consumedValue.providerName) || runtime.providerName;
    const redirectUri = normalizeOptionalString(consumedValue.redirectUri);

    if (args.error) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "provider_error",
          message: normalizeOptionalString(args.errorDescription) || "OIDC provider returned an error",
          providerError: args.error,
        },
      };
    }

    const code = normalizeOptionalString(args.code);
    if (!code) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "missing_code",
          message: "Missing authorization code",
        },
      };
    }

    if (!redirectUri) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "missing_redirect_uri",
          message: "Stored transaction redirectUri is missing",
        },
      };
    }

    const codeVerifier = normalizeOptionalString(consumedValue.codeVerifier);
    if (!codeVerifier) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "missing_code_verifier",
          message: "Stored transaction code_verifier is missing",
        },
      };
    }

    const nonce = normalizeOptionalString(consumedValue.nonce);
    if (!nonce) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "missing_nonce",
          message: "Stored transaction nonce is missing",
        },
      };
    }

    const endpoints = await resolveOidcEndpoints(runtime);

    const tokenRequestBody = new URLSearchParams();
    tokenRequestBody.set("grant_type", "authorization_code");
    tokenRequestBody.set("code", code);
    tokenRequestBody.set("redirect_uri", redirectUri);
    tokenRequestBody.set("client_id", runtime.clientId);
    tokenRequestBody.set("client_secret", runtime.clientSecret);
    tokenRequestBody.set("code_verifier", codeVerifier);

    let tokenPayload: Record<string, unknown> = {};
    try {
      const tokenResponse = await fetch(endpoints.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: tokenRequestBody.toString(),
        cache: "no-store",
      });

      const rawBody = await tokenResponse.text();
      try {
        tokenPayload = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        tokenPayload = {};
      }

      if (!tokenResponse.ok) {
        return {
          success: false,
          contractVersion: CONTRACT_VERSION,
          organizationId,
          provider: {
            id: providerId,
            name: providerName,
          },
          error: {
            code: "token_exchange_failed",
            message:
              normalizeOptionalString(tokenPayload.error_description) ||
              "OIDC token endpoint rejected the authorization code",
            providerError: normalizeOptionalString(tokenPayload.error),
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "token_exchange_error",
          message: error instanceof Error ? error.message : "Token exchange failed",
        },
      };
    }

    const idToken = normalizeOptionalString(tokenPayload.id_token);
    const accessToken = normalizeOptionalString(tokenPayload.access_token);
    const tokenType = normalizeOptionalString(tokenPayload.token_type);
    const expiresInSeconds = normalizeOptionalNumber(tokenPayload.expires_in);
    const responseScope = normalizeOptionalString(tokenPayload.scope);

    if (!idToken) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "missing_id_token",
          message: "OIDC token response did not include id_token",
        },
      };
    }

    const idTokenClaims = decodeJwtPayload(idToken);
    if (!idTokenClaims) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "invalid_id_token",
          message: "Failed to decode ID token payload",
        },
      };
    }

    const idTokenValidation = validateIdTokenClaims({
      idTokenClaims,
      expectedNonce: nonce,
      expectedClientId:
        normalizeOptionalString(consumedValue.clientId) || runtime.clientId,
      expectedIssuer: endpoints.issuer,
    });

    if (!idTokenValidation.valid) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: idTokenValidation.code,
          message: idTokenValidation.message,
        },
      };
    }

    let userinfoClaims: Record<string, unknown> | null = null;
    let userinfoFetched = false;

    if (endpoints.userinfoUrl && accessToken) {
      try {
        const userinfoResponse = await fetch(endpoints.userinfoUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (userinfoResponse.ok) {
          userinfoClaims = toObject(await userinfoResponse.json());
          userinfoFetched = true;
        }
      } catch (error) {
        console.error("[frontend-oidc] Failed to fetch userinfo endpoint", {
          organizationId,
          providerId,
          error,
        });
      }
    }

    const combinedClaims: Record<string, unknown> = {
      ...idTokenClaims,
      ...(userinfoClaims || {}),
    };

    const subClaim =
      normalizeOptionalString(consumedValue.subClaim) || runtime.subClaim;
    const emailClaim =
      normalizeOptionalString(consumedValue.emailClaim) || runtime.emailClaim;
    const emailVerifiedClaim =
      normalizeOptionalString(consumedValue.emailVerifiedClaim) ||
      runtime.emailVerifiedClaim ||
      DEFAULT_EMAIL_VERIFIED_CLAIM;
    const requireVerifiedEmail =
      normalizeOptionalBoolean(consumedValue.requireVerifiedEmail) ??
      runtime.requireVerifiedEmail ??
      DEFAULT_REQUIRE_VERIFIED_EMAIL;
    const nameClaim =
      normalizeOptionalString(consumedValue.nameClaim) || runtime.nameClaim;

    const idTokenSubject = claimToString(getClaimByPath(idTokenClaims, subClaim));
    if (!idTokenSubject) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "subject_claim_missing",
          message: `Mapped subject claim \"${subClaim}\" is missing from ID token claims`,
        },
      };
    }

    const userinfoSubject = userinfoClaims
      ? claimToString(getClaimByPath(userinfoClaims, subClaim))
      : null;
    if (userinfoSubject && userinfoSubject !== idTokenSubject) {
      return {
        success: false,
        contractVersion: CONTRACT_VERSION,
        organizationId,
        provider: {
          id: providerId,
          name: providerName,
        },
        error: {
          code: "subject_claim_mismatch",
          message: `Mapped subject claim \"${subClaim}\" differs between ID token and userinfo`,
        },
      };
    }

    const subject = idTokenSubject;
    const email = normalizeEmail(getClaimByPath(combinedClaims, emailClaim));
    const mappedName = claimToString(getClaimByPath(combinedClaims, nameClaim));
    const displayName = mappedName || email || subject;
    const emailVerified = normalizeOptionalBoolean(
      getClaimByPath(combinedClaims, emailVerifiedClaim)
    );

    if (requireVerifiedEmail) {
      if (!email) {
        return {
          success: false,
          contractVersion: CONTRACT_VERSION,
          organizationId,
          provider: {
            id: providerId,
            name: providerName,
          },
          error: {
            code: "email_claim_missing",
            message: `Mapped email claim \"${emailClaim}\" is required by policy but missing`,
          },
        };
      }

      if (emailVerified !== true) {
        return {
          success: false,
          contractVersion: CONTRACT_VERSION,
          organizationId,
          provider: {
            id: providerId,
            name: providerName,
          },
          error: {
            code: "email_not_verified",
            message: `Mapped email verification claim \"${emailVerifiedClaim}\" must be true`,
          },
        };
      }
    }

    const frontendSyncInput = email
      ? {
          email,
          name: displayName,
          oauthProvider: providerId,
          oauthId: subject,
        }
      : null;

    const expiresAt =
      typeof expiresInSeconds === "number"
        ? Date.now() + expiresInSeconds * 1000
        : null;

    return {
      success: true,
      contractVersion: CONTRACT_VERSION,
      organizationId,
      provider: {
        id: providerId,
        name: providerName,
        issuer: endpoints.issuer,
      },
      identity: {
        subject,
        email,
        displayName,
        emailVerified,
        requireVerifiedEmail,
        claimMapping: {
          subClaim,
          emailClaim,
          emailVerifiedClaim,
          nameClaim,
        },
      },
      claims: {
        idToken: normalizeClaimsForResponse(idTokenClaims),
        userinfo: normalizeClaimsForResponse(userinfoClaims),
        combined: normalizeClaimsForResponse(combinedClaims),
      },
      oauth: {
        tokenType,
        scope: responseScope || normalizeOptionalString(consumedValue.scope) || runtime.scope,
        expiresAt,
        userinfoFetched,
      },
      bridge: {
        canSyncFrontendUser: Boolean(frontendSyncInput),
        reason: frontendSyncInput ? null : "missing_email_claim",
        frontendSyncInput,
        hubGwSyncInput: frontendSyncInput,
      },
      state: {
        value: state,
        consumedAt: normalizeOptionalNumber(consumedValue.consumedAt) || Date.now(),
        expiresAt: normalizeOptionalNumber(consumedValue.expiresAt),
      },
      returnUrl: normalizeOptionalString(consumedValue.returnUrl),
    };
  },
});
