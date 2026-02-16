/**
 * AI Benefits Management Tool
 *
 * Comprehensive tool for managing benefits and commissions through natural language.
 *
 * Handles:
 * - Benefits: discounts, services, products, events offered by members
 * - Commissions: sales, consulting, referral, partnership opportunities
 * - Claims: member claims on benefits
 * - Payouts: commission payouts to members
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const benefitsToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_benefits",
    description: `Comprehensive benefits and commissions management: create benefits, list benefits, create commissions, manage claims, track payouts.

BENEFIT TYPES:
- "discount" - Percentage or fixed discount offered to members
- "service" - Free or discounted service
- "product" - Free or discounted product
- "event" - Event invitation or access

COMMISSION TYPES:
- "sales" - Sales referral commission
- "consulting" - Consulting referral
- "referral" - General referral program
- "partnership" - Partnership opportunity

STATUS WORKFLOW:
- "draft" - Not yet published
- "active" - Visible and available
- "paused" - Temporarily unavailable
- "expired" - Past expiration date
- "archived" - No longer available

Use this tool to:
1. List available benefits for members
2. Create new benefits or commissions
3. Submit or manage claims on benefits
4. Track commission payouts
5. Update benefit/commission status`,
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "list_benefits",
            "get_benefit",
            "create_benefit",
            "update_benefit",
            "list_commissions",
            "get_commission",
            "create_commission",
            "update_commission",
            "list_claims",
            "create_claim",
            "update_claim",
            "list_payouts",
            "my_claims",
            "my_earnings"
          ],
          description: "Action to perform"
        },
        mode: {
          type: "string",
          enum: ["preview", "execute"],
          description: "preview = show what will be created/updated (default), execute = actually perform the operation. ALWAYS use preview first to show user what will happen!"
        },
        workItemId: {
          type: "string",
          description: "Work item ID (for execute mode - returned from preview)"
        },
        // Benefit fields
        benefitId: {
          type: "string",
          description: "Benefit ID (required for get_benefit, update_benefit, list_claims, create_claim)"
        },
        subtype: {
          type: "string",
          enum: ["discount", "service", "product", "event"],
          description: "Benefit subtype (for create_benefit)"
        },
        name: {
          type: "string",
          description: "Benefit or commission name"
        },
        description: {
          type: "string",
          description: "Benefit or commission description"
        },
        discountValue: {
          type: "string",
          description: "Discount value, e.g., '20%' or '$50'"
        },
        category: {
          type: "string",
          description: "Category for organizing benefits"
        },
        validFrom: {
          type: "string",
          description: "Start date in ISO 8601 format"
        },
        validUntil: {
          type: "string",
          description: "End date in ISO 8601 format"
        },
        maxTotalClaims: {
          type: "number",
          description: "Maximum total claims allowed"
        },
        maxClaimsPerMember: {
          type: "number",
          description: "Maximum claims per member"
        },
        requirements: {
          type: "string",
          description: "Requirements to claim the benefit"
        },
        contactEmail: {
          type: "string",
          description: "Contact email for inquiries"
        },
        contactPhone: {
          type: "string",
          description: "Contact phone for inquiries"
        },
        status: {
          type: "string",
          enum: ["draft", "active", "paused", "expired", "archived"],
          description: "Benefit/commission status"
        },
        // Commission fields
        commissionId: {
          type: "string",
          description: "Commission ID (required for get_commission, update_commission, list_payouts)"
        },
        commissionSubtype: {
          type: "string",
          enum: ["sales", "consulting", "referral", "partnership"],
          description: "Commission subtype (for create_commission)"
        },
        commissionRate: {
          type: "string",
          description: "Commission rate, e.g., '10%' or '$100'"
        },
        minDealSize: {
          type: "number",
          description: "Minimum deal size for commission"
        },
        maxDealSize: {
          type: "number",
          description: "Maximum deal size for commission"
        },
        payoutTerms: {
          type: "string",
          description: "Payment terms description"
        },
        // Claim fields
        claimId: {
          type: "string",
          description: "Claim ID (for update_claim)"
        },
        claimDetails: {
          type: "string",
          description: "Details about the claim (for create_claim)"
        },
        claimStatus: {
          type: "string",
          enum: ["pending", "approved", "rejected", "redeemed"],
          description: "Claim status (for update_claim)"
        },
        // Filters
        filterSubtype: {
          type: "string",
          description: "Filter by subtype"
        },
        filterCategory: {
          type: "string",
          description: "Filter by category"
        },
        filterStatus: {
          type: "string",
          description: "Filter by status"
        },
        includeInactive: {
          type: "boolean",
          description: "Include inactive items in list"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 20)"
        }
      },
      required: ["action"]
    }
  }
};

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeManageBenefits = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")),
    action: v.string(),
    mode: v.optional(v.string()),
    workItemId: v.optional(v.string()),
    // Benefit fields
    benefitId: v.optional(v.string()),
    subtype: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    discountValue: v.optional(v.string()),
    category: v.optional(v.string()),
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    maxTotalClaims: v.optional(v.number()),
    maxClaimsPerMember: v.optional(v.number()),
    requirements: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    status: v.optional(v.string()),
    // Commission fields
    commissionId: v.optional(v.string()),
    commissionSubtype: v.optional(v.string()),
    commissionRate: v.optional(v.string()),
    minDealSize: v.optional(v.number()),
    maxDealSize: v.optional(v.number()),
    payoutTerms: v.optional(v.string()),
    // Claim fields
    claimId: v.optional(v.string()),
    claimDetails: v.optional(v.string()),
    claimStatus: v.optional(v.string()),
    // Filters
    filterSubtype: v.optional(v.string()),
    filterCategory: v.optional(v.string()),
    filterStatus: v.optional(v.string()),
    includeInactive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: string;
    mode?: string;
    workItemId?: string;
    workItemType?: string;
    data?: any;
    message?: string;
    error?: string;
  }> => {
    // Get organization ID and userId
    let organizationId: Id<"organizations">;
    let userId: Id<"users"> | undefined = args.userId;
    let sessionId: string | undefined = args.sessionId;

    if (args.organizationId && args.userId) {
      organizationId = args.organizationId;
      userId = args.userId;
    } else if (args.sessionId) {
      const session = await (ctx as any).runQuery(generatedApi.internal.stripeConnect.validateSession, {
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

    if (!sessionId) {
      sessionId = "ai-internal-session";
    }

    try {
      switch (args.action) {
        case "list_benefits":
          return await listBenefits(ctx, organizationId, sessionId, args);

        case "get_benefit":
          if (!args.benefitId) {
            throw new Error("benefitId is required for get_benefit");
          }
          return await getBenefit(ctx, organizationId, sessionId, args);

        case "create_benefit":
          if (!args.subtype || !args.name) {
            throw new Error("subtype and name are required for create_benefit");
          }
          if (!userId) {
            throw new Error("userId is required for create_benefit");
          }
          return await createBenefit(ctx, organizationId, userId, sessionId, args);

        case "update_benefit":
          if (!args.benefitId) {
            throw new Error("benefitId is required for update_benefit");
          }
          if (!userId) {
            throw new Error("userId is required for update_benefit");
          }
          return await updateBenefit(ctx, organizationId, userId, sessionId, args);

        case "list_commissions":
          return await listCommissions(ctx, organizationId, sessionId, args);

        case "get_commission":
          if (!args.commissionId) {
            throw new Error("commissionId is required for get_commission");
          }
          return await getCommission(ctx, organizationId, sessionId, args);

        case "create_commission":
          if (!args.commissionSubtype || !args.name) {
            throw new Error("commissionSubtype and name are required for create_commission");
          }
          if (!userId) {
            throw new Error("userId is required for create_commission");
          }
          return await createCommission(ctx, organizationId, userId, sessionId, args);

        case "update_commission":
          if (!args.commissionId) {
            throw new Error("commissionId is required for update_commission");
          }
          if (!userId) {
            throw new Error("userId is required for update_commission");
          }
          return await updateCommission(ctx, organizationId, userId, sessionId, args);

        case "list_claims":
          return await listClaims(ctx, organizationId, sessionId, args);

        case "create_claim":
          if (!args.benefitId) {
            throw new Error("benefitId is required for create_claim");
          }
          if (!userId) {
            throw new Error("userId is required for create_claim");
          }
          return await createClaim(ctx, organizationId, userId, sessionId, args);

        case "update_claim":
          if (!args.claimId) {
            throw new Error("claimId is required for update_claim");
          }
          if (!userId) {
            throw new Error("userId is required for update_claim");
          }
          return await updateClaim(ctx, organizationId, userId, sessionId, args);

        case "list_payouts":
          return await listPayouts(ctx, organizationId, sessionId, args);

        case "my_claims":
          return await getMyClaims(ctx, organizationId, sessionId, args);

        case "my_earnings":
          return await getMyEarnings(ctx, organizationId, sessionId, args);

        default:
          return {
            success: false,
            action: args.action,
            error: "Invalid action",
            message: "Action must be one of: list_benefits, get_benefit, create_benefit, update_benefit, list_commissions, get_commission, create_commission, update_commission, list_claims, create_claim, update_claim, list_payouts, my_claims, my_earnings"
          };
      }
    } catch (error: any) {
      return {
        success: false,
        action: args.action,
        error: error.message,
        message: `Failed to ${args.action}: ${error.message}`
      };
    }
  }
});

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * List benefits for the organization
 */
