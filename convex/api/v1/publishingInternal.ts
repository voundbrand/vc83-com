/**
 * API V1: PUBLISHING INTERNAL HANDLERS
 *
 * Internal mutations/queries for CLI/MCP publishing management.
 * Handles published page CRUD operations without requiring sessionId authentication.
 *
 * Used by HTTP API endpoints in publishing.ts for CLI integration.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * LIST PUBLISHED PAGES (Internal)
 * Returns all published pages for an organization with optional filters
 */
export const listPublishedPagesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    linkedObjectType: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // Query pages
    let queryBuilder = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "published_page")
      );

    // Filter by status
    if (args.status) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("status"), args.status));
    }

    const allPages = await queryBuilder.collect();

    // Filter by linkedObjectType if specified
    let filteredPages = allPages;
    if (args.linkedObjectType) {
      filteredPages = allPages.filter(
        (page) => page.customProperties?.linkedObjectType === args.linkedObjectType
      );
    }

    // Apply pagination
    const paginatedPages = filteredPages.slice(offset, offset + limit);

    // Format response
    const pages = paginatedPages.map((page) => ({
      id: page._id,
      name: page.name,
      slug: page.customProperties?.slug,
      publicUrl: page.customProperties?.publicUrl,
      status: page.status,
      linkedObjectId: page.customProperties?.linkedObjectId,
      linkedObjectType: page.customProperties?.linkedObjectType,
      templateCode: page.customProperties?.templateCode,
      themeCode: page.customProperties?.themeCode,
      metaTitle: page.customProperties?.metaTitle,
      metaDescription: page.customProperties?.metaDescription,
      viewCount: page.customProperties?.viewCount || 0,
      publishedAt: page.customProperties?.publishedAt,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    }));

    return {
      pages,
      total: filteredPages.length,
      hasMore: offset + limit < filteredPages.length,
    };
  },
});

/**
 * GET PUBLISHED PAGE (Internal)
 * Returns a single published page by ID
 */
export const getPublishedPageInternal = internalQuery({
  args: {
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "published_page") {
      return null;
    }

    return {
      id: page._id,
      organizationId: page.organizationId,
      name: page.name,
      slug: page.customProperties?.slug,
      publicUrl: page.customProperties?.publicUrl,
      status: page.status,
      linkedObjectId: page.customProperties?.linkedObjectId,
      linkedObjectType: page.customProperties?.linkedObjectType,
      templateCode: page.customProperties?.templateCode,
      themeCode: page.customProperties?.themeCode,
      metaTitle: page.customProperties?.metaTitle,
      metaDescription: page.customProperties?.metaDescription,
      metaKeywords: page.customProperties?.metaKeywords,
      ogImage: page.customProperties?.ogImage,
      templateContent: page.customProperties?.templateContent,
      colorOverrides: page.customProperties?.colorOverrides,
      sectionVisibility: page.customProperties?.sectionVisibility,
      contentRules: page.customProperties?.contentRules,
      viewCount: page.customProperties?.viewCount || 0,
      uniqueVisitors: page.customProperties?.uniqueVisitors || 0,
      publishedAt: page.customProperties?.publishedAt,
      unpublishedAt: page.customProperties?.unpublishedAt,
      requiresAuth: page.customProperties?.requiresAuth,
      passwordProtected: page.customProperties?.passwordProtected,
      customCss: page.customProperties?.customCss,
      customJs: page.customProperties?.customJs,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      createdBy: page.createdBy,
    };
  },
});

/**
 * GET PUBLISHED PAGE BY SLUG (Internal)
 * Returns a published page by organization slug and page slug
 */
