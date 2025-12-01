/**
 * SEED: CRM System Pipeline Template
 *
 * Creates the default "Standard Sales Pipeline" template that organizations can copy.
 * This template is owned by the SYSTEM organization (organizationId = "SYSTEM").
 *
 * Template Structure:
 * - 1 Pipeline: Standard Sales Pipeline
 * - 5 Stages: New Lead → Qualified → Demo Scheduled → Proposal Sent → Customer
 *
 * Run: npx convex run translations/seedCRM_05_SystemPipelineTemplate:seed
 */

import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding CRM System Pipeline Template...");

    // Step 1: Get system organization (same as template sets)
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Please run seedOntologyData first.");
    }

    const SYSTEM_ORG_ID = systemOrg._id;
    console.log(`✅ Using system organization: ${SYSTEM_ORG_ID}`);

    // Step 2: Check if template already exists
    const existingTemplate = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", SYSTEM_ORG_ID).eq("type", "crm_pipeline")
      )
      .filter((q) => q.eq(q.field("name"), "Standard Sales Pipeline"))
      .first();

    if (existingTemplate) {
      console.log("✅ Template already exists, skipping...");
      return { success: true, message: "Template already exists" };
    }

    // Step 3: Create pipeline template
    const pipelineId = await ctx.db.insert("objects", {
      organizationId: SYSTEM_ORG_ID,
      type: "crm_pipeline",
      subtype: "sales",
      name: "Standard Sales Pipeline",
      description: "Classic B2B sales funnel with lead nurturing and progression tracking",
      status: "active",
      customProperties: {
        isTemplate: true,
        category: "sales",
        icon: "TrendingUp",
        color: "#6B46C1",
        aiSettings: {
          autoScoring: true,
          autoProgression: false,
          suggestActions: true,
          scoreModel: "lead_quality_v1",
        },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(`✅ Created pipeline template: ${pipelineId}`);

    // Define stages
    const stages = [
      {
        name: "New Lead",
        description: "Initial contact, not yet qualified",
        order: 1,
        color: "#94A3B8", // Slate
        probability: 10,
        subtype: "active" as const,
        aiSettings: {
          exitCriteria: ["email_verified", "company_identified"],
          requiredFields: ["email", "firstName", "lastName"],
          aiActions: ["enrich_contact_data", "research_company", "verify_email"],
          suggestedPrompts: [
            "Research this contact's company background",
            "Find decision makers at this organization",
            "Check if contact matches our ICP",
          ],
        },
        automations: [
          {
            trigger: "contact_enters",
            action: "ai_enrich_contact",
            aiAgent: "research_agent",
          },
        ],
      },
      {
        name: "Qualified",
        description: "Lead has been qualified and meets basic criteria (BANT)",
        order: 2,
        color: "#3B82F6", // Blue
        probability: 25,
        subtype: "active" as const,
        aiSettings: {
          exitCriteria: ["budget_confirmed", "authority_identified", "need_confirmed", "timeline_defined"],
          requiredFields: ["company", "jobTitle", "phone"],
          aiActions: ["draft_outreach_email", "schedule_discovery_call", "research_competitors"],
          suggestedPrompts: [
            "Draft personalized outreach email",
            "Find recent company news or funding announcements",
            "Identify potential pain points based on industry",
          ],
        },
        automations: [
          {
            trigger: "days_in_stage > 7",
            action: "ai_suggest_follow_up",
            aiAgent: "sales_agent",
          },
        ],
      },
      {
        name: "Demo Scheduled",
        description: "Discovery call or demo has been scheduled",
        order: 3,
        color: "#8B5CF6", // Purple
        probability: 50,
        subtype: "active" as const,
        aiSettings: {
          exitCriteria: ["demo_completed", "technical_fit_confirmed", "stakeholders_identified"],
          requiredFields: ["estimatedValue", "expectedCloseDate"],
          aiActions: ["prepare_demo_notes", "research_use_cases", "create_proposal_draft"],
          suggestedPrompts: [
            "Prepare personalized demo based on their industry",
            "Find similar customer success stories",
            "Identify key features that match their needs",
          ],
        },
        automations: [
          {
            trigger: "demo_date_approaching",
            action: "ai_prepare_demo_brief",
            aiAgent: "sales_agent",
          },
        ],
      },
      {
        name: "Proposal Sent",
        description: "Commercial proposal has been sent, awaiting decision",
        order: 4,
        color: "#F59E0B", // Amber
        probability: 75,
        subtype: "active" as const,
        aiSettings: {
          exitCriteria: ["proposal_reviewed", "pricing_approved", "legal_review_complete"],
          requiredFields: ["proposalAmount", "decisionMakers"],
          aiActions: [
            "track_proposal_engagement",
            "schedule_close_call",
            "address_objections",
            "prepare_contract",
          ],
          suggestedPrompts: [
            "Check if proposal has been opened/reviewed",
            "Draft follow-up addressing common objections",
            "Identify any blockers or concerns",
          ],
        },
        automations: [
          {
            trigger: "days_in_stage > 14",
            action: "ai_flag_at_risk",
            aiAgent: "analytics_agent",
          },
        ],
      },
      {
        name: "Customer",
        description: "Deal won! Contact is now an active customer",
        order: 5,
        color: "#10B981", // Green
        probability: 100,
        subtype: "won" as const,
        aiSettings: {
          exitCriteria: [],
          requiredFields: ["contractValue", "contractStartDate"],
          aiActions: ["onboard_customer", "request_testimonial", "identify_upsell_opportunities"],
          suggestedPrompts: [
            "Create personalized onboarding plan",
            "Schedule customer success check-in",
            "Identify expansion opportunities",
          ],
        },
        automations: [
          {
            trigger: "contact_enters",
            action: "ai_create_onboarding_plan",
            aiAgent: "customer_success_agent",
          },
        ],
      },
    ];

    // Create stage objects and link to pipeline
    const stageIds: Id<"objects">[] = [];

    for (const stage of stages) {
      const stageId = await ctx.db.insert("objects", {
        organizationId: SYSTEM_ORG_ID,
        type: "crm_pipeline_stage",
        subtype: stage.subtype,
        name: stage.name,
        description: stage.description,
        status: "active",
        customProperties: {
          order: stage.order,
          color: stage.color,
          probability: stage.probability,
          aiSettings: stage.aiSettings,
          automations: stage.automations,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Link stage to pipeline
      await ctx.db.insert("objectLinks", {
        organizationId: SYSTEM_ORG_ID,
        fromObjectId: stageId,
        toObjectId: pipelineId,
        linkType: "belongs_to_pipeline",
        properties: {
          order: stage.order,
          transitionRules: {
            canSkipStage: false,
            requiresApproval: stage.order === 5, // Require approval for moving to Customer
            aiCanAutomate: stage.order < 5, // AI can automate moves except to Customer
          },
        },
        createdAt: Date.now(),
      });

      stageIds.push(stageId);
      console.log(`✅ Created stage: ${stage.name} (${stageId})`);
    }

    console.log("🎉 Successfully seeded CRM System Pipeline Template!");
    console.log(`   Pipeline ID: ${pipelineId}`);
    console.log(`   Stages created: ${stageIds.length}`);

    return {
      success: true,
      pipelineId,
      stageIds,
      message: "CRM System Pipeline Template created successfully",
    };
  },
});
