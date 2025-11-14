/**
 * BACKEND TRANSLATION QUERIES
 *
 * Internal queries for fetching translations in actions.
 * These are used by backendTranslationHelper.ts
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get system organization
 */
export const getSystemOrganization = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();
  },
});

/**
 * Get translations by locale
 */
export const getTranslationsByLocale = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    locale: v.string(),
  },
  handler: async (ctx, { organizationId, locale }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type_locale", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("type", "translation")
          .eq("locale", locale)
      )
      .collect();
  },
});
