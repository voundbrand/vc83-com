import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal as internalApi } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";

/**
 * Training Data Export Pipeline
 *
 * Exports training examples to Hugging Face format for fine-tuning.
 * Supports filtering by quality, anonymization, and batch tracking.
 */

// ============================================================================
// ANONYMIZATION HELPERS
// ============================================================================

const PII_PATTERNS = [
  // Email addresses
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "contact@example.com" },
  // Phone numbers (various formats)
  { regex: /\b\+?[\d\s\-().]{10,}\b/g, replacement: "+1 (555) 000-0000" },
  // URLs with potential PII
  { regex: /https?:\/\/[^\s]+/g, replacement: "https://example.com" },
];

function anonymizeText(text: string): string {
  let result = text;
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern.regex, pattern.replacement);
  }
  return result;
}

function anonymizePageJson(page: unknown): unknown {
  if (!page || typeof page !== "object") return page;

  const json = JSON.stringify(page);
  const anonymized = anonymizeText(json);

  try {
    return JSON.parse(anonymized);
  } catch {
    return page;
  }
}

// ============================================================================
// EXPORT ACTION
// ============================================================================

interface HuggingFaceExample {
  instruction: string;
  input: string;
  output: string;
  metadata: {
    example_type: string;
    feedback_score?: number;
    outcome: string;
    valid_json: boolean;
    model_used?: string;
  };
}

/**
 * Export training data to Hugging Face JSONL format
 */
