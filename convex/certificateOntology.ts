import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, requirePermission } from "./rbacHelpers";
import { internal } from "./_generated/api";

/**
 * GET CERTIFICATES
 * Returns all certificates for an organization with optional filters
 *
 * @permission view_certificates
 */
export const getCertificates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),

    // Filters
    pointType: v.optional(v.string()), // "cme", "cle", etc.
    status: v.optional(v.string()), // "issued", "revoked", "expired"
    recipientEmail: v.optional(v.string()),
    eventId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "certificate")
      );

    let certificates = await query.collect();

    // Apply filters
    if (args.pointType) {
      certificates = certificates.filter((c) => c.subtype === args.pointType);
    }
    if (args.status) {
      certificates = certificates.filter((c) => c.status === args.status);
    }
    if (args.recipientEmail) {
      certificates = certificates.filter(
        (c) => c.customProperties?.recipientEmail === args.recipientEmail
      );
    }
    if (args.eventId !== undefined) {
      // Find certificates linked to this event
      const eventId = args.eventId;
      const links = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_link_type", (q) =>
          q.eq("toObjectId", eventId).eq("linkType", "certifies_completion_of")
        )
        .collect();

      const linkedCertIds = new Set(
        links.map(l => l.fromObjectId).filter((id): id is NonNullable<typeof id> => id !== undefined)
      );
      certificates = certificates.filter(c => c._id && linkedCertIds.has(c._id));
    }

    return certificates;
  },
});

/**
 * GET CERTIFICATE
 * Get a single certificate by ID
 *
 * @permission view_certificates
 */
export const getCertificate = query({
  args: {
    sessionId: v.string(),
    certificateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const certificate = await ctx.db.get(args.certificateId);

    if (!certificate || certificate.type !== "certificate") {
      throw new Error("Certificate not found");
    }

    return certificate;
  },
});

/**
 * GET CERTIFICATE BY NUMBER (PUBLIC)
 * Get certificate by certificate number (for verification)
 * No authentication required - public verification
 */
export const getCertificateByNumber = query({
  args: {
    certificateNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const certificates = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "certificate"))
      .collect();

    const certificate = certificates.find(
      (c) => c.customProperties?.certificateNumber === args.certificateNumber
    );

    if (!certificate) {
      return null;
    }

    // Return limited public data for verification
    return {
      _id: certificate._id,
      certificateNumber: certificate.customProperties?.certificateNumber,
      recipientName: certificate.customProperties?.recipientName,
      pointsAwarded: certificate.customProperties?.pointsAwarded,
      pointCategory: certificate.customProperties?.pointCategory,
      pointUnit: certificate.customProperties?.pointUnit,
      eventName: certificate.customProperties?.eventName,
      eventDate: certificate.customProperties?.eventDate,
      issueDate: certificate.customProperties?.issueDate,
      expirationDate: certificate.customProperties?.expirationDate,
      status: certificate.status,
      accreditingBody: certificate.customProperties?.accreditingBody,
    };
  },
});

/**
 * GET MY CERTIFICATES
 * Get all certificates for the current user
 *
 * @permission view_certificates
 */
export const getMyCertificates = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user email
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Find all certificates for this email
    const allCertificates = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "certificate"))
      .collect();

    return allCertificates.filter(
      (c) => c.customProperties?.recipientEmail === user.email
    );
  },
});

/**
 * VERIFY CERTIFICATE (PUBLIC)
 * Verify a certificate's authenticity
 * No authentication required
 */
export const verifyCertificate = query({
  args: {
    certificateNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const certificates = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "certificate"))
      .collect();

    const certificate = certificates.find(
      (c) => c.customProperties?.certificateNumber === args.certificateNumber
    );

    if (!certificate) {
      return { valid: false, message: "Certificate not found" };
    }

    const limitedCertificate = {
      _id: certificate._id,
      certificateNumber: certificate.customProperties?.certificateNumber,
      recipientName: certificate.customProperties?.recipientName,
      pointsAwarded: certificate.customProperties?.pointsAwarded,
      pointCategory: certificate.customProperties?.pointCategory,
      pointUnit: certificate.customProperties?.pointUnit,
      eventName: certificate.customProperties?.eventName,
      eventDate: certificate.customProperties?.eventDate,
      issueDate: certificate.customProperties?.issueDate,
      expirationDate: certificate.customProperties?.expirationDate,
      status: certificate.status,
      accreditingBody: certificate.customProperties?.accreditingBody,
    };

    if (limitedCertificate.status === "revoked") {
      return {
        valid: false,
        message: "Certificate has been revoked",
        certificate: limitedCertificate,
      };
    }

    if (limitedCertificate.status === "expired") {
      return {
        valid: false,
        message: "Certificate has expired",
        certificate: limitedCertificate,
      };
    }

    // Check expiration date
    if (limitedCertificate.expirationDate && limitedCertificate.expirationDate < Date.now()) {
      return {
        valid: false,
        message: "Certificate has expired",
        certificate: limitedCertificate,
      };
    }

    return {
      valid: true,
      message: "Certificate is valid",
      certificate: limitedCertificate,
    };
  },
});

