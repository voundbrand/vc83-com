# Availability System - Implementation Plan

## Overview

This document covers the full plan for building out the Availability System, including a calendar UI, Google Workspace integration, and bi-directional calendar sync with both Google Calendar and Microsoft Calendar.

---

## Current State Assessment

### What Exists (Backend - Complete)

| Component | File | Status |
|-----------|------|--------|
| Booking Ontology | `convex/bookingOntology.ts` | Complete - CRUD, status workflow, recurring, payments |
| Availability Ontology | `convex/availabilityOntology.ts` | Complete - schedules, exceptions, blocks, slot calculation |
| Location Ontology | `convex/locationOntology.ts` | Complete - branch, venue, virtual |
| Product Ontology | `convex/productOntology.ts` | Complete - bookable types (room, staff, equipment, space, appointment, class, treatment) |
| Availability API | `convex/api/v1/availability.ts` | Complete |
| Bookings API | `convex/api/v1/bookings.ts` | Complete |

### What Exists (Frontend - Basic)

| Component | File | Status |
|-----------|------|--------|
| Booking Window | `src/components/window-content/booking-window.tsx` | 3 tabs: Bookings, Locations, Availability |
| Resource Availability | `src/components/window-content/booking-window/resource-availability.tsx` | List-based schedule editor (weekly hours only) - NO calendar view |
| Bookable Config | `src/components/window-content/products-window/bookable-config-section.tsx` | Product config for bookable types |

### What Exists (Integrations)

| Integration | Backend | Frontend | Calendar Sync |
|-------------|---------|----------|---------------|
| Microsoft 365 | Complete (OAuth, Graph API client, token refresh) | Complete (`microsoft-settings.tsx`) | NOT implemented - "coming soon" label |
| Google Workspace | OAuth flow complete (`convex/oauth/google.ts`) | NO UI component | NOT implemented |

### Key Gaps

1. **No calendar UI** - Availability tab only shows a list editor for weekly hours, not a visual calendar
2. **No link from Availability to Products** - Users need to create bookable products first but there's no navigation path
3. **Google Workspace incomplete** - OAuth works but: only basic scopes, no API client, no settings UI, marked "coming_soon"
4. **No calendar sync** - Neither Microsoft nor Google actually syncs calendar events despite having the infrastructure

---

## Architecture

### Data Flow

```
External Calendars (Google/Microsoft)
        |
        v (sync engine pulls events)
calendar_event objects (in objects table)
        |
        v (linked to resources via blocks_resource)
availabilityOntology.getAvailableSlots()
        |
        v (slot calculation considers external busy times)
Calendar UI (shows available/booked/busy/blocked)
        |
        v (user creates booking)
bookingOntology.createBooking()
        |
        v (sync engine pushes booking)
External Calendars (Google/Microsoft)
```

### Entity Relationships

```
Organization
  |-- Products (bookable: room, staff, equipment, space, appointment, class, treatment)
  |     |-- Availability (schedule, exception, block) via "has_availability" link
  |     |-- Bookings via "books_resource" link
  |     |-- External Calendar Events via "blocks_resource" link
  |     |-- Location via "located_at" link
  |
  |-- Locations (branch, venue, virtual)
  |
  |-- OAuth Connections (Google, Microsoft)
        |-- syncSettings.calendar = true/false
        |-- linked to resource(s) for calendar mapping
```

---

## Workstream 1: Availability Calendar UI

### Goal
Replace the list-based schedule editor with a proper calendar view (like cal.com) showing available slots, bookings, blocks, and external busy times in month/week/day views.

### Library Choice
Custom calendar built with `date-fns` (already in `package.json`). This avoids CSS theme conflicts with the Win95 UI and keeps the bundle light. Three views: month grid, week time-grid, day time-slots.

### New Files

| File | Purpose |
|------|---------|
| `src/components/window-content/booking-window/availability-calendar.tsx` | Main calendar component with view switching |
| `src/components/window-content/booking-window/calendar-month-view.tsx` | Month grid - days with color-coded dots |
| `src/components/window-content/booking-window/calendar-week-view.tsx` | Week time-grid - available hours, bookings, busy blocks |
| `src/components/window-content/booking-window/calendar-day-view.tsx` | Day time-slots - clickable slots for booking |
| `src/components/window-content/booking-window/calendar-toolbar.tsx` | Navigation, view switcher, resource selector |

### Modified Files

