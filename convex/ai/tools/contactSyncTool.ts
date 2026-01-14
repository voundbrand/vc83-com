/**
 * AI Contact Sync Tool
 *
 * Syncs contacts from external providers (Microsoft/Google) to CRM
 * Uses AI for intelligent matching, merging, and deduplication
 */

import { action } from "../../_generated/server";
import type { ActionCtx } from "../../_generated/server";
import { v } from "convex/values";
import { internal, api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const contactSyncToolDefinition = {
  type: "function" as const,
  function: {
    name: "sync_contacts",
    description: "Sync contacts from Microsoft/Google to CRM. AI intelligently matches, merges, and creates contacts.",
    parameters: {
      type: "object" as const,
      properties: {
        provider: {
          type: "string",
          enum: ["microsoft", "google"],
          description: "Contact provider to sync from"
        },
        mode: {
          type: "string",
          enum: ["preview", "execute"],
          description: "preview = show what would sync, execute = actually sync"
        },
        filters: {
          type: "object",
          properties: {
            updatedSince: {
              type: "string",
              description: "ISO date - only sync contacts updated after this date"
            },
            categories: {
              type: "array",
              items: { type: "string" },
              description: "Specific categories/groups to sync"
            },
            maxContacts: {
              type: "number",
              description: "Limit number of contacts (default: 100)"
            }
          }
        },
        targetOrganization: {
          type: "string",
          description: "CRM organization ID to link contacts to (optional)"
        }
      },
      required: ["provider", "mode"]
    }
  }
};

// ============================================================================
// TYPES
// ============================================================================

interface ExternalContact {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  emailAddresses?: Array<{ address: string; name?: string }>;
  businessPhones?: string[];
  homePhones?: string[];
  mobilePhone?: string;
  companyName?: string;
  jobTitle?: string;
  officeLocation?: string;
  businessAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryOrRegion?: string;
  };
}

interface ContactMatch {
  action: "create" | "update" | "skip" | "merge";
  matchedContactId?: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  suggestedMerges?: Record<string, boolean>;
}

interface ContactSyncPreview {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceEmail: string;
  sourcePhone?: string;
  sourceCompany?: string;
  sourceJobTitle?: string;

  action: "create" | "update" | "skip" | "merge";
  existingContactId?: string;
  existingContact?: {
    name: string;
    email: string;
    phone?: string;
  };

