import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const initializeAppStore = internalMutation({
  handler: async (ctx) => {
    const existingApps = await ctx.db.query("apps").collect();

    if (existingApps.length === 0) {
      console.log("Seeding default apps...");
      await ctx.runMutation(internal.apps.seedApps);
      console.log("App store initialized successfully");
    } else {
      console.log(`App store already initialized (${existingApps.length} apps found)`);
    }

    return { success: true, appsCount: existingApps.length };
  },
});

export const seedAll = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Starting full database seed...");

    // 1. Create SuperAdmin organization (platform admin)
    console.log("👑 Creating SuperAdmin organization...");
    let superAdminOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "superadmin"))
      .first();

    if (!superAdminOrg) {
      const superAdminOrgId = await ctx.db.insert("organizations", {
        name: "SuperAdmin",
        slug: "superadmin",
        businessName: "Platform Administration",
        plan: "enterprise",
        isPersonalWorkspace: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      superAdminOrg = await ctx.db.get(superAdminOrgId);
      console.log(`✅ SuperAdmin org created: ${superAdminOrg!._id}`);
    } else {
      console.log(`✅ SuperAdmin org exists: ${superAdminOrg._id}`);
    }

    // 2. Create VC83 organization (content creator)
    console.log("🎙️ Creating VC83 organization...");
    let vc83Org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "vc83"))
      .first();

    if (!vc83Org) {
      const vc83OrgId = await ctx.db.insert("organizations", {
        name: "VC83",
        slug: "vc83",
        businessName: "VC83 Podcast Network",
        plan: "business",
        isPersonalWorkspace: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      vc83Org = await ctx.db.get(vc83OrgId);
      console.log(`✅ VC83 org created: ${vc83Org!._id}`);
    } else {
      console.log(`✅ VC83 org exists: ${vc83Org._id}`);
    }

    // 3. Seed apps with VC83 as creator
    console.log("📦 Seeding apps...");
    await ctx.runMutation(internal.apps.seedApps);

    // 4. Create system users for both organizations
    const systemUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("defaultOrgId"), vc83Org!._id))
      .collect();

    // Create SuperAdmin user
    let superAdminUserId;
    const superAdminUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("defaultOrgId"), superAdminOrg!._id))
      .collect();

    if (superAdminUsers.length === 0) {
      console.log("👤 Creating SuperAdmin user...");
      superAdminUserId = await ctx.db.insert("users", {
        firstName: "Super",
        lastName: "Admin",
        email: "admin@vc83.com",
        defaultOrgId: superAdminOrg!._id,
        emailVerified: true,
        emailVerifiedAt: Date.now(),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("organizationMembers", {
        userId: superAdminUserId,
        organizationId: superAdminOrg!._id,
        role: "owner",
        isActive: true,
        joinedAt: Date.now(),
      });

      console.log(`✅ SuperAdmin user created: ${superAdminUserId}`);
    } else {
      superAdminUserId = superAdminUsers[0]._id;
      console.log(`✅ SuperAdmin user exists: ${superAdminUserId}`);
    }

    // Create VC83 user
    let vc83UserId;
    if (systemUsers.length === 0) {
      console.log("👤 Creating VC83 user...");
      vc83UserId = await ctx.db.insert("users", {
        firstName: "VC83",
        lastName: "Podcast",
        email: "podcast@vc83.com",
        defaultOrgId: vc83Org!._id,
        emailVerified: true,
        emailVerifiedAt: Date.now(),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("organizationMembers", {
        userId: vc83UserId,
        organizationId: vc83Org!._id,
        role: "owner",
        isActive: true,
        joinedAt: Date.now(),
      });

      console.log(`✅ VC83 user created: ${vc83UserId}`);
    } else {
      vc83UserId = systemUsers[0]._id;
      console.log(`✅ VC83 user exists: ${vc83UserId}`);
    }

    // 5. Seed sample podcast episodes
    const existingEpisodes = await ctx.db
      .query("app_podcasting")
      .withIndex("by_org", (q) => q.eq("organizationId", vc83Org!._id))
      .collect();

    if (existingEpisodes.length === 0) {
      console.log("🎙️ Seeding sample VC83 podcast episodes...");

      const sampleEpisodes = [
        {
          title: "Legal Landmines Every Startup Can Dodge",
          description:
            "My zero-knowledge sprint through startup legal pitfalls—cap tables, contracts, MV fixes.",
          episodeNumber: 1,
          season: 1,
          duration: 2847, // 47:27
          publishDate: "2025-10-15",
          audioUrl: "https://example.com/episodes/ep1.mp3",
          showNotes:
            "In this episode, we dive deep into the legal challenges startups face.",
        },
        {
          title: "Biotech Boom in the Baltic",
          description:
            "Why Mecklenburg-Vorpommern is becoming Germany's unexpected biotech hub.",
          episodeNumber: 2,
          season: 1,
          duration: 3120, // 52:00
          publishDate: "2025-11-01",
          audioUrl: "https://example.com/episodes/ep2.mp3",
          showNotes:
            "Exploring the biotech revolution happening in Eastern Germany.",
        },
        {
          title: "From Rostock to Unicorn",
          description:
            "Tracking the journey of MV's most promising SaaS startups and their funding rounds.",
          episodeNumber: 3,
          season: 1,
          duration: 2940, // 49:00
          publishDate: "2025-12-01",
          audioUrl: "https://example.com/episodes/ep3.mp3",
          showNotes:
            "The story of how local startups are achieving unicorn status.",
        },
      ];

      for (const episode of sampleEpisodes) {
        const slug = episode.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        await ctx.db.insert("app_podcasting", {
          organizationId: vc83Org!._id,
          title: episode.title,
          slug,
          description: episode.description,
          audioUrl: episode.audioUrl,
          episodeNumber: episode.episodeNumber,
          season: episode.season,
          duration: episode.duration,
          publishDate: episode.publishDate,
          showNotes: episode.showNotes,
          status: "published",
          viewCount: 0,
          createdBy: vc83UserId,
          createdAt: Date.now(),
          updatedBy: vc83UserId,
          updatedAt: Date.now(),
        });
      }

      console.log(`✅ ${sampleEpisodes.length} sample episodes created`);
    } else {
      console.log(`✅ Episodes already seeded (${existingEpisodes.length} found)`);
    }

    // 6. Summary
    const apps = await ctx.db.query("apps").collect();
    const episodes = await ctx.db.query("app_podcasting").collect();
    const orgs = await ctx.db.query("organizations").collect();

    console.log("\n🎉 Seed complete!");
    console.log(`   👑 SuperAdmin Org: ${superAdminOrg!._id}`);
    console.log(`   🎙️  VC83 Org: ${vc83Org!._id}`);
    console.log(`   📱 Apps: ${apps.length}`);
    console.log(`   📻 Episodes: ${episodes.length}`);

    return {
      success: true,
      organizations: [
        { name: "SuperAdmin", id: superAdminOrg!._id },
        { name: "VC83", id: vc83Org!._id },
      ],
      apps: apps.length,
      episodes: episodes.length,
    };
  },
});