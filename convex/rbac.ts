import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
// Note: internal API removed - not currently used

/**
 * RBAC (Role-Based Access Control) System
 *
 * This module implements a comprehensive, multi-vertical RBAC system with:
 * - Hierarchical roles (super_admin > org_owner > business_manager > employee > viewer)
 * - Granular permissions by resource and action
 * - Per-organization role assignments via organizationMembers
 * - Global super admin bypass via users.global_role_id
 * - SOC2-compliant audit logging
 * - Support for vertical-specific extensions (invoicing, project management, events, HR)
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/**
 * Base role definitions for the multi-vertical platform
 * These roles are hierarchical and work across all business verticals
 */
export const BASE_ROLES = [
  {
    name: 'super_admin',
    description: 'Globaler Systemadministrator mit vollständigem Plattformzugriff',
    isActive: true,
    hierarchy: 0, // Highest level
  },
  {
    name: 'enterprise_owner',
    description: 'Unternehmensinhaber - kann mehrere Organisationen systemweit erstellen und verwalten',
    isActive: true,
    hierarchy: 1, // Can create system organizations
  },
  {
    name: 'org_owner',
    description: 'Organisationsinhaber mit voller Kontrolle einschließlich Abrechnung und Teamverwaltung',
    isActive: true,
    hierarchy: 2,
  },
  {
    name: 'business_manager',
    description: 'Verwaltet Betrieb und Teams (Projektmanager, Event-Koordinator, usw.)',
    isActive: true,
    hierarchy: 3,
  },
  {
    name: 'employee',
    description: 'Führt tägliche Aufgaben und Abläufe aus',
    isActive: true,
    hierarchy: 4,
  },
  {
    name: 'viewer',
    description: 'Nur-Lese-Zugriff für Audits, Reviews und Genehmigungen',
    isActive: true,
    hierarchy: 5,
  },
  {
    name: 'translator',
    description: 'Spezialisierte Rolle für die Verwaltung von Übersetzungen und Internationalisierung',
    isActive: true,
    hierarchy: 4, // Same level as employee but specialized
  },
] as const;

/**
 * Permission categories for organizing related permissions
 */
export const PERMISSION_CATEGORIES = {
  ORG_MANAGEMENT: 'org_management',
  USER_MANAGEMENT: 'user_management',
  FINANCIALS: 'financials',
  OPERATIONS: 'operations',
  REPORTING: 'reporting',
  APP_MANAGEMENT: 'app_management',
  MEDIA_LIBRARY: 'media_library',
  VERTICAL_SPECIFIC: 'vertical_specific',
  TRANSLATION: 'translation',
  PLATFORM_ADMIN: 'platform_admin',
} as const;

/**
 * Base permissions that work across all business verticals
 * Resource-action pairs for granular access control
 */
