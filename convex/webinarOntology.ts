/**
 * WEBINAR ONTOLOGY
 *
 * Core webinar CRUD operations using the objects table.
 * Webinars are stored as objects with type="webinar" and various subtypes.
 *
 * Webinar Subtypes:
 * - "live": Real-time broadcast with Mux Live
 * - "automated": Pre-recorded, scheduled to "go live" (evergreen)
 * - "on_demand": Available anytime after original broadcast
 * - "series": Multi-session webinar
 *
 * Webinar Statuses:
 * - "draft": Not yet published
 * - "scheduled": Published, waiting for start time
 * - "live": Currently broadcasting
 * - "completed": Finished
 * - "cancelled": Cancelled
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

export type WebinarSubtype = "live" | "automated" | "on_demand" | "series";
export type WebinarStatus = "draft" | "scheduled" | "live" | "completed" | "cancelled";

export interface WebinarCustomProperties {
  // Identification
  slug: string;

  // Scheduling
  scheduledAt?: number;
  durationMinutes: number;
  timezone: string;

  // Evergreen scheduling
  evergreenEnabled?: boolean;
  evergreenSchedule?: {
    type: "recurring" | "just_in_time";
    days?: string[];
    times?: string[];
    justInTimeMinutes?: number;
  };

  // Capacity
  maxRegistrants?: number;
  registrantCount: number;
  attendeeCount: number;

  // Mux Video
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxLiveStreamId?: string;
  muxStreamKey?: string;
  muxStatus?: "waiting" | "processing" | "ready" | "errored" | "live" | "idle";
  muxError?: string;
  videoDuration?: number;

  // Presenters
  presenters?: Array<{
    contactId?: string;
    name: string;
    role: "host" | "presenter" | "moderator";
    bio?: string;
    avatarUrl?: string;
  }>;

  // Branding
  coverImageUrl?: string;
  logoUrl?: string;
  accentColor?: string;

  // Offer Configuration
  offerEnabled?: boolean;
  offerTimestamp?: number;
  offerType?: "checkout" | "external_url" | "inline";
  offerCheckoutId?: string;
  offerExternalUrl?: string;
  offerCtaText?: string;
  offerDeadline?: number;
  offerCountdownEnabled?: boolean;

  // Email Settings
  sendConfirmationEmail?: boolean;
  sendReminderEmails?: boolean;
  reminderSchedule?: string[];
  sendReplayEmail?: boolean;
  replayAvailableHours?: number;

  // Recordings
  recordings?: Array<{
    muxAssetId: string;
    muxPlaybackId: string;
    title: string;
    type: "full" | "edited" | "highlights" | "audio";
    durationSeconds: number;
    addedAt: number;
  }>;

  // Analytics (cached)
  totalViews?: number;
  uniqueViewers?: number;
  averageWatchSeconds?: number;
  engagementScore?: number;

  // Workflow
  linkedWorkflowId?: string;

  // Timestamps
  actualStartTime?: number;
  actualEndTime?: number;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET WEBINARS
 *
 * Lists webinars for an organization with optional filters.
 */
export const getWebinars = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    subtype: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "webinar")
      );

    const webinars = await query.collect();

    // Filter by status/subtype in memory (Convex doesn't support multi-field indexes well)
    let filtered = webinars;

    if (args.status) {
      filtered = filtered.filter((w) => w.status === args.status);
    }

    if (args.subtype) {
      filtered = filtered.filter((w) => w.subtype === args.subtype);
    }

    // Sort by scheduled time (most recent first)
    filtered.sort((a, b) => {
      const aTime = (a.customProperties as WebinarCustomProperties)?.scheduledAt ?? 0;
      const bTime = (b.customProperties as WebinarCustomProperties)?.scheduledAt ?? 0;
      return bTime - aTime;
    });

    // Apply limit
    const paginated = filtered.slice(0, limit);

    return {
      webinars: paginated.map((w) => ({
        id: w._id,
        name: w.name,
        slug: (w.customProperties as WebinarCustomProperties)?.slug,
        subtype: w.subtype,
        status: w.status,
        scheduledAt: (w.customProperties as WebinarCustomProperties)?.scheduledAt,
        durationMinutes: (w.customProperties as WebinarCustomProperties)?.durationMinutes,
        timezone: (w.customProperties as WebinarCustomProperties)?.timezone,
        registrantCount: (w.customProperties as WebinarCustomProperties)?.registrantCount ?? 0,
        attendeeCount: (w.customProperties as WebinarCustomProperties)?.attendeeCount ?? 0,
        createdAt: w._creationTime,
        updatedAt: w.updatedAt,
      })),
      total: filtered.length,
      hasMore: filtered.length > limit,
    };
  },
});

