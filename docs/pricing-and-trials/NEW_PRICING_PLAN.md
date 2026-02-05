# NEW PRICING ARCHITECTURE v2.0

> **Status**: APPROVED - Ready for Implementation
> **Date**: 2026-02-01
> **Last Updated**: 2026-02-01

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State (What We're Replacing)](#2-current-state)
3. [New Tier Structure](#3-new-tier-structure)
4. [Credit System Design](#4-credit-system-design)
5. [V0 Builder Integration](#5-v0-builder-integration)
6. [Community (Free for All)](#6-community)
7. [GDPR / Privacy](#7-gdpr--privacy)
8. [Token Economics & Margin Analysis](#8-token-economics)
9. [Stripe Configuration](#9-stripe-configuration)
10. [Implementation Plan](#10-implementation-plan)
11. [File Change Map](#11-file-change-map)
12. [Migration Checklist](#12-migration-checklist)

---

## 1. Executive Summary

We are replacing a fragmented 6-surface pricing model (5 platform tiers + separate AI billing) with a clean 4-tier, credit-based system. The core insight: users arrive via the V0 builder (BYOK - they use their own V0 account), and our monetization is the **agent execution and platform automation** that makes their build actually work in the real world.

### Key Decisions Made

| Decision | Outcome |
|----------|---------|
| Pricing model | Credit-first (V0-style walls) |
| V0 builder | BYOK - users connect own V0 account, we don't resell |
| AI/Agents | All routed through OUR OpenRouter account, no BYOK |
| Community/Skool | Free for all users (lead magnet) |
| GDPR/Privacy tiers | Eliminated - all AI is GDPR compliant by default |
| Seat-based pricing | No - per-org pricing with credit pools |
| Existing subscribers | None (pre-launch) - clean slate, delete old Stripe products |

---

## 2. Current State (What We're Replacing)

### Old Pricing Surfaces (DELETE ALL)

| Surface | Price | Status |
|---------|-------|--------|
| Free tier | 0 EUR | REPLACE with new Free |
| Community tier | 9 EUR/mo | DELETE - becomes free for all |
| Starter tier | 199 EUR/mo | DELETE - replaced by Pro |
| Professional tier | 399 EUR/mo | DELETE - merged into Agency |
| Agency tier | 599 EUR/mo | REPLACE with new Agency at 299 |
| Enterprise tier | 1,500+ EUR/mo | REPLACE with new Enterprise |
| AI Standard subscription | 49 EUR/mo | DELETE - credits included in plans |
| AI Privacy-Enhanced subscription | 49 EUR/mo | DELETE - GDPR is default |
| Token Packs (4 sizes) | 29-1,149 EUR | REPLACE with Credit Packs |
| Private LLM (3 tiers) | 2,500-12,000 EUR/mo | KEEP as Enterprise add-on only |

### Old Stripe Price IDs to Delete

```
# Platform Plans (Monthly) - DELETE ALL
STRIPE_FREE_MO_PRICE_ID
STRIPE_COMMUNITY_MO_PRICE_ID
STRIPE_STARTER_MO_PRICE_ID
STRIPE_PROFESSIONAL_MO_PRICE_ID
STRIPE_AGENCY_MO_PRICE_ID
STRIPE_ENTERPRISE_MO_PRICE_ID

# Platform Plans (Annual) - DELETE ALL
STRIPE_COMMUNITY_YR_PRICE_ID
STRIPE_STARTER_YR_PRICE_ID
STRIPE_PROFESSIONAL_YR_PRICE_ID
STRIPE_AGENCY_YR_PRICE_ID
STRIPE_ENTERPRISE_YR_PRICE_ID

# AI Subscriptions - DELETE
STRIPE_AI_STANDARD_PRICE_ID
STRIPE_AI_PRIVACY_PRICE_ID

# Token Packs - DELETE (replace with credit packs)
STRIPE_TOKENS_STARTER_PRICE_ID
STRIPE_TOKENS_STANDARD_PRICE_ID
STRIPE_TOKENS_PRO_PRICE_ID
STRIPE_TOKENS_ENT_PRICE_ID

# Private LLM - KEEP (Enterprise add-on)
STRIPE_PRIVATE_LLM_STARTER_PRICE_ID  -> KEEP
STRIPE_PRIVATE_LLM_PRO_PRICE_ID      -> KEEP
STRIPE_PRIVATE_LLM_ENT_PRICE_ID      -> KEEP
```

---

## 3. New Tier Structure

### Overview

| Tier | Price | Credits | Target User |
|------|-------|---------|-------------|
| **Free** | 0 EUR | 5/day on login | Try it, connect V0, see agents work |
| **Pro** | 29 EUR/mo | 200/mo + 5/day | Solo operators, small biz running funnels |
| **Agency** | 299 EUR/mo | 2,000/mo + 5/day | Agencies managing client funnels |
| **Enterprise** | Custom | Unlimited | Large orgs, Private LLM option |

Annual pricing: 17% discount (2 months free)
- Pro Annual: 290 EUR/yr (24.17 EUR/mo equivalent)
- Agency Annual: 2,990 EUR/yr (249.17 EUR/mo equivalent)

### Free Tier (0 EUR)

**Purpose**: Let users build with V0 and see agents demonstrate value.

**Limits**:
- 5 credits/day on login (resets daily, no rollover)
- 1 user
- 100 contacts
- 1 checkout instance
- 1 builder app
- 3 forms, 3 projects, 3 events
- 0.25 GB storage, 10 MB file upload
- Community access (Skool group, courses, weekly calls)
- Badge required on published sites

**Features Enabled**:
- Builder (requires own V0 account)
- Basic CRM (view only, no bulk actions)
- Basic forms
- Basic booking (20/mo)
- Compliance/GDPR tools
- Agent demo (agents work during/after build with daily credits)
- Vercel deployment

**Features Disabled**:
- Sequences, workflows (upgrade wall)
- Email sending
- Custom domains
- White label
- Advanced analytics
- Import/export
- Checkout (beyond 1 instance)
- API webhooks
- Sub-organizations

### Pro Tier (29 EUR/mo)

**Purpose**: Agents run your funnel. Full platform for one business.

**Limits**:
- 200 credits/mo + 5/day on login
- 3 users
- 2,000 contacts
- 5 checkout instances
- 10 builder apps
- 20 forms, 20 projects, 20 events
- 5 GB storage, 50 MB file upload
- 500 emails/mo
- 10 sequences, 10 workflows
- Community access included

**Features Enabled**:
- Everything in Free, plus:
- Full CRM (import/export, bulk email)
- Checkout with Stripe Connect
- Invoicing
- Sequences & workflows
- Email sending
- Booking (200/mo, recurring)
- Certificates
- Templates (custom, 10 max)
- AI agents (full execution)
- Form analytics
- Folder organization (media)
- RBAC (basic roles)
- API keys (1), webhooks (5)
- Deployment integrations (GitHub + Vercel)

**Features Disabled**:
- Sub-organizations
- White label
- Custom domains
- Custom roles
- SSO
- Advanced editor
- Template sharing
- Auto-translation
- Cloud integration (media)
- Multi-location booking

### Agency Tier (299 EUR/mo)

**Purpose**: Manage multiple client funnels with agents.

**Limits**:
- 2,000 credits/mo + 5/day on login
- 15 users
- 10,000 contacts
- Sub-organizations: 2 included, +79 EUR/each, max 20
- 100 checkout instances
- 100 builder apps
- Unlimited: forms, projects, events, pipelines, workflows, sequences
- 50 GB storage, 250 MB file upload
- 10,000 emails/mo
- 5 custom domains
- Community access included

**Features Enabled**:
- Everything in Pro, plus:
- Sub-organizations
- White label (full branding)
- Custom domains
- Custom roles
- Template sharing & versioning
- Advanced editor
- Auto-translation
- Multi-location booking
- Cloud integration (media)
- Form analytics
- Audit log export
- Benefits platform (full)
- Priority support (12h response)

**Features Disabled**:
- SSO
- API domain customization (white label level)
- Dedicated support

### Enterprise Tier (Custom pricing)

**Purpose**: Large organizations, white-label resellers, regulated industries.

**Limits**: All unlimited.

**Features Enabled**: Everything, plus:
- SSO/SAML
- API domain customization
- Private LLM option (add-on)
- Dedicated support
- Custom SLA
- 365-day audit log retention

---

## 4. Credit System Design

### What Is A Credit?

One credit = one agent action (approximately 5K AI tokens). Credits abstract away the underlying AI model costs so users never think about tokens.

### Credit Actions & Costs

| Action | Credits Used | Your Cost (approx) | Notes |
|--------|-------------|--------------------|----|
| Agent AI message (simple) | 1 | ~0.01 EUR | Small Llama/Mistral call |
| Agent AI message (complex) | 2-3 | ~0.03 EUR | Claude/GPT-4o reasoning |
| Agent task execution | 5-20 | ~0.05-0.20 EUR | Multi-step agent workflow |
| Workflow trigger | 1 | ~0.005 EUR | Automation step |
| Sequence step (email) | 1 | ~0.005 EUR | Send + track |
| Sequence step (AI-generated) | 2 | ~0.02 EUR | AI writes + sends |
| Form submission processing | 0 | Free | Platform compute, no AI |
| Builder generation | 0 | Free (user's V0) | BYOK - not our cost |

### Credit Economics Per Tier

| Tier | Credits/mo | Your Cost to Serve | Revenue | Margin |
|------|-----------|-------------------|---------|--------|
| Free | ~150/mo (5/day * 30) | ~1.50 EUR/mo | 0 | Lead acquisition cost |
| Pro | 350/mo (200 + 5/day) | ~3.50 EUR/mo | 29 EUR/mo | ~88% |
| Agency | 2,150/mo (2000 + 5/day) | ~21.50 EUR/mo | 299 EUR/mo | ~93% |

### Credit Packs (Buy Anytime)

| Pack | Credits | Price | Per Credit | Discount |
|------|---------|-------|-----------|----------|
| Starter | 100 | 19 EUR | 0.19 EUR | - |
| Standard | 500 | 79 EUR | 0.158 EUR | 17% |
| Pro | 2,000 | 249 EUR | 0.125 EUR | 34% |
| Enterprise | 10,000 | 999 EUR | 0.10 EUR | 47% |

Purchased credits never expire while subscription is active.

### Credit Consumption Rules

1. **Daily credits**: Granted on login, expire at end of day (no rollover)
2. **Monthly credits**: Granted at billing cycle start, expire at end of cycle (no rollover)
3. **Purchased credits**: Never expire while subscription is active. 30-day grace period if subscription lapses.
4. **Consumption order**: Daily -> Monthly -> Purchased
5. **Hard wall**: When all credits exhausted, agent actions queue but don't execute. User sees "Out of credits" with upgrade/purchase CTA.
6. **No negative balance**: Actions that would exceed balance are blocked, not charged retroactively.

### Credit Balance Tracking (Database)

New table: `creditBalances`
```typescript
{
  organizationId: Id<"organizations">,
  dailyCredits: number,        // Resets on login, max 5
  dailyCreditsLastReset: number, // Timestamp of last daily reset
  monthlyCredits: number,      // Remaining monthly credits
  monthlyCreditsTotal: number,  // Total monthly allocation
  monthlyPeriodStart: number,  // Billing cycle start
  monthlyPeriodEnd: number,    // Billing cycle end
  purchasedCredits: number,    // Purchased balance (never expires)
  lastUpdated: number,
}
```

New table: `creditTransactions` (audit trail)
```typescript
{
  organizationId: Id<"organizations">,
  userId?: Id<"users">,
  type: "daily_grant" | "monthly_grant" | "purchase" | "consumption" | "expiry",
  amount: number,              // Positive for grants, negative for consumption
  creditSource: "daily" | "monthly" | "purchased",
  action?: string,             // "agent_message", "workflow_trigger", etc.
  balanceAfter: number,        // Running balance after this transaction
  metadata?: object,           // Agent ID, workflow ID, etc.
  createdAt: number,
}
```

---

## 5. V0 Builder Integration

### Architecture

The builder is a **BYOK (Bring Your Own Key)** integration with V0. Users connect their own V0 account. We do not resell V0 credits or route V0 API calls through our account.

### User Flow

1. User opens Builder
2. If no V0 account connected: "Connect your V0 account to use the builder"
3. Link to V0 signup with our **affiliate referral link**
4. User enters V0 API key or authenticates via OAuth
5. Builder uses user's V0 credits for page generation
6. Our platform wraps the V0 output with agent integration

### What Our Platform Adds (Post-Build)

After V0 generates the page, our agents (using OUR credits) do:
- Connect forms to CRM
- Set up checkout flow with Stripe
- Create email sequences for leads
- Configure booking widgets
- Wire up workflows and automation
- Deploy to Vercel

This is where the user sees agent value and where our credits get consumed.

### V0 Account Requirements By Tier

| Our Tier | V0 Requirement | Notes |
|----------|---------------|-------|
| Free | V0 free tier works | Limited generations, but enough to try |
| Pro | V0 free or paid | Recommend Pro ($20/mo) for serious building |
| Agency | V0 paid recommended | Multiple client builds burn V0 credits fast |
| Enterprise | V0 Team/Enterprise | Or custom builder integration |

### Affiliate Revenue

- Sign up for V0 referral/partner program
- All "Sign up for V0" links use our affiliate code
- Revenue: TBD based on V0's partner terms
- Track conversions: store referral status per user

---

## 6. Community (Free for All)

### What Was Paid (9 EUR/mo) Is Now Free

| Feature | Access |
|---------|--------|
| Foundations Course | All users |
| Templates Library | All users |
| Weekly Live Calls | All users |
| Private Skool Group | All users |
| Early Access Features | All users |

### Why Free

- Community is a lead magnet, not a revenue center
- Reduces friction: "sign up, join community, start building"
- Higher engagement = more users hitting credit walls = more conversions
- Community members help each other (reduces support cost)

### Implementation

- Remove `community` from tier hierarchy
- Remove STRIPE_COMMUNITY_MO_PRICE_ID and STRIPE_COMMUNITY_YR_PRICE_ID
- Remove community tier from store-window.tsx
- Community features accessible without any subscription check

---

## 7. GDPR / Privacy

### Decision: All AI Is GDPR Compliant By Default

- No separate "Privacy-Enhanced" tier
- No `tier: "standard" | "privacy-enhanced"` distinction
- All AI requests routed with:
  - Zero Data Retention where available
  - EU providers prioritized
  - No model training on user data
  - Data collection policy: "deny" by default

### What To Remove

- `aiSubscriptions.tier` field: remove "standard" vs "privacy-enhanced" distinction
- `aiSubscriptions.privacySettings`: remove (always GDPR)
- AI billing schemas: simplify to just track credit usage
- Store window: remove AI Standard vs AI Privacy-Enhanced cards
- Stripe: delete STRIPE_AI_STANDARD_PRICE_ID, STRIPE_AI_PRIVACY_PRICE_ID

### What To Keep

- Private LLM option (Enterprise add-on) - stays as-is
- `aiUsage` table - repurpose for credit consumption tracking
- Budget alerts - repurpose for credit balance alerts

---

## 8. Token Economics & Margin Analysis

### AI Routing Strategy (OpenRouter)

All agent AI calls go through our OpenRouter account. We pick the model per task type:

| Task Type | Model | Cost/1M tokens | Why |
|-----------|-------|----------------|-----|
| Simple agent response | Llama 3.1 70B | ~$0.50 | Fast, cheap, good enough |
| Structured data extraction | Mistral Large | ~$2.00 | Good at JSON/structured output |
| Complex reasoning | Claude Sonnet | ~$3.00 | Best reasoning quality |
| Code generation | GPT-4o | ~$2.50 | Strong at code tasks |
| Embeddings | text-embedding-3-small | ~$0.02 | Dirt cheap |

**Blended average cost**: ~$1.50/1M tokens (~1.40 EUR)
**Average tokens per credit (5K)**: ~0.007 EUR per credit

### Monthly P&L Per Tier

| | Free | Pro | Agency |
|---|---|---|---|
| Revenue | 0 EUR | 29 EUR | 299 EUR |
| Credit cost (AI) | -1.50 EUR | -3.50 EUR | -21.50 EUR |
| Platform compute | -0.50 EUR | -1.00 EUR | -5.00 EUR |
| **Gross margin** | **-2.00 EUR** | **24.50 EUR (84%)** | **272.50 EUR (91%)** |

Free tier is a ~2 EUR/mo acquisition cost per user. Very cheap.

### Credit Pack Margins

| Pack | Price | Your Cost | Margin |
|------|-------|-----------|--------|
| 100 credits / 19 EUR | 19 EUR | ~0.70 EUR | 96% |
| 500 credits / 79 EUR | 79 EUR | ~3.50 EUR | 96% |
| 2,000 credits / 249 EUR | 249 EUR | ~14.00 EUR | 94% |
| 10,000 credits / 999 EUR | 999 EUR | ~70.00 EUR | 93% |

---

## 9. Stripe Configuration

### New Stripe Products & Prices to Create

```
# Platform Plans (Monthly)
STRIPE_PRO_MO_PRICE_ID          -> 29.00 EUR/mo recurring
STRIPE_AGENCY_MO_PRICE_ID       -> 299.00 EUR/mo recurring

# Platform Plans (Annual)
STRIPE_PRO_YR_PRICE_ID          -> 290.00 EUR/yr recurring
STRIPE_AGENCY_YR_PRICE_ID       -> 2990.00 EUR/yr recurring

# Sub-Organization Add-on
STRIPE_SUB_ORG_PRICE_ID         -> 79.00 EUR/mo recurring (metered)

# Credit Packs (One-time)
STRIPE_CREDITS_100_PRICE_ID     -> 19.00 EUR one-time
STRIPE_CREDITS_500_PRICE_ID     -> 79.00 EUR one-time
STRIPE_CREDITS_2000_PRICE_ID    -> 249.00 EUR one-time
STRIPE_CREDITS_10000_PRICE_ID   -> 999.00 EUR one-time

# Private LLM (Enterprise add-on, keep existing)
STRIPE_PRIVATE_LLM_STARTER_PRICE_ID   -> KEEP
STRIPE_PRIVATE_LLM_PRO_PRICE_ID       -> KEEP
STRIPE_PRIVATE_LLM_ENT_PRICE_ID       -> KEEP
```

Total: 9 new price IDs (down from ~20)

---

## 10. Implementation Plan

### Phase 1: Core Tier Config & Credit System
- [ ] Rewrite `convex/licensing/tierConfigs.ts` - 4 tiers (Free, Pro, Agency, Enterprise)
- [ ] Add credit fields to `TierLimits` (monthlyCredits, dailyCredits)
- [ ] Create `convex/schemas/creditSchemas.ts` - creditBalances, creditTransactions tables
- [ ] Create `convex/credits/` module - grant, deduct, check, purchase functions
- [ ] Add credit balance tables to Convex schema
- [ ] Update `convex/licensing/helpers.ts` - add credit checking functions

### Phase 2: Simplify AI Billing
- [ ] Remove "standard" vs "privacy-enhanced" tier distinction from aiSubscriptions schema
- [ ] Remove separate AI subscription flow (credits are included in platform plans)
- [ ] Repurpose `aiUsage` table for credit consumption tracking
- [ ] Remove `aiTokenBalance` concept (replaced by creditBalances)
- [ ] Update `convex/ai/billing.ts` to use credit system

### Phase 3: Stripe Integration
- [ ] Create new Stripe products and prices (see Section 9)
- [ ] Delete old Stripe products/prices
- [ ] Rewrite `convex/stripe/stripePrices.ts` - new price ID mapping
- [ ] Rewrite `convex/stripe/platformCheckout.ts` - Pro/Agency/credits checkout
- [ ] Add credit pack purchase flow
- [ ] Update webhook handlers for new subscription structure

### Phase 4: Store UI
- [ ] Rewrite `src/components/window-content/store-window.tsx`
  - Remove two-tab design (plans vs AI)
  - Single view: 4 plan cards
  - Credit pack section below plans
  - Remove Community, Starter, Professional cards
  - Remove AI Standard/Privacy-Enhanced cards
  - Keep Private LLM as "Enterprise Add-ons" section
- [ ] Update subscription status banner for new tiers
- [ ] Add credit balance display component
- [ ] Add "Out of credits" upgrade wall component

### Phase 5: Agent Credit Integration
- [ ] Add credit deduction to agent execution pipeline
- [ ] Add credit check before agent actions
- [ ] Implement daily credit grant on login
- [ ] Implement monthly credit grant on billing cycle
- [ ] Add credit balance to agent UI (show remaining)
- [ ] Build "credits exhausted" queueing behavior

### Phase 6: Cleanup
- [ ] Remove `community` tier references throughout codebase
- [ ] Remove `starter` and `professional` tier references
- [ ] Update `TIER_CONFIGS` record type
- [ ] Update `appFeatureMapping.ts` if needed
- [ ] Remove old environment variables from Convex
- [ ] Update any hardcoded tier strings in frontend
- [ ] Update translations/i18n for new tier names

---

## 11. File Change Map

### Files to REWRITE (Major Changes)

| File | What Changes |
|------|-------------|
| `convex/licensing/tierConfigs.ts` | 4 tiers instead of 5. Add credit limits. New prices. |
| `convex/schemas/aiBillingSchemas.ts` | Simplify - remove privacy tiers, add credit schemas |
| `convex/stripe/stripePrices.ts` | New price ID mapping (9 IDs instead of 20) |
| `convex/stripe/platformCheckout.ts` | New tier names, credit pack checkout |
| `src/components/window-content/store-window.tsx` | Complete UI redesign - single view, 4 tiers + credits |

### Files to CREATE

| File | Purpose |
|------|---------|
| `convex/schemas/creditSchemas.ts` | creditBalances, creditTransactions table definitions |
| `convex/credits/index.ts` | Credit system: grant, deduct, check, purchase |
| `convex/credits/dailyGrant.ts` | Daily login credit grant logic |
| `src/components/credit-balance.tsx` | Credit balance display widget |
| `src/components/credit-wall.tsx` | "Out of credits" upgrade prompt |

### Files to MODIFY (Smaller Changes)

| File | What Changes |
|------|-------------|
| `convex/licensing/helpers.ts` | Add checkCreditBalance(), deductCredits() |
| `convex/licensing/appFeatureMapping.ts` | Update tier references |
| `convex/ai/billing.ts` | Route through credit system instead of token system |
| `convex/schema.ts` | Add new credit tables, update AI tables |

### Files to DELETE or GUT

| File | Why |
|------|-----|
| AI subscription cards in store | Replaced by credits included in plans |
| Token pack UI components | Replaced by credit packs |
| Privacy tier selection UI | GDPR is default, no selection needed |

---

## 12. Migration Checklist

Since we have no existing subscribers, this is a clean cut:

### Stripe Cleanup
- [ ] Archive/delete all old Stripe Products
- [ ] Archive/delete all old Stripe Prices
- [ ] Create new Products: "Pro Plan", "Agency Plan", "Credit Packs"
- [ ] Create new Prices per Section 9
- [ ] Update all Convex environment variables with new price IDs
- [ ] Remove old environment variables

### Database Cleanup
- [ ] Drop/clear aiSubscriptions table (no active subs)
- [ ] Drop/clear aiTokenBalance table (replaced by credits)
- [ ] Drop/clear aiTokenPurchases table (replaced by credit purchases)
- [ ] Create creditBalances table
- [ ] Create creditTransactions table

### Code Cleanup
- [ ] Search codebase for "community" tier references -> remove
- [ ] Search for "starter" tier references -> replace with "pro"
- [ ] Search for "professional" tier references -> replace with "agency"
- [ ] Search for "privacy-enhanced" -> remove
- [ ] Search for "token" in billing context -> replace with "credit"
- [ ] Update all TypeScript union types for tier names

### Testing
- [ ] Free tier: sign up, get daily credits, build with V0, see agents use credits, hit wall
- [ ] Pro tier: subscribe, get 200 monthly credits + daily, all features work
- [ ] Agency tier: subscribe, sub-orgs work, 2000 credits, white label
- [ ] Credit packs: purchase, balance updates, consumption order correct
- [ ] Credit exhaustion: agents pause, upgrade wall shows
- [ ] Annual billing: correct pricing, correct credit allocation
- [ ] Subscription upgrade: Free -> Pro, Pro -> Agency (proration)
- [ ] Subscription downgrade: Agency -> Pro (scheduled at period end)

---

## Appendix: Conversion Funnel

```
AWARENESS
  User hears about platform (community, content, referral)
  |
SIGN UP (Free)
  Joins community (Skool), connects V0 account
  Gets 5 daily credits
  |
BUILD
  Uses V0 builder to create funnel (their V0 credits)
  |
AGENT DEMO (This is where we hook them)
  Agents start connecting the build to real backend:
  - "I connected your form to CRM" (1 credit)
  - "I set up your checkout with Stripe" (5 credits)
  - "I built a 3-step email sequence" (3 credits)
  - "I configured booking for your service" (2 credits)
  User watches agents work, daily credits drain
  |
CREDIT WALL (Conversion moment)
  "Your agents are paused - 3 tasks queued"
  "Upgrade to Pro (29 EUR/mo) for 200 credits/month"
  |
PRO SUBSCRIBER
  Agents run continuously
  Funnel is live, leads come in
  Agents handle lead responses, booking confirmations, follow-ups
  |
CREDIT GROWTH
  Heavy agent usage -> buys credit packs
  Wants to do this for clients -> Agency upgrade
  |
AGENCY SUBSCRIBER
  Sub-orgs for each client
  2,000 credits/mo for all client agents
  White label -> presents as own platform to clients
```
