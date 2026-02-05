/**
 * LAYERS NODE REGISTRY
 *
 * Comprehensive catalog of all available node types for the Layers canvas.
 * Organized by category: Integrations, Triggers, Logic, LC Native.
 *
 * Architecture:
 * - Static registry: NodeDefinition[] for tool chest rendering and validation
 * - Runtime registry: NodeExecutor lookup for execution engine dispatch
 * - Follows the channel provider registry pattern (convex/channels/registry.ts)
 *
 * Adding a new node:
 * 1. Add NodeDefinition to the appropriate category array below
 * 2. Create NodeExecutor in convex/layers/nodeExecutors/
 * 3. Register executor via registerExecutor()
 */

import type { NodeDefinition, NodeExecutor, NodeCategory, HandleDefinition } from "./types";

// ============================================================================
// RUNTIME EXECUTOR REGISTRY
// ============================================================================

const EXECUTOR_REGISTRY: Record<string, NodeExecutor> = {};

export function registerExecutor(executor: NodeExecutor): void {
  EXECUTOR_REGISTRY[executor.nodeType] = executor;
}

export function getExecutor(nodeType: string): NodeExecutor | null {
  return EXECUTOR_REGISTRY[nodeType] ?? null;
}

export function getAllExecutors(): NodeExecutor[] {
  return Object.values(EXECUTOR_REGISTRY);
}

// ============================================================================
// SHARED HANDLE DEFINITIONS
// ============================================================================

const standardInput: HandleDefinition = {
  id: "input",
  type: "target",
  label: "Input",
  dataType: "any",
};

const standardOutput: HandleDefinition = {
  id: "output",
  type: "source",
  label: "Output",
  dataType: "any",
};

const triggerOutput: HandleDefinition = {
  id: "trigger_out",
  type: "source",
  label: "On Trigger",
  dataType: "any",
};

// ============================================================================
// INTEGRATION NODES (Third-Party)
// ============================================================================

