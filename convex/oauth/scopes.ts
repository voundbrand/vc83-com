/**
 * OAUTH 2.0 SCOPES
 *
 * Defines all available OAuth scopes for the L4YERCAK3 platform.
 * Scopes control granular access to different parts of the API.
 *
 * Format: <resource>:<action>
 * Examples: contacts:read, invoices:write
 *
 * @see .kiro/api_oauth_jose/IMPLEMENTATION_PLAN.md for scope definitions
 */

/**
 * Scope Definition
 */
export interface OAuthScope {
  id: string;              // Unique scope identifier
  name: string;            // Display name for consent page
  description: string;     // What this scope allows
  category: string;        // Group scopes by feature area
  dangerous?: boolean;     // Requires extra confirmation
}

/**
 * All Available OAuth Scopes
 *
 * Organized by category for easier management and display.
 */
export const OAUTH_SCOPES: Record<string, OAuthScope> = {
  // CRM (Customer Relationship Management)
  'contacts:read': {
    id: 'contacts:read',
    name: 'Read Contacts',
    description: 'View CRM contacts and their details',
    category: 'CRM',
  },
  'contacts:write': {
    id: 'contacts:write',
    name: 'Manage Contacts',
    description: 'Create, update, and delete CRM contacts',
    category: 'CRM',
  },

  // Invoicing
  'invoices:read': {
    id: 'invoices:read',
    name: 'Read Invoices',
    description: 'View invoices and payment status',
    category: 'Invoicing',
  },
  'invoices:write': {
    id: 'invoices:write',
    name: 'Manage Invoices',
    description: 'Create, send, and delete invoices',
    category: 'Invoicing',
  },

  // Events
  'events:read': {
    id: 'events:read',
    name: 'Read Events',
    description: 'View events and registrations',
    category: 'Events',
  },
  'events:write': {
    id: 'events:write',
    name: 'Manage Events',
    description: 'Create and manage events',
    category: 'Events',
  },

  // Projects
  'projects:read': {
    id: 'projects:read',
    name: 'Read Projects',
    description: 'View projects, tasks, and milestones',
    category: 'Projects',
  },
  'projects:write': {
    id: 'projects:write',
    name: 'Manage Projects',
    description: 'Create and manage projects',
    category: 'Projects',
  },

  // Forms
  'forms:read': {
    id: 'forms:read',
    name: 'Read Forms',
    description: 'View forms and responses',
    category: 'Forms',
  },
  'forms:write': {
    id: 'forms:write',
    name: 'Manage Forms',
    description: 'Create and manage forms',
    category: 'Forms',
  },

  // Analytics
  'analytics:read': {
    id: 'analytics:read',
    name: 'Read Analytics',
    description: 'View analytics dashboards and reports',
    category: 'Analytics',
  },

  // Organization Settings
  'org:read': {
    id: 'org:read',
    name: 'Read Organization',
    description: 'View organization settings and information',
    category: 'Organization',
  },
  'org:write': {
    id: 'org:write',
    name: 'Manage Organization',
    description: 'Update organization settings',
    category: 'Organization',
    dangerous: true,
  },
  'sub_org:manage': {
    id: 'sub_org:manage',
    name: 'Manage Sub-Organizations',
    description: 'Create and manage sub-organizations (agency tier)',
    category: 'Organization',
    dangerous: true,
  },

  // Webhooks
  'webhooks:read': {
    id: 'webhooks:read',
    name: 'Read Webhooks',
    description: 'View webhook configurations',
    category: 'Webhooks',
  },
  'webhooks:write': {
    id: 'webhooks:write',
    name: 'Manage Webhooks',
    description: 'Create and manage webhook subscriptions',
    category: 'Webhooks',
  },

  // Workflows
  'workflows:read': {
    id: 'workflows:read',
    name: 'Read Workflows',
    description: 'View workflow templates and executions',
    category: 'Workflows',
  },
  'workflows:write': {
    id: 'workflows:write',
    name: 'Manage Workflows',
    description: 'Create and manage workflow templates',
    category: 'Workflows',
  },
  'workflows:execute': {
    id: 'workflows:execute',
    name: 'Execute Workflows',
    description: 'Trigger workflow execution',
    category: 'Workflows',
  },
} as const;

