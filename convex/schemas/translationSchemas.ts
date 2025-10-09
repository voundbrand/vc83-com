import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Translation & Internationalization Schemas
 * Database-backed translation management system for L4YERCAK3.com
 * 
 * Features:
 * - Real-time translation editing
 * - Missing translation detection 
 * - UI-organized translation management
 * - Build-time TypeScript file generation
 * - Translator workflow management
 */

// System Translations - Platform UI translations (renamed from translations)
export const systemTranslations = defineTable({
  // Translation Identity
  key: v.string(), // Unique translation key: "auth.login.title"
  namespace: v.string(), // UI grouping: "auth", "desktop", "windows", etc.
  locale: v.string(), // Language code: "en", "de", "pl", etc.

  // Content
  value: v.string(), // The actual translation text

  // Organization & Context
  context: v.optional(v.string()), // Additional context for translators
  componentPath: v.optional(v.string()), // Component file path for context
  maxLength: v.optional(v.number()), // Character limit for UI constraints

  // Translation Metadata
  isPlural: v.optional(v.boolean()), // For pluralization support
  pluralRules: v.optional(v.object({
    zero: v.optional(v.string()),
    one: v.optional(v.string()),
    two: v.optional(v.string()),
    few: v.optional(v.string()),
    many: v.optional(v.string()),
    other: v.string(), // Required fallback
  })),

  // Quality & Status
  status: v.union(
    v.literal("draft"), // Newly created, needs translation
    v.literal("pending"), // Awaiting translator review
    v.literal("approved"), // Reviewed and approved
    v.literal("needs_review"), // Flagged for review
    v.literal("outdated") // Source changed, needs update
  ),

  // Translation Management
  translatedBy: v.optional(v.id("users")), // Who translated this
  reviewedBy: v.optional(v.id("users")), // Who reviewed/approved this
  sourceHash: v.optional(v.string()), // Hash of English source for change detection

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_locale", ["locale"])
  .index("by_namespace", ["namespace"])
  .index("by_key_locale", ["key", "locale"])
  .index("by_namespace_locale", ["namespace", "locale"])
  .index("by_status", ["status"])
  .index("by_translator", ["translatedBy"])
  .index("by_reviewer", ["reviewedBy"])
  .searchIndex("search_by_key", {
    searchField: "key",
  })
  .searchIndex("search_by_value", {
    searchField: "value",
  });

// App Translations - App template UI translations (new table)
export const appTranslations = defineTable({
  // App Identity
  appId: v.string(), // "invoicing", "analytics", etc.

  // Translation Identity
  key: v.string(), // Unique translation key: "invoice.create.title"
  namespace: v.string(), // UI grouping: "invoice", "report", etc.
  locale: v.string(), // Language code: "en", "de", "pl", etc.

  // Content
  value: v.string(), // The actual translation text

  // Organization & Context
  context: v.optional(v.string()), // Additional context for translators
  componentPath: v.optional(v.string()), // Component file path for context
  maxLength: v.optional(v.number()), // Character limit for UI constraints

  // Translation Metadata
  isPlural: v.optional(v.boolean()), // For pluralization support
  pluralRules: v.optional(v.object({
    zero: v.optional(v.string()),
    one: v.optional(v.string()),
    two: v.optional(v.string()),
    few: v.optional(v.string()),
    many: v.optional(v.string()),
    other: v.string(), // Required fallback
  })),

  // Quality & Status
  status: v.union(
    v.literal("draft"),
    v.literal("pending"),
    v.literal("approved"),
    v.literal("needs_review"),
    v.literal("outdated")
  ),

  // Translation Management
  translatedBy: v.optional(v.id("users")),
  reviewedBy: v.optional(v.id("users")),
  sourceHash: v.optional(v.string()),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_app", ["appId"])
  .index("by_locale", ["locale"])
  .index("by_app_locale", ["appId", "locale"])
  .index("by_key_locale", ["key", "locale"])
  .index("by_namespace", ["namespace"])
  .index("by_app_namespace", ["appId", "namespace"])
  .index("by_status", ["status"])
  .searchIndex("search_by_key", {
    searchField: "key",
  })
  .searchIndex("search_by_value", {
    searchField: "value",
  });

// Content Translations - User data translations (new table)
export const contentTranslations = defineTable({
  // Organization Scoping
  organizationId: v.id("organizations"), // Which org owns this translation

  // Source Content Reference
  sourceTable: v.string(), // "invoices", "products", "emails", etc.
  sourceId: v.string(), // ID of the source record
  sourceField: v.string(), // Field name: "name", "description", etc.

  // Translation Identity
  locale: v.string(), // Language code: "en", "de", "pl", etc.

  // Content
  value: v.string(), // The translated content

  // Quality & Status
  status: v.union(
    v.literal("draft"),
    v.literal("pending"),
    v.literal("approved"),
    v.literal("needs_review"),
    v.literal("outdated")
  ),

  // Translation Management
  translatedBy: v.optional(v.id("users")),
  reviewedBy: v.optional(v.id("users")),
  sourceHash: v.optional(v.string()), // Hash of original content

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_source", ["sourceTable", "sourceId"])
  .index("by_source_field", ["sourceTable", "sourceId", "sourceField"])
  .index("by_source_locale", ["sourceTable", "sourceId", "locale"])
  .index("by_locale", ["locale"])
  .index("by_status", ["status"])
  .searchIndex("search_by_value", {
    searchField: "value",
  });

// Translation Namespaces - Organize translations by UI areas
export const translationNamespaces = defineTable({
  name: v.string(), // "auth", "desktop", "windows", etc.
  displayName: v.string(), // "Authentication & Security"
  description: v.optional(v.string()),
  
  // Hierarchy for nested organization
  parentNamespace: v.optional(v.id("translationNamespaces")),
  sortOrder: v.number(),
  
  // UI Organization
  icon: v.optional(v.string()), // Lucide icon name
  color: v.optional(v.string()), // CSS color for UI grouping
  
  // Component Context
  componentPaths: v.optional(v.array(v.string())), // Related component files
  
  // Metadata
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_name", ["name"])
  .index("by_parent", ["parentNamespace"])
  .index("by_sort_order", ["sortOrder"])
  .searchIndex("search_by_display_name", {
    searchField: "displayName",
  });

// Translation Keys - Master list of all translation keys with metadata
export const translationKeys = defineTable({
  key: v.string(), // "auth.login.title"
  namespace: v.string(), // "auth"
  
  // Source (English) Information
  sourceValue: v.string(), // English text
  sourceHash: v.string(), // Hash for change detection
  
  // Context & Documentation
  description: v.optional(v.string()), // What this text is for
  context: v.optional(v.string()), // Usage context for translators
  componentPath: v.optional(v.string()), // Where it's used in code
  
  // UI Constraints
  maxLength: v.optional(v.number()), // Character limit
  isPlural: v.optional(v.boolean()), // Needs plural forms
  
  // Translation Progress
  completedLocales: v.array(v.string()), // ["en", "de"] - which locales are done
  totalLocales: v.number(), // Total number of supported locales
  
  // Priority & Status
  priority: v.union(
    v.literal("high"), // Must translate first
    v.literal("medium"), // Important but not critical
    v.literal("low") // Nice to have
  ),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  lastModified: v.number(), // When source English changed
})
  .index("by_key", ["key"])
  .index("by_namespace", ["namespace"])
  .index("by_priority", ["priority"])
  .index("by_completion_status", ["totalLocales"]) // For finding incomplete translations
  .searchIndex("search_by_key", {
    searchField: "key",
  });

// Supported Locales - Configuration for each supported language
export const supportedLocales = defineTable({
  code: v.string(), // "en", "de", "pl"
  name: v.string(), // "English", "Deutsch", "Polski"
  nativeName: v.string(), // "English", "Deutsch", "Polski" 
  
  // Locale Configuration
  rtl: v.boolean(), // Right-to-left text direction
  pluralRules: v.array(v.string()), // ["zero", "one", "other"] - which plural forms this locale uses
  
  // Translation Status
  isEnabled: v.boolean(), // Available for selection
  isComplete: v.boolean(), // All translations done
  completionPercentage: v.number(), // 0-100
  
  // Quality Metrics
  totalKeys: v.number(), // Total translation keys
  translatedKeys: v.number(), // Completed translations
  reviewedKeys: v.number(), // Approved translations
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_code", ["code"])
  .index("by_enabled", ["isEnabled"])
  .index("by_completion", ["completionPercentage"]);