/**
 * OAUTH 2.0 SCHEMAS
 *
 * Database schema for OAuth 2.0 authentication system.
 * Supports Authorization Code flow with PKCE, refresh tokens, and granular scopes.
 *
 * Architecture:
 * - oauthApplications: OAuth apps registered by organizations
 * - oauthAuthorizationCodes: Temporary codes (10 min lifetime)
 * - oauthRefreshTokens: Long-lived tokens (30 days)
 * - oauthRevokedTokens: Revocation list for access tokens
 *
 * @see .kiro/api_oauth_jose/IMPLEMENTATION_PLAN.md
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * OAuth Applications
 *
 * Registered OAuth applications that can request authorization.
 * Created by organization admins for integrations (Zapier, Make, custom apps).
 */
export const oauthApplications = defineTable({
  // Ownership
  organizationId: v.id("organizations"),      // Owner of this OAuth app
  createdBy: v.string(),                      // User ID who created it (string not Id to avoid circular dependency)

  // Application Details
  name: v.string(),                           // "My Zapier Integration"
  description: v.optional(v.string()),        // Optional description

  // OAuth Credentials
  clientId: v.string(),                       // "clnt_abc123" (public identifier)
  clientSecretHash: v.string(),               // Hashed secret (never store plaintext)

  // Configuration
  redirectUris: v.array(v.string()),          // Allowed callback URLs
  scopes: v.string(),                         // Space-separated scopes (OAuth 2.0 spec)
  type: v.union(v.literal("confidential"), v.literal("public")), // Client type (OAuth 2.0 spec)

  // App Classification (for licensing)
  appType: v.union(v.literal("custom"), v.literal("third_party")), // Custom app or verified integration
  verifiedIntegrationId: v.optional(v.string()), // ID from VERIFIED_INTEGRATIONS if third_party

  // Settings
  isActive: v.boolean(),                      // Can be disabled without deletion
  requirePkce: v.optional(v.boolean()),       // Require PKCE for this app

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  lastUsedAt: v.optional(v.number()),         // Last time token was issued
})
  .index("by_organization", ["organizationId"])
  .index("by_client_id", ["clientId"])
  .index("by_active", ["isActive", "organizationId"])
  .index("by_org_and_app_type", ["organizationId", "appType"]); // For quota enforcement

/**
 * OAuth Authorization Codes
 *
 * Temporary codes exchanged for access tokens.
 * Short-lived (10 minutes) and single-use to prevent replay attacks.
 */
export const oauthAuthorizationCodes = defineTable({
  // Code Details
  code: v.string(),                           // "auth_abc123" (cryptographically random)

  // Related Entities
  clientId: v.string(),                       // Which app requested this
  userId: v.string(),                         // Who authorized (string for compatibility)
  organizationId: v.id("organizations"),      // Which org context

  // Authorization Details
  redirectUri: v.string(),                    // Must match on token exchange
  scope: v.string(),                          // Space-separated scopes granted

  // PKCE Support (for mobile/SPA clients)
  codeChallenge: v.optional(v.string()),      // SHA-256 hash of verifier
  codeChallengeMethod: v.optional(v.string()), // "S256" or "plain"

  // Lifecycle
  expiresAt: v.number(),                      // Timestamp (10 minutes from creation)
  used: v.boolean(),                          // Prevent code reuse
  usedAt: v.optional(v.number()),             // When it was exchanged

  createdAt: v.number(),
})
  .index("by_code", ["code"])
  .index("by_expiry", ["expiresAt"])
  .index("by_client_user", ["clientId", "userId"])
  .index("by_client", ["clientId"]);         // Added for app deletion

/**
 * OAuth Refresh Tokens
 *
 * Long-lived tokens used to obtain new access tokens without re-authorization.
 * Stored hashed for security.
 */
export const oauthRefreshTokens = defineTable({
  // Token Details
  tokenHash: v.string(),                      // Hashed refresh token (never store plaintext)
  tokenId: v.string(),                        // Unique ID for this token (for revocation)

  // Related Entities
  clientId: v.string(),                       // Which app owns this
  userId: v.string(),                         // Who it's for (string for compatibility)
  organizationId: v.id("organizations"),      // Org context

  // Authorization
  scope: v.string(),                          // Granted scopes (space-separated)

  // Lifecycle
  expiresAt: v.number(),                      // Typically 30 days from creation
  revoked: v.boolean(),                       // Can be revoked by user
  revokedAt: v.optional(v.number()),          // When it was revoked
  revokedReason: v.optional(v.string()),      // Why it was revoked

  // Usage Tracking
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),         // Last time used to refresh
  useCount: v.optional(v.number()),           // How many times refreshed
})
  .index("by_token_id", ["tokenId"])
  .index("by_client_user", ["clientId", "userId"])
  .index("by_expiry", ["expiresAt"])
  .index("by_revoked", ["revoked", "expiresAt"])
  .index("by_client", ["clientId"]);         // Added for app deletion

/**
 * OAuth Revoked Tokens
 *
 * Revocation list for access tokens (JWTs).
 * Since JWTs are stateless, we need to track revoked ones until they expire.
 */
export const oauthRevokedTokens = defineTable({
  // Token Identity
  jti: v.string(),                            // JWT ID (unique identifier from token)

  // Context
  userId: v.string(),                         // String for compatibility
  organizationId: v.id("organizations"),
  clientId: v.string(),

  // Revocation
  revokedAt: v.number(),
  revokedBy: v.string(),                      // Who revoked it (string for compatibility)
  revokedReason: v.optional(v.string()),      // "user_logout", "security_breach", etc.

  // Cleanup
  tokenExpiresAt: v.number(),                 // Original token expiry (for cleanup)
})
  .index("by_jti", ["jti"])
  .index("by_expiry", ["tokenExpiresAt"])     // For cleanup job
  .index("by_user", ["userId", "organizationId"]);

/**
 * OAuth Token Usage Analytics
 *
 * Track token usage for analytics, debugging, and security monitoring.
 * Optional - can be disabled for privacy.
 */
export const oauthTokenUsage = defineTable({
  // Token Context
  tokenId: v.string(),                        // JWT jti or refresh token ID
  tokenType: v.string(),                      // "access" or "refresh"

  // Request Context
  clientId: v.string(),
  organizationId: v.id("organizations"),
  userId: v.string(),                         // String for compatibility

  // API Usage
  endpoint: v.string(),                       // "/api/v1/crm/contacts"
  method: v.string(),                         // "GET", "POST", etc.
  statusCode: v.optional(v.number()),         // HTTP response code

  // Metadata
  timestamp: v.number(),
  ipAddress: v.optional(v.string()),          // For security monitoring
  userAgent: v.optional(v.string()),          // Client information
})
  .index("by_client_org", ["clientId", "organizationId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_user", ["userId", "timestamp"]);
