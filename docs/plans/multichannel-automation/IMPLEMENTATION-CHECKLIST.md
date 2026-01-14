# Implementation Checklist

A phase-by-phase checklist for building the Multichannel Automation System.

---

## Phase 0: Connections Infrastructure (Week 0)

**Goal**: Allow organizations to configure their own Resend and Infobip API keys

> See [CONNECTIONS.md](./CONNECTIONS.md) for detailed implementation guide.

### Schema Updates

- [ ] Update `convex/schemas/coreSchemas.ts`:
  - [ ] Add `"resend"` and `"infobip"` to `oauthConnections.provider` union
  - [ ] Add `connectionType: v.optional(v.union(v.literal("oauth"), v.literal("api_key")))`
- [ ] Run `npx convex dev` to apply schema changes

### Backend - Service Connections

- [ ] Create `convex/connections/serviceConnections.ts`:
  - [ ] `SERVICE_PROVIDERS` config object
  - [ ] `getServiceConnection` - internal query
  - [ ] `listServiceConnections` - query (returns masked data)
  - [ ] `configureServiceConnection` - mutation (encrypts API key)
  - [ ] `deleteServiceConnection` - mutation
  - [ ] `testServiceConnection` - mutation
  - [ ] `testConnectionAction` - internal action (HTTP requests)
  - [ ] `updateConnectionStatus` - internal mutation

### Backend - Credential Retrieval

- [ ] Create `convex/connections/getCredentials.ts`:
  - [ ] `getResendCredentials` - internal action (org → env fallback)
  - [ ] `getInfobipCredentials` - internal action (org → env fallback)

### UI Components

- [ ] Update `src/components/window-content/integrations-window/index.tsx`:
  - [ ] Add Resend to `BUILT_IN_INTEGRATIONS`
  - [ ] Add Infobip to `BUILT_IN_INTEGRATIONS`
- [ ] Create `src/components/window-content/integrations-window/service-connection-modal.tsx`:
  - [ ] API key input with show/hide toggle
  - [ ] Provider-specific fields (baseUrl, senderId, etc.)
  - [ ] Test connection button
  - [ ] Success/error states
  - [ ] Disconnect functionality

### Encryption Verification

- [ ] Verify `OAUTH_ENCRYPTION_KEY` environment variable exists
- [ ] Test encryption/decryption flow with API keys
- [ ] Verify API keys never returned unencrypted to client

### Licensing (Optional)

- [ ] Add `emailAutomationEnabled` feature flag to tier configs
- [ ] Add `smsAutomationEnabled` feature flag to tier configs
- [ ] Enforce feature checks in `configureServiceConnection`

### Testing - Phase 0

- [ ] Configure Resend connection via UI
- [ ] Verify API key is encrypted in database
- [ ] Test connection works (sends test email)
- [ ] Configure Infobip connection via UI
- [ ] Test fallback to environment variables when no org connection
- [ ] Run `npm run typecheck && npm run lint`

---

## Phase 1: Core Engine (Week 1-2)

**Goal**: Working email automation triggered by bookings

### Database

- [ ] Create `convex/schemas/messageQueueSchemas.ts`
- [ ] Add `messageQueue` table to `convex/schema.ts`
- [ ] Run `npx convex dev` to apply schema changes
- [ ] Verify table created in Convex dashboard

### Message Queue

- [ ] Create `convex/messageQueue.ts`
  - [ ] `scheduleMessage` - internal mutation
  - [ ] `getPendingMessages` - internal query
  - [ ] `markAsSending` - internal mutation
  - [ ] `markAsSent` - internal mutation
  - [ ] `markAsFailed` - internal mutation (with retry logic)
  - [ ] `cancelByBooking` - internal mutation

### Delivery Router

- [ ] Create `convex/messageDelivery.ts`
  - [ ] `deliverMessage` - routes to correct channel
  - [ ] `sendEmail` - reuse existing Resend integration
  - [ ] Placeholder `sendSms` - returns mock success for now
  - [ ] Placeholder `sendWhatsApp` - returns mock success for now

### Cron Processor

- [ ] Create `convex/automationEngine.ts`
  - [ ] `processScheduledMessages` - internal action
  - [ ] Batch processing (50 messages at a time)
  - [ ] Error handling and logging
- [ ] Add 5-minute cron to `convex/crons.ts`:
  ```typescript
  crons.interval(
    "Process scheduled messages",
    { minutes: 5 },
    internal.automationEngine.processScheduledMessages
  );
  ```

### Sequence Enrollment

- [ ] Create `convex/automationSequences.ts`
  - [ ] `enrollBookingInSequences` - internal mutation
  - [ ] `getSequencesByTrigger` - internal query
  - [ ] Template variable resolution helper
  - [ ] Channel selection logic (with "preferred" support)

### Booking Integration

- [ ] Modify `convex/bookingOntology.ts`
  - [ ] After `createBooking` → call `enrollBookingInSequences`
  - [ ] After `confirmBooking` → call with "booking_confirmed"
  - [ ] Use `ctx.scheduler.runAfter(0, ...)` for async trigger

