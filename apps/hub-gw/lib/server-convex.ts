import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import type { Id } from "../../../convex/_generated/dataModel";

// Dynamic require avoids excessively deep Convex API type instantiation in Next.js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../../../convex/_generated/api").internal;

export interface HubGwFrontendIdentitySyncInput {
  email: string;
  name?: string | null;
  oauthProvider: string;
  oauthId: string;
}

export interface HubGwFrontendIdentitySyncResult {
  frontendUserId: Id<"objects">;
  email: string;
  displayName: string;
  crmContactId: Id<"objects"> | null;
  crmOrganizationId: Id<"objects"> | null;
  subOrgId: Id<"organizations"> | null;
  isSeller: boolean;
}

export interface HubGwOidcIntegrationConfig {
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

export interface HubGwOrganizationScope {
  organizationId?: string | null;
  requestHost?: string | null;
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

type InternalQueryRef = FunctionReference<"query", "internal">;
type InternalMutationRef = FunctionReference<"mutation", "internal">;
type InternalActionRef = FunctionReference<"action", "internal">;

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

export async function syncHubGwFrontendIdentity(
  args: HubGwFrontendIdentitySyncInput,
  scope: HubGwOrganizationScope = {}
): Promise<HubGwFrontendIdentitySyncResult> {
  const organizationId = await resolveHubGwOrganizationId(scope);
  if (!organizationId) {
    throw new Error(
      "Unable to resolve organization scope for Hub-GW identity sync. Provide scoped organization context."
    );
  }

  const convex = getConvexClient();
  const email = args.email.trim().toLowerCase();
  const displayName = args.name?.trim() || email;

  const frontendIdentity = await mutateInternal(
    convex,
    generatedInternalApi.auth.syncFrontendUser,
    {
      email,
      name: displayName,
      oauthProvider: args.oauthProvider,
      oauthId: args.oauthId,
      organizationId: organizationId as Id<"organizations">,
    }
  ) as HubGwFrontendIdentitySyncResult;

  return {
    frontendUserId: frontendIdentity.frontendUserId,
    email: frontendIdentity.email,
    displayName: frontendIdentity.displayName,
    crmContactId: frontendIdentity.crmContactId,
    crmOrganizationId: frontendIdentity.crmOrganizationId,
    subOrgId: frontendIdentity.subOrgId,
    isSeller: frontendIdentity.isSeller,
  };
}

export async function getHubGwOidcIntegrationConfig(
  scope: HubGwOrganizationScope = {}
): Promise<HubGwOidcIntegrationConfig | null> {
  const organizationId = await resolveHubGwOrganizationId(scope);
  if (!organizationId) {
    return null;
  }

  const convex = getConvexClient();
  const integrationConfig = (await actionInternal(
    convex,
    generatedInternalApi.frontendOidcInternal.getOrganizationFrontendOidcRuntimeBinding,
    {
      organizationId: organizationId as Id<"organizations">,
    }
  )) as HubGwOidcIntegrationConfig | null;

  if (!integrationConfig) {
    return null;
  }
  return integrationConfig;
}

export async function resolveHubGwOrganizationId(
  scope: HubGwOrganizationScope = {}
): Promise<string | null> {
  const explicitOrganizationId = normalizeOptionalString(scope.organizationId);
  if (explicitOrganizationId) {
    return explicitOrganizationId;
  }

  const requestHost = normalizeRequestHost(scope.requestHost);
  if (!requestHost) {
    return null;
  }

  const convex = getConvexClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolution = (await queryInternal(
      convex,
      generatedInternalApi.frontendOidcInternal
        .resolveFrontendOrganizationFromHostInternal,
      { host: requestHost }
    )) as any;

    if (resolution?.status === "resolved" && resolution.organizationId) {
      return String(resolution.organizationId);
    }

    if (resolution?.status === "ambiguous") {
      console.error(
        "[hub-gw-org-scope] Ambiguous organization match for host",
        requestHost,
        resolution
      );
    }
  } catch (error) {
    console.error(
      "[hub-gw-org-scope] Failed to resolve organization from host",
      requestHost,
      error
    );
  }

  return null;
}