/**
 * CREATE CERTIFICATE (INTERNAL)
 * Internal mutation for auto-issuing certificates (no auth)
 * Called by check-in system
 */
export const createCertificateInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    transactionId: v.id("objects"),
    eventId: v.id("objects"),

    // Points info
    pointType: v.string(), // "cme", "cle", etc.
    pointsAwarded: v.number(),
    pointCategory: v.string(),
    pointUnit: v.string(),

    // Recipient
    recipientName: v.string(),
    recipientEmail: v.string(),
    licenseNumber: v.optional(v.string()),
    profession: v.optional(v.string()),
    specialty: v.optional(v.string()),

    // Event context
    eventName: v.string(),
    eventDate: v.number(),

    // Accreditation
    accreditingBody: v.optional(v.string()),
    activityId: v.optional(v.string()),

    // Expiration
    expirationMonths: v.optional(v.number()),

    // User who triggered (for createdBy)
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Generate unique certificate number
    const certificateNumber = `${args.pointType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Calculate expiration date
    const expirationDate = args.expirationMonths
      ? Date.now() + (args.expirationMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    // Create certificate
    const certificateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "certificate",
      subtype: args.pointType,
      name: `${args.pointType.toUpperCase()} Certificate - ${args.recipientName}`,
      description: `${args.pointsAwarded} ${args.pointCategory}`,
      status: "issued",

      customProperties: {
        // Points
        pointsAwarded: args.pointsAwarded,
        pointCategory: args.pointCategory,
        pointUnit: args.pointUnit,

        // Recipient
        recipientName: args.recipientName,
        recipientEmail: args.recipientEmail,
        licenseNumber: args.licenseNumber,
        profession: args.profession,
        specialty: args.specialty,

        // Certificate
        certificateNumber,
        certificatePdfUrl: null, // Generated later
        qrCodeUrl: `https://l4yercak3.com/verify/${certificateNumber}`,

        // Dates
        issueDate: Date.now(),
        expirationDate,

        // Event
        eventName: args.eventName,
        eventDate: args.eventDate,

        // Completion
        attendanceVerified: true,
        attendanceDate: Date.now(),

        // Accreditation
        accreditingBody: args.accreditingBody,
        activityId: args.activityId,

        // Revocation
        revokedAt: null,
        revokedBy: null,
        revokedReason: null,
      },

      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to transaction
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: certificateId,
      toObjectId: args.transactionId,
      linkType: "issued_for",
      properties: {},
      createdAt: Date.now(),
    });

    // Link to event
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: certificateId,
      toObjectId: args.eventId,
      linkType: "certifies_completion_of",
      properties: {
        attendanceDate: Date.now(),
      },
      createdAt: Date.now(),
    });

    return certificateId;
  },
});

/**
 * CREATE CERTIFICATE (PUBLIC)
 * Manual certificate issuance
 *
 * @permission issue_certificates
 * @roles business_manager, org_owner, super_admin
 */
export const createCertificate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    transactionId: v.id("objects"),
    eventId: v.id("objects"),
    pointType: v.string(),
    pointsAwarded: v.number(),
    pointCategory: v.string(),
    pointUnit: v.string(),
    recipientName: v.string(),
    recipientEmail: v.string(),
    eventName: v.string(),
    eventDate: v.number(),
    licenseNumber: v.optional(v.string()),
    profession: v.optional(v.string()),
    specialty: v.optional(v.string()),
    accreditingBody: v.optional(v.string()),
    activityId: v.optional(v.string()),
    expirationMonths: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "issue_certificates", {
      organizationId: args.organizationId,
    });

    return await ctx.runMutation(
      internal.certificateOntology.createCertificateInternal,
      {
        organizationId: args.organizationId,
        transactionId: args.transactionId,
        eventId: args.eventId,
        pointType: args.pointType,
        pointsAwarded: args.pointsAwarded,
        pointCategory: args.pointCategory,
        pointUnit: args.pointUnit,
        recipientName: args.recipientName,
        recipientEmail: args.recipientEmail,
        eventName: args.eventName,
        eventDate: args.eventDate,
        licenseNumber: args.licenseNumber,
        profession: args.profession,
        specialty: args.specialty,
        accreditingBody: args.accreditingBody,
        activityId: args.activityId,
        expirationMonths: args.expirationMonths,
        userId,
      }
    );
  },
});

/**
 * REVOKE CERTIFICATE
 * Revoke a certificate with reason
 *
 * @permission manage_certificates
 * @roles business_manager, org_owner, super_admin
 */
export const revokeCertificate = mutation({
  args: {
    sessionId: v.string(),
    certificateId: v.id("objects"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const certificate = await ctx.db.get(args.certificateId);
    if (!certificate || certificate.type !== "certificate") {
      throw new Error("Certificate not found");
    }

    await requirePermission(ctx, userId, "manage_certificates", {
      organizationId: certificate.organizationId,
    });

    await ctx.db.patch(args.certificateId, {
      status: "revoked",
      customProperties: {
        ...certificate.customProperties,
        revokedAt: Date.now(),
        revokedBy: userId,
        revokedReason: args.reason,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
