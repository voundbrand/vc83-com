# CRM Pipelines & Sequences Integration Spec

## Executive Summary

**Current State:** The L4YERCAK3 CRM integration supports contacts, organizations, notes, and activities. However, **pipelines are mentioned in documentation but not implemented**, and **sequences do not exist at all**.

**Gap Analysis:**
- Pipelines referenced in [crm.js:5](../../../reference_projects/l4yercak3-cli/src/mcp/registry/domains/crm.js#L5) and [core.js:30](../../../reference_projects/l4yercak3-cli/src/mcp/registry/domains/core.js#L30) but no tools exist
- No sequence infrastructure anywhere in the codebase
- No API endpoints for pipelines or sequences
- No UI components, hooks, or pages for pipeline/sequence management

---

## Part 1: Backend API Requirements

### 1.1 Pipeline Endpoints (Priority: HIGH)

The backend team needs to implement these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/crm/pipelines` | List all pipelines for organization |
| `POST` | `/api/v1/crm/pipelines` | Create a new pipeline |
| `GET` | `/api/v1/crm/pipelines/{pipelineId}` | Get pipeline with stages |
| `PATCH` | `/api/v1/crm/pipelines/{pipelineId}` | Update pipeline |
| `DELETE` | `/api/v1/crm/pipelines/{pipelineId}` | Archive/delete pipeline |
| `GET` | `/api/v1/crm/pipelines/{pipelineId}/stages` | List stages in pipeline |
| `POST` | `/api/v1/crm/pipelines/{pipelineId}/stages` | Create stage |
| `PATCH` | `/api/v1/crm/pipelines/{pipelineId}/stages/{stageId}` | Update stage |
| `DELETE` | `/api/v1/crm/pipelines/{pipelineId}/stages/{stageId}` | Delete stage |
| `POST` | `/api/v1/crm/pipelines/{pipelineId}/stages/reorder` | Reorder stages |

#### Pipeline Data Model

**Note to Backend Team:** Use the existing ontology-based object system (like contacts/organizations use with `subtype` and `customProperties`). The fields below are conceptual - implement using the standard L4YERCAK3 object pattern.

**Pipeline object should support:**
- Name, description, type (sales/support/onboarding/custom)
- Linked stages (ordered)
- Default stage reference
- Active/archived status

**Stage object should support:**
- Name, description, order, color
- Probability (0-100 for sales forecasting)
- Rotten after days (stale deal threshold)
- Automation triggers (notify, assign, tag, webhook, sequence)

### 1.2 Deal/Opportunity Endpoints (Priority: HIGH)

Deals link contacts to pipeline stages:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/crm/deals` | List deals (filterable by pipeline, stage, owner) |
| `POST` | `/api/v1/crm/deals` | Create deal |
| `GET` | `/api/v1/crm/deals/{dealId}` | Get deal details |
| `PATCH` | `/api/v1/crm/deals/{dealId}` | Update deal |
| `DELETE` | `/api/v1/crm/deals/{dealId}` | Archive deal |
| `POST` | `/api/v1/crm/deals/{dealId}/move` | Move deal to different stage |
| `GET` | `/api/v1/crm/deals/{dealId}/history` | Get stage movement history |

#### Deal Data Model

**Note to Backend Team:** Use the existing ontology-based object system. Deals are objects that link contacts to pipeline stages.

**Deal object should support:**
- Name, value, currency
- Pipeline reference, current stage reference
- Contact reference, organization reference (optional)
- Owner (assigned team member)
- Priority (low/medium/high)
- Expected close date
- Status (open/won/lost) with won/lost timestamps
- Lost reason (when applicable)
- Tags and custom fields via standard `customProperties`

**Deal Stage History** - Track stage movements:
- From/to stage references
- Who moved it, when
- Time spent in previous stage (for velocity metrics)

### 1.3 Sequence Endpoints (Priority: MEDIUM - Future Feature)

Sequences automate outreach based on triggers:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/crm/sequences` | List sequences |
| `POST` | `/api/v1/crm/sequences` | Create sequence |
| `GET` | `/api/v1/crm/sequences/{sequenceId}` | Get sequence with steps |
| `PATCH` | `/api/v1/crm/sequences/{sequenceId}` | Update sequence |
| `DELETE` | `/api/v1/crm/sequences/{sequenceId}` | Archive sequence |
| `POST` | `/api/v1/crm/sequences/{sequenceId}/steps` | Add step to sequence |
| `PATCH` | `/api/v1/crm/sequences/{sequenceId}/steps/{stepId}` | Update step |
| `DELETE` | `/api/v1/crm/sequences/{sequenceId}/steps/{stepId}` | Remove step |
| `POST` | `/api/v1/crm/sequences/{sequenceId}/enroll` | Enroll contact(s) |
| `POST` | `/api/v1/crm/sequences/{sequenceId}/unenroll` | Remove contact(s) |
| `GET` | `/api/v1/crm/sequences/{sequenceId}/enrollments` | List enrolled contacts |
| `GET` | `/api/v1/crm/contacts/{contactId}/sequences` | Get contact's sequences |

#### Sequence Data Model

**Note to Backend Team:** Use the existing ontology-based object system. Sequences are automation workflows.

**Sequence object should support:**
- Name, description
- Trigger type (manual, stage_enter, tag_added, form_submit, api) with config
- Linked steps (ordered)
- Exit conditions
- Enrollment limit, timezone, sending schedule
- Status (draft/active/paused/archived)
- Stats (enrolled, completed, replied, bounced counts)

**Sequence Step object should support:**
- Order, type (email, sms, wait, task, webhook, condition)
- Delay (days/hours)
- Type-specific config (email subject/body with template vars, etc.)

**Sequence Enrollment object should support:**
- Contact reference, sequence reference
- Current step index
- Status (active/completed/exited/paused)
- Enrolled by, enrolled at, completed at
- Exit reason (if applicable)
- Step results history

### 1.4 Permissions Required

Add these to the existing permission system:

```typescript
// Pipeline permissions
'pipelines:read'    // View pipelines and stages
'pipelines:write'   // Create/edit pipelines
'pipelines:delete'  // Archive/delete pipelines

// Deal permissions
'deals:read'        // View deals
'deals:write'       // Create/edit deals
'deals:delete'      // Archive deals
'deals:move'        // Move deals between stages

// Sequence permissions (future)
'sequences:read'    // View sequences
'sequences:write'   // Create/edit sequences
'sequences:delete'  // Archive sequences
'sequences:enroll'  // Enroll/unenroll contacts
```

---

## Part 2: CLI Implementation Requirements

### 2.1 MCP Tool Additions

**File:** [src/mcp/registry/domains/crm.js](../../../reference_projects/l4yercak3-cli/src/mcp/registry/domains/crm.js)

Add these MCP tools after the existing contact/organization tools:

#### Pipeline Tools

```javascript
// List pipelines
{
  name: 'l4yercak3_crm_list_pipelines',
  description: 'List CRM pipelines with their stages',
  handler: async (args, context) => {
    return context.apiClient.request('GET', '/api/v1/crm/pipelines', {
      params: { type: args.type, status: args.status || 'active' }
    });
  },
  parameters: {
    type: { type: 'string', enum: ['sales', 'support', 'onboarding', 'custom'] },
    status: { type: 'string', enum: ['active', 'archived'], default: 'active' }
  },
  requiresAuth: true,
  permissions: ['pipelines:read']
}

// Create pipeline
{
  name: 'l4yercak3_crm_create_pipeline',
  description: 'Create a new CRM pipeline with stages',
  handler: async (args, context) => { /* ... */ },
  parameters: {
    name: { type: 'string', required: true },
    type: { type: 'string', enum: ['sales', 'support', 'onboarding', 'custom'], required: true },
    stages: { type: 'array', items: { type: 'object' }, description: 'Initial stages' }
  },
  requiresAuth: true,
  permissions: ['pipelines:write']
}

// Get pipeline
// Update pipeline
// Delete pipeline
// Add stage
// Update stage
// Reorder stages
```

#### Deal Tools

```javascript
// List deals
{
  name: 'l4yercak3_crm_list_deals',
  description: 'List deals with filtering by pipeline, stage, status',
  parameters: {
    pipelineId: { type: 'string' },
    stageId: { type: 'string' },
    status: { type: 'string', enum: ['open', 'won', 'lost'] },
    ownerId: { type: 'string' },
    contactId: { type: 'string' }
  }
}

// Create deal
// Get deal
// Update deal
// Move deal (change stage)
// Get deal history
```

#### Sequence Tools (Future)

```javascript
// List sequences
// Create sequence
// Get sequence
// Update sequence
// Add step
// Enroll contact
// Unenroll contact
// Get enrollments
```

### 2.2 Quickstart Generator Updates

**Files to modify:**

1. **[src/generators/quickstart/hooks/index.js](../../../reference_projects/l4yercak3-cli/src/generators/quickstart/hooks/index.js)**
   - Add `usePipelines()` hook
   - Add `useDeals()` hook
   - Add `usePipelineBoard()` hook for Kanban view
   - Future: Add `useSequences()` hook

2. **[src/generators/quickstart/components/index.js](../../../reference_projects/l4yercak3-cli/src/generators/quickstart/components/index.js)**
   - Add `PipelineBoard` - Kanban-style deal board
   - Add `PipelineSelector` - Dropdown to switch pipelines
   - Add `DealCard` - Individual deal display
   - Add `DealForm` - Create/edit deal modal
   - Add `StageColumn` - Column in Kanban board

3. **[src/generators/quickstart/pages/index.js](../../../reference_projects/l4yercak3-cli/src/generators/quickstart/pages/index.js)**
   - Add `/crm/pipelines` - Pipeline management
   - Add `/crm/deals` - Deal board (Kanban view)
   - Add `/crm/deals/[id]` - Deal detail page

### 2.3 Feature Detection Update

**File:** [src/commands/spread.js](../../../reference_projects/l4yercak3-cli/src/commands/spread.js)

Update feature selection to clarify CRM includes pipelines:

```javascript
{
  name: 'CRM (contacts, organizations, pipelines)',
  value: 'crm',
  checked: true
}
```

### 2.4 Environment Variables

No additional env vars needed - pipelines use same auth as other CRM features.

---

## Part 3: Implementation Checklist

### Backend Team

- [ ] Create `pipelines` table/collection in Convex
- [ ] Create `stages` table/collection
- [ ] Create `deals` table/collection
- [ ] Create `dealStageHistory` table/collection
- [ ] Implement pipeline CRUD endpoints
- [ ] Implement stage management endpoints
- [ ] Implement deal CRUD endpoints
- [ ] Implement deal stage movement with history tracking
- [ ] Add pipeline/deal permissions to auth system
- [ ] Write API documentation for new endpoints
- [ ] **Future:** Create `sequences` table
- [ ] **Future:** Create `sequenceSteps` table
- [ ] **Future:** Create `sequenceEnrollments` table
- [ ] **Future:** Implement sequence execution engine
- [ ] **Future:** Implement sequence API endpoints

### CLI Team

- [ ] Add pipeline MCP tools to [crm.js](../../../reference_projects/l4yercak3-cli/src/mcp/registry/domains/crm.js)
- [ ] Add deal MCP tools to [crm.js](../../../reference_projects/l4yercak3-cli/src/mcp/registry/domains/crm.js)
- [ ] Create `usePipelines()` hook generator
- [ ] Create `useDeals()` hook generator
- [ ] Create `PipelineBoard` component generator
- [ ] Create `DealCard` component generator
- [ ] Create `DealForm` component generator
- [ ] Create pipeline pages generator
- [ ] Update feature description in spread command
- [ ] Write tests for new MCP tools
- [ ] Update CLAUDE.md with pipeline commands
- [ ] **Future:** Add sequence MCP tools
- [ ] **Future:** Create sequence hooks/components

---

## Part 4: API Examples

### Create a Sales Pipeline

```bash
# Request
POST /api/v1/crm/pipelines
{
  "name": "Enterprise Sales",
  "type": "sales",
  "stages": [
    { "name": "Lead", "order": 0, "probability": 10 },
    { "name": "Qualified", "order": 1, "probability": 25 },
    { "name": "Demo", "order": 2, "probability": 50 },
    { "name": "Proposal", "order": 3, "probability": 75 },
    { "name": "Negotiation", "order": 4, "probability": 90 },
    { "name": "Closed Won", "order": 5, "probability": 100 },
    { "name": "Closed Lost", "order": 6, "probability": 0 }
  ]
}

# Response
{
  "_id": "pipeline_abc123",
  "name": "Enterprise Sales",
  "type": "sales",
  "stages": [...],
  "isDefault": true,
  "status": "active",
  "createdAt": 1736700000000
}
```

### Create a Deal

```bash
# Request
POST /api/v1/crm/deals
{
  "pipelineId": "pipeline_abc123",
  "stageId": "stage_lead",
  "contactId": "contact_xyz789",
  "name": "Acme Corp - Enterprise License",
  "value": 50000,
  "currency": "USD",
  "expectedCloseDate": 1739000000000,
  "priority": "high"
}
```

### Move Deal to Next Stage

```bash
# Request
POST /api/v1/crm/deals/deal_123/move
{
  "stageId": "stage_qualified",
  "note": "Initial call completed, they're interested"
}

# Response includes updated deal + history entry
```

### Enroll Contact in Sequence (Future)

```bash
# Request
POST /api/v1/crm/sequences/seq_456/enroll
{
  "contactIds": ["contact_xyz789", "contact_abc123"],
  "skipWeekends": true
}
```

---

## Part 5: Timeline Recommendation

### Phase 1: Pipelines Foundation
- Backend: Pipeline & Stage CRUD
- Backend: Basic deal management
- CLI: Pipeline MCP tools

### Phase 2: Pipelines UI
- CLI: Deal MCP tools
- CLI: Hooks & components
- CLI: Pages generator

### Phase 3: Sequences (Future)
- Backend: Sequence data model
- Backend: Enrollment logic
- Backend: Execution engine
- CLI: Sequence MCP tools
- CLI: Sequence UI components

---

## Questions for Backend Team

1. **Default Pipeline:** Should new organizations get a default sales pipeline automatically?
2. **Stage Limits:** Should we limit the number of stages per pipeline?
3. **Deal Limits:** Any limits on deals per pipeline or organization?
4. **Webhooks:** Should stage transitions trigger webhooks?
5. **Sequence Execution:** Will sequences run on Convex scheduled functions or separate workers?
6. **Email Provider:** What email service will sequences use (SendGrid, Resend, etc.)?

---

*Generated: January 2026*
*CLI Version: 1.2.18*
