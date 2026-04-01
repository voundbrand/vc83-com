/**
 * RESOURCE BOOKINGS INTERNAL
 *
 * Internal mutations for customer-facing resource booking checkout.
 * Orchestrates: booking creation, CRM contact, availability check.
 *
 * Separate from bookingsInternal.ts which handles event-based bookings
 * with tickets and purchase items.
 */

import { internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

// Lazy-load internal to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

const seatGroupValidator = v.object({
  groupId: v.string(),
  label: v.optional(v.string()),
  capacity: v.number(),
});

const seatInventoryValidator = v.object({
  groups: v.array(seatGroupValidator),
  strictSeatSelection: v.optional(v.boolean()),
});

const seatSelectionValidator = v.object({
  groupId: v.string(),
  seatNumbers: v.array(v.number()),
});

const MICROSOFT_CALENDAR_WRITE_SCOPES = [
  "Calendars.ReadWrite",
  "Calendars.ReadWrite.Shared",
];

const GOOGLE_CALENDAR_WRITE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

type SeatGroupConfig = {
  groupId: string;
  label?: string;
  capacity: number;
};

type SeatSelection = {
  groupId: string;
  seatNumbers: number[];
};

type BookingRecord = {
  _id: Id<"objects">;
  status?: string;
  customProperties?: unknown;
};

type SeatInventoryConfig = {
  groups: SeatGroupConfig[];
  strictSeatSelection: boolean;
};

type SeatAvailabilitySnapshot = {
  totalCapacity: number;
  bookedParticipants: number;
  remainingCapacity: number;
  bookedSeatsByGroup: Map<string, Set<number>>;
  unassignedParticipants: number;
};

type CalendarConnectionReadinessDiagnostic = {
  connectionId: string;
  provider: string;
  status: string | null;
  syncEnabled: boolean;
  canWriteCalendar: boolean;
  pushCalendarId: string | null;
  writeReady: boolean;
  issues: string[];
};

type CalendarPushReadinessDiagnostics = {
  checkedAt: number;
  linkedConnectionCount: number;
  writeReadyConnectionCount: number;
  writeReady: boolean;
  issues: string[];
  recommendations: string[];
  connections: CalendarConnectionReadinessDiagnostic[];
};

type CalendarPushRuntimeDiagnostics = CalendarPushReadinessDiagnostics & {
  bookingStatus: string;
  calendarPushScheduled: boolean;
  calendarPushScheduledAt: number | null;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

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

function hasAnyScope(
  scopes: string[] | undefined,
  requiredScopes: readonly string[]
): boolean {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return false;
  }
  return scopes.some((scope) => requiredScopes.includes(scope));
}

function hasCalendarWriteScope(
  provider: unknown,
  scopes: string[] | undefined
): boolean {
  if (provider === "google") {
    return hasAnyScope(scopes, GOOGLE_CALENDAR_WRITE_SCOPES);
  }
  if (provider === "microsoft") {
    return hasAnyScope(scopes, MICROSOFT_CALENDAR_WRITE_SCOPES);
  }
  return false;
}

function buildCalendarReadinessRecommendations(issues: string[]): string[] {
  const recommendations = new Set<string>();

  for (const issue of issues) {
    if (issue === "calendar_links_missing") {
      recommendations.add(
        "Link at least one Google or Microsoft calendar connection to this resource (or org default calendar settings) before go-live."
      );
    }
    if (issue === "calendar_links_not_write_ready") {
      recommendations.add(
        "Ensure at least one linked connection is active, calendar sync is enabled, and calendar write scopes are granted."
      );
    }
    if (issue === "calendar_connection_missing") {
      recommendations.add(
        "Reconnect or relink the missing OAuth calendar connection from the Booking setup workspace."
      );
    }
    if (issue === "calendar_connection_inactive") {
      recommendations.add(
        "Reactivate revoked/inactive calendar OAuth connections before accepting confirmed bookings."
      );
    }
    if (issue === "calendar_sync_disabled") {
      recommendations.add(
        "Enable calendar sync on the linked OAuth connection so confirmed bookings can be pushed."
      );
    }
    if (issue === "calendar_write_scope_missing") {
      recommendations.add(
        "Re-authenticate the calendar connection with write scopes (Google calendar.events/calendar or Microsoft Calendars.ReadWrite)."
      );
    }
    if (issue === "calendar_google_push_calendar_missing") {
      recommendations.add(
        "Select a Google push calendar ID in calendar settings for each linked connection."
      );
    }
    if (issue === "calendar_readiness_lookup_failed") {
      recommendations.add(
        "Run calendar readiness diagnostics from the booking setup tool and fix connectivity before launch."
      );
    }
  }

  return Array.from(recommendations);
}

async function buildCalendarPushReadinessDiagnostics(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  resourceId: Id<"objects">;
}): Promise<CalendarPushReadinessDiagnostics> {
  const checkedAt = Date.now();
  const issueCodes = new Set<string>();
  const diagnostics: CalendarPushReadinessDiagnostics = {
    checkedAt,
    linkedConnectionCount: 0,
    writeReadyConnectionCount: 0,
    writeReady: false,
    issues: [],
    recommendations: [],
    connections: [],
  };

  try {
    const linkedConnections = (await args.ctx.runQuery(
      getInternal().calendarSyncOntology.getResourceCalendarConnections,
      {
        resourceId: args.resourceId,
        organizationId: args.organizationId,
      }
    )) as Array<{
      connectionId: Id<"oauthConnections">;
      provider: string;
      pushCalendarId: string | null;
    }> | null;

    const normalizedLinks = Array.isArray(linkedConnections)
      ? linkedConnections
      : [];
    diagnostics.linkedConnectionCount = normalizedLinks.length;

    if (normalizedLinks.length === 0) {
      issueCodes.add("calendar_links_missing");
    }

    for (const linkedConnection of normalizedLinks) {
      const connectionId = String(linkedConnection.connectionId);
      const connection = await args.ctx.db.get(
        linkedConnection.connectionId as Id<"oauthConnections">
      );

      const provider = normalizeOptionalString(
        connection?.provider || linkedConnection.provider
      ) || "unknown";
      const status = normalizeOptionalString(connection?.status);
      const syncEnabled =
        ((connection?.syncSettings || {}) as Record<string, unknown>)
          .calendar === true;
      const scopes = Array.isArray(connection?.scopes)
        ? (connection.scopes as string[])
        : undefined;
      const canWriteCalendar = hasCalendarWriteScope(provider, scopes);
      const pushCalendarId =
        provider === "google"
          ? normalizeOptionalString(linkedConnection.pushCalendarId)
          : null;

      const connectionIssues: string[] = [];
      if (!connection) {
        connectionIssues.push("calendar_connection_missing");
      }
      if (status !== "active") {
        connectionIssues.push("calendar_connection_inactive");
      }
      if (!syncEnabled) {
        connectionIssues.push("calendar_sync_disabled");
      }
      if (!canWriteCalendar) {
        connectionIssues.push("calendar_write_scope_missing");
      }
      if (provider === "google" && !pushCalendarId) {
        connectionIssues.push("calendar_google_push_calendar_missing");
      }

      const writeReady = connectionIssues.length === 0;
      if (writeReady) {
        diagnostics.writeReadyConnectionCount += 1;
      }

      for (const issue of connectionIssues) {
        issueCodes.add(issue);
      }

      diagnostics.connections.push({
        connectionId,
        provider,
        status,
        syncEnabled,
        canWriteCalendar,
        pushCalendarId,
        writeReady,
        issues: connectionIssues,
      });
    }

    diagnostics.writeReady = diagnostics.writeReadyConnectionCount > 0;
    if (!diagnostics.writeReady) {
      issueCodes.add("calendar_links_not_write_ready");
    }
  } catch (error) {
    issueCodes.add("calendar_readiness_lookup_failed");
    console.error("Failed to build booking calendar readiness diagnostics:", error);
  }

  diagnostics.issues = Array.from(issueCodes);
  diagnostics.recommendations = buildCalendarReadinessRecommendations(
    diagnostics.issues
  );
  return diagnostics;
}

