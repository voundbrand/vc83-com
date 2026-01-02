/**
 * UNIVERSAL AUTHENTICATION MIDDLEWARE
 *
 * Supports dual authentication:
 * 1. API Keys (existing system) - Full access, no scope restrictions
 * 2. OAuth Tokens (new OAuth 2.0) - Scope-based access control
 *
 * Usage in HTTP actions:
 * ```typescript
 * const authResult = await authenticateRequest(ctx, request);
 * if (!authResult.success) {
 *   return new Response(JSON.stringify({ error: authResult.error }), {
 *     status: authResult.status
 *   });
 * }
 *
 * const authContext = authResult.context;
 * const scopeCheck = requireScopes(authContext, ['contacts:read']);
 * if (!scopeCheck.success) {
 *   return new Response(JSON.stringify({ error: scopeCheck.error }), {
 *     status: scopeCheck.status
 *   });
 * }
 * ```
 */

import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import * as jose from "jose";
import { JWT_CONFIG, OAUTH_CONFIG } from "../oauth/config";

/**
 * Authentication context returned by middleware
 */
export interface AuthContext {
  /** User ID from the auth system */
  userId: Id<"users">;
  /** Organization ID */
  organizationId: Id<"organizations">;
  /** Sub-organization ID (for OAuth token scoping) */
  subOrganizationId?: Id<"organizations"> | null;
  /** Authentication method used */
  authMethod: "api_key" | "oauth";
  /** OAuth scopes (only present for OAuth tokens) */
  scopes?: string[];
}

/**
 * Success result from authentication
 */
export interface AuthSuccess {
  success: true;
  context: AuthContext;
}

/**
 * Error result from authentication
 */
export interface AuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Authentication result (success or error)
 */
export type AuthResult = AuthSuccess | AuthError;

/**
 * UNIVERSAL AUTHENTICATION MIDDLEWARE
 *
 * Authenticates HTTP requests using either:
 * - API keys (existing system) - identified by "api_key_" or "org_" prefix
 * - OAuth JWT tokens (new system) - identified by JWT format (3 parts)
 *
 * @param ctx - Convex action context
 * @param request - HTTP request
 * @returns Authentication result with context or error
 */
export async function authenticateRequest(
  ctx: { runQuery: (query: any, args: any) => Promise<any>; runAction: (action: any, args: any) => Promise<any> },
  request: Request
): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return {
      success: false,
      error: "Missing Authorization header",
      status: 401,
    };
  }

  // Must be "Bearer <token>"
  if (!authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: 'Invalid Authorization header format. Expected: Bearer <token>',
      status: 401,
    };
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // Determine token type by format
  // API keys: start with "org_" or "api_key_"
  // OAuth tokens: JWT format with 3 parts separated by dots
  if (token.startsWith("org_") || token.startsWith("api_key_")) {
    return await authenticateApiKey(ctx, token);
  } else if (token.split(".").length === 3) {
    return await authenticateOAuthToken(ctx, token);
  } else {
    return {
      success: false,
      error: "Invalid token format. Must be either an API key or OAuth JWT token",
      status: 401,
    };
  }
}

/**
 * Authenticate using API key (Enhanced Security Model with Bcrypt)
 *
 * API keys now support scoped permissions like OAuth tokens.
 * Old keys default to full access ["*"] for backward compatibility.
 * New keys can have limited scopes like ["contacts:read", "invoices:read"].
 *
 * Security:
 * - Uses bcrypt.compare() for hash verification (~50ms)
 * - Lookup by prefix (first 12 chars) for performance
 * - Keys are NEVER stored in plaintext
 *
 * NOTE: Usage tracking is now async (0ms added latency)
 * See: convex/security/usageTracking.ts
 */
async function authenticateApiKey(
  ctx: { runAction: (action: any, args: any) => Promise<any> },
  apiKey: string
): Promise<AuthResult> {
  try {
    // Call the bcrypt Action for secure verification
    const authContext = await ctx.runAction(internal.actions.apiKeys.verifyApiKey as any, {
      apiKey,
    });

    if (!authContext) {
      return {
        success: false,
        error: "Invalid API key",
        status: 401,
      };
    }

    // ✅ Task 4 Complete: Usage tracking moved to verifyApiKey Action
    // The Action now uses ctx.scheduler.runAfter() for async tracking
    // This removes 2-5ms from the hot path while collecting richer metadata

    return {
      success: true,
      context: {
        userId: authContext.userId,
        organizationId: authContext.organizationId,
        authMethod: "api_key",
        scopes: authContext.scopes, // API keys now have scopes!
      },
    };
  } catch {
    return {
      success: false,
      error: "API key verification failed",
      status: 500,
    };
  }
}

/**
 * Authenticate using OAuth JWT token
 *
 * OAuth tokens are verified using JOSE and must contain:
 * - Valid signature (HMAC-SHA256)
 * - Valid issuer
 * - Not expired
 * - Required claims: sub (userId), org (organizationId), scope
 */
