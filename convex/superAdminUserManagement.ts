import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "./rbacHelpers";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  assertActorIsSuperAdmin,
  assertNotLastGlobalSuperAdmin,
  assertNotSelfDeactivation,
  assertNotSelfMembershipRemoval,
  assertOrgOwnerNotOrphaned,
} from "./superAdminUserManagementGuards";
import { buildUserSortFields } from "./userSortKeys";
import { isVisibleInOrdinaryOrganizationListings } from "./lib/organizationLifecycle";

type MembershipWithRole = {
  _id: Id<"organizationMembers">;
  userId: Id<"users">;
  organizationId: Id<"organizations">;
  role: Id<"roles">;
  isActive: boolean;
  joinedAt: number;
  invitedBy?: Id<"users">;
  invitedAt?: number;
  acceptedAt?: number;
  roleName: string;
};

type SuperAdminCtx = QueryCtx | MutationCtx;

async function requireSuperAdminSession(
  ctx: SuperAdminCtx,
  sessionId: string
): Promise<{ actorUserId: Id<"users">; actorSessionOrganizationId: Id<"organizations"> }> {
  const { userId, organizationId } = await requireAuthenticatedUser(ctx, sessionId);
  const userContext = await getUserContext(ctx, userId);
  assertActorIsSuperAdmin(userContext.isGlobal && userContext.roleName === "super_admin");
  return {
    actorUserId: userId,
    actorSessionOrganizationId: organizationId,
  };
}

async function getRoleByName(ctx: SuperAdminCtx, roleName: string): Promise<Doc<"roles">> {
  const role = await ctx.db
    .query("roles")
    .withIndex("by_name", (q) => q.eq("name", roleName))
    .first();
  if (!role || !role.isActive) {
    throw new Error(`Ungültige Rolle: ${roleName}`);
  }
  return role;
}

async function getActiveMembershipWithRole(
  ctx: SuperAdminCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">
): Promise<MembershipWithRole | null> {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) => q.eq("userId", userId).eq("organizationId", organizationId))
    .first();

  if (!membership || !membership.isActive) {
    return null;
  }

  const role = await ctx.db.get(membership.role);
  return {
    ...membership,
    roleName: role?.name ?? "unknown",
  };
}

async function countRemainingActiveOrgOwners(
  ctx: SuperAdminCtx,
  organizationId: Id<"organizations">,
  excludingUserId: Id<"users">
): Promise<number> {
  const memberships = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  let count = 0;
  for (const membership of memberships) {
    if (membership.userId === excludingUserId) {
      continue;
    }
    const role = await ctx.db.get(membership.role);
    if (role?.name === "org_owner") {
      count += 1;
    }
  }
  return count;
}

async function countActiveGlobalSuperAdmins(ctx: SuperAdminCtx): Promise<number> {
  const superAdminRole = await getRoleByName(ctx, "super_admin");
  const users = await ctx.db.query("users").collect();
  let count = 0;
  for (const user of users) {
    if (user.global_role_id === superAdminRole._id && user.isActive !== false) {
      count += 1;
    }
  }
  return count;
}

async function resolveLastActiveAt(ctx: SuperAdminCtx, userId: Id<"users">): Promise<number | null> {
  const identities = await ctx.db
    .query("userIdentities")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const passkeys = await ctx.db
    .query("passkeys")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const lastIdentity = Math.max(...identities.map((identity) => identity.lastUsedAt ?? 0), 0);
  const lastPasskey = Math.max(...passkeys.map((passkey) => passkey.lastUsedAt ?? 0), 0);
  const lastSession = Math.max(...sessions.map((session) => session.createdAt ?? 0), 0);
  const candidate = Math.max(lastIdentity, lastPasskey, lastSession);
  return candidate > 0 ? candidate : null;
}