function readCustomProperties(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  if (!("customProperties" in value)) {
    return {};
  }
  const candidate = (value as { customProperties?: unknown }).customProperties;
  return candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {};
}

function normalizeSeatGroups(rawGroups: unknown[]): SeatGroupConfig[] {
  const groups: SeatGroupConfig[] = [];

  for (const rawGroup of rawGroups) {
    if (!rawGroup || typeof rawGroup !== "object") {
      continue;
    }
    const groupRecord = rawGroup as Record<string, unknown>;
    const groupId = normalizeOptionalString(groupRecord.groupId);
    const capacity = normalizePositiveInteger(groupRecord.capacity);
    if (!groupId || capacity <= 0) {
      continue;
    }
    groups.push({
      groupId,
      label: normalizeOptionalString(groupRecord.label) || undefined,
      capacity,
    });
  }

  return groups;
}

function normalizeSeatSelections(rawSelections: unknown): SeatSelection[] {
  if (!Array.isArray(rawSelections)) {
    return [];
  }

  const grouped = new Map<string, Set<number>>();
  for (const rawSelection of rawSelections) {
    if (!rawSelection || typeof rawSelection !== "object") {
      continue;
    }
    const record = rawSelection as Record<string, unknown>;
    const groupId = normalizeOptionalString(record.groupId);
    if (!groupId) {
      continue;
    }
    const rawSeatNumbers = Array.isArray(record.seatNumbers)
      ? record.seatNumbers
      : [];
    if (!grouped.has(groupId)) {
      grouped.set(groupId, new Set<number>());
    }
    const seatSet = grouped.get(groupId)!;
    for (const rawSeatNumber of rawSeatNumbers) {
      const seatNumber = normalizePositiveInteger(rawSeatNumber);
      if (seatNumber > 0) {
        seatSet.add(seatNumber);
      }
    }
  }

  return Array.from(grouped.entries()).map(([groupId, seatSet]) => ({
    groupId,
    seatNumbers: Array.from(seatSet).sort((a, b) => a - b),
  }));
}

