/**
 * TICKET CHECKOUT TEMPLATE SCHEMA
 *
 * Schema definition for ticket checkout pages.
 * This template is specifically for selling event tickets with payment processing.
 *
 * @module templates/checkout/ticket-checkout
 */

import { TemplateContentSchema, FieldType } from "../../schema-types";

export const ticketCheckoutSchema: TemplateContentSchema = {
  templateCode: "ticket-checkout",
  templateName: "Ticket Checkout",
  description: "Professional checkout page for selling event tickets with integrated payment processing",

  // Default content structure
  defaultContent: {
    event: {
      showEventInfo: true,
      showVenueDetails: true,
    },
    tickets: {
      maxTicketsPerOrder: 10,
    },
    checkout: {
      successMessage: "Thank you for your ticket purchase!",
      successRedirectUrl: "",
    },
  },

  // Content sections (SectionDefinition[])
  sections: [
    {
      id: "event",
      label: "Event Information",
      description: "Event details displayed on the checkout page",
      fields: [
        {
          id: "showEventInfo",
          type: FieldType.Boolean,
          label: "Show Event Information",
          defaultValue: true,
        },
        {
          id: "showVenueDetails",
          type: FieldType.Boolean,
          label: "Show Venue Details",
          defaultValue: true,
        },
      ],
    },
    {
      id: "tickets",
      label: "Ticket Display",
      description: "Configure how tickets are displayed (tickets are automatically loaded from linked products)",
      fields: [
        {
          id: "maxTicketsPerOrder",
          type: FieldType.Number,
          label: "Maximum Tickets Per Order",
          defaultValue: 10,
        },
      ],
    },
    {
      id: "checkout",
      label: "Checkout Settings",
      description: "Payment and checkout configuration",
      fields: [
        {
          id: "successMessage",
          type: FieldType.Text,
          label: "Success Message",
          defaultValue: "Thank you for your ticket purchase!",
        },
        {
          id: "successRedirectUrl",
          type: FieldType.Text,
          label: "Success Redirect URL (optional)",
          defaultValue: "",
        },
      ],
    },
  ],
};
