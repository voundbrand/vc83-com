/**
 * GROWTH TRACKING SCHEMAS
 *
 * Track launch metrics for the 90-day plan (Jan 6 - Apr 6, 2026)
 * @see .kiro/platform_pricing_v2/LAUNCH-PLAN-2026-WALL-POSTER.md
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Daily Growth Metrics (Automated + Manual Entry)
 *
 * Tracks all metrics from the weekly scorecard:
 * - Template downloads
 * - Free signups (automated)
 * - Starter customers (automated from Stripe)
 * - Build Sprint applications
 * - Revenue
 */
export const dailyGrowthMetrics = defineTable({
  // Date tracking
  date: v.string(), // "2026-01-06" format
  week: v.number(), // Week number (1-12 for Q1)

  // Core Metrics (from Launch Plan)
  templateDownloads: v.number(), // Manual entry
  freeSignups: v.number(), // Automated from signups
  starterCustomers: v.number(), // Automated from Stripe subscriptions
  buildSprintApplications: v.number(), // Manual entry
  revenueEUR: v.number(), // Manual or automated

  // Breakdown (for transparency)
  starterMRR: v.number(), // Monthly recurring from Starter
  buildSprintRevenue: v.number(), // One-time Build Sprint fees

  // Source tracking
  source: v.union(
    v.literal("automated"), // System-generated
    v.literal("manual"), // Admin manual entry
    v.literal("stripe_webhook") // Stripe integration
  ),

  // Metadata
  notes: v.optional(v.string()), // Admin notes
  enteredBy: v.optional(v.id("users")), // Who entered manually
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_date", ["date"])
  .index("by_week", ["week"])
  .index("by_source", ["source"]);

/**
 * Signup Events (Automated Tracking)
 *
 * Captures every signup with full context for analytics
 */
export const signupEvents = defineTable({
  // User info
  userId: v.id("users"),
  organizationId: v.id("organizations"),
  email: v.string(),

  // Signup details
  signupDate: v.string(), // "2026-01-06"
  signupTimestamp: v.number(),
  plan: v.string(), // "free", "starter", "pro", etc.

  // Attribution (future: UTM params, referral codes)
  source: v.optional(v.string()), // "organic", "linkedin", "referral"
  campaign: v.optional(v.string()), // Campaign name
  referralCode: v.optional(v.string()), // Referral tracking

  // Conversion tracking
  convertedToStarter: v.optional(v.boolean()),
  convertedToStarterAt: v.optional(v.number()),
  churned: v.optional(v.boolean()),
  churnedAt: v.optional(v.number()),
  churnReason: v.optional(v.string()),

  // Metadata
  userAgent: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_email", ["email"])
  .index("by_date", ["signupDate"])
  .index("by_plan", ["plan"])
  .index("by_user", ["userId"]);

/**
 * Weekly Scorecard Snapshots
 *
 * Weekly rollups matching the Launch Plan scorecard
 */
export const weeklyScorecard = defineTable({
  // Week identification
  week: v.number(), // 1-12 for Q1
  weekStart: v.string(), // "2026-01-06"
  weekEnd: v.string(), // "2026-01-12"

  // Cumulative targets (from Launch Plan)
  targetDownloads: v.number(),
  targetFreeSignups: v.number(),
  targetStarterCustomers: v.number(),
  targetBuildSprintApps: v.number(),

  // Actual performance
  actualDownloads: v.number(),
  actualFreeSignups: v.number(),
  actualStarterCustomers: v.number(),
  actualBuildSprintApps: v.number(),
  actualRevenue: v.number(),

  // Performance indicators
  downloadsProgress: v.number(), // % of target
  signupsProgress: v.number(),
  starterProgress: v.number(),

  // Status
  status: v.union(
    v.literal("on_track"),
    v.literal("warning"),
    v.literal("behind")
  ),

  // Admin notes
  notes: v.optional(v.string()),
  wins: v.optional(v.array(v.string())), // Weekly wins
  challenges: v.optional(v.array(v.string())), // Weekly challenges

  // Metadata
  generatedAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_week", ["week"])
  .index("by_status", ["status"]);

/**
 * Sales Notifications (Email Queue)
 *
 * Track sales notifications sent for new signups
 */
export const salesNotifications = defineTable({
  // Event details
  eventType: v.union(
    v.literal("free_signup"),
    v.literal("starter_upgrade"),
    v.literal("build_sprint_app"),
    v.literal("milestone_reached")
  ),

  // Related records
  userId: v.optional(v.id("users")),
  organizationId: v.optional(v.id("organizations")),

  // Email details
  recipientEmail: v.string(), // Sales team email
  subject: v.string(),
  body: v.string(),

  // Delivery status
  status: v.union(
    v.literal("pending"),
    v.literal("sent"),
    v.literal("failed")
  ),
  sentAt: v.optional(v.number()),
  errorMessage: v.optional(v.string()),

  // Metadata
  metadata: v.optional(v.any()), // Event-specific data
  createdAt: v.number(),
})
  .index("by_status", ["status"])
  .index("by_event_type", ["eventType"])
  .index("by_created_at", ["createdAt"]);

/**
 * Celebration Milestones (from Launch Plan)
 *
 * Track the celebration checkpoints
 */
export const celebrationMilestones = defineTable({
  // Milestone details
  name: v.string(), // "First template download", "First €199", etc.
  description: v.string(),
  emoji: v.string(), // "🎉", "🚀", etc.

  // Criteria
  metricType: v.string(), // "templateDownloads", "revenue", etc.
  threshold: v.number(), // Target value

  // Achievement status
  achieved: v.boolean(),
  achievedAt: v.optional(v.number()),
  achievedValue: v.optional(v.number()), // Actual value when achieved

  // Notification
  notificationSent: v.optional(v.boolean()),

  // Display order
  order: v.number(),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_order", ["order"])
  .index("by_achieved", ["achieved"]);
