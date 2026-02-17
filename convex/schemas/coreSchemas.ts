import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Core platform schemas - users, organizations, memberships
 * These are the foundation of the multi-tenant system
 */

export const users = defineTable({
  // Personal info
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.string(),

  // Organization association
  defaultOrgId: v.optional(v.id("organizations")),

  // Role-based access control
  global_role_id: v.optional(v.id("roles")), // Global super admin bypass role

  // User preferences
  preferredLanguage: v.optional(v.string()),
  timezone: v.optional(v.string()),

  // Password and invitation fields (for bcrypt implementation)
  isPasswordSet: v.optional(v.boolean()), // false for new invites
  invitedBy: v.optional(v.id("users")),
  invitedAt: v.optional(v.number()),

  // Quick Start onboarding tracking
  completedICPs: v.optional(v.array(v.string())), // ICP IDs user has completed ["ai-agency", "freelancer", etc.]

  // Account deletion (grace period)
  scheduledDeletionDate: v.optional(v.number()), // 2-week grace period before permanent deletion

  // Beta access control
  betaAccessStatus: v.optional(v.union(
    v.literal("approved"),      // Can use full platform
    v.literal("pending"),       // Requested, waiting for review
    v.literal("rejected"),      // Request denied
    v.literal("none")           // No request made yet (default for new users)
  )),
  betaAccessRequestedAt: v.optional(v.number()),
  betaAccessApprovedAt: v.optional(v.number()),
  betaAccessApprovedBy: v.optional(v.id("users")),
  betaAccessRejectionReason: v.optional(v.string()),
  betaRequestReason: v.optional(v.string()),      // Why they want access
  betaRequestUseCase: v.optional(v.string()),     // How they plan to use it
  betaReferralSource: v.optional(v.string()),     // How they heard about us

  // Metadata
  isActive: v.optional(v.boolean()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
})
  .index("email", ["email"])
  .index("by_default_org", ["defaultOrgId"])
  .index("by_beta_status", ["betaAccessStatus"])
  .index("by_beta_request_date", ["betaAccessRequestedAt"])
  .searchIndex("search_by_name", {
    searchField: "firstName",
  });

export const organizations = defineTable({
  // Core multi-tenancy (ONLY the essentials!)
  name: v.string(),                    // Display name
  slug: v.string(),                    // URL-friendly identifier
  businessName: v.string(),            // Legal business name

  // Sub-organization hierarchy (for Agency/Enterprise tiers)
  // When set, this org is a sub-org of the parent and inherits certain assets
  parentOrganizationId: v.optional(v.id("organizations")),

  // Plan & status
  // DEPRECATED: plan field - use organization_license object instead (single source of truth)
  // Made optional for backward compatibility during migration to organization_license
  // Use getLicenseInternal() from convex/licensing/helpers.ts to check plan/limits/features
  plan: v.optional(v.union(
    v.literal("free"),
    v.literal("pro"),
    v.literal("starter"),       // Legacy - mapped to "pro" for new subscriptions
    v.literal("professional"),  // Legacy - mapped to "pro" for new subscriptions
    v.literal("agency"),
    v.literal("enterprise")
  )),
  isPersonalWorkspace: v.boolean(),
  isActive: v.boolean(),

  // Stripe Customer ID (for platform billing only - NOT Connect)
  // This is for when l4yercak3 charges the organization for subscriptions/usage
  stripeCustomerId: v.optional(v.string()),           // Stripe customer ID (cus_...)
  stripeSubscriptionId: v.optional(v.string()),       // Active subscription ID (sub_...)

  // Trial tracking (for platform subscriptions)
  trialStatus: v.optional(v.union(
    v.literal("active"),
    v.literal("ended"),
    v.literal("converted"),
    v.literal("canceled")
  )),
  trialStartedAt: v.optional(v.number()),
  trialEndsAt: v.optional(v.number()),
  trialPlan: v.optional(v.string()),                  // Which plan tier they're trialing

  // Community subscription (separate add-on, not a platform tier)
  // Community members get Free platform features + access to Skool/courses/calls
  communitySubscription: v.optional(v.object({
    active: v.boolean(),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),              // Track trial period for community
    canceledAt: v.optional(v.number()),
    skoolInviteSent: v.optional(v.boolean()),
    skoolJoinedAt: v.optional(v.number()),
  })),

  // Multi-Provider Payment Integration
  paymentProviders: v.optional(v.array(v.object({
    providerCode: v.string(),           // e.g., "stripe-connect", "paypal", "square"
    accountId: v.string(),              // Provider-specific account ID
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("restricted"),
      v.literal("disabled")
    ),
    isDefault: v.boolean(),             // Is this the default provider?
    isTestMode: v.boolean(),            // Test mode (can be toggled even in production)
    connectedAt: v.number(),            // When account was connected
    lastStatusCheck: v.optional(v.number()), // Last time status was refreshed
    metadata: v.optional(v.any()),      // Provider-specific metadata (e.g., chargesEnabled, payoutsEnabled)
  }))),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  email: v.optional(v.string()),        // Organization contact email

  createdBy: v.optional(v.id("users")),                     // User who created this org
})
  .index("by_slug", ["slug"])
  .index("by_parent", ["parentOrganizationId"])
  .searchIndex("search_by_name", {
    searchField: "name",
  });

