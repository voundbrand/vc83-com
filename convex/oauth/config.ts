/**
 * OAUTH 2.0 CONFIGURATION
 *
 * Central configuration for OAuth 2.0 implementation.
 * Environment variables are loaded from Convex dashboard.
 *
 * @see .kiro/api_oauth_jose/ENV_VARS.md for environment setup
 */

/**
 * OAuth Configuration Constants
 */
export const OAUTH_CONFIG = {
  // Issuer - uses existing NEXT_PUBLIC_API_ENDPOINT_URL
  issuer: process.env.NEXT_PUBLIC_API_ENDPOINT_URL!,

  // Token Lifetimes (seconds)
  accessTokenLifetime: parseInt(process.env.JWT_ACCESS_TOKEN_LIFETIME || '3600'),      // 1 hour
  refreshTokenLifetime: parseInt(process.env.JWT_REFRESH_TOKEN_LIFETIME || '2592000'), // 30 days
  authCodeLifetime: 600, // 10 minutes (fixed)

  // Security Settings
  requirePkce: process.env.OAUTH_REQUIRE_PKCE === 'true',  // Recommended for production

  // Cleanup Settings
  cleanupExpiredCodesAfter: 86400,      // 24 hours (in seconds)
  cleanupRevokedTokensAfter: 2592000,   // 30 days (in seconds)
} as const;

/**
 * JWT Algorithm Configuration
 * Using HS256 (HMAC with SHA-256) for simplicity and performance.
 *
 * For higher security requirements, consider RS256 (RSA) with key rotation.
 */
export const JWT_CONFIG = {
  algorithm: 'HS256' as const,
  // Secret key loaded from environment (must be 32+ bytes)
  secretKey: process.env.JWT_SECRET_KEY,
} as const;

export const SLACK_BOT_TOKEN_POLICIES = [
  "oauth_connection_only",
  "oauth_or_env_fallback",
] as const;

export type SlackBotTokenPolicy = (typeof SLACK_BOT_TOKEN_POLICIES)[number];

function isSlackBotTokenPolicy(value: string | undefined): value is SlackBotTokenPolicy {
  return value === "oauth_connection_only" || value === "oauth_or_env_fallback";
}

function uniqueSecretCandidates(values: Array<string | undefined>): string[] {
  const trimmed = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(trimmed));
}

const configuredSlackBotTokenPolicy = process.env.SLACK_BOT_TOKEN_POLICY;
const slackClientSecretCandidates = uniqueSecretCandidates([
  process.env.SLACK_CLIENT_SECRET,
  process.env.SLACK_CLIENT_SECRET_PREVIOUS,
]);
const slackSigningSecretCandidates = uniqueSecretCandidates([
  process.env.SLACK_SIGNING_SECRET,
  process.env.SLACK_SIGNING_SECRET_PREVIOUS,
]);

export const SLACK_INTEGRATION_CONFIG = {
  enabled: process.env.SLACK_INTEGRATION_ENABLED === "true",
  slashCommandsEnabled: process.env.SLACK_SLASH_COMMANDS_ENABLED === "true",
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  clientSecretPrevious: process.env.SLACK_CLIENT_SECRET_PREVIOUS,
  clientSecretCandidates: slackClientSecretCandidates,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  signingSecretPrevious: process.env.SLACK_SIGNING_SECRET_PREVIOUS,
  signingSecretCandidates: slackSigningSecretCandidates,
  botTokenPolicy: isSlackBotTokenPolicy(configuredSlackBotTokenPolicy)
    ? configuredSlackBotTokenPolicy
    : "oauth_connection_only",
  envBotToken: process.env.SLACK_BOT_TOKEN,
} as const;


/**
 * Validate OAuth Configuration
 *
 * Throws error if required environment variables are missing.
 * Call this during server initialization.
 */