async function logPrivilegedMutation(ctx: MutationCtx, args: {
  actorUserId: Id<"users">;
  organizationId?: Id<"organizations">;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await ctx.db.insert("auditLogs", {
    userId: args.actorUserId,
    organizationId: args.organizationId,
    action: args.action,
    resource: args.resource,
    resourceId: args.resourceId,
    success: true,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

export const listUsers = query({
  args: {
    sessionId: v.string(),
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
    search: v.optional(v.string()),
    status: v.optional(v.union(v.literal("all"), v.literal("active"), v.literal("inactive"))),
    sortBy: v.optional(v.union(v.literal("email"), v.literal("name"), v.literal("createdAt"))),
    sortDirection: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);

    const pageSize = Math.max(10, Math.min(args.pageSize ?? 50, 100));
    const cursor = args.cursor ?? null;
    const normalizedSearch = args.search?.trim().toLowerCase() ?? "";
    const statusFilter = args.status ?? "all";
    const sortBy = args.sortBy ?? "createdAt";
    const sortDirection = args.sortDirection ?? "desc";
    type PaginatedUsersPage = {
      page: Array<Doc<"users">>;
      continueCursor: string;
      isDone: boolean;
    };

    const fetchSortedPage = async (scanCursor: string | null): Promise<PaginatedUsersPage> => {
      if (sortBy === "email") {
        if (sortDirection === "asc") {
          return await ctx.db
            .query("users")
            .withIndex("by_sort_email")
            .filter((q) =>
              statusFilter === "active"
                ? q.neq(q.field("isActive"), false)
                : statusFilter === "inactive"
                  ? q.eq(q.field("isActive"), false)
                  : q.or(q.eq(q.field("isActive"), false), q.neq(q.field("isActive"), false))
            )
            .paginate({ cursor: scanCursor, numItems: pageSize });
        }
        return await ctx.db
          .query("users")
          .withIndex("by_sort_email_desc")
          .filter((q) =>
            statusFilter === "active"
              ? q.neq(q.field("isActive"), false)
              : statusFilter === "inactive"
                ? q.eq(q.field("isActive"), false)
                : q.or(q.eq(q.field("isActive"), false), q.neq(q.field("isActive"), false))
          )
          .paginate({ cursor: scanCursor, numItems: pageSize });
      }

      if (sortBy === "name") {
        if (sortDirection === "asc") {
          return await ctx.db
            .query("users")
            .withIndex("by_sort_name")
            .filter((q) =>
              statusFilter === "active"
                ? q.neq(q.field("isActive"), false)
                : statusFilter === "inactive"
                  ? q.eq(q.field("isActive"), false)
                  : q.or(q.eq(q.field("isActive"), false), q.neq(q.field("isActive"), false))
            )
            .paginate({ cursor: scanCursor, numItems: pageSize });
        }
        return await ctx.db
          .query("users")
          .withIndex("by_sort_name_desc")
          .filter((q) =>
            statusFilter === "active"
              ? q.neq(q.field("isActive"), false)
              : statusFilter === "inactive"
                ? q.eq(q.field("isActive"), false)
                : q.or(q.eq(q.field("isActive"), false), q.neq(q.field("isActive"), false))
          )
          .paginate({ cursor: scanCursor, numItems: pageSize });
      }

      if (sortDirection === "asc") {
        return await ctx.db
          .query("users")
          .withIndex("by_sort_created_at")
          .filter((q) =>
            statusFilter === "active"
              ? q.neq(q.field("isActive"), false)
              : statusFilter === "inactive"
                ? q.eq(q.field("isActive"), false)
                : q.or(q.eq(q.field("isActive"), false), q.neq(q.field("isActive"), false))
          )
          .paginate({ cursor: scanCursor, numItems: pageSize });
      }

      return await ctx.db
        .query("users")
        .withIndex("by_sort_created_at_desc")
        .filter((q) =>
          statusFilter === "active"
            ? q.neq(q.field("isActive"), false)
            : statusFilter === "inactive"
              ? q.eq(q.field("isActive"), false)
              : q.or(q.eq(q.field("isActive"), false), q.neq(q.field("isActive"), false))
        )
        .paginate({ cursor: scanCursor, numItems: pageSize });
    };

    const searchMatches = (user: Doc<"users">): boolean => {
      if (!normalizedSearch) {
        return true;
      }
      const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim().toLowerCase();
      const email = user.email.toLowerCase();
      return fullName.includes(normalizedSearch) || email.includes(normalizedSearch);
    };

    const collectedUsers: Array<Doc<"users">> = [];
    let scanCursor = cursor;
    let terminalPage: PaginatedUsersPage | null = null;
    const maxScans = normalizedSearch ? 15 : 1;

    for (let i = 0; i < maxScans; i += 1) {
      const page = await fetchSortedPage(scanCursor);
      terminalPage = page;

      for (const user of page.page) {
        if (searchMatches(user)) {
          collectedUsers.push(user);
        }
        if (collectedUsers.length >= pageSize) {
          break;
        }
      }

      if (collectedUsers.length >= pageSize || page.isDone) {
        break;
      }
      scanCursor = page.continueCursor;
    }

    const pageUsers = collectedUsers.slice(0, pageSize);
    const usersWithComputed = await Promise.all(
      pageUsers.map(async (user) => {
        const memberships = await ctx.db
          .query("organizationMembers")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();
        const defaultOrg = user.defaultOrgId ? await ctx.db.get(user.defaultOrgId) : null;
        const lastActiveAt = await resolveLastActiveAt(ctx, user._id);
        return {
          id: user._id,
          email: user.email,
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          status: user.isActive === false ? "inactive" : "active",
          createdAt: user.createdAt ?? 0,
          updatedAt: user.updatedAt ?? 0,
          lastActiveAt,
          betaAccessStatus: user.betaAccessStatus ?? "none",
          membershipCount: memberships.length,
          defaultOrgId: user.defaultOrgId ?? null,
          defaultOrgName: defaultOrg?.name ?? null,
        };
      })
    );

    const canContinue = normalizedSearch
      ? Boolean(terminalPage && (!terminalPage.isDone || collectedUsers.length >= pageSize))
      : Boolean(terminalPage && !terminalPage.isDone);

    return {
      users: usersWithComputed,
      continueCursor: terminalPage?.continueCursor ?? (cursor ?? ""),
      isDone: !canContinue,
      pageSize,
    };
  },
});

export const getUserDetail = query({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const membershipsWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await ctx.db.get(membership.organizationId);
        const role = await ctx.db.get(membership.role);
        return {
          membershipId: membership._id,
          organizationId: membership.organizationId,
          organizationName: organization?.name ?? "Unknown organization",
          roleId: membership.role,
          roleName: role?.name ?? "unknown",
          isActive: membership.isActive,
          joinedAt: membership.joinedAt,
          invitedAt: membership.invitedAt ?? null,
          acceptedAt: membership.acceptedAt ?? null,
        };
      })
    );

    const identities = await ctx.db
      .query("userIdentities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const passkeys = await ctx.db
      .query("passkeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const activeSession = [...sessions]
      .filter((session) => session.expiresAt > Date.now())
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    const currentOrganization = activeSession ? await ctx.db.get(activeSession.organizationId) : null;
    const defaultOrganization = user.defaultOrgId ? await ctx.db.get(user.defaultOrgId) : null;

    const hasPasswordIdentity = identities.some((identity) => identity.provider === "password");
    const lastActiveAt = await resolveLastActiveAt(ctx, args.userId);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        avatarUrl: user.avatarUrl ?? "",
        status: user.isActive === false ? "inactive" : "active",
        createdAt: user.createdAt ?? 0,
        updatedAt: user.updatedAt ?? 0,
        betaAccessStatus: user.betaAccessStatus ?? "none",
        defaultOrgId: user.defaultOrgId ?? null,
        defaultOrgName: defaultOrganization?.name ?? null,
        currentOrgId: currentOrganization?._id ?? null,
        currentOrgName: currentOrganization?.name ?? null,
        scheduledDeletionDate: user.scheduledDeletionDate ?? null,
        lastActiveAt,
      },
      auth: {
        hasPasswordIdentity,
        passkeyCount: passkeys.filter((passkey) => passkey.isActive).length,
        providers: identities.map((identity) => ({
          provider: identity.provider,
          providerEmail: identity.providerEmail,
          isPrimary: identity.isPrimary,
          isVerified: identity.isVerified,
          connectedAt: identity.connectedAt,
          lastUsedAt: identity.lastUsedAt ?? null,
        })),
      },
      memberships: membershipsWithDetails,
    };
  },
});

