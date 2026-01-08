# Backend API Completion Plan

## Overview

This document tracks the work needed to complete the HTTP API layer so that CLI applications can wire up to ALL L4yercak3 features via MCP tools.

**Goal**: Enable seamless application creation where a developer can connect their app and have full access to CRM, events, products, checkout, tickets, forms, projects, invoices, benefits, certificates, OAuth, and publishing.

---

## Current State Audit

### Fully Exposed (CLI can use now)

| Resource | Endpoints | Scope |
|----------|-----------|-------|
| CRM Contacts | LIST, GET, CREATE, UPDATE, DELETE, BULK, EXPORT | `contacts:read/write` |
| CRM Organizations | LIST, GET, CREATE, UPDATE | `contacts:read/write` |
| Events | LIST, GET, CREATE, UPDATE, CANCEL + attendees, products | `events:read/write` |
| Forms | LIST, GET, CREATE, DELETE + responses, public forms | `forms:read/write` |
| Projects | Full CRUD + milestones, tasks, team, comments, activity | `projects:read/write` |
| Invoices | Full CRUD + seal, send, PDF, sync-stripe | `invoices:read/write` |
| Benefits | Full CRUD + claims | `benefits:read/write` |
| Commissions | LIST, GET, CREATE + payouts | `commissions:read/write` |
| CLI Applications | Full CRUD + sync, by-path | `applications:read/write` |

### Partially Exposed (Gaps to fill)

| Resource | What Exists | What's Missing |
|----------|-------------|----------------|
| Products | GET by ID only | LIST, CREATE, UPDATE, DELETE |
| Tickets | PDF only | LIST, GET, CREATE, UPDATE |
| Checkout | config, sessions, confirm | LIST instances, GET, CREATE checkout instance |

### Not Exposed (Internal functions exist)

| Resource | Internal File | HTTP Routes |
|----------|--------------|-------------|
| Certificates | `certificatesInternal.ts` | NONE |
| Publishing/Pages | `publishingOntology.ts` | Only `getPublishedContentForFrontend` |
| Templates | `templatesInternal.ts` | NONE |
| OAuth Connections | `auth.ts` | NONE (managing connections) |

---

## Implementation Tasks

### Phase 1: Core Missing APIs

#### 1.1 Certificates API
**File**: `convex/api/v1/certificates.ts` (NEW)
**Routes to add to http.ts**:
```
GET    /api/v1/certificates           - List certificates
GET    /api/v1/certificates/:id       - Get certificate by ID
POST   /api/v1/certificates           - Create certificate
PATCH  /api/v1/certificates/:id       - Update certificate
DELETE /api/v1/certificates/:id       - Delete certificate
POST   /api/v1/certificates/:id/revoke - Revoke certificate
```
**Scope**: `certificates:read`, `certificates:write`
**Internal functions**: Already exist in `certificatesInternal.ts`

#### 1.2 Products API (Extend)
**File**: `convex/api/v1/products.ts` (EXTEND)
**Routes to add**:
```
GET    /api/v1/products               - List products
POST   /api/v1/products               - Create product
PATCH  /api/v1/products/:id           - Update product
DELETE /api/v1/products/:id           - Delete product
```
**Scope**: `products:read`, `products:write`
**Internal functions**: Check `productsInternal.ts`

#### 1.3 Tickets API (Extend)
**File**: `convex/api/v1/tickets.ts` (EXTEND)
**Routes to add**:
```
GET    /api/v1/tickets                - List tickets
GET    /api/v1/tickets/:id            - Get ticket by ID
POST   /api/v1/tickets                - Create ticket
PATCH  /api/v1/tickets/:id            - Update ticket
```
**Scope**: `tickets:read`, `tickets:write`
**Internal functions**: Check `ticketsInternal.ts`

### Phase 2: Publishing & App Wiring

#### 2.1 Publishing API
**File**: `convex/api/v1/publishing.ts` (NEW)
**Routes**:
```
GET    /api/v1/publishing/pages                    - List published pages
GET    /api/v1/publishing/pages/:id                - Get page details
POST   /api/v1/publishing/pages                    - Create published page
PATCH  /api/v1/publishing/pages/:id                - Update page
DELETE /api/v1/publishing/pages/:id                - Delete page
POST   /api/v1/publishing/pages/:id/publish        - Publish page
POST   /api/v1/publishing/pages/:id/unpublish      - Unpublish page
PATCH  /api/v1/publishing/pages/:id/content-rules  - Set content rules
POST   /api/v1/publishing/pages/:id/link-app       - Link page to CLI app
```
**Scope**: `publishing:read`, `publishing:write`
**Internal functions**: Create from `publishingOntology.ts`