function countSelectedSeats(selections: SeatSelection[]): number {
  return selections.reduce((sum, selection) => sum + selection.seatNumbers.length, 0);
}

function getDefaultSeatInventory(capacity: number): SeatInventoryConfig {
  return {
    groups: [
      {
        groupId: "default",
        label: "Default",
        capacity: Math.max(1, normalizePositiveInteger(capacity)),
      },
    ],
    strictSeatSelection: false,
  };
}

function resolveSeatInventoryConfig(args: {
  argsSeatInventory?: { groups: Array<{ groupId: string; label?: string; capacity: number }>; strictSeatSelection?: boolean };
  resourceProps?: Record<string, unknown>;
  defaultCapacity: number;
}): SeatInventoryConfig {
  const fromArgs = args.argsSeatInventory;
  if (fromArgs) {
    const groups = normalizeSeatGroups(fromArgs.groups);
    if (groups.length > 0) {
      return {
        groups,
        strictSeatSelection: fromArgs.strictSeatSelection === true,
      };
    }
  }

  const resourceSeatInventory =
    args.resourceProps?.seatInventory as Record<string, unknown> | undefined;
  if (resourceSeatInventory && typeof resourceSeatInventory === "object") {
    const rawGroups = Array.isArray(resourceSeatInventory.groups)
      ? resourceSeatInventory.groups
      : [];
    const groups = normalizeSeatGroups(rawGroups);
    if (groups.length > 0) {
      return {
        groups,
        strictSeatSelection: resourceSeatInventory.strictSeatSelection === true,
      };
    }
  }

  return getDefaultSeatInventory(args.defaultCapacity);
}

function getBookingWindow(booking: BookingRecord): { startDateTime: number; endDateTime: number } | null {
  const bookingProps = booking.customProperties as Record<string, unknown> | undefined;
  const startDateTime = bookingProps?.startDateTime;
  const endDateTime = bookingProps?.endDateTime;
  if (
    typeof startDateTime !== "number" ||
    !Number.isFinite(startDateTime) ||
    typeof endDateTime !== "number" ||
    !Number.isFinite(endDateTime)
  ) {
    return null;
  }
  return { startDateTime, endDateTime };
}

