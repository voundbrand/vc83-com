/**
 * INVOICE PAYMENT PROVIDER
 *
 * Payment provider for B2B invoicing - creates invoices instead of immediate payment.
 * Integrates with existing invoicing system (invoicingOntology + consolidatedInvoicing).
 *
 * Flow:
 * 1. Customer selects "Invoice (Pay Later)" at checkout
 * 2. Provider creates consolidated invoice to employer organization
 * 3. Generates PDF using existing templates
 * 4. Tickets marked as "awaiting_employer_payment"
 * 5. Admin can view/manage invoice in Invoicing Window
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id, Doc } from "../_generated/dataModel";
import type {
  IPaymentProvider,
  ConnectionParams,
  ConnectionResult,
  AccountStatus,
  CheckoutSessionParams,
  CheckoutSessionResult,
  PaymentVerificationResult,
  InvoiceParams,
  InvoiceResult,
  InvoiceSendResult,
  ProviderWebhookEvent,
  WebhookHandlingResult,
} from "./types";

export interface InvoicePaymentConfig {
  type: "invoice";
  name: string;
  description: string;
  requiresSetup: boolean;
  supportsB2B: boolean;
  supportsB2C: boolean;
}

export const invoicePaymentProvider: InvoicePaymentConfig = {
  type: "invoice",
  name: "Invoice (Pay Later)",
  description: "An invoice will be sent for payment",
  requiresSetup: false,
  supportsB2B: true,
  supportsB2C: false, // For now, only B2B invoicing
};

/**
 * INITIATE INVOICE PAYMENT
 *
 * Creates invoice using existing infrastructure.
 */