const integrationNodes: NodeDefinition[] = [
  // --- CRM ---
  {
    type: "hubspot",
    name: "HubSpot",
    description: "CRM, marketing, and sales platform",
    category: "integration",
    subcategory: "crm",
    icon: "hubspot",
    color: "#FF7A59",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    oauthProvider: "hubspot",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Contact", value: "create_contact" },
        { label: "Update Contact", value: "update_contact" },
        { label: "Create Deal", value: "create_deal" },
        { label: "Add to List", value: "add_to_list" },
      ]},
    ],
  },
  {
    type: "salesforce",
    name: "Salesforce",
    description: "Enterprise CRM platform",
    category: "integration",
    subcategory: "crm",
    icon: "salesforce",
    color: "#00A1E0",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    oauthProvider: "salesforce",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Lead", value: "create_lead" },
        { label: "Create Contact", value: "create_contact" },
        { label: "Create Opportunity", value: "create_opportunity" },
      ]},
    ],
  },
  {
    type: "pipedrive",
    name: "Pipedrive",
    description: "Sales CRM and pipeline management",
    category: "integration",
    subcategory: "crm",
    icon: "pipedrive",
    color: "#017737",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Person", value: "create_person" },
        { label: "Create Deal", value: "create_deal" },
        { label: "Update Deal Stage", value: "update_deal_stage" },
      ]},
    ],
  },

  // --- Email Marketing ---
  {
    type: "activecampaign",
    name: "ActiveCampaign",
    description: "Email marketing and CRM automation",
    category: "integration",
    subcategory: "email_marketing",
    icon: "activecampaign",
    color: "#356AE6",
    integrationStatus: "available",
    requiresAuth: true,
    oauthProvider: "activecampaign",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Add Contact", value: "add_contact" },
        { label: "Add Tag", value: "add_tag" },
        { label: "Add to List", value: "add_to_list" },
        { label: "Add to Automation", value: "add_to_automation" },
      ]},
    ],
  },
  {
    type: "mailchimp",
    name: "Mailchimp",
    description: "Email marketing platform",
    category: "integration",
    subcategory: "email_marketing",
    icon: "mailchimp",
    color: "#FFE01B",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Add Subscriber", value: "add_subscriber" },
        { label: "Update Subscriber", value: "update_subscriber" },
        { label: "Add Tag", value: "add_tag" },
      ]},
    ],
  },
  {
    type: "convertkit",
    name: "ConvertKit",
    description: "Creator-focused email marketing",
    category: "integration",
    subcategory: "email_marketing",
    icon: "convertkit",
    color: "#FB6970",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Add Subscriber", value: "add_subscriber" },
        { label: "Add Tag", value: "add_tag" },
        { label: "Add to Sequence", value: "add_to_sequence" },
      ]},
    ],
  },

  // --- Messaging ---
  {
    type: "whatsapp_business",
    name: "WhatsApp Business",
    description: "Direct Meta WhatsApp Cloud API",
    category: "integration",
    subcategory: "messaging",
    icon: "whatsapp",
    color: "#25D366",
    integrationStatus: "available",
    requiresAuth: true,
    oauthProvider: "whatsapp",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Message", value: "send_message" },
        { label: "Send Template", value: "send_template" },
      ]},
      { key: "recipientField", label: "Recipient Phone Field", type: "text", placeholder: "e.g. contact.phone" },
      { key: "messageContent", label: "Message", type: "textarea" },
    ],
  },
  {
    type: "manychat",
    name: "ManyChat",
    description: "Multi-channel messaging automation",
    category: "integration",
    subcategory: "messaging",
    icon: "manychat",
    color: "#0084FF",
    integrationStatus: "available",
    requiresAuth: true,
    settingsType: "manychat_settings",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Message", value: "send_message" },
        { label: "Set Custom Field", value: "set_custom_field" },
        { label: "Add Tag", value: "add_tag" },
      ]},
    ],
  },
  {
    type: "telegram",
    name: "Telegram",
    description: "Telegram messaging bot",
    category: "integration",
    subcategory: "messaging",
    icon: "telegram",
    color: "#0088CC",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Message", value: "send_message" },
      ]},
    ],
  },
  {
    type: "instagram_dm",
    name: "Instagram DM",
    description: "Instagram Direct Messages",
    category: "integration",
    subcategory: "messaging",
    icon: "instagram",
    color: "#E1306C",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Message", value: "send_message" },
      ]},
    ],
  },

  // --- Communication ---
  {
    type: "chatwoot",
    name: "Chatwoot",
    description: "Unified inbox and multi-channel messaging",
    category: "integration",
    subcategory: "communication",
    icon: "chatwoot",
    color: "#1F93FF",
    integrationStatus: "available",
    requiresAuth: true,
    settingsType: "chatwoot_settings",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Message", value: "send_message" },
        { label: "Create Contact", value: "create_contact" },
        { label: "Assign Conversation", value: "assign_conversation" },
      ]},
    ],
  },
  {
    type: "infobip",
    name: "Infobip",
    description: "Enterprise SMS and messaging",
    category: "integration",
    subcategory: "communication",
    icon: "infobip",
    color: "#FF6B00",
    integrationStatus: "available",
    requiresAuth: true,
    settingsType: "infobip_settings",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send SMS", value: "send_sms" },
        { label: "Send WhatsApp", value: "send_whatsapp" },
      ]},
    ],
  },
  {
    type: "pushover",
    name: "Pushover",
    description: "Real-time push notifications",
    category: "integration",
    subcategory: "communication",
    icon: "pushover",
    color: "#249DF1",
    integrationStatus: "available",
    requiresAuth: true,
    settingsType: "pushover_settings",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "message", label: "Message", type: "textarea", required: true },
      { key: "priority", label: "Priority", type: "select", options: [
        { label: "Low", value: "-1" },
        { label: "Normal", value: "0" },
        { label: "High", value: "1" },
      ]},
    ],
  },

  // --- Email Delivery ---
  {
    type: "resend",
    name: "Resend",
    description: "Transactional email delivery",
    category: "integration",
    subcategory: "email_delivery",
    icon: "resend",
    color: "#000000",
    integrationStatus: "available",
    requiresAuth: true,
    settingsType: "resend_settings",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "to", label: "To", type: "text", required: true, placeholder: "e.g. {{contact.email}}" },
      { key: "subject", label: "Subject", type: "text", required: true },
      { key: "htmlContent", label: "HTML Content", type: "textarea" },
    ],
  },
  {
    type: "sendgrid",
    name: "SendGrid",
    description: "Email delivery and marketing",
    category: "integration",
    subcategory: "email_delivery",
    icon: "sendgrid",
    color: "#1A82E2",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Email", value: "send_email" },
        { label: "Send Template", value: "send_template" },
      ]},
    ],
  },
  {
    type: "postmark",
    name: "Postmark",
    description: "Transactional email service",
    category: "integration",
    subcategory: "email_delivery",
    icon: "postmark",
    color: "#FFDE00",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Email", value: "send_email" },
        { label: "Send Template", value: "send_template" },
      ]},
    ],
  },

  // --- Websites ---
  {
    type: "wordpress",
    name: "WordPress",
    description: "Website and blog platform",
    category: "integration",
    subcategory: "websites",
    icon: "wordpress",
    color: "#21759B",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Post", value: "create_post" },
        { label: "Update Post", value: "update_post" },
        { label: "Get Posts", value: "get_posts" },
      ]},
    ],
  },
  {
    type: "webflow",
    name: "Webflow",
    description: "Visual website builder",
    category: "integration",
    subcategory: "websites",
    icon: "webflow",
    color: "#4353FF",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create CMS Item", value: "create_cms_item" },
        { label: "Update CMS Item", value: "update_cms_item" },
      ]},
    ],
  },
  {
    type: "squarespace",
    name: "Squarespace",
    description: "Website builder and commerce",
    category: "integration",
    subcategory: "websites",
    icon: "squarespace",
    color: "#000000",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [],
  },

  // --- Payments ---
  {
    type: "stripe",
    name: "Stripe",
    description: "Payment processing platform",
    category: "integration",
    subcategory: "payments",
    icon: "stripe",
    color: "#635BFF",
    integrationStatus: "available",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Checkout Session", value: "create_checkout" },
        { label: "Create Invoice", value: "create_invoice" },
        { label: "Create Customer", value: "create_customer" },
      ]},
    ],
  },
  {
    type: "paypal",
    name: "PayPal",
    description: "Online payment platform",
    category: "integration",
    subcategory: "payments",
    icon: "paypal",
    color: "#003087",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [],
  },
  {
    type: "mollie",
    name: "Mollie",
    description: "European payment provider",
    category: "integration",
    subcategory: "payments",
    icon: "mollie",
    color: "#000000",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [],
  },

  // --- Automation ---
  {
    type: "n8n",
    name: "n8n",
    description: "Open-source workflow automation",
    category: "integration",
    subcategory: "automation",
    icon: "n8n",
    color: "#EA4B71",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "webhookUrl", label: "n8n Webhook URL", type: "text", required: true },
      { key: "method", label: "Method", type: "select", options: [
        { label: "POST", value: "POST" },
        { label: "GET", value: "GET" },
      ]},
    ],
  },
  {
    type: "make",
    name: "Make",
    description: "Advanced workflow automation (Integromat)",
    category: "integration",
    subcategory: "automation",
    icon: "make",
    color: "#6D00CC",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "webhookUrl", label: "Make Webhook URL", type: "text", required: true },
    ],
  },
  {
    type: "zapier",
    name: "Zapier",
    description: "Connect to 5,000+ apps",
    category: "integration",
    subcategory: "automation",
    icon: "zapier",
    color: "#FF4A00",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "webhookUrl", label: "Zapier Webhook URL", type: "text", required: true },
    ],
  },

  // --- Calendar ---
  {
    type: "calendly",
    name: "Calendly",
    description: "Scheduling and booking",
    category: "integration",
    subcategory: "calendar",
    icon: "calendly",
    color: "#006BFF",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [],
  },
  {
    type: "cal_com",
    name: "Cal.com",
    description: "Open-source scheduling",
    category: "integration",
    subcategory: "calendar",
    icon: "calcom",
    color: "#292929",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [],
  },

  // --- Analytics ---
  {
    type: "posthog",
    name: "PostHog",
    description: "Product analytics platform",
    category: "integration",
    subcategory: "analytics",
    icon: "posthog",
    color: "#1D4AFF",
    integrationStatus: "available",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Capture Event", value: "capture_event" },
        { label: "Identify User", value: "identify_user" },
      ]},
    ],
  },
  {
    type: "google_analytics",
    name: "Google Analytics",
    description: "Web analytics platform",
    category: "integration",
    subcategory: "analytics",
    icon: "google_analytics",
    color: "#E37400",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [],
  },
  {
    type: "plausible",
    name: "Plausible",
    description: "Privacy-first analytics",
    category: "integration",
    subcategory: "analytics",
    icon: "plausible",
    color: "#5850EC",
    integrationStatus: "coming_soon",
    requiresAuth: true,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [],
  },

  // --- Dev/Deploy ---
  {
    type: "github",
    name: "GitHub",
    description: "Code hosting and deployment",
    category: "integration",
    subcategory: "dev_deploy",
    icon: "github",
    color: "#181717",
    integrationStatus: "available",
    requiresAuth: true,
    oauthProvider: "github",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Issue", value: "create_issue" },
        { label: "Create PR Comment", value: "create_pr_comment" },
        { label: "Trigger Workflow", value: "trigger_workflow" },
      ]},
    ],
  },
  {
    type: "vercel",
    name: "Vercel",
    description: "Deploy and host web applications",
    category: "integration",
    subcategory: "dev_deploy",
    icon: "vercel",
    color: "#000000",
    integrationStatus: "available",
    requiresAuth: true,
    oauthProvider: "vercel",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Trigger Deploy", value: "trigger_deploy" },
        { label: "Get Deployment Status", value: "get_deployment_status" },
      ]},
    ],
  },

  // --- Office ---
  {
    type: "microsoft_365",
    name: "Microsoft 365",
    description: "Email, Calendar, OneDrive",
    category: "integration",
    subcategory: "office",
    icon: "microsoft",
    color: "#0078D4",
    integrationStatus: "available",
    requiresAuth: true,
    oauthProvider: "microsoft",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Email", value: "send_email" },
        { label: "Create Calendar Event", value: "create_calendar_event" },
        { label: "Upload File", value: "upload_file" },
      ]},
    ],
  },
  {
    type: "google_workspace",
    name: "Google Workspace",
    description: "Gmail, Calendar, Drive",
    category: "integration",
    subcategory: "office",
    icon: "google",
    color: "#4285F4",
    integrationStatus: "available",
    requiresAuth: true,
    oauthProvider: "google",
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Email", value: "send_email" },
        { label: "Create Calendar Event", value: "create_calendar_event" },
        { label: "Upload to Drive", value: "upload_to_drive" },
      ]},
    ],
  },
];