/**
 * GET WEBINAR BY ID
 *
 * Gets a single webinar with full details.
 */
export const getWebinar = query({
  args: {
    webinarId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);

    if (!webinar || webinar.type !== "webinar") {
      return null;
    }

    // Verify organization access
    if (webinar.organizationId !== args.organizationId) {
      return null;
    }

    const props = webinar.customProperties as WebinarCustomProperties;

    return {
      id: webinar._id,
      name: webinar.name,
      description: webinar.description,
      subtype: webinar.subtype as WebinarSubtype,
      status: webinar.status as WebinarStatus,

      scheduling: {
        scheduledAt: props?.scheduledAt,
        durationMinutes: props?.durationMinutes,
        timezone: props?.timezone,
        evergreen: props?.evergreenEnabled
          ? {
              enabled: true,
              type: props.evergreenSchedule?.type,
              days: props.evergreenSchedule?.days,
              times: props.evergreenSchedule?.times,
              justInTimeMinutes: props.evergreenSchedule?.justInTimeMinutes,
            }
          : { enabled: false },
      },

      capacity: {
        maxRegistrants: props?.maxRegistrants,
        registrantCount: props?.registrantCount ?? 0,
        attendeeCount: props?.attendeeCount ?? 0,
        registrationOpen: webinar.status === "scheduled" || webinar.status === "draft",
      },

      video: {
        muxAssetId: props?.muxAssetId,
        muxPlaybackId: props?.muxPlaybackId,
        muxLiveStreamId: props?.muxLiveStreamId,
        status: props?.muxStatus ?? "waiting",
        duration: props?.videoDuration,
        error: props?.muxError,
      },

      presenters: props?.presenters ?? [],

      offer: {
        enabled: props?.offerEnabled ?? false,
        revealAtSeconds: props?.offerTimestamp,
        type: props?.offerType,
        checkoutId: props?.offerCheckoutId,
        externalUrl: props?.offerExternalUrl,
        ctaText: props?.offerCtaText,
        deadline: props?.offerDeadline,
        countdownEnabled: props?.offerCountdownEnabled,
      },

      branding: {
        coverImageUrl: props?.coverImageUrl,
        logoUrl: props?.logoUrl,
        accentColor: props?.accentColor,
      },

      emails: {
        confirmationEnabled: props?.sendConfirmationEmail ?? true,
        remindersEnabled: props?.sendReminderEmails ?? true,
        reminderSchedule: props?.reminderSchedule ?? ["24h", "1h"],
        replayEnabled: props?.sendReplayEmail ?? true,
        replayAvailableHours: props?.replayAvailableHours ?? 48,
      },

      recordings: props?.recordings ?? [],

      createdAt: webinar._creationTime,
      updatedAt: webinar.updatedAt,
    };
  },
});

/**
 * GET WEBINAR BY SLUG
 *
 * Gets a webinar by its URL slug.
 */
export const getWebinarBySlug = query({
  args: {
    slug: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const webinars = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "webinar")
      )
      .collect();

    const webinar = webinars.find(
      (w) => (w.customProperties as WebinarCustomProperties)?.slug === args.slug
    );

    if (!webinar) {
      return null;
    }

    return webinar._id;
  },
});

/**
 * GET WEBINAR PUBLIC INFO
 *
 * Gets limited webinar info for public registration pages (no auth required).
 */
