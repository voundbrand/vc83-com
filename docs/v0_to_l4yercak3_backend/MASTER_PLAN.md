# V0-to-Production Pipeline: Master Plan

> **Status**: Active
> **Last Updated**: 2026-02-01
> **Scope**: Everything from builder app creation through production deployment, monetization, and post-deploy features.

---

## Table of Contents

1. [What's Done](#1-whats-done)
2. [Active Source of Truth: Ontology Reference](#2-ontology-reference)
3. [Workstream A: Credits & Pricing Integration](#3-workstream-a-credits--pricing)
4. [Workstream B: Availability System](#4-workstream-b-availability-system)
5. [Workstream C: Deploy Enforcement & Tier Gating](#5-workstream-c-deploy-enforcement)
6. [Workstream D: Phase B Connect Mode](#6-workstream-d-phase-b-connect)
7. [Workstream E: Webhook Auto-Registration](#7-workstream-e-webhook-auto-registration)
8. [Workstream F: Custom Domains](#8-workstream-f-custom-domains)
9. [Implementation Priority](#9-implementation-priority)
10. [File Reference](#10-file-reference)
11. [Archived Docs](#11-archived-docs)

---

## 1. What's Done

### Builder Core (Complete)

| Feature | Status | Key Files |
|---------|--------|-----------|
| v0 Platform API chat integration | Done | `convex/integrations/v0.ts` |
| Builder chat (built-in AI + v0) | Done | `builder-chat-panel.tsx`, `builder-context.tsx` |
| iframe preview (v0 demo URL + live toggle) | Done | `builder-preview-panel.tsx` |
| Virtual file system (builderFiles table) | Done | `convex/fileSystemOntology.ts`, file explorer in builder |
| File explorer panel in builder | Done | `file-explorer-panel.tsx` |
| Code editor (Monaco) | Done | Integrated in builder |

### Connect Mode Phase A (Complete)

| Feature | Status | Key Files |
|---------|--------|-----------|
| v0 file analyzer (heuristic detection) | Done | `src/lib/builder/v0-file-analyzer.ts` |
| All 9 ontology types detected + wired | Done | See [ONTOLOGY_CONNECTION_REFERENCE.md](./ONTOLOGY_CONNECTION_REFERENCE.md) |
| ConnectionPanel (Create/Link/Skip per item) | Done | `connection-panel.tsx` |
| Backend record matching (similarity search) | Done | `builderAppOntology.ts:getExistingRecordsForConnection` |
| executeConnections (creates/links records) | Done | `builder-context.tsx` |
| Object linking to builder apps | Done | `builderAppOntology.ts:linkObjectsToBuilderApp` |

### Publish Pipeline (Complete)

| Feature | Status | Key Files |
|---------|--------|-----------|
| Publish config wizard (multi-step) | Done | `publish-config-wizard.tsx` |
| API category selection + auth + payments config | Done | Wizard steps |
| Scaffold generator (thin-client, category-aware) | Done | `src/lib/scaffold-generators/thin-client.ts` |
| GitHub atomic commit (Git Trees API) | Done | `convex/integrations/github.ts` |
| v0 compatibility engine (Tailwind v4->v3, Geist fonts, shadcn stubs) | Done | `github.ts:patchV0CompatibilityIssues` |
| Vercel project creation + deploy polling | Done | `convex/integrations/vercel.ts` |
| Self-heal deploy (3 attempts + v0 fallback) | Done | `selfHealDeploy.ts`, `selfHealChat.ts` |
| Self-heal via builder chat (persistent state) | Done | Chat-based heal loop |

### Platform Infrastructure (Complete)

| Feature | Status | Key Files |
|---------|--------|-----------|
| OAuth 2.0 + PKCE (6 providers) | Done | `convex/oauth/` |
| Stripe checkout + webhooks | Done | `convex/stripe/` |
| Scoped API key generation | Done | `convex/actions/apiKeys.ts` |
| Domain config ontology | Done | `convex/domainConfigOntology.ts` |
| License enforcement | Done | `convex/licensing/helpers.ts` |
| Builder app CRUD (objects table) | Done | `convex/builderAppOntology.ts` |

---

## 2. Ontology Reference

**Source of truth**: [ONTOLOGY_CONNECTION_REFERENCE.md](./ONTOLOGY_CONNECTION_REFERENCE.md) (kept in this directory)

9 ontology types supported in the builder connection system:

| Type | DB Type | API Category |
|------|---------|-------------|
| Product | `product` | `products` |
| Event | `event` | `events` |
| Contact | `crm_contact` | `crm` |
| Form | `form` | `forms` |
| Invoice | `invoice` | `invoices` |
| Ticket | `ticket` | `tickets` |
| Booking | `booking` | `bookings` |
| Workflow | `workflow` | `workflows` |
| Checkout | `checkout_instance` | `checkout` |

Each type has: auto-detection rules, create mutations with defaults, DB type mapping, and API endpoint routes. See the reference doc for full details.

---

## 3. Workstream A: Credits & Pricing

### Context

Two plans existed for monetization. They have been reconciled:

- **Old plan** (archived `BUILDER_PRO_FUNNEL_PLAN.md`): Builder Pro at $20/mo, token-based credits matching v0.dev pricing. Credits = dollars. Each v0/OpenRouter call tracked by cost.
- **New plan** (active `docs/pricing-and-trials/NEW_PRICING_PLAN.md`): 4-tier credit system (Free/Pro/Agency/Enterprise). Credits = abstract units (1 credit ~ 5K tokens). V0 is BYOK. Our monetization = agent execution + platform automation.

**The new plan supersedes the old.** Key differences:
- Credits are abstract units, not dollars
- V0 builder is BYOK (user's own V0 account, we don't resell)
- We charge for agent actions (CRM writes, workflows, sequences), not v0 generation
- 4 tiers: Free (0 EUR), Pro (29 EUR/mo), Agency (299 EUR/mo), Enterprise (custom)
- Daily credits on login (5/day for all tiers) instead of daily dollar bonus

### What's Built

| Component | Status | Location |
|-----------|--------|----------|
| Credit schemas (3 tables) | Done | `convex/schemas/creditSchemas.ts` |
| Credit balance/deduction/grant system | Done | `convex/credits/index.ts` |
| Credit cost registry (per action type) | Done | `convex/credits/index.ts:CREDIT_COSTS` |
| Daily credit grant on login | Done | `convex/credits/index.ts:grantDailyCredits` |
| Monthly credit grant (Stripe webhook) | Done | `convex/credits/index.ts:grantMonthlyCredits` |
| Credit pack purchase (add purchased credits) | Done | `convex/credits/index.ts:addPurchasedCredits` |
| Stripe price IDs defined (9 new) | Done | `docs/pricing-and-trials/STRIPE-SETUP-GUIDE.md` |
| New tier configs (4 tiers) | In progress | `convex/licensing/tierConfigs.ts` (being rewritten) |

### What's Remaining

#### A1. Wire Credits to Agent Execution Pipeline

**Priority: HIGH**

The credit system exists but is not yet called from agent execution code. Agent actions consume credits but nothing enforces or deducts yet.

**Changes needed:**
- In agent execution entry point: call `checkCreditsInternalQuery` before executing
- After agent action completes: call `deductCreditsInternalMutation` with appropriate cost from `CREDIT_COSTS`
- Map agent tool calls to credit costs using `getToolCreditCost(toolName)`
- Map agent AI messages to credit costs using `getAgentMessageCost(model)`

**Files to modify:**
- `convex/ai/agentExecution.ts` - Add pre-flight credit check + post-execution deduct
- `convex/ai/chat.ts` - Add credit deduction for direct chat AI calls
- `convex/workflows/behaviorExecutor.ts` - Add credit deduction for workflow triggers

#### A2. Credit Balance UI

**Priority: HIGH**

**New files:**
- `src/components/credit-balance.tsx` - Credit balance display widget (exists as empty file)
- `src/components/credit-wall.tsx` - "Out of credits" upgrade prompt (exists as empty file)
- `src/components/credit-balance-widget.tsx` - Compact widget for headers (exists as empty file)

**Integration points:**
- Builder header: show remaining credits + daily counter
- Agent chat: show "X credits used" after each action
- Upgrade wall: catch `CREDITS_EXHAUSTED` ConvexError, show tier upgrade or credit pack purchase

#### A3. Stripe Product Setup

**Priority: HIGH**

The Stripe setup guide is complete (`docs/pricing-and-trials/STRIPE-SETUP-GUIDE.md`). Implementation requires:
- Create Stripe products + prices in test mode (4 products, 9 prices)
- Set Convex env vars for all price IDs
- Wire webhook handler for credit pack purchase (`payment_intent.succeeded` with `metadata.type = "credit-pack"`)
- Wire webhook handler for subscription renewal to call `grantMonthlyCredits`

**Files to modify:**
- `convex/stripe/platformCheckout.ts` - Rewrite for Pro/Agency/credits checkout
- `convex/stripe/platformWebhooks.ts` - Add credit grant on subscription create/renew
- `convex/stripe/stripePrices.ts` - New price ID mapping
- `convex/stripe/aiWebhooks.ts` - Route credit pack webhooks

#### A4. Store UI Redesign

**Priority: MEDIUM**

- Rewrite `src/components/window-content/store-window.tsx` - 4 plan cards + credit pack section
- Remove old tier cards (Community, Starter, Professional)
- Remove AI Standard / AI Privacy-Enhanced cards
- Add credit balance display + purchase flow

#### A5. Cleanup Old Pricing

**Priority: LOW** (after new pricing is live)

- Remove `community`, `starter`, `professional` tier references
- Remove `aiSubscriptions.tier` standard/privacy-enhanced distinction
- Remove old Stripe env vars
- Update all TypeScript union types for tier names
- Archive old token pack / AI subscription code

---

## 4. Workstream B: Availability System

### Context

Detailed plan from `AVAILABILITY_SYSTEM_PLAN.md` (now archived). Backend is complete; frontend calendar UI and external calendar sync are not started.

### What's Built (Backend)

| Component | Status |
|-----------|--------|
| Booking ontology (CRUD, status workflow, recurring, payments) | Done |
| Availability ontology (schedules, exceptions, blocks, slot calculation) | Done |
| Location ontology (branch, venue, virtual) | Done |
| Product ontology (7 bookable subtypes) | Done |
| Availability + Bookings REST APIs | Done |
| Microsoft OAuth + Graph API client | Done |
| Google OAuth flow | Done (basic scopes only) |

### What's Remaining

#### B1. Availability Calendar UI

**Priority: MEDIUM**

Replace the list-based schedule editor with a calendar view (month/week/day).

**New files:**
- `src/components/window-content/booking-window/availability-calendar.tsx` - Main component
- `src/components/window-content/booking-window/calendar-month-view.tsx`
- `src/components/window-content/booking-window/calendar-week-view.tsx`
- `src/components/window-content/booking-window/calendar-day-view.tsx`
- `src/components/window-content/booking-window/calendar-toolbar.tsx`

**Key features:**
- Resource selector (from bookable products)
- Month grid with color-coded dots (available/booked/blocked/busy)
- Week time-grid with available hours, bookings, blocks
- Day view with clickable available slots -> booking form
- Built with `date-fns` (already in package.json)

#### B2. Google Workspace Integration

**Priority: MEDIUM**

**New files:**
- `convex/oauth/googleScopes.ts` - Scope catalog (mirrors `microsoftScopes.ts`)
- `convex/oauth/googleClient.ts` - Google Calendar API client
- `src/components/window-content/integrations-window/google-settings.tsx` - Settings UI

**Changes:**
- `convex/oauth/google.ts` - Add `refreshGoogleToken`, calendar scopes
- `src/components/window-content/integrations-window/index.tsx` - Change Google status from `"coming_soon"` to `"available"`

#### B3. Calendar Sync Engine

**Priority: MEDIUM** (depends on B2)

**New file:** `convex/calendarSyncOntology.ts` - Bi-directional sync

**Inbound (every 15 min cron):**
- Pull external events from Google/Microsoft calendars
- Store as `calendar_event` objects in objects table
- Link to resources via `blocks_resource` object link
- 30-day rolling window (past 7 + future 23 days)

**Outbound (event-driven):**
- On booking confirmation: push booking as event to linked external calendar
- On booking cancellation: delete/update external calendar event

**Modified files:**
- `convex/crons.ts` - Add 15-minute sync cron
- `convex/availabilityOntology.ts` - Include external busy times in slot calculation
- `convex/bookingOntology.ts` - Push confirmed bookings to external calendars

#### B4. Microsoft Calendar Sync (Enable Existing)

**Priority: MEDIUM** (depends on B3)

- Enable "Calendar" sync toggle in `microsoft-settings.tsx` (currently "coming soon")
- Add resource linking dropdown
- Enhance `convex/oauth/graphClient.ts` with calendar CRUD methods

---

## 5. Workstream C: Deploy Enforcement

### What's Needed

Tier-based limits on builder app deployment. Free tier gets restrictions; Pro/Agency get progressively more.

#### C1. Deploy Limit Check

**Priority: HIGH** (tied to A1 credit system going live)

Per the new pricing plan:
- **Free**: 1 builder app, 1 checkout instance, badge required
- **Pro**: 10 builder apps, 5 checkout instances, no badge
- **Agency**: 100 builder apps, 100 checkout instances, white label

**Implementation:**
- Add `checkBuilderDeployLimit(ctx, orgId)` to `convex/licensing/helpers.ts`
- Call before GitHub push in `convex/integrations/github.ts`
- Throw `ConvexError` with `code: "LIMIT_EXCEEDED"` if over limit
- Frontend catches error and shows upgrade wall

#### C2. Badge Injection for Free Tier

**Priority: LOW**

- Check `license.features.badgeRequired` in `convex/publishingHelpers.ts`
- If true, inject "Built with L4YERCAK3" badge into generated layout
- Badge links to platform URL (free marketing)
- Pro+ tiers: badge removed

---

## 6. Workstream D: Phase B Connect Mode

### Context

Phase A (file-based detection) is complete. Phase B adds interactive post-deploy element selection.

#### D1. Connection Inspector Script

**Priority: LOW**

After first deploy, the scaffold includes a `lib/builder-inspector.ts` that:
- Activates when loaded in iframe from builder domain
- Adds click-to-select overlays with highlight borders
- Sends element metadata (tag, className, text, position) to parent via `postMessage`
- Only active when `NEXT_PUBLIC_BUILDER_MODE=true` env var is set

#### D2. Live Preview Toggle

**Priority: LOW**

- In `builder-preview-panel.tsx`: after deploy, offer "Preview (v0)" vs "Preview (Live)" toggle
- Live preview loads `productionUrl` in iframe
- Listen for `postMessage` from inspector script
- On element click: prompt user "What is this? Form / Product / Contact / Other"
- Wire selection to `linkObjectsToBuilderApp`

---

## 7. Workstream E: Webhook Auto-Registration

### What's Needed

When a builder app is deployed, automatically register its webhook endpoint with the platform.

#### E1. Webhook Registration on Deploy

**Priority: MEDIUM**

After successful Vercel deployment:

```
POST /api/v1/webhooks/register
{
  url: "https://my-app.vercel.app/api/webhook/l4yercak3",
  events: ["form.submitted", "payment.completed", "contact.created"],
  appId: "<builder_app_id>"
}
```

**Implementation:**
- Add `registerAppWebhook(ctx, appId, productionUrl, selectedCategories)` to `convex/publishingHelpers.ts`
- Call after deployment status = "deployed" in `convex/integrations/vercel.ts`
- Map selected API categories to webhook event types
- Store webhook registration on the builder app record

**New file (possibly):** `convex/webhookRegistry.ts` - Webhook registration + management

---

## 8. Workstream F: Custom Domains

### Context

Domain infrastructure exists (`convex/domainConfigOntology.ts`). Needs to be connected to the builder app publish flow.

#### F1. DNS Verification + Domain Mapping

**Priority: LOW**

- Free: No custom domains
- Pro: No custom domains (use Vercel default)
- Agency: 5 custom domains

**Implementation:**
- In publish wizard or post-deploy settings: "Add custom domain" UI
- DNS verification via TXT record (existing `domainConfigOntology` pattern)
- Vercel domain API: `POST /v10/projects/{id}/domains` to add domain
- SSL handled automatically by Vercel
- Store domain mapping on builder app record

---

## 9. Implementation Priority

### Critical Path (do first)

```
A1: Wire credits to agent execution     [HIGH - revenue enablement]
A3: Stripe product setup                [HIGH - payment infrastructure]
A2: Credit balance UI                   [HIGH - user-facing credits]
C1: Deploy limit check                  [HIGH - free tier enforcement]
```

### Second Wave

```
A4: Store UI redesign                   [MEDIUM - pricing page]
B1: Availability calendar UI            [MEDIUM - booking feature complete]
B2: Google Workspace integration         [MEDIUM - sync prerequisite]
E1: Webhook auto-registration           [MEDIUM - deploy completeness]
```

### Third Wave

```
B3: Calendar sync engine                [MEDIUM - depends on B2]
B4: Microsoft calendar sync             [MEDIUM - depends on B3]
A5: Cleanup old pricing                 [LOW - cleanup]
C2: Badge injection                     [LOW - branding]
```

### Backlog

```
D1: Connection inspector script         [LOW - Phase B connect]
D2: Live preview toggle                 [LOW - Phase B connect]
F1: Custom domains                      [LOW - Agency feature]
```

---

## 10. File Reference

### Credits & Pricing

| File | Purpose |
|------|---------|
| `convex/credits/index.ts` | Credit system: balance, deduct, grant, purchase |
| `convex/schemas/creditSchemas.ts` | creditBalances, creditTransactions, creditPurchases tables |
| `convex/licensing/tierConfigs.ts` | 4-tier config (being rewritten) |
| `convex/licensing/helpers.ts` | License enforcement + credit checking |
| `convex/stripe/platformCheckout.ts` | Stripe checkout for subscriptions + credits |
| `convex/stripe/platformWebhooks.ts` | Webhook handlers for tier updates + credit grants |
| `convex/stripe/stripePrices.ts` | Stripe price ID mapping |
| `docs/pricing-and-trials/NEW_PRICING_PLAN.md` | Pricing architecture (source of truth) |
| `docs/pricing-and-trials/STRIPE-SETUP-GUIDE.md` | Stripe product/price creation guide |

### Builder & Deploy Pipeline

| File | Purpose |
|------|---------|
| `src/contexts/builder-context.tsx` | Builder state, v0 integration, connections, file system |
| `convex/integrations/v0.ts` | v0 Platform API, chat polling, file extraction |
| `convex/integrations/github.ts` | GitHub push, v0 compat engine, scaffold merge |
| `convex/integrations/vercel.ts` | Vercel project creation, deploy polling |
| `convex/integrations/selfHealDeploy.ts` | LLM surgical fixes |
| `convex/integrations/selfHealChat.ts` | Chat-based heal loop |
| `src/lib/scaffold-generators/thin-client.ts` | Scaffold file generator |
| `src/lib/builder/v0-file-analyzer.ts` | Heuristic detection in v0 React files |

### Ontology & Connection

| File | Purpose |
|------|---------|
| `ONTOLOGY_CONNECTION_REFERENCE.md` | 9 ontology types reference (this directory) |
| `convex/builderAppOntology.ts` | Builder app CRUD, connection execution |
| `src/lib/api-catalog.ts` | Static API endpoint catalog |
| `src/components/builder/connection-panel.tsx` | Connection UI |

### Availability & Bookings

| File | Purpose |
|------|---------|
| `convex/bookingOntology.ts` | Booking CRUD, status workflow |
| `convex/availabilityOntology.ts` | Schedules, exceptions, slot calculation |
| `convex/locationOntology.ts` | Locations (branch, venue, virtual) |
| `convex/oauth/microsoft.ts` | Microsoft OAuth + token refresh |
| `convex/oauth/google.ts` | Google OAuth (basic) |

---

## 11. Archived Docs

The following docs have been moved to `docs/v0_to_l4yercak3_backend/archive/`:

| File | Reason |
|------|--------|
| `BUILDER_CONNECT_STEP_PLAN.md` | Phase A complete - all 9 types detected, matched, executed |
| `BUILDER_MODE_ARCHITECTURE.md` | Three-mode system evolved; connect mode works differently |
| `BUILDER_FILE_SYSTEM_PROMPT.md` | VFS built via `fileSystemOntology`, file explorer done |
| `SELF_HEAL_DEPLOY_PLAN.md` | Self-heal migrated to chat, working in production |
| `V0_PUBLISH_PIPELINE_ARCHITECTURE.md` | Pipeline is live; reference doc, not active plan |
| `BUILDER_PRO_FUNNEL_PLAN.md` | Superseded by `docs/pricing-and-trials/NEW_PRICING_PLAN.md` |
| `AVAILABILITY_SYSTEM_PLAN.md` | Plan incorporated into this master plan (Workstream B) |

**Kept in this directory:**
- `ONTOLOGY_CONNECTION_REFERENCE.md` - Active source of truth for 9 ontology types
- `MASTER_PLAN.md` - This document

The original `docs/v0_to_production_app/PLAN.md` remains as historical reference for Phase 2 (full-stack) and Phase 3 (hybrid) architecture options, which are not in scope for current work.
