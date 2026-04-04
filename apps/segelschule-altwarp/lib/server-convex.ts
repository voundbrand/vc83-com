import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";

// ---------------------------------------------------------------------------
// Connection 1: Direct Convex (server-side API routes)
// ---------------------------------------------------------------------------

export interface SegelschuleOrganizationScope {
  organizationId?: string | null;
  requestHost?: string | null;
}

export interface SegelschuleOidcIntegrationConfig {
  providerId: string;
  providerName: string;
  clientId: string;
  clientSecret: string;
  issuer: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
  scope: string | null;
  subClaim: string | null;
  emailClaim: string | null;
  nameClaim: string | null;
}

interface FrontendOrganizationResolution {
  status: "resolved" | "ambiguous" | "missing";
  organizationId: string | null;
  matchedDomain: string | null;
  candidateCount: number;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequestHost(value: string | null | undefined): string | null {
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

export function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const adminToken = process.env.CONVEX_DEPLOY_KEY;

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  if (!adminToken) {
    throw new Error("CONVEX_DEPLOY_KEY is not configured");
  }

  const client = new ConvexHttpClient(convexUrl);
  const maybeAdminClient = client as ConvexHttpClient & {
    setAdminAuth?: (token: string) => void;
  };
  if (typeof maybeAdminClient.setAdminAuth === "function") {
    maybeAdminClient.setAdminAuth(adminToken);
  }
  return client;
}

export function getOrganizationId(): string | null {
  return (
    process.env.ORG_ID ||
    process.env.PLATFORM_ORG_ID ||
    process.env.NEXT_PUBLIC_PLATFORM_ORG_ID ||
    process.env.L4YERCAK3_ORGANIZATION_ID ||
    process.env.NEXT_PUBLIC_ORG_ID ||
    process.env.TEST_ORG_ID ||
    null
  );
}

type InternalQueryRef = FunctionReference<"query", "internal">;
type InternalMutationRef = FunctionReference<"mutation", "internal">;
type InternalActionRef = FunctionReference<"action", "internal">;

export async function queryInternal<QueryRef extends InternalQueryRef>(
  convex: ConvexHttpClient,
  queryRef: QueryRef,
  args: FunctionArgs<QueryRef>
): Promise<FunctionReturnType<QueryRef>> {
  const publicQueryRef =
    queryRef as unknown as FunctionReference<
      "query",
      "public",
      FunctionArgs<QueryRef>,
      FunctionReturnType<QueryRef>
    >;
  return convex.query(publicQueryRef, args);
}

export async function mutateInternal<MutationRef extends InternalMutationRef>(
  convex: ConvexHttpClient,
  mutationRef: MutationRef,
  args: FunctionArgs<MutationRef>
): Promise<FunctionReturnType<MutationRef>> {
  const publicMutationRef =
    mutationRef as unknown as FunctionReference<
      "mutation",
      "public",
      FunctionArgs<MutationRef>,
      FunctionReturnType<MutationRef>
    >;
  return convex.mutation(publicMutationRef, args);
}

export async function actionInternal<ActionRef extends InternalActionRef>(
  convex: ConvexHttpClient,
  actionRef: ActionRef,
  args: FunctionArgs<ActionRef>
): Promise<FunctionReturnType<ActionRef>> {
  const publicActionRef =
    actionRef as unknown as FunctionReference<
      "action",
      "public",
      FunctionArgs<ActionRef>,
      FunctionReturnType<ActionRef>
    >;
  return convex.action(publicActionRef, args);
}

export async function resolveSegelschuleOrganizationId(
  scope: SegelschuleOrganizationScope = {}
): Promise<string | null> {
  const explicitOrganizationId = normalizeOptionalString(scope.organizationId);
  if (explicitOrganizationId) {
    return explicitOrganizationId;
  }

  const requestHost = normalizeRequestHost(scope.requestHost);
  if (!requestHost) {
    return getOrganizationId();
  }

  // Dynamic require avoids excessively deep Convex API type instantiation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generatedInternalApi: any =
    require("../../../convex/_generated/api").internal;

  try {
    const convex = getConvexClient();
    const resolution = (await queryInternal(
      convex,
      generatedInternalApi.frontendOidcInternal
        .resolveFrontendOrganizationFromHostInternal,
      { host: requestHost }
    )) as FrontendOrganizationResolution | null;

    if (resolution?.status === "resolved" && resolution.organizationId) {
      return String(resolution.organizationId);
    }

    if (resolution?.status === "ambiguous") {
      console.error(
        "[segelschule-org-scope] Ambiguous organization match for host",
        requestHost,
        resolution
      );
    }
  } catch (error) {
    console.error(
      "[segelschule-org-scope] Failed to resolve organization from host; falling back to env org scope",
      requestHost,
      error
    );
  }

  return getOrganizationId();
}

export async function getSegelschuleOidcIntegrationConfig(
  scope: SegelschuleOrganizationScope = {}
): Promise<SegelschuleOidcIntegrationConfig | null> {
  const organizationId = await resolveSegelschuleOrganizationId(scope);
  if (!organizationId) {
    return null;
  }

  // Dynamic require avoids excessively deep Convex API type instantiation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generatedInternalApi: any =
    require("../../../convex/_generated/api").internal;

  const convex = getConvexClient();
  return (await actionInternal(
    convex,
    generatedInternalApi.frontendOidcInternal
      .getOrganizationFrontendOidcRuntimeBinding,
    { organizationId }
  )) as SegelschuleOidcIntegrationConfig | null;
}

// ---------------------------------------------------------------------------
// Connection 2: Main App API (org API key auth)
// Authenticates to the main vc83-com app's /api/v1/* endpoints using an
// org-scoped API key (sk_live_...). The main app's middleware validates
// the key and resolves the org context automatically.
// ---------------------------------------------------------------------------

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_ENDPOINT_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export function getOrgApiKey(): string {
  const key = process.env.ORG_API_KEY;
  if (!key) {
    throw new Error("ORG_API_KEY is not configured");
  }
  return key;
}

export function getOrgApiHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getOrgApiKey()}`,
    "Content-Type": "application/json",
  };
}

export async function apiRequest<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: getOrgApiHeaders(),
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(
      `API request failed (${response.status}): ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}
