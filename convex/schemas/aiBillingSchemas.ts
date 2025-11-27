/**
 * AI BILLING SCHEMAS v3.1
 *
 * Database schemas for AI features billing and usage tracking.
 * Supports three privacy tiers (all prices include 19% German VAT):
 * - Standard (€49/month) - All models, global routing
 * - Privacy-Enhanced (€49/month) - GDPR-optimized, EU providers, ZDR
 * - Private LLM (€2,500+/month) - Self-hosted, customer infrastructure
 *
 * Related Documentation:
 * - .kiro/ai_integration_platform/AI_BILLING_ARCHITECTURE_v3.1.md - Complete architecture
 * - .kiro/ai_integration_platform/AI_BILLING_IMPLEMENTATION_CHECKLIST_v3.md - Implementation guide
 * - .kiro/ai_integration_platform/AI_SETTINGS_UI_SPECIFICATION.md - UI specifications
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * AI USAGE TRACKING
 *
 * Tracks AI API usage for billing and monitoring purposes.
 * Records are created after each AI request (chat, embedding, completion).
 *
 * Purpose:
 * - Calculate monthly bills for Platform Key mode
 * - Display usage dashboard for both modes
 * - Enforce budget limits for Platform Key mode
 * - Provide usage analytics and forecasting
 */
export const aiUsage = defineTable({
  // Identification
  organizationId: v.id("organizations"),    // Which organization made the request
  userId: v.optional(v.id("users")),        // Which user made the request (optional)

  // Billing period tracking
  // These define the monthly billing cycle (e.g., Jan 1 - Jan 31)
  periodStart: v.number(),                  // Unix timestamp (start of billing month)
  periodEnd: v.number(),                    // Unix timestamp (end of billing month)

  // Usage metrics
  requestCount: v.number(),                 // Number of AI requests in this record (usually 1)
  inputTokens: v.number(),                  // Number of input tokens used
  outputTokens: v.number(),                 // Number of output tokens generated
  totalTokens: v.number(),                  // Total tokens (input + output)
  costInCents: v.number(),                  // Cost in cents ($1.00 = 100 cents)

  // Request details (for breakdown and analytics)
  requestType: v.union(
    v.literal("chat"),                      // AI chat message
    v.literal("embedding"),                 // Vector embedding generation
    v.literal("completion"),                // Text completion
    v.literal("tool_call")                  // AI tool/function call
  ),

  // Provider and model info
  provider: v.string(),                     // "anthropic", "openai", "google", etc.
  model: v.string(),                        // "claude-3-5-sonnet", "gpt-4", etc.

  // Privacy tier at time of request (v3.1)
  // This can change over time, so we record it per request
  tier: v.union(
    v.literal("standard"),                  // Standard tier (€49/month, all models)
    v.literal("privacy-enhanced"),          // Privacy-Enhanced tier (€49/month, GDPR-optimized)
    v.literal("private-llm")                // Private LLM tier (€2,500+/month, self-hosted)
  ),

  // Privacy audit fields (for Privacy-Enhanced tier compliance)
  dataCollectionPolicy: v.optional(v.string()),  // "deny" for Privacy-Enhanced, "allow" for Standard
  zdrEnforced: v.optional(v.boolean()),          // Zero Data Retention enforced
  providerRegion: v.optional(v.string()),        // "eu", "us", "global" - for audit trail

  // Request metadata (for debugging and analytics)
  requestDurationMs: v.optional(v.number()), // How long the API call took
  success: v.boolean(),                     // Whether the request succeeded
  errorMessage: v.optional(v.string()),     // Error message if failed

  // Timestamps
  createdAt: v.number(),                    // When this usage record was created
  updatedAt: v.number(),                    // When this record was last updated
})
  // Query by organization to get all usage
  .index("by_organization", ["organizationId"])

  // Query by organization and period for monthly billing calculations
  .index("by_period", ["organizationId", "periodStart", "periodEnd"])

  // Query by tier to separate Standard/Privacy-Enhanced/Private LLM usage
  .index("by_tier", ["organizationId", "tier"])

  // Query by user to show individual usage
  .index("by_user", ["userId"])

  // Query recent requests for monitoring
  .index("by_created_at", ["organizationId", "createdAt"]);

