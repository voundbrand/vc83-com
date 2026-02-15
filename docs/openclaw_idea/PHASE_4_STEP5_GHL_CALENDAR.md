# Phase 4 Step 5: Calendar & Appointments Sync

## Goal

The agent can book, reschedule, and cancel appointments via GHL's Calendar API. Appointments created in GHL sync into our system. The agent is calendar-aware — it knows what slots are available and can schedule on behalf of customers.

## Depends On

- Phase 4 Step 1 (OAuth Foundation) — authenticated GHL API access
- Phase 4 Step 2 (Contact Sync) — contacts linked with `ghlContactId`

## GHL Calendar API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /calendars/` | GET | List calendars for a location |
| `GET /calendars/{id}/free-slots` | GET | Get available time slots |
| `GET /calendars/events` | GET | List events/appointments |
| `GET /calendars/events/{id}` | GET | Get event details |
| `POST /calendars/events` | POST | Create appointment |
| `PUT /calendars/events/{id}` | PUT | Update appointment |
| `DELETE /calendars/events/{id}` | DELETE | Cancel appointment |

### GHL Appointment Object

```json
{
  "id": "evt_abc123",
  "calendarId": "cal_xyz",
  "locationId": "loc_456",
  "contactId": "contact_789",
  "title": "Consultation with John",
  "status": "confirmed",
  "startTime": "2026-02-20T10:00:00+01:00",
  "endTime": "2026-02-20T10:30:00+01:00",
  "assignedUserId": "user_001",
  "address": "...",
  "notes": "..."
}
```

## Architecture

```
┌───────────────────────────────────────────────────────┐
│              INBOUND (GHL → Our System)               │
├───────────────────────────────────────────────────────┤
│                                                       │
│  GHL Webhook Events:                                  │
│    ├── AppointmentCreate  → store in ontology         │
│    ├── AppointmentUpdate  → update fields             │
│    └── AppointmentDelete  → mark cancelled            │
│                                                       │
│  Agent gets notified of new/changed appointments      │
│  so it can send confirmations or follow-ups           │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│             OUTBOUND (Agent → GHL)                    │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Agent tools (Step 6):                                │
│    ├── check_availability → GET .../free-slots        │
│    ├── book_appointment   → POST /calendars/events    │
│    ├── reschedule         → PUT /calendars/events/{id}│
│    └── cancel_appointment → DELETE .../events/{id}    │
└───────────────────────────────────────────────────────┘
```

## Implementation

### 1. Calendar Cache

**File:** `convex/integrations/ghlCalendar.ts` (new)

```typescript
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

/**
 * Fetch and cache GHL calendars for an org.
 */
export const syncGhlCalendars = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    const conn = await ctx.runQuery(
      internal.integrations.ghl.getGhlConnectionInternal,
      { organizationId: args.organizationId }
    );
    const locationId = (conn?.customProperties as any)?.locationId;

    const res = await fetch(
      `${GHL_API_BASE}/calendars/?locationId=${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
      }
    );

    if (!res.ok) throw new Error(`Failed to fetch calendars: ${await res.text()}`);

    const data = await res.json();
    const calendars = data.calendars || [];

    await ctx.runMutation(
      internal.integrations.ghlCalendar.storeCalendarCache,
      { organizationId: args.organizationId, calendars }
    );

    return { calendars: calendars.length };
  },
});

export const storeCalendarCache = internalMutation({
  args: { organizationId: v.id("organizations"), calendars: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ghl_calendar_cache")
      )
      .first();

    const data = {
      organizationId: args.organizationId,
      type: "ghl_calendar_cache" as any,
      name: "GHL Calendars",
      status: "active" as const,
      customProperties: { calendars: args.calendars, lastSynced: Date.now() },
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("objects", { ...data, createdAt: Date.now() });
    }
  },
});

