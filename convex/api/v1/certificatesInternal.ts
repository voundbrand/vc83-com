/**
 * API V1: CERTIFICATE INTERNAL HANDLERS
 *
 * Internal mutations/queries for MCP certificate management.
 * Handles certificate CRUD operations without requiring sessionId authentication.
 *
 * NOTE: The existing certificateOntology.ts has createCertificateInternal.
 * This file adds list, get, update, delete, and revoke operations for MCP/AI skill usage.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { checkResourceLimit } from "../../licensing/helpers";

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * LIST CERTIFICATES (Internal)
 * Returns all certificates for an organization with optional filters
 */
export const listCertificatesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    pointType: v.optional(v.string()),
    status: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    eventId: v.optional(v.id("objects")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let certificates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "certificate")
      )
      .collect();

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

    if (args.eventId) {
      // Find certificates linked to this event
      const eventId = args.eventId;
      const links = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_link_type", (q) =>
          q.eq("toObjectId", eventId).eq("linkType", "certifies_completion_of")
        )
        .collect();

      const linkedCertIds = new Set(
        links.map((l) => l.fromObjectId).filter((id): id is Id<"objects"> => id !== undefined)
      );
      certificates = certificates.filter((c) => linkedCertIds.has(c._id));
    }

    // Sort by creation date descending
    certificates.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const total = certificates.length;
    certificates = certificates.slice(offset, offset + limit);

    return {
      certificates: certificates.map((c) => ({
        _id: c._id,
        certificateNumber: c.customProperties?.certificateNumber,
        recipientName: c.customProperties?.recipientName,
        recipientEmail: c.customProperties?.recipientEmail,
        pointType: c.subtype,
        pointsAwarded: c.customProperties?.pointsAwarded,
        pointCategory: c.customProperties?.pointCategory,
        eventName: c.customProperties?.eventName,
        status: c.status,
        issueDate: c.customProperties?.issueDate,
        expirationDate: c.customProperties?.expirationDate,
        createdAt: c.createdAt,
      })),
      total,
      hasMore: offset + limit < total,
    };
  },
});

/**
 * GET CERTIFICATE (Internal)
 * Returns a single certificate by ID
 */
export const getCertificateInternal = internalQuery({
  args: {
    certificateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const certificate = await ctx.db.get(args.certificateId);

    if (!certificate || certificate.type !== "certificate") {
      return null;
    }

    return certificate;
  },
});

/**
 * GET CERTIFICATE BY NUMBER (Internal)
 * Returns a certificate by its certificate number
 */
export const getCertificateByNumberInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    certificateNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const certificates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "certificate")
      )
      .collect();

    return certificates.find(
      (c) => c.customProperties?.certificateNumber === args.certificateNumber
    ) || null;
  },
});

/**
 * GET CERTIFICATES BY RECIPIENT (Internal)
 * Returns all certificates for a specific recipient email
 */
export const getCertificatesByRecipientInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    recipientEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const certificates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "certificate")
      )
      .collect();

    return certificates
      .filter((c) => c.customProperties?.recipientEmail === args.recipientEmail)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * VERIFY CERTIFICATE (Internal)
 * Verifies a certificate's authenticity and validity
 */
