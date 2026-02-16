# AI-First Multi-Pipeline CRM - Implementation Plan

## Architecture Decisions

Based on your requirements, here's the finalized approach:

### 1. **Template System** (Like Template Sets)
- **System Templates**: Read-only pipeline templates stored in the database
- **organizationId = "SYSTEM"**: System templates not editable by users
- **Copy to Organization**: Users click "Use Template" → creates a copy for their org
- **User Can Customize**: Once copied, users can add/remove/rename stages

### 2. **UI Structure** (Copy Checkout/Forms Pattern)
Current CRM structure:
```
CRM Window
├── CONTACTS tab (list + detail view)
├── ORGANIZATIONS tab (list + detail view)
└── PIPELINE tab
    ├── Active Pipelines (sub-tab) - Kanban boards
    ├── Templates (sub-tab) - Browse system templates
    └── Settings (sub-tab) - Configure AI, approvals
```

### 3. **AI Approval System** (Cursor-Style)
- AI suggests action: "Move contact to Qualified stage?"
- User options:
  - ✅ "Yes" (do it once)
  - ✅ "Yes, always for this type" (remember preference)
  - ❌ "No" (skip)
  - ❌ "No, never suggest this" (disable rule)
- Stored in organizationAiSettings.customProperties.crmPreferences

### 4. **Data Sources** (User-Controlled)
- AI enrichment opt-in per organization
- Settings UI: "Allow AI to enrich contacts from public sources"
- Granular control: LinkedIn, company websites, news sources

### 5. **Communication Style** (Per-Organization)
- Stored in organizationAiSettings
- Options: "Professional", "Friendly", "Technical"
- Affects AI tone in suggestions/notes

---

## Data Model

### Objects Table Usage