// ============================================================================
// TRIGGER NODES
// ============================================================================

const triggerNodes: NodeDefinition[] = [
  {
    type: "trigger_form_submitted",
    name: "Form Submitted",
    description: "Triggers when a form is submitted",
    category: "trigger",
    subcategory: "triggers",
    icon: "form",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [
      { key: "formId", label: "Form", type: "select", required: true, description: "Select which form triggers this workflow" },
    ],
  },
  {
    type: "trigger_payment_received",
    name: "Payment Received",
    description: "Triggers when a payment is completed",
    category: "trigger",
    subcategory: "triggers",
    icon: "payment",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [
      { key: "paymentProvider", label: "Provider", type: "select", options: [
        { label: "Any", value: "any" },
        { label: "Stripe", value: "stripe" },
        { label: "LC Checkout", value: "lc_checkout" },
      ]},
    ],
  },
  {
    type: "trigger_booking_created",
    name: "Booking Created",
    description: "Triggers when a booking is made",
    category: "trigger",
    subcategory: "triggers",
    icon: "calendar",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [],
  },
  {
    type: "trigger_contact_created",
    name: "Contact Created",
    description: "Triggers when a new contact is created",
    category: "trigger",
    subcategory: "triggers",
    icon: "user_plus",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [],
  },
  {
    type: "trigger_contact_updated",
    name: "Contact Updated",
    description: "Triggers when a contact is updated",
    category: "trigger",
    subcategory: "triggers",
    icon: "user_edit",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [],
  },
  {
    type: "trigger_webhook",
    name: "Webhook Received",
    description: "Triggers on incoming webhook POST",
    category: "trigger",
    subcategory: "triggers",
    icon: "webhook",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [
      { key: "path", label: "Webhook Path", type: "text", required: true, placeholder: "/my-webhook" },
      { key: "secret", label: "Webhook Secret", type: "text", description: "Optional HMAC validation secret" },
    ],
  },
  {
    type: "trigger_schedule",
    name: "Schedule (Cron)",
    description: "Triggers on a recurring schedule",
    category: "trigger",
    subcategory: "triggers",
    icon: "clock",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [
      { key: "cronExpression", label: "Cron Expression", type: "text", required: true, placeholder: "0 9 * * 1-5", description: "Standard cron format" },
      { key: "timezone", label: "Timezone", type: "text", defaultValue: "Europe/Berlin" },
    ],
  },
  {
    type: "trigger_manual",
    name: "Manual Trigger",
    description: "Run workflow manually with a button click",
    category: "trigger",
    subcategory: "triggers",
    icon: "play",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [
      { key: "sampleData", label: "Sample Data (JSON)", type: "json", description: "Test data to pass when triggered manually" },
    ],
  },
  {
    type: "trigger_email_received",
    name: "Email Received",
    description: "Triggers when an email is received",
    category: "trigger",
    subcategory: "triggers",
    icon: "mail",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [
      { key: "filterFrom", label: "From Filter", type: "text", placeholder: "Optional: filter by sender" },
      { key: "filterSubject", label: "Subject Filter", type: "text", placeholder: "Optional: filter by subject keyword" },
    ],
  },
  {
    type: "trigger_chat_message",
    name: "Chat Message Received",
    description: "Triggers when a chat message is received",
    category: "trigger",
    subcategory: "triggers",
    icon: "message_circle",
    color: "#10B981",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [],
    outputs: [triggerOutput],
    configFields: [
      { key: "channel", label: "Channel", type: "select", options: [
        { label: "Any", value: "any" },
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Webchat", value: "webchat" },
        { label: "Instagram", value: "instagram" },
        { label: "Telegram", value: "telegram" },
      ]},
    ],
  },
];

