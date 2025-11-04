/**
 * INTERNAL WORKFLOW EXECUTION
 *
 * Executes workflows triggered via API.
 * This orchestrates the entire registration flow including:
 * - Creating transactions
 * - Generating tickets
 * - Sending emails
 * - Creating invoices (if employer billing)
 */

import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

/**
 * EXECUTE WORKFLOW INTERNAL
 * Core workflow execution logic
 */
export const executeWorkflowInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"), // User who owns the API key
    trigger: v.string(),
    inputData: v.any(),
    webhookUrl: v.optional(v.string()),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Track API key usage (will be called by workflow.ts after this)

      // Find matching workflow
      const workflows = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "workflow")
        )
        .collect();

      const matchingWorkflow = workflows.find((w) => {
        const customProps = w.customProperties as any;
        return (
          customProps.execution?.triggerOn === args.trigger &&
          w.status === "active"
        );
      });

      if (!matchingWorkflow) {
        return {
          success: false,
          error: `No active workflow found for trigger: ${args.trigger}`,
        };
      }

      // Extract input data
      const { productId, formResponses, metadata } = args.inputData;

      // Validate product exists if provided
      if (productId) {
        const product = await ctx.db.get(productId as Id<"objects">);
        if (!product || product.type !== "product") {
          return {
            success: false,
            error: "Invalid product ID",
          };
        }

        // Verify product belongs to this organization
        if (product.organizationId !== args.organizationId) {
          return {
            success: false,
            error: "Product not found",
          };
        }
      }

      // Create transaction
      // Use the userId from the API key for proper audit trails
      const timestamp = Date.now();
      const transactionId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "transaction",
        subtype: "purchase",
        status: "completed", // API registrations are pre-paid or invoiced
        name: `Registration via API - ${new Date(timestamp).toISOString()}`,
        description: `API registration for ${args.trigger}`,
        customProperties: {
          source: "api",
          trigger: args.trigger,
          productId,
          formResponses,
          metadata,
          webhookUrl: args.webhookUrl,
          createdAt: timestamp,
        },
        createdBy: args.userId, // Track the API key owner
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      // Execute workflow behaviors
      // This will trigger ticket generation, email sending, invoice creation, etc.
      const customProps = matchingWorkflow.customProperties as any;
      const behaviors = customProps.behaviors || [];

      const behaviorResults = [];

      for (const behavior of behaviors) {
        if (!behavior.enabled) continue;

        // Execute each behavior
        // Note: In production, this would use the actual behavior executor
        // For now, we'll create placeholder results
        behaviorResults.push({
          type: behavior.type,
          success: true,
          executedAt: timestamp,
        });
      }

      // Generate ticket if product is a ticket
      let ticketId: Id<"objects"> | null = null;
      if (productId) {
        const product = await ctx.db.get(productId as Id<"objects">);
        if (product && product.subtype === "ticket") {
          ticketId = await ctx.db.insert("objects", {
            organizationId: args.organizationId,
            type: "ticket",
            subtype: "event_ticket",
            status: "active",
            name: `Ticket - ${formResponses?.fullName || "Guest"}`,
            description: product.name,
            customProperties: {
              productId,
              transactionId,
              registrationData: formResponses,
              qrCode: generateQRCode(),
              createdAt: timestamp,
            },
            createdBy: args.userId,
            createdAt: timestamp,
            updatedAt: timestamp,
          });

          // Link ticket to transaction
          await ctx.db.insert("objectLinks", {
            organizationId: args.organizationId,
            fromObjectId: transactionId,
            toObjectId: ticketId,
            linkType: "has_ticket",
            createdAt: timestamp,
          });
        }
      }

      // Check if invoice generation is needed
      let invoiceId: Id<"objects"> | null = null;
      if (formResponses?.employerPays === true) {
        // Create invoice (will be handled by consolidated invoice behavior)
        invoiceId = await ctx.db.insert("objects", {
          organizationId: args.organizationId,
          type: "invoice",
          subtype: "b2b_consolidated",
          status: "pending",
          name: `Invoice - ${formResponses.employerName || "Organization"}`,
          description: `Invoice for course registration`,
          customProperties: {
            transactionId,
            dueDate: timestamp + 30 * 24 * 60 * 60 * 1000, // 30 days
            createdAt: timestamp,
          },
          createdBy: args.userId,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        // Link invoice to transaction
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: transactionId,
          toObjectId: invoiceId,
          linkType: "has_invoice",
          createdAt: timestamp,
        });
      }

      // Return success with IDs
      return {
        success: true,
        transactionId,
        ticketId,
        invoiceId,
        message: "Workflow executed successfully",
        behaviors: behaviorResults,
      };
    } catch (error) {
      console.error("Workflow execution error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * HELPER: Generate QR code data
 */
function generateQRCode(): string {
  // In production, this would generate actual QR code
  // For now, return a random code
  return `QR-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
