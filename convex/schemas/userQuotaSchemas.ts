/**
 * USER QUOTA SCHEMAS
 *
 * Per-user AI quota tracking for future enforcement.
 * Built as foundation in Phase 1, enforcement enabled later.
 *
 * Purpose:
 * - Allow organization admins to set per-user token limits
 * - Track individual user token consumption
 * - Enable "quota exceeded" blocking in future phases
 *
 * Phase 1: Schema exists, tracking happens, NO enforcement
 * Phase 4: Enable enforcement via isEnforced flag
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * USER AI QUOTAS
 *
 * Per-user monthly token limits (optional, for future enforcement).
 * By default, all users share the organization's total quota (first-come, first-serve).
 *
 * When enforced (Phase 4):
 * - Organization admin sets monthlyTokenLimit for specific users
 * - User requests are blocked when quota exceeded
 * - User sees "Ask your admin for more tokens" message
 */
export const userAIQuotas = defineTable({
  // Identification
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  // Quota settings
  monthlyTokenLimit: v.optional(v.number()),  // null = no limit (use org default)
  tokensUsed: v.number(),                     // Resets monthly

  // Period tracking
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),

  // Status
  isEnforced: v.boolean(),                    // false = no enforcement (Phase 1)

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_organization", ["organizationId"])
  .index("by_org_and_user", ["organizationId", "userId"])
  .index("by_period_end", ["currentPeriodEnd"]);