export function validateOAuthConfig(): void {
  const errors: string[] = [];

  if (!OAUTH_CONFIG.issuer) {
    errors.push('NEXT_PUBLIC_API_ENDPOINT_URL environment variable is required');
  }

  if (!JWT_CONFIG.secretKey) {
    errors.push('JWT_SECRET_KEY environment variable is required');
  }

  if (JWT_CONFIG.secretKey && JWT_CONFIG.secretKey.length < 32) {
    errors.push('JWT_SECRET_KEY must be at least 32 characters long');
  }

  if (
    configuredSlackBotTokenPolicy &&
    !isSlackBotTokenPolicy(configuredSlackBotTokenPolicy)
  ) {
    errors.push(
      "SLACK_BOT_TOKEN_POLICY must be one of: oauth_connection_only, oauth_or_env_fallback"
    );
  }

  if (SLACK_INTEGRATION_CONFIG.enabled) {
    if (!SLACK_INTEGRATION_CONFIG.clientId) {
      errors.push('SLACK_CLIENT_ID environment variable is required when SLACK_INTEGRATION_ENABLED=true');
    }

    if (SLACK_INTEGRATION_CONFIG.clientSecretCandidates.length === 0) {
      errors.push(
        'At least one Slack client secret is required when SLACK_INTEGRATION_ENABLED=true (SLACK_CLIENT_SECRET or SLACK_CLIENT_SECRET_PREVIOUS)'
      );
    }

    if (SLACK_INTEGRATION_CONFIG.signingSecretCandidates.length === 0) {
      errors.push(
        'At least one Slack signing secret is required when SLACK_INTEGRATION_ENABLED=true (SLACK_SIGNING_SECRET or SLACK_SIGNING_SECRET_PREVIOUS)'
      );
    }
  }

  if (
    SLACK_INTEGRATION_CONFIG.botTokenPolicy === "oauth_connection_only" &&
    SLACK_INTEGRATION_CONFIG.envBotToken
  ) {
    errors.push(
      "SLACK_BOT_TOKEN must not be set when SLACK_BOT_TOKEN_POLICY=oauth_connection_only"
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `OAuth configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Client ID and Secret Prefixes
 *
 * Using prefixes helps identify leaked credentials in the wild.
 * Following Stripe's pattern: sk_live_, pk_live_, etc.
 */
export const TOKEN_PREFIXES = {
  clientId: 'clnt_',
  clientSecret: 'secret_',
  authorizationCode: 'auth_',
  refreshToken: 'refresh_',
} as const;

/**
 * Default Security Headers
 */
export const OAUTH_SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
} as const;

/**
 * JWT Claims Structure
 *
 * Standard JWT claims (RFC 7519) plus custom OAuth claims.
 */
export interface JWTPayload {
  // Standard JWT claims
  iss: string;              // Issuer (your API)
  sub: string;              // Subject (userId)
  aud: string;              // Audience (clientId)
  exp: number;              // Expiration time (Unix timestamp)
  iat: number;              // Issued at (Unix timestamp)
  jti: string;              // JWT ID (unique identifier for revocation)

  // Custom OAuth claims
  organizationId: string;   // Organization context
  clientId: string;         // OAuth application
  scope: string;            // Granted permissions
}

/**
 * Generate JWT access token
 *
 * Creates a signed JWT with OAuth claims.
 * Uses HS256 (HMAC-SHA256) for signing.
 *
 * @param payload - Token payload
 * @returns Signed JWT string
 */
export async function generateJWT(payload: {
  userId: string;
  organizationId: string;
  clientId: string;
  scope: string;
}): Promise<string> {
  if (!JWT_CONFIG.secretKey) {
    throw new Error("JWT_SECRET_KEY not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  const claims: JWTPayload = {
    // Standard claims
    iss: OAUTH_CONFIG.issuer,
    sub: payload.userId,
    aud: payload.clientId,
    exp: now + OAUTH_CONFIG.accessTokenLifetime,
    iat: now,
    jti,

    // Custom claims
    organizationId: payload.organizationId,
    clientId: payload.clientId,
    scope: payload.scope,
  };

  // Create JWT header
  const header = {
    alg: JWT_CONFIG.algorithm,
    typ: "JWT",
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));

  // Create signature
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHmacSha256(message, JWT_CONFIG.secretKey);

  // Return JWT
  return `${message}.${signature}`;
}

/**
 * Verify JWT access token
 *
 * Validates signature and checks expiration.
 * Does NOT check revocation - use introspectToken for that.
 *
 * @param token - JWT string
 * @returns Decoded payload if valid
 * @throws Error if invalid or expired
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  if (!JWT_CONFIG.secretKey) {
    throw new Error("JWT_SECRET_KEY not configured");
  }

  // Split token into parts
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify signature
  const message = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = await signHmacSha256(message, JWT_CONFIG.secretKey);

  if (signature !== expectedSignature) {
    throw new Error("Invalid JWT signature");
  }

  // Decode payload
  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error("JWT has expired");
  }

  return payload;
}

/**
 * Generate refresh token
 *
 * Creates a cryptographically secure random token.
 * Format: 64-character hex string (256 bits of entropy).
 */
export function generateRefreshToken(): string {
  const length = 32; // 32 bytes = 64 hex characters
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash refresh token using SHA-256
 *
 * We store refresh tokens hashed (like passwords) for security.
 * If database is compromised, tokens cannot be used.
 *
 * @param token - Plain refresh token
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * HMAC-SHA256 signature
 *
 * Signs a message using HMAC with SHA-256.
 * Used for JWT signature generation and verification.
 */
async function signHmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  // Import key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign message
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));

  // Return base64url-encoded signature
  return base64UrlEncode(String.fromCharCode(...signatureArray));
}

/**
 * Base64 URL encoding (RFC 4648 Section 5)
 *
 * Standard base64 with URL-safe characters:
 * - Replace + with -
 * - Replace / with _
 * - Remove padding (=)
 */
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decoding
 */
function base64UrlDecode(str: string): string {
  // Add padding back
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}