export const getWebinarPublic = query({
  args: {
    webinarId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);

    if (!webinar || webinar.type !== "webinar") {
      return null;
    }

    // Only return public info for scheduled/live webinars
    if (webinar.status !== "scheduled" && webinar.status !== "live") {
      return null;
    }

    const props = webinar.customProperties as WebinarCustomProperties;

    // Calculate available sessions for evergreen webinars
    let availableSessions: number[] = [];
    if (props?.evergreenEnabled && props.evergreenSchedule) {
      availableSessions = calculateNextSessions(props.evergreenSchedule, 5);
    } else if (props?.scheduledAt) {
      availableSessions = [props.scheduledAt];
    }

    return {
      id: webinar._id,
      name: webinar.name,
      slug: props?.slug,
      description: webinar.description,
      subtype: webinar.subtype,
      status: webinar.status,

      scheduling: {
        nextSession: availableSessions[0],
        availableSessions,
        durationMinutes: props?.durationMinutes,
        timezone: props?.timezone,
      },

      capacity: {
        spotsRemaining: props?.maxRegistrants
          ? props.maxRegistrants - (props.registrantCount ?? 0)
          : null,
        registrationOpen: true,
      },

      presenters: (props?.presenters ?? []).map((p) => ({
        name: p.name,
        role: p.role,
        bio: p.bio,
        avatarUrl: p.avatarUrl,
      })),

      branding: {
        coverImageUrl: props?.coverImageUrl,
        logoUrl: props?.logoUrl,
        accentColor: props?.accentColor,
      },
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * CREATE WEBINAR
 *
 * Creates a new webinar in draft status.
 */
export const createWebinar = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    subtype: v.string(),
    scheduledAt: v.optional(v.number()),
    durationMinutes: v.number(),
    timezone: v.string(),
    maxRegistrants: v.optional(v.number()),
    evergreenEnabled: v.optional(v.boolean()),
    evergreenSchedule: v.optional(v.any()),
    offerEnabled: v.optional(v.boolean()),
    offerTimestamp: v.optional(v.number()),
    offerCheckoutId: v.optional(v.string()),
    offerCtaText: v.optional(v.string()),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Generate unique slug from name
    const baseSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for slug uniqueness
    const existingWebinars = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "webinar")
      )
      .collect();

    let slug = baseSlug;
    let counter = 1;
    while (
      existingWebinars.some(
        (w) => (w.customProperties as WebinarCustomProperties)?.slug === slug
      )
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const customProperties: WebinarCustomProperties = {
      slug,
      scheduledAt: args.scheduledAt,
      durationMinutes: args.durationMinutes,
      timezone: args.timezone,
      maxRegistrants: args.maxRegistrants,
      registrantCount: 0,
      attendeeCount: 0,
      evergreenEnabled: args.evergreenEnabled,
      evergreenSchedule: args.evergreenSchedule,
      offerEnabled: args.offerEnabled,
      offerTimestamp: args.offerTimestamp,
      offerCheckoutId: args.offerCheckoutId,
      offerCtaText: args.offerCtaText,
      sendConfirmationEmail: true,
      sendReminderEmails: true,
      reminderSchedule: ["24h", "1h"],
      sendReplayEmail: true,
      replayAvailableHours: 48,
    };

    const webinarId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "webinar",
      subtype: args.subtype,
      name: args.name,
      description: args.description ?? "",
      status: "draft",
      customProperties,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: args.performedBy,
    });

    return {
      webinarId,
      slug,
    };
  },
});

/**
 * UPDATE WEBINAR
 *
 * Updates webinar fields.
 */
