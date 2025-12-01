# AI-First Multi-Pipeline CRM Architecture

## Vision: AI-Native CRM System

This CRM is designed from the ground up to be operated by AI agents. Every operation, from moving contacts through pipelines to creating custom workflows, is exposed as structured tools that LLM agents can use autonomously.

### Core Principles
1. **Agent-First Design**: Every CRM operation is an AI tool
2. **Natural Language Operations**: Agents understand intent, not just commands
3. **Autonomous Workflows**: Agents can orchestrate complex multi-step processes
4. **Safety & Auditability**: All AI actions are logged and reversible
5. **Human-in-the-Loop**: Critical decisions require human approval

---

## Architecture Overview: Multi-Pipeline System

### Contact-Pipeline Relationship
- **Many-to-Many**: One contact can be in multiple pipelines simultaneously
- **Example Use Cases**:
  - Contact in "Sales Pipeline" (stage: Customer) + "Support Pipeline" (stage: Premium Support)
  - Contact in "Onboarding Pipeline" (stage: Training) + "Upsell Pipeline" (stage: Qualified)
  - Contact in "Partner Pipeline" (stage: Active Partner) + "Marketing Pipeline" (stage: Case Study)

### Data Model (Ontology-Based)

All entities use the existing universal `objects` table and `objectLinks` for relationships.

#### 1. Pipeline Object (`type: "crm_pipeline"`)
```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "crm_pipeline",
  subtype: "sales" | "support" | "onboarding" | "partner" | "custom",
  name: "Sales Pipeline",
  description: "Main B2B sales funnel with AI-driven lead scoring",
  status: "active" | "archived",
  customProperties: {
    icon: "TrendingUp",
    color: "#6B46C1",
    isDefault: true,
    order: 1,
    aiSettings: {
      autoScoring: true,          // AI scores leads automatically
      autoProgression: false,      // AI moves contacts (requires approval)
      aiAssistant: "sales_agent",  // Which AI agent manages this
      suggestActions: true,        // AI suggests next actions
      scoreModel: "lead_quality_v1" // AI model for scoring
    },
    automations: [
      {
        trigger: "stage_enter",
        stageId: Id<"objects">,
        action: "ai_enrich_contact", // AI enriches contact data
        settings: { ... }
      }
    ]
  },
  createdBy: Id<"users"> | Id<"objects">,
  createdAt: number,
  updatedAt: number
}
```

#### 2. Pipeline Stage Object (`type: "crm_pipeline_stage"`)
```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "crm_pipeline_stage",
  subtype: "active" | "won" | "lost",
  name: "Qualified Lead",
  description: "AI has qualified lead based on BANT criteria",
  status: "active" | "archived",
  customProperties: {
    order: 1,
    color: "#3B82F6",
    icon: "UserCheck",
    probability: 25,      // Win probability %
    minDays: 0,
    maxDays: 14,

    // AI-specific settings
    aiSettings: {
      exitCriteria: [      // AI checks these before progression
        "has_budget_confirmed",
        "has_decision_maker_contact",
        "timeline_defined"
      ],
      requiredFields: [    // AI ensures these are filled
        "company",
        "jobTitle",
        "estimatedValue"
      ],
      aiActions: [         // AI can perform these actions
        "enrich_company_data",
        "research_contact",
        "draft_outreach_email",
        "schedule_follow_up"
      ],
      suggestedPrompts: [  // Prompts for human-AI collaboration
        "Research this contact's recent activity",
        "Draft personalized outreach email",
        "Find similar successful deals"
      ]
    },

    automations: [
      {
        trigger: "contact_enters",
        action: "ai_research_background",
        aiAgent: "research_agent"
      },
      {
        trigger: "days_in_stage > 7",
        action: "ai_suggest_follow_up",
        aiAgent: "sales_agent"
      }
    ]
  },
  createdBy: Id<"users"> | Id<"objects">,
  createdAt: number,
  updatedAt: number
}
```