export const verifyCertificateInternal = internalQuery({
  args: {
    certificateNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Search across all organizations
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

    // Check status
    if (certificate.status === "revoked") {
      return {
        valid: false,
        message: "Certificate has been revoked",
        certificate: {
          certificateNumber: certificate.customProperties?.certificateNumber,
          recipientName: certificate.customProperties?.recipientName,
          status: certificate.status,
          revokedAt: certificate.customProperties?.revokedAt,
          revokedReason: certificate.customProperties?.revokedReason,
        },
      };
    }

    // Check expiration
    const expirationDate = certificate.customProperties?.expirationDate as number | undefined;
    if (expirationDate && expirationDate < Date.now()) {
      return {
        valid: false,
        message: "Certificate has expired",
        certificate: {
          certificateNumber: certificate.customProperties?.certificateNumber,
          recipientName: certificate.customProperties?.recipientName,
          expirationDate,
          status: "expired",
        },
      };
    }

    return {
      valid: true,
      message: "Certificate is valid",
      certificate: {
        certificateNumber: certificate.customProperties?.certificateNumber,
        recipientName: certificate.customProperties?.recipientName,
        pointsAwarded: certificate.customProperties?.pointsAwarded,
        pointCategory: certificate.customProperties?.pointCategory,
        eventName: certificate.customProperties?.eventName,
        eventDate: certificate.customProperties?.eventDate,
        issueDate: certificate.customProperties?.issueDate,
        expirationDate: certificate.customProperties?.expirationDate,
        status: certificate.status,
        accreditingBody: certificate.customProperties?.accreditingBody,
      },
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * CREATE CERTIFICATE (Internal)
 * Creates a new certificate - wrapper around certificateOntology.createCertificateInternal
 * with additional options for MCP usage
 */
export const createCertificateInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    transactionId: v.optional(v.id("objects")),
    eventId: v.optional(v.id("objects")),

    // Points info
    pointType: v.string(),
    pointsAwarded: v.number(),
    pointCategory: v.string(),
    pointUnit: v.string(),

    // Recipient
    recipientName: v.string(),
    recipientEmail: v.string(),
    licenseNumber: v.optional(v.string()),
    profession: v.optional(v.string()),
    specialty: v.optional(v.string()),

    // Event context (if not provided via eventId)
    eventName: v.optional(v.string()),
    eventDate: v.optional(v.number()),

    // Accreditation
    accreditingBody: v.optional(v.string()),
    activityId: v.optional(v.string()),

    // Expiration
    expirationMonths: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    // Check license limit
    await checkResourceLimit(ctx, args.organizationId, "certificate", "maxCertificates");

    // Get event details if eventId provided
    let eventName = args.eventName || "Manual Certificate";
    let eventDate = args.eventDate || Date.now();

    if (args.eventId) {
      const event = await ctx.db.get(args.eventId);
      if (event && event.type === "event") {
        eventName = event.name;
        const eventProps = event.customProperties as { startDate?: number } | undefined;
        eventDate = eventProps?.startDate || Date.now();
      }
    }

    // Generate unique certificate number
    const certificateNumber = `${args.pointType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Calculate expiration date
    const expirationDate = args.expirationMonths
      ? Date.now() + args.expirationMonths * 30 * 24 * 60 * 60 * 1000
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
        certificatePdfUrl: null,
        qrCodeUrl: `https://l4yercak3.com/verify/${certificateNumber}`,

        // Dates
        issueDate: Date.now(),
        expirationDate,

        // Event
        eventName,
        eventDate,

        // Completion
        attendanceVerified: true,
        attendanceDate: Date.now(),

        // Accreditation
        accreditingBody: args.accreditingBody,
        activityId: args.activityId,

        // Revocation (empty initially)
        revokedAt: null,
        revokedBy: null,
        revokedReason: null,
      },

      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to transaction if provided
    if (args.transactionId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: certificateId,
        toObjectId: args.transactionId,
        linkType: "issued_for",
        properties: {},
        createdAt: Date.now(),
      });
    }

    // Link to event if provided
    if (args.eventId) {
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
    }

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: certificateId,
      actionType: "certificate_issued",
      actionData: {
        certificateNumber,
        recipientName: args.recipientName,
        recipientEmail: args.recipientEmail,
        pointsAwarded: args.pointsAwarded,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return certificateId;
  },
});

/**
 * UPDATE CERTIFICATE (Internal)
 * Updates certificate details (limited fields)
 */
