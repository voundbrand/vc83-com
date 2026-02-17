# CRM Multi-Pipeline Architecture Analysis

## Current Architecture Summary

### Data Model
1. **Contacts**: Stored in `objects` table with `type: "crm_contact"`
2. **Lifecycle Stage**: Stored in `contact.subtype` field
   - Values: "lead", "prospect", "customer", "partner"
3. **Pipeline**: Hardcoded single pipeline with 4 stages
4. **Limitation**: Each contact can only be in ONE stage at a time

### Current Files
- **Schema**: [convex/schemas/ontologySchemas.ts:76](convex/schemas/ontologySchemas.ts#L76) - Universal `objects` table
- **Backend**: [convex/crmOntology.ts:200](convex/crmOntology.ts#L200) - Contact CRUD operations
- **Frontend**: [src/components/window-content/crm-window/pipeline-kanban.tsx:1](src/components/window-content/crm-window/pipeline-kanban.tsx#L1) - Kanban board

---

## Proposed Architecture: Multi-Pipeline Support

### Design Principles
1. **Leverage Existing `objects` Table**: Use the universal ontology system
2. **Backwards Compatible**: Don't break existing contacts
3. **Many-to-Many**: One contact can be in multiple pipelines
4. **Flexible Stages**: Each pipeline can have custom stages
5. **Per-Organization**: Each organization can create their own pipelines

---

## New Object Types

### 1. Pipeline Object (`type: "crm_pipeline"`)
Stored in existing `objects` table:

```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "crm_pipeline",
  subtype: "sales" | "support" | "onboarding" | "custom",
  name: "Sales Pipeline",
  description: "Main sales funnel",
  status: "active" | "archived",
  customProperties: {
    icon: "TrendingUp",
    color: "#6B46C1",
    isDefault: true, // One default pipeline per org
    order: 1, // Display order
    settings: {
      autoProgressRules: [], // Future: automation rules
      notifications: {}
    }
  },
  createdAt: number,
  updatedAt: number
}
```

### 2. Pipeline Stage Object (`type: "crm_pipeline_stage"`)
Stored in existing `objects` table:

```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "crm_pipeline_stage",
  subtype: "active" | "won" | "lost", // Stage category
  name: "Qualified Lead",
  description: "Lead has been qualified and ready for outreach",
  status: "active" | "archived",
  customProperties: {
    order: 1, // Order within pipeline
    color: "#3B82F6", // Stage color
    icon: "UserCheck",
    probability: 25, // Win probability %
    minDays: 0, // Minimum days in this stage
    maxDays: 14, // Maximum days before alert
    automations: [] // Future: automation rules
  },
  createdAt: number,
  updatedAt: number
}
```

**Link to Pipeline**: Use `objectLinks`
```typescript
{
  fromObjectId: stageId,
  toObjectId: pipelineId,
  linkType: "belongs_to_pipeline",
  properties: {
    order: 1 // Stage order in pipeline
  }
}
```

### 3. Contact-Pipeline Position
Use `objectLinks` to track contact position in each pipeline:

```typescript
{
  fromObjectId: contactId,
  toObjectId: stageId, // Current stage in this pipeline
  linkType: "in_pipeline",
  properties: {
    pipelineId: Id<"objects">, // Which pipeline
    movedAt: number, // When entered this stage
    previousStageId?: Id<"objects">, // Previous stage
    notes?: string, // Stage-specific notes
    probability?: number, // Override stage probability
  },
  createdAt: number // When contact entered this pipeline
}
```

---

## Database Operations Needed

### New Convex Functions

#### Pipeline Management
```typescript
// convex/crmPipeline.ts

// Create a new pipeline
export const createPipeline = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    subtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create pipeline object
    // If isDefault, unset other default pipelines
    // Return pipelineId
  }
})

// Get all pipelines for organization
export const getPipelines = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Query objects with type="crm_pipeline"
    // Return pipelines with their stages
  }
})

// Create a pipeline stage
export const createStage = mutation({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
    name: v.string(),
    order: v.number(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create stage object
    // Link to pipeline via objectLinks
    // Return stageId
  }
})

// Get pipeline with stages
export const getPipelineWithStages = query({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get pipeline
    // Get all stages linked to this pipeline
    // Return pipeline + sorted stages
  }
})
```

#### Contact-Pipeline Operations
```typescript
// Add contact to pipeline
export const addContactToPipeline = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    stageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Validate stage belongs to pipeline
    // Create objectLink: contact -> stage (in_pipeline)
    // Log action
  }
})

// Move contact to different stage
export const moveContactToStage = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    stageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Find existing link for this pipeline
    // Update toObjectId to new stageId
    // Update properties.previousStageId
    // Update properties.movedAt
    // Log action
  }
})

// Get contact positions in all pipelines
export const getContactPipelines = query({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get all "in_pipeline" links for contact
    // For each, get pipeline and current stage
    // Return array of { pipeline, stage, properties }
  }
})

// Get contacts in pipeline stage
export const getContactsInStage = query({
  args: {
    sessionId: v.string(),
    stageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Query objectLinks where toObjectId=stageId, linkType="in_pipeline"
    // Get contact objects
    // Return contacts with position metadata
  }
})
```

---

## Migration Strategy

### Phase 1: Create Default Pipeline
1. **Seed Default Pipeline** for each organization:
   ```typescript
   const defaultPipeline = {
     type: "crm_pipeline",
     name: "Sales Pipeline",
     customProperties: { isDefault: true }
   }
   ```

2. **Create Default Stages**:
   - Lead → Prospect → Customer → Partner
   - Link each stage to default pipeline

3. **Migrate Existing Contacts**:
   - For each contact with `subtype` set:
     - Find corresponding stage in default pipeline
     - Create `in_pipeline` link: contact → stage
   - Keep `contact.subtype` for backwards compatibility

### Phase 2: UI Updates
1. **Pipeline Selector**: Dropdown to switch between pipelines
2. **Multi-Pipeline View**: Tabs or sidebar to see all pipelines
3. **Stage Management UI**: Create/edit/reorder stages
4. **Pipeline Settings**: Create/edit/archive pipelines

### Phase 3: Advanced Features
1. **Pipeline Analytics**: Conversion rates, time in stage
2. **Automations**: Auto-move contacts based on rules
3. **Pipeline Templates**: Predefined pipeline types
4. **Stage Workflows**: Required fields per stage

---

## Backwards Compatibility

### Keep `contact.subtype`
- Continue storing lifecycle stage in `contact.subtype`
- Use for default pipeline
- When contact moves in default pipeline, update `subtype`
- This ensures existing code continues to work

### Example:
```typescript
// When moving contact in DEFAULT pipeline
await moveContactToStage({ contactId, pipelineId, stageId: "customer" })
// Also update contact.subtype
await updateContact({ contactId, updates: { subtype: "customer" } })
```

---

## Frontend Changes

### 1. Pipeline Selector Component
```typescript
// src/components/window-content/crm-window/pipeline-selector.tsx
export function PipelineSelector() {
  const pipelines = useQuery(api.crmPipeline.getPipelines, { ... })
  const [selectedPipeline, setSelectedPipeline] = useState<Id<"objects">>()

  return (
    <select value={selectedPipeline} onChange={...}>
      {pipelines?.map(p => <option key={p._id}>{p.name}</option>)}
    </select>
  )
}
```

### 2. Updated Kanban Board
```typescript
// src/components/window-content/crm-window/pipeline-kanban.tsx
export function PipelineKanban({ pipelineId }: { pipelineId: Id<"objects"> }) {
  // Get pipeline with stages
  const pipeline = useQuery(api.crmPipeline.getPipelineWithStages, { pipelineId })

  // Get contacts for each stage
  const stages = pipeline?.stages || []

  // Map stages to columns
  return (
    <DndContext>
      {stages.map(stage => (
        <KanbanColumn
          key={stage._id}
          stage={stage}
          contacts={/* contacts in this stage */}
        />
      ))}
    </DndContext>
  )
}
```

### 3. Contact Detail Enhancement
```typescript
// Show all pipelines this contact is in
export function ContactPipelines({ contactId }) {
  const pipelines = useQuery(api.crmPipeline.getContactPipelines, { contactId })

  return (
    <div>
      {pipelines?.map(p => (
        <div key={p.pipeline._id}>
          <strong>{p.pipeline.name}</strong>: {p.stage.name}
        </div>
      ))}
    </div>
  )
}
```

---

## Questions to Consider

### 1. **Pipeline Scope**
- **Question**: Can contacts from different subtypes be in the same pipeline?
- **Example**: Can a "customer" contact also be in "Support Pipeline"?
- **Recommendation**: Yes - pipelines should be orthogonal to contact type

### 2. **Stage Reusability**
- **Question**: Can stages be shared across pipelines?
- **Recommendation**: No - each pipeline should have its own stages for flexibility

### 3. **Default Behavior**
- **Question**: What happens when a contact is created?
- **Recommendation**: Auto-add to default pipeline's first stage

### 4. **Contact Removal**
- **Question**: Can contacts be removed from a pipeline?
- **Recommendation**: Yes - delete the `in_pipeline` link
- **Alternative**: Archive by adding `status: "archived"` to link properties

### 5. **Stage Progression**
- **Question**: Must contacts move through stages in order?
- **Recommendation**: No - allow jumping to any stage (track via `previousStageId`)

### 6. **Duplicate Prevention**
- **Question**: Can a contact be in the same pipeline twice?
- **Recommendation**: No - enforce one link per contact per pipeline

---

## Implementation Effort Estimate

### Backend (Convex)
- **New file**: `convex/crmPipeline.ts` (~300 lines)
- **Update**: `convex/crmOntology.ts` (add backwards compatibility)
- **Migration**: `convex/migrations/addDefaultPipelines.ts` (~100 lines)
- **Estimated Time**: 4-6 hours

### Frontend
- **New**: `pipeline-selector.tsx` (~100 lines)
- **Update**: `pipeline-kanban.tsx` (make pipeline-aware) (~200 lines changed)
- **Update**: `contact-detail.tsx` (show all pipelines) (~50 lines)
- **New**: `pipeline-settings.tsx` (manage pipelines/stages) (~300 lines)
- **Estimated Time**: 6-8 hours

### Testing
- **Manual Testing**: 2-3 hours
- **Data Migration Testing**: 1-2 hours

### Total Estimate: 13-19 hours

---

## Recommended Approach

### Option A: Full Multi-Pipeline (Recommended)
**Pros**:
- Maximum flexibility
- Future-proof
- Contacts can be in multiple sales processes

**Cons**:
- More complex implementation
- Requires migration

**Best For**: Organizations with complex sales processes, multiple departments

---

### Option B: Named Pipelines (Simpler Alternative)
Instead of multi-pipeline, create named pipelines but keep 1:1 contact relationship:

```typescript
// Simplified: Contact can only be in ONE pipeline at a time
contact.customProperties = {
  pipelineId: Id<"objects">, // Which pipeline
  stageId: Id<"objects">,    // Which stage
}
```

**Pros**:
- Simpler implementation
- Easier migration
- Still allows custom pipelines

**Cons**:
- Contact can only be in one pipeline
- Less flexible

**Best For**: Organizations with simple, linear sales processes

---

## Next Steps

### Questions for You:
1. **Multi-Pipeline**: Do contacts need to be in multiple pipelines simultaneously?
   - Example: A contact in both "Sales Pipeline" and "Support Pipeline"?

2. **Custom Stages**: Do organizations need to create completely custom stages?
   - Or just rename the existing 4 stages?

3. **Pipeline Types**: Any specific pipeline types needed?
   - Sales, Support, Onboarding, etc.?

4. **Migration**: Are there existing contacts that need to be migrated?
   - How many contacts currently exist?

5. **Timeline**: What's the priority?
   - Quick implementation (Option B) or full flexibility (Option A)?

---

## Conclusion

The architecture supports both approaches:
- **Option A** (Multi-Pipeline): More work, maximum flexibility
- **Option B** (Named Single Pipeline): Less work, simpler mental model

Both leverage the existing `objects` table and `objectLinks` relationship system, so the data model is well-suited for either approach.

**Recommendation**: Start with **Option B** (Named Single Pipeline) for MVP, then evolve to **Option A** (Multi-Pipeline) if needed. This provides a clear upgrade path without requiring a complete rewrite.
