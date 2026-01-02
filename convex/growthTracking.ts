/**
 * GROWTH TRACKING MUTATIONS & QUERIES
 *
 * Super admin dashboard for tracking the 90-day launch metrics
 * @see .kiro/platform_pricing_v2/LAUNCH-PLAN-2026-WALL-POSTER.md
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * INTERNAL: Record Signup Event (Auto-called from onboarding)
 */
export const recordSignupEvent = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    email: v.string(),
    planTier: v.string(), // Changed from 'plan' to 'planTier'
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0]; // "2026-01-06"

    // 1. Create signup event
    await ctx.db.insert("signupEvents", {
      userId: args.userId,
      organizationId: args.organizationId,
      email: args.email,
      signupDate: today,
      signupTimestamp: now,
      plan: args.planTier, // Store as 'plan' in DB for now (can migrate schema later)
      createdAt: now,
    });

    // 2. Update daily metrics (increment free signups)
    const existingMetric = await ctx.db
      .query("dailyGrowthMetrics")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existingMetric) {
      // Update existing
      await ctx.db.patch(existingMetric._id, {
        freeSignups: existingMetric.freeSignups + 1,
        updatedAt: now,
      });
    } else {
      // Create new daily record
      const weekNumber = getWeekNumber(today);
      await ctx.db.insert("dailyGrowthMetrics", {
        date: today,
        week: weekNumber,
        templateDownloads: 0,
        freeSignups: 1, // First signup of the day
        starterCustomers: 0,
        buildSprintApplications: 0,
        revenueEUR: 0,
        starterMRR: 0,
        buildSprintRevenue: 0,
        source: "automated",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * SUPER ADMIN: Manually Add Daily Metrics
 */
export const addDailyMetric = mutation({
  args: {
    sessionId: v.string(),
    date: v.string(), // "2026-01-06"
    templateDownloads: v.optional(v.number()),
    buildSprintApplications: v.optional(v.number()),
    revenueEUR: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Verify super admin permission
    const session = await ctx.db.get(args.sessionId as any);
    if (!session) throw new Error("Invalid session");

    // Type guard to ensure we have a sessions table entry
    if (!("userId" in session)) {
      throw new Error("Invalid session type");
    }

    const now = Date.now();
    const weekNumber = getWeekNumber(args.date);

    // Get or create daily metric
    const existing = await ctx.db
      .query("dailyGrowthMetrics")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      // Update existing
      const updates: any = { updatedAt: now };
      if (args.templateDownloads !== undefined) updates.templateDownloads = args.templateDownloads;
      if (args.buildSprintApplications !== undefined) updates.buildSprintApplications = args.buildSprintApplications;
      if (args.revenueEUR !== undefined) updates.revenueEUR = args.revenueEUR;
      if (args.notes !== undefined) updates.notes = args.notes;

      await ctx.db.patch(existing._id, updates);
      return { success: true, id: existing._id };
    } else {
      // Create new
      const id = await ctx.db.insert("dailyGrowthMetrics", {
        date: args.date,
        week: weekNumber,
        templateDownloads: args.templateDownloads || 0,
        freeSignups: 0, // Will be filled by automated signups
        starterCustomers: 0, // Will be filled by Stripe webhooks
        buildSprintApplications: args.buildSprintApplications || 0,
        revenueEUR: args.revenueEUR || 0,
        starterMRR: 0,
        buildSprintRevenue: 0,
        source: "manual",
        notes: args.notes,
        enteredBy: session.userId as any, // Type assertion for mixed table types
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, id };
    }
  },
});

/**
 * SUPER ADMIN: Get Weekly Scorecard
 */
export const getWeeklyScorecard = query({
  args: {
    week: v.optional(v.number()), // 1-12, or current week if omitted
  },
  handler: async (ctx, args) => {
    // Get current week if not specified
    const targetWeek = args.week || getCurrentWeekNumber();

    // Get week targets from Launch Plan
    const targets = getWeekTargets(targetWeek);

    // Aggregate actuals from daily metrics
    const dailyMetrics = await ctx.db
      .query("dailyGrowthMetrics")
      .withIndex("by_week", (q) => q.eq("week", targetWeek))
      .collect();

    const actuals = dailyMetrics.reduce(
      (acc, day) => ({
        downloads: acc.downloads + day.templateDownloads,
        signups: acc.signups + day.freeSignups,
        starter: Math.max(acc.starter, day.starterCustomers), // Take max (cumulative)
        buildSprint: acc.buildSprint + day.buildSprintApplications,
        revenue: acc.revenue + day.revenueEUR,
      }),
      { downloads: 0, signups: 0, starter: 0, buildSprint: 0, revenue: 0 }
    );

    // Calculate progress
    const progress = {
      downloads: (actuals.downloads / targets.downloads) * 100,
      signups: (actuals.signups / targets.signups) * 100,
      starter: (actuals.starter / targets.starter) * 100,
    };

    // Determine status
    const avgProgress = (progress.downloads + progress.signups + progress.starter) / 3;
    let status: "on_track" | "warning" | "behind" = "on_track";
    if (avgProgress < 70) status = "behind";
    else if (avgProgress < 90) status = "warning";

    return {
      week: targetWeek,
      targets,
      actuals,
      progress,
      status,
      weekStart: getWeekStart(targetWeek),
      weekEnd: getWeekEnd(targetWeek),
    };
  },
});

/**
 * SUPER ADMIN: Get All Signups (with filters)
 */
export const getAllSignups = query({
  args: {
    plan: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let signups = await ctx.db.query("signupEvents").collect();

    // Apply filters
    if (args.plan) {
      signups = signups.filter((s) => s.plan === args.plan);
    }
    if (args.dateFrom) {
      signups = signups.filter((s) => s.signupDate >= args.dateFrom!);
    }
    if (args.dateTo) {
      signups = signups.filter((s) => s.signupDate <= args.dateTo!);
    }

    // Sort by date (newest first)
    signups.sort((a, b) => b.signupTimestamp - a.signupTimestamp);

    return signups;
  },
});

/**
 * SUPER ADMIN: Get All Daily Metrics
 */
export const getAllDailyMetrics = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let metrics = await ctx.db.query("dailyGrowthMetrics").collect();

    // Apply filters
    if (args.dateFrom) {
      metrics = metrics.filter((m) => m.date >= args.dateFrom!);
    }
    if (args.dateTo) {
      metrics = metrics.filter((m) => m.date <= args.dateTo!);
    }

    // Sort by date (newest first)
    metrics.sort((a, b) => b.date.localeCompare(a.date));

    return metrics;
  },
});