| File | Change |
|------|--------|
| `src/components/window-content/booking-window.tsx` | Availability tab renders `<AvailabilityCalendar />` instead of `<ResourceAvailability />` |
| `src/components/window-content/booking-window/resource-availability.tsx` | Add "No resources? Create one" link to products window; keep as sub-panel for schedule editing |

### Calendar Component Design

**AvailabilityCalendar** (main component):
- Resource selector dropdown (from bookable products via `productOntology.getProducts`)
- When no bookable resources exist: empty state with "Create Bookable Product" button that opens products window via `useWindowManager`
- View mode toggle: Month | Week | Day
- Date navigation: Previous, Today, Next
- Data sources:
  - `availabilityOntology.getAvailableSlots` - available time slots
  - `bookingOntology.getResourceBookings` - existing bookings
  - `availabilityOntology.getResourceAvailability` - schedules/exceptions/blocks
  - `calendarSyncOntology.getExternalEvents` - external busy times (from Workstream 3)

**Month View**:
- 7-column day grid
- Each day cell shows color-coded indicators:
  - Green dot = available slots
  - Blue dot = existing bookings
  - Red dot = blocked
  - Gray dot = external busy times
- Click day -> switches to Day view

**Week View**:
- 7-column time grid (configurable hours, default 6am-10pm)
- Available hours = green background bands
- Bookings = blue blocks with customer name
- Blocks = red/hatched overlay
- External events = gray "busy" blocks

**Day View**:
- Single column time grid with configurable increments (15/30/60 min)
- Available slots = green clickable rows
- Bookings = blue expandable blocks with details
- Click available slot -> opens booking form modal

**Products Link**:
- Calendar toolbar has "Manage Resources" button
- Opens products window filtered to bookable types: `openWindow("products", "Products", <ProductsWindow />, ...)`
- Empty state prominently shows "Create your first bookable product to start managing availability"

---

## Workstream 2: Google Workspace Integration

### Goal
Make Google Workspace a fully functional integration with Calendar sync, mirroring the Microsoft pattern.

### New Files

| File | Purpose |
|------|---------|
| `convex/oauth/googleScopes.ts` | Google OAuth scope catalog (mirrors `microsoftScopes.ts`) |
| `convex/oauth/googleClient.ts` | Google API client (mirrors `graphClient.ts`) |
| `src/components/window-content/integrations-window/google-settings.tsx` | Google settings UI (mirrors `microsoft-settings.tsx`) |

### Modified Files

| File | Change |
|------|--------|
| `convex/oauth/google.ts` | Import scopes from `googleScopes.ts`; add `refreshGoogleToken` action; add `updateGoogleSyncSettings` mutation |
| `src/components/window-content/integrations-window/index.tsx` | Change Google status `"coming_soon"` -> `"available"`; import & route to `GoogleSettings` |

### Google Scopes (googleScopes.ts)

```typescript
interface GoogleScope {
  scope: string;
  category: "core" | "calendar" | "drive" | "gmail" | "contacts";
  displayName: string;
  description: string;
  required: boolean;
}

// Core (always included):
// - openid, profile, email

// Calendar:
// - https://www.googleapis.com/auth/calendar.readonly
// - https://www.googleapis.com/auth/calendar.events

// Drive (future):
// - https://www.googleapis.com/auth/drive.readonly
```

### Google API Client (googleClient.ts)

Mirrors `graphClient.ts` pattern:
- `GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"`
- `googleRequest` internalAction - authenticated requests with token refresh
- `getCalendarEvents(connectionId, calendarId, timeMin, timeMax)` - GET `/calendars/{calendarId}/events`
- `createCalendarEvent(connectionId, calendarId, eventData)` - POST `/calendars/{calendarId}/events`
- `updateCalendarEvent(connectionId, calendarId, eventId, eventData)` - PUT `/calendars/{calendarId}/events/{eventId}`
- `deleteCalendarEvent(connectionId, calendarId, eventId)` - DELETE `/calendars/{calendarId}/events/{eventId}`
- `getCalendarList(connectionId)` - GET `/users/me/calendarList`
- Token refresh via `refreshGoogleToken` (standard Google OAuth2 refresh flow)

### Google Settings UI (google-settings.tsx)

Mirrors `microsoft-settings.tsx`:
- **Disconnected state**: Feature description, scope selector, "Connect Google Account" button
- **Connected state**: Account email, connection status, last sync time
- Sync toggles: Calendar (enabled), Drive (coming soon)
- "Link to Resource" dropdown - which bookable resource to map this calendar to
- "Sync Now" button for manual trigger
- "Disconnect" button

### Integration Window Change

