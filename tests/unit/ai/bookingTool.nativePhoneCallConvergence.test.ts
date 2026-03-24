import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getFunctionName } from "convex/server";
import {
  executeManageBookings,
  ORG_BOOKING_CONCIERGE_TOOL_ACTION,
} from "../../../convex/ai/tools/bookingTool";

const ORG_ID = "organizations_booking_tool_native" as Id<"organizations">;
const USER_ID = "users_booking_tool_native" as Id<"users">;
const CONTACT_ID = "objects_contact_native" as Id<"objects">;
const RESOURCE_ID = "objects_resource_native" as Id<"objects">;
const BOOKING_ID = "objects_booking_native" as Id<"objects">;

const SLOT_ONE_START = Date.parse("2026-03-18T09:00:00.000Z");
const SLOT_TWO_START = Date.parse("2026-03-18T10:00:00.000Z");
const SLOT_DURATION_MS = 30 * 60 * 1000;

const CREATE_BOOKING_INTERNAL = getFunctionName(
  internal.bookingOntology.createBookingInternal,
);
const PUSH_BOOKING_TO_CALENDAR = getFunctionName(
  internal.calendarSyncOntology.pushBookingToCalendar,
);
const SEARCH_CONTACTS = getFunctionName(
  internal.ai.tools.internalToolMutations.internalSearchContacts,
);
const GET_PRODUCT = getFunctionName(internal.productOntology.getProductInternal);
const GET_AVAILABLE_SLOTS_INTERNAL = getFunctionName(
  internal.availabilityOntology.getAvailableSlotsInternal,
);
const GET_CONNECTION_BUSY_WINDOWS_INTERNAL = getFunctionName(
  internal.calendarSyncOntology.getConnectionBusyWindowsInternal,
);
const SET_BOOKING_CONCIERGE_METADATA_INTERNAL = getFunctionName(
  internal.bookingOntology.setBookingConciergeMetadataInternal,
);
const RECORD_PHONE_CALL_BOOKING_MIRROR_INTERNAL = getFunctionName(
  internal.bookingOntology.recordPhoneCallBookingMirrorInternal,
);
const CREATE_CONTACT_INTERNAL = getFunctionName(
  internal.ai.tools.internalToolMutations.internalCreateContact,
);
const GET_OBJECTS = getFunctionName(api.ontologyHelpers.getObjects);
const GET_BOOKING_INTERNAL = getFunctionName(
  internal.bookingOntology.getBookingInternal,
);
const GET_OBJECT_INTERNAL = getFunctionName(
  internal.objectsInternal.getObjectInternal,
);
const SEND_MESSAGE = getFunctionName(internal.channels.router.sendMessage);
const GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL = getFunctionName(
  (internal as any).organizationOntology.getKanzleiBookingConciergeConfigInternal,
);

function buildCtx(args: {
  runQuery?: (ref: unknown, payload: Record<string, unknown>) => Promise<unknown>;
  runMutation?: (
    ref: unknown,
    payload: Record<string, unknown>,
  ) => Promise<unknown>;
  runAction?: (ref: unknown, payload: Record<string, unknown>) => Promise<unknown>;
}) {
  return {
    runQuery: vi.fn(args.runQuery || (async () => [])),
    runMutation: vi.fn(args.runMutation || (async () => ({}))),
    runAction: vi.fn(args.runAction || (async () => ({}))),
  } as any;
}