export const initiateInvoicePayment = action({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    requiresUserAction: boolean;
    invoiceId?: string;
    invoiceNumber?: string;
    pdfUrl?: string | null;
    status: string;
    error?: string;
  }> => {
    try {
      // 1. Get checkout session
      const session = await ctx.runQuery(
        internal.checkoutSessionOntology.getCheckoutSessionInternal,
        { checkoutSessionId: args.checkoutSessionId }
      ) as Doc<"objects"> | null;

      if (!session || session.type !== "checkout_session") {
        throw new Error("Checkout session not found");
      }

      // 2. Extract product and form data from session
      const items = session.customProperties?.items as Array<{ productId: Id<"objects">; quantity: number }> | undefined;
      const formResponses = session.customProperties?.formResponses as Array<{
        productId: Id<"objects">;
        ticketNumber: number;
        responses: Record<string, string | number | boolean>;
      }> | undefined;

      if (!items || items.length === 0) {
        throw new Error("No products in checkout session");
      }

      // 3. Load first product's invoice config (assume single product for B2B invoicing)
      const productId = items[0].productId;
      const product = await ctx.runQuery(internal.productOntology.getProductInternal, { productId });

      if (!product) {
        throw new Error("Product not found");
      }

      // 4. Check if product has invoice config (enable/disable is at checkout level)
      const invoiceConfig = product.customProperties?.invoiceConfig as {
        employerSourceField: string;
        employerMapping: Record<string, string | null>;
        defaultPaymentTerms?: "net30" | "net60" | "net90";
      } | undefined;

      if (!invoiceConfig) {
        return {
          success: false,
          requiresUserAction: false,
          status: "error",
          error: "Product does not have invoice configuration (employer mapping not set up)",
        };
      }

      // 5. Validate invoice config completeness
      if (!invoiceConfig.employerSourceField || !invoiceConfig.employerMapping) {
        return {
          success: false,
          requiresUserAction: false,
          status: "error",
          error: "Product invoice configuration is incomplete (missing employer field or mapping)",
        };
      }

      // Find form response for this product
      const formResponse = formResponses?.find(fr => fr.productId === productId);
      if (!formResponse) {
        return {
          success: false,
          requiresUserAction: false,
          status: "error",
          error: "Form response not found for invoice generation",
        };
      }

      // Get employer value from form
      const employerFieldValue = formResponse.responses[invoiceConfig.employerSourceField];
      if (!employerFieldValue) {
        return {
          success: false,
          requiresUserAction: false,
          status: "error",
          error: `Employer field '${invoiceConfig.employerSourceField}' not found in form responses`,
        };
      }

      // Map employer value to organization name
      const organizationName = invoiceConfig.employerMapping[employerFieldValue.toString()];
      if (!organizationName) {
        return {
          success: false,
          requiresUserAction: false,
          status: "error",
          error: `No organization mapping found for employer value: ${employerFieldValue}`,
        };
      }

      // 6. Find or create CRM organization
      let crmOrganizationId: Id<"objects">;

      // First try to find existing organization
      const existingOrg = await ctx.runQuery(api.crmIntegrations.findCrmOrganizationByName, {
        organizationId: args.organizationId,
        searchName: organizationName,
      });

      if (existingOrg) {
        crmOrganizationId = existingOrg._id;
      } else {
        // Create new CRM organization if not found
        // Note: Payment terms will need to be set separately after creation if needed
        crmOrganizationId = await ctx.runMutation(internal.crmIntegrations.createCRMOrganization, {
          organizationId: args.organizationId,
          companyName: organizationName,
        });
      }

      // 7. Generate tickets AND purchase items immediately (customer gets tickets, employer gets invoice)
      // Calculate total quantity of tickets needed
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      const ticketIds: Id<"objects">[] = [];
      const purchaseItemIds: Id<"objects">[] = [];

      // Create tickets and purchase items for each quantity
      for (const item of items) {
        const itemProduct = await ctx.runQuery(internal.productOntology.getProductInternal, {
          productId: item.productId
        });

        if (!itemProduct) continue;

        // Create one ticket per quantity
        for (let i = 0; i < item.quantity; i++) {
          const ticketNumber = ticketIds.length + 1;

          // Find matching form response for this ticket number
          const formResponse = formResponses?.find(
            fr => fr.productId === item.productId && fr.ticketNumber === ticketNumber
          );

          // Get customer info
          const holderName = formResponse?.responses?.name as string ||
                            session.customProperties?.customerName as string || "Guest";
          const holderEmail = formResponse?.responses?.email as string ||
                             session.customProperties?.customerEmail as string || "";

          // Create ticket using internal mutation
          const ticketId = await ctx.runMutation(
            internal.ticketOntology.createTicketInternal,
            {
              organizationId: args.organizationId,
              productId: item.productId,
              holderName,
              holderEmail,
              eventId: itemProduct.customProperties?.eventId as Id<"objects"> | undefined,
              customProperties: {
                checkoutSessionId: args.checkoutSessionId,
                ticketNumber,
                totalTickets: totalQuantity,
                formResponses: formResponse?.responses || {},
                paymentStatus: "awaiting_employer_payment",
                pricePaid: (itemProduct.customProperties?.priceInCents as number) || 0,
              },
            }
          );

          ticketIds.push(ticketId);

          // Create purchase item to link ticket to checkout session
          const priceInCents = (itemProduct.customProperties?.priceInCents as number) || 0;
          const purchaseResult = await ctx.runMutation(
            internal.purchaseOntology.createPurchaseItemInternal,
            {
              organizationId: args.organizationId,
              productId: item.productId,
              quantity: 1, // One ticket = one purchase item
              pricePerUnit: priceInCents,
              totalPrice: priceInCents,
              checkoutSessionId: args.checkoutSessionId,
              buyerEmail: holderEmail,
              buyerName: holderName,
              buyerPhone: formResponse?.responses?.phone as string | undefined,
              buyerTransactionType: "B2B",
              buyerCompanyName: organizationName,
              crmOrganizationId,
              fulfillmentType: "ticket",
              registrationData: {
                ticketId,
                ticketNumber,
                status: "awaiting_employer_payment",
                formResponses: formResponse?.responses || {},
              },
            }
          ) as { purchaseItemIds: Id<"objects">[] };

          // Add all returned purchase item IDs (should be just one since quantity=1)
          purchaseItemIds.push(...purchaseResult.purchaseItemIds);

          // Update fulfillmentData with ticketId so ticket download works
          if (purchaseResult.purchaseItemIds.length > 0) {
            await ctx.runMutation(
              internal.purchaseOntology.updatePurchaseItemFulfillmentInternal,
              {
                purchaseItemId: purchaseResult.purchaseItemIds[0],
                fulfillmentData: {
                  ticketId,
                  status: "awaiting_employer_payment",
                },
              }
            );
          }
        }
      }

      if (ticketIds.length === 0) {
        throw new Error("Failed to generate tickets for invoice");
      }

      // 7.5. Update checkout session with purchase item IDs so ticket download works
      // Note: We need to refresh the session first to get latest customProperties
      const updatedSession = await ctx.runQuery(
        internal.checkoutSessionOntology.getCheckoutSessionInternal,
        { checkoutSessionId: args.checkoutSessionId }
      ) as Doc<"objects"> | null;

      if (updatedSession) {
        await ctx.runMutation(
          internal.checkoutSessionOntology.patchCheckoutSessionInternal,
          {
            checkoutSessionId: args.checkoutSessionId,
            customProperties: {
              ...updatedSession.customProperties,
              purchasedItemIds: purchaseItemIds,
            },
          }
        );
      }

      // 8. Create consolidated invoice using EXISTING function with configured payment terms
      const invoiceResult = await ctx.runMutation(
        api.invoicingOntology.createConsolidatedInvoice,
        {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          crmOrganizationId,
          ticketIds,
          paymentTerms: invoiceConfig.defaultPaymentTerms || "net30",
          notes: `Invoice generated from online checkout for ${organizationName}`,
        }
      ) as {
        success: boolean;
        invoiceId: Id<"objects">;
        invoiceNumber: string;
        ticketCount: number;
        totalInCents: number;
      };

      if (!invoiceResult.success) {
        throw new Error("Failed to create consolidated invoice");
      }

      // 9. Get invoice details for PDF generation
      const invoice = await ctx.runQuery(
        internal.invoicingOntology.getInvoiceByIdInternal,
        { invoiceId: invoiceResult.invoiceId }
      ) as Doc<"objects"> | null;

      if (!invoice) {
        throw new Error("Invoice not found after creation");
      }

      // 10. Generate PDF using EXISTING template system
      const templateData = prepareInvoiceTemplateData(invoice);
      const pdfResult = await ctx.runAction(
        api.pdfGenerationTemplated.generatePdfFromTemplate,
        {
          templateId: "b2b_consolidated" as "b2b_consolidated" | "b2b_consolidated_detailed" | "b2c_receipt",
          data: templateData,
          organizationId: args.organizationId,
        }
      );

      // 11. Store PDF and update invoice
      let pdfUrl: string | null = null;
      if (pdfResult?.content) {
        const pdfBlob = Buffer.from(pdfResult.content, "base64");
        const storageId = await ctx.storage.store(
          new Blob([pdfBlob], { type: "application/pdf" })
        );
        pdfUrl = await ctx.storage.getUrl(storageId);

        // Update invoice with PDF URL
        await ctx.runMutation(internal.invoicingOntology.updateInvoicePdfUrl, {
          invoiceId: invoiceResult.invoiceId,
          pdfUrl: pdfUrl || "",
        });
      }

      // 12. Send order confirmation email to customer with tickets
      // Customer gets tickets immediately, invoice goes to employer separately
      const customerEmail = session.customProperties?.customerEmail as string;
      const customerName = session.customProperties?.customerName as string;

      if (customerEmail) {
        try {
          await ctx.runAction(internal.ticketGeneration.sendOrderConfirmationEmail, {
            checkoutSessionId: args.checkoutSessionId,
            recipientEmail: customerEmail,
            recipientName: customerName || "Customer",
            includeInvoicePDF: false, // Don't send invoice to employee (employer gets it)
          });
          console.log("✅ Order confirmation email sent to customer:", customerEmail);
        } catch (emailError) {
          // Don't fail checkout if email fails
          console.error("⚠️ Email sending failed (non-critical):", emailError);
        }
      }

      // 13. Mark invoice as draft for admin review
      // Admin can review and send invoice to employer organization

      return {
        success: true,
        requiresUserAction: false,
        invoiceId: invoiceResult.invoiceId,
        invoiceNumber: invoiceResult.invoiceNumber,
        pdfUrl,
        status: "awaiting_employer_payment",
      };
    } catch (error) {
      console.error("Invoice payment initiation failed:", error);
      return {
        success: false,
        requiresUserAction: false,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Helper: Prepare invoice data for PDF template
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function prepareInvoiceTemplateData(invoice: Doc<"objects">): Record<string, any> {
  const props = invoice.customProperties || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const billTo = props.billTo as any;

  // Get line items with employee details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems = (props.lineItems as any[]) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employeeLineItems = lineItems.map((item: any) => ({
    employeeName: item.contactName || "Unknown",
    employeeId: item.contactId,
    description: item.description,
    quantity: 1,
    unitPrice: (item.unitPriceInCents || 0) / 100,
    totalPrice: (item.totalPriceInCents || 0) / 100,
    subItems: item.subItems || [],
  }));

  return {
    // Invoice details
    invoiceNumber: props.invoiceNumber || invoice._id.substring(0, 12),
    invoiceDate: props.invoiceDate || invoice.createdAt,
    dueDate: props.dueDate || invoice.createdAt + 30 * 24 * 60 * 60 * 1000,

    // Employer (Bill To)
    companyName: billTo?.name || "Unknown Company",
    companyVatNumber: billTo?.vatNumber,
    companyAddress: {
      line1: billTo?.billingAddress?.line1,
      line2: billTo?.billingAddress?.line2,
      city: billTo?.billingAddress?.city,
      state: billTo?.billingAddress?.state,
      postalCode: billTo?.billingAddress?.postalCode,
      country: billTo?.billingAddress?.country,
    },
    billingEmail: billTo?.billingEmail,
    billingContact: billTo?.billingContact,

    // Employee line items
    employees: employeeLineItems,

    // Totals
    subtotal: (props.subtotalInCents as number || 0) / 100,
    taxAmount: (props.taxInCents as number || 0) / 100,
    total: (props.totalInCents as number || 0) / 100,
    currency: (props.currency as string) || "EUR",

    // Payment info
    paymentTerms: props.paymentTerms || "NET30",
    notes: props.notes,
  };
}

// =========================================
// INVOICE PROVIDER CLASS (IPaymentProvider Implementation)
// =========================================

/**
 * Invoice Payment Provider
 *
 * Implements IPaymentProvider interface for B2B invoicing.
 * Does not require account connection or immediate payment.
 */
export class InvoicePaymentProvider implements IPaymentProvider {
  readonly providerCode = "invoice";
  readonly providerName = "Invoice (Pay Later)";
  readonly providerIcon = "📄";

  // =========================================
  // ACCOUNT CONNECTION (Not Applicable)
  // =========================================

  async startAccountConnection(_params: ConnectionParams): Promise<ConnectionResult> {
    // No setup needed for invoice provider - it's always available
    return {
      accountId: "invoice-system",
      status: "active",
      requiresOnboarding: false,
    };
  }

  async getAccountStatus(_accountId: string): Promise<AccountStatus> {
    return {
      accountId: "invoice-system",
      status: "active",
      chargesEnabled: true,
      payoutsEnabled: false, // Invoices don't have automatic payouts
      onboardingCompleted: true,
    };
  }

  async refreshAccountStatus(accountId: string): Promise<AccountStatus> {
    return this.getAccountStatus(accountId);
  }

  async disconnectAccount(_accountId: string): Promise<void> {
    // No-op - invoice provider is always available
  }

  // =========================================
  // CHECKOUT (Creates Invoice Instead)
  // =========================================

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    // For invoice provider, "checkout" means creating an invoice
    // The actual invoice creation happens in initiateInvoicePayment action
    // This just returns session info
    const sessionId = `invoice_sess_${Date.now()}`;

    return {
      sessionId,
      providerSessionId: sessionId,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      metadata: {
        providerType: "invoice",
        requiresEmployerPayment: true,
      },
    };
  }

  async verifyCheckoutPayment(sessionId: string): Promise<PaymentVerificationResult> {
    // Invoices don't have immediate payment verification
    // Payment is verified when employer pays the invoice
    return {
      success: false, // Not paid yet (invoice sent)
      paymentId: sessionId,
      amount: 0,
      currency: "usd",
      metadata: {
        status: "awaiting_employer_payment",
      },
    };
  }

  // =========================================
  // INVOICING (Primary Functionality)
  // =========================================

  async createInvoice(_params: InvoiceParams): Promise<InvoiceResult> {
    // This method is for future Stripe/PayPal invoicing
    // For our invoice provider, invoicing happens via initiateInvoicePayment action
    throw new Error("Invoice provider uses initiateInvoicePayment action instead");
  }

  async sendInvoice(_invoiceId: string): Promise<InvoiceSendResult> {
    throw new Error("Invoice provider uses existing invoicing system");
  }

  async markInvoiceAsPaid(_invoiceId: string): Promise<void> {
    throw new Error("Invoice provider uses existing invoicing system");
  }

  // =========================================
  // WEBHOOKS (Not Applicable)
  // =========================================

  async handleWebhook(_event: ProviderWebhookEvent): Promise<WebhookHandlingResult> {
    return {
      success: true,
      message: "Invoice provider does not use webhooks",
    };
  }

  verifyWebhookSignature(_payload: string, _signature: string): boolean {
    return false; // No webhook signature verification needed
  }
}

/**
 * Factory function to create invoice provider instance
 */
export function createInvoiceProvider(): IPaymentProvider {
  return new InvoicePaymentProvider();
}
