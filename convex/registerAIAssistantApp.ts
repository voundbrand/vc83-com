import { mutation } from "./_generated/server";

/**
 * Register AI Assistant app only
 *
 * Simple mutation to register the AI Assistant app in the database.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerAIAssistantApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if AI Assistant app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "ai-assistant"))
      .first();

    if (existing) {
      console.log("AI Assistant app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "AI Assistant app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the AI Assistant app record
    const appId = await ctx.db.insert("apps", {
      code: "ai-assistant",
      name: "AI Assistant",
      description: "AI-powered assistant for emails, CRM, forms, events, and workflow automation with natural language interface",
      icon: "🤖",
      category: "business",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("AI Assistant app registered successfully:", appId);

    return {
      appId,
      message: "AI Assistant app registered successfully",
      app,
    };
  },
});
