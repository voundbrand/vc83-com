import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  checkPermission,
  requireAuthenticatedUser,
} from "./rbacHelpers";

const TEAM_OBJECT_TYPE = "organization_team";
const TEAM_OBJECT_SUBTYPE = "org_team_v1";
const TEAM_MEMBERSHIP_OBJECT_TYPE = "team_membership";
const TEAM_MEMBERSHIP_OBJECT_SUBTYPE = "org_team_membership_v1";

type TeamStatus = "active" | "archived";
type TeamMemberStatus = "active" | "inactive";
type TeamMemberRole = "member" | "lead" | "manager";

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTeamStatus(value: unknown): TeamStatus {
  return value === "archived" ? "archived" : "active";
}

function normalizeTeamMemberStatus(value: unknown): TeamMemberStatus {
  return value === "inactive" ? "inactive" : "active";
}

function normalizeTeamMemberRole(value: unknown): TeamMemberRole {
  if (value === "lead" || value === "manager") {
    return value;
  }
  return "member";
}

async function canManageTeams(
  ctx: unknown,
  userId: Id<"users">,
  organizationId: Id<"organizations">
): Promise<boolean> {
  return (
    (await checkPermission(
      ctx as any,
      userId,
      "manage_users",
      organizationId
    )) ||
    (await checkPermission(
      ctx as any,
      userId,
      "manage_organization",
      organizationId
    ))
  );
}

async function canViewTeams(
  ctx: unknown,
  userId: Id<"users">,
  organizationId: Id<"organizations">
): Promise<boolean> {
  return (
    (await checkPermission(ctx as any, userId, "view_users", organizationId)) ||
    (await canManageTeams(ctx, userId, organizationId))
  );
}

export const getTeamInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    teamId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      return null;
    }
    if (
      team.organizationId !== args.organizationId ||
      team.type !== TEAM_OBJECT_TYPE
    ) {
      return null;
    }
    return team;
  },
});

export const listTeams = query({
  args: {
    sessionId: v.string(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const allowed = await canViewTeams(ctx, auth.userId, auth.organizationId);
    if (!allowed) {
      return [];
    }

    const teams = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", auth.organizationId)
          .eq("type", TEAM_OBJECT_TYPE)
      )
      .collect();

    const memberships = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", auth.organizationId)
          .eq("type", TEAM_MEMBERSHIP_OBJECT_TYPE)
      )
      .collect();

    const activeMemberCountByTeam = new Map<string, number>();
    for (const membership of memberships) {
      const props = (membership.customProperties || {}) as Record<string, unknown>;
      const teamId = normalizeOptionalString(props.teamId);
      const status = normalizeTeamMemberStatus(props.status);
      if (!teamId || status !== "active") {
        continue;
      }
      activeMemberCountByTeam.set(
        teamId,
        (activeMemberCountByTeam.get(teamId) || 0) + 1
      );
    }

    return teams
      .filter((team) => {
        if (args.includeArchived) {
          return true;
        }
        return normalizeTeamStatus(team.status) === "active";
      })
      .map((team) => {
        const props = (team.customProperties || {}) as Record<string, unknown>;
        const status = normalizeTeamStatus(team.status);
        return {
          id: String(team._id),
          name: normalizeOptionalString(team.name) || "Team",
          status,
          description: normalizeOptionalString(props.description) || null,
          memberCount: activeMemberCountByTeam.get(String(team._id)) || 0,
          updatedAt: typeof team.updatedAt === "number" ? team.updatedAt : null,
        };
      });
  },
});

export const listTeamMembers = query({
  args: {
    sessionId: v.string(),
    teamId: v.id("objects"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const allowed = await canViewTeams(ctx, auth.userId, auth.organizationId);
    if (!allowed) {
      return [];
    }

    const team = await ctx.db.get(args.teamId);
    if (
      !team ||
      team.organizationId !== auth.organizationId ||
      team.type !== TEAM_OBJECT_TYPE
    ) {
      return [];
    }

    const membershipRows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", auth.organizationId)
          .eq("type", TEAM_MEMBERSHIP_OBJECT_TYPE)
      )
      .collect();

    const members = membershipRows.filter((row) => {
      const props = (row.customProperties || {}) as Record<string, unknown>;
      const teamId = normalizeOptionalString(props.teamId);
      if (teamId !== String(args.teamId)) {
        return false;
      }
      if (args.includeInactive) {
        return true;
      }
      return normalizeTeamMemberStatus(props.status) === "active";
    });

    const results = [];
    for (const member of members) {
      const props = (member.customProperties || {}) as Record<string, unknown>;
      const userId = normalizeOptionalString(props.userId);
      const user = userId
        ? await ctx.db.get(userId as Id<"users">)
        : null;
      const fullName =
        normalizeOptionalString(
          `${normalizeOptionalString(user?.firstName) || ""} ${normalizeOptionalString(user?.lastName) || ""}`
        ) || undefined;
      results.push({
        membershipId: String(member._id),
        userId: userId || null,
        role: normalizeTeamMemberRole(props.role),
        status: normalizeTeamMemberStatus(props.status),
        displayName:
          fullName ||
          normalizeOptionalString(user?.firstName) ||
          normalizeOptionalString(user?.email) ||
          userId ||
          "Unknown user",
        email: normalizeOptionalString(user?.email) || null,
      });
    }

    return results;
  },
});