function isBookingOverlappingWindow(args: {
  booking: BookingRecord;
  startDateTime: number;
  endDateTime: number;
}): boolean {
  const window = getBookingWindow(args.booking);
  if (!window) {
    return false;
  }
  return window.startDateTime < args.endDateTime && window.endDateTime > args.startDateTime;
}

async function getOverlappingBookingsForResource(args: {
  ctx: any;
  resourceId: Id<"objects">;
  startDateTime: number;
  endDateTime: number;
  excludeBookingId?: Id<"objects">;
}): Promise<BookingRecord[]> {
  const links = await args.ctx.db
    .query("objectLinks")
    .withIndex("by_to_link_type", (q: any) =>
      q.eq("toObjectId", args.resourceId).eq("linkType", "books_resource")
    )
    .collect();

  const bookings: BookingRecord[] = [];
  for (const link of links) {
    const booking = (await args.ctx.db.get(link.fromObjectId)) as BookingRecord | null;
    if (!booking || (booking as any).type !== "booking") {
      continue;
    }
    if (args.excludeBookingId && booking._id === args.excludeBookingId) {
      continue;
    }
    if (booking.status === "cancelled") {
      continue;
    }
    if (
      isBookingOverlappingWindow({
        booking,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
      })
    ) {
      bookings.push(booking);
    }
  }

  return bookings;
}

function assignUnassignedParticipantsToSeats(args: {
  groups: SeatGroupConfig[];
  bookedSeatsByGroup: Map<string, Set<number>>;
  participantsToAssign: number;
  preferredGroupIds?: string[];
}): number {
  let remaining = Math.max(0, args.participantsToAssign);
  if (remaining === 0) {
    return 0;
  }

  const preferredGroups = new Set(
    Array.isArray(args.preferredGroupIds)
      ? args.preferredGroupIds
      : []
  );
  const orderedGroups = [
    ...args.groups.filter((group) => preferredGroups.has(group.groupId)),
    ...args.groups.filter((group) => !preferredGroups.has(group.groupId)),
  ];

  for (const group of orderedGroups) {
    if (remaining <= 0) {
      break;
    }
    if (!args.bookedSeatsByGroup.has(group.groupId)) {
      args.bookedSeatsByGroup.set(group.groupId, new Set<number>());
    }
    const bookedSeats = args.bookedSeatsByGroup.get(group.groupId)!;
    for (let seatNumber = 1; seatNumber <= group.capacity; seatNumber += 1) {
      if (remaining <= 0) {
        break;
      }
      if (bookedSeats.has(seatNumber)) {
        continue;
      }
      bookedSeats.add(seatNumber);
      remaining -= 1;
    }
  }

  return remaining;
}

function buildSeatAvailabilitySnapshot(args: {
  groups: SeatGroupConfig[];
  bookings: BookingRecord[];
}): SeatAvailabilitySnapshot {
  const bookedSeatsByGroup = new Map<string, Set<number>>();
  const groupCapacityMap = new Map<string, number>();

  for (const group of args.groups) {
    groupCapacityMap.set(group.groupId, group.capacity);
    bookedSeatsByGroup.set(group.groupId, new Set<number>());
  }

  let bookedParticipants = 0;
  let unassignedParticipants = 0;

  for (const booking of args.bookings) {
    const bookingProps = booking.customProperties as Record<string, unknown> | undefined;
    const bookingSeatSelections = normalizeSeatSelections(bookingProps?.seatSelections);

    let assignedSeats = 0;
    for (const selection of bookingSeatSelections) {
      const capacity = groupCapacityMap.get(selection.groupId);
      if (!capacity || capacity <= 0) {
        continue;
      }
      const bookedSeats = bookedSeatsByGroup.get(selection.groupId)!;
      for (const seatNumber of selection.seatNumbers) {
        if (seatNumber < 1 || seatNumber > capacity) {
          continue;
        }
        if (!bookedSeats.has(seatNumber)) {
          bookedSeats.add(seatNumber);
          assignedSeats += 1;
        }
      }
    }

    const explicitParticipants = normalizePositiveInteger(bookingProps?.participants);
    const effectiveParticipants =
      explicitParticipants > 0
        ? explicitParticipants
        : assignedSeats > 0
          ? assignedSeats
          : 1;

    bookedParticipants += effectiveParticipants;

    const participantsToAssign = Math.max(0, effectiveParticipants - assignedSeats);
    const stillUnassigned = assignUnassignedParticipantsToSeats({
      groups: args.groups,
      bookedSeatsByGroup,
      participantsToAssign,
      preferredGroupIds: bookingSeatSelections.map((selection) => selection.groupId),
    });
    unassignedParticipants += stillUnassigned;
  }

  const totalCapacity = args.groups.reduce((sum, group) => sum + group.capacity, 0);
  const remainingCapacity = Math.max(0, totalCapacity - bookedParticipants);

  return {
    totalCapacity,
    bookedParticipants,
    remainingCapacity: unassignedParticipants > 0 ? 0 : remainingCapacity,
    bookedSeatsByGroup,
    unassignedParticipants,
  };
}

