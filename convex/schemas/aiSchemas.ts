import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * AI Integration Schemas - General AI Assistant + Email AI Specialist
 *
 * This file contains tables for two integrated AI systems:
 * 1. General AI Assistant (OpenRouter + Tools) - For forms, events, CRM automation
 * 2. Email AI Specialist - For email generation with human-in-the-loop approval
 */

// ============================================================================
// GENERAL AI SYSTEM (OpenRouter + Tools)
// ============================================================================

/**
 * AI Conversations
 *
 * Chat history for general AI assistant
 */
export const aiConversations = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  // Conversation metadata
  title: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("archived")),

  // Track which model is being used for this conversation
  modelId: v.optional(v.string()),              // "anthropic/claude-3-5-sonnet"
  modelName: v.optional(v.string()),            // "Claude 3.5 Sonnet" (for display)

  // Message count (cached for performance)
  messageCount: v.optional(v.number()),         // Total number of messages in this conversation

  // Messages stored in separate table (see aiMessages)

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"]);

/**
 * AI Messages
 *
 * Individual messages in conversations
 */
export const aiMessages = defineTable({
  conversationId: v.id("aiConversations"),

  role: v.union(
    v.literal("system"),
    v.literal("user"),
    v.literal("assistant"),
    v.literal("tool"),
  ),
  content: v.string(),

  // Track which model generated this message (for assistant messages only)
  modelId: v.optional(v.string()),              // "anthropic/claude-3-5-sonnet"

  // Tool calls (if assistant used tools)
  toolCalls: v.optional(v.array(v.object({
    id: v.string(),
    name: v.string(),
    arguments: v.any(),
    result: v.optional(v.any()),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
  }))),

  timestamp: v.number(),
}).index("by_conversation", ["conversationId"]);

/**
 * AI Tool Executions
 *
 * Audit trail of all tool executions
 */
