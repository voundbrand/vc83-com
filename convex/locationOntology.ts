/**
 * LOCATION ONTOLOGY
 *
 * Manages physical and virtual locations for multi-location booking support.
 * Uses the universal ontology system (objects table).
 *
 * Location Types (subtype):
 * - "branch" - Physical branch/office location
 * - "venue" - Event venue or external location
 * - "virtual" - Online/virtual location (Zoom, Teams, etc.)
 *
 * Status Workflow:
 * - "draft" - Being set up
 * - "active" - Available for bookings
 * - "inactive" - Temporarily unavailable
 * - "archived" - No longer in use
 *
 * Location customProperties:
 * - address: { street, city, state, postalCode, country }
 * - timezone: string (e.g., "America/New_York")
 * - defaultOperatingHours: { monday: { open, close }, ... }
 * - contactEmail: string
 * - contactPhone: string
 * - virtualMeetingUrl: string (for virtual locations)
 * - instructions: string (directions, parking info, etc.)
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkResourceLimit } from "./licensing/helpers";

// ============================================================================
// ADDRESS VALIDATOR
// ============================================================================

const addressValidator = v.object({
  street: v.optional(v.string()),
  street2: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  country: v.optional(v.string()),
});

const operatingHoursValidator = v.object({
  open: v.string(),  // "09:00"
  close: v.string(), // "17:00"
});

const weeklyOperatingHoursValidator = v.object({
  sunday: v.optional(operatingHoursValidator),
  monday: v.optional(operatingHoursValidator),
  tuesday: v.optional(operatingHoursValidator),
  wednesday: v.optional(operatingHoursValidator),
  thursday: v.optional(operatingHoursValidator),
  friday: v.optional(operatingHoursValidator),
  saturday: v.optional(operatingHoursValidator),
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET LOCATIONS
 * Returns all locations for an organization
 */
export const getLocations = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "location")
      );

    let locations = await q.collect();

    // Apply filters
    if (args.subtype) {
      locations = locations.filter((l) => l.subtype === args.subtype);
    }

    if (args.status) {
      locations = locations.filter((l) => l.status === args.status);
    }

    return locations;
  },
});

/**
 * GET LOCATION
 * Get a single location by ID
 */
export const getLocation = query({
  args: {
    sessionId: v.string(),
    locationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const location = await ctx.db.get(args.locationId);

    if (!location || location.type !== "location") {
      throw new Error("Location not found");
    }

    return location;
  },
});

/**
 * GET LOCATION INTERNAL
 * Internal query for getting a location without auth check
 */
export const getLocationInternal = internalQuery({
  args: {
    locationId: v.id("objects"),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.locationId);

    if (!location || location.type !== "location") {
      return null;
    }

    // If organizationId is provided, verify it matches
    if (args.organizationId && location.organizationId !== args.organizationId) {
      return null;
    }

    return location;
  },
});

/**
 * GET RESOURCES AT LOCATION
 * Get all bookable resources at a specific location
 */
export const getResourcesAtLocation = query({
  args: {
    sessionId: v.string(),
    locationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Find all resources linked to this location
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.locationId).eq("linkType", "located_at")
      )
      .collect();

    // Fetch the resources
    const resources = await Promise.all(
      links.map(async (link) => {
        const resource = await ctx.db.get(link.fromObjectId);
        if (resource && resource.type === "product") {
          return resource;
        }
        return null;
      })
    );

    return resources.filter((r) => r !== null);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * CREATE LOCATION
 * Create a new location
 */
export const createLocation = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "branch" | "venue" | "virtual"
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(addressValidator),
    timezone: v.optional(v.string()),
    defaultOperatingHours: v.optional(weeklyOperatingHoursValidator),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    virtualMeetingUrl: v.optional(v.string()),
    instructions: v.optional(v.string()),
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check license limit for locations
    await checkResourceLimit(ctx, args.organizationId, "location", "maxLocations");

    // Validate subtype
    const validSubtypes = ["branch", "venue", "virtual"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid location subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Build customProperties
    const customProperties = {
      address: args.address || null,
      timezone: args.timezone || "UTC",
      defaultOperatingHours: args.defaultOperatingHours || null,
      contactEmail: args.contactEmail || null,
      contactPhone: args.contactPhone || null,
      virtualMeetingUrl: args.virtualMeetingUrl || null,
      instructions: args.instructions || null,
      ...(args.customProperties || {}),
    };

    // Create location object
    const locationId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "location",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: "active",
      customProperties,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: locationId,
      actionType: "created",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: { subtype: args.subtype },
    });

    return locationId;
  },
});

/**
 * UPDATE LOCATION
 * Update an existing location
 */
