import { defineTable } from "convex/server";
import { v } from "convex/values";

export const consentTypeValidator = v.union(
  v.literal("cookie_analytics"),
  v.literal("cookie_marketing"),
  v.literal("email_marketing"),
  v.literal("data_processing"),
);

export const consentSourceValidator = v.union(
  v.literal("cookie_banner"),
  v.literal("settings"),
  v.literal("signup"),
  v.literal("system_migration"),
);

export const consentRecords = defineTable({
  userId: v.id("users"),
  consentType: consentTypeValidator,
  granted: v.boolean(),
  timestamp: v.number(),
  policyVersion: v.string(),
  source: consentSourceValidator,

  // Optional metadata to keep policy evidence queryable for audits.
  policyLocale: v.optional(v.string()),
  policyUrl: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_user_type", ["userId", "consentType"])
  .index("by_user_timestamp", ["userId", "timestamp"])
  .index("by_user_type_timestamp", ["userId", "consentType", "timestamp"]);