export const aiToolExecutions = defineTable({
  conversationId: v.id("aiConversations"),
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  // Tool info
  toolName: v.string(),
  parameters: v.any(),
  result: v.optional(v.any()),
  error: v.optional(v.string()),
  status: v.union(v.literal("success"), v.literal("failed")),

  // New fields for getToolExecutions query compatibility
  input: v.optional(v.any()),  // Alias for parameters
  output: v.optional(v.any()), // Alias for result
  success: v.optional(v.boolean()), // Derived from status
  completedAt: v.optional(v.number()), // When execution finished

  // Usage tracking
  tokensUsed: v.number(),
  costUsd: v.number(),
  executedAt: v.number(),
  durationMs: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_time", ["organizationId", "executedAt"])
  .index("by_conversation", ["conversationId"]);

/**
 * Organization AI Settings v3.0
 *
 * AI configuration per organization (LLM + embeddings)
 * Aligned with three-tier privacy model (see aiBillingSchemas.ts)
 */
export const organizationAiSettings = defineTable({
  organizationId: v.id("organizations"),

  // General settings
  enabled: v.boolean(),

  // Privacy tier (v3.1) - Links to aiSubscriptions.tier
  // This field is denormalized here for quick access
  tier: v.optional(v.union(
    v.literal("standard"),         // Standard tier (€49/month incl. VAT)
    v.literal("privacy-enhanced"), // Privacy-Enhanced tier (€49/month incl. VAT)
    v.literal("private-llm")       // Private LLM tier (€2,500-€12,000/month incl. VAT)
  )),

  // LEGACY: Old billing mode field (deprecated, kept for backward compatibility)
  billingMode: v.optional(v.union(
    v.literal("platform"),    // Use platform's OpenRouter API key (usage-based billing)
    v.literal("byok"),         // Use organization's own API key (free tier)
  )),

  // LLM Settings (via OpenRouter)
  llm: v.object({
    // NEW: Multi-select model configuration
    enabledModels: v.optional(v.array(v.object({
      modelId: v.string(),                    // "anthropic/claude-3-5-sonnet"
      isDefault: v.boolean(),                 // true for default model
      customLabel: v.optional(v.string()),    // Optional nickname for model
      enabledAt: v.number(),                  // When this model was enabled
    }))),
    defaultModelId: v.optional(v.string()),   // ID of default model

    // OLD: Legacy single-model fields (kept for backward compatibility during migration)
    provider: v.optional(v.string()),         // "openai", "anthropic", "google", etc.
    model: v.optional(v.string()),            // "gpt-4o", "claude-3-5-sonnet", etc.

    // Shared settings (apply to all models)
    temperature: v.number(),
    maxTokens: v.number(),
    openrouterApiKey: v.optional(v.string()), // Encrypted, org's own key (for BYOK mode)
  }),

  // Embedding Settings (for email AI)
  embedding: v.object({
    provider: v.union(
      v.literal("openai"),
      v.literal("voyage"),
      v.literal("cohere"),
      v.literal("none"),
    ),
    model: v.string(),
    dimensions: v.number(),
    apiKey: v.optional(v.string()), // Encrypted, org's own key
  }),

  // Budget Controls
  monthlyBudgetUsd: v.optional(v.number()),
  currentMonthSpend: v.number(),

  // Data Sovereignty (for email AI)
  dataSovereignty: v.optional(v.object({
    region: v.string(),
    allowCloudAI: v.boolean(),
    requireOnPremise: v.boolean(),
    complianceRequirements: v.optional(v.array(v.string())),
  })),

  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_organization", ["organizationId"]);

// ============================================================================
// EMAIL AI SYSTEM (Specialized Workflows)
// ============================================================================

/**
 * AI Agent Tasks
 *
 * Email-specific tasks with human-in-the-loop approval
 */
export const aiAgentTasks = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  agentType: v.union(
    v.literal("email_writer"),
    v.literal("email_organizer"),
    v.literal("survey_generator"),
    v.literal("list_manager"),
  ),
  taskType: v.string(),

  input: v.object({
    prompt: v.string(),
    context: v.optional(v.any()),
    contactListId: v.optional(v.id("objects")),
  }),

  output: v.optional(v.object({
    emails: v.optional(v.array(v.object({
      to: v.string(),
      toContactId: v.optional(v.id("objects")),
      subject: v.string(),
      body: v.string(),
      personalization: v.any(),
    }))),
  })),

  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("awaiting_approval"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("executing"),
    v.literal("completed"),
    v.literal("failed"),
  ),

  approvedBy: v.optional(v.id("users")),
  approvedAt: v.optional(v.number()),

  executionResults: v.optional(v.object({
    sentEmails: v.number(),
    failedEmails: v.number(),
    errors: v.optional(v.array(v.string())),
  })),

  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_status", ["status"]);

/**
 * AI Agent Memory
 *
 * Email templates, preferences with semantic search
 */
export const aiAgentMemory = defineTable({
  organizationId: v.id("organizations"),
  memoryKey: v.string(),

  content: v.optional(v.string()),
  memoryData: v.any(),

  // Embedding metadata
  embeddingProvider: v.optional(v.string()),
  embeddingModel: v.optional(v.string()),
  embeddingDimensions: v.optional(v.number()),

  // Multiple embedding fields (per-org provider choice)
  embedding_openai_1536: v.optional(v.array(v.float64())),
  embedding_voyage_1024: v.optional(v.array(v.float64())),
  embedding_cohere_1024: v.optional(v.array(v.float64())),

  tags: v.optional(v.array(v.string())),
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization_key", ["organizationId", "memoryKey"])
  .vectorIndex("by_embedding_openai_1536", {
    vectorField: "embedding_openai_1536",
    dimensions: 1536,
    filterFields: ["organizationId"],
  })
  .vectorIndex("by_embedding_voyage_1024", {
    vectorField: "embedding_voyage_1024",
    dimensions: 1024,
    filterFields: ["organizationId"],
  })
  .vectorIndex("by_embedding_cohere_1024", {
    vectorField: "embedding_cohere_1024",
    dimensions: 1024,
    filterFields: ["organizationId"],
  });
