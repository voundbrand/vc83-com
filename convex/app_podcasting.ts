import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { createAppHelpers } from "./helpers/appHelpers";
import { createAuditLog } from "./helpers";
import { checkRateLimit } from "./security";

const APP_CODE = "app_podcasting";
const APP_TABLE = "app_podcasting" as const;

const { getAppContext, getPublicAppContext } = createAppHelpers(APP_CODE);

export const createEpisode = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    audioUrl: v.string(),
    embedUrl: v.optional(v.string()),
    episodeNumber: v.number(),
    season: v.optional(v.number()),
    duration: v.optional(v.number()),
    publishDate: v.string(),
    featuredImage: v.optional(v.string()),
    showNotes: v.optional(v.string()),
    guests: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { user, creatorOrg } = await getAppContext(ctx);

    const slug = args.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let episodeId;
    let success = true;
    let errorMessage: string | undefined;

    try {
      episodeId = await ctx.db.insert(APP_TABLE, {
        organizationId: creatorOrg._id,
        title: args.title,
        slug,
        description: args.description,
        audioUrl: args.audioUrl,
        embedUrl: args.embedUrl,
        episodeNumber: args.episodeNumber,
        season: args.season,
        duration: args.duration,
        publishDate: args.publishDate,
        featuredImage: args.featuredImage,
        showNotes: args.showNotes,
        guests: args.guests,
        tags: args.tags,
        status: args.status || "published",
        viewCount: 0,
        createdBy: user._id,
        createdAt: Date.now(),
        updatedBy: user._id,
        updatedAt: Date.now(),
      });
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw error;
    } finally {
      await createAuditLog(ctx, {
        organizationId: creatorOrg._id,
        userId: user._id,
        action: "episode.create",
        resource: "episode",
        metadata: { title: args.title, episodeNumber: args.episodeNumber },
        success,
        errorMessage,
      });
    }

    return episodeId;
  },
});

export const updateEpisode = mutation({
  args: {
    episodeId: v.id("app_podcasting"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    embedUrl: v.optional(v.string()),
    episodeNumber: v.optional(v.number()),
    season: v.optional(v.number()),
    duration: v.optional(v.number()),
    publishDate: v.optional(v.string()),
    featuredImage: v.optional(v.string()),
    showNotes: v.optional(v.string()),
    guests: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { user, creatorOrg } = await getAppContext(ctx);

    const { episodeId, ...updates } = args;

    const episode = await ctx.db.get(episodeId);
    if (!episode) {
      throw new Error("Episode not found");
    }

    if (episode.organizationId !== creatorOrg._id) {
      throw new Error("Only the creator organization can update this episode");
    }

    let success = true;
    let errorMessage: string | undefined;

    try {
      const updateData: Record<string, unknown> = {
        updatedBy: user._id,
        updatedAt: Date.now(),
      };

      if (updates.title) {
        updateData.title = updates.title;
        updateData.slug = updates.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
      if (updates.description) updateData.description = updates.description;
      if (updates.audioUrl) updateData.audioUrl = updates.audioUrl;
      if (updates.embedUrl !== undefined) updateData.embedUrl = updates.embedUrl;
      if (updates.episodeNumber)
        updateData.episodeNumber = updates.episodeNumber;
      if (updates.season !== undefined) updateData.season = updates.season;
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.publishDate) updateData.publishDate = updates.publishDate;
      if (updates.featuredImage !== undefined)
        updateData.featuredImage = updates.featuredImage;
      if (updates.showNotes !== undefined)
        updateData.showNotes = updates.showNotes;
      if (updates.guests !== undefined) updateData.guests = updates.guests;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.status) updateData.status = updates.status;

      await ctx.db.patch(episodeId, updateData);
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw error;
    } finally {
      await createAuditLog(ctx, {
        organizationId: creatorOrg._id,
        userId: user._id,
        action: "episode.update",
        resource: "episode",
        metadata: { episodeId: args.episodeId },
        success,
        errorMessage,
      });
    }

    return episodeId;
  },
});

export const deleteEpisode = mutation({
  args: {
    episodeId: v.id("app_podcasting"),
  },
  handler: async (ctx, { episodeId }) => {
    const { user, creatorOrg } = await getAppContext(ctx);

    const episode = await ctx.db.get(episodeId);
    if (!episode) {
      throw new Error("Episode not found");
    }

    if (episode.organizationId !== creatorOrg._id) {
      throw new Error("Only the creator organization can delete this episode");
    }

    let success = true;
    let errorMessage: string | undefined;

    try {
      await ctx.db.delete(episodeId);
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw error;
    } finally {
      await createAuditLog(ctx, {
        organizationId: creatorOrg._id,
        userId: user._id,
        action: "episode.delete",
        resource: "episode",
        metadata: { episodeId },
        success,
        errorMessage,
      });
    }
  },
});

export const getEpisodes = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, { status }) => {
    const { app, user, organization } = await getPublicAppContext(ctx);

    let episodesQuery = ctx.db
      .query(APP_TABLE)
      .withIndex("by_org", (q) => q.eq("organizationId", app.creatorOrgId));

    const isCreator = user && organization?._id === app.creatorOrgId;
    
    if (status) {
      episodesQuery = episodesQuery.filter((q) =>
        q.eq(q.field("status"), status)
      );
    } else if (!isCreator) {
      episodesQuery = episodesQuery.filter((q) =>
        q.eq(q.field("status"), "published")
      );
    }

    const episodes = await episodesQuery.collect();
    return episodes.sort((a, b) => b.episodeNumber - a.episodeNumber);
  },
});

export const getEpisodeBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const { app, user, organization } = await getPublicAppContext(ctx);

    if (!user) {
      const allowed = await checkRateLimit(
        ctx,
        `guest:episodes:slug:${slug}`,
        100,
        60 * 60 * 1000
      );
      
      if (!allowed) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
    }

    const episode = await ctx.db
      .query(APP_TABLE)
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!episode) {
      return null;
    }

    const isCreator = user && organization?._id === app.creatorOrgId;

    if (episode.status !== "published" && !isCreator) {
      return null;
    }

    return episode;
  },
});

export const getEpisodeById = query({
  args: {
    episodeId: v.id("app_podcasting"),
  },
  handler: async (ctx, { episodeId }) => {
    const { app, user, organization } = await getPublicAppContext(ctx);

    if (!user) {
      const allowed = await checkRateLimit(
        ctx,
        `guest:episodes:id:${episodeId}`,
        100,
        60 * 60 * 1000
      );
      
      if (!allowed) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
    }

    const episode = await ctx.db.get(episodeId);
    if (!episode) {
      return null;
    }

    const isCreator = user && organization?._id === app.creatorOrgId;

    if (episode.status !== "published" && !isCreator) {
      return null;
    }

    return episode;
  },
});

export const incrementEpisodeViews = mutation({
  args: {
    episodeId: v.id("app_podcasting"),
  },
  handler: async (ctx, { episodeId }) => {
    const allowed = await checkRateLimit(
      ctx,
      `guest:episodes:view:${episodeId}`,
      10,
      60 * 1000
    );
    
    if (!allowed) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    const episode = await ctx.db.get(episodeId);
    if (!episode) {
      throw new Error("Episode not found");
    }

    await ctx.db.patch(episodeId, {
      viewCount: episode.viewCount + 1,
    });
  },
});