export const BASE_PERMISSIONS = [
  // Organization Management
  {
    name: 'manage_organization',
    resource: 'organizations',
    action: 'write',
    category: PERMISSION_CATEGORIES.ORG_MANAGEMENT,
    description: 'Erstellen, aktualisieren und löschen von Organisationseinstellungen'
  },
  {
    name: 'view_organization',
    resource: 'organizations',
    action: 'read',
    category: PERMISSION_CATEGORIES.ORG_MANAGEMENT,
    description: 'Organisationsdetails und -einstellungen anzeigen'
  },

  // User/Team Management
  {
    name: 'manage_users',
    resource: 'users',
    action: 'write',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'Benutzer einladen, entfernen und Rollen zuweisen'
  },
  {
    name: 'view_users',
    resource: 'users',
    action: 'read',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'Teammitglieder und ihre Rollen anzeigen'
  },
  {
    name: 'update_profile',
    resource: 'users',
    action: 'write_self',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'Eigenes Benutzerprofil aktualisieren'
  },
  {
    name: 'view_roles',
    resource: 'roles',
    action: 'read',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'Rollen und ihre Berechtigungen anzeigen'
  },
  {
    name: 'manage_roles',
    resource: 'roles',
    action: 'write',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'Rollen erstellen, aktualisieren und löschen'
  },
  {
    name: 'view_permissions',
    resource: 'permissions',
    action: 'read',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'Verfügbare Berechtigungen anzeigen'
  },
  {
    name: 'manage_permissions',
    resource: 'permissions',
    action: 'write',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'Berechtigungen zu Rollen zuweisen und entfernen'
  },

  // Financial Management
  {
    name: 'manage_financials',
    resource: 'purchases',
    action: 'write',
    category: PERMISSION_CATEGORIES.FINANCIALS,
    description: 'Abrechnung, Abonnements und Finanzeinstellungen verwalten'
  },
  {
    name: 'create_invoice',
    resource: 'invoices',
    action: 'write',
    category: PERMISSION_CATEGORIES.FINANCIALS,
    description: 'Rechnungen erstellen und generieren'
  },
  {
    name: 'approve_invoice',
    resource: 'invoices',
    action: 'approve',
    category: PERMISSION_CATEGORIES.FINANCIALS,
    description: 'Rechnungen genehmigen und abzeichnen'
  },
  {
    name: 'view_financials',
    resource: 'purchases',
    action: 'read',
    category: PERMISSION_CATEGORIES.FINANCIALS,
    description: 'Finanzberichte und Abrechnungsinformationen anzeigen'
  },

  // Operations Management
  {
    name: 'manage_operations',
    resource: 'operations',
    action: 'write',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Vollständige CRUD-Operationen für Aufgaben, Projekte und Events'
  },
  {
    name: 'create_task',
    resource: 'tasks',
    action: 'write',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Neue Aufgaben, Projekte oder Event-Elemente erstellen'
  },
  {
    name: 'assign_task',
    resource: 'tasks',
    action: 'assign',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Aufgaben an Teammitglieder delegieren'
  },
  {
    name: 'execute_task',
    resource: 'tasks',
    action: 'update',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Zugewiesene Aufgaben abschließen und aktualisieren'
  },
  {
    name: 'view_operations',
    resource: 'operations',
    action: 'read',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Aufgaben, Projekte und Betriebsdaten anzeigen'
  },

  // Reporting and Analytics
  {
    name: 'create_report',
    resource: 'reports',
    action: 'write',
    category: PERMISSION_CATEGORIES.REPORTING,
    description: 'Benutzerdefinierte Berichte und Analysen generieren'
  },
  {
    name: 'view_reports',
    resource: 'reports',
    action: 'read',
    category: PERMISSION_CATEGORIES.REPORTING,
    description: 'Auf Dashboards und Berichte zugreifen'
  },
  {
    name: 'export_data',
    resource: 'reports',
    action: 'export',
    category: PERMISSION_CATEGORIES.REPORTING,
    description: 'Daten herunterladen und exportieren'
  },
  {
    name: 'view_audit_logs',
    resource: 'auditLogs',
    action: 'read',
    category: PERMISSION_CATEGORIES.REPORTING,
    description: 'Prüfpfad und Sicherheitsprotokolle anzeigen'
  },

  // App Management
  {
    name: 'install_apps',
    resource: 'appInstallations',
    action: 'write',
    category: PERMISSION_CATEGORIES.APP_MANAGEMENT,
    description: 'Apps aus dem App Store installieren und konfigurieren'
  },
  {
    name: 'manage_apps',
    resource: 'appInstallations',
    action: 'manage',
    category: PERMISSION_CATEGORIES.APP_MANAGEMENT,
    description: 'Installierte Apps konfigurieren und verwalten'
  },
  {
    name: 'view_apps',
    resource: 'appInstallations',
    action: 'read',
    category: PERMISSION_CATEGORIES.APP_MANAGEMENT,
    description: 'Installierte Apps und ihre Konfigurationen anzeigen'
  },
  {
    name: 'manage_integrations',
    resource: 'oauth',
    action: 'manage',
    category: PERMISSION_CATEGORIES.APP_MANAGEMENT,
    description: 'OAuth-Verbindungen, API-Schlüssel und Webhooks verwalten'
  },

  // Media Library / File System
  {
    name: 'media_library.view',
    resource: 'media_library',
    action: 'read',
    category: PERMISSION_CATEGORIES.MEDIA_LIBRARY,
    description: 'Medienbibliothek und Dateisystem anzeigen'
  },
  {
    name: 'media_library.upload',
    resource: 'media_library',
    action: 'write',
    category: PERMISSION_CATEGORIES.MEDIA_LIBRARY,
    description: 'Dateien in die Medienbibliothek hochladen'
  },
  {
    name: 'media_library.edit',
    resource: 'media_library',
    action: 'update',
    category: PERMISSION_CATEGORIES.MEDIA_LIBRARY,
    description: 'Medien-Metadaten bearbeiten, umbenennen, verschieben'
  },
  {
    name: 'media_library.delete',
    resource: 'media_library',
    action: 'delete',
    category: PERMISSION_CATEGORIES.MEDIA_LIBRARY,
    description: 'Dateien aus der Medienbibliothek löschen'
  },

  // Platform Administration (Super Admin only)
  {
    name: 'manage_platform_settings',
    resource: 'platform',
    action: 'manage',
    category: PERMISSION_CATEGORIES.PLATFORM_ADMIN,
    description: 'Manage platform-wide settings including beta access gating'
  },

  // Translation Management - Simple permissions
  {
    name: 'view_translations',
    resource: 'translations',
    action: 'read',
    category: PERMISSION_CATEGORIES.TRANSLATION,
    description: 'Übersetzungen und Fortschritt anzeigen'
  },
  {
    name: 'manage_translations',
    resource: 'translations',
    action: 'write',
    category: PERMISSION_CATEGORIES.TRANSLATION,
    description: 'Übersetzungen erstellen und bearbeiten'
  },
  {
    name: 'approve_translations',
    resource: 'translations',
    action: 'approve',
    category: PERMISSION_CATEGORIES.TRANSLATION,
    description: 'Übersetzungen überprüfen und genehmigen'
  },

  // System Administration - Organization Management
  {
    name: 'create_system_organization',
    resource: 'organizations',
    action: 'create',
    category: PERMISSION_CATEGORIES.ORG_MANAGEMENT,
    description: 'Neue Organisationen systemweit erstellen (nur Super-Administrator)'
  },

  // System Administration - Ontology Management
  {
    name: 'manage_ontology',
    resource: 'ontology',
    action: 'manage',
    category: PERMISSION_CATEGORIES.ORG_MANAGEMENT,
    description: 'Ontologie-System verwalten: Objekte, Links und Typen erstellen/bearbeiten (nur Super-Administrator)'
  },

  // Web Publishing Permissions
  {
    name: 'view_published_pages',
    resource: 'published_pages',
    action: 'read',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'View published pages and pages in the organization'
  },
  {
    name: 'create_published_pages',
    resource: 'published_pages',
    action: 'create',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Create new published pages'
  },
  {
    name: 'edit_published_pages',
    resource: 'published_pages',
    action: 'write',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Edit existing published pages'
  },
  {
    name: 'publish_pages',
    resource: 'published_pages',
    action: 'publish',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Publish or unpublish pages'
  },
  {
    name: 'delete_published_pages',
    resource: 'published_pages',
    action: 'delete',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Delete published pages'
  },

  // Template Management Permissions
  {
    name: 'view_templates',
    resource: 'templates',
    action: 'read',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'View templates available to the organization'
  },
  {
    name: 'create_templates',
    resource: 'templates',
    action: 'create',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Create new templates'
  },
  {
    name: 'edit_templates',
    resource: 'templates',
    action: 'write',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Edit existing templates'
  },
  {
    name: 'apply_templates',
    resource: 'templates',
    action: 'apply',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Apply templates to create pages or content'
  },
  {
    name: 'delete_templates',
    resource: 'templates',
    action: 'delete',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Delete templates'
  },

  // Forms Management Permissions
  {
    name: 'view_forms',
    resource: 'forms',
    action: 'read',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'View forms in the organization'
  },
  {
    name: 'create_forms',
    resource: 'forms',
    action: 'create',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Create new forms'
  },
  {
    name: 'edit_forms',
    resource: 'forms',
    action: 'write',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Edit existing forms'
  },
  {
    name: 'publish_forms',
    resource: 'forms',
    action: 'publish',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Publish or unpublish forms'
  },
  {
    name: 'delete_forms',
    resource: 'forms',
    action: 'delete',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Delete forms'
  },
  {
    name: 'manage_forms',
    resource: 'forms',
    action: 'manage',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Full forms management (create, edit, publish, delete)'
  },
  {
    name: 'view_form_responses',
    resource: 'formResponses',
    action: 'read',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'View form submissions and responses'
  },

  // Workflow Management Permissions
  {
    name: 'view_workflows',
    resource: 'workflows',
    action: 'read',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'View workflows configured on products'
  },
  {
    name: 'manage_workflows',
    resource: 'workflows',
    action: 'manage',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Create, edit, and delete workflows on products'
  },
  {
    name: 'test_workflows',
    resource: 'workflows',
    action: 'execute',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Test workflow execution and configurations'
  },
] as const;

