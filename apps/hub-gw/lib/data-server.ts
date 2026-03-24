import type { Benefit, Provision, Leistung } from "./types";
import {
  getConvexClient,
  queryInternal,
  resolveHubGwOrganizationId,
  type HubGwOrganizationScope,
} from "./server-convex";
import {
  initialBenefits,
  initialProvisionen,
  initialLeistungen,
} from "./mock-data";
import type { Id } from "../../../convex/_generated/dataModel";

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../../../convex/_generated/api").internal;

// ============================================================================
// Helpers
// ============================================================================

function isConvexConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_CONVEX_URL && process.env.CONVEX_DEPLOY_KEY);
}

export type HubGwDataScope = HubGwOrganizationScope;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConvexObject = Record<string, any>;

function providerFromOfferer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  offerer: Record<string, any> | null | undefined
): { name: string; type: "person" | "startup"; profileLink?: string } {
  if (!offerer) {
    return { name: "Unknown", type: "person" };
  }
  return {
    name: offerer.name || "Unknown",
    type: offerer.customProperties?.providerType === "startup" ? "startup" : "person",
    profileLink: offerer.customProperties?.profileLink,
  };
}

// ============================================================================
// Mappers: Convex objects → hub-gw app types
// ============================================================================

function mapBenefit(obj: ConvexObject): Benefit {
  const cp = obj.customProperties || {};
  return {
    id: obj._id,
    title: obj.name || "",
    description: obj.description || "",
    fullDescription: cp.fullDescription,
    redemptionInstructions: cp.redemptionInstructions,
    redemptionCode: cp.redemptionCode,
    redemptionLink: cp.redemptionLink,
    category: cp.category || obj.subtype || "",
    provider: providerFromOfferer(obj.offerer),
    discount: cp.discountValue
      ? cp.discountType === "percentage"
        ? `${cp.discountValue}%`
        : `${cp.discountValue}€`
      : cp.discount,
    image: cp.image,
    ownerId: obj.createdBy || "",
    views: cp.views || 0,
    clicks: cp.clicks || 0,
  };
}

function mapProvision(obj: ConvexObject): Provision {
  const cp = obj.customProperties || {};
  return {
    id: obj._id,
    title: obj.name || "",
    description: obj.description || "",
    fullDescription: cp.fullDescription,
    category: cp.category || obj.subtype || "",
    commission: cp.commissionValue
      ? cp.commissionType === "percentage"
        ? `${cp.commissionValue}%`
        : `${cp.commissionValue}€`
      : cp.commission || "",
    provider: providerFromOfferer(obj.offerer),
    image: cp.image,
    ownerId: obj.createdBy || "",
    views: cp.views || 0,
    clicks: cp.clicks || 0,
  };
}

function mapLeistung(obj: ConvexObject): Leistung {
  const cp = obj.customProperties || {};
  return {
    id: obj._id,
    title: obj.name || "",
    description: obj.description || "",
    fullDescription: cp.fullDescription,
    category: cp.category || obj.subtype || "",
    skills: cp.skills || [],
    hourlyRate: cp.hourlyRate,
    location: cp.location || "",
    provider: providerFromOfferer(obj.offerer),
    rating: cp.rating || 0,
    image: cp.image,
    ownerId: obj.createdBy || "",
    views: cp.views || 0,
    clicks: cp.clicks || 0,
  };
}

// ============================================================================
// Server-side fetch functions
// ============================================================================

export async function fetchBenefits(
  scope: HubGwDataScope = {}
): Promise<Benefit[]> {
  if (!isConvexConfigured()) return initialBenefits;

  try {
    const convex = getConvexClient();
    const organizationId = await resolveHubGwOrganizationId(scope);
    if (!organizationId) {
      return initialBenefits;
    }
    const orgId = organizationId as Id<"organizations">;

    const objects = await queryInternal(
      convex,
      generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
      { organizationId: orgId, type: "benefit" }
    );

    const active = (objects as ConvexObject[]).filter(
      (o) => o.status === "active"
    );
    return active.map(mapBenefit);
  } catch (error) {
    console.error("[data-server] Failed to fetch benefits, using mock data:", error);
    return initialBenefits;
  }
}

export async function fetchProvisionen(
  scope: HubGwDataScope = {}
): Promise<Provision[]> {
  if (!isConvexConfigured()) return initialProvisionen;

  try {
    const convex = getConvexClient();
    const organizationId = await resolveHubGwOrganizationId(scope);
    if (!organizationId) {
      return initialProvisionen;
    }
    const orgId = organizationId as Id<"organizations">;

    const objects = await queryInternal(
      convex,
      generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
      { organizationId: orgId, type: "commission" }
    );

    const active = (objects as ConvexObject[]).filter(
      (o) => o.status === "active"
    );
    return active.map(mapProvision);
  } catch (error) {
    console.error("[data-server] Failed to fetch provisionen, using mock data:", error);
    return initialProvisionen;
  }
}

export async function fetchLeistungen(
  scope: HubGwDataScope = {}
): Promise<Leistung[]> {
  if (!isConvexConfigured()) return initialLeistungen;

  try {
    const convex = getConvexClient();
    const organizationId = await resolveHubGwOrganizationId(scope);
    if (!organizationId) {
      return initialLeistungen;
    }
    const orgId = organizationId as Id<"organizations">;

    const objects = await queryInternal(
      convex,
      generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
      { organizationId: orgId, type: "service" }
    );

    const active = (objects as ConvexObject[]).filter(
      (o) => o.status === "active"
    );
    return active.map(mapLeistung);
  } catch (error) {
    console.error("[data-server] Failed to fetch leistungen, using mock data:", error);
    return initialLeistungen;
  }
}

export async function fetchAllData(
  scope: HubGwDataScope = {}
): Promise<{
  benefits: Benefit[];
  provisionen: Provision[];
  leistungen: Leistung[];
}> {
  const [benefits, provisionen, leistungen] = await Promise.all([
    fetchBenefits(scope),
    fetchProvisionen(scope),
    fetchLeistungen(scope),
  ]);

  return { benefits, provisionen, leistungen };
}
