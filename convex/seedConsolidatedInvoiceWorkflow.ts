/**
 * SEED: CONSOLIDATED INVOICE WORKFLOW
 *
 * Creates an example workflow for generating consolidated B2B invoices.
 * This workflow demonstrates the general-purpose consolidated-invoice-generation behavior.
 *
 * Use Case: Hospital pays for all doctors who registered for a conference
 *
 * To run:
 * npx convex run seedConsolidatedInvoiceWorkflow:seedConsolidatedInvoiceWorkflow \
 *   --sessionId "your-session-id" \
 *   --organizationId "your-org-id"
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const seedConsolidatedInvoiceWorkflow = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    console.log("🌱 Seeding consolidated invoice workflow...");

    // Get or create system user
    let systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      console.log("Creating system user...");
      const systemUserId = await ctx.db.insert("users", {
        email: "system@l4yercak3.com",
        firstName: "System",
        lastName: "User",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      systemUser = await ctx.db.get(systemUserId);
    }

    if (!systemUser) {
      throw new Error("Failed to create system user");
    }

    // Create example workflow for consolidated invoicing
    const workflowId = await ctx.db.insert("objects", {
      type: "workflow",
      subtype: "invoicing",
      organizationId: args.organizationId,
      name: "Monthly Hospital Billing - Conference Registrations",
      description:
        "Generate consolidated invoice for all doctors from a specific hospital who registered for conferences. Runs manually or on schedule.",
      status: "active", // Set to active so it can be used immediately
      customProperties: {
        // Workflow execution configuration
        execution: {
          triggerOn: "manual", // Can be triggered manually by admin
          requiredInputs: [], // No inputs required - finds tickets automatically
          expectedOutputs: ["invoice_pdf", "email_notification"],
        },

        // Objects this workflow operates on
        // NOTE: In real usage, these would be specific event/org IDs
        // For now, this is a template that works with any event+org combo
        objects: [
          {
            id: "obj_event_template",
            objectType: "event",
            objectId: null, // Will be provided at runtime or configured per-use
            label: "Event",
            description: "The event whose tickets should be consolidated",
            required: false, // Optional - can filter by org only
          },
          {
            id: "obj_hospital_template",
            objectType: "crm_organization",
            objectId: null, // Will be provided at runtime or configured per-use
            label: "Hospital/Employer",
            description: "The organization to bill (employer paying for employees)",
            required: true, // Required - must know who to invoice
          },
        ],

        // Behaviors to execute
        behaviors: [
          {
            id: "bhv_consolidated_invoice",
            type: "consolidated-invoice-generation",
            priority: 1,
            enabled: true,
            config: {
              // TICKET SELECTION CRITERIA
              // These can be customized per-execution or set as defaults
              // Leave undefined to get from workflow context (objects array)
              eventId: undefined, // Get from workflow context
              crmOrganizationId: undefined, // Get from workflow context
              paymentStatus: "awaiting_employer_payment", // Only unpaid tickets
              excludeInvoiced: true, // Skip tickets already on an invoice
              minimumTicketCount: 1, // Generate even for single ticket

              // INVOICE CONFIGURATION
              paymentTerms: "net30" as const, // 30 days to pay
              invoicePrefix: "INV", // Invoice number prefix
              templateId: "b2b_consolidated" as const, // Standard B2B template

              // NOTIFICATION SETTINGS
              sendEmail: true, // Send invoice to billing contact
              ccEmails: [], // Additional recipients (can add finance@hospital.com)
              emailSubject: "Invoice for Conference Registrations",
              emailMessage:
                "Please find attached the consolidated invoice for your employees' conference registrations. Payment is due within 30 days.",

              // INVOICE DETAILS
              notes:
                "Consolidated invoice for employee conference registrations. Each line item represents one employee ticket.",
              includeTicketHolderDetails: true, // Show employee names
              groupByTicketHolder: true, // One line per employee
            },
            triggers: {
              inputTypes: ["manual", "time", "api"],
              objectTypes: ["event", "crm_organization"],
              workflows: ["invoicing", "event_management"],
            },
            metadata: {
              createdAt: Date.now(),
              createdBy: systemUser._id,
            },
          },
        ],

        // Visual representation for workflow builder UI
        visualData: {
          nodes: [
            {
              id: "node_start",
              type: "trigger",
              position: { x: 100, y: 100 },
              data: {
                label: "Manual Trigger",
                triggerType: "manual",
              },
            },
            {
              id: "node_find_tickets",
              type: "behavior",
              position: { x: 100, y: 200 },
              data: {
                label: "Find Eligible Tickets",
                behaviorId: "bhv_consolidated_invoice",
                description: "Find all unpaid tickets for this event+hospital",
              },
            },
            {
              id: "node_generate_invoice",
              type: "action",
              position: { x: 100, y: 300 },
              data: {
                label: "Generate Consolidated Invoice",
                actionType: "generate_consolidated_invoice",
              },
            },
            {
              id: "node_send_email",
              type: "action",
              position: { x: 100, y: 400 },
              data: {
                label: "Send Invoice Email",
                actionType: "send_email",
              },
            },
            {
              id: "node_end",
              type: "end",
              position: { x: 100, y: 500 },
              data: {
                label: "Complete",
              },
            },
          ],
          edges: [
            {
              id: "edge_1",
              source: "node_start",
              target: "node_find_tickets",
            },
            {
              id: "edge_2",
              source: "node_find_tickets",
              target: "node_generate_invoice",
            },
            {
              id: "edge_3",
              source: "node_generate_invoice",
              target: "node_send_email",
            },
            {
              id: "edge_4",
              source: "node_send_email",
              target: "node_end",
            },
          ],
        },

        // Tags for organization
        tags: ["invoicing", "b2b", "consolidated", "conference", "hospital"],

        // Version tracking
        version: "1.0.0",
        changelog: [
          {
            version: "1.0.0",
            date: Date.now(),
            changes: "Initial workflow creation",
            author: "system",
          },
        ],
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("✅ Consolidated invoice workflow created:", workflowId);

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: workflowId,
      actionType: "workflow_created",
      actionData: {
        source: "seed_script",
        workflowType: "consolidated_invoicing",
      },
      performedBy: systemUser._id,
      performedAt: Date.now(),
    });

    return {
      success: true,
      workflowId,
      message: "Consolidated invoice workflow created successfully",
    };
  },
});

/**
 * USAGE INSTRUCTIONS
 *
 * After running this seed script, you'll have a template workflow for consolidated invoicing.
 *
 * To use it:
 *
 * 1. Navigate to the Workflows window in your app
 * 2. Find "Monthly Hospital Billing - Conference Registrations"
 * 3. Click "Edit" to customize:
 *    - Set specific Event ID (or leave empty to search all events)
 *    - Set specific Hospital/CRM Org ID (required)
 *    - Adjust payment terms, email settings, etc.
 * 4. Click "Run Now" to generate the invoice immediately
 * 5. Check the Invoices window to see the generated consolidated invoice
 * 6. Download the PDF or resend the email as needed
 *
 * AUTOMATION OPTIONS:
 *
 * To run automatically:
 * - Change triggerOn to "scheduled" and set a cron expression
 * - Or change to "event_completion" to run when an event ends
 * - Or leave as "manual" and trigger via API: POST /api/workflows/{id}/execute
 *
 * CUSTOMIZATION:
 *
 * You can duplicate this workflow and customize for different scenarios:
 * - Weekly billing instead of monthly
 * - Different payment terms per hospital
 * - Include/exclude specific product types
 * - Filter by date ranges
 * - Minimum ticket thresholds
 */
