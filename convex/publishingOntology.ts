import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";
import { checkFeatureAccess } from "./licensing/helpers";
import { internal } from "./_generated/api";
import { generateVercelDeployUrl } from "./publishingHelpers";

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

    // ⚡ PROFESSIONAL TIER: SEO Tools
    // Professional+ can use advanced SEO features (meta keywords, OG images)
    if (args.metaKeywords || args.ogImage) {
      await checkFeatureAccess(ctx, args.organizationId, "seoToolsEnabled");
    }

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
 * Get a single published page by ID
 */
export const getPublishedPageById = query({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Published page not found");

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_published_pages",
      page.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_published_pages required");
    }

    return page;
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

    // ⚡ PROFESSIONAL TIER: Content Rules
    // Professional+ can use advanced content filtering rules
    await checkFeatureAccess(ctx, page.organizationId, "contentRulesEnabled");

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

    // ⚡ PROFESSIONAL TIER: SEO Tools
    // Professional+ can use advanced SEO features (meta keywords, OG images)
    if (args.metaKeywords !== undefined || args.ogImage !== undefined) {
      await checkFeatureAccess(ctx, page.organizationId, "seoToolsEnabled");
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
 * Update deployment information for a published page
 *
 * This is a dedicated mutation for managing Vercel deployment metadata
 * with validation and analytics tracking.
 */
export const updateDeploymentInfo = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
    githubRepo: v.optional(v.string()),
    vercelDeployButton: v.optional(v.string()),
    deployedUrl: v.optional(v.string()),
    deploymentStatus: v.optional(v.union(
      v.literal("not_deployed"),
      v.literal("deploying"),
      v.literal("deployed"),
      v.literal("failed")
    )),
    deploymentError: v.optional(v.string()),
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

    // Validate GitHub repo URL format
    if (args.githubRepo !== undefined && args.githubRepo !== "") {
      if (!args.githubRepo.startsWith('https://github.com/')) {
        throw new Error("GitHub repository URL must start with 'https://github.com/'");
      }
    }

    // Validate Vercel deploy button URL format
    if (args.vercelDeployButton !== undefined && args.vercelDeployButton !== "") {
      if (!args.vercelDeployButton.startsWith('https://vercel.com/new/clone')) {
        throw new Error("Vercel deploy button URL must start with 'https://vercel.com/new/clone'");
      }
    }

    // Validate deployed URL format (if provided)
    if (args.deployedUrl !== undefined && args.deployedUrl !== "" && args.deployedUrl !== null) {
      try {
        new URL(args.deployedUrl);
      } catch (e) {
        throw new Error("Deployed URL must be a valid URL");
      }
    }

    // Get current deployment data
    const currentDeployment = (page.customProperties?.deployment as any) || {};
    const deploymentAttempts = currentDeployment.deploymentAttempts || 0;
    const deploymentErrors = currentDeployment.deploymentErrors || [];

    // Build updated deployment object
    const updatedDeployment: Record<string, any> = {
      ...currentDeployment,
      platform: currentDeployment.platform || "vercel",
    };

    // Update fields if provided
    if (args.githubRepo !== undefined) {
      updatedDeployment.githubRepo = args.githubRepo;
    }
    if (args.vercelDeployButton !== undefined) {
      updatedDeployment.vercelDeployButton = args.vercelDeployButton;
    }
    if (args.deployedUrl !== undefined) {
      updatedDeployment.deployedUrl = args.deployedUrl;
    }
    if (args.deploymentStatus !== undefined) {
      updatedDeployment.status = args.deploymentStatus;

      // Track deployment attempts
      if (args.deploymentStatus === "deploying") {
        updatedDeployment.deploymentAttempts = deploymentAttempts + 1;
        updatedDeployment.lastDeploymentAttempt = Date.now();
      }

      // Track successful deployment
      if (args.deploymentStatus === "deployed") {
        updatedDeployment.deployedAt = Date.now();
      }

      // Track deployment errors
      if (args.deploymentStatus === "failed" && args.deploymentError) {
        updatedDeployment.deploymentErrors = [
          ...deploymentErrors.slice(-4), // Keep last 5 errors
          {
            timestamp: Date.now(),
            error: args.deploymentError,
          }
        ];
      }
    }

    // Update page
    const updatedProperties = {
      ...page.customProperties,
      deployment: updatedDeployment,
    };

    await ctx.db.patch(args.pageId, {
      customProperties: updatedProperties,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.pageId,
      actionType: "deployment_updated",
      actionData: {
        before: currentDeployment,
        after: updatedDeployment,
        updatedFields: Object.keys(args).filter(k => k !== "sessionId" && k !== "pageId" && args[k as keyof typeof args] !== undefined),
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return {
      success: true,
      deployment: updatedDeployment,
    };
  },
});

/**
 * Auto-generate Vercel Deploy URL from GitHub Repository
 *
 * Automatically creates the Vercel deploy button URL based on the GitHub repo.
 * This should be called whenever the GitHub repo URL is updated.
 */
export const autoGenerateVercelDeployUrl = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
    githubRepo: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Published page not found");

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

    // Get environment variables for this page
    const deployment = (page.customProperties?.deployment as any) || {};
    const envVars = deployment.environmentVariables || [];

    // Generate Vercel deploy URL
    let vercelDeployButton: string;
    try {
      vercelDeployButton = generateVercelDeployUrl(
        args.githubRepo,
        envVars.length > 0 ? envVars : undefined,
        page.name.toLowerCase().replace(/\s+/g, '-')
      );
    } catch (error) {
      throw new Error(`Failed to generate Vercel URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Update deployment info
    const updatedDeployment = {
      ...deployment,
      githubRepo: args.githubRepo,
      vercelDeployButton,
      lastUpdated: Date.now(),
    };

    await ctx.db.patch(args.pageId, {
      customProperties: {
        ...page.customProperties,
        deployment: updatedDeployment,
      },
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.pageId,
      actionType: "deployment_url_generated",
      actionData: {
        githubRepo: args.githubRepo,
        vercelDeployButton,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return {
      success: true,
      githubRepo: args.githubRepo,
      vercelDeployButton,
    };
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

/**
 * =============================================================================
 * DEPLOYMENT PRE-FLIGHT VALIDATION
 * =============================================================================
 * Real validation checks for Vercel deployment readiness.
 * These are NOT fake checks - they perform actual HTTP requests and database queries.
 */

/**
 * Update deployment environment variables
 *
 * Stores required environment variables for deployment configuration.
 * These are shown to the user during Vercel setup.
 */
export const updateDeploymentEnvVars = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
    envVars: v.array(v.object({
      key: v.string(),
      description: v.string(),
      required: v.boolean(),
      defaultValue: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Published page not found");

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

    const currentDeployment = (page.customProperties?.deployment as any) || {};
    const updatedDeployment = {
      ...currentDeployment,
      environmentVariables: args.envVars,
      envVarsUpdatedAt: Date.now(),
    };

    await ctx.db.patch(args.pageId, {
      customProperties: {
        ...page.customProperties,
        deployment: updatedDeployment,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Validate GitHub Repository (Action - performs HTTP request)
 *
 * Actually checks if the GitHub repository exists and is accessible.
 */
export const validateGithubRepo = action({
  args: {
    sessionId: v.string(),
    githubUrl: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[validateGithubRepo] Input URL:", args.githubUrl);

    try {
      // Trim and clean the URL
      const cleanUrl = args.githubUrl.trim();
      console.log("[validateGithubRepo] Cleaned URL:", cleanUrl);

      // Parse GitHub URL to extract owner and repo
      const match = cleanUrl.match(/^https:\/\/github\.com\/([\w-]+)\/([\w-]+)/);
      if (!match) {
        console.log("[validateGithubRepo] URL parsing failed");
        return {
          valid: false,
          error: "Invalid GitHub URL format. Expected: https://github.com/username/repo",
        };
      }

      const [, owner, repo] = match;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      console.log("[validateGithubRepo] API URL:", apiUrl);

      // Make GET request to check if repo exists
      // HEAD requests sometimes return 400 on GitHub API, so use GET instead
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "l4yercak3-deployment-validator"
        }
      });

      console.log("[validateGithubRepo] Response status:", response.status);

      if (response.ok) {
        return {
          valid: true,
          repoInfo: {
            owner,
            repo,
            url: args.githubUrl,
          },
        };
      } else if (response.status === 404) {
        return {
          valid: false,
          error: "Repository not found. Please check the URL or ensure the repository is public.",
        };
      } else if (response.status === 403) {
        return {
          valid: false,
          error: "GitHub API rate limit exceeded. Please try again in a few minutes.",
        };
      } else {
        return {
          valid: false,
          error: `GitHub API returned status ${response.status}. Repository may not be accessible.`,
        };
      }
    } catch (error) {
      console.error("[validateGithubRepo] Error:", error);
      return {
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * Validate Vercel Deploy URL (Action - performs HTTP request)
 *
 * Checks if the Vercel deploy button URL is properly formatted and accessible.
 */
export const validateVercelDeployUrl = action({
  args: {
    sessionId: v.string(),
    vercelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Validate URL format
      if (!args.vercelUrl.startsWith('https://vercel.com/new/clone')) {
        return {
          valid: false,
          error: "Vercel deploy URL must start with 'https://vercel.com/new/clone'",
        };
      }

      // Parse URL to check parameters
      const url = new URL(args.vercelUrl);
      const repoUrl = url.searchParams.get('repository-url');

      if (!repoUrl) {
        // Check if repository URL is in the path (alternate format)
        if (!url.pathname.includes('github.com')) {
          return {
            valid: false,
            error: "Vercel deploy URL must include 'repository-url' parameter or GitHub URL in path",
          };
        }
      }

      // Make HEAD request to verify URL is accessible
      const response = await fetch(args.vercelUrl, {
        method: "HEAD",
        redirect: "manual", // Don't follow redirects
      });

      // Vercel might redirect or return various status codes, but should respond
      if (response.status >= 200 && response.status < 500) {
        return {
          valid: true,
          deployInfo: {
            repoUrl: repoUrl || "embedded in path",
            envVars: url.searchParams.getAll('env') || [],
          },
        };
      } else {
        return {
          valid: false,
          error: `Vercel URL returned status ${response.status}. URL may be malformed.`,
        };
      }
    } catch (error) {
      // URL parsing or network errors
      if (error instanceof TypeError && error.message.includes('URL')) {
        return {
          valid: false,
          error: "Invalid URL format. Please check the Vercel deploy button URL.",
        };
      }

      console.error("[validateVercelDeployUrl] Error:", error);
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * Check GitHub Integration Status (Query - database query)
 *
 * Verifies that GitHub integration is connected for the organization.
 */
export const checkGithubIntegration = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check if GitHub OAuth connection exists for this org
    const githubConnection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => {
        const provider = q.field("provider");
        const status = q.field("status");
        return q.and(
          q.eq(status, "active"),
          q.eq(provider, "github")
        );
      })
      .first();

    if (githubConnection) {
      return {
        connected: true,
        integration: {
          name: githubConnection.providerEmail || "GitHub",
          createdAt: githubConnection._creationTime,
        },
      };
    }

    return {
      connected: false,
      message: "GitHub integration not found. Connect GitHub in Integrations window.",
    };
  },
});

/**
 * Check Vercel Integration Status (Query - database query)
 *
 * Verifies that Vercel integration is connected for the organization.
 * Note: Vercel uses OAuth applications, not connections like GitHub.
 */
export const checkVercelIntegration = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check if Vercel OAuth connection exists for this org
    const vercelConnection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => {
        const provider = q.field("provider");
        const status = q.field("status");
        return q.and(
          q.eq(status, "active"),
          q.eq(provider, "vercel")
        );
      })
      .first();

    if (vercelConnection) {
      return {
        connected: true,
        integration: {
          name: vercelConnection.providerEmail || "Vercel",
          createdAt: vercelConnection._creationTime,
        },
      };
    }

    return {
      connected: false,
      message: "Vercel integration not found. Connect Vercel in Integrations window.",
    };
  },
});

/**
 * Check API Key Status (Query - database query)
 *
 * Verifies that organization has at least one active API key for deployment.
 */
export const checkApiKeyStatus = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const activeApiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (activeApiKeys.length > 0) {
      return {
        hasApiKey: true,
        count: activeApiKeys.length,
        keys: activeApiKeys.map(k => ({
          name: k.name,
          prefix: k.keyPrefix,
          createdAt: k.createdAt,
          scopes: k.scopes,
        })),
      };
    }

    return {
      hasApiKey: false,
      message: "No active API keys found. Create one in Integrations > API Keys.",
    };
  },
});

/**
 * Auto-Detect Environment Variables from GitHub Repository (Action)
 *
 * Fetches .env.example or .env.template from a GitHub repo and parses env vars.
 * This allows automatic pre-filling of environment variables based on the template repo.
 */
export const autoDetectEnvVarsFromGithub = action({
  args: {
    sessionId: v.string(),
    githubUrl: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[autoDetectEnvVarsFromGithub] Analyzing:", args.githubUrl);

    try {
      // Parse GitHub URL to extract owner and repo
      const match = args.githubUrl.match(/^https:\/\/github\.com\/([\w-]+)\/([\w-]+)/);
      if (!match) {
        return {
          success: false,
          error: "Invalid GitHub URL format",
          envVars: [],
        };
      }

      const [, owner, repo] = match;

      // Try to fetch .env.example first (most common)
      const envFiles = [
        ".env.example",
        ".env.template",
        ".env.sample",
        "env.example",
      ];

      let envFileContent: string | null = null;
      let foundFile: string | null = null;

      for (const envFile of envFiles) {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${envFile}`;
          console.log(`[autoDetectEnvVarsFromGithub] Trying: ${rawUrl}`);

          const response = await fetch(rawUrl, {
            method: "GET",
            headers: {
              "Accept": "text/plain",
              "User-Agent": "l4yercak3-env-detector"
            }
          });

          if (response.ok) {
            envFileContent = await response.text();
            foundFile = envFile;
            console.log(`[autoDetectEnvVarsFromGithub] Found ${envFile}: ${envFileContent.length} bytes`);
            break;
          }
        } catch (e) {
          console.log(`[autoDetectEnvVarsFromGithub] ${envFile} not found, trying next...`);
        }
      }

      // If no .env file found, try master branch
      if (!envFileContent) {
        for (const envFile of envFiles) {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${envFile}`;
            console.log(`[autoDetectEnvVarsFromGithub] Trying master: ${rawUrl}`);

            const response = await fetch(rawUrl, {
              method: "GET",
              headers: {
                "Accept": "text/plain",
                "User-Agent": "l4yercak3-env-detector"
              }
            });

            if (response.ok) {
              envFileContent = await response.text();
              foundFile = envFile;
              console.log(`[autoDetectEnvVarsFromGithub] Found ${envFile} in master: ${envFileContent.length} bytes`);
              break;
            }
          } catch (e) {
            console.log(`[autoDetectEnvVarsFromGithub] ${envFile} not found in master`);
          }
        }
      }

      if (!envFileContent) {
        return {
          success: false,
          error: "No .env.example file found in repository (tried main and master branches)",
          envVars: [],
        };
      }

      // Parse the .env file
      const lines = envFileContent.split('\n');
      const envVars: Array<{
        key: string;
        description: string;
        required: boolean;
        defaultValue?: string;
      }> = [];

      let currentComment = "";

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines
        if (!trimmedLine) {
          currentComment = "";
          continue;
        }

        // Capture comments (descriptions)
        if (trimmedLine.startsWith('#')) {
          const comment = trimmedLine.substring(1).trim();
          if (comment) {
            currentComment = currentComment ? `${currentComment} ${comment}` : comment;
          }
          continue;
        }

        // Parse env var line: KEY=value or KEY=
        const envMatch = trimmedLine.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (envMatch) {
          const [, key, value] = envMatch;

          // Determine if it has a default value (not empty, not a placeholder)
          const hasDefaultValue = value && !value.match(/^(your_|YOUR_|<|>|\$|""|'')/);

          envVars.push({
            key: key.trim(),
            description: currentComment || `Environment variable for ${key}`,
            required: !hasDefaultValue, // If no default, it's required
            defaultValue: hasDefaultValue ? value.trim().replace(/^["']|["']$/g, '') : undefined,
          });

          currentComment = ""; // Reset comment for next variable
        }
      }

      console.log(`[autoDetectEnvVarsFromGithub] Parsed ${envVars.length} environment variables`);

      return {
        success: true,
        foundFile,
        envVars,
      };

    } catch (error) {
      console.error("[autoDetectEnvVarsFromGithub] Error:", error);
      return {
        success: false,
        error: `Failed to analyze repository: ${error instanceof Error ? error.message : "Unknown error"}`,
        envVars: [],
      };
    }
  },
});

/**
 * Get Deployment Environment Variables (Query)
 *
 * Retrieves configured environment variables for a published page.
 */
export const getDeploymentEnvVars = query({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Published page not found");

    const deployment = (page.customProperties?.deployment as any) || {};
    const envVars = deployment.environmentVariables || [];

    // If no env vars configured, return default set based on template
    if (envVars.length === 0) {
      const templateCode = page.customProperties?.templateCode;

      // Default env vars for Freelancer Portal and similar templates
      return [
        {
          key: "NEXT_PUBLIC_API_URL",
          description: "l4yercak3 API URL (e.g., https://app.l4yercak3.com/api/v1)",
          required: true,
          defaultValue: "https://app.l4yercak3.com/api/v1",
        },
        {
          key: "NEXT_PUBLIC_API_KEY",
          description: "Your l4yercak3 API key (create in Integrations > API Keys)",
          required: true,
        },
        {
          key: "NEXT_PUBLIC_ORG_ID",
          description: "Your organization ID",
          required: true,
        },
      ];
    }

    return envVars;
  },
});
