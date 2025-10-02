# Task 012: Auth Implementation Phase 3 - App Store Backend

**STATUS**: ❌ 10% COMPLETE - NOT YET IMPLEMENTED (as of 2025-10-02)

## Overview
This task implements the backend infrastructure for the app store system, where every app installation, content item, and feature is scoped to organizations. This phase builds the foundation for modular apps that can be installed/uninstalled per organization with proper access control.

**Parent Task**: 009_convex_auth_implementation.md
**Dependencies**: Task 010 (Phase 1 - Database Schema) ✅
**Estimated Time**: 3-4 days
**Priority**: 🔴 HIGH - Blocks core platform functionality

## Implementation Status

✅ **Schema Only**: `apps` and `appInstallations` tables exist
❌ **Everything Else**: No mutations, queries, or business logic
📝 **See**: [AUTH_STATUS_REVIEW.md](../../AUTH_STATUS_REVIEW.md) for detailed gap analysis

⚠️ **CRITICAL**: Without this, the app platform doesn't work. Users can't install apps, podcast episodes aren't scoped to orgs, and the core value proposition is missing.

## Success Criteria
- [ ] Apps can be installed/uninstalled per organization ❌
- [ ] All content is organization-scoped with no exceptions ❌
- [ ] Free vs. paid app access properly enforced ❌
- [ ] Apps can be hidden without being uninstalled ❌
- [ ] Public content still requires orgId but is marked visible ❌

**Note**: Auto-install logic exists in `createOrganization`, but no other app functionality is implemented.

## Phase 3 Breakdown

### 3.1 App Registry Setup (3-4 hours)
**File**: `convex/apps.ts`

- [ ] Create core app definitions:
  ```typescript
  export const DEFAULT_APPS = [
    {
      appId: "podcast",
      name: "VC83 Podcast",
      description: "Access podcast episodes and show notes",
      icon: "📻",
      defaultPlan: "free" as const,
      category: "content",
    },
    {
      appId: "events",
      name: "Events Platform", 
      description: "Create and manage startup events",
      icon: "📅",
      defaultPlan: "pro" as const,
      category: "tools",
    },
    {
      appId: "ideation",
      name: "Ideation Board",
      description: "Kanban board for startup ideas",
      icon: "💡",
      defaultPlan: "free" as const,
      category: "productivity",
    },
    {
      appId: "founder-matching",
      name: "Founder Matching",
      description: "Find co-founders and team members",
      icon: "🤝",
      defaultPlan: "pro" as const,
      category: "networking",
    },
    {
      appId: "discord",
      name: "Community Chat",
      description: "Discord integration for your org",
      icon: "💬",
      defaultPlan: "free" as const,
      category: "communication",
    }
  ];
  ```

- [ ] Seed apps table on first run:
  ```typescript
  export const seedApps = internalMutation({
    handler: async (ctx) => {
      const existingApps = await ctx.db.query("apps").collect();
      
      if (existingApps.length === 0) {
        for (const app of DEFAULT_APPS) {
          await ctx.db.insert("apps", app);
        }
      }
    },
  });
  ```

- [ ] Create app query functions:
  - `getAvailableApps` - List all apps
  - `getAppById` - Single app details
  - `getAppsByCategory` - Filter by category

### 3.2 App Installation System (4-5 hours)
**File**: `convex/appAccess.ts`

- [ ] Implement installation mutations:
  ```typescript
  export const installApp = mutation({
    args: {
      appId: v.string(),
    },
    handler: async (ctx, { appId }) => {
      const { user, organization } = await getCurrentContext(ctx);
      
      // Check if already installed
      const existing = await ctx.db
        .query("app_access")
        .withIndex("by_org_app", q => 
          q.eq("orgId", organization._id).eq("appId", appId)
        )
        .first();
        
      if (existing) {
        throw new Error("App already installed");
      }
      
      // Check plan requirements
      const app = await ctx.db
        .query("apps")
        .withIndex("by_appId", q => q.eq("appId", appId))
        .first();
        
      if (app.defaultPlan === "pro" && organization.plan === "free") {
        throw new Error("Upgrade to Pro to install this app");
      }
      
      // Install app
      await ctx.db.insert("app_access", {
        orgId: organization._id,
        appId,
        enabled: true,
        hidden: false,
        planRequired: app.defaultPlan,
      });
    },
  });
  ```

- [ ] Implement uninstall mutation:
  - Set `enabled: false`
  - Optionally archive content
  - Log uninstall action

