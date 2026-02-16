/**
 * WEBINAR REGISTRANTS
 *
 * Manages webinar registrations using the objects table.
 * Registrants are stored as objects with type="webinar_registrant".
 *
 * Registrant Subtypes (progression states):
 * - "registered": Initial registration
 * - "attended": Joined the webinar
 * - "missed": Did not attend
 * - "replay_watched": Watched the replay
 *
 * Conversion tracking:
 * - sawOffer: Viewed the offer CTA
 * - clickedOffer: Clicked the CTA
 * - converted: Made a purchase
 */

import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
const generatedApi: any = require("./_generated/api");

// ============================================================================
// TYPES
// ============================================================================

export type RegistrantSubtype = "registered" | "attended" | "missed" | "replay_watched";

export interface RegistrantCustomProperties {
  webinarId: string;
  contactId?: string;

  // Registration Info
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  registrationCode: string;
  registeredAt: number;

  // UTM Tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;

  // Selected Session (for evergreen)
  selectedSessionTime?: number;

  // Attendance
  attended: boolean;
  joinedAt?: number;
  leftAt?: number;
  watchTimeSeconds: number;
  maxWatchPosition: number;

  // Engagement
  sawOffer: boolean;
  sawOfferAt?: number;
  clickedOffer: boolean;
  clickedOfferAt?: number;

  // Conversion
  converted: boolean;
  convertedAt?: number;
  transactionId?: string;

  // Replay
  watchedReplay: boolean;
  replayWatchTimeSeconds: number;

  // Custom Fields
  customFields?: Record<string, unknown>;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET REGISTRANTS
 *
 * Lists registrants for a webinar with optional filters.
 */
export const getRegistrants = query({
  args: {
    webinarId: v.id("objects"),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // First verify webinar belongs to organization
    const webinar = await ctx.db.get(args.webinarId);
    if (!webinar || webinar.organizationId !== args.organizationId) {
      throw new Error("Webinar not found or access denied");
    }

    // Query all registrants for this webinar
    const allRegistrants = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "webinar_registrant")
      )
      .collect();

    // Filter by webinarId
    let filtered = allRegistrants.filter(
      (r) => (r.customProperties as RegistrantCustomProperties)?.webinarId === args.webinarId
    );

    // Filter by status (subtype)
    if (args.status) {
      filtered = filtered.filter((r) => r.subtype === args.status);
    }

    // Sort by registration time (most recent first)
    filtered.sort((a, b) => {
      const aTime = (a.customProperties as RegistrantCustomProperties)?.registeredAt ?? 0;
      const bTime = (b.customProperties as RegistrantCustomProperties)?.registeredAt ?? 0;
      return bTime - aTime;
    });

    // Apply pagination
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      registrants: paginated.map((r) => {
        const props = r.customProperties as RegistrantCustomProperties;
        return {
          id: r._id,
          contactId: props?.contactId,
          email: props?.email,
          firstName: props?.firstName,
          lastName: props?.lastName,
          company: props?.company,
          status: r.subtype,

          registration: {
            registeredAt: props?.registeredAt,
            registrationCode: props?.registrationCode,
            selectedSession: props?.selectedSessionTime,
            utmSource: props?.utmSource,
            utmCampaign: props?.utmCampaign,
          },

          attendance: {
            attended: props?.attended ?? false,
            joinedAt: props?.joinedAt,
            leftAt: props?.leftAt,
            watchTimeSeconds: props?.watchTimeSeconds ?? 0,
            maxPositionSeconds: props?.maxWatchPosition ?? 0,
          },

          engagement: {
            sawOffer: props?.sawOffer ?? false,
            sawOfferAt: props?.sawOfferAt,
            clickedOffer: props?.clickedOffer ?? false,
            clickedOfferAt: props?.clickedOfferAt,
          },

          conversion: {
            converted: props?.converted ?? false,
            convertedAt: props?.convertedAt,
            transactionId: props?.transactionId,
          },
        };
      }),
      total,
      limit,
      offset,
    };
  },
});

/**
 * GET REGISTRANT BY CODE
 *
 * Gets a registrant by their unique registration code.
 * Used for playback page validation.
 */