export const exportTrainingData = action({
  args: {
    minQualityScore: v.optional(v.number()), // Minimum quality score (0-10)
    onlyHighQuality: v.optional(v.boolean()), // Only export isHighQuality=true
    exampleTypes: v.optional(v.array(v.string())), // Filter by type
    limit: v.optional(v.number()), // Max examples to export
    anonymize: v.optional(v.boolean()), // Anonymize PII (default true)
    markAsExported: v.optional(v.boolean()), // Mark examples as exported (default true)
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    count: number;
    batchId: string;
    jsonl: string;
  }> => {
    const anonymize = args.anonymize !== false;
    const markAsExported = args.markAsExported !== false;

    // Generate batch ID
    const batchId = `export-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Query training examples - using mutation wrapper to avoid Convex type depth issues
    const limit = args.limit || 1000;
    // Convex type instantiation depth workaround - internalApi reference causes TS2589
    const fetchFn = internalApi.ai.trainingExport.fetchExportableExamples;
    const allExamples: Doc<"aiTrainingExamples">[] = await ctx.runMutation(fetchFn, {
      onlyHighQuality: args.onlyHighQuality,
      limit,
    });

    // Filter by example types if specified
    let examples = allExamples;
    if (args.exampleTypes && args.exampleTypes.length > 0) {
      examples = examples.filter((e) => args.exampleTypes!.includes(e.exampleType));
    }

    // Convert to Hugging Face format
    const huggingFaceExamples: HuggingFaceExample[] = [];

    for (const example of examples) {
      // Build instruction from user message
      let instruction = example.input.userMessage;
      if (anonymize) {
        instruction = anonymizeText(instruction);
      }

      // Build input context
      const inputParts: string[] = [];
      if (example.input.ragPatterns && example.input.ragPatterns.length > 0) {
        inputParts.push(`Design patterns: ${example.input.ragPatterns.join(", ")}`);
      }
      if (example.input.currentPageState) {
        inputParts.push("Editing existing page");
      }
      const input = inputParts.length > 0 ? inputParts.join(". ") : "";

      // Build output
      let output = example.output.response;
      if (anonymize) {
        output = anonymizeText(output);
      }

      // If we have generated JSON, use that as the canonical output
      if (example.output.generatedJson) {
        const jsonOutput = anonymize
          ? anonymizePageJson(example.output.generatedJson)
          : example.output.generatedJson;
        output = JSON.stringify(jsonOutput);
      }

      huggingFaceExamples.push({
        instruction,
        input,
        output,
        metadata: {
          example_type: example.exampleType,
          feedback_score: example.feedback.feedbackScore,
          outcome: example.feedback.outcome,
          valid_json: example.quality.validJson,
          model_used: example.modelUsed,
        },
      });
    }

    // Convert to JSONL
    const jsonl = huggingFaceExamples
      .map((ex) => JSON.stringify(ex))
      .join("\n");

    // Mark examples as exported
    if (markAsExported && examples.length > 0) {
      const exampleIds = examples.map((e) => e._id);
      await ctx.runMutation(internalApi.ai.trainingExport.markExported, {
        exampleIds,
        batchId,
      });
    }

    return {
      success: true,
      count: huggingFaceExamples.length,
      batchId,
      jsonl,
    };
  },
});

/**
 * Internal query to get exportable examples
 */
export const getExportableExamples = internalQuery({
  args: {
    onlyHighQuality: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get examples that haven't been exported
    let examples;
    if (args.onlyHighQuality) {
      examples = await ctx.db
        .query("aiTrainingExamples")
        .withIndex("by_quality", (q) => q.eq("quality.isHighQuality", true))
        .filter((q) => q.eq(q.field("exportedAt"), undefined))
        .take(args.limit || 1000);
    } else {
      examples = await ctx.db
        .query("aiTrainingExamples")
        .filter((q) => q.eq(q.field("exportedAt"), undefined))
        .take(args.limit || 1000);
    }

    return examples;
  },
});

/**
 * Internal mutation wrapper to fetch examples (workaround for action type depth issues)
 */
export const fetchExportableExamples = internalMutation({
  args: {
    onlyHighQuality: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    includeExported: v.optional(v.boolean()), // If true, include already-exported examples
  },
  handler: async (ctx, args) => {
    // Get examples - optionally filter out already exported
    let examples;
    if (args.onlyHighQuality) {
      const query = ctx.db
        .query("aiTrainingExamples")
        .withIndex("by_quality", (q) => q.eq("quality.isHighQuality", true));

      if (args.includeExported) {
        examples = await query.take(args.limit || 1000);
      } else {
        examples = await query
          .filter((q) => q.eq(q.field("exportedAt"), undefined))
          .take(args.limit || 1000);
      }
    } else {
      const query = ctx.db.query("aiTrainingExamples");

      if (args.includeExported) {
        examples = await query.take(args.limit || 1000);
      } else {
        examples = await query
          .filter((q) => q.eq(q.field("exportedAt"), undefined))
          .take(args.limit || 1000);
      }
    }

    return examples;
  },
});

/**
 * Mark examples as exported
 */
export const markExported = internalMutation({
  args: {
    exampleIds: v.array(v.id("aiTrainingExamples")),
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const id of args.exampleIds) {
      await ctx.db.patch(id, {
        exportedAt: now,
        exportBatchId: args.batchId,
        updatedAt: now,
      });
    }

    return { updated: args.exampleIds.length };
  },
});

/**
 * Get export history
 */
export const getExportHistory = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all unique batch IDs - filter exported examples
    const examples = await ctx.db
      .query("aiTrainingExamples")
      .filter((q) => q.neq(q.field("exportedAt"), undefined))
      .collect();

    // Group by batch
    const batches = new Map<string, { count: number; exportedAt: number }>();
    for (const example of examples) {
      const batchId = example.exportBatchId || "unknown";
      const existing = batches.get(batchId);
      if (existing) {
        existing.count++;
      } else {
        batches.set(batchId, {
          count: 1,
          exportedAt: example.exportedAt || 0,
        });
      }
    }

    return Array.from(batches.entries()).map(([batchId, data]) => ({
      batchId,
      ...data,
    }));
  },
});

// ============================================================================
// AUTOTRAIN FORMAT EXPORT
// ============================================================================

/**
 * AutoTrain chat/messages format for LLM fine-tuning
 * Converts our instruction/input/output format to AutoTrain's expected structure
 *
 * AutoTrain expects either:
 * - "text" column with full prompt+response
 * - "messages" column with array of {role, content} objects (preferred for chat models)
 */

interface AutoTrainMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AutoTrainExample {
  messages: AutoTrainMessage[];
}

const SYSTEM_PROMPT = `You are a web page builder AI assistant. You help users create professional web pages by generating structured JSON that defines the page layout, sections, and content.

When the user describes what they want, you respond with valid JSON containing:
- metadata: page title, description, slug, theme colors
- sections: array of section objects, each with type, variant, and content

Available section types: hero, features, testimonials, pricing, contact, cta, gallery, stats, team, faq, timeline, logos, comparison, process, benefits, newsletter, social-proof, portfolio

Always generate complete, production-ready page structures with realistic placeholder content.`;

/**
 * Export training data to AutoTrain format (messages array for chat models)
 */
export const exportAutoTrainFormat = action({
  args: {
    onlyHighQuality: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    anonymize: v.optional(v.boolean()),
    includeSystemPrompt: v.optional(v.boolean()),
    includeExported: v.optional(v.boolean()), // If true, re-export already-exported examples
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    count: number;
    batchId: string;
    jsonl: string;
    format: "autotrain-messages";
  }> => {
    const anonymize = args.anonymize !== false;
    const includeSystemPrompt = args.includeSystemPrompt !== false;

    // Generate batch ID
    const batchId = `autotrain-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Query training examples
    const limit = args.limit || 1000;
    // Convex type instantiation depth workaround
    const fetchFn = internalApi.ai.trainingExport.fetchExportableExamples;
    const allExamples: Doc<"aiTrainingExamples">[] = await ctx.runMutation(fetchFn, {
      onlyHighQuality: args.onlyHighQuality,
      limit,
      includeExported: args.includeExported,
    });

    // Convert to AutoTrain messages format
    const autoTrainExamples: AutoTrainExample[] = [];

    for (const example of allExamples) {
      const messages: AutoTrainMessage[] = [];

      // Add system prompt if enabled
      if (includeSystemPrompt) {
        messages.push({
          role: "system",
          content: SYSTEM_PROMPT,
        });
      }

      // Build user message
      let userContent = example.input.userMessage;
      if (anonymize) {
        userContent = anonymizeText(userContent);
      }

      // Add context to user message if available
      if (example.input.previousContext) {
        userContent = `Context: ${anonymize ? anonymizeText(example.input.previousContext) : example.input.previousContext}\n\nRequest: ${userContent}`;
      }
      if (example.input.ragPatterns && example.input.ragPatterns.length > 0) {
        userContent = `Design patterns to consider: ${example.input.ragPatterns.join(", ")}\n\n${userContent}`;
      }

      messages.push({
        role: "user",
        content: userContent,
      });

      // Build assistant response
      let assistantContent = example.output.response;
      if (anonymize) {
        assistantContent = anonymizeText(assistantContent);
      }

      // If we have generated JSON, use that as the canonical output
      if (example.output.generatedJson) {
        const jsonOutput = anonymize
          ? anonymizePageJson(example.output.generatedJson)
          : example.output.generatedJson;
        assistantContent = JSON.stringify(jsonOutput, null, 2);
      }

      messages.push({
        role: "assistant",
        content: assistantContent,
      });

      autoTrainExamples.push({ messages });
    }

    // Convert to JSONL
    const jsonl = autoTrainExamples
      .map((ex) => JSON.stringify(ex))
      .join("\n");

    return {
      success: true,
      count: autoTrainExamples.length,
      batchId,
      jsonl,
      format: "autotrain-messages",
    };
  },
});

