# API Implementation Roadmap
## Freelancer Portal Backend Integration

### Executive Summary

This document outlines the work required to complete the backend API for the freelancer client portal. The CRM API is production-ready, but OAuth, Projects, and Invoices need completion.

**Total Estimated Time:** 8-12 days (1.5-2.5 weeks)

---

## Sprint 1: OAuth Completion (3-5 days) 🔴 CRITICAL PATH

### Goal
Complete OAuth authentication for Microsoft and Google, enabling frontend users to authenticate and access the portal.

### Tasks

#### Backend Work (2-3 days)

1. **Complete OAuth Callback Handler** ✅ Partially Done
   - File: `convex/http.ts` - Add OAuth callback routes
   - Verify state token
   - Exchange authorization code for access token
   - Store OAuth tokens securely
   - Create/update frontend user record
   - Return session token to frontend

2. **Add Token Refresh Mechanism** ❌ Not Started
   - File: `convex/oauth/microsoft.ts`
   - Implement refresh token flow
   - Add automatic token refresh before expiry
   - Handle token refresh errors gracefully

3. **Implement Google OAuth** ❌ Not Started
   - File: `convex/oauth/google.ts` (new)
   - Mirror Microsoft OAuth implementation
   - Add Google-specific scope handling
   - Test with Google accounts

4. **Fix CORS Configuration** ❌ Not Started
   - File: `convex/api/v1/corsHeaders.ts`
   - Replace wildcard `*` with specific frontend domain
   - Add environment variable for allowed origins
   - Test CORS from frontend domain

#### Frontend Work (1-2 days)

5. **OAuth Callback Page** ❌ Not Started
   - Create `/oauth/callback` route
   - Parse OAuth response
   - Store session token
   - Redirect to dashboard

6. **Session Management** ❌ Not Started
   - Implement session persistence (localStorage/cookies)
   - Add session validation on app load
   - Handle session expiry
   - Implement logout

### Success Criteria
- [ ] Users can authenticate via Microsoft OAuth
- [ ] Users can authenticate via Google OAuth
- [ ] Sessions persist across page reloads
- [ ] Tokens refresh automatically before expiry
- [ ] CORS works from frontend domain
- [ ] Logout clears session properly

### Files to Create/Modify
- `convex/http.ts` - Add OAuth callback routes
- `convex/oauth/google.ts` - New file for Google OAuth
- `convex/oauth/microsoft.ts` - Add token refresh
- `convex/api/v1/corsHeaders.ts` - Fix CORS
- Frontend: `/oauth/callback` page
- Frontend: Session management hooks

---

## Sprint 2: Project Management API (2-3 days) 🔴 HIGH PRIORITY

### Goal
Expose project management functionality via HTTP API for frontend consumption.

### Tasks

#### Backend Work (2-3 days)

1. **Create Project API Endpoints** ❌ Not Started
   - File: `convex/api/v1/projects.ts` (new)
   - File: `convex/api/v1/projectsInternal.ts` (new)

   **Endpoints to implement:**
   - `GET /api/v1/projects` - List projects with filters
   - `GET /api/v1/projects/:projectId` - Get project details
   - `POST /api/v1/projects` - Create new project
   - `PATCH /api/v1/projects/:projectId` - Update project
   - `DELETE /api/v1/projects/:projectId` - Delete project
   - `POST /api/v1/projects/:projectId/archive` - Archive project

2. **Add API Routes** ❌ Not Started
   - File: `convex/http.ts`
   - Register all project endpoints
   - Add CORS handling
   - Add OPTIONS handlers

3. **Implement Pagination** ❌ Not Started
   - Add `limit` and `offset` parameters
   - Return total count in responses
   - Add cursor-based pagination (optional)

4. **Add Search & Filtering** ❌ Not Started
   - Filter by subtype (client_project, internal, etc.)
   - Filter by status (draft, active, completed, etc.)
   - Filter by priority
   - Search by name/description
   - Filter by client organization

