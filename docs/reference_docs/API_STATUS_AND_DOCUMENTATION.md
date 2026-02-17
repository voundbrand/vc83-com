# Backend API Status & Frontend Integration Guide

## Executive Summary

This document provides a comprehensive overview of the backend API status for integration with the freelancer client portal. The backend is built on Convex (serverless backend) with a robust ontology system for data management.

### Current Status: 🟡 PARTIALLY COMPLETE

- ✅ **User OAuth**: Partially implemented (needs completion)
- ✅ **CRM API**: Fully implemented (contacts & organizations)
- ✅ **Invoice Backend**: Fully implemented (needs API endpoints)
- 🟡 **Project Management**: Basic backend exists (needs API endpoints)

---

## Table of Contents

1. [Authentication & OAuth](#1-authentication--oauth)
2. [CRM Integration](#2-crm-integration)
3. [Project Management](#3-project-management)
4. [Invoicing System](#4-invoicing-system)
5. [API Architecture](#5-api-architecture)
6. [Next Steps](#6-next-steps)

---

## 1. Authentication & OAuth

### Status: ✅ BACKEND COMPLETE, FRONTEND NEEDS NEXTAUTH.JS

**IMPORTANT DISTINCTION:** There are **two separate OAuth systems** in this platform:

#### 🔵 Platform OAuth (Admin/Staff Users)
- **Purpose**: Platform administrators connecting Microsoft accounts for email/calendar features
- **Storage**: `users` table + `oauthConnections` table
- **Sessions**: `sessions` table
- **Handler**: Convex backend (`convex/oauth/microsoft.ts`)
- **Use Case**: Staff members sync their Microsoft 365 account to send emails, access calendars, etc.
- **Status**: ✅ Fully implemented

#### 🟢 Frontend OAuth (Customer/Freelancer Users)
- **Purpose**: Customer authentication for accessing the freelancer portal
- **Storage**: `objects` table with `type: "frontend_user"`
- **Sessions**: `frontendSessions` table
- **Handler**: **NextAuth.js on frontend** + Backend sync endpoint
- **Use Case**: Freelancers/customers log in with Google/Microsoft to access their projects, invoices, etc.
- **Status**: ✅ Backend ready, frontend needs to implement NextAuth.js

### What Exists (Frontend OAuth)

#### Backend Files
- `convex/api/v1/auth.ts` - Frontend user sync/validation endpoints ✅
- `convex/auth.ts` - Internal user authentication helpers ✅
- `convex/frontendUserQueries.ts` - Frontend user data queries ✅
- `convex/schemas/coreSchemas.ts` - `frontendSessions` table definition ✅

#### Frontend OAuth Architecture

```
┌─────────────────────┐
│  Frontend (Next.js) │
│   + NextAuth.js     │ ← Frontend implements OAuth flow
└──────────┬──────────┘
           │
           │ 1. User clicks "Sign in with Google/Microsoft"
           │ 2. NextAuth.js redirects to OAuth provider
           │ 3. User grants permission
           │ 4. OAuth provider redirects back
           │ 5. NextAuth.js calls backend sync endpoint
           │
           ▼
┌─────────────────────────────────────────────────┐
│  Backend (Convex)                               │
│  POST /api/v1/auth/sync-user                    │
│  ✅ Creates/updates frontend_user in objects    │
│  ✅ Links to CRM contact by email               │
│  ✅ Returns user ID for session                 │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Frontend stores    │
│  user ID as token   │
│  for API calls      │
└─────────────────────┘
```

#### Available API Endpoints

##### POST `/api/v1/auth/sync-user`
Synchronizes a frontend user after OAuth login (Google/Microsoft).

**Called by:** NextAuth.js on the frontend after successful OAuth login

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "oauthProvider": "google" | "microsoft",
  "oauthId": "provider-specific-user-id"
}
```

**What the backend does:**
1. Searches for existing `frontend_user` by email in `objects` table
2. If found: Updates `lastLogin` timestamp and OAuth details
3. If not found: Creates new `frontend_user` object
4. Looks for matching CRM contact by email (auto-linking)
5. Returns complete user object with CRM context

**Response:**
```json
{
  "_id": "k1abc123...",
  "organizationId": "k2def456...",
  "type": "frontend_user",
  "name": "user@example.com",
  "status": "active",
  "customProperties": {
    "oauthProvider": "google",
    "oauthId": "provider-specific-user-id",
    "displayName": "John Doe",
    "lastLogin": 1234567890,
    "crmContactId": "k3ghi789...",
    "crmOrganizationId": "k4jkl012..."
  },
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

**⚠️ IMPORTANT:** Store the `_id` field - this is the user's session token for all subsequent API calls!

##### POST `/api/v1/auth/validate-token`
Validates a frontend user's session token.

**Headers:**
```
Authorization: Bearer <frontend_user_id>
```

**Response:**
```json
{
  "valid": true,
  "user": { /* frontend_user object */ },
  "crmContext": {
    "contactId": "k3ghi789...",
    "organizationId": "k4jkl012..."
  }
}
```

##### GET `/api/v1/auth/user`
Get current authenticated user's details.

**Headers:**
```
Authorization: Bearer <frontend_user_id>
```

**Response:**
```json
{
  "_id": "k1abc123...",
  "email": "user@example.com",
  "displayName": "John Doe",
  "oauthProvider": "google",
  "crmContext": {
    "contactId": "k3ghi789...",
    "organizationId": "k4jkl012..."
  }
}
```

### Frontend OAuth Implementation (Required)

The backend API is **complete and ready**. The frontend team needs to implement NextAuth.js:

#### Frontend Tasks (2-3 days)

1. **Install NextAuth.js** ✅ Simple
   ```bash
   npm install next-auth@beta
   ```

2. **Configure OAuth Providers** ✅ Standard setup
   - Register OAuth apps with Google and Microsoft
   - Add client IDs and secrets to `.env.local`
   - Configure redirect URIs

3. **Create NextAuth Route** ✅ Documented in `docs/reference_docs/frontend/frontend-oauth-setup.md`
   - File: `app/api/auth/[...nextauth]/route.ts`
   - Configure Google and Microsoft providers
   - Add `signIn` callback to call `/api/v1/auth/sync-user`
   - Add `jwt` and `session` callbacks to store user ID

4. **Create Sign In Page** ✅ Example provided
   - File: `app/auth/signin/page.tsx`
   - Buttons for Google and Microsoft login

5. **Implement API Client** ✅ Example provided
   - File: `lib/api-client.ts`
   - Helper functions to call backend with user ID in Authorization header

6. **Add Protected Routes** ✅ Example provided
   - Use NextAuth middleware or layout guards
   - Redirect unauthenticated users to sign-in page

#### Complete Documentation Available

📖 **See `docs/reference_docs/frontend/frontend-oauth-setup.md`** for:
- Step-by-step setup guide
- Complete code examples
- OAuth app registration instructions
- Troubleshooting guide
- Production checklist

### What's NOT Missing (Common Misconceptions)

❌ **"Backend needs OAuth callback handler"**
- ✅ Not needed! NextAuth.js handles OAuth callbacks on frontend

❌ **"Backend needs token refresh"**
- ✅ Not needed! NextAuth.js handles token refresh automatically

❌ **"Backend needs session management"**
- ✅ Backend endpoint validates user ID (simple and stateless)

❌ **"Backend needs Google OAuth implementation"**
- ✅ Not needed! Frontend NextAuth.js supports both Google and Microsoft
- ✅ Backend is provider-agnostic (just stores `oauthProvider` + `oauthId`)

### Implementation Priority: 🟢 FRONTEND ONLY

**Backend status:** ✅ Complete and production-ready
**Frontend status:** ⏳ Needs NextAuth.js implementation (2-3 days)
**Blocker:** None - frontend team can start immediately using provided documentation

---

## 2. CRM Integration

### Status: ✅ FULLY IMPLEMENTED

The CRM system is production-ready with full API coverage for contacts and organizations.

### Available API Endpoints

All CRM endpoints require API key authentication:
```
Authorization: Bearer <api_key>
```

#### POST `/api/v1/crm/contacts`
Create or update a CRM contact.

**Request:**
```json
{
  "subtype": "lead" | "customer" | "prospect",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "jobTitle": "Developer",
  "source": "api",
  "sourceRef": "website-form",
  "tags": ["freelancer", "developer"],
  "notes": "Interested in project management features",
  "customFields": {
    "skillLevel": "senior",
    "availability": "full-time"
  },
  "organizationInfo": {
    "name": "Acme Corp",
    "website": "https://acme.com",
    "industry": "Technology",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94105",
      "country": "US"
    },
    "taxId": "12-3456789",
    "billingEmail": "billing@acme.com",
    "phone": "+1234567890"
  }
}
```

**Response:**
```json
{
  "success": true,
  "contactId": "k5mno345...",
  "crmOrganizationId": "k6pqr678...",
  "isNewContact": true,
  "message": "Contact created successfully"
}
```

#### GET `/api/v1/crm/contacts`
List all contacts for your organization.

**Query Parameters:**
- `subtype`: Filter by contact type (lead, customer, prospect)
- `status`: Filter by status (active, inactive)
- `source`: Filter by source (event, checkout, api)
- `limit`: Number of results (default: 50, max: 200)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "contacts": [
    {
      "id": "k5mno345...",
      "name": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "company": "Acme Corp",
      "subtype": "lead",
      "status": "active",
      "source": "api",
      "tags": ["freelancer", "developer"],
      "createdAt": 1234567890
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

#### GET `/api/v1/crm/contacts/:contactId`
Get details of a specific contact.

**Response:**
```json
{
  "id": "k5mno345...",
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "jobTitle": "Developer",
  "subtype": "lead",
  "status": "active",
  "source": "api",
  "sourceRef": "website-form",
  "tags": ["freelancer", "developer"],
  "notes": "Interested in project management features",
  "customFields": {
    "skillLevel": "senior",
    "availability": "full-time"
  },
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

#### POST `/api/v1/crm/contacts/from-event`
Create a contact from an event registration (specialized endpoint).

**Request:**
```json
{
  "eventId": "k7stu901...",
  "eventName": "Tech Conference 2025",
  "eventDate": 1234567890,
  "attendeeInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "company": "Acme Corp",
    "tags": ["vip", "speaker"]
  },
  "organizationInfo": {
    "name": "Acme Corp",
    "website": "https://acme.com",
    "industry": "Technology"
  }
}
```

**Response:**
```json
{
  "success": true,
  "contactId": "k5mno345...",
  "eventId": "k7stu901...",
  "crmOrganizationId": "k6pqr678...",
  "organizationId": "k2def456...",
  "isNewContact": true,
  "message": "Contact created successfully"
}
```

### Backend CRM Queries

The following Convex queries are available for direct database access (internal use):

- `getContacts(sessionId, organizationId, subtype?, status?)`
- `getContact(sessionId, contactId)`
- `getCrmOrganizations(sessionId, organizationId, subtype?, status?)`
- `getCrmOrganization(sessionId, crmOrgId)`
- `searchContacts(sessionId, organizationId, searchTerm, limit?)`
- `getContactsByOrganization(sessionId, crmOrgId)`

### Implementation Priority: ✅ COMPLETE

No additional work required for MVP. The CRM API is production-ready.

---

## 3. Project Management

### Status: 🟡 BACKEND COMPLETE, API MISSING

The project management backend is fully implemented with comprehensive features, but HTTP API endpoints need to be created.

### Backend Features (Available)

**File:** `convex/projectOntology.ts`

#### Available Convex Queries/Mutations:

##### `getProjects(sessionId, organizationId, subtype?, status?, priority?)`
Returns all projects for an organization with optional filters.

##### `getProject(sessionId, projectId)`
Get a single project by ID.

##### `createProject(sessionId, organizationId, data)`
Create a new project with the following structure:

```typescript
{
  sessionId: string,
  organizationId: Id<"organizations">,
  subtype: "client_project" | "internal" | "campaign" | "product_development" | "other",
  name: string,
  description?: string,
  startDate?: number, // Unix timestamp
  targetEndDate?: number, // Unix timestamp
  budget?: {
    amount: number,
    currency: string
  },
  priority?: "low" | "medium" | "high" | "critical",
  clientOrgId?: Id<"objects">, // Link to CRM organization
  customProperties?: Record<string, any>
}
```

**Features:**
- Auto-generates project code: `PRJ-YYYY-###` (e.g., `PRJ-2025-001`)
- Budget tracking (amount + currency)
- Priority levels (low, medium, high, critical)
- Progress tracking (0-100%)
- CRM integration (link to client organization)
- Status workflow: draft → planning → active → on_hold → completed/cancelled

##### `updateProject(sessionId, projectId, updates)`
Update project details including status, progress, budget, etc.

##### `archiveProject(sessionId, projectId)`
Soft delete (sets status to "cancelled").

##### `deleteProject(sessionId, projectId)`
Hard delete (only allowed for draft projects).

##### `updateProjectDetailedDescription(sessionId, projectId, detailedDescription)`
Update rich HTML description.

### What's Missing

**HTTP API Endpoints Needed:**

1. `GET /api/v1/projects` - List all projects
2. `GET /api/v1/projects/:projectId` - Get project details
3. `POST /api/v1/projects` - Create new project
4. `PATCH /api/v1/projects/:projectId` - Update project
5. `DELETE /api/v1/projects/:projectId` - Delete project
6. `POST /api/v1/projects/:projectId/archive` - Archive project

### Project Data Structure

```typescript
{
  _id: "k8vwx234...",
  organizationId: "k2def456...",
  type: "project",
  subtype: "client_project",
  name: "Website Redesign",
  description: "Complete redesign of corporate website",
  status: "active",
  customProperties: {
    projectCode: "PRJ-2025-001",
    startDate: 1704067200000,
    targetEndDate: 1709251200000,
    budget: {
      amount: 50000,
      currency: "USD"
    },
    priority: "high",
    progress: 45,
    clientOrgId: "k6pqr678...",
    detailedDescription: "<p>Rich HTML content</p>"
  },
  createdBy: "k1abc123...",
  createdAt: 1704067200000,
  updatedAt: 1706659200000
}
```

### Implementation Priority: 🔴 HIGH

**Required for MVP:**
- Create HTTP API endpoints for all project operations
- Add API key authentication
- Implement pagination for project lists
- Add project search/filtering

---

## 4. Invoicing System

### Status: 🟡 BACKEND COMPLETE, API INCOMPLETE

The invoicing system has a comprehensive backend with B2B/B2C support, but only basic API endpoints exist.

### Available API Endpoints

#### GET `/api/v1/invoices/:invoiceId`
Download invoice as PDF.

**Headers:**
```
Authorization: Bearer <api_key>
```

**Response:** PDF file (`application/pdf`)

### Backend Features (Available)

**File:** `convex/invoicingOntology.ts`

#### Invoice Types:
- `b2b_consolidated` - Multiple employees → single employer invoice
- `b2b_single` - Single employee → employer invoice
- `b2c_single` - Direct customer invoice

#### Invoice Status Workflow:
- `draft` - Initial creation
- `sent` - Sent to customer
- `paid` - Payment received
- `overdue` - Past due date
- `cancelled` - Cancelled invoice
- `awaiting_employer_payment` - B2B specific status

#### Available Convex Queries/Mutations:

##### `listInvoices(sessionId, organizationId, filters?)`
List all invoices with optional filtering:
- status: draft | sent | paid | overdue | cancelled
- type: b2b_consolidated | b2b_single | b2c_single
- dateRange: { startDate, endDate }
- contactId: Filter by CRM contact
- crmOrganizationId: Filter by CRM organization

##### `getInvoice(sessionId, invoiceId)`
Get complete invoice details including line items.

##### `createInvoice(sessionId, data)`
Create a new invoice with the following structure:

```typescript
{
  sessionId: string,
  organizationId: Id<"organizations">,
  type: "b2b_consolidated" | "b2b_single" | "b2c_single",
  invoiceNumber: string, // Auto-generated: INV-YYYY-MM-###
  issueDate: number, // Unix timestamp
  dueDate: number, // Unix timestamp
  currency: string, // "USD", "EUR", etc.
  subtotalInCents: number,
  taxAmountInCents: number,
  totalAmountInCents: number,
  lineItems: InvoiceLineItem[], // Array of line items
  billTo: {
    contactId?: Id<"objects">,
    crmOrganizationId?: Id<"objects">,
    name: string,
    email: string,
    address?: object
  },
  paymentTerms: "due_on_receipt" | "net7" | "net15" | "net30" | "net60" | "net90",
  notes?: string,
  customFields?: Record<string, any>
}
```

##### `updateInvoice(sessionId, invoiceId, updates)`
Update invoice details.

##### `markInvoiceSent(sessionId, invoiceId, sentDate, sentTo)`
Mark invoice as sent.

##### `markInvoicePaid(sessionId, invoiceId, paidDate, paymentMethod, transactionRef?)`
Mark invoice as paid.

##### `cancelInvoice(sessionId, invoiceId, reason?)`
Cancel an invoice.

##### `getInvoicesByContact(sessionId, contactId, includeArchived?)`
Get all invoices for a specific contact.

##### `getInvoicesByCrmOrganization(sessionId, crmOrgId, includeArchived?)`
Get all invoices for a specific organization.

### Invoice Data Structure

```typescript
{
  _id: "k9xyz567...",
  organizationId: "k2def456...",
  type: "invoice",
  subtype: "b2c_single",
  name: "INV-2025-01-001",
  status: "sent",
  customProperties: {
    invoiceNumber: "INV-2025-01-001",
    type: "b2c_single",
    issueDate: 1704067200000,
    dueDate: 1706659200000,
    sentDate: 1704153600000,
    currency: "USD",
    subtotalInCents: 100000, // $1,000.00
    taxAmountInCents: 7000,  // $70.00
    totalAmountInCents: 107000, // $1,070.00
    lineItems: [
      {
        transactionId: "k10abc890...",
        description: "Website development services",
        quantity: 10,
        unitPriceInCents: 10000, // $100.00
        totalPriceInCents: 100000,
        taxRatePercent: 7,
        taxAmountInCents: 7000
      }
    ],
    billTo: {
      contactId: "k5mno345...",
      crmOrganizationId: "k6pqr678...",
      name: "John Doe",
      email: "john.doe@example.com",
      address: {
        street: "123 Main St",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "US"
      }
    },
    paymentTerms: "net30",
    notes: "Payment due within 30 days"
  },
  createdBy: "k1abc123...",
  createdAt: 1704067200000,
  updatedAt: 1704153600000
}
```

### What's Missing

**HTTP API Endpoints Needed:**

1. `GET /api/v1/invoices` - List all invoices with filters
2. `POST /api/v1/invoices` - Create new invoice
3. `PATCH /api/v1/invoices/:invoiceId` - Update invoice
4. `POST /api/v1/invoices/:invoiceId/send` - Mark invoice as sent
5. `POST /api/v1/invoices/:invoiceId/pay` - Mark invoice as paid
6. `POST /api/v1/invoices/:invoiceId/cancel` - Cancel invoice
7. `GET /api/v1/invoices/:invoiceId/pdf` - Download invoice PDF (exists but needs enhancement)

### Implementation Priority: 🔴 HIGH

**Required for MVP:**
- Create HTTP API endpoints for all invoice operations
- Implement invoice PDF generation API
- Add invoice email sending capability
- Implement webhook for payment notifications

---

## 5. API Architecture

### Base URL

Production: `https://your-deployment-url.convex.site`
Development: `https://your-dev-url.convex.site`

### Authentication

Two authentication methods are supported:

#### 1. API Key Authentication (for CRM, Projects, Invoices)
```
Authorization: Bearer <api_key>
```

Generate API keys in the admin panel. API keys are scoped to an organization.

#### 2. OAuth Session Authentication (for User endpoints)
```
Authorization: Bearer <frontend_user_id>
```

After OAuth login, use the returned user ID as the bearer token.

### Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

Or direct data object for simple responses:
```json
{
  "id": "k1abc123...",
  "name": "Example"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Detailed error information (in development mode)"
}
```

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### CORS

Current configuration allows all origins (`*`). For production, this should be restricted:

```javascript
{
  "Access-Control-Allow-Origin": "https://your-frontend-domain.com",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
}
```

### Rate Limiting

⚠️ **Not yet implemented.** Consider adding rate limiting for production:
- API endpoints: 100 requests/minute per API key
- OAuth endpoints: 10 requests/minute per IP

---

## 6. Next Steps

### Immediate Priorities (Week 1-2)

#### 1. Frontend OAuth Implementation 🟢 FRONTEND TASK (Not Backend!)
**Status:** ✅ Backend complete, frontend needs to implement NextAuth.js

**Frontend team tasks:**
- [ ] Install NextAuth.js (`npm install next-auth@beta`)
- [ ] Register OAuth apps with Google and Microsoft
- [ ] Create NextAuth route (`app/api/auth/[...nextauth]/route.ts`)
- [ ] Implement sign-in page
- [ ] Create API client helpers
- [ ] Test OAuth flow end-to-end

**Backend team tasks:**
- [x] ✅ Sync-user endpoint complete
- [x] ✅ Validate-token endpoint complete
- [x] ✅ Get-user endpoint complete
- [ ] Optional: Update CORS headers to restrict to frontend domain

**Estimated time:** 2-3 days (frontend only)
**Documentation:** Complete guide in `docs/reference_docs/frontend/frontend-oauth-setup.md` and `docs/reference_docs/api/oauth-architecture-clarification.md`

#### 2. Create Project Management API 🔴 HIGH
- [ ] Create `/api/v1/projects.ts` endpoint file
- [ ] Implement all CRUD endpoints
- [ ] Add API key authentication
- [ ] Implement pagination and filtering
- [ ] Add search functionality
- [ ] Write API documentation
- [ ] Test all endpoints

**Estimated time:** 2-3 days

#### 3. Complete Invoice API 🔴 HIGH
- [ ] Create comprehensive `/api/v1/invoices.ts` endpoint file
- [ ] Implement all invoice operations (list, create, update, send, pay, cancel)
- [ ] Enhance PDF generation endpoint
- [ ] Add invoice email sending
- [ ] Implement payment webhooks
- [ ] Write API documentation
- [ ] Test all endpoints

**Estimated time:** 3-4 days

### Secondary Priorities (Week 3-4)

#### 4. API Improvements 🟡 MEDIUM
- [ ] Add rate limiting to all endpoints
- [ ] Implement API versioning strategy
- [ ] Add request/response logging
- [ ] Create API monitoring dashboard
- [ ] Set up error tracking (Sentry/similar)

**Estimated time:** 2-3 days

#### 5. Documentation & Testing 🟡 MEDIUM
- [ ] Create Postman/Insomnia collection
- [ ] Write integration tests for all endpoints
- [ ] Create API playground/sandbox
- [ ] Write frontend integration examples
- [ ] Create troubleshooting guide

**Estimated time:** 2-3 days

### Long-term Enhancements (Month 2+)

#### 6. Advanced Features 🟢 LOW
- [ ] Implement Google OAuth (in addition to Microsoft)
- [ ] Add GraphQL API layer (optional)
- [ ] Create SDK for common languages (JavaScript, Python)
- [ ] Add webhook system for real-time updates
- [ ] Implement bulk operations API
- [ ] Add data export/import endpoints

**Estimated time:** 2-4 weeks

---

## Development Workflow

### For Backend Team:

1. **Create API endpoint files** in `convex/api/v1/`
2. **Add routes** in `convex/http.ts`
3. **Test endpoints** using Convex dashboard or Postman
4. **Document endpoints** in this file
5. **Notify frontend team** when endpoints are ready

### For Frontend Team:

1. **Review API documentation** (this file)
2. **Implement API client** using provided endpoints
3. **Test integration** with backend
4. **Report issues** in GitHub issues
5. **Request additional features** as needed

### Communication Channels:

- **API questions:** Tag backend team in GitHub issues
- **Bug reports:** Create issue with `api-bug` label
- **Feature requests:** Create issue with `api-feature` label
- **Urgent issues:** Slack #api-integration channel

---

## API Client Example (TypeScript)

```typescript
// api-client.ts
export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // CRM Contacts
  async getContacts(filters?: {
    subtype?: string;
    status?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(
      `${this.baseUrl}/api/v1/crm/contacts?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.json();
  }

  async createContact(data: CreateContactRequest) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/crm/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  // Projects (TODO: implement when API is ready)
  async getProjects(filters?: {
    subtype?: string;
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }) {
    // Coming soon
    throw new Error('Project API not yet implemented');
  }

  // Invoices (TODO: implement when API is ready)
  async getInvoices(filters?: {
    status?: string;
    type?: string;
    contactId?: string;
    limit?: number;
    offset?: number;
  }) {
    // Coming soon
    throw new Error('Invoice API not yet implemented');
  }

  // OAuth
  async syncUser(oauthData: {
    email: string;
    name: string;
    oauthProvider: 'google' | 'microsoft';
    oauthId: string;
  }) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/auth/sync-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(oauthData),
      }
    );
    return response.json();
  }

  async validateToken(userId: string) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/auth/validate-token`,
      {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      }
    );
    return response.json();
  }
}

// Usage
const client = new ApiClient(
  'https://your-convex-url.convex.site',
  'your-api-key'
);

// Get all contacts
const contacts = await client.getContacts({
  status: 'active',
  limit: 50,
});

// Create a contact
const newContact = await client.createContact({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  subtype: 'lead',
});
```

---

## Support & Questions

For questions or issues with the API:

1. **Check this documentation first**
2. **Review example code** in the API client section
3. **Test endpoints** using Postman or similar tool
4. **Create a GitHub issue** with the `api-support` label
5. **Contact backend team** via Slack for urgent issues

---

## Changelog

- **2025-12-04**: Initial documentation created
  - Documented existing OAuth, CRM, and Invoice APIs
  - Identified missing Project Management API endpoints
  - Identified missing Invoice API endpoints
  - Created implementation priorities and timeline

---

*Last updated: December 4, 2025*