// ============================================================================
// LOGIC & FLOW NODES
// ============================================================================

const logicNodes: NodeDefinition[] = [
  {
    type: "if_then",
    name: "If/Then",
    description: "Conditional branch based on data",
    category: "logic",
    subcategory: "flow_control",
    icon: "git_branch",
    color: "#8B5CF6",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [
      { id: "true", type: "source", label: "True", dataType: "any" },
      { id: "false", type: "source", label: "False", dataType: "any" },
    ],
    configFields: [
      { key: "expression", label: "Condition", type: "expression", required: true, description: "Expression that evaluates to true/false" },
    ],
  },
  {
    type: "wait_delay",
    name: "Wait / Delay",
    description: "Pause execution for a specified duration",
    category: "logic",
    subcategory: "flow_control",
    icon: "hourglass",
    color: "#8B5CF6",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "duration", label: "Duration", type: "number", required: true },
      { key: "unit", label: "Unit", type: "select", required: true, options: [
        { label: "Seconds", value: "seconds" },
        { label: "Minutes", value: "minutes" },
        { label: "Hours", value: "hours" },
        { label: "Days", value: "days" },
      ]},
    ],
  },
  {
    type: "split_ab",
    name: "Split (A/B Test)",
    description: "Randomly split traffic between branches",
    category: "logic",
    subcategory: "flow_control",
    icon: "shuffle",
    color: "#8B5CF6",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [
      { id: "branch_a", type: "source", label: "Branch A", dataType: "any" },
      { id: "branch_b", type: "source", label: "Branch B", dataType: "any" },
    ],
    configFields: [
      { key: "splitPercentage", label: "Branch A Percentage", type: "number", required: true, defaultValue: 50 },
    ],
  },
  {
    type: "merge",
    name: "Merge",
    description: "Combine multiple branches into one",
    category: "logic",
    subcategory: "flow_control",
    icon: "git_merge",
    color: "#8B5CF6",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [
      { id: "input_a", type: "target", label: "Input A", dataType: "any" },
      { id: "input_b", type: "target", label: "Input B", dataType: "any" },
    ],
    outputs: [standardOutput],
    configFields: [
      { key: "mergeStrategy", label: "Merge Strategy", type: "select", options: [
        { label: "Wait for All", value: "wait_all" },
        { label: "First Completed", value: "first" },
      ]},
    ],
  },
  {
    type: "loop_iterator",
    name: "Loop / Iterator",
    description: "Iterate over an array of items",
    category: "logic",
    subcategory: "flow_control",
    icon: "repeat",
    color: "#8B5CF6",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [
      { id: "each_item", type: "source", label: "Each Item", dataType: "any" },
      { id: "completed", type: "source", label: "Loop Complete", dataType: "any" },
    ],
    configFields: [
      { key: "arrayField", label: "Array Field", type: "text", required: true, description: "Path to the array to iterate over" },
      { key: "maxIterations", label: "Max Iterations", type: "number", defaultValue: 100 },
    ],
  },
  {
    type: "filter",
    name: "Filter",
    description: "Filter items that match a condition",
    category: "logic",
    subcategory: "flow_control",
    icon: "filter",
    color: "#8B5CF6",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [
      { id: "match", type: "source", label: "Match", dataType: "any" },
      { id: "no_match", type: "source", label: "No Match", dataType: "any" },
    ],
    configFields: [
      { key: "expression", label: "Filter Condition", type: "expression", required: true },
    ],
  },
  {
    type: "transform_data",
    name: "Transform Data",
    description: "Reshape, map, or transform data between nodes",
    category: "logic",
    subcategory: "data",
    icon: "shuffle",
    color: "#8B5CF6",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "transformExpression", label: "Transform Expression", type: "json", required: true, description: "JSON mapping expression" },
    ],
  },
  {
    type: "http_request",
    name: "HTTP Request",
    description: "Make an HTTP request to any API",
    category: "logic",
    subcategory: "data",
    icon: "globe",
    color: "#8B5CF6",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "url", label: "URL", type: "text", required: true },
      { key: "method", label: "Method", type: "select", required: true, options: [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" },
        { label: "PATCH", value: "PATCH" },
        { label: "DELETE", value: "DELETE" },
      ]},
      { key: "headers", label: "Headers", type: "json" },
      { key: "body", label: "Body", type: "json" },
    ],
  },
  {
    type: "code_block",
    name: "Code Block",
    description: "Run custom JavaScript code",
    category: "logic",
    subcategory: "data",
    icon: "code",
    color: "#8B5CF6",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "code", label: "JavaScript Code", type: "textarea", required: true, description: "Return an object with output data. Input available as `input` variable." },
    ],
  },
];