**Link to Pipeline**:
```typescript
{
  fromObjectId: stageId,
  toObjectId: pipelineId,
  linkType: "belongs_to_pipeline",
  properties: {
    order: 1,
    transitionRules: {
      canSkipStage: false,
      requiresApproval: true,
      aiCanAutomate: false // AI needs approval to move contacts
    }
  }
}
```

#### 3. Contact-Pipeline Position (`objectLinks`)
```typescript
{
  fromObjectId: contactId,
  toObjectId: stageId,
  linkType: "in_pipeline",
  properties: {
    pipelineId: Id<"objects">,
    movedAt: number,
    previousStageId: Id<"objects">,

    // AI-enhanced metadata
    aiData: {
      score: 85,              // AI-calculated score (0-100)
      confidence: 0.92,       // AI confidence in score
      scoreReasons: [         // Why this score?
        "High engagement: opened 5 emails",
        "Decision maker confirmed",
        "Budget allocated: $50k"
      ],
      suggestedNextStage: Id<"objects">,
      suggestedAction: "send_proposal",
      lastAiReview: number,   // When AI last analyzed
      aiNotes: "Contact shows high intent. Company recently secured Series B funding.",
      nextFollowUp: number,   // AI suggested follow-up date
      riskFactors: [
        "No response in 7 days"
      ]
    },

    // Human annotations
    notes: "Great call on 2024-01-15. Follow up with technical demo.",
    manualScore: 90,          // Human override of AI score
    overrideReason: "CEO relationship"
  },
  createdAt: number,
  createdBy: Id<"users"> | Id<"objects"> // Could be AI agent
}
```

---

## AI Agent Tool Architecture

### Tool Categories

#### 1. Pipeline Management Tools
AI agents can create, configure, and manage pipelines.

```typescript
// convex/crmAiTools.ts

/**
 * AI TOOL: Create Pipeline
 * Allows AI agents to create new pipelines for different workflows
 */
export const aiCreatePipeline = mutation({
  args: {
    aiAgentId: v.string(),        // Which AI agent is acting
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.string(),
    subtype: v.string(),
    stages: v.array(v.object({    // AI defines stages upfront
      name: v.string(),
      description: v.string(),
      order: v.number(),
      exitCriteria: v.array(v.string())
    })),
    approvalRequired: v.boolean(), // Human approval needed?
  },
  handler: async (ctx, args) => {
    // Log AI action
    await logAiAction(ctx, {
      agentId: args.aiAgentId,
      action: "create_pipeline",
      data: args
    })

    // Create pipeline if auto-approved OR queue for approval
    if (!args.approvalRequired) {
      return await createPipelineInternal(ctx, args)
    } else {
      return await queueForApproval(ctx, "create_pipeline", args)
    }
  }
})

/**
 * AI TOOL: Analyze Pipeline Performance
 * AI analyzes conversion rates, bottlenecks, and suggests improvements
 */
export const aiAnalyzePipeline = query({
  args: {
    aiAgentId: v.string(),
    pipelineId: v.id("objects"),
    timeRange: v.object({
      startDate: v.number(),
      endDate: v.number()
    })
  },
  handler: async (ctx, args) => {
    // Get all contacts in pipeline
    // Calculate metrics: conversion rates, avg time per stage, drop-off
    // Return analysis with suggestions
    return {
      metrics: {
        totalContacts: 150,
        conversionRate: 0.23,
        avgDaysToClose: 45,
        bottleneckStage: stageId
      },
      insights: [
        "Stage 2 has 40% drop-off rate - consider simplifying requirements",
        "Contacts spending avg 21 days in 'Qualification' - automate research?"
      ],
      suggestions: [
        {
          action: "add_automation",
          stage: stageId,
          automation: "auto_research_contacts",
          expectedImpact: "Reduce stage time by 60%"
        }
      ]
    }
  }
})
```

