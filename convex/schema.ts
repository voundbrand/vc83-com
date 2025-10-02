/**
 * ORGANIZED SCHEMA STRUCTURE
 * 
 * This schema is composed from modular definitions in the schemas/ directory.
 * See schemas/README.md for documentation on adding new apps.
 * 
 * Structure:
 * 1. Auth tables (from @convex-dev/auth)
 * 2. Core platform (users, organizations, memberships)
 * 3. App Store (apps registry, installations, purchases)
 * 4. Individual Apps (vc83pod, etc. - each is self-contained)
 * 5. Utilities (audit logs, invitations, email verification)
 */

import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";

// Import modular schema definitions
import { users, organizations, organizationMembers } from "./schemas/coreSchemas";
import { apps, appInstallations, snapshots, snapshotLoads, purchases } from "./schemas/appStoreSchemas";
import { app_podcasting } from "./schemas/appDataSchemas";
import { auditLogs, invitations, emailVerifications, resetTokens, rateLimits } from "./schemas/utilitySchemas";

/**
 * MAIN SCHEMA EXPORT
 * 
 * All tables are defined in their respective schema modules.
 * This file simply composes them together.
 */
export default defineSchema({
  // 🔐 AUTH: Tables from @convex-dev/auth
  ...authTables,

  // 👥 CORE: Platform foundation
  users,
  organizations,
  organizationMembers,

  // 🏪 APP STORE: Marketplace functionality
  apps,
  appInstallations,
  snapshots,
  snapshotLoads,
  purchases,

  // 📱 APPS: Individual app data tables
  // Each app is self-contained with its own table
  // All apps follow the appSchemaBase pattern (see schemas/appSchemaBase.ts)
  // NAMING: Always prefix with "app_"
  app_podcasting,  // Podcasting App
  // Add more apps here as they're created:
  // app_analytics,
  // app_subscribers,
  // app_calendar,

  // 🛠️ UTILITIES: Supporting functionality
  auditLogs,
  invitations,
  emailVerifications,
  resetTokens,
  rateLimits,
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
