/**
 * SERVICES ONTOLOGY
 *
 * Manages service offerings for member-to-member value sharing.
 * Uses the universal ontology system (objects table).
 *
 * Object Type: service
 *
 * Promotes the existing benefit subtype "service" to a first-class object type.
 * A benefit of subtype "service" can link to a concrete service object via
 * objectLinks (benefit_linked_service). The benefit describes the *deal*
 * (discount, terms), the service describes the *capability* (skills, rate,
 * availability). One service can back multiple benefits.
 *
 * Service Subtypes:
 * - "consulting" - Advisory and consulting services
 * - "development" - Software/web development
 * - "design" - Design, branding, creative
 * - "coaching" - Training, mentoring, coaching
 * - "other" - General services
 *
 * Status Workflow:
 * - "draft" - Not yet published
 * - "active" - Visible and available
 * - "paused" - Temporarily unavailable
 * - "expired" - Past expiration date
 * - "archived" - No longer available
 *
 * RELATIONSHIPS (via objectLinks):
 * - offers_service: member → service (who provides it)
 * - requests_service: member → service (who requested it)
 * - benefit_linked_service: benefit → service (which service backs a benefit)
 */

import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// SERVICE VALIDATORS
// ============================================================================

export const serviceSubtypes = [
  "consulting",
  "development",
  "design",
  "coaching",
  "other",
] as const;

export const serviceStatuses = [
  "draft",
  "active",
  "paused",
  "expired",
  "archived",
] as const;

// ============================================================================
// SERVICE OPERATIONS
// ============================================================================

/**
 * LIST SERVICES
 * Returns all active services for an organization
 */
export const listServices = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "service")
      );

    let services = await q.collect();

    // Apply filters
    if (args.subtype) {
      services = services.filter((s) => s.subtype === args.subtype);
    }

    if (args.category) {
      services = services.filter(
        (s) => s.customProperties?.category === args.category
      );
    }

    if (!args.includeInactive) {
      services = services.filter((s) => s.status === "active");
    } else if (args.status) {
      services = services.filter((s) => s.status === args.status);
    }

    // Sort by creation date (newest first)
    services.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit) {
      services = services.slice(0, args.limit);
    }

    // Enrich with offerer info
    const enrichedServices = await Promise.all(
      services.map(async (service) => {
        // Get offerer via objectLinks
        const offerLink = await ctx.db
          .query("objectLinks")
          .withIndex("by_to_link_type", (q) =>
            q.eq("toObjectId", service._id).eq("linkType", "offers_service")
          )
          .first();

        let offerer = null;
        if (offerLink) {
          const offererObj = await ctx.db.get(offerLink.fromObjectId);
          if (
            offererObj &&
            "type" in offererObj &&
            offererObj.type === "crm_contact"
          ) {
            offerer = {
              id: offererObj._id,
              name: offererObj.name,
              email: offererObj.customProperties?.email,
            };
          }
        }

        return {
          ...service,
          offerer,
        };
      })
    );

    return enrichedServices;
  },
});

/**
 * GET SERVICE
 * Get a single service by ID with full details + linked benefits
 */
export const getService = query({
  args: {
    sessionId: v.string(),
    serviceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const service = await ctx.db.get(args.serviceId);

    if (!service || service.type !== "service") {
      throw new Error("Service not found");
    }

    // Get offerer
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", service._id).eq("linkType", "offers_service")
      )
      .first();

    let offerer = null;
    if (offerLink) {
      const offererObj = await ctx.db.get(offerLink.fromObjectId);
      if (
        offererObj &&
        "type" in offererObj &&
        offererObj.type === "crm_contact"
      ) {
        offerer = {
          id: offererObj._id,
          name: offererObj.name,
          email: offererObj.customProperties?.email,
          phone: offererObj.customProperties?.phone,
        };
      }
    }

    // Get linked benefits (benefits of subtype "service" that reference this service)
    const benefitLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q
          .eq("toObjectId", service._id)
          .eq("linkType", "benefit_linked_service")
      )
      .collect();

    const linkedBenefits = await Promise.all(
      benefitLinks.map(async (link) => {
        const benefit = await ctx.db.get(link.fromObjectId);
        if (!benefit || benefit.type !== "benefit") return null;
        return {
          id: benefit._id,
          name: benefit.name,
          description: benefit.description,
          status: benefit.status,
          subtype: benefit.subtype,
          discountType: benefit.customProperties?.discountType,
          discountValue: benefit.customProperties?.discountValue,
        };
      })
    );

    return {
      ...service,
      offerer,
      linkedBenefits: linkedBenefits.filter(Boolean),
    };
  },
});

/**
 * GET MY SERVICES
 * Get services offered by the current member
 */
export const getMyServices = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    memberId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all services linked to this member
    const offerLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.memberId).eq("linkType", "offers_service")
      )
      .collect();

    const services = await Promise.all(
      offerLinks.map(async (link) => {
        const service = await ctx.db.get(link.toObjectId);
        if (!service || service.type !== "service") return null;

        // Count linked benefits
        const benefitLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_to_link_type", (q) =>
            q
              .eq("toObjectId", service._id)
              .eq("linkType", "benefit_linked_service")
          )
          .collect();

        return {
          ...service,
          linkedBenefitCount: benefitLinks.length,
        };
      })
    );

    return services.filter(Boolean);
  },
});

/**
 * CREATE SERVICE
 * Create a new service offering
 */