- [ ] Create app visibility toggles:
  ```typescript
  export const toggleAppVisibility = mutation({
    args: {
      appId: v.string(),
      hidden: v.boolean(),
    },
    handler: async (ctx, { appId, hidden }) => {
      const { organization } = await getCurrentContext(ctx);
      
      const access = await ctx.db
        .query("app_access")
        .withIndex("by_org_app", q => 
          q.eq("orgId", organization._id).eq("appId", appId)
        )
        .first();
        
      if (!access) {
        throw new Error("App not installed");
      }
      
      await ctx.db.patch(access._id, { hidden });
    },
  });
  ```

### 3.3 Organization App Queries (3-4 hours)
**File**: `convex/appQueries.ts`

- [ ] Get installed apps for organization:
  ```typescript
  export const getInstalledApps = query({
    handler: async (ctx) => {
      const { organization } = await getCurrentContext(ctx);
      
      const installed = await ctx.db
        .query("app_access")
        .withIndex("by_org_app", q => q.eq("orgId", organization._id))
        .filter(q => q.eq(q.field("enabled"), true))
        .collect();
        
      // Join with app details
      const apps = await Promise.all(
        installed.map(async (access) => {
          const app = await ctx.db
            .query("apps")
            .withIndex("by_appId", q => q.eq("appId", access.appId))
            .first();
            
          return {
            ...app,
            access,
          };
        })
      );
      
      return apps;
    },
  });
  ```

- [ ] Get available apps (not installed):
  ```typescript
  export const getAvailableAppsForOrg = query({
    handler: async (ctx) => {
      const { organization } = await getCurrentContext(ctx);
      const allApps = await ctx.db.query("apps").collect();
      const installed = await getInstalledApps(ctx);
      
      const installedIds = new Set(installed.map(app => app.appId));
      
      return allApps.filter(app => !installedIds.has(app.appId));
    },
  });
  ```

- [ ] Check app access for specific app:
  ```typescript
  export const hasAppAccess = query({
    args: { appId: v.string() },
    handler: async (ctx, { appId }) => {
      const { organization } = await getCurrentContext(ctx);
      
      const access = await ctx.db
        .query("app_access")
        .withIndex("by_org_app", q => 
          q.eq("orgId", organization._id).eq("appId", appId)
        )
        .first();
        
      return access?.enabled && !access?.hidden;
    },
  });
  ```

### 3.4 Content Management System (4-5 hours)
**File**: `convex/contents.ts`

- [ ] Create content with org scope:
  ```typescript
  export const createContent = mutation({
    args: {
      appId: v.string(),
      title: v.string(),
      data: v.any(),
      visibility: v.union(
        v.literal("public"),
        v.literal("org_only"),
        v.literal("hidden")
      ),
    },
    handler: async (ctx, args) => {
      const { organization } = await getCurrentContext(ctx);
      
      // Verify app access
      const hasAccess = await hasAppAccess(ctx, { appId: args.appId });
      if (!hasAccess) {
        throw new Error("No access to this app");
      }
      
      await ctx.db.insert("contents", {
        ...args,
        orgId: organization._id, // ALWAYS required
      });
    },
  });
  ```

- [ ] Query content by app and visibility:
  ```typescript
  export const getContentForApp = query({
    args: {
      appId: v.string(),
      includePublic: v.optional(v.boolean()),
    },
    handler: async (ctx, { appId, includePublic = false }) => {
      const { organization } = await getCurrentContext(ctx);
      
      // Get org's content
      let content = await ctx.db
        .query("contents")
        .withIndex("by_org_app", q => 
          q.eq("orgId", organization._id).eq("appId", appId)
        )
        .filter(q => q.neq(q.field("visibility"), "hidden"))
        .collect();
        
      // Optionally include public content from other orgs
      if (includePublic) {
        const publicContent = await ctx.db
          .query("contents")
          .withIndex("by_visibility", q => 
            q.eq("visibility", "public").eq("appId", appId)
          )
          .collect();
          
        content = [...content, ...publicContent];
      }
      
      return content;
    },
  });
  ```

- [ ] Update content visibility:
  ```typescript
  export const updateContentVisibility = mutation({
    args: {
      contentId: v.id("contents"),
      visibility: v.union(
        v.literal("public"),
        v.literal("org_only"), 
        v.literal("hidden")
      ),
    },
    handler: async (ctx, { contentId, visibility }) => {
      const { organization } = await getCurrentContext(ctx);
      
      const content = await ctx.db.get(contentId);
      if (!content || content.orgId !== organization._id) {
        throw new Error("Content not found or access denied");
      }
      
      await ctx.db.patch(contentId, { visibility });
    },
  });
  ```

### 3.5 Podcast Module Implementation (3-4 hours)
**File**: `convex/modules/podcast.ts`