/**
 * Role-permission mappings defining what each role can do
 * Hierarchical inheritance is implemented in the seeding logic
 */
export const ROLE_PERMISSION_MAPPINGS: Record<string, string[]> = {
  'super_admin': ['*'], // All permissions via wildcard

  'enterprise_owner': [
    'create_system_organization', // Can create organizations system-wide
    'manage_organization',
    'manage_users',
    'manage_roles',
    'manage_permissions',
    'manage_financials',
    'manage_operations',
    'create_invoice',
    'approve_invoice',
    'create_report',
    'export_data',
    'install_apps',
    'manage_apps',
    'view_audit_logs',
    // Media Library - full control
    'media_library.view',
    'media_library.upload',
    'media_library.edit',
    'media_library.delete',
    'view_*', // All view permissions
  ],

  'org_owner': [
    'manage_organization',
    'manage_users',
    'manage_roles',
    'manage_permissions',
    'manage_financials',
    'manage_operations',
    'manage_integrations', // OAuth connections, API keys, webhooks
    'create_invoice',
    'approve_invoice',
    'create_report',
    'export_data',
    'install_apps',
    'manage_apps',
    'view_audit_logs',
    'manage_forms',
    'manage_workflows',
    'test_workflows',
    // Media Library - full control
    'media_library.view',
    'media_library.upload',
    'media_library.edit',
    'media_library.delete',
    // Publishing & Templates - org owners have full control
    'create_published_pages',
    'edit_published_pages',
    'publish_pages',
    'delete_published_pages',
    'create_templates',
    'edit_templates',
    'apply_templates',
    'delete_templates',
    'view_*', // All view permissions (includes view_roles, view_permissions, view_workflows, view_templates, view_published_pages)
  ],

  'business_manager': [
    'manage_users', // Limited to team management
    'view_roles',
    'view_permissions',
    'manage_operations',
    'create_task',
    'assign_task',
    'execute_task',
    'create_invoice', // Can create but not approve
    'create_report',
    'install_apps',
    'manage_apps',
    'manage_forms',
    'manage_workflows',
    'test_workflows',
    // Media Library - full control
    'media_library.view',
    'media_library.upload',
    'media_library.edit',
    'media_library.delete',
    // Publishing & Templates - business managers can create and edit
    'create_published_pages',
    'edit_published_pages',
    'publish_pages',
    'apply_templates',
    'view_*', // All view permissions (already includes view_roles, view_permissions, view_workflows, view_templates, view_published_pages)
  ],

  'employee': [
    'update_profile',
    'execute_task',
    'create_task', // Can create their own tasks
    'view_organization',
    'view_users',
    'view_operations',
    'view_apps',
    'view_reports',
    'create_forms',
    'edit_forms',
    'publish_forms',
    'delete_forms',
    'view_forms',
    'view_form_responses',
    'view_workflows',
    // Media Library - view and upload
    'media_library.view',
    'media_library.upload',
  ],

  'viewer': [
    'view_organization',
    'view_users',
    'view_roles',
    'view_permissions',
    'view_operations',
    'view_financials',
    'view_reports',
    'view_apps',
    'view_forms',
    'view_form_responses',
    'view_workflows',
    // Media Library - view only
    'media_library.view',
  ],

  'translator': [
    'view_translations',
    'manage_translations',
    'approve_translations',
    'view_organization',
    'view_users',
    'update_profile',
  ],
};