In `integrations-window/index.tsx`, line 72:
```diff
- status: "coming_soon" as const,
+ status: "available" as const,
```

Add routing after Microsoft:
```typescript
if (selectedIntegration.type === "builtin" && selectedIntegration.id === "google") {
  return <GoogleSettings onBack={handleBack} />;
}
```

---

## Workstream 3: Calendar Sync Engine

### Goal
Bi-directional calendar sync - pull external events as busy times, push bookings to external calendars.

### New Files

| File | Purpose |
|------|---------|
| `convex/calendarSyncOntology.ts` | Core sync engine - queries, mutations, sync actions |

### Modified Files

| File | Change |
|------|--------|
| `convex/crons.ts` | Add 15-minute calendar sync cron job |
| `convex/availabilityOntology.ts` | Account for external busy times in slot calculation |
| `convex/bookingOntology.ts` | Push confirmed bookings to external calendars |

### External Event Data Model

Stored in the `objects` table (existing ontology pattern):
```typescript
{
  type: "calendar_event",
  subtype: "external_google" | "external_microsoft",
  name: "Meeting with John",          // event title
  status: "active" | "deleted",
  organizationId: "...",
  customProperties: {
    externalEventId: "abc123",         // provider's unique event ID
    connectionId: "...",               // oauthConnections ID
    calendarId: "primary",             // which calendar on provider
    startDateTime: 1706000000000,      // epoch ms
    endDateTime: 1706003600000,
    isAllDay: false,
    isBusy: true,                      // false = free/tentative
    organizer: "john@example.com",
    location: "Zoom",
    syncDirection: "inbound",          // inbound | outbound | bidirectional
    lastSyncedAt: 1706000000000,
    providerUpdatedAt: "2024-01-23T10:00:00Z",
  }
}
```

Object links:
- `blocks_resource`: calendar_event -> resource (maps external event as busy time for a bookable resource)
- `synced_from_booking`: calendar_event -> booking (for outbound: links pushed event back to its booking)

### Sync Operations

**Inbound Sync (External -> Internal):**
1. Cron runs every 15 minutes
2. Queries all `oauthConnections` where `syncSettings.calendar === true`
3. For each connection, calls provider-specific sync action:
   - `syncFromGoogle(connectionId)` - Uses Google Calendar API
   - `syncFromMicrosoft(connectionId)` - Uses Microsoft Graph API
4. Fetches events in rolling 30-day window (past 7 days + future 23 days)
5. Upserts into `objects` table (match on `externalEventId`)
6. Deletes events no longer present in provider response
7. Updates sync status on the connection

**Outbound Sync (Internal -> External):**
1. When a booking is confirmed (`bookingOntology.confirmBooking`):
   - Check if the booked resource has a linked calendar connection
   - If yes, push booking as calendar event via provider API
   - Store returned `externalEventId` in booking's `customProperties`
2. When a booking is cancelled/rescheduled:
   - Update or delete the external calendar event
3. This is event-driven (on booking status change), not cron-based

**Conflict Resolution:**
- External events are always treated as "busy blocks" - they reduce availability but don't create bookings
- If an external event overlaps with an available slot, that slot is no longer available
- Upsert by `externalEventId` prevents duplicates
- Deleted external events are soft-deleted (status: "deleted") for audit trail

### Availability Integration

In `convex/availabilityOntology.ts`, modify `getAvailableSlots`:
```
Current flow: schedules + exceptions + blocks + existing bookings -> available slots

New flow: schedules + exceptions + blocks + existing bookings + external busy events -> available slots
```

Add helper: `getExternalBusyTimes(resourceId, startDate, endDate)` that queries `calendar_event` objects linked to the resource via `blocks_resource` link.

### Cron Job

In `convex/crons.ts`:
```typescript
crons.interval(
  "sync-external-calendars",
  { minutes: 15 },
  internal.calendarSyncOntology.syncAllConnections
);
```

---

## Workstream 4: Microsoft Calendar Sync (Activate Existing)

### Goal
Enable the "coming soon" Calendar sync in Microsoft settings.

### Modified Files

| File | Change |
|------|--------|
| `src/components/window-content/integrations-window/microsoft-settings.tsx` | Enable Calendar checkbox; add resource linking; add sync status |
| `convex/oauth/graphClient.ts` | Enhance `getCalendarEvents` with pagination; add `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent`, `getCalendarList` |

### Microsoft Settings UI Changes