#### 2. Contact Management Tools
AI agents can create, update, and move contacts through pipelines.

```typescript
/**
 * AI TOOL: Add Contact to Pipeline
 * AI can add contacts to pipelines automatically
 */
export const aiAddContactToPipeline = mutation({
  args: {
    aiAgentId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    stageId: v.id("objects"),
    reason: v.string(),           // AI explains why
    confidence: v.number(),       // AI confidence (0-1)
    autoApprove: v.boolean(),     // Auto-execute or queue for approval
  },
  handler: async (ctx, args) => {
    await logAiAction(ctx, {
      agentId: args.aiAgentId,
      action: "add_contact_to_pipeline",
      reason: args.reason,
      confidence: args.confidence
    })

    // High confidence = auto-approve, low confidence = human review
    if (args.autoApprove && args.confidence > 0.85) {
      return await addContactToPipelineInternal(ctx, args)
    } else {
      return await queueForApproval(ctx, "add_to_pipeline", args)
    }
  }
})

/**
 * AI TOOL: Move Contact to Stage
 * AI progresses contacts through pipeline stages
 */
export const aiMoveContactToStage = mutation({
  args: {
    aiAgentId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    fromStageId: v.id("objects"),
    toStageId: v.id("objects"),
    reason: v.string(),
    confidence: v.number(),
    exitCriteriaMet: v.array(v.string()), // Which criteria were met
  },
  handler: async (ctx, args) => {
    // Validate exit criteria
    const stage = await ctx.db.get(args.fromStageId)
    const requiredCriteria = stage.customProperties.aiSettings.exitCriteria

    // Check if AI met all criteria
    const allCriteriaMet = requiredCriteria.every(c =>
      args.exitCriteriaMet.includes(c)
    )

    if (!allCriteriaMet) {
      return {
        success: false,
        error: "Not all exit criteria met",
        missingCriteria: requiredCriteria.filter(c =>
          !args.exitCriteriaMet.includes(c)
        )
      }
    }

    // Move contact
    await moveContactToStageInternal(ctx, args)

    // Log success
    await logAiAction(ctx, {
      agentId: args.aiAgentId,
      action: "move_contact",
      success: true,
      reason: args.reason
    })
  }
})

/**
 * AI TOOL: Score Contact
 * AI calculates lead score based on engagement, fit, intent
 */
export const aiScoreContact = mutation({
  args: {
    aiAgentId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    factors: v.object({
      engagement: v.number(),     // Email opens, clicks, etc.
      fit: v.number(),            // Company size, industry match
      intent: v.number(),         // Buying signals
      timing: v.number(),         // Budget cycle, urgency
    }),
    overallScore: v.number(),     // 0-100
    confidence: v.number(),       // 0-1
    reasoning: v.array(v.string())
  },
  handler: async (ctx, args) => {
    // Update contact's pipeline position with AI score
    const link = await findPipelineLink(ctx, {
      contactId: args.contactId,
      pipelineId: args.pipelineId
    })

    await ctx.db.patch(link._id, {
      properties: {
        ...link.properties,
        aiData: {
          score: args.overallScore,
          confidence: args.confidence,
          scoreReasons: args.reasoning,
          scoreFactors: args.factors,
          lastAiReview: Date.now()
        }
      }
    })

    await logAiAction(ctx, {
      agentId: args.aiAgentId,
      action: "score_contact",
      contactId: args.contactId,
      score: args.overallScore
    })
  }
})

/**
 * AI TOOL: Enrich Contact Data
 * AI researches and fills in missing contact/company data
 */
export const aiEnrichContact = mutation({
  args: {
    aiAgentId: v.string(),
    contactId: v.id("objects"),
    enrichedData: v.object({
      company: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      linkedInUrl: v.optional(v.string()),
      companySize: v.optional(v.string()),
      industry: v.optional(v.string()),
      recentNews: v.optional(v.array(v.string())),
      technologies: v.optional(v.array(v.string())),
    }),
    sources: v.array(v.string()),  // Where AI found this data
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId)

    // Update contact with enriched data
    await ctx.db.patch(args.contactId, {
      customProperties: {
        ...contact.customProperties,
        ...args.enrichedData,
        aiEnriched: {
          lastEnriched: Date.now(),
          sources: args.sources,
          confidence: args.confidence
        }
      }
    })

    await logAiAction(ctx, {
      agentId: args.aiAgentId,
      action: "enrich_contact",
      contactId: args.contactId,
      fieldsEnriched: Object.keys(args.enrichedData)
    })
  }
})
```