#### 1. Pipeline Template (System)
```typescript
{
  _id: "pipeline_template_sales_001",
  organizationId: "SYSTEM", // ← System template
  type: "crm_pipeline",
  subtype: "sales",
  name: "Standard Sales Pipeline",
  description: "Classic B2B sales funnel with 5 stages",
  status: "active",
  customProperties: {
    isTemplate: true, // ← Marks as template
    category: "sales",
    icon: "TrendingUp",
    color: "#6B46C1",
    aiSettings: {
      autoScoring: true,
      suggestActions: true,
    }
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

#### 2. Pipeline Template Stage (System)
```typescript
{
  _id: "stage_template_lead_001",
  organizationId: "SYSTEM",
  type: "crm_pipeline_stage",
  subtype: "active",
  name: "New Lead",
  description: "Initial contact, not yet qualified",
  status: "active",
  customProperties: {
    order: 1,
    color: "#94A3B8",
    probability: 10,
    aiSettings: {
      exitCriteria: [
        "email_verified",
        "company_identified"
      ],
      suggestedActions: [
        "enrich_contact_data",
        "research_company"
      ]
    }
  }
}
```

**Link: Stage → Pipeline**
```typescript
{
  fromObjectId: "stage_template_lead_001",
  toObjectId: "pipeline_template_sales_001",
  linkType: "belongs_to_pipeline",
  properties: { order: 1 }
}
```

#### 3. User's Pipeline (Copied from Template)
```typescript
{
  _id: "pipeline_user_sales_001",
  organizationId: "org_abc_123", // ← User's org
  type: "crm_pipeline",
  subtype: "sales",
  name: "Our Sales Pipeline", // ← User renamed it
  description: "Our customized sales process",
  status: "active",
  customProperties: {
    isTemplate: false,
    templateSource: "pipeline_template_sales_001", // ← Tracks original
    category: "sales",
    icon: "TrendingUp",
    color: "#6B46C1",
    isDefault: true, // ← One default per org
    aiSettings: {
      autoScoring: true,
      autoProgression: false, // ← User disabled auto-move
      suggestActions: true,
      approvalRules: {
        moveToCustomer: "always_ask", // ← Cursor-style preferences
        enrichContact: "auto_approve",
        scoreContact: "auto_approve"
      }
    }
  },
  createdBy: userId,
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

#### 4. Contact in Pipeline
```typescript
// Link: Contact → Stage
{
  fromObjectId: contactId,
  toObjectId: stageId,
  linkType: "in_pipeline",
  properties: {
    pipelineId: pipelineId,
    movedAt: Date.now(),
    previousStageId: previousStageId,

    // AI-generated data
    aiData: {
      score: 85,
      scoreFactors: {
        engagement: 90,
        fit: 85,
        intent: 75,
        timing: 80
      },
      confidence: 0.88,
      reasoning: [
        "High engagement: 5 email opens in 7 days",
        "Perfect ICP match: Enterprise SaaS, 500+ employees",
        "Strong buying signals: Pricing page viewed 3x"
      ],
      suggestedNextStage: nextStageId,
      suggestedAction: {
        type: "send_proposal",
        reason: "Contact ready for proposal based on engagement",
        confidence: 0.85
      },
      lastAiReview: Date.now(),
      riskFactors: []
    },

    // Human annotations
    notes: "Great call on 2024-01-15",
    manualScore: 90, // ← Human override
  }
}
```

---

## System Default Template

### Standard Sales Pipeline (Template)
```typescript
const SYSTEM_SALES_PIPELINE_TEMPLATE = {
  pipeline: {
    name: "Standard Sales Pipeline",
    subtype: "sales",
    description: "Classic B2B sales funnel with lead nurturing",
    icon: "TrendingUp",
    color: "#6B46C1"
  },
  stages: [
    {
      name: "New Lead",
      order: 1,
      color: "#94A3B8", // Slate
      probability: 10,
      exitCriteria: ["email_verified", "company_identified"],
      suggestedActions: ["enrich_contact", "research_company"]
    },
    {
      name: "Qualified",
      order: 2,
      color: "#3B82F6", // Blue
      probability: 25,
      exitCriteria: ["budget_confirmed", "decision_maker_identified"],
      suggestedActions: ["draft_outreach", "schedule_discovery_call"]
    },
    {
      name: "Demo Scheduled",
      order: 3,
      color: "#8B5CF6", // Purple
      probability: 50,
      exitCriteria: ["demo_completed", "technical_fit_confirmed"],
      suggestedActions: ["send_follow_up", "create_proposal"]
    },
    {
      name: "Proposal Sent",
      order: 4,
      color: "#F59E0B", // Amber
      probability: 75,
      exitCriteria: ["proposal_reviewed", "pricing_approved"],
      suggestedActions: ["schedule_close_call", "address_objections"]
    },
    {
      name: "Customer",
      order: 5,
      color: "#10B981", // Green
      probability: 100,
      exitCriteria: [],
      suggestedActions: ["onboard_customer", "request_testimonial"]
    }
  ]
}
```

---

## Backend Implementation

### File: `convex/crmPipeline.ts`

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// PIPELINE TEMPLATES (System)
// ============================================================================

/**
 * GET PIPELINE TEMPLATES
 * Returns all system pipeline templates (like template sets)
 */
export const getPipelineTemplates = query({
  args: {
    sessionId: v.string(),
    category: v.optional(v.string()), // "sales", "support", "onboarding"
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Query system templates
    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", "SYSTEM").eq("type", "crm_pipeline")
      )
      .filter((q) => q.eq(q.field("customProperties.isTemplate"), true))
      .collect();

    // Filter by category if provided
    if (args.category) {
      return templates.filter(t => t.subtype === args.category);
    }

    return templates;
  }
});

/**
 * GET TEMPLATE WITH STAGES
 * Returns a template with all its stages
 */
export const getTemplateWithStages = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.organizationId !== "SYSTEM") {
      throw new Error("Template not found");
    }

    // Get all stages linked to this template
    const stageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.templateId))
      .filter((q) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
      .collect();

    const stages = await Promise.all(
      stageLinks.map(link => ctx.db.get(link.fromObjectId))
    );

    // Sort stages by order
    const sortedStages = stages
      .filter(s => s !== null)
      .sort((a, b) => {
        const orderA = (a!.customProperties as any)?.order || 0;
        const orderB = (b!.customProperties as any)?.order || 0;
        return orderA - orderB;
      });

    return {
      template,
      stages: sortedStages
    };
  }
});

/**
 * COPY TEMPLATE TO ORGANIZATION
 * Creates a user pipeline from a system template
 */