async function listBenefits(
  ctx: any,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: any
) {
  const benefits = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.benefitsInternal.listBenefitsInternal,
    {
      organizationId,
      subtype: args.filterSubtype,
      category: args.filterCategory,
      status: args.filterStatus,
      limit: args.limit || 20,
      includeInactive: args.includeInactive,
    }
  );

  const formattedBenefits = benefits.map((b: any) => ({
    id: b._id,
    name: b.name,
    subtype: b.subtype,
    status: b.status,
    discountValue: b.customProperties?.discountValue,
    category: b.customProperties?.category,
    claimCount: b.claimCount || 0,
    validUntil: b.customProperties?.validUntil,
  }));

  return {
    success: true,
    action: "list_benefits",
    data: {
      items: formattedBenefits,
      total: formattedBenefits.length,
    },
    message: `Found ${formattedBenefits.length} benefit(s)`
  };
}

/**
 * Get a single benefit by ID
 */
async function getBenefit(
  ctx: any,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: any
) {
  const benefit = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.benefitsInternal.getBenefitInternal,
    {
      organizationId,
      benefitId: args.benefitId,
    }
  );

  if (!benefit) {
    return {
      success: false,
      action: "get_benefit",
      error: "Benefit not found",
      message: `No benefit found with ID: ${args.benefitId}`
    };
  }

  return {
    success: true,
    action: "get_benefit",
    data: {
      id: benefit._id,
      name: benefit.name,
      subtype: benefit.subtype,
      description: benefit.description,
      status: benefit.status,
      discountValue: benefit.customProperties?.discountValue,
      category: benefit.customProperties?.category,
      validFrom: benefit.customProperties?.validFrom,
      validUntil: benefit.customProperties?.validUntil,
      maxTotalClaims: benefit.customProperties?.maxTotalClaims,
      maxClaimsPerMember: benefit.customProperties?.maxClaimsPerMember,
      requirements: benefit.customProperties?.requirements,
      contactEmail: benefit.customProperties?.contactEmail,
      contactPhone: benefit.customProperties?.contactPhone,
      offerer: benefit.offerer,
      claimCount: benefit.claimCount,
    },
    message: `Benefit: ${benefit.name}`
  };
}