5. **API Authentication** ✅ Already exists
   - Use existing API key authentication
   - Scope projects to organization
   - Verify permissions

### API Specification

```typescript
// GET /api/v1/projects
interface ListProjectsRequest {
  organizationId?: string;
  subtype?: 'client_project' | 'internal' | 'campaign' | 'product_development' | 'other';
  status?: 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  clientOrgId?: string;
  search?: string;
  limit?: number; // default: 50, max: 200
  offset?: number; // default: 0
}

interface ListProjectsResponse {
  projects: Project[];
  total: number;
  limit: number;
  offset: number;
}

// POST /api/v1/projects
interface CreateProjectRequest {
  subtype: 'client_project' | 'internal' | 'campaign' | 'product_development' | 'other';
  name: string;
  description?: string;
  startDate?: number;
  targetEndDate?: number;
  budget?: {
    amount: number;
    currency: string;
  };
  priority?: 'low' | 'medium' | 'high' | 'critical';
  clientOrgId?: string; // CRM organization ID
  customProperties?: Record<string, any>;
}

interface CreateProjectResponse {
  success: true;
  projectId: string;
  projectCode: string; // e.g., "PRJ-2025-001"
}

// PATCH /api/v1/projects/:projectId
interface UpdateProjectRequest {
  name?: string;
  description?: string;
  subtype?: string;
  status?: string;
  startDate?: number;
  targetEndDate?: number;
  budget?: { amount: number; currency: string };
  priority?: string;
  progress?: number; // 0-100
  clientOrgId?: string;
  customProperties?: Record<string, any>;
}

interface UpdateProjectResponse {
  success: true;
  projectId: string;
}
```

### Success Criteria
- [ ] All CRUD endpoints working
- [ ] Pagination implemented
- [ ] Filtering working for all fields
- [ ] Search by name/description working
- [ ] API key authentication enforced
- [ ] Errors handled gracefully
- [ ] Response format consistent with other APIs
- [ ] Documentation updated with examples

### Files to Create/Modify
- `convex/api/v1/projects.ts` - New API endpoints
- `convex/api/v1/projectsInternal.ts` - New internal queries
- `convex/http.ts` - Register routes
- `docs/API_STATUS_AND_DOCUMENTATION.md` - Update with new endpoints

---

## Sprint 3: Invoice API (3-4 days) 🔴 HIGH PRIORITY

### Goal
Complete invoice API for creating, managing, and retrieving invoices.

### Tasks

#### Backend Work (3-4 days)

1. **Expand Invoice API Endpoints** ❌ Partially Done
   - File: `convex/api/v1/invoices.ts` (exists but incomplete)
   - File: `convex/api/v1/invoicesInternal.ts` (exists but incomplete)

   **Endpoints to implement:**
   - `GET /api/v1/invoices` - List invoices with filters
   - `GET /api/v1/invoices/:invoiceId` - Get invoice details (JSON)
   - `GET /api/v1/invoices/:invoiceId/pdf` - Download PDF ✅ Exists
   - `POST /api/v1/invoices` - Create new invoice
   - `PATCH /api/v1/invoices/:invoiceId` - Update invoice
   - `POST /api/v1/invoices/:invoiceId/send` - Mark as sent
   - `POST /api/v1/invoices/:invoiceId/pay` - Mark as paid
   - `POST /api/v1/invoices/:invoiceId/cancel` - Cancel invoice
   - `GET /api/v1/invoices/by-contact/:contactId` - Get contact's invoices
   - `GET /api/v1/invoices/by-organization/:orgId` - Get org's invoices

2. **Add API Routes** ❌ Not Started
   - File: `convex/http.ts`
   - Register all invoice endpoints
   - Add CORS handling

3. **Enhance PDF Generation** ✅ Backend exists
   - Current endpoint works but needs testing
   - Ensure PDF template is correct
   - Add error handling for missing data

4. **Add Email Sending** ❌ Not Started
   - File: `convex/api/v1/invoices.ts`
   - New endpoint: `POST /api/v1/invoices/:invoiceId/email`
   - Use existing `invoiceEmailService.ts`
   - Support attachments (PDF)

