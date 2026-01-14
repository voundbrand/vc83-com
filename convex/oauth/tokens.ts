/**
 * JWT TOKEN GENERATION AND VERIFICATION
 *
 * Implements OAuth 2.0 access token generation using JOSE (JavaScript Object Signing and Encryption).
 * Access tokens are JWTs with organization/user context and scopes.
 *
 * Security:
 * - HS256 algorithm (HMAC with SHA-256)
 * - Short-lived (1 hour default)
 * - Includes jti (JWT ID) for revocation
 * - Stateless verification for performance
 *
 * @see .kiro/api_oauth_jose/IMPLEMENTATION_PLAN.md Phase 1.4
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { action, internalAction, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { OAUTH_CONFIG, JWT_CONFIG } from './config';
import { internal } from '../_generated/api';
import { ConvexError } from "convex/values";
import { verifyCodeChallenge, verifyClientSecret } from "./helpers";
import { generateRefreshToken, hashRefreshToken } from "./config";
import { Doc } from '../_generated/dataModel';

/**
 * JWT Claims Interface
 *
 * Standard OAuth + custom claims for our platform.
 */
export interface AccessTokenClaims extends JWTPayload {
  // Standard JWT Claims
  sub: string;           // Subject (userId)
  iss: string;           // Issuer (our API)
  aud: string;           // Audience (our API)
  exp: number;           // Expiration timestamp
  iat: number;           // Issued at timestamp
  jti: string;           // JWT ID (for revocation)

  // OAuth Claims
  scope: string;         // Space-separated scopes
  client_id: string;     // OAuth application client ID

  // Custom Claims
  org: string;           // Organization ID
  token_type: 'access';  // Token type identifier
}

/**
 * Generate Access Token (JWT)
 *
 * Creates a signed JWT access token with user/org context and scopes.
 * This is an internal Convex action (not mutation) because it uses jose library.
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param clientId - OAuth application client ID
 * @param scope - Space-separated scopes
 * @param jti - Unique token ID (for revocation)
 * @returns Signed JWT token
 */
export const generateAccessToken = internalAction({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    clientId: v.string(),
    scope: v.string(),
    jti: v.string(),
  },
  handler: async (_, args): Promise<string> => {
    const { userId, organizationId, clientId, scope, jti } = args;

    // Validate JWT secret
    if (!JWT_CONFIG.secretKey) {
      throw new Error('JWT_SECRET_KEY environment variable not configured');
    }

    // Convert secret to Uint8Array for jose
    const secretKey = new TextEncoder().encode(JWT_CONFIG.secretKey);

    // Current timestamp
    const now = Math.floor(Date.now() / 1000);

    // Create JWT
    const token = await new SignJWT({
      // Standard claims
      sub: userId,
      iss: OAUTH_CONFIG.issuer,
      aud: OAUTH_CONFIG.issuer,
      exp: now + OAUTH_CONFIG.accessTokenLifetime,
      iat: now,
      jti,

      // OAuth claims
      scope,
      client_id: clientId,

      // Custom claims
      org: organizationId,
      token_type: 'access',
    } as AccessTokenClaims)
      .setProtectedHeader({ alg: JWT_CONFIG.algorithm })
      .sign(secretKey);

    return token;
  },
});

/**
 * Verify Access Token
 *
 * Verifies JWT signature and expiration, extracts claims.
 * This is an internal Convex action because it uses jose library.
 *
 * @param token - JWT access token
 * @returns Token claims if valid
 * @throws Error if token is invalid or expired
 */
