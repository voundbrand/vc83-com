/**
 * BENEFITS ONTOLOGY
 *
 * Manages benefits and commissions for member-to-member value sharing.
 * Uses the universal ontology system (objects table).
 *
 * Object Types:
 * - benefit: Member-offered benefits (discounts, services, products, events)
 * - commission: Commission-based referral opportunities
 *
 * Benefit Subtypes:
 * - "discount" - Percentage or fixed discount
 * - "service" - Free or discounted service
 * - "product" - Free or discounted product
 * - "event" - Event invitation or access
 *
 * Commission Subtypes:
 * - "sales" - Sales referral commission
 * - "consulting" - Consulting referral
 * - "referral" - General referral program
 * - "partnership" - Partnership opportunity
 *
 * Status Workflow:
 * - "draft" - Not yet published
 * - "active" - Visible and available
 * - "paused" - Temporarily unavailable
 * - "expired" - Past expiration date
 * - "archived" - No longer available
 *
 * RELATIONSHIPS (via objectLinks):
 * - offers_benefit: member → benefit (who created it)
 * - offers_commission: member → commission (who created it)
 * - claims_benefit: member → benefit (who claimed it)
 * - earns_commission: member → commission (who earned it)
 */

import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// BENEFIT VALIDATORS
// ============================================================================

export const benefitSubtypes = ["discount", "service", "product", "event"] as const;

export const commissionSubtypes = ["sales", "consulting", "referral", "partnership"] as const;

export const benefitStatuses = ["draft", "active", "paused", "expired", "archived"] as const;

// ============================================================================
// BENEFIT OPERATIONS
// ============================================================================

/**
 * LIST BENEFITS
 * Returns all active benefits for an organization
 */
export const listBenefits = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "benefit")
      );

    let benefits = await q.collect();

    // Apply filters
    if (args.subtype) {
      benefits = benefits.filter((b) => b.subtype === args.subtype);
    }

    if (args.category) {
      benefits = benefits.filter((b) => b.customProperties?.category === args.category);
    }

    if (!args.includeInactive) {
      benefits = benefits.filter((b) => b.status === "active");
    } else if (args.status) {
      benefits = benefits.filter((b) => b.status === args.status);
    }

    // Sort by creation date (newest first)
    benefits.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit) {
      benefits = benefits.slice(0, args.limit);
    }

    // Enrich with offerer info
    const enrichedBenefits = await Promise.all(
      benefits.map(async (benefit) => {
        // Get offerer via objectLinks
        const offerLink = await ctx.db
          .query("objectLinks")
          .withIndex("by_to_link_type", (q) =>
            q.eq("toObjectId", benefit._id).eq("linkType", "offers_benefit")
          )
          .first();

        let offerer = null;
        if (offerLink) {
          const offererObj = await ctx.db.get(offerLink.fromObjectId);
          if (offererObj) {
            offerer = {
              id: offererObj._id,
              name: offererObj.name,
              email: offererObj.customProperties?.email,
            };
          }
        }

        // Get claim count
        const claims = await ctx.db
          .query("benefitClaims")
          .withIndex("by_benefit", (q) => q.eq("benefitId", benefit._id))
          .collect();

        return {
          ...benefit,
          offerer,
          claimCount: claims.length,
          activeClaimCount: claims.filter((c) => c.status === "approved" || c.status === "redeemed").length,
        };
      })
    );

    return enrichedBenefits;
  },
});

/**
 * GET BENEFIT
 * Get a single benefit by ID with full details
 */
