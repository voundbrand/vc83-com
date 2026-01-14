/**
 * VIP PREMIUM PDF TICKET TEMPLATE
 *
 * Exclusive VIP design with premium styling and VIP badge.
 * Features elevated aesthetics for VIP ticket holders.
 *
 * Features:
 * - QR code centered prominently
 * - VIP badge/indicator
 * - Premium dark color scheme
 * - Sponsor logos displayed
 */

import type {
  PdfTicketTemplateProps,
  PdfTicketTemplateOutput,
} from "../types";

/**
 * VIP Premium PDF Ticket Template
 *
 * Generates an exclusive VIP-styled PDF ticket.
 */
export async function VIPPremiumTemplate(
  props: PdfTicketTemplateProps
): Promise<PdfTicketTemplateOutput> {
  const { jsPDF } = await import("jspdf");

  const { ticket, event, order, qrCode, organization } = props;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors (VIP premium palette)
  const vipGold = "#FFD700";
  const vipSilver = "#C0C0C0";
  const darkBg = "#0f0f0f";
  const lightText = "#f5f5f5";

  // Background (very dark)
  doc.setFillColor(darkBg);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // VIP Badge (top center)
  let currentY = 20;
  doc.setFillColor(vipGold);
  const badgeWidth = 60;
  const badgeHeight = 15;
  const badgeX = (pageWidth - badgeWidth) / 2;
  doc.roundedRect(badgeX, currentY, badgeWidth, badgeHeight, 3, 3, "F");

  doc.setFontSize(12);
  doc.setTextColor(darkBg);
  doc.setFont("helvetica", "bold");
  doc.text("⭐ V I P ⭐", pageWidth / 2, currentY + 10, { align: "center" });

  currentY += 30;

  // Event Name (large, centered, gold)
  doc.setFontSize(26);
  doc.setTextColor(vipGold);
  doc.setFont("helvetica", "bold");
  const eventName = event.name;
  doc.text(eventName, pageWidth / 2, currentY, { align: "center", maxWidth: pageWidth - 40 });

  currentY += 15;

  // Ticket Type (VIP tier)
  if (ticket.subtype) {
    doc.setFontSize(16);
    doc.setTextColor(vipSilver);
    doc.setFont("helvetica", "normal");
    doc.text(ticket.subtype.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
    currentY += 12;
  }

  // Event Sponsors (VIP style)
  const sponsors = event.customProperties?.eventSponsors as Array<{ name: string; level?: string }> | undefined;
  if (sponsors && sponsors.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(vipSilver);
    doc.setFont("helvetica", "italic");

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

  currentY += 10;

  // Decorative line
  doc.setDrawColor(vipGold);
  doc.setLineWidth(1);
  doc.line(30, currentY, pageWidth - 30, currentY);

  currentY += 15;

  // QR Code (centered, prominent)
  const qrSize = 65;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = currentY;

  // QR Code border (gold frame)
  doc.setDrawColor(vipGold);
  doc.setLineWidth(2);
  doc.rect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6);

  doc.addImage(qrCode.dataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  currentY += qrSize + 10;

  doc.setFontSize(9);
  doc.setTextColor(vipSilver);
  doc.setFont("helvetica", "normal");
  doc.text("EXCLUSIVE VIP ACCESS", pageWidth / 2, currentY, { align: "center" });

  currentY += 15;

  // Decorative line
  doc.setDrawColor(vipGold);
  doc.line(30, currentY, pageWidth - 30, currentY);

  currentY += 15;

  // Event Details (centered layout)
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.setFont("helvetica", "normal");

  if (event.customProperties?.startDate) {
    const dateStr = typeof event.customProperties.startDate === "number"
      ? new Date(event.customProperties.startDate).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : event.customProperties.startDate;
    doc.text(dateStr, pageWidth / 2, currentY, { align: "center" });
    currentY += 8;
  }

  if (event.customProperties?.startTime) {
    doc.text(event.customProperties.startTime as string, pageWidth / 2, currentY, { align: "center" });
    currentY += 8;
  }

  if (event.customProperties?.location) {
    doc.setFontSize(11);
    doc.text(event.customProperties.location as string, pageWidth / 2, currentY, {
      align: "center",
      maxWidth: pageWidth - 40,
    });
    currentY += 10;
  }

  // Guest count
  if (ticket.customProperties?.guestCount && ticket.customProperties.guestCount > 0) {
    doc.setFontSize(10);
    doc.setTextColor(vipSilver);
    doc.text(`Plus ${ticket.customProperties.guestCount} Guest${ticket.customProperties.guestCount > 1 ? 's' : ''}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 10;
  }

  currentY += 5;
  doc.setDrawColor(vipGold);
  doc.line(30, currentY, pageWidth - 30, currentY);
  currentY += 12;

  // Ticket Holder (VIP style)
  doc.setFontSize(9);
  doc.setTextColor(vipSilver);
  doc.setFont("helvetica", "normal");
  doc.text("VIP TICKET HOLDER", pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(vipGold);
  const holderName = ticket.customProperties?.holderName || ticket.name || "Guest";
  doc.text(holderName, pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  if (ticket.customProperties?.holderEmail) {
    doc.setFontSize(10);
    doc.setTextColor(lightText);
    doc.setFont("helvetica", "normal");
    doc.text(ticket.customProperties.holderEmail as string, pageWidth / 2, currentY, { align: "center" });
  }

  // Order Information (bottom section)
  currentY = pageHeight - 60;
  doc.setFontSize(9);
  doc.setTextColor(vipSilver);
  doc.setFont("helvetica", "normal");

  doc.text(`Order #${order.orderId.substring(0, 12)}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  doc.text(`Purchased: ${new Date(order.orderDate).toLocaleDateString()}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  const currency = order.currency.toUpperCase();
  const totalPrice = (order.totalPrice / 100).toFixed(2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(vipGold);
  doc.text(`Total: ${currency} ${totalPrice}`, pageWidth / 2, currentY, { align: "center" });

  // Ticket Number (barcode style)
  if (ticket.ticketNumber) {
    currentY = pageHeight - 35;
    doc.setFontSize(8);
    doc.setTextColor(vipSilver);
    doc.setFont("helvetica", "normal");
    doc.text("TICKET NUMBER", pageWidth / 2, currentY, { align: "center" });

    currentY += 5;
    doc.setFontSize(12);
    doc.setTextColor(vipGold);
    doc.setFont("helvetica", "bold");
    doc.text(ticket.ticketNumber, pageWidth / 2, currentY, { align: "center" });
  }

  // Footer
  currentY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");

  const footerParts: string[] = [];
  if (organization?.name) footerParts.push(organization.name);
  if (organization?.email) footerParts.push(organization.email);

  if (footerParts.length > 0) {
    doc.text(footerParts.join(" • "), pageWidth / 2, currentY, { align: "center" });
  }

  // Gold accent bar at bottom
  doc.setFillColor(vipGold);
  doc.rect(0, pageHeight - 5, pageWidth, 5, "F");

  const pdfBase64 = doc.output("datauristring").split(",")[1];

  return {
    filename: `vip-ticket-${ticket.ticketNumber || ticket._id.substring(0, 12)}.pdf`,
    content: pdfBase64,
    contentType: "application/pdf",
  };
}
