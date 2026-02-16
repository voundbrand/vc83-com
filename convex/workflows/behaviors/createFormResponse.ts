/**
 * BEHAVIOR: CREATE FORM RESPONSE (Behavior 8)
 *
 * Stores the complete form submission data as a form_response object.
 * This creates an audit trail of all registration form submissions.
 *
 * Priority: 40
 *
 * Creates:
 * - form_response object with all form data
 * - Links to event, product, and customer
 * - Timestamps and metadata
 *
 * Returns:
 * - formResponseId: ID of created form response
 */

import { action, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("../../_generated/api");
import type { Id } from "../../_generated/dataModel";

/**
 * Internal mutation to create form response object
 */
export const createFormResponseInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    formId: v.string(),
    eventId: v.optional(v.string()),
    productId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerName: v.string(),
    responses: v.any(),
    sessionId: v.string(),
    createdBy: v.optional(v.union(v.id("users"), v.id("objects"))), // Platform user or frontend_user
  },
  handler: async (ctx, args) => {
    // Create form response object
    const formResponseId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "form_response",
      subtype: "event_registration",
      name: `Registration - ${args.customerName}`,
      description: `Event registration form response from ${args.customerEmail}`,
      status: "submitted",
      customProperties: {
        formId: args.formId,
        eventId: args.eventId,
        productId: args.productId,
        contactId: args.contactId,
        customerEmail: args.customerEmail,
        customerName: args.customerName,
        responses: args.responses,
        submittedAt: Date.now(),
        sessionId: args.sessionId,
      },
      createdBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create links
    if (args.eventId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: formResponseId,
        toObjectId: args.eventId as Id<"objects">,
        linkType: "form_to_event",
        properties: { label: "Event registration" },
        createdAt: Date.now(),
      });
    }

    if (args.productId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: formResponseId,
        toObjectId: args.productId as Id<"objects">,
        linkType: "form_to_product",
        properties: { label: "Product registration" },
        createdAt: Date.now(),
      });
    }

    if (args.contactId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: formResponseId,
        toObjectId: args.contactId as Id<"objects">,
        linkType: "form_to_contact",
        properties: { label: "Submitted by" },
        createdAt: Date.now(),
      });
    }

    return formResponseId;
  },
});

export const executeCreateFormResponse = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("✓ [Behavior 8/12] Create Form Response");

    const context = args.context as {
      formId?: string;
      eventId?: string;
      productId?: string;
      contactId?: string;
      frontendUserId?: string; // From create-contact behavior
      customerData?: {
        email?: string;
        firstName?: string;
        lastName?: string;
      };
      formResponses?: Record<string, unknown>;
    };

    if (!context.formId || !context.eventId) {
      return {
        success: false,
        error: "Form ID and Event ID are required",
      };
    }

    if (!context.formResponses) {
      return {
        success: false,
        error: "Form responses are required",
      };
    }

    let formResponseId: Id<"objects">;

    // DRY-RUN MODE: Skip actual database write
    if (args.config?.dryRun) {
      formResponseId = `dryrun_form_response_${Date.now()}` as Id<"objects">;
      console.log(`🧪 [DRY RUN] Would create form response for: ${context.customerData?.email}`);
    } else {
      // Create form response object using internal mutation (PRODUCTION)
      formResponseId = await (ctx as any).runMutation(generatedApi.internal.workflows.behaviors.createFormResponse.createFormResponseInternal, {
        organizationId: args.organizationId,
        formId: context.formId,
        eventId: context.eventId,
        productId: context.productId,
        contactId: context.contactId,
        customerEmail: context.customerData?.email,
        customerName: `${context.customerData?.firstName} ${context.customerData?.lastName}`,
        responses: context.formResponses,
        sessionId: args.sessionId,
        createdBy: context.frontendUserId as Id<"objects"> | undefined, // Frontend user (dormant account)
      });
    }

    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Form response created: ${formResponseId}`);
    console.log(`   Customer: ${context.customerData?.firstName} ${context.customerData?.lastName}`);
    console.log(`   Email: ${context.customerData?.email}`);
    console.log(`   Fields: ${Object.keys(context.formResponses).length}`);

    return {
      success: true,
      message: `Form response created successfully${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        formResponseId,
        customerEmail: context.customerData?.email,
        fieldCount: Object.keys(context.formResponses).length,
        responses: context.formResponses,
      },
    };
  },
});
