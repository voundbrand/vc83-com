# PRD: Easy Mode / Advanced Mode + Owner Operating System

**Version:** 4.0
**Date:** 2026-02-22
**Author:** Strategy + Product
**Status:** Draft

> **Scope:** This PRD covers five interconnected systems:
> - **Sections 1-12:** Easy Mode / Advanced Mode — UI scoping, client management, credit usage, templates
> - **Section 13:** Platform Pulse — live business metrics dashboard (super-admin Tab 10)
> - **Section 14:** Sunday Night Mirror — weekly accountability scorecard (super-admin Tab 11)
> - **Section 15:** Revised Agency Pricing — updated unit economics for dream team GTM
> - **Section 16:** Agency Partner Program — partner flag, partner dashboard, onboarding, resources
> - **Sections 17-19:** Success metrics, risks, and open questions

---

## 1. Problem Statement

L4YERCAK3 is a sophisticated multi-tenant platform with 17 registered apps, 9 channel integrations, a full AI agent runtime, CRM, workflows, invoicing, and more. This breadth is a strength for power users but a barrier for the highest-value near-term buyer: **agency owners** who want to deploy AI agents for their clients.

Agency owners need three things:
1. Deploy an AI agent for each of their clients.
2. See how those agents are performing.
3. Bill their clients with margin.

They do not need (and are overwhelmed by) workflows, invoicing ontology, soul evolution, eval gates, web publishing, compliance tools, or 50+ configuration surfaces.

**Easy Mode** is a UI profile that scopes the platform experience to agency-relevant functionality, making L4YERCAK3 immediately sellable to agencies without changing the underlying platform.

---

## 2. Goals

1. New orgs default to Easy Mode and see a focused 4-section experience.
2. Existing orgs (events customer, pharmacy) continue seeing the full platform unchanged.
3. Any user can toggle their own org between Easy Mode and Advanced Mode from the user menu. Super-admin retains override on any org.
4. Super-admin can perform "white-glove setup" of an agency's client sub-orgs.
5. A simplified agency-oriented pricing presentation exists alongside the current store.
6. Zero changes to backend schemas, billing, credits, or agent runtime. This is a frontend lens + one org field.

---

## 3. Non-Goals

1. New backend features or API endpoints (everything needed exists).
2. Rebuilding the navigation system (we filter what is already there).
3. A self-serve agency onboarding wizard (we white-glove the first 50).
4. Agency-facing sub-billing (agencies bill their own clients externally).
5. New channel integrations.
6. Changes to the agent runtime, trust governance, or soul systems.
7. Mobile-specific layout changes (Easy Mode applies the same nav filter on mobile).

---

## 4. Current State (Codebase Anchors)

### 4.1 Organization Schema

**File:** `convex/schemas/coreSchemas.ts` (lines 135-217)

The `organizations` table already supports:
- `parentOrganizationId` -- sub-org hierarchy for agency-client relationships.
- `plan` -- deprecated; replaced by `organization_license` objects.
- `stripeCustomerId`, `stripeSubscriptionId` -- Stripe billing.
- `isPersonalWorkspace`, `isActive` -- status flags.
- Index `by_parent` -- query all sub-orgs of a parent.

**Missing field:** No `uiProfile` or equivalent mode flag exists on the organization record today.

### 4.2 Licensing / Tier System

**File:** `convex/licensing/tierConfigs.ts`

An "agency" tier already exists at the runtime level:
- **Price:** EUR 299/month + EUR 149/sub-org (2 free sub-orgs included). See Section 15 for revised pricing rationale.
- **Limits:** 15 users, 10,000 contacts, unlimited projects/events/products, 5 API keys, 2,000 credits/month.
- **Features:** Full white-label, custom domains, all premium features.

**File:** `convex/stripe/stripePrices.ts`

Stripe price IDs already mapped:
- `STRIPE_AGENCY_MO_PRICE_ID` (EUR 299/month)
- `STRIPE_AGENCY_YR_PRICE_ID` (EUR 2,990/year)
- `subOrgMonthly`: EUR 149/month per additional sub-org (revised from EUR 79 — see Section 15).

Public-facing name mapping: runtime `"agency"` <-> store `"scale"`.

### 4.3 Sub-Org Creation

**File:** `convex/api/v1/subOrganizationsInternal.ts`

Already implemented:
- `createChildOrganizationInternal()` -- creates child org with parent reference.
- Validates: parent exists, prevents nesting deeper than 1 level.
- Child inherits parent plan but gets own credit balance.
- `getChildOrganizationsInternal()` -- lists all sub-orgs with pagination.
- `updateChildOrganizationInternal()` -- update name, businessName, isActive.

### 4.4 Credit Sharing

**File:** `convex/schemas/creditSchemas.ts`

Already implemented:
- Parent-to-child credit fallback when child exhausts own balance.
- `deductedFromParentId` and `childOrganizationId` fields on `creditTransactions` for audit.
- Consumption order: Gifted -> Monthly -> Purchased (with parent fallback).

### 4.5 Navigation

**File:** `src/components/taskbar/top-nav-menu.tsx`

Current nav uses a composable `TopNavMenuItem` system with:
- `id`, `label`, `href`, `icon`, `disabled`, `submenu`.
- PostHog telemetry on navigation events.
- Keyboard navigation support.

The nav items are rendered based on available apps and permissions. The filtering mechanism for Easy Mode will intercept at the point where nav items are composed.

### 4.6 Super-Admin

**File:** `convex/licensing/superAdmin.ts`

Already supports:
- `setOrganizationLicense()` -- set/upgrade org license with custom limits/features.
- `updateLicenseLimits()` -- adjust limits without tier change.
- `getLicenseStats()` -- dashboard stats.
- Manual grant tracking with reason codes.

**UI File:** `src/components/window-content/super-admin-organizations-window/`

Super-admin org management windows exist with tab-based interface.

### 4.7 Agent Deployment

**Files:** `convex/channels/router.ts`, `convex/ai/agentExecution.ts`, `convex/ai/agentSessions.ts`

The full agent deployment pipeline exists:
1. Create agent object (type `agent_instance` in ontology).
2. Link to organization and channel(s).
3. Store channel credentials in `provider_credentials` object.
4. Inbound messages route via channel router -> agent execution pipeline.
5. 13-step execution: config -> rate limit -> session -> CRM -> context -> LLM -> tools -> store -> stats -> response.

### 4.8 Store / Pricing UI

**Files:**
- `src/lib/store-pricing-contract.ts` -- pricing tier snapshot contract.
- `src/components/window-content/store/store-plan-cards.tsx` -- plan card display.
- `src/components/window-content/store/store-pricing-calculator.tsx` -- interactive calculator.
- `src/app/store/page.tsx` -- store page entry.

Active public tiers: `["free", "pro", "scale", "enterprise"]`.

---

## 5. Specification

### 5.1 New Field: `uiProfile` on Organizations

**Location:** `convex/schemas/coreSchemas.ts`, `organizations` table.

```typescript
uiProfile: v.optional(v.union(
  v.literal("easy"),
  v.literal("advanced"),
)),
```

**Semantics:**
- `undefined` or `"advanced"` -- existing full-platform experience. No behavior change.
- `"easy"` -- Easy Mode. Navigation and store presentation are scoped.

**Defaults:**
- New organizations created through standard signup: `"easy"`.
- Existing organizations: `undefined` (resolves to `"advanced"`). No migration needed.
- Super-admin can set/change this field on any org.

**Resolution function:**

```typescript
export function resolveUiProfile(
  org: { uiProfile?: "easy" | "advanced" }
): "easy" | "advanced" {
  return org.uiProfile ?? "easy";  // Default: Easy Mode
}
```

### 5.2 Easy Mode Navigation Scope

When `uiProfile === "easy"`, the nav renders **only** these sections:

| Section | Label | Maps To |
|---------|-------|---------|
| **Dashboard** | "Dashboard" | Existing org dashboard (overview stats) |
| **Clients** | "My Clients" | Sub-org list view (existing `by_parent` query) |
| **Agents** | "My Agents" | Agent list filtered to parent org + all child orgs |
| **Performance** | "Performance" | Agent session stats aggregated across all sub-orgs |
| **Store** | "Plan & Billing" | Simplified agency pricing view (Section 5.4) |
| **Settings** | "Settings" | Org settings (name, branding, team members) |

All other nav items (CRM, Events, Forms, Invoicing, Workflows, Web Publishing, Projects, Certificates, Products, Checkout, Sequences, Compliance, AI Assistant, Benefits, Media Library, Booking) are **hidden from navigation**. They are not disabled at the backend level -- an Easy Mode org with a direct URL to `/crm` would still function if they had the tier features. The filtering is purely a UI scoping concern.

**Implementation approach:**

Define an `EASY_MODE_ALLOWED_NAV_IDS` constant (or equivalent) at the nav composition layer. When `resolveUiProfile(org) === "easy"`, filter the nav item list to include only items whose `id` is in the allowed set. This is a single `filter()` call at the point where nav items are assembled.

### 5.3 "My Clients" View

This is a focused presentation of the existing sub-org list.

**Data source:** `getChildOrganizationsInternal()` on `convex/api/v1/subOrganizationsInternal.ts`.

**Card per client (sub-org):**

| Field | Source |
|-------|--------|
| Client name | `organization.name` |
| Status | `organization.isActive` -> "Active" / "Inactive" |
| Agent status | Query `agentSessions` by `organizationId` for most recent session, show "Agent Active" if active session exists within last 24h, else "Agent Idle" |
| Messages this period | Count of `agentSessionMessages` for this sub-org's sessions in current billing period |
| Contacts captured | Count of `objects` where `type === "crm_contact"` and `organizationId === childOrgId` |
| Last activity | Most recent `agentSessionMessages.timestamp` across child org's sessions |

**Actions per client card:**
- "View Agent" -- navigate to agent config for this sub-org.
- "View Conversations" -- navigate to agent session list for this sub-org.
- "Deactivate" / "Reactivate" -- calls `updateChildOrganizationInternal({ isActive })`.

**"Add Client" action:**
- Opens a minimal form: Client Name, Business Name.
- Calls `createChildOrganizationInternal()`.
- After creation, prompts "Deploy an agent for [Client Name]?" which navigates to the agent creation flow for the new sub-org.
- The sub-org slug is auto-generated from the client name.

### 5.4 Simplified Agency Pricing Presentation

The current store shows Free / Pro / Scale / Enterprise with full feature comparison tables. For Easy Mode, the store page presents a single focused view.

**Agency store headline:**

> **Your Plan: Scale**
> EUR 299/month base | 2 client slots included | EUR 149/month per additional client

**Elements shown:**
1. Current plan status (active, trial, billing cycle).
2. Sub-org usage: "3 of 5 client slots used" (where 5 = 2 included + 3 purchased).
3. Credit balance: current credits remaining / monthly allocation.
4. "Add Client Slot" button -- triggers Stripe sub-org add-on purchase flow (`subOrgMonthly` pricing at EUR 149/month — see Section 15).
5. "Buy Credits" button -- existing credit pack purchase flow.
6. Billing history link -- existing Stripe customer portal.

**What is NOT shown in agency store view:**
- Tier comparison table.
- Feature lists.
- Pro / Free / Enterprise options.
- The word "Scale" (use "Agency Plan" as display name in this context).

