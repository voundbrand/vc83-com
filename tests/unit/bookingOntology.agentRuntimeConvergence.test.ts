import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getFunctionName } from "convex/server";
import {
  recordPhoneCallBookingMirrorInternal,
  setBookingConciergeMetadataInternal,
  updateBookingStatusInternal,
} from "../../convex/bookingOntology";

type Row = Record<string, unknown> & { _id: string };

const NOW = Date.parse("2026-03-17T12:00:00.000Z");
const ORG_ID = "organizations_booking_runtime";
const USER_ID = "users_booking_runtime" as Id<"users">;
const BOOKING_ID = "objects_booking_runtime" as Id<"objects">;
const RESOURCE_ID = "objects_resource_runtime" as Id<"objects">;
const AGENT_ID = "objects_agent_runtime" as Id<"objects">;
const AGENT_SESSION_ID = "agentSessions_booking_runtime" as Id<"agentSessions">;
const CALL_RECORD_ID = "objects_call_runtime" as Id<"objects">;
const PROCESS_BOOKING_TRIGGER = getFunctionName(
  internal.sequences.sequenceProcessor.processBookingTrigger,
);
const PUSH_BOOKING_TO_CALENDAR = getFunctionName(
  internal.calendarSyncOntology.pushBookingToCalendar,
);
const DELETE_BOOKING_FROM_CALENDAR = getFunctionName(
  internal.calendarSyncOntology.deleteBookingFromCalendar,
);

class FakeQuery {
  private readonly filters: Array<{ field: string; value: unknown }> = [];

  constructor(private readonly getRows: () => Row[]) {}

  withIndex(
    _indexName: string,
    build?: (q: { eq: (field: string, value: unknown) => unknown }) => unknown,
  ) {
    const query = {
      eq: (field: string, value: unknown) => {
        this.filters.push({ field, value });
        return query;
      },
    };
    if (build) {
      build(query);
    }
    return this;
  }

  async collect() {
    return this.getRows().filter((row) =>
      this.filters.every((filter) => row[filter.field] === filter.value),
    );
  }
}

class FakeDb {
  private readonly rows = new Map<string, Row>();
  private readonly objectLinks = new Map<string, Row>();
  private objectInsertCount = 0;
  private objectLinkInsertCount = 0;

  constructor(args: { objects: Row[]; objectLinks?: Row[] }) {
    for (const row of args.objects) {
      this.rows.set(String(row._id), structuredClone(row));
    }
    for (const row of args.objectLinks || []) {
      this.objectLinks.set(String(row._id), structuredClone(row));
    }
  }

  async get(id: string) {
    const row = this.rows.get(String(id));
    return row ? structuredClone(row) : null;
  }

  async patch(id: string, updates: Record<string, unknown>) {
    const current = this.rows.get(String(id));
    if (!current) {
      throw new Error("Row not found");
    }
    this.rows.set(String(id), {
      ...current,
      ...updates,
    });
  }

  async insert(
    tableName: "objects" | "objectLinks",
    value: Record<string, unknown>,
  ) {
    if (tableName === "objects") {
      this.objectInsertCount += 1;
      const id = `objects_insert_${this.objectInsertCount}`;
      this.rows.set(id, {
        _id: id,
        ...structuredClone(value),
      });
      return id;
    }
    this.objectLinkInsertCount += 1;
    const id = `objectLinks_insert_${this.objectLinkInsertCount}`;
    this.objectLinks.set(id, {
      _id: id,
      ...structuredClone(value),
    });
    return id;
  }

  query(tableName: "objects" | "objectLinks") {
    if (tableName === "objects") {
      return new FakeQuery(() => Array.from(this.rows.values()));
    }
    if (tableName !== "objectLinks") {
      throw new Error("Unexpected table query");
    }
    return new FakeQuery(() => Array.from(this.objectLinks.values()));
  }

  listObjects() {
    return Array.from(this.rows.values()).map((row) => structuredClone(row));
  }

  listObjectLinks() {
    return Array.from(this.objectLinks.values()).map((row) => structuredClone(row));
  }
}

function createCtx(args: {
  bookingStatus?: string;
  objects?: Row[];
  objectLinks?: Row[];
}) {
  const db = new FakeDb({
    objects: args.objects || [
      {
        _id: BOOKING_ID,
        organizationId: ORG_ID,
        type: "booking",
        subtype: "appointment",
        status: args.bookingStatus || "confirmed",
        customProperties: {
          participants: 1,
        },
      },
    ],
    objectLinks: args.objectLinks,
  });

  const scheduler = {
    runAfter: vi.fn(async () => undefined),
  };
  const runMutation = vi.fn(async () => undefined);

  return {
    db,
    scheduler,
    runMutation,
  } as any;
}