// ============================================================================
// FIREWORKS.AI FORMAT EXPORT
// ============================================================================

/**
 * Fireworks.ai format for fine-tuning
 * Fireworks expects: {"input": "...", "preferred_output": "..."} format
 *
 * Documentation: https://docs.fireworks.ai/fine-tuning/fine-tuning-models
 */
interface FireworksExample {
  input: string;
  preferred_output: string;
}

/**
 * Export training data to Fireworks.ai format
 */
export const exportFireworksFormat = action({
  args: {
    onlyHighQuality: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    anonymize: v.optional(v.boolean()),
    includeSystemPrompt: v.optional(v.boolean()),
    includeExported: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    count: number;
    batchId: string;
    jsonl: string;
    format: "fireworks";
  }> => {
    const anonymize = args.anonymize !== false;
    const includeSystemPrompt = args.includeSystemPrompt !== false;

    // Generate batch ID
    const batchId = `fireworks-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Query training examples
    const limit = args.limit || 1000;
    // Convex type instantiation depth workaround
    const fetchFn = internalApi.ai.trainingExport.fetchExportableExamples;
    const allExamples: Doc<"aiTrainingExamples">[] = await ctx.runMutation(fetchFn, {
      onlyHighQuality: args.onlyHighQuality,
      limit,
      includeExported: args.includeExported,
    });

    // Convert to Fireworks format
    const fireworksExamples: FireworksExample[] = [];

    for (const example of allExamples) {
      // Build input (instruction + context)
      let inputContent = "";

      // Add system prompt if enabled
      if (includeSystemPrompt) {
        inputContent += `${SYSTEM_PROMPT}\n\n`;
      }

      // Add user message
      let userMessage = example.input.userMessage;
      if (anonymize) {
        userMessage = anonymizeText(userMessage);
      }

      // Add context if available
      if (example.input.previousContext) {
        inputContent += `Context: ${anonymize ? anonymizeText(example.input.previousContext) : example.input.previousContext}\n\n`;
      }
      if (example.input.ragPatterns && example.input.ragPatterns.length > 0) {
        inputContent += `Design patterns to consider: ${example.input.ragPatterns.join(", ")}\n\n`;
      }

      inputContent += userMessage;

      // Build output
      let outputContent = example.output.response;
      if (anonymize) {
        outputContent = anonymizeText(outputContent);
      }

      // If we have generated JSON, use that as the canonical output
      if (example.output.generatedJson) {
        const jsonOutput = anonymize
          ? anonymizePageJson(example.output.generatedJson)
          : example.output.generatedJson;
        outputContent = JSON.stringify(jsonOutput, null, 2);
      }

      fireworksExamples.push({
        input: inputContent.trim(),
        preferred_output: outputContent,
      });
    }

    // Convert to JSONL
    const jsonl = fireworksExamples
      .map((ex) => JSON.stringify(ex))
      .join("\n");

    return {
      success: true,
      count: fireworksExamples.length,
      batchId,
      jsonl,
      format: "fireworks",
    };
  },
});

/**
 * Export training data to AutoTrain "text" format (single column with formatted prompt)
 * This format is simpler but less structured than messages format
 */
export const exportAutoTrainTextFormat = action({
  args: {
    onlyHighQuality: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    anonymize: v.optional(v.boolean()),
    promptTemplate: v.optional(v.string()), // Custom template, e.g. "### Instruction:\n{instruction}\n### Response:\n{output}"
    includeExported: v.optional(v.boolean()), // If true, re-export already-exported examples
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    count: number;
    batchId: string;
    jsonl: string;
    format: "autotrain-text";
  }> => {
    const anonymize = args.anonymize !== false;

    // Default prompt template (Alpaca-style)
    const template = args.promptTemplate ||
      `### System:\n${SYSTEM_PROMPT}\n\n### User:\n{instruction}\n\n### Assistant:\n{output}`;

    // Generate batch ID
    const batchId = `autotrain-text-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Query training examples
    const limit = args.limit || 1000;
    // Convex type instantiation depth workaround
    const fetchFn = internalApi.ai.trainingExport.fetchExportableExamples;
    const allExamples: Doc<"aiTrainingExamples">[] = await ctx.runMutation(fetchFn, {
      onlyHighQuality: args.onlyHighQuality,
      limit,
      includeExported: args.includeExported,
    });

    // Convert to AutoTrain text format
    const textExamples: { text: string }[] = [];

    for (const example of allExamples) {
      let instruction = example.input.userMessage;
      if (anonymize) {
        instruction = anonymizeText(instruction);
      }

      let output = example.output.response;
      if (anonymize) {
        output = anonymizeText(output);
      }

      // If we have generated JSON, use that as the canonical output
      if (example.output.generatedJson) {
        const jsonOutput = anonymize
          ? anonymizePageJson(example.output.generatedJson)
          : example.output.generatedJson;
        output = JSON.stringify(jsonOutput, null, 2);
      }

      // Apply template
      const text = template
        .replace("{instruction}", instruction)
        .replace("{output}", output);

      textExamples.push({ text });
    }

    // Convert to JSONL
    const jsonl = textExamples
      .map((ex) => JSON.stringify(ex))
      .join("\n");

    return {
      success: true,
      count: textExamples.length,
      batchId,
      jsonl,
      format: "autotrain-text",
    };
  },
});