export const updateWebinar = mutation({
  args: {
    webinarId: v.id("objects"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    timezone: v.optional(v.string()),
    maxRegistrants: v.optional(v.number()),
    evergreenEnabled: v.optional(v.boolean()),
    evergreenSchedule: v.optional(v.any()),
    presenters: v.optional(v.any()),
    coverImageUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    offerEnabled: v.optional(v.boolean()),
    offerTimestamp: v.optional(v.number()),
    offerType: v.optional(v.string()),
    offerCheckoutId: v.optional(v.string()),
    offerExternalUrl: v.optional(v.string()),
    offerCtaText: v.optional(v.string()),
    offerDeadline: v.optional(v.number()),
    offerCountdownEnabled: v.optional(v.boolean()),
    sendConfirmationEmail: v.optional(v.boolean()),
    sendReminderEmails: v.optional(v.boolean()),
    reminderSchedule: v.optional(v.array(v.string())),
    sendReplayEmail: v.optional(v.boolean()),
    replayAvailableHours: v.optional(v.number()),
    linkedWorkflowId: v.optional(v.string()),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);

    if (!webinar || webinar.type !== "webinar") {
      throw new Error("Webinar not found");
    }

    if (webinar.organizationId !== args.organizationId) {
      throw new Error("Access denied");
    }

    const existingProps = (webinar.customProperties ?? {}) as WebinarCustomProperties;

    const updates: Partial<typeof webinar> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    // Update custom properties
    const customProperties: WebinarCustomProperties = {
      ...existingProps,
      ...(args.scheduledAt !== undefined && { scheduledAt: args.scheduledAt }),
      ...(args.durationMinutes !== undefined && { durationMinutes: args.durationMinutes }),
      ...(args.timezone !== undefined && { timezone: args.timezone }),
      ...(args.maxRegistrants !== undefined && { maxRegistrants: args.maxRegistrants }),
      ...(args.evergreenEnabled !== undefined && { evergreenEnabled: args.evergreenEnabled }),
      ...(args.evergreenSchedule !== undefined && { evergreenSchedule: args.evergreenSchedule }),
      ...(args.presenters !== undefined && { presenters: args.presenters }),
      ...(args.coverImageUrl !== undefined && { coverImageUrl: args.coverImageUrl }),
      ...(args.logoUrl !== undefined && { logoUrl: args.logoUrl }),
      ...(args.accentColor !== undefined && { accentColor: args.accentColor }),
      ...(args.offerEnabled !== undefined && { offerEnabled: args.offerEnabled }),
      ...(args.offerTimestamp !== undefined && { offerTimestamp: args.offerTimestamp }),
      ...(args.offerType !== undefined && { offerType: args.offerType as WebinarCustomProperties["offerType"] }),
      ...(args.offerCheckoutId !== undefined && { offerCheckoutId: args.offerCheckoutId }),
      ...(args.offerExternalUrl !== undefined && { offerExternalUrl: args.offerExternalUrl }),
      ...(args.offerCtaText !== undefined && { offerCtaText: args.offerCtaText }),
      ...(args.offerDeadline !== undefined && { offerDeadline: args.offerDeadline }),
      ...(args.offerCountdownEnabled !== undefined && { offerCountdownEnabled: args.offerCountdownEnabled }),
      ...(args.sendConfirmationEmail !== undefined && { sendConfirmationEmail: args.sendConfirmationEmail }),
      ...(args.sendReminderEmails !== undefined && { sendReminderEmails: args.sendReminderEmails }),
      ...(args.reminderSchedule !== undefined && { reminderSchedule: args.reminderSchedule }),
      ...(args.sendReplayEmail !== undefined && { sendReplayEmail: args.sendReplayEmail }),
      ...(args.replayAvailableHours !== undefined && { replayAvailableHours: args.replayAvailableHours }),
      ...(args.linkedWorkflowId !== undefined && { linkedWorkflowId: args.linkedWorkflowId }),
    };

    updates.customProperties = customProperties;

    await ctx.db.patch(args.webinarId, updates);

    return { success: true };
  },
});

/**
 * DELETE WEBINAR
 *
 * Soft deletes a webinar by setting status to cancelled.
 */
