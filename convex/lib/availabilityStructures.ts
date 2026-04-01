import type { AvailabilityContextKey, AvailabilityModel } from "./availabilityModels";
import type { ResourceTopologyProfileKey } from "./resourceTopology";

export const AVAILABILITY_STRUCTURE_KEYS = [
  "resource_time_slot",
  "one_on_one_meeting",
  "course_session",
  "event_session_seating",
  "hotel_room",
  "house_rental",
  "boat_seat_departure",
  "boat_charter",
  "fleet_departure",
] as const;

export type AvailabilityStructureKey =
  (typeof AVAILABILITY_STRUCTURE_KEYS)[number];

export const AVAILABILITY_INVENTORY_MODES = [
  "single_resource",
  "inventory_pool",
  "per_departure",
] as const;

export type AvailabilityInventoryMode =
  (typeof AVAILABILITY_INVENTORY_MODES)[number];

export const AVAILABILITY_LOCATION_BEHAVIORS = [
  "none",
  "location_optional",
  "location_required",
  "property_address_required",
  "departure_origin_required",
] as const;

export type AvailabilityLocationBehavior =
  (typeof AVAILABILITY_LOCATION_BEHAVIORS)[number];

export type AvailabilityBookingMode = "calendar" | "date-range" | "both";
export type AvailabilityDurationUnit =
  | "minutes"
  | "hours"
  | "days"
  | "nights";
export type AvailabilityPriceUnit =
  | "hour"
  | "day"
  | "night"
  | "session"
  | "flat"
  | "seat"
  | "per_person";
export type AvailabilityResourceSubtype =
  | "appointment"
  | "class"
  | "room"
  | "accommodation"
  | "vehicle"
  | "space"
  | "staff"
  | "equipment"
  | "treatment";

export type AvailabilityStructurePreset = {
  bookingMode?: AvailabilityBookingMode;
  minDuration?: number;
  maxDuration?: number;
  durationUnit?: AvailabilityDurationUnit;
  slotIncrement?: number;
  bufferBefore?: number;
  bufferAfter?: number;
  capacity?: number;
  confirmationRequired?: boolean;
  pricePerUnit?: number;
  priceUnit?: AvailabilityPriceUnit;
  depositRequired?: boolean;
  depositAmountCents?: number;
  depositPercent?: number;
  inventoryCount?: number;
  minimumStayNights?: number;
  maximumStayNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  baseNightlyRateCents?: number;
  totalSeats?: number;
  maxSeatsPerBooking?: number;
  totalPassengerSeats?: number;
  vehicleType?: string;
  boardingMinutesBefore?: number;
};

export type AvailabilityStructureDrivenConfig = AvailabilityStructurePreset & {
  availabilityStructure: AvailabilityStructureKey;
  availabilityModel: AvailabilityModel;
  availabilityContextKey: AvailabilityContextKey;
  inventoryMode: AvailabilityInventoryMode;
  requiresBookingAddress: boolean;
  locationBehavior: AvailabilityLocationBehavior;
  resourceTopologyProfile: ResourceTopologyProfileKey;
};

export type AvailabilityStructureDefinition = {
  key: AvailabilityStructureKey;
  label: string;
  description: string;
  model: AvailabilityModel;
  contextKey: AvailabilityContextKey;
  defaultResourceSubtype: AvailabilityResourceSubtype;
  supportedResourceSubtypes: AvailabilityResourceSubtype[];
  inventoryMode: AvailabilityInventoryMode;
  requiresBookingAddress: boolean;
  locationBehavior: AvailabilityLocationBehavior;
  topologyProfile: ResourceTopologyProfileKey;
  configHints: string[];
  defaultBookableConfig: AvailabilityStructurePreset;
};

const STRUCTURES: Record<
  AvailabilityStructureKey,
  AvailabilityStructureDefinition