**Implementation:** This is a new component `AgencyStoreSummary` rendered conditionally when `resolveUiProfile(org) === "easy"` on the store page. The existing `store-plan-cards.tsx` and `store-pricing-calculator.tsx` continue to render for `"advanced"` profile orgs. No backend pricing changes.

### 5.5 "My Agents" View

A consolidated view of all agents across the agency org and its sub-orgs.

**Data source:** Query agent objects (`type === "agent_instance"` or equivalent) where `organizationId` is the parent org or any child org.

**Table / card per agent:**

| Field | Source |
|-------|--------|
| Agent name | `object.name` |
| Client | The sub-org's name (or "My Agency" if deployed on parent org) |
| Channel(s) | Channel bindings on the agent (Webchat, WhatsApp, Telegram, etc.) |
| Status | Derived from recent session activity: "Active" / "Idle" / "Not Deployed" |
| Conversations | Count of `agentSessions` for this agent |
| Messages (period) | Count of messages in current billing period |

**Actions:**
- "Configure" -- navigate to existing agent configuration.
- "Deploy to Channel" -- navigate to existing channel binding flow.
- "View Conversations" -- navigate to existing session list for this agent.

### 5.6 Performance View

Aggregated stats across all sub-orgs and agents.

**Metrics displayed:**

| Metric | Source | Presentation |
|--------|--------|--------------|
| Total conversations (period) | `agentSessions` count across all child orgs for current billing period | Number |
| Total messages handled | `agentSessionMessages` count for period | Number |
| Active clients | Count of child orgs with at least 1 active session in period | "X of Y clients active" |
| Contacts captured | New `crm_contact` objects created in period across child orgs | Number |
| Bookings made | Booking objects created in period (if booking app enabled) | Number (optional) |
| Credit usage | Sum of `creditTransactions` consumptions for period across parent + children | "X of Y credits used" |
| Top-performing agent | Agent with most sessions in period | Name + count |

**Time range selector:** This week / This month / Last 30 days / Last 90 days.

**Implementation:** This is a new query that aggregates existing data across child orgs. No new tables or schemas needed.

### 5.7 User-Accessible Mode Toggle

**Any user** within their org can switch between Easy Mode and Advanced Mode from the **user menu** (profile dropdown / settings). This is not locked to super-admin. The toggle is instant and non-destructive — switching to Advanced Mode reveals all apps and navigation; switching back to Easy Mode hides them again. No data is lost either way.

**Location:** User profile menu / settings dropdown — alongside existing items like "Account Settings", "Language", etc.

**UI element:** A toggle switch or segmented control:
- Label: "Interface Mode"
- Options: "Easy" / "Advanced"
- Default for new orgs: "Easy"
- On change: calls a mutation that patches `organizations.uiProfile`.

**Mutation:**

```typescript
// convex/organizations.ts (add to existing file — not super-admin gated)
export const setOrganizationUiProfile = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    uiProfile: v.union(v.literal("easy"), v.literal("advanced")),
  },
  handler: async (ctx, args) => {
    // Validate user has access to this org (standard org membership check)
    // Patch organization record
    await ctx.db.patch(args.organizationId, {
      uiProfile: args.uiProfile,
    });
  },
});
```

**Super-admin override:** The super-admin retains the ability to set `uiProfile` on any org via the existing super-admin org management panel. This is useful for white-glove setups where the super-admin configures an org before the user first logs in.

**Why user-accessible:** Business owners exploring the platform should be able to unlock Advanced Mode themselves when they're ready, without contacting support. This removes friction from the "aha moment" when a user realizes they need CRM, workflows, or other advanced features. It also means existing power users who get defaulted to Easy Mode on a new org can immediately switch.

### 5.8 Super-Admin: White-Glove Client Setup

**Location:** Add to super-admin org management, visible when viewing an org with sub-orgs or agency tier.

**"Setup Client" action flow:**

1. Super-admin clicks "Add Client for [Agency Name]".
2. Form fields:
   - Client business name (required).
   - Primary channel: Webchat / WhatsApp / Telegram (required, single select).
   - Agent template: dropdown of 3-5 pre-built templates (see 5.9) (required).
   - Agent display name (optional, defaults to client business name + " Assistant").
   - Brand color (optional hex, defaults to parent org branding).
3. On submit, the system executes these steps transactionally:
   a. `createChildOrganizationInternal()` with the agency as parent.
   b. Create an `agent_instance` object on the child org, populated from the selected template.
   c. Create the channel binding for the selected channel.
   d. Set up initial credit allocation from parent's credit pool.
4. Result: a fully deployed agent for the client, ready to receive messages.

**Implementation:** This is a new internal action that composes existing mutations. No new schemas. The action orchestrates: sub-org creation -> agent creation -> channel binding -> credit init.

### 5.9 Agent Templates

**Storage:** Agent template objects in the ontology (`type === "agent_template"`, `organizationId` = system org).

**Initial templates (3-5 for launch):**

| Template | Personality | Default Tools | Target Vertical |
|----------|-------------|---------------|-----------------|
| **Appointment Booker** | Professional, helpful. Guides customers to book appointments. | `create_booking`, `check_availability`, `create_contact` | Salons, clinics, trades |
| **Lead Qualifier** | Friendly, curious. Captures contact info and qualifies interest. | `create_contact`, `update_contact` | Real estate, consulting |
| **Customer Support** | Patient, knowledgeable. Answers FAQs and escalates complex issues. | `search_knowledge_base`, `create_escalation`, `create_contact` | Any B2C service |
| **Restaurant Host** | Warm, efficient. Handles reservations and menu questions. | `create_booking`, `search_knowledge_base`, `create_contact` | Restaurants, cafes |
| **General Assistant** | Balanced, adaptable. Handles inquiries and routes to human when needed. | `create_contact`, `search_knowledge_base`, `create_escalation` | Generic / catch-all |

Each template stores:
- `systemPrompt` -- base personality and instructions.
- `enabledTools` -- default tool set.
- `autonomyLevel` -- default to `"autonomous"` for agency use.
- `channelBindings` -- suggested channels.
- `faqEntries` -- starter FAQ placeholders.
- `knowledgeBaseTags` -- empty (agency customizes per client).

Templates are read-only. When deploying, the system copies template values into the new agent object (which is then editable per client).

---

## 6. Data Model Changes

### 6.1 Schema Change: `organizations` table

**File:** `convex/schemas/coreSchemas.ts`

Add one optional field:

```typescript
uiProfile: v.optional(v.union(
  v.literal("easy"),
  v.literal("advanced"),
)),
```

No index needed (this is read when the org is already loaded; no query-by-profile requirement).

### 6.2 New Object Type: `agent_template`

Stored in existing `objects` table with:
- `type: "agent_template"`
- `subtype: "appointment_booker" | "lead_qualifier" | "customer_support" | "restaurant_host" | "general_assistant"`
- `organizationId`: system org ID.
- `customProperties`: template configuration (systemPrompt, enabledTools, autonomyLevel, etc.).

No schema change needed -- the `objects` table already supports arbitrary types with `customProperties`.

### 6.3 No Other Schema Changes

Everything else uses existing tables and fields.

---

## 7. Frontend Components

### 7.1 New Components

| Component | Location | Description |
|-----------|----------|-------------|
| `AgencyDashboard` | `src/components/window-content/agency/agency-dashboard.tsx` | Top-level Easy Mode dashboard with summary cards |
| `AgencyClientList` | `src/components/window-content/agency/agency-client-list.tsx` | "My Clients" sub-org list with agent status |
| `AgencyClientCard` | `src/components/window-content/agency/agency-client-card.tsx` | Per-client card with stats and actions |
| `AgencyAgentList` | `src/components/window-content/agency/agency-agent-list.tsx` | "My Agents" cross-org agent view |
| `AgencyPerformance` | `src/components/window-content/agency/agency-performance.tsx` | Aggregated stats view |
| `AgencyStoreSummary` | `src/components/window-content/agency/agency-store-summary.tsx` | Simplified billing/plan view |
| `AddClientForm` | `src/components/window-content/agency/add-client-form.tsx` | Minimal client creation form |
| `SuperAdminWhiteGloveSetup` | `src/components/window-content/super-admin-organizations-window/manage-org/white-glove-setup.tsx` | Super-admin client setup wizard |

### 7.2 Modified Components

| Component | Change |
|-----------|--------|
| Nav composition layer (wherever nav items are assembled) | Add `uiProfile` filter using `EASY_MODE_ALLOWED_NAV_IDS` |
| `src/app/store/page.tsx` | Conditionally render `AgencyStoreSummary` vs existing store based on `uiProfile` |
| User menu / profile dropdown | Add "Interface Mode" toggle (Easy / Advanced) |
| Super-admin org management tabs | Add "UI Profile" override and "White-Glove Setup" action |

---

## 8. Backend Functions

### 8.1 New Queries

| Function | File | Purpose |
|----------|------|---------|
| `getAgencyDashboardStats` | `convex/api/v1/agencyDashboard.ts` | Aggregate client count, active agents, messages, contacts, credits for parent org |
| `getAgencyClientList` | Same file | List child orgs with agent status and recent activity per child |
| `getAgencyAgentList` | Same file | List all agents across parent + child orgs with session counts |
| `getAgencyPerformanceMetrics` | Same file | Time-range aggregated metrics across all child orgs |
| `getAgentTemplates` | Same file | List available agent templates from system org |

### 8.2 New Mutations

| Function | File | Purpose |
|----------|------|---------|
| `setOrganizationUiProfile` | `convex/licensing/superAdmin.ts` | Super-admin toggle for UI profile |
| `deployAgentFromTemplate` | `convex/api/v1/agencyDashboard.ts` | Copy template config into new agent object on a sub-org |
| `whiteGloveClientSetup` | `convex/api/v1/agencyDashboard.ts` | Compose: create sub-org + create agent from template + bind channel + init credits |

### 8.3 No Modified Backend Functions

Existing sub-org creation, agent creation, channel binding, credit sharing, and session management functions are used as-is.

---

## 9. New Signup Default Behavior

### Current Flow:
1. User signs up -> org created with `plan: "free"` (deprecated) and `organization_license` object for free tier.
2. User sees full platform nav.

### Updated Flow:
1. User signs up -> org created with `uiProfile: "easy"` and free tier license.
2. User sees Easy Mode nav (Dashboard, My Clients, My Agents, Performance, Plan & Billing, Settings).
3. Store shows simplified agency pricing: "Upgrade to Agency Plan - EUR 299/month".
4. If user needs full platform, they contact support or super-admin toggles them to `"advanced"`.

### Existing Orgs:
- No migration. `uiProfile` is `undefined`, resolves to `"advanced"`. Zero impact.

---

## 10. Acceptance Criteria

### P0 (Must have for first agency sale)

- [ ] `uiProfile` field added to organizations schema.
- [ ] New orgs default to `uiProfile: "easy"`.
- [ ] Easy Mode nav shows only: Dashboard, My Clients, My Agents, Performance, Plan & Billing, Settings.
- [ ] "My Clients" view lists sub-orgs with agent status indicators.
- [ ] "Add Client" creates a sub-org.
- [ ] Any org member can toggle `uiProfile` between `"easy"` and `"advanced"` from the user menu.
- [ ] Super-admin can override `uiProfile` on any org from the admin panel.
- [ ] Existing orgs are unaffected (uiProfile undefined = full platform).

