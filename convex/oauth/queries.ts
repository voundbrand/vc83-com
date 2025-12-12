/**
 * OAUTH INTERNAL QUERIES
 *
 * Internal queries used by OAuth actions.
 * These are not exposed to clients directly.
 */

import { internalQuery } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Check if a token is revoked
 *
 * Used by verifyAccessToken to check revocation list.
 * Internal query only - not exposed to clients.
 */
export const isTokenRevoked = internalQuery({
  args: {
    jti: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const revokedToken = await ctx.db
      .query('oauthRevokedTokens')
      .withIndex('by_jti', (q) => q.eq('jti', args.jti))
      .first();

    return revokedToken !== null;
  },
});

/**
 * Get authorization code by code string
 *
 * Used by exchangeAuthorizationCode action.
 * Internal query only - not exposed to clients.
 */
export const getAuthorizationCodeByCode = internalQuery({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const authCode = await ctx.db
      .query("oauthAuthorizationCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    return authCode;
  },
});

/**
 * Get OAuth application by client ID
 *
 * Used by token exchange and refresh actions.
 * Internal query only - not exposed to clients.
 */
export const getApplicationByClientId = internalQuery({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db
      .query("oauthApplications")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first();

    return application;
  },
});

/**
 * Get refresh token by token hash
 *
 * Used by refreshAccessToken action.
 * Internal query only - not exposed to clients.
 */
export const getRefreshTokenByHash = internalQuery({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const refreshToken = await ctx.db
      .query("oauthRefreshTokens")
      .filter((q) => q.eq(q.field("tokenHash"), args.tokenHash))
      .first();

    return refreshToken;
  },
});