/**
 * AI SUBSCRIPTIONS v3.1
 *
 * Tracks Stripe subscription status for AI features across three privacy tiers.
 * Each organization can have at most one active AI subscription.
 *
 * Privacy Tiers (all prices include 19% German VAT):
 * - Standard (€49/month): All models, global routing, 500K tokens/month included
 * - Privacy-Enhanced (€49/month): GDPR-optimized, EU providers, ZDR, 500K tokens/month included
 * - Private LLM (€2,500-€12,000/month): Self-hosted infrastructure, unlimited tokens
 *
 * Subscription Flow:
 * 1. User selects tier in Manage → AI Settings
 * 2. System creates Stripe customer (if doesn't exist)
 * 3. System creates Stripe subscription based on selected tier
 * 4. Record is created in this table
 * 5. Stripe webhooks update subscription status over time
 *
 * Important: This is separate from Stripe Connect!
 * - Stripe Connect: Organizations accept payments from THEIR customers
 * - AI Subscriptions: L4YERCAK3 charges organizations for AI usage
 */
export const aiSubscriptions = defineTable({
  // Identification
  organizationId: v.id("organizations"),    // Which organization this subscription belongs to

  // Stripe subscription details
  stripeSubscriptionId: v.string(),         // sub_xxx - Stripe subscription ID
  stripeCustomerId: v.string(),             // cus_xxx - Stripe customer ID
  stripePriceId: v.string(),                // price_xxx - Subscription price ID

  // Subscription status (synced from Stripe via webhooks)
  status: v.union(
    v.literal("active"),                    // Subscription active and paid up
    v.literal("trialing"),                  // In trial period
    v.literal("past_due"),                  // Payment failed but still in grace period
    v.literal("canceled"),                  // User canceled, still active until period end
    v.literal("unpaid"),                    // Payment failed and grace period expired
    v.literal("incomplete"),                // Initial payment failed
    v.literal("incomplete_expired"),        // Initial payment failed and timed out
    v.literal("paused")                     // Paused (Private LLM only)
  ),

  // Privacy tier (v3.1)
  tier: v.union(
    v.literal("standard"),                  // Standard tier (€49/month)
    v.literal("privacy-enhanced"),          // Privacy-Enhanced tier (€49/month)
    v.literal("private-llm")                // Private LLM tier (€2,500-€12,000/month)
  ),

  // Private LLM sub-tier (if applicable)
  privateLLMTier: v.optional(v.union(
    v.literal("starter"),                   // €2,500/month
    v.literal("professional"),              // €6,000/month
    v.literal("enterprise")                 // €12,000/month
  )),

  // Privacy settings (Standard & Privacy-Enhanced)
  privacySettings: v.optional(v.object({
    dataCollection: v.union(
      v.literal("allow"),                   // Standard tier
      v.literal("deny")                     // Privacy-Enhanced tier
    ),
    zeroDataRetention: v.boolean(),         // true for Privacy-Enhanced
    preferredProviders: v.array(v.string()), // e.g., ["Mistral", "Anthropic"]
  })),

  // Private LLM settings (Private LLM tier only)
  privateLLMSettings: v.optional(v.object({
    endpointUrl: v.string(),                // https://xyz123.eu-west-1.inference.huggingface.co
    endpointApiKey: v.string(),             // Encrypted API key
    model: v.string(),                      // mistral/Mistral-Large-Instruct-2411
    provider: v.union(
      v.literal("huggingface"),             // Hugging Face Inference Endpoints
      v.literal("wz-it"),                   // WZ-IT GmbH on-premise
      v.literal("customer-hosted")          // Customer's own infrastructure
    ),
    region: v.optional(v.string()),         // eu-west-1, etc.
    lastConnectionTest: v.optional(v.number()), // When connection was last tested
    connectionStatus: v.optional(v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("unknown")
    )),
  })),

  // Current billing period (synced from Stripe)
  currentPeriodStart: v.number(),           // Unix timestamp
  currentPeriodEnd: v.number(),             // Unix timestamp

  // Token balance (Standard & Privacy-Enhanced only)
  includedTokensTotal: v.number(),          // 500,000 tokens
  includedTokensUsed: v.number(),           // Resets each period

  // Trial information
  trialStart: v.optional(v.number()),
  trialEnd: v.optional(v.number()),

  // Cancellation information
  cancelAtPeriodEnd: v.boolean(),
  canceledAt: v.optional(v.number()),

  // Payment information
  defaultPaymentMethodId: v.optional(v.string()), // pm_xxx
  lastPaymentStatus: v.optional(v.string()),
  lastPaymentAt: v.optional(v.number()),

  // Pricing (stored for reference, VAT inclusive)
  priceInCents: v.number(),                 // 4900 for €49, 250000 for €2,500
  currency: v.string(),                     // "EUR"

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_stripe_subscription", ["stripeSubscriptionId"])
  .index("by_stripe_customer", ["stripeCustomerId"])
  .index("by_status", ["status"])
  .index("by_tier", ["tier"])
  .index("by_period_end", ["currentPeriodEnd"]);

/**
 * AI TOKEN BALANCE v3.1
 *
 * Tracks purchased token balance for Standard and Privacy-Enhanced tiers.
 * Included tokens (500K/month) are tracked in aiSubscriptions.
 * This table tracks additional purchased tokens.
 *
 * Token Rules (v3.1):
 * - Included tokens reset monthly (no rollover)
 * - Purchased tokens never expire while subscription is active
 * - Consumption order: Included tokens first, then purchased
 * - If subscription lapses: 30-day grace period, then tokens forfeited
 * - Token packs: €29, €139, €249, €1,149 (all prices include 19% VAT)
 */
export const aiTokenBalance = defineTable({
  organizationId: v.id("organizations"),

  // Purchased token balance (Standard/Privacy-Enhanced only)
  purchasedTokens: v.number(),              // Remaining purchased tokens

  // Grace period tracking (if subscription canceled)
  gracePeriodStart: v.optional(v.number()),
  gracePeriodEnd: v.optional(v.number()),

  // Timestamps
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"]);

/**
 * AI TOKEN PURCHASES v3.1
 *
 * Audit trail of token pack purchases (Standard & Privacy-Enhanced tiers).
 * Each purchase adds to the purchasedTokens balance in aiTokenBalance.
 *
 * Token Packs (v3.1, all prices include 19% German VAT):
 * - Starter: €29 (1M tokens)
 * - Standard: €139 (5M tokens) - 4% discount
 * - Professional: €249 (10M tokens) - 14% discount
 * - Enterprise: €1,149 (50M tokens) - 21% discount
 */
export const aiTokenPurchases = defineTable({
  organizationId: v.id("organizations"),
  subscriptionId: v.id("aiSubscriptions"),

  // Purchase details
  packId: v.string(),                       // "starter", "standard", "professional", "enterprise"
  packName: v.string(),                     // "Starter", "Standard", etc.
  tokensAmount: v.number(),                 // Number of tokens purchased (e.g., 1000000)

  // Pricing (VAT inclusive)
  priceInCents: v.number(),                 // 2900, 13900, 24900, 114900 (incl. VAT)
  currency: v.string(),                     // "EUR"
  vatRate: v.number(),                      // 19 (percent)
  netAmountInCents: v.number(),             // Price / 1.19
  vatAmountInCents: v.number(),             // Price - Net

  // Stripe payment
  stripePaymentIntentId: v.string(),        // pi_xxx
  stripeInvoiceId: v.optional(v.string()),  // in_xxx
  paymentStatus: v.union(
    v.literal("succeeded"),
    v.literal("processing"),
    v.literal("failed"),
    v.literal("canceled")
  ),

  // Timestamps
  purchasedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_subscription", ["subscriptionId"])
  .index("by_payment_intent", ["stripePaymentIntentId"])
  .index("by_purchased_at", ["organizationId", "purchasedAt"]);

/**
 * AI BUDGET ALERTS
 *
 * Tracks budget alerts sent to organizations.
 * Prevents duplicate alerts (e.g., don't send "75% used" alert multiple times).
 *
 * Alert Thresholds:
 * - 50% - Early warning
 * - 75% - Approaching limit
 * - 90% - Critical warning
 * - 100% - Budget exceeded (requests will be blocked)
 */
export const aiBudgetAlerts = defineTable({
  // Identification
  organizationId: v.id("organizations"),    // Which organization
  subscriptionId: v.id("aiSubscriptions"),  // Which subscription

  // Alert details
  threshold: v.number(),                    // Alert threshold percentage (50, 75, 90, 100)
  periodStart: v.number(),                  // Billing period start
  periodEnd: v.number(),                    // Billing period end

  // Usage at time of alert
  usageInCents: v.number(),                 // How much was used when alert triggered
  budgetInCents: v.number(),                // What the budget limit was
  percentageUsed: v.number(),               // Percentage used (calculated)

  // Alert status
  sentAt: v.number(),                       // When alert was sent
  acknowledged: v.boolean(),                // Whether user acknowledged the alert
  acknowledgedAt: v.optional(v.number()),   // When user acknowledged

  // Delivery info
  deliveryMethod: v.union(
    v.literal("email"),                     // Sent via email
    v.literal("in_app"),                    // Shown in app notification
    v.literal("both")                       // Both email and in-app
  ),
  emailsSent: v.array(v.string()),          // List of email addresses notified

  // Timestamps
  createdAt: v.number(),
})
  // Query by organization and period (check if alert already sent)
  .index("by_org_period", ["organizationId", "periodStart", "periodEnd", "threshold"])

  // Query by subscription (get all alerts for a subscription)
  .index("by_subscription", ["subscriptionId"])

  // Query unacknowledged alerts (for displaying in UI)
  .index("by_acknowledged", ["organizationId", "acknowledged"]);

/**
 * AI BILLING EVENTS (Audit Log)
 *
 * Tracks all billing-related events for audit and debugging.
 * Similar to webhook logs but for our internal billing actions.
 *
 * Use Cases:
 * - Debugging subscription issues
 * - Audit trail for compliance
 * - Analytics on billing operations
 * - Troubleshooting payment failures
 */
export const aiBillingEvents = defineTable({
  // Identification
  organizationId: v.id("organizations"),
  subscriptionId: v.optional(v.id("aiSubscriptions")),

  // Event details
  eventType: v.union(
    v.literal("subscription_created"),
    v.literal("subscription_updated"),
    v.literal("subscription_canceled"),
    v.literal("payment_succeeded"),
    v.literal("payment_failed"),
    v.literal("usage_reported"),
    v.literal("budget_alert_sent"),
    v.literal("budget_exceeded"),
    v.literal("ai_enabled"),
    v.literal("ai_disabled"),
    v.literal("billing_mode_changed")
  ),

  // Event data (flexible JSON for different event types)
  eventData: v.any(),

  // Status
  success: v.boolean(),
  errorMessage: v.optional(v.string()),

  // Context
  triggeredBy: v.union(
    v.literal("user"),                      // User action
    v.literal("system"),                    // Automated system action
    v.literal("webhook"),                   // Stripe webhook
    v.literal("cron")                       // Scheduled job
  ),
  userId: v.optional(v.id("users")),        // User who triggered (if applicable)

  // Timestamps
  createdAt: v.number(),
})
  // Query by organization (get billing history)
  .index("by_organization", ["organizationId"])

  // Query by subscription (get events for specific subscription)
  .index("by_subscription", ["subscriptionId"])

  // Query by event type (analytics and monitoring)
  .index("by_event_type", ["eventType"])

  // Query recent events (monitoring and debugging)
  .index("by_created_at", ["createdAt"]);