### P1 (Needed for white-glove onboarding)

- [ ] Super-admin "White-Glove Setup" creates sub-org + agent + channel binding in one flow.
- [ ] 3+ agent templates seeded (Appointment Booker, Lead Qualifier, Customer Support).
- [ ] "Deploy agent from template" copies template config into new agent on sub-org.
- [ ] Agency store summary shows plan status, client slot usage, credit balance.

### P2 (Needed for self-serve scale)

- [ ] "My Agents" cross-org agent list with status and conversation counts.
- [ ] Performance view with aggregated metrics and time range selector.
- [ ] "Add Client Slot" triggers Stripe sub-org add-on purchase.
- [ ] Agent template selection available in agency "Add Client" flow (not just super-admin).

### P3 (Future, not in scope)

- [ ] Client performance reports (exportable PDF for agency to send to their clients).
- [ ] Agency-branded client portal (client can see their own agent stats).
- [ ] Agency-to-client billing integration (auto-invoice clients).
- [ ] Agent marketplace (community templates).

---

## 11. Implementation Sequence

### Week 1: Schema + Nav Filter
1. Add `uiProfile` field to `organizations` table in `coreSchemas.ts`.
2. Add `resolveUiProfile()` helper.
3. Implement nav filtering: define `EASY_MODE_ALLOWED_NAV_IDS`, apply filter in nav composition.
4. Set new org default to `"easy"`.
5. Add user-accessible mode toggle in user menu (Easy / Advanced).
6. Add super-admin override in org management panel.
7. Type-check and verify existing orgs are unaffected.

### Week 2: My Clients + Add Client
1. Build `AgencyClientList` and `AgencyClientCard` components.
2. Wire `getAgencyClientList` query (wraps existing `getChildOrganizationsInternal` + agent/session stats).
3. Build `AddClientForm` with sub-org creation.
4. Build `AgencyDashboard` as landing page for Easy Mode.

### Week 3: White-Glove + Templates
1. Seed 3-5 agent templates as `agent_template` objects.
2. Build `whiteGloveClientSetup` mutation (sub-org + agent + channel).
3. Build `SuperAdminWhiteGloveSetup` component.
4. Build `AgencyStoreSummary` for simplified plan/billing view.

### Week 4: Polish + First Agency
1. Build `AgencyAgentList` (cross-org agent view).
2. Build `AgencyPerformance` metrics view.
3. QA: verify Easy Mode end-to-end with a test org.
4. Onboard first agency in white-glove mode.

---

## 12. Per-Client Credit Usage Breakdown (Agency Extension to CSI Workstream)

### 12.1 Relationship to Credits System UI Workstream

The credits-system-user-support-interface workstream (CSI-001 through CSI-021) is actively building the core credit UI: top-right counter, bucket dropdown, redeem flow, referral modal, activity history, and support interface. Lanes A and B are complete. Lane C (CSI-007: top-right counter + dropdown) is READY and next to implement.

This section specifies an **agency-only extension** that layers on top of the CSI components. It does NOT modify the CSI architecture. It adds one new surface triggered by a button visible only to orgs that have sub-orgs.

### 12.2 Existing Data (No Backend Changes Needed)

Every credit consumption already records child org attribution in `creditTransactions`:

```typescript
// From convex/schemas/creditSchemas.ts -- already live
creditTransactions {
  organizationId: Id<"organizations">      // Parent (agency) org
  childOrganizationId?: Id<"organizations"> // Which client sub-org triggered this
  deductedFromParentId?: Id<"organizations"> // Confirms parent-fallback path was used
  amount: number                            // Credits consumed (negative for consumption)
  reason: string                            // Immutable reason taxonomy
  timestamp: number
  // ... other fields
}
```

The `childOrganizationId` field on `creditTransactions` is the complete data source. No new fields, tables, or indexes are required.

### 12.3 Trigger: "Client Usage" Button

**Visibility rule:** The button appears **only** when the current organization has at least one child sub-org (query: `organizations` where `parentOrganizationId === currentOrgId` returns >= 1 result).

**Placement options (pick one during implementation):**

1. **Inside CreditsDropdown** (preferred): Below the bucket breakdown in the CSI dropdown, a row: `"📊 Client Usage Breakdown"` button. Tapping opens the modal. This integrates naturally with the credit UI the user is already looking at.
2. **In Agency Dashboard**: A "Credit Usage by Client" card in the Easy Mode dashboard view.
3. **Both**: Button in dropdown + card in dashboard. Dashboard card shows summary; dropdown button opens full modal.

Recommendation: Option 3. The dropdown button catches users already checking their balance. The dashboard card gives agencies a persistent overview.

### 12.4 Per-Client Usage Modal

**Modal title:** "Credit Usage by Client"

**Time range selector** (top of modal): This billing period (default) | Last 30 days | Last 90 days | All time

**Content: Client usage table**

| Column | Source | Notes |
|--------|--------|-------|
| Client | `organizations.name` where `_id === childOrganizationId` | Link to client detail |
| Credits Used | `SUM(ABS(amount))` from `creditTransactions` where `childOrganizationId === clientId` and `amount < 0` in selected time range | Integer display |
| % of Total | Calculated: client credits / total agency credits consumed | Percentage with bar chart |
| Conversations | Count of `agentSessions` for `organizationId === clientId` in time range | Context metric |
| Last Activity | Most recent `creditTransactions.timestamp` for this client | Relative time ("2h ago") |

**Summary row** (top or bottom):
- Total credits consumed across all clients in period.
- Credits remaining: current balance from `creditBalances`.
- Credits renew on: next billing period date.

**Empty state:** "No client usage yet. Deploy an agent for a client to start tracking usage."

**Sort:** Default by "Credits Used" descending. Columns sortable.

### 12.5 Dashboard Summary Card (Agency Dashboard)

A compact card in the Easy Mode dashboard showing:

```
┌─────────────────────────────────────┐
│ 📊 Credit Usage This Month          │
│                                     │
│  1,247 / 2,000 credits used         │
│  ████████████░░░░░░░░  62%          │
│                                     │
│  Top client: Smile Dental (412)     │
│  Active clients: 8 of 12            │
│                                     │
│  [View Breakdown →]                 │
└─────────────────────────────────────┘
```

"View Breakdown" opens the same modal as the dropdown button.

### 12.6 New Query

```typescript
// convex/api/v1/agencyDashboard.ts (add to agency dashboard queries)

/**
 * Get per-client credit usage breakdown for an agency (parent) org.
 * Returns consumption aggregated by child org for a given time range.
 */
export const getAgencyClientCreditUsage = query({
  args: {
    organizationId: v.id("organizations"),
    periodStart: v.number(),   // Unix timestamp
    periodEnd: v.number(),     // Unix timestamp
  },
  handler: async (ctx, args) => {
    // 1. Verify caller has access to this org
    // 2. Query creditTransactions where:
    //    - organizationId === args.organizationId (parent)
    //    - amount < 0 (consumption only)
    //    - timestamp >= periodStart AND <= periodEnd
    // 3. Group by childOrganizationId
    // 4. For each group: sum amount, count transactions, get max timestamp
    // 5. Join with organizations table for client names
    // 6. Join with agentSessions count per child org in period
    // 7. Return sorted by total consumption descending
  },
});
```

### 12.7 New Frontend Components

| Component | Location | Description |
|-----------|----------|-------------|
| `AgencyClientUsageModal` | `src/components/window-content/agency/agency-client-usage-modal.tsx` | Full modal with table, time range, and summary |
| `AgencyClientUsageRow` | Same directory | Per-client row with usage bar |
| `AgencyUsageSummaryCard` | `src/components/window-content/agency/agency-usage-summary-card.tsx` | Dashboard compact card |
| `ClientUsageButton` | Inline in CreditsDropdown | Conditionally rendered button (visible when org has sub-orgs) |

### 12.8 Integration with CSI Components

This extension touches the CSI component tree at exactly one point:

**In CreditsDropdown** (being built in CSI-007/CSI-008): Add a conditional row after the bucket breakdown:

```tsx
{hasSubOrgs && (
  <DropdownItem
    icon={<BarChart3 />}
    label="Client Usage Breakdown"
    onClick={() => setClientUsageModalOpen(true)}
  />
)}
```

The `hasSubOrgs` boolean comes from a lightweight query: does the current org have any child orgs? This query can piggyback on the existing org context that's already loaded.

No other CSI components are modified.

### 12.9 Implementation Timing

This feature should be built **after CSI-007 and CSI-008 are complete** (credits counter + dropdown are live). It depends on the dropdown existing as a mount point for the button.

Suggested sequencing:
1. CSI-007: Build credits counter + dropdown (CSI workstream, already READY).
2. CSI-008: Wire dropdown actions to modal flows (CSI workstream).
3. **Agency client usage:** Build `AgencyClientUsageModal`, `AgencyUsageSummaryCard`, and the conditional dropdown button.
4. CSI-009: Activity history panel (CSI workstream, can proceed in parallel with step 3).

Estimated effort for step 3: 2-3 days. The query is straightforward aggregation over existing indexed data. The modal is a standard table component.

---

## 13. Super-Admin Metrics Dashboard ("Know Your Numbers")

### 13.1 Purpose

The owner needs a single view — accessible from the existing super-admin Organizations Window — that surfaces every metric needed to run the business week-over-week. This is the operational nerve center: MRR movement, pipeline health, conversion funnel, per-agency credit consumption, and churn signals. If a number is turning red, the owner knows before the customer does.

### 13.2 Existing Infrastructure Leveraged

The super-admin window already has 9 tabs. This adds a 10th: **"Platform Pulse"**.

| Existing asset | What we reuse |
|---|---|
| `getLicenseStats()` in `convex/licensing/superAdmin.ts` | Org count by tier, trial count |
| `getCreditRedemptionCodeAnalytics()` in `convex/credits/index.ts` | Total credits redeemed, code effectiveness |
| `listOrganizationLicenses()` in `convex/licensing/superAdmin.ts` | Full license list with creation dates for cohort analysis |
| `creditTransactions` table | Consumption aggregation per org/period |
| `agentSessions` / `agentSessionMessages` tables | Activity volume per org |
| Stripe webhook data (subscription events) | MRR calculation anchor |
| `organizations` table with `by_parent` index | Agency-to-client mapping |