/**
 * Vertical-specific permission extensions
 * These are added when specific business verticals are activated
 */
export const VERTICAL_PERMISSIONS = {
  invoicing: [
    { name: 'manage_payment_terms', resource: 'invoices', action: 'configure' },
    { name: 'send_reminders', resource: 'invoices', action: 'notify' },
  ],
  project_management: [
    { name: 'manage_milestones', resource: 'projects', action: 'write' },
    { name: 'track_time', resource: 'timesheets', action: 'write' },
  ],
  events: [
    { name: 'book_venue', resource: 'events', action: 'book' },
    { name: 'manage_vendors', resource: 'events', action: 'coordinate' },
  ],
  hr_employee: [
    { name: 'manage_payroll', resource: 'employees', action: 'payroll' },
    { name: 'view_performance', resource: 'employees', action: 'review' },
  ],
} as const;

// ============================================================================
// SEEDING & INITIALIZATION
// ============================================================================

/**
 * Seed the RBAC system with base roles and permissions
 * Idempotent: Can be run multiple times safely
 */
export const seedRBAC = mutation({
  args: {
    includeVertical: v.optional(v.union(
      v.literal('invoicing'),
      v.literal('project_management'),
      v.literal('events'),
      v.literal('hr_employee')
    )),
    force: v.optional(v.boolean()), // Allow forcing re-seed to pick up new permissions
  },
  handler: async (ctx, { includeVertical }) => {
    const now = Date.now();
    const roleIds: Record<string, Id<"roles">> = {};
    const permissionIds: Record<string, Id<"permissions">> = {};

    // Upsert base permissions (add new ones, skip existing)
    let permissionCount = 0;
    let permissionsAdded = 0;
    let permissionsSkipped = 0;

    for (const perm of BASE_PERMISSIONS) {
      // Check if permission already exists
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_name", (q) => q.eq("name", perm.name))
        .first();

      if (existing) {
        permissionIds[perm.name] = existing._id;
        permissionsSkipped++;
      } else {
        const permId = await ctx.db.insert("permissions", {
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
          description: perm.description,
          createdAt: now,
        });
        permissionIds[perm.name] = permId;
        permissionsAdded++;
      }
      permissionCount++;
    }

    // Upsert vertical-specific permissions if requested
    if (includeVertical) {
      const verticalPerms = VERTICAL_PERMISSIONS[includeVertical];
      for (const perm of verticalPerms) {
        const existing = await ctx.db
          .query("permissions")
          .withIndex("by_name", (q) => q.eq("name", perm.name))
          .first();

        if (existing) {
          permissionIds[perm.name] = existing._id;
          permissionsSkipped++;
        } else {
          const permId = await ctx.db.insert("permissions", {
            name: perm.name,
            resource: perm.resource,
            action: perm.action,
            description: `${includeVertical}: ${perm.name}`,
            createdAt: now,
          });
          permissionIds[perm.name] = permId;
          permissionsAdded++;
        }
        permissionCount++;
      }
    }

    // Upsert roles (add new ones, skip existing)
    let roleCount = 0;
    let rolesAdded = 0;
    let rolesSkipped = 0;

    for (const role of BASE_ROLES) {
      const existing = await ctx.db
        .query("roles")
        .withIndex("by_name", (q) => q.eq("name", role.name))
        .first();

      if (existing) {
        roleIds[role.name] = existing._id;
        rolesSkipped++;
      } else {
        const roleId = await ctx.db.insert("roles", {
          name: role.name,
          description: role.description,
          isActive: role.isActive,
          createdAt: now,
          updatedAt: now,
        });
        roleIds[role.name] = roleId;
        rolesAdded++;
      }
      roleCount++;
    }

    // Map permissions to roles (upsert - skip existing mappings)
    let roleMappingsAdded = 0;
    let roleMappingsSkipped = 0;

    for (const [roleName, permNames] of Object.entries(ROLE_PERMISSION_MAPPINGS)) {
      const roleId = roleIds[roleName];
      if (!roleId) continue;

      for (const permName of permNames) {
        if (permName === '*') {
          // Grant all permissions to super_admin
          for (const permId of Object.values(permissionIds)) {
            // Check if mapping already exists
            const existingMapping = await ctx.db
              .query("rolePermissions")
              .withIndex("by_role", (q) => q.eq("roleId", roleId))
              .filter((q) => q.eq(q.field("permissionId"), permId))
              .first();

            if (!existingMapping) {
              await ctx.db.insert("rolePermissions", {
                roleId,
                permissionId: permId,
                createdAt: now,
              });
              roleMappingsAdded++;
            } else {
              roleMappingsSkipped++;
            }
          }
        } else if (permName.endsWith('*')) {
          // Wildcard matching (e.g., 'view_*')
          const prefix = permName.replace('*', '');
          for (const [pName, pId] of Object.entries(permissionIds)) {
            if (pName.startsWith(prefix)) {
              const existingMapping = await ctx.db
                .query("rolePermissions")
                .withIndex("by_role", (q) => q.eq("roleId", roleId))
                .filter((q) => q.eq(q.field("permissionId"), pId))
                .first();

              if (!existingMapping) {
                await ctx.db.insert("rolePermissions", {
                  roleId,
                  permissionId: pId,
                  createdAt: now,
                });
                roleMappingsAdded++;
              } else {
                roleMappingsSkipped++;
              }
            }
          }
        } else {
          // Direct permission mapping
          const permId = permissionIds[permName];
          if (permId) {
            const existingMapping = await ctx.db
              .query("rolePermissions")
              .withIndex("by_role", (q) => q.eq("roleId", roleId))
              .filter((q) => q.eq(q.field("permissionId"), permId))
              .first();

            if (!existingMapping) {
              await ctx.db.insert("rolePermissions", {
                roleId,
                permissionId: permId,
                createdAt: now,
              });
              roleMappingsAdded++;
            } else {
              roleMappingsSkipped++;
            }
          }
        }
      }
    }

    return {
      message: permissionsAdded > 0 || rolesAdded > 0
        ? `RBAC aktualisiert: ${permissionsAdded} neue Berechtigungen, ${rolesAdded} neue Rollen`
        : "RBAC bereits vollständig - keine Änderungen",
      skipped: permissionsAdded === 0 && rolesAdded === 0,
      rolesCount: roleCount,
      rolesAdded,
      rolesSkipped,
      permissionsCount: permissionCount,
      permissionsAdded,
      permissionsSkipped,
      roleMappingsAdded,
      roleMappingsSkipped,
    };
  },
});

