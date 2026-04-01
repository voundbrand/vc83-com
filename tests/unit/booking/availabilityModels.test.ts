import { describe, expect, it } from "vitest";
import {
  getAvailabilityContextError,
  getAvailabilityModelDefinition,
  resolveAvailabilityModel,
  resolveRequestedQuantity,
} from "../../../convex/lib/availabilityModels";
import {
  buildAvailabilityStructureDrivenConfig,
  getAvailabilityStructureDefinition,
  listAvailabilityStructureDefinitions,
} from "../../../convex/lib/availabilityStructures";

describe("availability model contract", () => {
  it("defaults unknown resources to time_slot", () => {
    expect(resolveAvailabilityModel({}, {})).toBe("time_slot");
    expect(resolveAvailabilityModel({ availabilityModel: "unknown" }, {})).toBe(
      "time_slot"
    );
  });

  it("requires event context for event-bound seating", () => {
    expect(
      getAvailabilityContextError({
        model: "event_bound_seating",
      })
    ).toBe("eventId required for event_bound_seating");

    expect(
      getAvailabilityContextError({
        model: "event_bound_seating",
        eventId: "event_123",
      })
    ).toBeNull();
  });

  it("resolves requested quantity from the model definition", () => {
    expect(
      resolveRequestedQuantity({
        model: "time_slot",
        participants: 3,
      })
    ).toBe(3);

    expect(
      resolveRequestedQuantity({
        model: "event_bound_seating",
        participants: 2,
        seatCount: 5,
      })
    ).toBe(5);

    expect(
      resolveRequestedQuantity({
        model: "departure_bound",
        passengerCount: 4,
      })
    ).toBe(4);
  });

  it("defines seat release strategy per model", () => {
    expect(getAvailabilityModelDefinition("time_slot").releaseStrategy).toBe(
      "none"
    );
    expect(
      getAvailabilityModelDefinition("event_bound_seating").releaseStrategy
    ).toBe("event_seat_map");
    expect(
      getAvailabilityModelDefinition("departure_bound").releaseStrategy
    ).toBe("departure_seats");
  });
});

describe("availability structures", () => {
  it("maps course sessions to the time-slot base model", () => {
    expect(getAvailabilityStructureDefinition("course_session")).toMatchObject({
      model: "time_slot",
      defaultResourceSubtype: "class",
      requiresBookingAddress: true,
    });
  });

  it("captures inventory, topology, and context semantics for generic presets", () => {
    expect(getAvailabilityStructureDefinition("hotel_room")).toMatchObject({
      model: "date_range_inventory",
      inventoryMode: "inventory_pool",
      topologyProfile: "property_unit_room",
      locationBehavior: "property_address_required",
    });

    expect(getAvailabilityStructureDefinition("event_session_seating")).toMatchObject({
      model: "event_bound_seating",
      contextKey: "eventId",
      inventoryMode: "single_resource",
    });

    expect(getAvailabilityStructureDefinition("fleet_departure")).toMatchObject({
      model: "departure_bound",
      contextKey: "departureId",
      inventoryMode: "per_departure",
      topologyProfile: "fleet_vessel_departure",
    });
  });

  it("exposes fleet and departure presets", () => {
    const keys = listAvailabilityStructureDefinitions().map(
      (definition) => definition.key
    );
    expect(keys).toContain("boat_seat_departure");
    expect(keys).toContain("fleet_departure");
  });

  it("builds derived structure config from the semantic preset", () => {
    expect(
      buildAvailabilityStructureDrivenConfig("fleet_departure", {
        totalPassengerSeats: 80,
      })
    ).toMatchObject({
      availabilityStructure: "fleet_departure",
      availabilityModel: "departure_bound",
      availabilityContextKey: "departureId",
      inventoryMode: "per_departure",
      requiresBookingAddress: true,
      locationBehavior: "departure_origin_required",
      resourceTopologyProfile: "fleet_vessel_departure",
      totalPassengerSeats: 80,
      vehicleType: "boat",
    });
  });
});
