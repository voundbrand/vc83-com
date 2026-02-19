export const PRODUCT_OS_RELEASE_STAGES = ["none", "new", "beta", "wip"] as const;
export type ProductOSReleaseStage = (typeof PRODUCT_OS_RELEASE_STAGES)[number];

export const PRODUCT_OS_CATEGORIES = [
  "Content & Publishing",
  "Customer Management",
  "Commerce & Payments",
  "Events & Ticketing",
  "Automation & Workflows",
  "Media & Files",
  "Revenue & Growth",
  "AI & Intelligence",
  "Utilities & Tools",
] as const;
export type ProductOSCategory = (typeof PRODUCT_OS_CATEGORIES)[number];

export interface ProductOSCatalogEntry {
  code: string;
  displayName: string;
  description: string;
  category: ProductOSCategory;
  iconId: string;
  featured: {
    popular: boolean;
    new: boolean;
  };
  releaseStage: ProductOSReleaseStage;
  translationKey?: string;
}

export const PRODUCT_OS_POPULAR_CODES = [
  "ai-assistant",
  "brain-voice",
  "agents-browser",
  "webchat-deployment",
  "builder",
  "layers",
  "finder",
  "text-editor",
  "terminal",
  "crm",
] as const;

export const PRODUCT_OS_NEW_CODES = ["crm", "projects", "events", "payments", "benefits"] as const;

const popularCodeSet = new Set<string>(PRODUCT_OS_POPULAR_CODES);
const newCodeSet = new Set<string>(PRODUCT_OS_NEW_CODES);

function featuredFlags(code: string) {
  return {
    popular: popularCodeSet.has(code),
    new: newCodeSet.has(code),
  };
}