export const listOrganizationsLite = query({
  args: {
    sessionId: v.string(),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const normalizedSearch = args.search?.trim().toLowerCase() ?? "";
    const limit = Math.max(10, Math.min(args.limit ?? 100, 300));
    const organizations = await ctx.db.query("organizations").collect();
    return organizations
      .filter(isVisibleInOrdinaryOrganizationListings)
      .filter((organization) => {
        if (!normalizedSearch) {
          return true;
        }
        const name = organization.name.toLowerCase();
        const businessName = (organization.businessName ?? "").toLowerCase();
        return name.includes(normalizedSearch) || businessName.includes(normalizedSearch);
      })
      .slice(0, limit)
      .map((organization) => ({
        id: organization._id,
        name: organization.name,
        businessName: organization.businessName,
        isActive: organization.isActive,
      }));
  },
});

export const createUser = mutation({
  args: {
    sessionId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    betaAccessStatus: v.optional(v.union(v.literal("approved"), v.literal("pending"), v.literal("rejected"), v.literal("none"))),
    initialMembership: v.optional(
      v.object({
        organizationId: v.id("organizations"),
        roleName: v.union(v.literal("org_owner"), v.literal("business_manager"), v.literal("employee"), v.literal("viewer")),
        setAsDefaultOrg: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { actorUserId } = await requireSuperAdminSession(ctx, args.sessionId);

    const email = args.email.trim().toLowerCase();
    if (!email) {
      throw new Error("E-Mail ist erforderlich");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (existingUser) {
      throw new Error("Ein Benutzer mit dieser E-Mail existiert bereits");
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email,
      firstName: args.firstName?.trim() || undefined,
      lastName: args.lastName?.trim() || undefined,
      avatarUrl: args.avatarUrl?.trim() || undefined,
      betaAccessStatus: args.betaAccessStatus ?? "none",
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ...buildUserSortFields({
        email,
        firstName: args.firstName,
        lastName: args.lastName,
        createdAt: now,
      }),
    });

    if (args.initialMembership) {
      const role = await getRoleByName(ctx, args.initialMembership.roleName);
      await ctx.db.insert("organizationMembers", {
        userId,
        organizationId: args.initialMembership.organizationId,
        role: role._id,
        isActive: true,
        joinedAt: now,
        invitedBy: actorUserId,
        invitedAt: now,
        acceptedAt: now,
      });

      if (args.initialMembership.setAsDefaultOrg) {
        await ctx.db.patch(userId, {
          defaultOrgId: args.initialMembership.organizationId,
          updatedAt: now,
        });
      }
    }

    await logPrivilegedMutation(ctx, {
      actorUserId,
      action: "super_admin_create_user",
      resource: "users",
      resourceId: userId,
      metadata: {
        targetUserId: userId,
        initialMembershipOrgId: args.initialMembership?.organizationId ?? null,
        initialMembershipRoleName: args.initialMembership?.roleName ?? null,
      },
    });

    return { success: true, userId };
  },
});

export const updateUserProfile = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    updates: v.object({
      email: v.optional(v.string()),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      betaAccessStatus: v.optional(v.union(v.literal("approved"), v.literal("pending"), v.literal("rejected"), v.literal("none"))),
    }),
  },
  handler: async (ctx, args) => {
    const { actorUserId } = await requireSuperAdminSession(ctx, args.sessionId);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Benutzer nicht gefunden");
    }

    const patch: {
      email?: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      betaAccessStatus?: "approved" | "pending" | "rejected" | "none";
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (typeof args.updates.email === "string") {
      const normalizedEmail = args.updates.email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error("E-Mail darf nicht leer sein");
      }
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", normalizedEmail))
        .first();
      if (existing && existing._id !== args.userId) {
        throw new Error("Ein Benutzer mit dieser E-Mail existiert bereits");
      }
      patch.email = normalizedEmail;
    }

    const nextFirstName =
      typeof args.updates.firstName === "string" ? args.updates.firstName.trim() : (user.firstName ?? "");
    const nextLastName =
      typeof args.updates.lastName === "string" ? args.updates.lastName.trim() : (user.lastName ?? "");
    const nextEmail = patch.email ?? user.email;

    if (typeof args.updates.firstName === "string") {
      patch.firstName = args.updates.firstName.trim();
    }
    if (typeof args.updates.lastName === "string") {
      patch.lastName = args.updates.lastName.trim();
    }
    if (typeof args.updates.avatarUrl === "string") {
      patch.avatarUrl = args.updates.avatarUrl.trim();
    }
    if (args.updates.betaAccessStatus) {
      patch.betaAccessStatus = args.updates.betaAccessStatus;
    }

    Object.assign(
      patch,
      buildUserSortFields({
        email: nextEmail,
        firstName: nextFirstName,
        lastName: nextLastName,
        createdAt: user.createdAt ?? 0,
      })
    );

    await ctx.db.patch(args.userId, patch);

    await logPrivilegedMutation(ctx, {
      actorUserId,
      organizationId: user.defaultOrgId,
      action: "super_admin_update_user_profile",
      resource: "users",
      resourceId: args.userId,
      metadata: {
        targetUserId: args.userId,
        updatedFields: Object.keys(args.updates),
      },
    });

    return { success: true };
  },
});

