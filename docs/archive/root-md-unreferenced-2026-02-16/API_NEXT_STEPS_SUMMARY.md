# API Development - Next Steps Summary

## 🎯 Current Situation

We've completed a comprehensive backend API audit for the freelancer portal integration. Here's where we are:

### ✅ What's Complete

1. **OAuth Authentication** - Backend is production-ready
   - Endpoints: `/api/v1/auth/sync-user`, `/api/v1/auth/validate-token`, `/api/v1/auth/user`
   - Frontend team needs to implement NextAuth.js (2-3 days)
   - Full documentation: `docs/OAUTH_ARCHITECTURE_CLARIFICATION.md` and `docs/FRONTEND_OAUTH_SETUP.md`

2. **CRM API** - Fully implemented and production-ready
   - Endpoints: Create, read, list contacts and organizations
   - Files: `convex/api/v1/crm.ts`, `convex/api/v1/crmInternal.ts`
   - Full CRUD operations with filtering, pagination, search

3. **User API** - Complete for frontend users
   - Endpoints: Get profile, transactions, tickets, events
   - File: `convex/api/v1/users.ts`

### 🟡 What Needs Work

1. **Projects API** - Backend complete, HTTP API missing
   - Backend: `convex/projectOntology.ts` ✅ (full CRUD, auto-generated codes, CRM integration)
   - HTTP API: **Needs to be created** 🔴
   - Estimated: 2-3 days

2. **Invoices API** - Backend complete, HTTP API incomplete
   - Backend: `convex/invoicingOntology.ts` ✅ (B2B/B2C, PDF generation, full workflow)
   - HTTP API: Only 1 endpoint exists (`GET /invoices/:id/pdf`)
   - **Needs expansion** 🔴
   - Estimated: 3-4 days

---

## 🎯 Next Task: Create Projects HTTP API

### Goal
Expose the complete project management backend via HTTP API endpoints for the freelancer portal.

### Backend Already Has

**File:** `convex/projectOntology.ts`

**Available Queries/Mutations:**
- `getProjects(sessionId, organizationId, subtype?, status?, priority?)` ✅
- `getProject(sessionId, projectId)` ✅
- `createProject(sessionId, organizationId, {...})` ✅
- `updateProject(sessionId, projectId, {...})` ✅
- `archiveProject(sessionId, projectId)` ✅
- `deleteProject(sessionId, projectId)` ✅
- `updateProjectDetailedDescription(sessionId, projectId, html)` ✅

**Features:**
- Auto-generated project codes: `PRJ-YYYY-###` (e.g., `PRJ-2025-001`)
- Budget tracking (amount + currency)
- Priority levels (low, medium, high, critical)
- Progress tracking (0-100%)
- Status workflow (draft → planning → active → on_hold → completed/cancelled)
- CRM integration (link to client organization)
- Rich HTML descriptions

**Project Types:**
- `client_project` - Client-facing projects
- `internal` - Internal company projects
- `campaign` - Marketing campaigns
- `product_development` - Product development
- `other` - Other project types

### HTTP API Endpoints to Create

**File to create:** `convex/api/v1/projects.ts`
**Internal file:** `convex/api/v1/projectsInternal.ts`

#### Endpoints Needed:

1. **GET /api/v1/projects** - List all projects
   - Query params: `subtype`, `status`, `priority`, `clientOrgId`, `search`, `limit`, `offset`
   - Returns: Paginated list with total count

2. **GET /api/v1/projects/:projectId** - Get project details
   - Returns: Complete project object with all metadata

3. **POST /api/v1/projects** - Create new project
   - Body: Project details (name, subtype, dates, budget, priority, etc.)
   - Returns: Created project with auto-generated project code

4. **PATCH /api/v1/projects/:projectId** - Update project
   - Body: Partial project updates
   - Returns: Updated project object

