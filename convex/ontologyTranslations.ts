/**
 * ONTOLOGY TRANSLATIONS
 *
 * Translation-specific queries using the ontology framework.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";

/**
 * GET TRANSLATIONS BY NAMESPACE (as key-value map)
 *
 * This replaces getAllTranslations to avoid the 1024 field limit.
 * Load only the translations you need for a specific window/component.
 *
 * @param locale - Language code (e.g., "en", "de", "pl")
 * @param namespace - Dot-separated namespace prefix (e.g., "ui.media_library")
 * @returns Object with translation keys and values for the requested namespace
 *
 * @example
 * // Load only media library translations
 * const translations = useQuery(api.ontologyTranslations.getTranslationsByNamespace, {
 *   locale: "en",
 *   namespace: "ui.media_library"
 * });
 *
 * // Access like: translations["ui.media_library.tab.library"]
 */
export const getTranslationsByNamespace = query({
  args: {
    locale: v.string(),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) return {};

    const translations = await ctx.db
      .query("objects")
      .withIndex("by_org_type_locale", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
         .eq("locale", args.locale)
      )
      .collect();

    // Filter to only translations in this namespace
    const namespaceTranslations = translations.filter(t =>
      t.name.startsWith(args.namespace + ".")
    );

    const translationMap: Record<string, string> = {};
    namespaceTranslations.forEach(t => {
      if (t.value) translationMap[t.name] = t.value;
    });

    return translationMap;
  },
});

/**
 * GET MULTIPLE NAMESPACES AT ONCE
 *
 * Load translations for multiple namespaces in a single query.
 * Useful when a component needs translations from multiple areas.
 *
 * @param locale - Language code (e.g., "en", "de", "pl")
 * @param namespaces - Array of namespace prefixes
 * @returns Object with all translations for the requested namespaces
 *
 * @example
 * // Load both products and checkout translations
 * const translations = useQuery(api.ontologyTranslations.getMultipleNamespaces, {
 *   locale: "en",
 *   namespaces: ["ui.products", "ui.checkout"]
 * });
 */
export const getMultipleNamespaces = query({
  args: {
    locale: v.string(),
    namespaces: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) return {};

    const translations = await ctx.db
      .query("objects")
      .withIndex("by_org_type_locale", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
         .eq("locale", args.locale)
      )
      .collect();

    // Filter to only translations in requested namespaces
    const filteredTranslations = translations.filter(t =>
      args.namespaces.some(ns => t.name.startsWith(ns + "."))
    );

    const translationMap: Record<string, string> = {};
    filteredTranslations.forEach(t => {
      if (t.value) translationMap[t.name] = t.value;
    });

    return translationMap;
  },
});

/**
 * @deprecated Use getTranslationsByNamespace or getMultipleNamespaces instead.
 * This query will fail with >1024 translations.
 *
 * GET ALL TRANSLATIONS FOR LOCALE (as key-value map)
 */
export const getAllTranslations = query({
  args: { locale: v.string() },
  handler: async (_ctx, _args) => {
    // Return empty for now to prevent errors
    // Components should migrate to namespace-based loading
    console.warn("getAllTranslations is deprecated. Use getTranslationsByNamespace instead.");
    return {};
  },
});

/**
 * GET ALL TRANSLATION OBJECTS (for management UI)
 * Returns full translation objects with metadata, not just key-value pairs
 *
 * SECURITY: Requires authentication and view_translations permission
 */
export const getAllTranslationObjects = query({
  args: {
    sessionId: v.string(), // REQUIRED for authentication
    locale: v.optional(v.string()),
    type: v.optional(v.string()), // subtype filter (system, app, content)
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ✅ SECURITY: Authenticate user first
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // ✅ SECURITY: Check view_translations permission
    const hasPermission = await checkPermission(ctx, userId, "view_translations");
    if (!hasPermission) {
      throw new Error("Permission denied: You need 'view_translations' permission to view translations");
    }

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) return [];

    let translations;

    if (args.locale) {
      // Query by locale using index
      translations = await ctx.db
        .query("objects")
        .withIndex("by_org_type_locale", q =>
          q.eq("organizationId", systemOrg._id)
           .eq("type", "translation")
           .eq("locale", args.locale)
        )
        .collect();
    } else {
      // Query all translations
      translations = await ctx.db
        .query("objects")
        .withIndex("by_org_type", q =>
          q.eq("organizationId", systemOrg._id)
           .eq("type", "translation")
        )
        .collect();
    }

    // Apply filters
    let filtered = translations;

    if (args.type) {
      filtered = filtered.filter(t => t.subtype === args.type);
    }

    if (args.status) {
      filtered = filtered.filter(t => t.status === args.status);
    }

    return filtered;
  },
});

