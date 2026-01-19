/**
 * DESIGN ENGINE
 *
 * Backend functions for the RAG-based design pattern library.
 * Used by the page builder AI to retrieve relevant design patterns.
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

type DesignPattern = Doc<"designPatterns">;

interface PatternWithScore extends DesignPattern {
  score: number;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all indexed patterns with optional filtering
 */
export const listPatterns = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("color_system"),
        v.literal("typography"),
        v.literal("section"),
        v.literal("animation"),
        v.literal("gradient"),
        v.literal("component"),
        v.literal("full_prototype")
      )
    ),
    sourcePrototype: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    // Use different query strategies based on filters
    if (args.type && args.sourcePrototype) {
      return await ctx.db
        .query("designPatterns")
        .withIndex("by_type_and_prototype", (q) =>
          q.eq("type", args.type!).eq("sourcePrototype", args.sourcePrototype!)
        )
        .take(limit);
    } else if (args.type) {
      return await ctx.db
        .query("designPatterns")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .take(limit);
    } else if (args.sourcePrototype) {
      return await ctx.db
        .query("designPatterns")
        .withIndex("by_prototype", (q) =>
          q.eq("sourcePrototype", args.sourcePrototype!)
        )
        .take(limit);
    }

    // No filters - return all
    return await ctx.db.query("designPatterns").take(limit);
  },
});

/**
 * Get patterns by prototype name
 */
export const getPatternsByPrototype = query({
  args: {
    prototypeName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("designPatterns")
      .withIndex("by_prototype", (q) =>
        q.eq("sourcePrototype", args.prototypeName)
      )
      .collect();
  },
});

/**
 * Get a single pattern by ID
 */
export const getPattern = query({
  args: {
    patternId: v.string(),
  },
  handler: async (ctx, args) => {
    const patterns = await ctx.db
      .query("designPatterns")
      .filter((q) => q.eq(q.field("patternId"), args.patternId))
      .take(1);
    return patterns[0] || null;
  },
});

/**
 * List all indexed prototypes
 */
export const listPrototypes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("prototypeMetadata").collect();
  },
});

/**
 * Get prototype metadata by name
 */
