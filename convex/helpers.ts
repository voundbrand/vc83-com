import { Auth } from "convex/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function isAppCreator(
  ctx: QueryCtx | MutationCtx,
  appId: Id<"apps">,
  orgId?: Id<"organizations">
): Promise<boolean> {
  const app = await ctx.db.get(appId);
  if (!app) return false;
  
  if (!orgId) return false;
  
  return app.creatorOrgId === orgId;
}

export async function canMutateAppContent(
  ctx: MutationCtx,
  appId: Id<"apps">,
  orgId?: Id<"organizations">
): Promise<boolean> {
  if (!orgId) return false;
  
  const app = await ctx.db.get(appId);
  if (!app) return false;
  
  if (app.dataScope === "org-owned") {
    return app.creatorOrgId === orgId;
  }
  
  if (app.dataScope === "installer-owned") {
    const installation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", (q) => 
        q.eq("organizationId", orgId).eq("appId", appId)
      )
      .first();
    return !!installation && installation.status === "active";
  }
  
  return false;
}

export async function canReadAppContent(
  ctx: QueryCtx | MutationCtx,
  appId: Id<"apps">,
  orgId?: Id<"organizations">,
  requireAuth: boolean = true
): Promise<boolean> {
  const app = await ctx.db.get(appId);
  if (!app) return false;
  
  if (app.dataScope === "org-owned") {
    if (!requireAuth && app.price === undefined) {
      return true;
    }
    
    if (!orgId) return !requireAuth && app.price === undefined;
    
    const installation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", (q) => 
        q.eq("organizationId", orgId).eq("appId", appId)
      )
      .first();
    return !!installation && installation.status === "active";
  }
  
  if (app.dataScope === "installer-owned") {
    if (!orgId) return false;
    
    const installation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", (q) => 
        q.eq("organizationId", orgId).eq("appId", appId)
      )
      .first();
    return !!installation && installation.status === "active";
  }
  
  return false;
}

export async function getUserOrgId(
  ctx: QueryCtx | MutationCtx,
  auth: Auth
): Promise<Id<"organizations"> | null> {
  const identity = await auth.getUserIdentity();
  if (!identity) return null;
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email!))
    .first();
    
  return user?.defaultOrgId ?? null;
}

export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  auth: Auth
): Promise<Id<"users">> {
  const identity = await auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email!))
    .first();
    
  if (!user) {
    throw new Error("User not found");
  }
  
  return user._id;
}

export async function requireOrgAccess(
  ctx: QueryCtx | MutationCtx,
  auth: Auth,
  orgId: Id<"organizations">
): Promise<void> {
  const userId = await requireAuth(ctx, auth);
  
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) => 
      q.eq("userId", userId).eq("organizationId", orgId)
    )
    .first();
    
  if (!membership || !membership.isActive) {
    throw new Error("Access denied: Not a member of this organization");
  }
}

export async function requireAppCreator(
  ctx: MutationCtx,
  auth: Auth,
  appId: Id<"apps">
): Promise<Id<"organizations">> {
  await requireAuth(ctx, auth);
  const orgId = await getUserOrgId(ctx, auth);
  
  if (!orgId) {
    throw new Error("No organization found for user");
  }
  
  const app = await ctx.db.get(appId);
  if (!app) {
    throw new Error("App not found");
  }
  
  if (app.creatorOrgId !== orgId) {
    throw new Error("Only app creator can perform this action");
  }
  
  return orgId;
}

export async function requireCreatorOrg(
  ctx: QueryCtx | MutationCtx,
  creatorOrgSlug: string
): Promise<{
  user: { _id: Id<"users">; email: string; defaultOrgId: Id<"organizations"> };
  creatorOrg: { _id: Id<"organizations">; name: string; plan: "personal" | "business" | "enterprise" };
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email!))
    .first();
  
  if (!user) {
    throw new Error("User not found");
  }
  
  const creatorOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", creatorOrgSlug))
    .first();
  
  if (!creatorOrg) {
    throw new Error(`Creator organization ${creatorOrgSlug} not found`);
  }
  
  if (user.defaultOrgId !== creatorOrg._id) {
    throw new Error(`Only ${creatorOrgSlug} creators can perform this action`);
  }
  
  return {
    user: {
      _id: user._id,
      email: user.email,
      defaultOrgId: user.defaultOrgId,
    },
    creatorOrg: {
      _id: creatorOrg._id,
      name: creatorOrg.name,
      plan: creatorOrg.plan,
    },
  };
}

export async function getPublicContext(
  ctx: QueryCtx
): Promise<{
  user: { _id: Id<"users">; email: string; defaultOrgId: Id<"organizations"> } | null;
  organization: {
    _id: Id<"organizations">;
    name: string;
    plan: "personal" | "business" | "enterprise";
    role: "owner" | "admin" | "member" | "viewer";
  } | null;
}> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    return { user: null, organization: null };
  }
  
  const userRecord = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email!))
    .first();
  
  if (!userRecord) {
    return { user: null, organization: null };
  }
  
  const user = {
    _id: userRecord._id,
    email: userRecord.email,
    defaultOrgId: userRecord.defaultOrgId,
  };
  
  const orgRecord = await ctx.db.get(userRecord.defaultOrgId);
  if (!orgRecord) {
    return { user, organization: null };
  }
  
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userRecord._id).eq("organizationId", orgRecord._id)
    )
    .first();
  
  if (!membership?.isActive) {
    return { user, organization: null };
  }
  
  const organization = {
    _id: orgRecord._id,
    name: orgRecord.name,
    plan: orgRecord.plan,
    role: membership.role,
  };
  
  return { user, organization };
}

export async function getCurrentContext(
  ctx: QueryCtx | MutationCtx,
  requestedOrgId?: Id<"organizations">
): Promise<{
  user: { _id: Id<"users">; email: string; defaultOrgId: Id<"organizations"> };
  organization: {
    _id: Id<"organizations">;
    name: string;
    plan: "personal" | "business" | "enterprise";
    role: "owner" | "admin" | "member" | "viewer";
  };
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email!))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  const orgId = requestedOrgId ?? user.defaultOrgId;
  const organization = await ctx.db.get(orgId);

  if (!organization) {
    throw new Error("Organization not found");
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", user._id).eq("organizationId", orgId)
    )
    .first();

  if (!membership || !membership.isActive) {
    throw new Error("Access denied: Not a member of this organization");
  }

  return {
    user: {
      _id: user._id,
      email: user.email,
      defaultOrgId: user.defaultOrgId,
    },
    organization: {
      _id: organization._id,
      name: organization.name,
      plan: organization.plan,
      role: membership.role,
    },
  };
}

export async function requireOrgMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgId: Id<"organizations">,
  minRole: "owner" | "admin" | "member" | "viewer"
): Promise<void> {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userId).eq("organizationId", orgId)
    )
    .first();

  if (!membership || !membership.isActive) {
    throw new Error("Access denied: Not a member of this organization");
  }

  const roleHierarchy = {
    viewer: 0,
    member: 1,
    admin: 2,
    owner: 3,
  };

  if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
    throw new Error(
      `Access denied: Requires ${minRole} role or higher (current: ${membership.role})`
    );
  }
}

export async function createAuditLog(
  ctx: MutationCtx,
  params: {
    organizationId: Id<"organizations">;
    userId: Id<"users">;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  }
): Promise<Id<"auditLogs">> {
  return await ctx.db.insert("auditLogs", {
    organizationId: params.organizationId,
    userId: params.userId,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: params.success,
    errorMessage: params.errorMessage,
    createdAt: Date.now(),
  });
}