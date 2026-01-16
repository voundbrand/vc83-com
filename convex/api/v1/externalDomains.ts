/**
 * External Domain Management
 *
 * Handles adding, removing, and verifying custom domains for projects.
 * Integrates with Vercel API for domain provisioning.
 */

import { action, query, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

interface VercelDomainConfig {
  configuredBy: "CNAME" | "A" | "http" | null;
  acceptedChallenges: string[];
  misconfigured: boolean;
}

// ============================================================================
// VERCEL API HELPERS
// ============================================================================

const VERCEL_API_BASE = "https://api.vercel.com";

async function vercelRequest(
  endpoint: string,
  method: "GET" | "POST" | "DELETE",
  body?: unknown
): Promise<Response> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    throw new Error("Vercel API not configured. Missing VERCEL_API_TOKEN or VERCEL_PROJECT_ID");
  }

  const url = new URL(`${VERCEL_API_BASE}${endpoint}`);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all external domains for an organization
 */
export const listExternalDomains = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId as Id<"sessions">))
      .first();

    if (!session || session.organizationId !== args.organizationId) {
      throw new Error("Unauthorized");
    }

    // Get all domain_config objects for this org with webPublishing enabled
    const domainConfigs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "domain_config")
      )
      .collect();

    return domainConfigs
      .filter((config) => {
        const props = config.customProperties as {
          capabilities?: { webPublishing?: boolean };
        } | undefined;
        return props?.capabilities?.webPublishing === true;
      })
      .map((config) => {
        const props = config.customProperties as {
          domainName?: string;
          domainVerified?: boolean;
          vercelDomainId?: string;
          vercelVerified?: boolean;
          vercelMisconfigured?: boolean;
          dnsInstructions?: unknown;
          webPublishing?: {
            projectId?: string;
            projectSlug?: string;
          };
        };
        return {
          id: config._id,
          domainName: props?.domainName || "",
          verified: props?.domainVerified || false,
          vercelVerified: props?.vercelVerified || false,
          vercelMisconfigured: props?.vercelMisconfigured || false,
          projectId: props?.webPublishing?.projectId,
          projectSlug: props?.webPublishing?.projectSlug,
          dnsInstructions: props?.dnsInstructions,
          createdAt: config.createdAt,
          status: config.status,
        };
      });
  },
});

/**
 * Get available projects to link to a domain
 */
export const getAvailableProjects = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId as Id<"sessions">))
      .first();

    if (!session || session.organizationId !== args.organizationId) {
      throw new Error("Unauthorized");
    }

    // Get all projects for this org that have public pages enabled
    const projects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      )
      .collect();

    return projects
      .filter((project) => {
        const props = project.customProperties as {
          publicPage?: { enabled?: boolean; slug?: string };
        } | undefined;
        return props?.publicPage?.enabled && props?.publicPage?.slug;
      })
      .map((project) => {
        const props = project.customProperties as {
          publicPage: { slug: string };
        };
        return {
          id: project._id,
          name: project.name,
          slug: props.publicPage.slug,
        };
      });
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create domain config and link to project (internal)
 */
export const createDomainConfigInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    domainName: v.string(),
    projectId: v.id("objects"),
    projectSlug: v.string(),
    vercelDomainData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Normalize domain
    const normalizedDomain = args.domainName
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .trim();

    // Check if domain already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "domain_config")
      )
      .collect();

    const duplicate = existing.find((config) => {
      const props = config.customProperties as { domainName?: string } | undefined;
      return props?.domainName?.toLowerCase() === normalizedDomain;
    });

    if (duplicate) {
      throw new Error(`Domain ${normalizedDomain} is already configured`);
    }

    // Extract DNS instructions from Vercel response
    const vercelData = args.vercelDomainData as VercelDomainResponse | undefined;
    const dnsInstructions = vercelData?.verification || [];

    // Create domain_config object
    const domainConfigId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "domain_config",
      name: normalizedDomain,
      status: "active",
      customProperties: {
        domainName: normalizedDomain,
        domainVerified: false,
        vercelVerified: vercelData?.verified || false,
        vercelMisconfigured: false,
        dnsInstructions,
        capabilities: {
          webPublishing: true,
        },
        webPublishing: {
          projectId: args.projectId,
          projectSlug: args.projectSlug,
          isExternal: true,
        },
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      domainConfigId,
      domainName: normalizedDomain,
      dnsInstructions,
      vercelVerified: vercelData?.verified || false,
    };
  },
});

/**
 * Update domain verification status (internal)
 */