describe("booking ontology agent runtime convergence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("confirms pending bookings with native sequence trigger and calendar push scheduling", async () => {
    const ctx = createCtx({
      bookingStatus: "pending_confirmation",
    });

    const result = await (updateBookingStatusInternal as any)._handler(ctx, {
      organizationId: ORG_ID,
      bookingId: BOOKING_ID,
      userId: USER_ID,
      status: "confirmed",
    });

    const booking = await ctx.db.get(String(BOOKING_ID));
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      status: "confirmed",
    });
    expect(booking.status).toBe("confirmed");
    expect(booking.customProperties).toMatchObject({
      participants: 1,
      confirmedAt: NOW,
      confirmedBy: USER_ID,
    });
    expect(ctx.runMutation).toHaveBeenCalledTimes(1);
    expect(getFunctionName(ctx.runMutation.mock.calls[0][0] as any)).toBe(
      PROCESS_BOOKING_TRIGGER,
    );
    expect(ctx.runMutation.mock.calls[0][1]).toEqual({
      bookingId: BOOKING_ID,
      triggerEvent: "booking_confirmed",
    });
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
    expect(ctx.scheduler.runAfter.mock.calls[0][0]).toBe(0);
    expect(getFunctionName(ctx.scheduler.runAfter.mock.calls[0][1] as any)).toBe(
      PUSH_BOOKING_TO_CALENDAR,
    );
    expect(ctx.scheduler.runAfter.mock.calls[0][2]).toEqual({
      bookingId: BOOKING_ID,
      organizationId: ORG_ID,
    });
  });

  it("cancels confirmed bookings with native trigger and calendar delete scheduling", async () => {
    const ctx = createCtx({
      bookingStatus: "confirmed",
    });

    const result = await (updateBookingStatusInternal as any)._handler(ctx, {
      organizationId: ORG_ID,
      bookingId: BOOKING_ID,
      userId: USER_ID,
      status: "cancelled",
      reason: "caller requested cancellation",
      refundAmountCents: 1200,
    });

    const booking = await ctx.db.get(String(BOOKING_ID));
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      status: "cancelled",
    });
    expect(booking.status).toBe("cancelled");
    expect(booking.customProperties).toMatchObject({
      participants: 1,
      cancelledAt: NOW,
      cancelledBy: USER_ID,
      cancellationReason: "caller requested cancellation",
      refundAmountCents: 1200,
    });
    expect(ctx.runMutation).toHaveBeenCalledTimes(1);
    expect(getFunctionName(ctx.runMutation.mock.calls[0][0] as any)).toBe(
      PROCESS_BOOKING_TRIGGER,
    );
    expect(ctx.runMutation.mock.calls[0][1]).toEqual({
      bookingId: BOOKING_ID,
      triggerEvent: "booking_cancelled",
    });
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
    expect(ctx.scheduler.runAfter.mock.calls[0][0]).toBe(0);
    expect(getFunctionName(ctx.scheduler.runAfter.mock.calls[0][1] as any)).toBe(
      DELETE_BOOKING_FROM_CALENDAR,
    );
    expect(ctx.scheduler.runAfter.mock.calls[0][2]).toEqual({
      bookingId: BOOKING_ID,
      organizationId: ORG_ID,
    });
  });

  it("rejects invalid confirm transitions instead of mutating state", async () => {
    const ctx = createCtx({
      bookingStatus: "confirmed",
    });

    await expect(
      (updateBookingStatusInternal as any)._handler(ctx, {
        organizationId: ORG_ID,
        bookingId: BOOKING_ID,
        userId: USER_ID,
        status: "confirmed",
      }),
    ).rejects.toThrow("Booking is not pending confirmation");

    const booking = await ctx.db.get(String(BOOKING_ID));
    expect(booking.status).toBe("confirmed");
    expect(ctx.runMutation).not.toHaveBeenCalled();
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
  });

  it("stores structured legal intake on booking customProperties", async () => {
    const ctx = createCtx({
      objects: [
        {
          _id: BOOKING_ID,
          organizationId: ORG_ID,
          type: "booking",
          subtype: "appointment",
          status: "confirmed",
          customProperties: {
            participants: 1,
            startDateTime: NOW,
            endDateTime: NOW + 30 * 60 * 1000,
            resourceIds: [RESOURCE_ID],
            externalCalendarEvents: {
              "google:oauthConnections_booking_runtime:lawyer@example.com": {
                provider: "google",
                connectionId: "oauthConnections_booking_runtime",
                calendarId: "lawyer@example.com",
                externalEventId: "evt_existing_lawyer",
              },
            },
          },
        },
      ],
    });

    const result = await (setBookingConciergeMetadataInternal as any)._handler(ctx, {
      organizationId: ORG_ID,
      bookingId: BOOKING_ID,
      conciergeIdempotencyKey: "kanzlei_idem_123",
      sourceChannel: "phone_call",
      sourceExternalContactIdentifier: "+49123456789",
      sourceAgentSessionId: AGENT_SESSION_ID,
      sourceAgentId: AGENT_ID,
      sourceProviderCallId: "call_123",
      sourceProviderConversationId: "conv_456",
      practiceArea: "Arbeitsrecht",
      urgency: "high",
      caseSummary: "Kuendigung erhalten, braucht Erstberatung diese Woche.",
      intakeCaptureMode: "live_call",
    });

    const booking = await ctx.db.get(String(BOOKING_ID));
    expect(result).toEqual({
      bookingId: BOOKING_ID,
    });
    expect(booking?.customProperties).toMatchObject({
      participants: 1,
      startDateTime: NOW,
      endDateTime: NOW + 30 * 60 * 1000,
      resourceIds: [RESOURCE_ID],
      externalCalendarEvents: {
        "google:oauthConnections_booking_runtime:lawyer@example.com": {
          provider: "google",
          connectionId: "oauthConnections_booking_runtime",
          calendarId: "lawyer@example.com",
          externalEventId: "evt_existing_lawyer",
        },
      },
      conciergeIdempotencyKey: "kanzlei_idem_123",
      sourceChannel: "phone_call",
      sourceExternalContactIdentifier: "+49123456789",
      sourceAgentSessionId: String(AGENT_SESSION_ID),
      sourceAgentId: String(AGENT_ID),
      sourceProviderCallId: "call_123",
      sourceProviderConversationId: "conv_456",
      practiceArea: "Arbeitsrecht",
      urgency: "high",
      caseSummary: "Kuendigung erhalten, braucht Erstberatung diese Woche.",
      intakeProvenance: {
        sourceChannel: "phone_call",
        providerCallId: "call_123",
        providerConversationId: "conv_456",
        captureMode: "live_call",
      },
    });
  });

  it("mirrors structured legal intake into booking phone-call artifacts", async () => {
    const ctx = createCtx({
      objects: [
        {
          _id: BOOKING_ID,
          organizationId: ORG_ID,
          type: "booking",
          subtype: "appointment",
          status: "confirmed",
          name: "appointment - Jordan Lee",
          customProperties: {
            participants: 1,
          },
        },
        {
          _id: CALL_RECORD_ID,
          organizationId: ORG_ID,
          type: "telephony_call_record",
          subtype: "inbound",
          status: "completed",
          customProperties: {
            providerCallId: "call_123",
            providerConversationId: "conv_456",
          },
        },
      ],
    });

    const result = await (recordPhoneCallBookingMirrorInternal as any)._handler(ctx, {
      organizationId: ORG_ID,
      bookingId: BOOKING_ID,
      providerId: "native_booking",
      providerSource: "native_booking_engine",
      sourceChannel: "phone_call",
      externalContactIdentifier: "+49123456789",
      agentSessionId: AGENT_SESSION_ID,
      agentId: AGENT_ID,
      providerCallId: "call_123",
      providerConversationId: "conv_456",
      personName: "Jordan Lee",
      personPhone: "+49123456789",
      timezone: "Europe/Berlin",
      selectedSlotStart: "2026-03-18T09:00:00.000Z",
      selectedSlotEnd: "2026-03-18T09:30:00.000Z",
      confirmationChannel: "phone_call",
      confirmationRecipient: "+49123456789",
      conciergeIdempotencyKey: "kanzlei_idem_123",
      practiceArea: "Arbeitsrecht",
      urgency: "high",
      caseSummary: "Kuendigung erhalten, braucht Erstberatung diese Woche.",
      intakeCaptureMode: "live_call",
    });

    const booking = await ctx.db.get(String(BOOKING_ID));
    const callRecord = await ctx.db.get(String(CALL_RECORD_ID));
    const artifact = ctx.db
      .listObjects()
      .find((row) => row.type === "booking_phone_call_artifact");
    const objectLinks = ctx.db.listObjectLinks();

    expect(result).toEqual({
      artifactId: String(artifact?._id),
      callRecordId: String(CALL_RECORD_ID),
      replayed: false,
    });
    expect(artifact?.customProperties).toMatchObject({
      bookingId: String(BOOKING_ID),
      providerId: "native_booking",
      providerSource: "native_booking_engine",
      sourceChannel: "phone_call",
      providerCallId: "call_123",
      providerConversationId: "conv_456",
      personName: "Jordan Lee",
      personPhone: "+49123456789",
      practiceArea: "Arbeitsrecht",
      urgency: "high",
      caseSummary: "Kuendigung erhalten, braucht Erstberatung diese Woche.",
      intakeProvenance: {
        sourceChannel: "phone_call",
        providerCallId: "call_123",
        providerConversationId: "conv_456",
        captureMode: "live_call",
      },
    });
    expect(booking?.customProperties).toMatchObject({
      phoneCallArtifactId: String(artifact?._id),
      phoneCallRecordId: String(CALL_RECORD_ID),
      practiceArea: "Arbeitsrecht",
      urgency: "high",
      caseSummary: "Kuendigung erhalten, braucht Erstberatung diese Woche.",
      intakeProvenance: {
        sourceChannel: "phone_call",
        providerCallId: "call_123",
        providerConversationId: "conv_456",
        captureMode: "live_call",
      },
    });
    expect(callRecord?.customProperties).toMatchObject({
      bookingId: String(BOOKING_ID),
      bookingArtifactId: String(artifact?._id),
      bookingArtifactIds: [String(artifact?._id)],
    });
    expect(objectLinks).toHaveLength(3);
    expect(objectLinks.map((link) => link.linkType)).toEqual([
      "has_phone_call_booking_artifact",
      "produced_booking_phone_call_artifact",
      "booked_during_phone_call",
    ]);
  });
});
