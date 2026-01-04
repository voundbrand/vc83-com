/**
 * AI Forms Management Tool
 *
 * Comprehensive tool for managing forms, viewing responses, and analyzing statistics
 */

import { action } from "../../_generated/server";
import type { ActionCtx } from "../../_generated/server";
import { v } from "convex/values";
import { internal, api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const formsToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_forms",
    description: "Manage forms, view responses, and analyze statistics. Can list forms, get statistics, view responses, duplicate forms, and update form properties (name, description, status).",
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["list", "statistics", "responses", "duplicate", "update"],
          description: "Action to perform: list=show all forms, statistics=get form stats and ratings, responses=view form submissions, duplicate=copy existing form, update=modify form name/description/status"
        },
        formId: {
          type: "string",
          description: "Form ID - MUST be the exact 'id' value from the list action (e.g. 'k1234567890abcdef'), NOT the form name. Required for statistics, responses, duplicate, update actions."
        },
        formType: {
          type: "string",
          enum: ["registration", "survey", "application", "all"],
          description: "Filter forms by type (for list action)"
        },
        status: {
          type: "string",
          enum: ["draft", "published", "archived", "all"],
          description: "Filter forms by status (for list action), OR new status to set (for update action)"
        },
        includeRatings: {
          type: "boolean",
          description: "Include rating analysis (highest/lowest rated questions) - for statistics action"
        },
        name: {
          type: "string",
          description: "New name for the form (for update action)"
        },
        description: {
          type: "string",
          description: "New description for the form (for update action)"
        }
      },
      required: ["action"]
    }
  }
};

// ============================================================================
// TYPES
// ============================================================================

interface FormStatistics {
  formId: string;
  formName: string;
  totalResponses: number;
  completeResponses: number;
  partialResponses: number;
  completionRate: number;
  averageRatings?: Array<{
    question: string;
    fieldId: string;
    averageRating: number;
    maxRating: number;
    responseCount: number;
  }>;
  highestRated?: Array<{
    question: string;
    rating: number;
  }>;
  lowestRated?: Array<{
    question: string;
    rating: number;
  }>;
  submissionsByDate?: Record<string, number>;
}

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeManageForms = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    action: v.string(),
    formId: v.optional(v.string()),
    formType: v.optional(v.string()),
    status: v.optional(v.string()),
    includeRatings: v.optional(v.boolean()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: string;
    data?: unknown;
    message?: string;
    error?: string;
  }> => {
    // Get organization ID and userId either from session or directly
    let organizationId: Id<"organizations">;
    let userId: Id<"users"> | undefined = args.userId;
    let sessionId: string | undefined = args.sessionId;

    if (args.organizationId && args.userId) {
      // Direct organizationId and userId provided (e.g., from AI tools)
      organizationId = args.organizationId;
      userId = args.userId;
    } else if (args.sessionId) {
      // Get from session (e.g., from web frontend)
      const session = await ctx.runQuery(internal.stripeConnect.validateSession, {
        sessionId: args.sessionId
      });

      if (!session || !session.organizationId || !session.userId) {
        throw new Error("Invalid session or user must belong to an organization");
      }

      organizationId = session.organizationId;
      userId = session.userId;
    } else {
      throw new Error("Either sessionId or (organizationId and userId) must be provided");
    }

    // Use a placeholder sessionId for internal calls if needed
    if (!sessionId) {
      sessionId = "ai-internal-session";
    }

    try {
      switch (args.action) {
        case "list":
          return await listForms(ctx, sessionId, organizationId, args.formType, args.status);

        case "statistics":
          if (!args.formId) {
            throw new Error("formId is required for statistics action");
          }
          return await getFormStatistics(ctx, sessionId, args.formId, args.includeRatings);

        case "responses":
          if (!args.formId) {
            throw new Error("formId is required for responses action");
          }
          return await getFormResponsesData(ctx, sessionId, args.formId);

        case "duplicate":
          if (!args.formId) {
            throw new Error("formId is required for duplicate action");
          }
          if (!userId) {
            throw new Error("userId is required for duplicate action");
          }
          return await duplicateForm(ctx, sessionId, organizationId, userId, args.formId);

        case "update":
          if (!args.formId) {
            throw new Error("formId is required for update action");
          }
          if (!userId) {
            throw new Error("userId is required for update action");
          }
          if (!args.name && !args.description && !args.status) {
            throw new Error("At least one of name, description, or status must be provided for update action");
          }
          return await updateForm(ctx, sessionId, organizationId, userId, args.formId, {
            name: args.name,
            description: args.description,
            status: args.status
          });

        default:
          return {
            success: false,
            action: args.action,
            error: "Invalid action",
            message: "Action must be one of: list, statistics, responses, duplicate, update"
          };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        action: args.action,
        error: errorMessage,
        message: `Failed to ${args.action} forms: ${errorMessage}`
      };
    }
  }
});

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * List all forms for the organization
 */