### 13.3 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏢 Platform Pulse — Week of Feb 17, 2026          [← Prev] [Next →] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐│
│  │ MRR          │  │ Pipeline     │  │ Conversion   │  │ Active   ││
│  │ €2,485       │  │ €4,200       │  │ 18%          │  │ Agencies ││
│  │ ▲ +€299      │  │ 6 prospects  │  │ 3 of 17 conv │  │ 5 of 7  ││
│  │ vs last week │  │ 2 hot        │  │ vs last mo   │  │ this wk  ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘│
│                                                                     │
│  ── Per-Agency Health ──────────────────────────────────────────────│
│                                                                     │
│  │ Agency              │ MRR    │ Credits │ Clients │ Activity │ ⚠ ││
│  │ Bright Spark Agency │ €457   │ 1847/2k │ 4       │ ████████ │   ││
│  │ Digital First Co    │ €378   │ 923/2k  │ 2       │ ████░░░░ │   ││
│  │ NovaMind Marketing  │ €299   │ 412/2k  │ 1       │ █░░░░░░░ │ ⚠ ││
│  │ ... more rows       │        │         │         │          │   ││
│                                                                     │
│  ── Churn Signals ──────────────────────────────────────────────────│
│                                                                     │
│  🔴 NovaMind Marketing — 0 agent sessions in 7 days (was 23/week)  │
│  🟡 Creative Labs — credit usage dropped 60% week-over-week        │
│  🟡 Trial: Agency Starter — trial expires in 3 days, no deployment │
│                                                                     │
│  ── Weekly Trend ───────────────────────────────────────────────────│
│                                                                     │
│  MRR sparkline (last 12 weeks):  ▁▂▂▃▃▃▅▅▅▆▇█                     │
│  Active agencies (last 12 wks):  ▁▁▂▂▃▃▃▄▅▅▆▇                     │
│  Credit consumption (last 12):   ▂▃▃▅▅▆▇▇█████                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.4 Metric Definitions

#### Top-Line KPIs (4 cards)

| Card | Metric | Source | Calculation |
|------|--------|--------|-------------|
| **MRR** | Monthly Recurring Revenue | `organization_license` records with active Stripe subscriptions | Sum of: (agency tier base × agency count) + (sub-org add-ons × count) + (pro tier × pro count) + (enterprise custom). Show delta vs previous week. |
| **Pipeline** | Prospective revenue in funnel | Platform org CRM sales pipeline via `getPlatformOrgId()` + `getOrganizationPipelineSummary()` (see 13.6) | Sum of expected tier price × contacts in pre-close stages. Count of contacts per stage. |
| **Conversion** | Trial-to-paid conversion rate | `organization_license` records | Count of orgs that moved from free/trial to paid in period ÷ total free/trial orgs at period start. Rolling 30-day window. |
| **Active Agencies** | Agencies with agent activity this week | `agentSessions` joined to agency-profile orgs | Count of agency-mode orgs with ≥1 agent session in last 7 days. Show "X of Y" where Y = total agency orgs. |

#### Per-Agency Health Table

| Column | Source | Notes |
|--------|--------|-------|
| Agency name | `organizations.name` where `uiProfile === "easy"` and has active license | Linked to org detail |
| MRR | License tier base + (sub-org count × €149) | Calculated from license + child org count |
| Credits | `creditTransactions` consumption in current billing period vs monthly allocation | Show as used/total with color coding: green <70%, yellow 70-90%, red >90% |
| Clients | Count of child orgs | Integer |
| Activity | `agentSessions` count in last 7 days | Sparkline or bar, scaled relative to that agency's own 4-week average |
| ⚠ Flag | Churn signal indicator | Red dot if any churn signal active (see 13.5) |

#### Churn Signals Engine

### 13.5 Churn Signal Definitions

| Signal | Severity | Trigger | Action |
|--------|----------|---------|--------|
| **Session drop-off** | 🔴 Critical | Agency's 7-day session count is <20% of their 4-week rolling average | Surface in churn panel. Owner initiates personal outreach. |
| **Credit usage cliff** | 🟡 Warning | Week-over-week credit consumption drops >50% | Surface in churn panel. May indicate agent was disabled or client lost. |
| **Trial expiry approaching** | 🟡 Warning | Trial org with <5 days remaining and 0 deployed agents | Surface in churn panel. Owner offers white-glove setup. |
| **No deployment** | 🟡 Warning | Agency has been on paid tier >14 days with 0 child orgs | Surface in churn panel. Owner offers onboarding call. |
| **Payment failure** | 🔴 Critical | Stripe `invoice.payment_failed` webhook for this org | Surface in churn panel + separate Stripe dashboard. |

Churn signals are **computed at query time** from existing data — no background jobs or new event systems needed. The query checks each rule against real-time data when the dashboard loads.

### 13.6 Pipeline Data: Platform Org CRM (Zero New Schema)

The platform org is already identified via the `PLATFORM_ORG_ID` environment variable (different values for dev and prod), with an established helper:

```typescript
// Already exists in convex/onboarding/telegramResolver.ts (and 7+ other files)
function getPlatformOrgId(): Id<"organizations"> {
  const id = process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
  if (!id) throw new Error("PLATFORM_ORG_ID or TEST_ORG_ID must be set");
  return id as Id<"organizations">;
}
```

This org already owns a full CRM with pipeline support. Agency prospects are tracked as **CRM contacts in the platform org's own sales pipeline** — the same pipeline UI every org gets.

**How it works (already built):**

1. Each agency prospect is a `crm_contact` object on the platform org (subtype: `"prospect"` or `"lead"`).
2. The platform org has a sales pipeline (`crm_pipeline` object) with configurable stages (e.g., Lead → Demo Scheduled → Trial Active → Negotiating → Won → Lost → Churned).
3. Contacts move through stages via the existing pipeline UI or AI-assisted `aiMoveContactToStage()`.
4. `getOrganizationPipelineSummary()` in `convex/crmOrganizationPipelines.ts` already returns per-stage contact counts.
5. `getPipelineWithStagesAndContacts()` in `convex/crmPipeline.ts` returns the full pipeline with contacts grouped by stage.

**The hotwire:** Platform Pulse calls `getPlatformOrgId()` and passes it to the existing CRM pipeline queries. That's the entire integration — one function call to get the org ID, then standard CRM reads.

**What Platform Pulse queries:**

The Pipeline KPI card calls `getOrganizationPipelineSummary()` scoped to `getPlatformOrgId()`. It multiplies contact count per stage × expected tier price (stored as a tag or custom property on the contact, e.g., `expectedTierPrice: 299`).

**What this means:**

- **No new schema fields.** No `pipelineStage` on organizations.
- **No new mutations.** Pipeline management uses the existing CRM pipeline UI.
- **No new components for pipeline management.** The owner manages prospects in the platform org's CRM view — the same UI every org gets.
- **Platform Pulse just reads.** The dashboard's Pipeline card is a read-only aggregation over the platform org's existing pipeline data.
- **Dev/prod safe.** `PLATFORM_ORG_ID` resolves to the correct org per environment. `TEST_ORG_ID` fallback for local dev.

**Linking contacts to orgs (optional enrichment):**

When a prospect converts (creates an org and subscribes), the CRM contact can be linked to the new organization via `linkedOrganizationId` or an `objectLink` with `linkType="represents_org"`. This closes the loop — you can click from Platform Pulse's Agency Health table into the CRM contact record and see the full prospect-to-customer journey.

### 13.7 New Backend Query

```typescript
// convex/licensing/superAdmin.ts (add to existing file)

import { getPlatformOrgId } from "../onboarding/telegramResolver"; // or extract to shared util

/**
 * Platform Pulse dashboard data.
 * Super-admin only. Returns all metrics for the weekly dashboard.
 *
 * The "hotwire": uses PLATFORM_ORG_ID env var to read the platform org's
 * own CRM pipeline for sales data. Different ID per environment (dev/prod).
 */
export const getPlatformPulse = query({
  args: {
    sessionId: v.string(),
    weekStart: v.number(),   // Unix timestamp, Monday 00:00
    weekEnd: v.number(),     // Unix timestamp, Sunday 23:59
  },
  handler: async (ctx, args) => {
    // 1. Validate super-admin session

    // 2. Get platform org ID (env-aware: PLATFORM_ORG_ID || TEST_ORG_ID)
    const platformOrgId = getPlatformOrgId();

    // 3. MRR: aggregate active licenses × tier pricing across all orgs
    // 4. Pipeline: getOrganizationPipelineSummary(ctx, platformOrgId)
    //    → reads the platform org's own CRM pipeline for prospect/deal data
    // 5. Conversion: count tier upgrades in rolling 30-day window
    // 6. Active agencies: count agency-mode orgs with sessions in [weekStart, weekEnd]
    // 7. Per-agency health: for each agency org, compute MRR, credits, clients, activity
    // 8. Churn signals: evaluate each signal rule against real-time data
    // 9. Trends: 12-week rolling MRR, active agencies, credit consumption
    // Return structured payload
  },
});
```

No new mutations needed. Pipeline management uses the existing CRM pipeline UI on the platform org. The only "hotwire" is calling `getPlatformOrgId()` to scope the CRM queries to the right org per environment.

### 13.8 New Frontend Components

| Component | Location | Description |
|-----------|----------|-------------|
| `PlatformPulseTab` | `src/components/window-content/super-admin-organizations-window/platform-pulse-tab.tsx` | New tab in super-admin Organizations Window |
| `PulseKpiCards` | Same directory or subfolder | 4 top-line KPI cards with delta indicators |
| `AgencyHealthTable` | Same | Sortable table with per-agency metrics |
| `ChurnSignalsPanel` | Same | Severity-sorted list of active churn signals |
| `WeeklyTrendSparklines` | Same | 12-week sparkline charts for MRR, agencies, credits |

Pipeline management is handled entirely in the platform org's existing CRM pipeline UI — no new pipeline components needed for Platform Pulse.

### 13.9 Integration Point

**Add as Tab 10 in the super-admin Organizations Window:**

```typescript
// In super-admin-organizations-window/index.tsx
// Add to existing tabs array:
{
  id: "platform-pulse",
  label: "Platform Pulse",
  icon: <Activity />,
  component: <PlatformPulseTab />,
}
```

This is a single insertion into the existing tab array. No restructuring of the window needed.

### 13.10 Implementation Sequence

| Step | Task | Effort | Depends On |
|------|------|--------|------------|
| 1 | Set up sales pipeline in platform org CRM (stages: Lead → Demo → Trial → Negotiating → Won → Lost → Churned) | 15 min | Nothing (manual config via existing UI) |
| 2 | Build `getPlatformPulse` query (MRR + pipeline summary from platform org CRM via `getPlatformOrgId()` + active agencies + credits) | 1 day | Step 1 |
| 3 | Build `PulseKpiCards` + `AgencyHealthTable` components | 1 day | Step 2 |
| 4 | Build churn signal evaluation logic in query | 0.5 day | Step 2 |
| 5 | Build `ChurnSignalsPanel` component | 0.5 day | Step 4 |
| 6 | Build `WeeklyTrendSparklines` (12-week rolling) | 0.5 day | Step 2 |
| 7 | Wire `PlatformPulseTab` into super-admin window | 30 min | Steps 3, 5, 6 |

**Total estimated effort: ~4 days** (no schema changes needed)

### 13.11 Acceptance Criteria

- [ ] "Platform Pulse" tab appears in super-admin Organizations Window.
- [ ] MRR card shows current total with week-over-week delta.
- [ ] Pipeline card reads from platform org's CRM sales pipeline via `getPlatformOrgId()` and shows prospect count and total prospective value.
- [ ] Conversion card shows rolling 30-day trial-to-paid rate.
- [ ] Active Agencies card shows "X of Y active this week".
- [ ] Per-agency health table lists all agency-mode orgs with MRR, credits, clients, activity.
- [ ] Churn signals panel surfaces critical/warning signals sorted by severity.
- [ ] 12-week sparklines render for MRR, active agencies, and credit consumption.
- [ ] Dashboard loads in under 2 seconds for up to 100 agency orgs.
- [ ] Non-super-admin users cannot access the Platform Pulse tab.

---

## 14. Weekly Accountability Scorecard — "The Sunday Night Mirror"

