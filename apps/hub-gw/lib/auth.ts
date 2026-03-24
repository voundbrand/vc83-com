import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { OAuthConfig } from "next-auth/providers/oauth";
import type { JWT } from "next-auth/jwt";
import {
  getHubGwOidcIntegrationConfig,
  syncHubGwFrontendIdentity,
  type HubGwOidcIntegrationConfig,
  type HubGwOrganizationScope,
} from "@/lib/server-convex";

type RequestedAuthMode = "auto" | "mock" | "platform" | "oidc";
export type HubGwResolvedAuthMode = "mock" | "platform" | "oidc";

const DEFAULT_SCOPE = "openid profile email";
const DEFAULT_SUB_CLAIM = "sub";
const DEFAULT_EMAIL_CLAIM = "email";
const DEFAULT_NAME_CLAIM = "name";
const DEFAULT_OIDC_PROVIDER_ID = "frontend_oidc";
const DEFAULT_OIDC_PROVIDER_NAME = "Organization OIDC";
const PLATFORM_PROVIDER_ID = "platform";
const PLATFORM_PROVIDER_NAME = "Platform Account";
const PLATFORM_OAUTH_PROVIDER_KEY = "platform_email";

export interface HubGwSessionAuthContext {
  mode: HubGwResolvedAuthMode;
  provider: string | null;
  frontendUserId: string | null;
  crmContactId: string | null;
  crmOrganizationId: string | null;
  subOrgId: string | null;
  isSeller: boolean;
}

interface HubGwAuthUser extends NextAuthUser {
  auth?: HubGwSessionAuthContext;
  platformSessionId?: string;
  platformSessionExpiresAt?: number;
  platformUserId?: string;
}

interface HubGwAuthToken extends JWT {
  auth?: HubGwSessionAuthContext;
  platformSessionId?: string | null;
  platformSessionExpiresAt?: number | null;
}

interface ResolvedHubGwOidcConfig {
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
  nameClaim: string;
}

interface HubGwAuthRuntimeResolution {
  mode: HubGwResolvedAuthMode;
  oidcConfig: ResolvedHubGwOidcConfig | null;
}

interface PlatformSignInResponse {
  success?: boolean;
  sessionId?: string;
  userId?: string;
  email?: string;
  expiresAt?: number;
  user?: unknown;
  error?: string;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, unknown>;
}

function getApiBaseUrl(env: NodeJS.ProcessEnv): string {
  const endpoint = normalizeOptionalString(env.NEXT_PUBLIC_API_ENDPOINT_URL);
  if (endpoint) {
    return endpoint;
  }

  const appUrl = normalizeOptionalString(env.NEXT_PUBLIC_APP_URL);
  if (appUrl) {
    return appUrl;
  }

  return "http://localhost:3000";
}