export const verifyAccessToken = internalAction({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<AccessTokenClaims> => {
    const { token } = args;

    // Validate JWT secret
    if (!JWT_CONFIG.secretKey) {
      throw new Error('JWT_SECRET_KEY environment variable not configured');
    }

    // Convert secret to Uint8Array for jose
    const secretKey = new TextEncoder().encode(JWT_CONFIG.secretKey);

    try {
      // Verify JWT
      const { payload } = await jwtVerify(token, secretKey, {
        issuer: OAUTH_CONFIG.issuer,
        audience: OAUTH_CONFIG.issuer,
        algorithms: [JWT_CONFIG.algorithm],
      });

      // Type assertion (we know our token structure)
      const claims = payload as AccessTokenClaims;

      // Additional validation
      if (claims.token_type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Check if token is revoked
      const isRevoked = await ctx.runQuery(internal.oauth.queries.isTokenRevoked, {
        jti: claims.jti,
      });

      if (isRevoked) {
        throw new Error('Token has been revoked');
      }

      return claims;

    } catch (error) {
      // Enhanced error messages
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          throw new Error('Access token has expired');
        }
        if (error.message.includes('signature')) {
          throw new Error('Invalid token signature');
        }
        throw error;
      }
      throw new Error('Token verification failed');
    }
  },
});

/**
 * Generate Random Token ID (jti)
 *
 * Creates a cryptographically secure random token ID.
 * Used for jti claim and refresh token IDs.
 *
 * @returns Random token ID
 */
export function generateTokenId(): string {
  // Generate 32 random bytes and encode as hex
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse Bearer Token from Authorization Header
 *
 * Extracts JWT from "Bearer <token>" format.
 *
 * @param authHeader - Authorization header value
 * @returns JWT token or null
 */
export function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Detect Token Type (API Key vs JWT)
 *
 * API keys start with "sk_", JWTs start with "eyJ"
 *
 * @param token - Token string
 * @returns Token type
 */
export function detectTokenType(token: string): 'api_key' | 'jwt' | 'unknown' {
  if (token.startsWith('sk_')) {
    return 'api_key';
  }
  if (token.startsWith('eyJ')) {
    return 'jwt';
  }
  return 'unknown';
}

/**
 * PHASE 4: TOKEN ENDPOINT
 *
 * OAuth 2.0 token exchange and refresh operations.
 * These are actions that handle the full token flow.
 */

/**
 * Exchange authorization code for access + refresh tokens
 *
 * This is the core token endpoint for the authorization_code grant.
 * OAuth 2.0 Spec: RFC 6749 Section 4.1.3
 */
export const exchangeAuthorizationCode = action({
  args: {
    code: v.string(),
    clientId: v.string(),
    clientSecret: v.optional(v.string()),
    redirectUri: v.string(),
    codeVerifier: v.optional(v.string()), // PKCE verifier
  },
  handler: async (ctx, args): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  }> => {
    // 1. Lookup authorization code
    const authCode: Doc<"oauthAuthorizationCodes"> | null = await ctx.runQuery(internal.oauth.queries.getAuthorizationCodeByCode, {
      code: args.code,
    });

    if (!authCode) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Invalid or expired authorization code",
      });
    }

    // 2. Verify code hasn't been used (single-use requirement)
    if (authCode.used) {
      console.error("SECURITY: Authorization code reuse detected", { code: args.code });
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Authorization code has already been used",
      });
    }

    // 3. Verify code hasn't expired (10 minutes)
    if (Date.now() > authCode.expiresAt) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Authorization code has expired",
      });
    }

    // 4. Verify client_id matches
    if (authCode.clientId !== args.clientId) {
      throw new ConvexError({
        code: "INVALID_CLIENT",
        message: "client_id does not match authorization code",
      });
    }

    // 5. Verify redirect_uri matches (OAuth 2.0 security requirement)
    if (authCode.redirectUri !== args.redirectUri) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "redirect_uri does not match the one used in authorization",
      });
    }

    // 6. Lookup OAuth application
    const application: Doc<"oauthApplications"> | null = await ctx.runQuery(internal.oauth.queries.getApplicationByClientId, {
      clientId: args.clientId,
    });

    if (!application || !application.isActive) {
      throw new ConvexError({
        code: "INVALID_CLIENT",
        message: "Invalid or disabled OAuth application",
      });
    }

    // 7. Verify client secret (for confidential clients)
    if (application.type === "confidential") {
      if (!args.clientSecret) {
        throw new ConvexError({
          code: "INVALID_CLIENT",
          message: "client_secret is required for confidential clients",
        });
      }

      const secretValid = await verifyClientSecret(
        args.clientSecret,
        application.clientSecretHash
      );

      if (!secretValid) {
        throw new ConvexError({
          code: "INVALID_CLIENT",
          message: "Invalid client_secret",
        });
      }
    }

    // 8. Verify PKCE (if code_challenge was provided during authorization)
    if (authCode.codeChallenge) {
      if (!args.codeVerifier) {
        throw new ConvexError({
          code: "INVALID_REQUEST",
          message: "code_verifier is required (PKCE)",
        });
      }

      const pkceValid = await verifyCodeChallenge(
        args.codeVerifier,
        authCode.codeChallenge
      );

      if (!pkceValid) {
        throw new ConvexError({
          code: "INVALID_GRANT",
          message: "Invalid code_verifier (PKCE verification failed)",
        });
      }
    }

    // 9. For public clients, PKCE is required
    if (application.type === "public" && !authCode.codeChallenge) {
      throw new ConvexError({
        code: "INVALID_REQUEST",
        message: "PKCE is required for public clients",
      });
    }

    // 10. Mark authorization code as used
    await ctx.runMutation(internal.oauth.tokens.markAuthorizationCodeUsed, {
      codeId: authCode._id,
    });

    // 11. Generate JWT access token
    const jti = generateTokenId();
    const accessToken: string = await ctx.runAction(internal.oauth.tokens.generateAccessToken, {
      userId: authCode.userId,
      organizationId: authCode.organizationId,
      clientId: args.clientId,
      scope: authCode.scope,
      jti,
    });

    // 12. Generate refresh token
    const refreshTokenValue = generateRefreshToken();
    const refreshTokenHash = await hashRefreshToken(refreshTokenValue);
    const refreshTokenId = `rt_${crypto.randomUUID()}`;

    // 13. Store refresh token
    await ctx.runMutation(internal.oauth.tokens.insertRefreshToken, {
      tokenId: refreshTokenId,
      tokenHash: refreshTokenHash,
      clientId: args.clientId,
      userId: authCode.userId,
      organizationId: authCode.organizationId,
      scope: authCode.scope,
      expiresAt: Date.now() + OAUTH_CONFIG.refreshTokenLifetime * 1000,
    });

    // 14. Update application last used timestamp
    await ctx.runMutation(internal.oauth.tokens.updateApplicationLastUsed, {
      applicationId: application._id,
    });

    // 15. Return tokens (OAuth 2.0 token response format)
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: OAUTH_CONFIG.accessTokenLifetime,
      refresh_token: refreshTokenValue,
      scope: authCode.scope,
    };
  },
});