### 14.1 Purpose

Platform Pulse (Section 13) answers "how is the business doing?" The Sunday Night Mirror answers **"did I do the work?"**

Solo founders have no external accountability mechanism. No board meetings, no investors asking for updates, no sales manager reviewing pipeline. Without a structured weekly ritual, it's easy to spend entire weeks building features (comfortable) instead of selling dream teams (uncomfortable).

This is not an analytics dashboard. It is a **personal accountability system.** Every Sunday night, the owner opens this tool, fills in the numbers, and confronts the truth: did I do the work this week, or didn't I?

Inspired by ElevenLabs' approach: the CEO personally reviews every sales rep's pipeline weekly. Since you are both the CEO and the only sales rep, this tool calls YOU out.

### 14.2 Location

**Tab 11** in the super-admin Organizations Window (alongside Platform Pulse at Tab 10).

Platform Pulse is an observatory — real-time business metrics, read-only. The Mirror is a confessional — manual weekly entry, immutable once submitted. Different cadence, different purpose, separate tab.

### 14.3 Core Metrics Tracked

10 weekly metrics split into three categories:

#### Sales Discipline — "Did I Do the Work?"

| Metric | Target | Input Type | Red Flag Threshold |
|--------|--------|------------|-------------------|
| Discovery conversations this week | ≥5 | Manual entry (integer) | <3 |
| Proposals / pitches sent | ≥1 | Manual entry (integer) | 0 for 2+ consecutive weeks |
| Outbound outreaches sent | ≥20 | Manual entry (integer) | <10 |
| Agency conversations (after month 3) | ≥2 | Manual entry (integer) | 0 after month 4 |

#### Revenue Health — "Is Money Coming In?"

| Metric | Source | Input Type | Red Flag Threshold |
|--------|--------|------------|-------------------|
| Current MRR | Stripe subscription data | Auto-populated + manual override | Flat or declining for 3+ weeks |
| Pipeline value (weighted) | Platform org CRM pipeline | Auto-populated from `getPlatformOrgId()` + `getOrganizationPipelineSummary()` | Below 3× quarterly target |
| Deal close rate (trailing 30 days) | Proposals sent vs deals closed | Auto-calculated from scorecard history | Below 20% |

#### Delivery Quality — "Are Clients Succeeding?"

| Metric | Source | Input Type | Red Flag Threshold |
|--------|--------|------------|-------------------|
| Active dream teams in delivery | Sub-org count with active agents | Auto-populated | 0 after month 3 |
| Client optimization calls completed | Calendar/manual | Manual entry (integer) | Missed call for any active client |
| Case studies in progress / completed | Manual | Manual entry (integer) | <1 completed after month 4 |

### 14.4 UI Specification

#### The Weekly Scorecard

Single-page scorecard with three sections matching the metric categories. Each metric row contains:
- Metric name
- This week's value (editable input for manual fields, pre-filled for auto fields)
- Target
- Status indicator (green ✅ / amber ⚠️ / red ❌)
- 4-week sparkline trend

#### Status Logic

| Status | Visual | Condition |
|--------|--------|-----------|
| On Track | Green circle / check | Met or exceeded target |
| Warning | Amber triangle | Below target but above red flag threshold |
| Red Flag | Red X with pulse animation | At or below red flag threshold |
| Not Entered | Grey dash | No value submitted for this week |

#### The Accountability Banner

Dynamic banner at the top of the scorecard:

| Score | Banner Message | Color |
|-------|---------------|-------|
| 10/10 green | "You did the work. The $50M is closer." | Green |
| 7-9 green | "Good week. Fix the gaps before Monday." | Amber |
| 4-6 green | "You're slipping. What did you spend your hours on?" | Orange |
| 0-3 green | "This was not a $50M week. Be honest about why." | Red |

#### Weekly Submission Flow

1. Every Sunday (configurable), a system notification reminds the super admin to complete the scorecard.
2. Admin opens the widget, fills in manual values (auto-populated fields pre-filled from platform data).
3. Reviews status indicators and accountability banner.
4. Clicks "Submit Week."
5. **Submission is timestamped and immutable — no editing past weeks.** This prevents retroactive justification.

#### History View

Toggle from "This Week" to "History" showing a scrollable table of all past scorecards. Each row shows: week ending date, overall score (X/10 green), MRR at that point, pipeline value, and discovery calls. Clicking a row expands to the full scorecard.

### 14.5 Data Model

#### New Table: `weeklyAccountability`

```typescript
// convex/schemas/ (new table definition)
weeklyAccountability: defineTable({
  weekEnding: v.string(),                    // ISO date string (Sunday)
  organizationId: v.id("organizations"),     // Always platform org
  submittedAt: v.number(),                   // Timestamp
  submittedBy: v.id("users"),               // Always super admin

  // Sales Discipline
  discoveryConversations: v.number(),
  proposalsSent: v.number(),
  outboundOutreaches: v.number(),
  agencyConversations: v.number(),

  // Revenue Health
  currentMRR: v.number(),                    // EUR cents, auto + manual override
  pipelineValue: v.number(),                 // EUR cents, auto from platform org CRM
  dealCloseRate: v.number(),                 // Percentage, auto-calculated

  // Delivery Quality
  activeDreamTeams: v.number(),              // Auto from active sub-org count
  clientCallsCompleted: v.number(),
  caseStudiesProgress: v.number(),

  // Calculated
  overallScore: v.number(),                  // 0-10: count of green metrics
  bannerTier: v.union(
    v.literal("green"),
    v.literal("amber"),
    v.literal("orange"),
    v.literal("red"),
  ),

  // Optional
  notes: v.optional(v.string()),             // Blockers, reflections, commitments
})
  .index("by_weekEnding", ["weekEnding"])
  .index("by_organization", ["organizationId"]),
```

#### Auto-Population Sources

| Field | Source | Query |
|-------|--------|-------|
| `currentMRR` | Stripe subscriptions via existing billing infrastructure | Sum of active subscription MRR from license + Stripe data |
| `pipelineValue` | Platform org CRM pipeline | `getOrganizationPipelineSummary()` scoped to `getPlatformOrgId()` — sum of contacts × stage-weighted tier price |
| `dealCloseRate` | `weeklyAccountability` history | Count of weeks where `proposalsSent > 0` followed by `activeDreamTeams` increase ÷ total proposals trailing 30d |
| `activeDreamTeams` | `organizations` table | Count of child orgs where `parentOrganizationId` is any agency org AND `isActive === true` AND has agent with recent session |

### 14.6 Backend Functions

```typescript
// convex/licensing/superAdmin.ts (add to existing file)

/**
 * Submit weekly accountability scorecard.
 * Super-admin only. Rejects if entry already exists for this weekEnding.
 * Calculates overallScore and bannerTier from metric values vs targets.
 */
export const submitWeeklyScorecard = mutation({
  args: {
    sessionId: v.string(),
    weekEnding: v.string(),           // ISO date (Sunday)
    discoveryConversations: v.number(),
    proposalsSent: v.number(),
    outboundOutreaches: v.number(),
    agencyConversations: v.number(),
    currentMRR: v.number(),           // Override if auto-populated value needs correction
    pipelineValue: v.number(),
    clientCallsCompleted: v.number(),
    caseStudiesProgress: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Validate super-admin session
    // 2. Check no existing entry for this weekEnding
    // 3. Auto-calculate: dealCloseRate, activeDreamTeams
    // 4. Evaluate each metric against targets → count greens → overallScore
    // 5. Derive bannerTier from overallScore
    // 6. Insert into weeklyAccountability (immutable)
  },
});

/**
 * Get current week's scorecard or blank template with auto-populated fields.
 */
export const getThisWeekScorecard = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // 1. Validate super-admin
    // 2. Calculate weekEnding (current Sunday)
    // 3. Check if submitted → return full scorecard
    // 4. If not → return template with auto-populated:
    //    currentMRR (from Stripe), pipelineValue (from platform org CRM),
    //    dealCloseRate (from history), activeDreamTeams (from org count)
  },
});

/**
 * Paginated history of all past scorecards.
 */
export const getScorecardHistory = query({
  args: {
    sessionId: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),     // Default 10
  },
  handler: async (ctx, args) => {
    // Return scorecards ordered by weekEnding desc, paginated
  },
});

/**
 * Returns auto-populated metrics for pre-filling the scorecard.
 * Called when rendering a blank scorecard (not yet submitted for this week).
 */
export const getAutoPopulatedMetrics = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // 1. Validate super-admin
    // 2. currentMRR: sum active subscriptions from Stripe/license data
    // 3. pipelineValue: getOrganizationPipelineSummary(ctx, getPlatformOrgId())
    // 4. dealCloseRate: trailing 30d from weeklyAccountability history
    // 5. activeDreamTeams: count active sub-orgs with deployed agents
    // Return { currentMRR, pipelineValue, dealCloseRate, activeDreamTeams }
  },
});
```

### 14.7 Sunday Notification

A scheduled Convex cron runs every Sunday at 18:00 UTC. If no scorecard exists for the current `weekEnding`, it triggers:
- In-app banner on the super-admin dashboard: "Your weekly scorecard is due."
- Optional: Telegram notification via existing platform agent channel (the platform already sends admin notifications via Telegram).

### 14.8 New Frontend Components

| Component | Location | Description |
|-----------|----------|-------------|
| `SundayNightMirrorTab` | `src/components/window-content/super-admin-organizations-window/sunday-night-mirror-tab.tsx` | Tab 11 in super-admin window. Contains scorecard form + history toggle. |
| `AccountabilityBanner` | Same directory | Dynamic banner: message + color per overall score tier |
| `MetricRow` | Same directory | Single metric: label, input, target, `StatusIndicator`, `SparklineTrend` |
| `StatusIndicator` | Same directory | Green/amber/red/grey visual based on value vs target vs threshold |
| `SparklineTrend` | Same directory | 4-week inline SVG sparkline |
| `ScorecardHistory` | Same directory | Expandable table of past weeks |
| `SubmitButton` | Same directory | Disabled until all manual fields filled. Confirmation modal. Post-submit: immutable. |

### 14.9 Integration Point

**Add as Tab 11 in the super-admin Organizations Window:**

```typescript
// In super-admin-organizations-window/index.tsx
// Add to existing tabs array (after Platform Pulse):
{
  id: "sunday-mirror",
  label: "Weekly Mirror",
  icon: <Target />,
  component: <SundayNightMirrorTab />,
}
```

### 14.10 Implementation Sequence

| Phase | Work | Effort | Priority |
|-------|------|--------|----------|
| Phase 1 | `weeklyAccountability` table + indexes in Convex schema | 2-3 hours | P0 |
| Phase 2 | `submitWeeklyScorecard`, `getThisWeekScorecard`, `getScorecardHistory` backend functions | 4-6 hours | P0 |
| Phase 3 | Auto-population query: MRR from Stripe, `activeDreamTeams` from orgs, `pipelineValue` from platform org CRM | 3-4 hours | P0 |
| Phase 4 | `SundayNightMirrorTab` + `MetricRow` + `StatusIndicator` + `AccountabilityBanner` components | 6-8 hours | P0 |
| Phase 5 | `SparklineTrend` + `ScorecardHistory` + history toggle | 4-6 hours | P1 |
| Phase 6 | Sunday notification cron (Telegram + in-app) | 1-2 hours | P1 |
| Phase 7 | Polish: animations, responsive layout, export to PDF | 3-4 hours | P2 |