export const backfillUserSortKeys = mutation({
  args: {
    sessionId: v.string(),
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { actorUserId } = await requireSuperAdminSession(ctx, args.sessionId);
    const pageSize = Math.max(25, Math.min(args.pageSize ?? 250, 500));
    const usersPage = await ctx.db
      .query("users")
      .order("desc")
      .paginate({ cursor: args.cursor ?? null, numItems: pageSize });

    let updatedCount = 0;
    for (const user of usersPage.page) {
      const sortFields = buildUserSortFields({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt ?? 0,
      });
      await ctx.db.patch(user._id, sortFields);
      updatedCount += 1;
    }

    await logPrivilegedMutation(ctx, {
      actorUserId,
      action: "super_admin_backfill_user_sort_keys",
      resource: "users",
      metadata: {
        updatedCount,
        continueCursor: usersPage.continueCursor,
        isDone: usersPage.isDone,
      },
    });

    return {
      updatedCount,
      continueCursor: usersPage.continueCursor,
      isDone: usersPage.isDone,
    };
  },
});

export const setUserActivation = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { actorUserId } = await requireSuperAdminSession(ctx, args.sessionId);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Benutzer nicht gefunden");
    }

    if (!args.active) {
      assertNotSelfDeactivation(actorUserId, args.userId);
      const superAdminRole = await getRoleByName(ctx, "super_admin");
      const activeSuperAdminCount = await countActiveGlobalSuperAdmins(ctx);
      assertNotLastGlobalSuperAdmin({
        targetHasSuperAdminRole: user.global_role_id === superAdminRole._id,
        activeSuperAdminCount,
        nextIsActive: false,
      });

      const memberships = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      for (const membership of memberships) {
        const role = await ctx.db.get(membership.role);
        if (role?.name !== "org_owner") {
          continue;
        }
        const remainingOwners = await countRemainingActiveOrgOwners(ctx, membership.organizationId, args.userId);
        const org = await ctx.db.get(membership.organizationId);
        assertOrgOwnerNotOrphaned({
          targetIsOrgOwner: true,
          nextIsOrgOwner: false,
          remainingActiveOwnerCount: remainingOwners,
          organizationLabel: org?.name,
        });
      }
    }

    await ctx.db.patch(args.userId, {
      isActive: args.active,
      updatedAt: Date.now(),
    });

    await logPrivilegedMutation(ctx, {
      actorUserId,
      organizationId: user.defaultOrgId,
      action: args.active ? "super_admin_reactivate_user" : "super_admin_deactivate_user",
      resource: "users",
      resourceId: args.userId,
      metadata: {
        targetUserId: args.userId,
        active: args.active,
      },
    });

    return { success: true };
  },
});

