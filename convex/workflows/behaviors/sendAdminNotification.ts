/**
 * BEHAVIOR: SEND ADMIN NOTIFICATION (Behavior 12)
 *
 * Sends an email notification to event administrators about new registrations.
 * Includes key registration details and links to admin dashboard.
 *
 * Priority: 10 (runs last, non-critical)
 *
 * Sends:
 * - Admin notification email
 * - Registration summary
 * - Links to view details
 *
 * Returns:
 * - emailSent: boolean
 * - recipients: string[]
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export const executeSendAdminNotification = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("✓ [Behavior 12/12] Send Admin Notification");

    const context = args.context as {
      eventId?: string;
      productId?: string;
      customerData?: {
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
      formResponses?: {
        attendee_category?: string;
      };
      billingMethod?: string;
      finalPrice?: number;
      ticketId?: string;
      transactionId?: string;
    };

    if (!context.eventId || !context.customerData) {
      return {
        success: false,
        error: "Event ID and customer data are required",
      };
    }

    // Get event details
    const event: any = await ctx.runQuery(api.ontologyHelpers.getObject, {
      objectId: context.eventId as Id<"objects">,
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    const eventCustomProps = event.customProperties as {
      adminEmail?: string;
      notificationEmails?: string[];
      startDate?: number;
      location?: string;
    };

    // Get admin email addresses
    const adminEmails = [
      eventCustomProps.adminEmail,
      ...(eventCustomProps.notificationEmails || []),
    ].filter((email): email is string => !!email);

    if (adminEmails.length === 0) {
      console.warn("⚠️ No admin emails configured for event");
      return {
        success: true,
        message: "No admin emails configured - skipped notification",
        data: {
          emailSent: false,
          recipients: [],
          reason: "no_recipients",
        },
      };
    }

    // Format event date
    const eventDate = eventCustomProps.startDate
      ? new Date(eventCustomProps.startDate).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "TBD";

    // Build email content
    const customerName = `${context.customerData.firstName} ${context.customerData.lastName}`;
    const priceFormatted = context.finalPrice
      ? `€${(context.finalPrice / 100).toFixed(2)}`
      : "€0.00";

    const emailSubject: string = `Neue Anmeldung: ${event.name}`;
    const emailBody = `
Neue Anmeldung für ${event.name}

TEILNEHMER:
Name: ${customerName}
E-Mail: ${context.customerData.email}
Telefon: ${context.customerData.phone || "Nicht angegeben"}
Kategorie: ${context.formResponses?.attendee_category || "Nicht angegeben"}

VERANSTALTUNG:
Event: ${event.name}
Datum: ${eventDate}
Ort: ${eventCustomProps.location || "Nicht angegeben"}

BUCHUNG:
Preis: ${priceFormatted}
Zahlungsart: ${context.billingMethod === "employer_invoice" ? "Arbeitgeber-Rechnung" : context.billingMethod === "free" ? "Kostenlos" : "Kundenzahlung"}
${context.billingMethod === "employer_invoice" ? "⚠️ Rechnung muss noch erstellt werden" : ""}

LINKS:
${context.ticketId ? `Ticket: [View in admin]` : ""}
${context.transactionId ? `Transaktion: [View in admin]` : ""}

---
Diese E-Mail wurde automatisch generiert.
    `.trim();

    try {
      // Send email to all admin recipients using the email delivery service
      const emailPromises = adminEmails.map((email) =>
        ctx.runAction(internal.emailDelivery.sendEmail, {
          to: email,
          domainConfigId: "default" as Id<"objects">, // TODO: Get from organization config
          subject: emailSubject,
          text: emailBody,
          html: emailBody, // Use same content for HTML
        })
      );

      await Promise.all(emailPromises);

      console.log(`✅ Admin notifications sent to ${adminEmails.length} recipient(s)`);
      console.log(`   Recipients: ${adminEmails.join(", ")}`);

      return {
        success: true,
        message: `Admin notifications sent to ${adminEmails.length} recipient(s)`,
        data: {
          emailSent: true,
          recipients: adminEmails,
          subject: emailSubject,
        },
      };
    } catch (error) {
      console.error("❌ Failed to send admin notification:", error);

      // Don't fail the entire workflow if admin notification fails
      return {
        success: true, // Still return success since this is non-critical
        message: "Failed to send admin notification (non-critical)",
        data: {
          emailSent: false,
          recipients: adminEmails,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  },
});