#### 3. Workflow Automation Tools
AI agents can create and execute multi-step workflows.

```typescript
/**
 * AI TOOL: Create Automated Workflow
 * AI designs workflows based on pipeline performance
 */
export const aiCreateWorkflow = mutation({
  args: {
    aiAgentId: v.string(),
    pipelineId: v.id("objects"),
    workflowName: v.string(),
    trigger: v.object({
      type: v.string(),           // "stage_enter", "field_change", "time_based"
      conditions: v.any()
    }),
    actions: v.array(v.object({
      type: v.string(),           // "ai_research", "send_email", "create_task"
      config: v.any(),
      waitTime: v.optional(v.number())
    })),
    approvalRequired: v.boolean()
  },
  handler: async (ctx, args) => {
    // Create workflow automation
    // Store in pipeline.customProperties.automations
    // Return workflow ID or queue for approval
  }
})

/**
 * AI TOOL: Suggest Next Action
 * AI recommends what should happen next for a contact
 */
export const aiSuggestNextAction = query({
  args: {
    aiAgentId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    context: v.optional(v.object({
      recentInteractions: v.array(v.any()),
      marketConditions: v.optional(v.string()),
      competitorActivity: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    // Analyze contact history
    // Consider current stage, time in stage, engagement
    // Return prioritized action suggestions

    return {
      primaryAction: {
        type: "send_email",
        template: "follow_up_proposal",
        reason: "Contact opened proposal 3 times, showing high interest",
        priority: "high",
        timing: "within_24_hours",
        draftContent: "Hi {{firstName}}, I noticed you reviewed..."
      },
      alternativeActions: [
        {
          type: "schedule_call",
          reason: "Decision timeline is approaching",
          priority: "medium"
        },
        {
          type: "send_case_study",
          reason: "Contact works in similar industry",
          priority: "low"
        }
      ],
      reasoning: "Contact has shown consistent engagement over 2 weeks..."
    }
  }
})
```

#### 4. Analytics & Insights Tools
AI agents analyze pipeline data and provide actionable insights.

