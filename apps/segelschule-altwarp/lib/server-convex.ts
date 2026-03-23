import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";

// ---------------------------------------------------------------------------
// Connection 1: Direct Convex (server-side API routes)
// ---------------------------------------------------------------------------

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
    process.env.TEST_ORG_ID ||
    process.env.NEXT_PUBLIC_ORG_ID ||
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