- Remove "coming soon" label from Calendar sync checkbox
- Enable the checkbox - toggles `syncSettings.calendar`
- Add "Link to Resource" dropdown (same as Google settings)
- Add sync status display: last sync time, event count, any errors
- Add "Sync Now" button

### Graph Client Enhancements

- `getCalendarEvents(connectionId, startDateTime, endDateTime)` - GET `/me/calendarView?startDateTime=...&endDateTime=...`
  - Support pagination via `$top` and `nextLink`
  - Return normalized event objects
- `createCalendarEvent(connectionId, eventData)` - POST `/me/events`
- `updateCalendarEvent(connectionId, eventId, eventData)` - PATCH `/me/events/{eventId}`
- `deleteCalendarEvent(connectionId, eventId)` - DELETE `/me/events/{eventId}`
- `getCalendarList(connectionId)` - GET `/me/calendars`

---

## Implementation Phases

### Phase 1 (Parallel)
- **Workstream 1**: Calendar UI components (uses existing backend, no backend changes)
- **Workstream 2 Backend**: Google scopes, API client, token refresh

### Phase 2 (Depends on Phase 1)
- **Workstream 2 Frontend**: Google settings UI, change status to "available"
- **Workstream 3**: Calendar sync engine backend (ontology, cron, sync actions)

### Phase 3 (Depends on Phase 2)
- **Workstream 4**: Enable Microsoft calendar sync UI
- **Workstream 3 Integration**: Modify `availabilityOntology` to account for external events
- Wire outbound push on booking confirmation

### Phase 4 (Polish)
- Error handling and retry logic for failed syncs
- Exponential backoff for API rate limits
- Sync conflict edge cases
- Loading states, error states, sync progress indicators
- Token refresh race condition handling

---

## Technical Considerations

### Token Refresh
- Google: Standard OAuth2 refresh token flow via `https://oauth2.googleapis.com/token`
- Microsoft: Already implemented in `convex/oauth/microsoft.ts` - `refreshMicrosoftToken`
- Both: Check `tokenExpiresAt` before every API call; if expired, refresh first
- Race condition mitigation: refresh should be idempotent (if token is already fresh, skip)

### Sync Window
- Only sync events in a rolling 30-day window (past 7 days + future 23 days)
- Prevents excessive data storage and API calls
- Configurable per organization in future

### Rate Limits
- Google Calendar API: 1,000,000 queries/day per project, but per-user quotas exist
- Microsoft Graph: 10,000 requests per 10 minutes per app per tenant
- Implement exponential backoff on 429 responses
- Batch where possible

### Convex Patterns
- Actions (external API calls) cannot query DB directly - use `ctx.runQuery` / `ctx.runMutation`
- Scheduled functions use `crons.ts` for recurring jobs
- Real-time updates: Convex queries auto-update UI when data changes (no polling needed)
- External events in `objects` table means the calendar UI gets real-time updates via existing Convex subscriptions

### Security
- All tokens encrypted at rest via `convex/oauth/encryption.ts`
- OAuth state parameter for CSRF protection (already implemented)
- Permission checks: `manage_integrations` permission required for organizational connections
- Scopes are minimal: only request Calendar read/write, not full account access

---

## Environment Variables Required

### Google (verify these exist in Convex environment)
- `GOOGLE_OAUTH_CLIENT_ID` - Google Cloud Console OAuth client ID
- `GOOGLE_OAUTH_CLIENT_SECRET` - Google Cloud Console OAuth client secret
- `NEXT_PUBLIC_APP_URL` - App URL for OAuth redirect (already used)

### Microsoft (already configured)
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`

### Google Cloud Console Setup Required
1. Enable Google Calendar API in the Google Cloud project
2. Add `https://{APP_URL}/api/oauth/google/callback` as authorized redirect URI
3. Configure OAuth consent screen with Calendar scopes
4. If using organizational accounts: may need domain-wide delegation or admin consent

---

## Testing Plan

1. **Calendar UI**: Manually verify month/week/day views render correctly with mock availability data
2. **Google OAuth**: Test connect/disconnect flow end-to-end
3. **Google Calendar Sync**: Connect a test Google account, verify events appear in the calendar UI
4. **Microsoft Calendar Sync**: Enable calendar sync, verify events appear
5. **Outbound Push**: Create a booking, verify it appears in the linked external calendar
6. **Conflict Detection**: Create an external event overlapping an available slot, verify the slot becomes unavailable
7. **Token Refresh**: Wait for token expiry, verify sync still works after automatic refresh
8. **Cron Job**: Verify the 15-minute sync runs and updates events
