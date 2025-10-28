/**
 * TEMPLATE-BASED PDF GENERATION
 *
 * New template-driven PDF generation system that uses the template registry
 * to generate PDFs based on predefined templates.
 *
 * This works alongside the existing pdfGeneration.ts and will gradually replace it.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  type TemplateId,
  getTemplateById,
  validateTemplateData,
} from "./pdfTemplates";

type PDFAttachment = {
  filename: string;
  content: string; // base64
  contentType: string;
};

// ============================================================================
// CORE TEMPLATE RENDERING
// ============================================================================

/**
 * GENERATE PDF FROM TEMPLATE
 *
 * Core function that generates a PDF using the specified template and data.
 * This is the engine that powers all template-based PDF generation.
 */
export const generatePdfFromTemplate = action({
  args: {
    templateId: v.union(
      v.literal("b2c_receipt"),
      v.literal("b2b_single"),
      v.literal("b2b_consolidated"),
      v.literal("b2b_consolidated_detailed")
    ),
    data: v.any(), // Template data (validated against template schema)
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    try {
      const { jsPDF } = await import("jspdf");

      // 1. Get template
      const template = getTemplateById(args.templateId as TemplateId);
      if (!template) {
        throw new Error(`Template not found: ${args.templateId}`);
      }

      // 2. Validate data
      const validation = validateTemplateData(args.templateId as TemplateId, args.data);
      if (!validation.valid) {
        throw new Error(
          `Invalid template data. Missing fields: ${validation.missingFields.join(", ")}`
        );
      }

      // 3. Get seller organization info for footer
      const sellerOrg = await ctx.runQuery(
        api.organizationOntology.getOrganizationProfile,
        { organizationId: args.organizationId }
      ) as Doc<"objects"> | null;

      const sellerLegal = await ctx.runQuery(
        api.organizationOntology.getOrganizationLegal,
        { organizationId: args.organizationId }
      ) as Doc<"objects"> | null;

      const sellerContact = await ctx.runQuery(
        api.organizationOntology.getOrganizationContact,
        { organizationId: args.organizationId }
      ) as Doc<"objects"> | null;

      // Get organization record for business name
      const organization = await ctx.runQuery(
        internal.checkoutSessions.getOrganizationInternal,
        { organizationId: args.organizationId }
      );

      // 4. Route to appropriate renderer
      let pdfBase64: string;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const renderContext = {
        sellerOrg,
        sellerLegal,
        sellerContact,
        organization,
        styling: template.defaultStyling,
      };

      switch (args.templateId) {
        case "b2c_receipt":
          pdfBase64 = await renderB2CReceipt(doc, args.data, renderContext);
          break;

        case "b2b_single":
          pdfBase64 = await renderB2BSingle(doc, args.data, renderContext);
          break;

        case "b2b_consolidated":
          pdfBase64 = await renderB2BConsolidated(doc, args.data, renderContext);
          break;

        case "b2b_consolidated_detailed":
          pdfBase64 = await renderB2BConsolidatedDetailed(doc, args.data, renderContext);
          break;

        default:
          throw new Error(`Template renderer not implemented: ${args.templateId}`);
      }

      return {
        filename: `${args.templateId}-${Date.now()}.pdf`,
        content: pdfBase64,
        contentType: "application/pdf",
      };
    } catch (error) {
      console.error("Failed to generate PDF from template:", error);
      return null;
    }
  },
});

// ============================================================================
// TEMPLATE RENDERERS
// ============================================================================

/**
 * Render B2C Receipt Template
 */
