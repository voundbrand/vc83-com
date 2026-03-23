# Technical Product Plan — Platform Company Implementation

| Field | Value |
|-------|-------|
| **Document** | TECHNICAL_PRODUCT_PLAN — Platform Implementation Roadmap |
| **Date** | 2026-03-18 |
| **Classification** | Internal — Founder's Eyes Only |
| **Purpose** | Exit Path (a): Build the vertical SaaS platform for DACH professional services |

---

## The Platform Thesis

> "ElevenLabs is the voice. Our platform is the brain. Whoever owns the data layer — CRM, bookings, qualification, analytics — owns the customer. ElevenLabs is swappable infrastructure. The platform is not."

---

## What Already Exists (520K Lines)

### Fully Ready for Law Firm Deployment

| Component | Key Files | Status |
|-----------|----------|--------|
| **ElevenLabs Multi-Agent System** | `apps/one-of-one-landing/scripts/elevenlabs/lib/catalog.ts` | 7 agents, star topology handoff, test fixtures, simulation engine |
| **Booking Engine** | `convex/bookingOntology.ts` | Full CRUD: appointment types, status workflow (pending→confirmed→completed), timezone support, buffer times, conflict detection |
| **Calendar Sync** | `convex/calendarSyncOntology.ts`, `convex/calendarSyncSubcalendars.ts` | Google + Outlook OAuth, sub-calendar support, retry logic with exponential backoff |
| **CRM Contacts** | `convex/crmOntology.ts` | Contact types (customer, lead, prospect), addresses, outreach preferences, extensible customProperties |
| **Availability System** | `convex/availabilityOntology.ts` | Schedule (weekly recurring), exception (single date), block (range). On-demand slot calculation. Capacity tracking. |
| **Agent Orchestration** | `convex/ai/agentExecution.ts`, `convex/ai/agentToolOrchestration.ts` | Tool registry (50+ tools), approval workflows, context composition, LLM retry |
| **Booking Tool** | `convex/ai/tools/bookingTool.ts` | 6-stage pipeline: identify→crm_lookup→slot_parse→contact_capture→booking→invite. Phone-safe contract. |
| **Multi-Tenant RBAC** | `convex/rbacHelpers.ts` (82+ files), `convex/organizationOntology.ts` | Per-org data isolation, checkPermission(), role-based access, extensible settings |
| **Webhook Framework** | `convex/http.ts`, `convex/channels/registry.ts` | Pluggable providers: Twilio, Infobip, Telegram, Slack, WhatsApp, Resend. Signature verification. |
| **Channel Providers** | `convex/channels/` | Direct telephony provider with ElevenLabs identity (`eleven_telephony`). Inbound + outbound. Consent recording. |

### Requires Wiring (exists but not connected)

| Component | What Exists | What's Missing |
|-----------|------------|----------------|
| **Voice → Booking** | Booking tool has full pipeline. ElevenLabs agents have transfer mechanics. | The bridge: ElevenLabs agent call → webhook → booking tool execution. The "last mile" wire-up. |
| **Voice → CRM** | CRM ontology supports leads with customProperties. Agent tool registry includes CRM tools. | Automatic CRM entry creation from qualified call data. |
| **Voice → Calendar** | Calendar sync works with Google/Outlook. Booking engine has calendar integration. | Lawyer-specific availability rules (practice area → lawyer mapping). |
| **Call → Dashboard** | Organization settings, RBAC, multi-tenant architecture all exist. | Customer-facing dashboard UI showing call logs, leads, bookings. |

### Needs New Implementation (~15-20% of effort)

