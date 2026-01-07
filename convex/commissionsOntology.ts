/**
 * COMMISSIONS ONTOLOGY
 *
 * Manages commission-based referral opportunities.
 * Uses the universal ontology system (objects table).
 *
 * Object Type: commission
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
 * - offers_commission: member → commission (who created it)
 * - earns_commission: member → commission (who earned it)
 */

import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// COMMISSION OPERATIONS
// ============================================================================

/**
 * LIST COMMISSIONS
 * Returns all active commissions for an organization
 */
export const listCommissions = query({
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
        q.eq("organizationId", args.organizationId).eq("type", "commission")
      );

    let commissions = await q.collect();

    // Apply filters
    if (args.subtype) {
      commissions = commissions.filter((c) => c.subtype === args.subtype);
    }

    if (args.category) {
      commissions = commissions.filter((c) => c.customProperties?.category === args.category);
    }

    if (!args.includeInactive) {
      commissions = commissions.filter((c) => c.status === "active");
    } else if (args.status) {
      commissions = commissions.filter((c) => c.status === args.status);
    }

    // Sort by creation date (newest first)
    commissions.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit) {
      commissions = commissions.slice(0, args.limit);
    }

    // Enrich with offerer info
    const enrichedCommissions = await Promise.all(
      commissions.map(async (commission) => {
        // Get offerer via objectLinks
        const offerLink = await ctx.db
          .query("objectLinks")
          .withIndex("by_to_link_type", (q) =>
            q.eq("toObjectId", commission._id).eq("linkType", "offers_commission")
          )
          .first();

        let offerer = null;
        if (offerLink) {
          const offererObj = await ctx.db.get(offerLink.fromObjectId);
          if (offererObj && "type" in offererObj && offererObj.type === "crm_contact") {
            offerer = {
              id: offererObj._id,
              name: offererObj.name,
              email: offererObj.customProperties?.email,
            };
          }
        }

        // Get payout count
        const payouts = await ctx.db
          .query("commissionPayouts")
          .withIndex("by_commission", (q) => q.eq("commissionId", commission._id))
          .collect();

        return {
          ...commission,
          offerer,
          payoutCount: payouts.length,
          totalPaidOut: payouts
            .filter((p) => p.status === "paid")
            .reduce((sum, p) => sum + p.amountInCents, 0),
        };
      })
    );

    return enrichedCommissions;
  },
});

/**
 * GET COMMISSION
 * Get a single commission by ID with full details
 */
export const getCommission = query({
  args: {
    sessionId: v.string(),
    commissionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const commission = await ctx.db.get(args.commissionId);

    if (!commission || commission.type !== "commission") {
      throw new Error("Commission not found");
    }

    // Get offerer
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", commission._id).eq("linkType", "offers_commission")
      )
      .first();

    let offerer = null;
    if (offerLink) {
      const offererObj = await ctx.db.get(offerLink.fromObjectId);
      if (offererObj && "type" in offererObj && offererObj.type === "crm_contact") {
        offerer = {
          id: offererObj._id,
          name: offererObj.name,
          email: offererObj.customProperties?.email,
          phone: offererObj.customProperties?.phone,
        };
      }
    }

    // Get all payouts
    const payouts = await ctx.db
      .query("commissionPayouts")
      .withIndex("by_commission", (q) => q.eq("commissionId", commission._id))
      .collect();

    return {
      ...commission,
      offerer,
      payouts,
      stats: {
        totalPayouts: payouts.length,
        pendingPayouts: payouts.filter((p) => p.status === "pending_verification" || p.status === "verified").length,
        paidPayouts: payouts.filter((p) => p.status === "paid").length,
        totalPaidAmount: payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amountInCents, 0),
      },
    };
  },
});

/**
 * GET MY COMMISSIONS
 * Get commissions created by the current member
 */
