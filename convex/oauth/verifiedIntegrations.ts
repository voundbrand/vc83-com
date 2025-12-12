/**
 * VERIFIED THIRD-PARTY INTEGRATIONS REGISTRY
 *
 * Maintains a list of verified third-party integrations (Zapier, Make, n8n, etc.)
 * to distinguish them from custom OAuth applications for licensing purposes.
 *
 * @see .kiro/api_oauth_jose/VERIFIED-INTEGRATIONS-REGISTRY.md
 */

/**
 * Verified Integration Definition
 */
export interface VerifiedIntegration {
  id: string;                    // Unique identifier (e.g., "zapier")
  name: string;                  // Display name
  type: "third_party";           // Always third_party
  verified: boolean;             // Always true
  redirectUris: string[];        // Allowed redirect URI patterns (* wildcards supported)
  domains: string[];             // Allowed domains (*.domain.com wildcards supported)
  description: string;           // Short description
  iconUrl?: string;              // Integration logo
  websiteUrl?: string;           // Integration website
  docsUrl?: string;              // Integration documentation
}

/**
 * Registry of Verified Third-Party Integrations
 *
 * These integrations get more generous OAuth app quotas.
 * See LICENSING-ENFORCEMENT-MATRIX.md for quota details.
 */
export const VERIFIED_INTEGRATIONS: VerifiedIntegration[] = [
  // ==========================================
  // AUTOMATION PLATFORMS
  // ==========================================
  {
    id: "zapier",
    name: "Zapier",
    type: "third_party",
    verified: true,
    redirectUris: [
      "https://zapier.com/dashboard/auth/oauth/return/*",
      "https://oauth.zapier.com/authorize/callback/*",
    ],
    domains: ["*.zapier.com"],
    description: "Connect to 5,000+ apps with Zapier",
    iconUrl: "https://cdn.zapier.com/zapier/images/favicon.ico",
    websiteUrl: "https://zapier.com",
    docsUrl: "https://platform.zapier.com/",
  },
  {
    id: "make",
    name: "Make (formerly Integromat)",
    type: "third_party",
    verified: true,
    redirectUris: [
      "https://www.make.com/oauth/cb/*",
      "https://www.integromat.com/oauth/cb/*",
    ],
    domains: ["*.make.com", "*.integromat.com"],
    description: "Visual automation platform",
    iconUrl: "https://www.make.com/favicon.ico",
    websiteUrl: "https://www.make.com",
    docsUrl: "https://www.make.com/en/help/",
  },
  {
    id: "n8n",
    name: "n8n",
    type: "third_party",
    verified: true,
    redirectUris: [
      "https://*.n8n.io/oauth/callback",
      "http://localhost:*/oauth/callback", // Self-hosted development
    ],
    domains: ["*.n8n.io"],
    description: "Fair-code automation platform",
    iconUrl: "https://n8n.io/favicon.ico",
    websiteUrl: "https://n8n.io",
    docsUrl: "https://docs.n8n.io/",
  },

  // ==========================================
  // DEVELOPMENT TOOLS
  // ==========================================
  {
    id: "postman",
    name: "Postman",
    type: "third_party",
    verified: true,
    redirectUris: [
      "https://oauth.pstmn.io/v1/callback",
    ],
    domains: ["*.pstmn.io", "*.postman.com"],
    description: "API development and testing",
    iconUrl: "https://www.postman.com/favicon.ico",
    websiteUrl: "https://www.postman.com",
    docsUrl: "https://learning.postman.com/",
  },
  {
    id: "insomnia",
    name: "Insomnia",
    type: "third_party",
    verified: true,
    redirectUris: [
      "https://insomnia.rest/oauth/callback",
    ],
    domains: ["*.insomnia.rest"],
    description: "API client and design platform",
    iconUrl: "https://insomnia.rest/favicon.ico",
    websiteUrl: "https://insomnia.rest",
    docsUrl: "https://docs.insomnia.rest/",
  },

  // ==========================================
  // ANALYTICS & MONITORING
  // ==========================================
  {
    id: "datadog",
    name: "Datadog",
    type: "third_party",
    verified: true,
    redirectUris: [
      "https://app.datadoghq.com/account/oauth2/callback",
    ],
    domains: ["*.datadoghq.com"],
    description: "Infrastructure monitoring",
    iconUrl: "https://www.datadoghq.com/favicon.ico",
    websiteUrl: "https://www.datadoghq.com",
    docsUrl: "https://docs.datadoghq.com/",
  },

  // ==========================================
  // DEPLOYMENT PLATFORMS
  // ==========================================
  {
    id: "github",
    name: "GitHub",
    type: "third_party",
    verified: true,
    redirectUris: [
      "https://github.com/login/oauth/authorize",
      "https://*.github.io/oauth/callback",
      "http://localhost:*/oauth/callback", // Local development
    ],
    domains: ["*.github.com", "*.github.io"],
    description: "Code hosting and version control",
    iconUrl: "https://github.com/favicon.ico",
    websiteUrl: "https://github.com",
    docsUrl: "https://docs.github.com/",
  },
  {
    id: "vercel",
    name: "Vercel",
    type: "third_party",
    verified: true,
    redirectUris: [
      "https://vercel.com/api/oauth/callback",
      "https://*.vercel.app/api/auth/callback",
      "https://*.vercel.app/api/oauth/callback",
    ],
    domains: ["*.vercel.com", "*.vercel.app"],
    description: "Deploy and host web applications",
    iconUrl: "https://vercel.com/favicon.ico",
    websiteUrl: "https://vercel.com",
    docsUrl: "https://vercel.com/docs",
  },
];

