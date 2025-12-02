/**
 * STORAGE TRACKING SCHEMAS
 *
 * Organization-level and per-user storage tracking.
 * Same approach as AI tokens: build foundation now, enforce later.
 *
 * Purpose:
 * - Track total storage used by organization
 * - Track per-user storage consumption
 * - Enable per-user storage limits in future phases
 *
 * Phase 1: Track usage, NO enforcement
 * Phase 4: Enable per-user storage limits
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * ORGANIZATION STORAGE
 *
 * Aggregated storage metrics for entire organization.
 * Updated on file upload/delete and recalculated hourly.
 */
export const organizationStorage = defineTable({
  organizationId: v.id("organizations"),

  // Storage metrics (in bytes)
  totalSizeBytes: v.number(),           // Total storage used
  totalSizeGB: v.number(),              // Calculated field for UI
  fileCount: v.number(),                // Number of files

  // Breakdown by category (optional)
  byCategoryBytes: v.optional(v.object({
    template: v.optional(v.number()),
    logo: v.optional(v.number()),
    avatar: v.optional(v.number()),
    compliance: v.optional(v.number()),
    general: v.optional(v.number()),
  })),

  // Last update
  lastCalculated: v.number(),

  // Timestamps
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_last_calculated", ["lastCalculated"]);

/**
 * USER STORAGE QUOTAS
 *
 * Per-user storage limits (optional, for future enforcement).
 * By default, all users share the organization's storage quota.
 *
 * When enforced (Phase 4):
 * - Organization admin sets storageLimitBytes for specific users
 * - File uploads blocked when quota exceeded
 * - User sees "Storage quota exceeded" message
 */
export const userStorageQuotas = defineTable({
  // Identification
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  // Quota settings
  storageLimitBytes: v.optional(v.number()),  // null = no limit (use org default)
  storageUsedBytes: v.number(),               // Current usage

  // File count
  fileCount: v.number(),

  // Status
  isEnforced: v.boolean(),                    // false = no enforcement (Phase 1)

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_organization", ["organizationId"])
  .index("by_org_and_user", ["organizationId", "userId"]);
