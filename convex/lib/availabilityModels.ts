export const AVAILABILITY_MODELS = [
  "time_slot",
  "date_range_inventory",
  "event_bound_seating",
  "departure_bound",
] as const;

export type AvailabilityModel = (typeof AVAILABILITY_MODELS)[number];

export type AvailabilityContextKey = "eventId" | "departureId" | null;
export type AvailabilityQuantityKey =
  | "participants"
  | "seatCount"
  | "passengerCount";

export type AvailabilityReleaseStrategy =
  | "none"
  | "event_seat_map"
  | "departure_seats";

export type AvailabilityModelDefinition = {
  model: AvailabilityModel;
  contextKey: AvailabilityContextKey;
  quantityKey: AvailabilityQuantityKey;
  releaseStrategy: AvailabilityReleaseStrategy;
};

const MODEL_DEFINITIONS: Record<AvailabilityModel, AvailabilityModelDefinition> =
  {
    time_slot: {
      model: "time_slot",
      contextKey: null,
      quantityKey: "participants",
      releaseStrategy: "none",
    },
    date_range_inventory: {
      model: "date_range_inventory",
      contextKey: null,
      quantityKey: "participants",
      releaseStrategy: "none",
    },
    event_bound_seating: {
      model: "event_bound_seating",
      contextKey: "eventId",
      quantityKey: "seatCount",
      releaseStrategy: "event_seat_map",
    },
    departure_bound: {
      model: "departure_bound",
      contextKey: "departureId",
      quantityKey: "passengerCount",
      releaseStrategy: "departure_seats",
    },
  };

function normalizePositiveInteger(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
}

export function normalizeAvailabilityModel(value: unknown): AvailabilityModel {
  if (typeof value !== "string") {
    return "time_slot";
  }
  return (AVAILABILITY_MODELS as readonly string[]).includes(value)
    ? (value as AvailabilityModel)
    : "time_slot";
}

export function resolveAvailabilityModel(
  resourceProps: Record<string, unknown> | null | undefined,
  bookableConfig?: Record<string, unknown> | null
): AvailabilityModel {
  return normalizeAvailabilityModel(
    resourceProps?.availabilityModel ?? bookableConfig?.availabilityModel
  );
}

export function getAvailabilityModelDefinition(
  model: AvailabilityModel
): AvailabilityModelDefinition {
  return MODEL_DEFINITIONS[model];
}

export function getAvailabilityContextError(args: {
  model: AvailabilityModel;
  eventId?: unknown;
  departureId?: unknown;
}): string | null {
  const definition = getAvailabilityModelDefinition(args.model);
  if (!definition.contextKey) {
    return null;
  }

  const value =
    definition.contextKey === "eventId" ? args.eventId : args.departureId;
  if (typeof value === "string" && value.trim().length > 0) {
    return null;
  }
  return `${definition.contextKey} required for ${args.model}`;
}

export function resolveRequestedQuantity(args: {
  model: AvailabilityModel;
  participants?: unknown;
  seatCount?: unknown;
  passengerCount?: unknown;
  fallback?: number;
}): number {
  const definition = getAvailabilityModelDefinition(args.model);
  const fallback = normalizePositiveInteger(args.fallback) || 1;

  if (definition.quantityKey === "seatCount") {
    return normalizePositiveInteger(args.seatCount) || fallback;
  }
  if (definition.quantityKey === "passengerCount") {
    return normalizePositiveInteger(args.passengerCount) || fallback;
  }
  return normalizePositiveInteger(args.participants) || fallback;
}