/**
 * OAuth Application Type
 *
 * - custom: User's own websites, mobile apps, backend services (strictly limited)
 * - third_party: Verified integrations like Zapier, Make, etc. (more generous quotas)
 */
export type OAuthAppType = "custom" | "third_party";

/**
 * Detect OAuth Application Type
 *
 * Analyzes redirect URIs to determine if this is a custom application
 * or a verified third-party integration.
 *
 * @param redirectUris - Array of redirect URIs for the OAuth application
 * @returns "custom" or "third_party"
 */
export function detectOAuthAppType(redirectUris: string[]): OAuthAppType {
  for (const uri of redirectUris) {
    // Check against each verified integration
    for (const integration of VERIFIED_INTEGRATIONS) {
      // Check exact match first
      if (integration.redirectUris.includes(uri)) {
        return "third_party";
      }

      // Check wildcard pattern match
      for (const pattern of integration.redirectUris) {
        if (matchesPattern(uri, pattern)) {
          return "third_party";
        }
      }

      // Check domain match
      try {
        const uriDomain = new URL(uri).hostname;
        for (const domain of integration.domains) {
          if (matchesDomain(uriDomain, domain)) {
            return "third_party";
          }
        }
      } catch (error) {
        // Invalid URL - will be caught by redirect URI validation
        continue;
      }
    }
  }

  // No match found = custom application
  return "custom";
}

/**
 * Match URI Against Wildcard Pattern
 *
 * Supports * wildcard for any characters.
 * Examples:
 * - "https://zapier.com/*" matches "https://zapier.com/dashboard/oauth"
 * - "https://*.n8n.io/callback" matches "https://app.n8n.io/callback"
 *
 * @param uri - URI to test
 * @param pattern - Pattern with optional * wildcards
 * @returns True if URI matches pattern
 */
function matchesPattern(uri: string, pattern: string): boolean {
  // Escape special regex characters except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape special chars
    .replace(/\*/g, '.*');                    // Convert * to .*

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(uri);
}

/**
 * Match Domain Against Pattern
 *
 * Supports *.domain.com wildcards for subdomains.
 * Examples:
 * - "*.zapier.com" matches "oauth.zapier.com"
 * - "*.zapier.com" matches "api.staging.zapier.com"
 * - "zapier.com" matches exactly "zapier.com"
 *
 * @param domain - Domain to test (e.g., "oauth.zapier.com")
 * @param pattern - Domain pattern (e.g., "*.zapier.com")
 * @returns True if domain matches pattern
 */
function matchesDomain(domain: string, pattern: string): boolean {
  // Wildcard subdomain match
  if (pattern.startsWith('*.')) {
    const baseDomain = pattern.slice(2); // Remove "*."
    // Match if domain ends with .baseDomain or is exactly baseDomain
    return domain === baseDomain || domain.endsWith(`.${baseDomain}`);
  }

  // Exact domain match
  return domain === pattern;
}

/**
 * Get Verified Integration by ID
 *
 * @param id - Integration ID (e.g., "zapier")
 * @returns Integration details or undefined
 */
export function getVerifiedIntegration(id: string): VerifiedIntegration | undefined {
  return VERIFIED_INTEGRATIONS.find(i => i.id === id);
}

/**
 * Get Integration Info from Redirect URI
 *
 * Identifies which verified integration (if any) a redirect URI belongs to.
 *
 * @param redirectUri - OAuth redirect URI
 * @returns Integration details or null if not a verified integration
 */
export function identifyIntegrationFromUri(redirectUri: string): VerifiedIntegration | null {
  for (const integration of VERIFIED_INTEGRATIONS) {
    // Check exact match
    if (integration.redirectUris.includes(redirectUri)) {
      return integration;
    }

    // Check pattern match
    for (const pattern of integration.redirectUris) {
      if (matchesPattern(redirectUri, pattern)) {
        return integration;
      }
    }

    // Check domain match
    try {
      const domain = new URL(redirectUri).hostname;
      for (const domainPattern of integration.domains) {
        if (matchesDomain(domain, domainPattern)) {
          return integration;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Get All Verified Integrations
 *
 * @returns Array of all verified integrations
 */
export function getAllVerifiedIntegrations(): VerifiedIntegration[] {
  return VERIFIED_INTEGRATIONS;
}

/**
 * Get Integrations by Category
 *
 * Groups integrations for UI display.
 */
export function getIntegrationsByCategory(): Record<string, VerifiedIntegration[]> {
  return {
    "Automation Platforms": VERIFIED_INTEGRATIONS.filter(i =>
      ["zapier", "make", "n8n"].includes(i.id)
    ),
    "Development Tools": VERIFIED_INTEGRATIONS.filter(i =>
      ["postman", "insomnia"].includes(i.id)
    ),
    "Analytics & Monitoring": VERIFIED_INTEGRATIONS.filter(i =>
      ["datadog"].includes(i.id)
    ),
    "Deployment Platforms": VERIFIED_INTEGRATIONS.filter(i =>
      ["github", "vercel"].includes(i.id)
    ),
  };
}