export const getGhlCalendars = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const cache = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ghl_calendar_cache")
      )
      .first();

    return (cache?.customProperties as any)?.calendars || [];
  },
});
```

### 2. Availability Check

```typescript
/**
 * Check available slots for a GHL calendar.
 * Used by agent tools to offer booking options.
 */
export const checkGhlAvailability = internalAction({
  args: {
    organizationId: v.id("organizations"),
    calendarId: v.string(),
    startDate: v.string(), // ISO date
    endDate: v.string(),   // ISO date
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    const params = new URLSearchParams({
      startDate: args.startDate,
      endDate: args.endDate,
      timezone: args.timezone || "Europe/Berlin",
    });

    const res = await fetch(
      `${GHL_API_BASE}/calendars/${args.calendarId}/free-slots?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
      }
    );

    if (!res.ok) throw new Error(`Failed to check availability: ${await res.text()}`);

    const data = await res.json();
    return data; // { slots: [{ startTime, endTime }, ...] }
  },
});
```

### 3. Appointment CRUD

```typescript
/**
 * Create an appointment in GHL.
 */
export const createGhlAppointment = internalAction({
  args: {
    organizationId: v.id("organizations"),
    calendarId: v.string(),
    contactId: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    const conn = await ctx.runQuery(
      internal.integrations.ghl.getGhlConnectionInternal,
      { organizationId: args.organizationId }
    );
    const locationId = (conn?.customProperties as any)?.locationId;

    const res = await fetch(`${GHL_API_BASE}/calendars/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        calendarId: args.calendarId,
        locationId,
        contactId: args.contactId,
        startTime: args.startTime,
        endTime: args.endTime,
        title: args.title || "Appointment",
        notes: args.notes || "",
        timezone: args.timezone || "Europe/Berlin",
      }),
    });

    if (!res.ok) throw new Error(`Failed to create appointment: ${await res.text()}`);

    const result = await res.json();

    // Store in our ontology
    await ctx.runMutation(
      internal.integrations.ghlCalendar.storeAppointment,
      {
        organizationId: args.organizationId,
        ghlEvent: result,
      }
    );

    return { success: true, eventId: result.id };
  },
});

/**
 * Reschedule an appointment in GHL.
 */
export const rescheduleGhlAppointment = internalAction({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    const res = await fetch(`${GHL_API_BASE}/calendars/events/${args.eventId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        startTime: args.startTime,
        endTime: args.endTime,
      }),
    });

    if (!res.ok) throw new Error(`Failed to reschedule: ${await res.text()}`);
    return { success: true };
  },
});

/**
 * Cancel an appointment in GHL.
 */
export const cancelGhlAppointment = internalAction({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    const res = await fetch(`${GHL_API_BASE}/calendars/events/${args.eventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: "2021-07-28",
      },
    });

    if (!res.ok) throw new Error(`Failed to cancel appointment: ${await res.text()}`);
    return { success: true };
  },
});
```

### 4. Inbound Webhook Events

```typescript
/**
 * Process GHL appointment webhook events.
 */
export const processGhlAppointmentEvent = internalAction({
  args: {
    organizationId: v.id("organizations"),
    event: v.any(),
  },
  handler: async (ctx, args) => {
    const { event } = args;

    switch (event.type) {
      case "AppointmentCreate":
        return await ctx.runMutation(
          internal.integrations.ghlCalendar.storeAppointment,
          { organizationId: args.organizationId, ghlEvent: event }
        );

      case "AppointmentUpdate":
        return await ctx.runMutation(
          internal.integrations.ghlCalendar.updateAppointment,
          { organizationId: args.organizationId, ghlEvent: event }
        );

      case "AppointmentDelete":
        return await ctx.runMutation(
          internal.integrations.ghlCalendar.cancelAppointmentLocal,
          { organizationId: args.organizationId, ghlEventId: event.id }
        );

      default:
        return { status: "skipped" };
    }
  },
});

