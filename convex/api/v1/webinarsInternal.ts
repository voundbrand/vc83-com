/**
 * WEBINARS INTERNAL QUERIES
 *
 * Internal queries for webinar API endpoints.
 * These are not directly exposed to HTTP but used by the API handlers.
 */

import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WebinarCustomProperties {
  slug: string;
  scheduledAt?: number;
  durationMinutes: number;
  timezone: string;
  evergreenEnabled?: boolean;
  evergreenSchedule?: {
    type: "recurring" | "just_in_time";
    days?: string[];
    times?: string[];
    justInTimeMinutes?: number;
  };
  maxRegistrants?: number;
  registrantCount: number;
  attendeeCount: number;
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxLiveStreamId?: string;
  muxStreamKey?: string;
  muxStatus?: string;
  muxError?: string;
  videoDuration?: number;
  presenters?: Array<{
    contactId?: string;
    name: string;
    role: string;
    bio?: string;
    avatarUrl?: string;
  }>;
  coverImageUrl?: string;
  logoUrl?: string;
  accentColor?: string;
  offerEnabled?: boolean;
  offerTimestamp?: number;
  offerType?: string;
  offerCheckoutId?: string;
  offerExternalUrl?: string;
  offerCtaText?: string;
  offerDeadline?: number;
  offerCountdownEnabled?: boolean;
  sendConfirmationEmail?: boolean;
  sendReminderEmails?: boolean;
  reminderSchedule?: string[];
  sendReplayEmail?: boolean;
  replayAvailableHours?: number;
  linkedWorkflowId?: string;
  actualStartTime?: number;
  actualEndTime?: number;
}

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * GET WEBINAR FOR PLAYBACK
 *
 * Internal query to get webinar details needed for playback page.
 * Returns Mux playback info and offer settings.
 */
export const getWebinarForPlayback = internalQuery({
  args: {
    webinarId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);

    if (!webinar || webinar.type !== "webinar") {
      return null;
    }

    const props = webinar.customProperties as WebinarCustomProperties | undefined;

    return {
      id: webinar._id,
      name: webinar.name,
      status: webinar.status,
      subtype: webinar.subtype,
      muxAssetId: props?.muxAssetId,
      muxPlaybackId: props?.muxPlaybackId,
      muxLiveStreamId: props?.muxLiveStreamId,
      muxStatus: props?.muxStatus,
      videoDuration: props?.videoDuration,
      scheduledAt: props?.scheduledAt,
      offerEnabled: props?.offerEnabled,
      offerTimestamp: props?.offerTimestamp,
      offerType: props?.offerType,
      offerCheckoutId: props?.offerCheckoutId,
      offerExternalUrl: props?.offerExternalUrl,
      offerCtaText: props?.offerCtaText,
      offerDeadline: props?.offerDeadline,
      offerCountdownEnabled: props?.offerCountdownEnabled,
    };
  },
});

/**
 * GET WEBINARS FOR ORGANIZATION (INTERNAL)
 *
 * Internal query for listing webinars with additional filters.
 */
export const getWebinarsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    subtype: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const webinars = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "webinar")
      )
      .collect();

    let filtered = webinars;

    if (args.status) {
      filtered = filtered.filter((w) => w.status === args.status);
    }

    if (args.subtype) {
      filtered = filtered.filter((w) => w.subtype === args.subtype);
    }

    // Sort by scheduled time (most recent first)
    filtered.sort((a, b) => {
      const aProps = a.customProperties as WebinarCustomProperties | undefined;
      const bProps = b.customProperties as WebinarCustomProperties | undefined;
      const aTime = aProps?.scheduledAt ?? 0;
      const bTime = bProps?.scheduledAt ?? 0;
      return bTime - aTime;
    });

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      webinars: paginated.map((w) => {
        const props = w.customProperties as WebinarCustomProperties | undefined;
        return {
          id: w._id,
          name: w.name,
          slug: props?.slug,
          subtype: w.subtype,
          status: w.status,
          scheduledAt: props?.scheduledAt,
          durationMinutes: props?.durationMinutes,
          timezone: props?.timezone,
          registrantCount: props?.registrantCount ?? 0,
          attendeeCount: props?.attendeeCount ?? 0,
          muxStatus: props?.muxStatus,
          createdAt: w._creationTime,
        };
      }),
      total,
      limit,
      offset,
    };
  },
});

/**
 * GET WEBINAR ANALYTICS (INTERNAL)
 *
 * Internal query for getting webinar analytics data.
 */