export const updateLocation = mutation({
  args: {
    sessionId: v.string(),
    locationId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    address: v.optional(addressValidator),
    timezone: v.optional(v.string()),
    defaultOperatingHours: v.optional(weeklyOperatingHoursValidator),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    virtualMeetingUrl: v.optional(v.string()),
    instructions: v.optional(v.string()),
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const location = await ctx.db.get(args.locationId);

    if (!location || location.type !== "location") {
      throw new Error("Location not found");
    }

    // Validate status if provided
    if (args.status !== undefined) {
      const validStatuses = ["draft", "active", "inactive", "archived"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
    }

    // Build updates
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    // Update customProperties
    const currentProps = (location.customProperties || {}) as Record<string, unknown>;
    const updatedCustomProperties: Record<string, unknown> = { ...currentProps };

    if (args.address !== undefined) updatedCustomProperties.address = args.address;
    if (args.timezone !== undefined) updatedCustomProperties.timezone = args.timezone;
    if (args.defaultOperatingHours !== undefined) {
      updatedCustomProperties.defaultOperatingHours = args.defaultOperatingHours;
    }
    if (args.contactEmail !== undefined) updatedCustomProperties.contactEmail = args.contactEmail;
    if (args.contactPhone !== undefined) updatedCustomProperties.contactPhone = args.contactPhone;
    if (args.virtualMeetingUrl !== undefined) {
      updatedCustomProperties.virtualMeetingUrl = args.virtualMeetingUrl;
    }
    if (args.instructions !== undefined) updatedCustomProperties.instructions = args.instructions;

    // Merge any additional custom properties
    if (args.customProperties) {
      for (const [key, value] of Object.entries(args.customProperties)) {
        updatedCustomProperties[key] = value;
      }
    }

    updates.customProperties = updatedCustomProperties;

    await ctx.db.patch(args.locationId, updates);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: location.organizationId,
      objectId: args.locationId,
      actionType: "updated",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: {},
    });

    return args.locationId;
  },
});

/**
 * DELETE LOCATION
 * Soft delete a location (set status to archived)
 */
export const deleteLocation = mutation({
  args: {
    sessionId: v.string(),
    locationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const location = await ctx.db.get(args.locationId);

    if (!location || location.type !== "location") {
      throw new Error("Location not found");
    }

    // Check if any active resources are at this location
    const resourceLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.locationId).eq("linkType", "located_at")
      )
      .collect();

    if (resourceLinks.length > 0) {
      throw new Error(
        "Cannot archive location with linked resources. Please reassign or remove resources first."
      );
    }

    await ctx.db.patch(args.locationId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: location.organizationId,
      objectId: args.locationId,
      actionType: "archived",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: {},
    });

    return { success: true };
  },
});

/**
 * LINK RESOURCE TO LOCATION
 * Associate a bookable resource with a location
 */
