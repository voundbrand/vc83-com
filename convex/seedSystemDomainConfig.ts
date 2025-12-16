/**
 * SEED SYSTEM DOMAIN CONFIG
 *
 * Seeds the system organization's domain configuration.
 * This provides a fallback for email sending when organizations
 * haven't configured their own domain config.
 *
 * Run with:
 * ```bash
 * npx convex run seedSystemDomainConfig:seedSystemDomainConfig
 * ```
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedSystemDomainConfig = internalMutation({
  args: {
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("🔄 Seeding System Domain Configuration...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    // Get first user for createdBy
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Create a user first.");
    }

    // Check if system already has an active domain config
    const existingConfigs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "domain_config")
      )
      .collect();

    const existingActive = existingConfigs.find(
      (c) => c.status === "active"
    );

    if (existingActive && !args.overwrite) {
      console.log("✅ System domain config already exists:", existingActive._id);
      console.log("   Use overwrite: true to update it.");
      return {
        message: "Domain config already exists (use overwrite: true to update)",
        domainConfigId: existingActive._id,
        action: "skipped",
      };
    }

    const domainConfigData = {
      organizationId: systemOrg._id,
      type: "domain_config" as const,
      subtype: "platform",
      name: "l4yercak3.com System Domain",
      description: "System fallback domain configuration for email sending",
      status: "active" as const,
      customProperties: {
        domainName: "l4yercak3.com",
        displayName: "l4yercak3",
        isSystemDomain: true,
        // Email configuration using Resend verified domain
        email: {
          emailDomain: "mail.l4yercak3.com",
          senderEmail: "noreply@mail.l4yercak3.com",
          systemEmail: "system@mail.l4yercak3.com",
          salesEmail: "sales@mail.l4yercak3.com",
          replyToEmail: "support@l4yercak3.com",
          defaultTemplateCode: "modern-minimal",
        },
        // Branding defaults
        branding: {
          primaryColor: "#6B46C1",
          secondaryColor: "#9F7AEA",
          accentColor: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        },
      },
      createdBy: firstUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    let domainConfigId;
    let action = "created";

    if (existingActive) {
      // Update existing
      await ctx.db.patch(existingActive._id, {
        ...domainConfigData,
        createdBy: existingActive.createdBy,
        createdAt: existingActive.createdAt,
      });
      domainConfigId = existingActive._id;
      action = "updated";
      console.log("🔄 Updated System domain config:", domainConfigId);
    } else {
      // Create new
      domainConfigId = await ctx.db.insert("objects", domainConfigData);
      console.log("✅ Created System domain config:", domainConfigId);
    }

    console.log("\n📧 System Domain Configuration Details:");
    console.log("   Domain: l4yercak3.com");
    console.log("   Email Domain: mail.l4yercak3.com");
    console.log("   Sender: noreply@mail.l4yercak3.com");
    console.log("   Status: active");
    console.log(`   Action: ${action}`);

    return {
      message: `System domain config ${action} successfully`,
      domainConfigId,
      action,
    };
  },
});
