/**
 * ORGANIZED SCHEMA STRUCTURE
 *
 * This schema is composed from modular definitions in the schemas/ directory.
 * See schemas/README.md for documentation on adding new apps.
 *
 * Structure:
 * 1. Core platform (users, organizations, memberships)
 * 2. App Store (apps registry, installations, purchases)
 * 3. Individual Apps (l4yercak3pod, etc. - each is self-contained)
 * 4. Utilities (audit logs)
 */

import { defineSchema } from "convex/server";

// Import modular schema definitions
import {
  users,
  organizations,
  organizationMembers,
  contactMemoryRecords,
  userPasswords,
  frontendUserPasswords,
  sessions,
  frontendSessions,
  passkeys,
  passkeysChallenges,
  apiKeys,
  roles,
  permissions,
  rolePermissions,
  userPreferences,
  organizationMedia,
  oauthConnections,
  oauthStates,
  cliSessions,
  cliLoginStates,
  oauthSignupStates,
  webhookSubscriptions,
  // Multi-provider identity system
  userIdentities,
  accountLinkingStates,
  platformSettings,
} from "./schemas/coreSchemas";
// NOTE: apiKeyDomains table removed - now using unified domain configurations in objects table
import { apps, appInstallations, snapshots, snapshotLoads, purchases, appAvailabilities } from "./schemas/appStoreSchemas";
// import { app_podcasting } from "./schemas/appDataSchemas"; // Not yet used
import { auditLogs, workflowExecutionLogs } from "./schemas/utilitySchemas";

// ✅ NEW ONTOLOGY SCHEMAS
import { objects, objectLinks, objectActions } from "./schemas/ontologySchemas";

// 📁 BUILDER FILE SYSTEM SCHEMAS (Virtual File System for builder apps)
import { builderFiles } from "./schemas/builderFileSchemas";

// 🤖 AI INTEGRATION SCHEMAS
import {
  aiConversations,
  aiMessages,
  aiMessageAttachments,
  aiToolExecutions,
  organizationAiSettings,
  aiSettingsMigrations,
  aiAgentTasks,
  aiAgentMemory,
  operatorPinnedNotes,
  organizationKnowledgeChunks,
  aiModels,
  aiWorkItems,
  agentInboxReceipts,
  aiTrainingExamples,
  aiTrustEvents,
  qaRuns,
  voiceTransportSessionState,
  voiceRuntimeSessionOpenRateState,
  videoTransportSessionState,
  webChatVisionFrameBufferState,
  operatorMediaRetention,
  toolFoundryProposalBacklog,
  agentSpecRegistry,
} from "./schemas/aiSchemas";
import {
  agentCatalogEntries,
  agentCatalogToolRequirements,
  agentCatalogSeedRegistry,
  agentCatalogSyncRuns,
} from "./schemas/agentProductizationSchemas";

// 💳 AI BILLING SCHEMAS v3.1 (VAT-inclusive pricing, EUR only)
import {
  aiUsage,
  aiSubscriptions,
  aiTokenBalance,
  aiTokenPurchases,
  aiBudgetAlerts,
  aiBillingEvents
} from "./schemas/aiBillingSchemas";

// 👤 USER QUOTA SCHEMAS (Phase 1: Foundation for per-user limits)
import { userAIQuotas } from "./schemas/userQuotaSchemas";

// 💾 STORAGE TRACKING SCHEMAS (Organization + per-user storage)
import { organizationStorage, userStorageQuotas } from "./schemas/storageSchemas";

// 📧 CONTACT SYNC & BULK EMAIL SCHEMAS (AI-powered external contact integration)
import { contactSyncs, emailCampaigns } from "./schemas/contactSyncSchemas";

// 🔐 OAUTH 2.0 SCHEMAS (OAuth authentication for third-party integrations)
import {
  oauthApplications,
  oauthAuthorizationCodes,
  oauthRefreshTokens,
  oauthRevokedTokens,
  oauthTokenUsage
} from "./schemas/oauthSchemas";

// 🚦 RATE LIMITING SCHEMAS (Token bucket rate limiting for API abuse prevention)
import { rateLimitSchemas } from "./schemas/rateLimitSchemas";