```typescript
/**
 * AI TOOL: Find Similar Contacts
 * AI identifies contacts similar to a given contact
 */
export const aiFindSimilarContacts = query({
  args: {
    aiAgentId: v.string(),
    contactId: v.id("objects"),
    similarityFactors: v.array(v.string()), // ["industry", "company_size", "stage", "behavior"]
    limit: v.number()
  },
  handler: async (ctx, args) => {
    // Use AI embeddings or rule-based matching
    // Find contacts with similar characteristics
    // Return ranked list with similarity scores

    return {
      similarContacts: [
        {
          contactId: Id<"objects">,
          similarityScore: 0.89,
          matchingFactors: ["same_industry", "similar_engagement"],
          winProbability: 0.75,
          avgTimeToClose: 30,
          insight: "Contacts like this typically close in 30 days with personalized demo"
        }
      ]
    }
  }
})

/**
 * AI TOOL: Predict Contact Outcome
 * AI predicts whether contact will convert and when
 */
export const aiPredictOutcome = query({
  args: {
    aiAgentId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects")
  },
  handler: async (ctx, args) => {
    // Machine learning prediction based on:
    // - Contact attributes
    // - Engagement history
    // - Similar historical contacts
    // - External signals (company funding, hiring, etc.)

    return {
      prediction: {
        willConvert: true,
        probability: 0.78,
        expectedCloseDate: Date.now() + (45 * 24 * 60 * 60 * 1000),
        expectedValue: 75000, // in cents
        confidence: 0.85
      },
      factors: [
        { factor: "high_engagement", impact: +0.25 },
        { factor: "decision_maker_involved", impact: +0.20 },
        { factor: "budget_confirmed", impact: +0.15 },
        { factor: "no_response_recently", impact: -0.05 }
      ],
      recommendations: [
        "Schedule technical demo within 7 days",
        "Involve CEO for enterprise deal"
      ]
    }
  }
})

/**
 * AI TOOL: Identify At-Risk Deals
 * AI flags deals that may be stalling or at risk of being lost
 */
export const aiIdentifyAtRiskDeals = query({
  args: {
    aiAgentId: v.string(),
    pipelineId: v.id("objects"),
    riskThreshold: v.number() // 0-1
  },
  handler: async (ctx, args) => {
    // Analyze all contacts in pipeline
    // Identify risk signals:
    // - No activity in X days
    // - Stuck in stage too long
    // - Engagement dropping
    // - Competitor signals

    return {
      atRiskContacts: [
        {
          contactId: Id<"objects">,
          riskScore: 0.82,
          riskFactors: [
            "No email opens in 14 days",
            "Stuck in 'Proposal' stage for 21 days (avg is 14)",
            "Contact changed job titles"
          ],
          suggestedActions: [
            "Send re-engagement email with new value prop",
            "Check if new decision maker needs to be added"
          ],
          potentialValue: 50000
        }
      ],
      totalAtRisk: 5,
      totalValue: 250000
    }
  }
})
```

---

## AI Agent Personas

### 1. Sales Agent
**Role**: Manages sales pipeline, qualifies leads, suggests outreach

**Capabilities**:
- Score and qualify new leads automatically
- Move contacts through sales stages based on behavior
- Draft personalized outreach emails
- Suggest optimal timing for follow-ups
- Identify cross-sell/upsell opportunities

**Example Workflow**:
1. New contact added to "Sales Pipeline"
2. AI researches company (size, industry, recent news)
3. AI scores lead based on ICP fit
4. If score > 70, AI drafts personalized outreach
5. AI monitors engagement, suggests next action
6. AI moves to "Qualified Lead" when criteria met

### 2. Support Agent
**Role**: Manages support pipeline, triages issues, tracks resolution

**Capabilities**:
- Categorize support tickets by urgency/impact
- Assign to appropriate support tier
- Track time to resolution
- Identify patterns in support requests
- Escalate urgent issues automatically

**Example Workflow**:
1. Support request received → Added to "Support Pipeline"
2. AI analyzes request, categorizes (bug/feature/question)
3. AI checks customer tier (free/premium/enterprise)
4. AI assigns priority based on SLA
5. AI suggests relevant KB articles
6. AI monitors resolution time, escalates if needed

### 3. Research Agent
**Role**: Enriches contact data, finds insights, tracks market signals

**Capabilities**:
- Enrich contact profiles with public data
- Track company news and funding events
- Identify decision makers at companies
- Find similar successful deals
- Monitor competitor activity

**Example Workflow**:
1. Contact enters "Qualification" stage
2. Research agent finds LinkedIn, company website
3. Enriches: job title, company size, technologies used
4. Checks recent company news (funding, leadership changes)
5. Identifies additional stakeholders to contact
6. Stores findings in contact.aiData

### 4. Analytics Agent
**Role**: Analyzes pipeline performance, suggests optimizations

**Capabilities**:
- Calculate conversion rates per stage
- Identify bottlenecks in pipelines
- Predict revenue forecasts
- Recommend process improvements
- A/B test different approaches