  aiRecommendation: ContactMatch;
  status: "pending" | "approved" | "rejected" | "synced";
}

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeSyncContacts: ReturnType<typeof action> = action({
  args: {
    sessionId: v.string(),
    provider: v.string(),
    mode: v.string(),
    filters: v.optional(v.object({
      updatedSince: v.optional(v.string()),
      categories: v.optional(v.array(v.string())),
      maxContacts: v.optional(v.number())
    })),
    targetOrganization: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    mode?: string;
    syncId?: string;
    totalContacts: number;
    previews?: unknown[];
    stats?: Record<string, unknown>;
    message?: string;
    results?: unknown;
  }> => {
    // Get user session and organization
    const session = await ctx.runQuery(internal.stripeConnect.validateSession, {
      sessionId: args.sessionId
    });

    if (!session || !session.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const organizationId = session.organizationId;

    // Get OAuth connection
    const connection = await ctx.runQuery(api.oauth.microsoft.getUserMicrosoftConnection, {
      sessionId: args.sessionId
    });

    if (!connection) {
      throw new Error(
        `No ${args.provider} OAuth connection found. ` +
        `Please go to Settings > Integrations > Microsoft 365 to connect your account first. ` +
        `You need an active ${args.provider} connection to sync contacts.`
      );
    }

    // Fetch external contacts
    const externalContacts = await fetchExternalContacts(
      ctx,
      connection.id,
      args.provider,
      args.filters
    );

    if (externalContacts.length === 0) {
      return {
        success: true,
        message: "No contacts found to sync",
        totalContacts: 0,
        previews: []
      };
    }

    // Get existing CRM contacts for matching
    const existingContacts = await ctx.runQuery(api.crmOntology.getContacts, {
      sessionId: args.sessionId,
      organizationId: organizationId as Id<"organizations">
    });

    // Generate AI-powered matching previews
    const previews: ContactSyncPreview[] = [];

    for (const externalContact of externalContacts) {
      const preview = await analyzeContact(
        ctx,
        externalContact,
        existingContacts,
        args.provider
      );
      previews.push(preview);
    }

    // If preview mode, return previews
    if (args.mode === "preview") {
      // Store sync record for later execution
      const syncId = await ctx.runMutation(api.ai.contactSyncs.createSyncRecord, {
        organizationId: organizationId as Id<"organizations">,
        userId: session.userId,
        provider: args.provider,
        connectionId: connection.id,
        syncType: "manual",
        status: "preview",
        totalContacts: previews.length,
        previewData: previews
      });

      return {
        success: true,
        mode: "preview",
        syncId,
        totalContacts: previews.length,
        previews,
        stats: {
          toCreate: previews.filter(p => p.action === "create").length,
          toUpdate: previews.filter(p => p.action === "update").length,
          toSkip: previews.filter(p => p.action === "skip").length,
          highConfidence: previews.filter(p => p.aiRecommendation.confidence === "high").length,
          mediumConfidence: previews.filter(p => p.aiRecommendation.confidence === "medium").length,
          lowConfidence: previews.filter(p => p.aiRecommendation.confidence === "low").length,
        }
      };
    }

    // Execute mode - actually sync contacts
    if (args.mode === "execute") {
      // ⚡ PROFESSIONAL TIER: Contact Sync
      // Professional+ can sync contacts from external providers
      // Note: checkFeatureAccess requires QueryCtx, so we use runQuery here
      await ctx.runQuery(api.licensing.helpers.checkFeatureAccessQuery, {
        organizationId: organizationId as Id<"organizations">,
        featureName: "contactSyncEnabled",
      });

      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [] as Array<{ contact: string; error: string }>
      };

      for (const preview of previews) {
        try {
          if (preview.action === "skip") {
            results.skipped++;
            continue;
          }

          if (preview.action === "create") {
            await ctx.runMutation(api.crmOntology.createContact, {
              sessionId: args.sessionId,
              organizationId: organizationId as Id<"organizations">,
              subtype: "lead",
              firstName: preview.sourceName.split(" ")[0] || "",
              lastName: preview.sourceName.split(" ").slice(1).join(" ") || "",
              email: preview.sourceEmail,
              phone: preview.sourcePhone,
              jobTitle: preview.sourceJobTitle,
              company: preview.sourceCompany,
              source: "sync",
              sourceRef: `${args.provider}:${preview.sourceId}`
            });
            results.created++;
          } else if (preview.action === "update" && preview.existingContactId) {
            await ctx.runMutation(api.crmOntology.updateContact, {
              sessionId: args.sessionId,
              contactId: preview.existingContactId as Id<"objects">,
              updates: {
                phone: preview.sourcePhone,
                jobTitle: preview.sourceJobTitle,
                company: preview.sourceCompany
              }
            });
            results.updated++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            contact: preview.sourceName,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      // Update sync record
      // TODO: Pass syncId from preview mode or store in args
      // For now, we skip updating since we don't have the syncId from preview
      /* await ctx.runMutation(api.ai.contactSyncs.updateSyncRecord, {
        syncId: "" as Id<"objects">,
        status: "completed",
        stats: results
      }); */

      return {
        success: true,
        mode: "execute",
        totalContacts: results.created + results.updated + results.skipped,
        message: `Synced ${results.created + results.updated} contacts successfully`,
        results
      };
    }

    throw new Error(`Invalid mode: ${args.mode}`);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch contacts from external provider
 */
async function fetchExternalContacts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  connectionId: Id<"oauthConnections">,
  provider: string,
  filters?: {
    updatedSince?: string;
    categories?: string[];
    maxContacts?: number;
  }
): Promise<ExternalContact[]> {
  if (provider === "microsoft") {
    // Build query params
    let endpoint = "/me/contacts";
    const params: string[] = [];

    if (filters?.maxContacts) {
      params.push(`$top=${filters.maxContacts}`);
    }

    if (filters?.updatedSince) {
      params.push(`$filter=lastModifiedDateTime gt ${filters.updatedSince}`);
    }

    if (params.length > 0) {
      endpoint += `?${params.join("&")}`;
    }

    const response = await ctx.runAction(internal.oauth.graphClient.graphRequest, {
      connectionId,
      endpoint
    });

    return response.value || [];
  }

  if (provider === "google") {
    // TODO: Implement Google People API
    throw new Error("Google contacts sync not yet implemented");
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Analyze a contact and determine the best action
 */
async function analyzeContact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  externalContact: ExternalContact,
  existingContacts: Array<{ _id: Id<"objects">; name?: string; customProperties?: Record<string, unknown> }>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _provider: string
): Promise<ContactSyncPreview> {
  const primaryEmail = externalContact.emailAddresses?.[0]?.address || "";
  const primaryPhone = externalContact.mobilePhone || externalContact.businessPhones?.[0] || "";

  // Find potential matches by email (exact match)
  const emailMatch = existingContacts.find(
    c => {
      const email = c.customProperties?.email as string | undefined;
      return email?.toLowerCase() === primaryEmail.toLowerCase();
    }
  );

  if (emailMatch) {
    // Exact email match - suggest update
    return {
      id: crypto.randomUUID(),
      sourceId: externalContact.id,
      sourceName: externalContact.displayName,
      sourceEmail: primaryEmail,
      sourcePhone: primaryPhone,
      sourceCompany: externalContact.companyName,
      sourceJobTitle: externalContact.jobTitle,
      action: "update",
      existingContactId: emailMatch._id,
      existingContact: {
        name: emailMatch.name || "",
        email: (emailMatch.customProperties?.email as string | undefined) || "",
        phone: (emailMatch.customProperties?.phone as string | undefined) || ""
      },
      aiRecommendation: {
        action: "update",
        matchedContactId: emailMatch._id,
        confidence: "high",
        reason: "Exact email match found. Contact exists in CRM with same email address.",
        suggestedMerges: {
          phone: !emailMatch.customProperties?.phone && !!primaryPhone,
          jobTitle: !emailMatch.customProperties?.jobTitle && !!externalContact.jobTitle,
          company: !emailMatch.customProperties?.company && !!externalContact.companyName
        }
      },
      status: "pending"
    };
  }

  // No match found - suggest create
  return {
    id: crypto.randomUUID(),
    sourceId: externalContact.id,
    sourceName: externalContact.displayName,
    sourceEmail: primaryEmail,
    sourcePhone: primaryPhone,
    sourceCompany: externalContact.companyName,
    sourceJobTitle: externalContact.jobTitle,
    action: "create",
    aiRecommendation: {
      action: "create",
      confidence: "high",
      reason: "No matching contact found in CRM. Safe to create new contact.",
      suggestedMerges: {}
    },
    status: "pending"
  };
}

// Sync tracking functions moved to convex/ai/contactSyncs.ts