export const deleteWebinar = mutation({
  args: {
    webinarId: v.id("objects"),
    organizationId: v.id("organizations"),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);

    if (!webinar || webinar.type !== "webinar") {
      throw new Error("Webinar not found");
    }

    if (webinar.organizationId !== args.organizationId) {
      throw new Error("Access denied");
    }

    // Soft delete by marking as cancelled
    await ctx.db.patch(args.webinarId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * PUBLISH WEBINAR
 *
 * Changes webinar status from draft to scheduled.
 */
export const publishWebinar = mutation({
  args: {
    webinarId: v.id("objects"),
    organizationId: v.id("organizations"),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);

    if (!webinar || webinar.type !== "webinar") {
      throw new Error("Webinar not found");
    }

    if (webinar.organizationId !== args.organizationId) {
      throw new Error("Access denied");
    }

    if (webinar.status !== "draft") {
      throw new Error("Only draft webinars can be published");
    }

    await ctx.db.patch(args.webinarId, {
      status: "scheduled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for Mux webhook processing)
// ============================================================================

/**
 * UPDATE WEBINAR MUX STATUS
 *
 * Internal mutation for updating webinar's Mux video status from webhooks.
 */
export const updateWebinarMuxStatus = internalMutation({
  args: {
    webinarId: v.string(),
    muxAssetId: v.optional(v.string()),
    muxPlaybackId: v.optional(v.string()),
    status: v.string(),
    duration: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Parse webinarId from passthrough
    let webinarId: Id<"objects">;
    try {
      webinarId = args.webinarId as Id<"objects">;
    } catch {
      console.error(`[Mux Status] Invalid webinar ID: ${args.webinarId}`);
      return;
    }

    const webinar = await ctx.db.get(webinarId);
    if (!webinar || webinar.type !== "webinar") {
      console.error(`[Mux Status] Webinar not found: ${args.webinarId}`);
      return;
    }

    const existingProps = (webinar.customProperties ?? {}) as WebinarCustomProperties;

    const customProperties: WebinarCustomProperties = {
      ...existingProps,
      muxStatus: args.status as WebinarCustomProperties["muxStatus"],
      ...(args.muxAssetId && { muxAssetId: args.muxAssetId }),
      ...(args.muxPlaybackId && { muxPlaybackId: args.muxPlaybackId }),
      ...(args.duration && { videoDuration: args.duration }),
      ...(args.error && { muxError: args.error }),
    };

    await ctx.db.patch(webinarId, {
      customProperties,
      updatedAt: Date.now(),
    });

    console.log(`[Mux Status] Updated webinar ${webinarId} to ${args.status}`);
  },
});

/**
 * UPDATE WEBINAR LIVE STATUS
 *
 * Internal mutation for updating live stream status from webhooks.
 */
export const updateWebinarLiveStatus = internalMutation({
  args: {
    webinarId: v.string(),
    liveStreamId: v.string(),
    status: v.string(),
    activeAssetId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let webinarId: Id<"objects">;
    try {
      webinarId = args.webinarId as Id<"objects">;
    } catch {
      console.error(`[Live Status] Invalid webinar ID: ${args.webinarId}`);
      return;
    }

    const webinar = await ctx.db.get(webinarId);
    if (!webinar || webinar.type !== "webinar") {
      console.error(`[Live Status] Webinar not found: ${args.webinarId}`);
      return;
    }

    const existingProps = (webinar.customProperties ?? {}) as WebinarCustomProperties;

    // Update webinar status based on live stream status
    let webinarStatus = webinar.status;
    if (args.status === "live") {
      webinarStatus = "live";
    } else if (args.status === "idle" && webinar.status === "live") {
      webinarStatus = "completed";
    }

    const customProperties: WebinarCustomProperties = {
      ...existingProps,
      muxLiveStreamId: args.liveStreamId,
      muxStatus: args.status as WebinarCustomProperties["muxStatus"],
      ...(args.status === "live" && { actualStartTime: Date.now() }),
      ...(args.status === "idle" && webinar.status === "live" && { actualEndTime: Date.now() }),
    };

    await ctx.db.patch(webinarId, {
      status: webinarStatus,
      customProperties,
      updatedAt: Date.now(),
    });

    console.log(`[Live Status] Updated webinar ${webinarId} to ${args.status}`);
  },
});

/**
 * INCREMENT REGISTRANT COUNT
 *
 * Internal mutation to increment the registrant count.
 */
export const incrementRegistrantCount = internalMutation({
  args: {
    webinarId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);
    if (!webinar || webinar.type !== "webinar") return;

    const existingProps = (webinar.customProperties ?? {}) as WebinarCustomProperties;

    await ctx.db.patch(args.webinarId, {
      customProperties: {
        ...existingProps,
        registrantCount: (existingProps.registrantCount ?? 0) + 1,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * INCREMENT ATTENDEE COUNT
 *
 * Internal mutation to increment the attendee count.
 */
export const incrementAttendeeCount = internalMutation({
  args: {
    webinarId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);
    if (!webinar || webinar.type !== "webinar") return;

    const existingProps = (webinar.customProperties ?? {}) as WebinarCustomProperties;

    await ctx.db.patch(args.webinarId, {
      customProperties: {
        ...existingProps,
        attendeeCount: (existingProps.attendeeCount ?? 0) + 1,
      },
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate next available sessions for evergreen webinars.
 */
function calculateNextSessions(
  schedule: NonNullable<WebinarCustomProperties["evergreenSchedule"]>,
  count: number
): number[] {
  const sessions: number[] = [];
  const now = Date.now();

  if (schedule.type === "just_in_time") {
    // Just-in-time: next session starts in X minutes
    const minutes = schedule.justInTimeMinutes ?? 15;
    sessions.push(now + minutes * 60 * 1000);
  } else if (schedule.type === "recurring") {
    // Recurring: find next sessions based on days and times
    const days = schedule.days ?? [];
    const times = schedule.times ?? [];

    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const currentDate = new Date(now);

    // Look ahead up to 4 weeks to find enough sessions
    for (let dayOffset = 0; dayOffset < 28 && sessions.length < count; dayOffset++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      const dayName = Object.keys(dayMap).find(
        (k) => dayMap[k] === checkDate.getDay()
      );

      if (dayName && days.includes(dayName)) {
        for (const time of times) {
          if (sessions.length >= count) break;

          const [hours, minutes] = time.split(":").map(Number);
          const sessionDate = new Date(checkDate);
          sessionDate.setHours(hours, minutes, 0, 0);

          if (sessionDate.getTime() > now) {
            sessions.push(sessionDate.getTime());
          }
        }
      }
    }
  }

  return sessions.sort((a, b) => a - b).slice(0, count);
}