async function renderB2CReceipt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  context: {
    sellerOrg: Doc<"objects"> | null;
    sellerLegal: Doc<"objects"> | null;
    sellerContact: Doc<"objects"> | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    organization: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    styling: any;
  }
): Promise<string> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header - "RECEIPT"
  doc.setFontSize(20);
  doc.setTextColor(107, 70, 193); // Purple from styling
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT", 20, 25);

  // Order number and date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Order #${data.orderNumber}`, pageWidth - 15, 25, { align: "right" });
  doc.text(
    `Date: ${new Date(data.orderDate).toLocaleDateString()}`,
    pageWidth - 15,
    32,
    { align: "right" }
  );

  // Seller Info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("FROM:", 20, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let yPos = 52;

  const businessName = context.sellerLegal?.customProperties?.legalEntityName as string | undefined ||
    context.organization?.businessName ||
    context.organization?.name ||
    context.sellerOrg?.name ||
    "L4YERCAK3.com";
  doc.text(businessName, 20, yPos);
  yPos += 6;

  if (context.sellerContact?.customProperties?.primaryEmail) {
    doc.text(context.sellerContact.customProperties.primaryEmail as string, 20, yPos);
    yPos += 6;
  }

  // Customer Info
  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text("TO:", 20, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.text(data.customerName, 20, yPos);
  yPos += 6;
  doc.text(data.customerEmail, 20, yPos);
  yPos += 12;

  // Line Items Table
  doc.setFont("helvetica", "bold");
  doc.text("ITEMS:", 20, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Table headers
  doc.setTextColor(100, 100, 100);
  doc.text("Description", 20, yPos);
  doc.text("Qty", pageWidth - 80, yPos);
  doc.text("Price", pageWidth - 55, yPos);
  doc.text("Total", pageWidth - 30, yPos);
  yPos += 6;

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 6;

  // Items
  doc.setTextColor(0, 0, 0);
  for (const item of data.lineItems) {
    const unitPrice = (item.unitPrice / 100).toFixed(2);
    const totalPrice = (item.totalPrice / 100).toFixed(2);

    doc.text(item.description, 20, yPos, { maxWidth: pageWidth - 120 });
    doc.text(item.quantity.toString(), pageWidth - 80, yPos);
    doc.text(`€${unitPrice}`, pageWidth - 55, yPos);
    doc.text(`€${totalPrice}`, pageWidth - 30, yPos);
    yPos += 6;
  }

  // Totals
  yPos += 6;
  doc.line(pageWidth - 60, yPos, pageWidth - 20, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", pageWidth - 60, yPos);
  doc.text(`€${(data.subtotal / 100).toFixed(2)}`, pageWidth - 30, yPos);
  yPos += 6;

  if (data.taxAmount > 0) {
    doc.text("Tax:", pageWidth - 60, yPos);
    doc.text(`€${(data.taxAmount / 100).toFixed(2)}`, pageWidth - 30, yPos);
    yPos += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL:", pageWidth - 60, yPos);
  doc.text(`€${(data.total / 100).toFixed(2)}`, pageWidth - 30, yPos);
  yPos += 10;

  // Payment method
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Payment Method: ${data.paymentMethod}`, 20, yPos);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your purchase!", 20, pageHeight - 20);

  return doc.output("datauristring").split(",")[1];
}

/**
 * Render B2B Single Invoice Template
 */
async function renderB2BSingle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
): Promise<string> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header - "INVOICE"
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235); // Blue from styling
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 20, 25);

  // Invoice details (right side)
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  let rightY = 25;
  doc.text(`Invoice #${data.invoiceNumber}`, pageWidth - 15, rightY, { align: "right" });
  rightY += 6;
  doc.text(`Date: ${new Date(data.invoiceDate).toLocaleDateString()}`, pageWidth - 15, rightY, { align: "right" });
  rightY += 6;
  doc.text(`Due: ${new Date(data.dueDate).toLocaleDateString()}`, pageWidth - 15, rightY, { align: "right" });
  rightY += 6;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 50, 50);
  doc.text(`Payment Terms: ${data.paymentTerms.toUpperCase()}`, pageWidth - 15, rightY, { align: "right" });

  // FROM (Seller)
  let yPos = 50;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("FROM:", 20, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const businessName = context.sellerLegal?.customProperties?.legalEntityName as string | undefined ||
    context.organization?.businessName ||
    "L4YERCAK3.com";
  doc.text(businessName, 20, yPos);
  yPos += 5;

  if (context.sellerLegal?.customProperties?.address) {
    doc.text(context.sellerLegal.customProperties.address as string, 20, yPos);
    yPos += 5;
  }

  if (context.sellerLegal?.customProperties?.vatNumber) {
    doc.text(`VAT: ${context.sellerLegal.customProperties.vatNumber}`, 20, yPos);
    yPos += 5;
  }

  // BILL TO (Buyer)
  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BILL TO:", 20, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.billTo.name, 20, yPos);
  yPos += 5;

  if (data.billTo.billingContact) {
    doc.text(`Attn: ${data.billTo.billingContact}`, 20, yPos);
    yPos += 5;
  }

  if (data.billTo.billingAddress) {
    const addr = data.billTo.billingAddress;
    if (addr.line1) {
      doc.text(addr.line1, 20, yPos);
      yPos += 5;
    }
    const cityLine = [addr.city, addr.postalCode, addr.country].filter(Boolean).join(", ");
    doc.text(cityLine, 20, yPos);
    yPos += 5;
  }

  if (data.billTo.vatNumber) {
    doc.text(`VAT: ${data.billTo.vatNumber}`, 20, yPos);
    yPos += 5;
  }

  // Line Items
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DESCRIPTION", 20, yPos);
  doc.text("AMOUNT", pageWidth - 40, yPos);
  yPos += 5;

  doc.setDrawColor(0, 0, 0);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const item of data.lineItems) {
    doc.text(item.description, 20, yPos, { maxWidth: pageWidth - 70 });
    doc.text(`€${(item.totalPrice / 100).toFixed(2)}`, pageWidth - 40, yPos);
    yPos += 7;
  }

  // Totals section
  yPos += 5;
  doc.line(pageWidth - 70, yPos, pageWidth - 20, yPos);
  yPos += 7;

  doc.text("Subtotal:", pageWidth - 70, yPos);
  doc.text(`€${(data.subtotal / 100).toFixed(2)}`, pageWidth - 40, yPos);
  yPos += 6;

  if (data.taxAmount > 0) {
    doc.text("Tax:", pageWidth - 70, yPos);
    doc.text(`€${(data.taxAmount / 100).toFixed(2)}`, pageWidth - 40, yPos);
    yPos += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL DUE:", pageWidth - 70, yPos);
  doc.text(`€${(data.total / 100).toFixed(2)}`, pageWidth - 40, yPos);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Please remit payment within ${data.paymentTerms} days.`, 20, pageHeight - 20);

  return doc.output("datauristring").split(",")[1];
}

/**
 * Render B2B Consolidated Invoice Template
 */
async function renderB2BConsolidated(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
): Promise<string> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header - "CONSOLIDATED INVOICE"
  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105); // Green from styling
  doc.setFont("helvetica", "bold");
  doc.text("CONSOLIDATED INVOICE", 20, 25);

  // Event name subtitle
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(data.eventName, 20, 33);

  // Invoice details (right side)
  doc.setFontSize(10);
  let rightY = 25;
  doc.setTextColor(60, 60, 60);
  doc.text(`Invoice #${data.invoiceNumber}`, pageWidth - 15, rightY, { align: "right" });
  rightY += 6;
  doc.text(`Date: ${new Date(data.invoiceDate).toLocaleDateString()}`, pageWidth - 15, rightY, { align: "right" });
  rightY += 6;
  doc.text(`Due: ${new Date(data.dueDate).toLocaleDateString()}`, pageWidth - 15, rightY, { align: "right" });
  rightY += 6;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 50, 50);
  doc.text(`${data.paymentTerms.toUpperCase()}`, pageWidth - 15, rightY, { align: "right" });

  // FROM + BILL TO side by side
  let yPos = 50;
  const columnWidth = (pageWidth - 50) / 2;

  // FROM (left column)
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("FROM:", 20, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let leftY = yPos + 7;
  const businessName = context.sellerLegal?.customProperties?.legalEntityName as string | undefined ||
    context.organization?.businessName ||
    "L4YERCAK3.com";
  doc.text(businessName, 20, leftY);
  leftY += 5;

  if (context.sellerContact?.customProperties?.primaryEmail) {
    doc.text(context.sellerContact.customProperties.primaryEmail as string, 20, leftY);
  }

  // BILL TO (right column)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const rightColX = 20 + columnWidth + 10;
  doc.text("BILL TO:", rightColX, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let rightColY = yPos + 7;
  doc.text(data.billTo.name, rightColX, rightColY);
  rightColY += 5;

  if (data.billTo.billingContact) {
    doc.text(`Attn: ${data.billTo.billingContact}`, rightColX, rightColY);
    rightColY += 5;
  }

  if (data.billTo.vatNumber) {
    doc.text(`VAT: ${data.billTo.vatNumber}`, rightColX, rightColY);
  }

  // Employee summary box
  yPos = Math.max(leftY, rightColY) + 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, pageWidth - 40, 12, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${data.employeeCount} Employees Registered`, 25, yPos + 8);

  // Line Items Table
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("EMPLOYEE NAME", 20, yPos);
  doc.text("AMOUNT", pageWidth - 40, yPos);
  yPos += 5;

  doc.setDrawColor(0, 0, 0);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;

  // List employees
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const item of data.lineItems) {
    doc.text(item.description, 20, yPos);
    doc.text(`€${(item.totalPrice / 100).toFixed(2)}`, pageWidth - 40, yPos);
    yPos += 7;
  }

  // Totals
  yPos += 5;
  doc.line(pageWidth - 70, yPos, pageWidth - 20, yPos);
  yPos += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL DUE:", pageWidth - 70, yPos);
  doc.text(`€${(data.total / 100).toFixed(2)}`, pageWidth - 40, yPos);

  // Payment instructions
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Please remit payment to the billing address above.", 20, yPos);
  doc.text(`Payment due: ${new Date(data.dueDate).toLocaleDateString()}`, 20, yPos + 6);

  return doc.output("datauristring").split(",")[1];
}

/**
 * Render B2B Consolidated Detailed Invoice Template
 */
async function renderB2BConsolidatedDetailed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
): Promise<string> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Similar to consolidated but with sub-items shown
  // Header
  doc.setFontSize(20);
  doc.setTextColor(124, 58, 237); // Purple from styling
  doc.setFont("helvetica", "bold");
  doc.text("CONSOLIDATED INVOICE (DETAILED)", 20, 25);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(data.eventName, 20, 33);

  // Invoice details
  doc.setFontSize(10);
  let rightY = 25;
  doc.setTextColor(60, 60, 60);
  doc.text(`Invoice #${data.invoiceNumber}`, pageWidth - 15, rightY, { align: "right" });
  rightY += 6;
  doc.text(`Date: ${new Date(data.invoiceDate).toLocaleDateString()}`, pageWidth - 15, rightY, { align: "right" });
  rightY += 6;
  doc.text(`Due: ${new Date(data.dueDate).toLocaleDateString()}`, pageWidth - 15, rightY, { align: "right" });

  // FROM + BILL TO
  let yPos = 50;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("FROM:", 20, yPos);
  doc.text("BILL TO:", pageWidth / 2 + 10, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const businessName = context.organization?.businessName || "L4YERCAK3.com";
  doc.text(businessName, 20, yPos + 7);
  doc.text(data.billTo.name, pageWidth / 2 + 10, yPos + 7);

  // Line Items with sub-items
  yPos += 25;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("EMPLOYEE & ITEMS", 20, yPos);
  doc.text("AMOUNT", pageWidth - 40, yPos);
  yPos += 5;

  doc.setDrawColor(0, 0, 0);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const item of data.lineItems) {
    // Employee name (bold)
    doc.setFont("helvetica", "bold");
    doc.text(item.description, 20, yPos);
    doc.text(`€${(item.totalPrice / 100).toFixed(2)}`, pageWidth - 40, yPos);
    yPos += 6;

    // Sub-items (indented, smaller)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    if (item.subItems) {
      for (const subItem of item.subItems) {
        doc.text(`  • ${subItem.description}`, 25, yPos);
        doc.text(`€${(subItem.price / 100).toFixed(2)}`, pageWidth - 40, yPos);
        yPos += 5;
      }
    }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    yPos += 3;
  }

  // Totals
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.line(pageWidth - 70, yPos, pageWidth - 20, yPos);
  yPos += 7;

  doc.text("TOTAL DUE:", pageWidth - 70, yPos);
  doc.text(`€${(data.total / 100).toFixed(2)}`, pageWidth - 40, yPos);

  return doc.output("datauristring").split(",")[1];
}
