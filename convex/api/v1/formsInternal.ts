/**
 * INTERNAL FORMS QUERIES
 *
 * Internal queries used by the forms API endpoints.
 */

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * GET FORM INTERNAL
 * Returns form schema without requiring session authentication
 */
export const getFormInternal = internalQuery({
  args: {
    formId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get form
    const form = await ctx.db.get(args.formId);

    if (!form || form.type !== "form") {
      return null;
    }

    // Verify organization ownership
    if (form.organizationId !== args.organizationId) {
      return null;
    }

    const customProps = form.customProperties as Record<string, unknown> | undefined;

    // Transform for API response
    return {
      id: form._id,
      organizationId: form.organizationId, // ✅ Added for frontend
      name: form.name,
      description: form.description,
      status: form.status,
      subtype: form.subtype, // ✅ Added: form type (survey, registration, etc.)
      fields: (customProps?.fields as unknown[]) || [],
      settings: (customProps?.settings as Record<string, unknown>) || {
        submitButtonText: "Submit",
        successMessage: "Form submitted successfully",
      },
      translations: (customProps?.translations as Record<string, unknown>) || {},
      customProperties: {
        formSchema: customProps?.formSchema, // ✅ Added: Full form schema for frontend
        ...customProps, // Include other custom properties
      },
    };
  },
});