// ============================================================================
// CONTEXT RESOLUTION
// ============================================================================

/**
 * Get the user's effective context (role and organization)
 * Handles super admin bypass via global_role_id
 */
export const getUserContext = internalQuery({
  args: {
    userId: v.id("users"),
    orgId: v.optional(v.id("organizations"))
  },
  handler: async (ctx, { userId, orgId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check for global super admin role
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === 'super_admin') {
        return {
          userId,
          orgId: null,
          roleId: user.global_role_id,
          roleName: globalRole.name,
          isGlobal: true,
        };
      }
    }

    // Require organization for non-global users
    if (!orgId) {
      throw new Error("Organization required for non-global users");
    }

    // Get user's membership in the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", userId).eq("organizationId", orgId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!membership) {
      throw new Error("Access denied: No active membership in organization");
    }

    const role = await ctx.db.get(membership.role);
    if (!role || !role.isActive) {
      throw new Error("Access denied: Invalid or inactive role");
    }

    return {
      userId,
      orgId,
      roleId: membership.role,
      roleName: role.name,
      isGlobal: false,
    };
  },
});

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if a role has a specific permission
 * Supports wildcard permissions and resource filtering
 */
export const hasPermission = internalQuery({
  args: {
    roleId: v.id("roles"),
    permName: v.string(),
    resource: v.optional(v.string()),
  },
  handler: async (ctx, { roleId, permName, resource }) => {
    const role = await ctx.db.get(roleId);
    if (!role || !role.isActive) {
      return false;
    }

    // Super admin always has all permissions
    if (role.name === 'super_admin') {
      return true;
    }

    // Look up the specific permission
    const permission = await ctx.db
      .query("permissions")
      .withIndex("by_name", (q) => q.eq("name", permName))
      .first();

    if (!permission) {
      return false;
    }

    // Check resource match if specified
    if (resource && permission.resource !== resource) {
      return false;
    }

    // Check direct role-permission mapping
    const directMapping = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role_permission", (q) =>
        q.eq("roleId", roleId).eq("permissionId", permission._id)
      )
      .first();

    if (directMapping) {
      return true;
    }

    // Check for wildcard permissions
    const rolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", roleId))
      .collect();

    for (const rp of rolePermissions) {
      const perm = await ctx.db.get(rp.permissionId);
      if (!perm) continue;

      // Check for wildcard match
      if (perm.name === '*') {
        return true;
      }

      // Check for prefix wildcard (e.g., 'view_*')
      if (perm.name.endsWith('*')) {
        const prefix = perm.name.replace('*', '');
        if (permName.startsWith(prefix)) {
          return true;
        }
      }
    }

    return false;
  },
});

/**
 * Check multiple permissions at once (batch operation)
 */
