import type { Id } from "../_generated/dataModel";
import { listAvailabilityStructureDefinitions } from "./availabilityStructures";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function getExplicitAvailabilityEnabled(customProperties: unknown): boolean | null {
  const availabilityEnabled = asRecord(customProperties).availabilityEnabled;
  return typeof availabilityEnabled === "boolean" ? availabilityEnabled : null;
}

const AVAILABILITY_RESOURCE_SUBTYPE_SET = new Set(
  listAvailabilityStructureDefinitions().flatMap((definition) => definition.supportedResourceSubtypes)
);

export const AVAILABILITY_RESOURCE_SUBTYPES = Array.from(AVAILABILITY_RESOURCE_SUBTYPE_SET).sort();

const AVAILABILITY_SIGNAL_KEYS = [
  "availabilityStructure",
  "availabilityModel",
  "availabilityContextKey",
  "inventoryMode",
  "locationBehavior",
  "resourceTopologyProfile",
  "bookingMode",
  "minDuration",
  "maxDuration",
  "durationUnit",
  "slotIncrement",
  "bufferBefore",
  "bufferAfter",
  "capacity",
  "confirmationRequired",
  "pricePerUnit",
  "priceUnit",
  "depositRequired",
  "depositAmountCents",
  "depositPercent",
  "inventoryCount",
  "minimumStayNights",
  "maximumStayNights",
  "checkInTime",
  "checkOutTime",
  "baseNightlyRateCents",
  "totalSeats",
  "maxSeatsPerBooking",
  "totalPassengerSeats",
  "vehicleType",
  "boardingMinutesBefore",
] as const;

export const AVAILABILITY_SIGNAL_PROPERTY_KEYS = [...AVAILABILITY_SIGNAL_KEYS];

export function isAvailabilityResourceSubtype(subtype: unknown): boolean {
  return typeof subtype === "string" && AVAILABILITY_RESOURCE_SUBTYPE_SET.has(subtype as never);
}

export function shouldSuggestAvailabilityDefaultsForSubtype(subtype: unknown): boolean {
  return isAvailabilityResourceSubtype(subtype);
}

export function getShadowAvailabilityResourceId(
  customProperties: unknown
): Id<"objects"> | null {
  const availabilityResourceId = asRecord(customProperties).availabilityResourceId;
  return typeof availabilityResourceId === "string"
    ? (availabilityResourceId as Id<"objects">)
    : null;
}

export function hasAvailabilitySemantics(customProperties: unknown): boolean {
  const props = asRecord(customProperties);
  const bookableConfig = asRecord(props.bookableConfig);

  if (Object.keys(bookableConfig).length > 0) {
    return true;
  }

  return AVAILABILITY_SIGNAL_KEYS.some((key) => {
    const value = props[key];
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return true;
  });
}

export function buildAvailabilitySemanticsReset(): Record<string, null> {
  const reset: Record<string, null> = {
    bookableConfig: null,
  };

  for (const key of AVAILABILITY_SIGNAL_KEYS) {
    reset[key] = null;
  }

  return reset;
}

export function hasAvailabilityCapability(args: {
  subtype?: unknown;
  customProperties?: unknown;
  explicitAvailabilityResourceId?: string | null;
}): boolean {
  const explicitAvailabilityEnabled = getExplicitAvailabilityEnabled(args.customProperties);
  if (explicitAvailabilityEnabled === false) {
    return false;
  }
  if (explicitAvailabilityEnabled === true) {
    return true;
  }

  const explicitAvailabilityResourceId =
    args.explicitAvailabilityResourceId || getShadowAvailabilityResourceId(args.customProperties);

  return Boolean(
    explicitAvailabilityResourceId ||
    hasAvailabilitySemantics(args.customProperties) ||
    shouldSuggestAvailabilityDefaultsForSubtype(args.subtype)
  );
}

type AvailabilityCarrierCandidate = {
  _id: Id<"objects">;
  type?: string;
  subtype?: string | null;
  status?: string | null;
  customProperties?: unknown;
};

export function isAvailabilityCarrierCandidate(
  product: AvailabilityCarrierCandidate,
  options: {
    referencedResourceIds: ReadonlySet<string>;
    directAvailabilityResourceIds: ReadonlySet<string>;
    templatedAvailabilityResourceIds: ReadonlySet<string>;
    explicitAvailabilityResourceId?: string | null;
  }
): boolean {
  if (product.type !== "product" || product.status === "archived") {
    return false;
  }

  const resourceId = product._id as string;
  const explicitAvailabilityResourceId =
    options.explicitAvailabilityResourceId || getShadowAvailabilityResourceId(product.customProperties);
  const pointsToDistinctResource =
    typeof explicitAvailabilityResourceId === "string" &&
    explicitAvailabilityResourceId.length > 0 &&
    explicitAvailabilityResourceId !== resourceId;

  const isReferencedCarrier = options.referencedResourceIds.has(resourceId);
  const hasDirectAvailability = options.directAvailabilityResourceIds.has(resourceId);
  const usesTemplatedAvailability = options.templatedAvailabilityResourceIds.has(resourceId);
  const explicitAvailabilityEnabled = getExplicitAvailabilityEnabled(product.customProperties);

  if (isReferencedCarrier || hasDirectAvailability || usesTemplatedAvailability) {
    return true;
  }

  if (explicitAvailabilityEnabled === false) {
    return false;
  }

  if (pointsToDistinctResource) {
    return false;
  }

  return (
    explicitAvailabilityEnabled === true ||
    hasAvailabilitySemantics(product.customProperties) ||
    isAvailabilityResourceSubtype(product.subtype)
  );
}
