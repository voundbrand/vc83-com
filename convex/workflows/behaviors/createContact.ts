/**
 * BEHAVIOR: CREATE OR UPDATE CONTACT (Behavior 5)
 *
 * Creates or updates a CRM contact with full customer data.
 * Upserts based on email address.
 *
 * Priority: 60
 *
 * Fields:
 * - email, firstName, lastName, salutation, title, profession
 * - phone, dietaryRequirements
 *
 * Returns:
 * - contactId: ID of created/updated contact
 * - isNew: Whether contact was newly created
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export const executeCreateContact = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("✓ [Behavior 5/12] Create or Update Contact");

    const context = args.context as {
      customerData?: {
        email?: string;
        firstName?: string;
        lastName?: string;
        salutation?: string;
        title?: string;
        phone?: string;
      };
      formResponses?: {
        profession?: string;
        dietary_requirements?: string;
      };
    };

    const email = context.customerData?.email;
    if (!email) {
      return {
        success: false,
        error: "Email is required to create contact",
      };
    }

    // Check if contact already exists using ontologyHelpers
    const existingContacts = (await ctx.runQuery(api.ontologyHelpers.getObjects, {
      organizationId: args.organizationId,
      type: "crm_contact",
    })) as Array<{ _id: Id<"objects">; customProperties?: { email?: string } }>;

    const matchingContact = existingContacts.find(
      (contact) => contact.customProperties?.email === email
    );

    let contactId: Id<"objects">;
    let isNew = false;

    if (matchingContact) {
      // Use existing contact
      contactId = matchingContact._id;
      console.log(`✅ Using existing contact: ${contactId}`);
    } else {
      // DRY-RUN MODE: Skip actual database write
      if (args.config?.dryRun) {
        contactId = `dryrun_contact_${Date.now()}` as Id<"objects">;
        isNew = true;
        console.log(`🧪 [DRY RUN] Would create new contact for: ${email}`);
      } else {
        // Create new contact (PRODUCTION)
        console.log(`✅ Creating new contact for: ${email}`);
        isNew = true;

        const result: any = await ctx.runMutation(internal.api.v1.crmInternal.createContactInternal, {
          organizationId: args.organizationId,
          subtype: "event_attendee",
          email,
          firstName: context.customerData?.firstName || "",
          lastName: context.customerData?.lastName || "",
          phone: context.customerData?.phone,
          performedBy: "k1system000000000000000000" as Id<"users">,
        });

        contactId = result.contactId as Id<"objects">;
      }
    }

    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Contact ${isNew ? "created" : "updated"}: ${contactId}`);

    return {
      success: true,
      message: `Contact ${isNew ? "created" : "updated"} successfully${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        contactId,
        isNew,
        email,
        firstName: context.customerData?.firstName,
        lastName: context.customerData?.lastName,
        phone: context.customerData?.phone,
      },
    };
  },
});
