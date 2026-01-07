/**
 * API V1: BENEFITS INTERNAL HANDLERS
 *
 * Internal query/mutation handlers for Benefits API endpoints.
 * These are called by the HTTP action handlers in benefits.ts.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// BENEFITS INTERNAL HANDLERS
// ============================================================================

/**
 * LIST BENEFITS (INTERNAL)
 *
 * Lists benefits with filtering and pagination.
 */
export const listBenefitsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all benefits for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "benefit")
      );

    const allBenefits = await query.collect();

    // 2. Apply filters
    let filteredBenefits = allBenefits;

    if (args.subtype) {
      filteredBenefits = filteredBenefits.filter(
        (b) => b.subtype === args.subtype
      );
    }

    if (args.status) {
      filteredBenefits = filteredBenefits.filter(
        (b) => b.status === args.status
      );
    }

    if (args.category) {
      filteredBenefits = filteredBenefits.filter((b) => {
        const props = b.customProperties || {};
        return props.category === args.category;
      });
    }

    // 3. Sort by creation date (newest first)
    filteredBenefits.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Apply pagination
    const total = filteredBenefits.length;
    const paginatedBenefits = filteredBenefits.slice(
      args.offset,
      args.offset + args.limit
    );

    // 5. Format response
    const benefits = paginatedBenefits.map((benefit) => ({
      id: benefit._id,
      organizationId: benefit.organizationId,
      name: benefit.name,
      description: benefit.description,
      subtype: benefit.subtype,
      status: benefit.status,
      discountValue: benefit.customProperties?.discountValue,
      category: benefit.customProperties?.category,
      validFrom: benefit.customProperties?.validFrom,
      validUntil: benefit.customProperties?.validUntil,
      maxTotalClaims: benefit.customProperties?.maxTotalClaims,
      maxClaimsPerMember: benefit.customProperties?.maxClaimsPerMember,
      createdAt: benefit.createdAt,
      updatedAt: benefit.updatedAt,
    }));

    return {
      benefits,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * GET BENEFIT (INTERNAL)
 *
 * Gets a specific benefit by ID.
 */
export const getBenefitInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    benefitId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get benefit
    const benefit = await ctx.db.get(args.benefitId as Id<"objects">);

    if (!benefit) {
      return null;
    }

    // 2. Verify organization access
    if (benefit.organizationId !== args.organizationId) {
      return null;
    }

    // 3. Verify it's a benefit
    if (benefit.type !== "benefit") {
      return null;
    }

    // 4. Get claim stats
    const claims = await ctx.db
      .query("benefitClaims")
      .withIndex("by_benefit", (q) => q.eq("benefitId", benefit._id))
      .collect();

    const totalClaims = claims.length;
    const pendingClaims = claims.filter((c) => c.status === "pending").length;
    const approvedClaims = claims.filter((c) => c.status === "approved").length;
    const redeemedClaims = claims.filter((c) => c.status === "redeemed").length;

    // 5. Format response
    return {
      id: benefit._id,
      organizationId: benefit.organizationId,
      name: benefit.name,
      description: benefit.description,
      subtype: benefit.subtype,
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
      customProperties: benefit.customProperties,
      stats: {
        totalClaims,
        pendingClaims,
        approvedClaims,
        redeemedClaims,
      },
      createdBy: benefit.createdBy,
      createdAt: benefit.createdAt,
      updatedAt: benefit.updatedAt,
    };
  },
});

/**
 * CREATE BENEFIT (INTERNAL)
 *
 * Creates a new benefit.
 */