async function listForms(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: string,
  organizationId: Id<"organizations">,
  formType?: string,
  status?: string
) {
  const forms = await ctx.runQuery(internal.formsOntology.internalGetForms, {
    organizationId,
    subtype: formType && formType !== "all" ? formType : undefined,
    status: status && status !== "all" ? status : undefined,
  });

  // Summarize forms
  const summary = forms.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(form: any) => ({
    id: form._id,
    name: form.name,
    type: form.subtype,
    status: form.status,
    description: form.description,
    totalResponses: form.customProperties?.stats?.submissions || 0,
    completionRate: form.customProperties?.stats?.completionRate || 0,
    createdAt: new Date(form.createdAt).toLocaleDateString(),
  }));

  return {
    success: true,
    action: "list",
    data: {
      forms: summary,
      totalForms: forms.length,
      breakdown: {
        byType: {
          registration: forms.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(f: any) => f.subtype === "registration").length,
          survey: forms.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(f: any) => f.subtype === "survey").length,
          application: forms.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(f: any) => f.subtype === "application").length,
        },
        byStatus: {
          draft: forms.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(f: any) => f.status === "draft").length,
          published: forms.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(f: any) => f.status === "published").length,
          archived: forms.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(f: any) => f.status === "archived").length,
        }
      }
    },
    message: `Found ${forms.length} forms. IMPORTANT: Each form has an 'id' field (like 'k1234567890abcdef') - you MUST use this exact 'id' value (not the 'name') when performing actions like duplicate or update on a specific form.`
  };
}

/**
 * Get comprehensive statistics for a form
 */
async function getFormStatistics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: string,
  formId: string,
  includeRatings?: boolean
): Promise<{ success: boolean; action: string; data: FormStatistics; message: string }> {
  // Get the form
  const form = await ctx.runQuery(internal.formsOntology.internalGetForm, {
    formId: formId as Id<"objects">,
  });

  // Get all responses
  const responses = await ctx.runQuery(internal.formsOntology.internalGetFormResponses, {
    formId: formId as Id<"objects">,
  });

  const completeResponses = responses.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(r: any) => r.status === "complete");
  const partialResponses = responses.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(r: any) => r.status === "partial");

  const stats: FormStatistics = {
    formId,
    formName: form.name,
    totalResponses: responses.length,
    completeResponses: completeResponses.length,
    partialResponses: partialResponses.length,
    completionRate: responses.length > 0
      ? Math.round((completeResponses.length / responses.length) * 100)
      : 0,
  };

  // Analyze ratings if requested
  if (includeRatings) {
    const formSchema = form.customProperties?.formSchema;
    if (formSchema?.fields) {
      const ratingFields = formSchema.fields.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(f: any) => f.type === "rating");

      if (ratingFields.length > 0) {
        const ratingStats = [];

        for (const field of ratingFields) {
          const fieldResponses = completeResponses
            .map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(r: any) => r.customProperties?.responses?.[field.id])
            .filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(val: any) => val !== undefined && val !== null);

          if (fieldResponses.length > 0) {
            const sum = fieldResponses.reduce((acc: number, val: number) => acc + Number(val), 0);
            const average = sum / fieldResponses.length;

            ratingStats.push({
              question: field.label || field.placeholder || "Untitled Question",
              fieldId: field.id,
              averageRating: Math.round(average * 100) / 100,
              maxRating: field.settings?.maxRating || 5,
              responseCount: fieldResponses.length,
            });
          }
        }

        // Sort by rating
        const sorted = ratingStats.sort((a, b) => b.averageRating - a.averageRating);

        stats.averageRatings = ratingStats;
        stats.highestRated = sorted.slice(0, 3).map(r => ({
          question: r.question,
          rating: r.averageRating
        }));
        stats.lowestRated = sorted.slice(-3).reverse().map(r => ({
          question: r.question,
          rating: r.averageRating
        }));
      }
    }
  }

  // Submissions by date
  const submissionsByDate: Record<string, number> = {};
  completeResponses.forEach(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(r: any) => {
    const date = new Date(r.createdAt).toLocaleDateString();
    submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
  });
  stats.submissionsByDate = submissionsByDate;

  return {
    success: true,
    action: "statistics",
    data: stats,
    message: `Statistics for "${form.name}"`
  };
}