async function authenticateOAuthToken(
  ctx: { runQuery: (query: any, args: any) => Promise<any> },
  token: string
): Promise<AuthResult> {
  try {
    // Validate JWT secret
    if (!JWT_CONFIG.secretKey) {
      return {
        success: false,
        error: "JWT secret not configured",
        status: 500,
      };
    }

    // Convert secret to Uint8Array for jose (same as tokens.ts)
    const secretKey = new TextEncoder().encode(JWT_CONFIG.secretKey);

    // Verify JWT signature and decode
    const { payload } = await jose.jwtVerify(token, secretKey, {
      issuer: OAUTH_CONFIG.issuer,
      algorithms: ["HS256"],
    });

    // Extract claims
    const userId = payload.sub as string;
    const organizationId = payload.org as string;
    const subOrganizationId = payload.sub_org as string | undefined;
    const scopeString = payload.scope as string;
    const scopes = scopeString ? scopeString.split(" ") : [];

    // Validate required claims
    if (!userId || !organizationId) {
      return {
        success: false,
        error: "Invalid token: missing required claims (sub, org)",
        status: 401,
      };
    }

    // Cast to Convex ID types
    const userIdTyped = userId as Id<"users">;
    const organizationIdTyped = organizationId as Id<"organizations">;
    const subOrganizationIdTyped = subOrganizationId ? (subOrganizationId as Id<"organizations">) : null;

    // Check if token is revoked
    const isRevoked = await ctx.runQuery(internal.oauth.queries.isTokenRevoked, {
      jti: payload.jti as string,
    });

    if (isRevoked) {
      return {
        success: false,
        error: "Access token has been revoked",
        status: 401,
      };
    }

    return {
      success: true,
      context: {
        userId: userIdTyped,
        organizationId: organizationIdTyped,
        subOrganizationId: subOrganizationIdTyped,
        authMethod: "oauth",
        scopes,
      },
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return {
        success: false,
        error: "Access token expired. Please refresh your token.",
        status: 401,
      };
    }

    if (
      error instanceof jose.errors.JWTInvalid ||
      error instanceof jose.errors.JWSSignatureVerificationFailed
    ) {
      return {
        success: false,
        error: "Invalid access token",
        status: 401,
      };
    }

    console.error("OAuth token verification error:", error);
    return {
      success: false,
      error: "Token verification failed",
      status: 500,
    };
  }
}

/**
 * SCOPE VALIDATION (Universal for API Keys and OAuth)
 *
 * Enforces scope-based access control for BOTH API keys and OAuth tokens.
 * This follows Stripe's security model where scoped API keys prevent over-privileged access.
 *
 * Wildcard scope "*" grants full access (legacy keys default to this).
 *
 * @param authContext - Authentication context from authenticateRequest
 * @param requiredScopes - Array of required scopes (e.g., ['contacts:read', 'contacts:write'])
 * @returns Success or error result
 */
export function requireScopes(
  authContext: AuthContext,
  requiredScopes: string[]
): { success: true } | { success: false; error: string; status: number } {
  const userScopes = authContext.scopes || [];

  // Wildcard scope "*" grants full access (legacy API keys and super admin tokens)
  if (userScopes.includes("*")) {
    return { success: true };
  }

  // Check if user has all required scopes
  const missingScopes = requiredScopes.filter(
    (scope) => !userScopes.includes(scope)
  );

  if (missingScopes.length > 0) {
    return {
      success: false,
      error: `Insufficient permissions. Missing scopes: ${missingScopes.join(", ")}. ${authContext.authMethod === "api_key" ? "Create a new API key with the required scopes in Settings → API Keys." : "Request authorization with the required scopes."}`,
      status: 403,
    };
  }

  return { success: true };
}

/**
 * Check if user has ANY of the provided scopes
 *
 * Useful for "OR" logic - user needs at least one of the specified scopes.
 * Wildcard "*" grants full access.
 *
 * @param authContext - Authentication context
 * @param scopes - Array of scopes to check
 * @returns true if user has at least one scope, false otherwise
 */
export function hasAnyScope(authContext: AuthContext, scopes: string[]): boolean {
  const userScopes = authContext.scopes || [];

  // Wildcard grants full access
  if (userScopes.includes("*")) {
    return true;
  }

  return scopes.some((scope) => userScopes.includes(scope));
}

/**
 * Check if user has a specific scope
 *
 * @param authContext - Authentication context
 * @param scope - Scope to check (e.g., 'contacts:read')
 * @returns true if user has the scope, false otherwise
 */
export function hasScope(authContext: AuthContext, scope: string): boolean {
  const userScopes = authContext.scopes || [];

  // Wildcard grants full access
  if (userScopes.includes("*")) {
    return true;
  }

  return userScopes.includes(scope);
}

/**
 * Get effective organization ID for filtering
 *
 * For OAuth tokens with sub-organization scoping, returns the sub-org ID.
 * Otherwise returns the main organization ID.
 * This ensures OAuth tokens with sub-org scope can only access sub-org data.
 *
 * @param authContext - Authentication context
 * @returns Organization ID to use for data filtering
 */
export function getEffectiveOrganizationId(authContext: AuthContext): Id<"organizations"> {
  // If OAuth token is scoped to a sub-organization, use that
  if (
    authContext.authMethod === "oauth" &&
    authContext.subOrganizationId
  ) {
    return authContext.subOrganizationId;
  }

  // Otherwise use the main organization ID
  return authContext.organizationId;
}