5. **Implement Payment Webhooks** ❌ Not Started
   - File: `convex/http.ts`
   - New endpoint: `POST /api/v1/webhooks/payment`
   - Verify webhook signatures
   - Update invoice status on payment

### API Specification

```typescript
// GET /api/v1/invoices
interface ListInvoicesRequest {
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'awaiting_employer_payment';
  type?: 'b2b_consolidated' | 'b2b_single' | 'b2c_single';
  contactId?: string;
  crmOrganizationId?: string;
  startDate?: number;
  endDate?: number;
  limit?: number; // default: 50, max: 200
  offset?: number; // default: 0
}

interface ListInvoicesResponse {
  invoices: Invoice[];
  total: number;
  limit: number;
  offset: number;
}

// POST /api/v1/invoices
interface CreateInvoiceRequest {
  type: 'b2b_consolidated' | 'b2b_single' | 'b2c_single';
  issueDate: number;
  dueDate: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  billTo: {
    contactId?: string;
    crmOrganizationId?: string;
    name: string;
    email: string;
    address?: object;
  };
  paymentTerms: 'due_on_receipt' | 'net7' | 'net15' | 'net30' | 'net60' | 'net90';
  notes?: string;
  customFields?: Record<string, any>;
}

interface CreateInvoiceResponse {
  success: true;
  invoiceId: string;
  invoiceNumber: string; // e.g., "INV-2025-01-001"
  totalAmount: number;
}

// POST /api/v1/invoices/:invoiceId/send
interface SendInvoiceRequest {
  recipientEmail: string;
  recipientName: string;
  message?: string;
  attachPdf: boolean; // default: true
}

interface SendInvoiceResponse {
  success: true;
  sentAt: number;
  sentTo: string;
}

// POST /api/v1/invoices/:invoiceId/pay
interface MarkInvoicePaidRequest {
  paidDate: number;
  paymentMethod: string; // 'bank_transfer', 'credit_card', 'paypal', etc.
  transactionRef?: string;
  notes?: string;
}

interface MarkInvoicePaidResponse {
  success: true;
  paidAt: number;
  paymentMethod: string;
}
```

### Success Criteria
- [ ] All invoice CRUD endpoints working
- [ ] Invoice PDF generation working
- [ ] Invoice email sending working
- [ ] Payment status updates working
- [ ] Payment webhooks implemented
- [ ] Filtering and pagination working
- [ ] Invoice numbering auto-generated correctly
- [ ] Errors handled gracefully
- [ ] Documentation updated

### Files to Create/Modify
- `convex/api/v1/invoices.ts` - Expand endpoints
- `convex/api/v1/invoicesInternal.ts` - Add internal queries
- `convex/http.ts` - Register routes
- `docs/API_STATUS_AND_DOCUMENTATION.md` - Update documentation

---

## Sprint 4: Testing & Documentation (2-3 days) 🟡 IMPORTANT

### Goal
Ensure all APIs are tested, documented, and ready for frontend integration.

### Tasks

1. **Create Postman Collection** ❌ Not Started
   - Export all API endpoints
   - Add example requests/responses
   - Include authentication examples
   - Share with frontend team

2. **Write Integration Tests** ❌ Not Started
   - File: `convex/api/v1/__tests__/` (new)
   - Test all endpoints
   - Test error cases
   - Test authentication
   - Test pagination

3. **API Monitoring** ❌ Not Started
   - Add request logging
   - Set up error tracking (Sentry)
   - Add performance monitoring
   - Create dashboard for API metrics

4. **Update Documentation** ❌ Not Started
   - Complete API examples for all endpoints
   - Add troubleshooting guide
   - Create quickstart guide for frontend
   - Add video walkthrough (optional)

5. **Frontend Integration Examples** ❌ Not Started
   - Create TypeScript API client
   - Add React hooks examples
   - Add error handling examples
   - Add authentication flow example