export const getWebinarAnalytics = internalQuery({
  args: {
    webinarId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify webinar belongs to organization
    const webinar = await ctx.db.get(args.webinarId);
    if (!webinar || webinar.organizationId !== args.organizationId) {
      return null;
    }

    const props = webinar.customProperties as WebinarCustomProperties | undefined;

    // Get all registrants for this webinar
    const registrants = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "webinar_registrant")
      )
      .collect();

    const webinarRegistrants = registrants.filter((r) => {
      const rProps = r.customProperties as { webinarId?: string } | undefined;
      return rProps?.webinarId === args.webinarId;
    });

    // Calculate metrics
    const totalRegistrations = webinarRegistrants.length;
    const attended = webinarRegistrants.filter((r) => {
      const rProps = r.customProperties as { attended?: boolean } | undefined;
      return rProps?.attended === true;
    }).length;
    const sawOffer = webinarRegistrants.filter((r) => {
      const rProps = r.customProperties as { sawOffer?: boolean } | undefined;
      return rProps?.sawOffer === true;
    }).length;
    const clickedOffer = webinarRegistrants.filter((r) => {
      const rProps = r.customProperties as { clickedOffer?: boolean } | undefined;
      return rProps?.clickedOffer === true;
    }).length;
    const converted = webinarRegistrants.filter((r) => {
      const rProps = r.customProperties as { converted?: boolean } | undefined;
      return rProps?.converted === true;
    }).length;

    // Calculate watch times
    const watchTimes = webinarRegistrants
      .filter((r) => {
        const rProps = r.customProperties as { attended?: boolean } | undefined;
        return rProps?.attended === true;
      })
      .map((r) => {
        const rProps = r.customProperties as { watchTimeSeconds?: number } | undefined;
        return rProps?.watchTimeSeconds ?? 0;
      });

    const totalWatchTimeSeconds = watchTimes.reduce((a, b) => a + b, 0);
    const averageWatchTimeSeconds = watchTimes.length > 0
      ? Math.round(totalWatchTimeSeconds / watchTimes.length)
      : 0;

    // Calculate completion rate (based on video duration)
    const videoDuration = props?.videoDuration ?? 0;
    const completionRate = videoDuration > 0
      ? Math.round(
          (webinarRegistrants.filter((r) => {
            const rProps = r.customProperties as { maxWatchPosition?: number } | undefined;
            const maxPos = rProps?.maxWatchPosition ?? 0;
            return maxPos >= videoDuration * 0.9; // 90% threshold
          }).length / Math.max(attended, 1)) * 100
        )
      : 0;

    // Get UTM source breakdown
    const sourceBreakdown: Record<string, { registrations: number; conversions: number }> = {};
    webinarRegistrants.forEach((r) => {
      const rProps = r.customProperties as {
        utmSource?: string;
        converted?: boolean;
      } | undefined;
      const source = rProps?.utmSource || "direct";
      if (!sourceBreakdown[source]) {
        sourceBreakdown[source] = { registrations: 0, conversions: 0 };
      }
      sourceBreakdown[source].registrations++;
      if (rProps?.converted) {
        sourceBreakdown[source].conversions++;
      }
    });

    return {
      webinarId: args.webinarId,

      funnel: {
        registrations: totalRegistrations,
        attended,
        showRate: totalRegistrations > 0 ? Math.round((attended / totalRegistrations) * 100) : 0,
        sawOffer,
        offerViewRate: attended > 0 ? Math.round((sawOffer / attended) * 100) : 0,
        clickedOffer,
        offerClickRate: sawOffer > 0 ? Math.round((clickedOffer / sawOffer) * 100) : 0,
        converted,
        conversionRate: totalRegistrations > 0 ? Math.round((converted / totalRegistrations) * 100) : 0,
      },

      engagement: {
        averageWatchTimeSeconds,
        averageWatchTimeFormatted: formatDuration(averageWatchTimeSeconds),
        completionRate,
      },

      sources: Object.entries(sourceBreakdown).map(([source, data]) => ({
        source,
        registrations: data.registrations,
        conversions: data.conversions,
      })),

      registrantCount: props?.registrantCount ?? 0,
      attendeeCount: props?.attendeeCount ?? 0,
    };
  },
});

/**
 * FIND REGISTRANT BY EMAIL
 *
 * Internal query to find a registrant by email for a webinar.
 */
export const findRegistrantByEmail = internalQuery({
  args: {
    webinarId: v.id("objects"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);
    if (!webinar) return null;

    const registrants = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", webinar.organizationId).eq("type", "webinar_registrant")
      )
      .collect();

    const registrant = registrants.find((r) => {
      const props = r.customProperties as { email?: string; webinarId?: string } | undefined;
      return props?.email === args.email && props?.webinarId === args.webinarId;
    });

    return registrant;
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * MARK REGISTRANTS AS MISSED
 *
 * Internal mutation to mark registrants who didn't attend as "missed".
 * Called by a scheduled job after webinar ends.
 */
export const markMissedRegistrants = internalMutation({
  args: {
    webinarId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);
    if (!webinar) return { updated: 0 };

    const registrants = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", webinar.organizationId).eq("type", "webinar_registrant")
      )
      .collect();

    const webinarRegistrants = registrants.filter((r) => {
      const props = r.customProperties as { webinarId?: string } | undefined;
      return props?.webinarId === args.webinarId;
    });

    let updated = 0;
    for (const registrant of webinarRegistrants) {
      const props = registrant.customProperties as { attended?: boolean } | undefined;
      if (!props?.attended && registrant.subtype === "registered") {
        await ctx.db.patch(registrant._id, {
          subtype: "missed",
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { updated };
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format seconds into human-readable duration.
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