function getRequestedMode(env: NodeJS.ProcessEnv): RequestedAuthMode {
  const rawValue = (env.HUB_GW_AUTH_MODE || "auto").trim().toLowerCase();
  if (
    rawValue === "auto" ||
    rawValue === "mock" ||
    rawValue === "platform" ||
    rawValue === "oidc"
  ) {
    return rawValue;
  }
  return "auto";
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

function buildIntegrationOidcConfig(
  integrationConfig: HubGwOidcIntegrationConfig
): ResolvedHubGwOidcConfig | null {
  if (!integrationConfig.clientId || !integrationConfig.clientSecret) {
    return null;
  }

  const issuer = normalizeOptionalString(integrationConfig.issuer);
  const authorizationUrl = normalizeOptionalString(integrationConfig.authorizationUrl);
  const tokenUrl = normalizeOptionalString(integrationConfig.tokenUrl);
  const userinfoUrl = normalizeOptionalString(integrationConfig.userinfoUrl);

  if (!hasUsableOidcEndpoints({ issuer, authorizationUrl, tokenUrl, userinfoUrl })) {
    return null;
  }

  return {
    providerId:
      normalizeOptionalString(integrationConfig.providerId) || DEFAULT_OIDC_PROVIDER_ID,
    providerName:
      normalizeOptionalString(integrationConfig.providerName) ||
      DEFAULT_OIDC_PROVIDER_NAME,
    clientId: integrationConfig.clientId,
    clientSecret: integrationConfig.clientSecret,
    issuer,
    authorizationUrl,
    tokenUrl,
    userinfoUrl,
    scope: normalizeOptionalString(integrationConfig.scope) || DEFAULT_SCOPE,
    subClaim: normalizeOptionalString(integrationConfig.subClaim) || DEFAULT_SUB_CLAIM,
    emailClaim:
      normalizeOptionalString(integrationConfig.emailClaim) || DEFAULT_EMAIL_CLAIM,
    nameClaim: normalizeOptionalString(integrationConfig.nameClaim) || DEFAULT_NAME_CLAIM,
  };
}

async function getOrganizationOidcConfigSafe(
  scope: HubGwOrganizationScope
): Promise<HubGwOidcIntegrationConfig | null> {
  try {
    return await getHubGwOidcIntegrationConfig(scope);
  } catch (error) {
    console.error(
      "[hub-gw-auth] Failed to load frontend OIDC integration config",
      error
    );
    return null;
  }
}

async function resolveRuntimeOidcConfig(
  scope: HubGwOrganizationScope
): Promise<ResolvedHubGwOidcConfig | null> {
  const integrationConfig = await getOrganizationOidcConfigSafe(scope);
  if (integrationConfig) {
    const resolvedFromIntegration = buildIntegrationOidcConfig(integrationConfig);
    if (resolvedFromIntegration) {
      return resolvedFromIntegration;
    }
    console.error(
      "[hub-gw-auth] Found frontend_oidc integration settings, but they are incomplete"
    );
  }

  return null;
}

function resolveProviderIdForRuntime(
  runtime: HubGwAuthRuntimeResolution
): string | null {
  if (runtime.mode === "oidc") {
    return runtime.oidcConfig?.providerId || DEFAULT_OIDC_PROVIDER_ID;
  }
  if (runtime.mode === "platform") {
    return PLATFORM_PROVIDER_ID;
  }
  return null;
}

async function resolveHubGwAuthRuntime(
  env: NodeJS.ProcessEnv = process.env,
  scope: HubGwOrganizationScope = {}
): Promise<HubGwAuthRuntimeResolution> {
  const requestedMode = getRequestedMode(env);
  if (requestedMode === "mock") {
    return { mode: "mock", oidcConfig: null };
  }
  if (requestedMode === "platform") {
    return { mode: "platform", oidcConfig: null };
  }

  const oidcConfig = await resolveRuntimeOidcConfig(scope);
  if (requestedMode === "oidc" && !oidcConfig) {
    throw new Error(
      "HUB_GW_AUTH_MODE=oidc requires a valid frontend_oidc integration for the resolved organization scope"
    );
  }

  if (oidcConfig) {
    return {
      mode: "oidc",
      oidcConfig,
    };
  }

  return {
    mode: "platform",
    oidcConfig: null,
  };
}

export async function isHubGwOidcConfigured(
  scope: HubGwOrganizationScope = {}
): Promise<boolean> {
  return (await resolveRuntimeOidcConfig(scope)) !== null;
}

export async function resolveHubGwAuthMode(
  env: NodeJS.ProcessEnv = process.env,
  scope: HubGwOrganizationScope = {}
): Promise<HubGwResolvedAuthMode> {
  const runtime = await resolveHubGwAuthRuntime(env, scope);
  return runtime.mode;
}

export async function resolveHubGwAuthProvider(
  env: NodeJS.ProcessEnv = process.env,
  scope: HubGwOrganizationScope = {}
): Promise<string | null> {
  const runtime = await resolveHubGwAuthRuntime(env, scope);
  return resolveProviderIdForRuntime(runtime);
}

export async function resolveHubGwAuthClientConfig(
  env: NodeJS.ProcessEnv = process.env,
  scope: HubGwOrganizationScope = {}
): Promise<{ mode: HubGwResolvedAuthMode; providerId: string | null }> {
  const runtime = await resolveHubGwAuthRuntime(env, scope);
  return {
    mode: runtime.mode,
    providerId: resolveProviderIdForRuntime(runtime),
  };
}

function getClaim(profile: Record<string, unknown>, claimName: string): string | null {
  const value = profile[claimName];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function createDefaultAuthContext(
  mode: HubGwResolvedAuthMode,
  providerId: string | null
): HubGwSessionAuthContext {
  return {
    mode,
    provider: mode === "mock" ? null : providerId,
    frontendUserId: null,
    crmContactId: null,
    crmOrganizationId: null,
    subOrgId: null,
    isSeller: false,
  };
}

function buildOidcProvider(
  config: ResolvedHubGwOidcConfig
): OAuthConfig<Record<string, unknown>> {
  const provider: OAuthConfig<Record<string, unknown>> = {
    id: config.providerId,
    name: config.providerName,
    type: "oauth",
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    checks: ["pkce", "state"],
    idToken: true,
    profile(profile) {
      const subject = getClaim(profile, config.subClaim);
      const email = getClaim(profile, config.emailClaim);
      const name = getClaim(profile, config.nameClaim);
      return {
        id: subject || email || "unknown",
        email: email || null,
        name: name || email || subject || "Mitglied",
      };
    },
  };

  if (config.issuer) {
    const normalizedIssuer = config.issuer.replace(/\/$/, "");
    provider.issuer = normalizedIssuer;
    provider.wellKnown = `${normalizedIssuer}/.well-known/openid-configuration`;
  }

  if (config.authorizationUrl) {
    provider.authorization = {
      url: config.authorizationUrl,
      params: { scope: config.scope },
    };
  } else {
    provider.authorization = { params: { scope: config.scope } };
  }

  if (config.tokenUrl) {
    provider.token = { url: config.tokenUrl };
  }

  if (config.userinfoUrl) {
    provider.userinfo = { url: config.userinfoUrl };
  }

  return provider;
}

async function authenticatePlatformCredentials(
  env: NodeJS.ProcessEnv,
  credentials: Record<string, string | undefined> | undefined
): Promise<HubGwAuthUser | null> {
  const email = normalizeEmail(credentials?.email);
  const password = typeof credentials?.password === "string" ? credentials.password : "";

  if (!email || !password) {
    return null;
  }

  try {
    const response = await fetch(
      `${getApiBaseUrl(env).replace(/\/+$/, "")}/api/v1/auth/sign-in`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const payload = (await response.json().catch(() => null)) as
      | PlatformSignInResponse
      | null;

    if (!response.ok || payload?.success === false) {
      return null;
    }

    const sessionId = normalizeOptionalString(payload?.sessionId);
    const userId = normalizeOptionalString(payload?.userId);
    const normalizedEmail = normalizeEmail(payload?.email) || email;
    const user = toObject(payload?.user);
    const firstName = normalizeOptionalString(user.firstName);
    const lastName = normalizeOptionalString(user.lastName);
    const fallbackName = normalizeOptionalString(user.name);
    const name = [firstName, lastName].filter(Boolean).join(" ") || fallbackName || normalizedEmail;

    if (!sessionId || !userId || !normalizedEmail) {
      console.error("[hub-gw-auth] Platform credentials login returned incomplete payload");
      return null;
    }

    const expiresAt =
      typeof payload?.expiresAt === "number" ? payload.expiresAt : undefined;

    return {
      id: userId,
      email: normalizedEmail,
      name,
      platformSessionId: sessionId,
      platformSessionExpiresAt: expiresAt,
      platformUserId: userId,
    };
  } catch (error) {
    console.error("[hub-gw-auth] Platform credentials login failed", error);
    return null;
  }
}

function buildPlatformProvider(
  env: NodeJS.ProcessEnv
): ReturnType<typeof CredentialsProvider> {
  return CredentialsProvider({
    id: PLATFORM_PROVIDER_ID,
    name: PLATFORM_PROVIDER_NAME,
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Passwort", type: "password" },
    },
    async authorize(credentials) {
      return await authenticatePlatformCredentials(env, credentials);
    },
  });
}

async function invalidatePlatformSession(
  env: NodeJS.ProcessEnv,
  sessionId: string
): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl(env).replace(/\/+$/, "")}/api/v1/auth/sign-out`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ sessionId }),
    });
  } catch (error) {
    console.warn("[hub-gw-auth] Failed to invalidate platform session", error);
  }
}

export async function getHubGwAuthOptions(
  env: NodeJS.ProcessEnv = process.env,
  scope: HubGwOrganizationScope = {}
): Promise<NextAuthOptions> {
  const runtime = await resolveHubGwAuthRuntime(env, scope);
  const mode = runtime.mode;
  const oidcConfig = runtime.oidcConfig;

  const secret = env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required for Hub-GW auth");
  }

  const providerId = resolveProviderIdForRuntime(runtime);
  const defaultContext = createDefaultAuthContext(mode, providerId);

  return {
    secret,
    session: { strategy: "jwt" },
    providers:
      mode === "oidc" && oidcConfig
        ? [buildOidcProvider(oidcConfig)]
        : mode === "platform"
          ? [buildPlatformProvider(env)]
          : [],
    pages: {
      signIn: "/auth/signin",
    },
    callbacks: {
      async signIn({ user, account }) {
        if (mode === "oidc") {
          if (!oidcConfig) {
            return false;
          }

          const email = user.email?.trim().toLowerCase();
          const oauthId = account?.providerAccountId?.trim();
          const provider = account?.provider || providerId || DEFAULT_OIDC_PROVIDER_ID;
          if (!email || !oauthId) {
            console.error(
              "[hub-gw-auth] Missing required email/providerAccountId in OIDC callback"
            );
            return false;
          }

          try {
            const synced = await syncHubGwFrontendIdentity(
              {
                email,
                name: user.name,
                oauthProvider: provider,
                oauthId,
              },
              scope
            );

            (user as HubGwAuthUser).auth = {
              mode: "oidc",
              provider,
              frontendUserId: synced.frontendUserId,
              crmContactId: synced.crmContactId,
              crmOrganizationId: synced.crmOrganizationId,
              subOrgId: synced.subOrgId,
              isSeller: synced.isSeller,
            };
            return true;
          } catch (error) {
            console.error("[hub-gw-auth] Failed to sync frontend identity", error);
            return false;
          }
        }

        if (mode === "platform") {
          const platformUser = user as HubGwAuthUser;
          const email = normalizeEmail(platformUser.email);
          const platformUserId =
            normalizeOptionalString(platformUser.platformUserId) ||
            normalizeOptionalString(platformUser.id);

          if (!email || !platformUserId) {
            console.error("[hub-gw-auth] Missing required identity from platform credentials callback");
            return false;
          }

          try {
            const synced = await syncHubGwFrontendIdentity(
              {
                email,
                name: platformUser.name,
                oauthProvider: PLATFORM_OAUTH_PROVIDER_KEY,
                oauthId: platformUserId,
              },
              scope
            );

            platformUser.auth = {
              mode: "platform",
              provider: providerId || PLATFORM_PROVIDER_ID,
              frontendUserId: synced.frontendUserId,
              crmContactId: synced.crmContactId,
              crmOrganizationId: synced.crmOrganizationId,
              subOrgId: synced.subOrgId,
              isSeller: synced.isSeller,
            };
            return true;
          } catch (error) {
            console.error("[hub-gw-auth] Failed to sync platform identity", error);
            return false;
          }
        }

        return true;
      },

      async jwt({ token, user }): Promise<JWT> {
        const typedToken = token as HubGwAuthToken;
        const hubGwUser = user as HubGwAuthUser | undefined;

        if (hubGwUser?.auth) {
          typedToken.auth = hubGwUser.auth;
        }

        if (hubGwUser?.platformSessionId) {
          typedToken.platformSessionId = hubGwUser.platformSessionId;
        }

        if (typeof hubGwUser?.platformSessionExpiresAt === "number") {
          typedToken.platformSessionExpiresAt = hubGwUser.platformSessionExpiresAt;
        }

        if (!typedToken.auth) {
          typedToken.auth = defaultContext;
        }

        return typedToken;
      },

      async session({ session, token }) {
        const typedToken = token as HubGwAuthToken;
        session.auth = typedToken.auth || defaultContext;
        return session;
      },
    },
    events: {
      async signOut({ token }) {
        if (mode !== "platform") {
          return;
        }

        const typedToken = token as HubGwAuthToken | undefined;
        const sessionId = normalizeOptionalString(typedToken?.platformSessionId);
        if (!sessionId) {
          return;
        }

        await invalidatePlatformSession(env, sessionId);
      },
    },
  };
}