### Testing - Phase 1

- [ ] Create a test automation sequence (objects table):
  - Trigger: `booking_confirmed`
  - 1 step: email, +1 minute offset (for quick testing)
- [ ] Create a test message template (objects table)
- [ ] Create a test booking
- [ ] Confirm booking
- [ ] Verify message appears in `messageQueue` with status "scheduled"
- [ ] Wait 5 minutes
- [ ] Verify message status changed to "sent"
- [ ] Run `npm run typecheck && npm run lint`

---

## Phase 2: Full Sequences (Week 3)

**Goal**: All Gerrit sequences working with email

### Email Templates

Create all templates in objects table (type="message_template"):

**Segelschule:**
- [ ] `segel_vorfreude_7d` - "Das erwartet dich am Haff"
- [ ] `segel_packliste_3d` - "Deine Packliste fürs Haff"
- [ ] `segel_morgen_1d` - "Morgen geht's los!"
- [ ] `segel_checkin_d2` - "Wie läuft's auf dem Wasser?"
- [ ] `segel_zertifikat` - "Du hast es geschafft!"
- [ ] `segel_review` - "Wie war dein Erlebnis?"
- [ ] `segel_upsell_see` - "Bereit für SBF See?"
- [ ] `segel_empfehlung` - "Kennst du jemanden?"
- [ ] `segel_jahrestag` - "Ein Jahr – Erinnerst du dich?"

**Haff Erleben:**
- [ ] `haus_vorfreude_7d` - "Das Haff wartet auf dich"
- [ ] `haus_anreise_3d` - "Anreise-Infos + Walking"
- [ ] `haus_morgen_1d` - "Morgen bist du hier!"
- [ ] `haus_checkin_d2` - "Alles okay bei euch?"
- [ ] `haus_aktivitaeten` - "Lust auf Segeln?"
- [ ] `haus_review` - "Danke für euren Besuch!"
- [ ] `haus_3monate` - "Das Haff vermisst dich"
- [ ] `haus_jahrestag` - "Letztes Jahr um diese Zeit..."

### Sequences

Create sequences in objects table (type="automation_sequence"):

**Segelschule:**
- [ ] Segelschule Vorher (trigger: booking_confirmed, subtype: class_enrollment)
- [ ] Segelschule Während (trigger: booking_checked_in)
- [ ] Segelschule Nachher (trigger: booking_completed)

**Haff Erleben:**
- [ ] Haus Vorher (trigger: booking_confirmed, subtype: reservation)
- [ ] Haus Während (trigger: booking_checked_in)
- [ ] Haus Nachher (trigger: booking_completed)

### Booking Status Triggers

- [ ] Hook `confirmBooking` → trigger "booking_confirmed"
- [ ] Hook `checkInBooking` → trigger "booking_checked_in"
- [ ] Hook `completeBooking` → trigger "booking_completed"
- [ ] Verify each trigger fires enrollment correctly

### Communication Logging

- [ ] Integrate with existing `communicationTracking.ts`
- [ ] Log all sent messages with channel type
- [ ] Update contact's `lastCommunication` timestamp
- [ ] Log to contact's communication history

### Edge Cases

- [ ] Handle booking cancellation → cancel all pending messages
- [ ] Handle event in the past → don't schedule past messages
- [ ] Handle missing contact email → skip email channel
- [ ] Handle minDaysOut condition → skip if too close to event
- [ ] Run `npm run typecheck && npm run lint`

### Testing - Phase 2

- [ ] Create booking 10 days out
- [ ] Confirm booking
- [ ] Verify 3 "Vorher" messages scheduled (7d, 3d, 1d)
- [ ] Check-in booking
- [ ] Verify "Während" message scheduled
- [ ] Complete booking
- [ ] Verify 5 "Nachher" messages scheduled
- [ ] Cancel a booking
- [ ] Verify all scheduled messages cancelled

---

## Phase 3: SMS Channel (Week 4)

**Goal**: Add SMS delivery via Infobip

### Infobip Setup

- [ ] Create Infobip account (if not done)
- [ ] Get API key from portal
- [ ] Note your base URL
- [ ] Add environment variables to Convex:
  - [ ] `INFOBIP_API_KEY`
  - [ ] `INFOBIP_BASE_URL`
  - [ ] `INFOBIP_SMS_SENDER_ID`
- [ ] Register sender ID for Germany (if required)

### SMS Delivery

- [ ] Implement `sendSms` in `messageDelivery.ts`
- [ ] Handle E.164 phone format conversion
- [ ] Parse Infobip response correctly
- [ ] Handle error responses
- [ ] Add retry logic for transient failures

### Contact Preferences

- [ ] Add `channelPreference` to crm_contact customProperties
- [ ] Add `smsOptIn` boolean field
- [ ] Update `enrollBookingInSequences` to check preferences
- [ ] Update delivery router to respect preference
- [ ] Implement fallback: email if no phone/opt-out

