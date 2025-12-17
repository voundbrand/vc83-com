/**
 * SEED WORKFLOW TEMPLATES
 *
 * Seeds system workflow templates into the database.
 * Similar to seedCheckoutTemplates.ts and seedFormTemplates.ts
 *
 * Run with: npx convex run seedWorkflowTemplates:seedWorkflowTemplates
 */

import { mutation } from "./_generated/server";

export const seedWorkflowTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    // Get first user (needed for createdBy field)
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Please create a user first with seedAdmin.");
    }

    // Get or create system organization
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      const systemOrgId = await ctx.db.insert("organizations", {
        name: "System",
        slug: "system",
        isActive: true,
        businessName: "System",
        // NOTE: Plan/tier managed in organization_license object
        isPersonalWorkspace: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      systemOrg = await ctx.db.get(systemOrgId);
    }

    if (!systemOrg) {
      throw new Error("Failed to create system organization");
    }

    // Check if workflow templates already exist (type: "template", subtype: "workflow")
    const existingTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "workflow"))
      .collect();

    console.log(`Found ${existingTemplates.length} existing workflow templates`);

    // Define workflow templates to seed
    const workflowTemplates = [
      {
        code: "event-registration-employer-billing",
        name: "Event Registration with Employer Billing",
        description:
          "Handles event registration with automatic employer detection and invoice generation for employer-paid tickets.",
        category: "registration",
        subtype: "checkout-flow",
        icon: "🎫",
        objects: [
          {
            objectType: "product",
            role: "primary",
            description: "Event ticket product",
            required: true,
          },
          {
            objectType: "form",
            role: "input-source",
            description: "Registration form collecting attendee and employer info",
            required: true,
          },
          {
            objectType: "checkout",
            role: "payment-processor",
            description: "Checkout instance for payment processing",
            required: true,
          },
        ],
        behaviors: [
          {
            type: "employer-detection",
            enabled: true,
            priority: 100,
            description: "Detects employer from form data and matches to CRM",
            config: {
              employerField: "company",
              requireCrmMatch: true,
            },
          },
          {
            type: "invoice-mapping",
            enabled: true,
            priority: 90,
            description: "Maps detected employer to CRM organization",
            config: {
              organizationSourceField: "company",
              organizationMapping: {},
              defaultPaymentTerms: "net30",
              templateId: "b2b_consolidated",
            },
          },
          {
            type: "invoice-payment",
            enabled: true,
            priority: 80,
            description: "Creates invoice and skips payment step for employer billing",
            config: {
              defaultPaymentTerms: "net30",
              employerPaymentTerms: {},
              requireCrmOrganization: true,
              requireBillingAddress: false,
              autoFillFromCrm: true,
              sendInvoiceEmail: true,
              includeDetailedLineItems: true,
              includeTaxBreakdown: true,
              includeAddons: true,
            },
          },
        ],
        execution: {
          triggerOn: "checkout_start",
          requiredInputs: ["form_responses", "product_selection"],
          outputActions: ["create_invoice", "skip_payment_step"],
          errorHandling: "continue",
        },
      },
      {
        code: "simple-product-checkout",
        name: "Simple Product Checkout",
        description: "Basic checkout flow for products without special behaviors.",
        category: "checkout",
        subtype: "checkout-flow",
        icon: "🛒",
        objects: [
          {
            objectType: "product",
            role: "primary",
            description: "Product to sell",
            required: true,
          },
          {
            objectType: "checkout",
            role: "payment-processor",
            description: "Checkout instance for payment processing",
            required: true,
          },
        ],
        behaviors: [],
        execution: {
          triggerOn: "checkout_start",
          requiredInputs: ["product_selection"],
          outputActions: [],
          errorHandling: "rollback",
        },
      },
      {
        code: "multi-product-bundle",
        name: "Multi-Product Bundle with Discounts",
        description:
          "Checkout flow for product bundles with automatic discount application.",
        category: "checkout",
        subtype: "checkout-flow",
        icon: "📦",
        objects: [
          {
            objectType: "product",
            role: "primary",
            description: "Primary product",
            required: true,
          },
          {
            objectType: "product",
            role: "bundle-item",
            description: "Additional bundled products",
            required: false,
          },
          {
            objectType: "checkout",
            role: "payment-processor",
            description: "Checkout instance",
            required: true,
          },
        ],
        behaviors: [],
        execution: {
          triggerOn: "checkout_start",
          requiredInputs: ["product_selection"],
          outputActions: ["apply_discount"],
          errorHandling: "continue",
        },
      },
      {
        code: "event-registration-complete",
        name: "Complete Event Registration (12 Behaviors)",
        description:
          "Full-featured event registration with validation, capacity checking, pricing, employer billing detection, CRM integration, ticket creation, transaction audit trail, form response archiving, conditional invoice generation, email confirmations, statistics tracking, and admin notifications.",
        category: "registration",
        subtype: "event-checkout-flow",
        icon: "✨",
        objects: [
          {
            objectType: "product",
            role: "primary",
            description: "Event ticket product with pricing and invoice configuration",
            required: true,
          },
          {
            objectType: "form",
            role: "input-source",
            description: "Registration form collecting attendee information",
            required: true,
          },
          {
            objectType: "event",
            role: "context",
            description: "Event being registered for",
            required: true,
          },
        ],
        behaviors: [
          {
            type: "validate-registration",
            enabled: true,
            priority: 100,
            description: "Validates all required fields and data formats (email, name, salutation, consent)",
            config: {
              requiredFields: ["email", "firstName", "lastName", "salutation", "consent_privacy"],
              validateEmailFormat: true,
              validatePhone: true,
              requireBillingAddressFor: ["external", "haffnet"],
            },
          },
          {
            type: "check-event-capacity",
            enabled: true,
            priority: 95,
            description: "Checks if event has available capacity before allowing registration",
            config: {
              blockOnFull: true,
              checkConfirmedOnly: false,
            },
          },
          {
            type: "calculate-pricing",
            enabled: true,
            priority: 90,
            description: "Calculates final price with discounts and VAT",
            config: {
              includeTax: true,
              taxRate: 19,
              allowDiscountCodes: true,
            },
          },
          {
            type: "detect-employer-billing",
            enabled: true,
            priority: 70,
            description: "Determines billing method based on attendee category (employer vs customer payment)",
            config: {
              matchCrmOrganizations: true,
              employerCategories: ["ameos", "haffnet"],
            },
          },
          {
            type: "create-contact",
            enabled: true,
            priority: 60,
            description: "Creates or updates CRM contact with salutation, title, profession, and dietary requirements",
            config: {
              upsertByEmail: true,
              storeDietaryRequirements: true,
              includeTitle: true,
              includeProfession: true,
            },
          },
          {
            type: "create-ticket",
            enabled: true,
            priority: 55,
            description: "Creates event ticket with full logistics (arrival time, dietary needs, accommodation, UCRA)",
            config: {
              includeLogistics: true,
              generateQrCode: true,
              storeAllCustomProperties: true,
            },
          },
          {
            type: "create-transaction",
            enabled: true,
            priority: 48,
            description: "Creates transaction audit trail linking customer → payer → ticket (enables B2B invoicing)",
            config: {
              trackPayer: true,
              enableInvoicing: true,
              separatePayerFromCustomer: true,
              setPaymentStatusByBillingMethod: true,
            },
          },
          {
            type: "create-form-response",
            enabled: true,
            priority: 40,
            description: "Stores complete form submission data for audit trail",
            config: {
              createAuditTrail: true,
              linkToEvent: true,
              linkToProduct: true,
              linkToContact: true,
            },
          },
          {
            type: "generate-invoice",
            enabled: true,
            priority: 35,
            description: "Generates employer invoice (CONDITIONAL - only if billingMethod === 'employer_invoice')",
            config: {
              condition: "billingMethod === 'employer_invoice'",
              paymentTerms: "net30",
              templateId: "b2b_consolidated",
              createAsDraft: true,
            },
          },
          {
            type: "send-confirmation-email",
            enabled: true,
            priority: 30,
            description: "Sends German confirmation email with proper salutation and logistics",
            config: {
              includeTicketPdf: false,
              includeQrCode: false,
              germanSalutation: true,
              formatLogistics: true,
            },
          },
          {
            type: "update-statistics",
            enabled: true,
            priority: 20,
            description: "Updates event and product statistics (registrations, revenue, confirmed vs pending)",
            config: {
              trackAttendees: true,
              trackRevenue: true,
              separatePendingFromConfirmed: true,
            },
          },
          {
            type: "send-admin-notification",
            enabled: true,
            priority: 10,
            description: "Sends admin notification email with registration details (non-critical)",
            config: {
              notifyOrgOwner: false,
              useEventAdminEmails: true,
              germanLanguage: true,
              includeInvoiceWarning: true,
            },
          },
        ],
        execution: {
          triggerOn: "form_submission",
          requiredInputs: ["form_responses", "product_selection", "customer_data"],
          outputActions: ["create_ticket", "send_email", "create_invoice", "update_statistics"],
          errorHandling: "continue",
        },
      },
      {
        code: "user-registration",
        name: "Direct User Registration",
        description:
          "Handles direct user registration from frontend registration form. Creates frontend_user and CRM contact, links them together, and optionally sends welcome email.",
        category: "registration",
        subtype: "user-onboarding",
        icon: "👤",
        objects: [
          {
            objectType: "form",
            role: "input-source",
            description: "Registration form collecting user data",
            required: false,
          },
        ],
        behaviors: [
          {
            type: "create-contact",
            enabled: true,
            priority: 100,
            description: "Creates CRM contact and frontend_user account, links them together",
            config: {
              upsertByEmail: true,
              createFrontendUser: true,
              linkToFrontendUser: true,
            },
          },
          {
            type: "send-welcome-email",
            enabled: false,
            priority: 90,
            description: "Sends welcome email to new user (optional)",
            config: {
              templateId: "welcome_email",
              includeActivationLink: false,
            },
          },
        ],
        execution: {
          triggerOn: "user_registration",
          requiredInputs: ["email", "firstName", "lastName"],
          outputActions: ["create_frontend_user", "create_crm_contact"],
          errorHandling: "rollback",
        },
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const template of workflowTemplates) {
      // Check if template already exists by code
      const existing = existingTemplates.find(
        (t) => t.customProperties?.code === template.code
      );

      if (existing) {
        // Update existing template
        await ctx.db.patch(existing._id, {
          name: template.name,
          description: template.description,
          customProperties: {
            ...existing.customProperties,
            ...template,
          },
          updatedAt: Date.now(),
        });
        updatedCount++;
        console.log(`Updated workflow template: ${template.code}`);
      } else {
        // Create new template (type: "template", subtype: "workflow")
        await ctx.db.insert("objects", {
          organizationId: systemOrg._id,
          type: "template",
          subtype: "workflow",
          name: template.name,
          description: template.description,
          status: "published",
          customProperties: {
            ...template,
            version: "1.0.0",
            author: "System",
          },
          createdBy: firstUser._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        createdCount++;
        console.log(`Created workflow template: ${template.code}`);
      }
    }

    return {
      success: true,
      message: `Workflow templates seeded: ${createdCount} created, ${updatedCount} updated`,
      totalTemplates: workflowTemplates.length,
      createdCount,
      updatedCount,
    };
  },
});
