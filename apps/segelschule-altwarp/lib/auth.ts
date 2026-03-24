import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { OAuthConfig } from "next-auth/providers/oauth";
import type { JWT } from "next-auth/jwt";
import {
  getApiBaseUrl,
  getConvexClient,
  getSegelschuleOidcIntegrationConfig,
  mutateInternal,
  queryInternal,
  resolveSegelschuleOrganizationId,
  type SegelschuleOidcIntegrationConfig,
  type SegelschuleOrganizationScope,
} from "@/lib/server-convex";

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../convex/_generated/api").internal;

type RequestedAuthMode = "auto" | "mock" | "platform" | "oidc";
export type SegelschuleResolvedAuthMode = "mock" | "platform" | "oidc";

const DEFAULT_SCOPE = "openid profile email";
const DEFAULT_SUB_CLAIM = "sub";
const DEFAULT_EMAIL_CLAIM = "email";
const DEFAULT_NAME_CLAIM = "name";
const DEFAULT_OIDC_PROVIDER_ID = "frontend_oidc";
const DEFAULT_OIDC_PROVIDER_NAME = "Organization OIDC";
const PLATFORM_PROVIDER_ID = "platform";
const PLATFORM_PROVIDER_NAME = "Platform Account";
const PLATFORM_SESSION_PROVIDER_ID = "platform_session";
const PLATFORM_SESSION_PROVIDER_NAME = "Platform Session";

export interface SegelschuleSessionAuthContext {
  mode: SegelschuleResolvedAuthMode;
  provider: string | null;
  platformUserId: string | null;
  scopeOrganizationId: string | null;
}

interface SegelschuleAuthUser extends NextAuthUser {
  auth?: SegelschuleSessionAuthContext;
  platformSessionId?: string;
  platformSessionExpiresAt?: number;
  platformUserId?: string;
}

interface SegelschuleAuthToken extends JWT {
  auth?: SegelschuleSessionAuthContext;
  platformSessionId?: string | null;
  platformSessionExpiresAt?: number | null;
}

