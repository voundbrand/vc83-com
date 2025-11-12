/**
 * ELEGANT GOLD PDF TICKET TEMPLATE
 *
 * Elegant black & gold design for upscale events.
 * Inspired by geschlossene-gesellschaft aesthetic.
 *
 * Features:
 * - QR code positioned top-right
 * - Gold accent colors on dark background
 * - Sponsor logos displayed
 * - Barcode at bottom
 */

import type {
  PdfTicketTemplateProps,
  PdfTicketTemplateOutput,
} from "../types";

/**
 * Elegant Gold PDF Ticket Template
 *
 * Generates a luxurious PDF ticket with gold accents.
 */
export async function ElegantGoldTemplate(
  props: PdfTicketTemplateProps
): Promise<PdfTicketTemplateOutput> {
  // Dynamic import jsPDF (browser-only)
  const { jsPDF } = await import("jspdf");

  const { ticket, event, order, qrCode, branding, organization } = props;

  // Create PDF (A4 size)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const gold = branding.primaryColor || "#d4af37";
  const darkBg = "#1a1412";
  const lightGold = "#f4e4c1";

  // Background (dark gradient effect with rectangles)
  doc.setFillColor(darkBg);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Gold accent bar at top
  doc.setFillColor(gold);
  doc.rect(0, 0, pageWidth, 3, "F");

  // Event Name (large, centered, gold)
  doc.setFontSize(28);
  doc.setTextColor(gold);
  doc.setFont("helvetica", "bold");
  const eventName = event.name;
  doc.text(eventName, pageWidth / 2, 25, { align: "center", maxWidth: pageWidth - 100 });

  // Ticket Type / Subtype (if VIP or special tier)
  let currentY = 40;
  if (ticket.subtype) {
    doc.setFontSize(18);
    doc.setTextColor(lightGold);
    doc.setFont("helvetica", "normal");
    doc.text(ticket.subtype.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
    currentY += 12;
  }

  // Event Sponsors (if available)
  const sponsors = event.customProperties?.eventSponsors as Array<{ name: string; level?: string }> | undefined;
  if (sponsors && sponsors.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(180, 160, 120);
    doc.setFont("helvetica", "normal");

    if (sponsors.length === 1) {
      doc.text(`Presented by ${sponsors[0].name}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 8;
    } else {
      doc.text("Presented by:", pageWidth / 2, currentY, { align: "center" });
      currentY += 6;
      doc.setFontSize(9);
      sponsors.forEach((sponsor) => {
        const sponsorText = sponsor.level ? `${sponsor.name} (${sponsor.level})` : sponsor.name;
        doc.text(`• ${sponsorText}`, pageWidth / 2, currentY, { align: "center" });
        currentY += 5;
      });
      currentY += 3;
    }
  }

  // QR Code (top-right, large)
  const qrSize = 55;
  const qrX = pageWidth - qrSize - 15;
  const qrY = 50;
  doc.addImage(qrCode.dataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  // QR Code Label
  doc.setFontSize(8);
  doc.setTextColor(150, 140, 120);
  doc.text("SCAN TO VERIFY", qrX + qrSize / 2, qrY + qrSize + 5, { align: "center" });

  // Event Details Box (left side, elegant design)
  currentY += 15;
  const boxX = 20;
  const boxWidth = pageWidth - qrSize - 50;

  // Gold decorative line
  doc.setDrawColor(gold);
  doc.setLineWidth(0.5);
  doc.line(boxX, currentY, boxX + boxWidth, currentY);
  currentY += 8;

  doc.setFontSize(9);
  doc.setTextColor(180, 160, 120);
  doc.setFont("helvetica", "bold");
  doc.text("EVENT DETAILS", boxX, currentY);
  currentY += 8;

  // Event info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(230, 220, 200);

  if (event.customProperties?.startDate) {
    doc.setTextColor(160, 140, 100);
    doc.setFontSize(9);
    doc.text("DATE:", boxX, currentY);
    doc.setTextColor(230, 220, 200);
    doc.setFontSize(11);
    const dateStr = typeof event.customProperties.startDate === "number"
      ? new Date(event.customProperties.startDate).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : event.customProperties.startDate;
    doc.text(dateStr, boxX + 20, currentY);
    currentY += 8;
  }

  if (event.customProperties?.startTime) {
    doc.setTextColor(160, 140, 100);
    doc.setFontSize(9);
    doc.text("TIME:", boxX, currentY);
    doc.setTextColor(230, 220, 200);
    doc.setFontSize(11);
    doc.text(event.customProperties.startTime as string, boxX + 20, currentY);
    currentY += 8;
  }

  if (event.customProperties?.location) {
    doc.setTextColor(160, 140, 100);
    doc.setFontSize(9);
    doc.text("VENUE:", boxX, currentY);
    doc.setTextColor(230, 220, 200);
    doc.setFontSize(11);
    doc.text(event.customProperties.location as string, boxX + 20, currentY, {
      maxWidth: boxWidth - 25,
    });
    currentY += 8;
  }

  // Guest count
  if (ticket.customProperties?.guestCount && ticket.customProperties.guestCount > 0) {
    doc.setTextColor(160, 140, 100);
    doc.setFontSize(9);
    doc.text("GUESTS:", boxX, currentY);
    doc.setTextColor(230, 220, 200);
    doc.setFontSize(11);
    doc.text(`+${ticket.customProperties.guestCount}`, boxX + 20, currentY);
    currentY += 8;
  }

  currentY += 5;
  doc.setDrawColor(gold);
  doc.line(boxX, currentY, boxX + boxWidth, currentY);
  currentY += 10;

  // Ticket Holder Information
  doc.setFontSize(9);
  doc.setTextColor(180, 160, 120);
  doc.setFont("helvetica", "bold");
  doc.text("TICKET HOLDER", boxX, currentY);
  currentY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(gold);
  const holderName = ticket.customProperties?.holderName || ticket.name || "Guest";
  doc.text(holderName, boxX, currentY);
  currentY += 8;

  if (ticket.customProperties?.holderEmail) {
    doc.setFontSize(10);
    doc.setTextColor(200, 190, 170);
    doc.text(ticket.customProperties.holderEmail as string, boxX, currentY);
    currentY += 8;
  }

  // Order Information
  currentY += 5;
  doc.setDrawColor(gold);
  doc.line(boxX, currentY, boxX + boxWidth, currentY);
  currentY += 10;

  doc.setFontSize(9);
  doc.setTextColor(180, 160, 120);
  doc.setFont("helvetica", "bold");
  doc.text("ORDER INFORMATION", boxX, currentY);
  currentY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 190, 170);

  // Order ID
  doc.text(`Order #${order.orderId.substring(0, 12)}`, boxX, currentY);
  currentY += 6;

  // Order Date
  const orderDate = new Date(order.orderDate).toLocaleDateString();
  doc.text(`Purchased: ${orderDate}`, boxX, currentY);
  currentY += 6;

  // Pricing
  const currency = order.currency.toUpperCase();
  const netPrice = (order.netPrice / 100).toFixed(2);
  const taxAmount = (order.taxAmount / 100).toFixed(2);
  const totalPrice = (order.totalPrice / 100).toFixed(2);

  doc.text(`Price: ${currency} ${netPrice}`, boxX, currentY);
  currentY += 6;

  if (order.taxAmount > 0) {
    doc.text(`Tax (${order.taxRate.toFixed(1)}%): ${currency} ${taxAmount}`, boxX, currentY);
    currentY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(gold);
  doc.text(`Total: ${currency} ${totalPrice}`, boxX, currentY);

  // Barcode (ticket number at bottom)
  if (ticket.ticketNumber) {
    currentY = pageHeight - 35;
    doc.setFontSize(8);
    doc.setTextColor(150, 140, 120);
    doc.setFont("helvetica", "normal");
    doc.text("TICKET NUMBER", pageWidth / 2, currentY, { align: "center" });

    currentY += 5;
    doc.setFontSize(11);
    doc.setTextColor(gold);
    doc.setFont("helvetica", "bold");
    doc.text(ticket.ticketNumber, pageWidth / 2, currentY, { align: "center" });
  }

  // Footer with organization info
  currentY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(130, 120, 100);
  doc.setFont("helvetica", "normal");

  const footerParts: string[] = [];
  if (organization?.name) footerParts.push(organization.name);
  if (organization?.email) footerParts.push(organization.email);
  if (organization?.phone) footerParts.push(organization.phone);
  if (organization?.website) footerParts.push(organization.website);

  if (footerParts.length > 0) {
    doc.text(footerParts.join(" • "), pageWidth / 2, currentY, { align: "center" });
  }

  // Gold accent bar at bottom
  doc.setFillColor(gold);
  doc.rect(0, pageHeight - 3, pageWidth, 3, "F");

  // Convert to base64
  const pdfBase64 = doc.output("datauristring").split(",")[1];

  return {
    filename: `ticket-${ticket.ticketNumber || ticket._id.substring(0, 12)}.pdf`,
    content: pdfBase64,
    contentType: "application/pdf",
  };
}
