import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";

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

export function getPlatformOrganizationId(): string | null {
  return (
    process.env.PLATFORM_ORG_ID ||
    process.env.TEST_ORG_ID ||
    process.env.NEXT_PUBLIC_PLATFORM_ORG_ID ||
    null
  );
}

type InternalQueryRef = FunctionReference<"query", "internal">;
type InternalMutationRef = FunctionReference<"mutation", "internal">;

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