/**
 * Internal mutation: Insert refresh token
 */
export const insertRefreshToken = internalMutation({
  args: {
    tokenId: v.string(),
    tokenHash: v.string(),
    clientId: v.string(),
    userId: v.string(),
    organizationId: v.string(),
    scope: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauthRefreshTokens", {
      tokenId: args.tokenId,
      tokenHash: args.tokenHash,
      clientId: args.clientId,
      userId: args.userId,
      organizationId: args.organizationId as any,
      scope: args.scope,
      expiresAt: args.expiresAt,
      revoked: false,
      createdAt: Date.now(),
      useCount: 0,
    });
  },
});

/**
 * Internal mutation: Update application last used timestamp
 */
export const updateApplicationLastUsed = internalMutation({
  args: {
    applicationId: v.id("oauthApplications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.applicationId, {
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation: Mark authorization code as used
 */
export const markAuthorizationCodeUsed = internalMutation({
  args: {
    codeId: v.id("oauthAuthorizationCodes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.codeId, {
      used: true,
      usedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation: Revoke refresh token by hash
 */
export const revokeRefreshTokenByHash = internalMutation({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const refreshToken = await ctx.db
      .query("oauthRefreshTokens")
      .filter((q) => q.eq(q.field("tokenHash"), args.tokenHash))
      .first();

    if (refreshToken) {
      await ctx.db.patch(refreshToken._id, {
        revoked: true,
        revokedAt: Date.now(),
        revokedReason: "client_revocation",
      });
    }
  },
});

/**
 * Refresh access token using refresh token
 *
 * OAuth 2.0 Spec: RFC 6749 Section 6
 */
export const refreshAccessToken = action({
  args: {
    refreshToken: v.string(),
    clientId: v.string(),
    clientSecret: v.optional(v.string()),
    scope: v.optional(v.string()), // Can request fewer scopes
  },
  handler: async (ctx, args): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  }> => {
    // 1. Hash the refresh token to lookup
    const tokenHash = await hashRefreshToken(args.refreshToken);

    // 2. Find refresh token in database
    const refreshToken: Doc<"oauthRefreshTokens"> | null = await ctx.runQuery(internal.oauth.queries.getRefreshTokenByHash, {
      tokenHash,
    });

    if (!refreshToken) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Invalid refresh token",
      });
    }

    // 3. Verify refresh token hasn't been revoked
    if (refreshToken.revoked) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Refresh token has been revoked",
      });
    }

    // 4. Verify refresh token hasn't expired (30 days)
    if (Date.now() > refreshToken.expiresAt) {
      throw new ConvexError({
        code: "INVALID_GRANT",
        message: "Refresh token has expired",
      });
    }

    // 5. Verify client_id matches
    if (refreshToken.clientId !== args.clientId) {
      throw new ConvexError({
        code: "INVALID_CLIENT",
        message: "client_id does not match refresh token",
      });
    }

    // 6. Lookup OAuth application
    const application: Doc<"oauthApplications"> | null = await ctx.runQuery(internal.oauth.queries.getApplicationByClientId, {
      clientId: args.clientId,
    });

    if (!application || !application.isActive) {
      throw new ConvexError({
        code: "INVALID_CLIENT",
        message: "Invalid or disabled OAuth application",
      });
    }

    // 7. Verify client secret (for confidential clients)
    if (application.type === "confidential") {
      if (!args.clientSecret) {
        throw new ConvexError({
          code: "INVALID_CLIENT",
          message: "client_secret is required for confidential clients",
        });
      }

      const secretValid = await verifyClientSecret(
        args.clientSecret,
        application.clientSecretHash
      );

      if (!secretValid) {
        throw new ConvexError({
          code: "INVALID_CLIENT",
          message: "Invalid client_secret",
        });
      }
    }

    // 8. Validate requested scope (must be subset of original scope)
    const originalScopes = refreshToken.scope.split(" ");
    const requestedScopes = args.scope ? args.scope.split(" ") : originalScopes;

    for (const scope of requestedScopes) {
      if (!originalScopes.includes(scope)) {
        throw new ConvexError({
          code: "INVALID_SCOPE",
          message: `Requested scope "${scope}" exceeds original grant`,
        });
      }
    }

    const finalScope = args.scope || refreshToken.scope;

    // 9. Generate new JWT access token
    const jti = generateTokenId();
    const accessToken: string = await ctx.runAction(internal.oauth.tokens.generateAccessToken, {
      userId: refreshToken.userId,
      organizationId: refreshToken.organizationId,
      clientId: args.clientId,
      scope: finalScope,
      jti,
    });

    // 10. Update refresh token usage stats
    await ctx.runMutation(internal.oauth.tokens.updateRefreshTokenUsage, {
      tokenId: refreshToken._id,
    });

    // 11. Update application last used timestamp
    await ctx.runMutation(internal.oauth.tokens.updateApplicationLastUsed, {
      applicationId: application._id,
    });

    // 12. Return new access token (OAuth 2.0 token response format)
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: OAUTH_CONFIG.accessTokenLifetime,
      scope: finalScope,
    };
  },
});