export const addMembership = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    roleName: v.union(v.literal("org_owner"), v.literal("business_manager"), v.literal("employee"), v.literal("viewer")),
    setAsDefaultOrg: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { actorUserId } = await requireSuperAdminSession(ctx, args.sessionId);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Benutzer nicht gefunden");
    }

    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organisation nicht gefunden");
    }

    const role = await getRoleByName(ctx, args.roleName);

    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    const now = Date.now();
    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, {
        role: role._id,
        isActive: true,
        invitedBy: actorUserId,
        invitedAt: now,
        acceptedAt: now,
      });
    } else {
      await ctx.db.insert("organizationMembers", {
        userId: args.userId,
        organizationId: args.organizationId,
        role: role._id,
        isActive: true,
        joinedAt: now,
        invitedBy: actorUserId,
        invitedAt: now,
        acceptedAt: now,
      });
    }

    if (args.setAsDefaultOrg) {
      await ctx.db.patch(args.userId, {
        defaultOrgId: args.organizationId,
        updatedAt: now,
      });
    }

    await logPrivilegedMutation(ctx, {
      actorUserId,
      organizationId: args.organizationId,
      action: "super_admin_add_membership",
      resource: "organizationMembers",
      resourceId: args.userId,
      metadata: {
        targetUserId: args.userId,
        organizationId: args.organizationId,
        roleName: args.roleName,
      },
    });

    return { success: true };
  },
});