export const copyTemplateToOrganization = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateId: v.id("objects"),
    customName: v.optional(v.string()), // Override template name
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get template with stages
    const template = await ctx.db.get(args.templateId);
    if (!template || template.organizationId !== "SYSTEM") {
      throw new Error("Template not found");
    }

    // Get template stages
    const stageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.templateId))
      .filter((q) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
      .collect();

    const templateStages = await Promise.all(
      stageLinks.map(link => ctx.db.get(link.fromObjectId))
    );

    // Create new pipeline for user's organization
    const newPipelineId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_pipeline",
      subtype: template.subtype,
      name: args.customName || template.name,
      description: template.description,
      status: "active",
      customProperties: {
        ...template.customProperties,
        isTemplate: false,
        templateSource: args.templateId,
        isDefault: false, // User can set as default later
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Copy all stages
    const stageIdMap = new Map(); // Map template stage ID → new stage ID

    for (const templateStage of templateStages) {
      if (!templateStage) continue;

      const newStageId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "crm_pipeline_stage",
        subtype: templateStage.subtype,
        name: templateStage.name,
        description: templateStage.description,
        status: "active",
        customProperties: templateStage.customProperties,
        createdBy: session.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      stageIdMap.set(templateStage._id, newStageId);

      // Link stage to new pipeline
      const originalLink = stageLinks.find(l => l.fromObjectId === templateStage._id);
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: newStageId,
        toObjectId: newPipelineId,
        linkType: "belongs_to_pipeline",
        properties: originalLink?.properties || { order: 1 },
        createdBy: session.userId,
        createdAt: Date.now(),
      });
    }

    return {
      pipelineId: newPipelineId,
      stagesCreated: stageIdMap.size
    };
  }
});

// ============================================================================
// USER PIPELINES
// ============================================================================

/**
 * GET ORGANIZATION PIPELINES
 * Returns all pipelines for an organization (not templates)
 */
export const getOrganizationPipelines = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const pipelines = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_pipeline")
      )
      .filter((q) => q.neq(q.field("customProperties.isTemplate"), true))
      .collect();

    return pipelines;
  }
});

/**
 * GET PIPELINE WITH STAGES
 * Returns a user pipeline with all its stages
 */
export const getPipelineWithStages = query({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline || pipeline.type !== "crm_pipeline") {
      throw new Error("Pipeline not found");
    }

    // Get all stages
    const stageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.pipelineId))
      .filter((q) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
      .collect();

    const stages = await Promise.all(
      stageLinks.map(link => ctx.db.get(link.fromObjectId))
    );

    // Sort by order
    const sortedStages = stages
      .filter(s => s !== null)
      .sort((a, b) => {
        const orderA = (a!.customProperties as any)?.order || 0;
        const orderB = (b!.customProperties as any)?.order || 0;
        return orderA - orderB;
      });

    return {
      pipeline,
      stages: sortedStages
    };
  }
});

/**
 * SET DEFAULT PIPELINE
 * Mark a pipeline as the organization's default
 */
export const setDefaultPipeline = mutation({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline) throw new Error("Pipeline not found");

    // Unset any existing default pipelines
    const existingPipelines = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", pipeline.organizationId).eq("type", "crm_pipeline")
      )
      .collect();

    for (const p of existingPipelines) {
      if ((p.customProperties as any)?.isDefault) {
        await ctx.db.patch(p._id, {
          customProperties: {
            ...p.customProperties,
            isDefault: false
          }
        });
      }
    }

    // Set new default
    await ctx.db.patch(args.pipelineId, {
      customProperties: {
        ...pipeline.customProperties,
        isDefault: true
      }
    });
  }
});

// ============================================================================
// CONTACT-PIPELINE OPERATIONS
// ============================================================================

/**
 * ADD CONTACT TO PIPELINE
 * Places a contact in a specific stage of a pipeline
 */
export const addContactToPipeline = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    stageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Verify stage belongs to pipeline
    const stageLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.stageId))
      .filter((q) =>
        q.and(
          q.eq(q.field("toObjectId"), args.pipelineId),
          q.eq(q.field("linkType"), "belongs_to_pipeline")
        )
      )
      .first();

    if (!stageLink) {
      throw new Error("Stage does not belong to this pipeline");
    }

    // Check if contact already in this pipeline
    const existing = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
      .filter((q) =>
        q.and(
          q.eq(q.field("linkType"), "in_pipeline"),
          q.eq(q.field("properties.pipelineId"), args.pipelineId)
        )
      )
      .first();

    if (existing) {
      throw new Error("Contact already in this pipeline");
    }

    // Create link
    const contact = await ctx.db.get(args.contactId);
    await ctx.db.insert("objectLinks", {
      organizationId: contact!.organizationId,
      fromObjectId: args.contactId,
      toObjectId: args.stageId,
      linkType: "in_pipeline",
      properties: {
        pipelineId: args.pipelineId,
        movedAt: Date.now(),
        aiData: {
          score: 0,
          confidence: 0,
          reasoning: []
        }
      },
      createdBy: session.userId,
      createdAt: Date.now(),
    });
  }
});

