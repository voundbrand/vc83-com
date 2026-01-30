import { mutation, internalMutation, query, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { generateSyntheticExamples, SYNTHETIC_TEMPLATES } from "./syntheticTemplates";

/**
 * SEED SCRIPT: Import Synthetic Training Data
 *
 * This script imports synthetic training examples generated from v0 templates
 * into the aiTrainingExamples table. Since synthetic data doesn't come from
 * real conversations, it uses a special "synthetic" organization and conversation.
 *
 * Usage (from Convex dashboard or CLI):
 *   npx convex run seed/seedSyntheticTraining:runSyntheticImport --args '{"examples": [...]}'
 */

// ============================================================================
// HELPER FUNCTIONS (shared between mutations)
// ============================================================================

interface SyntheticExample {
  instruction: string;
  input: string;
  output: string;
  metadata: {
    example_type: "page_generation";
    source: "synthetic";
    template_name: string;
    prompt_variant: number;
    sections_count: number;
  };
}

const SYNTHETIC_ORG_NAME = "__synthetic_training__";
const SYNTHETIC_CONV_NAME = "__synthetic_examples__";
const SYNTHETIC_USER_EMAIL = "synthetic@system.internal";

/**
 * Helper: Get or create the synthetic organization, user, and conversation
 */
async function getOrCreateSyntheticOrgHelper(ctx: MutationCtx): Promise<{
  organizationId: Id<"organizations">;
  conversationId: Id<"aiConversations">;
  userId: Id<"users">;
}> {
  // Check if synthetic org exists
  const existingOrg = await ctx.db
    .query("organizations")
    .filter((q) => q.eq(q.field("name"), SYNTHETIC_ORG_NAME))
    .first();

  let orgId: Id<"organizations">;

  if (existingOrg) {
    orgId = existingOrg._id;
  } else {
    // Create synthetic organization matching the actual schema
    orgId = await ctx.db.insert("organizations", {
      name: SYNTHETIC_ORG_NAME,
      slug: "synthetic-training",
      businessName: "Synthetic Training Data (System)",
      isPersonalWorkspace: false,
      isActive: true,
      plan: "free",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  // Check if synthetic user exists
  const existingUser = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), SYNTHETIC_USER_EMAIL))
    .first();

  let userId: Id<"users">;

  if (existingUser) {
    userId = existingUser._id;
  } else {
    // Create synthetic user
    userId = await ctx.db.insert("users", {
      email: SYNTHETIC_USER_EMAIL,
      firstName: "Synthetic",
      lastName: "System",
      defaultOrgId: orgId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  // Check if synthetic conversation exists
  const existingConv = await ctx.db
    .query("aiConversations")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .filter((q) => q.eq(q.field("title"), SYNTHETIC_CONV_NAME))
    .first();

  let conversationId: Id<"aiConversations">;

  if (existingConv) {
    conversationId = existingConv._id;
  } else {
    // Create synthetic conversation matching the actual schema
    conversationId = await ctx.db.insert("aiConversations", {
      organizationId: orgId,
      userId: userId,
      title: SYNTHETIC_CONV_NAME,
      status: "archived",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return {
    organizationId: orgId,
    conversationId: conversationId,
    userId: userId,
  };
}

/**
 * Helper: Import synthetic training examples
 */
async function importSyntheticExamplesHelper(
  ctx: MutationCtx,
  examples: SyntheticExample[],
  syntheticOrgId: Id<"organizations">,
  syntheticConversationId: Id<"aiConversations">
): Promise<{ success: boolean; imported: number; skipped: number; total: number }> {
  const now = Date.now();
  let imported = 0;
  let skipped = 0;

  for (const example of examples) {
    // Check if this exact example already exists (by instruction hash)
    const existingExamples = await ctx.db
      .query("aiTrainingExamples")
      .withIndex("by_organization", (q) => q.eq("organizationId", syntheticOrgId))
      .filter((q) =>
        q.eq(q.field("input.userMessage"), example.instruction)
      )
      .collect();

    // Skip if already imported
    if (existingExamples.length > 0) {
      skipped++;
      continue;
    }

    // Parse the output JSON
    let generatedJson: unknown = null;
    let validJson = false;
    try {
      generatedJson = JSON.parse(example.output);
      validJson = true;
    } catch {
      validJson = false;
    }

    // Insert the training example
    await ctx.db.insert("aiTrainingExamples", {
      // Source tracking (synthetic placeholders)
      conversationId: syntheticConversationId,
      organizationId: syntheticOrgId,

      // Example type
      exampleType: "page_generation",

      // Input (instruction + context)
      input: {
        userMessage: example.instruction,
        previousContext: example.input,
        ragPatterns: undefined,
        currentPageState: undefined,
      },

      // Output (page JSON)
      output: {
        response: example.output,
        generatedJson: generatedJson,
        toolCalls: undefined,
      },

      // Feedback (synthetic data is assumed to be ideal)
      feedback: {
        outcome: "accepted",
        feedbackScore: 1,
        feedbackTimestamp: now,
      },

      // Quality flags
      quality: {
        isHighQuality: true,
        validJson: validJson,
        followedInstructions: true,
      },

      // Anonymization (no real PII in synthetic data)
      anonymized: true,
      anonymizedAt: now,

      // Export tracking (not yet exported)
      exportBatchId: undefined,
      exportedAt: undefined,

      // Metadata
      modelUsed: "synthetic/v0-templates",
      createdAt: now,
      updatedAt: now,
    });

    imported++;
  }

  return {
    success: true,
    imported,
    skipped,
    total: examples.length,
  };
}

// ============================================================================
// PUBLIC MUTATIONS (called from dashboard/API)
// ============================================================================

/**
 * Main entry point: Import synthetic data from the generator output
 * Call this from the dashboard or CLI
 */
export const runSyntheticImport = mutation({
  args: {
    examples: v.array(
      v.object({
        instruction: v.string(),
        input: v.string(),
        output: v.string(),
        metadata: v.object({
          example_type: v.literal("page_generation"),
          source: v.literal("synthetic"),
          template_name: v.string(),
          prompt_variant: v.number(),
          sections_count: v.number(),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get or create synthetic org/user/conversation
    const { organizationId, conversationId } = await getOrCreateSyntheticOrgHelper(ctx);

    // Import the examples
    const result = await importSyntheticExamplesHelper(
      ctx,
      args.examples,
      organizationId,
      conversationId
    );

    return result;
  },
});

/**
 * Get stats about synthetic training data (query version for dashboard)
 */
export const getSyntheticStats = query({
  args: {},
  handler: async (ctx) => {
    const SYNTHETIC_ORG_NAME = "__synthetic_training__";

    // Find synthetic org
    const syntheticOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), SYNTHETIC_ORG_NAME))
      .first();

    if (!syntheticOrg) {
      return {
        totalSynthetic: 0,
        byTemplate: {} as Record<string, number>,
        hasData: false,
        availableTemplates: SYNTHETIC_TEMPLATES.length,
        availableExamples: SYNTHETIC_TEMPLATES.reduce((sum, t) => sum + t.promptVariants.length, 0),
      };
    }

    // Get all synthetic examples
    const examples = await ctx.db
      .query("aiTrainingExamples")
      .withIndex("by_organization", (q) => q.eq("organizationId", syntheticOrg._id))
      .collect();

    // Group by template (extracted from output metadata)
    const byTemplate: Record<string, number> = {};
    for (const ex of examples) {
      try {
        const output = JSON.parse(ex.output.response);
        const template = output?.metadata?.slug || "unknown";
        byTemplate[template] = (byTemplate[template] || 0) + 1;
      } catch {
        byTemplate["unknown"] = (byTemplate["unknown"] || 0) + 1;
      }
    }

    return {
      totalSynthetic: examples.length,
      byTemplate,
      hasData: examples.length > 0,
      availableTemplates: SYNTHETIC_TEMPLATES.length,
      availableExamples: SYNTHETIC_TEMPLATES.reduce((sum, t) => sum + t.promptVariants.length, 0),
    };
  },
});

/**
 * Generate and import synthetic data in one step
 * This is the main action to call from the dashboard
 */
export const generateAndImportSynthetic = mutation({
  args: {},
  handler: async (ctx) => {
    // Generate examples from embedded templates
    const examples = generateSyntheticExamples();

    // Get or create synthetic org/user/conversation
    const { organizationId, conversationId } = await getOrCreateSyntheticOrgHelper(ctx);

    // Import all examples using helper function
    const result = await importSyntheticExamplesHelper(
      ctx,
      examples,
      organizationId,
      conversationId
    );

    return {
      ...result,
      templatesCount: SYNTHETIC_TEMPLATES.length,
      generatedCount: examples.length,
    };
  },
});

/**
 * Delete all synthetic training data
 * Useful for resetting or re-importing
 */
export const clearSyntheticData = mutation({
  args: {},
  handler: async (ctx) => {
    const SYNTHETIC_ORG_NAME = "__synthetic_training__";

    // Find synthetic org
    const syntheticOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), SYNTHETIC_ORG_NAME))
      .first();

    if (!syntheticOrg) {
      return { deleted: 0 };
    }

    // Get all synthetic examples
    const examples = await ctx.db
      .query("aiTrainingExamples")
      .withIndex("by_organization", (q) => q.eq("organizationId", syntheticOrg._id))
      .collect();

    // Delete all
    for (const ex of examples) {
      await ctx.db.delete(ex._id);
    }

    return { deleted: examples.length };
  },
});
