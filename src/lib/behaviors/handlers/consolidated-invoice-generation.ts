/**
 * CONSOLIDATED INVOICE GENERATION BEHAVIOR
 *
 * General-purpose behavior for consolidating multiple tickets into a single invoice.
 * Can be triggered by:
 * - Manual workflows (admin triggers for specific event)
 * - Scheduled workflows (weekly/monthly consolidation)
 * - Event-driven workflows (when event ends)
 * - API calls (external systems)
 * - AI agents (on-demand invoice generation)
 *
 * Use Cases:
 * - Hospital paying for multiple doctor registrations
 * - Company paying for multiple employee conference tickets
 * - Group bookings that need single invoice
 * - Monthly billing for recurring services
 */

import type { BehaviorHandler } from "../types";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Consolidated Invoice Generation Config
 */
export interface ConsolidatedInvoiceGenerationConfig {
  // TICKET SELECTION CRITERIA
  // At least one of these must be provided

  // By Event (most common: all tickets for a specific event)
  eventId?: string; // Id<"objects">

  // By Employer/Organization (all tickets for a specific company)
  crmOrganizationId?: string; // Id<"objects">

  // By Date Range (all tickets purchased in a period)
  dateRange?: {
    startDate?: number; // timestamp
    endDate?: number;   // timestamp
  };

  // By Payment Status (default: "awaiting_employer_payment")
  paymentStatus?: "awaiting_employer_payment" | "paid" | "pending";

  // By Product (specific ticket types)
  productIds?: string[]; // Id<"objects">[]

  // Exclude already invoiced tickets (default: true)
  excludeInvoiced?: boolean;

  // Minimum ticket count (skip if less than X tickets found)
  minimumTicketCount?: number;

  // INVOICE CONFIGURATION

  // Payment terms
  paymentTerms?: "due_on_receipt" | "net7" | "net15" | "net30" | "net60" | "net90";

  // Invoice prefix (e.g., "INV-", "B2B-")
  invoicePrefix?: string;

  // PDF template to use
  templateId?: "b2b_consolidated" | "b2b_consolidated_detailed";

  // NOTIFICATION SETTINGS

  // Send invoice via email
  sendEmail?: boolean;

  // Additional email recipients (besides billing contact)
  ccEmails?: string[];

  // Email subject and message
  emailSubject?: string;
  emailMessage?: string;

  // INVOICE NOTES

  // Custom notes to include on invoice
  notes?: string;

  // Include ticket holder details in invoice
  includeTicketHolderDetails?: boolean;

  // Group by ticket holder (one line item per person)
  groupByTicketHolder?: boolean;
}

/**
 * Extracted data from inputs and context
 */
export interface ConsolidatedInvoiceExtractedData {
  // Resolved IDs (from config or context)
  eventId?: Id<"objects">;
  crmOrganizationId?: Id<"objects">;
  productIds?: Id<"objects">[];

  // Selection criteria
  dateRange?: { startDate?: number; endDate?: number };
  paymentStatus: string;
  excludeInvoiced: boolean;
  minimumTicketCount: number;

  // Invoice config
  paymentTerms: "due_on_receipt" | "net7" | "net15" | "net30" | "net60" | "net90";
  invoicePrefix: string;
  templateId: "b2b_consolidated" | "b2b_consolidated_detailed";

  // Notifications
  sendEmail: boolean;
  ccEmails: string[];
  emailSubject?: string;
  emailMessage?: string;

  // Notes
  notes?: string;
  includeTicketHolderDetails: boolean;
  groupByTicketHolder: boolean;
}

/**
 * Result data returned after invoice generation
 */
export interface ConsolidatedInvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  ticketCount: number;
  totalInCents: number;
  pdfUrl: string | null;
  crmOrganizationName?: string;
  eventName?: string;
}

/**
 * Consolidated Invoice Generation Handler
 */
export const consolidatedInvoiceGenerationHandler: BehaviorHandler<
  ConsolidatedInvoiceGenerationConfig,
  ConsolidatedInvoiceExtractedData,
  ConsolidatedInvoiceResult
