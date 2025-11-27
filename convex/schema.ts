/**
 * ORGANIZED SCHEMA STRUCTURE
 *
 * This schema is composed from modular definitions in the schemas/ directory.
 * See schemas/README.md for documentation on adding new apps.
 *
 * Structure:
 * 1. Core platform (users, organizations, memberships)
 * 2. App Store (apps registry, installations, purchases)
 * 3. Individual Apps (L4YERCAK3pod, etc. - each is self-contained)
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
  oauthStates
} from "./schemas/coreSchemas";
import { apps, appInstallations, snapshots, snapshotLoads, purchases, appAvailabilities } from "./schemas/appStoreSchemas";
// import { app_podcasting } from "./schemas/appDataSchemas"; // Not yet used
import { auditLogs, workflowExecutionLogs } from "./schemas/utilitySchemas";
// ❌ OLD TRANSLATION SCHEMAS - Replaced by ontology
// import {
//   systemTranslations,
//   appTranslations,
//   contentTranslations,
//   translationNamespaces,
//   translationKeys,
//   supportedLocales
// } from "./schemas/translationSchemas";

// ✅ NEW ONTOLOGY SCHEMAS
import { objects, objectLinks, objectActions } from "./schemas/ontologySchemas";

// 🤖 AI INTEGRATION SCHEMAS
import {
  aiConversations,
  aiMessages,
  aiToolExecutions,
  organizationAiSettings,
  aiAgentTasks,
  aiAgentMemory
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
  userPreferences,
  organizationMedia,
  oauthConnections,
  oauthStates,

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
  organizationAiSettings, // AI configuration per organization (LLM + embeddings)
  aiAgentTasks,          // Email AI tasks with approval workflow
  aiAgentMemory,         // Email templates and preferences with vector search

  // 💳 AI BILLING v3.1: Three-tier system (€49 or €2,500-€12,000/mo, VAT incl.)
  aiUsage,               // Track AI API usage for billing and monitoring (with privacy audit)
  aiSubscriptions,       // Stripe subscriptions for AI features (tier-based + sub-tiers)
  aiTokenBalance,        // Purchased token balance (Standard/Privacy-Enhanced only)
  aiTokenPurchases,      // Token pack purchase history (with VAT breakdown)
  aiBudgetAlerts,        // Budget alert history and acknowledgments
  aiBillingEvents,       // Audit log for billing operations

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
