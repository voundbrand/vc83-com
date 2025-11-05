import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";

/**
 * PUBLISHING ONTOLOGY v2 - TEMPLATE + THEME ARCHITECTURE
 *
 * Manages published_page objects with separate template + theme selection.
 * Enables organizations to publish ANY content to the public web.
 *
 * Key Changes:
 * - Store templateCode (structure) + themeCode (appearance) instead of templateId
 * - Templates and themes can be mixed and matched
 * - Actual rendering happens in /src/templates/ using registry
 */

/**
 * Create a new published page with template + theme
 *
 * Links any object to make it web-accessible with a public URL.
 * Applies separate template (structure) and theme (appearance).
 */
export const createPublishedPage = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    linkedObjectId: v.id("objects"), // The content to publish (checkout, event, etc.)
    linkedObjectType: v.string(), // "checkout_product", "event", etc.
    slug: v.string(),
    metaTitle: v.string(),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.array(v.string())),
    ogImage: v.optional(v.string()),
    templateCode: v.optional(v.string()), // Template code (e.g., "landing-page")
    themeCode: v.optional(v.string()), // Theme code (e.g., "modern-gradient")
    templateContent: v.optional(v.any()), // Template-specific content (hero, features, etc.)
    colorOverrides: v.optional(v.any()), // Optional color customizations
    sectionVisibility: v.optional(v.any()), // Optional section toggles
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId, args.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "create_published_pages",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: create_published_pages required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== args.organizationId) {
      throw new Error("Cannot create published page for another organization");
    }

    // Check slug uniqueness within org
    const allPages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "published_page")
      )
      .collect();

    const existingBySlug = allPages.find(
      (page) => page.customProperties?.slug === args.slug
    );

    if (existingBySlug) {
      throw new Error(`Slug "${args.slug}" is already in use for this organization`);
    }

    // Get organization for public URL
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Use environment variable for base URL (falls back to production URL)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com";
    const publicUrl = `${baseUrl}/p/${org.slug}/${args.slug}`;

    // Create published_page object with templateCode + themeCode
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
        // Template + Theme codes (maps to /src/templates/)
        templateCode: args.templateCode || "landing-page",
        themeCode: args.themeCode || "modern-gradient",
        // Template-specific content
        templateContent: args.templateContent || {},
        // Customization options
        colorOverrides: args.colorOverrides || {},
        sectionVisibility: args.sectionVisibility || {},
        // Publishing metadata
        publishedAt: null,
        unpublishedAt: null,
        scheduledPublishAt: null,
        scheduledUnpublishAt: null,
        versionNumber: 1,
        previousVersionId: null,
        // Analytics
        viewCount: 0,
        uniqueVisitors: 0,
        lastViewedAt: null,
        analyticsEnabled: true,
        // Access control
        requiresAuth: false,
        passwordProtected: false,
        accessPassword: null,
        // Custom code
        customCss: "",
        customJs: "",
        headerHtml: "",
        footerHtml: "",
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to source object
    await ctx.db.insert("objectLinks", {
      fromObjectId: publishedPageId,
      toObjectId: args.linkedObjectId,
      linkType: "publishes",
      organizationId: args.organizationId,
      properties: {
        version: 1,
      },
      createdBy: userId,
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
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return {
      publishedPageId,
      publicUrl,
    };
  },
});

/**
 * Get all published pages for an organization
 */
export const getPublishedPages = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId, args.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_published_pages",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_published_pages required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== args.organizationId) {
      throw new Error("Cannot view published pages for another organization");
    }

    let queryBuilder = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "published_page")
      );

    if (args.status) {
      if (args.status === "active") {
        // "active" means all statuses EXCEPT archived
        queryBuilder = queryBuilder.filter((q) => q.neq(q.field("status"), "archived"));
      } else {
        // Specific status filter
        queryBuilder = queryBuilder.filter((q) => q.eq(q.field("status"), args.status));
      }
    }

    const pages = await queryBuilder.collect();

    // Return pages with template/theme codes
    return pages.map((page) => ({
      ...page,
      templateCode: page.customProperties?.templateCode,
      themeCode: page.customProperties?.themeCode,
    }));
  },
});

