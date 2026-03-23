import { describe, expect, it, vi } from "vitest";
import { pushBookingToCalendar } from "../../convex/calendarSyncOntology";

const BOOKING_ID = "objects_booking_push_reconcile";
const ORGANIZATION_ID = "organizations_booking_push_reconcile";
const RESOURCE_ID = "objects_resource_push_reconcile";
const GOOGLE_CONNECTION_ID = "oauthConnections_booking_push_reconcile";
const START_DATE_TIME = Date.UTC(2026, 2, 18, 15, 0, 0, 0);
const END_DATE_TIME = Date.UTC(2026, 2, 18, 16, 0, 0, 0);

function buildBooking() {
  return {
    _id: BOOKING_ID,
    organizationId: ORGANIZATION_ID,
    type: "booking",
    subtype: "consultation",
    name: "Strategy Call",
    customProperties: {
      startDateTime: START_DATE_TIME,
      endDateTime: END_DATE_TIME,
      customerName: "Jamie Example",
      customerEmail: "jamie@example.com",
      resourceIds: [RESOURCE_ID],
      externalCalendarEvents: {
        "google:oauthConnections_booking_push_reconcile:secondary@example.com": {
          provider: "google",
          connectionId: GOOGLE_CONNECTION_ID,
          calendarId: "secondary@example.com",
          externalEventId: "evt_stale_secondary",
        },
        "google:oauthConnections_booking_push_reconcile:primary@example.com": {
          provider: "google",
          connectionId: GOOGLE_CONNECTION_ID,
          calendarId: "primary@example.com",
          externalEventId: "evt_existing_primary",
        },
      },
    },
  };
}

function buildGoogleConnection() {
  return {
    _id: GOOGLE_CONNECTION_ID,
    organizationId: ORGANIZATION_ID,
    provider: "google",
    status: "active",
    syncSettings: {
      calendar: true,
    },
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    customProperties: {
      subCalendars: [
        { calendarId: "primary@example.com", primary: true },
        { calendarId: "secondary@example.com" },
      ],
    },
  };
}

describe("Google calendar push reconciliation integration", () => {
  it("deletes stale targets and updates the current booking target on the resolved calendar", async () => {
    const booking = buildBooking();
    const connection = buildGoogleConnection();

    const runQuery = vi.fn(async (_reference: unknown, args: Record<string, unknown>) => {
      if ("bookingId" in args) {
        return booking;
      }
      if ("resourceId" in args) {
        return [
          {
            connectionId: GOOGLE_CONNECTION_ID,
            provider: "google",
            pushCalendarId: "primary@example.com",
          },
        ];
      }
      if ("connectionId" in args) {
        return connection;
      }
      throw new Error(`Unexpected runQuery args: ${JSON.stringify(args)}`);
    });

    const runAction = vi.fn(async (_reference: unknown, args: Record<string, unknown>) => {
      if (args.eventId === "evt_stale_secondary" && !("eventData" in args)) {
        return undefined;
      }
      if (args.eventId === "evt_existing_primary" && "eventData" in args) {
        return { id: "evt_updated_primary" };
      }
      throw new Error(`Unexpected runAction args: ${JSON.stringify(args)}`);
    });

    const runMutation = vi.fn(async () => undefined);

    const result = await (pushBookingToCalendar as any)._handler(
      {
        runQuery,
        runAction,
        runMutation,
      },
      {
        bookingId: BOOKING_ID,
        organizationId: ORGANIZATION_ID,
      }
    );

    expect(result).toEqual({
      success: true,
      pushCount: 1,
      deleteCount: 1,
      targetCount: 1,
    });

    expect(runAction).toHaveBeenCalledTimes(2);
    expect(runAction).toHaveBeenCalledWith(expect.anything(), {
      connectionId: GOOGLE_CONNECTION_ID,
      eventId: "evt_stale_secondary",
      calendarId: "secondary@example.com",
    });
    expect(runAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        connectionId: GOOGLE_CONNECTION_ID,
        calendarId: "primary@example.com",
        eventId: "evt_existing_primary",
        eventData: {
          summary: "Booking: Strategy Call",
          description: "Customer: Jamie Example\nEmail: jamie@example.com\nType: consultation",
          start: { dateTime: new Date(START_DATE_TIME).toISOString(), timeZone: "UTC" },
          end: { dateTime: new Date(END_DATE_TIME).toISOString(), timeZone: "UTC" },
          status: "confirmed",
        },
      })
    );

    expect(runMutation).toHaveBeenCalledTimes(2);
    expect(runMutation).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        bookingId: BOOKING_ID,
        recordKey:
          "google:oauthConnections_booking_push_reconcile:secondary@example.com",
      })
    );
    expect(runMutation).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        bookingId: BOOKING_ID,
        provider: "google",
        externalEventId: "evt_updated_primary",
        connectionId: GOOGLE_CONNECTION_ID,
        calendarId: "primary@example.com",
      })
    );
  });
});