export const hasPermissions = internalQuery({
  args: {
    roleId: v.id("roles"),
    permissions: v.array(v.object({
      name: v.string(),
      resource: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { roleId, permissions }) => {
    const results: Record<string, boolean> = {};

    // Check permissions directly instead of calling internal function
    const role = await ctx.db.get(roleId);
    if (!role || !role.isActive) {
      for (const perm of permissions) {
        results[perm.name] = false;
      }
      return results;
    }

    // Super admin always has all permissions
    if (role.name === 'super_admin') {
      for (const perm of permissions) {
        results[perm.name] = true;
      }
      return results;
    }

    // Check each permission
    for (const perm of permissions) {
      const permission = await ctx.db
        .query("permissions")
        .withIndex("by_name", (q) => q.eq("name", perm.name))
        .first();

      if (!permission || (perm.resource && permission.resource !== perm.resource)) {
        results[perm.name] = false;
        continue;
      }

      // Check direct mapping
      const directMapping = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role_permission", (q) =>
          q.eq("roleId", roleId).eq("permissionId", permission._id)
        )
        .first();

      results[perm.name] = !!directMapping;
    }

    return results;
  },
});

// Backward compatibility - keep the old checkPermission function
export const checkPermission = query({
  args: {
    userId: v.id("users"),
    resource: v.string(),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to get user's global role first
    const user = await ctx.db.get(args.userId);
    if (!user) return false;

    // Check global role
    if (user.global_role_id) {
      const role = await ctx.db.get(user.global_role_id);
      if (role && role.isActive && role.name === 'super_admin') {
        return true;
      }
    }

    // Check org-specific role (use default org if available)
    if (user.defaultOrgId) {
      // Get user's membership in the organization
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", args.userId).eq("organizationId", user.defaultOrgId!)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (membership) {
        const role = await ctx.db.get(membership.role);
        if (role && role.isActive) {
          // Construct permission name from resource and action
          const permName = `${args.action}_${args.resource}`;

          // Look up the permission
          const permission = await ctx.db
            .query("permissions")
            .withIndex("by_name", (q) => q.eq("name", permName))
            .first();

          if (permission && permission.resource === args.resource) {
            // Check role-permission mapping
            const hasMapping = await ctx.db
              .query("rolePermissions")
              .withIndex("by_role_permission", (q) =>
                q.eq("roleId", membership.role).eq("permissionId", permission._id)
              )
              .first();

            if (hasMapping) return true;
          }
        }
      }
    }

    return false;
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * Get a role by its ID (internal query for actions)
 */
export const getRoleById = internalQuery({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roleId);
  },
});

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an action to the audit trail
 * Used for SOC2 compliance and security monitoring
 */
export const logAudit = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For global actions, we need to provide a valid organizationId
    // We'll use the user's default org or create a system org reference
    let orgId = args.organizationId;

    if (!orgId) {
      const user = await ctx.db.get(args.userId);
      if (user && user.defaultOrgId) {
        orgId = user.defaultOrgId;
      } else {
        // For truly global actions, we need a system organization
        // For now, we'll skip the audit log if no org is available
        // In production, you'd want a dedicated "system" organization
        console.warn("Skipping audit log for global action without organization");
        return;
      }
    }

    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      organizationId: orgId,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      success: args.success,
      errorMessage: args.errorMessage,
      metadata: args.metadata,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
  },
});

/**
 * Query audit logs with filters
 */
export const getAuditLogs = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    action: v.optional(v.string()),
    resource: v.optional(v.string()),
    fromTime: v.optional(v.number()),
    toTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get results based on filters
    let results;

    if (args.organizationId && args.action) {
      results = await ctx.db
        .query("auditLogs")
        .withIndex("by_org_and_action", (q) =>
          q.eq("organizationId", args.organizationId!).eq("action", args.action!)
        )
        .collect();
    } else if (args.organizationId && args.resource) {
      results = await ctx.db
        .query("auditLogs")
        .withIndex("by_org_and_resource", (q) =>
          q.eq("organizationId", args.organizationId!).eq("resource", args.resource!)
        )
        .collect();
    } else if (args.organizationId) {
      results = await ctx.db
        .query("auditLogs")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .collect();
    } else if (args.userId) {
      results = await ctx.db
        .query("auditLogs")
        .withIndex("by_user", (q) =>
          q.eq("userId", args.userId!)
        )
        .collect();
    } else {
      // No filters - get all (be careful with this in production)
      results = await ctx.db
        .query("auditLogs")
        .collect();
    }

    // Apply time filters

    if (args.fromTime) {
      results = results.filter(log => log.createdAt >= args.fromTime!);
    }
    if (args.toTime) {
      results = results.filter(log => log.createdAt <= args.toTime!);
    }

    // Apply limit
    if (args.limit) {
      results = results.slice(0, args.limit);
    }

    return results;
  },
});

// ============================================================================
// ROLE & PERMISSION MANAGEMENT
// ============================================================================

/**
 * Get all organizations (for seeding scripts)
 */
export const getOrganizations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get all roles in the system
 */
export const getRoles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("roles")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get all permissions in the system
 */
export const getPermissions = query({
  args: {
    resource: v.optional(v.string()),
  },
  handler: async (ctx, { resource }) => {
    if (resource) {
      return await ctx.db
        .query("permissions")
        .withIndex("by_resource", (q) => q.eq("resource", resource))
        .collect();
    }

    return await ctx.db.query("permissions").collect();
  },
});

/**
 * Get permissions for a specific role
 */
export const getRolePermissions = query({
  args: {
    roleId: v.id("roles"),
  },
  handler: async (ctx, { roleId }) => {
    const mappings = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", roleId))
      .collect();

    const permissions = await Promise.all(
      mappings.map(async (mapping) => {
        const permission = await ctx.db.get(mapping.permissionId);
        return permission;
      })
    );

    return permissions.filter(Boolean);
  },
});

/**
 * Add a permission to a role (org owner only)
 */
