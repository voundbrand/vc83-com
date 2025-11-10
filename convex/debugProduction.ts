/**
 * DEBUG PRODUCTION - Check Translation Setup
 */

import { internalQuery } from "./_generated/server";

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
      sampleTranslations,
      locales: [...new Set(allTranslations.map(t => t.locale))],
    };
  },
});