/**
 * Create a new benefit
 */
async function createBenefit(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  sessionId: string,
  args: any
) {
  const mode = args.mode || "preview";

  // EXECUTE MODE: In execute mode, args should already contain all the values
  // that were previewed. The workItemId is used for tracking purposes only.
  // Actions don't have direct DB access, so we rely on the caller to pass
  // all needed parameters in execute mode.

  // PREVIEW MODE: Show what will be created
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "benefit",
      name: args.name,
      status: "preview",
      details: {
        subtype: args.subtype,
        description: args.description,
        discountValue: args.discountValue,
        category: args.category,
        validFrom: args.validFrom,
        validUntil: args.validUntil,
        maxTotalClaims: args.maxTotalClaims,
        maxClaimsPerMember: args.maxClaimsPerMember,
        requirements: args.requirements,
        contactEmail: args.contactEmail,
        contactPhone: args.contactPhone,
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New benefit will be created",
        changes: {
          name: { old: null, new: args.name },
          subtype: { old: null, new: args.subtype },
          discountValue: { old: null, new: args.discountValue || "Not specified" },
          status: { old: null, new: "draft" },
        }
      }
    };

    // Create work item for tracking
    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "benefit_create",
        name: `Create Benefit - ${args.name}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_benefit",
      mode: "preview",
      workItemId,
      workItemType: "benefit_create",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1, toUpdate: 0, toSkip: 0 }
      },
      message: `📋 Ready to create benefit "${args.name}". Review the details and approve to proceed.`
    };
  }

  // EXECUTE MODE: Actually create the benefit
  const benefitId = await (ctx as any).runMutation(
    generatedApi.internal.api.v1.benefitsInternal.createBenefitInternal,
    {
      organizationId,
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      discountValue: args.discountValue,
      category: args.category,
      validFrom: args.validFrom ? new Date(args.validFrom).getTime() : undefined,
      validUntil: args.validUntil ? new Date(args.validUntil).getTime() : undefined,
      maxTotalClaims: args.maxTotalClaims,
      maxClaimsPerMember: args.maxClaimsPerMember,
      requirements: args.requirements,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      createdBy: userId,
    }
  );

  // Update work item to completed
  if (args.workItemId) {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { benefitId },
      }
    );
  }

  return {
    success: true,
    action: "create_benefit",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: benefitId,
        type: "benefit",
        name: args.name,
        status: "completed",
        details: {
          subtype: args.subtype,
        }
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Created benefit: ${args.name}`
  };
}