export const addPermissionToRole = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    roleId: v.id("roles"),
    permissionId: v.id("permissions"),
  },
  handler: async (ctx, args) => {
    // Verify session and get user
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is org owner or super admin
    const isOrgOwner = await checkIsOrgOwnerOrSuperAdmin(ctx, session.userId, args.organizationId);
    if (!isOrgOwner) {
      throw new Error("Only organization owners can manage role permissions");
    }

    // Verify role and permission exist
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    const permission = await ctx.db.get(args.permissionId);
    if (!permission) {
      throw new Error("Permission not found");
    }

    // Check if mapping already exists
    const existingMapping = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role_permission", (q) =>
        q.eq("roleId", args.roleId).eq("permissionId", args.permissionId)
      )
      .first();

    if (existingMapping) {
      return { success: true, message: "Permission already assigned to role" };
    }

    // Create the mapping
    await ctx.db.insert("rolePermissions", {
      roleId: args.roleId,
      permissionId: args.permissionId,
      createdAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: session.userId,
      organizationId: args.organizationId,
      action: "add_permission_to_role",
      resource: "rolePermissions",
      resourceId: `${args.roleId}_${args.permissionId}`,
      success: true,
      metadata: {
        roleName: role.name,
        permissionName: permission.name,
      },
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: `Added ${permission.name} to ${role.name}`,
    };
  },
});

/**
 * Remove a permission from a role (org owner only)
 */
export const removePermissionFromRole = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    roleId: v.id("roles"),
    permissionId: v.id("permissions"),
  },
  handler: async (ctx, args) => {
    // Verify session and get user
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is org owner or super admin
    const isOrgOwner = await checkIsOrgOwnerOrSuperAdmin(ctx, session.userId, args.organizationId);
    if (!isOrgOwner) {
      throw new Error("Only organization owners can manage role permissions");
    }

    // Verify role and permission exist
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    const permission = await ctx.db.get(args.permissionId);
    if (!permission) {
      throw new Error("Permission not found");
    }

    // Prevent removing critical permissions from super_admin
    if (role.name === "super_admin") {
      throw new Error("Cannot remove permissions from super_admin role");
    }

    // Find and delete the mapping
    const mapping = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role_permission", (q) =>
        q.eq("roleId", args.roleId).eq("permissionId", args.permissionId)
      )
      .first();

    if (!mapping) {
      return { success: true, message: "Permission not assigned to role" };
    }

    await ctx.db.delete(mapping._id);

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId: session.userId,
      organizationId: args.organizationId,
      action: "remove_permission_from_role",
      resource: "rolePermissions",
      resourceId: `${args.roleId}_${args.permissionId}`,
      success: true,
      metadata: {
        roleName: role.name,
        permissionName: permission.name,
      },
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: `Removed ${permission.name} from ${role.name}`,
    };
  },
});

/**
 * Helper: Check if user is org owner or super admin
 */
async function checkIsOrgOwnerOrSuperAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  userId: Id<"users">,
  organizationId: Id<"organizations">
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;

  // Check global super admin role
  if (user.global_role_id) {
    const globalRole = await ctx.db.get(user.global_role_id);
    if (globalRole && globalRole.name === "super_admin") {
      return true;
    }
  }

  // Check org owner role
   
  const membership = await ctx.db
    .query("organizationMembers")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_user_and_org", (q: any) =>
      q.eq("userId", userId).eq("organizationId", organizationId)
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .first();

  if (!membership) return false;

  const role = await ctx.db.get(membership.role);
  return role && role.name === "org_owner";
}

/**
 * Get all role-permission mappings for the entire system
 * Returns a map of roleId -> permissions array
 */
export const getAllRolePermissions = query({
  args: {},
  handler: async (ctx) => {
    // Get all role-permission mappings
    const allMappings = await ctx.db.query("rolePermissions").collect();

    // Group by role
    const mappingsByRole: Record<string, string[]> = {};
    for (const mapping of allMappings) {
      const roleId = mapping.roleId;
      if (!mappingsByRole[roleId]) {
        mappingsByRole[roleId] = [];
      }
      mappingsByRole[roleId].push(mapping.permissionId);
    }

    // Fetch all permissions for each role
    const result: Record<string, (Doc<"permissions"> | null)[]> = {};
    for (const [roleId, permissionIds] of Object.entries(mappingsByRole)) {
      const permissions = await Promise.all(
        permissionIds.map(id => ctx.db.get(id as Id<"permissions">))
      );
      result[roleId] = permissions.filter(p => p !== null);
    }

    return result;
  },
});

/**
 * Assign a role to a user in an organization
 */
