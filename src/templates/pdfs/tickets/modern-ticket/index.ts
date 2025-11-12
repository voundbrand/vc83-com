/**
 * MODERN TICKET PDF TEMPLATE
 *
 * Clean, contemporary design with bold typography.
 * Ideal for tech events, conferences, and modern brands.
 *
 * Features:
 * - QR code positioned bottom-right
 * - Clean layout with ample whitespace
 * - Bold typography
 * - Light color scheme
 */

import type {
  PdfTicketTemplateProps,
  PdfTicketTemplateOutput,
} from "../types";

/**
 * Modern Ticket PDF Template
 *
 * Generates a clean, modern PDF ticket.
 */
export async function ModernTicketTemplate(
  props: PdfTicketTemplateProps
): Promise<PdfTicketTemplateOutput> {
  const { jsPDF } = await import("jspdf");

  const { ticket, event, order, qrCode, branding, organization } = props;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors (modern, clean palette)
  const primary = branding.primaryColor || "#6B46C1"; // Purple
  const dark = "#2D3748";
  const gray = "#718096";
  const lightGray = "#EDF2F7";

  // Background (light)
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Colored accent bar at top
  doc.setFillColor(primary);
  doc.rect(0, 0, pageWidth, 8, "F");

  // Event Name (large, bold, modern)
  let currentY = 30;
  doc.setFontSize(32);
  doc.setTextColor(dark);
  doc.setFont("helvetica", "bold");
  const eventName = event.name;
  doc.text(eventName, 20, currentY, { maxWidth: pageWidth - 40 });
  currentY += 15;

  // Ticket Type (if specified)
  if (ticket.subtype) {
    doc.setFontSize(14);
    doc.setTextColor(gray);
    doc.setFont("helvetica", "normal");
    doc.text(ticket.subtype.toUpperCase(), 20, currentY);
    currentY += 12;
  }

  // Divider line
  doc.setDrawColor(lightGray);
  doc.setLineWidth(0.5);
  doc.line(20, currentY, pageWidth - 20, currentY);
  currentY += 15;

  // Event Details (clean list format)
  doc.setFontSize(11);
  doc.setTextColor(gray);
  doc.setFont("helvetica", "bold");

  if (event.customProperties?.startDate) {
    doc.text("DATE", 20, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(dark);
    const dateStr = typeof event.customProperties.startDate === "number"
      ? new Date(event.customProperties.startDate).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : event.customProperties.startDate;
    doc.text(dateStr, 70, currentY);
    currentY += 10;
  }

  if (event.customProperties?.startTime) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(gray);
    doc.text("TIME", 20, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(dark);
    doc.text(event.customProperties.startTime as string, 70, currentY);
    currentY += 10;
  }

  if (event.customProperties?.location) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(gray);
    doc.text("LOCATION", 20, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(dark);
    doc.text(event.customProperties.location as string, 70, currentY, {
      maxWidth: pageWidth - 90,
    });
    currentY += 10;
  }

  if (ticket.customProperties?.guestCount && ticket.customProperties.guestCount > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(gray);
    doc.text("GUESTS", 20, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(dark);
    doc.text(`+${ticket.customProperties.guestCount}`, 70, currentY);
    currentY += 10;
  }

  currentY += 10;
  doc.setDrawColor(lightGray);
  doc.line(20, currentY, pageWidth - 20, currentY);
  currentY += 15;

  // Ticket Holder
  doc.setFontSize(11);
  doc.setTextColor(gray);
  doc.setFont("helvetica", "bold");
  doc.text("TICKET HOLDER", 20, currentY);
  currentY += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(dark);
  const holderName = ticket.customProperties?.holderName || ticket.name || "Guest";
  doc.text(holderName, 20, currentY);
  currentY += 8;

  if (ticket.customProperties?.holderEmail) {
    doc.setFontSize(11);
    doc.setTextColor(gray);
    doc.setFont("helvetica", "normal");
    doc.text(ticket.customProperties.holderEmail as string, 20, currentY);
    currentY += 8;
  }

  // Order Summary
  currentY += 10;
  doc.setDrawColor(lightGray);
  doc.line(20, currentY, pageWidth - 20, currentY);
  currentY += 12;

  doc.setFontSize(11);
  doc.setTextColor(gray);
  doc.setFont("helvetica", "bold");
  doc.text("ORDER SUMMARY", 20, currentY);
  currentY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const currency = order.currency.toUpperCase();
  const netPrice = (order.netPrice / 100).toFixed(2);
  const taxAmount = (order.taxAmount / 100).toFixed(2);
  const totalPrice = (order.totalPrice / 100).toFixed(2);

  doc.text(`Order #${order.orderId.substring(0, 12)}`, 20, currentY);
  currentY += 6;

  doc.text(`Purchased: ${new Date(order.orderDate).toLocaleDateString()}`, 20, currentY);
  currentY += 10;

  doc.text(`Subtotal:`, 20, currentY);
  doc.text(`${currency} ${netPrice}`, 80, currentY);
  currentY += 6;

  if (order.taxAmount > 0) {
    doc.text(`Tax (${order.taxRate.toFixed(1)}%):`, 20, currentY);
    doc.text(`${currency} ${taxAmount}`, 80, currentY);
    currentY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(dark);
  doc.setFontSize(12);
  doc.text(`Total:`, 20, currentY);
  doc.text(`${currency} ${totalPrice}`, 80, currentY);

  // QR Code (bottom-right)
  const qrSize = 50;
  const qrX = pageWidth - qrSize - 20;
  const qrY = pageHeight - qrSize - 40;
  doc.addImage(qrCode.dataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  doc.setFontSize(8);
  doc.setTextColor(gray);
  doc.setFont("helvetica", "normal");
  doc.text("Scan to verify", qrX + qrSize / 2, qrY + qrSize + 5, { align: "center" });

  // Ticket Number
  if (ticket.ticketNumber) {
    doc.setFontSize(9);
    doc.setTextColor(gray);
    doc.text(`Ticket: ${ticket.ticketNumber}`, 20, pageHeight - 30);
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(gray);

  const footerParts: string[] = [];
  if (organization?.name) footerParts.push(organization.name);
  if (organization?.email) footerParts.push(organization.email);

  if (footerParts.length > 0) {
    doc.text(footerParts.join(" • "), pageWidth / 2, footerY, { align: "center" });
  }

  // Colored accent bar at bottom
  doc.setFillColor(primary);
  doc.rect(0, pageHeight - 5, pageWidth, 5, "F");

  const pdfBase64 = doc.output("datauristring").split(",")[1];

  return {
    filename: `ticket-${ticket.ticketNumber || ticket._id.substring(0, 12)}.pdf`,
    content: pdfBase64,
    contentType: "application/pdf",
  };
}