/**
 * Get form responses with details
 */
async function getFormResponsesData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: string,
  formId: string
) {
  const form = await ctx.runQuery(internal.formsOntology.internalGetForm, {
    formId: formId as Id<"objects">,
  });

  const responses = await ctx.runQuery(internal.formsOntology.internalGetFormResponses, {
    formId: formId as Id<"objects">,
  });

  // Format responses for readability
  const formattedResponses = responses.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(r: any) => ({
    id: r._id,
    status: r.status,
    submittedAt: new Date(r.createdAt).toLocaleString(),
    submittedBy: r.name,
    responses: r.customProperties?.responses || {},
    metadata: {
      duration: r.customProperties?.duration,
      userAgent: r.customProperties?.userAgent,
    }
  }));

  return {
    success: true,
    action: "responses",
    data: {
      formName: form.name,
      totalResponses: responses.length,
      responses: formattedResponses,
    },
    message: `Retrieved ${responses.length} responses for "${form.name}"`
  };
}

/**
 * Duplicate an existing form
 */
async function duplicateForm(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: string,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  formId: string
) {
  // Use internal mutation if no valid sessionId (AI tools)
  let result;
  if (sessionId === "ai-internal-session") {
    result = await ctx.runMutation(internal.formsOntology.internalDuplicateForm, {
      userId,
      organizationId,
      formId: formId as Id<"objects">,
    });
  } else {
    result = await ctx.runMutation(api.formsOntology.duplicateForm, {
      sessionId,
      formId: formId as Id<"objects">,
    });
  }

  return {
    success: true,
    action: "duplicate",
    data: {
      originalFormId: formId,
      newFormId: result,
    },
    message: `Successfully duplicated form. New form ID: ${result}`
  };
}

/**
 * Update form properties (name, description, status)
 */
async function updateForm(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: string,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  formId: string,
  updates: {
    name?: string;
    description?: string;
    status?: string;
  }
) {
  // Use internal mutation if no valid sessionId (AI tools)
  if (sessionId === "ai-internal-session") {
    await ctx.runMutation(internal.formsOntology.internalUpdateForm, {
      userId,
      organizationId,
      formId: formId as Id<"objects">,
      ...updates
    });
  } else {
    // For web UI with session - we'd need to add a regular updateForm mutation
    // For now, just use the internal one since we have userId
    await ctx.runMutation(internal.formsOntology.internalUpdateForm, {
      userId,
      organizationId,
      formId: formId as Id<"objects">,
      ...updates
    });
  }

  const updatedFields = [];
  if (updates.name) updatedFields.push(`name to "${updates.name}"`);
  if (updates.description) updatedFields.push("description");
  if (updates.status) updatedFields.push(`status to "${updates.status}"`);

  return {
    success: true,
    action: "update",
    data: {
      formId,
      updates
    },
    message: `Successfully updated form ${updatedFields.join(", ")}`
  };
}