export const changeMembershipRole = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    roleName: v.union(v.literal("org_owner"), v.literal("business_manager"), v.literal("employee"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const { actorUserId } = await requireSuperAdminSession(ctx, args.sessionId);

    const membership = await getActiveMembershipWithRole(ctx, args.userId, args.organizationId);
    if (!membership) {
      throw new Error("Aktive Mitgliedschaft nicht gefunden");
    }

    const nextRole = await getRoleByName(ctx, args.roleName);
    const remainingOwners = await countRemainingActiveOrgOwners(ctx, args.organizationId, args.userId);
    const organization = await ctx.db.get(args.organizationId);

    assertOrgOwnerNotOrphaned({
      targetIsOrgOwner: membership.roleName === "org_owner",
      nextIsOrgOwner: args.roleName === "org_owner",
      remainingActiveOwnerCount: remainingOwners,
      organizationLabel: organization?.name,
    });

    await ctx.db.patch(membership._id, {
      role: nextRole._id,
    });

    await logPrivilegedMutation(ctx, {
      actorUserId,
      organizationId: args.organizationId,
      action: "super_admin_change_membership_role",
      resource: "organizationMembers",
      resourceId: membership._id,
      metadata: {
        targetUserId: args.userId,
        oldRoleName: membership.roleName,
        newRoleName: args.roleName,
      },
    });

    return { success: true };
  },
});

export const removeMembership = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { actorUserId, actorSessionOrganizationId } = await requireSuperAdminSession(ctx, args.sessionId);

    const membership = await getActiveMembershipWithRole(ctx, args.userId, args.organizationId);
    if (!membership) {
      throw new Error("Aktive Mitgliedschaft nicht gefunden");
    }

    assertNotSelfMembershipRemoval(
      actorUserId,
      args.userId,
      actorSessionOrganizationId,
      args.organizationId
    );

    const remainingOwners = await countRemainingActiveOrgOwners(ctx, args.organizationId, args.userId);
    const organization = await ctx.db.get(args.organizationId);
    assertOrgOwnerNotOrphaned({
      targetIsOrgOwner: membership.roleName === "org_owner",
      nextIsOrgOwner: false,
      remainingActiveOwnerCount: remainingOwners,
      organizationLabel: organization?.name,
    });

    await ctx.db.patch(membership._id, {
      isActive: false,
    });

    const user = await ctx.db.get(args.userId);
    if (user?.defaultOrgId === args.organizationId) {
      const nextMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      await ctx.db.patch(args.userId, {
        defaultOrgId: nextMembership?.organizationId,
        updatedAt: Date.now(),
      });
    }

    await logPrivilegedMutation(ctx, {
      actorUserId,
      organizationId: args.organizationId,
      action: "super_admin_remove_membership",
      resource: "organizationMembers",
      resourceId: membership._id,
      metadata: {
        targetUserId: args.userId,
        removedRoleName: membership.roleName,
      },
    });

    return { success: true };
  },
});

export const setDefaultOrganization = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    organizationId: v.union(v.id("organizations"), v.null()),
  },
  handler: async (ctx, args) => {
    const { actorUserId } = await requireSuperAdminSession(ctx, args.sessionId);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Benutzer nicht gefunden");
    }

    if (args.organizationId !== null) {
      const activeMembership = await getActiveMembershipWithRole(ctx, args.userId, args.organizationId);
      if (!activeMembership) {
        throw new Error("Standard-Organisation muss eine aktive Mitgliedschaft sein");
      }
    }

    await ctx.db.patch(args.userId, {
      defaultOrgId: args.organizationId === null ? undefined : args.organizationId,
      updatedAt: Date.now(),
    });

    await logPrivilegedMutation(ctx, {
      actorUserId,
      organizationId: args.organizationId === null ? user.defaultOrgId : args.organizationId,
      action: "super_admin_set_default_org",
      resource: "users",
      resourceId: args.userId,
      metadata: {
        targetUserId: args.userId,
        defaultOrgId: args.organizationId,
      },
    });

    return { success: true };
  },
});
