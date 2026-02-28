import { defineTable } from "convex/server";
import { v } from "convex/values";

export const betaCodeStatusValidator = v.union(
  v.literal("active"),
  v.literal("redeemed"),
  v.literal("expired"),
  v.literal("deactivated"),
);

export const betaActivationCodes = defineTable({
  code: v.string(),
  codeKey: v.string(),
  channelTag: v.optional(v.string()),
  sourceDetail: v.optional(v.string()),
  notes: v.optional(v.string()),
  maxUses: v.number(),
  currentUses: v.number(),
  expiresAt: v.optional(v.number()),
  status: betaCodeStatusValidator,
  createdByUserId: v.optional(v.id("users")),
  deactivatedByUserId: v.optional(v.id("users")),
  deactivatedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_code_key", ["codeKey"])
  .index("by_status", ["status"])
  .index("by_channel_status", ["channelTag", "status"])
  .index("by_created_at", ["createdAt"])
  .index("by_expires_at", ["expiresAt"]);

export const betaCodeRedemptions = defineTable({
  betaCodeId: v.id("betaActivationCodes"),
  code: v.string(),
  codeKey: v.string(),
  redeemedByUserId: v.id("users"),
  redeemedByOrganizationId: v.id("organizations"),
  redeemedAt: v.number(),
  channel: v.optional(v.string()),
  source: v.optional(v.string()),
  deviceType: v.optional(v.string()),
})
  .index("by_code_id", ["betaCodeId"])
  .index("by_code_id_user", ["betaCodeId", "redeemedByUserId"])
  .index("by_code_key", ["codeKey"])
  .index("by_source", ["source"])
  .index("by_redeemed_by_user", ["redeemedByUserId"])
  .index("by_redeemed_by_org", ["redeemedByOrganizationId"])
  .index("by_redeemed_at", ["redeemedAt"]);
