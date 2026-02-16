/**
 * STANDARDIZED ERROR UTILITIES
 *
 * Provides consistent error handling patterns across the convex backend.
 * Replaces the 3 different error styles currently scattered across 150+ files:
 *
 * Usage:
 *   const user = requireEntity(await ctx.db.get(userId), "User");
 *   requirePermissionOrThrow(hasPermission, "edit_organization");
 *
 * Migration: Import and use in any file. No changes needed elsewhere.
 * Each file can be migrated independently.
 */

import { ConvexError } from "convex/values";

// ============================================================================
// ERROR CODES - Standardized across the platform
// ============================================================================

export const ErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  INVALID_INPUT: "INVALID_INPUT",
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  INVALID_SESSION: "INVALID_SESSION",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================================================
// ENTITY HELPERS - Replace "if (!x) throw new Error(...)" pattern
// ============================================================================

/**
 * Asserts that an entity exists, narrowing it from T | null | undefined to T.
 * Throws a ConvexError with NOT_FOUND code if the entity is nullish.
 *
 * @example
 *   const user = requireEntity(await ctx.db.get(userId), "User");
 *   // user is now guaranteed to be non-null
 *
 *   const org = requireEntity(
 *     await ctx.db.query("organizations").withIndex(...).first(),
 *     "Organization"
 *   );
 */
export function requireEntity<T>(
  entity: T | null | undefined,
  entityName: string
): T {
  if (entity == null) {
    throw new ConvexError({
      code: ErrorCode.NOT_FOUND,
      message: `${entityName} not found`,
    });
  }
  return entity;
}

/**
 * Asserts that a session is valid.
 * Specialized version of requireEntity for the common session check pattern.
 *
 * @example
 *   const session = requireSession(
 *     await ctx.db.query("sessions").filter(...).first()
 *   );
 */
export function requireSession<T>(session: T | null | undefined): T {
  if (session == null) {
    throw new ConvexError({
      code: ErrorCode.INVALID_SESSION,
      message: "Invalid or expired session",
    });
  }
  return session;
}

// ============================================================================
// PERMISSION HELPERS - Replace inconsistent permission check patterns
// ============================================================================

/**
 * Throws PERMISSION_DENIED if the condition is false.
 *
 * @example
 *   const hasPermission = await checkPermission(ctx, userId, "edit_org", orgId);
 *   requirePermissionOrThrow(hasPermission, "edit_org");
 */
export function requirePermissionOrThrow(
  hasPermission: boolean,
  permissionName?: string
): void {
  if (!hasPermission) {
    throw new ConvexError({
      code: ErrorCode.PERMISSION_DENIED,
      message: permissionName
        ? `Missing permission: ${permissionName}`
        : "Permission denied",
    });
  }
}

// ============================================================================
// VALIDATION HELPERS - Replace inline validation throws
// ============================================================================

/**
 * Throws INVALID_INPUT if the condition is false.
 *
 * @example
 *   requireValid(args.email.includes("@"), "email", "Must be a valid email");
 *   requireValid(args.endDate > args.startDate, "endDate", "Must be after start date");
 */
export function requireValid(
  condition: boolean,
  fieldName: string,
  message?: string
): void {
  if (!condition) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: message || `Invalid ${fieldName}`,
    });
  }
}

/**
 * Throws ALREADY_EXISTS if the entity is not null (i.e., a duplicate was found).
 *
 * @example
 *   const existing = await ctx.db.query("users").filter(...).first();
 *   requireNotExists(existing, "User", "email");
 */
export function requireNotExists<T>(
  entity: T | null | undefined,
  entityName: string,
  fieldName?: string
): void {
  if (entity != null) {
    throw new ConvexError({
      code: ErrorCode.ALREADY_EXISTS,
      message: fieldName
        ? `${entityName} with this ${fieldName} already exists`
        : `${entityName} already exists`,
    });
  }
}

/**
 * Throws LIMIT_EXCEEDED with an upgrade message.
 * Matches the existing pattern in productOntology, domainConfigOntology, etc.
 *
 * @example
 *   checkLimit(addonsCount, limit, "addons per product", "Professional");
 */
export function checkLimit(
  currentCount: number,
  limit: number,
  resourceName: string,
  nextTier?: string
): void {
  if (limit !== -1 && currentCount > limit) {
    const upgradeMsg = nextTier
      ? ` Upgrade to ${nextTier} for higher limits.`
      : "";
    throw new ConvexError({
      code: ErrorCode.LIMIT_EXCEEDED,
      message: `You've reached your ${resourceName} limit (${limit}).${upgradeMsg}`,
    });
  }
}
