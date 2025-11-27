/**
 * TICKET PROFESSIONAL V1 SCHEMA
 *
 * Schema definition for the Professional Ticket email template.
 * This demonstrates the new schema-based approach where templates are
 * defined as JSON rather than hardcoded React components.
 *
 * Benefits:
 * - AI can generate/modify this schema
 * - Live preview renders directly from schema
 * - Easy to version and validate
 * - No complex rendering logic needed
 */

import type { EmailTemplateSchema } from "../template-schema";

export const ticketProfessionalV1Schema: EmailTemplateSchema = {
  // Metadata
  version: "1.0.0",
  type: "email",
  category: "ticket",
  code: "ticket_professional_v1",
  name: "Professional Ticket",
  description: "Clean, professional ticket confirmation email with QR code and event details",
  author: "System",
  createdAt: Date.now(),

  // Email specific
  subject: "Your Ticket for {{event.name}}",
  preheader: "Event on {{event.date}} - Ticket #{{ticket.ticketNumber}}",

  // Template Variables
  variables: [
    // Ticket data
    {
      name: "ticket.ticketNumber",
      type: "string",
      required: true,
      description: "Unique ticket identifier"
    },
    {
      name: "ticket.qrData",
      type: "string",
      required: true,
      description: "QR code data for ticket scanning"
    },
    {
      name: "ticket.status",
      type: "string",
      required: true,
      description: "Ticket status (issued, cancelled, etc.)"
    },
    {
      name: "ticket.guestCount",
      type: "number",
      required: false,
      description: "Number of guests on this ticket"
    },
    {
      name: "ticket.price",
      type: "number",
      required: false,
      description: "Price paid for ticket in cents"
    },
    // Event data
    {
      name: "event.name",
      type: "string",
      required: true,
      description: "Event name"
    },
    {
      name: "event.imageUrl",
      type: "image",
      required: false,
      description: "Event hero image URL"
    },
    {
      name: "event.date",
      type: "string",
      required: true,
      description: "Formatted event date"
    },
    {
      name: "event.time",
      type: "string",
      required: true,
      description: "Formatted event time"
    },
    {
      name: "event.location",
      type: "string",
      required: true,
      description: "Event location/venue"
    },
    {
      name: "event.description",
      type: "string",
      required: false,
      description: "Event description"
    },
    // Attendee data
    {
      name: "attendee.firstName",
      type: "string",
      required: true,
      description: "Attendee first name"
    },
    {
      name: "attendee.lastName",
      type: "string",
      required: true,
      description: "Attendee last name"
    },
    {
      name: "attendee.email",
      type: "string",
      required: true,
      description: "Attendee email"
    },
    // Domain/branding data
    {
      name: "domain.name",
      type: "string",
      required: true,
      description: "Organization/domain name"
    },
    {
      name: "branding.logoUrl",
      type: "image",
      required: false,
      description: "Organization logo URL"
    },
    {
      name: "branding.primaryColor",
      type: "string",
      required: false,
      description: "Brand primary color"
    }
  ],

  // Layout Sections
  layout: {
    sections: [
      // Header with logo
      {
        id: "header",
        type: "header",
        order: 1,
        visible: true,
        content: {
          logo: "{{branding.logoUrl}}",
          text: "{{domain.name}}",
          height: "80px",
          alignment: "center",
          showBorder: true
        },
        spacing: {
          paddingTop: "24px",
          paddingBottom: "24px"
        },
        backgroundColor: "#FFFFFF"
      },

      // Hero image (if available)
      {
        id: "hero",
        type: "hero-image",
        order: 2,
        visible: true,
        condition: "{{event.imageUrl}}", // Only show if image exists
        content: {
          imageUrl: "{{event.imageUrl}}",
          altText: "{{event.name}}",
          height: "300px",
          fit: "cover"
        }
      },

      // Welcome message
      {
        id: "welcome",
        type: "text-block",
        order: 3,
        visible: true,
        content: {
          title: "You're Going to {{event.name}}!",
          body: "Hi {{attendee.firstName}}, your ticket is confirmed. We can't wait to see you there!",
          alignment: "center",
          fontSize: {
            title: "24px",
            body: "16px"
          },
          fontWeight: {
            title: "bold",
            body: "normal"
          }
        },
        spacing: {
          paddingTop: "32px",
          paddingBottom: "24px"
        },
        backgroundColor: "#F9FAFB"
      },

      // QR Code
      {
        id: "qr-code",
        type: "qr-code",
        order: 4,
        visible: true,
        content: {
          data: "{{ticket.qrData}}",
          size: 200,
          errorCorrection: "H",
          label: "Scan this QR code at the event",
          alignment: "center",
          backgroundColor: "#FFFFFF",
          foregroundColor: "#000000"
        },
        spacing: {
          paddingTop: "24px",
          paddingBottom: "24px"
        },
        backgroundColor: "#FFFFFF",
        border: {
          width: "2px",
          color: "#E5E7EB",
          style: "solid",
          radius: "8px"
        }
      },

      // Ticket details
      {
        id: "ticket-info",
        type: "data-table",
        order: 5,
        visible: true,
        content: {
          title: "Ticket Information",
          columns: [
            {
              id: "label",
              label: "",
              field: "label",
              width: "40%",
              alignment: "left",
              format: "text"
            },
            {
              id: "value",
              label: "",
              field: "value",
              width: "60%",
              alignment: "right",
              format: "text"
            }
          ],
          dataSource: "ticket.details", // This would be transformed from ticket data
          showHeader: false,
          zebra: true
        },
        spacing: {
          marginTop: "32px",
          marginBottom: "32px"
        }
      },

      // Event details
      {
        id: "event-details",
        type: "event-details",
        order: 6,
        visible: true,
        content: {
          showName: true,
          showDate: true,
          showTime: true,
          showLocation: true,
          showDescription: true,
          showMap: false,
          layout: "card"
        },
        spacing: {
          marginBottom: "32px"
        },
        backgroundColor: "#F9FAFB",
        border: {
          width: "1px",
          color: "#E5E7EB",
          style: "solid",
          radius: "8px"
        }
      },

      // View ticket button
      {
        id: "view-button",
        type: "button",
        order: 7,
        visible: true,
        content: {
          text: "View Ticket Online",
          url: "{{ticket.viewUrl}}",
          alignment: "center",
          style: "primary",
          size: "large",
          fullWidth: false
        },
        spacing: {
          marginTop: "24px",
          marginBottom: "32px"
        }
      },

      // Divider
      {
        id: "divider",
        type: "divider",
        order: 8,
        visible: true,
        content: {
          style: "solid",
          color: "#E5E7EB",
          width: "100%",
          thickness: "1px"
        },
        spacing: {
          marginTop: "32px",
          marginBottom: "32px"
        }
      },

      // Help text
      {
        id: "help-text",
        type: "text-block",
        order: 9,
        visible: true,
        content: {
          title: "Need Help?",
          body: "If you have any questions about your ticket or the event, please contact us. We're here to help!",
          alignment: "center",
          fontSize: {
            title: "18px",
            body: "14px"
          },
          color: {
            title: "#374151",
            body: "#6B7280"
          }
        },
        spacing: {
          marginBottom: "32px"
        }
      },

      // Footer
      {
        id: "footer",
        type: "footer",
        order: 10,
        visible: true,
        content: {
          text: "© {{currentYear}} {{domain.name}}. All rights reserved.",
          alignment: "center",
          showSocialLinks: false
        },
        spacing: {
          paddingTop: "24px",
          paddingBottom: "24px"
        },
        backgroundColor: "#F9FAFB",
        border: {
          width: "1px 0 0 0",
          color: "#E5E7EB",
          style: "solid"
        }
      }
    ]
  },

  // Styling
  styling: {
    colors: {
      primary: "#6B46C1", // Purple
      secondary: "#9F7AEA",
      accent: "#F59E0B",
      background: "#FFFFFF",
      text: "#1F2937",
      textLight: "#6B7280",
      textDark: "#111827",
      border: "#E5E7EB",
      success: "#10B981",
      error: "#EF4444"
    },
    fonts: {
      heading: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "Monaco, Courier, monospace"
    },
    spacing: {
      unit: "8px",
      containerPadding: "24px",
      sectionGap: "16px"
    },
    borderRadius: "8px",
    maxWidth: "600px"
  },

  // Tracking
  tracking: {
    openTracking: true,
    clickTracking: true
  }
};
