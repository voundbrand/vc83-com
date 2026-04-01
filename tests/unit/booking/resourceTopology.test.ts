import { describe, expect, it } from "vitest";
import {
  formatResourceTopologyProfile,
  getResourceTopologyProfile,
  listResourceTopologyProfiles,
} from "../../../convex/lib/resourceTopology";

describe("resource topology profiles", () => {
  it("describes fleet and property hierarchies as reusable profiles", () => {
    expect(getResourceTopologyProfile("fleet_vessel_departure")).toMatchObject({
      levels: [
        { kind: "fleet", label: "Fleet" },
        { kind: "vessel", label: "Vessel" },
        { kind: "departure", label: "Departure", inventoryCarrier: true, bookableLeaf: true },
      ],
      edges: [
        { from: "fleet", to: "vessel", linkType: "has_vessel" },
        { from: "vessel", to: "departure", linkType: "operates_departure" },
      ],
    });

    expect(getResourceTopologyProfile("property_unit_room")).toMatchObject({
      levels: [
        { kind: "property", label: "Property" },
        { kind: "unit", label: "Unit" },
        { kind: "room", label: "Room", inventoryCarrier: true, bookableLeaf: true },
      ],
    });
  });

  it("formats topology paths for UI summaries", () => {
    expect(formatResourceTopologyProfile("course_session_seat_pool")).toBe(
      "Course -> Session -> Seat Pool"
    );
    expect(
      listResourceTopologyProfiles().map((profile) => profile.key)
    ).toContain("property_unit_room");
  });
});
