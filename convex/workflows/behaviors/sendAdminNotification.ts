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
import type { Id } from "../../_generated/dataModel";

const generatedApi: any = require("../../_generated/api");

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

    // Get TRANSACTION (PRIMARY SOURCE OF TRUTH)
    // Transaction captures complete event data at checkout time
    let txEventName: string | undefined;
    let txEventDate: number | undefined;
    let txEventLocation: string | undefined;

    if (context.transactionId) {
      // Use generic getObject to avoid deep type instantiation issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transaction: any = await (ctx as any).runQuery(generatedApi.api.ontologyHelpers.getObject, {
        objectId: context.transactionId as Id<"objects">,
      });

      if (transaction && transaction.type === "transaction") {
        const txProps = transaction.customProperties || {};
        txEventName = txProps.eventName as string | undefined;
        txEventDate = txProps.eventStartDate as number | undefined;
        txEventLocation = (txProps.eventFormattedAddress as string) ||
          (txProps.eventLocation as string) || undefined;
        console.log("📧 [sendAdminNotification] Using transaction data for event info");
      }
    }

    // Get event details (for admin emails and fallback data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event: any = await (ctx as any).runQuery(generatedApi.api.ontologyHelpers.getObject, {
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
      formattedAddress?: string;
    };

    // Use transaction data first, fallback to event data
    const finalEventName = txEventName || (event.name as string);
    const finalEventDate = txEventDate || eventCustomProps.startDate;
    const finalEventLocation = txEventLocation ||
      eventCustomProps.formattedAddress ||
      eventCustomProps.location;

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

    // Format event date - use transaction date first
    const eventDateFormatted = finalEventDate
      ? new Date(finalEventDate).toLocaleDateString("de-DE", {
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

    const emailSubject: string = `Neue Anmeldung: ${finalEventName}`;
    const emailBody = `
Neue Anmeldung für ${finalEventName}

TEILNEHMER:
Name: ${customerName}
E-Mail: ${context.customerData.email}
Telefon: ${context.customerData.phone || "Nicht angegeben"}
Kategorie: ${context.formResponses?.attendee_category || "Nicht angegeben"}

VERANSTALTUNG:
Event: ${finalEventName}
Datum: ${eventDateFormatted}
Ort: ${finalEventLocation || "Nicht angegeben"}

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
      let emailSent: boolean;

      // DRY-RUN MODE: Skip actual email sending
      if (args.config?.dryRun) {
        emailSent = false;
        console.log(`🧪 [DRY RUN] Would send admin notifications to ${adminEmails.length} recipient(s)`);
        console.log(`   Recipients: ${adminEmails.join(", ")}`);
        console.log(`   Subject: ${emailSubject}`);
        console.log(`   Body: ${emailBody.substring(0, 150)}...`);
      } else {
        // Send email to all admin recipients using the email delivery service (PRODUCTION)
        const emailPromises = adminEmails.map((email) =>
          (ctx as any).runAction(generatedApi.internal.emailDelivery.sendEmail, {
            to: email,
            domainConfigId: "default" as Id<"objects">, // TODO: Get from organization config
            subject: emailSubject,
            text: emailBody,
            html: emailBody, // Use same content for HTML
          })
        );

        await Promise.all(emailPromises);
        emailSent = true;
        console.log(`✅ Admin notifications sent to ${adminEmails.length} recipient(s)`);
        console.log(`   Recipients: ${adminEmails.join(", ")}`);
      }

      return {
        success: true,
        message: `Admin notifications ${args.config?.dryRun ? 'prepared (dry run)' : 'sent to ' + adminEmails.length + ' recipient(s)'}`,
        data: {
          emailSent,
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
