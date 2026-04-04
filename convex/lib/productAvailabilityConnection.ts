import type { Id } from "../_generated/dataModel"
import {
  getResourceAvailabilityConnectionSummary,
  type ResourceAvailabilityConnectionSummary,
} from "./resourceAvailabilityConnection"
import {
  getShadowAvailabilityResourceId,
  hasAvailabilityCapability,
  isAvailabilityCarrierCandidate,
} from "./availabilityResources"

export const PRODUCT_AVAILABILITY_LINK_TYPE = "uses_availability_of"

export type ProductAvailabilityConnectionMode = "none" | "self" | "linked"

export interface ProductAvailabilityConnectionSummary
  extends ResourceAvailabilityConnectionSummary {
  productId: Id<"objects">
  productName: string | null
  productSubtype: string | null
  isBookable: boolean
  connectionMode: ProductAvailabilityConnectionMode
  isConnectionValid: boolean
  availabilityResourceId: Id<"objects"> | null
  availabilityResourceName: string | null
  availabilityResourceSubtype: string | null
  availabilityResourceStatus: string | null
}

interface ProductAvailabilityResourceResolution {
  productId: Id<"objects">
  productName: string | null
  productSubtype: string | null
  isBookable: boolean
  connectionMode: ProductAvailabilityConnectionMode
  isConnectionValid: boolean
  availabilityResourceId: Id<"objects"> | null
  availabilityResourceName: string | null
  availabilityResourceSubtype: string | null
  availabilityResourceStatus: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function createEmptyResourceSummary(
  resourceId: Id<"objects">
): ResourceAvailabilityConnectionSummary {
  return {
    resourceId,
    hasAvailabilityConfigured: false,
    hasDirectAvailability: false,
    usesScheduleTemplate: false,
    scheduleSource: "none",
    directScheduleCount: 0,
    weeklyWindowCount: 0,
    exceptionCount: 0,
    blockCount: 0,
    scheduleTemplateCount: 0,
    scheduleTemplateNames: [],
  }
}

function toOptionalName(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

async function isValidAvailabilityResource(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  product: {
    organizationId: Id<"organizations">
  },
  candidate: {
    _id: Id<"objects">
    organizationId?: Id<"organizations">
    type?: string
    subtype?: string | null
    status?: string | null
    customProperties?: unknown
  } | null
): Promise<boolean> {
  if (!candidate || candidate.type !== "product") {
    return false
  }
  if (candidate.organizationId !== product.organizationId) {
    return false
  }
  if (candidate.status === "archived") {
    return false
  }

  const outgoingLinks = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", candidate._id))
    .collect()

  let explicitAvailabilityResourceId = getShadowAvailabilityResourceId(candidate.customProperties)
  const directAvailabilityResourceIds = new Set<string>()
  const templatedAvailabilityResourceIds = new Set<string>()

  for (const link of outgoingLinks) {
    if (link.linkType === PRODUCT_AVAILABILITY_LINK_TYPE) {
      explicitAvailabilityResourceId = link.toObjectId
      continue
    }
    if (link.linkType === "has_availability") {
      directAvailabilityResourceIds.add(candidate._id)
      continue
    }
    if (link.linkType === "uses_schedule") {
      templatedAvailabilityResourceIds.add(candidate._id)
    }
  }

  return isAvailabilityCarrierCandidate(candidate, {
    referencedResourceIds: new Set<string>(),
    directAvailabilityResourceIds,
    templatedAvailabilityResourceIds,
    explicitAvailabilityResourceId,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveProductAvailabilityResource(
  ctx: any,
  product: {
    _id: Id<"objects">
    name?: string | null
    organizationId: Id<"organizations">
    subtype?: string | null
    status?: string | null
    customProperties?: unknown
  }
): Promise<ProductAvailabilityResourceResolution> {
  const productName = toOptionalName(product.name)
  const productSubtype = typeof product.subtype === "string" ? product.subtype : null
  const explicitLinks = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: any) =>
      q.eq("fromObjectId", product._id).eq("linkType", PRODUCT_AVAILABILITY_LINK_TYPE)
    )
    .collect()
  const shadowResourceId = asRecord(product.customProperties).availabilityResourceId
  const explicitResourceId =
    explicitLinks[0]?.toObjectId ||
    (typeof shadowResourceId === "string"
      ? (shadowResourceId as Id<"objects">)
      : null)
  const isBookable = hasAvailabilityCapability({
    subtype: productSubtype,
    customProperties: product.customProperties,
    explicitAvailabilityResourceId: explicitResourceId,
  })

  if (!isBookable || product.status === "archived") {
    return {
      productId: product._id,
      productName,
      productSubtype,
      isBookable,
      connectionMode: "none",
      isConnectionValid: false,
      availabilityResourceId: null,
      availabilityResourceName: null,
      availabilityResourceSubtype: null,
      availabilityResourceStatus: null,
    }
  }

  if (explicitResourceId) {
    const candidate = await ctx.db.get(explicitResourceId)
    if (await isValidAvailabilityResource(ctx, product, candidate)) {
      const availabilityCandidate = candidate as {
        _id: Id<"objects">
        name?: string | null
        subtype?: string | null
        status?: string | null
      }
      return {
        productId: product._id,
        productName,
        productSubtype,
        isBookable: true,
        connectionMode: "linked",
        isConnectionValid: true,
        availabilityResourceId: availabilityCandidate._id,
        availabilityResourceName: toOptionalName(availabilityCandidate.name),
        availabilityResourceSubtype:
          typeof availabilityCandidate.subtype === "string" ? availabilityCandidate.subtype : null,
        availabilityResourceStatus:
          typeof availabilityCandidate.status === "string" ? availabilityCandidate.status : null,
      }
    }

    return {
      productId: product._id,
      productName,
      productSubtype,
      isBookable: true,
      connectionMode: "linked",
      isConnectionValid: false,
      availabilityResourceId: explicitResourceId,
      availabilityResourceName: null,
      availabilityResourceSubtype: null,
      availabilityResourceStatus:
        candidate && typeof candidate.status === "string" ? candidate.status : null,
    }
  }

  return {
    productId: product._id,
    productName,
    productSubtype,
    isBookable: true,
    connectionMode: "self",
    isConnectionValid: true,
    availabilityResourceId: product._id,
    availabilityResourceName: productName,
    availabilityResourceSubtype: productSubtype,
    availabilityResourceStatus:
      typeof product.status === "string" ? product.status : null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProductAvailabilityConnectionSummary(
  ctx: any,
  product: {
    _id: Id<"objects">
    name?: string | null
    organizationId: Id<"organizations">
    subtype?: string | null
    status?: string | null
    customProperties?: unknown
  }
): Promise<ProductAvailabilityConnectionSummary> {
  const resolution = await resolveProductAvailabilityResource(ctx, product)
  const resourceSummary =
    resolution.isConnectionValid && resolution.availabilityResourceId
      ? await getResourceAvailabilityConnectionSummary(
          ctx,
          resolution.availabilityResourceId
        )
      : createEmptyResourceSummary(
          resolution.availabilityResourceId || resolution.productId
        )

  return {
    productId: resolution.productId,
    productName: resolution.productName,
    productSubtype: resolution.productSubtype,
    isBookable: resolution.isBookable,
    connectionMode: resolution.connectionMode,
    isConnectionValid: resolution.isConnectionValid,
    availabilityResourceId: resolution.availabilityResourceId,
    availabilityResourceName: resolution.availabilityResourceName,
    availabilityResourceSubtype: resolution.availabilityResourceSubtype,
    availabilityResourceStatus: resolution.availabilityResourceStatus,
    ...resourceSummary,
  }
}