export const createBenefitInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    discountValue: v.optional(v.number()),
    category: v.optional(v.string()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    maxTotalClaims: v.optional(v.number()),
    maxClaimsPerMember: v.optional(v.number()),
    requirements: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    customProperties: v.optional(v.any()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate subtype
    const validSubtypes = ["discount", "service", "product", "event"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid benefit subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Validate dates
    if (args.validFrom && args.validUntil && args.validUntil < args.validFrom) {
      throw new Error("validUntil must be after validFrom");
    }

    // Build customProperties with benefit data
    const customProperties = {
      discountValue: args.discountValue,
      category: args.category,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      maxTotalClaims: args.maxTotalClaims,
      maxClaimsPerMember: args.maxClaimsPerMember,
      requirements: args.requirements,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      ...(args.customProperties || {}),
    };

    // Create benefit object
    const benefitId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "benefit",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: "draft",
      customProperties,
      createdBy: args.performedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: benefitId,
      actionType: "created",
      actionData: {
        source: "api",
        subtype: args.subtype,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return benefitId;
  },
});

/**
 * UPDATE BENEFIT (INTERNAL)
 *
 * Updates an existing benefit.
 */
export const updateBenefitInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    benefitId: v.string(),
    subtype: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    discountValue: v.optional(v.number()),
    category: v.optional(v.string()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    maxTotalClaims: v.optional(v.number()),
    maxClaimsPerMember: v.optional(v.number()),
    requirements: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    customProperties: v.optional(v.any()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const benefit = await ctx.db.get(args.benefitId as Id<"objects">);

    if (!benefit || benefit.type !== "benefit") {
      throw new Error("Benefit not found");
    }

    // Verify organization access
    if (benefit.organizationId !== args.organizationId) {
      throw new Error("Benefit not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    if (args.subtype !== undefined) {
      const validSubtypes = ["discount", "service", "product", "event"];
      if (!validSubtypes.includes(args.subtype)) {
        throw new Error(
          `Invalid benefit subtype. Must be one of: ${validSubtypes.join(", ")}`
        );
      }
      updates.subtype = args.subtype;
    }

    if (args.status !== undefined) {
      const validStatuses = ["draft", "active", "paused", "expired", "archived"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
      updates.status = args.status;
    }

    // Update customProperties
    const currentProps = benefit.customProperties || {};
    const newProps = { ...currentProps };

    if (args.discountValue !== undefined) newProps.discountValue = args.discountValue;
    if (args.category !== undefined) newProps.category = args.category;
    if (args.validFrom !== undefined) newProps.validFrom = args.validFrom;
    if (args.validUntil !== undefined) newProps.validUntil = args.validUntil;
    if (args.maxTotalClaims !== undefined) newProps.maxTotalClaims = args.maxTotalClaims;
    if (args.maxClaimsPerMember !== undefined) newProps.maxClaimsPerMember = args.maxClaimsPerMember;
    if (args.requirements !== undefined) newProps.requirements = args.requirements;
    if (args.contactEmail !== undefined) newProps.contactEmail = args.contactEmail;
    if (args.contactPhone !== undefined) newProps.contactPhone = args.contactPhone;

    if (args.customProperties) {
      Object.assign(newProps, args.customProperties);
    }

    updates.customProperties = newProps;

    await ctx.db.patch(args.benefitId as Id<"objects">, updates);

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.benefitId as Id<"objects">,
      actionType: "updated",
      actionData: {
        source: "api",
        updatedFields: Object.keys(updates),
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return args.benefitId;
  },
});

/**
 * DELETE BENEFIT (INTERNAL)
 *
 * Permanently deletes a draft benefit.
 */
export const deleteBenefitInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    benefitId: v.string(),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const benefit = await ctx.db.get(args.benefitId as Id<"objects">);

    if (!benefit || benefit.type !== "benefit") {
      throw new Error("Benefit not found");
    }

    // Verify organization access
    if (benefit.organizationId !== args.organizationId) {
      throw new Error("Benefit not found");
    }

    // Only allow deleting draft benefits
    if (benefit.status !== "draft") {
      throw new Error("Only draft benefits can be permanently deleted");
    }

    // Delete the benefit permanently
    await ctx.db.delete(args.benefitId as Id<"objects">);

    // Log deletion
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.benefitId as Id<"objects">,
      actionType: "deleted",
      actionData: {
        source: "api",
        benefitName: benefit.name,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * LIST CLAIMS (INTERNAL)
 *
 * Gets all claims for a benefit.
 */
export const listClaimsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    benefitId: v.string(),
    status: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify benefit exists and belongs to organization
    const benefit = await ctx.db.get(args.benefitId as Id<"objects">);
    if (!benefit || benefit.organizationId !== args.organizationId || benefit.type !== "benefit") {
      return [];
    }

    // Get all claims for this benefit
    let claims = await ctx.db
      .query("benefitClaims")
      .withIndex("by_benefit", (q) => q.eq("benefitId", args.benefitId as Id<"objects">))
      .collect();

    // Apply status filter
    if (args.status) {
      claims = claims.filter((c) => c.status === args.status);
    }

    // Sort by claim date (newest first)
    claims.sort((a, b) => b.claimedAt - a.claimedAt);

    // Apply limit
    claims = claims.slice(0, args.limit);

    // Enrich with claimer info
    const enrichedClaims = await Promise.all(
      claims.map(async (claim) => {
        const claimer = await ctx.db.get(claim.claimedById);
        return {
          id: claim._id,
          benefitId: claim.benefitId,
          claimerId: claim.claimedById,
          claimerName: claimer?.name || "Unknown",
          claimerEmail: claimer?.customProperties?.email,
          status: claim.status,
          notes: claim.notes,
          claimedAt: claim.claimedAt,
          approvedAt: claim.approvedAt,
          redeemedAt: claim.redeemedAt,
        };
      })
    );

    return enrichedClaims;
  },
});

/**
 * CREATE CLAIM (INTERNAL)
 *
 * Creates a new claim for a benefit.
 */
export const createClaimInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    benefitId: v.string(),
    memberId: v.string(),
    notes: v.optional(v.string()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify benefit exists
    const benefit = await ctx.db.get(args.benefitId as Id<"objects">);
    if (!benefit || benefit.type !== "benefit") {
      throw new Error("Benefit not found");
    }

    // Verify organization access
    if (benefit.organizationId !== args.organizationId) {
      throw new Error("Benefit not found");
    }

    // Verify benefit is active
    if (benefit.status !== "active") {
      throw new Error("Benefit is not currently available");
    }

    // Check validity dates
    const now = Date.now();
    const props = benefit.customProperties || {};
    if (props.validFrom && now < props.validFrom) {
      throw new Error("Benefit is not yet available");
    }
    if (props.validUntil && now > props.validUntil) {
      throw new Error("Benefit has expired");
    }

    // Check max total claims
    if (props.maxTotalClaims) {
      const existingClaims = await ctx.db
        .query("benefitClaims")
        .withIndex("by_benefit", (q) => q.eq("benefitId", benefit._id))
        .collect();

      if (existingClaims.length >= props.maxTotalClaims) {
        throw new Error("Maximum claims reached for this benefit");
      }
    }

    // Check max claims per member
    if (props.maxClaimsPerMember) {
      const memberClaims = await ctx.db
        .query("benefitClaims")
        .withIndex("by_claimer", (q) => q.eq("claimedById", args.memberId as Id<"objects">))
        .filter((q) => q.eq(q.field("benefitId"), benefit._id))
        .collect();

      if (memberClaims.length >= props.maxClaimsPerMember) {
        throw new Error("You have reached the maximum claims for this benefit");
      }
    }

    // Create the claim
    const claimId = await ctx.db.insert("benefitClaims", {
      organizationId: args.organizationId,
      benefitId: benefit._id,
      claimedById: args.memberId as Id<"objects">,
      status: "pending",
      notes: args.notes,
      claimedAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: benefit._id,
      actionType: "claim_created",
      actionData: {
        source: "api",
        claimId,
        memberId: args.memberId,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return claimId;
  },
});

/**
 * UPDATE CLAIM (INTERNAL)
 *
 * Updates a claim status.
 */
export const updateClaimInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    claimId: v.id("benefitClaims"),
    status: v.string(),
    adminNotes: v.optional(v.string()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get claim
    const claim = await ctx.db.get(args.claimId);
    if (!claim) {
      throw new Error("Claim not found");
    }

    // Verify organization access
    if (claim.organizationId !== args.organizationId) {
      throw new Error("Claim not found");
    }

    // Validate status
    const validStatuses = ["pending", "approved", "rejected", "redeemed"];
    if (!validStatuses.includes(args.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    // Build updates
    const updates: Record<string, any> = {
      status: args.status,
    };

    if (args.adminNotes !== undefined) {
      updates.adminNotes = args.adminNotes;
    }

    // Set timestamps based on status
    if (args.status === "approved") {
      updates.approvedAt = Date.now();
    } else if (args.status === "redeemed") {
      updates.redeemedAt = Date.now();
    } else if (args.status === "rejected") {
      updates.rejectedAt = Date.now();
    }

    // Apply updates
    await ctx.db.patch(args.claimId, updates);

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: claim.benefitId,
      actionType: "claim_updated",
      actionData: {
        source: "api",
        claimId: args.claimId,
        newStatus: args.status,
        previousStatus: claim.status,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return args.claimId;
  },
});

// ============================================================================
// COMMISSIONS INTERNAL HANDLERS
// ============================================================================

/**
 * LIST COMMISSIONS (INTERNAL)
 *
 * Lists commissions with filtering and pagination.
 */
export const listCommissionsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all commissions for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "commission")
      );

    const allCommissions = await query.collect();

    // 2. Apply filters
    let filteredCommissions = allCommissions;

    if (args.subtype) {
      filteredCommissions = filteredCommissions.filter(
        (c) => c.subtype === args.subtype
      );
    }

    if (args.status) {
      filteredCommissions = filteredCommissions.filter(
        (c) => c.status === args.status
      );
    }

    // 3. Sort by creation date (newest first)
    filteredCommissions.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Apply pagination
    const total = filteredCommissions.length;
    const paginatedCommissions = filteredCommissions.slice(
      args.offset,
      args.offset + args.limit
    );

    // 5. Format response with payout stats
    const commissions = await Promise.all(
      paginatedCommissions.map(async (commission) => {
        // Get payout stats
        const payouts = await ctx.db
          .query("commissionPayouts")
          .withIndex("by_commission", (q) => q.eq("commissionId", commission._id))
          .collect();

        const totalPayouts = payouts.length;
        const pendingPayouts = payouts.filter((p) => p.status === "pending_verification" || p.status === "verified" || p.status === "processing").length;
        const paidPayouts = payouts.filter((p) => p.status === "paid").length;
        const totalPaidAmount = payouts
          .filter((p) => p.status === "paid")
          .reduce((sum, p) => sum + p.amountInCents, 0);

        return {
          id: commission._id,
          organizationId: commission.organizationId,
          name: commission.name,
          description: commission.description,
          subtype: commission.subtype,
          status: commission.status,
          commissionType: commission.customProperties?.commissionType,
          commissionValue: commission.customProperties?.commissionValue,
          currency: commission.customProperties?.currency,
          category: commission.customProperties?.category,
          stats: {
            totalPayouts,
            pendingPayouts,
            paidPayouts,
            totalPaidAmount,
          },
          createdAt: commission.createdAt,
          updatedAt: commission.updatedAt,
        };
      })
    );

    return {
      commissions,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * GET COMMISSION (INTERNAL)
 *
 * Gets a specific commission by ID.
 */
export const getCommissionInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    commissionId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get commission
    const commission = await ctx.db.get(args.commissionId as Id<"objects">);

    if (!commission) {
      return null;
    }

    // 2. Verify organization access
    if (commission.organizationId !== args.organizationId) {
      return null;
    }

    // 3. Verify it's a commission
    if (commission.type !== "commission") {
      return null;
    }

    // 4. Get payout stats
    const payouts = await ctx.db
      .query("commissionPayouts")
      .withIndex("by_commission", (q) => q.eq("commissionId", commission._id))
      .collect();

    const totalPayouts = payouts.length;
    const pendingPayouts = payouts.filter((p) => p.status === "pending_verification" || p.status === "verified" || p.status === "processing").length;
    const verifiedPayouts = payouts.filter((p) => p.status === "verified").length;
    const paidPayouts = payouts.filter((p) => p.status === "paid").length;
    const totalPaidAmount = payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amountInCents, 0);

    // 5. Format response
    return {
      id: commission._id,
      organizationId: commission.organizationId,
      name: commission.name,
      description: commission.description,
      subtype: commission.subtype,
      status: commission.status,
      commissionType: commission.customProperties?.commissionType,
      commissionValue: commission.customProperties?.commissionValue,
      currency: commission.customProperties?.currency,
      category: commission.customProperties?.category,
      targetDescription: commission.customProperties?.targetDescription,
      customProperties: commission.customProperties,
      stats: {
        totalPayouts,
        pendingPayouts,
        verifiedPayouts,
        paidPayouts,
        totalPaidAmount,
      },
      createdBy: commission.createdBy,
      createdAt: commission.createdAt,
      updatedAt: commission.updatedAt,
    };
  },
});