5. **DELETE /api/v1/projects/:projectId** - Delete project
   - Only works for draft projects
   - Returns: Success confirmation

6. **POST /api/v1/projects/:projectId/archive** - Archive project
   - Sets status to "cancelled"
   - Returns: Success confirmation

### Authentication

- Use API key authentication (same as CRM API)
- Header: `Authorization: Bearer <api_key>`
- Scope projects to organization
- Verify permissions via existing `verifyApiKey` function

### Example Request/Response

**POST /api/v1/projects**
```json
{
  "subtype": "client_project",
  "name": "Website Redesign",
  "description": "Complete redesign of corporate website",
  "startDate": 1704067200000,
  "targetEndDate": 1709251200000,
  "budget": {
    "amount": 50000,
    "currency": "USD"
  },
  "priority": "high",
  "clientOrgId": "k6pqr678..."
}
```

**Response:**
```json
{
  "success": true,
  "projectId": "k8vwx234...",
  "projectCode": "PRJ-2025-001",
  "project": {
    "_id": "k8vwx234...",
    "organizationId": "k2def456...",
    "type": "project",
    "subtype": "client_project",
    "name": "Website Redesign",
    "description": "Complete redesign of corporate website",
    "status": "draft",
    "customProperties": {
      "projectCode": "PRJ-2025-001",
      "startDate": 1704067200000,
      "targetEndDate": 1709251200000,
      "budget": {
        "amount": 50000,
        "currency": "USD"
      },
      "priority": "high",
      "progress": 0,
      "clientOrgId": "k6pqr678..."
    },
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  }
}
```

---

## 🎯 After Projects API: Create Invoices HTTP API

### Goal
Expand the invoice API to include full CRUD operations (currently only PDF download exists).

### Backend Already Has

**File:** `convex/invoicingOntology.ts`

**Available Queries/Mutations:**
- `listInvoices(sessionId, organizationId, filters?)` ✅
- `getInvoice(sessionId, invoiceId)` ✅
- `createInvoice(sessionId, {...})` ✅
- `updateInvoice(sessionId, invoiceId, {...})` ✅
- `markInvoiceSent(sessionId, invoiceId, sentDate, sentTo)` ✅
- `markInvoicePaid(sessionId, invoiceId, paidDate, paymentMethod, transactionRef?)` ✅
- `cancelInvoice(sessionId, invoiceId, reason?)` ✅
- `getInvoicesByContact(sessionId, contactId)` ✅
- `getInvoicesByCrmOrganization(sessionId, crmOrgId)` ✅

**Features:**
- B2B/B2C invoice support
- Auto-generated invoice numbers: `INV-YYYY-MM-###`
- PDF generation (already has endpoint: `GET /api/v1/invoices/:id/pdf`)
- Email sending (backend logic exists)
- Payment status tracking
- Line items with tax calculations
- Multiple payment terms (net7, net15, net30, etc.)

### HTTP API Endpoints to Create

**File to expand:** `convex/api/v1/invoices.ts` (already exists with 1 endpoint)
**Internal file:** `convex/api/v1/invoicesInternal.ts`

#### Endpoints Needed:

1. **GET /api/v1/invoices** - List invoices
   - Query params: `status`, `type`, `contactId`, `crmOrganizationId`, `startDate`, `endDate`, `limit`, `offset`
   - Returns: Paginated invoice list

2. **GET /api/v1/invoices/:invoiceId** - Get invoice details (JSON)
   - Returns: Complete invoice with line items

3. **GET /api/v1/invoices/:invoiceId/pdf** - Download PDF ✅ (already exists)

4. **POST /api/v1/invoices** - Create invoice
   - Body: Invoice details, line items, billing info
   - Returns: Created invoice with auto-generated number

5. **PATCH /api/v1/invoices/:invoiceId** - Update invoice
   - Only works for draft invoices
   - Returns: Updated invoice

