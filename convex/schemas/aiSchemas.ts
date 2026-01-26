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
  slug: v.optional(v.string()),  // URL-friendly identifier (legacy field)
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
 * Audit trail of all tool executions with human-in-the-loop approval
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

  // Execution state (expanded for approval workflow)
  status: v.union(
    v.literal("proposed"),    // AI wants to execute, waiting for approval
    v.literal("approved"),    // User approved, ready to execute
    v.literal("executing"),   // Currently running
    v.literal("success"),     // Successfully completed
    v.literal("failed"),      // Execution failed
    v.literal("rejected"),    // User rejected the proposal
    v.literal("cancelled")    // User dismissed/cancelled the proposal (no feedback to AI)
  ),

  // Human-in-the-loop approval fields
  proposalMessage: v.optional(v.string()),  // AI's explanation of what it wants to do
  userResponse: v.optional(v.union(
    v.literal("approve"),
    v.literal("approve_always"),  // User said "don't ask again"
    v.literal("reject"),
    v.literal("custom"),
    v.literal("cancel")  // User dismissed without feedback to AI
  )),
  customInstruction: v.optional(v.string()),  // If user provided custom instruction

  // New fields for getToolExecutions query compatibility
  input: v.optional(v.any()),  // Alias for parameters
  output: v.optional(v.any()), // Alias for result
  success: v.optional(v.boolean()), // Derived from status
  completedAt: v.optional(v.number()), // When execution finished

  // UI state (minimization)
  isMinimized: v.optional(v.boolean()),  // Whether this item is minimized in the UI

  // Usage tracking
  tokensUsed: v.number(),
  costUsd: v.number(),
  executedAt: v.number(),
  durationMs: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_time", ["organizationId", "executedAt"])
  .index("by_conversation", ["conversationId"])
  .index("by_status", ["status"])
  .index("by_conversation_status", ["conversationId", "status"]);

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

  // Human-in-the-Loop Settings
  humanInLoopEnabled: v.optional(v.boolean()),  // Require approval for all tool executions

  // Auto-Recovery Settings (for tool execution failures)
  autoRecovery: v.optional(v.object({
    enabled: v.boolean(),              // Enable/disable auto-recovery
    maxRetries: v.number(),            // Max retry attempts before giving up (1-5)
    retryDelay: v.optional(v.number()), // Delay between retries (ms) - future use
    requireApprovalPerRetry: v.boolean(), // User must approve each retry
  })),

  // Tool Approval Mode
  toolApprovalMode: v.optional(v.union(
    v.literal("all"),         // Require approval for all tools (safest)
    v.literal("dangerous"),   // Require approval only for dangerous tools (future)
    v.literal("none")         // No approval required (future)
  )),

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

// ============================================================================
// AI MODEL DISCOVERY (Auto-Discovery System)
// ============================================================================

/**
 * AI Models Cache
 *
 * Cached model information from OpenRouter API.
 * Refreshed daily via cron job to keep model list up-to-date.
 */
export const aiModels = defineTable({
  // Model identification
  modelId: v.string(),                       // "anthropic/claude-3-5-sonnet"
  name: v.string(),                          // "Claude 3.5 Sonnet"
  provider: v.string(),                      // "anthropic"

  // Pricing (dollars per million tokens)
  pricing: v.object({
    promptPerMToken: v.number(),             // Input cost
    completionPerMToken: v.number(),         // Output cost
  }),

  // Model capabilities
  contextLength: v.number(),                 // 200000
  capabilities: v.object({
    toolCalling: v.boolean(),                // Supports function calling
    multimodal: v.boolean(),                 // Supports images/video
    vision: v.boolean(),                     // Supports vision
  }),

  // Discovery tracking
  discoveredAt: v.number(),                  // When first discovered
  lastSeenAt: v.number(),                    // Last seen in OpenRouter API
  isNew: v.boolean(),                        // New in last 7 days

  // Platform availability (super admin controlled)
  isPlatformEnabled: v.optional(v.boolean()), // Whether this model is available platform-wide
  isSystemDefault: v.optional(v.boolean()),   // Whether this model is a system default (recommended)

  // Validation tracking (for testing tool calling before enabling)
  validationStatus: v.optional(v.union(
    v.literal("not_tested"),
    v.literal("validated"),
    v.literal("failed")
  )),
  testResults: v.optional(v.object({
    basicChat: v.boolean(),
    toolCalling: v.boolean(),
    complexParams: v.boolean(),
    multiTurn: v.boolean(),
    edgeCases: v.boolean(),
    timestamp: v.number(),
  })),
  testedBy: v.optional(v.id("users")),
  testedAt: v.optional(v.number()),
  notes: v.optional(v.string()),
})
  .index("by_model_id", ["modelId"])
  .index("by_provider", ["provider"])
  .index("by_new", ["isNew"])
  .index("by_platform_enabled", ["isPlatformEnabled"])
  .index("by_system_default", ["isSystemDefault"])
  .index("by_validation_status", ["validationStatus"]);

/**
 * AI Work Items
 *
 * Tracking records for AI operations that need human-in-the-loop approval.
 * Powers the work items UI pane for preview/approve workflow.
 */
export const aiWorkItems = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  conversationId: v.id("aiConversations"),

  // Work item identity
  type: v.string(),                      // "crm_create_organization" | "project_create" | etc.
  name: v.string(),                      // User-friendly name
  status: v.union(
    v.literal("preview"),                // Waiting for approval
    v.literal("approved"),               // User approved
    v.literal("executing"),              // Currently running
    v.literal("completed"),              // Done
    v.literal("failed"),                 // Error occurred
    v.literal("cancelled")               // User cancelled
  ),

  // Preview data (what will happen)
  previewData: v.optional(v.array(v.any())),

  // Execution results (what actually happened)
  results: v.optional(v.any()),

  // Progress tracking
  progress: v.optional(v.object({
    total: v.number(),
    completed: v.number(),
    failed: v.number(),
  })),

  // Metadata
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_conversation", ["conversationId"])
  .index("by_status", ["status"])
  .index("by_org_status", ["organizationId", "status"]);