/**
 * Update an existing benefit
 */
async function updateBenefit(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  sessionId: string,
  args: any
) {
  const mode = args.mode || "preview";

  // Get current benefit for comparison
  const currentBenefit = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.benefitsInternal.getBenefitInternal,
    {
      organizationId,
      benefitId: args.benefitId,
    }
  );

  if (!currentBenefit) {
    return {
      success: false,
      action: "update_benefit",
      error: "Benefit not found",
      message: `No benefit found with ID: ${args.benefitId}`
    };
  }

  // Build updates object
  const updates: Record<string, any> = {};
  if (args.name) updates.name = args.name;
  if (args.description) updates.description = args.description;
  if (args.status) updates.status = args.status;
  if (args.discountValue) updates.discountValue = args.discountValue;
  if (args.category) updates.category = args.category;
  if (args.validFrom) updates.validFrom = new Date(args.validFrom).getTime();
  if (args.validUntil) updates.validUntil = new Date(args.validUntil).getTime();
  if (args.maxTotalClaims !== undefined) updates.maxTotalClaims = args.maxTotalClaims;
  if (args.maxClaimsPerMember !== undefined) updates.maxClaimsPerMember = args.maxClaimsPerMember;
  if (args.requirements) updates.requirements = args.requirements;
  if (args.contactEmail) updates.contactEmail = args.contactEmail;
  if (args.contactPhone) updates.contactPhone = args.contactPhone;

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      action: "update_benefit",
      error: "No updates provided",
      message: "Please specify what to update (name, description, status, etc.)"
    };
  }

  // PREVIEW MODE
  if (mode === "preview") {
    const changes: Record<string, { old: any; new: any }> = {};
    for (const [key, value] of Object.entries(updates)) {
      const oldValue = key === "name" || key === "description" || key === "status"
        ? currentBenefit[key]
        : currentBenefit.customProperties?.[key];
      changes[key] = { old: oldValue, new: value };
    }

    const previewData = {
      id: args.benefitId,
      type: "benefit",
      name: updates.name || currentBenefit.name,
      status: "preview",
      details: updates,
      preview: {
        action: "update" as const,
        confidence: "high" as const,
        reason: "Benefit will be updated",
        changes,
      }
    };

    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "benefit_update",
        name: `Update Benefit - ${currentBenefit.name}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "update_benefit",
      mode: "preview",
      workItemId,
      workItemType: "benefit_update",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 0, toUpdate: 1, toSkip: 0 }
      },
      message: `📋 Ready to update benefit "${currentBenefit.name}". Review the changes and approve to proceed.`
    };
  }

  // EXECUTE MODE
  await (ctx as any).runMutation(
    generatedApi.internal.api.v1.benefitsInternal.updateBenefitInternal,
    {
      organizationId,
      benefitId: args.benefitId as Id<"objects">,
      ...updates,
    }
  );

  // Update work item
  if (args.workItemId) {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { benefitId: args.benefitId },
      }
    );
  }

  return {
    success: true,
    action: "update_benefit",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: args.benefitId,
        type: "benefit",
        name: updates.name || currentBenefit.name,
        status: "completed",
      }],
      summary: { total: 1, updated: 1 }
    },
    message: `✅ Updated benefit: ${updates.name || currentBenefit.name}`
  };
}

/**
 * List commissions for the organization
 */
async function listCommissions(
  ctx: any,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: any
) {
  const commissions = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.benefitsInternal.listCommissionsInternal,
    {
      organizationId,
      subtype: args.filterSubtype,
      status: args.filterStatus,
      limit: args.limit || 20,
      includeInactive: args.includeInactive,
    }
  );

  const formattedCommissions = commissions.map((c: any) => ({
    id: c._id,
    name: c.name,
    subtype: c.subtype,
    status: c.status,
    commissionRate: c.customProperties?.commissionRate,
    totalEarnings: c.totalEarnings || 0,
  }));

  return {
    success: true,
    action: "list_commissions",
    data: {
      items: formattedCommissions,
      total: formattedCommissions.length,
    },
    message: `Found ${formattedCommissions.length} commission(s)`
  };
}

/**
 * Get a single commission by ID
 */
async function getCommission(
  ctx: any,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: any
) {
  const commission = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.benefitsInternal.getCommissionInternal,
    {
      organizationId,
      commissionId: args.commissionId,
    }
  );

  if (!commission) {
    return {
      success: false,
      action: "get_commission",
      error: "Commission not found",
      message: `No commission found with ID: ${args.commissionId}`
    };
  }

  return {
    success: true,
    action: "get_commission",
    data: {
      id: commission._id,
      name: commission.name,
      subtype: commission.subtype,
      description: commission.description,
      status: commission.status,
      commissionRate: commission.customProperties?.commissionRate,
      minDealSize: commission.customProperties?.minDealSize,
      maxDealSize: commission.customProperties?.maxDealSize,
      payoutTerms: commission.customProperties?.payoutTerms,
      offerer: commission.offerer,
      totalEarnings: commission.totalEarnings,
    },
    message: `Commission: ${commission.name}`
  };
}

/**
 * Create a new commission
 */
async function createCommission(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  sessionId: string,
  args: any
) {
  const mode = args.mode || "preview";

  // PREVIEW MODE
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "commission",
      name: args.name,
      status: "preview",
      details: {
        subtype: args.commissionSubtype,
        description: args.description,
        commissionRate: args.commissionRate,
        minDealSize: args.minDealSize,
        maxDealSize: args.maxDealSize,
        payoutTerms: args.payoutTerms,
        category: args.category,
        validFrom: args.validFrom,
        validUntil: args.validUntil,
        requirements: args.requirements,
        contactEmail: args.contactEmail,
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New commission will be created",
        changes: {
          name: { old: null, new: args.name },
          subtype: { old: null, new: args.commissionSubtype },
          commissionRate: { old: null, new: args.commissionRate || "Not specified" },
          status: { old: null, new: "draft" },
        }
      }
    };

    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "commission_create",
        name: `Create Commission - ${args.name}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_commission",
      mode: "preview",
      workItemId,
      workItemType: "commission_create",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1, toUpdate: 0, toSkip: 0 }
      },
      message: `📋 Ready to create commission "${args.name}". Review the details and approve to proceed.`
    };
  }

  // EXECUTE MODE
  const commissionId = await (ctx as any).runMutation(
    generatedApi.internal.api.v1.benefitsInternal.createCommissionInternal,
    {
      organizationId,
      subtype: args.commissionSubtype,
      name: args.name,
      description: args.description,
      commissionRate: args.commissionRate,
      minDealSize: args.minDealSize,
      maxDealSize: args.maxDealSize,
      payoutTerms: args.payoutTerms,
      category: args.category,
      validFrom: args.validFrom ? new Date(args.validFrom).getTime() : undefined,
      validUntil: args.validUntil ? new Date(args.validUntil).getTime() : undefined,
      requirements: args.requirements,
      contactEmail: args.contactEmail,
      createdBy: userId,
    }
  );

  if (args.workItemId) {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { commissionId },
      }
    );
  }

  return {
    success: true,
    action: "create_commission",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: commissionId,
        type: "commission",
        name: args.name,
        status: "completed",
        details: {
          subtype: args.commissionSubtype,
        }
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Created commission: ${args.name}`
  };
}

/**
 * Update an existing commission
 */
async function updateCommission(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  sessionId: string,
  args: any
) {
  const mode = args.mode || "preview";

  const currentCommission = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.benefitsInternal.getCommissionInternal,
    {
      organizationId,
      commissionId: args.commissionId,
    }
  );

  if (!currentCommission) {
    return {
      success: false,
      action: "update_commission",
      error: "Commission not found",
      message: `No commission found with ID: ${args.commissionId}`
    };
  }

  const updates: Record<string, any> = {};
  if (args.name) updates.name = args.name;
  if (args.description) updates.description = args.description;
  if (args.status) updates.status = args.status;
  if (args.commissionRate) updates.commissionRate = args.commissionRate;
  if (args.minDealSize !== undefined) updates.minDealSize = args.minDealSize;
  if (args.maxDealSize !== undefined) updates.maxDealSize = args.maxDealSize;
  if (args.payoutTerms) updates.payoutTerms = args.payoutTerms;

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      action: "update_commission",
      error: "No updates provided",
      message: "Please specify what to update"
    };
  }

  if (mode === "preview") {
    const changes: Record<string, { old: any; new: any }> = {};
    for (const [key, value] of Object.entries(updates)) {
      const oldValue = key === "name" || key === "description" || key === "status"
        ? currentCommission[key]
        : currentCommission.customProperties?.[key];
      changes[key] = { old: oldValue, new: value };
    }

    const previewData = {
      id: args.commissionId,
      type: "commission",
      name: updates.name || currentCommission.name,
      status: "preview",
      details: updates,
      preview: {
        action: "update" as const,
        confidence: "high" as const,
        reason: "Commission will be updated",
        changes,
      }
    };

    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "commission_update",
        name: `Update Commission - ${currentCommission.name}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "update_commission",
      mode: "preview",
      workItemId,
      workItemType: "commission_update",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 0, toUpdate: 1, toSkip: 0 }
      },
      message: `📋 Ready to update commission "${currentCommission.name}". Review the changes and approve to proceed.`
    };
  }

  // EXECUTE MODE - Call the update mutation
  await (ctx as any).runMutation(
    generatedApi.internal.api.v1.benefitsInternal.updateCommissionInternal,
    {
      organizationId,
      commissionId: args.commissionId as Id<"objects">,
      name: updates.name,
      description: updates.description,
      status: updates.status,
      commissionType: updates.commissionType,
      commissionValue: updates.commissionValue,
      currency: updates.currency,
      category: updates.category,
      targetDescription: updates.targetDescription,
      performedBy: userId,
    }
  );

  // Update work item
  if (args.workItemId) {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { commissionId: args.commissionId },
      }
    );
  }

  return {
    success: true,
    action: "update_commission",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: args.commissionId,
        type: "commission",
        name: updates.name || currentCommission.name,
        status: "completed",
      }],
      summary: { total: 1, updated: 1 }
    },
    message: `✅ Updated commission: ${updates.name || currentCommission.name}`
  };
}