export const getRegistrantByCode = query({
  args: {
    registrationCode: v.string(),
    webinarId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get webinar to find organization
    const webinar = await ctx.db.get(args.webinarId);
    if (!webinar || webinar.type !== "webinar") {
      return null;
    }

    // Query registrants for this organization
    const registrants = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", webinar.organizationId).eq("type", "webinar_registrant")
      )
      .collect();

    // Find by code and webinarId
    const registrant = registrants.find((r) => {
      const props = r.customProperties as RegistrantCustomProperties;
      return (
        props?.registrationCode === args.registrationCode &&
        props?.webinarId === args.webinarId
      );
    });

    if (!registrant) {
      return null;
    }

    const props = registrant.customProperties as RegistrantCustomProperties;

    return {
      id: registrant._id,
      firstName: props?.firstName,
      lastName: props?.lastName,
      email: props?.email,
      registrationCode: props?.registrationCode,
      selectedSessionTime: props?.selectedSessionTime,
      attended: props?.attended ?? false,
      watchTimeSeconds: props?.watchTimeSeconds ?? 0,
      maxWatchPosition: props?.maxWatchPosition ?? 0,
      sawOffer: props?.sawOffer ?? false,
      clickedOffer: props?.clickedOffer ?? false,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * REGISTER FOR WEBINAR
 *
 * Creates a new registration for a webinar.
 * Optionally creates/links a CRM contact.
 */
export const registerForWebinar = mutation({
  args: {
    webinarId: v.id("objects"),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    selectedSession: v.optional(v.number()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    referrer: v.optional(v.string()),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get webinar
    const webinar = await ctx.db.get(args.webinarId);
    if (!webinar || webinar.type !== "webinar") {
      throw new Error("Webinar not found");
    }

    // Check if registration is open
    if (webinar.status !== "scheduled" && webinar.status !== "draft") {
      throw new Error("Registration is closed");
    }

    // Check capacity
    const webinarProps = webinar.customProperties as { maxRegistrants?: number; registrantCount?: number };
    if (webinarProps?.maxRegistrants) {
      if ((webinarProps.registrantCount ?? 0) >= webinarProps.maxRegistrants) {
        throw new Error("Webinar is full");
      }
    }

    // Check for existing registration
    const existingRegistrants = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", webinar.organizationId).eq("type", "webinar_registrant")
      )
      .collect();

    const existingRegistration = existingRegistrants.find((r) => {
      const props = r.customProperties as RegistrantCustomProperties;
      return props?.email === args.email && props?.webinarId === args.webinarId;
    });

    if (existingRegistration) {
      // Return existing registration
      const props = existingRegistration.customProperties as RegistrantCustomProperties;
      return {
        success: true,
        registrantId: existingRegistration._id,
        registrationCode: props?.registrationCode,
        isNewRegistration: false,
        message: "Already registered",
      };
    }

    // Generate unique registration code
    const registrationCode = generateRegistrationCode();

    // Create registrant
    const customProperties: RegistrantCustomProperties = {
      webinarId: args.webinarId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      company: args.company,
      jobTitle: args.jobTitle,
      registrationCode,
      registeredAt: Date.now(),
      selectedSessionTime: args.selectedSession,
      utmSource: args.utmSource,
      utmMedium: args.utmMedium,
      utmCampaign: args.utmCampaign,
      utmContent: args.utmContent,
      utmTerm: args.utmTerm,
      referrer: args.referrer,
      attended: false,
      watchTimeSeconds: 0,
      maxWatchPosition: 0,
      sawOffer: false,
      clickedOffer: false,
      converted: false,
      watchedReplay: false,
      replayWatchTimeSeconds: 0,
      customFields: args.customFields,
    };

    const registrantId = await ctx.db.insert("objects", {
      organizationId: webinar.organizationId,
      type: "webinar_registrant",
      subtype: "registered",
      name: `${args.firstName} ${args.lastName ?? ""}`.trim(),
      description: "",
      status: "active",
      customProperties,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Increment registrant count
    await (ctx as any).runMutation(generatedApi.internal.webinarOntology.incrementRegistrantCount, {
      webinarId: args.webinarId,
    });

    // TODO: Create/link CRM contact
    // TODO: Trigger webinar.registered workflow

    return {
      success: true,
      registrantId,
      registrationCode,
      isNewRegistration: true,
      contactId: undefined, // TODO: Return CRM contact ID
    };
  },
});

/**
 * TRACK JOIN
 *
 * Records when a registrant joins the webinar.
 */
export const trackJoin = mutation({
  args: {
    registrantId: v.id("objects"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const registrant = await ctx.db.get(args.registrantId);
    if (!registrant || registrant.type !== "webinar_registrant") {
      throw new Error("Registrant not found");
    }

    const props = registrant.customProperties as RegistrantCustomProperties;

    // Only mark as joined if not already attended
    if (!props?.attended) {
      await ctx.db.patch(args.registrantId, {
        subtype: "attended",
        customProperties: {
          ...props,
          attended: true,
          joinedAt: args.timestamp,
        },
        updatedAt: Date.now(),
      });

      // Increment attendee count
      await (ctx as any).runMutation(generatedApi.internal.webinarOntology.incrementAttendeeCount, {
        webinarId: props.webinarId as Id<"objects">,
      });
    }

    return { success: true };
  },
});

/**
 * TRACK PROGRESS
 *
 * Updates watch progress for a registrant.
 */
export const trackProgress = mutation({
  args: {
    registrantId: v.id("objects"),
    currentTimeSeconds: v.number(),
    totalWatchTimeSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const registrant = await ctx.db.get(args.registrantId);
    if (!registrant || registrant.type !== "webinar_registrant") {
      throw new Error("Registrant not found");
    }

    const props = registrant.customProperties as RegistrantCustomProperties;

    await ctx.db.patch(args.registrantId, {
      customProperties: {
        ...props,
        watchTimeSeconds: args.totalWatchTimeSeconds,
        maxWatchPosition: Math.max(props?.maxWatchPosition ?? 0, args.currentTimeSeconds),
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * TRACK LEAVE
 *
 * Records when a registrant leaves the webinar.
 */
export const trackLeave = mutation({
  args: {
    registrantId: v.id("objects"),
    totalWatchTimeSeconds: v.number(),
    maxPositionSeconds: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const registrant = await ctx.db.get(args.registrantId);
    if (!registrant || registrant.type !== "webinar_registrant") {
      throw new Error("Registrant not found");
    }

    const props = registrant.customProperties as RegistrantCustomProperties;

    await ctx.db.patch(args.registrantId, {
      customProperties: {
        ...props,
        leftAt: args.timestamp,
        watchTimeSeconds: args.totalWatchTimeSeconds,
        maxWatchPosition: Math.max(props?.maxWatchPosition ?? 0, args.maxPositionSeconds),
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * TRACK OFFER VIEWED
 *
 * Records when a registrant sees the offer CTA.
 */
export const trackOfferViewed = mutation({
  args: {
    registrantId: v.id("objects"),
    viewedAtSeconds: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const registrant = await ctx.db.get(args.registrantId);
    if (!registrant || registrant.type !== "webinar_registrant") {
      throw new Error("Registrant not found");
    }

    const props = registrant.customProperties as RegistrantCustomProperties;

    // Only record first view
    if (!props?.sawOffer) {
      await ctx.db.patch(args.registrantId, {
        customProperties: {
          ...props,
          sawOffer: true,
          sawOfferAt: args.timestamp,
        },
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * TRACK OFFER CLICKED
 *
 * Records when a registrant clicks the offer CTA.
 */
export const trackOfferClicked = mutation({
  args: {
    registrantId: v.id("objects"),
    clickedAtSeconds: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const registrant = await ctx.db.get(args.registrantId);
    if (!registrant || registrant.type !== "webinar_registrant") {
      throw new Error("Registrant not found");
    }

    const props = registrant.customProperties as RegistrantCustomProperties;

    // Only record first click
    if (!props?.clickedOffer) {
      await ctx.db.patch(args.registrantId, {
        customProperties: {
          ...props,
          clickedOffer: true,
          clickedOfferAt: args.timestamp,
        },
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * MARK CONVERTED
 *
 * Records when a registrant makes a purchase.
 */
export const markConverted = mutation({
  args: {
    registrantId: v.id("objects"),
    transactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const registrant = await ctx.db.get(args.registrantId);
    if (!registrant || registrant.type !== "webinar_registrant") {
      throw new Error("Registrant not found");
    }

    const props = registrant.customProperties as RegistrantCustomProperties;

    await ctx.db.patch(args.registrantId, {
      subtype: "attended", // Keep as attended (converted is tracked separately)
      customProperties: {
        ...props,
        converted: true,
        convertedAt: Date.now(),
        transactionId: args.transactionId,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// INTERNAL QUERIES/MUTATIONS
// ============================================================================

/**
 * GET REGISTRANT BY CODE (INTERNAL)
 *
 * Internal query for API endpoints.
 */
export const getRegistrantByCodeInternal = internalQuery({
  args: {
    registrationCode: v.string(),
    webinarId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const webinar = await ctx.db.get(args.webinarId);
    if (!webinar || webinar.type !== "webinar") {
      return null;
    }

    const registrants = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", webinar.organizationId).eq("type", "webinar_registrant")
      )
      .collect();

    const registrant = registrants.find((r) => {
      const props = r.customProperties as RegistrantCustomProperties;
      return (
        props?.registrationCode === args.registrationCode &&
        props?.webinarId === args.webinarId
      );
    });

    return registrant;
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique registration code.
 * Format: WBR-XXXXXX-XXX (e.g., WBR-A1B2C3-D4E)
 */
function generateRegistrationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part1 = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
  const part2 = Array.from({ length: 3 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
  return `WBR-${part1}-${part2}`;
}