export const saveTeam = mutation({
  args: {
    sessionId: v.string(),
    teamId: v.optional(v.id("objects")),
    name: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const allowed = await canManageTeams(ctx, auth.userId, auth.organizationId);
    if (!allowed) {
      throw new Error("Permission denied: manage_users or manage_organization required");
    }

    const now = Date.now();
    const status = normalizeTeamStatus(args.status);
    const description = normalizeOptionalString(args.description);
    const teamName = normalizeOptionalString(args.name);
    if (!teamName) {
      throw new Error("Team name is required.");
    }

    if (args.teamId) {
      const existing = await ctx.db.get(args.teamId);
      if (
        !existing ||
        existing.organizationId !== auth.organizationId ||
        existing.type !== TEAM_OBJECT_TYPE
      ) {
        throw new Error("Team not found in this organization.");
      }
      await ctx.db.patch(args.teamId, {
        name: teamName,
        status,
        customProperties: {
          ...((existing.customProperties || {}) as Record<string, unknown>),
          description,
          updatedBy: String(auth.userId),
          updatedAt: now,
        },
        updatedAt: now,
      });
      return {
        success: true,
        teamId: args.teamId,
        status,
      };
    }

    const teamId = await ctx.db.insert("objects", {
      organizationId: auth.organizationId,
      type: TEAM_OBJECT_TYPE,
      subtype: TEAM_OBJECT_SUBTYPE,
      name: teamName,
      status,
      customProperties: {
        description,
        createdBy: String(auth.userId),
        createdAt: now,
        updatedBy: String(auth.userId),
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      teamId,
      status,
    };
  },
});

export const saveTeamMembership = mutation({
  args: {
    sessionId: v.string(),
    teamId: v.id("objects"),
    userId: v.id("users"),
    role: v.optional(
      v.union(v.literal("member"), v.literal("lead"), v.literal("manager"))
    ),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const allowed = await canManageTeams(ctx, auth.userId, auth.organizationId);
    if (!allowed) {
      throw new Error("Permission denied: manage_users or manage_organization required");
    }

    const team = await ctx.db.get(args.teamId);
    if (
      !team ||
      team.organizationId !== auth.organizationId ||
      team.type !== TEAM_OBJECT_TYPE
    ) {
      throw new Error("Team not found in this organization.");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", auth.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!membership) {
      throw new Error("User is not an active member of this organization.");
    }

    const role = normalizeTeamMemberRole(args.role);
    const status = normalizeTeamMemberStatus(args.status);
    const now = Date.now();
    const allMembershipRows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", auth.organizationId)
          .eq("type", TEAM_MEMBERSHIP_OBJECT_TYPE)
      )
      .collect();

    const existing = allMembershipRows.find((row) => {
      const props = (row.customProperties || {}) as Record<string, unknown>;
      return (
        normalizeOptionalString(props.teamId) === String(args.teamId) &&
        normalizeOptionalString(props.userId) === String(args.userId)
      );
    });

    if (existing) {
      await ctx.db.patch(existing._id, {
        status,
        customProperties: {
          ...((existing.customProperties || {}) as Record<string, unknown>),
          teamId: String(args.teamId),
          userId: String(args.userId),
          role,
          status,
          updatedBy: String(auth.userId),
          updatedAt: now,
        },
        updatedAt: now,
      });
      return {
        success: true,
        membershipId: existing._id,
        status,
        role,
      };
    }

    const membershipId = await ctx.db.insert("objects", {
      organizationId: auth.organizationId,
      type: TEAM_MEMBERSHIP_OBJECT_TYPE,
      subtype: TEAM_MEMBERSHIP_OBJECT_SUBTYPE,
      name: `${String(args.teamId)}:${String(args.userId)}`,
      status,
      customProperties: {
        teamId: String(args.teamId),
        userId: String(args.userId),
        role,
        status,
        createdBy: String(auth.userId),
        createdAt: now,
        updatedBy: String(auth.userId),
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      membershipId,
      status,
      role,
    };
  },
});
