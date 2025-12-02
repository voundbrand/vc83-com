/**
 * UPDATE L4YERCAK3 BRANDING TO LOWERCASE
 *
 * This file contains mutations to UPDATE existing translations
 * from uppercase "L4YERCAK3" to lowercase "l4yercak3"
 *
 * Unlike seed scripts (which only insert), these update existing records.
 */

import { internalMutation } from "../_generated/server";

/**
 * Update all translations containing "L4YERCAK3" to "l4yercak3"
 */
export const updateAllUppercaseReferences = internalMutation({
  handler: async (ctx) => {
    console.log("🔄 Updating all L4YERCAK3 references to l4yercak3...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Find all translations with uppercase L4YERCAK3
    const translations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .collect();

    let updateCount = 0;

    for (const trans of translations) {
      const value = trans.value;

      if (typeof value === "string" && value.includes("L4YERCAK3")) {
        // Replace uppercase with lowercase
        const newValue = value.replace(/L4YERCAK3/g, "l4yercak3");

        await ctx.db.patch(trans._id, {
          value: newValue,
          updatedAt: Date.now(),
        });

        updateCount++;
        console.log(`  Updated: ${trans.name} (${trans.locale}): "${value}" -> "${newValue}"`);
      }
    }

    console.log(`✅ Updated ${updateCount} translations`);
    return { success: true, updateCount };
  }
});

/**
 * Update specific translation: "L4YERCAK3 Shop" -> "l4yercak3 Shop"
 */
export const updateShopName = internalMutation({
  handler: async (ctx) => {
    console.log("🔄 Updating Shop name...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Find shop name translations
    const translations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .filter(q => q.eq(q.field("name"), "ui.app.ai_subscriptions"))
      .collect();

    let updateCount = 0;

    for (const trans of translations) {
      if (trans.value === "L4YERCAK3 Shop") {
        await ctx.db.patch(trans._id, {
          value: "l4yercak3 Shop",
          updatedAt: Date.now(),
        });
        updateCount++;
      }
    }

    console.log(`✅ Updated ${updateCount} shop name translations`);
    return { success: true, updateCount };
  }
});

/**
 * Update specific translation: "L4YERCAK3.exe" -> "l4yercak3.exe"
 */
export const updateWelcomeTitle = internalMutation({
  handler: async (ctx) => {
    console.log("🔄 Updating Welcome window title...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Find welcome title translations
    const translations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .filter(q => q.eq(q.field("name"), "ui.desktop.window_title.welcome"))
      .collect();

    let updateCount = 0;

    for (const trans of translations) {
      if (trans.value === "L4YERCAK3.exe") {
        await ctx.db.patch(trans._id, {
          value: "l4yercak3.exe",
          updatedAt: Date.now(),
        });
        updateCount++;
      }
    }

    console.log(`✅ Updated ${updateCount} welcome title translations`);
    return { success: true, updateCount };
  }
});