export const PRODUCT_OS_CATALOG: ProductOSCatalogEntry[] = [
  {
    code: "ai-assistant",
    displayName: "AI Assistant",
    translationKey: "ui.app.ai_assistant",
    description: "Natural-language assistant for insights, drafting, and operating workflows.",
    category: "AI & Intelligence",
    iconId: "ai-assistant",
    featured: featuredFlags("ai-assistant"),
    releaseStage: "none",
  },
  {
    code: "brain-voice",
    displayName: "Brain Voice",
    description:
      "Run trust-safe voice co-creation sessions to capture and shape reusable knowledge artifacts.",
    category: "AI & Intelligence",
    iconId: "brain-voice",
    featured: featuredFlags("brain-voice"),
    releaseStage: "beta",
  },
  {
    code: "agents-browser",
    displayName: "AI Agents",
    translationKey: "ui.app.ai_agents",
    description: "Coordinate specialist AI agents for implementation and review workflows.",
    category: "AI & Intelligence",
    iconId: "agents-browser",
    featured: featuredFlags("agents-browser"),
    releaseStage: "beta",
  },
  {
    code: "webchat-deployment",
    displayName: "Web Chat Deployment",
    translationKey: "ui.app.web_chat_deployment",
    description: "Deploy and operate customer-facing web chat experiences.",
    category: "Revenue & Growth",
    iconId: "webchat-deployment",
    featured: featuredFlags("webchat-deployment"),
    releaseStage: "wip",
  },
  {
    code: "builder",
    displayName: "Builder",
    translationKey: "ui.app.builder",
    description: "Build web experiences with reusable sections, templates, and AI assistance.",
    category: "Content & Publishing",
    iconId: "builder",
    featured: featuredFlags("builder"),
    releaseStage: "none",
  },
  {
    code: "layers",
    displayName: "Layers",
    translationKey: "ui.app.layers",
    description: "Compose visual automation graphs and connected product logic.",
    category: "Automation & Workflows",
    iconId: "layers",
    featured: featuredFlags("layers"),
    releaseStage: "none",
  },
  {
    code: "finder",
    displayName: "Finder",
    translationKey: "ui.windows.finder.title",
    description: "Navigate shared files, workspace documents, and operational assets.",
    category: "Media & Files",
    iconId: "finder",
    featured: featuredFlags("finder"),
    releaseStage: "none",
  },
  {
    code: "text-editor",
    displayName: "Text Editor",
    translationKey: "ui.app.text_editor",
    description: "Edit technical docs, notes, and markdown in a focused multi-tab editor.",
    category: "Media & Files",
    iconId: "text-editor",
    featured: featuredFlags("text-editor"),
    releaseStage: "none",
  },
  {
    code: "terminal",
    displayName: "Terminal",
    translationKey: "ui.app.terminal",
    description: "Monitor and operate event streams and execution diagnostics in real time.",
    category: "Utilities & Tools",
    iconId: "terminal",
    featured: featuredFlags("terminal"),
    releaseStage: "none",
  },
  {
    code: "crm",
    displayName: "CRM",
    translationKey: "ui.app.crm",
    description: "Manage contacts, pipelines, and account activity across your customer lifecycle.",
    category: "Customer Management",
    iconId: "crm",
    featured: featuredFlags("crm"),
    releaseStage: "new",
  },
  {
    code: "projects",
    displayName: "Projects",
    translationKey: "ui.app.projects",
    description: "Plan milestones, assign work, and track delivery across internal and client teams.",
    category: "Customer Management",
    iconId: "projects",
    featured: featuredFlags("projects"),
    releaseStage: "new",
  },
  {
    code: "events",
    displayName: "Events",
    translationKey: "ui.app.events",
    description: "Run event programming, registration workflows, and attendee operations.",
    category: "Events & Ticketing",
    iconId: "events",
    featured: featuredFlags("events"),
    releaseStage: "new",
  },
  {
    code: "payments",
    displayName: "Payments",
    translationKey: "ui.app.payments",
    description: "Control payment providers, subscription logic, and transaction operations.",
    category: "Commerce & Payments",
    iconId: "payments",
    featured: featuredFlags("payments"),
    releaseStage: "new",
  },
  {
    code: "benefits",
    displayName: "Benefits",
    translationKey: "ui.app.benefits",
    description: "Design and deliver benefits programs for members, teams, and partner channels.",
    category: "Revenue & Growth",
    iconId: "benefits",
    featured: featuredFlags("benefits"),
    releaseStage: "new",
  },
  {
    code: "products",
    displayName: "Products",
    translationKey: "ui.app.products",
    description: "Define product records, pricing, and packaging for your commerce catalog.",
    category: "Commerce & Payments",
    iconId: "products",
    featured: featuredFlags("products"),
    releaseStage: "none",
  },
  {
    code: "app_invoicing",
    displayName: "Invoicing",
    translationKey: "ui.app.invoicing",
    description: "Issue invoices, manage payment terms, and track receivables.",
    category: "Commerce & Payments",
    iconId: "invoicing",
    featured: featuredFlags("app_invoicing"),
    releaseStage: "none",
  },
  {
    code: "checkout",
    displayName: "Checkout",
    translationKey: "ui.app.checkout",
    description: "Build conversion-ready checkout flows for one-time and recurring purchases.",
    category: "Commerce & Payments",
    iconId: "checkout",
    featured: featuredFlags("checkout"),
    releaseStage: "none",
  },
  {
    code: "tickets",
    displayName: "Tickets",
    translationKey: "ui.app.tickets",
    description: "Manage ticket inventory, issuance, and attendee access controls.",
    category: "Events & Ticketing",
    iconId: "tickets",
    featured: featuredFlags("tickets"),
    releaseStage: "none",
  },
  {
    code: "certificates",
    displayName: "Certificates",
    translationKey: "ui.app.certificates",
    description: "Generate and distribute certification artifacts for event and training outcomes.",
    category: "Events & Ticketing",
    iconId: "certificates",
    featured: featuredFlags("certificates"),
    releaseStage: "none",
  },
  {
    code: "booking",
    displayName: "Booking",
    translationKey: "ui.app.booking",
    description: "Handle appointment scheduling, availability, and booking operations.",
    category: "Events & Ticketing",
    iconId: "booking",
    featured: featuredFlags("booking"),
    releaseStage: "none",
  },
  {
    code: "workflows",
    displayName: "Workflows",
    translationKey: "ui.app.workflows",
    description: "Automate multi-step process execution with configurable behavior logic.",
    category: "Automation & Workflows",
    iconId: "workflows",
    featured: featuredFlags("workflows"),
    releaseStage: "none",
  },
  {
    code: "web-publishing",
    displayName: "Web Publishing",
    translationKey: "ui.windows.web_publishing.title",
    description: "Publish and manage pages, domains, and deployment operations.",
    category: "Content & Publishing",
    iconId: "web-publishing",
    featured: featuredFlags("web-publishing"),
    releaseStage: "none",
  },
  {
    code: "forms",
    displayName: "Forms",
    translationKey: "ui.app.forms",
    description: "Build forms, capture structured input, and route responses into operations.",
    category: "Content & Publishing",
    iconId: "forms",
    featured: featuredFlags("forms"),
    releaseStage: "none",
  },
  {
    code: "templates",
    displayName: "Templates",
    translationKey: "ui.app.templates",
    description: "Create reusable email, web, and document templates for repeatable delivery.",
    category: "Content & Publishing",
    iconId: "templates",
    featured: featuredFlags("templates"),
    releaseStage: "none",
  },
  {
    code: "media-library",
    displayName: "Media Library",
    translationKey: "ui.app.media_library",
    description: "Store and organize media assets with upload, preview, and retrieval tooling.",
    category: "Media & Files",
    iconId: "media-library",
    featured: featuredFlags("media-library"),
    releaseStage: "none",
  },
  {
    code: "integrations",
    displayName: "Integrations & API",
    translationKey: "ui.windows.integrations.title",
    description: "Configure external integrations, credentials, and API access.",
    category: "Utilities & Tools",
    iconId: "integrations",
    featured: featuredFlags("integrations"),
    releaseStage: "none",
  },
];

