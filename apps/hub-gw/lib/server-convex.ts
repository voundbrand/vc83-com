import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import type { Id } from "../../../convex/_generated/dataModel";
import type { UserBusinessProfile } from "./types";

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

export interface HubGwUserProfileEnrichment {
  crmContactId: string | null;
  crmOrganizationId: string | null;
  phone: string | null;
  business: UserBusinessProfile | null;
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

function resolveFallbackHubGwOrganizationIdFromEnv(): string | null {
  return (
    normalizeOptionalString(process.env.PLATFORM_ORG_ID) ||
    normalizeOptionalString(process.env.NEXT_PUBLIC_PLATFORM_ORG_ID)
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function firstNonEmptyString(
  source: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = normalizeOptionalString(source[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function mapBusinessFromCrmOrganization(
  organizationObject: Record<string, unknown> | null
): UserBusinessProfile | null {
  if (!organizationObject) {
    return null;
  }

  const props = asRecord(organizationObject.customProperties);
  const address = asRecord(props.address);

  const business: UserBusinessProfile = {
    legalName:
      firstNonEmptyString(props, ["legalName", "companyName", "name"]) ||
      normalizeOptionalString(organizationObject.name) ||
      "",
    registerNumber:
      firstNonEmptyString(props, [
        "registerNumber",
        "commercialRegisterNumber",
        "handelsregister",
      ]) || "",
    taxId: firstNonEmptyString(props, ["taxId", "vatId", "ustId"]) || "",
    address: {
      street:
        firstNonEmptyString(address, ["street"]) ||
        firstNonEmptyString(props, ["street"]) ||
        "",
      city:
        firstNonEmptyString(address, ["city"]) ||
        firstNonEmptyString(props, ["city"]) ||
        "",
      postalCode:
        firstNonEmptyString(address, ["postalCode", "zip"]) ||
        firstNonEmptyString(props, ["postalCode", "zip"]) ||
        "",
      country:
        firstNonEmptyString(address, ["country"]) ||
        firstNonEmptyString(props, ["country"]) ||
        "",
    },
    foundedDate:
      firstNonEmptyString(props, ["foundedDate", "foundedAt", "foundationDate"]) ||
      "",
    industry: firstNonEmptyString(props, ["industry", "sector"]) || "",
  };

  const hasAnyField = Boolean(
    business.legalName ||
      business.registerNumber ||
      business.taxId ||
      business.address.street ||
      business.address.city ||
      business.address.postalCode ||
      business.address.country ||
      business.foundedDate ||
      business.industry
  );

  return hasAnyField ? business : null;
}

async function getObjectByIdSafe(
  convex: ConvexHttpClient,
  objectId: string | null
): Promise<Record<string, unknown> | null> {
  if (!objectId) {
    return null;
  }

  try {
    const object = await queryInternal(
      convex,
      generatedInternalApi.channels.router.getObjectByIdInternal,
      { objectId }
    );
    return object && typeof object === "object"
      ? (object as Record<string, unknown>)
      : null;
  } catch (error) {
    console.error("[hub-gw-profile] Failed to load object by id", {
      objectId,
      error,
    });
    return null;
  }
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

export async function getHubGwUserProfileEnrichment(args: {
  crmContactId?: string | null;
  crmOrganizationId?: string | null;
}): Promise<HubGwUserProfileEnrichment> {
  const crmContactId = normalizeOptionalString(args.crmContactId);
  const crmOrganizationId = normalizeOptionalString(args.crmOrganizationId);

  if (!crmContactId && !crmOrganizationId) {
    return {
      crmContactId: null,
      crmOrganizationId: null,
      phone: null,
      business: null,
    };
  }

  const convex = getConvexClient();
  const [contactObject, organizationObject] = await Promise.all([
    getObjectByIdSafe(convex, crmContactId),
    getObjectByIdSafe(convex, crmOrganizationId),
  ]);

  const contactProps = asRecord(contactObject?.customProperties);
  const phone =
    firstNonEmptyString(contactProps, ["phone", "mobile", "telephone", "tel"]) ||
    null;

  return {
    crmContactId,
    crmOrganizationId,
    phone,
    business: mapBusinessFromCrmOrganization(organizationObject),
  };
}

export async function resolveHubGwOrganizationId(
  scope: HubGwOrganizationScope = {}
): Promise<string | null> {
  const explicitOrganizationId = normalizeOptionalString(scope.organizationId);
  if (explicitOrganizationId) {
    return explicitOrganizationId;
  }

  const fallbackOrganizationId = resolveFallbackHubGwOrganizationIdFromEnv();
  const requestHost = normalizeRequestHost(scope.requestHost);
  if (!requestHost) {
    return fallbackOrganizationId;
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

  if (fallbackOrganizationId) {
    console.warn(
      "[hub-gw-org-scope] Falling back to PLATFORM_ORG_ID/NEXT_PUBLIC_PLATFORM_ORG_ID for host",
      requestHost
    );
    return fallbackOrganizationId;
  }

  return null;
}