### SMS Templates

Create SMS versions (160 char max):
- [ ] `segel_morgen_1d_sms`
- [ ] `haus_morgen_1d_sms`

### Update Sequences

- [ ] Update "morgen" steps to use SMS as secondary channel
- [ ] Or use "preferred" channel setting

### Testing - Phase 3

- [ ] Send test SMS to your phone number
- [ ] Verify delivery status in Infobip portal
- [ ] Test with invalid phone number → verify error handling
- [ ] Test fallback to email when no phone
- [ ] Test opt-out respected
- [ ] Run `npm run typecheck && npm run lint`

---

## Phase 4: WhatsApp Channel (Week 5)

**Goal**: Add WhatsApp Business API via Infobip

### WhatsApp Setup

- [ ] Connect WhatsApp Business Account in Infobip portal
- [ ] Get WhatsApp phone number
- [ ] Add environment variable:
  - [ ] `INFOBIP_WHATSAPP_NUMBER`

### Template Registration

Register templates with Meta (via Infobip):
- [ ] `haff_reminder` (utility) - general reminder
- [ ] `haff_review_request` (utility) - review request

**Note**: Template approval takes 24-72 hours. Submit early!

- [ ] Wait for template approval
- [ ] Test templates in Infobip portal

### WhatsApp Delivery

- [ ] Implement `sendWhatsApp` in `messageDelivery.ts`
- [ ] Handle template name and parameters
- [ ] Parse Infobip response
- [ ] Handle error responses

### Opt-In Tracking

- [ ] Add `whatsappOptIn` to crm_contact customProperties
- [ ] Update enrollment to check WhatsApp opt-in
- [ ] Implement fallback chain: WhatsApp → SMS → Email
- [ ] Log opt-in status in communication log

### Testing - Phase 4

- [ ] Send test WhatsApp to your phone
- [ ] Verify template renders correctly with variables
- [ ] Test with unapproved template → verify error handling
- [ ] Test opt-in check (opted-out contact)
- [ ] Test fallback to SMS/email
- [ ] Run `npm run typecheck && npm run lint`

---

## Phase 5: Admin UI & Polish (Week 6)

**Goal**: Configuration UI and monitoring

### Sequence Builder UI

- [ ] Create page: `/admin/automation/sequences`
- [ ] List all sequences for organization
- [ ] Create new sequence form
- [ ] Edit sequence form
- [ ] Add/remove/reorder steps
- [ ] Enable/disable toggle
- [ ] Delete sequence (with confirmation)

### Template Editor UI

- [ ] Create page: `/admin/automation/templates`
- [ ] List templates by channel (tabs: Email, SMS, WhatsApp)
- [ ] Create new template form
- [ ] Edit template with rich text (email HTML)
- [ ] Variable picker/inserter
- [ ] Preview with sample data
- [ ] Test send to yourself

### Message Queue Dashboard

- [ ] Create page: `/admin/automation/queue`
- [ ] List scheduled messages (upcoming)
- [ ] Filter by status, booking, contact, channel
- [ ] Cancel message action
- [ ] View message details (template, recipient, scheduled time)
- [ ] View delivery errors for failed messages
- [ ] Retry failed message action

### Analytics

- [ ] Create page: `/admin/automation/analytics`
- [ ] Messages sent by channel (chart)
- [ ] Messages sent by day (chart)
- [ ] Delivery success rate
- [ ] Sequence completion rate
- [ ] Failed messages table

### Polish

- [ ] Add loading states
- [ ] Add error handling/toasts
- [ ] Add empty states
- [ ] Mobile responsive
- [ ] Run `npm run typecheck && npm run lint`
- [ ] Run `npm run build`

### Testing - Phase 5

- [ ] End-to-end: Create booking in UI → messages sent
- [ ] Test each channel delivery
- [ ] Test sequence builder UI
- [ ] Test template editor UI
- [ ] Test queue dashboard
- [ ] Full regression test

---

## Launch Checklist

### Content

- [ ] All German email templates reviewed by native speaker
- [ ] SMS templates under 160 characters
- [ ] WhatsApp templates approved by Meta

### Technical

- [ ] Cron job running in production
- [ ] Environment variables set in production
- [ ] Error logging/alerting configured
- [ ] Rate limiting verified

### Business

- [ ] Infobip account funded
- [ ] WhatsApp Business verified
- [ ] GDPR consent flow documented
- [ ] Opt-out mechanism working

### Documentation

- [ ] User guide for admin UI
- [ ] Troubleshooting guide
- [ ] Template variable reference

---

## Post-Launch Monitoring

### Daily

- [ ] Check cron job execution
- [ ] Review failed messages
- [ ] Monitor queue depth

### Weekly

- [ ] Review delivery rates
- [ ] Check Infobip balance
- [ ] Review any customer feedback

### Monthly

- [ ] Analyze sequence performance
- [ ] Review costs
- [ ] Optimize underperforming templates