interface ResolvedSegelschuleOidcConfig {
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

interface SegelschuleAuthRuntimeResolution {
  mode: SegelschuleResolvedAuthMode;
  oidcConfig: ResolvedSegelschuleOidcConfig | null;
  scopeOrganizationId: string | null;
}

interface PlatformSignInResponse {
  success?: boolean;
  sessionId?: string;
  userId?: string;
  email?: string;
  organizationId?: string;
  expiresAt?: number;
  user?: unknown;
  error?: string;
}

interface PlatformUserLookup {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  defaultOrgId?: string | null;
  isActive?: boolean;
}

interface PlatformSessionContextLookup {
  sessionId: string;
  userId: string;
  organizationId: string;
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

function getRequestedMode(env: NodeJS.ProcessEnv): RequestedAuthMode {
  const rawValue = (env.SEGELSCHULE_AUTH_MODE || "auto").trim().toLowerCase();
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
  integrationConfig: SegelschuleOidcIntegrationConfig
): ResolvedSegelschuleOidcConfig | null {
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
  scope: SegelschuleOrganizationScope
): Promise<SegelschuleOidcIntegrationConfig | null> {
  try {
    return await getSegelschuleOidcIntegrationConfig(scope);
  } catch (error) {
    console.error(
      "[segelschule-auth] Failed to load frontend OIDC integration config",
      error
    );
    return null;
  }
}

async function resolveRuntimeOidcConfig(
  scope: SegelschuleOrganizationScope
): Promise<ResolvedSegelschuleOidcConfig | null> {
  const integrationConfig = await getOrganizationOidcConfigSafe(scope);
  if (!integrationConfig) {
    return null;
  }

  const resolvedFromIntegration = buildIntegrationOidcConfig(integrationConfig);
  if (!resolvedFromIntegration) {
    console.error(
      "[segelschule-auth] frontend_oidc integration is active but incomplete"
    );
    return null;
  }

  return resolvedFromIntegration;
}

function resolveProviderIdForRuntime(
  runtime: SegelschuleAuthRuntimeResolution
): string | null {
  if (runtime.mode === "oidc") {
    return runtime.oidcConfig?.providerId || DEFAULT_OIDC_PROVIDER_ID;
  }
  if (runtime.mode === "platform") {
    return PLATFORM_PROVIDER_ID;
  }
  return null;
}

async function resolveSegelschuleAuthRuntime(
  env: NodeJS.ProcessEnv = process.env,
  scope: SegelschuleOrganizationScope = {}
): Promise<SegelschuleAuthRuntimeResolution> {
  const requestedMode = getRequestedMode(env);
  const scopeOrganizationId = await resolveSegelschuleOrganizationId(scope);
  const scopeWithOrg = {
    ...scope,
    organizationId: scopeOrganizationId,
  };

  if (requestedMode === "mock") {
    if (env.NODE_ENV === "production") {
      throw new Error("SEGELSCHULE_AUTH_MODE=mock is not allowed in production");
    }
    return { mode: "mock", oidcConfig: null, scopeOrganizationId };
  }

  if (requestedMode === "platform") {
    return { mode: "platform", oidcConfig: null, scopeOrganizationId };
  }

  const oidcConfig = await resolveRuntimeOidcConfig(scopeWithOrg);

  if (requestedMode === "oidc" && !oidcConfig) {
    throw new Error(
      "SEGELSCHULE_AUTH_MODE=oidc requires a valid frontend_oidc integration for the resolved organization scope"
    );
  }

  if (oidcConfig) {
    return {
      mode: "oidc",
      oidcConfig,
      scopeOrganizationId,
    };
  }

  return {
    mode: "platform",
    oidcConfig: null,
    scopeOrganizationId,
  };
}

export async function resolveSegelschuleAuthMode(
  env: NodeJS.ProcessEnv = process.env,
  scope: SegelschuleOrganizationScope = {}
): Promise<SegelschuleResolvedAuthMode> {
  const runtime = await resolveSegelschuleAuthRuntime(env, scope);
  return runtime.mode;
}

export async function resolveSegelschuleAuthProvider(
  env: NodeJS.ProcessEnv = process.env,
  scope: SegelschuleOrganizationScope = {}
): Promise<string | null> {
  const runtime = await resolveSegelschuleAuthRuntime(env, scope);
  return resolveProviderIdForRuntime(runtime);
}

export async function resolveSegelschuleAuthClientConfig(
  env: NodeJS.ProcessEnv = process.env,
  scope: SegelschuleOrganizationScope = {}
): Promise<{ mode: SegelschuleResolvedAuthMode; providerId: string | null }> {
  const runtime = await resolveSegelschuleAuthRuntime(env, scope);
  return {
    mode: runtime.mode,
    providerId: resolveProviderIdForRuntime(runtime),
  };
}

export function getAuthSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required for segelschule auth");
  }
  return secret;
}