**Example Workflow**:
1. Weekly: Analyze all active pipelines
2. Calculate metrics: conversion, velocity, value
3. Identify: "Proposal stage has 40% drop-off"
4. Suggest: "Add case study automation to Proposal stage"
5. Predict: "This change will improve conversion by 15%"
6. Queue suggestion for human approval

---

## AI Safety & Governance

### Approval Workflows
```typescript
// AI actions can require approval based on:
1. Action Type: Moving to "Customer" stage requires approval
2. Confidence Level: AI confidence < 85% requires review
3. Value Threshold: Deals > $10k require approval
4. Risk Level: High-risk changes require approval
5. Learning Mode: All AI actions require approval until trained
```

### Audit Trail
Every AI action is logged:
```typescript
{
  aiActionId: Id<"objects">,
  agentId: "sales_agent_v1",
  action: "move_contact_to_stage",
  contactId: Id<"objects">,
  timestamp: number,
  reasoning: "Contact engaged with 3 emails, met qualification criteria",
  confidence: 0.89,
  approvedBy: Id<"users"> | "auto_approved",
  outcome: "success" | "failed" | "pending_approval"
}
```

### Human Override
Humans can always:
- Override AI decisions
- Provide feedback ("This was wrong because...")
- Adjust AI confidence thresholds
- Disable AI for specific pipelines/stages
- Review AI reasoning before approval

---

## Integration with Existing AI System

### Leveraging Current AI Infrastructure

