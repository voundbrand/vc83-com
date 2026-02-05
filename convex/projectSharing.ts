/**
 * PROJECT SHARING
 *
 * Cross-organization sharing for project file systems.
 * Supports two modes:
 * - "project" scope: Share entire project file tree
 * - "subtree" scope: Share a specific folder/path only
 *
 * License gating: Only Agency/Enterprise can create shares.
 * Sub-org shortcut: Parent↔child shares auto-accept.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";
import { getLicenseInternal } from "./licensing/helpers";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List shares for projects owned by the current org.
 */
export const listMyShares = query({
  args: {
    sessionId: v.string(),
    projectId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const hasPermission = await checkPermission(ctx, userId, "media_library.view", organizationId);
    if (!hasPermission) throw new Error("Permission denied");

    if (args.projectId) {
      return await ctx.db
        .query("projectShares")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
        .collect();
    }

    return await ctx.db
      .query("projectShares")
      .withIndex("by_owner_org", (q) => q.eq("ownerOrgId", organizationId))
      .collect();
  },
});

/**
 * List projects/subtrees shared with the current org.
 */
export const listSharedWithMe = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const shares = await ctx.db
      .query("projectShares")
      .withIndex("by_target_status", (q) =>
        q.eq("targetOrgId", organizationId).eq("status", "active")
      )
      .collect();

    // Enrich with project info
    const enriched = await Promise.all(
      shares.map(async (share) => {
        const project = await ctx.db.get(share.projectId);
        const ownerOrg = await ctx.db.get(share.ownerOrgId);
        return {
          ...share,
          projectName: project?.name || "Unknown",
          projectStatus: project?.status || "unknown",
          ownerOrgName: ownerOrg?.name || "Unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * List pending share invitations for the current org.
 */
export const listPendingInvites = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const pending = await ctx.db
      .query("projectShares")
      .withIndex("by_target_status", (q) =>
        q.eq("targetOrgId", organizationId).eq("status", "pending")
      )
      .collect();

    const enriched = await Promise.all(
      pending.map(async (share) => {
        const project = await ctx.db.get(share.projectId);
        const ownerOrg = await ctx.db.get(share.ownerOrgId);
        const sharedByUser = await ctx.db.get(share.sharedBy);
        return {
          ...share,
          projectName: project?.name || "Unknown",
          ownerOrgName: ownerOrg?.name || "Unknown",
          sharedByName: sharedByUser
            ? `${sharedByUser.firstName || ""} ${sharedByUser.lastName || ""}`.trim()
            : "Unknown",
        };
      })
    );

    return enriched;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a share invitation.
 * Only Agency/Enterprise orgs can create shares.
 * Sub-org shares auto-accept.
 */
export const createShare = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    targetOrgId: v.id("organizations"),
    shareScope: v.union(v.literal("project"), v.literal("subtree")),
    sharedPath: v.optional(v.string()),
    permission: v.union(v.literal("viewer"), v.literal("editor"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // License gate: only Agency/Enterprise can create shares
    const license = await getLicenseInternal(ctx, organizationId);
    if (license.planTier !== "agency" && license.planTier !== "enterprise") {
      throw new Error("Project sharing requires an Agency or Enterprise plan. Please upgrade to share projects across organizations.");
    }

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.type !== "project" || project.organizationId !== organizationId) {
      throw new Error("Project not found or not owned by your organization");
    }

    // Cannot share with self
    if (args.targetOrgId === organizationId) {
      throw new Error("Cannot share a project with your own organization");
    }

    // Verify target org exists
    const targetOrg = await ctx.db.get(args.targetOrgId);
    if (!targetOrg) throw new Error("Target organization not found");

    // Subtree shares require a path
    if (args.shareScope === "subtree" && !args.sharedPath) {
      throw new Error("Subtree shares require a sharedPath");
    }

    // Check for existing active/pending share
    const existingShares = await ctx.db
      .query("projectShares")
      .withIndex("by_project_target", (q) =>
        q.eq("projectId", args.projectId).eq("targetOrgId", args.targetOrgId)
      )
      .collect();

    const activeOrPending = existingShares.find(
      (s) => s.status === "active" || s.status === "pending"
    );
    if (activeOrPending) {
      throw new Error("An active or pending share already exists for this organization");
    }

    // Determine if this is a sub-org share (auto-accept)
    const currentOrg = await ctx.db.get(organizationId) as any;
    const isSubOrgShare =
      currentOrg?.parentOrganizationId === args.targetOrgId ||
      (targetOrg as any).parentOrganizationId === organizationId;

    const now = Date.now();
    const shareId = await ctx.db.insert("projectShares", {
      projectId: args.projectId,
      ownerOrgId: organizationId,
      targetOrgId: args.targetOrgId,
      shareScope: args.shareScope,
      sharedPath: args.sharedPath,
      permission: args.permission,
      sharedBy: userId,
      status: isSubOrgShare ? "active" : "pending",
      acceptedBy: isSubOrgShare ? userId : undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { shareId, autoAccepted: isSubOrgShare };
  },
});

/**
 * Accept a pending share invitation.
 */
export const acceptShare = mutation({
  args: {
    sessionId: v.string(),
    shareId: v.id("projectShares"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const share = await ctx.db.get(args.shareId);
    if (!share) throw new Error("Share not found");
    if (share.targetOrgId !== organizationId) throw new Error("This share is not for your organization");
    if (share.status !== "pending") throw new Error("Share is not pending");

    await ctx.db.patch(args.shareId, {
      status: "active",
      acceptedBy: userId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Revoke a share (owner or target can revoke).
 */
export const revokeShare = mutation({
  args: {
    sessionId: v.string(),
    shareId: v.id("projectShares"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const share = await ctx.db.get(args.shareId);
    if (!share) throw new Error("Share not found");

    // Either the owner or target org can revoke
    if (share.ownerOrgId !== organizationId && share.targetOrgId !== organizationId) {
      throw new Error("Permission denied");
    }

    await ctx.db.patch(args.shareId, {
      status: "revoked",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update share permissions (owner only).
 */
export const updateSharePermission = mutation({
  args: {
    sessionId: v.string(),
    shareId: v.id("projectShares"),
    permission: v.union(v.literal("viewer"), v.literal("editor"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const share = await ctx.db.get(args.shareId);
    if (!share) throw new Error("Share not found");
    if (share.ownerOrgId !== organizationId) throw new Error("Only the owner can update permissions");
    if (share.status !== "active") throw new Error("Share is not active");

    await ctx.db.patch(args.shareId, {
      permission: args.permission,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