**Total estimated effort: 23-33 hours across 1-2 weeks.**

Phase 1-4 (P0) delivers a functional scorecard in ~15-21 hours. **Ship this first and use it immediately.** Phases 5-7 add polish after the core is working.

### 14.11 Acceptance Criteria

- [ ] "Weekly Mirror" tab appears in super-admin Organizations Window (Tab 11, after Platform Pulse).
- [ ] Scorecard displays 10 metrics across 3 categories with targets and status indicators.
- [ ] Auto-populated fields (MRR, pipeline value, active dream teams, close rate) pre-fill from live data.
- [ ] Manual fields accept integer input.
- [ ] Accountability banner displays correct message and color based on overall score.
- [ ] "Submit Week" creates immutable entry — no editing past weeks.
- [ ] Duplicate submission for same `weekEnding` is rejected.
- [ ] History view shows all past scorecards, expandable.
- [ ] 4-week sparkline trends render for each metric.
- [ ] Sunday notification fires if scorecard not yet submitted.
- [ ] Only `platform_soul_admin` can access the tab.

### 14.12 Build Sequencing Note

**Build the Sunday Night Mirror before everything else in this PRD.** It takes one weekend (15-21 hours for P0). Then use it every Sunday to hold yourself accountable for the week's sales activity. The tool is the mirror. The work happens Monday through Friday.

> *"Do not build this tool instead of selling. Build it in one weekend, then use it every Sunday to hold yourself accountable for the week's sales activity."*

---

## 15. Agency Wholesale Licensing Model

### 15.1 Rationale

The original pricing (€299/mo base + €79/mo per sub-org) captured ~6.5% of the value created when agencies sell €15K-50K dream teams on the platform. The revised model uses **wholesale licensing** — not revenue share. There is NO revenue share. NO audits. NO percentage of agency revenue. Agencies buy dream team licenses at wholesale, sell at retail, and keep the full difference.

This is simpler, cleaner, and more attractive to agencies. They know their costs upfront. No tracking, no reporting, no trust issues.

### 15.2 Wholesale Licensing Structure

| Component | Previous Price | Current Price | Rationale |
|-----------|---------------|--------------|-----------|
| Agency platform fee | €299/month | €299/month (unchanged) | Low barrier to entry for the agency channel |
| Per-client org | €79/month | €149/month | Reflects real value: agents handling real conversations for clients paying €15K+ |
| Dream team wholesale license (one-time) | None | €2,500 / €5,000 / €8,500 per license (Starter / A-Team / Dream Team) | Fixed wholesale pricing. Agency buys at wholesale, sells at retail, keeps the difference. |
| Credit consumption | Usage-based | Usage-based (unchanged) | Scales naturally with agent volume |

**Volume discounts on wholesale licenses:**
- 5-pack: 10% off
- 10-pack: 20% off
- 25-pack: 30% off

### 15.3 Revenue Impact Comparison

**Scenario: 1 Agency, 10 Clients/Year, €20K Average Dream Team Deal**

| Revenue Stream | Old Model | Current Model (Wholesale) |
|---------------|-----------|--------------------------|
| Agency platform fee (annual) | €3,588 | €3,588 |
| Per-client org fees (annual, 10 clients) | €9,480 | €17,880 |
| Wholesale license revenue (10 × €5,000 A-Team) | €0 | €50,000 |
| **Total annual revenue per agency** | **€13,068** | **€71,468** |
| Agency's gross revenue (10 × €20K) | €200,000 | €200,000 |
| **L4YERCAK3 value capture rate** | **6.5%** | **35.7%** |

### 15.4 Scaling the Math

| Agency Count (10 clients each/year) | Annual Revenue (Old) | Annual Revenue (Wholesale) |
|-------------------------------------|---------------------|---------------------------|
| 5 agencies | ~€65K | ~€357K |
| 15 agencies | ~€196K | ~€1.07M |
| 50 agencies | ~€653K | ~€3.6M |
| 100 agencies | ~€1.3M | **~€7.1M** (strong exit territory at 10-12×) |

At wholesale pricing, 100 agencies each serving 10 clients/year puts you at €7.1M ARR. At the volume discount tier (10-pack at €4,000/license), it's still ~€5.7M ARR — comfortably in $50M exit territory.

### 15.5 Why Agencies Still Pay This

An agency selling a €20K dream team pays €5,000 wholesale (A-Team license). No revenue share. No audits. They keep €15,000 on the setup.

Plus they charge their own monthly management retainer on top of the €149/client platform fee.

**Agency doing 10 A-Team deployments/year:**
- Gross revenue: €200K
- Wholesale licenses: -€50K (or -€40K at 10-pack discount)
- Platform fee: -€3.6K
- Client org fees: -€17.9K
- **Net profit: €128.5K+** (64%+ margin at standard wholesale, 70%+ with volume discount)

Nobody walks away from that margin. And the simplicity is the key — agencies know exactly what they pay, no tracking or auditing required.

### 15.6 Stripe Configuration Changes

| Item | Current | New |
|------|---------|-----|
| `STRIPE_SUB_ORG_MO_PRICE_ID` | €79/mo | Create new price: €149/mo |
| Wholesale license products | Not implemented | 3 new Stripe products: Starter License (€2,500), A-Team License (€5,000), Dream Team License (€8,500) |
| Volume discount coupons | Not implemented | Stripe coupons: 10% (5-pack), 20% (10-pack), 30% (25-pack) |
| Agency partner agreement | Not implemented | Manual agreement until volume justifies automation |

Wholesale licenses are one-time Stripe payments. No recurring billing to track. Agency buys license → gets a dream team deployment slot → deploys for their client.

---

## 16. Agency Partner Program

### 16.1 Purpose

Agencies are the primary distribution channel for dream team deployments. Not every agency using the platform is a "partner" — a partner is an agency that has been qualified, onboarded, and granted access to wholesale pricing, co-delivery support, and the partner ecosystem. This section specifies the partner flag on organizations, the partner dashboard, and the full partner lifecycle.

### 16.2 New Field: `partnerTier` on Organizations

**Location:** `convex/schemas/coreSchemas.ts`, `organizations` table.

```typescript
partnerTier: v.optional(v.union(
  v.literal("founding"),    // First 10 partners — 80% off first 3 licenses, 24-month rate lock
  v.literal("certified"),   // Completed onboarding, purchased ≥1 license, delivered ≥1 dream team
  v.literal("premier"),     // 10+ deployments, consistent quality, case study published
)),
```

**Semantics:**
- `undefined` — not a partner. Standard agency customer. No access to partner dashboard or wholesale pricing.
- `"founding"` — founding partner (first 10 agencies). Gets at-cost licensing on first 3 clients (80% off: €500 Starter, €1,000 A-Team, €1,750 Dream Team), 24-month rate lock on platform fees, co-delivery on first 5 clients, co-marketing, direct founder access, first access to new features.
- `"certified"` — completed partner onboarding (9+ week program), purchased ≥1 license, delivered ≥1 dream team. Gets standard wholesale pricing and partner dashboard access.
- `"premier"` — 10+ successful deployments, consistent quality metrics, at least 1 published case study. Gets priority support, early feature access, co-marketing opportunities, and volume discount auto-application.

**Defaults:**
- New organizations: `undefined`. Partner status is manually granted by super-admin after qualification.
- No self-serve partner signup. The owner vets every partner application personally (first 50).

**Resolution function:**

```typescript
export function isPartnerOrg(
  org: { partnerTier?: "founding" | "certified" | "premier" }
): boolean {
  return org.partnerTier !== undefined;
}

export function resolvePartnerTier(
  org: { partnerTier?: "founding" | "certified" | "premier" }
): "founding" | "certified" | "premier" | null {
  return org.partnerTier ?? null;
}
```

### 16.3 Additional Partner Fields on Organizations

```typescript
// Add to organizations table in coreSchemas.ts
partnerDetails: v.optional(v.object({
  partnerSince: v.number(),                // Timestamp when partner status was granted
  partnerAgreementSignedAt: v.optional(v.number()), // When agreement was countersigned
  slackChannelId: v.optional(v.string()),  // Private Slack channel for this partner
  slackInviteUrl: v.optional(v.string()),  // Invite URL (rotated periodically)
  foundingDiscountUsed: v.optional(v.number()), // Count of at-cost licenses claimed (max 3 for founding)
  rateLockExpiresAt: v.optional(v.number()),    // 24-month rate lock expiry (founding partners)
  qualificationScore: v.optional(v.number()),    // 0-10 based on qualification criteria
  onboardingWeek: v.optional(v.number()),        // Current onboarding week (1-9+)
  onboardingCompletedAt: v.optional(v.number()), // When onboarding was completed
  notes: v.optional(v.string()),                 // Super-admin notes about this partner
})),
```

### 16.4 Partner Qualification Criteria

An agency must meet **7 of 10** criteria to qualify:

| # | Criterion | Verification Method |
|---|-----------|-------------------|
| 1 | 10+ active clients on monthly retainers | Self-reported, verified in discovery call |
| 2 | Recurring billing model (not project-based) | Self-reported |
| 3 | Clients are local service businesses or SMBs | Client list review |
| 4 | Based in EU or UK | Business registration check |
| 5 | Single decision-maker (owner applies directly) | Discovery call |
| 6 | Willing to co-build first 3 dream teams | Verbal commitment |
| 7 | Not deeply technical (operator-focused) | Discovery call assessment |
| 8 | Clients use WhatsApp, Webchat, Telegram, or Slack | Self-reported |
| 9 | Willing to purchase minimum 1 license in first 30 days | Written commitment |
| 10 | Willing to share case study within 90 days | Written commitment |

**Qualification is tracked** as `partnerDetails.qualificationScore` (0-10, count of met criteria). Score ≥7 qualifies.

### 16.5 Partner Onboarding Workflow

| Week | Phase | Activities | Owner |
|------|-------|-----------|-------|
| 1 | Partner Kickoff | Welcome call, platform walkthrough, partner agreement signed, Slack channel created | L4YERCAK3 founder |
| 2 | Sales Training | Dream team sales framework, ICP qualification guide, pricing strategy workshop, pitch deck walkthrough | L4YERCAK3 founder |
| 3-4 | Client #1 (Co-Delivery) | Partner identifies first client, discovery call (co-led), license purchase, dream team deployment (L4YERCAK3 leads), agent configuration, go-live | L4YERCAK3 + Partner |
| 5-6 | Client #2 (Co-Delivery) | Partner leads discovery, L4YERCAK3 assists deployment, partner handles client comms | Partner (L4YERCAK3 assists) |
| 7-8 | Client #3 (Supervised) | Partner leads end-to-end, L4YERCAK3 reviews before go-live | Partner (L4YERCAK3 reviews) |
| 9+ | Independent Operation | Partner deploys independently, weekly check-in call (optional), case study collaboration | Partner |

**Onboarding progress** is tracked via `partnerDetails.onboardingWeek`. Super-admin advances this manually after each phase review.

### 16.6 Partner Dashboard

**Location:** New nav section visible **only** to organizations where `partnerTier !== undefined`. Appears in both Easy Mode and Advanced Mode nav.

