/**
 * PAGE ANALYTICS
 *
 * Professional+ tier feature for viewing detailed page analytics.
 * Implements checkFeatureAccess for pageAnalyticsEnabled.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkFeatureAccess } from "./licensing/helpers";

/**
 * GET PAGE ANALYTICS
 *
 * Returns detailed analytics for a published page.
 * ⚡ PROFESSIONAL TIER: Only Professional+ can view page analytics.
 */
export const getPageAnalytics = query({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get page
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "published_page") {
      throw new Error("Published page not found");
    }

    // ⚡ PROFESSIONAL TIER: Page Analytics
    // Professional+ can view detailed page analytics
    await checkFeatureAccess(ctx, page.organizationId, "pageAnalyticsEnabled");

    const props = page.customProperties || {};

    // Calculate analytics metrics
    const viewCount = props.viewCount || 0;
    const uniqueVisitors = props.uniqueVisitors || 0;
    const lastViewedAt = props.lastViewedAt;
    const publishedAt = props.publishedAt || page.createdAt;
    const daysLive = Math.floor((Date.now() - publishedAt) / (1000 * 60 * 60 * 24));

    // Calculate engagement metrics
    const avgViewsPerDay = daysLive > 0 ? viewCount / daysLive : 0;
    const returnVisitorRate = viewCount > 0 ? ((viewCount - uniqueVisitors) / viewCount) * 100 : 0;

    return {
      pageId: args.pageId,
      slug: props.slug,
      pageTitle: props.metaTitle || page.name,

      // View metrics
      views: {
        total: viewCount,
        unique: uniqueVisitors,
        returning: viewCount - uniqueVisitors,
        returnVisitorRate: Math.round(returnVisitorRate),
      },

      // Time metrics
      time: {
        publishedAt,
        lastViewedAt,
        daysLive,
        avgViewsPerDay: Math.round(avgViewsPerDay * 10) / 10,
      },

      // Status
      status: {
        isPublished: props.isPublished || false,
        analyticsEnabled: props.analyticsEnabled || false,
        lastUpdated: page.updatedAt,
      },
    };
  },
});

/**
 * GET ORGANIZATION PAGE ANALYTICS
 *
 * Returns aggregated analytics for all pages in an organization.
 * ⚡ PROFESSIONAL TIER: Only Professional+ can view organization-wide analytics.
 */
export const getOrganizationPageAnalytics = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    startDate: v.optional(v.number()), // Filter by creation date
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // ⚡ PROFESSIONAL TIER: Page Analytics
    // Professional+ can view organization-wide page analytics
    await checkFeatureAccess(ctx, args.organizationId, "pageAnalyticsEnabled");

    // Get all published pages for organization
    let pages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "published_page")
      )
      .collect();

    // Apply date filters
    if (args.startDate) {
      pages = pages.filter((p) => p.createdAt >= args.startDate!);
    }

    if (args.endDate) {
      pages = pages.filter((p) => p.createdAt <= args.endDate!);
    }

    // Calculate aggregate statistics
    const totalPages = pages.length;
    const publishedPages = pages.filter((p) => p.customProperties?.isPublished).length;
    const draftPages = totalPages - publishedPages;

    // Calculate view totals
    let totalViews = 0;
    let totalUniqueVisitors = 0;

    for (const page of pages) {
      const props = page.customProperties || {};
      totalViews += props.viewCount || 0;
      totalUniqueVisitors += props.uniqueVisitors || 0;
    }

    // Find top performing pages
    const topPages = pages
      .filter((p) => p.customProperties?.viewCount)
      .sort((a, b) => (b.customProperties?.viewCount || 0) - (a.customProperties?.viewCount || 0))
      .slice(0, 10)
      .map((p) => ({
        pageId: p._id,
        name: p.name,
        slug: p.customProperties?.slug,
        views: p.customProperties?.viewCount || 0,
        uniqueVisitors: p.customProperties?.uniqueVisitors || 0,
      }));

    // Calculate average metrics
    const avgViewsPerPage = publishedPages > 0 ? totalViews / publishedPages : 0;
    const returnVisitorRate = totalViews > 0
      ? ((totalViews - totalUniqueVisitors) / totalViews) * 100
      : 0;

    return {
      summary: {
        totalPages,
        publishedPages,
        draftPages,
        totalViews,
        totalUniqueVisitors,
        avgViewsPerPage: Math.round(avgViewsPerPage * 10) / 10,
        returnVisitorRate: Math.round(returnVisitorRate),
      },

      topPages,

      byTemplate: pages.reduce((acc, p) => {
        const template = p.customProperties?.templateCode || "unknown";
        acc[template] = (acc[template] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      byLinkedType: pages.reduce((acc, p) => {
        const linkedType = p.customProperties?.linkedObjectType || "unknown";
        acc[linkedType] = (acc[linkedType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

/**
 * GET PAGE VIEWS OVER TIME
 *
 * Returns time-series data for page views.
 * ⚡ PROFESSIONAL TIER: Only Professional+ can view historical analytics.
 */
export const getPageViewsOverTime = query({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
    days: v.optional(v.number()), // Number of days to look back (default: 30)
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get page
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "published_page") {
      throw new Error("Published page not found");
    }

    // ⚡ PROFESSIONAL TIER: Page Analytics
    await checkFeatureAccess(ctx, page.organizationId, "pageAnalyticsEnabled");

    // Note: This is a placeholder for time-series data
    // In a real implementation, you would store view events with timestamps
    // and aggregate them by day/week/month

    const days = args.days || 30;
    const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    // For now, return summary data
    // TODO: Implement actual time-series storage and retrieval
    return {
      pageId: args.pageId,
      period: {
        startDate,
        endDate: Date.now(),
        days,
      },
      message: "Time-series data requires implementing view event tracking",
      currentStats: {
        totalViews: page.customProperties?.viewCount || 0,
        uniqueVisitors: page.customProperties?.uniqueVisitors || 0,
      },
    };
  },
});