/**
 * List claims for a benefit or organization
 */
async function listClaims(
  ctx: any,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: any
) {
  const claims = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.benefitsInternal.listClaimsInternal,
    {
      organizationId,
      benefitId: args.benefitId,
      status: args.filterStatus,
      limit: args.limit || 20,
    }
  );

  const formattedClaims = claims.map((c: any) => ({
    id: c._id,
    benefitName: c.benefit?.name || "Unknown",
    claimerName: c.claimer?.name || "Unknown",
    status: c.status,
    claimedAt: c.createdAt,
    details: c.claimDetails,
  }));

  return {
    success: true,
    action: "list_claims",
    data: {
      items: formattedClaims,
      total: formattedClaims.length,
    },
    message: `Found ${formattedClaims.length} claim(s)`
  };
}

/**
 * Create a claim on a benefit
 */
async function createClaim(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  sessionId: string,
  args: any
) {
  const mode = args.mode || "preview";

  // Get benefit info
  const benefit = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.benefitsInternal.getBenefitInternal,
    {
      organizationId,
      benefitId: args.benefitId,
    }
  );

  if (!benefit) {
    return {
      success: false,
      action: "create_claim",
      error: "Benefit not found",
      message: `No benefit found with ID: ${args.benefitId}`
    };
  }

  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "claim",
      name: `Claim on ${benefit.name}`,
      status: "preview",
      details: {
        benefitId: args.benefitId,
        benefitName: benefit.name,
        claimDetails: args.claimDetails,
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "Claim will be submitted",
        changes: {
          benefit: { old: null, new: benefit.name },
          status: { old: null, new: "pending" },
        }
      }
    };

    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "claim_create",
        name: `Claim Benefit - ${benefit.name}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_claim",
      mode: "preview",
      workItemId,
      workItemType: "claim_create",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1, toUpdate: 0, toSkip: 0 }
      },
      message: `📋 Ready to claim benefit "${benefit.name}". Review and approve to proceed.`
    };
  }

  // EXECUTE MODE
  const claimId = await (ctx as any).runMutation(
    generatedApi.internal.api.v1.benefitsInternal.createClaimInternal,
    {
      organizationId,
      benefitId: args.benefitId as Id<"objects">,
      claimerId: userId,
      claimDetails: args.claimDetails,
    }
  );

  if (args.workItemId) {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { claimId },
      }
    );
  }

  return {
    success: true,
    action: "create_claim",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: claimId,
        type: "claim",
        name: `Claim on ${benefit.name}`,
        status: "completed",
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Submitted claim for benefit: ${benefit.name}`
  };
}