export const updateCertificateInternal = internalMutation({
  args: {
    certificateId: v.id("objects"),
    userId: v.id("users"),
    recipientName: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    profession: v.optional(v.string()),
    specialty: v.optional(v.string()),
    expirationDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const certificate = await ctx.db.get(args.certificateId);
    if (!certificate || certificate.type !== "certificate") {
      throw new Error("Certificate not found");
    }

    // Cannot update revoked certificates
    if (certificate.status === "revoked") {
      throw new Error("Cannot update a revoked certificate");
    }

    const existingProps = certificate.customProperties as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (args.recipientName !== undefined) {
      updates.recipientName = args.recipientName;
      // Also update certificate name
    }
    if (args.licenseNumber !== undefined) updates.licenseNumber = args.licenseNumber;
    if (args.profession !== undefined) updates.profession = args.profession;
    if (args.specialty !== undefined) updates.specialty = args.specialty;
    if (args.expirationDate !== undefined) updates.expirationDate = args.expirationDate;

    await ctx.db.patch(args.certificateId, {
      ...(args.recipientName && {
        name: `${existingProps.pointType || "CERT"} Certificate - ${args.recipientName}`,
      }),
      customProperties: {
        ...existingProps,
        ...updates,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: certificate.organizationId,
      objectId: args.certificateId,
      actionType: "certificate_updated",
      actionData: {
        updatedFields: Object.keys(updates),
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * REVOKE CERTIFICATE (Internal)
 * Revokes a certificate with reason
 */
export const revokeCertificateInternal = internalMutation({
  args: {
    certificateId: v.id("objects"),
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const certificate = await ctx.db.get(args.certificateId);
    if (!certificate || certificate.type !== "certificate") {
      throw new Error("Certificate not found");
    }

    if (certificate.status === "revoked") {
      throw new Error("Certificate is already revoked");
    }

    const existingProps = certificate.customProperties as Record<string, unknown>;

    await ctx.db.patch(args.certificateId, {
      status: "revoked",
      customProperties: {
        ...existingProps,
        revokedAt: Date.now(),
        revokedBy: args.userId,
        revokedReason: args.reason,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: certificate.organizationId,
      objectId: args.certificateId,
      actionType: "certificate_revoked",
      actionData: {
        certificateNumber: existingProps.certificateNumber,
        recipientName: existingProps.recipientName,
        reason: args.reason,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * REINSTATE CERTIFICATE (Internal)
 * Reinstates a previously revoked certificate
 */
export const reinstateCertificateInternal = internalMutation({
  args: {
    certificateId: v.id("objects"),
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const certificate = await ctx.db.get(args.certificateId);
    if (!certificate || certificate.type !== "certificate") {
      throw new Error("Certificate not found");
    }

    if (certificate.status !== "revoked") {
      throw new Error("Certificate is not revoked");
    }

    const existingProps = certificate.customProperties as Record<string, unknown>;

    // Check if certificate is expired
    const expirationDate = existingProps.expirationDate as number | undefined;
    const newStatus = expirationDate && expirationDate < Date.now() ? "expired" : "issued";

    await ctx.db.patch(args.certificateId, {
      status: newStatus,
      customProperties: {
        ...existingProps,
        reinstatedAt: Date.now(),
        reinstatedBy: args.userId,
        reinstateReason: args.reason,
        // Keep revocation info for audit trail
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: certificate.organizationId,
      objectId: args.certificateId,
      actionType: "certificate_reinstated",
      actionData: {
        certificateNumber: existingProps.certificateNumber,
        recipientName: existingProps.recipientName,
        newStatus,
        reason: args.reason,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true, newStatus };
  },
});

/**
 * DELETE CERTIFICATE (Internal)
 * Hard deletes a certificate (use with caution)
 */
export const deleteCertificateInternal = internalMutation({
  args: {
    certificateId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const certificate = await ctx.db.get(args.certificateId);
    if (!certificate || certificate.type !== "certificate") {
      throw new Error("Certificate not found");
    }

    const existingProps = certificate.customProperties as Record<string, unknown>;

    // Delete links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.certificateId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Log action before deletion
    await ctx.db.insert("objectActions", {
      organizationId: certificate.organizationId,
      objectId: args.certificateId,
      actionType: "certificate_deleted",
      actionData: {
        certificateNumber: existingProps.certificateNumber,
        recipientName: existingProps.recipientName,
        recipientEmail: existingProps.recipientEmail,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    // Delete certificate
    await ctx.db.delete(args.certificateId);

    return { success: true };
  },
});

/**
 * BATCH ISSUE CERTIFICATES (Internal)
 * Issues multiple certificates at once (e.g., for all event attendees)
 */
export const batchIssueCertificatesInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    eventId: v.id("objects"),
    pointType: v.string(),
    pointsAwarded: v.number(),
    pointCategory: v.string(),
    pointUnit: v.string(),
    recipients: v.array(v.object({
      name: v.string(),
      email: v.string(),
      licenseNumber: v.optional(v.string()),
      profession: v.optional(v.string()),
      transactionId: v.optional(v.id("objects")),
    })),
    accreditingBody: v.optional(v.string()),
    expirationMonths: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event || event.type !== "event") {
      throw new Error("Event not found");
    }

    const eventProps = event.customProperties as { startDate?: number } | undefined;
    const eventName = event.name;
    const eventDate = eventProps?.startDate || Date.now();

    const results: Array<{
      recipientEmail: string;
      success: boolean;
      certificateId?: Id<"objects">;
      certificateNumber?: string;
      error?: string;
    }> = [];

    for (const recipient of args.recipients) {
      try {
        // Check if certificate already exists for this recipient and event
        const existingCerts = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", args.organizationId).eq("type", "certificate")
          )
          .collect();

        const existingCert = existingCerts.find((c) => {
          if (c.customProperties?.recipientEmail !== recipient.email) return false;

          // Check if linked to same event
          // (simplified check - in production might need to check links)
          return c.customProperties?.eventName === eventName;
        });

        if (existingCert) {
          results.push({
            recipientEmail: recipient.email,
            success: false,
            error: "Certificate already exists for this recipient and event",
          });
          continue;
        }

        // Check license limit (will throw if exceeded)
        await checkResourceLimit(ctx, args.organizationId, "certificate", "maxCertificates");

        // Generate certificate number
        const certificateNumber = `${args.pointType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const expirationDate = args.expirationMonths
          ? Date.now() + args.expirationMonths * 30 * 24 * 60 * 60 * 1000
          : null;

        // Create certificate
        const certificateId = await ctx.db.insert("objects", {
          organizationId: args.organizationId,
          type: "certificate",
          subtype: args.pointType,
          name: `${args.pointType.toUpperCase()} Certificate - ${recipient.name}`,
          description: `${args.pointsAwarded} ${args.pointCategory}`,
          status: "issued",
          customProperties: {
            pointsAwarded: args.pointsAwarded,
            pointCategory: args.pointCategory,
            pointUnit: args.pointUnit,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            licenseNumber: recipient.licenseNumber,
            profession: recipient.profession,
            certificateNumber,
            certificatePdfUrl: null,
            qrCodeUrl: `https://l4yercak3.com/verify/${certificateNumber}`,
            issueDate: Date.now(),
            expirationDate,
            eventName,
            eventDate,
            attendanceVerified: true,
            attendanceDate: Date.now(),
            accreditingBody: args.accreditingBody,
            revokedAt: null,
            revokedBy: null,
            revokedReason: null,
          },
          createdBy: args.userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Link to event
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: certificateId,
          toObjectId: args.eventId,
          linkType: "certifies_completion_of",
          properties: { attendanceDate: Date.now() },
          createdAt: Date.now(),
        });

        // Link to transaction if provided
        if (recipient.transactionId) {
          await ctx.db.insert("objectLinks", {
            organizationId: args.organizationId,
            fromObjectId: certificateId,
            toObjectId: recipient.transactionId,
            linkType: "issued_for",
            properties: {},
            createdAt: Date.now(),
          });
        }

        results.push({
          recipientEmail: recipient.email,
          success: true,
          certificateId,
          certificateNumber,
        });
      } catch (error) {
        results.push({
          recipientEmail: recipient.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log batch action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.eventId,
      actionType: "certificates_batch_issued",
      actionData: {
        totalRecipients: args.recipients.length,
        successCount: results.filter((r) => r.success).length,
        failCount: results.filter((r) => !r.success).length,
        pointType: args.pointType,
        pointsAwarded: args.pointsAwarded,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return {
      total: args.recipients.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});
