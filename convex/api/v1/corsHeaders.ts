/**
 * CORS Headers Utility
 * Shared CORS configuration for all API endpoints
 */

/**
 * Get CORS headers for API responses
 *
 * For third-party API access:
 * - Echoes back any origin since API key authentication is the security boundary
 * - Allows organizations to use the API from any domain (localhost, staging, production, mobile apps)
 * - Standard practice for public APIs (Stripe, Twilio, etc.)
 *
 * Security note:
 * - CORS only protects browsers, not backend/curl requests
 * - API key is the real security mechanism
 * - Anyone with a valid API key can access from anywhere already
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Echo back any origin - API key authentication is the security boundary
  if (origin) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    };
  }

  // No origin header means non-browser request (curl, Postman, backend)
  return {};
}

/**
 * Handle OPTIONS preflight request
 * Returns 204 No Content with CORS headers
 */
export function handleOptionsRequest(origin: string | null): Response {
  const corsHeaders = getCorsHeaders(origin);

  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
    },
  });
}