// 🛡️ SECURITY SCHEMAS (Anomaly detection and security event monitoring)
import { securitySchemas } from "./schemas/securitySchemas";

// 💳 CREDIT SYSTEM SCHEMAS (Unified credit currency for AI/agent/automation)
import {
  creditBalances,
  creditTransactions,
  creditPurchases,
  creditRedemptionCodes,
  creditCodeRedemptions,
} from "./schemas/creditSchemas";

// 🔀 LAYER EXECUTION SCHEMAS (Workflow run tracking)
import { layerExecutions, layerNodeExecutions } from "./schemas/layerExecutionSchemas";

// 📁 PROJECT FILE SYSTEM SCHEMAS (Virtual file system + cross-org sharing)
import {
  projectFiles,
  projectShares,
  userFileBookmarks,
  userRecentFiles,
  organizationTags,
} from "./schemas/projectFileSchemas";

// 🤖 AGENT SESSION SCHEMAS (Agent ↔ external contact conversations)
import {
  agentSessions,
  agentSessionMessages,
  agentTurns,
  executionEdges,
} from "./schemas/agentSessionSchemas";

// 💬 WEBCHAT SCHEMAS (Public webchat widget API - Layer 4 comms)
import {
  webchatSessions,
  anonymousIdentityLedger,
  anonymousClaimTokens,
  webchatRateLimits,
  onboardingAuditSessions,
  onboardingFunnelEvents,
  onboardingNurtureJourneys,
  onboardingSoulReports,
  onboardingSpecialistPreviewContracts,
  onboardingPostCaptureDispatchRuns,
  onboardingPostCaptureDispatchAttempts,
  onboardingPostCaptureDispatchDeadLetters,
} from "./schemas/webchatSchemas";
import {
  betaActivationCodes,
  betaCodeRedemptions,
} from "./schemas/betaOnboardingSchemas";

// 📱 TELEGRAM SCHEMAS (Telegram chat_id → org mapping)
import { telegramMappings } from "./schemas/telegramSchemas";

// 🧬 SOUL EVOLUTION SCHEMAS (Agent self-improvement + proposals)
import {
  soulProposals,
  agentConversationMetrics,
  soulVersionHistory,
  proposalFeedback,
} from "./schemas/soulEvolutionSchemas";

// 📊 GROWTH TRACKING SCHEMAS (Launch metrics and KPI tracking)
import {
  dailyGrowthMetrics,
  signupEvents,
  weeklyScorecard,
  salesNotifications,
  celebrationMilestones
} from "./schemas/growthTrackingSchemas";

// 📧 EMAIL QUEUE SCHEMA (Email delivery tracking)
import { emailQueue } from "./schemas/emailQueueSchemas";

// 🔄 SEQUENCES MESSAGE QUEUE SCHEMA (Multi-channel automation delivery)
import { sequenceMessageQueue } from "./schemas/messageQueueSchema";

// 🎁 BENEFITS PLATFORM SCHEMAS (Benefits & Commissions tracking)
import {
  benefitClaims,
  commissionPayouts,
  memberWallets,
  platformFees,
  referralProfiles,
  referralAttributions,
  referralRewardEvents,
} from "./schemas/benefitsSchemas";

// ✏️ PROJECT CONTENT: Uses ontology (objects table) with types:
// - type="project_content", subtype="block" for content blocks
// - type="project_content", subtype="revision" for revision history
// - type="project_edit_session" for edit session locking
// See convex/projectContent.ts for implementation

// 📡 ACTIVITY PROTOCOL SCHEMAS (Data flow tracing for connected apps)
// NOTE: Application pages use ontology (objects table with type="application_page")
import {
  activityEvents,
  activityProtocolSettings
} from "./schemas/activityProtocolSchemas";

// 🎨 DESIGN ENGINE SCHEMAS (RAG-based design pattern library)
import {
  designPatterns,
  prototypeMetadata
} from "./schemas/designPatternSchemas";
import { transactionsStrict, ticketsStrict } from "./schemas/transactionStrictSchemas";

/**
 * MAIN SCHEMA EXPORT
 *
 * All tables are defined in their respective schema modules.
 * This file simply composes them together.
 */
