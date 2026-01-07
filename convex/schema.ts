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
  userPasswords,
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
  webhookSubscriptions
} from "./schemas/coreSchemas";
// NOTE: apiKeyDomains table removed - now using unified domain configurations in objects table
import { apps, appInstallations, snapshots, snapshotLoads, purchases, appAvailabilities } from "./schemas/appStoreSchemas";
// import { app_podcasting } from "./schemas/appDataSchemas"; // Not yet used
import { auditLogs, workflowExecutionLogs } from "./schemas/utilitySchemas";

// ✅ NEW ONTOLOGY SCHEMAS
import { objects, objectLinks, objectActions } from "./schemas/ontologySchemas";

// 🤖 AI INTEGRATION SCHEMAS
import {
  aiConversations,
  aiMessages,
  aiToolExecutions,
  organizationAiSettings,
  aiAgentTasks,
  aiAgentMemory,
  aiModels,
  aiWorkItems
} from "./schemas/aiSchemas";

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

// 🎁 BENEFITS PLATFORM SCHEMAS (Benefits & Commissions tracking)
import {
  benefitClaims,
  commissionPayouts,
  memberWallets,
  platformFees
} from "./schemas/benefitsSchemas";

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
  userPasswords,
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
  aiToolExecutions,       // Audit trail of tool executions
  // NOTE: Tool drafts use objects table with status="draft" + AI metadata in customProperties
  organizationAiSettings, // AI configuration per organization (LLM + embeddings)
  aiModels,               // AI model discovery cache (auto-refreshed daily)
  aiWorkItems,            // Work items for human-in-the-loop approval workflow
  aiAgentTasks,          // Email AI tasks with approval workflow
  aiAgentMemory,         // Email templates and preferences with vector search

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

  // 🎁 BENEFITS PLATFORM: Benefits & Commissions tracking
  benefitClaims,             // Benefit claim workflow tracking
  commissionPayouts,         // Commission payout workflow tracking
  memberWallets,             // Crypto wallet links for members
  platformFees,              // Platform fee tracking for billing

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