export const getPublishedPageBySlugInternal = internalQuery({
  args: {
    orgSlug: v.string(),
    pageSlug: v.string(),
  },
  handler: async (ctx, args) => {
    // Find organization by slug
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    if (!org) {
      return null;
    }

    // Find published page by slug
    const pages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", org._id).eq("type", "published_page")
      )
      .collect();

    const page = pages.find(
      (p) => p.customProperties?.slug === args.pageSlug
    );

    if (!page) {
      return null;
    }

    return {
      id: page._id,
      organizationId: page.organizationId,
      name: page.name,
      slug: page.customProperties?.slug,
      publicUrl: page.customProperties?.publicUrl,
      status: page.status,
      linkedObjectId: page.customProperties?.linkedObjectId,
      linkedObjectType: page.customProperties?.linkedObjectType,
      templateCode: page.customProperties?.templateCode,
      themeCode: page.customProperties?.themeCode,
      metaTitle: page.customProperties?.metaTitle,
      metaDescription: page.customProperties?.metaDescription,
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
      },
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * CREATE PUBLISHED PAGE (Internal)
 * Creates a new published page
 */
export const createPublishedPageInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    linkedObjectId: v.id("objects"),
    linkedObjectType: v.string(),
    slug: v.string(),
    metaTitle: v.string(),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.array(v.string())),
    ogImage: v.optional(v.string()),
    templateCode: v.optional(v.string()),
    themeCode: v.optional(v.string()),
    templateContent: v.optional(v.any()),
    colorOverrides: v.optional(v.any()),
    sectionVisibility: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check slug uniqueness within org
    const existingPages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "published_page")
      )
      .collect();

    const existingBySlug = existingPages.find(
      (page) => page.customProperties?.slug === args.slug
    );

    if (existingBySlug) {
      throw new Error(`Slug "${args.slug}" is already in use for this organization`);
    }

    // Get organization for public URL
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Check if this is an external page
    const isExternal = args.templateContent?.isExternal === true;
    const externalDomain = args.templateContent?.externalDomain as string | undefined;

    let publicUrl: string;
    if (isExternal && externalDomain) {
      const normalizedDomain = externalDomain.replace(/\/+$/, "");
      const slugPart = args.slug === "/" ? "" : args.slug.startsWith("/") ? args.slug : `/${args.slug}`;
      publicUrl = `${normalizedDomain}${slugPart}`;
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com";
      const slugPart = args.slug === "/" ? "" : args.slug;
      publicUrl = `${baseUrl}/p/${org.slug}${slugPart}`;
    }

    // Create published_page object
    const publishedPageId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "published_page",
      subtype: args.linkedObjectType,
      name: args.metaTitle,
      status: "draft",
      customProperties: {
        linkedObjectId: args.linkedObjectId,
        linkedObjectType: args.linkedObjectType,
        slug: args.slug,
        publicUrl,
        metaTitle: args.metaTitle,
        metaDescription: args.metaDescription || "",
        metaKeywords: args.metaKeywords || [],
        ogImage: args.ogImage || "",
        ogType: "website",
        templateCode: args.templateCode || "landing-page",
        themeCode: args.themeCode || "modern-gradient",
        templateContent: args.templateContent || {},
        colorOverrides: args.colorOverrides || {},
        sectionVisibility: args.sectionVisibility || {},
        publishedAt: null,
        unpublishedAt: null,
        versionNumber: 1,
        viewCount: 0,
        uniqueVisitors: 0,
        requiresAuth: false,
        passwordProtected: false,
        customCss: "",
        customJs: "",
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to source object
    await ctx.db.insert("objectLinks", {
      fromObjectId: publishedPageId,
      toObjectId: args.linkedObjectId,
      linkType: "publishes",
      organizationId: args.organizationId,
      properties: { version: 1 },
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: publishedPageId,
      actionType: "created",
      actionData: {
        slug: args.slug,
        linkedObjectId: args.linkedObjectId,
        templateCode: args.templateCode,
        themeCode: args.themeCode,
        source: "cli",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return publishedPageId;
  },
});

/**
 * UPDATE PUBLISHED PAGE (Internal)
 * Updates an existing published page
 */
export const updatePublishedPageInternal = internalMutation({
  args: {
    pageId: v.id("objects"),
    userId: v.id("users"),
    slug: v.optional(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.array(v.string())),
    ogImage: v.optional(v.string()),
    templateCode: v.optional(v.string()),
    themeCode: v.optional(v.string()),
    templateContent: v.optional(v.any()),
    colorOverrides: v.optional(v.any()),
    sectionVisibility: v.optional(v.any()),
    contentRules: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "published_page") {
      throw new Error("Published page not found");
    }

    // Build updates
    const updates: Record<string, unknown> = {};
    if (args.slug !== undefined) updates.slug = args.slug;
    if (args.metaTitle !== undefined) updates.metaTitle = args.metaTitle;
    if (args.metaDescription !== undefined) updates.metaDescription = args.metaDescription;
    if (args.metaKeywords !== undefined) updates.metaKeywords = args.metaKeywords;
    if (args.ogImage !== undefined) updates.ogImage = args.ogImage;
    if (args.templateCode !== undefined) updates.templateCode = args.templateCode;
    if (args.themeCode !== undefined) updates.themeCode = args.themeCode;
    if (args.templateContent !== undefined) updates.templateContent = args.templateContent;
    if (args.colorOverrides !== undefined) updates.colorOverrides = args.colorOverrides;
    if (args.sectionVisibility !== undefined) updates.sectionVisibility = args.sectionVisibility;
    if (args.contentRules !== undefined) updates.contentRules = args.contentRules;

    // Regenerate publicUrl if slug changed
    if (args.slug !== undefined) {
      const org = await ctx.db.get(page.organizationId);
      if (org) {
        const templateContent = updates.templateContent || page.customProperties?.templateContent;
        const isExternal = templateContent?.isExternal === true;
        const externalDomain = templateContent?.externalDomain as string | undefined;

        if (isExternal && externalDomain) {
          const normalizedDomain = externalDomain.replace(/\/+$/, "");
          const slugPart = args.slug === "/" ? "" : args.slug.startsWith("/") ? args.slug : `/${args.slug}`;
          updates.publicUrl = `${normalizedDomain}${slugPart}`;
        } else {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com";
          const slugPart = args.slug === "/" ? "" : args.slug;
          updates.publicUrl = `${baseUrl}/p/${org.slug}${slugPart}`;
        }
      }
    }

    // Update page
    const updatedProperties = {
      ...page.customProperties,
      ...updates,
    };

    const nameUpdate = args.metaTitle ? { name: args.metaTitle } : {};

    await ctx.db.patch(args.pageId, {
      ...nameUpdate,
      customProperties: updatedProperties,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.pageId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(updates),
        source: "cli",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * SET PUBLISHING STATUS (Internal)
 * Changes the publishing status of a page
 */
export const setPublishingStatusInternal = internalMutation({
  args: {
    pageId: v.id("objects"),
    userId: v.id("users"),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("published"),
      v.literal("unpublished"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "published_page") {
      throw new Error("Published page not found");
    }

    const oldStatus = page.status;

    // Update status-specific fields
    const statusUpdates: Record<string, unknown> = {};
    if (args.status === "published" && oldStatus !== "published") {
      statusUpdates.publishedAt = Date.now();
      statusUpdates.unpublishedAt = null;
    } else if (args.status === "unpublished" || args.status === "archived") {
      statusUpdates.unpublishedAt = Date.now();
    }

    // Update page
    const updatedProperties = {
      ...page.customProperties,
      ...statusUpdates,
    };

    await ctx.db.patch(args.pageId, {
      status: args.status,
      customProperties: updatedProperties,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.pageId,
      actionType: "status_changed",
      actionData: {
        from: oldStatus,
        to: args.status,
        source: "cli",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true, previousStatus: oldStatus };
  },
});

/**
 * DELETE PUBLISHED PAGE (Internal)
 * Deletes a published page
 */
export const deletePublishedPageInternal = internalMutation({
  args: {
    pageId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "published_page") {
      throw new Error("Published page not found");
    }

    // Delete object links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.pageId).eq("linkType", "publishes")
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.pageId,
      actionType: "deleted",
      actionData: {
        slug: page.customProperties?.slug,
        source: "cli",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    // Delete the page
    await ctx.db.delete(args.pageId);

    return { success: true };
  },
});

/**
 * GET PUBLISHING ANALYTICS (Internal)
 * Returns analytics for a published page
 */
export const getPageAnalyticsInternal = internalQuery({
  args: {
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page || page.type !== "published_page") {
      return null;
    }

    return {
      viewCount: page.customProperties?.viewCount || 0,
      uniqueVisitors: page.customProperties?.uniqueVisitors || 0,
      lastViewedAt: page.customProperties?.lastViewedAt,
      publishedAt: page.customProperties?.publishedAt,
      analyticsEnabled: page.customProperties?.analyticsEnabled ?? true,
    };
  },
});
