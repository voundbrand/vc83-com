/**
 * Domain Lookup Internal Queries
 *
 * Internal queries for looking up domain configurations.
 * Used by the public HTTP endpoint for middleware domain routing.
 */

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Look up domain configuration by hostname
 *
 * Finds a domain_config object that matches the given hostname
 * and has webPublishing capability enabled with a linked project.
 */
export const lookupByHostname = internalQuery({
  args: { hostname: v.string() },
  handler: async (ctx, args) => {
    // Normalize hostname (lowercase, remove port, remove www)
    const normalized = args.hostname
      .toLowerCase()
      .replace(/:\d+$/, "")
      .replace(/^www\./, "")
      .trim();

    // Query all domain_config objects
    const domainConfigs = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "domain_config"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Find matching domain
    for (const config of domainConfigs) {
      const props = config.customProperties as {
        domainName?: string;
        domainVerified?: boolean;
        capabilities?: { webPublishing?: boolean };
        webPublishing?: {
          projectId?: string;
          projectSlug?: string;
          isExternal?: boolean;
        };
      } | undefined;

      if (!props?.domainName) continue;

      // Normalize stored domain
      const storedDomain = props.domainName
        .toLowerCase()
        .replace(/^www\./, "")
        .trim();

      // Check if domains match
      if (storedDomain !== normalized) continue;

      // Check if webPublishing is enabled
      if (!props.capabilities?.webPublishing) continue;

      // Check if domain is verified
      if (!props.domainVerified) continue;

      // Check if project is linked
      if (!props.webPublishing?.projectSlug) continue;

      return {
        found: true,
        projectSlug: props.webPublishing.projectSlug,
        projectId: props.webPublishing.projectId,
        organizationId: config.organizationId,
        domainConfigId: config._id,
        domainName: props.domainName,
      };
    }

    return { found: false };
  },
});

/**
 * Get domain config by ID
 */
export const getById = internalQuery({
  args: { domainConfigId: v.id("objects") },
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.domainConfigId);
    if (!config || config.type !== "domain_config") {
      return null;
    }
    return config;
  },
});
