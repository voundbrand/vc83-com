/**
 * DEBUG PRODUCTION - Check Translation Setup
 */

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const checkTranslationSetup = internalQuery({
  handler: async (ctx) => {
    // 1. Check if system org exists
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      return {
        error: "System organization not found",
        systemOrg: null,
        translationCount: 0,
        sampleTranslations: [],
      };
    }

    // 2. Count translation objects
    const allTranslations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .collect();

    // 3. Get sample CRM translations
    const crmTranslations = allTranslations.filter(t =>
      t.name.startsWith("ui.crm")
    );

    // 4. Get sample of first 10 CRM translations
    const sampleTranslations = crmTranslations.slice(0, 10).map(t => ({
      key: t.name,
      value: t.value,
      locale: t.locale,
    }));

    return {
      systemOrgId: systemOrg._id,
      systemOrgSlug: systemOrg.slug,
      totalTranslations: allTranslations.length,
      crmTranslations: crmTranslations.length,
      locales: [...new Set(allTranslations.map(t => t.locale))],
      sampleTranslations,
    };
  },
});

/**
 * CHECK WHAT A NAMESPACE QUERY RETURNS
 * Simulates what the frontend hook does
 */
export const testNamespaceQuery = internalQuery({
  args: {
    locale: v.string(),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) return { error: "No system org", translations: {} };

    // Try to use the same index as the real query
    let translations;
    let indexUsed = "unknown";

    try {
      // Try with the locale index
      translations = await ctx.db
        .query("objects")
        .withIndex("by_org_type_locale", q =>
          q.eq("organizationId", systemOrg._id)
           .eq("type", "translation")
           .eq("locale", args.locale)
        )
        .collect();
      indexUsed = "by_org_type_locale";
    } catch (error) {
      // Fallback to regular index
      const allTranslations = await ctx.db
        .query("objects")
        .withIndex("by_org_type", q =>
          q.eq("organizationId", systemOrg._id)
           .eq("type", "translation")
        )
        .collect();
      translations = allTranslations.filter(t => t.locale === args.locale);
      indexUsed = "by_org_type (filtered)";
    }

    // Filter to namespace
    const namespaceTranslations = translations.filter(t =>
      t.name.startsWith(args.namespace + ".")
    );

    const translationMap: Record<string, string> = {};
    namespaceTranslations.forEach(t => {
      if (t.value) translationMap[t.name] = t.value;
    });

    return {
      indexUsed,
      totalInLocale: translations.length,
      namespaceCount: namespaceTranslations.length,
      sampleKeys: Object.keys(translationMap).slice(0, 10),
      firstThreeTranslations: Object.entries(translationMap).slice(0, 3).map(([key, value]) => ({ key, value })),
    };
  },
});