// ============================================================================
// LC NATIVE NODES (Layer Cake built-in tools)
// ============================================================================

const lcNativeNodes: NodeDefinition[] = [
  {
    type: "lc_crm",
    name: "LC CRM",
    description: "Contacts, Pipelines, Deals",
    category: "lc_native",
    subcategory: "crm",
    icon: "lc_crm",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    behaviorTypes: ["create-contact", "detect-employer-billing"],
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Contact", value: "create-contact" },
        { label: "Update Contact", value: "update-contact" },
        { label: "Detect Employer Billing", value: "detect-employer-billing" },
        { label: "Move Pipeline Stage", value: "move-pipeline-stage" },
      ]},
    ],
  },
  {
    type: "lc_forms",
    name: "LC Forms",
    description: "Form builder and responses",
    category: "lc_native",
    subcategory: "forms",
    icon: "lc_forms",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    behaviorTypes: ["create-form-response", "validate-registration"],
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Form Response", value: "create-form-response" },
        { label: "Validate Registration", value: "validate-registration" },
      ]},
    ],
  },
  {
    type: "lc_invoicing",
    name: "LC Invoicing",
    description: "Invoice generation and management",
    category: "lc_native",
    subcategory: "payments",
    icon: "lc_invoicing",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    behaviorTypes: ["generate-invoice", "consolidated-invoice-generation"],
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Generate Invoice", value: "generate-invoice" },
        { label: "Consolidated Invoice", value: "consolidated-invoice-generation" },
      ]},
    ],
  },
  {
    type: "lc_checkout",
    name: "LC Checkout",
    description: "Payment processing and transactions",
    category: "lc_native",
    subcategory: "payments",
    icon: "lc_checkout",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    behaviorTypes: ["create-transaction", "calculate-pricing"],
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Transaction", value: "create-transaction" },
        { label: "Calculate Pricing", value: "calculate-pricing" },
      ]},
    ],
  },
  {
    type: "lc_tickets",
    name: "LC Tickets",
    description: "Ticket creation and management",
    category: "lc_native",
    subcategory: "support",
    icon: "lc_tickets",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    behaviorTypes: ["create-ticket"],
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Ticket", value: "create-ticket" },
        { label: "Update Ticket", value: "update-ticket" },
      ]},
    ],
  },
  {
    type: "lc_bookings",
    name: "LC Bookings",
    description: "Appointment and resource booking",
    category: "lc_native",
    subcategory: "calendar",
    icon: "lc_bookings",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Create Booking", value: "create-booking" },
        { label: "Cancel Booking", value: "cancel-booking" },
      ]},
    ],
  },
  {
    type: "lc_events",
    name: "LC Events / Webinars",
    description: "Event management and webinars",
    category: "lc_native",
    subcategory: "events",
    icon: "lc_events",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    behaviorTypes: ["check-event-capacity", "update-statistics"],
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Check Event Capacity", value: "check-event-capacity" },
        { label: "Update Statistics", value: "update-statistics" },
      ]},
    ],
  },
  {
    type: "lc_email",
    name: "LC Email",
    description: "Platform email (Resend-powered)",
    category: "lc_native",
    subcategory: "email",
    icon: "lc_email",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    behaviorTypes: ["send-confirmation-email", "send-admin-notification"],
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Send Confirmation Email", value: "send-confirmation-email" },
        { label: "Send Admin Notification", value: "send-admin-notification" },
      ]},
      { key: "to", label: "To", type: "text", placeholder: "{{contact.email}}" },
      { key: "subject", label: "Subject", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
    ],
  },
  {
    type: "lc_sms",
    name: "LC SMS",
    description: "Platform SMS messaging",
    category: "lc_native",
    subcategory: "messaging",
    icon: "lc_sms",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "to", label: "To Phone", type: "text", required: true },
      { key: "message", label: "Message", type: "textarea", required: true },
    ],
  },
  {
    type: "lc_whatsapp",
    name: "LC WhatsApp",
    description: "Platform WhatsApp messaging",
    category: "lc_native",
    subcategory: "messaging",
    icon: "lc_whatsapp",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "to", label: "To Phone", type: "text", required: true },
      { key: "message", label: "Message", type: "textarea", required: true },
    ],
  },
  {
    type: "lc_ai_agent",
    name: "LC AI Agent",
    description: "AI-powered agent node",
    category: "lc_native",
    subcategory: "ai",
    icon: "lc_ai_agent",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "prompt", label: "Agent Prompt", type: "textarea", required: true },
      { key: "model", label: "Model", type: "select", options: [
        { label: "Default", value: "default" },
        { label: "Claude Sonnet", value: "claude-sonnet" },
        { label: "GPT-4o", value: "gpt-4o" },
      ]},
    ],
  },
  {
    type: "lc_landing_pages",
    name: "LC Landing Pages",
    description: "Builder-powered landing pages",
    category: "lc_native",
    subcategory: "websites",
    icon: "lc_landing_pages",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "appId", label: "Landing Page App", type: "select", required: true },
    ],
  },
  {
    type: "lc_file_storage",
    name: "LC File Storage",
    description: "Media library and file management",
    category: "lc_native",
    subcategory: "storage",
    icon: "lc_file_storage",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Upload File", value: "upload_file" },
        { label: "Get File", value: "get_file" },
      ]},
    ],
  },
  {
    type: "lc_certificates",
    name: "LC Certificates",
    description: "Certificate generation and delivery",
    category: "lc_native",
    subcategory: "certificates",
    icon: "lc_certificates",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { label: "Generate Certificate", value: "generate_certificate" },
        { label: "Send Certificate", value: "send_certificate" },
      ]},
    ],
  },
  {
    type: "lc_activecampaign_sync",
    name: "LC ActiveCampaign Sync",
    description: "Sync contacts to ActiveCampaign",
    category: "lc_native",
    subcategory: "email_marketing",
    icon: "lc_activecampaign",
    color: "#F59E0B",
    integrationStatus: "available",
    requiresAuth: false,
    behaviorTypes: ["activecampaign-sync"],
    inputs: [standardInput],
    outputs: [standardOutput],
    configFields: [
      { key: "listId", label: "List ID", type: "text" },
      { key: "tags", label: "Tags", type: "text", description: "Comma-separated tags" },
    ],
  },
];