- [ ] Create podcast-specific functions:
  ```typescript
  export const createEpisode = mutation({
    args: {
      title: v.string(),
      description: v.string(),
      embedUrl: v.string(),
      episodeNumber: v.number(),
      publishDate: v.string(),
      visibility: v.union(
        v.literal("public"),
        v.literal("org_only"),
        v.literal("hidden")
      ),
    },
    handler: async (ctx, args) => {
      const { organization } = await getCurrentContext(ctx);
      
      await createContent(ctx, {
        appId: "podcast",
        title: args.title,
        data: {
          description: args.description,
          embedUrl: args.embedUrl,
          episodeNumber: args.episodeNumber,
          publishDate: args.publishDate,
        },
        visibility: args.visibility,
      });
    },
  });
  ```

- [ ] Get episodes for public landing:
  ```typescript
  export const getPublicEpisodes = query({
    handler: async (ctx) => {
      // No auth required for public view
      const episodes = await ctx.db
        .query("contents")
        .withIndex("by_visibility", q => 
          q.eq("visibility", "public").eq("appId", "podcast")
        )
        .order("desc")
        .take(20)
        .collect();
        
      return episodes.map(ep => ({
        title: ep.title,
        ...ep.data,
        orgName: "VC83", // Could join with org data
      }));
    },
  });
  ```

- [ ] Get episodes for authenticated org:
  ```typescript
  export const getOrgEpisodes = query({
    handler: async (ctx) => {
      const { organization } = await getCurrentContext(ctx);
      
      // Check if podcast app is installed
      const hasAccess = await hasAppAccess(ctx, { appId: "podcast" });
      if (!hasAccess) {
        return [];
      }
      
      return getContentForApp(ctx, { 
        appId: "podcast",
        includePublic: true 
      });
    },
  });
  ```

### 3.6 Default App Installation (2-3 hours)
**File**: `convex/organizations.ts` (update)

- [ ] Auto-install free apps for new orgs:
  ```typescript
  export const createOrganization = mutation({
    args: { ...orgArgs },
    handler: async (ctx, args) => {
      // Create org (existing code)
      const orgId = await ctx.db.insert("organizations", args);
      
      // Auto-install free apps
      const freeApps = await ctx.db
        .query("apps")
        .filter(q => q.eq(q.field("defaultPlan"), "free"))
        .collect();
        
      for (const app of freeApps) {
        await ctx.db.insert("app_access", {
          orgId,
          appId: app.appId,
          enabled: true,
          hidden: false,
          planRequired: "free",
        });
      }
      
      return orgId;
    },
  });
  ```

- [ ] Add default content for new orgs:
  ```typescript
  // Welcome content for each app
  const DEFAULT_CONTENT = {
    podcast: {
      title: "Welcome to VC83 Podcast",
      data: { 
        description: "Get started with the podcast module",
        embedUrl: "https://spotify.com/embed/welcome",
      },
      visibility: "org_only" as const,
    },
    ideation: {
      title: "Your First Idea",
      data: { 
        status: "new",
        description: "Click to add your startup ideas",
      },
      visibility: "org_only" as const,
    },
  };
  ```

### 3.7 Admin App Management (3-4 hours)
**File**: `convex/admin/appAdmin.ts`

- [ ] Create superadmin functions:
  ```typescript
  export const createApp = adminMutation({
    args: {
      appId: v.string(),
      name: v.string(),
      description: v.string(),
      icon: v.string(),
      defaultPlan: v.union(v.literal("free"), v.literal("pro")),
      category: v.string(),
    },
    handler: async (ctx, args) => {
      // Verify admin access
      await requireAdmin(ctx);
      
      await ctx.db.insert("apps", args);
    },
  });
  ```

- [ ] Manage app availability:
  ```typescript
  export const toggleAppAvailability = adminMutation({
    args: {
      appId: v.string(),
      available: v.boolean(),
    },
    handler: async (ctx, { appId, available }) => {
      await requireAdmin(ctx);
      
      const app = await ctx.db
        .query("apps")
        .withIndex("by_appId", q => q.eq("appId", appId))
        .first();
        
      if (!app) throw new Error("App not found");
      
      await ctx.db.patch(app._id, { available });
    },
  });
  ```

- [ ] View app installation stats:
  ```typescript
  export const getAppStats = adminQuery({
    handler: async (ctx) => {
      await requireAdmin(ctx);
      
      const apps = await ctx.db.query("apps").collect();
      
      const stats = await Promise.all(
        apps.map(async (app) => {
          const installations = await ctx.db
            .query("app_access")
            .withIndex("by_org_app")
            .filter(q => 
              q.and(
                q.eq(q.field("appId"), app.appId),
                q.eq(q.field("enabled"), true)
              )
            )
            .collect();
            
          return {
            app,
            installCount: installations.length,
            activeCount: installations.filter(i => !i.hidden).length,
          };
        })
      );
      
      return stats;
    },
  });
  ```