> = {
  type: "consolidated-invoice-generation",
  name: "Consolidated Invoice Generation",
  description: "Generate a single invoice consolidating multiple tickets (e.g., hospital pays for all doctor registrations)",
  category: "action",
  supportedInputTypes: ["manual", "time", "event", "api", "agent_decision"],
  supportedObjectTypes: ["event", "crm_organization", "ticket", "invoice_rule"],
  supportedWorkflows: ["invoicing", "event_management", "scheduled_billing"],

  /**
   * Validate configuration
   */
  validate: (config) => {
    const errors: Array<{ field?: string; message: string; code?: string }> = [];

    // At least one selection criterion should be provided
    // (but can also come from context, so this is just a warning)
    if (!config.eventId && !config.crmOrganizationId && !config.dateRange && !config.productIds) {
      errors.push({
        field: "selectionCriteria",
        message: "At least one selection criterion should be provided (eventId, crmOrganizationId, dateRange, or productIds). Can also be derived from workflow context.",
        code: "warning",
      });
    }

    // Validate payment terms
    const validPaymentTerms = ["due_on_receipt", "net7", "net15", "net30", "net60", "net90"];
    if (config.paymentTerms && !validPaymentTerms.includes(config.paymentTerms)) {
      errors.push({
        field: "paymentTerms",
        message: `Invalid payment terms. Must be one of: ${validPaymentTerms.join(", ")}`,
        code: "invalid_payment_terms",
      });
    }

    // Validate template ID
    const validTemplates = ["b2b_consolidated", "b2b_consolidated_detailed"];
    if (config.templateId && !validTemplates.includes(config.templateId)) {
      errors.push({
        field: "templateId",
        message: `Invalid template ID. Must be one of: ${validTemplates.join(", ")}`,
        code: "invalid_template",
      });
    }

    // Validate date range
    if (config.dateRange) {
      if (config.dateRange.startDate && config.dateRange.endDate) {
        if (config.dateRange.startDate > config.dateRange.endDate) {
          errors.push({
            field: "dateRange",
            message: "Start date must be before end date",
            code: "invalid_date_range",
          });
        }
      }
    }

    // Validate minimum ticket count
    if (config.minimumTicketCount !== undefined && config.minimumTicketCount < 1) {
      errors.push({
        field: "minimumTicketCount",
        message: "Minimum ticket count must be at least 1",
        code: "invalid_minimum_count",
      });
    }

    return errors;
  },

  /**
   * Extract and validate configuration + context data
   */
  extract: (config, inputs, context) => {
    // At least one selection criterion must be provided
    if (!config.eventId && !config.crmOrganizationId && !config.dateRange && !config.productIds) {
      console.warn("⚠️ Consolidated Invoice: No selection criteria provided, will use context");

      // Try to get from context objects
      const eventObject = context.objects?.find(obj => obj.objectType === "event");
      const crmOrgObject = context.objects?.find(obj => obj.objectType === "crm_organization");

      if (!eventObject && !crmOrgObject) {
        console.error("❌ Consolidated Invoice: No selection criteria in config or context");
        return null;
      }
    }

    // Resolve IDs from config or context
    const resolveId = (configId?: string, objectType?: string): Id<"objects"> | undefined => {
      if (configId) return configId as Id<"objects">;
      const obj = context.objects?.find(o => o.objectType === objectType);
      return obj?.objectId;
    };

    const eventId = resolveId(config.eventId, "event");
    const crmOrganizationId = resolveId(config.crmOrganizationId, "crm_organization");
    const productIds = config.productIds?.map(id => id as Id<"objects">);

    return {
      // Selection criteria
      eventId,
      crmOrganizationId,
      productIds,
      dateRange: config.dateRange,
      paymentStatus: config.paymentStatus || "awaiting_employer_payment",
      excludeInvoiced: config.excludeInvoiced !== false, // default true
      minimumTicketCount: config.minimumTicketCount || 1,

      // Invoice config
      paymentTerms: config.paymentTerms || "net30",
      invoicePrefix: config.invoicePrefix || "INV",
      templateId: config.templateId || "b2b_consolidated",

      // Notifications
      sendEmail: config.sendEmail !== false, // default true
      ccEmails: config.ccEmails || [],
      emailSubject: config.emailSubject,
      emailMessage: config.emailMessage,

      // Notes
      notes: config.notes,
      includeTicketHolderDetails: config.includeTicketHolderDetails !== false, // default true
      groupByTicketHolder: config.groupByTicketHolder !== false, // default true
    };
  },

  /**
   * Execute consolidated invoice generation
   *
   * This will:
   * 1. Query tickets matching criteria
   * 2. Validate minimum ticket count
   * 3. Call Convex consolidated invoice generation
   * 4. Generate PDF
   * 5. Send email notifications if configured
   */
  apply: async (config, extracted, context) => {
    console.log("🧾 Consolidated Invoice Generation starting...", {
      eventId: extracted.eventId,
      crmOrganizationId: extracted.crmOrganizationId,
      paymentStatus: extracted.paymentStatus,
    });

    // Validation: Must have organizationId and sessionId for Convex calls
    if (!context.organizationId) {
      return {
        success: false,
        errors: ["organizationId is required in context"],
      };
    }

    if (!context.sessionId) {
      return {
        success: false,
        errors: ["sessionId is required in context for authentication"],
      };
    }

    // Validation: Must have crmOrganizationId to know who to bill
    if (!extracted.crmOrganizationId) {
      return {
        success: false,
        errors: ["crmOrganizationId is required - must know which organization to bill"],
        warnings: ["Consider using 'employer-detection' behavior first to identify the billing organization"],
      };
    }

    try {
      // NOTE: This is client-side behavior code
      // Actual invoice generation happens via Convex action call
      // We need to structure this as an action to be dispatched

      return {
        success: true,
        data: null, // Will be populated by action execution
        actions: [
          {
            type: "generate_consolidated_invoice",
            payload: {
              // Selection criteria
              eventId: extracted.eventId,
              crmOrganizationId: extracted.crmOrganizationId,
              productIds: extracted.productIds,
              dateRange: extracted.dateRange,
              paymentStatus: extracted.paymentStatus,
              excludeInvoiced: extracted.excludeInvoiced,
              minimumTicketCount: extracted.minimumTicketCount,

              // Invoice config
              paymentTerms: extracted.paymentTerms,
              invoicePrefix: extracted.invoicePrefix,
              templateId: extracted.templateId,

              // Notifications
              sendEmail: extracted.sendEmail,
              ccEmails: extracted.ccEmails,
              emailSubject: extracted.emailSubject,
              emailMessage: extracted.emailMessage,

              // Notes
              notes: extracted.notes,
              includeTicketHolderDetails: extracted.includeTicketHolderDetails,
              groupByTicketHolder: extracted.groupByTicketHolder,

              // Context
              organizationId: context.organizationId,
              sessionId: context.sessionId,
            },
            priority: 1,
            when: "immediate",
          },
        ],
        metadata: {
          behaviorType: "consolidated-invoice-generation",
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      console.error("❌ Consolidated Invoice Generation failed:", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown error during invoice generation"],
      };
    }
  },
};