// ============================================================================
// REGISTRY ACCESSORS
// ============================================================================

/** All node definitions combined */
const ALL_NODES: NodeDefinition[] = [
  ...integrationNodes,
  ...triggerNodes,
  ...logicNodes,
  ...lcNativeNodes,
];

/** Get all node definitions */
export function getAllNodeDefinitions(): NodeDefinition[] {
  return ALL_NODES;
}

/** Get node definitions by category */
export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return ALL_NODES.filter((n) => n.category === category);
}

/** Get a single node definition by type */
export function getNodeDefinition(type: string): NodeDefinition | null {
  return ALL_NODES.find((n) => n.type === type) ?? null;
}

/** Get node definitions by subcategory */
export function getNodesBySubcategory(subcategory: string): NodeDefinition[] {
  return ALL_NODES.filter((n) => n.subcategory === subcategory);
}

/** Get all subcategories within a category */
export function getSubcategories(category: NodeCategory): string[] {
  const subs = new Set(
    ALL_NODES.filter((n) => n.category === category).map((n) => n.subcategory)
  );
  return Array.from(subs);
}

/** Get node definitions that map to existing behavior types */
export function getNodesWithBehaviors(): NodeDefinition[] {
  return ALL_NODES.filter((n) => n.behaviorTypes && n.behaviorTypes.length > 0);
}

/** Get node count by integration status */
export function getNodeCounts(): { total: number; available: number; comingSoon: number } {
  const available = ALL_NODES.filter((n) => n.integrationStatus !== "coming_soon").length;
  const comingSoon = ALL_NODES.filter((n) => n.integrationStatus === "coming_soon").length;
  return { total: ALL_NODES.length, available, comingSoon };
}