export const storeAppointment = internalMutation({
  args: { organizationId: v.id("organizations"), ghlEvent: v.any() },
  handler: async (ctx, args) => {
    const { ghlEvent } = args;

    const existing = await findAppointmentByGhlId(ctx, args.organizationId, ghlEvent.id);
    if (existing) {
      return await updateAppointmentFields(ctx, existing._id, ghlEvent);
    }

    const apptId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "appointment",
      name: ghlEvent.title || "Appointment",
      status: ghlEvent.status === "cancelled" ? "inactive" : "active",
      customProperties: {
        startTime: ghlEvent.startTime,
        endTime: ghlEvent.endTime,
        calendarId: ghlEvent.calendarId,
        ghlEventId: ghlEvent.id,
        ghlContactId: ghlEvent.contactId,
        appointmentStatus: ghlEvent.status || "confirmed",
        notes: ghlEvent.notes,
        assignedTo: ghlEvent.assignedUserId,
        lastGhlSync: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { status: "created", appointmentId: apptId };
  },
});

export const updateAppointment = internalMutation({
  args: { organizationId: v.id("organizations"), ghlEvent: v.any() },
  handler: async (ctx, args) => {
    const existing = await findAppointmentByGhlId(ctx, args.organizationId, args.ghlEvent.id);
    if (!existing) {
      return await ctx.runMutation(
        internal.integrations.ghlCalendar.storeAppointment, args
      );
    }
    return await updateAppointmentFields(ctx, existing._id, args.ghlEvent);
  },
});

export const cancelAppointmentLocal = internalMutation({
  args: { organizationId: v.id("organizations"), ghlEventId: v.string() },
  handler: async (ctx, args) => {
    const existing = await findAppointmentByGhlId(ctx, args.organizationId, args.ghlEventId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "inactive",
        customProperties: {
          ...(existing.customProperties as Record<string, unknown>),
          appointmentStatus: "cancelled",
          cancelledAt: Date.now(),
        },
        updatedAt: Date.now(),
      });
    }
    return { status: "cancelled" };
  },
});

// --- Helpers ---

async function findAppointmentByGhlId(ctx: any, orgId: any, ghlEventId: string) {
  const appts = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", orgId).eq("type", "appointment")
    )
    .collect();

  return appts.find(
    (a: any) => (a.customProperties as any)?.ghlEventId === ghlEventId
  ) || null;
}

async function updateAppointmentFields(ctx: any, apptId: any, ghlEvent: any) {
  const existing = await ctx.db.get(apptId);
  if (!existing) return { status: "not_found" };

  await ctx.db.patch(apptId, {
    name: ghlEvent.title || existing.name,
    status: ghlEvent.status === "cancelled" ? "inactive" : "active",
    customProperties: {
      ...(existing.customProperties as Record<string, unknown>),
      startTime: ghlEvent.startTime || (existing.customProperties as any)?.startTime,
      endTime: ghlEvent.endTime || (existing.customProperties as any)?.endTime,
      appointmentStatus: ghlEvent.status || (existing.customProperties as any)?.appointmentStatus,
      notes: ghlEvent.notes ?? (existing.customProperties as any)?.notes,
      lastGhlSync: Date.now(),
    },
    updatedAt: Date.now(),
  });

  return { status: "updated", appointmentId: apptId };
}
```

## Files Summary

| File | Change | Risk |
|------|--------|------|
| `convex/integrations/ghlCalendar.ts` | **New** — calendar cache, availability, appointment CRUD, webhooks | Medium |

## Verification

1. **Calendar sync**: `syncGhlCalendars` → calendars cached in ontology
2. **Availability check**: Query free slots for a date range → returns available times
3. **Book appointment**: Agent creates appointment → appears in GHL calendar
4. **Reschedule**: Agent moves appointment → GHL event updates
5. **Cancel**: Agent cancels → GHL event deleted, our record marked inactive
6. **Inbound create**: Appointment booked in GHL → appears in our system
7. **Inbound update**: Appointment rescheduled in GHL → our times update
8. **Inbound cancel**: Appointment cancelled in GHL → our record marked cancelled