/**
 * SUPER ADMIN: Get Dashboard Summary
 */
export const getDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const launchDate = "2026-01-06";

    // Days since launch
    const daysSinceLaunch = Math.floor((new Date(today).getTime() - new Date(launchDate).getTime()) / (1000 * 60 * 60 * 24));

    // Get all metrics
    const allMetrics = await ctx.db.query("dailyGrowthMetrics").collect();

    // Calculate totals
    const totals = allMetrics.reduce(
      (acc, day) => ({
        downloads: acc.downloads + day.templateDownloads,
        signups: acc.signups + day.freeSignups,
        starter: Math.max(acc.starter, day.starterCustomers),
        buildSprint: acc.buildSprint + day.buildSprintApplications,
        revenue: acc.revenue + day.revenueEUR,
      }),
      { downloads: 0, signups: 0, starter: 0, buildSprint: 0, revenue: 0 }
    );

    // Get current week targets
    const currentWeek = getCurrentWeekNumber();
    const weekTargets = getWeekTargets(currentWeek);

    // Check milestones
    const milestones = await checkMilestones(totals);

    return {
      daysSinceLaunch,
      daysRemaining: 90 - daysSinceLaunch,
      currentWeek,
      totals,
      weekTargets,
      milestones,
      goalProgress: {
        customers: (totals.starter / 10) * 100, // Goal: 10 customers
        revenue: (totals.revenue / 30000) * 100, // Goal: €30K
      },
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get week number (1-12) from date
 * Week 1 = Jan 6-12, 2026
 */
function getWeekNumber(date: string): number {
  const launchDate = new Date("2026-01-06");
  const targetDate = new Date(date);
  const daysDiff = Math.floor((targetDate.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(daysDiff / 7) + 1;
}

/**
 * Get current week number
 */
function getCurrentWeekNumber(): number {
  const today = new Date().toISOString().split('T')[0];
  return getWeekNumber(today);
}

/**
 * Get week start date (Monday)
 */
function getWeekStart(week: number): string {
  const launchDate = new Date("2026-01-06"); // Monday
  const daysToAdd = (week - 1) * 7;
  const weekStart = new Date(launchDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return weekStart.toISOString().split('T')[0];
}

/**
 * Get week end date (Sunday)
 */
function getWeekEnd(week: number): string {
  const weekStart = new Date(getWeekStart(week));
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  return weekEnd.toISOString().split('T')[0];
}

/**
 * Get week targets from Launch Plan
 */
function getWeekTargets(week: number) {
  // From LAUNCH-PLAN-2026-WALL-POSTER.md
  const targets = [
    { week: 1, downloads: 25, signups: 10, starter: 1, buildSprint: 1 },
    { week: 2, downloads: 50, signups: 20, starter: 2, buildSprint: 2 },
    { week: 3, downloads: 75, signups: 30, starter: 3, buildSprint: 2 },
    { week: 4, downloads: 100, signups: 40, starter: 3, buildSprint: 3 },
    { week: 5, downloads: 125, signups: 50, starter: 4, buildSprint: 3 },
    { week: 6, downloads: 150, signups: 60, starter: 5, buildSprint: 4 },
    { week: 7, downloads: 175, signups: 70, starter: 6, buildSprint: 4 },
    { week: 8, downloads: 200, signups: 80, starter: 7, buildSprint: 5 },
    { week: 9, downloads: 225, signups: 90, starter: 8, buildSprint: 5 },
    { week: 10, downloads: 250, signups: 100, starter: 9, buildSprint: 6 },
    { week: 11, downloads: 275, signups: 110, starter: 9, buildSprint: 6 },
    { week: 12, downloads: 300, signups: 120, starter: 10, buildSprint: 6 },
  ];

  const target = targets.find((t) => t.week === week) || targets[targets.length - 1];
  return target;
}

/**
 * Check milestone achievements
 */
async function checkMilestones(totals: {
  downloads: number;
  signups: number;
  starter: number;
  revenue: number;
}) {
  const milestones = [
    { name: "First template download", threshold: 1, metric: totals.downloads, emoji: "📥" },
    { name: "First free signup", threshold: 1, metric: totals.signups, emoji: "🎉" },
    { name: "First €199", threshold: 199, metric: totals.revenue, emoji: "💰" },
    { name: "€1,000 MRR", threshold: 1000, metric: totals.revenue, emoji: "📈" },
    { name: "€2,000 MRR", threshold: 2000, metric: totals.revenue, emoji: "🚀" },
    { name: "10 customers", threshold: 10, metric: totals.starter, emoji: "🎉🎉🎉" },
    { name: "€30,000 total", threshold: 30000, metric: totals.revenue, emoji: "🏆" },
  ];

  return milestones.map((m) => ({
    ...m,
    achieved: m.metric >= m.threshold,
    progress: Math.min((m.metric / m.threshold) * 100, 100),
  }));
}