The platform already has AI capabilities in [convex/schemas/aiSchemas.ts:1](convex/schemas/aiSchemas.ts#L1):
- `aiConversations`: Chat with AI about CRM
- `aiMessages`: Conversation history
- `aiToolExecutions`: Tool execution tracking
- `organizationAiSettings`: LLM configuration

### CRM AI Tool Registration
```typescript
// Register CRM tools with AI system
const CRM_TOOLS = [
  {
    name: "create_pipeline",
    description: "Create a new sales/support/custom pipeline",
    parameters: { ... },
    function: aiCreatePipeline
  },
  {
    name: "move_contact",
    description: "Move contact to different pipeline stage",
    parameters: { ... },
    function: aiMoveContactToStage
  },
  {
    name: "score_contact",
    description: "Calculate lead score based on engagement and fit",
    parameters: { ... },
    function: aiScoreContact
  },
  // ... all AI tools
]

// AI can now use these tools in conversations:
// User: "Show me all high-value leads that haven't engaged in 2 weeks"
// AI: Uses aiIdentifyAtRiskDeals, filters by value, generates report
```

### Conversational CRM
Users can interact with CRM via natural language:

**Example Conversations**:
```
User: "Create a new pipeline for partner onboarding"
AI: Created pipeline with stages: Application → Review → Training → Active
    Added 4 contacts from 'partner' type automatically. Want to customize stages?

User: "Which deals are at risk this month?"
AI: Found 5 at-risk deals totaling $250k. Top concerns:
    1. Acme Corp ($80k) - No activity in 14 days
    2. TechStart ($50k) - Stuck in Proposal stage 21 days
    Shall I draft re-engagement emails?

User: "Move all qualified leads to the demo stage"
AI: Found 12 qualified leads. Checking exit criteria...
    - 8 contacts meet all criteria ✓
    - 4 contacts missing budget confirmation ⚠️
    Moving 8 now, flagging 4 for review. Done!

User: "What's our sales pipeline velocity?"
AI: Current velocity: 45 days from Lead → Customer
    Best stage: Qualification (avg 7 days) ✓
    Bottleneck: Proposal (avg 21 days, target 14) ⚠️
    Suggestion: Add proposal template automation to reduce by 40%
```

---

## Implementation Plan

### Phase 1: Core Multi-Pipeline (Week 1-2)
1. **Backend Foundation**
   - [ ] Create `convex/crmPipeline.ts` - Pipeline CRUD
   - [ ] Create `convex/crmAiTools.ts` - AI tool implementations
   - [ ] Update `convex/crmOntology.ts` - Add backwards compatibility
   - [ ] Create migration script - Default pipelines

2. **AI Tool Registration**
   - [ ] Register all CRM tools with AI system
   - [ ] Create tool schemas for LLM
   - [ ] Add safety/approval middleware
   - [ ] Implement audit logging

3. **Frontend Updates**
   - [ ] Update `pipeline-kanban.tsx` - Multi-pipeline support
   - [ ] Create `pipeline-selector.tsx` - Switch pipelines
   - [ ] Update `contact-detail.tsx` - Show all pipeline positions
   - [ ] Create `pipeline-settings.tsx` - Manage pipelines

### Phase 2: AI Agent Integration (Week 3)
4. **Agent Implementation**
   - [ ] Sales Agent - Lead scoring & progression
   - [ ] Research Agent - Contact enrichment
   - [ ] Analytics Agent - Pipeline analysis
   - [ ] Implement approval workflows

5. **Conversational Interface**
   - [ ] Add CRM chat interface
   - [ ] Connect to existing AI conversations
   - [ ] Add tool execution UI
   - [ ] Show AI reasoning/confidence

### Phase 3: Advanced Features (Week 4+)
6. **Automation Engine**
   - [ ] Workflow builder UI
   - [ ] Trigger system (stage_enter, time_based, etc.)
   - [ ] Action library (email, task, research, etc.)
   - [ ] A/B testing framework

7. **Intelligence Layer**
   - [ ] Contact scoring ML model
   - [ ] Deal prediction model
   - [ ] Pipeline optimization suggestions
   - [ ] Anomaly detection

---

## Database Schema Examples

### Pipeline with Stages
```typescript
// Pipeline Object
{
  _id: "pipeline_sales_001",
  type: "crm_pipeline",
  name: "Sales Pipeline",
  customProperties: {
    aiSettings: {
      autoScoring: true,
      aiAssistant: "sales_agent"
    }
  }
}

// Stage Objects (linked to pipeline)
{
  _id: "stage_lead_001",
  type: "crm_pipeline_stage",
  name: "New Lead",
  customProperties: {
    order: 1,
    aiSettings: {
      exitCriteria: ["email_verified", "company_identified"]
    }
  }
}

// Link: Stage → Pipeline
{
  fromObjectId: "stage_lead_001",
  toObjectId: "pipeline_sales_001",
  linkType: "belongs_to_pipeline",
  properties: { order: 1 }
}
```

### Contact in Multiple Pipelines
```typescript
// Contact Object
{
  _id: "contact_john_001",
  type: "crm_contact",
  name: "John Doe",
  subtype: "customer" // Legacy field (for default pipeline)
}

// Position in Sales Pipeline
{
  fromObjectId: "contact_john_001",
  toObjectId: "stage_customer_001",
  linkType: "in_pipeline",
  properties: {
    pipelineId: "pipeline_sales_001",
    aiData: {
      score: 85,
      reasoning: ["High engagement", "Decision maker"]
    }
  }
}

// Position in Upsell Pipeline
{
  fromObjectId: "contact_john_001",
  toObjectId: "stage_qualified_002",
  linkType: "in_pipeline",
  properties: {
    pipelineId: "pipeline_upsell_001",
    aiData: {
      score: 72,
      reasoning: ["Using premium features", "Team growing"]
    }
  }
}
```

---

## API Examples for AI Agents

### Agent Tool Call: Create Pipeline
```typescript
// LLM calls this tool
await aiCreatePipeline({
  aiAgentId: "claude_sales_v1",
  organizationId: orgId,
  name: "Partner Onboarding",
  description: "Pipeline for onboarding new technology partners",
  subtype: "partner",
  stages: [
    {
      name: "Application Received",
      description: "Initial partner application submitted",
      order: 1,
      exitCriteria: ["application_reviewed", "legal_check_passed"]
    },
    {
      name: "Technical Review",
      description: "Evaluating technical integration feasibility",
      order: 2,
      exitCriteria: ["api_tested", "security_audit_passed"]
    },
    {
      name: "Contract Negotiation",
      description: "Legal and commercial terms discussion",
      order: 3,
      exitCriteria: ["contract_signed", "pricing_agreed"]
    },
    {
      name: "Active Partner",
      description: "Partner is live and integrated",
      order: 4,
      exitCriteria: []
    }
  ],
  approvalRequired: false
})
```

### Agent Tool Call: Score & Move Contact
```typescript
// AI analyzes contact and makes decision
const contact = await getContact({ contactId })

// AI scores contact
await aiScoreContact({
  aiAgentId: "claude_sales_v1",
  contactId,
  pipelineId: "pipeline_sales_001",
  factors: {
    engagement: 85,    // Opened 5 emails, clicked 3 links
    fit: 90,           // Perfect ICP match
    intent: 70,        // Downloaded whitepaper, viewed pricing
    timing: 60         // Q4 budget available
  },
  overallScore: 82,
  confidence: 0.88,
  reasoning: [
    "Contact matches ideal customer profile (enterprise SaaS)",
    "High engagement: 5 email opens, 3 clicks in 7 days",
    "Strong buying signals: pricing page viewed 3x",
    "Budget cycle aligns with Q4 close"
  ]
})

// AI decides to move contact
await aiMoveContactToStage({
  aiAgentId: "claude_sales_v1",
  contactId,
  pipelineId: "pipeline_sales_001",
  fromStageId: "stage_lead_001",
  toStageId: "stage_qualified_002",
  reason: "Contact meets all qualification criteria: verified email, company identified, high engagement score (82/100), and shows strong purchase intent",
  confidence: 0.88,
  exitCriteriaMet: [
    "email_verified",
    "company_identified",
    "engagement_score > 75",
    "buying_signals_detected"
  ]
})
```

---

## Success Metrics

### Technical Metrics
- [ ] All CRM operations exposed as AI tools
- [ ] <500ms tool execution latency
- [ ] 99.9% AI action audit coverage
- [ ] 100% human override capability

### Business Metrics
- [ ] 40% reduction in manual data entry (AI enrichment)
- [ ] 60% faster lead qualification (AI scoring)
- [ ] 25% increase in pipeline velocity (AI automation)
- [ ] 85%+ AI action accuracy (human feedback)

### User Experience
- [ ] Natural language CRM commands work 95%+ of time
- [ ] AI suggestions accepted 70%+ of time
- [ ] Zero data loss from AI actions
- [ ] <2 clicks to approve AI suggestions

---

## Next Steps

### Immediate Questions:
1. **AI Model Selection**: Which LLM should power the agents?
   - Use existing org settings (Claude, GPT-4)?
   - Different models for different agents?

2. **Approval Thresholds**: What requires human approval?
   - All AI actions initially (learning mode)?
   - Only high-value decisions (>$X, stage progression)?
   - Based on confidence scores?

3. **Data Sources**: What external data can AI access?
   - LinkedIn, company websites for enrichment?
   - Email engagement data for scoring?
   - CRM analytics for predictions?

4. **Default Pipelines**: What pipelines to create by default?
   - Sales (Lead → Qualified → Demo → Proposal → Customer)?
   - Support (New → Triaged → In Progress → Resolved)?
   - Onboarding?

5. **Agent Personalities**: How should agents communicate?
   - Professional/formal vs casual/friendly?
   - Different tones for different agent types?
   - Customizable per organization?

### Ready to Build?
Once you answer these questions, we can start implementing:
1. Backend: `crmPipeline.ts` + `crmAiTools.ts`
2. Migration: Create default pipelines
3. Frontend: Multi-pipeline Kanban
4. AI: Register tools and test agent workflows

**What would you like to tackle first?**