/**
 * MOVE CONTACT TO STAGE
 * Moves a contact to a different stage in the same pipeline
 */
export const moveContactToStage = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    toStageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Find existing link for this pipeline
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
      .filter((q) =>
        q.and(
          q.eq(q.field("linkType"), "in_pipeline"),
          q.eq(q.field("properties.pipelineId"), args.pipelineId)
        )
      )
      .first();

    if (!existingLink) {
      throw new Error("Contact not in this pipeline");
    }

    // Update link
    await ctx.db.patch(existingLink._id, {
      toObjectId: args.toStageId,
      properties: {
        ...existingLink.properties,
        previousStageId: existingLink.toObjectId,
        movedAt: Date.now(),
      }
    });

    // Log action
    const contact = await ctx.db.get(args.contactId);
    await ctx.db.insert("objectActions", {
      organizationId: contact!.organizationId,
      objectId: args.contactId,
      actionType: "moved_in_pipeline",
      actionData: {
        pipelineId: args.pipelineId,
        fromStageId: existingLink.toObjectId,
        toStageId: args.toStageId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  }
});

/**
 * GET CONTACTS IN STAGE
 * Returns all contacts in a specific pipeline stage
 */
export const getContactsInStage = query({
  args: {
    sessionId: v.string(),
    stageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all links to this stage
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.stageId))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .collect();

    // Get contact objects
    const contacts = await Promise.all(
      links.map(async link => {
        const contact = await ctx.db.get(link.fromObjectId);
        return {
          ...contact,
          pipelineData: link.properties
        };
      })
    );

    return contacts.filter(c => c !== null);
  }
});
```

---

## Frontend Implementation

### 1. Update CRM Window with Sub-Tabs

File: `src/components/window-content/crm-window.tsx`

```typescript
type ViewType = "contacts" | "organizations" | "pipeline"
type PipelineSubTab = "active" | "templates" | "settings"

export function CRMWindow() {
  const [activeView, setActiveView] = useState<ViewType>("contacts")
  const [pipelineSubTab, setPipelineSubTab] = useState<PipelineSubTab>("active")

  // ... existing code ...

  return (
    <div className="h-full flex flex-col">
      {/* Main Tabs: Contacts | Organizations | Pipeline */}
      <div className="flex gap-1 border-b-2 p-2">
        {/* ... existing tabs ... */}
      </div>

      {/* Pipeline Sub-Tabs (shown only when Pipeline is active) */}
      {activeView === "pipeline" && (
        <div className="flex border-b-2">
          <button onClick={() => setPipelineSubTab("active")}>
            Active Pipelines
          </button>
          <button onClick={() => setPipelineSubTab("templates")}>
            Templates
          </button>
          <button onClick={() => setPipelineSubTab("settings")}>
            Settings
          </button>
        </div>
      )}

      {/* Content */}
      {activeView === "pipeline" ? (
        <>
          {pipelineSubTab === "active" && <ActivePipelinesTab />}
          {pipelineSubTab === "templates" && <PipelineTemplatesTab />}
          {pipelineSubTab === "settings" && <PipelineSettingsTab />}
        </>
      ) : (
        // Contacts/Organizations view
      )}
    </div>
  )
}
```

### 2. Pipeline Templates Tab

File: `src/components/window-content/crm-window/pipeline-templates-tab.tsx`

```typescript
export function PipelineTemplatesTab() {
  const templates = useQuery(api.crmPipeline.getPipelineTemplates, { ... })
  const copyTemplate = useMutation(api.crmPipeline.copyTemplateToOrganization)

  const handleUseTemplate = async (templateId: Id<"objects">) => {
    await copyTemplate({
      sessionId,
      organizationId,
      templateId
    })

    // Switch to Active Pipelines tab to see new pipeline
    setPipelineSubTab("active")
  }

  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      {templates?.map(template => (
        <div key={template._id} className="border-2 rounded p-4">
          <h4>{template.name}</h4>
          <p>{template.description}</p>

          <button onClick={() => handleUseTemplate(template._id)}>
            Use Template
          </button>
        </div>
      ))}
    </div>
  )
}
```

### 3. Active Pipelines Tab (Multi-Pipeline Kanban)

File: `src/components/window-content/crm-window/active-pipelines-tab.tsx`

```typescript
export function ActivePipelinesTab() {
  const pipelines = useQuery(api.crmPipeline.getOrganizationPipelines, { ... })
  const [selectedPipelineId, setSelectedPipelineId] = useState<Id<"objects">>()

  // Auto-select default pipeline or first pipeline
  useEffect(() => {
    if (pipelines && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.customProperties?.isDefault)
      setSelectedPipelineId(defaultPipeline?._id || pipelines[0]?._id)
    }
  }, [pipelines])

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline Selector */}
      <div className="p-2 border-b-2">
        <select value={selectedPipelineId} onChange={...}>
          {pipelines?.map(p => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      {selectedPipelineId && (
        <PipelineKanban pipelineId={selectedPipelineId} />
      )}
    </div>
  )
}
```

---

## AI Approval System (Cursor-Style)

### Backend: AI Tools with Approval

File: `convex/crmAiTools.ts`

```typescript
/**
 * AI TOOL: Move Contact to Stage
 * With Cursor-style approval system
 */