/**
 * CREATE COMMISSION (INTERNAL)
 *
 * Creates a new commission.
 */
export const createCommissionInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    commissionType: v.string(),
    commissionValue: v.number(),
    currency: v.optional(v.string()),
    category: v.optional(v.string()),
    targetDescription: v.optional(v.string()),
    customProperties: v.optional(v.any()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate subtype
    const validSubtypes = ["sales", "consulting", "referral", "partnership"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid commission subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Validate commission type
    const validCommissionTypes = ["percentage", "fixed"];
    if (!validCommissionTypes.includes(args.commissionType)) {
      throw new Error(
        `Invalid commission type. Must be one of: ${validCommissionTypes.join(", ")}`
      );
    }

    // Build customProperties with commission data
    const customProperties = {
      commissionType: args.commissionType,
      commissionValue: args.commissionValue,
      currency: args.currency || "EUR",
      category: args.category,
      targetDescription: args.targetDescription,
      ...(args.customProperties || {}),
    };

    // Create commission object
    const commissionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "commission",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: "active",
      customProperties,
      createdBy: args.performedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: commissionId,
      actionType: "created",
      actionData: {
        source: "api",
        subtype: args.subtype,
        commissionType: args.commissionType,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return commissionId;
  },
});

/**
 * UPDATE COMMISSION (INTERNAL)
 *
 * Updates an existing commission.
 */