// ❌ REMOVED (moved to ontology):
// - industry, foundedYear, employeeCount → organization_profile object
// - taxId, vatNumber, etc. → organization_legal object
// - contactEmail, billingEmail, etc. → organization_contact object
// - socialMedia, bio → organization_social object
// - settings → organization_settings objects
// - Legacy address fields → address objects

export const organizationMembers = defineTable({
  userId: v.id("users"),
  organizationId: v.id("organizations"),

  // Role-based access - FK to roles table for dynamic role assignment
  role: v.id("roles"),

  // Status
  isActive: v.boolean(),
  joinedAt: v.number(),

  // Metadata
  invitedBy: v.optional(v.id("users")),
  invitedAt: v.optional(v.number()),
  acceptedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_organization", ["organizationId"])
  .index("by_user_and_org", ["userId", "organizationId"])
  .index("by_org_and_role", ["organizationId", "role"]);

// Simple auth tables for demo
export const userPasswords = defineTable({
  userId: v.id("users"),
  passwordHash: v.string(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"]);

// Frontend user passwords (for customer accounts with email/password auth)
// Separate from userPasswords which is for platform staff
export const frontendUserPasswords = defineTable({
  frontendUserId: v.id("objects"), // The frontend_user object ID
  passwordHash: v.string(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_frontend_user", ["frontendUserId"]);

export const sessions = defineTable({
  userId: v.id("users"), // Platform staff user (REQUIRED)
  email: v.string(),
  organizationId: v.id("organizations"), // Which org context this session belongs to (REQUIRED for security)
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_org", ["userId", "organizationId"]) // Find user's session in specific org
  .index("by_email_org", ["email", "organizationId"]); // Fast lookup by email within org context

// Frontend customer sessions (separate table for clean separation)
// Used by external portals (freelancer portals, client dashboards, etc.)
export const frontendSessions = defineTable({
  sessionId: v.string(), // Unique session identifier (UUID)
  frontendUserId: v.id("objects"), // Frontend customer user (REQUIRED) - maps to CRM contact
  contactEmail: v.string(), // Contact email (for quick lookup)
  organizationId: v.id("organizations"), // Customer's organization (from API key)

  // Portal context
  portalType: v.optional(v.string()), // "freelancer_portal", "client_portal", etc.
  portalUrl: v.optional(v.string()), // URL of the deployed portal
  invitationId: v.optional(v.id("objects")), // Link to portal_invitation object

  // Session timing
  createdAt: v.number(),
  expiresAt: v.number(),
  lastActivityAt: v.optional(v.number()), // Track last activity for auto-logout

  // Security tracking
  userAgent: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
})
  .index("by_frontend_user", ["frontendUserId"])
  .index("by_session_id", ["sessionId"])
  .index("by_email_org", ["contactEmail", "organizationId"]) // Fast lookup by email within org context
  .index("by_expiry", ["expiresAt"]); // For cleanup of expired sessions

// Passkeys (WebAuthn) - Multi-factor authentication
export const passkeys = defineTable({
  userId: v.id("users"),

  // WebAuthn credential data
  credentialId: v.string(),           // Base64URL encoded credential ID (unique per device)
  publicKey: v.string(),              // Base64URL encoded public key
  counter: v.number(),                // Signature counter for replay attack prevention

  // Device metadata
  deviceName: v.string(),             // User-friendly name ("iPhone 15 Pro", "MacBook Air")
  deviceType: v.optional(v.string()), // "platform" (Face ID/Touch ID) or "cross-platform" (security key)

  // Authenticator metadata (from WebAuthn)
  aaguid: v.optional(v.string()),     // Authenticator Attestation GUID
  transports: v.optional(v.array(v.string())), // ["internal", "usb", "nfc", "ble"]

  // Security
  backupEligible: v.optional(v.boolean()),  // Can credential be backed up (iCloud Keychain)
  backupState: v.optional(v.boolean()),     // Is credential currently backed up

  // Status
  isActive: v.boolean(),
  lastUsedAt: v.optional(v.number()),

  // Metadata
  createdAt: v.number(),
  revokedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_credential", ["credentialId"])
  .index("by_user_active", ["userId", "isActive"]);

// Passkey Challenges - Temporary storage for WebAuthn challenges
export const passkeysChallenges = defineTable({
  userId: v.id("users"),
  challenge: v.string(),              // WebAuthn challenge string
  type: v.union(v.literal("registration"), v.literal("authentication")), // Challenge type
  deviceName: v.optional(v.string()), // For registration challenges only
  createdAt: v.number(),
  expiresAt: v.number(),              // Auto-expire after 5 minutes
})
  .index("by_user_type", ["userId", "type"])
  .index("by_expiry", ["expiresAt"]);

// API Keys - Enterprise API authentication (Stripe security model)
export const apiKeys = defineTable({
  // Key storage (NEVER store plaintext!)
  // Format: sk_live_{32_random_bytes} or sk_test_{32_random_bytes}
  keyHash: v.string(),                 // Hashed key (bcrypt)
  keyPrefix: v.string(),               // First 12 chars (e.g., "sk_live_4f3a") for identification

  name: v.string(),                    // Human-readable name ("Freelancer Portal Template")

  // Ownership
  organizationId: v.id("organizations"),
  createdBy: v.id("users"),            // User who generated the key

  // Security: Scoped Permissions (following Stripe/GitHub model)
  scopes: v.array(v.string()),         // ["contacts:read", "contacts:write", "invoices:read"]
                                       // Use ["*"] for full access (dangerous!)
  type: v.union(                       // API key type
    v.literal("simple"),               // Simple long-lived key (95% of users)
    v.literal("oauth")                 // OAuth application key (5% of users)
  ),

  // Security: Domain Restrictions (like CORS)
  allowedDomains: v.optional(v.array(v.string())), // ["https://my-app.com", "http://localhost:3000"]
  allowedIPs: v.optional(v.array(v.string())),     // Optional IP whitelist (rare use case)

  // Status
  status: v.union(
    v.literal("active"),
    v.literal("revoked")
  ),

  // Usage tracking
  lastUsed: v.optional(v.number()),
  lastUsedFrom: v.optional(v.string()), // IP address or domain
  requestCount: v.optional(v.number()), // Total requests made with this key

  // Expiration & Rotation
  expiresAt: v.optional(v.number()),              // Optional expiration (default: never)
  rotationWarningShownAt: v.optional(v.number()), // After 90 days, remind user to rotate

  // Revocation
  revokedAt: v.optional(v.number()),
  revokedBy: v.optional(v.id("users")),
  revokeReason: v.optional(v.string()),

  // Metadata
  createdAt: v.number(),
})
  .index("by_key_prefix", ["keyPrefix"])        // Fast lookup for hashed keys
  .index("by_organization", ["organizationId"]) // List organization's keys
  .index("by_organization_status", ["organizationId", "status"]) // Active keys only
  .index("by_status", ["status"])               // All active keys
  .index("by_last_used", ["lastUsed"]);         // Find inactive keys for cleanup

// Role-Based Access Control (RBAC) Tables
export const roles = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_name", ["name"]);

export const permissions = defineTable({
  name: v.string(),
  resource: v.string(), // e.g., "users", "organizations", "system"
  action: v.string(), // e.g., "read", "write", "delete", "manage"
  description: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_name", ["name"])
  .index("by_resource", ["resource"])
  .index("by_resource_action", ["resource", "action"]);

export const rolePermissions = defineTable({
  roleId: v.id("roles"),
  permissionId: v.id("permissions"),
  createdAt: v.number(),
})
  .index("by_role", ["roleId"])
  .index("by_permission", ["permissionId"])
  .index("by_role_permission", ["roleId", "permissionId"]);

// ❌ organizationAddresses TABLE REMOVED
// Organization addresses are now stored as objects in the ontology system
// See organizationOntology.ts for address management helpers

// User Preferences - UI settings that sync across devices
export const userPreferences = defineTable({
  userId: v.id("users"),

  // Canonical appearance mode (migration-safe, dark/sepia only)
  appearanceMode: v.optional(v.union(v.literal("dark"), v.literal("sepia"))),

  // UI Preferences
  themeId: v.string(), // "win95-light", "win95-dark", etc.
  windowStyle: v.string(), // "windows" or "mac"

  // Region Preferences
  language: v.optional(v.string()), // ISO 639-1 language code: "en", "de", "pl", "es", "fr", "ja"

  // Future preferences (easy to extend)
  // timezone: v.optional(v.string()),
  // dateFormat: v.optional(v.string()),
  // timeFormat: v.optional(v.string()),
  // fontSize: v.optional(v.string()),
  // notificationsEnabled: v.optional(v.boolean()),

  // Metadata
  updatedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"]);

// Organization Media - File storage for images, documents, etc.
export const organizationMedia = defineTable({
  // Ownership
  organizationId: v.id("organizations"),
  uploadedBy: v.id("users"),

  // Folder organization (links to ontology media_folder objects)
  folderId: v.optional(v.string()), // ID of media_folder object in ontology (null = root level)

  // Item type
  itemType: v.optional(v.union(
    v.literal("file"),              // Regular file (image, PDF, etc.) - default
    v.literal("layercake_document") // Native Layer Cake document with markdown
  )),

  // Convex Storage (for files only)
  storageId: v.optional(v.id("_storage")), // Convex file storage ID (null for Layer Cake docs)

  // Layer Cake Document content (for layercake_document itemType only)
  documentContent: v.optional(v.string()), // Markdown content

  // File metadata
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),

  // Optional: Image-specific metadata
  width: v.optional(v.number()),
  height: v.optional(v.number()),

  // Usage tracking
  usageCount: v.optional(v.number()), // How many templates use this
  lastUsedAt: v.optional(v.number()),

  // Organization & categorization
  category: v.optional(v.union(
    v.literal("template"),   // Used in web templates
    v.literal("logo"),       // Organization logo
    v.literal("avatar"),     // User avatars
    v.literal("compliance"), // Compliance PDFs
    v.literal("general")     // General media
  )),
  tags: v.optional(v.array(v.string())), // For searching
  description: v.optional(v.string()),

  // Starring/favoriting
  isStarred: v.optional(v.boolean()),
  starredAt: v.optional(v.number()),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_organization_and_category", ["organizationId", "category"])
  .index("by_storage_id", ["storageId"])
  .index("by_uploaded_by", ["uploadedBy"])
  .index("by_folder", ["folderId"])
  .index("by_organization_and_folder", ["organizationId", "folderId"])
  .index("by_organization_and_starred", ["organizationId", "isStarred"]);

// OAuth Connections - User and organization OAuth account linking
export const oauthConnections = defineTable({
  // Ownership (EITHER user-level OR org-level, not both)
  userId: v.optional(v.id("users")),           // Personal connection (user links their own account)
  organizationId: v.id("organizations"),       // Always scoped to an organization

  // OAuth provider details
  provider: v.union(
    v.literal("microsoft"),
    v.literal("google"),
    v.literal("apple"),
    v.literal("slack"),
    v.literal("salesforce"),
    v.literal("dropbox"),
    v.literal("github"),
    v.literal("vercel"),
    v.literal("okta"),
    v.literal("activecampaign"),
    v.literal("whatsapp")
    // Add more providers as needed - no DB migration required!
  ),
  providerAccountId: v.string(),               // Provider's unique user ID
  providerEmail: v.string(),                   // Email address from provider

  // Connection type
  connectionType: v.union(
    v.literal("personal"),                     // User's personal connection
    v.literal("organizational")                // Organization-wide connection (admin-linked)
  ),

  // OAuth tokens (stored encrypted)
  accessToken: v.string(),                     // Encrypted access token
  refreshToken: v.string(),                    // Encrypted refresh token
  tokenExpiresAt: v.number(),                  // Timestamp when access token expires

  // Granted scopes/permissions
  scopes: v.array(v.string()),                 // e.g., ["Mail.Read", "Calendars.Read", "Files.Read"]

  // Sync settings (user-controlled)
  syncSettings: v.object({
    email: v.boolean(),                        // Sync emails
    calendar: v.boolean(),                     // Sync calendar events
    oneDrive: v.boolean(),                     // Sync OneDrive files
    sharePoint: v.boolean(),                   // Sync SharePoint sites
    // Add more sync options as features are added
  }),

  // Connection status
  status: v.union(
    v.literal("active"),                       // Connection working
    v.literal("expired"),                      // Token expired (needs refresh)
    v.literal("revoked"),                      // User revoked access
    v.literal("error")                         // Error occurred
  ),
  lastSyncAt: v.optional(v.number()),          // Last successful sync timestamp
  lastSyncError: v.optional(v.string()),       // Last error message (if any)

  // Provider-specific metadata (extensible)
  customProperties: v.optional(v.any()),       // e.g., { tenantId: "...", workspace: "..." }

  // Metadata
  connectedAt: v.number(),                     // When connection was established
  updatedAt: v.number(),                       // Last update timestamp
})
  .index("by_user_and_org", ["userId", "organizationId"])               // Find user's connections in an org
  .index("by_organization", ["organizationId"])                         // Find all org connections
  .index("by_provider_account", ["provider", "providerAccountId"])      // Find connection by provider account
  .index("by_status", ["status"])                                       // Find connections by status
  .index("by_org_and_provider", ["organizationId", "provider"]);        // Find connections by org and provider

// CLI Sessions - Authenticated CLI users (bcrypt hashed tokens)
export const cliSessions = defineTable({
  // CLI session for authenticated CLI users
  userId: v.id("users"),
  email: v.string(),
  organizationId: v.id("organizations"),

  // Token storage (bcrypt hashed for security)
  // DEPRECATED: cliToken - kept for backward compatibility during migration
  cliToken: v.optional(v.string()),            // OLD: plaintext token (to be removed)
  tokenHash: v.optional(v.string()),           // NEW: bcrypt hash of full token
  tokenPrefix: v.optional(v.string()),         // NEW: first 20 chars for lookup ("cli_session_abc123")

  createdAt: v.number(),
  expiresAt: v.number(),                       // 30 days from creation
  lastUsedAt: v.number(),
})
  .index("by_token", ["cliToken"])             // DEPRECATED: for backward compat during migration
  .index("by_token_prefix", ["tokenPrefix"])   // NEW: fast prefix lookup, then bcrypt verify
  .index("by_user", ["userId"])
  .index("by_organization", ["organizationId"]);

export const cliLoginStates = defineTable({
  // Temporary OAuth state tokens during CLI login flow
  state: v.string(),                           // UUID for CSRF protection
  cliToken: v.string(),                        // Pre-generated token to store after OAuth
  callbackUrl: v.string(),                     // Where to redirect after OAuth
  provider: v.optional(v.string()),             // OAuth provider: "microsoft", "google", "github", or null (user selects)
  createdAt: v.number(),
  expiresAt: v.number(),                      // 10 minutes
})
  .index("by_state", ["state"]);

export const oauthSignupStates = defineTable({
  // Temporary OAuth state tokens during OAuth signup flow (unified for Platform UI and CLI)
  state: v.string(),                           // UUID for CSRF protection
  sessionType: v.union(v.literal("platform"), v.literal("cli")), // Platform UI or CLI session
  callbackUrl: v.string(),                     // Where to redirect after OAuth
  provider: v.union(v.literal("microsoft"), v.literal("google"), v.literal("github")), // OAuth provider
  organizationName: v.optional(v.string()),    // Optional organization name for new accounts
  cliToken: v.optional(v.string()),            // Pre-generated CLI token (only for CLI sessions)
  cliState: v.optional(v.string()),            // CLI's original state for CSRF protection (returned in callback)
  createdAt: v.number(),
  expiresAt: v.number(),                      // 10 minutes
})
  .index("by_state", ["state"]);

export const oauthStates = defineTable({
  // State token
  state: v.string(),                           // Random UUID for CSRF protection

  // User and organization context
  userId: v.id("users"),
  organizationId: v.id("organizations"),

  // OAuth flow metadata
  provider: v.union(
    v.literal("microsoft"),
    v.literal("github"),
    v.literal("google"),
    v.literal("apple"),
    v.literal("slack"),
    v.literal("salesforce"),
    v.literal("dropbox"),
    v.literal("vercel"),
    v.literal("okta"),
    v.literal("activecampaign"),
    v.literal("whatsapp")
  ),
  connectionType: v.union(
    v.literal("personal"),
    v.literal("organizational")
  ),

  // Optional return URL - where to redirect after OAuth completes
  returnUrl: v.optional(v.string()),

  // Expiration (short-lived: 10 minutes)
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_state", ["state"])
  .index("by_user", ["userId"]);

// Zapier Webhook Subscriptions - REST hooks for Zapier integrations
// Multi-tenant: Each subscription is scoped to ONE organization
export const webhookSubscriptions = defineTable({
  organizationId: v.id("organizations"),       // Which organization owns this webhook
  event: v.string(),                           // "community_subscription_created", "new_contact", etc.
  targetUrl: v.string(),                       // Zapier's webhook URL (e.g., hooks.zapier.com/...)
  isActive: v.boolean(),                       // Can be disabled without deletion
  createdAt: v.number(),
  updatedAt: v.number(),
  lastDeliveredAt: v.optional(v.number()),     // Last successful delivery
  deliveryCount: v.number(),                   // Total successful deliveries
  failureCount: v.number(),                    // Consecutive failures (auto-disable after 10)
})
  .index("by_organization", ["organizationId"])
  .index("by_event", ["event", "isActive"])
  .index("by_organization_event", ["organizationId", "event"]);

// ============================================================================
// MULTI-PROVIDER IDENTITY SYSTEM
// ============================================================================
// Enables users to sign in with multiple OAuth providers (Google, Apple, Microsoft)
// and link them to a single user account. Supports account collision detection
// and explicit linking confirmation.

/**
 * User Identities - Links OAuth providers to platform users
 *
 * Each user can have multiple identities (e.g., Google + Apple + Microsoft).
 * Primary identity is used for display purposes and email preferences.
 *
 * Key lookup patterns:
 * 1. By provider + providerUserId: Find user by OAuth provider's unique ID
 * 2. By email: Detect account collisions when same email from different provider
 * 3. By user: List all linked providers for a user
 */
export const userIdentities = defineTable({
  // Link to platform user
  userId: v.id("users"),

  // OAuth provider identification
  provider: v.union(
    v.literal("google"),
    v.literal("apple"),
    v.literal("microsoft"),
    v.literal("github"),
    v.literal("password")                      // For users who sign up with email/password
  ),
  providerUserId: v.string(),                  // Provider's unique user ID (e.g., Apple's "sub", Google's "id")
  providerEmail: v.string(),                   // Email from provider (may be Apple relay)

  // Apple-specific: Handle private relay emails
  isApplePrivateRelay: v.optional(v.boolean()), // True if @privaterelay.appleid.com
  realEmailHint: v.optional(v.string()),        // User-provided real email for linking

  // Identity status
  isPrimary: v.boolean(),                      // Primary identity for this user
  isVerified: v.boolean(),                     // Email verified by provider

  // Timestamps
  connectedAt: v.number(),                     // When identity was linked
  lastUsedAt: v.optional(v.number()),          // Last successful login with this identity

  // Provider-specific metadata (profile picture, name, etc.)
  metadata: v.optional(v.any()),
})
  .index("by_user", ["userId"])                                    // List all identities for a user
  .index("by_provider_user", ["provider", "providerUserId"])       // Primary lookup: find user by OAuth ID
  .index("by_email", ["providerEmail"])                            // Collision detection: find by email
  .index("by_user_provider", ["userId", "provider"]);              // Check if user has specific provider

/**
 * Account Linking States - Temporary state for account linking flow
 *
 * When a user signs in with a new provider but the email matches an existing account,
 * we create a linking state and prompt the user to confirm linking.
 *
 * Flow:
 * 1. User signs in with Apple → email matches existing Google account
 * 2. Backend creates linking state, returns { requiresLinking: true, linkingState: "..." }
 * 3. Mobile shows prompt: "Link to existing account?"
 * 4. User confirms → POST /api/v1/auth/link-account/confirm
 * 5. Backend links identity, completes login
 *
 * States expire after 15 minutes for security.
 */
export const accountLinkingStates = defineTable({
  // Security token
  state: v.string(),                           // UUID for request validation

  // Source: The new OAuth login attempt
  sourceProvider: v.union(
    v.literal("google"),
    v.literal("apple"),
    v.literal("microsoft"),
    v.literal("github")
  ),
  sourceProviderUserId: v.string(),            // Provider's user ID
  sourceEmail: v.string(),                     // Email from new provider
  sourceName: v.optional(v.string()),          // Name from new provider
  sourceIdToken: v.optional(v.string()),       // Encrypted ID token for re-verification

  // Target: The existing account to link to
  targetUserId: v.id("users"),                 // Existing user ID
  targetEmail: v.string(),                     // Existing user's email (for display)
  targetProvider: v.optional(v.string()),      // Primary provider of existing account

  // Linking status
  status: v.union(
    v.literal("pending"),                      // Awaiting user confirmation
    v.literal("confirmed"),                    // User confirmed, linking complete
    v.literal("rejected"),                     // User rejected linking
    v.literal("expired")                       // State expired (15 min timeout)
  ),

  // Timestamps
  createdAt: v.number(),
  expiresAt: v.number(),                       // 15 minutes from creation
  resolvedAt: v.optional(v.number()),          // When confirmed/rejected
})
  .index("by_state", ["state"])                // Primary lookup
  .index("by_target_user", ["targetUserId", "status"])  // Find pending links for user
  .index("by_source_provider", ["sourceProvider", "sourceProviderUserId"]); // Prevent duplicate link requests

// ============================================================================
// PLATFORM SETTINGS
// ============================================================================
// Global platform-wide configuration (beta access toggle, feature flags, etc.)

export const platformSettings = defineTable({
  key: v.string(),              // Setting key (e.g., "betaAccessEnabled")
  value: v.any(),               // Setting value (boolean, string, number, object)
  description: v.optional(v.string()),
  updatedBy: v.optional(v.id("users")),
  updatedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_key", ["key"]);    // Unique lookup by setting key