export const getPrototypeMetadata = query({
  args: {
    prototypeName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("prototypeMetadata")
      .withIndex("by_name", (q) => q.eq("prototypeName", args.prototypeName))
      .unique();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Index a new design pattern
 */
export const indexPattern = mutation({
  args: {
    patternId: v.string(),
    type: v.union(
      v.literal("color_system"),
      v.literal("typography"),
      v.literal("section"),
      v.literal("animation"),
      v.literal("gradient"),
      v.literal("component"),
      v.literal("full_prototype")
    ),
    sourcePrototype: v.string(),
    sourceFile: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    industries: v.array(v.string()),
    mood: v.array(v.string()),
    tags: v.array(v.string()),
    patternData: v.any(),
    codeSnippets: v.optional(
      v.array(
        v.object({
          language: v.string(),
          code: v.string(),
          purpose: v.string(),
        })
      )
    ),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if pattern already exists
    const existing = await ctx.db
      .query("designPatterns")
      .filter((q) => q.eq(q.field("patternId"), args.patternId))
      .first();

    if (existing) {
      // Update existing pattern
      await ctx.db.patch(existing._id, {
        ...args,
        extractedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new pattern
    return await ctx.db.insert("designPatterns", {
      ...args,
      extractedAt: Date.now(),
    });
  },
});

/**
 * Seed a design pattern with pre-computed embedding (for importing from JSON)
 * This is an upsert - updates if exists, creates if not
 */
export const seedPattern = mutation({
  args: {
    patternId: v.string(),
    type: v.union(
      v.literal("color_system"),
      v.literal("typography"),
      v.literal("section"),
      v.literal("animation"),
      v.literal("gradient"),
      v.literal("component"),
      v.literal("full_prototype")
    ),
    sourcePrototype: v.string(),
    sourceFile: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    industries: v.array(v.string()),
    mood: v.array(v.string()),
    tags: v.array(v.string()),
    patternData: v.any(),
    codeSnippets: v.optional(
      v.array(
        v.object({
          language: v.string(),
          code: v.string(),
          purpose: v.string(),
        })
      )
    ),
    embedding: v.optional(v.array(v.float64())), // Pre-computed embedding
    version: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if pattern already exists (upsert logic)
    const existing = await ctx.db
      .query("designPatterns")
      .filter((q) => q.eq(q.field("patternId"), args.patternId))
      .first();

    const patternData = {
      patternId: args.patternId,
      type: args.type,
      sourcePrototype: args.sourcePrototype,
      sourceFile: args.sourceFile,
      name: args.name,
      description: args.description,
      industries: args.industries,
      mood: args.mood,
      tags: args.tags,
      patternData: args.patternData,
      codeSnippets: args.codeSnippets,
      embedding: args.embedding,
      version: args.version,
      extractedAt: Date.now(),
    };

    if (existing) {
      // Update existing pattern
      await ctx.db.patch(existing._id, patternData);
      return { action: "updated", id: existing._id };
    }

    // Create new pattern
    const id = await ctx.db.insert("designPatterns", patternData);
    return { action: "created", id };
  },
});

/**
 * Update embedding for a pattern (internal use)
 */
export const updateEmbedding = internalMutation({
  args: {
    patternId: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const pattern = await ctx.db
      .query("designPatterns")
      .filter((q) => q.eq(q.field("patternId"), args.patternId))
      .first();

    if (!pattern) {
      throw new Error(`Pattern not found: ${args.patternId}`);
    }

    await ctx.db.patch(pattern._id, {
      embedding: args.embedding,
    });
  },
});

/**
 * Index or update prototype metadata
 */
export const indexPrototype = mutation({
  args: {
    prototypeName: v.string(),
    folderPath: v.string(),
    description: v.string(),
    primaryIndustry: v.string(),
    colorMood: v.array(v.string()),
    patternsExtracted: v.object({
      colorSystems: v.number(),
      typography: v.number(),
      sections: v.number(),
      animations: v.number(),
      gradients: v.number(),
    }),
    status: v.union(
      v.literal("pending"),
      v.literal("indexing"),
      v.literal("indexed"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("prototypeMetadata")
      .withIndex("by_name", (q) => q.eq("prototypeName", args.prototypeName))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        indexedAt: args.status === "indexed" ? now : existing.indexedAt,
        lastUpdatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("prototypeMetadata", {
      ...args,
      indexedAt: args.status === "indexed" ? now : undefined,
      lastUpdatedAt: now,
    });
  },
});

/**
 * Delete patterns for a prototype (for re-indexing)
 */
export const deletePatternsByPrototype = mutation({
  args: {
    prototypeName: v.string(),
  },
  handler: async (ctx, args) => {
    const patterns = await ctx.db
      .query("designPatterns")
      .withIndex("by_prototype", (q) =>
        q.eq("sourcePrototype", args.prototypeName)
      )
      .collect();

    for (const pattern of patterns) {
      await ctx.db.delete(pattern._id);
    }

    return { deleted: patterns.length };
  },
});

// ============================================================================
// ACTIONS (for external API calls)
// ============================================================================

/**
 * Generate embedding for a pattern using OpenAI
 */
export const generateEmbedding = action({
  args: {
    patternId: v.string(),
    text: v.string(), // Concatenated searchable text
  },
  handler: async (ctx, args): Promise<{ success: boolean; dimensions: number }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: args.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding as number[];

    // Store the embedding
    await ctx.runMutation(internal.designEngine.updateEmbedding, {
      patternId: args.patternId,
      embedding,
    });

    return { success: true, dimensions: embedding.length };
  },
});

/**
 * Search patterns using vector similarity
 */
export const searchPatterns = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    filterType: v.optional(
      v.union(
        v.literal("color_system"),
        v.literal("typography"),
        v.literal("section"),
        v.literal("animation"),
        v.literal("gradient"),
        v.literal("component"),
        v.literal("full_prototype")
      )
    ),
  },
  handler: async (ctx, args): Promise<PatternWithScore[]> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // 1. Generate query embedding
    const embeddingResponse = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: args.query,
        }),
      }
    );

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding as number[];

    // 2. Vector search
    const results = await ctx.vectorSearch("designPatterns", "by_embedding", {
      vector: queryEmbedding,
      limit: args.limit || 5,
      filter: args.filterType
        ? (q) => q.eq("type", args.filterType!)
        : undefined,
    });

    // 3. Fetch full pattern data
    const patterns: PatternWithScore[] = [];
    for (const result of results) {
      const pattern = await ctx.runQuery(
        internal.designEngine.getPatternById,
        { id: result._id }
      );
      if (pattern) {
        patterns.push({
          ...pattern,
          score: result._score,
        });
      }
    }

    return patterns;
  },
});