export const getBenefit = query({
  args: {
    sessionId: v.string(),
    benefitId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const benefit = await ctx.db.get(args.benefitId);

    if (!benefit || benefit.type !== "benefit") {
      throw new Error("Benefit not found");
    }

    // Get offerer
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", benefit._id).eq("linkType", "offers_benefit")
      )
      .first();

    let offerer = null;
    if (offerLink) {
      const offererObj = await ctx.db.get(offerLink.fromObjectId);
      if (offererObj) {
        offerer = {
          id: offererObj._id,
          name: offererObj.name,
          email: offererObj.customProperties?.email,
          phone: offererObj.customProperties?.phone,
        };
      }
    }

    // Get all claims
    const claims = await ctx.db
      .query("benefitClaims")
      .withIndex("by_benefit", (q) => q.eq("benefitId", benefit._id))
      .collect();

    return {
      ...benefit,
      offerer,
      claims,
      stats: {
        totalClaims: claims.length,
        pendingClaims: claims.filter((c) => c.status === "pending").length,
        approvedClaims: claims.filter((c) => c.status === "approved").length,
        redeemedClaims: claims.filter((c) => c.status === "redeemed").length,
      },
    };
  },
});

/**
 * GET MY BENEFITS
 * Get benefits created by the current member
 */
export const getMyBenefits = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    memberId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all benefits linked to this member
    const offerLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.memberId).eq("linkType", "offers_benefit")
      )
      .collect();

    const benefits = await Promise.all(
      offerLinks.map(async (link) => {
        const benefit = await ctx.db.get(link.toObjectId);
        if (!benefit || benefit.type !== "benefit") return null;

        const claims = await ctx.db
          .query("benefitClaims")
          .withIndex("by_benefit", (q) => q.eq("benefitId", benefit._id))
          .collect();

        return {
          ...benefit,
          claimCount: claims.length,
          pendingClaimCount: claims.filter((c) => c.status === "pending").length,
        };
      })
    );

    return benefits.filter(Boolean);
  },
});

/**
 * CREATE BENEFIT
 * Create a new benefit offering
 */
export const createBenefit = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    memberId: v.id("objects"), // The member creating the benefit
    title: v.string(),
    description: v.string(),
    subtype: v.string(), // discount, service, product, event
    category: v.optional(v.string()),
    // Discount-specific
    discountType: v.optional(v.string()), // "percentage" | "fixed"
    discountValue: v.optional(v.number()), // 20 for 20% or €20
    // Availability
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    maxTotalClaims: v.optional(v.number()),
    maxClaimsPerMember: v.optional(v.number()),
    // Requirements
    requirements: v.optional(v.string()),
    // Contact
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    // Status
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify member exists
    const member = await ctx.db.get(args.memberId);
    if (!member || member.type !== "crm_contact") {
      throw new Error("Member not found");
    }

    // Create the benefit object
    const benefitId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "benefit",
      subtype: args.subtype,
      name: args.title,
      description: args.description,
      status: args.status || "active",
      customProperties: {
        category: args.category,
        discountType: args.discountType,
        discountValue: args.discountValue,
        validFrom: args.validFrom,
        validUntil: args.validUntil,
        maxTotalClaims: args.maxTotalClaims,
        maxClaimsPerMember: args.maxClaimsPerMember || 1,
        currentClaimCount: 0,
        requirements: args.requirements,
        contactEmail: args.contactEmail,
        contactPhone: args.contactPhone,
      },
      createdBy: args.memberId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create the offers_benefit link
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.memberId,
      toObjectId: benefitId,
      linkType: "offers_benefit",
      createdBy: args.memberId,
      createdAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: benefitId,
      actionType: "created",
      actionData: {
        subtype: args.subtype,
        offeredBy: args.memberId,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });

    return benefitId;
  },
});

/**
 * UPDATE BENEFIT
 * Update an existing benefit
 */