export const createService = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    memberId: v.id("objects"), // The member creating the service
    title: v.string(),
    description: v.string(),
    subtype: v.string(), // consulting, development, design, coaching, other
    category: v.optional(v.string()),
    // Service-specific
    skills: v.optional(v.array(v.string())),
    hourlyRate: v.optional(v.string()),
    location: v.optional(v.string()),
    rating: v.optional(v.number()),
    availability: v.optional(v.string()),
    // Requirements
    requirements: v.optional(v.string()),
    // Contact
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    // Status
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify member exists
    const member = await ctx.db.get(args.memberId);
    if (!member || member.type !== "crm_contact") {
      throw new Error("Member not found");
    }

    // Create the service object
    const serviceId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "service",
      subtype: args.subtype,
      name: args.title,
      description: args.description,
      status: args.status || "active",
      customProperties: {
        category: args.category,
        skills: args.skills || [],
        hourlyRate: args.hourlyRate,
        location: args.location || "remote",
        rating: args.rating,
        availability: args.availability,
        requirements: args.requirements,
        contactEmail: args.contactEmail,
        contactPhone: args.contactPhone,
      },
      createdBy: args.memberId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create the offers_service link
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.memberId,
      toObjectId: serviceId,
      linkType: "offers_service",
      createdBy: args.memberId,
      createdAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: serviceId,
      actionType: "created",
      actionData: {
        subtype: args.subtype,
        offeredBy: args.memberId,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });

    return serviceId;
  },
});

/**
 * UPDATE SERVICE
 * Update an existing service
 */
export const updateService = mutation({
  args: {
    sessionId: v.string(),
    serviceId: v.id("objects"),
    memberId: v.id("objects"), // Must be the owner
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      subtype: v.optional(v.string()),
      category: v.optional(v.string()),
      skills: v.optional(v.array(v.string())),
      hourlyRate: v.optional(v.string()),
      location: v.optional(v.string()),
      rating: v.optional(v.number()),
      availability: v.optional(v.string()),
      requirements: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      status: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const service = await ctx.db.get(args.serviceId);
    if (!service || service.type !== "service") {
      throw new Error("Service not found");
    }

    // Verify ownership
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.serviceId).eq("linkType", "offers_service")
      )
      .first();

    if (!offerLink || offerLink.fromObjectId !== args.memberId) {
      throw new Error("You can only edit your own services");
    }

    // Update the service
    await ctx.db.patch(args.serviceId, {
      name: args.updates.title || service.name,
      description: args.updates.description || service.description,
      subtype: args.updates.subtype || service.subtype,
      status: args.updates.status || service.status,
      customProperties: {
        ...service.customProperties,
        ...args.updates,
      },
      updatedAt: Date.now(),
    });

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: service.organizationId,
      objectId: args.serviceId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

/**
 * DELETE SERVICE
 * Soft delete a service (set status to archived)
 */
export const deleteService = mutation({
  args: {
    sessionId: v.string(),
    serviceId: v.id("objects"),
    memberId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const service = await ctx.db.get(args.serviceId);
    if (!service || service.type !== "service") {
      throw new Error("Service not found");
    }

    // Verify ownership
    const offerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.serviceId).eq("linkType", "offers_service")
      )
      .first();

    if (!offerLink || offerLink.fromObjectId !== args.memberId) {
      throw new Error("You can only delete your own services");
    }

    // Soft delete
    await ctx.db.patch(args.serviceId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Log deletion
    await ctx.db.insert("objectActions", {
      organizationId: service.organizationId,
      objectId: args.serviceId,
      actionType: "archived",
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

/**
 * LINK BENEFIT TO SERVICE
 * Create a benefit_linked_service link between a benefit (subtype "service")
 * and a concrete service object. The benefit describes the deal/terms, the
 * service describes the capability.
 */
export const linkBenefitToService = mutation({
  args: {
    sessionId: v.string(),
    benefitId: v.id("objects"),
    serviceId: v.id("objects"),
    memberId: v.id("objects"), // Must own either the benefit or the service
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify benefit exists and is subtype "service"
    const benefit = await ctx.db.get(args.benefitId);
    if (!benefit || benefit.type !== "benefit") {
      throw new Error("Benefit not found");
    }
    if (benefit.subtype !== "service") {
      throw new Error(
        'Only benefits of subtype "service" can be linked to a service object'
      );
    }

    // Verify service exists
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.type !== "service") {
      throw new Error("Service not found");
    }

    // Verify the member owns the benefit or the service
    const benefitOwnerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.benefitId).eq("linkType", "offers_benefit")
      )
      .first();

    const serviceOwnerLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.serviceId).eq("linkType", "offers_service")
      )
      .first();

    const ownsBenefit =
      benefitOwnerLink && benefitOwnerLink.fromObjectId === args.memberId;
    const ownsService =
      serviceOwnerLink && serviceOwnerLink.fromObjectId === args.memberId;

    if (!ownsBenefit && !ownsService) {
      throw new Error(
        "You must own either the benefit or the service to create this link"
      );
    }

    // Check for existing link
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q
          .eq("fromObjectId", args.benefitId)
          .eq("linkType", "benefit_linked_service")
      )
      .first();

    if (existingLink && existingLink.toObjectId === args.serviceId) {
      throw new Error("This benefit is already linked to this service");
    }

    // Create the link
    await ctx.db.insert("objectLinks", {
      organizationId: benefit.organizationId,
      fromObjectId: args.benefitId,
      toObjectId: args.serviceId,
      linkType: "benefit_linked_service",
      createdBy: args.memberId,
      createdAt: Date.now(),
    });

    // Log the link
    await ctx.db.insert("objectActions", {
      organizationId: benefit.organizationId,
      objectId: args.benefitId,
      actionType: "linked_to_service",
      actionData: {
        serviceId: args.serviceId,
        linkedBy: args.memberId,
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * INTERNAL: Get service by ID
 */
export const getServiceInternal = internalQuery({
  args: {
    serviceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.type !== "service") {
      return null;
    }
    return service;
  },
});