describe("manage_bookings native convergence", () => {
  it("pushes confirmed native create_booking writes to calendar reconciliation", async () => {
    const ctx = buildCtx({
      runMutation: async (ref) => {
        if (getFunctionName(ref as any) === CREATE_BOOKING_INTERNAL) {
          return {
            bookingId: BOOKING_ID,
            status: "confirmed",
          };
        }
        throw new Error("Unexpected mutation ref");
      },
      runAction: async (ref, payload) => {
        expect(getFunctionName(ref as any)).toBe(PUSH_BOOKING_TO_CALENDAR);
        expect(payload).toEqual({
          bookingId: BOOKING_ID,
          organizationId: ORG_ID,
        });
        return {
          success: true,
          pushCount: 1,
        };
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: "create_booking",
      mode: "execute",
      resourceId: String(RESOURCE_ID),
      customerName: "Jordan Lee",
      customerEmail: "jordan@example.com",
      startDateTime: "2026-03-18T09:00:00.000Z",
      duration: 30,
      confirmationRequired: false,
    });

    expect(result.success).toBe(true);
    expect(result.data.calendarPush).toEqual({
      success: true,
      pushCount: 1,
    });
    expect(ctx.runAction).toHaveBeenCalledTimes(1);
    expect(ctx.runMutation).toHaveBeenCalledTimes(1);
  });

  it("keeps phone-call preview on native availability and filters external busy windows", async () => {
    const ctx = buildCtx({
      runQuery: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL) {
          return null;
        }
        if (functionName === SEARCH_CONTACTS) {
          return [];
        }
        if (functionName === GET_PRODUCT) {
          expect(payload).toEqual({
            productId: String(RESOURCE_ID),
          });
          return {
            _id: RESOURCE_ID,
            organizationId: ORG_ID,
            name: "Executive Briefing",
          };
        }
        if (functionName === GET_AVAILABLE_SLOTS_INTERNAL) {
          return [
            {
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
            },
            {
              startDateTime: SLOT_TWO_START,
              endDateTime: SLOT_TWO_START + SLOT_DURATION_MS,
            },
          ];
        }
        if (functionName === GET_CONNECTION_BUSY_WINDOWS_INTERNAL) {
          expect(payload.connectionId).toBe("oauth_operator_native");
          return {
            status: "resolved",
            blockedReasons: [],
            busyWindows: [
              {
                startDateTime: SLOT_ONE_START,
                endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
              },
            ],
          };
        }
        throw new Error("Unexpected query ref");
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
      mode: "preview",
      channel: "phone_call",
      resourceId: String(RESOURCE_ID),
      personName: "Jordan Lee",
      personEmail: "jordan@example.com",
      schedulingWindowStart: "2026-03-18T08:00:00.000Z",
      schedulingWindowEnd: "2026-03-18T12:00:00.000Z",
      meetingDurationMinutes: 30,
      operatorCalendarConnectionId: "oauth_operator_native",
    });

    expect(result.success).toBe(true);
    expect(result.data.phoneSafe.provider).toBe("native_booking");
    expect(result.data.phoneSafe.outcome).toBe("preview_ready");
    expect(result.data.recommendedSlot.startDateTime).toBe(
      "2026-03-18T10:00:00.000Z",
    );
    expect(result.data.connectionSnapshots).toEqual([
      {
        source: "operator",
        connectionId: "oauth_operator_native",
        status: "resolved",
        blockedReasons: [],
        busyCount: 1,
      },
    ]);
    expect(ctx.runAction).not.toHaveBeenCalled();
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("prefers configured Kanzlei resource and default lawyer calendar over generic auto-pick", async () => {
    const ctx = buildCtx({
      runQuery: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL) {
          return {
            contractVersion: "kanzlei_booking_concierge_config_v1",
            primaryResourceId: String(RESOURCE_ID),
            primaryResourceLabel: "Arbeitsrecht Erstberatung",
            operatorCalendarConnectionId: "oauth_kanzlei_calendar",
            timezone: "Europe/Berlin",
            defaultMeetingTitle: "Arbeitsrecht Erstberatung",
            intakeLabel: "Erstberatung",
            requireConfiguredResource: true,
          };
        }
        if (functionName === SEARCH_CONTACTS) {
          return [];
        }
        if (functionName === GET_PRODUCT) {
          expect(payload).toEqual({
            productId: String(RESOURCE_ID),
          });
          return {
            _id: RESOURCE_ID,
            organizationId: ORG_ID,
            name: "Arbeitsrecht Erstberatung",
          };
        }
        if (functionName === GET_AVAILABLE_SLOTS_INTERNAL) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            resourceId: RESOURCE_ID,
            timezone: "Europe/Berlin",
          });
          return [
            {
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
            },
            {
              startDateTime: SLOT_TWO_START,
              endDateTime: SLOT_TWO_START + SLOT_DURATION_MS,
            },
          ];
        }
        if (functionName === GET_CONNECTION_BUSY_WINDOWS_INTERNAL) {
          expect(payload.connectionId).toBe("oauth_kanzlei_calendar");
          return {
            status: "resolved",
            blockedReasons: [],
            busyWindows: [
              {
                startDateTime: SLOT_ONE_START,
                endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
              },
            ],
          };
        }
        throw new Error("Unexpected query ref");
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
      mode: "preview",
      channel: "phone_call",
      personName: "Jordan Lee",
      personEmail: "jordan@example.com",
      schedulingWindowStart: "2026-03-18T08:00:00.000Z",
      schedulingWindowEnd: "2026-03-18T12:00:00.000Z",
      meetingDurationMinutes: 30,
    });

    expect(result.success).toBe(true);
    expect(result.data.resource).toEqual({
      id: RESOURCE_ID,
      name: "Arbeitsrecht Erstberatung",
      source: "org_config",
    });
    expect(result.data.phoneSafe.recommendedSlot.startDateTime).toBe(
      "2026-03-18T10:00:00.000Z",
    );
    expect(result.data.connectionSnapshots).toEqual([
      {
        source: "operator",
        connectionId: "oauth_kanzlei_calendar",
        status: "resolved",
        blockedReasons: [],
        busyCount: 1,
      },
    ]);
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("creates Kanzlei-configured phone-call bookings on the configured lawyer calendar path", async () => {
    const ctx = buildCtx({
      runQuery: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL) {
          return {
            contractVersion: "kanzlei_booking_concierge_config_v1",
            primaryResourceId: String(RESOURCE_ID),
            primaryResourceLabel: "Arbeitsrecht Erstberatung",
            operatorCalendarConnectionId: "oauth_kanzlei_calendar",
            timezone: "Europe/Berlin",
            defaultMeetingTitle: "Arbeitsrecht Erstberatung",
            intakeLabel: "Erstberatung",
            requireConfiguredResource: true,
          };
        }
        if (functionName === SEARCH_CONTACTS) {
          return [
            {
              _id: CONTACT_ID,
              name: "Jordan Lee",
              customProperties: {
                email: "jordan@example.com",
                phone: "+49123456789",
              },
            },
          ];
        }
        if (functionName === GET_PRODUCT) {
          expect(payload).toEqual({
            productId: String(RESOURCE_ID),
          });
          return {
            _id: RESOURCE_ID,
            organizationId: ORG_ID,
            name: "Arbeitsrecht Erstberatung",
          };
        }
        if (functionName === GET_AVAILABLE_SLOTS_INTERNAL) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            resourceId: RESOURCE_ID,
            timezone: "Europe/Berlin",
          });
          return [
            {
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
            },
            {
              startDateTime: SLOT_TWO_START,
              endDateTime: SLOT_TWO_START + SLOT_DURATION_MS,
            },
          ];
        }
        if (functionName === GET_CONNECTION_BUSY_WINDOWS_INTERNAL) {
          expect(payload).toEqual({
            organizationId: ORG_ID,
            connectionId: "oauth_kanzlei_calendar",
            startDateTime: Date.parse("2026-03-18T08:00:00.000Z"),
            endDateTime: Date.parse("2026-03-18T12:00:00.000Z"),
          });
          return {
            status: "resolved",
            blockedReasons: [],
            busyWindows: [
              {
                startDateTime: SLOT_ONE_START,
                endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
              },
            ],
          };
        }
        if (functionName === GET_OBJECTS) {
          return [];
        }
        throw new Error("Unexpected query ref");
      },
      runMutation: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === CREATE_BOOKING_INTERNAL) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            userId: USER_ID,
            resourceIds: [RESOURCE_ID],
            customerId: CONTACT_ID,
            customerName: "Jordan Lee",
            customerEmail: "jordan@example.com",
            customerPhone: "+49123456789",
            startDateTime: SLOT_TWO_START,
            endDateTime: SLOT_TWO_START + SLOT_DURATION_MS,
            timezone: "Europe/Berlin",
          });
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === SET_BOOKING_CONCIERGE_METADATA_INTERNAL) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            bookingId: BOOKING_ID,
            sourceChannel: "phone_call",
            sourceExternalContactIdentifier: "+49123456789",
            sourceProviderCallId: "call_configured_kanzlei",
            sourceProviderConversationId: "conv_configured_kanzlei",
          });
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === RECORD_PHONE_CALL_BOOKING_MIRROR_INTERNAL) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            bookingId: BOOKING_ID,
            personEmail: "jordan@example.com",
            personPhone: "+49123456789",
            selectedSlotStart: "2026-03-18T10:00:00.000Z",
            selectedSlotEnd: "2026-03-18T10:30:00.000Z",
          });
          return {
            artifactId: "artifact_configured_kanzlei",
          };
        }
        throw new Error("Unexpected mutation ref");
      },
      runAction: async (ref, payload) => {
        expect(getFunctionName(ref as any)).toBe(PUSH_BOOKING_TO_CALENDAR);
        expect(payload).toEqual({
          bookingId: BOOKING_ID,
          organizationId: ORG_ID,
        });
        return {
          success: true,
          pushCount: 1,
        };
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
      mode: "execute",
      channel: "phone_call",
      meetingConciergeExplicitConfirmDetected: true,
      personName: "Jordan Lee",
      personEmail: "jordan@example.com",
      externalContactIdentifier: "+49123456789",
      schedulingWindowStart: "2026-03-18T08:00:00.000Z",
      schedulingWindowEnd: "2026-03-18T12:00:00.000Z",
      meetingDurationMinutes: 30,
      selectedSlotStart: "2026-03-18T10:00:00.000Z",
      providerMessageId: "call_configured_kanzlei",
      providerConversationId: "conv_configured_kanzlei",
    });

    expect(result.success).toBe(true);
    expect(result.data.resource).toEqual({
      id: RESOURCE_ID,
      name: "Arbeitsrecht Erstberatung",
      source: "org_config",
    });
    expect(result.data.booking).toEqual({
      id: String(BOOKING_ID),
      title: "Arbeitsrecht Erstberatung",
      startDateTime: "2026-03-18T10:00:00.000Z",
      endDateTime: "2026-03-18T10:30:00.000Z",
    });
    expect(result.data.connectionSnapshots).toEqual([
      {
        source: "operator",
        connectionId: "oauth_kanzlei_calendar",
        status: "resolved",
        blockedReasons: [],
        busyCount: 1,
      },
    ]);
    expect(result.data.calendarPush).toEqual({
      success: true,
      pushCount: 1,
      error: undefined,
    });
    expect(result.data.phoneSafe.outcome).toBe("booking_confirmed");
    expect(ctx.runAction).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the configured Kanzlei booking resource is invalid", async () => {
    const ctx = buildCtx({
      runQuery: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL) {
          return {
            contractVersion: "kanzlei_booking_concierge_config_v1",
            primaryResourceId: "objects_missing_resource",
            primaryResourceLabel: "Arbeitsrecht Erstberatung",
            operatorCalendarConnectionId: null,
            timezone: "Europe/Berlin",
            defaultMeetingTitle: "Arbeitsrecht Erstberatung",
            intakeLabel: "Erstberatung",
            requireConfiguredResource: true,
          };
        }
        if (functionName === SEARCH_CONTACTS) {
          return [];
        }
        if (functionName === GET_PRODUCT) {
          expect(payload).toEqual({
            productId: "objects_missing_resource",
          });
          return null;
        }
        throw new Error("Unexpected query ref");
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
      mode: "preview",
      channel: "phone_call",
      personName: "Jordan Lee",
      personEmail: "jordan@example.com",
      schedulingWindowStart: "2026-03-18T08:00:00.000Z",
      schedulingWindowEnd: "2026-03-18T12:00:00.000Z",
      meetingDurationMinutes: 30,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No bookable resource available");
    expect(result.message).toBe(
      "Configured Kanzlei booking resource objects_missing_resource is unavailable or inaccessible.",
    );
    expect(result.data.configuredResourceId).toBe("objects_missing_resource");
    expect(result.data.phoneSafe.outcome).toBe("blocked");
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("keeps phone-call preview ready when the caller only provides phone identity", async () => {
    const ctx = buildCtx({
      runQuery: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL) {
          return null;
        }
        if (functionName === SEARCH_CONTACTS) {
          expect(payload).toMatchObject({
            searchQuery: "+49123456789",
          });
          return [];
        }
        if (functionName === GET_PRODUCT) {
          return {
            _id: RESOURCE_ID,
            organizationId: ORG_ID,
            name: "Arbeitsrecht Erstberatung",
          };
        }
        if (functionName === GET_AVAILABLE_SLOTS_INTERNAL) {
          return [
            {
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
            },
          ];
        }
        throw new Error("Unexpected query ref");
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
      mode: "preview",
      channel: "phone_call",
      resourceId: String(RESOURCE_ID),
      personName: "Jordan Lee",
      externalContactIdentifier: "+49123456789",
      schedulingWindowStart: "2026-03-18T08:00:00.000Z",
      schedulingWindowEnd: "2026-03-18T12:00:00.000Z",
      meetingDurationMinutes: 30,
    });

    expect(result.success).toBe(true);
    expect(result.data.phoneSafe.outcome).toBe("preview_ready");
    expect(result.data.contact).toMatchObject({
      name: "Jordan Lee",
      email: undefined,
      phone: "+49123456789",
    });
    expect(result.data.recommendedSlot.startDateTime).toBe(
      "2026-03-18T09:00:00.000Z",
    );
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("creates phone-call bookings without email by using caller phone identity", async () => {
    const observedMutations: string[] = [];
    const ctx = buildCtx({
      runQuery: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL) {
          return null;
        }
        if (functionName === SEARCH_CONTACTS) {
          expect(payload).toMatchObject({
            searchQuery: "+49123456789",
          });
          return [];
        }
        if (functionName === GET_PRODUCT) {
          return {
            _id: RESOURCE_ID,
            organizationId: ORG_ID,
            name: "Arbeitsrecht Erstberatung",
          };
        }
        if (functionName === GET_AVAILABLE_SLOTS_INTERNAL) {
          return [
            {
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
            },
          ];
        }
        throw new Error("Unexpected query ref");
      },
      runMutation: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        observedMutations.push(functionName);
        if (functionName === CREATE_CONTACT_INTERNAL) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            userId: USER_ID,
            firstName: "Jordan",
            lastName: "Lee",
            phone: "+49123456789",
          });
          expect(payload.email).toBeUndefined();
          return CONTACT_ID;
        }
        if (functionName === CREATE_BOOKING_INTERNAL) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            userId: USER_ID,
            customerId: CONTACT_ID,
            customerName: "Jordan Lee",
            customerPhone: "+49123456789",
          });
          expect(payload.customerEmail).toBeUndefined();
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === SET_BOOKING_CONCIERGE_METADATA_INTERNAL) {
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === RECORD_PHONE_CALL_BOOKING_MIRROR_INTERNAL) {
          expect(payload).toMatchObject({
            bookingId: BOOKING_ID,
            personPhone: "+49123456789",
          });
          expect(payload.personEmail).toBeUndefined();
          return {
            artifactId: "artifact_phone_only",
          };
        }
        throw new Error("Unexpected mutation ref");
      },
      runAction: async (ref, payload) => {
        expect(getFunctionName(ref as any)).toBe(PUSH_BOOKING_TO_CALENDAR);
        expect(payload).toEqual({
          bookingId: BOOKING_ID,
          organizationId: ORG_ID,
        });
        return {
          success: true,
          pushCount: 1,
        };
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
      mode: "execute",
      channel: "phone_call",
      meetingConciergeExplicitConfirmDetected: true,
      resourceId: String(RESOURCE_ID),
      personName: "Jordan Lee",
      externalContactIdentifier: "+49123456789",
      schedulingWindowStart: "2026-03-18T08:00:00.000Z",
      schedulingWindowEnd: "2026-03-18T12:00:00.000Z",
      meetingDurationMinutes: 30,
      selectedSlotStart: "2026-03-18T09:00:00.000Z",
      providerMessageId: "call_phone_only",
      providerConversationId: "conv_phone_only",
    });

    expect(result.success).toBe(true);
    expect(result.data.phoneSafe.outcome).toBe("booking_confirmed");
    expect(result.data.contact).toMatchObject({
      id: String(CONTACT_ID),
      email: undefined,
      phone: "+49123456789",
    });
    expect(result.data.bookingArtifact).toEqual({
      id: "artifact_phone_only",
      type: "booking_phone_call_artifact",
    });
    expect(observedMutations).toEqual([
      CREATE_CONTACT_INTERNAL,
      CREATE_BOOKING_INTERNAL,
      SET_BOOKING_CONCIERGE_METADATA_INTERNAL,
      RECORD_PHONE_CALL_BOOKING_MIRROR_INTERNAL,
    ]);
  });

  it("creates phone-call bookings through native primitives and records mirror artifacts", async () => {
    const observedMutations: unknown[] = [];
    const ctx = buildCtx({
      runQuery: async (ref) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL) {
          return null;
        }
        if (functionName === SEARCH_CONTACTS) {
          return [
            {
              _id: CONTACT_ID,
              name: "Jordan Lee",
              customProperties: {
                email: "jordan@example.com",
              },
            },
          ];
        }
        if (functionName === GET_PRODUCT) {
          return {
            _id: RESOURCE_ID,
            organizationId: ORG_ID,
            name: "Executive Briefing",
          };
        }
        if (functionName === GET_AVAILABLE_SLOTS_INTERNAL) {
          return [
            {
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
            },
          ];
        }
        throw new Error("Unexpected query ref");
      },
      runMutation: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        observedMutations.push(functionName);
        if (functionName === CREATE_BOOKING_INTERNAL) {
          expect(payload.customerId).toBe(CONTACT_ID);
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === SET_BOOKING_CONCIERGE_METADATA_INTERNAL) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            bookingId: BOOKING_ID,
            sourceChannel: "phone_call",
            sourceExternalContactIdentifier: "+49123456789",
            sourceProviderCallId: "call_123",
            sourceProviderConversationId: "conv_456",
            practiceArea: "Arbeitsrecht",
            urgency: "high",
            caseSummary: "Kuendigung erhalten, braucht Erstberatung diese Woche.",
            intakeCaptureMode: "live_call",
          });
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === RECORD_PHONE_CALL_BOOKING_MIRROR_INTERNAL) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            bookingId: BOOKING_ID,
            providerId: "native_booking",
            providerSource: "native_booking_engine",
            sourceChannel: "phone_call",
            externalContactIdentifier: "+49123456789",
            practiceArea: "Arbeitsrecht",
            urgency: "high",
            caseSummary: "Kuendigung erhalten, braucht Erstberatung diese Woche.",
            intakeCaptureMode: "live_call",
          });
          return {
            artifactId: "artifact_phone_native",
          };
        }
        throw new Error("Unexpected mutation ref");
      },
      runAction: async (ref, payload) => {
        expect(getFunctionName(ref as any)).toBe(PUSH_BOOKING_TO_CALENDAR);
        expect(payload).toEqual({
          bookingId: BOOKING_ID,
          organizationId: ORG_ID,
        });
        return {
          success: true,
          pushCount: 1,
        };
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
      mode: "execute",
      channel: "phone_call",
      meetingConciergeExplicitConfirmDetected: true,
      resourceId: String(RESOURCE_ID),
      personName: "Jordan Lee",
      personEmail: "jordan@example.com",
      practiceArea: "Arbeitsrecht",
      urgency: "urgent",
      caseSummary: "Kuendigung erhalten, braucht Erstberatung diese Woche.",
      schedulingWindowStart: "2026-03-18T08:00:00.000Z",
      schedulingWindowEnd: "2026-03-18T12:00:00.000Z",
      meetingDurationMinutes: 30,
      selectedSlotStart: "2026-03-18T09:00:00.000Z",
      externalContactIdentifier: "+49123456789",
      providerMessageId: "call_123",
      providerConversationId: "conv_456",
    });

    expect(result.success).toBe(true);
    expect(result.data.bookingEngine).toEqual({
      kind: "native_booking",
    });
    expect(result.data.phoneSafe.provider).toBe("native_booking");
    expect(result.data.phoneSafe.outcome).toBe("booking_confirmed");
    expect(result.data.bookingArtifact).toEqual({
      id: "artifact_phone_native",
      type: "booking_phone_call_artifact",
    });
    expect(observedMutations).toEqual([
      CREATE_BOOKING_INTERNAL,
      SET_BOOKING_CONCIERGE_METADATA_INTERNAL,
      RECORD_PHONE_CALL_BOOKING_MIRROR_INTERNAL,
    ]);
    expect(ctx.runAction).toHaveBeenCalledTimes(1);
  });

  it("sends a firm notification email using booking fields first and artifact fallback per intake field", async () => {
    const ctx = buildCtx({
      runQuery: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL) {
          return null;
        }
        if (functionName === SEARCH_CONTACTS) {
          return [
            {
              _id: CONTACT_ID,
              name: "Jordan Lee",
              customProperties: {
                email: "jordan@example.com",
                phone: "+49123456789",
              },
            },
          ];
        }
        if (functionName === GET_PRODUCT) {
          return {
            _id: RESOURCE_ID,
            organizationId: ORG_ID,
            name: "Arbeitsrecht Erstberatung",
          };
        }
        if (functionName === GET_AVAILABLE_SLOTS_INTERNAL) {
          return [
            {
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
            },
          ];
        }
        if (functionName === GET_OBJECTS) {
          expect(payload).toEqual({
            organizationId: ORG_ID,
            type: "organization_contact",
          });
          return [
            {
              customProperties: {
                supportEmail: "kanzlei@example.com",
              },
            },
          ];
        }
        if (functionName === GET_BOOKING_INTERNAL) {
          return {
            _id: BOOKING_ID,
            organizationId: ORG_ID,
            type: "booking",
            name: "Arbeitsrecht Erstberatung - Jordan Lee",
            customProperties: {
              customerName: "Jordan Lee",
              customerEmail: "jordan@example.com",
              customerPhone: "+49123456789",
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
              timezone: "Europe/Berlin",
              urgency: "high",
            },
          };
        }
        if (functionName === GET_OBJECT_INTERNAL) {
          expect(payload).toEqual({
            objectId: "artifact_phone_notification",
          });
          return {
            _id: "artifact_phone_notification",
            organizationId: ORG_ID,
            type: "booking_phone_call_artifact",
            customProperties: {
              practiceArea: "Arbeitsrecht",
              urgency: "low",
              caseSummary:
                "Kuendigung erhalten, braucht Erstberatung diese Woche.",
            },
          };
        }
        throw new Error("Unexpected query ref");
      },
      runMutation: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === CREATE_BOOKING_INTERNAL) {
          expect(payload.customerId).toBe(CONTACT_ID);
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === SET_BOOKING_CONCIERGE_METADATA_INTERNAL) {
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === RECORD_PHONE_CALL_BOOKING_MIRROR_INTERNAL) {
          return {
            artifactId: "artifact_phone_notification",
          };
        }
        throw new Error("Unexpected mutation ref");
      },
      runAction: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === PUSH_BOOKING_TO_CALENDAR) {
          return {
            success: true,
            pushCount: 1,
          };
        }
        if (functionName === SEND_MESSAGE) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            channel: "email",
            recipientIdentifier: "kanzlei@example.com",
            subject: "New intake booked: Jordan Lee",
          });
          expect(payload.content).toContain("Practice area: Arbeitsrecht");
          expect(payload.content).toContain("Urgency: High");
          expect(payload.content).toContain(
            "Case summary: Kuendigung erhalten, braucht Erstberatung diese Woche.",
          );
          expect(payload.content).toContain("Caller phone: +49123456789");
          expect(payload.content).toContain("When:");
          return {
            success: true,
            providerMessageId: "msg_firm_notification_1",
          };
        }
        throw new Error("Unexpected action ref");
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
      mode: "execute",
      channel: "phone_call",
      meetingConciergeExplicitConfirmDetected: true,
      resourceId: String(RESOURCE_ID),
      personName: "Jordan Lee",
      personEmail: "jordan@example.com",
      practiceArea: "Arbeitsrecht",
      urgency: "urgent",
      caseSummary: "Kuendigung erhalten, braucht Erstberatung diese Woche.",
      schedulingWindowStart: "2026-03-18T08:00:00.000Z",
      schedulingWindowEnd: "2026-03-18T12:00:00.000Z",
      meetingDurationMinutes: 30,
      selectedSlotStart: "2026-03-18T09:00:00.000Z",
      externalContactIdentifier: "+49123456789",
      providerMessageId: "call_789",
      providerConversationId: "conv_789",
    });

    expect(result.success).toBe(true);
    expect((result.data as any).firmNotification).toEqual({
      attempted: true,
      success: true,
      outcome: "booking_confirmed",
      recipients: ["kanzlei@example.com"],
      sentCount: 1,
      errors: [],
      intakeResolution: {
        practiceAreaSource: "artifact",
        urgencySource: "booking",
        caseSummarySource: "artifact",
      },
    });
    expect(ctx.runAction).toHaveBeenCalledTimes(2);
  });

  it("does not block firm notification delivery when intake fields are missing everywhere", async () => {
    const ctx = buildCtx({
      runQuery: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === GET_KANZLEI_BOOKING_CONCIERGE_CONFIG_INTERNAL) {
          return null;
        }
        if (functionName === SEARCH_CONTACTS) {
          return [
            {
              _id: CONTACT_ID,
              name: "Jordan Lee",
              customProperties: {
                phone: "+49123456789",
              },
            },
          ];
        }
        if (functionName === GET_PRODUCT) {
          return {
            _id: RESOURCE_ID,
            organizationId: ORG_ID,
            name: "Arbeitsrecht Erstberatung",
          };
        }
        if (functionName === GET_AVAILABLE_SLOTS_INTERNAL) {
          return [
            {
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
            },
          ];
        }
        if (functionName === GET_OBJECTS) {
          expect(payload).toEqual({
            organizationId: ORG_ID,
            type: "organization_contact",
          });
          return [
            {
              customProperties: {
                supportEmail: "kanzlei@example.com",
              },
            },
          ];
        }
        if (functionName === GET_BOOKING_INTERNAL) {
          return {
            _id: BOOKING_ID,
            organizationId: ORG_ID,
            type: "booking",
            name: "Arbeitsrecht Erstberatung - Jordan Lee",
            customProperties: {
              customerName: "Jordan Lee",
              customerPhone: "+49123456789",
              startDateTime: SLOT_ONE_START,
              endDateTime: SLOT_ONE_START + SLOT_DURATION_MS,
              timezone: "Europe/Berlin",
            },
          };
        }
        if (functionName === GET_OBJECT_INTERNAL) {
          expect(payload).toEqual({
            objectId: "artifact_phone_no_intake",
          });
          return {
            _id: "artifact_phone_no_intake",
            organizationId: ORG_ID,
            type: "booking_phone_call_artifact",
            customProperties: {},
          };
        }
        throw new Error("Unexpected query ref");
      },
      runMutation: async (ref) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === CREATE_BOOKING_INTERNAL) {
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === SET_BOOKING_CONCIERGE_METADATA_INTERNAL) {
          return {
            bookingId: BOOKING_ID,
          };
        }
        if (functionName === RECORD_PHONE_CALL_BOOKING_MIRROR_INTERNAL) {
          return {
            artifactId: "artifact_phone_no_intake",
          };
        }
        throw new Error("Unexpected mutation ref");
      },
      runAction: async (ref, payload) => {
        const functionName = getFunctionName(ref as any);
        if (functionName === PUSH_BOOKING_TO_CALENDAR) {
          return {
            success: true,
            pushCount: 1,
          };
        }
        if (functionName === SEND_MESSAGE) {
          expect(payload).toMatchObject({
            organizationId: ORG_ID,
            channel: "email",
            recipientIdentifier: "kanzlei@example.com",
            subject: "New intake booked: Jordan Lee",
          });
          expect(payload.content).toContain("Practice area: Not captured");
          expect(payload.content).toContain("Urgency: Not captured");
          expect(payload.content).toContain("Case summary: Not captured");
          return {
            success: true,
            providerMessageId: "msg_firm_notification_2",
          };
        }
        throw new Error("Unexpected action ref");
      },
    });

    const result = await (executeManageBookings as any)._handler(ctx, {
      organizationId: ORG_ID,
      userId: USER_ID,
      action: ORG_BOOKING_CONCIERGE_TOOL_ACTION,
      mode: "execute",
      channel: "phone_call",
      meetingConciergeExplicitConfirmDetected: true,
      resourceId: String(RESOURCE_ID),
      personName: "Jordan Lee",
      externalContactIdentifier: "+49123456789",
      schedulingWindowStart: "2026-03-18T08:00:00.000Z",
      schedulingWindowEnd: "2026-03-18T12:00:00.000Z",
      meetingDurationMinutes: 30,
      selectedSlotStart: "2026-03-18T09:00:00.000Z",
      providerMessageId: "call_790",
      providerConversationId: "conv_790",
    });

    expect(result.success).toBe(true);
    expect((result.data as any).firmNotification).toEqual({
      attempted: true,
      success: true,
      outcome: "booking_confirmed",
      recipients: ["kanzlei@example.com"],
      sentCount: 1,
      errors: [],
      intakeResolution: {
        practiceAreaSource: "missing",
        urgencySource: "missing",
        caseSummarySource: "missing",
      },
    });
    expect(ctx.runAction).toHaveBeenCalledTimes(2);
  });
});
