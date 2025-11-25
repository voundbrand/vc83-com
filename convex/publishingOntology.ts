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
 * Create external page config object
 *
 * Creates a placeholder object for external pages to link to.
 * External pages are hosted on the user's own domain, not on app.l4yercak3.com
 */
export const createExternalPageConfig = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    externalDomain: v.string(),
    contentRules: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

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

    // Create a minimal config object
    const configId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "external_page_config",
      subtype: "config",
      name: `External Page Config - ${args.externalDomain}`,
      description: "Configuration for external page hosted on custom domain",
      status: "active",
      customProperties: {
        externalDomain: args.externalDomain,
        contentRules: args.contentRules || {},
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return configId;
  },
});

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

    // Check if this is an external page
    const isExternal = args.templateContent?.isExternal === true;
    const externalDomain = args.templateContent?.externalDomain as string | undefined;

    let publicUrl: string;
    if (isExternal && externalDomain) {
      // For external pages, use the user's domain
      // Remove trailing slash from externalDomain to prevent double slashes
      const normalizedDomain = externalDomain.replace(/\/+$/, "");
      // Ensure slug starts with / (or is empty for root)
      const slugPart = args.slug === "/" ? "" : args.slug.startsWith("/") ? args.slug : `/${args.slug}`;
      publicUrl = `${normalizedDomain}${slugPart}`;
    } else {
      // For internal pages, use app domain
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com";
      const slugPart = args.slug === "/" ? "" : args.slug;
      publicUrl = `${baseUrl}/p/${org.slug}${slugPart}`;
    }

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
 * Update published page content rules (for external frontend CMS)
 */