| Component | What's Needed | Effort |
|-----------|--------------|--------|
| **Practice area routing** | Map qualification output (Arbeitsrecht, Familienrecht) to specific lawyers | 2-3 days |
| **Urgency assessment engine** | Frist-detection logic (3-Wochen-Frist for Kündigungsschutz, etc.) | 1-2 days |
| **Intake summary generator** | Structured email/webhook with qualification data → lawyer inbox | 1-2 days |
| **Law firm dashboard** | React UI: call log, lead pipeline, booking calendar, conversion metrics | 2-3 weeks |
| **Audit mode** | Clara in "listen-only" mode (qualify but don't book) for call audit phase | 1 day |
| **Audit report generator** | PDF/HTML report: call volume, practice areas, urgency, revenue-at-risk math | 2-3 days |
| **RA-MICRO CSV export** | Generate RA-MICRO-importable files for contacts/matters | 2-3 days |
| **Practice area templates** | Configurable qualification trees per practice area | 1 week |

---

## Four-Layer Implementation Plan

### Layer 1: MVP Wire-Up (Weeks 1-4) — CRITICAL PATH

**Goal:** Clara+Jonas+Maren answer a call, qualify the matter, and book an Erstberatung that appears in the lawyer's Google/Outlook calendar. Structured intake summary sent via email.

**This is the minimum to start selling.**

#### Sprint 1 (Week 1-2): Voice → Booking Pipeline

| Task | Files to Modify | Effort | Priority |
|------|----------------|--------|----------|
| **1.1** Configure ElevenLabs webhook to trigger Convex booking tool on call completion | `convex/http.ts`, `convex/channels/registry.ts` | 1 day | P0 |
| **1.2** Map Jonas qualification output to booking tool `identify` and `crm_lookup_create` stages | `convex/ai/tools/bookingTool.ts` | 1 day | P0 |
| **1.3** Implement practice area → lawyer routing in Maren's slot selection | `convex/availabilityOntology.ts`, `convex/bookingOntology.ts` | 2 days | P0 |
| **1.4** Create "Kanzlei" booking type with law firm-specific fields via customProperties | `convex/bookingOntology.ts` | 0.5 day | P0 |
| **1.5** Wire Maren's booking confirmation to calendar sync (Google/Outlook) | `convex/calendarSyncOntology.ts` | 1 day | P0 |
| **1.6** Build intake summary email template (structured: caller, practice area, urgency, key facts) | `convex/channels/` (email provider) | 1 day | P0 |
| **1.7** Test end-to-end: call demo number → Clara → Jonas → Maren → calendar entry + email | All above | 1 day | P0 |

#### Sprint 2 (Week 3-4): CRM + Audit Mode

| Task | Files to Modify | Effort | Priority |
|------|----------------|--------|----------|
| **2.1** Auto-create CRM contact from qualified call (name, phone, email, practice area) | `convex/crmOntology.ts`, `convex/ai/tools/bookingTool.ts` | 1 day | P0 |
| **2.2** Build Clara "audit mode" — qualify calls but don't book (for free call audit phase) | `apps/one-of-one-landing/scripts/elevenlabs/lib/catalog.ts` | 0.5 day | P0 |
| **2.3** Build call log storage (store each call: timestamp, caller, practice area, urgency, duration, outcome) | New: `convex/callLogOntology.ts` or extend existing objects | 1 day | P1 |
| **2.4** Build audit report data aggregation (calls by time, practice area, urgency) | New query in `convex/` | 1 day | P1 |
| **2.5** Build audit report PDF/email generator | New: template in `src/` or email template | 2 days | P1 |
| **2.6** Configure "Schröder & Partner" demo with all 3 agents + booking | ElevenLabs agent config | 1 day | P0 |
| **2.7** Run 50+ test scenarios per 03_DEMO_KIT_SPEC.md | Test execution | 2 days | P0 |

**Layer 1 total: ~15 working days (3 weeks with buffer)**

**Layer 1 exit criteria:**
- [ ] Call demo number → full qualification → booked appointment in calendar
- [ ] Intake summary email received by "lawyer"
- [ ] CRM contact created automatically
- [ ] Audit mode works (qualify without booking)
- [ ] 50+ test scenarios pass
- [ ] Demo can be shown to a managing partner

---

### Layer 2: Law Firm Dashboard (Weeks 5-8)

**Goal:** Customer-facing web UI where the managing partner sees call activity, leads, bookings, and conversion metrics.

| Task | Effort | Priority |
|------|--------|----------|
| **2.1** Dashboard page: call log view (time, caller, practice area, urgency, outcome) | 2 days | P1 |
| **2.2** Dashboard page: lead pipeline (new → qualified → booked → appeared → converted) | 2 days | P1 |
| **2.3** Dashboard page: booking calendar (upcoming Erstberatungen) | 1 day | P1 |
| **2.4** Dashboard page: metrics summary (calls/day, bookings/week, after-hours %, conversion rate) | 2 days | P1 |
| **2.5** Dashboard page: audit report view (for managing partner to see audit data) | 1 day | P1 |
| **2.6** Per-organization dashboard (multi-tenant, RBAC-gated) | 1 day | P1 |
| **2.7** Mobile-responsive (managing partner checks on iPhone) | 1 day | P2 |

**Layer 2 total: ~10 working days (2 weeks with buffer)**

**Architecture note:** Build on existing Next.js frontend (`src/`). Reuse existing RBAC patterns from `convex/rbacHelpers.ts`. Data comes from call log (Layer 1 task 2.3) + booking ontology + CRM ontology. No new backend architecture needed.

---

### Layer 3: Practice Area Templates (Weeks 9-12)

**Goal:** Configurable qualification trees that reduce onboarding from 10 hours to 2-4 hours per firm.

| Task | Effort | Priority |
|------|--------|----------|
| **3.1** Template data model: qualification tree (questions, branches, urgency rules) per practice area | 2 days | P1 |
| **3.2** Arbeitsrecht template (hardened from first 3-5 deployments) | 1 day | P1 |
| **3.3** Familienrecht template | 1 day | P1 |
| **3.4** Mietrecht template | 1 day | P2 |
| **3.5** Strafrecht template | 1 day | P2 |
| **3.6** Template deployment tool (select template → customize firm details → deploy agents) | 3 days | P1 |
| **3.7** General Kanzlei FAQ template (hours, address, parking, Erstberatung pricing) | 0.5 day | P1 |

**Layer 3 total: ~10 working days (2-3 weeks with buffer)**

**Critical insight:** Templates are not built in isolation. They emerge from real deployments. Layer 3 codifies what was learned in Layer 1 deployments. Don't build templates before having 3+ real law firm customers.

---

### Layer 4: Integration Moat (Months 4-12)

**Goal:** RA-MICRO data export, DATEV API (for Steuerberater), deep integrations that create switching costs.

| Task | Effort | Priority | When |
|------|--------|----------|------|
| **4.1** RA-MICRO CSV export (contacts, matters, appointment data in RA-MICRO-compatible format) | 3 days | P2 | Month 3-4 |
| **4.2** DATEV partnership application | 1 day (admin) | P2 | Month 4-5 |
| **4.3** DATEV API integration (contacts, Mandantenstammdaten) | 2-3 weeks | P2 | Month 8-10 |
| **4.4** RA-MICRO API integration (if partnership granted) | 3-4 weeks | P2 | Month 10-12 |
| **4.5** beA integration evaluation (likely: not needed for phone intake) | 1 day research | P3 | Month 6 |

---

## Architecture Decisions

### Decision 1: Call data flow

```
Phone Call → ElevenLabs Agent (voice)
           → Webhook to Convex (structured data)
           → Booking Tool pipeline (qualify → book)
           → Calendar Sync (Google/Outlook)
           → Email notification (to lawyer)
           → CRM entry (automatic)
           → Call log (dashboard data)
```

**Use existing `convex/http.ts` webhook router.** The `eleven_telephony` provider identity already exists in `convex/channels/registry.ts`. Route key: `eleven:phone:{connectionId}:{installationId}`.

### Decision 2: Where qualification logic lives

**In ElevenLabs agent prompts (not in Convex).**

Reasoning: Qualification happens during the live voice call. The LLM processes the caller's responses in real-time. The qualification tree is embedded in Jonas's system prompt. The output (structured JSON) is sent to Convex via webhook at call completion.

Convex receives the RESULT of qualification, not the logic. This keeps the voice path fast and avoids round-trips between ElevenLabs and Convex during the call.

### Decision 3: Multi-tenant law firm setup

**One organization per law firm.** Reuse existing `convex/organizationOntology.ts` pattern.

Per-firm configuration stored in `objects` table with type `organization_settings`:
- Practice areas (array)
- Lawyer roster (array of {name, practice_areas, calendar_id, availability_pattern})
- Erstberatung pricing per practice area
- FAQ entries
- Agent voice preferences

### Decision 4: ElevenLabs agent per firm vs. shared agent

**Shared agent with per-firm context injection.**

Don't create separate ElevenLabs agents per law firm. That doesn't scale. Instead:
- One Clara agent with dynamic system prompt (firm name, greeting, FAQ injected at call start)
- One Jonas agent with dynamic qualification tree (practice areas, urgency rules injected)
- One Maren agent with dynamic booking config (lawyer roster, availability injected)

Context injection happens via the ElevenLabs `dynamic_variables` or `system_prompt` override at call initiation. The agent configuration in `catalog.ts` serves as the base template.

### Decision 5: Dashboard architecture

**Extend existing Next.js frontend.** New route: `/kanzlei/dashboard`.

- Protected by existing auth + RBAC
- Reads from: call log table, booking ontology, CRM ontology
- No new backend services needed — Convex queries directly
- Reuse existing UI components from `src/components/`

---

## Key Files Reference

| Purpose | File Path |
|---------|----------|
| ElevenLabs agent catalog | `apps/one-of-one-landing/scripts/elevenlabs/lib/catalog.ts` |
| ElevenLabs simulation/test | `apps/one-of-one-landing/scripts/elevenlabs/simulate-elevenlabs-flow.ts` |
| Booking engine | `convex/bookingOntology.ts` |
| Booking AI tool | `convex/ai/tools/bookingTool.ts` |
| Tool registry | `convex/ai/tools/registry.ts` |
| Agent execution | `convex/ai/agentExecution.ts` |
| Agent orchestration | `convex/ai/agentToolOrchestration.ts` |
| Calendar sync | `convex/calendarSyncOntology.ts` |
| Calendar sub-calendars | `convex/calendarSyncSubcalendars.ts` |
| Availability | `convex/availabilityOntology.ts` |
| CRM contacts | `convex/crmOntology.ts` |
| Organization model | `convex/organizationOntology.ts` |
| RBAC helpers | `convex/rbacHelpers.ts` |
| HTTP webhook router | `convex/http.ts` |
| Channel registry | `convex/channels/registry.ts` |
| Node/layer registry | `convex/layers/nodeRegistry.ts` |

---

## Implementation Priority

```
WEEK 1-2:  [Layer 1 Sprint 1] Voice → Booking pipeline     ████████████████ CRITICAL
WEEK 3-4:  [Layer 1 Sprint 2] CRM + Audit mode             ████████████████ CRITICAL
WEEK 5-8:  [Layer 2]          Dashboard                     ████████████     HIGH
WEEK 9-12: [Layer 3]          Practice area templates        ████████████     HIGH
MONTH 4-6: [Layer 4.1]        RA-MICRO CSV export           ████████         MEDIUM
MONTH 6-10:[Layer 4.2-4.3]    DATEV integration             ████████         MEDIUM
MONTH 10+: [Layer 4.4]        RA-MICRO API integration      ████████         MEDIUM
```

**Rule: Layer 1 must complete before any sales call.** The demo must work end-to-end. "Holy shit" + "it actually books the appointment" = sale. "Holy shit" + "we'll wire that up later" = lost deal.

---

## Verification Plan

### Layer 1 verification

1. Call demo number → hear Clara greet "Kanzlei Schröder und Partner"
2. Say "Ich wurde gestern gekündigt" → Jonas qualifies (Arbeitsrecht, DRINGEND)
3. Jonas transfers to Maren → Maren offers 2-3 time slots
4. Accept a slot → check Google Calendar: appointment appears with correct lawyer
5. Check email: lawyer receives structured intake summary
6. Check CRM: new contact created with caller details and practice area
7. Repeat in audit mode: qualification happens, no booking, call logged

### Layer 2 verification

1. Log in as managing partner → see dashboard with today's calls
2. Click a call → see full intake summary
3. View lead pipeline → see calls progressing through stages
4. View metrics → see calls/day, bookings/week, after-hours percentage
5. View on mobile → responsive, readable

### Layer 3 verification

1. Select "Arbeitsrecht" template → deploy for new firm in <2 hours
2. Template includes: qualification tree, FAQ, urgency rules, booking flow
3. Customization: firm name, lawyers, hours, pricing → deploy

---

*Created: March 2026*
*Status: Operative — begin Layer 1 Sprint 1 immediately*
*Next step: Task 1.1 — Configure ElevenLabs webhook to trigger Convex booking tool*
