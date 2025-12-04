/**
 * AI Forms Management Tool
 *
 * Comprehensive tool for managing forms, viewing responses, and analyzing statistics
 */

import { action } from "../../_generated/server";
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
    description: "Manage forms, view responses, and analyze statistics. Can list forms, get statistics, view responses, and duplicate forms.",
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["list", "statistics", "responses", "duplicate"],
          description: "Action to perform: list=show all forms, statistics=get form stats and ratings, responses=view form submissions, duplicate=copy existing form"
        },
        formId: {
          type: "string",
          description: "Form ID (required for statistics, responses, duplicate actions)"
        },
        formType: {
          type: "string",
          enum: ["registration", "survey", "application", "all"],
          description: "Filter forms by type (for list action)"
        },
        status: {
          type: "string",
          enum: ["draft", "published", "archived", "all"],
          description: "Filter forms by status (for list action)"
        },
        includeRatings: {
          type: "boolean",
          description: "Include rating analysis (highest/lowest rated questions) - for statistics action"
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
    action: v.string(),
    formId: v.optional(v.string()),
    formType: v.optional(v.string()),
    status: v.optional(v.string()),
    includeRatings: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: string;
    data?: any;
    message?: string;
    error?: string;
  }> => {
    // Get organization ID either from session or directly
    let organizationId: Id<"organizations">;
    let sessionId: string | undefined = args.sessionId;

    if (args.organizationId) {
      // Direct organizationId provided (e.g., from AI tools)
      organizationId = args.organizationId;
    } else if (args.sessionId) {
      // Get from session (e.g., from web frontend)
      const session = await ctx.runQuery(internal.stripeConnect.validateSession, {
        sessionId: args.sessionId
      });

      if (!session || !session.organizationId) {
        throw new Error("Invalid session or user must belong to an organization");
      }

      organizationId = session.organizationId;
    } else {
      throw new Error("Either sessionId or organizationId must be provided");
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
          return await duplicateForm(ctx, sessionId, args.formId);

        default:
          return {
            success: false,
            action: args.action,
            error: "Invalid action",
            message: "Action must be one of: list, statistics, responses, duplicate"
          };
      }
    } catch (error: any) {
      return {
        success: false,
        action: args.action,
        error: error.message,
        message: `Failed to ${args.action} forms: ${error.message}`
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
  ctx: any,
  sessionId: string,
  organizationId: Id<"organizations">,
  formType?: string,
  status?: string
) {
  const forms = await ctx.runQuery(api.formsOntology.getForms, {
    sessionId,
    organizationId,
    subtype: formType && formType !== "all" ? formType : undefined,
    status: status && status !== "all" ? status : undefined,
  });

  // Summarize forms
  const summary = forms.map((form: any) => ({
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
          registration: forms.filter((f: any) => f.subtype === "registration").length,
          survey: forms.filter((f: any) => f.subtype === "survey").length,
          application: forms.filter((f: any) => f.subtype === "application").length,
        },
        byStatus: {
          draft: forms.filter((f: any) => f.status === "draft").length,
          published: forms.filter((f: any) => f.status === "published").length,
          archived: forms.filter((f: any) => f.status === "archived").length,
        }
      }
    },
    message: `Found ${forms.length} forms`
  };
}

/**
 * Get comprehensive statistics for a form
 */
async function getFormStatistics(
  ctx: any,
  sessionId: string,
  formId: string,
  includeRatings?: boolean
): Promise<{ success: boolean; action: string; data: FormStatistics; message: string }> {
  // Get the form
  const form = await ctx.runQuery(api.formsOntology.getForm, {
    sessionId,
    formId: formId as Id<"objects">,
  });

  // Get all responses
  const responses = await ctx.runQuery(api.formsOntology.getFormResponses, {
    sessionId,
    formId: formId as Id<"objects">,
  });

  const completeResponses = responses.filter((r: any) => r.status === "complete");
  const partialResponses = responses.filter((r: any) => r.status === "partial");

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
      const ratingFields = formSchema.fields.filter((f: any) => f.type === "rating");

      if (ratingFields.length > 0) {
        const ratingStats = [];

        for (const field of ratingFields) {
          const fieldResponses = completeResponses
            .map((r: any) => r.customProperties?.responses?.[field.id])
            .filter((val: any) => val !== undefined && val !== null);

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
  completeResponses.forEach((r: any) => {
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
  ctx: any,
  sessionId: string,
  formId: string
) {
  const form = await ctx.runQuery(api.formsOntology.getForm, {
    sessionId,
    formId: formId as Id<"objects">,
  });

  const responses = await ctx.runQuery(api.formsOntology.getFormResponses, {
    sessionId,
    formId: formId as Id<"objects">,
  });

  // Format responses for readability
  const formattedResponses = responses.map((r: any) => ({
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
  ctx: any,
  sessionId: string,
  formId: string
) {
  const result = await ctx.runMutation(api.formsOntology.duplicateForm, {
    sessionId,
    formId: formId as Id<"objects">,
  });

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