> = {
  resource_time_slot: {
    key: "resource_time_slot",
    label: "Reusable Time Slot",
    description:
      "A generic time-slot resource for rooms, equipment, spaces, or other directly scheduled assets.",
    model: "time_slot",
    contextKey: null,
    defaultResourceSubtype: "space",
    supportedResourceSubtypes: ["room", "equipment", "space"],
    inventoryMode: "single_resource",
    requiresBookingAddress: false,
    locationBehavior: "location_optional",
    topologyProfile: "single_resource",
    configHints: [
      "Use for resources that own their own calendar windows.",
      "Location can stay optional until the operator links a venue or branch.",
    ],
    defaultBookableConfig: {
      bookingMode: "calendar",
      minDuration: 60,
      maxDuration: 480,
      durationUnit: "minutes",
      slotIncrement: 30,
      bufferBefore: 0,
      bufferAfter: 15,
      capacity: 1,
      confirmationRequired: false,
      pricePerUnit: 0,
      priceUnit: "hour",
      depositRequired: false,
      depositAmountCents: 0,
      depositPercent: 0,
    },
  },
  one_on_one_meeting: {
    key: "one_on_one_meeting",
    label: "1:1 Meeting",
    description:
      "Single staff or service appointments with direct slot ownership and optional virtual or in-person locations.",
    model: "time_slot",
    contextKey: null,
    defaultResourceSubtype: "appointment",
    supportedResourceSubtypes: ["appointment", "staff", "treatment"],
    inventoryMode: "single_resource",
    requiresBookingAddress: false,
    locationBehavior: "location_optional",
    topologyProfile: "single_resource",
    configHints: [
      "Best for staff calendars, consultations, treatments, and operator-managed meetings.",
      "Keep the location optional so the same product can stay virtual or physical.",
    ],
    defaultBookableConfig: {
      bookingMode: "calendar",
      minDuration: 60,
      maxDuration: 240,
      durationUnit: "minutes",
      slotIncrement: 15,
      bufferBefore: 0,
      bufferAfter: 15,
      capacity: 1,
      confirmationRequired: false,
      pricePerUnit: 0,
      priceUnit: "session",
      depositRequired: false,
      depositAmountCents: 0,
      depositPercent: 0,
    },
  },
  course_session: {
    key: "course_session",
    label: "Course Session",
    description:
      "Scheduled class enrollment with session capacity and an upgrade path to session-level seat pools.",
    model: "time_slot",
    contextKey: null,
    defaultResourceSubtype: "class",
    supportedResourceSubtypes: ["class"],
    inventoryMode: "single_resource",
    requiresBookingAddress: true,
    locationBehavior: "location_required",
    topologyProfile: "course_session_seat_pool",
    configHints: [
      "Use when a course publishes one or more dated sessions and capacity is tracked per session window.",
      "Link a physical location so attendees receive a concrete meeting point.",
    ],
    defaultBookableConfig: {
      bookingMode: "calendar",
      minDuration: 180,
      maxDuration: 480,
      durationUnit: "minutes",
      slotIncrement: 30,
      bufferBefore: 0,
      bufferAfter: 30,
      capacity: 8,
      confirmationRequired: false,
      pricePerUnit: 0,
      priceUnit: "session",
      depositRequired: false,
      depositAmountCents: 0,
      depositPercent: 0,
    },
  },
  event_session_seating: {
    key: "event_session_seating",
    label: "Event Seating",
    description:
      "Seats are sold against a concrete event or session object and inventory resolves through event context.",
    model: "event_bound_seating",
    contextKey: "eventId",
    defaultResourceSubtype: "space",
    supportedResourceSubtypes: ["class", "room", "space"],
    inventoryMode: "single_resource",
    requiresBookingAddress: true,
    locationBehavior: "location_required",
    topologyProfile: "course_session_seat_pool",
    configHints: [
      "Each checkout must include an event or session identifier so seat inventory resolves against the right occurrence.",
      "Use when capacity belongs to the event instance instead of the product calendar itself.",
    ],
    defaultBookableConfig: {
      bookingMode: "calendar",
      minDuration: 60,
      maxDuration: 360,
      durationUnit: "minutes",
      slotIncrement: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      capacity: 1,
      confirmationRequired: false,
      pricePerUnit: 0,
      priceUnit: "seat",
      depositRequired: false,
      depositAmountCents: 0,
      depositPercent: 0,
      totalSeats: 100,
      maxSeatsPerBooking: 10,
    },
  },
  hotel_room: {
    key: "hotel_room",
    label: "Hotel Room",
    description:
      "Date-range lodging inventory where multiple rooms sit inside a property and availability is pooled by room type or unit count.",
    model: "date_range_inventory",
    contextKey: null,
    defaultResourceSubtype: "room",
    supportedResourceSubtypes: ["room", "accommodation"],
    inventoryMode: "inventory_pool",
    requiresBookingAddress: true,
    locationBehavior: "property_address_required",
    topologyProfile: "property_unit_room",
    configHints: [
      "Use for stay-based inventory with check-in and check-out rules.",
      "Pool inventory across many rooms while keeping the property hierarchy intact.",
    ],
    defaultBookableConfig: {
      bookingMode: "date-range",
      minDuration: 1,
      maxDuration: 30,
      durationUnit: "nights",
      slotIncrement: 60,
      bufferBefore: 0,
      bufferAfter: 0,
      capacity: 2,
      confirmationRequired: true,
      pricePerUnit: 0,
      priceUnit: "night",
      depositRequired: true,
      depositAmountCents: 0,
      depositPercent: 20,
      inventoryCount: 1,
      minimumStayNights: 1,
      maximumStayNights: 30,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      baseNightlyRateCents: 0,
    },
  },
  house_rental: {
    key: "house_rental",
    label: "House Rental",
    description:
      "A single house, villa, or apartment rented as one stay-based inventory item with its own address.",
    model: "date_range_inventory",
    contextKey: null,
    defaultResourceSubtype: "accommodation",
    supportedResourceSubtypes: ["accommodation", "room"],
    inventoryMode: "single_resource",
    requiresBookingAddress: true,
    locationBehavior: "property_address_required",
    topologyProfile: "property_unit",
    configHints: [
      "Use when the full house or unit is reserved as one booking.",
      "If you later need per-room inventory, move to a property -> unit -> room hierarchy.",
    ],
    defaultBookableConfig: {
      bookingMode: "date-range",
      minDuration: 2,
      maxDuration: 60,
      durationUnit: "nights",
      slotIncrement: 60,
      bufferBefore: 0,
      bufferAfter: 0,
      capacity: 6,
      confirmationRequired: true,
      pricePerUnit: 0,
      priceUnit: "night",
      depositRequired: true,
      depositAmountCents: 0,
      depositPercent: 25,
      inventoryCount: 1,
      minimumStayNights: 2,
      maximumStayNights: 60,
      checkInTime: "16:00",
      checkOutTime: "10:00",
      baseNightlyRateCents: 0,
    },
  },
  boat_seat_departure: {
    key: "boat_seat_departure",
    label: "Boat Seat",
    description:
      "Passenger seat inventory is sold against an individual departure and released per departure instance.",
    model: "departure_bound",
    contextKey: "departureId",
    defaultResourceSubtype: "vehicle",
    supportedResourceSubtypes: ["vehicle"],
    inventoryMode: "per_departure",
    requiresBookingAddress: true,
    locationBehavior: "departure_origin_required",
    topologyProfile: "vessel_departure",
    configHints: [
      "Each checkout must include a departure object so seat inventory resolves against the right sailing.",
      "Use for ferries, boat tours, buses, or any transport seats sold per departure.",
    ],
    defaultBookableConfig: {
      bookingMode: "calendar",
      minDuration: 60,
      maxDuration: 720,
      durationUnit: "minutes",
      slotIncrement: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      capacity: 1,
      confirmationRequired: false,
      pricePerUnit: 0,
      priceUnit: "per_person",
      depositRequired: false,
      depositAmountCents: 0,
      depositPercent: 0,
      totalPassengerSeats: 20,
      vehicleType: "boat",
      boardingMinutesBefore: 30,
    },
  },
  boat_charter: {
    key: "boat_charter",
    label: "Boat Charter",
    description:
      "A whole vessel is reserved directly by time window rather than selling individual seats.",
    model: "time_slot",
    contextKey: null,
    defaultResourceSubtype: "vehicle",
    supportedResourceSubtypes: ["vehicle"],
    inventoryMode: "single_resource",
    requiresBookingAddress: true,
    locationBehavior: "location_required",
    topologyProfile: "single_resource",
    configHints: [
      "Use when the entire vessel becomes unavailable once the charter is booked.",
      "This stays a time-slot resource even if the same vessel also operates departures elsewhere.",
    ],
    defaultBookableConfig: {
      bookingMode: "calendar",
      minDuration: 180,
      maxDuration: 1440,
      durationUnit: "minutes",
      slotIncrement: 60,
      bufferBefore: 30,
      bufferAfter: 30,
      capacity: 1,
      confirmationRequired: true,
      pricePerUnit: 0,
      priceUnit: "flat",
      depositRequired: true,
      depositAmountCents: 0,
      depositPercent: 25,
      totalPassengerSeats: 12,
      vehicleType: "boat",
      boardingMinutesBefore: 30,
    },
  },
  fleet_departure: {
    key: "fleet_departure",
    label: "Fleet Departure",
    description:
      "Departure-bound seat inventory where departures belong to vessels and vessels can roll up to a fleet-level product catalog.",
    model: "departure_bound",
    contextKey: "departureId",
    defaultResourceSubtype: "vehicle",
    supportedResourceSubtypes: ["vehicle"],
    inventoryMode: "per_departure",
    requiresBookingAddress: true,
    locationBehavior: "departure_origin_required",
    topologyProfile: "fleet_vessel_departure",
    configHints: [
      "Use when one product family sells departures across many vessels or transport assets.",
      "Each departure remains the inventory carrier while the fleet and vessel hierarchy stays reusable.",
    ],
    defaultBookableConfig: {
      bookingMode: "calendar",
      minDuration: 60,
      maxDuration: 720,
      durationUnit: "minutes",
      slotIncrement: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      capacity: 1,
      confirmationRequired: false,
      pricePerUnit: 0,
      priceUnit: "per_person",
      depositRequired: false,
      depositAmountCents: 0,
      depositPercent: 0,
      totalPassengerSeats: 40,
      vehicleType: "boat",
      boardingMinutesBefore: 30,
    },
  },
};

