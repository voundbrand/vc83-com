import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Training Data Collection for Custom Model Fine-tuning
 *
 * This module handles:
 * 1. Collecting AI interactions as training examples
 * 2. Tracking user feedback (explicit and implicit)
 * 3. Quality scoring for filtering training data
 * 4. Stats and monitoring for training data collection
 */

// ============================================================================
// TRAINING EXAMPLE COLLECTION
// ============================================================================

/**
 * Collect a training example after AI response
 * Called from chat.ts after every AI interaction
 */
export const collectTrainingExample = internalMutation({
  args: {
    conversationId: v.id("aiConversations"),
    messageId: v.optional(v.id("aiMessages")),
    organizationId: v.id("organizations"),
    exampleType: v.union(
      v.literal("page_generation"),
      v.literal("section_edit"),
      v.literal("design_choice"),
      v.literal("tool_invocation")
    ),
    input: v.object({
      userMessage: v.string(),
      previousContext: v.optional(v.string()),
      ragPatterns: v.optional(v.array(v.string())),
      currentPageState: v.optional(v.any()),
    }),
    output: v.object({
      response: v.string(),
      generatedJson: v.optional(v.any()),
      toolCalls: v.optional(v.array(v.any())),
    }),
    modelUsed: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Determine if output contains valid JSON (for page builder)
    const hasValidJson = args.output.generatedJson !== undefined;

    // Create the training example with default feedback state
    const exampleId = await ctx.db.insert("aiTrainingExamples", {
      conversationId: args.conversationId,
      messageId: args.messageId,
      organizationId: args.organizationId,
      exampleType: args.exampleType,
      input: args.input,
      output: args.output,
      feedback: {
        outcome: "no_feedback", // Will be updated when user takes action
      },
      quality: {
        isHighQuality: false, // Will be calculated after feedback
        validJson: hasValidJson,
        followedInstructions: true, // Assume true, can be updated
      },
      anonymized: false,
      modelUsed: args.modelUsed,
      createdAt: now,
      updatedAt: now,
    });

    return exampleId;
  },
});

// ============================================================================
// FEEDBACK UPDATES
// ============================================================================

/**
 * Update training example with explicit user feedback (thumbs up/down)
 */
export const submitFeedback = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    feedbackScore: v.number(), // 1 for thumbs up, -1 for thumbs down
  },
  handler: async (ctx, args) => {
    // Find the most recent training example for this conversation
    const example = await ctx.db
      .query("aiTrainingExamples")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .first();

    if (!example) {
      console.log("[Training] No training example found for conversation", args.conversationId);
      return null;
    }

    const now = Date.now();

    // Update feedback
    await ctx.db.patch(example._id, {
      feedback: {
        ...example.feedback,
        feedbackScore: args.feedbackScore,
        feedbackTimestamp: now,
      },
      quality: {
        ...example.quality,
        isHighQuality: args.feedbackScore > 0,
      },
      updatedAt: now,
    });

    return example._id;
  },
});

/**
 * Update training example with outcome based on page save
 * Called from pageBuilder.ts when user saves a page
 */
export const updateExampleOutcome = internalMutation({
  args: {
    conversationId: v.id("aiConversations"),
    outcome: v.union(
      v.literal("accepted"),
      v.literal("accepted_with_edits"),
      v.literal("rejected")
    ),
    userEdits: v.optional(v.any()),
    editPercentage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find the most recent training example for this conversation
    const example = await ctx.db
      .query("aiTrainingExamples")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .first();

    if (!example) {
      console.log("[Training] No training example found for conversation", args.conversationId);
      return null;
    }

    const now = Date.now();

    // Calculate quality score
    const isHighQuality = calculateQualityScore(
      example.quality.validJson,
      example.feedback.feedbackScore,
      args.outcome
    ) >= 5;

    // Update with outcome
    await ctx.db.patch(example._id, {
      feedback: {
        ...example.feedback,
        outcome: args.outcome,
        userEdits: args.userEdits,
        editPercentage: args.editPercentage,
      },
      quality: {
        ...example.quality,
        isHighQuality,
      },
      updatedAt: now,
    });

    return example._id;
  },
});

/**
 * Mark abandoned sessions as no_feedback
 * Can be called by a scheduled job or manually
 */
