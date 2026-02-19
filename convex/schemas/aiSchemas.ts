import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  trustEventActorTypeValidator,
  trustEventModeValidator,
  trustEventNameValidator,
  trustEventSchemaValidationStatusValidator,
} from "../ai/trustEvents";
import {
  aiBillingSourceValidator,
  aiCapabilityMatrixValidator,
  aiCredentialSourceValidator,
  aiProviderIdValidator,
} from "./coreSchemas";

// ============================================================================
// COORDINATION KERNEL ENUMS (Plans 14-15)
// ============================================================================

export const AGENT_TURN_STATE_VALUES = [
  "queued",
  "running",
  "suspended",
  "completed",
  "failed",
  "cancelled",
] as const;

export const AGENT_TURN_TRANSITION_VALUES = [
  "inbound_received",
  "turn_enqueued",
  "lease_acquired",
  "lease_heartbeat",
  "lease_released",
  "lease_failed",
  "turn_resumed",
  "turn_suspended",
  "turn_completed",
  "turn_failed",
  "handoff_initiated",
  "handoff_completed",
  "escalation_started",
  "escalation_resolved",
  "stale_recovered",
  "duplicate_dropped",
  "terminal_deliverable_recorded",
] as const;

export const agentTurnStateValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("suspended"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const agentTurnTransitionValidator = v.union(
  v.literal("inbound_received"),
  v.literal("turn_enqueued"),
  v.literal("lease_acquired"),
  v.literal("lease_heartbeat"),
  v.literal("lease_released"),
  v.literal("lease_failed"),
  v.literal("turn_resumed"),
  v.literal("turn_suspended"),
  v.literal("turn_completed"),
  v.literal("turn_failed"),
  v.literal("handoff_initiated"),
  v.literal("handoff_completed"),
  v.literal("escalation_started"),
  v.literal("escalation_resolved"),
  v.literal("stale_recovered"),
  v.literal("duplicate_dropped"),
  v.literal("terminal_deliverable_recorded"),
);

// ============================================================================
// CORE MEMORY MODEL ENUMS (Plan 17)
// ============================================================================

export const CORE_MEMORY_TYPE_VALUES = [
  "identity",
  "boundary",
  "empathy",
  "pride",
  "caution",
] as const;

export const CORE_MEMORY_SOURCE_VALUES = [
  "onboarding_story",
  "onboarding_roleplay",
  "operator_curated",
  "reflection_promoted",
  "unknown",
] as const;

export const coreMemoryTypeValidator = v.union(
  v.literal("identity"),
  v.literal("boundary"),
  v.literal("empathy"),
  v.literal("pride"),
  v.literal("caution"),
);

export const coreMemorySourceValidator = v.union(
  v.literal("onboarding_story"),
  v.literal("onboarding_roleplay"),
  v.literal("operator_curated"),
  v.literal("reflection_promoted"),
  v.literal("unknown"),
);

export const coreMemoryValidator = v.object({
  memoryId: v.string(),
  type: coreMemoryTypeValidator,
  title: v.string(),
  narrative: v.string(),
  source: coreMemorySourceValidator,
  immutable: v.boolean(),
  immutableReason: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  confidence: v.optional(v.number()),
  createdAt: v.number(),
  createdBy: v.optional(v.string()),
  approvedAt: v.optional(v.number()),
  approvedBy: v.optional(v.string()),
  lastReferencedAt: v.optional(v.number()),
  archivedAt: v.optional(v.number()),
});

export const coreMemoryPolicyValidator = v.object({
  immutableByDefault: v.boolean(),
  requireOwnerApprovalForMutations: v.boolean(),
  allowOwnerEdits: v.boolean(),
  minCoreMemories: v.number(),
  maxCoreMemories: v.number(),
  requiredMemoryTypes: v.array(coreMemoryTypeValidator),
});

export const soulDriftScoresValidator = v.object({
  identity: v.number(),
  scope: v.number(),
  boundary: v.number(),
  performance: v.number(),
  overall: v.number(),
});

// ============================================================================
// TRUST EVENT TAXONOMY (ATX-003)
// ============================================================================

export const trustEventPayloadValidator = v.object({
  // Base payload fields (ATX-002 contract)
  event_id: v.string(),
  event_version: v.string(),
  occurred_at: v.number(),
  org_id: v.id("organizations"),
  mode: trustEventModeValidator,
  channel: v.string(),
  session_id: v.string(),
  actor_type: trustEventActorTypeValidator,
  actor_id: v.string(),

  // Business layer context fields
  source_layer: v.optional(v.string()),
  resolved_layer: v.optional(v.string()),
  enforcement_action: v.optional(v.string()),
  request_origin: v.optional(v.string()),

  // Lifecycle transition fields
  lifecycle_state_from: v.optional(v.string()),
  lifecycle_state_to: v.optional(v.string()),
  lifecycle_checkpoint: v.optional(v.string()),
  lifecycle_transition_actor: v.optional(v.string()),
  lifecycle_transition_reason: v.optional(v.string()),

  // Content DNA fields
  content_profile_id: v.optional(v.string()),
  content_profile_version: v.optional(v.string()),
  source_object_ids: v.optional(v.array(v.string())),
  artifact_types: v.optional(v.array(v.string())),

  // Memory consent fields
  consent_scope: v.optional(v.string()),
  consent_decision: v.optional(v.string()),
  memory_candidate_ids: v.optional(v.array(v.string())),
  consent_prompt_version: v.optional(v.string()),

  // Knowledge ingestion fields
  knowledge_item_id: v.optional(v.string()),
  knowledge_kind: v.optional(v.string()),
  ingest_status: v.optional(v.string()),
  processor_stage: v.optional(v.string()),
  failure_reason: v.optional(v.string()),

  // Setup artifact generation fields
  setup_session_id: v.optional(v.string()),
  artifact_kind: v.optional(v.string()),
  artifact_path: v.optional(v.string()),
  artifact_checksum: v.optional(v.string()),
  generator_model: v.optional(v.string()),

  // Setup connect handoff fields
  detected_artifacts: v.optional(v.array(v.string())),
  validation_status: v.optional(v.string()),
  validation_errors: v.optional(v.array(v.string())),
  persisted_object_ids: v.optional(v.array(v.string())),

  // Soul evolution governance fields
  proposal_id: v.optional(v.string()),
  proposal_version: v.optional(v.string()),
  risk_level: v.optional(v.string()),
  review_decision: v.optional(v.string()),
  rollback_target: v.optional(v.string()),

  // Guardrail enforcement fields
  policy_type: v.optional(v.string()),
  policy_id: v.optional(v.string()),
  tool_name: v.optional(v.string()),
  enforcement_decision: v.optional(v.string()),
  override_source: v.optional(v.string()),

  // Team handoff fields
  team_session_id: v.optional(v.string()),
  handoff_id: v.optional(v.string()),
  from_agent_id: v.optional(v.string()),
  to_agent_id: v.optional(v.string()),
  context_digest: v.optional(v.string()),

  // Trust telemetry fields
  taxonomy_version: v.optional(v.string()),
  event_namespace: v.optional(v.string()),
  schema_validation_status: v.optional(trustEventSchemaValidationStatusValidator),
  metric_name: v.optional(v.string()),
  metric_value: v.optional(v.number()),

  // Super-admin parity fields
  platform_agent_id: v.optional(v.string()),
  training_template_id: v.optional(v.string()),
  parity_mode: v.optional(v.string()),
  customer_agent_template_link: v.optional(v.string()),
});

export const aiTrustEvents = defineTable({
  event_name: trustEventNameValidator,
  payload: trustEventPayloadValidator,
  schema_validation_status: trustEventSchemaValidationStatusValidator,
  schema_errors: v.optional(v.array(v.string())),
  created_at: v.number(),
})
  .index("by_org_occurred_at", ["payload.org_id", "payload.occurred_at"])
  .index("by_event_name_occurred_at", ["event_name", "payload.occurred_at"])
  .index("by_mode_occurred_at", ["payload.mode", "payload.occurred_at"])
  .index("by_schema_status_occurred_at", [
    "schema_validation_status",
    "payload.occurred_at",
  ]);

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

  // V0 Integration metadata (for v0.dev Platform API conversations)
  aiProvider: v.optional(v.union(v.literal("built-in"), v.literal("v0"))),
  v0ChatId: v.optional(v.string()),             // v0 platform chat ID (for follow-up messages)
  v0DemoUrl: v.optional(v.string()),            // iframe preview URL
  v0WebUrl: v.optional(v.string()),             // link to edit on v0.dev

  // Messages stored in separate table (see aiMessages)

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_slug", ["slug"]);

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
  modelResolution: v.optional(v.object({
    requestedModel: v.optional(v.string()),
    selectedModel: v.string(),
    selectionSource: v.string(),
    fallbackUsed: v.boolean(),
    fallbackReason: v.optional(v.string()),
  })),

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
  // Canonical billing source taxonomy (BMF-003)
  billingSource: v.optional(aiBillingSourceValidator),
  // Settings migration marker (BMF-003)
  settingsContractVersion: v.optional(v.union(
    v.literal("openrouter_v1"),
    v.literal("provider_agnostic_v1"),
  )),

  // LLM Settings (legacy + provider-agnostic contract)
  llm: v.object({
    // NEW: Multi-select model configuration
    enabledModels: v.optional(v.array(v.object({
      modelId: v.string(),                    // "anthropic/claude-3-5-sonnet"
      isDefault: v.boolean(),                 // true for default model
      customLabel: v.optional(v.string()),    // Optional nickname for model
      enabledAt: v.number(),                  // When this model was enabled
    }))),
    defaultModelId: v.optional(v.string()),   // ID of default model
    providerId: v.optional(aiProviderIdValidator), // Canonical default provider

    // OLD: Legacy single-model fields (kept for backward compatibility during migration)
    provider: v.optional(v.string()),         // "openai", "anthropic", "google", etc.
    model: v.optional(v.string()),            // "gpt-4o", "claude-3-5-sonnet", etc.

    // Shared settings (apply to all models)
    temperature: v.number(),
    maxTokens: v.number(),
    openrouterApiKey: v.optional(v.string()), // Encrypted, org's own key (for BYOK mode)
    authProfiles: v.optional(v.array(v.object({
      profileId: v.string(),
      label: v.optional(v.string()),
      openrouterApiKey: v.optional(v.string()),
      enabled: v.boolean(),
      priority: v.optional(v.number()),
      cooldownUntil: v.optional(v.number()),
      failureCount: v.optional(v.number()),
      lastFailureAt: v.optional(v.number()),
      lastFailureReason: v.optional(v.string()),
    }))),
    // NEW: Provider-agnostic auth profiles (keeps cooldown/priority behavior)
    providerAuthProfiles: v.optional(v.array(v.object({
      profileId: v.string(),
      providerId: aiProviderIdValidator,
      label: v.optional(v.string()),
      baseUrl: v.optional(v.string()),
      credentialSource: v.optional(aiCredentialSourceValidator),
      billingSource: v.optional(aiBillingSourceValidator),
      apiKey: v.optional(v.string()),
      encryptedFields: v.optional(v.array(v.string())),
      capabilities: v.optional(aiCapabilityMatrixValidator),
      enabled: v.boolean(),
      priority: v.optional(v.number()),
      cooldownUntil: v.optional(v.number()),
      failureCount: v.optional(v.number()),
      lastFailureAt: v.optional(v.number()),
      lastFailureReason: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }))),
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

  // Migration bookkeeping for legacy OpenRouter-only org settings
  migrationState: v.optional(v.object({
    providerContractBackfilledAt: v.optional(v.number()),
    source: v.optional(v.union(
      v.literal("legacy_openrouter"),
      v.literal("provider_agnostic"),
      v.literal("mixed"),
    )),
    lastMigratedBy: v.optional(v.string()),
  })),

  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_organization", ["organizationId"]);

/**
 * AI Settings Migration Receipts
 *
 * Tracks rollout status for additive settings migrations.
 */
export const aiSettingsMigrations = defineTable({
  organizationId: v.id("organizations"),
  migrationKey: v.literal("provider_agnostic_auth_profiles_v1"),
  status: v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  source: v.union(
    v.literal("legacy_openrouter"),
    v.literal("provider_agnostic"),
    v.literal("mixed"),
  ),
  lastAttemptAt: v.number(),
  completedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  details: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_migration_key", ["organizationId", "migrationKey"])
  .index("by_status", ["status"]);

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

/**
 * Organization Knowledge Chunks
 *
 * Chunk/index storage for semantic retrieval across organization media docs.
 */
export const organizationKnowledgeChunks = defineTable({
  organizationId: v.id("organizations"),
  mediaId: v.id("organizationMedia"),
  chunkId: v.string(),
  chunkOrdinal: v.number(),
  chunkText: v.string(),
  chunkCharCount: v.number(),
  tokenEstimate: v.number(),
  startOffset: v.number(),
  endOffset: v.number(),
  sourceFilename: v.string(),
  sourceDescription: v.optional(v.string()),
  sourceTags: v.optional(v.array(v.string())),
  sourceUpdatedAt: v.number(),
  indexVersion: v.number(),
  indexedAt: v.number(),

  // Multiple embedding fields (per-org provider choice)
  embeddingProvider: v.optional(v.string()),
  embeddingModel: v.optional(v.string()),
  embeddingDimensions: v.optional(v.number()),
  embedding_openai_1536: v.optional(v.array(v.float64())),
  embedding_voyage_1024: v.optional(v.array(v.float64())),
  embedding_cohere_1024: v.optional(v.array(v.float64())),
})
  .index("by_organization", ["organizationId"])
  .index("by_media", ["mediaId"])
  .index("by_org_media", ["organizationId", "mediaId"])
  .index("by_org_indexed_at", ["organizationId", "indexedAt"])
  .index("by_org_chunk_id", ["organizationId", "chunkId"])
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
  lifecycleStatus: v.optional(v.union(
    v.literal("discovered"),
    v.literal("enabled"),
    v.literal("default"),
    v.literal("deprecated"),
    v.literal("retired")
  )),
  deprecatedAt: v.optional(v.number()),
  retiredAt: v.optional(v.number()),
  replacementModelId: v.optional(v.string()),
  retirementReason: v.optional(v.string()),

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
    contractChecks: v.boolean(),
    conformance: v.optional(v.object({
      sampleCount: v.number(),
      toolCallParsing: v.object({
        passed: v.number(),
        total: v.number(),
        rate: v.number(),
      }),
      schemaFidelity: v.object({
        passed: v.number(),
        total: v.number(),
        rate: v.number(),
      }),
      refusalHandling: v.object({
        passed: v.number(),
        total: v.number(),
        rate: v.number(),
      }),
      latencyP95Ms: v.union(v.number(), v.null()),
      costPer1kTokensUsd: v.union(v.number(), v.null()),
      thresholds: v.object({
        minToolCallParseRate: v.number(),
        minSchemaFidelityRate: v.number(),
        minRefusalHandlingRate: v.number(),
        maxLatencyP95Ms: v.number(),
        maxCostPer1kTokensUsd: v.number(),
      }),
      passed: v.boolean(),
      failedMetrics: v.array(v.string()),
    })),
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
  .index("by_validation_status", ["validationStatus"])
  .index("by_lifecycle_status", ["lifecycleStatus"]);

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

/**
 * Agent Inbox Receipts
 *
 * Durable ingress receipts for inbound agent runtime processing.
 * Receipt lifecycle: accepted -> processing -> completed|failed|duplicate
 */
export const agentInboxReceipts = defineTable({
  organizationId: v.id("organizations"),
  sessionId: v.id("agentSessions"),
  agentId: v.id("objects"),
  channel: v.string(),
  externalContactIdentifier: v.string(),
  idempotencyKey: v.string(),
  payloadHash: v.optional(v.string()),

  status: v.union(
    v.literal("accepted"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("duplicate")
  ),

  turnId: v.optional(v.id("agentTurns")),
  duplicateCount: v.number(),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  processingStartedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  failedAt: v.optional(v.number()),
  failureReason: v.optional(v.string()),

  terminalDeliverable: v.optional(v.object({
    pointerType: v.string(),
    pointerId: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    recordedAt: v.number(),
  })),

  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_idempotency_key", ["organizationId", "idempotencyKey"])
  .index("by_session", ["sessionId"])
  .index("by_status", ["status"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_turn", ["turnId"])
  .index("by_org_time", ["organizationId", "createdAt"]);

// ============================================================================
// AI TRAINING DATA COLLECTION (Custom Model Training)
// ============================================================================

/**
 * AI Training Examples
 *
 * Collects page builder AI interactions for fine-tuning custom models.
 * Each example captures input, output, and user feedback to build
 * a domain-specific training dataset.
 */
export const aiTrainingExamples = defineTable({
  // Source tracking
  conversationId: v.id("aiConversations"),
  messageId: v.optional(v.id("aiMessages")),
  organizationId: v.id("organizations"),

  // Training example type
  exampleType: v.union(
    v.literal("page_generation"),      // Full page JSON generation
    v.literal("section_edit"),         // Single section modification
    v.literal("design_choice"),        // Color/font/style decision
    v.literal("tool_invocation")       // Backend tool usage
  ),

  // Input (user message + context)
  input: v.object({
    userMessage: v.string(),
    previousContext: v.optional(v.string()),     // Last N messages summarized
    ragPatterns: v.optional(v.array(v.string())), // Pattern IDs that were retrieved
    currentPageState: v.optional(v.any()),       // Existing page if editing
  }),

  // Output (AI response)
  output: v.object({
    response: v.string(),                        // Raw AI response text
    generatedJson: v.optional(v.any()),          // Parsed page JSON (if valid)
    toolCalls: v.optional(v.array(v.any())),     // Tool invocations
  }),

  // User feedback (critical for learning)
  feedback: v.object({
    outcome: v.union(
      v.literal("accepted"),             // User saved page as-is
      v.literal("accepted_with_edits"),  // User made minor changes (<20%)
      v.literal("rejected"),             // User made major changes (>50%) or discarded
      v.literal("no_feedback")           // Session ended without action
    ),
    userEdits: v.optional(v.any()),      // Final page state after edits
    editPercentage: v.optional(v.number()), // Calculated diff percentage
    feedbackScore: v.optional(v.number()), // Explicit thumbs up (1) / down (-1)
    feedbackTimestamp: v.optional(v.number()),
  }),

  // Quality flags (for filtering training data)
  quality: v.object({
    isHighQuality: v.boolean(),          // Algorithm-determined
    validJson: v.boolean(),              // Output is valid page JSON
    followedInstructions: v.boolean(),   // Met user requirements
  }),

  // Anonymization status
  anonymized: v.boolean(),
  anonymizedAt: v.optional(v.number()),

  // Export tracking
  exportBatchId: v.optional(v.string()),
  exportedAt: v.optional(v.number()),

  // Metadata
  modelUsed: v.optional(v.string()),     // "anthropic/claude-3-5-sonnet"
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_organization", ["organizationId"])
  .index("by_type", ["exampleType"])
  .index("by_feedback_outcome", ["feedback.outcome"])
  .index("by_quality", ["quality.isHighQuality"])
  .index("by_export", ["exportedAt"])
  .index("by_created", ["createdAt"]);