export const PRODUCT_OS_CATALOG_BY_CODE = new Map(
  PRODUCT_OS_CATALOG.map((entry) => [entry.code, entry]),
);

export const PRODUCT_OS_CATEGORY_ICON_ID: Record<ProductOSCategory, string> = {
  "Content & Publishing": "web-publishing",
  "Customer Management": "crm",
  "Commerce & Payments": "payments",
  "Events & Ticketing": "events",
  "Automation & Workflows": "workflows",
  "Media & Files": "media-library",
  "Revenue & Growth": "benefits",
  "AI & Intelligence": "ai-assistant",
  "Utilities & Tools": "terminal",
};

export const PRODUCT_OS_CATEGORY_TRANSLATION_KEY: Record<ProductOSCategory, string> = {
  "Content & Publishing": "ui.product_os.category.content_publishing",
  "Customer Management": "ui.product_os.category.customer_management",
  "Commerce & Payments": "ui.product_os.category.commerce_payments",
  "Events & Ticketing": "ui.product_os.category.events_ticketing",
  "Automation & Workflows": "ui.product_os.category.automation_workflows",
  "Media & Files": "ui.product_os.category.media_files",
  "Revenue & Growth": "ui.product_os.category.revenue_growth",
  "AI & Intelligence": "ui.product_os.category.ai_intelligence",
  "Utilities & Tools": "ui.product_os.category.utilities_tools",
};

export function getProductOSCategoryTranslationKey(category: ProductOSCategory): string {
  return PRODUCT_OS_CATEGORY_TRANSLATION_KEY[category];
}

const PRODUCT_OS_BADGE_TRANSLATION_KEY: Record<Exclude<ProductOSReleaseStage, "none">, string> = {
  new: "ui.product_os.badge.new",
  beta: "ui.product_os.badge.beta",
  wip: "ui.product_os.badge.wip",
};

export function normalizeProductOSReleaseStage(
  value: ProductOSReleaseStage | string | null | undefined,
): ProductOSReleaseStage {
  if (value === "new" || value === "beta" || value === "wip") {
    return value;
  }

  return "none";
}

export function getProductOSBadgeTranslationKey(stage: ProductOSReleaseStage): string | null {
  if (stage === "none") {
    return null;
  }

  return PRODUCT_OS_BADGE_TRANSLATION_KEY[stage];
}

export function getProductOSBadgeLabel(stage: ProductOSReleaseStage): "New" | "Beta" | "WIP" | null {
  if (stage === "new") {
    return "New";
  }

  if (stage === "beta") {
    return "Beta";
  }

  if (stage === "wip") {
    return "WIP";
  }

  return null;
}