/**
 * Internal mutation: Update refresh token usage stats
 */
export const updateRefreshTokenUsage = internalMutation({
  args: {
    tokenId: v.id("oauthRefreshTokens"),
  },
  handler: async (ctx, args) => {
    const refreshToken = await ctx.db.get(args.tokenId);
    if (refreshToken) {
      await ctx.db.patch(args.tokenId, {
        lastUsedAt: Date.now(),
        useCount: (refreshToken.useCount || 0) + 1,
      });
    }
  },
});

/**
 * Revoke access or refresh token
 *
 * OAuth 2.0 Token Revocation: RFC 7009
 */
export const revokeToken = action({
  args: {
    token: v.string(),
    tokenTypeHint: v.optional(v.union(v.literal("access_token"), v.literal("refresh_token"))),
    clientId: v.string(),
    clientSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Lookup OAuth application
    const application = await ctx.runQuery(internal.oauth.queries.getApplicationByClientId, {
      clientId: args.clientId,
    });

    if (!application || !application.isActive) {
      // RFC 7009: Return success even for invalid clients
      return { revoked: true };
    }

    // 2. Verify client secret (for confidential clients)
    if (application.type === "confidential") {
      if (!args.clientSecret) {
        throw new ConvexError({
          code: "INVALID_CLIENT",
          message: "client_secret is required",
        });
      }

      const secretValid = await verifyClientSecret(
        args.clientSecret,
        application.clientSecretHash
      );

      if (!secretValid) {
        throw new ConvexError({
          code: "INVALID_CLIENT",
          message: "Invalid client_secret",
        });
      }
    }

    // 3. Attempt to revoke as refresh token first (if hint suggests it)
    if (!args.tokenTypeHint || args.tokenTypeHint === "refresh_token") {
      const tokenHash = await hashRefreshToken(args.token);
      const refreshToken = await ctx.runQuery(internal.oauth.queries.getRefreshTokenByHash, {
        tokenHash,
      });

      if (refreshToken && refreshToken.clientId === args.clientId) {
        await ctx.runMutation(internal.oauth.tokens.revokeRefreshTokenByHash, {
          tokenHash,
        });
        return { revoked: true, token_type: "refresh_token" };
      }
    }

    // 4. Attempt to revoke as access token (JWT)
    if (!args.tokenTypeHint || args.tokenTypeHint === "access_token") {
      try {
        const claims = await ctx.runAction(internal.oauth.tokens.verifyAccessToken, {
          token: args.token,
        });

        if (claims.client_id === args.clientId) {
          // Add to revocation list
          await ctx.runMutation(internal.oauth.tokens.insertRevokedToken, {
            jti: claims.jti,
            userId: claims.sub,
            organizationId: claims.org,
            clientId: claims.client_id,
            tokenExpiresAt: claims.exp! * 1000,
          });

          return { revoked: true, token_type: "access_token" };
        }
      } catch {
        // Token invalid or expired - that's okay
      }
    }

    // 5. RFC 7009: Return success even if token not found
    return { revoked: true };
  },
});