export const updateCommissionInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    commissionId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    commissionType: v.optional(v.string()),
    commissionValue: v.optional(v.number()),
    currency: v.optional(v.string()),
    category: v.optional(v.string()),
    targetDescription: v.optional(v.string()),
    customProperties: v.optional(v.any()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get commission
    const commission = await ctx.db.get(args.commissionId);
    if (!commission) {
      throw new Error("Commission not found");
    }

    // Verify organization access
    if (commission.organizationId !== args.organizationId) {
      throw new Error("Commission not found");
    }

    // Verify it's a commission
    if (commission.type !== "commission") {
      throw new Error("Not a commission object");
    }

    // Validate status if provided
    if (args.status) {
      const validStatuses = ["draft", "active", "paused", "expired", "archived"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
      }
    }

    // Validate commission type if provided
    if (args.commissionType) {
      const validCommissionTypes = ["percentage", "fixed"];
      if (!validCommissionTypes.includes(args.commissionType)) {
        throw new Error(`Invalid commission type. Must be one of: ${validCommissionTypes.join(", ")}`);
      }
    }

    // Build updates
    const updates: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    // Update customProperties
    const currentCustomProperties = commission.customProperties || {};
    const newCustomProperties = { ...currentCustomProperties };

    if (args.commissionType !== undefined) newCustomProperties.commissionType = args.commissionType;
    if (args.commissionValue !== undefined) newCustomProperties.commissionValue = args.commissionValue;
    if (args.currency !== undefined) newCustomProperties.currency = args.currency;
    if (args.category !== undefined) newCustomProperties.category = args.category;
    if (args.targetDescription !== undefined) newCustomProperties.targetDescription = args.targetDescription;

    // Merge any additional custom properties
    if (args.customProperties) {
      Object.assign(newCustomProperties, args.customProperties);
    }

    updates.customProperties = newCustomProperties;

    // Apply updates
    await ctx.db.patch(args.commissionId, updates);

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.commissionId,
      actionType: "updated",
      actionData: {
        source: "api",
        updatedFields: Object.keys(updates),
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return args.commissionId;
  },
});