export const assignRoleToOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    roleId: v.id("roles"),
    assignedBy: v.id("users"),
  },
  handler: async (ctx, { userId, organizationId, roleId, assignedBy }) => {
    // Get the role to check if it's a custom role
    const role = await ctx.db.get(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // ⚡ PROFESSIONAL TIER: Custom Roles (RBAC)
    // Professional+ can assign custom roles (non-base roles)
    const isCustomRole = !BASE_ROLES.some(baseRole => baseRole.name === role.name);
    if (isCustomRole) {
      const { checkFeatureAccess } = await import("./licensing/helpers");
      await checkFeatureAccess(ctx, organizationId, "customRolesEnabled");
    }

    // Check if membership exists
    const existing = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", userId).eq("organizationId", organizationId)
      )
      .first();

    if (existing) {
      // Update existing membership
      await ctx.db.patch(existing._id, {
        role: roleId,
        isActive: true,
      });
    } else {
      // Create new membership
      await ctx.db.insert("organizationMembers", {
        userId,
        organizationId,
        role: roleId,
        isActive: true,
        joinedAt: Date.now(),
        invitedBy: assignedBy,
        invitedAt: Date.now(),
        acceptedAt: Date.now(),
      });
    }

    // Log the role assignment directly (avoid internal function call)
    // In production, you would want to use a proper internal API
    await ctx.db.insert("auditLogs", {
      userId: assignedBy,
      organizationId,
      action: 'assign_role',
      resource: 'organizationMembers',
      resourceId: userId,
      success: true,
      metadata: { roleId, targetUserId: userId },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// VERTICAL EXTENSIONS
// ============================================================================

/**
 * Add vertical-specific permissions to the system
 */
export const addVerticalPermissions = mutation({
  args: {
    vertical: v.union(
      v.literal('invoicing'),
      v.literal('project_management'),
      v.literal('events'),
      v.literal('hr_employee')
    ),
  },
  handler: async (ctx, { vertical }) => {
    const permissions = VERTICAL_PERMISSIONS[vertical];
    const now = Date.now();
    let count = 0;

    for (const perm of permissions) {
      // Check if permission already exists
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_name", (q) => q.eq("name", perm.name))
        .first();

      if (!existing) {
        await ctx.db.insert("permissions", {
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
          description: `${vertical}: ${perm.name}`,
          createdAt: now,
        });
        count++;
      }
    }

    return {
      message: `Added ${count} permissions for ${vertical}`,
      permissionsAdded: count,
    };
  },
});

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

// Get all permissions for a user (legacy)
export const getUserPermissions = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    // Try to get permissions via org membership first
    if (user.defaultOrgId) {
      try {
        const membership = await ctx.db
          .query("organizationMembers")
          .withIndex("by_user_and_org", (q) =>
            q.eq("userId", args.userId).eq("organizationId", user.defaultOrgId!)
          )
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        if (membership) {
          // Get role permissions directly
          const mappings = await ctx.db
            .query("rolePermissions")
            .withIndex("by_role", (q) => q.eq("roleId", membership.role))
            .collect();

          const permissions = await Promise.all(
            mappings.map(async (mapping) => {
              const permission = await ctx.db.get(mapping.permissionId);
              return permission;
            })
          );

          return permissions.filter(Boolean);
        }
      } catch {
        // Fall through
      }
    }

    return [];
  },
});

// Get user's role (legacy)
export const getUserRole = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Try org membership first
    if (user.defaultOrgId) {
      try {
        const membership = await ctx.db
          .query("organizationMembers")
          .withIndex("by_user_and_org", (q) =>
            q.eq("userId", args.userId).eq("organizationId", user.defaultOrgId!)
          )
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        if (membership) {
          const role = await ctx.db.get(membership.role);
          if (role) {
            return {
              id: role._id,
              name: role.name,
              description: role.description,
            };
          }
        }
      } catch {
        // Fall through
      }
    }

    return null;
  },
});

// Check if user is super admin (convenience function)
export const isSuperAdmin = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) return false;

    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return false;

    const user = await ctx.db.get(session.userId);
    if (!user) return false;

    // Check global role
    if (user.global_role_id) {
      const role = await ctx.db.get(user.global_role_id);
      return role?.name === "super_admin";
    }

    return false;
  },
});

/**
 * Get assignable roles for a user
 * Users can only assign roles at their hierarchy level or below
 * @returns Array of roles that the user can assign to others
 */
export const getAssignableRoles = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    // Get session
    const session = await ctx.db.get(sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Determine user's role and hierarchy
    let userHierarchy = 999; // Default to lowest

    // Check global role first
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole) {
        const roleConfig = BASE_ROLES.find(r => r.name === globalRole.name);
        if (roleConfig) {
          userHierarchy = roleConfig.hierarchy;
        }
      }
    }
    // Check organization role
    else if (organizationId) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", session.userId).eq("organizationId", organizationId)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (membership) {
        const orgRole = await ctx.db.get(membership.role);
        if (orgRole) {
          const roleConfig = BASE_ROLES.find(r => r.name === orgRole.name);
          if (roleConfig) {
            userHierarchy = roleConfig.hierarchy;
          }
        }
      }
    }

    // Get all active roles
    const allRoles = await ctx.db
      .query("roles")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter roles: user can assign roles at their level or below
    // Exception: super_admin (hierarchy 0) can assign any role
    const assignableRoles = allRoles.filter(role => {
      const roleConfig = BASE_ROLES.find(r => r.name === role.name);
      if (!roleConfig) return false; // Unknown roles can't be assigned

      // Super admin can assign any role
      if (userHierarchy === 0) return true;

      // Users can only assign roles with hierarchy >= their own (higher number = lower privilege)
      return roleConfig.hierarchy > userHierarchy;
    });

    return assignableRoles;
  },
});

// ============================================================================
// TEST HELPER MUTATIONS (For Testing Only)
// ============================================================================

/**
 * Create a test user - ONLY FOR TESTING
 * In production, users are created through auth flows
 */
export const createTestUser = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    global_role_id: v.optional(v.id("roles")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName || args.email.split('@')[0],
      lastName: args.lastName,
      global_role_id: args.global_role_id,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Create a test organization - ONLY FOR TESTING
 * In production, organizations are created through proper flows
 */
export const createTestOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    creatorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      businessName: args.name,
      // NOTE: Plan/tier managed in organization_license object
      isPersonalWorkspace: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return orgId;
  },
});

