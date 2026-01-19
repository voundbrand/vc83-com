/**
 * PAGE BUILDER ONTOLOGY
 *
 * Manages AI-generated pages as a special subtype of projects.
 * These are created through the /builder UI and stored as projects with
 * template='ai-generated' and the page schema in customProperties.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkResourceLimit } from "./licensing/helpers";

/**
 * SAVE GENERATED PAGE
 * Save an AI-generated page as a new project
 */
export const saveGeneratedPage = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    pageSchema: v.any(), // AIGeneratedPageSchema - validated client-side
    conversationId: v.optional(v.id("aiConversations")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check project limit
    await checkResourceLimit(ctx, args.organizationId, "project", "maxProjects");

    // Generate project code: AIB-YYYY-###
    const year = new Date().getFullYear();
    const existingPages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      )
      .filter((q) => q.eq(q.field("subtype"), "ai_generated_page"))
      .collect();

    // Get next number for this year
    const thisYearPages = existingPages.filter((p) => {
      const props = p.customProperties || {};
      return props.projectCode?.startsWith(`AIB-${year}-`);
    });
    const nextNumber = (thisYearPages.length + 1).toString().padStart(3, "0");
    const projectCode = `AIB-${year}-${nextNumber}`;

    // Generate slug from name
    const baseSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for slug uniqueness and add suffix if needed
    let slug = baseSlug;
    let slugSuffix = 1;
    const existingSlugs = existingPages
      .map((p) => (p.customProperties as Record<string, unknown>)?.publicPage as { slug?: string } | undefined)
      .filter(Boolean)
      .map((pp) => pp?.slug);

    while (existingSlugs.includes(slug)) {
      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }

    // Build customProperties with AI page data
    const customProperties = {
      projectCode,
      template: "ai-generated",
      pageSchema: args.pageSchema,
      conversationId: args.conversationId,
      publicPage: {
        enabled: true,
        slug,
        template: "ai-generated",
        title: args.pageSchema?.metadata?.title || args.name,
        description: args.pageSchema?.metadata?.description || args.description,
      },
      generatedAt: Date.now(),
      lastEditedAt: Date.now(),
    };

    // Create project object
    const projectId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "project",
      subtype: "ai_generated_page",
      name: args.name,
      description: args.description,
      status: "active", // AI-generated pages are active immediately
      customProperties,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

/**
 * LOAD GENERATED PAGE
 * Load an AI-generated page by project ID
 */
export const loadGeneratedPage = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.type !== "project" || project.subtype !== "ai_generated_page") {
      return null;
    }

    const customProps = project.customProperties || {};

    return {
      id: project._id,
      name: project.name,
      description: project.description,
      pageSchema: customProps.pageSchema,
      conversationId: customProps.conversationId as Id<"aiConversations"> | undefined,
      publicPage: customProps.publicPage,
      generatedAt: customProps.generatedAt,
      lastEditedAt: customProps.lastEditedAt,
    };
  },
});

/**
 * UPDATE PAGE SCHEMA
 * Update the page schema for an existing AI-generated page
 */
export const updatePageSchema = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    pageSchema: v.any(), // AIGeneratedPageSchema
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.type !== "project" || project.subtype !== "ai_generated_page") {
      throw new Error("AI-generated page not found");
    }

    const currentProps = project.customProperties || {};

    await ctx.db.patch(args.projectId, {
      customProperties: {
        ...currentProps,
        pageSchema: args.pageSchema,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    return args.projectId;
  },
});

/**
 * GET GENERATED PAGE BY SLUG
 * Public query to get a page by its slug (for rendering public pages)
 */
export const getGeneratedPageBySlug = query({
  args: {
    slug: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Query all AI-generated pages
    let pages = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "project"),
          q.eq(q.field("subtype"), "ai_generated_page")
        )
      )
      .collect();

    // Filter by organization if provided
    if (args.organizationId) {
      pages = pages.filter((p) => p.organizationId === args.organizationId);
    }

    // Find the page with matching slug
    const page = pages.find((p) => {
      const customProps = p.customProperties || {};
      const publicPage = customProps.publicPage as { enabled?: boolean; slug?: string } | undefined;
      return publicPage?.enabled && publicPage?.slug === args.slug;
    });

    if (!page) {
      return null;
    }

    const customProps = page.customProperties || {};

    return {
      id: page._id,
      organizationId: page.organizationId,
      name: page.name,
      description: page.description,
      pageSchema: customProps.pageSchema,
      publicPage: customProps.publicPage,
    };
  },
});

/**
 * LIST GENERATED PAGES
 * Get all AI-generated pages for an organization
 */
export const listGeneratedPages = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const pages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      )
      .filter((q) => q.eq(q.field("subtype"), "ai_generated_page"))
      .collect();

    return pages.map((page) => {
      const customProps = page.customProperties || {};
      return {
        id: page._id,
        name: page.name,
        description: page.description,
        status: page.status,
        publicPage: customProps.publicPage,
        generatedAt: customProps.generatedAt,
        lastEditedAt: customProps.lastEditedAt,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      };
    });
  },
});

/**
 * DELETE GENERATED PAGE
 * Delete an AI-generated page
 */
export const deleteGeneratedPage = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.type !== "project" || project.subtype !== "ai_generated_page") {
      throw new Error("AI-generated page not found");
    }

    await ctx.db.delete(args.projectId);

    return { success: true };
  },
});

/**
 * TOGGLE PAGE VISIBILITY
 * Enable or disable the public page
 */
export const togglePageVisibility = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.type !== "project" || project.subtype !== "ai_generated_page") {
      throw new Error("AI-generated page not found");
    }

    const currentProps = project.customProperties || {};
    const publicPage = (currentProps.publicPage as Record<string, unknown>) || {};

    await ctx.db.patch(args.projectId, {
      customProperties: {
        ...currentProps,
        publicPage: {
          ...publicPage,
          enabled: args.enabled,
        },
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
