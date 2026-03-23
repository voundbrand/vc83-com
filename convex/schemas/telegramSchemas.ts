/**
 * TELEGRAM MAPPING SCHEMAS
 *
 * Maps Telegram chat_id → organization for routing inbound messages.
 *
 * Lifecycle:
 * - Unknown chat_id → "onboarding" (routed to System Bot)
 * - Interview complete → "active" (routed to org's agent)
 * - Churned/deactivated → "churned"
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const telegramMappings = defineTable({
  telegramChatId: v.string(),
  organizationId: v.id("organizations"),
  onboardingOrganizationId: v.optional(v.id("organizations")),
  targetAgentId: v.optional(v.id("objects")),
  status: v.union(
    v.literal("onboarding"),
    v.literal("active"),
    v.literal("churned")
  ),
  senderName: v.optional(v.string()),
  createdAt: v.number(),

  // Identity linking (Step 2: link Telegram to platform user)
  userId: v.optional(v.id("users")),

  // Team group chat (Step 8: Telegram Group Chat)
  teamGroupChatId: v.optional(v.string()),
  teamGroupEnabled: v.optional(v.boolean()),

  // Agency child-org testing override
  testingOrganizationId: v.optional(v.id("organizations")),
  testingTargetAgentId: v.optional(v.id("objects")),
  testingActivatedAt: v.optional(v.number()),
})
  .index("by_chat_id", ["telegramChatId"])
  .index("by_org", ["organizationId"]);