/**
 * Update a claim status
 */
async function updateClaim(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  sessionId: string,
  args: any
) {
  if (!args.claimId) {
    return {
      success: false,
      action: "update_claim",
      error: "claimId is required",
      message: "Please specify which claim to update"
    };
  }

  if (!args.claimStatus) {
    return {
      success: false,
      action: "update_claim",
      error: "claimStatus is required",
      message: "Please specify the new status (pending, approved, rejected, redeemed)"
    };
  }

  const mode = args.mode || "preview";

  // PREVIEW MODE - Show what will be updated
  if (mode === "preview") {
    // Get the current claim to show what will change
    const claims = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.benefitsInternal.listClaimsInternal,
      {
        organizationId,
        limit: 100,
      }
    );

    const claim = claims.find((c: any) => c._id === args.claimId);
    if (!claim) {
      return {
        success: false,
        action: "update_claim",
        error: "Claim not found",
        message: "Could not find the specified claim in this organization"
      };
    }

    const previewData = {
      id: args.claimId,
      type: "claim",
      benefitName: claim.benefit?.name || "Unknown",
      currentStatus: claim.status,
      newStatus: args.claimStatus,
      status: "preview",
      preview: {
        action: "update" as const,
        confidence: "high" as const,
        reason: `Will update claim status from "${claim.status}" to "${args.claimStatus}"`,
        changes: {
          status: { old: claim.status, new: args.claimStatus },
          ...(args.adminNotes ? { adminNotes: { old: claim.adminNotes || null, new: args.adminNotes } } : {}),
        }
      }
    };

    // Create work item for tracking
    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "claim_update",
        name: `Update Claim Status - ${claim.benefit?.name || "Unknown"}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "update_claim",
      mode: "preview",
      workItemId,
      workItemType: "claim_update",
      data: {
        items: [previewData],
        summary: { total: 1, toUpdate: 1 }
      },
      message: `Ready to update claim status from "${claim.status}" to "${args.claimStatus}". Review and approve to proceed.`
    };
  }

  // EXECUTE MODE - Call the update mutation
  await (ctx as any).runMutation(
    generatedApi.internal.api.v1.benefitsInternal.updateClaimInternal,
    {
      organizationId,
      claimId: args.claimId as Id<"benefitClaims">,
      status: args.claimStatus,
      adminNotes: args.adminNotes,
      performedBy: userId,
    }
  );

  // Update work item if provided
  if (args.workItemId) {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { claimId: args.claimId, newStatus: args.claimStatus },
      }
    );
  }

  return {
    success: true,
    action: "update_claim",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: args.claimId,
        type: "claim",
        status: args.claimStatus,
      }],
      summary: { total: 1, updated: 1 }
    },
    message: `✅ Updated claim status to: ${args.claimStatus}`
  };
}

/**
 * List payouts for a commission
 */
async function listPayouts(
  ctx: any,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: any
) {
  const payouts = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.benefitsInternal.listPayoutsInternal,
    {
      organizationId,
      commissionId: args.commissionId,
      status: args.filterStatus,
      limit: args.limit || 20,
    }
  );

  const formattedPayouts = payouts.map((p: any) => ({
    id: p._id,
    commissionName: p.commission?.name || "Unknown",
    recipientName: p.recipient?.name || "Unknown",
    amount: p.amountInCents / 100,
    currency: p.currency,
    status: p.status,
    paidAt: p.paidAt,
  }));

  return {
    success: true,
    action: "list_payouts",
    data: {
      items: formattedPayouts,
      total: formattedPayouts.length,
    },
    message: `Found ${formattedPayouts.length} payout(s)`
  };
}

/**
 * Get current user's claims
 */
async function getMyClaims(
  ctx: any,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: any
) {
  const claims = await (ctx as any).runQuery(
    generatedApi.api.benefitsOntology.getMyClaims,
    {
      organizationId,
      sessionId,
      status: args.filterStatus,
    }
  );

  const formattedClaims = claims.map((c: any) => ({
    id: c._id,
    benefitName: c.benefit?.name || "Unknown",
    status: c.status,
    claimedAt: c.createdAt,
    redeemedAt: c.redeemedAt,
  }));

  return {
    success: true,
    action: "my_claims",
    data: {
      items: formattedClaims,
      total: formattedClaims.length,
    },
    message: `You have ${formattedClaims.length} claim(s)`
  };
}

/**
 * Get current user's commission earnings
 */
async function getMyEarnings(
  ctx: any,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: any
) {
  const earnings = await (ctx as any).runQuery(
    generatedApi.api.commissionsOntology.getMyEarnedCommissions,
    {
      organizationId,
      sessionId,
      status: args.filterStatus,
    }
  );

  const formattedEarnings = earnings.map((e: any) => ({
    id: e._id,
    commissionName: e.commission?.name || "Unknown",
    amount: e.amountInCents / 100,
    currency: e.currency,
    status: e.status,
    paidAt: e.paidAt,
  }));

  const totalPending = earnings
    .filter((e: any) => ["pending_verification", "verified", "processing"].includes(e.status))
    .reduce((sum: number, e: any) => sum + e.amountInCents, 0) / 100;

  const totalPaid = earnings
    .filter((e: any) => e.status === "paid")
    .reduce((sum: number, e: any) => sum + e.amountInCents, 0) / 100;

  return {
    success: true,
    action: "my_earnings",
    data: {
      items: formattedEarnings,
      total: formattedEarnings.length,
      totalPending,
      totalPaid,
    },
    message: `You have ${formattedEarnings.length} earning(s). Pending: $${totalPending.toFixed(2)}, Paid: $${totalPaid.toFixed(2)}`
  };
}