**Route:** `/partner` or rendered as a window/tab in the existing window system.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🤝 Partner Dashboard — [Agency Name]            [Founding Partner] ✨  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ── Your Numbers ───────────────────────────────────────────────────────│
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ Licenses     │  │ Active       │  │ Monthly      │  │ Total        ││
│  │ Purchased    │  │ Deployments  │  │ Revenue      │  │ Client Orgs  ││
│  │ 7            │  │ 5 live       │  │ €8,450       │  │ 8            ││
│  │ 2 unused     │  │ 2 in setup   │  │ ▲ +€1,200    │  │ 3 this qtr   ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                                         │
│  ── Wholesale Pricing ──────────────────────────────────────────────────│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  License Tier    │ Your Price  │ Suggested Retail │ Your Margin    ││
│  │  Starter (1-2)   │ €2,500      │ €5,000-€10,000   │ 50-75%        ││
│  │  A-Team (3-4)    │ €5,000      │ €12,000-€25,000  │ 58-80%        ││
│  │  Dream Team (6)  │ €8,500      │ €25,000-€50,000  │ 66-83%        ││
│  │                  │             │                  │               ││
│  │  Volume: 5-pack 10% off │ 10-pack 20% off │ 25-pack 30% off     ││
│  │                                                                   ││
│  │  [Purchase License →]        [View Purchase History →]            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ── Goals & Progress ───────────────────────────────────────────────────│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  90-Day Target          Current        Status                     ││
│  │  ─────────────────────────────────────────────                    ││
│  │  3 deployments          2 live          ⚠️ On track                ││
│  │  1 case study           0 in progress   ❌ Not started             ││
│  │  €15K setup revenue     €10,000         ✅ 67% achieved            ││
│  │  5 discovery calls      7 completed     ✅ Exceeded                ││
│  │  1 published review     0               ❌ Not started             ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ── Founding Partner Benefits ──────────────────────── [founding only] ─│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  At-cost licenses remaining: 1 of 3                               ││
│  │  Rate lock expires: March 2028                                    ││
│  │  Co-delivery sessions remaining: 3 of 5                           ││
│  │  Next co-delivery: [Schedule Call →]                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ── Partner Community ──────────────────────────────────────────────────│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  🔗 Private Slack Channel                   [Join Slack →]        ││
│  │     #partner-[agency-slug] — direct line to L4YERCAK3 team        ││
│  │     General partner channel: #agency-partners                     ││
│  │                                                                   ││
│  │  📞 Partner Support                                               ││
│  │     Priority response: <4 hours (business hours)                  ││
│  │     Escalation: Direct Telegram to founder                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ── Resources ──────────────────────────────────────────────────────────│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                   ││
│  │  📋 Sales Enablement                                              ││
│  │     • Dream Team Sales Playbook (PDF)           [Download →]      ││
│  │     • Client Pitch Deck (customizable)          [Download →]      ││
│  │     • ICP Qualification Guide                   [Download →]      ││
│  │     • Pricing Calculator (Excel)                [Download →]      ││
│  │     • Objection Handling Cheat Sheet            [Download →]      ││
│  │                                                                   ││
│  │  🤖 Technical Enablement                                          ││
│  │     • Agent Template Library                    [Browse →]        ││
│  │     • Soul Configuration Guide                  [Download →]      ││
│  │     • Channel Setup Walkthroughs                [View →]          ││
│  │     • Trust Architecture One-Pager (for clients)[Download →]      ││
│  │                                                                   ││
│  │  📊 Marketing & Case Studies                                      ││
│  │     • Case Study Template                       [Download →]      ││
│  │     • Co-Marketing Guidelines                   [Download →]      ││
│  │     • Partner Badge / Logo Pack                 [Download →]      ││
│  │     • Social Media Templates                    [Download →]      ││
│  │                                                                   ││
│  │  📜 Legal & Compliance                                            ││
│  │     • Partner Agreement (signed copy)           [View →]          ││
│  │     • Soul Binding Usage Guidelines             [View →]          ││
│  │     • Approved Language for Expert References   [View →]          ││
│  │     • Client Data Processing Agreement          [Download →]      ││
│  │                                                                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 16.7 Soul Binding Legal Framework (Displayed in Resources)

Partners must use approved language when referencing expert-based soul configurations:

| ✅ Approved | ❌ Never |
|------------|---------|
| "Trained on the published frameworks of [Expert]" | "This IS [Expert]" |
| "Built using [Expert]'s methodology" | "[Expert] powers this agent" |
| "Informed by [Expert]'s published work" | Any implied endorsement |
| "Leverages frameworks from [Expert]'s books/courses" | Cloning or identity claims |

This is surfaced in the Resources section and reinforced during onboarding Week 2. Violation is grounds for partner removal.

### 16.8 Partner Numbers & Goals Calculation

**"Your Numbers" KPI cards** are auto-calculated from platform data:

| Card | Source | Calculation |
|------|--------|-------------|
| **Licenses Purchased** | Count of `wholesaleLicenseTransaction` objects for this org | Total purchased. "X unused" = purchased minus deployed (linked to active sub-orgs with agents). |
| **Active Deployments** | Child orgs with `isActive === true` and ≥1 agent with session in last 7 days | "X live" = active with recent sessions. "Y in setup" = active but no sessions yet. |
| **Monthly Revenue** | Calculated from: (active sub-orgs × €149) + (licenses purchased this month × license tier price) | Shows agency's current L4YERCAK3 spend. Delta vs previous month. |
| **Total Client Orgs** | Count of child orgs under this parent | "X this qtr" = created in current quarter. |

**Goals section** is populated from partner onboarding targets, stored on the `partnerDetails` object or as a separate `partnerGoals` object:

```typescript
// Optional: add to partnerDetails or as separate tracked goals
partnerGoals: v.optional(v.object({
  targetDeployments90d: v.number(),         // Default: 3
  targetCaseStudies90d: v.number(),         // Default: 1
  targetSetupRevenue90d: v.number(),        // Default: 15000 (EUR cents: 1500000)
  targetDiscoveryCalls90d: v.number(),      // Default: 5
  targetPublishedReviews90d: v.number(),    // Default: 1
  goalsPeriodStart: v.number(),             // Timestamp
  goalsPeriodEnd: v.number(),               // Timestamp
})),
```

Progress against goals is calculated at query time from platform data (sub-org count, license purchases, etc.) combined with manually tracked fields (case studies, discovery calls — entered by the partner or super-admin).

### 16.9 Wholesale License Tracking

When a partner purchases a wholesale license (one-time Stripe payment), the system creates a tracking record:

```typescript
// New object type in ontology (or dedicated table)
// Using objects table with type = "wholesale_license"
{
  type: "wholesale_license",
  organizationId: Id<"organizations">,     // The partner org
  subtype: "starter" | "a_team" | "dream_team",
  customProperties: {
    stripePaymentIntentId: string,          // Stripe PI for the purchase
    purchasedAt: number,                    // Timestamp
    priceAtPurchase: number,                // EUR cents (captures volume discount)
    volumeDiscountApplied: number,          // 0, 10, 20, or 30 (percent)
    expiresAt: number,                      // 12 months from purchase
    deployedToOrgId?: Id<"organizations">,  // Which sub-org this license was used for
    deployedAt?: number,                    // When deployed
    status: "available" | "deployed" | "expired" | "transferred",
    transferredToOrgId?: Id<"organizations">, // If reassigned (1 free reassignment)
    transferCount: number,                  // Max 1 free transfer
    isFoundingDiscount: boolean,            // True if purchased at 80% off
  }
}
```

### 16.10 Data Model Changes Summary

**File:** `convex/schemas/coreSchemas.ts`

Add to `organizations` table:

```typescript
// Partner program fields
partnerTier: v.optional(v.union(
  v.literal("founding"),
  v.literal("certified"),
  v.literal("premier"),
)),
partnerDetails: v.optional(v.object({
  partnerSince: v.number(),
  partnerAgreementSignedAt: v.optional(v.number()),
  slackChannelId: v.optional(v.string()),
  slackInviteUrl: v.optional(v.string()),
  foundingDiscountUsed: v.optional(v.number()),
  rateLockExpiresAt: v.optional(v.number()),
  qualificationScore: v.optional(v.number()),
  onboardingWeek: v.optional(v.number()),
  onboardingCompletedAt: v.optional(v.number()),
  notes: v.optional(v.string()),
  partnerGoals: v.optional(v.object({
    targetDeployments90d: v.number(),
    targetCaseStudies90d: v.number(),
    targetSetupRevenue90d: v.number(),
    targetDiscoveryCalls90d: v.number(),
    targetPublishedReviews90d: v.number(),
    goalsPeriodStart: v.number(),
    goalsPeriodEnd: v.number(),
  })),
})),
```

**No new table needed.** Wholesale license records use the existing `objects` table with `type: "wholesale_license"`. Partner resources (PDFs, decks) are stored as `objects` with `type: "partner_resource"` on the platform org.

### 16.11 Backend Functions

```typescript
// convex/licensing/superAdmin.ts (add to existing file)

/**
 * Set partner tier on an organization.
 * Super-admin only. Creates or updates partner details.
 */
export const setPartnerTier = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    partnerTier: v.union(
      v.literal("founding"),
      v.literal("certified"),
      v.literal("premier"),
    ),
    qualificationScore: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Validate super-admin session
    // 2. Patch organization: partnerTier, partnerDetails.partnerSince (now)
    // 3. If "founding": set rateLockExpiresAt (24 months from now)
    // 4. If first time: set onboardingWeek to 1
    // 5. Log trust event: partner_status_granted
  },
});

/**
 * Remove partner status (de-partner an org).
 * Super-admin only. Does NOT delete their sub-orgs or agents.
 */
export const removePartnerStatus = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Validate super-admin
    // 2. Set partnerTier to undefined
    // 3. Log trust event: partner_status_removed with reason
    // 4. Partner loses dashboard access but retains their org and sub-orgs
  },
});

/**
 * Update partner onboarding progress.
 * Super-admin only.
 */
export const updatePartnerOnboarding = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    onboardingWeek: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Validate super-admin
    // 2. Patch partnerDetails.onboardingWeek
    // 3. If week >= 9: set onboardingCompletedAt
    // 4. If week >= 9 and partnerTier === "founding": auto-promote to "certified" consideration
  },
});

/**
 * Set partner Slack channel details.
 * Super-admin only.
 */
export const setPartnerSlackChannel = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    slackChannelId: v.string(),
    slackInviteUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Patch partnerDetails.slackChannelId, slackInviteUrl
  },
});

/**
 * Set partner goals for the current 90-day period.
 * Super-admin only (goals are set collaboratively during onboarding).
 */
export const setPartnerGoals = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    targetDeployments90d: v.number(),
    targetCaseStudies90d: v.number(),
    targetSetupRevenue90d: v.number(),
    targetDiscoveryCalls90d: v.number(),
    targetPublishedReviews90d: v.number(),
    goalsPeriodStart: v.number(),
    goalsPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    // Patch partnerDetails.partnerGoals
  },
});
```

