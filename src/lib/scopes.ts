/**
 * API SCOPE DEFINITIONS
 *
 * Defines all available API scopes and their metadata for the scope selector UI.
 * Scopes follow the pattern: resource:action (e.g., "contacts:read", "invoices:write")
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 5
 */

export interface ScopeDefinition {
  value: string;
  label: string;
  description: string;
  category: string;
  risk: "low" | "medium" | "high";
}

export const SCOPE_CATEGORIES = [
  "Contacts",
  "Invoices",
  "Projects",
  "Workflows",
  "Analytics",
  "Settings",
] as const;

export type ScopeCategory = typeof SCOPE_CATEGORIES[number];

/**
 * All available API scopes
 *
 * Each scope grants access to a specific resource and action.
 * Scopes are hierarchical: write implies read for the same resource.
 */
export const ALL_SCOPES: ScopeDefinition[] = [
  // Contacts
  {
    value: "contacts:read",
    label: "Read Contacts",
    description: "View contact information and lists",
    category: "Contacts",
    risk: "low",
  },
  {
    value: "contacts:write",
    label: "Write Contacts",
    description: "Create, update, and delete contacts",
    category: "Contacts",
    risk: "medium",
  },
  {
    value: "contacts:export",
    label: "Export Contacts",
    description: "Export contact lists to CSV or other formats",
    category: "Contacts",
    risk: "medium",
  },

  // Invoices
  {
    value: "invoices:read",
    label: "Read Invoices",
    description: "View invoices and payment history",
    category: "Invoices",
    risk: "low",
  },
  {
    value: "invoices:write",
    label: "Write Invoices",
    description: "Create, update, and delete invoices",
    category: "Invoices",
    risk: "high",
  },
  {
    value: "invoices:send",
    label: "Send Invoices",
    description: "Email invoices to customers",
    category: "Invoices",
    risk: "high",
  },

  // Projects
  {
    value: "projects:read",
    label: "Read Projects",
    description: "View project information and status",
    category: "Projects",
    risk: "low",
  },
  {
    value: "projects:write",
    label: "Write Projects",
    description: "Create, update, and delete projects",
    category: "Projects",
    risk: "medium",
  },

  // Workflows
  {
    value: "workflows:read",
    label: "Read Workflows",
    description: "View workflow definitions and history",
    category: "Workflows",
    risk: "low",
  },
  {
    value: "workflows:write",
    label: "Write Workflows",
    description: "Create and modify workflows",
    category: "Workflows",
    risk: "high",
  },
  {
    value: "workflows:trigger",
    label: "Trigger Workflows",
    description: "Execute workflow automations",
    category: "Workflows",
    risk: "high",
  },

  // Analytics
  {
    value: "analytics:read",
    label: "Read Analytics",
    description: "View analytics dashboards and reports",
    category: "Analytics",
    risk: "low",
  },

  // Settings
  {
    value: "settings:read",
    label: "Read Settings",
    description: "View organization settings",
    category: "Settings",
    risk: "low",
  },
  {
    value: "settings:write",
    label: "Write Settings",
    description: "Modify organization settings",
    category: "Settings",
    risk: "high",
  },
];

/**
 * Wildcard scope - grants full access to all resources
 *
 * ⚠️ WARNING: This should be used sparingly and only for trusted integrations.
 */
export const WILDCARD_SCOPE: ScopeDefinition = {
  value: "*",
  label: "Full Access",
  description: "Complete access to all resources and actions",
  category: "Settings",
  risk: "high",
};

/**
 * Get scopes by category
 */
export function getScopesByCategory(category: ScopeCategory): ScopeDefinition[] {
  return ALL_SCOPES.filter((scope) => scope.category === category);
}

/**
 * Get scope definition by value
 */
export function getScopeDefinition(value: string): ScopeDefinition | undefined {
  if (value === "*") {
    return WILDCARD_SCOPE;
  }
  return ALL_SCOPES.find((scope) => scope.value === value);
}

/**
 * Check if scopes include wildcard (full access)
 */
export function hasWildcardScope(scopes: string[]): boolean {
  return scopes.includes("*");
}

/**
 * Get human-readable scope summary
 */
export function getScopeSummary(scopes: string[]): {
  total: number;
  byCategory: Record<string, number>;
  hasWildcard: boolean;
  riskLevel: "low" | "medium" | "high";
} {
  if (hasWildcardScope(scopes)) {
    return {
      total: scopes.length,
      byCategory: {},
      hasWildcard: true,
      riskLevel: "high",
    };
  }

  const byCategory: Record<string, number> = {};
  let maxRisk: "low" | "medium" | "high" = "low";

  for (const scopeValue of scopes) {
    const scope = getScopeDefinition(scopeValue);
    if (scope) {
      byCategory[scope.category] = (byCategory[scope.category] || 0) + 1;

      // Update max risk
      if (scope.risk === "high") {
        maxRisk = "high";
      } else if (scope.risk === "medium" && maxRisk === "low") {
        maxRisk = "medium";
      }
    }
  }

  return {
    total: scopes.length,
    byCategory,
    hasWildcard: false,
    riskLevel: maxRisk,
  };
}

/**
 * Format scope for display
 */
export function formatScopeLabel(scopeValue: string): string {
  const scope = getScopeDefinition(scopeValue);
  return scope?.label || scopeValue;
}