function getClaim(profile: Record<string, unknown>, claimName: string): string | null {
  const value = profile[claimName];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function createDefaultAuthContext(
  mode: SegelschuleResolvedAuthMode,
  providerId: string | null,
  scopeOrganizationId: string | null
): SegelschuleSessionAuthContext {
  return {
    mode,
    provider: mode === "mock" ? null : providerId,
    platformUserId: null,
    scopeOrganizationId,
  };
}

function buildOidcProvider(
  config: ResolvedSegelschuleOidcConfig
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
  credentials: Record<string, string | undefined> | undefined
): Promise<SegelschuleAuthUser | null> {
  const email = normalizeEmail(credentials?.email);
  const password = typeof credentials?.password === "string" ? credentials.password : "";

  if (!email || !password) {
    return null;
  }

  try {
    const response = await fetch(
      `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1/auth/sign-in`,
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
    const name =
      [firstName, lastName].filter(Boolean).join(" ") ||
      fallbackName ||
      normalizedEmail;

    if (!sessionId || !userId || !normalizedEmail) {
      console.error(
        "[segelschule-auth] Platform credentials login returned incomplete payload"
      );
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
    console.error("[segelschule-auth] Platform credentials login failed", error);
    return null;
  }
}

async function authenticatePlatformSessionToken(
  sessionToken: string,
  scopeOrganizationId: string | null
): Promise<SegelschuleAuthUser | null> {
  const convex = getConvexClient();
  const sessionContext = (await queryInternal(
    convex,
    generatedInternalApi.api.v1.emailAuthInternal.resolveSessionContext,
    { sessionId: sessionToken }
  )) as PlatformSessionContextLookup | null;

  if (!sessionContext) {
    return null;
  }

  const sessionId = normalizeOptionalString(sessionContext.sessionId);
  const userId = normalizeOptionalString(sessionContext.userId);
  const organizationId = normalizeOptionalString(sessionContext.organizationId);
  if (!sessionId || !userId || !organizationId) {
    return null;
  }

  if (scopeOrganizationId && organizationId !== scopeOrganizationId) {
    console.warn(
      "[segelschule-auth] Rejected platform session token due to host/org scope mismatch",
      {
        scopeOrganizationId,
        organizationId,
      }
    );
    return null;
  }

  const rawUser = (await queryInternal(
    convex,
    generatedInternalApi.api.v1.cliAuth.getUserById,
    { userId }
  )) as Record<string, unknown> | null;
  if (!rawUser) {
    return null;
  }

  if (rawUser.isActive === false) {
    return null;
  }

  const normalizedEmail = normalizeEmail(rawUser.email);
  if (!normalizedEmail) {
    return null;
  }

  const firstName = normalizeOptionalString(rawUser.firstName);
  const lastName = normalizeOptionalString(rawUser.lastName);
  const fallbackName = normalizeOptionalString(rawUser.name);
  const name =
    [firstName, lastName].filter(Boolean).join(" ") ||
    fallbackName ||
    normalizedEmail;

  return {
    id: normalizeOptionalString(rawUser._id) || userId,
    email: normalizedEmail,
    name,
    platformSessionId: sessionId,
    platformUserId: normalizeOptionalString(rawUser._id) || userId,
  };
}

function buildPlatformProvider(
): ReturnType<typeof CredentialsProvider> {
  return CredentialsProvider({
    id: PLATFORM_PROVIDER_ID,
    name: PLATFORM_PROVIDER_NAME,
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Passwort", type: "password" },
    },
    async authorize(credentials) {
      return await authenticatePlatformCredentials(credentials);
    },
  });
}

function buildPlatformSessionProvider(
  scopeOrganizationId: string | null
): ReturnType<typeof CredentialsProvider> {
  return CredentialsProvider({
    id: PLATFORM_SESSION_PROVIDER_ID,
    name: PLATFORM_SESSION_PROVIDER_NAME,
    credentials: {
      sessionToken: { label: "Session token", type: "text" },
    },
    async authorize(credentials) {
      const sessionToken = normalizeOptionalString(credentials?.sessionToken);
      if (!sessionToken) {
        return null;
      }

      return await authenticatePlatformSessionToken(
        sessionToken,
        scopeOrganizationId
      );
    },
  });
}

async function invalidatePlatformSession(sessionId: string): Promise<void> {
  try {
    const convex = getConvexClient();
    await mutateInternal(
      convex,
      generatedInternalApi.api.v1.emailAuthInternal.deleteSession,
      { sessionId }
    );
  } catch (error) {
    console.warn("[segelschule-auth] Failed to invalidate platform session", error);
  }
}

async function findPlatformUserByEmail(
  email: string
): Promise<PlatformUserLookup | null> {
  const convex = getConvexClient();
  const record = (await queryInternal(
    convex,
    generatedInternalApi.api.v1.emailAuthInternal.findUserByEmail,
    { email }
  )) as PlatformUserLookup | null;

  if (!record) {
    return null;
  }

  return {
    _id: String(record._id),
    email: String(record.email),
    firstName: normalizeOptionalString(record.firstName) || undefined,
    lastName: normalizeOptionalString(record.lastName) || undefined,
    defaultOrgId: normalizeOptionalString(record.defaultOrgId),
    isActive: record.isActive !== false,
  };
}

async function createPlatformSessionForUser(args: {
  userId: string;
  email: string;
  organizationId: string;
}): Promise<{ sessionId: string; expiresAt: number }> {
  const convex = getConvexClient();

  await mutateInternal(
    convex,
    generatedInternalApi.organizations.ensureOperatorAuthorityBootstrapInternal,
    {
      organizationId: args.organizationId,
      appSurface: "platform_web",
    }
  );

  const sessionId = (await mutateInternal(
    convex,
    generatedInternalApi.api.v1.oauthSignup.createPlatformSession,
    {
      userId: args.userId,
      email: args.email,
      organizationId: args.organizationId,
    }
  )) as string;

  return {
    sessionId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

export function extractPlatformSessionIdFromToken(
  token: JWT | null | undefined
): string | null {
  if (!token || typeof token !== "object") {
    return null;
  }
  const typedToken = token as SegelschuleAuthToken;
  return normalizeOptionalString(typedToken.platformSessionId);
}

export async function getSegelschuleAuthOptions(
  env: NodeJS.ProcessEnv = process.env,
  scope: SegelschuleOrganizationScope = {}
): Promise<NextAuthOptions> {
  const runtime = await resolveSegelschuleAuthRuntime(env, scope);
  const mode = runtime.mode;
  const oidcConfig = runtime.oidcConfig;
  const providerId = resolveProviderIdForRuntime(runtime);
  const defaultContext = createDefaultAuthContext(
    mode,
    providerId,
    runtime.scopeOrganizationId
  );

  return {
    secret: getAuthSecret(env),
    session: { strategy: "jwt" },
    providers:
      mode === "oidc" && oidcConfig
        ? [buildOidcProvider(oidcConfig)]
        : mode === "platform"
          ? [
              buildPlatformProvider(),
              buildPlatformSessionProvider(runtime.scopeOrganizationId),
            ]
          : [],
    callbacks: {
      async signIn({ user, account }) {
        if (mode === "oidc") {
          if (!oidcConfig) {
            return false;
          }

          const email = normalizeEmail(user.email);
          if (!email) {
            console.error("[segelschule-auth] OIDC callback did not include email");
            return false;
          }

          const platformUser = await findPlatformUserByEmail(email);
          if (!platformUser || platformUser.isActive === false) {
            console.warn(
              "[segelschule-auth] OIDC user does not map to an active platform account",
              { email }
            );
            return false;
          }

          const sessionOrganizationId =
            runtime.scopeOrganizationId || platformUser.defaultOrgId;
          if (!sessionOrganizationId) {
            console.error(
              "[segelschule-auth] No organization scope available for OIDC platform session",
              { email }
            );
            return false;
          }

          const createdSession = await createPlatformSessionForUser({
            userId: platformUser._id,
            email: platformUser.email,
            organizationId: sessionOrganizationId,
          });

          const typedUser = user as SegelschuleAuthUser;
          typedUser.platformSessionId = createdSession.sessionId;
          typedUser.platformSessionExpiresAt = createdSession.expiresAt;
          typedUser.platformUserId = platformUser._id;
          typedUser.auth = {
            mode: "oidc",
            provider: account?.provider || providerId || DEFAULT_OIDC_PROVIDER_ID,
            platformUserId: platformUser._id,
            scopeOrganizationId: runtime.scopeOrganizationId,
          };

          return true;
        }

        if (mode === "platform") {
          const platformUser = user as SegelschuleAuthUser;
          const platformUserId =
            normalizeOptionalString(platformUser.platformUserId) ||
            normalizeOptionalString(platformUser.id);
          const platformSessionId = normalizeOptionalString(
            platformUser.platformSessionId
          );

          if (!platformUserId || !platformSessionId) {
            console.error(
              "[segelschule-auth] Missing required identity in platform sign-in callback"
            );
            return false;
          }

          platformUser.auth = {
            mode: "platform",
            provider: providerId || PLATFORM_PROVIDER_ID,
            platformUserId,
            scopeOrganizationId: runtime.scopeOrganizationId,
          };
          return true;
        }

        return true;
      },

      async jwt({ token, user }): Promise<JWT> {
        const typedToken = token as SegelschuleAuthToken;
        const typedUser = user as SegelschuleAuthUser | undefined;

        if (typedUser?.auth) {
          typedToken.auth = typedUser.auth;
        }

        if (typedUser?.platformSessionId) {
          typedToken.platformSessionId = typedUser.platformSessionId;
        }

        if (typeof typedUser?.platformSessionExpiresAt === "number") {
          typedToken.platformSessionExpiresAt = typedUser.platformSessionExpiresAt;
        }

        if (!typedToken.auth) {
          typedToken.auth = defaultContext;
        }

        return typedToken;
      },

      async session({ session, token }) {
        const typedToken = token as SegelschuleAuthToken;
        session.auth = typedToken.auth || defaultContext;
        return session;
      },
    },
    events: {
      async signOut({ token }) {
        const typedToken = token as SegelschuleAuthToken | undefined;
        const sessionId = normalizeOptionalString(typedToken?.platformSessionId);
        if (!sessionId) {
          return;
        }
        await invalidatePlatformSession(sessionId);
      },
    },
  };
}
