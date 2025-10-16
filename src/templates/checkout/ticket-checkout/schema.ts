/**
 * TICKET CHECKOUT TEMPLATE SCHEMA
 *
 * Defines the configuration schema for the ticket checkout template.
 * Used by the Checkout Manager to generate dynamic configuration forms.
 */

import type { CheckoutTemplateSchema } from "../types";

export const ticketCheckoutSchema: CheckoutTemplateSchema = {
  code: "ticket-checkout",
  name: "Event Ticket Checkout",
  version: "1.0.0",
  description: "Multi-tier event ticket checkout with quantity selection and secure payments",

  // NOTE: Template capabilities (supportsFormIntegration, etc.) are stored
  // in the database template record (seedCheckoutTemplates.ts), not here.
  // This schema only defines the configuration UI fields.

  fields: [
    {
      key: "settings",
      label: "Checkout Settings",
      type: "group",
      fields: [
        {
          key: "title",
          label: "Checkout Title",
          type: "text",
          required: true,
          placeholder: "e.g., Event Ticket Sales",
          helpText: "Display name for your checkout page",
        },
        {
          key: "description",
          label: "Description",
          type: "textarea",
          required: false,
          placeholder: "Brief description of your event or products...",
          helpText: "Optional description shown to customers",
        },
        {
          key: "max_tickets_per_order",
          label: "Max Tickets Per Order",
          type: "number",
          required: false,
          defaultValue: 10,
          min: 1,
          max: 100,
          helpText: "Maximum number of tickets a customer can purchase in one transaction",
        },
        {
          key: "currency",
          label: "Currency",
          type: "select",
          required: true,
          options: [
            { value: "usd", label: "USD - US Dollar" },
            { value: "eur", label: "EUR - Euro" },
            { value: "gbp", label: "GBP - British Pound" },
            { value: "cad", label: "CAD - Canadian Dollar" },
            { value: "aud", label: "AUD - Australian Dollar" },
          ],
          defaultValue: "usd",
          helpText: "Currency for pricing and transactions",
        },
      ],
    },
    {
      key: "customBranding",
      label: "Branding & Appearance",
      type: "group",
      fields: [
        {
          key: "primary_color",
          label: "Primary Color",
          type: "color",
          required: false,
          defaultValue: "#6B46C1",
          helpText: "Main accent color for buttons and highlights",
        },
        {
          key: "show_event_details",
          label: "Show Event Details",
          type: "checkbox",
          required: false,
          defaultValue: true,
          helpText: "Display event name, date, and venue information",
        },
      ],
    },
  ],

  defaultConfig: {
    settings: {
      title: "Ticket Checkout",
      description: "",
      max_tickets_per_order: 10,
      currency: "usd",
    },
    customBranding: {
      primary_color: "#6B46C1",
      show_event_details: true,
    },
  },
};