export const getMyCommissions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    memberId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all commissions linked to this member
    const offerLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.memberId).eq("linkType", "offers_commission")
      )
      .collect();

    const commissions = await Promise.all(
      offerLinks.map(async (link) => {
        const commission = await ctx.db.get(link.toObjectId);
        if (!commission || commission.type !== "commission") return null;

        const payouts = await ctx.db
          .query("commissionPayouts")
          .withIndex("by_commission", (q) => q.eq("commissionId", commission._id))
          .collect();

        return {
          ...commission,
          payoutCount: payouts.length,
          pendingPayoutCount: payouts.filter((p) => p.status === "pending_verification").length,
        };
      })
    );

    return commissions.filter(Boolean);
  },
});

/**
 * CREATE COMMISSION
 * Create a new commission offering
 */
export const createCommission = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    memberId: v.id("objects"), // The member creating the commission
    title: v.string(),
    description: v.string(),
    subtype: v.string(), // sales, consulting, referral, partnership
    category: v.optional(v.string()),
    // Commission rate
    commissionType: v.string(), // "percentage" | "fixed"
    commissionValue: v.number(), // 10 for 10% or €10
    currency: v.optional(v.string()), // "EUR" default
    // Availability
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    // Requirements
    requirements: v.optional(v.string()),
    targetDescription: v.optional(v.string()), // What kind of customers/leads
    // Contact
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    // Payment preferences
    acceptedPaymentMethods: v.optional(v.array(v.string())),
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

    // Create the commission object
    const commissionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "commission",
      subtype: args.subtype,
      name: args.title,
      description: args.description,
      status: args.status || "active",
      customProperties: {
        category: args.category,
        commissionType: args.commissionType,
        commissionValue: args.commissionValue,
        currency: args.currency || "EUR",
        validFrom: args.validFrom,
        validUntil: args.validUntil,
        requirements: args.requirements,
        targetDescription: args.targetDescription,
        contactEmail: args.contactEmail,
        contactPhone: args.contactPhone,
        acceptedPaymentMethods: args.acceptedPaymentMethods || ["stripe", "invoice"],
        totalPayoutsCount: 0,
        totalPaidOutCents: 0,
      },
      createdBy: args.memberId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create the offers_commission link
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.memberId,
      toObjectId: commissionId,
      linkType: "offers_commission",
      createdBy: args.memberId,
      createdAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: commissionId,
      actionType: "created",
      actionData: {
        subtype: args.subtype,
        offeredBy: args.memberId,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });

    return commissionId;
  },
});

/**
 * UPDATE COMMISSION
 * Update an existing commission
 */