/**
 * Get all scope IDs
 */
export function getAllScopeIds(): string[] {
  return Object.keys(OAUTH_SCOPES);
}

/**
 * Get scopes by category
 */
export function getScopesByCategory(category: string): OAuthScope[] {
  return Object.values(OAUTH_SCOPES).filter(scope => scope.category === category);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  const categories = new Set(Object.values(OAUTH_SCOPES).map(s => s.category));
  return Array.from(categories).sort();
}

/**
 * Validate Scopes
 *
 * Check if requested scopes are valid and allowed.
 *
 * @param requestedScopes - Space-separated scope string or array
 * @param allowedScopes - Scopes this client can request
 * @returns Validation result
 */
export function validateScopes(
  requestedScopes: string | string[],
  allowedScopes?: string[]
): { valid: boolean; scopes: string[]; invalid: string[] } {
  // Parse scopes
  const scopes = typeof requestedScopes === 'string'
    ? requestedScopes.split(' ').filter(Boolean)
    : requestedScopes;

  // Check for invalid scopes
  const invalid = scopes.filter(scope => !OAUTH_SCOPES[scope]);

  if (invalid.length > 0) {
    return { valid: false, scopes: [], invalid };
  }

  // Check against allowed scopes (if provided)
  if (allowedScopes) {
    const notAllowed = scopes.filter(scope => !allowedScopes.includes(scope));
    if (notAllowed.length > 0) {
      return { valid: false, scopes: [], invalid: notAllowed };
    }
  }

  return { valid: true, scopes, invalid: [] };
}

/**
 * Check if user has specific scope
 *
 * @param userScopes - Scopes granted to user (space-separated or array)
 * @param requiredScope - Scope to check for
 */
export function hasScope(
  userScopes: string | string[],
  requiredScope: string
): boolean {
  const scopes = typeof userScopes === 'string'
    ? userScopes.split(' ')
    : userScopes;

  return scopes.includes(requiredScope) || scopes.includes('*');
}

/**
 * Scope to permission mapping
 *
 * Maps OAuth scopes to API endpoint permissions.
 * Used by middleware to enforce scope-based access control.
 */
export const SCOPE_PERMISSIONS: Record<string, string[]> = {
  'contacts:read': ['GET /api/v1/crm/contacts', 'GET /api/v1/crm/contacts/:id'],
  'contacts:write': [
    'POST /api/v1/crm/contacts',
    'PUT /api/v1/crm/contacts/:id',
    'DELETE /api/v1/crm/contacts/:id',
  ],
  'invoices:read': ['GET /api/v1/invoices', 'GET /api/v1/invoices/:id'],
  'invoices:write': [
    'POST /api/v1/invoices',
    'PUT /api/v1/invoices/:id',
    'DELETE /api/v1/invoices/:id',
    'POST /api/v1/invoices/:id/send',
  ],
  // Add more mappings as needed
} as const;

/**
 * Get required scope for an endpoint
 *
 * @param method - HTTP method
 * @param path - API path
 * @returns Required scope or null if no restriction
 */
export function getRequiredScope(method: string, path: string): string | null {
  const endpoint = `${method} ${path}`;

  for (const [scope, permissions] of Object.entries(SCOPE_PERMISSIONS)) {
    if (permissions.some(pattern => matchesPattern(endpoint, pattern))) {
      return scope;
    }
  }

  return null;
}

/**
 * Simple pattern matching for endpoints
 * Supports :id parameters
 */
function matchesPattern(endpoint: string, pattern: string): boolean {
  const regex = pattern.replace(/:[\w]+/g, '[^/]+');
  return new RegExp(`^${regex}$`).test(endpoint);
}
