/**
 * BEHAVIOR: DETECT EMPLOYER BILLING (Behavior 4)
 *
 * Determines the billing method based on attendee category and product invoice config.
 * Critical for B2B invoicing workflow.
 *
 * Priority: 70
 *
 * Returns:
 * - billingMethod: "employer_invoice" | "customer_payment" | "free"
 * - employerName: Name of employer organization (if B2B)
 * - crmOrganizationId: ID of CRM organization (if found)
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("../../_generated/api");
import { Id } from "../../_generated/dataModel";

export const executeDetectEmployerBilling = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✓'} [Behavior 4/12] Detect Employer Billing`);

    const context = args.context as {
      products?: Array<{
        productId: string;
        quantity: number;
      }>;
      formResponses?: {
        attendee_category?: string;
      };
    };

    // Get first product to check invoice config (employer billing applies to all)
    if (!context.products || context.products.length === 0) {
      return {
        success: false,
        error: "At least one product is required",
      };
    }

    const product = await (ctx as any).runQuery(generatedApi.api.ontologyHelpers.getObject, {
      objectId: context.products[0].productId as Id<"objects">,
    });

    if (!product) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    const customProps = product.customProperties as {
      price?: number;
      invoiceConfig?: {
        employerMapping?: Record<string, string>;
      };
    };

    // Check if product is free
    if (!customProps.price || customProps.price === 0) {
      console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Free product - no billing needed`);
      return {
        success: true,
        message: `Free product detected${args.config?.dryRun ? ' (dry run)' : ''}`,
        data: {
          billingMethod: "free",
          employerName: undefined,
          crmOrganizationId: undefined,
        },
      };
    }

    // Check employer mapping
    const attendeeCategory = context.formResponses?.attendee_category;
    const employerMapping = customProps.invoiceConfig?.employerMapping;

    if (employerMapping && attendeeCategory && employerMapping[attendeeCategory]) {
      const employerName = employerMapping[attendeeCategory];
      console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Employer billing detected: ${employerName}`);

      // Try to find CRM organization
      let crmOrganizationId: Id<"objects"> | undefined;
      try {
        const crmOrgs = await (ctx as any).runQuery(generatedApi.api.ontologyHelpers.getObjects, {
          organizationId: args.organizationId,
          type: "crm_organization",
        });

        const matchingOrg = crmOrgs.find((org: { name?: string }) => org.name === employerName);
        if (matchingOrg) {
          crmOrganizationId = matchingOrg._id as Id<"objects">;
          console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Found CRM organization: ${crmOrganizationId}`);
        } else {
          console.warn(`⚠️ CRM organization not found for: ${employerName}`);
        }
      } catch (error) {
        console.error("Error finding CRM organization:", error);
      }

      return {
        success: true,
        message: `Employer billing: ${employerName}${args.config?.dryRun ? ' (dry run)' : ''}`,
        data: {
          billingMethod: "employer_invoice",
          employerName,
          crmOrganizationId,
          attendeeCategory,
        },
      };
    }

    // Default: customer payment
    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Customer payment detected`);
    return {
      success: true,
      message: `Customer payment method${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        billingMethod: "customer_payment",
        employerName: undefined,
        crmOrganizationId: undefined,
      },
    };
  },
});