export default defineSchema({
  // 👥 CORE: Platform foundation
  users,
  organizations,
  organizationMembers,
  contactMemoryRecords,
  userPasswords,
  frontendUserPasswords, // Customer passwords (for frontend_user objects with email/password)
  sessions,
  frontendSessions, // Customer user sessions (separate from platform staff)
  passkeys,
  passkeysChallenges,
  apiKeys,
  // Domain configurations (including API access, email, branding) stored in objects table
  userPreferences,
  organizationMedia,
  oauthConnections,
  oauthStates,
  cliSessions,
  cliLoginStates,
  oauthSignupStates,
  webhookSubscriptions,

  // 🔑 MULTI-PROVIDER IDENTITY: OAuth identity linking
  userIdentities,          // Links OAuth providers (Google, Apple, Microsoft) to users
  accountLinkingStates,    // Temporary state for account linking confirmation flow

  // ⚙️ PLATFORM SETTINGS: Global configuration
  platformSettings,        // Platform-wide settings (beta access toggle, feature flags, etc.)

  // 🔐 RBAC: Role-Based Access Control
  roles,
  permissions,
  rolePermissions,

  // 🏪 APP STORE: Marketplace functionality
  apps,
  appInstallations,
  appAvailabilities,
  snapshots,
  snapshotLoads,
  purchases,

  // 📱 APPS: Individual app data tables
  // Each app is self-contained with its own table
  // All apps follow the appSchemaBase pattern (see schemas/appSchemaBase.ts)
  // NAMING: Always prefix with "app_"
  // app_podcasting,  // Podcasting App
  // Add more apps here as they're created:
  // app_analytics,
  // app_subscribers,
  // app_calendar,

  // 🛠️ UTILITIES: Supporting functionality
  auditLogs,
  workflowExecutionLogs,

  // 🥷 ONTOLOGY: Universal object system
  objects,        // Universal storage for all entity types
  objectLinks,    // Relationships between objects
  objectActions,  // Audit trail of actions

  // 🤖 AI INTEGRATION: General AI Assistant + Email AI Specialist
  aiConversations,        // Chat history for general AI assistant
  aiMessages,             // Individual messages in conversations
  aiMessageAttachments,   // Persisted chat attachments (Convex storage metadata)
  aiToolExecutions,       // Audit trail of tool executions
  // NOTE: Tool drafts use objects table with status="draft" + AI metadata in customProperties
  organizationAiSettings, // AI configuration per organization (LLM + embeddings)
  aiSettingsMigrations,   // Migration receipts for provider-agnostic AI settings contract
  aiModels,               // AI model discovery cache (auto-refreshed daily)
  aiWorkItems,            // Work items for human-in-the-loop approval workflow
  agentInboxReceipts,     // Durable inbound receipts for agent runtime ingress
  aiTrustEvents,          // Deterministic trust telemetry taxonomy events
  qaRuns,                // Super-admin QA run lifecycle + failure taxonomy aggregates
  voiceTransportSessionState, // Keyed voice transport sequencing/replay checkpoint state
  voiceRuntimeSessionOpenRateState, // Per-live-session voice open quota/rate-limit counters
  videoTransportSessionState, // Keyed video frame sequencing/rate-control checkpoint state
  webChatVisionFrameBufferState, // Rolling vision frame selection buffer for voice-turn model attachment
  operatorMediaRetention, // Explicit operator-mobile raw media retention metadata + storage linkage
  toolFoundryProposalBacklog, // Runtime ToolSpec proposal backlog with trace + rollback semantics
  agentSpecRegistry,      // Deterministic registry for agent_spec_v1 contracts
  aiAgentTasks,          // Email AI tasks with approval workflow
  aiAgentMemory,         // Legacy table retained for backward compatibility; runtime contract is deprecated/fail-closed
  operatorPinnedNotes,   // Operator-authored pinned notes (L3 memory layer)
  organizationKnowledgeChunks, // Indexed chunks for org knowledge semantic retrieval
  aiTrainingExamples,    // Training data collection for custom model fine-tuning
  agentCatalogEntries,   // Agent productization catalog registry (System Org control center)
  agentCatalogToolRequirements, // Per-agent tool requirement rows with implementation status
  agentCatalogSeedRegistry, // Per-agent seed coverage and template mapping state
  agentCatalogSyncRuns,  // Drift/audit/sync run history for catalog synchronization

  // 💳 AI BILLING v3.1: Three-tier system (€49 or €2,500-€12,000/mo, VAT incl.)
  aiUsage,               // Track AI API usage for billing and monitoring (with privacy audit)
  aiSubscriptions,       // Stripe subscriptions for AI features (tier-based + sub-tiers)
  aiTokenBalance,        // Purchased token balance (Standard/Privacy-Enhanced only)
  aiTokenPurchases,      // Token pack purchase history (with VAT breakdown)
  aiBudgetAlerts,        // Budget alert history and acknowledgments
  aiBillingEvents,       // Audit log for billing operations

  // 👤 USER QUOTAS: Per-user limits foundation (Phase 1: tracking only, Phase 4: enforcement)
  userAIQuotas,          // Per-user monthly AI token limits

  // 💾 STORAGE TRACKING: Organization + per-user storage metrics
  organizationStorage,   // Aggregated storage per organization
  userStorageQuotas,     // Per-user storage limits (Phase 1: tracking only)

  // 📧 CONTACT SYNC & BULK EMAIL: AI-powered external contact integration
  contactSyncs,          // Audit trail for contact synchronization (Microsoft/Google → CRM)
  emailCampaigns,        // Bulk email campaigns to CRM contacts/organizations
  // CRM contact outreach preferences remain migration-safe in objects.customProperties.outreachPreferences:
  // { preferredChannel, allowedHours { start, end, timezone? }, fallbackMethod }.
  // Contract is additive/optional for backward compatibility with existing crm_contact records.

  // 🔐 OAUTH 2.0: Third-party authentication and authorization
  oauthApplications,         // OAuth apps registered by organizations (Zapier, Make, etc.)
  oauthAuthorizationCodes,   // Temporary authorization codes (10 min lifetime)
  oauthRefreshTokens,        // Long-lived refresh tokens (30 days)
  oauthRevokedTokens,        // Revocation list for access tokens
  oauthTokenUsage,           // Token usage analytics (optional, for monitoring)

  // 🚦 RATE LIMITING: Token bucket rate limiting for API abuse prevention
  ...rateLimitSchemas,       // rateLimitBuckets, rateLimitViolations

  // 🛡️ SECURITY: Anomaly detection and security event monitoring
  ...securitySchemas,        // securityEvents, usageMetadata, failedAuthAttempts

  // 📊 GROWTH TRACKING: Launch metrics and KPI tracking
  dailyGrowthMetrics,        // Daily metrics (automated + manual)
  signupEvents,              // Signup event tracking
  weeklyScorecard,           // Weekly scorecard snapshots
  salesNotifications,        // Sales team notifications
  celebrationMilestones,     // Milestone achievements

  // 📧 EMAIL QUEUE: Email delivery tracking
  emailQueue,                // Outbound email queue

  // 🔄 SEQUENCES MESSAGE QUEUE: Multi-channel automation delivery
  sequenceMessageQueue,      // Scheduled messages for sequences (email, SMS, WhatsApp)

  // 🎁 BENEFITS PLATFORM: Benefits & Commissions tracking
  benefitClaims,             // Benefit claim workflow tracking
  commissionPayouts,         // Commission payout workflow tracking
  memberWallets,             // Crypto wallet links for members
  platformFees,              // Platform fee tracking for billing
  referralProfiles,          // Stable referral code profile per user
  referralAttributions,      // Referral signup attribution and reward lifecycle
  referralRewardEvents,      // Referral reward outcomes for cap enforcement

  // ✏️ PROJECT CONTENT: Uses ontology (objects table)
  // - type="project_content", subtype="block" for content blocks
  // - type="project_content", subtype="revision" for revisions (linked via objectLinks)
  // - type="project_edit_session" for edit session locking

  // 📡 ACTIVITY PROTOCOL: Data flow tracing for connected apps
  activityEvents,            // High-frequency event stream (rolling window)
  // NOTE: Application pages stored in objects table with type="application_page"
  activityProtocolSettings,  // Per-org activity tracking configuration

  // 🎨 DESIGN ENGINE: RAG-based design pattern library for page builder
  designPatterns,            // Extracted design patterns with vector embeddings
  prototypeMetadata,         // Indexed prototype metadata and extraction status

  // 📁 BUILDER VFS: Individual file records for builder apps
  builderFiles,              // Per-file storage replacing customProperties.generatedFiles[]

  // 💳 CREDIT SYSTEM: Unified credit currency for all usage
  creditBalances,            // Per-org credit balance (gifted/monthly/purchased + legacy daily compatibility)
  creditTransactions,        // Audit trail of all credit movements
  creditPurchases,           // Credit pack purchase records (Stripe-linked)
  creditRedemptionCodes,     // Super-admin managed redeem codes with lifecycle + targeting policies
  creditCodeRedemptions,     // Auditable per-code redemption events linked to ledger writes

  // 🔀 LAYER EXECUTION: Workflow run tracking
  layerExecutions,           // One record per workflow execution run
  layerNodeExecutions,       // Per-node execution within a workflow run

  // 📁 PROJECT FILE SYSTEM: Virtual file system + sharing
  projectFiles,              // File/folder entries (org-level or project-scoped)
  projectShares,             // Cross-organization sharing records
  userFileBookmarks,         // Per-user file favorites
  userRecentFiles,           // Per-user recent file access tracking
  organizationTags,          // Org-wide tag definitions for file labeling

  // 🤖 AGENT SESSIONS: Agent ↔ external contact conversations
  agentSessions,             // Conversation sessions (org + channel + contact)
  agentSessionMessages,      // Individual messages within sessions
  agentTurns,                // Explicit turn lifecycle rows (coordination kernel)
  executionEdges,            // Turn transition edge/audit events

  // 💬 WEBCHAT: Public webchat widget API (Layer 4 comms)
  webchatSessions,           // Anonymous visitor sessions (24h expiry)
  anonymousIdentityLedger,   // Durable anonymous identity mapping + claim status
  anonymousClaimTokens,      // Signed one-time claim token lifecycle
  webchatRateLimits,         // IP-based rate limiting for public endpoints
  onboardingAuditSessions,   // Five-question audit mode state machine sessions
  onboardingFunnelEvents,    // Deterministic onboarding funnel telemetry
  onboardingNurtureJourneys, // Day 0-3 nurture lifecycle + first-win SLA state
  onboardingSoulReports,     // Day 3 data-backed soul report lifecycle
  onboardingSpecialistPreviewContracts, // Day 5 specialist preview timer contracts
  onboardingPostCaptureDispatchRuns, // Samantha post-capture dispatcher run ledger
  onboardingPostCaptureDispatchAttempts, // Samantha dispatcher leased attempt history
  onboardingPostCaptureDispatchDeadLetters, // Samantha dispatcher terminal failure triage queue

  // 🎟️ BETA ONBOARDING: Access-code lifecycle and redemption audit trail
  betaActivationCodes,       // Admin-created beta activation codes
  betaCodeRedemptions,       // Per-redeem records linked to user + org creation

  // 📱 TELEGRAM: Chat_id → organization routing
  telegramMappings,          // Maps Telegram DM/group chat IDs to organizations

  // 🧬 SOUL EVOLUTION: Agent self-improvement + proposals
  soulProposals,             // Agent-proposed soul/personality updates
  agentConversationMetrics,  // Conversation outcome signals for reflection
  soulVersionHistory,        // Audit trail of soul changes
  proposalFeedback,          // Owner approval/rejection tracking

  // 🛡️ STRICT DECOUPLING (Phase 3)
  transactionsStrict,        // Dedicated transaction table (double-write during migration)
  ticketsStrict,             // Dedicated ticket table linked to strict transactions

  // ❌ OLD TRANSLATIONS - Replaced by ontology
  // systemTranslations,
  // appTranslations,
  // contentTranslations,
  // translationNamespaces,
  // translationKeys,
  // supportedLocales,
});

/**
 * ADDING A NEW APP?
 * 
 * 1. Define your table in schemas/appDataSchemas.ts
 * 2. Import it above: import { yourapp } from "./schemas/appDataSchemas";
 * 3. Add it to the schema export under "APPS" section
 * 4. Register it in convex/apps.ts DEFAULT_APPS
 * 5. Create convex/yourapp.ts for queries/mutations
 * 
 * See schemas/README.md for complete guide
 */
