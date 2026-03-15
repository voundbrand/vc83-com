# Prompt 1: Deploy Lead Capture Modal with Env Vars

The lead capture modal for the one-of-one landing page has been fully built. All code is in place — it just needs env vars configured and deployment.

## What's already built

### New files:
- `apps/one-of-one-landing/components/lead-capture-modal.tsx` — 3-state modal (Form → SMS OTP → Clara calls outbound)
- `apps/one-of-one-landing/app/api/lead-capture/request-code/route.ts` — validates form + sends SMS OTP via Twilio Verify + IP rate limiting
- `apps/one-of-one-landing/app/api/lead-capture/verify/route.ts` — verifies OTP → creates CRM contact → adds to pipeline → sends emails → triggers ElevenLabs outbound call
- `apps/one-of-one-landing/lib/lead-capture.ts` — shared utils (rate limiter, phone masking, validation, email templates)
- `apps/one-of-one-landing/scripts/seed-seven-agents-pipeline.ts` — creates "Seven Agents" pipeline with 6 stages

### Modified files:
- `apps/one-of-one-landing/content/landing.en.json` — +33 i18n keys (EN)
- `apps/one-of-one-landing/content/landing.de.json` — +33 i18n keys (DE)
- `apps/one-of-one-landing/app/page.tsx` — swapped `LandingDemoCallModal` → `LeadCaptureModal`
- `apps/one-of-one-landing/app/globals.css` — added modal styling (language toggle buttons, calling pulse animation)
- `convex/channels/router.ts` — added `insertObjectLinkInternal` mutation

### Dependencies added:
- `twilio` v5.13.0 in `apps/one-of-one-landing/package.json`

## What needs to happen now

### 1. Twilio setup
- Create a Twilio account (or use existing one)
- Buy an SMS-capable phone number (~$1/mo)
- Create a Verify Service in Twilio console → Verify → Services
- Get: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`

### 2. Resend domain verification
- Verify `sevenlayers.io` domain in existing Resend account (the platform already uses Resend with key `re_b4oocYWc_...`)
- This enables sending from `team@mail.sevenlayers.io`
- Until verified, fall back to existing `team@mail.l4yercak3.com`

### 3. ElevenLabs outbound phone number
- Find the `agent_phone_number_id` for Clara's phone in the ElevenLabs dashboard
- This is the phone number ID ElevenLabs uses for outbound calls via Twilio

### 4. Run the pipeline seed script
```bash
cd apps/one-of-one-landing
npx tsx scripts/seed-seven-agents-pipeline.ts
```
This creates the "Seven Agents" pipeline with stages: New Lead → Contacted → Demo Booked → Qualified → Won → Lost. It outputs the `SEVEN_AGENTS_PIPELINE_ID` and `SEVEN_AGENTS_FIRST_STAGE_ID` to add to env.

### 5. Set environment variables
Add to `.env.local` and Vercel deployment env:
```bash
# Twilio Verify (SMS OTP)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...

# ElevenLabs outbound calling
LANDING_OUTBOUND_PHONE_NUMBER_ID=...  # from ElevenLabs dashboard

# Email
LANDING_LEAD_SALES_EMAIL=sales@sevenlayers.io
LANDING_LEAD_FROM_EMAIL=sevenlayers <team@mail.sevenlayers.io>
# RESEND_API_KEY already exists in root .env.local

# Pipeline (from seed script output)
SEVEN_AGENTS_PIPELINE_ID=...
SEVEN_AGENTS_FIRST_STAGE_ID=...
```

### 6. Test end-to-end
1. Open landing page → click "Test this agent" on any agent tile
2. Fill form (name, email, phone, language) → click "Call me"
3. Receive SMS with 6-digit code → enter code → click "Verify & call me"
4. Modal shows "Clara is calling you now!" → phone rings
5. Check sales@sevenlayers.io inbox for lead notification
6. Check lead's inbox for confirmation email with "Book Demo" CTA
7. Check platform CRM for new lead contact in Seven Agents pipeline
8. Test German flow (switch language toggle)
9. Test rate limiting (submit >5 times from same IP)

### 7. Deploy
- Commit all changes
- Push to trigger Vercel deployment
- Verify env vars are set in Vercel project settings