### 3.8 App Permission System (2-3 hours)
**File**: `convex/permissions/appPermissions.ts`

- [ ] Create permission helpers:
  ```typescript
  export const requireAppAccess = async (
    ctx: QueryCtx | MutationCtx,
    appId: string
  ) => {
    const { organization } = await getCurrentContext(ctx);
    
    const access = await ctx.db
      .query("app_access")
      .withIndex("by_org_app", q => 
        q.eq("orgId", organization._id).eq("appId", appId)
      )
      .first();
      
    if (!access?.enabled || access?.hidden) {
      throw new Error(`No access to app: ${appId}`);
    }
    
    return access;
  };
  ```

- [ ] Create content permission checks:
  ```typescript
  export const canModifyContent = async (
    ctx: QueryCtx | MutationCtx,
    contentId: Id<"contents">
  ) => {
    const { organization, user } = await getCurrentContext(ctx);
    const content = await ctx.db.get(contentId);
    
    if (!content) return false;
    
    // Must own the content
    if (content.orgId !== organization._id) return false;
    
    // Check member role
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", q => 
        q.eq("userId", user._id).eq("orgId", organization._id)
      )
      .first();
      
    return membership?.role === "owner" || membership?.role === "admin";
  };
  ```

### 3.9 App Store Initialization (2-3 hours)
**File**: `convex/init.ts`

- [ ] Create initialization script:
  ```typescript
  export const initializeAppStore = internalAction({
    handler: async (ctx) => {
      // Seed apps if needed
      await seedApps(ctx);
      
      // Create system organization for public content
      const systemOrg = await ctx.runQuery(internal.organizations.getSystemOrg);
      
      if (!systemOrg) {
        await ctx.runMutation(internal.organizations.createSystemOrg, {
          name: "VC83 System",
          legalName: "VC83 Platform",
          isPersonal: false,
          plan: "pro",
          // ... other required fields
        });
      }
      
      console.log("App store initialized");
    },
  });
  ```

- [ ] Run on deployment:
  ```typescript
  // In convex/crons.ts
  const appStoreInit = cronJobs.interval(
    "app store init",
    { hours: 24 }, // Run daily
    internal.init.initializeAppStore
  );
  ```

### 3.10 Testing App Store Logic (3-4 hours)
**File**: `convex/tests/appStore.test.ts`

- [ ] Test installation flows:
  ```typescript
  test("install free app", async () => {
    const { user, org } = await createTestUserAndOrg();
    
    await installApp({ appId: "podcast" });
    
    const installed = await getInstalledApps();
    expect(installed).toContainEqual(
      expect.objectContaining({ appId: "podcast" })
    );
  });
  
  test("cannot install pro app with free plan", async () => {
    const { user, org } = await createTestUserAndOrg({ plan: "free" });
    
    await expect(
      installApp({ appId: "events" })
    ).rejects.toThrow("Upgrade to Pro");
  });
  ```

- [ ] Test content scoping:
  ```typescript
  test("content isolation between orgs", async () => {
    const { org1 } = await createTestOrg();
    const { org2 } = await createTestOrg();
    
    // Create content in org1
    await createContent({
      appId: "podcast",
      title: "Org1 Episode",
      visibility: "org_only"
    });
    
    // Try to access from org2
    switchToOrg(org2);
    const content = await getContentForApp({ appId: "podcast" });
    
    expect(content).not.toContainEqual(
      expect.objectContaining({ title: "Org1 Episode" })
    );
  });
  ```

## App Store Architecture

### Key Principles
1. **Every app installation is per-organization**
2. **All content has an orgId - no exceptions**
3. **Public content still belongs to an organization**
4. **Apps can be hidden without losing data**
5. **Plan validation happens at install time**

### Data Flow
```
User → Organization → App Access → Content
         ↓               ↓            ↓
      (owns)         (scoped)    (filtered)
```

### Security Model
- Apps require explicit installation per org
- Content queries always filter by orgId
- Public content is opt-in via visibility
- Admin functions have separate permission

## Next Phase Preview
**Task 013**: Organization Management UI
- Organization dashboard
- Member management interface
- App installation UI
- Settings and upgrades

---

**Remember**: The app store is the core value proposition. Every feature must be organization-scoped, and the backend must enforce this strictly. No shortcuts or "temporary" global access.