export const updateDomainVerificationInternal = internalMutation({
  args: {
    domainConfigId: v.id("objects"),
    verified: v.boolean(),
    vercelVerified: v.boolean(),
    vercelMisconfigured: v.boolean(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.domainConfigId);
    if (!config) {
      throw new Error("Domain config not found");
    }

    const props = config.customProperties as Record<string, unknown>;

    await ctx.db.patch(args.domainConfigId, {
      customProperties: {
        ...props,
        domainVerified: args.verified,
        vercelVerified: args.vercelVerified,
        vercelMisconfigured: args.vercelMisconfigured,
        verifiedAt: args.verified ? Date.now() : undefined,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete domain config (internal)
 */
export const deleteDomainConfigInternal = internalMutation({
  args: {
    domainConfigId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.domainConfigId);
  },
});

// ============================================================================
// ACTIONS (Vercel API calls)
// ============================================================================

/**
 * Add a custom domain to Vercel and create domain config
 */
export const addExternalDomain = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    domainName: v.string(),
    projectId: v.id("objects"),
    projectSlug: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    domainConfigId: Id<"objects">;
    domainName: string;
    dnsInstructions: unknown[];
    vercelVerified: boolean;
    message: string;
  }> => {
    // Verify session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await ctx.runQuery(internal.auth.getSessionById as any, {
      sessionId: args.sessionId,
    }) as { userId: Id<"users">; organizationId: Id<"organizations"> } | null;

    if (!session || session.organizationId !== args.organizationId) {
      throw new Error("Unauthorized");
    }

    // Normalize domain
    const normalizedDomain = args.domainName
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .trim();

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
    if (!domainRegex.test(normalizedDomain)) {
      throw new Error("Invalid domain format");
    }

    // Add domain to Vercel
    const projectId = process.env.VERCEL_PROJECT_ID;
    const response = await vercelRequest(
      `/v10/projects/${projectId}/domains`,
      "POST",
      { name: normalizedDomain }
    );

    const vercelData = (await response.json()) as VercelDomainResponse;

    if (!response.ok) {
      // Handle specific Vercel errors
      if (vercelData.error?.code === "domain_already_in_use") {
        throw new Error("This domain is already in use by another Vercel project");
      }
      if (vercelData.error?.code === "forbidden") {
        throw new Error("This domain cannot be added. It may be restricted or already verified elsewhere.");
      }
      throw new Error(vercelData.error?.message || "Failed to add domain to Vercel");
    }

    // Create domain config in Convex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await ctx.runMutation(
      internal.api.v1.externalDomains.createDomainConfigInternal as any,
      {
        organizationId: args.organizationId,
        userId: session.userId,
        domainName: normalizedDomain,
        projectId: args.projectId,
        projectSlug: args.projectSlug,
        vercelDomainData: vercelData,
      }
    ) as {
      domainConfigId: Id<"objects">;
      domainName: string;
      dnsInstructions: unknown[];
      vercelVerified: boolean;
    };

    return {
      success: true,
      domainConfigId: result.domainConfigId,
      domainName: result.domainName,
      dnsInstructions: result.dnsInstructions,
      vercelVerified: result.vercelVerified,
      message: result.vercelVerified
        ? "Domain added and verified!"
        : "Domain added. Please configure DNS as instructed.",
    };
  },
});

/**
 * Check domain verification status with Vercel
 */
export const checkDomainVerification = action({
  args: {
    sessionId: v.string(),
    domainConfigId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get domain config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = await ctx.runQuery(
      internal.api.v1.domainLookupInternal.getById as any,
      { domainConfigId: args.domainConfigId }
    ) as { customProperties?: { domainName?: string }; organizationId: Id<"organizations"> } | null;

    if (!config) {
      throw new Error("Domain config not found");
    }

    const props = config.customProperties;

    if (!props?.domainName) {
      throw new Error("Invalid domain config");
    }

    // Check with Vercel
    const projectId = process.env.VERCEL_PROJECT_ID;
    const response = await vercelRequest(
      `/v9/projects/${projectId}/domains/${props.domainName}`,
      "GET"
    );

    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: "Failed to check domain status",
      };
    }

    const vercelData = (await response.json()) as VercelDomainResponse & VercelDomainConfig;

    // Also check domain config endpoint for misconfiguration
    const configResponse = await vercelRequest(
      `/v6/domains/${props.domainName}/config`,
      "GET"
    );

    let misconfigured = false;
    if (configResponse.ok) {
      const configData = (await configResponse.json()) as VercelDomainConfig;
      misconfigured = configData.misconfigured || false;
    }

    // Update verification status in Convex
    const verified = vercelData.verified && !misconfigured;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.runMutation(
      internal.api.v1.externalDomains.updateDomainVerificationInternal as any,
      {
        domainConfigId: args.domainConfigId,
        verified,
        vercelVerified: vercelData.verified,
        vercelMisconfigured: misconfigured,
      }
    );

    return {
      success: true,
      verified,
      vercelVerified: vercelData.verified,
      misconfigured,
      dnsInstructions: vercelData.verification || [],
    };
  },
});

/**
 * Remove a custom domain from Vercel and delete domain config
 */
export const removeExternalDomain = action({
  args: {
    sessionId: v.string(),
    domainConfigId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get domain config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = await ctx.runQuery(
      internal.api.v1.domainLookupInternal.getById as any,
      { domainConfigId: args.domainConfigId }
    ) as { customProperties?: { domainName?: string }; organizationId: Id<"organizations"> } | null;

    if (!config) {
      throw new Error("Domain config not found");
    }

    // Verify session has access to this org
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await ctx.runQuery(internal.auth.getSessionById as any, {
      sessionId: args.sessionId,
    }) as { organizationId: Id<"organizations"> } | null;

    if (!session || session.organizationId !== config.organizationId) {
      throw new Error("Unauthorized");
    }

    const props = config.customProperties;

    if (props?.domainName) {
      // Remove from Vercel
      const projectId = process.env.VERCEL_PROJECT_ID;
      const response = await vercelRequest(
        `/v9/projects/${projectId}/domains/${props.domainName}`,
        "DELETE"
      );

      if (!response.ok && response.status !== 404) {
        const error = await response.json();
        console.error("[removeExternalDomain] Vercel error:", error);
        // Continue with deletion even if Vercel fails
      }
    }

    // Delete domain config from Convex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.runMutation(
      internal.api.v1.externalDomains.deleteDomainConfigInternal as any,
      { domainConfigId: args.domainConfigId }
    );

    return { success: true };
  },
});