```typescript
// convex/api/v1/partnerDashboard.ts (new file)

/**
 * Get partner dashboard data.
 * Accessible to any member of a partner org (partnerTier !== undefined).
 */
export const getPartnerDashboard = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // 1. Validate caller has access to this org
    // 2. Verify org.partnerTier !== undefined (403 if not partner)
    // 3. Fetch partner details from org record
    //
    // 4. KPI cards:
    //    - Licenses purchased: count objects where type="wholesale_license" and orgId
    //    - Active deployments: child orgs with active agents with recent sessions
    //    - Monthly revenue: (active sub-orgs × 149) + (licenses this month × tier price)
    //    - Total client orgs: child org count
    //
    // 5. Goals progress:
    //    - Deployments: count live sub-orgs in goal period
    //    - Setup revenue: sum license purchases in goal period
    //    - Discovery calls: from partnerDetails manual tracking (or CRM)
    //    - Case studies: from partnerDetails manual tracking
    //
    // 6. Founding partner benefits (if founding):
    //    - At-cost licenses remaining: 3 - foundingDiscountUsed
    //    - Rate lock expiry: rateLockExpiresAt
    //    - Co-delivery sessions: tracked in partnerDetails
    //
    // 7. Wholesale pricing: static tier data (Starter/A-Team/Dream Team)
    //    - Include volume discount if applicable based on purchase history
    //
    // 8. Slack channel: slackInviteUrl from partnerDetails
    //
    // 9. Resources: list objects where type="partner_resource" on platform org
    //
    // Return structured payload
  },
});

/**
 * Get partner's wholesale license history.
 */
export const getPartnerLicenseHistory = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // 1. Validate partner org access
    // 2. Query objects where type="wholesale_license" and organizationId
    // 3. Return sorted by purchasedAt desc
  },
});

/**
 * Purchase a wholesale license (initiates Stripe checkout).
 */
export const purchaseWholesaleLicense = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    licenseTier: v.union(
      v.literal("starter"),
      v.literal("a_team"),
      v.literal("dream_team"),
    ),
    quantity: v.number(),           // For volume purchases
  },
  handler: async (ctx, args) => {
    // 1. Validate partner org access
    // 2. Determine price (check volume discount eligibility)
    // 3. If founding partner: check foundingDiscountUsed < 3, apply 80% discount
    // 4. Create Stripe Checkout Session for one-time payment
    // 5. Return checkout URL
    // 6. Stripe webhook handler creates "wholesale_license" objects on payment_intent.succeeded
  },
});

/**
 * Deploy a purchased license to a client sub-org.
 */
export const deployLicenseToClient = mutation({
  args: {
    sessionId: v.string(),
    licenseObjectId: v.id("objects"),      // The wholesale_license object
    childOrganizationId: v.id("organizations"), // Target sub-org
  },
  handler: async (ctx, args) => {
    // 1. Validate license is "available" and belongs to caller's org
    // 2. Validate child org is a sub-org of this parent
    // 3. Update license: status → "deployed", deployedToOrgId, deployedAt
    // 4. Optionally trigger agent setup flow for the sub-org
  },
});
```

### 16.12 Frontend Components

| Component | Location | Description |
|-----------|----------|-------------|
| `PartnerDashboard` | `src/components/window-content/partner/partner-dashboard.tsx` | Main partner dashboard with all sections |
| `PartnerKpiCards` | `src/components/window-content/partner/partner-kpi-cards.tsx` | 4 KPI cards (licenses, deployments, revenue, clients) |
| `PartnerPricingTable` | `src/components/window-content/partner/partner-pricing-table.tsx` | Wholesale pricing display with volume discounts + purchase button |
| `PartnerGoalsProgress` | `src/components/window-content/partner/partner-goals-progress.tsx` | 90-day goals with progress bars and status indicators |
| `PartnerFoundingBenefits` | `src/components/window-content/partner/partner-founding-benefits.tsx` | Founding partner specific section (conditional) |
| `PartnerCommunity` | `src/components/window-content/partner/partner-community.tsx` | Slack invite + support channel info |
| `PartnerResources` | `src/components/window-content/partner/partner-resources.tsx` | Categorized resource downloads (sales, technical, marketing, legal) |
| `PartnerLicenseHistory` | `src/components/window-content/partner/partner-license-history.tsx` | Table of all purchased licenses with status |
| `PartnerBadge` | `src/components/ui/partner-badge.tsx` | Small badge component showing partner tier (Founding ✨ / Certified ✅ / Premier 👑) |

### 16.13 Nav Integration

```typescript
// In nav composition layer
// Add "Partner" nav item, visible ONLY when org.partnerTier !== undefined

{
  id: "partner",
  label: "Partner Hub",
  href: "/partner",
  icon: <Handshake />,
  visible: isPartnerOrg(org), // Only show for partner orgs
}
```

This appears in **both** Easy Mode and Advanced Mode nav. Partner status is orthogonal to UI profile — a partner org can be in either mode.

### 16.14 Super-Admin Partner Management

Add to the existing super-admin org management panel (when viewing a specific org):

**New tab: "Partner"** (visible for all orgs, but functional controls differ):

- **If not a partner:** "Grant Partner Status" button with tier selector (founding/certified/premier) + qualification score input + notes field.
- **If a partner:** Full partner management panel:
  - Current tier with upgrade/downgrade controls
  - Onboarding progress tracker (week 1-9+) with "Advance to Next Week" button
  - Slack channel configuration (channel ID + invite URL)
  - Goals configuration (set/update 90-day targets)
  - Partner notes (free-text, super-admin only)
  - "Remove Partner Status" button with reason input (confirmation required)
  - License purchase history (read-only view of partner's wholesale_license objects)

### 16.15 Partner Removal Grounds

A partner can be removed for:
1. Improper deployment (skipping discovery, no testing phase)
2. Misrepresenting AI capabilities to clients
3. Expert name misuse (violating soul binding language guidelines)
4. Failure to maintain platform subscription (>30 days past due)
5. 3+ client complaints per quarter
6. Sub-licensing (reselling licenses to other agencies)

Removal sets `partnerTier` to `undefined` and logs a trust event. The partner retains their org, sub-orgs, and deployed agents — they just lose partner dashboard access and wholesale pricing.

### 16.16 Implementation Sequence

| Phase | Work | Effort | Priority |
|-------|------|--------|----------|
| Phase 1 | Add `partnerTier` + `partnerDetails` to organizations schema | 1-2 hours | P0 |
| Phase 2 | Build `setPartnerTier`, `removePartnerStatus`, `updatePartnerOnboarding` mutations (super-admin) | 3-4 hours | P0 |
| Phase 3 | Build `getPartnerDashboard` query with KPI calculations | 4-6 hours | P0 |
| Phase 4 | Build `PartnerDashboard` + `PartnerKpiCards` + `PartnerPricingTable` components | 6-8 hours | P0 |
| Phase 5 | Build `PartnerResources` with partner_resource objects on platform org | 3-4 hours | P0 |
| Phase 6 | Build `PartnerCommunity` (Slack invite) + `PartnerGoalsProgress` | 3-4 hours | P1 |
| Phase 7 | Build `PartnerFoundingBenefits` (founding tier conditional section) | 2-3 hours | P1 |
| Phase 8 | Build `purchaseWholesaleLicense` Stripe integration + license tracking | 6-8 hours | P1 |
| Phase 9 | Build super-admin partner management tab | 4-6 hours | P1 |
| Phase 10 | Build `PartnerLicenseHistory` + `deployLicenseToClient` flow | 3-4 hours | P2 |

**Total estimated effort: 35-49 hours across 2-3 weeks.**

Phase 1-5 (P0) delivers a functional partner dashboard in ~18-24 hours. **Ship this alongside the first founding partner onboarding.** The dashboard is part of the partner experience from day one.

### 16.17 Acceptance Criteria

- [ ] `partnerTier` field added to organizations schema with `"founding"` / `"certified"` / `"premier"` options.
- [ ] `partnerDetails` nested object stores all partner metadata (Slack, goals, onboarding, etc.).
- [ ] Super-admin can grant/revoke partner status on any org.
- [ ] "Partner Hub" nav item appears only for partner orgs (both Easy and Advanced modes).
- [ ] Partner dashboard displays 4 KPI cards with live data.
- [ ] Wholesale pricing table displays correct tier prices and volume discounts.
- [ ] Founding partners see their at-cost license count, rate lock expiry, and co-delivery balance.
- [ ] Goals section shows 90-day progress against targets.
- [ ] Slack invite link opens the partner's private channel.
- [ ] Resources section lists all partner materials organized by category (sales, technical, marketing, legal).
- [ ] Partner badge displays next to org name in relevant UI surfaces.
- [ ] Soul binding usage guidelines are accessible from the legal resources section.
- [ ] Wholesale license purchase flow creates Stripe checkout and tracks license objects.
- [ ] License deployment links a wholesale_license to a sub-org.
- [ ] Non-partner orgs cannot access `/partner` route or partner dashboard queries.
- [ ] Partner removal sets `partnerTier` to `undefined` and logs trust event.

---

## 17. Metrics

| Metric | Target (90 days) | Measurement |
|--------|-------------------|-------------|
| Agencies onboarded | 5+ | Count of orgs with `uiProfile === "easy"` and active subscription |
| Sub-orgs deployed | 20+ | Count of child orgs under agency parents |
| Active agents across agencies | 15+ | Count of agents with sessions in last 7 days on agency sub-orgs |
| Agency MRR | EUR 3,000+ | Sum of agency tier subscriptions + sub-org add-ons (at revised €149/sub-org pricing) |
| Time to first agent deploy (white-glove) | < 30 minutes | Measured from start of super-admin setup to first inbound message processed |
| Time to first agent deploy (self-serve, P2) | < 15 minutes | Measured from "Add Client" click to first inbound message |

---

## 18. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Agency owners need features hidden by Easy Mode | Medium | Low | Super-admin unlocks specific apps on request. Or toggle to full mode. |
| Agencies overwhelmed even by 4-section Easy Mode | Low | Medium | White-glove first 50. Learn what's still confusing. Iterate. |
| Sub-org credit sharing causes unexpected costs for agency | Medium | Medium | Per-client usage breakdown modal (Section 12) makes consumption transparent. Budget alerts on parent org. |
| Agent templates don't match agency's vertical | Medium | Low | Templates are starting points. White-glove setup customizes prompts per client. Add templates based on demand. |
| Existing signup funnel breaks for non-agency users | Low | High | `resolveUiProfile()` defaults gracefully. Toggle is instant. First 30 days monitor support tickets for "where is X feature?" from non-agency signups. |
| Agency hits 2,000 credit allocation mid-month | High | Medium | Usage summary card on dashboard shows real-time consumption. "Buy Credits" button prominent. Per-client breakdown helps agency identify high-consumption clients to reprice. |

---

## 19. Open Questions

1. **Should the "Add Client" flow in Easy Mode include channel deployment, or should that be a separate step?** Recommendation: separate step for P0, combined for P2.
2. **Should Easy Mode orgs see the AI Assistant chat?** Recommendation: yes, for their own org-level agent (not client agents). It helps them manage their agency.
3. **What happens when an org hits the 2 included sub-org limit?** The "Add Client" button should prompt upgrade / purchase additional slot. Wire to existing Stripe sub-org add-on flow.
4. **Should we rename "Scale" to "Agency" in the public pricing page?** Recommendation: yes, for Easy Mode signups. Keep "Scale" for full-mode signups. The `mapStorePublicTierToRuntimeStripeTier()` mapping in `stripePrices.ts` already handles this -- just add an alternative display name.