/**
 * LIST PAYOUTS (INTERNAL)
 *
 * Gets all payouts for a commission.
 */
export const listPayoutsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    commissionId: v.string(),
    status: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify commission exists and belongs to organization
    const commission = await ctx.db.get(args.commissionId as Id<"objects">);
    if (!commission || commission.organizationId !== args.organizationId || commission.type !== "commission") {
      return [];
    }

    // Get all payouts for this commission
    let payouts = await ctx.db
      .query("commissionPayouts")
      .withIndex("by_commission", (q) => q.eq("commissionId", args.commissionId as Id<"objects">))
      .collect();

    // Apply status filter
    if (args.status) {
      payouts = payouts.filter((p) => p.status === args.status);
    }

    // Sort by creation date (newest first)
    payouts.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    payouts = payouts.slice(0, args.limit);

    // Enrich with affiliate and merchant info
    const enrichedPayouts = await Promise.all(
      payouts.map(async (payout) => {
        const affiliate = await ctx.db.get(payout.affiliateId);
        const merchant = await ctx.db.get(payout.merchantId);

        return {
          id: payout._id,
          commissionId: payout.commissionId,
          affiliateId: payout.affiliateId,
          affiliateName: affiliate?.name || "Unknown",
          merchantId: payout.merchantId,
          merchantName: merchant?.name || "Unknown",
          amountInCents: payout.amountInCents,
          currency: payout.currency,
          status: payout.status,
          referralDetails: payout.referralDetails,
          referralValue: payout.referralValue,
          createdAt: payout._creationTime,
          paidAt: payout.paymentProcessedAt,
        };
      })
    );

    return enrichedPayouts;
  },
});

