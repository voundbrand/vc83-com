# v0-to-Production App Pipeline — Master Plan

> **Goal**: Transform v0-generated prototypes into fully deployable, production-ready Next.js applications connected to the l4yercak3 platform.

---

## Table of Contents

1. [What We Have Today](#what-we-have-today)
2. [Architecture Decision: Three Options](#architecture-decision)
3. [Phase 1 — Thin Client (Start Here)](#phase-1--thin-client)
4. [Phase 2 — Full-Stack Generation](#phase-2--full-stack-generation)
5. [Phase 3 — Hybrid (OAuth + Own Database)](#phase-3--hybrid)
6. [Publish Configuration Wizard](#publish-configuration-wizard)
7. [l4yercak3 OAuth Provider](#l4yercak3-oauth-provider)
8. [Payments & Invoicing](#payments--invoicing)
9. [CRM-Driven User Management (Optional)](#crm-driven-user-management)
10. [Post-Deploy Integration](#post-deploy-integration)
11. [Existing Infrastructure Inventory](#existing-infrastructure-inventory)
12. [File Reference](#file-reference)

---

## What We Have Today

### Completed Work

| Feature | Status | Key Files |
|---------|--------|-----------|
| v0.dev Platform API integration | Done | `convex/integrations/v0.ts`, `builder-context.tsx` |
| Builder chat with AI (built-in + v0) | Done | `builder-chat-panel.tsx`, `builder-context.tsx` |
| iframe preview of v0 output | Done | `builder-preview-panel.tsx` |
| Connect Mode (API catalog + key gen) | Done | `v0-connection-panel.tsx`, `api-catalog.ts` |
| Builder app CRUD (objects table) | Done | `builderAppOntology.ts` |
| Scoped API key generation (bcrypt) | Done | `convex/actions/apiKeys.ts` |
| .env.local storage in media library | Done | `organizationMedia.ts` |
| GitHub repo creation + file commit | Done | `convex/integrations/github.ts` |
| Vercel deploy URL generation | Done | `publishingHelpers.ts` |
| Publish panel (3-step UI) | Done | `v0-publish-panel.tsx` |
| Builder context (all state mgmt) | Done | `builder-context.tsx` |

### Current Scaffold (what gets pushed to GitHub)

When a user clicks "Push to GitHub", `createRepoFromBuilderApp` commits:

- `package.json` — Next.js app with `@l4yercak3/sdk` dependency
- `.env.example` — API key, URL, org ID placeholders
- `README.md` — Setup instructions
- `lib/layercake.ts` — SDK client singleton
- `next.config.js` — Image domain config
- `app/layout.tsx` — Root layout with `<L4yercak3Provider>`
- `.gitignore` — Standard Next.js ignores
- v0-generated files (components, pages, etc.)

### The Gap

This scaffold produces a **demo app**, not a production app. Missing:
- No backend/database setup
- No authentication
- No payment handling
- No real data sync
- No environment-specific configs
- No production middleware or error handling

---

## Architecture Decision

Three approaches, to be built in order. Each is a valid deployment option that users can select.

### Option A: Thin Client (Phase 1 — Start Here)

The published app is primarily frontend. All data operations go through l4yercak3 platform APIs.

**Pros:**
- Simplest to implement — just enhance the existing scaffold
- Zero backend maintenance for the user
- Data lives in l4yercak3 (single source of truth)
- Immediate access to all platform features (CRM, events, forms, commerce, invoicing)

**Cons:**
- App is coupled to l4yercak3 platform
- Limited customization of backend logic
- Network latency for every data operation

**Architecture:**
```
[User's Browser] → [Next.js on Vercel] → [l4yercak3 API]
                                              ↓
                                     [Convex Database]
```

### Option B: Full-Stack Generation (Phase 2)

Generate a complete Next.js app with its own database, ORM, API routes, and auth. Syncs data with l4yercak3 via webhooks.

**Pros:**
- Standalone app — works without l4yercak3
- Full control over backend logic
- Can add custom business logic

**Cons:**
- More complex scaffold generation
- User must manage their own database
- Data sync between two systems

**Architecture:**
```
[Browser] → [Next.js + API Routes] → [Own DB (Supabase/Neon)]
                    ↓
            [l4yercak3 API] ← webhooks → [Convex Database]
```

### Option C: Hybrid (Phase 3)

Next.js app with l4yercak3 for auth/CRM but its own database for app-specific data.

**Pros:**
- Best of both: l4yercak3 handles identity, app handles domain data
- CRM integration automatic (users → contacts)
- Standalone data for app-specific features

**Cons:**
- Most complex to implement
- Two data stores to reason about

**Architecture:**
```
[Browser] → [Next.js] → [l4yercak3 OAuth] (auth + CRM)
                  ↓
           [Own DB] (app-specific data)
                  ↓
           [l4yercak3 API] (forms, events, commerce, invoicing)
```

---

## Phase 1 — Thin Client

> **Scope**: Enhance the existing scaffold so the published app is a fully functional frontend connected to l4yercak3 APIs. No separate database.

### 1.1 Enhanced Scaffold Generation

Update `createRepoFromBuilderApp` in `convex/integrations/github.ts` to generate a richer scaffold based on the user's selected API categories.

#### New/Updated Generated Files

| File | Purpose | When Generated |
|------|---------|----------------|
| `lib/layercake.ts` | SDK client (already exists) | Always |
| `lib/api.ts` | Typed API wrapper functions | Always |
| `app/api/webhook/route.ts` | Webhook handler for platform events | If events/forms/commerce selected |
| `middleware.ts` | Auth check, rate limiting, CORS | Always |
| `app/(auth)/login/page.tsx` | Login page | If auth is enabled |
| `app/(auth)/signup/page.tsx` | Signup page | If auth is enabled |
| `components/providers.tsx` | Client-side providers wrapper | Always |
| `types/index.ts` | TypeScript interfaces for API responses | Always |
| `.env.example` | Enhanced with all required vars | Always |
| `tailwind.config.ts` | Tailwind config (v0 apps use it) | Always |
| `tsconfig.json` | TypeScript config | Always |

#### Conditional Scaffolds by Category

**Forms (`forms` category selected):**
```
app/forms/page.tsx              — Form listing
app/forms/[formId]/page.tsx     — Form detail / submission
lib/forms.ts                    — Form API helpers
```

**Events (`events` category selected):**
```
app/events/page.tsx             — Event listing
app/events/[eventId]/page.tsx   — Event detail / RSVP
lib/events.ts                   — Event API helpers
```

**Commerce (`products` category selected):**
```
app/products/page.tsx           — Product catalog
app/products/[id]/page.tsx      — Product detail
app/cart/page.tsx               — Shopping cart
app/checkout/page.tsx           — Checkout flow
lib/commerce.ts                 — Commerce API helpers
```

**Invoicing (`invoices` category selected):**
```
app/invoices/page.tsx           — Invoice listing
app/invoices/[id]/page.tsx      — Invoice detail / payment
lib/invoicing.ts                — Invoice API helpers
```

**CRM (`crm` category selected):**
```
app/contacts/page.tsx           — Contact directory
lib/contacts.ts                 — Contact API helpers
```

**Bookings (`bookings` category selected):**
```
app/bookings/page.tsx           — Booking calendar
app/bookings/new/page.tsx       — New booking form
lib/bookings.ts                 — Booking API helpers
```

### 1.2 Publish Configuration Wizard

Before pushing to GitHub, walk the user through configuration. This replaces the current simple repo name + public/private form.

#### Wizard Steps

1. **App Info** — Name, description, repo name, public/private
2. **Capabilities Review** — Show selected API categories from Connect step, allow adding more
3. **Auth Choice** — None, l4yercak3 OAuth (Phase 3), or placeholder for NextAuth/Clerk
4. **Payments** — Enable Stripe integration? Or l4yercak3 Invoicing?
5. **Environment Variables** — Show all required env vars with descriptions
6. **Review & Push** — Summary of what will be generated, then push

#### UI Location

Replace the current `V0PublishPanel` with a multi-step wizard component. The existing 3-step flow (precheck → github → deploy) becomes steps within the wizard rather than the entire flow.

### 1.3 API Wrapper Library (`lib/api.ts`)

Generate a typed wrapper around the l4yercak3 REST API so users get autocomplete and type safety.

```typescript
// Generated lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_L4YERCAK3_URL;
const API_KEY = process.env.NEXT_PUBLIC_L4YERCAK3_API_KEY;

export async function fetchForms() { ... }
export async function submitForm(formId: string, data: Record<string, unknown>) { ... }
export async function fetchEvents() { ... }
export async function fetchProducts() { ... }
export async function createInvoice(data: InvoiceInput) { ... }
// ... per selected category
```

### 1.4 Webhook Handler

Generate `app/api/webhook/route.ts` that handles incoming webhooks from the l4yercak3 platform (form submissions, payment confirmations, etc.).

### 1.5 Implementation Tasks

1. Create `PublishConfigWizard` component (replaces `V0PublishPanel`)
2. Add publish config state to `BuilderContext` or new `PublishContext`
3. Update `createRepoFromBuilderApp` to accept config and generate conditional files
4. Create template generators for each category's pages/libs
5. Add webhook route template
6. Add middleware template
7. Update `.env.example` generator with all vars
8. Test end-to-end: v0 generate → connect → configure → push → deploy

---

## Phase 2 — Full-Stack Generation

> **Scope**: Generate a standalone Next.js app with its own database. Sync with l4yercak3 via webhooks.

### 2.1 Backend Selection

User chooses their database:

| Option | Generated Files | Notes |
|--------|----------------|-------|
| **Convex** (default) | `convex/schema.ts`, `convex/functions/`, `convex.json` | We know this stack well |
| **Supabase** | `lib/supabase.ts`, `supabase/migrations/`, `.env` vars | Popular, easy setup |
| **Neon + Drizzle** | `lib/db.ts`, `drizzle/schema.ts`, `drizzle.config.ts` | SQL with type safety |
| **API-only** (Phase 1) | No DB files | Uses l4yercak3 APIs exclusively |

### 2.2 Database Schema Generation

Based on selected API categories, generate appropriate schema:

**Convex example (events + contacts):**
```typescript
// convex/schema.ts
export default defineSchema({
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    location: v.optional(v.string()),
    l4yercak3Id: v.optional(v.string()), // sync reference
  }),
  contacts: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    l4yercak3Id: v.optional(v.string()),
  }),
});
```

**Drizzle example:**
```typescript
// drizzle/schema.ts
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  date: timestamp('date'),
  l4yercak3Id: text('l4yercak3_id'),
});
```

### 2.3 Sync Mechanism

Generate bidirectional sync between the app's database and l4yercak3:

- **Outbound**: App writes → API call to l4yercak3
- **Inbound**: l4yercak3 webhook → App webhook handler → DB write

Generated files:
```
lib/sync.ts                     — Sync utilities
app/api/webhook/l4yercak3/route.ts — Inbound webhook handler
```

### 2.4 Auth Generation (Backend)

For full-stack apps, generate auth middleware:

| Auth Option | Generated Files |
|------------|----------------|
| NextAuth.js | `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts`, `middleware.ts` |
| Clerk | `middleware.ts`, `lib/clerk.ts` (minimal — Clerk handles most) |
| Supabase Auth | `lib/supabase-auth.ts`, `middleware.ts` (if Supabase backend selected) |
| l4yercak3 OAuth | See Phase 3 |

### 2.5 Implementation Tasks

1. Create backend selection UI in publish wizard
2. Build schema generator per backend option
3. Build Convex scaffold generator
4. Build Supabase scaffold generator
5. Build Drizzle/Neon scaffold generator
6. Create sync mechanism templates
7. Create auth middleware templates per provider
8. Update `createRepoFromBuilderApp` for full-stack configs
9. Test each backend option end-to-end

---

## Phase 3 — Hybrid

> **Scope**: App uses l4yercak3 OAuth for identity/CRM and its own DB for domain data.

### 3.1 l4yercak3 as OAuth Provider

We already have OAuth infrastructure (`convex/oauth/`) with:
- Authorization endpoint (`/oauth/authorize`)
- Token endpoint (`/oauth/token`) — JWT with JOSE
- PKCE support
- Scope-based permissions
- Application registration

**What needs to happen:** Extend this to work as an identity provider for published apps.

New endpoints needed:
- `GET /oauth/userinfo` — Returns authenticated user profile
- Ensure CORS headers allow published app domains

### 3.2 Generated Auth Integration

For hybrid apps, generate:

```
lib/auth.ts                     — l4yercak3 OAuth client
app/api/auth/callback/route.ts  — OAuth callback handler
app/api/auth/login/route.ts     — Initiates OAuth flow
app/api/auth/logout/route.ts    — Clears session
middleware.ts                   — Checks auth on protected routes
```

### 3.3 CRM Contact Creation on Auth

When a user authenticates in a published app via l4yercak3 OAuth:

1. User logs in via l4yercak3 OAuth
2. Token includes `org` claim (the publisher's org ID)
3. On first login, l4yercak3 automatically creates a CRM contact in the publisher's org
4. Subsequent logins update the contact's last activity

This is implemented server-side in our OAuth token endpoint — no action needed from the published app.

### 3.4 Implementation Tasks

1. Add `/oauth/userinfo` endpoint to `convex/oauth/endpoints.ts`
2. Add CORS support for published app domains
3. Create OAuth client template for generated apps
4. Create callback/login/logout route templates
5. Create middleware template with l4yercak3 auth check
6. Add CRM contact creation hook to token exchange
7. Test OAuth flow end-to-end with a published app
8. Document the OAuth integration for users

---

## Publish Configuration Wizard

### Wizard Component Design

```
PublishConfigWizard
├── Step 1: AppInfoStep          — Name, repo, visibility
├── Step 2: CapabilitiesStep     — API categories review
├── Step 3: ArchitectureStep     — Thin client / Full-stack / Hybrid
├── Step 4: BackendStep          — DB choice (if full-stack/hybrid)
├── Step 5: AuthStep             — Auth provider choice
├── Step 6: PaymentsStep         — Stripe / l4yercak3 invoicing / none
├── Step 7: EnvVarsStep          — Required env vars summary
└── Step 8: ReviewStep           — Final review + push button
```

### Publish Config Type

```typescript
interface PublishConfig {
  // App info
  appName: string;
  repoName: string;
  description: string;
  isPrivate: boolean;

  // Architecture
  architecture: "thin-client" | "full-stack" | "hybrid";

  // Backend (only for full-stack/hybrid)
  backend?: "convex" | "supabase" | "neon-drizzle" | "none";

  // Auth
  auth: "none" | "l4yercak3-oauth" | "nextauth" | "clerk" | "supabase-auth";

  // Payments
  payments: {
    stripe: boolean;
    l4yercak3Invoicing: boolean;
  };

  // From connect step
  selectedCategories: string[];
  scopes: string[];

  // Generated env vars
  envVars: EnvVarConfig[];
}
```

### State Management

Add publish config to `BuilderContext` or create a new `PublishContext`:

```typescript
// New state in builder context
publishConfig: PublishConfig | null;
setPublishConfig: (config: PublishConfig) => void;
publishStep: number;
setPublishStep: (step: number) => void;
```

---

## l4yercak3 OAuth Provider

### Existing Infrastructure

We already have a full OAuth 2.0 implementation:

| File | What It Does |
|------|-------------|
| `convex/oauth/endpoints.ts` | HTTP endpoints: `/oauth/authorize`, `/oauth/token` |
| `convex/oauth/authorize.ts` | Authorization code grant flow |
| `convex/oauth/tokens.ts` | JWT generation with JOSE (HS256) |
| `convex/oauth/helpers.ts` | PKCE, code generation, validation |
| `convex/oauth/scopes.ts` | Available OAuth scopes |
| `convex/oauth/config.ts` | OAuth + JWT config constants |
| `convex/oauth/applications.ts` | OAuth app registration |

### What Needs Adding

1. **`/oauth/userinfo` endpoint** — Standard OpenID Connect userinfo
   - Returns: `sub`, `name`, `email`, `picture`, `org`
   - Format: JSON
   - Auth: Bearer token

2. **Published App Auto-Registration** — When a user publishes an app, automatically create an OAuth application record with:
   - `client_id` generated
   - `redirect_uri` set to the Vercel deploy URL
   - Scopes matching selected API categories

3. **CORS for Published Domains** — Allow the published app's domain to call our OAuth endpoints

4. **CRM Contact Hook** — On successful token exchange, create/update a contact:
   ```typescript
   // In token exchange handler
   async function onSuccessfulAuth(userId, orgId) {
     // Check if contact exists
     const existing = await findContactByUserId(userId, orgId);
     if (!existing) {
       await createContact({ userId, orgId, source: "oauth" });
     } else {
       await updateContact(existing._id, { lastSeen: Date.now() });
     }
   }
   ```

---

## Payments & Invoicing

### Stripe Integration (for published apps)

If the user enables Stripe, generate:

| File | Purpose |
|------|---------|
| `lib/stripe.ts` | Stripe client initialization |
| `app/api/stripe/webhook/route.ts` | Stripe webhook handler |
| `app/api/stripe/checkout/route.ts` | Create checkout session |
| `app/api/stripe/portal/route.ts` | Customer portal redirect |
| `components/checkout-button.tsx` | Checkout UI component |

Required env vars added: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

### l4yercak3 Invoicing (B2B)

Our platform already has invoicing (`convex/stripeInvoices.ts`, `api-catalog.ts` invoicing category). For published apps:

- Use the existing `/api/v1/invoices` endpoints
- Generate `lib/invoicing.ts` helper with typed functions:
  - `createInvoice()`
  - `getInvoices()`
  - `sendInvoice()`
  - `getInvoicePaymentStatus()`

This requires no additional infrastructure — just scaffold generation.

### Combined Option

Users can enable both: Stripe for direct checkout, l4yercak3 invoicing for B2B billing. The scaffold handles both.

---

## CRM-Driven User Management

> **Note from founder**: This is an optional feature. Users get the choice to enable it because we already have the pathway.

### How It Works

When enabled, every authenticated user in a published app automatically becomes a CRM contact in the publisher's l4yercak3 organization.

**Flow:**
1. User visits published app → signs up/logs in via l4yercak3 OAuth
2. OAuth token exchange fires CRM hook
3. New contact created in publisher's CRM with:
   - Name, email from OAuth profile
   - Source: "published_app"
   - App reference: builder_app ID
   - First seen / last seen timestamps
4. Publisher sees all their app's users in their CRM dashboard

### Implementation

This is a server-side feature in our OAuth token endpoint. The published app doesn't need to do anything special — it just uses l4yercak3 OAuth.

**Changes needed:**
- Add `crm_auto_contact` boolean to builder app config
- In `convex/oauth/tokens.ts` token exchange, check if requesting app has this enabled
- If yes, call existing CRM contact creation (`/api/v1/crm/contacts`)
- Store the contact-to-app link via `objectLinks`

---

## Post-Deploy Integration

After a user deploys to Vercel:

### 1. Register Deployed URL

Store the production URL on the builder app object so we know where it's deployed.

```typescript
// Already exists: updateBuilderAppDeployment mutation
await updateBuilderAppDeployment({
  appId,
  productionUrl: "https://my-app.vercel.app",
  status: "deployed",
});
```

### 2. Webhook Registration

Auto-register the published app's webhook endpoint:
```
POST /api/v1/webhooks/register
{
  url: "https://my-app.vercel.app/api/webhook/l4yercak3",
  events: ["form.submitted", "payment.completed", "contact.created"],
  appId: "<builder_app_id>"
}
```

### 3. Custom Domain

Leverage existing `domainConfigOntology.ts`:
- DNS verification (TXT record)
- SSL certificate (via Vercel)
- Domain mapping to published app

### 4. Health Monitoring

Optional: Periodic health check of deployed apps.
- Ping the production URL
- Check webhook endpoint responds
- Update builder app status if down

---

## Existing Infrastructure Inventory

### OAuth System (`convex/oauth/`)
- Full OAuth 2.0 Authorization Code + PKCE
- JWT tokens with JOSE (HS256)
- App registration, scopes, token revocation
- Providers: GitHub, Google, Microsoft, Vercel, ActiveCampaign, WhatsApp
- **Status**: Production-ready, needs `/userinfo` endpoint

### Stripe (`convex/stripe*.ts`, `convex/paymentProviders/stripe.ts`)
- `stripeCheckout.ts` — Checkout session creation
- `stripeConnect.ts` — Stripe Connect for multi-party payments
- `stripeInvoices.ts` — Invoice creation and management
- `stripeWebhooks.ts` — Webhook handlers
- `stripeRefunds.ts` — Refund processing
- `stripe/stripePrices.ts` — Price management
- `api/v1/stripeInvoiceWebhooks.ts` — Invoice-specific webhooks
- **Status**: Production-ready

### Domain Management (`convex/domainConfigOntology.ts`)
- Custom domain registration per org
- DNS verification (TXT records)
- Capability flags: email, api, branding, webPublishing
- Tier-based limits (FREE: 1, STARTER: 1, PRO: 3, etc.)
- **Status**: Production-ready

### API Keys (`convex/actions/apiKeys.ts`)
- Scoped API key generation with bcrypt hashing
- Key prefix for identification
- Per-app keys with category-based scopes
- **Status**: Production-ready

### Builder App System (`convex/builderAppOntology.ts`)
- Full CRUD in `objects` table (type: "builder_app")
- v0 chat linkage, file storage, deployment tracking
- Object linking (events, products, forms, contacts)
- Connection config with API key references
- **Status**: Production-ready, needs publish config extension

---

## File Reference

### Existing Key Files

| File | Role |
|------|------|
| `src/contexts/builder-context.tsx` | All builder state management |
| `src/components/builder/builder-chat-panel.tsx` | Chat UI + sidebar mode selector |
| `src/components/builder/v0-connection-panel.tsx` | API catalog + connect flow |
| `src/components/builder/v0-publish-panel.tsx` | Current publish UI (to be replaced) |
| `src/components/builder/builder-preview-panel.tsx` | iframe preview |
| `convex/builderAppOntology.ts` | Builder app CRUD + connect action |
| `convex/integrations/github.ts` | GitHub repo creation + file commits |
| `convex/integrations/v0.ts` | v0 Platform API integration |
| `convex/publishingHelpers.ts` | Vercel deploy URL generation |
| `src/lib/api-catalog.ts` | Static API endpoint catalog |
| `convex/oauth/endpoints.ts` | OAuth HTTP endpoints |
| `convex/oauth/tokens.ts` | JWT generation |
| `convex/oauth/authorize.ts` | Authorization code flow |
| `convex/domainConfigOntology.ts` | Custom domain management |
| `convex/actions/apiKeys.ts` | Scoped API key generation |
| `convex/stripeCheckout.ts` | Stripe checkout |
| `convex/stripeInvoices.ts` | Invoice management |
| `convex/stripeWebhooks.ts` | Stripe webhook handlers |

### New Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `src/components/builder/publish-config-wizard.tsx` | 1 | Multi-step publish wizard |
| `src/contexts/publish-context.tsx` | 1 | Publish configuration state |
| `convex/scaffoldTemplates.ts` | 1 | Template strings for generated files |
| `src/lib/scaffold-generators/thin-client.ts` | 1 | Thin client scaffold generator |
| `src/lib/scaffold-generators/full-stack.ts` | 2 | Full-stack scaffold generator |
| `src/lib/scaffold-generators/hybrid.ts` | 3 | Hybrid scaffold generator |
| `convex/oauth/userinfo.ts` | 3 | `/oauth/userinfo` endpoint |
| `convex/webhookRegistry.ts` | 1 | Webhook registration for published apps |

---

## Execution Order Summary

```
Phase 1: Thin Client
├── 1. Publish Config Wizard (UI)
├── 2. Enhanced scaffold templates (per category)
├── 3. API wrapper library generator
├── 4. Webhook handler template
├── 5. Middleware template
├── 6. Update createRepoFromBuilderApp
└── 7. End-to-end testing

Phase 2: Full-Stack Generation
├── 1. Backend selection UI
├── 2. Convex schema generator
├── 3. Supabase schema generator
├── 4. Drizzle/Neon schema generator
├── 5. Data sync templates
├── 6. Auth middleware templates (NextAuth, Clerk)
└── 7. End-to-end testing per backend

Phase 3: Hybrid + OAuth
├── 1. /oauth/userinfo endpoint
├── 2. CORS for published domains
├── 3. Auto OAuth app registration on publish
├── 4. OAuth client templates for generated apps
├── 5. CRM contact hook in token exchange
├── 6. CRM auto-contact toggle in publish wizard
└── 7. End-to-end OAuth flow testing

Post-Deploy (parallel with phases)
├── 1. Webhook auto-registration
├── 2. Deploy URL tracking
├── 3. Custom domain integration
└── 4. Health monitoring (optional)
```