export const updateCommission = mutation({
  args: {
    sessionId: v.string(),
    commissionId: v.id("objects"),
    memberId: v.id("objects"), // Must be the owner
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      subtype: v.optional(v.string()),
      category: v.optional(v.string()),
      commissionType: v.optional(v.string()),
      commissionValue: v.optional(v.number()),
      currency: v.optional(v.string()),
      validFrom: v.optional(v.number()),
      validUntil: v.optional(v.number()),
      requirements: v.optional(v.string()),
      targetDescription: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      acceptedPaymentMethods: v.optional(v.array(v.string())),
      status: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const commission = await ctx.db.get(args.commissionId);
    if (!commission || commission.type !== "commission") {
      throw new Error("Commission not found");
    }

    // Verify ownership
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.commissionId).eq("linkType", "offers_commission")
      )
      .first();

    if (!offerLink || offerLink.fromObjectId !== args.memberId) {
      throw new Error("You can only edit your own commissions");
    }

    // Update the commission
    await ctx.db.patch(args.commissionId, {
      name: args.updates.title || commission.name,
      description: args.updates.description || commission.description,
      subtype: args.updates.subtype || commission.subtype,
      status: args.updates.status || commission.status,
      customProperties: {
        ...commission.customProperties,
        ...args.updates,
      },
      updatedAt: Date.now(),
    });

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: commission.organizationId,
      objectId: args.commissionId,
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
 * DELETE COMMISSION
 * Soft delete a commission (set status to archived)
 */
export const deleteCommission = mutation({
  args: {
    sessionId: v.string(),
    commissionId: v.id("objects"),
    memberId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const commission = await ctx.db.get(args.commissionId);
    if (!commission || commission.type !== "commission") {
      throw new Error("Commission not found");
    }

    // Verify ownership
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.commissionId).eq("linkType", "offers_commission")
      )
      .first();

    if (!offerLink || offerLink.fromObjectId !== args.memberId) {
      throw new Error("You can only delete your own commissions");
    }

    // Soft delete
    await ctx.db.patch(args.commissionId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Log deletion
    await ctx.db.insert("objectActions", {
      organizationId: commission.organizationId,
      objectId: args.commissionId,
      actionType: "archived",
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// COMMISSION PAYOUT OPERATIONS
// ============================================================================

/**
 * SUBMIT REFERRAL
 * Submit a referral for a commission (affiliate perspective)
 */
export const submitReferral = mutation({
  args: {
    sessionId: v.string(),
    commissionId: v.id("objects"),
    affiliateId: v.id("objects"), // The member submitting the referral
    referralDetails: v.string(),
    referralCustomerName: v.optional(v.string()),
    referralCustomerEmail: v.optional(v.string()),
    referralValue: v.optional(v.number()), // Value of the deal
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const commission = await ctx.db.get(args.commissionId);
    if (!commission || commission.type !== "commission") {
      throw new Error("Commission not found");
    }

    if (commission.status !== "active") {
      throw new Error("This commission is not currently active");
    }

    // Get the merchant (commission owner)
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.commissionId).eq("linkType", "offers_commission")
      )
      .first();

    if (!offerLink) {
      throw new Error("Commission owner not found");
    }

    // Can't refer to yourself
    if (offerLink.fromObjectId === args.affiliateId) {
      throw new Error("You cannot submit a referral for your own commission");
    }

    // Calculate commission amount
    const commissionType = commission.customProperties?.commissionType;
    const commissionValue = commission.customProperties?.commissionValue || 0;
    let amountInCents = 0;

    if (commissionType === "fixed") {
      amountInCents = commissionValue * 100; // Convert to cents
    } else if (commissionType === "percentage" && args.referralValue) {
      amountInCents = Math.round((args.referralValue * commissionValue) / 100 * 100);
    }

    // Create the payout record
    const payoutId = await ctx.db.insert("commissionPayouts", {
      organizationId: commission.organizationId,
      commissionId: args.commissionId,
      affiliateId: args.affiliateId,
      merchantId: offerLink.fromObjectId,
      referralDetails: args.referralDetails,
      referralDate: Date.now(),
      referralCustomerName: args.referralCustomerName,
      referralCustomerEmail: args.referralCustomerEmail,
      referralValue: args.referralValue,
      amountInCents,
      currency: commission.customProperties?.currency || "EUR",
      status: "pending_verification",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create earns_commission link
    await ctx.db.insert("objectLinks", {
      organizationId: commission.organizationId,
      fromObjectId: args.affiliateId,
      toObjectId: args.commissionId,
      linkType: "earns_commission",
      properties: {
        payoutId,
        submittedAt: Date.now(),
      },
      createdBy: args.affiliateId,
      createdAt: Date.now(),
    });

    // Log submission
    await ctx.db.insert("objectActions", {
      organizationId: commission.organizationId,
      objectId: args.commissionId,
      actionType: "referral_submitted",
      actionData: {
        payoutId,
        affiliateId: args.affiliateId,
        referralValue: args.referralValue,
      },
      performedBy: args.affiliateId,
      performedAt: Date.now(),
    });

    return payoutId;
  },
});

/**
 * VERIFY REFERRAL
 * Merchant verifies a referral is legitimate
 */
export const verifyReferral = mutation({
  args: {
    sessionId: v.string(),
    payoutId: v.id("commissionPayouts"),
    memberId: v.id("objects"), // Must be the merchant
    adjustedAmount: v.optional(v.number()), // Can adjust the amount
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "pending_verification") {
      throw new Error("This referral has already been processed");
    }

    // Verify merchant owns the commission
    if (payout.merchantId !== args.memberId) {
      throw new Error("Only the commission owner can verify referrals");
    }

    // Update payout
    await ctx.db.patch(args.payoutId, {
      status: "verified",
      amountInCents: args.adjustedAmount ? args.adjustedAmount * 100 : payout.amountInCents,
      updatedAt: Date.now(),
    });

    // Log verification
    await ctx.db.insert("objectActions", {
      organizationId: payout.organizationId,
      objectId: payout.commissionId,
      actionType: "referral_verified",
      actionData: {
        payoutId: args.payoutId,
        verifiedBy: args.memberId,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

/**
 * REJECT REFERRAL
 * Merchant rejects a referral
 */
export const rejectReferral = mutation({
  args: {
    sessionId: v.string(),
    payoutId: v.id("commissionPayouts"),
    memberId: v.id("objects"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.merchantId !== args.memberId) {
      throw new Error("Only the commission owner can reject referrals");
    }

    // Update payout
    await ctx.db.patch(args.payoutId, {
      status: "cancelled",
      disputeReason: args.reason,
      updatedAt: Date.now(),
    });

    // Log rejection
    await ctx.db.insert("objectActions", {
      organizationId: payout.organizationId,
      objectId: payout.commissionId,
      actionType: "referral_rejected",
      actionData: {
        payoutId: args.payoutId,
        rejectedBy: args.memberId,
        reason: args.reason,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

/**
 * GET MY EARNED COMMISSIONS
 * Get all commissions earned by the current user in an organization (as affiliate)
 * Looks up payouts by the user's linked member object (CRM contact)
 */
export const getMyEarnedCommissions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthenticatedUser(ctx, args.sessionId);

    // Find the user's member object (CRM contact) in this organization
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
      // No member object found for this user - return empty payouts
      return [];
    }

    let payouts = await ctx.db
      .query("commissionPayouts")
      .withIndex("by_affiliate", (q) => q.eq("affiliateId", memberObject._id))
      .collect();

    if (args.status) {
      payouts = payouts.filter((p) => p.status === args.status);
    }

    // Enrich with commission info
    const enrichedPayouts = await Promise.all(
      payouts.map(async (payout) => {
        const commission = await ctx.db.get(payout.commissionId);
        const merchant = await ctx.db.get(payout.merchantId);

        const commissionObj = commission && "type" in commission && commission.type === "commission" ? commission : null;
        const merchantObj = merchant && "type" in merchant && merchant.type === "crm_contact" ? merchant : null;

        return {
          ...payout,
          commission: commissionObj ? {
            id: commissionObj._id,
            name: commissionObj.name,
            description: commissionObj.description,
          } : null,
          merchant: merchantObj ? {
            id: merchantObj._id,
            name: merchantObj.name,
          } : null,
        };
      })
    );

    return enrichedPayouts;
  },
});

/**
 * GET PAYOUTS FOR MY COMMISSIONS
 * Get all payouts for commissions I offer (as merchant)
 */
export const getPayoutsForMyCommissions = query({
  args: {
    sessionId: v.string(),
    memberId: v.id("objects"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let payouts = await ctx.db
      .query("commissionPayouts")
      .withIndex("by_merchant", (q) => q.eq("merchantId", args.memberId))
      .collect();

    if (args.status) {
      payouts = payouts.filter((p) => p.status === args.status);
    }

    // Enrich with commission and affiliate info
    const enrichedPayouts = await Promise.all(
      payouts.map(async (payout) => {
        const commission = await ctx.db.get(payout.commissionId);
        const affiliate = await ctx.db.get(payout.affiliateId);

        const commissionObj = commission && "type" in commission && commission.type === "commission" ? commission : null;
        const affiliateObj = affiliate && "type" in affiliate && affiliate.type === "crm_contact" ? affiliate : null;

        return {
          ...payout,
          commission: commissionObj ? {
            id: commissionObj._id,
            name: commissionObj.name,
          } : null,
          affiliate: affiliateObj ? {
            id: affiliateObj._id,
            name: affiliateObj.name,
            email: affiliateObj.customProperties?.email,
          } : null,
        };
      })
    );

    return enrichedPayouts;
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * INTERNAL: Get commission by ID
 */
export const getCommissionInternal = internalQuery({
  args: {
    commissionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const commission = await ctx.db.get(args.commissionId);
    if (!commission || commission.type !== "commission") {
      return null;
    }
    return commission;
  },
});