### Success Criteria
- [ ] Postman collection created and shared
- [ ] All endpoints have integration tests
- [ ] API monitoring set up
- [ ] Documentation complete with examples
- [ ] Frontend team can integrate independently
- [ ] Common issues documented

---

## Long-term Enhancements (Optional, Month 2+)

### Advanced Features
- [ ] GraphQL API layer (alternative to REST)
- [ ] Webhook system for real-time updates
- [ ] Bulk operations (create/update multiple records)
- [ ] Data export/import endpoints
- [ ] Advanced search with full-text indexing
- [ ] API rate limiting per organization
- [ ] API usage analytics dashboard
- [ ] SDK for JavaScript/TypeScript
- [ ] SDK for Python
- [ ] API versioning strategy (v2, v3, etc.)

---

## Risk Mitigation

### Potential Blockers

1. **OAuth Configuration Issues**
   - Risk: Environment variables not set correctly
   - Mitigation: Validate all env vars on startup
   - Fallback: Provide clear error messages

2. **CORS Problems**
   - Risk: Frontend can't call API from different domain
   - Mitigation: Test CORS early, use proper headers
   - Fallback: Use proxy during development

3. **Performance Issues**
   - Risk: Slow response times with large datasets
   - Mitigation: Implement pagination early
   - Fallback: Add database indexes

4. **Authentication Complexity**
   - Risk: Session management across OAuth providers
   - Mitigation: Use standard JWT approach
   - Fallback: Simplify to single provider for MVP

### Contingency Plans

1. **If OAuth takes longer than expected**
   - Fallback to simple email/password auth for MVP
   - Add OAuth in phase 2

2. **If invoice PDF generation is slow**
   - Generate PDFs asynchronously
   - Return PDF URL instead of inline PDF

3. **If API development falls behind**
   - Prioritize read endpoints (GET) first
   - Add write endpoints (POST/PATCH) in phase 2

---

## Resource Requirements

### Backend Developer Time
- **Sprint 1 (OAuth):** 3-5 days
- **Sprint 2 (Projects):** 2-3 days
- **Sprint 3 (Invoices):** 3-4 days
- **Sprint 4 (Testing):** 2-3 days
- **Total:** 10-15 days (2-3 weeks)

### Frontend Developer Time (Parallel)
- **OAuth Integration:** 2-3 days
- **API Client Setup:** 1-2 days
- **Projects UI:** 3-5 days
- **Invoices UI:** 3-5 days
- **Testing:** 2-3 days
- **Total:** 11-18 days (2-3.5 weeks)

### Infrastructure
- No additional infrastructure needed
- Convex handles scaling automatically
- Consider adding:
  - Error tracking (Sentry) - $0-29/month
  - API monitoring (Datadog/New Relic) - $0-69/month

---

## Success Metrics

### Development Metrics
- [ ] All endpoints respond in <200ms (p95)
- [ ] Test coverage >80%
- [ ] Zero critical bugs in production
- [ ] API documentation completeness: 100%

### Business Metrics
- [ ] Frontend team can integrate without backend help
- [ ] <5 support tickets per week related to API
- [ ] API uptime >99.9%
- [ ] Average response time <100ms

---

## Communication Plan

### Daily Standups (15 min)
- What was completed yesterday?
- What will be completed today?
- Any blockers?

### Weekly Demos (30 min)
- Demo completed endpoints
- Show integration with frontend
- Gather feedback

### Sprint Planning (1 hour)
- Review sprint goals
- Estimate tasks
- Assign work

### Sprint Retrospective (30 min)
- What went well?
- What could be improved?
- Action items for next sprint

---

## Conclusion

This roadmap provides a clear path to completing the backend API for the freelancer portal. By focusing on OAuth first, then Projects and Invoices, we can deliver a working MVP in 2-3 weeks.

The CRM API is already production-ready, giving us a strong foundation. The remaining work is well-scoped and achievable with the existing codebase.

**Next Step:** Schedule sprint planning meeting to assign tasks and set start date.

---

*Last updated: December 4, 2025*