export const updateBenefit = mutation({
  args: {
    sessionId: v.string(),
    benefitId: v.id("objects"),
    memberId: v.id("objects"), // Must be the owner
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      subtype: v.optional(v.string()),
      category: v.optional(v.string()),
      discountType: v.optional(v.string()),
      discountValue: v.optional(v.number()),
      validFrom: v.optional(v.number()),
      validUntil: v.optional(v.number()),
      maxTotalClaims: v.optional(v.number()),
      maxClaimsPerMember: v.optional(v.number()),
      requirements: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      status: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const benefit = await ctx.db.get(args.benefitId);
    if (!benefit || benefit.type !== "benefit") {
      throw new Error("Benefit not found");
    }

    // Verify ownership
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.benefitId).eq("linkType", "offers_benefit")
      )
      .first();

    if (!offerLink || offerLink.fromObjectId !== args.memberId) {
      throw new Error("You can only edit your own benefits");
    }

    // Update the benefit
    await ctx.db.patch(args.benefitId, {
      name: args.updates.title || benefit.name,
      description: args.updates.description || benefit.description,
      subtype: args.updates.subtype || benefit.subtype,
      status: args.updates.status || benefit.status,
      customProperties: {
        ...benefit.customProperties,
        ...args.updates,
      },
      updatedAt: Date.now(),
    });

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: benefit.organizationId,
      objectId: args.benefitId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

/**
 * DELETE BENEFIT
 * Soft delete a benefit (set status to archived)
 */
export const deleteBenefit = mutation({
  args: {
    sessionId: v.string(),
    benefitId: v.id("objects"),
    memberId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const benefit = await ctx.db.get(args.benefitId);
    if (!benefit || benefit.type !== "benefit") {
      throw new Error("Benefit not found");
    }

    // Verify ownership
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.benefitId).eq("linkType", "offers_benefit")
      )
      .first();

    if (!offerLink || offerLink.fromObjectId !== args.memberId) {
      throw new Error("You can only delete your own benefits");
    }

    // Soft delete
    await ctx.db.patch(args.benefitId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Log deletion
    await ctx.db.insert("objectActions", {
      organizationId: benefit.organizationId,
      objectId: args.benefitId,
      actionType: "archived",
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// BENEFIT CLAIM OPERATIONS
// ============================================================================

/**
 * CLAIM BENEFIT
 * Create a claim for a benefit
 */
export const claimBenefit = mutation({
  args: {
    sessionId: v.string(),
    benefitId: v.id("objects"),
    memberId: v.id("objects"), // The member claiming
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const benefit = await ctx.db.get(args.benefitId);
    if (!benefit || benefit.type !== "benefit") {
      throw new Error("Benefit not found");
    }

    if (benefit.status !== "active") {
      throw new Error("This benefit is not currently available");
    }

    // Check if member is the owner (can't claim own benefit)
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.benefitId).eq("linkType", "offers_benefit")
      )
      .first();

    if (offerLink && offerLink.fromObjectId === args.memberId) {
      throw new Error("You cannot claim your own benefit");
    }

    // Check existing claims by this member
    const existingClaims = await ctx.db
      .query("benefitClaims")
      .withIndex("by_claimer", (q) => q.eq("claimedById", args.memberId))
      .filter((q) => q.eq(q.field("benefitId"), args.benefitId))
      .collect();

    const activeClaims = existingClaims.filter(
      (c) => c.status !== "rejected" && c.status !== "expired"
    );

    const maxPerMember = benefit.customProperties?.maxClaimsPerMember || 1;
    if (activeClaims.length >= maxPerMember) {
      throw new Error("You have already claimed this benefit the maximum number of times");
    }

    // Check total claims
    const totalClaims = await ctx.db
      .query("benefitClaims")
      .withIndex("by_benefit", (q) => q.eq("benefitId", args.benefitId))
      .collect();

    const maxTotal = benefit.customProperties?.maxTotalClaims;
    if (maxTotal && totalClaims.length >= maxTotal) {
      throw new Error("This benefit has reached its maximum number of claims");
    }

    // Check validity period
    const now = Date.now();
    const validFrom = benefit.customProperties?.validFrom;
    const validUntil = benefit.customProperties?.validUntil;

    if (validFrom && now < validFrom) {
      throw new Error("This benefit is not yet available");
    }

    if (validUntil && now > validUntil) {
      throw new Error("This benefit has expired");
    }

    // Create the claim
    const claimId = await ctx.db.insert("benefitClaims", {
      organizationId: benefit.organizationId,
      benefitId: args.benefitId,
      claimedById: args.memberId,
      status: "pending",
      claimedAt: Date.now(),
      notes: args.notes,
    });

    // Create claims_benefit link
    await ctx.db.insert("objectLinks", {
      organizationId: benefit.organizationId,
      fromObjectId: args.memberId,
      toObjectId: args.benefitId,
      linkType: "claims_benefit",
      properties: {
        claimId,
        claimedAt: Date.now(),
      },
      createdBy: args.memberId,
      createdAt: Date.now(),
    });

    // Update claim count
    await ctx.db.patch(args.benefitId, {
      customProperties: {
        ...benefit.customProperties,
        currentClaimCount: (benefit.customProperties?.currentClaimCount || 0) + 1,
      },
      updatedAt: Date.now(),
    });

    // Log claim
    await ctx.db.insert("objectActions", {
      organizationId: benefit.organizationId,
      objectId: args.benefitId,
      actionType: "claimed",
      actionData: {
        claimId,
        claimedBy: args.memberId,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });

    return claimId;
  },
});

/**
 * APPROVE CLAIM
 * Approve a pending benefit claim
 */
export const approveClaim = mutation({
  args: {
    sessionId: v.string(),
    claimId: v.id("benefitClaims"),
    memberId: v.id("objects"), // Must be the benefit owner
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim) {
      throw new Error("Claim not found");
    }

    if (claim.status !== "pending") {
      throw new Error("This claim has already been processed");
    }

    // Verify ownership of the benefit
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", claim.benefitId).eq("linkType", "offers_benefit")
      )
      .first();

    if (!offerLink || offerLink.fromObjectId !== args.memberId) {
      throw new Error("You can only approve claims for your own benefits");
    }

    // Approve the claim
    await ctx.db.patch(args.claimId, {
      status: "approved",
      approvedAt: Date.now(),
      approvedById: args.memberId,
      notes: args.notes || claim.notes,
    });

    // Log approval
    await ctx.db.insert("objectActions", {
      organizationId: claim.organizationId,
      objectId: claim.benefitId,
      actionType: "claim_approved",
      actionData: {
        claimId: args.claimId,
        approvedBy: args.memberId,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

/**
 * REJECT CLAIM
 * Reject a pending benefit claim
 */
export const rejectClaim = mutation({
  args: {
    sessionId: v.string(),
    claimId: v.id("benefitClaims"),
    memberId: v.id("objects"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim) {
      throw new Error("Claim not found");
    }

    if (claim.status !== "pending") {
      throw new Error("This claim has already been processed");
    }

    // Verify ownership
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", claim.benefitId).eq("linkType", "offers_benefit")
      )
      .first();

    if (!offerLink || offerLink.fromObjectId !== args.memberId) {
      throw new Error("You can only reject claims for your own benefits");
    }

    // Reject the claim
    await ctx.db.patch(args.claimId, {
      status: "rejected",
      rejectionReason: args.reason,
    });

    // Log rejection
    await ctx.db.insert("objectActions", {
      organizationId: claim.organizationId,
      objectId: claim.benefitId,
      actionType: "claim_rejected",
      actionData: {
        claimId: args.claimId,
        rejectedBy: args.memberId,
        reason: args.reason,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

/**
 * REDEEM CLAIM
 * Mark a claim as redeemed (benefit was used)
 */
export const redeemClaim = mutation({
  args: {
    sessionId: v.string(),
    claimId: v.id("benefitClaims"),
    memberId: v.id("objects"), // Either the claimer or the benefit owner
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const claim = await ctx.db.get(args.claimId);
    if (!claim) {
      throw new Error("Claim not found");
    }

    if (claim.status !== "approved") {
      throw new Error("This claim must be approved before it can be redeemed");
    }

    // Verify actor is either the claimer or benefit owner
    const isClaimerActing = claim.claimedById === args.memberId;

    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", claim.benefitId).eq("linkType", "offers_benefit")
      )
      .first();

    const isOwnerActing = offerLink && offerLink.fromObjectId === args.memberId;

    if (!isClaimerActing && !isOwnerActing) {
      throw new Error("You can only redeem claims you made or for benefits you offer");
    }

    // Redeem the claim
    await ctx.db.patch(args.claimId, {
      status: "redeemed",
      redeemedAt: Date.now(),
    });

    // Log redemption
    await ctx.db.insert("objectActions", {
      organizationId: claim.organizationId,
      objectId: claim.benefitId,
      actionType: "claim_redeemed",
      actionData: {
        claimId: args.claimId,
        redeemedBy: args.memberId,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

/**
 * GET MY CLAIMS
 * Get all claims made by the current user in an organization
 * Looks up claims by the user's linked member object (CRM contact)
 */
export const getMyClaims = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthenticatedUser(ctx, args.sessionId);

    // Find the user's member object (CRM contact) in this organization
    // Look for a CRM contact linked to this user's email
    const userRecord = await ctx.db.get(authUser.userId);
    if (!userRecord) {
      return [];
    }

    const userEmail = userRecord.email;

    // Find member objects in the organization with matching email
    const memberObjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    // Find the member object that matches the user's email
    const memberObject = memberObjects.find(
      (m) => m.customProperties?.email === userEmail
    );

    if (!memberObject) {
      // No member object found for this user - return empty claims
      return [];
    }

    let claims = await ctx.db
      .query("benefitClaims")
      .withIndex("by_claimer", (q) => q.eq("claimedById", memberObject._id))
      .collect();

    if (args.status) {
      claims = claims.filter((c) => c.status === args.status);
    }

    // Enrich with benefit info
    const enrichedClaims = await Promise.all(
      claims.map(async (claim) => {
        const benefit = await ctx.db.get(claim.benefitId);
        return {
          ...claim,
          benefit: benefit ? {
            id: benefit._id,
            name: benefit.name,
            description: benefit.description,
            subtype: benefit.subtype,
          } : null,
        };
      })
    );

    return enrichedClaims;
  },
});

/**
 * GET CLAIMS FOR MY BENEFITS
 * Get all claims for benefits I offer
 */
export const getClaimsForMyBenefits = query({
  args: {
    sessionId: v.string(),
    memberId: v.id("objects"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all benefits I offer
    const offerLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.memberId).eq("linkType", "offers_benefit")
      )
      .collect();

    const benefitIds = offerLinks.map((l) => l.toObjectId);

    // Get all claims for these benefits
    const results = [];

    for (const benefitId of benefitIds) {
      let claims = await ctx.db
        .query("benefitClaims")
        .withIndex("by_benefit", (q) => q.eq("benefitId", benefitId))
        .collect();

      if (args.status) {
        claims = claims.filter((c) => c.status === args.status);
      }

      const benefit = await ctx.db.get(benefitId);

      for (const claim of claims) {
        const claimer = await ctx.db.get(claim.claimedById);

        // Type guard to ensure we're working with objects
        const benefitObj = benefit && "type" in benefit && benefit.type === "benefit" ? benefit : null;
        const claimerObj = claimer && "type" in claimer && claimer.type === "crm_contact" ? claimer : null;

        results.push({
          ...claim,
          benefit: benefitObj ? {
            id: benefitObj._id,
            name: benefitObj.name,
          } : null,
          claimer: claimerObj ? {
            id: claimerObj._id,
            name: claimerObj.name,
            email: claimerObj.customProperties?.email,
          } : null,
        });
      }
    }

    return results;
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * INTERNAL: Get benefit by ID
 */
export const getBenefitInternal = internalQuery({
  args: {
    benefitId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const benefit = await ctx.db.get(args.benefitId);
    if (!benefit || benefit.type !== "benefit") {
      return null;
    }
    return benefit;
  },
});