const DEFAULT_STRUCTURE_BY_SUBTYPE: Record<
  AvailabilityResourceSubtype,
  AvailabilityStructureKey
> = {
  appointment: "one_on_one_meeting",
  class: "course_session",
  room: "resource_time_slot",
  accommodation: "house_rental",
  vehicle: "boat_charter",
  space: "resource_time_slot",
  staff: "one_on_one_meeting",
  equipment: "resource_time_slot",
  treatment: "one_on_one_meeting",
};

export function normalizeAvailabilityStructure(
  value: unknown,
  fallback: AvailabilityStructureKey = "resource_time_slot"
): AvailabilityStructureKey {
  if (typeof value !== "string") {
    return fallback;
  }
  return (AVAILABILITY_STRUCTURE_KEYS as readonly string[]).includes(value)
    ? (value as AvailabilityStructureKey)
    : fallback;
}

export function getDefaultAvailabilityStructureForSubtype(
  subtype: string | null | undefined
): AvailabilityStructureKey {
  if (!subtype) {
    return "resource_time_slot";
  }
  const normalized = subtype as AvailabilityResourceSubtype;
  return DEFAULT_STRUCTURE_BY_SUBTYPE[normalized] || "resource_time_slot";
}

export function getDefaultAvailabilityStructureForModel(
  model: AvailabilityModel | null | undefined
): AvailabilityStructureKey {
  if (model === "event_bound_seating") {
    return "event_session_seating";
  }
  if (model === "departure_bound") {
    return "boat_seat_departure";
  }
  if (model === "date_range_inventory") {
    return "house_rental";
  }
  return "resource_time_slot";
}

