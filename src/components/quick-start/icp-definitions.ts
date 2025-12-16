/**
 * ICP (Ideal Customer Profile) Definitions
 * Defines what each profile gets during Quick Start
 */

import type { ICPDefinition } from "./types";

export const ICP_DEFINITIONS: ICPDefinition[] = [
  {
    id: "ai-agency",
    name: "AI Agency Owner",
    icon: "🤖",
    description: "Perfect for AI/ML agencies managing clients, projects, and deliverables",
    features: [
      "Client management CRM",
      "Project tracking & invoicing",
      "Freelancer Portal template",
      "Team collaboration tools",
      "API integrations ready"
    ],
    provisions: {
      apps: [
        "CRM", "Projects", "Invoicing", "Forms", "Web Publishing",
        "Email", "Files", "Calendar", "Contacts", "Documents"
      ],
      templates: [
        "Freelancer Portal",
        "Client Dashboard",
        "Project Proposals"
      ],
      features: [
        "API Keys configured",
        "Starter workflows",
        "Team RBAC setup"
      ]
    }
  },
  {
    id: "founder-builder",
    name: "Founder / Builder",
    icon: "🚀",
    description: "For founders building products and managing early-stage operations",
    features: [
      "All-in-one workspace",
      "Project & task management",
      "Client portal ready",
      "Invoicing & payments",
      "Growth tools included"
    ],
    provisions: {
      apps: [
        "CRM", "Projects", "Invoicing", "Forms", "Web Publishing",
        "Email", "Files", "Calendar", "Contacts", "Documents"
      ],
      templates: [
        "Freelancer Portal",
        "Pitch Deck",
        "Product Roadmap"
      ],
      features: [
        "API Keys configured",
        "Starter workflows",
        "Growth analytics"
      ]
    }
  },
  {
    id: "event-manager",
    name: "Event Manager",
    icon: "🎪",
    description: "Manage events, registrations, attendees, and marketing campaigns",
    features: [
      "Event registration pages",
      "Attendee management",
      "Email marketing",
      "Landing page builder",
      "Analytics & reporting"
    ],
    provisions: {
      apps: [
        "Events", "Forms", "CRM", "Email", "Web Publishing",
        "Calendar", "Contacts", "Documents"
      ],
      templates: [
        "Event Registration",
        "Marketing Landing Page",
        "Attendee Dashboard"
      ],
      features: [
        "Event workflows",
        "Email automation",
        "Registration forms"
      ]
    },
    comingSoon: true
  },
  {
    id: "freelancer",
    name: "Freelancer",
    icon: "💼",
    description: "Manage clients, projects, time tracking, and invoicing in one place",
    features: [
      "Client portal",
      "Time tracking",
      "Invoice generation",
      "Project management",
      "Contract templates"
    ],
    provisions: {
      apps: [
        "CRM", "Projects", "Invoicing", "Forms", "Files",
        "Calendar", "Contacts", "Documents"
      ],
      templates: [
        "Freelancer Portal",
        "Client Dashboard",
        "Invoice Templates"
      ],
      features: [
        "Time tracking setup",
        "Payment reminders",
        "Contract workflows"
      ]
    },
    comingSoon: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: "🏢",
    description: "Full-featured workspace for teams with advanced needs",
    features: [
      "All apps & templates",
      "Multi-team support",
      "Advanced CRM",
      "Custom domains",
      "Priority support"
    ],
    provisions: {
      apps: [
        "CRM", "Projects", "Invoicing", "Forms", "Events",
        "Web Publishing", "Email", "Files", "Calendar",
        "Contacts", "Documents", "Analytics", "Settings"
      ],
      templates: [
        "All starter templates",
        "Custom team templates",
        "Advanced workflows"
      ],
      features: [
        "Multi-team RBAC",
        "Custom domains",
        "Advanced analytics",
        "API access"
      ]
    },
    comingSoon: true
  }
];

/**
 * Get ICP definition by ID
 */
export function getICPDefinition(id: string): ICPDefinition | undefined {
  return ICP_DEFINITIONS.find(icp => icp.id === id);
}

/**
 * Get available (non-coming-soon) ICPs
 */
export function getAvailableICPs(): ICPDefinition[] {
  return ICP_DEFINITIONS.filter(icp => !icp.comingSoon);
}

/**
 * Get coming soon ICPs
 */
export function getComingSoonICPs(): ICPDefinition[] {
  return ICP_DEFINITIONS.filter(icp => icp.comingSoon);
}