export const updateContentRules = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
    contentRules: v.object({
      events: v.optional(v.object({
        enabled: v.optional(v.boolean()),
        filter: v.optional(v.union(v.literal("all"), v.literal("future"), v.literal("past"), v.literal("featured"))),
        visibility: v.optional(v.union(v.literal("all"), v.literal("public"), v.literal("private"))),
        subtypes: v.optional(v.array(v.string())),
        limit: v.optional(v.number()),
        sortBy: v.optional(v.string()),
        sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
      })),
      checkoutId: v.optional(v.string()),
      formIds: v.optional(v.array(v.string())),
    }),
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

    // Update content rules
    const updatedProperties = {
      ...page.customProperties,
      contentRules: args.contentRules,
    };

    await ctx.db.patch(args.pageId, {
      customProperties: updatedProperties,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.pageId,
      actionType: "content_rules_updated",
      actionData: {
        contentRules: args.contentRules,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
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

    // Regenerate publicUrl if slug OR external domain changed
    const shouldRegenerateUrl = args.slug !== undefined || args.templateContent !== undefined;

    if (shouldRegenerateUrl) {
      const org = await ctx.db.get(page.organizationId);
      if (org) {
        // Check if this is an external page
        const templateContent = updates.templateContent || page.customProperties?.templateContent;
        const isExternal = templateContent?.isExternal === true;
        const externalDomain = templateContent?.externalDomain as string | undefined;

        // Use updated slug or existing slug
        const currentSlug = args.slug !== undefined ? args.slug : (page.customProperties?.slug as string || "/");

        if (isExternal && externalDomain) {
          // For external pages, use the user's domain
          // Remove trailing slash from externalDomain to prevent double slashes
          const normalizedDomain = externalDomain.replace(/\/+$/, "");
          // Ensure slug starts with / (or is empty for root)
          const slugPart = currentSlug === "/" ? "" : currentSlug.startsWith("/") ? currentSlug : `/${currentSlug}`;
          updates.publicUrl = `${normalizedDomain}${slugPart}`;
        } else {
          // For internal pages, use app domain
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com";
          // Handle root slug (/) specially to avoid double slashes
          const slugPart = currentSlug === "/" ? "" : currentSlug;
          updates.publicUrl = `${baseUrl}/p/${org.slug}${slugPart}`;
        }
      }
    }

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
 * Archive published page (soft delete to archived)
 */
export const archivePublishedPage = mutation({
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
      throw new Error("Cannot archive published page for another organization");
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
      actionType: "archived",
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete published page (hard delete - permanent)
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

    // Hard delete - permanent removal
    await ctx.db.delete(args.publishedPageId);

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.publishedPageId,
      actionType: "deleted_permanently",
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET PUBLISHED CONTENT FOR EXTERNAL FRONTEND
 *
 * This query powers external Next.js frontends by providing filtered content
 * based on contentRules configured in the CMS.
 *
 * PUBLIC QUERY - No authentication required
 *
 * Usage:
 * - External frontend calls: GET /api/published-content?org=vc83&page=/events
 * - Returns filtered events, checkout, forms based on CMS configuration
 *
 * contentRules example in published_page.customProperties:
 * {
 *   events: {
 *     filter: "future",        // "all" | "future" | "past" | "featured"
 *     visibility: "public",    // "all" | "public" | "private"
 *     subtypes: ["seminar"],   // Event types to include
 *     limit: 10,               // Max events to return
 *     sortBy: "startDate",     // Sort field
 *     sortOrder: "asc"         // "asc" | "desc"
 *   },
 *   checkoutId: "checkout_xxx", // Primary checkout instance
 *   formIds: ["form_1"]         // Available forms
 * }
 */
export const getPublishedContentForFrontend = query({
  args: {
    orgSlug: v.string(),
    pageSlug: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("🌐 [getPublishedContentForFrontend] Query:", args);

    // 1. Get organization by slug
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    if (!org) {
      console.log("❌ [getPublishedContentForFrontend] Organization not found");
      return null;
    }

    console.log("✅ [getPublishedContentForFrontend] Organization:", org._id);

    // 2. Find published page configuration for this slug
    const publishedPages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", org._id).eq("type", "published_page")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    const page = publishedPages.find(
      (p) => p.customProperties?.slug === args.pageSlug
    );

    if (!page) {
      console.log("❌ [getPublishedContentForFrontend] Published page not found for slug:", args.pageSlug);
      return null;
    }

    console.log("✅ [getPublishedContentForFrontend] Page found:", page.name);

    // 3. Extract content rules from page configuration
    const contentRules = (page.customProperties?.contentRules || {}) as {
      events?: {
        enabled?: boolean;
        filter?: "all" | "future" | "past" | "featured";
        visibility?: "all" | "public" | "private";
        subtypes?: string[];
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
      };
      checkoutId?: string;
      formIds?: string[];
    };

    console.log("📋 [getPublishedContentForFrontend] Content rules:", contentRules);

    // 4. Fetch and filter events based on rules
    let events: Array<{
      _id: string;
      _creationTime: number;
      organizationId: string;
      type: string;
      subtype?: string;
      name: string;
      status: string;
      customProperties?: Record<string, unknown>;
      createdAt: number;
      [key: string]: unknown;
    }> = [];

    // Check if events are enabled (default to true if not specified)
    const eventsEnabled = contentRules.events?.enabled !== false;

    if (eventsEnabled) {
      events = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", org._id).eq("type", "event")
        )
        .filter((q) => q.eq(q.field("status"), "published"))
        .collect();

      console.log("📅 [getPublishedContentForFrontend] Initial events count:", events.length);

      // Apply event filtering rules
      if (contentRules.events) {
      const rules = contentRules.events;

      // Filter by visibility (public vs private)
      if (rules.visibility === "public") {
        events = events.filter((e) => {
          const customProps = e.customProperties as Record<string, unknown> | undefined;
          return !customProps?.isPrivate;
        });
        console.log("🔒 [getPublishedContentForFrontend] After visibility filter:", events.length);
      } else if (rules.visibility === "private") {
        events = events.filter((e) => {
          const customProps = e.customProperties as Record<string, unknown> | undefined;
          return customProps?.isPrivate === true;
        });
        console.log("🔒 [getPublishedContentForFrontend] After private filter:", events.length);
      }

      // Filter by time (future/past/featured)
      const now = Date.now();
      if (rules.filter === "future") {
        events = events.filter((e) => {
          const customProps = e.customProperties as Record<string, unknown> | undefined;
          const startDate = customProps?.startDate as number | undefined;
          return startDate && startDate > now;
        });
        console.log("⏭️ [getPublishedContentForFrontend] After future filter:", events.length);
      } else if (rules.filter === "past") {
        events = events.filter((e) => {
          const customProps = e.customProperties as Record<string, unknown> | undefined;
          const endDate = customProps?.endDate as number | undefined;
          return endDate && endDate < now;
        });
        console.log("⏮️ [getPublishedContentForFrontend] After past filter:", events.length);
      } else if (rules.filter === "featured") {
        events = events.filter((e) => {
          const customProps = e.customProperties as Record<string, unknown> | undefined;
          return customProps?.featured === true;
        });
        console.log("⭐ [getPublishedContentForFrontend] After featured filter:", events.length);
      }

      // Filter by event subtypes (seminar, conference, etc.)
      if (rules.subtypes && rules.subtypes.length > 0) {
        events = events.filter((e) => rules.subtypes!.includes(e.subtype || ""));
        console.log("🏷️ [getPublishedContentForFrontend] After subtype filter:", events.length);
      }

      // Sort events
      if (rules.sortBy === "startDate") {
        events.sort((a, b) => {
          const aProps = a.customProperties as Record<string, unknown> | undefined;
          const bProps = b.customProperties as Record<string, unknown> | undefined;
          const aDate = (aProps?.startDate as number) || 0;
          const bDate = (bProps?.startDate as number) || 0;
          return rules.sortOrder === "desc" ? bDate - aDate : aDate - bDate;
        });
        console.log("🔄 [getPublishedContentForFrontend] Sorted by startDate:", rules.sortOrder);
      } else if (rules.sortBy === "createdAt") {
        events.sort((a, b) => {
          return rules.sortOrder === "desc"
            ? b.createdAt - a.createdAt
            : a.createdAt - b.createdAt;
        });
        console.log("🔄 [getPublishedContentForFrontend] Sorted by createdAt:", rules.sortOrder);
      }

        // Limit number of events
        if (rules.limit && rules.limit > 0) {
          events = events.slice(0, rules.limit);
          console.log("✂️ [getPublishedContentForFrontend] Limited to:", rules.limit);
        }
      }
    } else {
      console.log("🚫 [getPublishedContentForFrontend] Events disabled for this page");
    }

    // 5. Load checkout instance if specified
    let checkout = null;
    if (contentRules.checkoutId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkoutDoc = await ctx.db.get(contentRules.checkoutId as any);
        if (checkoutDoc && "type" in checkoutDoc && checkoutDoc.type === "checkout_instance") {
          checkout = checkoutDoc;
          console.log("🛒 [getPublishedContentForFrontend] Checkout loaded:", checkoutDoc.name);
        }
      } catch (error) {
        console.error("❌ [getPublishedContentForFrontend] Failed to load checkout:", error);
      }
    }

    // 6. Load forms if specified
    const forms = [];
    if (contentRules.formIds && contentRules.formIds.length > 0) {
      for (const formId of contentRules.formIds) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formDoc = await ctx.db.get(formId as any);
          if (formDoc && "type" in formDoc && formDoc.type === "form") {
            forms.push(formDoc);
            console.log("📋 [getPublishedContentForFrontend] Form loaded:", formDoc.name);
          }
        } catch (error) {
          console.error("❌ [getPublishedContentForFrontend] Failed to load form:", formId, error);
        }
      }
    }

    console.log("✅ [getPublishedContentForFrontend] Final results:", {
      events: events.length,
      checkout: checkout ? "loaded" : "none",
      forms: forms.length,
    });

    // 7. Return complete content package
    return {
      page,
      events,
      checkout,
      forms,
      organization: org,
    };
  },
});