export const linkResourceToLocation = mutation({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    locationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate resource exists and is a bookable type
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }

    const bookableSubtypes = ["room", "staff", "equipment", "space", "appointment", "class", "treatment"];
    if (!bookableSubtypes.includes(resource.subtype || "")) {
      throw new Error("Resource is not a bookable type");
    }

    // Validate location exists
    const location = await ctx.db.get(args.locationId);
    if (!location || location.type !== "location") {
      throw new Error("Location not found");
    }

    // Check if link already exists
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.resourceId).eq("linkType", "located_at")
      )
      .collect();

    // Remove existing location link (resource can only be at one location)
    for (const link of existingLinks) {
      await ctx.db.delete(link._id);
    }

    // Create new link
    await ctx.db.insert("objectLinks", {
      organizationId: resource.organizationId,
      fromObjectId: args.resourceId,
      toObjectId: args.locationId,
      linkType: "located_at",
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Update resource's locationId in customProperties for easy access
    const resourceProps = (resource.customProperties || {}) as Record<string, unknown>;
    await ctx.db.patch(args.resourceId, {
      customProperties: {
        ...resourceProps,
        locationId: args.locationId,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UNLINK RESOURCE FROM LOCATION
 * Remove location association from a resource
 */
export const unlinkResourceFromLocation = mutation({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate resource exists
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }

    // Find and delete existing location link
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.resourceId).eq("linkType", "located_at")
      )
      .collect();

    for (const link of existingLinks) {
      await ctx.db.delete(link._id);
    }

    // Remove locationId from customProperties
    const resourceProps = (resource.customProperties || {}) as Record<string, unknown>;
    delete resourceProps.locationId;
    await ctx.db.patch(args.resourceId, {
      customProperties: resourceProps,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for API endpoints)
// ============================================================================

/**
 * CREATE LOCATION INTERNAL
 * Internal mutation for creating locations without session auth
 */
export const createLocationInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.any()),
    timezone: v.optional(v.string()),
    operatingHours: v.optional(v.any()), // Alias for defaultOperatingHours
    defaultOperatingHours: v.optional(v.any()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    virtualMeetingUrl: v.optional(v.string()),
    instructions: v.optional(v.string()),
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    // Validate subtype
    const validSubtypes = ["branch", "venue", "virtual"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid location subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Build customProperties (operatingHours is alias for defaultOperatingHours)
    const customProperties = {
      address: args.address || null,
      timezone: args.timezone || "UTC",
      defaultOperatingHours: args.operatingHours || args.defaultOperatingHours || null,
      contactEmail: args.contactEmail || null,
      contactPhone: args.contactPhone || null,
      virtualMeetingUrl: args.virtualMeetingUrl || null,
      instructions: args.instructions || null,
      ...(args.customProperties || {}),
    };

    // Create location object
    const locationId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "location",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: "active",
      customProperties,
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: locationId,
      actionType: "created",
      performedBy: args.userId,
      performedAt: Date.now(),
      actionData: { subtype: args.subtype },
    });

    return { locationId };
  },
});

/**
 * UPDATE LOCATION INTERNAL
 * Internal mutation for updating locations without session auth
 */
export const updateLocationInternal = internalMutation({
  args: {
    locationId: v.id("objects"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    address: v.optional(v.any()),
    timezone: v.optional(v.string()),
    operatingHours: v.optional(v.any()), // Alias for defaultOperatingHours
    defaultOperatingHours: v.optional(v.any()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    virtualMeetingUrl: v.optional(v.string()),
    instructions: v.optional(v.string()),
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.locationId);

    if (!location || location.type !== "location") {
      throw new Error("Location not found");
    }

    if (location.organizationId !== args.organizationId) {
      throw new Error("Location not found");
    }

    // Validate status if provided
    if (args.status !== undefined) {
      const validStatuses = ["draft", "active", "inactive", "archived"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
    }

    // Build updates
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    // Update customProperties
    const currentProps = (location.customProperties || {}) as Record<string, unknown>;
    const updatedCustomProperties: Record<string, unknown> = { ...currentProps };

    if (args.address !== undefined) updatedCustomProperties.address = args.address;
    if (args.timezone !== undefined) updatedCustomProperties.timezone = args.timezone;
    if (args.operatingHours !== undefined || args.defaultOperatingHours !== undefined) {
      updatedCustomProperties.defaultOperatingHours = args.operatingHours || args.defaultOperatingHours;
    }
    if (args.contactEmail !== undefined) updatedCustomProperties.contactEmail = args.contactEmail;
    if (args.contactPhone !== undefined) updatedCustomProperties.contactPhone = args.contactPhone;
    if (args.virtualMeetingUrl !== undefined) {
      updatedCustomProperties.virtualMeetingUrl = args.virtualMeetingUrl;
    }
    if (args.instructions !== undefined) updatedCustomProperties.instructions = args.instructions;

    if (args.customProperties) {
      for (const [key, value] of Object.entries(args.customProperties)) {
        updatedCustomProperties[key] = value;
      }
    }

    updates.customProperties = updatedCustomProperties;

    await ctx.db.patch(args.locationId, updates);

    return { locationId: args.locationId };
  },
});

/**
 * LIST LOCATIONS INTERNAL
 * Internal query for listing locations without session auth
 */
export const listLocationsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "location")
      );

    let locations = await q.collect();

    // Apply filters
    if (args.subtype) {
      locations = locations.filter((l) => l.subtype === args.subtype);
    }

    if (args.status) {
      locations = locations.filter((l) => l.status === args.status);
    }

    const total = locations.length;

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    locations = locations.slice(offset, offset + limit);

    // Transform for API response
    const transformed = locations.map((location) => {
      const customProps = location.customProperties as Record<string, unknown> | undefined;
      return {
        id: location._id,
        name: location.name,
        description: location.description,
        subtype: location.subtype,
        status: location.status,
        address: customProps?.address || null,
        timezone: customProps?.timezone || "UTC",
        defaultOperatingHours: customProps?.defaultOperatingHours || null,
        contactEmail: customProps?.contactEmail || null,
        contactPhone: customProps?.contactPhone || null,
        virtualMeetingUrl: customProps?.virtualMeetingUrl || null,
        instructions: customProps?.instructions || null,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      };
    });

    return {
      locations: transformed,
      total,
      limit,
      offset,
    };
  },
});

/**
 * ARCHIVE LOCATION INTERNAL
 * Internal mutation for archiving a location without session auth
 */
export const archiveLocationInternal = internalMutation({
  args: {
    locationId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.locationId);

    if (!location || location.type !== "location") {
      throw new Error("Location not found");
    }

    if (location.organizationId !== args.organizationId) {
      throw new Error("Location not found");
    }

    await ctx.db.patch(args.locationId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return { locationId: args.locationId };
  },
});