// ============================================================================
// TRANSLATION CRUD MUTATIONS
// ============================================================================

/**
 * CREATE TRANSLATION
 * Permission: manage_translations
 */
export const createTranslation = mutation({
  args: {
    sessionId: v.string(),
    type: v.string(), // "system", "app", "content"
    namespace: v.string(), // "desktop", "windows", etc.
    key: v.string(), // "welcome-icon"
    value: v.string(), // "Welcome"
    locale: v.string(), // "en", "de", "pl"
    status: v.optional(v.string()), // "approved", "pending", "needs_review"
  },
  handler: async (ctx, args) => {
    // ✅ SECURITY: Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // ✅ SECURITY: Check manage_translations permission
    const hasPermission = await checkPermission(ctx, userId, "manage_translations");
    if (!hasPermission) {
      throw new Error("Permission denied: You need 'manage_translations' permission to create translations");
    }

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    const translationId = await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "translation",
      subtype: args.type,
      name: `${args.namespace}.${args.key}`,
      value: args.value,
      locale: args.locale,
      status: args.status || "approved",
      customProperties: {
        namespace: args.namespace,
        key: args.key,
        createdBy: userId,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return translationId;
  },
});

/**
 * UPDATE TRANSLATION
 * Permission: manage_translations
 */
export const updateTranslation = mutation({
  args: {
    sessionId: v.string(),
    translationId: v.id("objects"),
    value: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ✅ SECURITY: Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // ✅ SECURITY: Check manage_translations permission
    const hasPermission = await checkPermission(ctx, userId, "manage_translations");
    if (!hasPermission) {
      throw new Error("Permission denied: You need 'manage_translations' permission to update translations");
    }

    const updates: Partial<{value: string; status: string; updatedAt: number}> = {
      updatedAt: Date.now(),
    };

    if (args.value !== undefined) updates.value = args.value;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.translationId, updates);
    return { success: true };
  },
});

/**
 * DELETE TRANSLATION
 * Permission: approve_translations (higher permission level for destructive action)
 */
export const deleteTranslation = mutation({
  args: {
    sessionId: v.string(),
    translationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // ✅ SECURITY: Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // ✅ SECURITY: Check approve_translations permission (delete requires approval permission)
    const hasPermission = await checkPermission(ctx, userId, "approve_translations");
    if (!hasPermission) {
      throw new Error("Permission denied: You need 'approve_translations' permission to delete translations");
    }

    await ctx.db.delete(args.translationId);
    return { success: true };
  },
});

/**
 * BULK IMPORT TRANSLATIONS
 * Permission: manage_translations
 */
export const bulkImportTranslations = mutation({
  args: {
    sessionId: v.string(),
    translations: v.array(v.object({
      type: v.string(),
      namespace: v.string(),
      key: v.string(),
      value: v.string(),
      locale: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // ✅ SECURITY: Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // ✅ SECURITY: Check manage_translations permission
    const hasPermission = await checkPermission(ctx, userId, "manage_translations");
    if (!hasPermission) {
      throw new Error("Permission denied: You need 'manage_translations' permission to import translations");
    }

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    const results = [];
    for (const translation of args.translations) {
      const id = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "translation",
        subtype: translation.type,
        name: `${translation.namespace}.${translation.key}`,
        value: translation.value,
        locale: translation.locale,
        status: "approved",
        customProperties: {
          namespace: translation.namespace,
          key: translation.key,
          importedBy: userId,
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      results.push(id);
    }

    return { imported: results.length };
  },
});
