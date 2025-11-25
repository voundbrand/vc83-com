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

/**
 * CHECK RATE LIMIT
 * Count recent form submissions from a specific IP address
 *
 * Used for rate limiting public form submissions
 * Returns the number of submissions from this IP for this form since the given timestamp
 */
export const checkRateLimit = internalQuery({
  args: {
    formId: v.id("objects"),
    ipAddress: v.string(),
    since: v.number(), // Timestamp - check submissions after this time
  },
  handler: async (ctx, args) => {
    // Get all form responses for this form
    const allResponses = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "formResponse"))
      .collect();

    // Filter by formId, IP address, and time window
    const recentSubmissions = allResponses.filter((response) => {
      const customProps = response.customProperties as Record<string, unknown> | undefined;
      const responseFormId = customProps?.formId;
      const responseIp = customProps?.ipAddress as string | undefined;
      const submittedAt = customProps?.submittedAt as number | undefined;

      return (
        responseFormId === args.formId &&
        responseIp === args.ipAddress &&
        submittedAt &&
        submittedAt >= args.since
      );
    });

    return recentSubmissions.length;
  },
});