/**
 * Internal query to get pattern by document ID
 */
export const getPatternById = internalQuery({
  args: {
    id: v.id("designPatterns"),
  },
  handler: async (ctx, args): Promise<DesignPattern | null> => {
    return await ctx.db.get(args.id);
  },
});

// ============================================================================
// RAG CONTEXT BUILDER (for page builder integration)
// ============================================================================

/**
 * Build RAG context for page builder AI
 * Returns formatted design patterns as context string
 */
export const buildRAGContext = internalAction({
  args: {
    userMessage: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<string | null> => {
    // Search for relevant patterns
    const patterns = await ctx.runAction(
      internal.designEngine.searchPatternsInternal,
      {
        query: args.userMessage,
        limit: args.limit || 5,
      }
    ) as PatternWithScore[];

    if (patterns.length === 0) {
      return null;
    }

    // Format patterns as context
    let context = "## RELEVANT DESIGN PATTERNS\n\n";
    context +=
      "Based on your request, here are matching patterns from our design library:\n\n";

    for (const pattern of patterns) {
      context += `### ${pattern.name} (${pattern.sourcePrototype})\n`;
      context += `- Type: ${pattern.type}\n`;
      context += `- Industries: ${pattern.industries.join(", ")}\n`;
      context += `- Mood: ${pattern.mood.join(", ")}\n`;
      context += `- ${pattern.description}\n`;

      if (pattern.patternData) {
        context += `- Data: ${JSON.stringify(pattern.patternData, null, 2)}\n`;
      }

      if (pattern.codeSnippets && pattern.codeSnippets.length > 0) {
        context += `- Code Example:\n\`\`\`${pattern.codeSnippets[0].language}\n${pattern.codeSnippets[0].code}\n\`\`\`\n`;
      }

      context += "\n";
    }

    context += "Apply these patterns to create a cohesive design.\n";

    return context;
  },
});

/**
 * Internal search action (avoids nested action calls)
 */
export const searchPatternsInternal = internalAction({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<PatternWithScore[]> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return empty if no API key (patterns without embeddings)
      return [];
    }

    try {
      // Generate query embedding
      const embeddingResponse = await fetch(
        "https://api.openai.com/v1/embeddings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: args.query,
          }),
        }
      );

      if (!embeddingResponse.ok) {
        console.error("OpenAI embedding error:", await embeddingResponse.text());
        return [];
      }

      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.data[0].embedding as number[];

      // Vector search
      const results = await ctx.vectorSearch("designPatterns", "by_embedding", {
        vector: queryEmbedding,
        limit: args.limit || 5,
      });

      // Fetch full pattern data
      const patterns: PatternWithScore[] = [];
      for (const result of results) {
        const pattern = await ctx.runQuery(
          internal.designEngine.getPatternById,
          { id: result._id }
        );
        if (pattern) {
          patterns.push({
            ...pattern,
            score: result._score,
          });
        }
      }

      return patterns;
    } catch (error) {
      console.error("RAG search error:", error);
      return [];
    }
  },
});