export const markAbandonedSessions = internalMutation({
  args: {
    olderThanMinutes: v.optional(v.number()), // Default 15 minutes
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.olderThanMinutes || 15) * 60 * 1000;

    // Find examples with no_feedback that are older than cutoff
    const abandonedExamples = await ctx.db
      .query("aiTrainingExamples")
      .withIndex("by_created")
      .filter((q) =>
        q.and(
          q.lt(q.field("createdAt"), cutoffTime),
          q.eq(q.field("feedback.outcome"), "no_feedback")
        )
      )
      .take(100); // Process in batches

    let updated = 0;
    for (const example of abandonedExamples) {
      // Check if there's been any activity (feedback score set)
      if (example.feedback.feedbackScore === undefined) {
        // No activity - mark as abandoned (keep as no_feedback but set quality to false)
        await ctx.db.patch(example._id, {
          quality: {
            ...example.quality,
            isHighQuality: false,
          },
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { processed: abandonedExamples.length, updated };
  },
});

// ============================================================================
// QUALITY SCORING
// ============================================================================

/**
 * Calculate quality score for a training example
 * Score 0-10, threshold for high quality is 5+
 */
function calculateQualityScore(
  validJson: boolean,
  feedbackScore: number | undefined,
  outcome: "accepted" | "accepted_with_edits" | "rejected" | "no_feedback"
): number {
  let score = 0;

  // Valid JSON output (+3)
  if (validJson) score += 3;

  // Explicit positive feedback (+3)
  if (feedbackScore !== undefined && feedbackScore > 0) score += 3;

  // User accepted without edits (+2)
  if (outcome === "accepted") score += 2;

  // User accepted with minor edits (+1)
  if (outcome === "accepted_with_edits") score += 1;

  // Explicit negative feedback (-2)
  if (feedbackScore !== undefined && feedbackScore < 0) score -= 2;

  // Rejected (-1)
  if (outcome === "rejected") score -= 1;

  return Math.max(0, Math.min(10, score)); // Clamp to 0-10
}

// ============================================================================
// STATS AND MONITORING
// ============================================================================

/**
 * Get training data collection statistics
 */
export const getTrainingStats = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Get all examples (optionally filtered by org)
    let examples;
    if (args.organizationId) {
      examples = await ctx.db
        .query("aiTrainingExamples")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId!))
        .collect();
    } else {
      examples = await ctx.db.query("aiTrainingExamples").collect();
    }

    // Calculate stats
    const stats = {
      total: examples.length,
      byType: {
        page_generation: 0,
        section_edit: 0,
        design_choice: 0,
        tool_invocation: 0,
      },
      byOutcome: {
        accepted: 0,
        accepted_with_edits: 0,
        rejected: 0,
        no_feedback: 0,
      },
      byFeedback: {
        thumbs_up: 0,
        thumbs_down: 0,
        no_explicit_feedback: 0,
      },
      quality: {
        high_quality: 0,
        low_quality: 0,
        valid_json: 0,
      },
      export: {
        exported: 0,
        not_exported: 0,
      },
      readyForTraining: 0, // High quality + not exported
    };

    for (const example of examples) {
      // By type
      stats.byType[example.exampleType]++;

      // By outcome
      stats.byOutcome[example.feedback.outcome]++;

      // By feedback
      if (example.feedback.feedbackScore !== undefined) {
        if (example.feedback.feedbackScore > 0) {
          stats.byFeedback.thumbs_up++;
        } else {
          stats.byFeedback.thumbs_down++;
        }
      } else {
        stats.byFeedback.no_explicit_feedback++;
      }

      // Quality
      if (example.quality.isHighQuality) {
        stats.quality.high_quality++;
      } else {
        stats.quality.low_quality++;
      }
      if (example.quality.validJson) {
        stats.quality.valid_json++;
      }

      // Export status
      if (example.exportedAt) {
        stats.export.exported++;
      } else {
        stats.export.not_exported++;
      }

      // Ready for training (high quality + not exported)
      if (example.quality.isHighQuality && !example.exportedAt) {
        stats.readyForTraining++;
      }
    }

    return stats;
  },
});

/**
 * List training examples with filtering
 */
export const listTrainingExamples = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    exampleType: v.optional(v.union(
      v.literal("page_generation"),
      v.literal("section_edit"),
      v.literal("design_choice"),
      v.literal("tool_invocation")
    )),
    highQualityOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get examples - filter by org if specified
    let examples;
    if (args.organizationId) {
      examples = await ctx.db
        .query("aiTrainingExamples")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId!))
        .order("desc")
        .take(args.limit || 100);
    } else {
      examples = await ctx.db
        .query("aiTrainingExamples")
        .order("desc")
        .take(args.limit || 100);
    }

    // Apply additional filters in memory
    if (args.exampleType) {
      examples = examples.filter((e) => e.exampleType === args.exampleType);
    }
    if (args.highQualityOnly) {
      examples = examples.filter((e) => e.quality.isHighQuality);
    }

    return examples;
  },
});