export function resolveAvailabilityStructure(
  resourceProps: Record<string, unknown> | null | undefined,
  bookableConfig?: Record<string, unknown> | null,
  fallback?: AvailabilityStructureKey
): AvailabilityStructureKey {
  return normalizeAvailabilityStructure(
    resourceProps?.availabilityStructure ?? bookableConfig?.availabilityStructure,
    fallback || "resource_time_slot"
  );
}

export function getAvailabilityStructureDefinition(
  key: AvailabilityStructureKey
): AvailabilityStructureDefinition {
  return STRUCTURES[key];
}

export function listAvailabilityStructureDefinitions(): AvailabilityStructureDefinition[] {
  return AVAILABILITY_STRUCTURE_KEYS.map((key) => STRUCTURES[key]);
}

export function buildAvailabilityStructureDrivenConfig(
  key: AvailabilityStructureKey,
  overrides?: Partial<AvailabilityStructureDrivenConfig>
): AvailabilityStructureDrivenConfig {
  const definition = getAvailabilityStructureDefinition(key);

  return {
    ...definition.defaultBookableConfig,
    ...(overrides || {}),
    availabilityStructure: key,
    availabilityModel: definition.model,
    availabilityContextKey: definition.contextKey,
    inventoryMode: definition.inventoryMode,
    requiresBookingAddress: definition.requiresBookingAddress,
    locationBehavior: definition.locationBehavior,
    resourceTopologyProfile: definition.topologyProfile,
  };
}
