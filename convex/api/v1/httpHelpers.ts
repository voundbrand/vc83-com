/**
 * HTTP Action Helpers
 * Shared utilities for httpAction handlers: body size validation, ID format validation.
 */

import { Id, TableNames } from "../../_generated/dataModel";
import type { SystemTableNames } from "convex/server";

// ============================================================================
// BODY SIZE LIMITS
// ============================================================================

const DEFAULT_MAX_BODY_BYTES = 50 * 1024; // 50 KB for standard JSON endpoints
const BULK_MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB for bulk operations
const WEBHOOK_MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB for webhook payloads

export type BodySizePreset = "standard" | "bulk" | "webhook";

const PRESET_LIMITS: Record<BodySizePreset, number> = {
  standard: DEFAULT_MAX_BODY_BYTES,
  bulk: BULK_MAX_BODY_BYTES,
  webhook: WEBHOOK_MAX_BODY_BYTES,
};

/**
 * Parse JSON request body with size limit enforcement.
 * Returns the parsed body or throws an error if the body exceeds the limit.
 *
 * @param request - The incoming Request object
 * @param preset - Size preset: "standard" (50KB), "bulk" (5MB), "webhook" (10MB)
 * @returns Parsed JSON body
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
  preset: BodySizePreset = "standard"
): Promise<T> {
  const maxBytes = PRESET_LIMITS[preset];

  // Check Content-Length header first (fast path)
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new BodyTooLargeError(maxBytes);
  }

  // Read and parse body
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new BodyTooLargeError(maxBytes);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new InvalidJsonError();
  }
}

export class BodyTooLargeError extends Error {
  public readonly statusCode = 413;
  constructor(maxBytes: number) {
    super(
      `Request body exceeds maximum size of ${Math.round(maxBytes / 1024)} KB`
    );
    this.name = "BodyTooLargeError";
  }
}

export class InvalidJsonError extends Error {
  public readonly statusCode = 400;
  constructor() {
    super("Invalid JSON in request body");
    this.name = "InvalidJsonError";
  }
}

// ============================================================================
// CONVEX ID VALIDATION
// ============================================================================

/**
 * Convex IDs are base32-encoded strings. This regex matches the expected format.
 * They consist of lowercase letters and digits, typically 15-25 chars.
 */
const CONVEX_ID_PATTERN = /^[a-z0-9]{10,30}$/;

/**
 * Validate and cast a URL path segment to a Convex Id.
 * Returns null if the segment is missing or doesn't match the expected ID format.
 *
 * @param segment - The raw string from the URL path
 * @param _tableName - Table name (for type inference only)
 */
export function validateConvexId<T extends TableNames | SystemTableNames>(
  segment: string | undefined,
  _tableName: T
): Id<T> | null {
  if (!segment || !CONVEX_ID_PATTERN.test(segment)) {
    return null;
  }
  return segment as Id<T>;
}

/**
 * Return a 400 response for an invalid Convex ID.
 */
export function invalidIdResponse(
  paramName: string,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({ error: `Invalid or missing ${paramName}` }),
    {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

/**
 * Return a 413 response for body too large.
 */
export function bodyTooLargeResponse(
  error: BodyTooLargeError,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ error: error.message }), {
    status: 413,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