6. **POST /api/v1/invoices/:invoiceId/send** - Mark as sent
   - Body: `{ recipientEmail, recipientName, message?, attachPdf: true }`
   - Returns: Success with sent timestamp

7. **POST /api/v1/invoices/:invoiceId/pay** - Mark as paid
   - Body: `{ paidDate, paymentMethod, transactionRef?, notes? }`
   - Returns: Success with payment details

8. **POST /api/v1/invoices/:invoiceId/cancel** - Cancel invoice
   - Body: `{ reason? }`
   - Returns: Success confirmation

9. **GET /api/v1/invoices/by-contact/:contactId** - Get contact's invoices

10. **GET /api/v1/invoices/by-organization/:orgId** - Get organization's invoices

---

## 📋 Implementation Order

### Phase 1: Projects API (Days 1-3)
1. Create `convex/api/v1/projects.ts`
2. Create `convex/api/v1/projectsInternal.ts`
3. Register routes in `convex/http.ts`
4. Test all endpoints
5. Update documentation

### Phase 2: Invoices API (Days 4-7)
1. Expand `convex/api/v1/invoices.ts`
2. Expand `convex/api/v1/invoicesInternal.ts`
3. Register routes in `convex/http.ts`
4. Test all endpoints
5. Update documentation

### Phase 3: Testing & Documentation (Days 8-10)
1. Create Postman collection
2. Write integration tests
3. Update API documentation with examples
4. Create quickstart guide for frontend team

---

## 🔧 Technical Patterns to Follow

### 1. API Endpoint Structure (from existing CRM API)

```typescript
// convex/api/v1/projects.ts
import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

export const listProjects = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, { apiKey });

    if (!authContext) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Update API key usage
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || undefined;
    // ... more params

    // 4. Call internal query
    const result = await ctx.runQuery(
      internal.api.v1.projectsInternal.listProjectsInternal,
      { organizationId: authContext.organizationId, subtype, status, ... }
    );

    // 5. Return response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": authContext.organizationId,
      }
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
```

### 2. Register Routes in http.ts

```typescript
// convex/http.ts
import * as projects from "./api/v1/projects";

http.route({
  path: "/api/v1/projects",
  method: "GET",
  handler: projects.listProjects,
});

http.route({
  path: "/api/v1/projects/:projectId",
  method: "GET",
  handler: projects.getProject,
});

// ... more routes
```

### 3. Internal Query Pattern

```typescript
// convex/api/v1/projectsInternal.ts
import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

export const listProjectsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Call existing projectOntology queries
    const projects = await ctx.runQuery(api.projectOntology.getProjects, {
      sessionId: "internal", // Internal calls don't need session
      organizationId: args.organizationId,
      subtype: args.subtype,
      status: args.status,
      priority: args.priority,
    });

    // Apply pagination
    const total = projects.length;
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    const paginatedProjects = projects.slice(offset, offset + limit);

    return {
      projects: paginatedProjects,
      total,
      limit,
      offset,
    };
  },
});
```

---

## 📚 Reference Files

### Existing API Examples:
- `convex/api/v1/crm.ts` - Complete CRUD API (reference for patterns)
- `convex/api/v1/crmInternal.ts` - Internal query handlers
- `convex/api/v1/users.ts` - User profile API
- `convex/api/v1/auth.ts` - Authentication endpoints
- `convex/api/auth.ts` - API key verification helpers

### Backend Logic:
- `convex/projectOntology.ts` - Project CRUD operations
- `convex/invoicingOntology.ts` - Invoice CRUD operations
- `convex/crmOntology.ts` - CRM operations (for reference)

### Routing:
- `convex/http.ts` - HTTP route registration

---

## ✅ Ready to Start

All the backend logic exists and is production-ready. We just need to create HTTP wrappers around it with proper authentication and error handling.

**Next command:** Start implementing the Projects API!

---

*Created: December 4, 2025*
*Ready for: Projects API implementation*