/**
 * Internal mutation: Revoke refresh token
 */
export const revokeRefreshToken = internalMutation({
  args: {
    tokenId: v.id("oauthRefreshTokens"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, {
      revoked: true,
      revokedAt: Date.now(),
      revokedReason: "client_revocation",
    });
  },
});

/**
 * Internal mutation: Insert revoked token
 */
export const insertRevokedToken = internalMutation({
  args: {
    jti: v.string(),
    userId: v.string(),
    organizationId: v.string(),
    clientId: v.string(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauthRevokedTokens", {
      jti: args.jti,
      userId: args.userId,
      organizationId: args.organizationId as any,
      clientId: args.clientId,
      revokedAt: Date.now(),
      revokedBy: args.userId,
      revokedReason: "client_revocation",
      tokenExpiresAt: args.tokenExpiresAt,
    });
  },
});

/**
 * Cleanup expired refresh tokens (scheduled job)
 */
export const cleanupExpiredRefreshTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredTokens = await ctx.db
      .query("oauthRefreshTokens")
      .withIndex("by_expiry")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const token of expiredTokens) {
      await ctx.db.delete(token._id);
    }

    return {
      deletedCount: expiredTokens.length,
      message: `Cleaned up ${expiredTokens.length} expired refresh tokens`,
    };
  },
});

/**
 * Cleanup expired revoked tokens (scheduled job)
 */
export const cleanupExpiredRevokedTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredTokens = await ctx.db
      .query("oauthRevokedTokens")
      .withIndex("by_expiry")
      .filter((q) => q.lt(q.field("tokenExpiresAt"), now))
      .collect();

    for (const token of expiredTokens) {
      await ctx.db.delete(token._id);
    }

    return {
      deletedCount: expiredTokens.length,
      message: `Cleaned up ${expiredTokens.length} expired revoked tokens`,
    };
  },
});