function validateRequestedSeatSelection(args: {
  selections: SeatSelection[];
  groups: SeatGroupConfig[];
  bookedSeatsByGroup: Map<string, Set<number>>;
  participants: number;
  strictSeatSelection: boolean;
}): void {
  const groupCapacityMap = new Map<string, number>();
  for (const group of args.groups) {
    groupCapacityMap.set(group.groupId, group.capacity);
  }

  for (const selection of args.selections) {
    const capacity = groupCapacityMap.get(selection.groupId);
    if (!capacity) {
      throw new Error(`Unknown seat group: ${selection.groupId}`);
    }
    for (const seatNumber of selection.seatNumbers) {
      if (seatNumber < 1 || seatNumber > capacity) {
        throw new Error(
          `Seat ${seatNumber} is not valid for seat group ${selection.groupId}`
        );
      }
      if (args.bookedSeatsByGroup.get(selection.groupId)?.has(seatNumber)) {
        throw new Error(
          `Seat ${seatNumber} in ${selection.groupId} is no longer available`
        );
      }
    }
  }

  const selectedSeatCount = countSelectedSeats(args.selections);
  if (args.strictSeatSelection && selectedSeatCount !== args.participants) {
    throw new Error("Selected seats must match participant count");
  }
  if (selectedSeatCount > args.participants) {
    throw new Error("Selected seat count exceeds participant count");
  }
}

function serializeSeatSnapshot(args: {
  snapshot: SeatAvailabilitySnapshot;
  groups: SeatGroupConfig[];
}) {
  return {
    totalCapacity: args.snapshot.totalCapacity,
    bookedParticipants: args.snapshot.bookedParticipants,
    remainingCapacity: args.snapshot.remainingCapacity,
    unassignedParticipants: args.snapshot.unassignedParticipants,
    groups: args.groups.map((group) => {
      const bookedSeatNumbers = Array.from(
        args.snapshot.bookedSeatsByGroup.get(group.groupId) || new Set<number>()
      ).sort((a, b) => a - b);
      const availableSeatNumbers: number[] = [];
      for (let seatNumber = 1; seatNumber <= group.capacity; seatNumber += 1) {
        if (!bookedSeatNumbers.includes(seatNumber)) {
          availableSeatNumbers.push(seatNumber);
        }
      }
      return {
        groupId: group.groupId,
        label: group.label,
        capacity: group.capacity,
        bookedSeatNumbers,
        availableSeatNumbers,
      };
    }),
  };
}

export const getSeatAvailabilityInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    resourceId: v.id("objects"),
    startDateTime: v.number(),
    endDateTime: v.number(),
    excludeBookingId: v.optional(v.id("objects")),
    seatInventory: v.optional(seatInventoryValidator),
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }
    if (resource.organizationId !== args.organizationId) {
      throw new Error("Resource not found");
    }

    const resourceProps = resource.customProperties as Record<string, unknown> | undefined;
    const bookableConfig = resourceProps?.bookableConfig as Record<string, unknown> | undefined;
    const capacity =
      normalizePositiveInteger(resourceProps?.capacity) ||
      normalizePositiveInteger(bookableConfig?.capacity) ||
      1;

    const seatInventoryConfig = resolveSeatInventoryConfig({
      argsSeatInventory: args.seatInventory,
      resourceProps,
      defaultCapacity: capacity,
    });

    const bookings = await getOverlappingBookingsForResource({
      ctx,
      resourceId: args.resourceId,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      excludeBookingId: args.excludeBookingId,
    });

    const snapshot = buildSeatAvailabilitySnapshot({
      groups: seatInventoryConfig.groups,
      bookings,
    });

    return serializeSeatSnapshot({
      snapshot,
      groups: seatInventoryConfig.groups,
    });
  },
});

