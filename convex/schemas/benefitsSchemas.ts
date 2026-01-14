/**
 * BENEFITS PLATFORM SCHEMAS
 *
 * Schema extensions for the Benefits & Commissions Platform.
 *
 * ONTOLOGY INTEGRATION:
 * - Benefits stored as objects (type="benefit")
 * - Commissions stored as objects (type="commission")
 * - Member profiles use CRM contacts (type="crm_contact")
 * - Relationships use objectLinks
 *
 * These tables are for TRACKING and WORKFLOW only:
 * - benefitClaims: Track benefit claim workflow
 * - commissionPayouts: Track commission payout workflow
 * - memberWallets: Link crypto wallets to members
 * - platformFees: Track platform fees for billing
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * BENEFIT CLAIMS
 *
 * Tracks the claim workflow for benefits.
 * Benefits themselves are stored in objects table (type="benefit").
 *
 * Workflow: pending → approved → redeemed OR rejected/expired
 */
export const benefitClaims = defineTable({
  organizationId: v.id("organizations"),

  // References to ontology objects
  benefitId: v.id("objects"),      // type="benefit"
  claimedById: v.id("objects"),    // type="crm_contact"

  // Claim status workflow
  status: v.union(
    v.literal("pending"),     // Claim submitted, awaiting approval
    v.literal("approved"),    // Claim approved by benefit owner
    v.literal("redeemed"),    // Benefit was actually used
    v.literal("expired"),     // Claim expired without redemption
    v.literal("rejected")     // Claim was rejected
  ),

  // Workflow timestamps
  claimedAt: v.number(),
  approvedAt: v.optional(v.number()),
  approvedById: v.optional(v.id("objects")),
  redeemedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),

  // Notes and feedback
  notes: v.optional(v.string()),
  rejectionReason: v.optional(v.string()),

  // Platform fee tracking
  platformFeeRecordId: v.optional(v.id("platformFees")),
})
  .index("by_benefit", ["benefitId"])
  .index("by_claimer", ["claimedById"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_benefit_status", ["benefitId", "status"])
  .index("by_claimed_at", ["claimedAt"]);

/**
 * COMMISSION PAYOUTS
 *
 * Tracks commission payout workflow and payment status.
 * Commissions stored in objects table (type="commission").
 */
export const commissionPayouts = defineTable({
  organizationId: v.id("organizations"),

  // References to ontology objects
  commissionId: v.id("objects"),    // type="commission"
  affiliateId: v.id("objects"),     // type="crm_contact" - who earned it
  merchantId: v.id("objects"),      // type="crm_contact" - who pays it

  // Referral details
  referralDetails: v.string(),
  referralDate: v.optional(v.number()),
  referralCustomerName: v.optional(v.string()),
  referralCustomerEmail: v.optional(v.string()),
  referralValue: v.optional(v.number()),

  // Payout amount
  amountInCents: v.number(),
  currency: v.string(),

  // Status workflow
  status: v.union(
    v.literal("pending_verification"),
    v.literal("verified"),
    v.literal("processing"),
    v.literal("paid"),
    v.literal("disputed"),
    v.literal("cancelled")
  ),

  // Payment method and details
  paymentMethod: v.optional(v.union(
    v.literal("stripe"),
    v.literal("paypal"),
    v.literal("crypto_direct"),
    v.literal("crypto_escrow"),
    v.literal("invoice"),
    v.literal("manual")
  )),
  paymentReference: v.optional(v.string()),
  paymentProcessedAt: v.optional(v.number()),

  // Crypto-specific fields
  walletAddress: v.optional(v.string()),
  txHash: v.optional(v.string()),
  escrowContractAddress: v.optional(v.string()),
  escrowId: v.optional(v.string()),

  // Invoice reference
  invoiceId: v.optional(v.id("objects")),

  // Platform fee tracking
  platformFeeRecordId: v.optional(v.id("platformFees")),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  paidAt: v.optional(v.number()),

  // Dispute handling
  disputeReason: v.optional(v.string()),
  disputeResolvedAt: v.optional(v.number()),
  disputeResolution: v.optional(v.string()),
})
  .index("by_commission", ["commissionId"])
  .index("by_affiliate", ["affiliateId"])
  .index("by_merchant", ["merchantId"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_payment_method", ["organizationId", "paymentMethod"])
  .index("by_created_at", ["createdAt"])
  .index("by_paid_at", ["paidAt"]);

/**
 * MEMBER WALLETS
 *
 * Links crypto wallet addresses to members for Web3 payments.
 */
export const memberWallets = defineTable({
  organizationId: v.id("organizations"),

  // Member reference
  memberId: v.id("objects"),        // type="crm_contact"
  externalUserId: v.optional(v.string()),  // External OAuth user ID

  // Wallet details
  walletAddress: v.string(),
  chainId: v.optional(v.number()),

  // Verification
  signatureMessage: v.string(),
  signature: v.string(),
  verifiedAt: v.number(),

  // Metadata
  isPrimary: v.boolean(),
  label: v.optional(v.string()),

  linkedAt: v.number(),
})
  .index("by_member", ["memberId"])
  .index("by_org_external_user", ["organizationId", "externalUserId"])
  .index("by_wallet", ["walletAddress"])
  .index("by_org_primary", ["organizationId", "isPrimary"]);

/**
 * PLATFORM FEES
 *
 * Tracks platform fees for billing.
 */
export const platformFees = defineTable({
  organizationId: v.id("organizations"),

  // Fee type and source
  feeType: v.union(
    v.literal("benefit_claim"),
    v.literal("commission_stripe"),
    v.literal("commission_paypal"),
    v.literal("commission_crypto"),
    v.literal("commission_escrow")
  ),

  // Source reference
  sourceType: v.union(v.literal("benefit_claim"), v.literal("commission_payout")),
  sourceId: v.union(v.id("benefitClaims"), v.id("commissionPayouts")),

  // Fee amount
  feeAmountInCents: v.number(),
  currency: v.string(),

  // Billing period
  billingPeriod: v.string(),

  // Invoice status
  invoiceStatus: v.union(
    v.literal("pending"),
    v.literal("invoiced"),
    v.literal("paid")
  ),
  invoiceId: v.optional(v.id("objects")),

  // Timestamps
  createdAt: v.number(),
  invoicedAt: v.optional(v.number()),
  paidAt: v.optional(v.number()),
})
  .index("by_org_period", ["organizationId", "billingPeriod"])
  .index("by_org_status", ["organizationId", "invoiceStatus"])
  .index("by_fee_type", ["organizationId", "feeType"])
  .index("by_source", ["sourceType", "sourceId"])
  .index("by_created_at", ["createdAt"]);
