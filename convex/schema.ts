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
  organizationAddresses,
  userPasswords,
  sessions,
  roles,
  permissions,
  rolePermissions
} from "./schemas/coreSchemas";
import { apps, appInstallations, snapshots, snapshotLoads, purchases } from "./schemas/appStoreSchemas";
import { app_podcasting } from "./schemas/appDataSchemas";
import { auditLogs } from "./schemas/utilitySchemas";

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
  organizationAddresses,
  userPasswords,
  sessions,

  // 🔐 RBAC: Role-Based Access Control
  roles,
  permissions,
  rolePermissions,

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
  // app_podcasting,  // Podcasting App
  // Add more apps here as they're created:
  // app_analytics,
  // app_subscribers,
  // app_calendar,

  // 🛠️ UTILITIES: Supporting functionality
  auditLogs,
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
