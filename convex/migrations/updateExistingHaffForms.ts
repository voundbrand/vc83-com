/**
 * UPDATE EXISTING HAFF SYMPOSIUM FORMS
 *
 * This migration updates any existing HaffSymposium forms with the correct schema
 * including all field definitions from the template.
 *
 * Run with: npx convex run migrations/updateExistingHaffForms:updateExistingHaffForms
 */

import { mutation } from "../_generated/server";
import { haffSymposiumFormSchema } from "../../src/templates/forms/haffsymposium-registration/schema";

export const updateExistingHaffForms = mutation({
  args: {},
  handler: async (ctx) => {
    // Find all forms with templateCode = "haffsymposium-registration"
    const allForms = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "form"))
      .collect();

    const haffForms = allForms.filter((form) => {
      const formSchema = form.customProperties?.formSchema as {
        templateCode?: string;
      } | undefined;
      return formSchema?.templateCode === "haffsymposium-registration";
    });

    console.log(`Found ${haffForms.length} HaffSymposium forms to update`);

    let updatedCount = 0;

    for (const form of haffForms) {
      const existingSchema = form.customProperties?.formSchema as {
        version?: string;
        templateCode?: string;
        themeCode?: string;
        fields?: unknown[];
        settings?: Record<string, unknown>;
      } | undefined;

      // Merge existing data with the proper schema from template
      const updatedSchema = {
        ...haffSymposiumFormSchema, // Use the full schema from template
        templateCode: existingSchema?.templateCode || "haffsymposium-registration",
        themeCode: existingSchema?.themeCode || "modern-gradient",
      };

      await ctx.db.patch(form._id, {
        customProperties: {
          ...form.customProperties,
          formSchema: updatedSchema,
        },
        updatedAt: Date.now(),
      });

      updatedCount++;
      console.log(`Updated form: ${form.name} (${form._id})`);
    }

    return {
      success: true,
      message: `Updated ${updatedCount} HaffSymposium forms with proper schema`,
      formsUpdated: haffForms.map((f) => ({ id: f._id, name: f.name })),
    };
  },
});
