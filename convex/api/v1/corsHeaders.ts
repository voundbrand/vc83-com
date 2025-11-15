/**
 * CORS Headers Utility
 * Shared CORS configuration for all API endpoints
 */

/**
 * Get CORS headers for API responses
 * Supports localhost development and production domains
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://pluseins.gg",
    "https://www.pluseins.gg",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  // Allow all subdomains of pluseins.gg
  const isAllowedOrigin = origin && (
    allowedOrigins.includes(origin) ||
    origin.match(/^https:\/\/[\w-]+\.pluseins\.gg$/)
  );

  if (isAllowedOrigin) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    };
  }

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
