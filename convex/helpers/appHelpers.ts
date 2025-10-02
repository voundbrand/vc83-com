import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export interface AppContext {
  app: Doc<"apps">;
  user: Doc<"users">;
  creatorOrg: Doc<"organizations">;
  membership: Doc<"organizationMembers">;
}

export interface PublicAppContext {
  app: Doc<"apps">;
  user: Doc<"users"> | null;
  organization: Doc<"organizations"> | null;
}

export function createAppHelpers(appCode: string) {
  async function getApp(ctx: QueryCtx | MutationCtx): Promise<Doc<"apps">> {
    const app = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", appCode))
      .first();

    if (!app) {
      throw new Error(`App "${appCode}" not found in registry. Make sure to run init:seedApps.`);
    }

    return app;
  }

  async function getAppContext(ctx: MutationCtx): Promise<AppContext> {
    const app = await getApp(ctx);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required. User must be logged in.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found. Make sure user is registered in the platform.");
    }

    const creatorOrg = await ctx.db.get(app.creatorOrgId);
    if (!creatorOrg) {
      throw new Error(`Creator organization not found. App may be misconfigured.`);
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", creatorOrg._id)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error(
        `Access denied. Only members of "${creatorOrg.name}" can perform this action.`
      );
    }

    return { app, user, creatorOrg, membership };
  }

  async function getPublicAppContext(
    ctx: QueryCtx | MutationCtx
  ): Promise<PublicAppContext> {
    const app = await getApp(ctx);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { app, user: null, organization: null };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return { app, user: null, organization: null };
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!membership) {
      return { app, user, organization: null };
    }

    const organization = await ctx.db.get(membership.organizationId);

    return { app, user, organization: organization || null };
  }

  async function requireCreatorAccess(
    ctx: MutationCtx,
    resourceOrgId: Id<"organizations">
  ): Promise<AppContext> {
    const appContext = await getAppContext(ctx);

    if (resourceOrgId !== appContext.creatorOrg._id) {
      throw new Error("Access denied. This resource belongs to a different organization.");
    }

    return appContext;
  }

  return {
    getApp,
    getAppContext,
    getPublicAppContext,
    requireCreatorAccess,
  };
}

export async function getAuthenticatedUserContext(ctx: MutationCtx | QueryCtx): Promise<{
  user: Doc<"users">;
  organization: Doc<"organizations">;
  membership: Doc<"organizationMembers">;
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

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!membership) {
    throw new Error("No active organization membership found");
  }

  const organization = await ctx.db.get(membership.organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  return { user, organization, membership };
}