export const aiMoveContactToStage = mutation({
  args: {
    aiAgentId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    toStageId: v.id("objects"),
    reason: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    // Get organization AI settings
    const contact = await ctx.db.get(args.contactId);
    const orgSettings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", contact!.organizationId))
      .first();

    const approvalRules = orgSettings?.customProperties?.crmPreferences?.approvalRules || {};
    const moveApprovalRule = approvalRules.moveToStage || "always_ask";

    // Check approval rule
    if (moveApprovalRule === "auto_approve") {
      // Just do it
      await moveContactToStageInternal(ctx, args);
      return { approved: true, autoApproved: true };
    }

    if (moveApprovalRule === "never") {
      return { approved: false, reason: "User has disabled this action" };
    }

    // Default: "always_ask" → Queue for approval
    const approvalId = await ctx.db.insert("objects", {
      organizationId: contact!.organizationId,
      type: "ai_approval_request",
      subtype: "move_contact",
      name: `Move ${contact!.name} to ${args.toStageId}`,
      status: "pending",
      customProperties: {
        aiAgentId: args.aiAgentId,
        action: "move_contact",
        args: args,
        reason: args.reason,
        confidence: args.confidence,
        createdAt: Date.now()
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    return {
      approved: false,
      requiresApproval: true,
      approvalId
    };
  }
});

/**
 * USER APPROVES AI ACTION
 * User responds to AI suggestion
 */
export const approveAiAction = mutation({
  args: {
    sessionId: v.string(),
    approvalId: v.id("objects"),
    decision: v.union(
      v.literal("approve_once"),
      v.literal("approve_always"),
      v.literal("reject_once"),
      v.literal("reject_always")
    )
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const approval = await ctx.db.get(args.approvalId);
    if (!approval) throw new Error("Approval request not found");

    const actionArgs = approval.customProperties.args;
    const actionType = approval.customProperties.action;

    // Update approval status
    await ctx.db.patch(args.approvalId, {
      status: args.decision.startsWith("approve") ? "approved" : "rejected",
      customProperties: {
        ...approval.customProperties,
        decision: args.decision,
        decidedBy: session.userId,
        decidedAt: Date.now()
      }
    });

    // If "always" preference, update org AI settings
    if (args.decision === "approve_always" || args.decision === "reject_always") {
      const orgSettings = await ctx.db
        .query("organizationAiSettings")
        .withIndex("by_organization", (q) => q.eq("organizationId", approval.organizationId))
        .first();

      if (orgSettings) {
        const newRule = args.decision === "approve_always" ? "auto_approve" : "never";

        await ctx.db.patch(orgSettings._id, {
          customProperties: {
            ...orgSettings.customProperties,
            crmPreferences: {
              ...orgSettings.customProperties?.crmPreferences,
              approvalRules: {
                ...orgSettings.customProperties?.crmPreferences?.approvalRules,
                [actionType]: newRule
              }
            }
          }
        });
      }
    }

    // If approved, execute the action
    if (args.decision.startsWith("approve")) {
      if (actionType === "move_contact") {
        await moveContactToStageInternal(ctx, actionArgs);
      }
      // ... other action types
    }

    return { success: true };
  }
});
```

### Frontend: Approval UI Component

File: `src/components/ai-approval-prompt.tsx`

```typescript
export function AiApprovalPrompt({ approvalId }: { approvalId: Id<"objects"> }) {
  const approval = useQuery(api.objects.get, { id: approvalId })
  const respond = useMutation(api.crmAiTools.approveAiAction)

  if (!approval || approval.status !== "pending") return null;

  const { reason, confidence } = approval.customProperties;

  return (
    <div className="fixed bottom-4 right-4 border-4 shadow-lg p-4 max-w-md"
         style={{
           background: 'var(--win95-bg)',
           borderColor: 'var(--win95-highlight)'
         }}>
      {/* AI Suggestion */}
      <div className="flex items-start gap-2 mb-3">
        <Sparkles size={20} style={{ color: 'var(--win95-highlight)' }} />
        <div>
          <h4 className="font-bold text-sm">{approval.name}</h4>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            {reason}
          </p>
          <div className="text-xs mt-1">
            Confidence: {Math.round(confidence * 100)}%
          </div>
        </div>
      </div>

      {/* Cursor-style Options */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => respond({ approvalId, decision: "approve_once" })}
          className="px-3 py-2 text-xs border-2"
          style={{
            background: 'var(--success)',
            color: 'white'
          }}
        >
          ✓ Yes
        </button>
        <button
          onClick={() => respond({ approvalId, decision: "approve_always" })}
          className="px-3 py-2 text-xs border-2"
          style={{
            background: 'var(--success)',
            color: 'white'
          }}
        >
          ✓ Yes, always
        </button>
        <button
          onClick={() => respond({ approvalId, decision: "reject_once" })}
          className="px-3 py-2 text-xs border-2"
          style={{
            background: 'var(--win95-bg)',
            borderColor: 'var(--win95-border)'
          }}
        >
          ✗ No
        </button>
        <button
          onClick={() => respond({ approvalId, decision: "reject_always" })}
          className="px-3 py-2 text-xs border-2"
          style={{
            background: 'var(--win95-bg)',
            borderColor: 'var(--win95-border)'
          }}
        >
          ✗ No, never
        </button>
      </div>
    </div>
  )
}
```

---

## Implementation Checklist

### Backend (4-6 hours)
- [ ] Create `convex/crmPipeline.ts`
  - [ ] Template queries (getPipelineTemplates, getTemplateWithStages)
  - [ ] User pipeline queries (getOrganizationPipelines, getPipelineWithStages)
  - [ ] Copy template mutation (copyTemplateToOrganization)
  - [ ] Contact-pipeline operations (addContactToPipeline, moveContactToStage)
  - [ ] Stage queries (getContactsInStage)

- [ ] Create `convex/crmAiTools.ts`
  - [ ] AI move contact with approval (aiMoveContactToStage)
  - [ ] AI enrich contact (aiEnrichContact)
  - [ ] AI score contact (aiScoreContact)
  - [ ] Approval mutation (approveAiAction)

- [ ] Create seed script for system template
  - [ ] `convex/translations/seedCRM_SystemPipelineTemplate.ts`

### Frontend (6-8 hours)
- [ ] Update `crm-window.tsx`
  - [ ] Add pipeline sub-tabs (Active, Templates, Settings)
  - [ ] Tab state management

- [ ] Create `pipeline-templates-tab.tsx`
  - [ ] Display system templates
  - [ ] Copy template button
  - [ ] Template preview

- [ ] Create `active-pipelines-tab.tsx`
  - [ ] Pipeline selector dropdown
  - [ ] Multi-pipeline support

- [ ] Update `pipeline-kanban.tsx`
  - [ ] Accept pipelineId prop
  - [ ] Load stages for specific pipeline
  - [ ] Query contacts per stage

- [ ] Create `pipeline-settings-tab.tsx`
  - [ ] AI approval preferences
  - [ ] Data source toggles
  - [ ] Communication style selector

- [ ] Create `ai-approval-prompt.tsx`
  - [ ] Cursor-style approval UI
  - [ ] 4-button layout (Yes, Yes always, No, No never)

- [ ] Add translations
  - [ ] Pipeline template names/descriptions
  - [ ] UI labels for tabs
  - [ ] AI approval prompts

---

## Next Steps

**Ready to start implementation?**

I can begin with:
1. **Backend first**: `crmPipeline.ts` + system template seed
2. **Frontend next**: Update CRM window with tabs
3. **AI tools**: Approval system + tools

**Which would you like me to start with?**
