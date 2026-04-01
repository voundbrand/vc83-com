export const RESOURCE_TOPOLOGY_NODE_KINDS = [
  "resource",
  "property",
  "unit",
  "room",
  "fleet",
  "vessel",
  "departure",
  "course",
  "session",
  "seat_pool",
] as const;

export type ResourceTopologyNodeKind =
  (typeof RESOURCE_TOPOLOGY_NODE_KINDS)[number];

export const RESOURCE_TOPOLOGY_LINK_TYPES = [
  "has_unit",
  "has_room",
  "has_vessel",
  "operates_departure",
  "has_session",
  "has_seat_pool",
] as const;

export type ResourceTopologyLinkType =
  (typeof RESOURCE_TOPOLOGY_LINK_TYPES)[number];

export const RESOURCE_TOPOLOGY_PROFILE_KEYS = [
  "single_resource",
  "property_unit",
  "property_unit_room",
  "vessel_departure",
  "fleet_vessel_departure",
  "course_session_seat_pool",
] as const;

export type ResourceTopologyProfileKey =
  (typeof RESOURCE_TOPOLOGY_PROFILE_KEYS)[number];

export type ResourceTopologyLevel = {
  kind: ResourceTopologyNodeKind;
  label: string;
  inventoryCarrier?: boolean;
  bookableLeaf?: boolean;
};

export type ResourceTopologyEdge = {
  from: ResourceTopologyNodeKind;
  to: ResourceTopologyNodeKind;
  linkType: ResourceTopologyLinkType;
};

export type ResourceTopologyProfile = {
  key: ResourceTopologyProfileKey;
  label: string;
  description: string;
  levels: ResourceTopologyLevel[];
  edges: ResourceTopologyEdge[];
};

const TOPOLOGY_PROFILES: Record<
  ResourceTopologyProfileKey,
  ResourceTopologyProfile
> = {
  single_resource: {
    key: "single_resource",
    label: "Single Resource",
    description:
      "One bookable resource owns its availability directly with no inventory children.",
    levels: [
      {
        kind: "resource",
        label: "Resource",
        inventoryCarrier: true,
        bookableLeaf: true,
      },
    ],
    edges: [],
  },
  property_unit: {
    key: "property_unit",
    label: "Property -> Unit",
    description:
      "A property contains bookable units such as houses, apartments, or cabins.",
    levels: [
      { kind: "property", label: "Property" },
      {
        kind: "unit",
        label: "Unit",
        inventoryCarrier: true,
        bookableLeaf: true,
      },
    ],
    edges: [
      {
        from: "property",
        to: "unit",
        linkType: "has_unit",
      },
    ],
  },
  property_unit_room: {
    key: "property_unit_room",
    label: "Property -> Unit -> Room",
    description:
      "A property contains units and each unit can expose individually bookable rooms.",
    levels: [
      { kind: "property", label: "Property" },
      { kind: "unit", label: "Unit" },
      {
        kind: "room",
        label: "Room",
        inventoryCarrier: true,
        bookableLeaf: true,
      },
    ],
    edges: [
      {
        from: "property",
        to: "unit",
        linkType: "has_unit",
      },
      {
        from: "unit",
        to: "room",
        linkType: "has_room",
      },
    ],
  },
  vessel_departure: {
    key: "vessel_departure",
    label: "Vessel -> Departure",
    description:
      "A single vessel operates many departures and departure inventory is owned per departure.",
    levels: [
      { kind: "vessel", label: "Vessel" },
      {
        kind: "departure",
        label: "Departure",
        inventoryCarrier: true,
        bookableLeaf: true,
      },
    ],
    edges: [
      {
        from: "vessel",
        to: "departure",
        linkType: "operates_departure",
      },
    ],
  },
  fleet_vessel_departure: {
    key: "fleet_vessel_departure",
    label: "Fleet -> Vessel -> Departure",
    description:
      "A fleet owns vessels and each vessel operates its own departure instances.",
    levels: [
      { kind: "fleet", label: "Fleet" },
      { kind: "vessel", label: "Vessel" },
      {
        kind: "departure",
        label: "Departure",
        inventoryCarrier: true,
        bookableLeaf: true,
      },
    ],
    edges: [
      {
        from: "fleet",
        to: "vessel",
        linkType: "has_vessel",
      },
      {
        from: "vessel",
        to: "departure",
        linkType: "operates_departure",
      },
    ],
  },
  course_session_seat_pool: {
    key: "course_session_seat_pool",
    label: "Course -> Session -> Seat Pool",
    description:
      "A course publishes sessions and each session can expose its own seat inventory pool.",
    levels: [
      { kind: "course", label: "Course" },
      { kind: "session", label: "Session" },
      {
        kind: "seat_pool",
        label: "Seat Pool",
        inventoryCarrier: true,
        bookableLeaf: true,
      },
    ],
    edges: [
      {
        from: "course",
        to: "session",
        linkType: "has_session",
      },
      {
        from: "session",
        to: "seat_pool",
        linkType: "has_seat_pool",
      },
    ],
  },
};

export function getResourceTopologyProfile(
  key: ResourceTopologyProfileKey
): ResourceTopologyProfile {
  return TOPOLOGY_PROFILES[key];
}

export function listResourceTopologyProfiles(): ResourceTopologyProfile[] {
  return RESOURCE_TOPOLOGY_PROFILE_KEYS.map((key) => TOPOLOGY_PROFILES[key]);
}

export function formatResourceTopologyProfile(
  key: ResourceTopologyProfileKey
): string {
  return TOPOLOGY_PROFILES[key].levels.map((level) => level.label).join(" -> ");
}