#### 2.2 Checkout Instances API
**File**: `convex/api/v1/checkout.ts` (EXTEND)
**Routes to add**:
```
GET    /api/v1/checkout/instances           - List checkout instances
GET    /api/v1/checkout/instances/:id       - Get checkout instance
POST   /api/v1/checkout/instances           - Create checkout instance
PATCH  /api/v1/checkout/instances/:id       - Update checkout instance
```
**Scope**: `checkout:read`, `checkout:write`
**Internal functions**: Check `checkoutCrudInternal.ts`

### Phase 3: Templates & OAuth

#### 3.1 Templates API
**File**: `convex/api/v1/templates.ts` (NEW)
**Routes**:
```
GET    /api/v1/templates                    - List available templates
GET    /api/v1/templates/:code              - Get template details
```
**Scope**: `templates:read`
**Purpose**: Allow CLI to discover available templates for app scaffolding

#### 3.2 OAuth Connections API
**File**: `convex/api/v1/oauthConnections.ts` (NEW)
**Routes**:
```
GET    /api/v1/oauth/connections            - List OAuth connections for org
GET    /api/v1/oauth/connections/:id        - Get connection status
DELETE /api/v1/oauth/connections/:id        - Disconnect OAuth provider
```
**Scope**: `oauth:read`, `oauth:write`
**Purpose**: Allow CLI apps to check what integrations are connected (Stripe, GitHub, etc.)

### Phase 4: App Manifest & Route Declarations

#### 4.1 Enhance Application Registration
**File**: `convex/api/v1/cliApplications.ts` (EXTEND)
**Add to registration payload**:
```typescript
routeDeclarations: [
  {
    path: "/events",              // App's route
    consumes: "event",            // L4yercak3 type it renders
    contentRules: {               // Optional: filtering rules
      filter: "future",
      limit: 10
    }
  },
  {
    path: "/checkout",
    consumes: "checkout_instance",
    linkedObjectId: "xxx"         // Specific checkout instance
  },
  {
    path: "/forms/:formId",
    consumes: "form"
  }
]
```

#### 4.2 Auto-Create Published Pages
When app registers with `routeDeclarations`, optionally auto-create `published_page` objects:
- Link pages to app via `pageIds`
- Set appropriate `contentRules`
- Configure external domain from app's deployment URL

---

## Scope Updates Required

### Add to `getPermissionsForRole()` in `cliAuth.ts`:

```typescript
const rolePermissions: Record<string, string[]> = {
  org_owner: [
    // ... existing
    "certificates:read", "certificates:write",
    "publishing:read", "publishing:write",
    "checkout:read", "checkout:write",
    "templates:read",
    "oauth:read", "oauth:write",
  ],
  admin: [
    // ... existing
    "certificates:read", "certificates:write",
    "publishing:read", "publishing:write",
    "checkout:read", "checkout:write",
    "templates:read",
    "oauth:read",
  ],
  // ... etc for other roles
};
```

---

## File Checklist

### New Files to Create
- [ ] `convex/api/v1/certificates.ts`
- [ ] `convex/api/v1/publishing.ts`
- [ ] `convex/api/v1/publishingInternal.ts`
- [ ] `convex/api/v1/templates.ts`
- [ ] `convex/api/v1/oauthConnections.ts`

### Files to Extend
- [ ] `convex/api/v1/products.ts` - Add LIST, CREATE, UPDATE, DELETE
- [ ] `convex/api/v1/tickets.ts` - Add LIST, GET, CREATE, UPDATE
- [ ] `convex/api/v1/checkout.ts` - Add instances CRUD
- [ ] `convex/api/v1/cliApplications.ts` - Add routeDeclarations
- [ ] `convex/api/v1/cliAuth.ts` - Add new scopes
- [ ] `convex/http.ts` - Add all new routes

---

## Testing Strategy

For each new endpoint:
1. Test with CLI session token
2. Test with API key
3. Test scope enforcement (read vs write)
4. Test CORS headers
5. Verify MCP tool can invoke successfully

---

## Priority Order

1. **Certificates** - You specifically mentioned this
2. **Products CRUD** - Critical for checkout integration
3. **Tickets CRUD** - Support system integration
4. **Publishing API** - Enable app↔page linking
5. **Checkout Instances** - Complete checkout flow
6. **Templates** - Discovery for scaffolding
7. **OAuth Connections** - Integration status checking
8. **Route Declarations** - Advanced app wiring

---

## Notes

- All endpoints follow existing patterns: universal auth → scope check → internal function
- Use `pathPrefix` routing for dynamic ID segments (Convex limitation)
- Always include CORS headers via `getCorsHeaders()`
- Add audit logging via `objectActions` table