/**
 * CUSTOMER CHECKOUT INTERNAL
 *
 * Creates a resource booking from a customer checkout flow:
 * 1. Validates resource exists and is bookable
 * 2. Checks availability / conflict detection
 * 3. Creates or finds CRM contact
 * 4. Creates the booking record
 * 5. Returns booking details with remaining capacity
 */
export const customerCheckoutInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    resourceId: v.id("objects"),
    startDateTime: v.number(),
    endDateTime: v.number(),
    timezone: v.optional(v.string()),
    customer: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    }),
    participants: v.optional(v.number()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    eventId: v.optional(v.id("objects")),
    departureId: v.optional(v.id("objects")),
    seatCount: v.optional(v.number()),
    passengerCount: v.optional(v.number()),
    ignoreOutsideAvailability: v.optional(v.boolean()),
    seatSelections: v.optional(v.array(seatSelectionValidator)),
    seatInventory: v.optional(seatInventoryValidator),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    bookingId: Id<"objects">;
    status: string;
    contactId: Id<"objects"> | null;
    remainingCapacity: number;
    totalAmountCents: number;
    calendarDiagnostics: CalendarPushRuntimeDiagnostics;
  }> => {
    // 1. Load and validate resource
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }
    if (resource.organizationId !== args.organizationId) {
      throw new Error("Resource not found");
    }

    const resourceProps = resource.customProperties as Record<string, unknown> | undefined;
    const bookableConfig = resourceProps?.bookableConfig as Record<string, unknown> | undefined;
    if (!bookableConfig) {
      throw new Error("Resource is not bookable");
    }

    const capacity =
      normalizePositiveInteger(resourceProps?.capacity) ||
      normalizePositiveInteger(bookableConfig?.capacity) ||
      1;
    const normalizedSeatSelections = normalizeSeatSelections(args.seatSelections || []);
    const selectedSeatCount = countSelectedSeats(normalizedSeatSelections);
    const participantsFromArgs = normalizePositiveInteger(args.participants);
    const participants =
      participantsFromArgs > 0
        ? participantsFromArgs
        : selectedSeatCount > 0
          ? selectedSeatCount
          : 1;

    const hasResourceSeatInventory =
      Boolean(
        resourceProps?.seatInventory &&
        typeof resourceProps.seatInventory === "object" &&
        Array.isArray((resourceProps.seatInventory as Record<string, unknown>).groups)
      );
    const useSeatInventory =
      Boolean(args.seatInventory) || hasResourceSeatInventory;
    const seatInventoryConfig = useSeatInventory
      ? resolveSeatInventoryConfig({
          argsSeatInventory: args.seatInventory,
          resourceProps,
          defaultCapacity: capacity,
        })
      : null;

    // 2. Check availability / conflicts through the model-aware dispatcher
    const conflictResult = await ctx.runQuery(
      getInternal().availabilityOntology.checkConflictByModel,
      {
        resourceId: args.resourceId,
        organizationId: args.organizationId,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        ...(args.timezone ? { timezone: args.timezone } : {}),
        participants,
        ...(args.seatCount !== undefined ? { seatCount: args.seatCount } : {}),
        ...(args.passengerCount !== undefined
          ? { passengerCount: args.passengerCount }
          : {}),
        ...(args.eventId !== undefined ? { eventId: args.eventId } : {}),
        ...(args.departureId !== undefined
          ? { departureId: args.departureId }
          : {}),
      }
    );
    const canIgnoreOutsideAvailability =
      args.ignoreOutsideAvailability === true
      && conflictResult.reason === "Outside configured availability";

    if (conflictResult.hasConflict && !canIgnoreOutsideAvailability) {
      throw new Error(
        conflictResult.reason || "No availability for the selected time slot"
      );
    }

    if (seatInventoryConfig) {
      const bookingsInWindow = await getOverlappingBookingsForResource({
        ctx,
        resourceId: args.resourceId,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
      });
      const preSeatSnapshot = buildSeatAvailabilitySnapshot({
        groups: seatInventoryConfig.groups,
        bookings: bookingsInWindow,
      });

      validateRequestedSeatSelection({
        selections: normalizedSeatSelections,
        groups: seatInventoryConfig.groups,
        bookedSeatsByGroup: preSeatSnapshot.bookedSeatsByGroup,
        participants,
        strictSeatSelection: seatInventoryConfig.strictSeatSelection,
      });

      if (participants > preSeatSnapshot.remainingCapacity) {
        throw new Error(
          preSeatSnapshot.remainingCapacity > 0
            ? `Only ${preSeatSnapshot.remainingCapacity} seats available`
            : "No seats available for the selected time slot"
        );
      }
    }

    // 3. Calculate pricing
    const pricePerUnit = (resourceProps?.pricePerUnit as number) ||
      (bookableConfig?.pricePerUnit as number) || 0;
    const priceUnit = (resourceProps?.priceUnit as string) ||
      (bookableConfig?.priceUnit as string) || "session";

    let totalAmountCents = 0;
    if (priceUnit === "per_person" || priceUnit === "seat") {
      totalAmountCents = pricePerUnit * participants;
    } else if (priceUnit === "hour") {
      const hours = (args.endDateTime - args.startDateTime) / 3600000;
      totalAmountCents = Math.round(pricePerUnit * hours);
    } else {
      // "session", "flat", etc.
      totalAmountCents = pricePerUnit;
    }

    // 4. Find or create CRM contact
    let contactId: Id<"objects"> | null = null;
    try {
      // Look for existing contact by email
      const existingContacts = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "contact")
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const existingContact = existingContacts.find((c) => {
        const cp = c.customProperties as Record<string, unknown> | undefined;
        return cp?.email === args.customer.email;
      });

      if (existingContact) {
        contactId = existingContact._id;
      } else {
        // Get system user for record creation
        const systemUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
          .first();

        if (systemUser) {
          contactId = await ctx.db.insert("objects", {
            organizationId: args.organizationId,
            type: "contact",
            subtype: "customer",
            name: `${args.customer.firstName} ${args.customer.lastName}`,
            status: "active",
            customProperties: {
              firstName: args.customer.firstName,
              lastName: args.customer.lastName,
              email: args.customer.email,
              phone: args.customer.phone || "",
              source: args.source || "web",
              tags: ["booking-customer"],
            },
            createdBy: systemUser._id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    } catch (error) {
      // Don't fail the booking if CRM contact creation fails
      console.error("Failed to create/find CRM contact:", error);
    }

    // 5. Determine booking subtype from resource subtype
    const subtypeMap: Record<string, string> = {
      room: "reservation",
      staff: "appointment",
      equipment: "rental",
      space: "reservation",
      appointment: "appointment",
      class: "class_enrollment",
      treatment: "appointment",
    };
    const bookingSubtype = subtypeMap[resource.subtype || ""] || "appointment";

    // 6. Get system user for booking creation
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();
    if (!systemUser) {
      throw new Error("System user not found");
    }

    // 7. Determine if confirmation is required
    const confirmationRequired = (bookableConfig?.confirmationRequired as boolean) ?? false;

    // 7.5. Snapshot calendar write-readiness for go-live diagnostics
    const calendarReadinessDiagnostics = await buildCalendarPushReadinessDiagnostics({
      ctx,
      organizationId: args.organizationId,
      resourceId: args.resourceId,
    });

    // 8. Create booking via internal mutation
    const result = await ctx.runMutation(getInternal().bookingOntology.createBookingInternal, {
      organizationId: args.organizationId,
      userId: systemUser._id,
      subtype: bookingSubtype,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      timezone: args.timezone,
      resourceIds: [args.resourceId],
      customerId: contactId || undefined,
      customerName: `${args.customer.firstName} ${args.customer.lastName}`,
      customerEmail: args.customer.email,
      customerPhone: args.customer.phone,
      participants,
      paymentType: totalAmountCents > 0 ? "full" : "none",
      totalAmountCents,
      confirmationRequired,
      notes: args.notes,
      isAdminBooking: false,
      ...(args.eventId !== undefined ? { eventId: args.eventId } : {}),
      ...(args.departureId !== undefined
        ? { departureId: args.departureId }
        : {}),
      ...(args.seatCount !== undefined ? { seatCount: args.seatCount } : {}),
      ...(args.passengerCount !== undefined
        ? { passengerCount: args.passengerCount }
        : {}),
      ...(args.ignoreOutsideAvailability === true
        ? { ignoreOutsideAvailability: true }
        : {}),
    });

    const calendarPushScheduled = result.status === "confirmed";
    const calendarPushScheduledAt = calendarPushScheduled ? Date.now() : null;
    const calendarDiagnostics: CalendarPushRuntimeDiagnostics = {
      ...calendarReadinessDiagnostics,
      bookingStatus: result.status,
      calendarPushScheduled,
      calendarPushScheduledAt,
    };

    const shouldPersistSeatInventory =
      Boolean(
        seatInventoryConfig &&
        (normalizedSeatSelections.length > 0 || seatInventoryConfig.groups.length > 0)
      );
    try {
      const bookingDoc = await ctx.db.get(result.bookingId as Id<"objects">);
      if (bookingDoc) {
        const currentProps = readCustomProperties(bookingDoc);
        await ctx.db.patch(result.bookingId, {
          customProperties: {
            ...currentProps,
            ...(shouldPersistSeatInventory
              ? {
                  seatSelections: normalizedSeatSelections,
                  seatInventoryGroups: seatInventoryConfig?.groups || [],
                  seatSelectionStrict: seatInventoryConfig?.strictSeatSelection || false,
                }
              : {}),
            calendarPushDiagnostics: calendarDiagnostics,
          },
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error("Failed to patch booking calendar diagnostics:", error);
    }

    if (calendarPushScheduled) {
      await ctx.scheduler.runAfter(
        0,
        getInternal().calendarSyncOntology.pushBookingToCalendar,
        {
          bookingId: result.bookingId,
          organizationId: args.organizationId,
        }
      );
    }

    // 9. Calculate remaining capacity after this booking
    let remainingCapacity = Math.max(0, capacity - participants);
    if (seatInventoryConfig) {
      const postBookingsInWindow = await getOverlappingBookingsForResource({
        ctx,
        resourceId: args.resourceId,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
      });
      const postSeatSnapshot = buildSeatAvailabilitySnapshot({
        groups: seatInventoryConfig.groups,
        bookings: postBookingsInWindow,
      });
      remainingCapacity = postSeatSnapshot.remainingCapacity;
    } else {
      const postConflict = await ctx.runQuery(getInternal().availabilityOntology.checkConflictByModel, {
        resourceId: args.resourceId,
        organizationId: args.organizationId,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        ...(args.timezone ? { timezone: args.timezone } : {}),
        participants: 1,
        ...(args.seatCount !== undefined ? { seatCount: args.seatCount } : {}),
        ...(args.passengerCount !== undefined
          ? { passengerCount: args.passengerCount }
          : {}),
        ...(args.eventId !== undefined ? { eventId: args.eventId } : {}),
        ...(args.departureId !== undefined
          ? { departureId: args.departureId }
          : {}),
      });
      const canIgnorePostConflict =
        args.ignoreOutsideAvailability === true
        && postConflict.reason === "Outside configured availability";
      remainingCapacity =
        postConflict.hasConflict && !canIgnorePostConflict
          ? 0
          : Math.max(0, capacity - participants);
    }

    return {
      success: true,
      bookingId: result.bookingId,
      status: result.status,
      contactId,
      remainingCapacity,
      totalAmountCents,
      calendarDiagnostics,
    };
  },
});

export const __testables = {
  normalizeSeatSelections,
  countSelectedSeats,
  buildSeatAvailabilitySnapshot,
  validateRequestedSeatSelection,
  buildCalendarReadinessRecommendations,
};