/**
 * CREATE PAYOUT (INTERNAL)
 *
 * Creates a new payout for a commission.
 */
export const createPayoutInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    commissionId: v.string(),
    affiliateId: v.string(),
    merchantId: v.string(),
    amount: v.number(),
    currency: v.optional(v.string()),
    referralDetails: v.optional(v.string()),
    referralValue: v.optional(v.number()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify commission exists
    const commission = await ctx.db.get(args.commissionId as Id<"objects">);
    if (!commission || commission.type !== "commission") {
      throw new Error("Commission not found");
    }

    // Verify organization access
    if (commission.organizationId !== args.organizationId) {
      throw new Error("Commission not found");
    }

    // Verify commission is active
    if (commission.status !== "active") {
      throw new Error("Commission is not currently active");
    }

    // Create the payout
    const now = Date.now();
    const payoutId = await ctx.db.insert("commissionPayouts", {
      organizationId: args.organizationId,
      commissionId: commission._id,
      affiliateId: args.affiliateId as Id<"objects">,
      merchantId: args.merchantId as Id<"objects">,
      amountInCents: args.amount,
      currency: args.currency || commission.customProperties?.currency || "EUR",
      status: "pending_verification",
      referralDetails: args.referralDetails || "",
      referralValue: args.referralValue,
      createdAt: now,
      updatedAt: now,
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: commission._id,
      actionType: "payout_created",
      actionData: {
        source: "api",
        payoutId,
        affiliateId: args.affiliateId,
        amount: args.amount,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return payoutId;
  },
});