/**
 * Get published page by slug (PUBLIC - no auth required)
 *
 * This is used by the public HTTP route to render pages.
 * Returns templateCode + themeCode for frontend registry lookup.
 */
export const getPublishedPageBySlug = query({
  args: {
    orgSlug: v.string(),
    pageSlug: v.string(),
  },
  handler: async (ctx, args) => {
    // Find organization
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    if (!org) return null;

    // Find published page
    const allPages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", org._id).eq("type", "published_page")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    const page = allPages.find(
      (p) => p.customProperties?.slug === args.pageSlug
    );

    if (!page) return null;

    // Fetch source object (linkedObjectId - usually checkout or primary object)
    const sourceLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", page._id).eq("linkType", "publishes")
      )
      .first();

    let sourceObject = null;
    if (sourceLink) {
      sourceObject = await ctx.db.get(sourceLink.toObjectId);
    }

    // ALSO fetch linkedEventId if it exists in templateContent (for event landing pages with checkout)
    let eventObject = null;
    const linkedEventId = page.customProperties?.templateContent?.linkedEventId as string | undefined;
    if (linkedEventId) {
      try {
        eventObject = await ctx.db.get(linkedEventId as any);

        // Convert storage IDs to URLs for media items if event has media
        if (eventObject && 'customProperties' in eventObject) {
          const customProps = eventObject.customProperties as any;
          if (customProps?.media?.items) {
            const mediaItems = customProps.media.items as any[];
            for (const item of mediaItems) {
              if (item.storageId && !item.url) {
                try {
                  item.url = await ctx.storage.getUrl(item.storageId);
                } catch (e) {
                  console.error("Failed to get storage URL for:", item.storageId, e);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch linkedEventId:", e);
      }
    }

    return {
      page,
      data: eventObject || sourceObject || page, // Prefer event data, fallback to source object, then page itself
      organization: org,
    };
  },
});

/**
 * Update published page metadata (including template/theme)
 */
export const updatePublishedPage = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
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
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Published page not found");

    const userContext = await getUserContext(ctx, userId, page.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_published_pages",
      page.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_published_pages required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== page.organizationId) {
      throw new Error("Cannot edit published page for another organization");
    }

    // Build updates object (only include provided fields)
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

    // Update page
    const updatedProperties = {
      ...page.customProperties,
      ...updates,
    };

    // Update name if metaTitle changed
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
        before: page.customProperties,
        after: updatedProperties,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Change publishing status (draft → published → unpublished → archived)
 */
export const setPublishingStatus = mutation({
  args: {
    sessionId: v.string(),
    publishedPageId: v.id("objects"),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("published"),
      v.literal("unpublished"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const page = await ctx.db.get(args.publishedPageId);
    if (!page) throw new Error("Published page not found");

    const userContext = await getUserContext(ctx, userId, page.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "publish_pages",
      page.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: publish_pages required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== page.organizationId) {
      throw new Error("Cannot change status for another organization's page");
    }

    const oldStatus = page.status;
    const updates: Record<string, string | number | Record<string, unknown>> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    // Update timestamps based on status change
    if (args.status === "published" && oldStatus !== "published") {
      updates.customProperties = {
        ...page.customProperties,
        publishedAt: Date.now(),
        unpublishedAt: null,
      };
    } else if (args.status === "unpublished" && oldStatus === "published") {
      updates.customProperties = {
        ...page.customProperties,
        unpublishedAt: Date.now(),
      };
    }

    await ctx.db.patch(args.publishedPageId, updates);

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.publishedPageId,
      actionType: args.status,
      actionData: {
        oldStatus,
        newStatus: args.status,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete published page (soft delete to archived)
 */
export const deletePublishedPage = mutation({
  args: {
    sessionId: v.string(),
    publishedPageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const page = await ctx.db.get(args.publishedPageId);
    if (!page) throw new Error("Published page not found");

    const userContext = await getUserContext(ctx, userId, page.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "delete_published_pages",
      page.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: delete_published_pages required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== page.organizationId) {
      throw new Error("Cannot delete published page for another organization");
    }

    // Soft delete to archived
    await ctx.db.patch(args.publishedPageId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.publishedPageId,
      actionType: "deleted",
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});
