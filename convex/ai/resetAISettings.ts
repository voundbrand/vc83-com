/**
 * TEMPORARY: Helper to reset AI settings to trigger new system defaults logic
 *
 * Run this to clear your saved AI settings and force the UI to auto-select
 * system defaults instead of the old hardcoded 7 models.
 *
 * Usage: npx convex run ai/resetAISettings:resetForOrg --orgId "your-org-id"
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const resetForOrg = internalMutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Find existing AI settings
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.orgId))
      .first();

    if (!settings) {
      console.log(`No AI settings found for organization ${args.orgId}`);
      return { success: false, message: "No settings found" };
    }

    console.log(`Found settings with ${settings.llm.enabledModels?.length || 0} enabled models`);
    console.log(`Clearing enabled models to trigger new system defaults logic...`);

    // Clear the enabledModels array to force auto-selection of system defaults
    await ctx.db.patch(settings._id, {
      llm: {
        ...settings.llm,
        enabledModels: [],
        defaultModelId: undefined,
      },
    });

    console.log(`✅ Reset complete! Refresh the AI Settings tab to see system defaults.`);

    return {
      success: true,
      message: "AI settings reset. Refresh the page to see system defaults auto-selected.",
      previousCount: settings.llm.enabledModels?.length || 0,
    };
  },
});

export const resetAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all AI settings
    const allSettings = await ctx.db
      .query("organizationAiSettings")
      .collect();

    console.log(`Found ${allSettings.length} organizations with AI settings`);

    let resetCount = 0;
    for (const settings of allSettings) {
      if (settings.llm.enabledModels && settings.llm.enabledModels.length > 0) {
        await ctx.db.patch(settings._id, {
          llm: {
            ...settings.llm,
            enabledModels: [],
            defaultModelId: undefined,
          },
        });
        resetCount++;
      }
    }

    console.log(`✅ Reset ${resetCount} organizations. Refresh AI Settings tabs to see system defaults.`);

    return {
      success: true,
      message: `Reset ${resetCount} organizations`,
      totalOrgs: allSettings.length,
    };
  },
});
