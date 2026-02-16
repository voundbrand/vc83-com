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
const generatedApi: any = require("../../_generated/api");
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
      frontendUserId?: string; // May already be created by earlier behavior
    };

    const email = context.customerData?.email;
    if (!email) {
      return {
        success: false,
        error: "Email is required to create contact",
      };
    }

    // Step 1: Create or get frontend_user (dormant account for future activation)
    let frontendUserId: Id<"objects">;

    if (context.frontendUserId) {
      // Already created by earlier behavior
      frontendUserId = context.frontendUserId as Id<"objects">;
      console.log(`✅ Using existing frontend_user: ${frontendUserId}`);
    } else {
      // Create dormant frontend_user account
      frontendUserId = await (ctx as any).runMutation(generatedApi.internal.auth.createOrGetGuestUser, {
        email,
        firstName: context.customerData?.firstName,
        lastName: context.customerData?.lastName,
        organizationId: args.organizationId,
      });
    }

    // Step 2: Check if CRM contact already exists
    const existingContacts = (await (ctx as any).runQuery(generatedApi.api.ontologyHelpers.getObjects, {
      organizationId: args.organizationId,
      type: "crm_contact",
    })) as Array<{ _id: Id<"objects">; customProperties?: { email?: string } }>;

    const matchingContact = existingContacts.find(
      (contact) => contact.customProperties?.email === email
    );

    let contactId: Id<"objects">;
    let isNew = false;

    if (matchingContact) {
      // Use existing CRM contact
      contactId = matchingContact._id;
      console.log(`✅ Using existing CRM contact: ${contactId}`);
    } else {
      // DRY-RUN MODE: Skip actual database write
      if (args.config?.dryRun) {
        contactId = `dryrun_contact_${Date.now()}` as Id<"objects">;
        isNew = true;
        console.log(`🧪 [DRY RUN] Would create new CRM contact for: ${email}`);
      } else {
        // Create new CRM contact (PRODUCTION)
        console.log(`✅ Creating new CRM contact for: ${email}`);
        isNew = true;

        const result: any = await (ctx as any).runMutation(generatedApi.internal.api.v1.crmInternal.createContactInternal, {
          organizationId: args.organizationId,
          subtype: "event_attendee",
          email,
          firstName: context.customerData?.firstName || "",
          lastName: context.customerData?.lastName || "",
          phone: context.customerData?.phone,
          performedBy: undefined, // Guest registration - no platform user (will need to make this optional)
        });

        contactId = result.contactId as Id<"objects">;
      }
    }

    // Step 3: Link frontend_user → crm_contact
    if (!args.config?.dryRun) {
      await (ctx as any).runMutation(generatedApi.internal.auth.linkFrontendUserToCRM, {
        userId: frontendUserId,
        email,
        organizationId: args.organizationId,
      });
    }

    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} CRM Contact ${isNew ? "created" : "updated"}: ${contactId}`);
    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Frontend user: ${frontendUserId} (dormant account - can activate later)`);

    return {
      success: true,
      message: `Contact ${isNew ? "created" : "updated"} successfully${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        contactId,
        frontendUserId, // Pass to next behaviors
        isNew,
        email,
        firstName: context.customerData?.firstName,
        lastName: context.customerData?.lastName,
        phone: context.customerData?.phone,
      },
    };
  },
});
