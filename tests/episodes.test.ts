import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { setupTestOrgs } from "./helpers";

describe("Episode (Shared-Content) Data Isolation", () => {
  test("Only VC83 creators can create episodes", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const { userAId } = await setupTestOrgs(t);

    const asUserA = t.withIdentity({ subject: "usera@test.com", tokenIdentifier: `user|${userAId}`, email: "usera@test.com" });
    
    await expect(async () => {
      await asUserA.mutation(api.app_podcasting.createEpisode, {
        title: "Unauthorized Episode",
        description: "Should fail",
        audioUrl: "https://test.com/audio.mp3",
        episodeNumber: 1,
        publishDate: "2025-01-01",
      });
    }).rejects.toThrow("Only vc83-system creators can perform this action");
  });

  test("VC83 creators can create episodes", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const { vc83CreatorId } = await setupTestOrgs(t);

    const asCreator = t.withIdentity({ subject: "creator@vc83.com", tokenIdentifier: `user|${vc83CreatorId}`, email: "creator@vc83.com" });
    
    const episodeId = await asCreator.mutation(api.app_podcasting.createEpisode, {
      title: "Test Episode",
      description: "Test description",
      audioUrl: "https://test.com/audio.mp3",
      episodeNumber: 1,
      publishDate: "2025-01-01",
    });

    expect(episodeId).toBeDefined();
  });

  test("Guests can read published episodes", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const { vc83OrgId, vc83CreatorId } = await setupTestOrgs(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_podcasting", {
        organizationId: vc83OrgId,
        title: "Public Episode",
        slug: "public-episode",
        description: "Public test",
        audioUrl: "https://test.com/audio.mp3",
        episodeNumber: 1,
        publishDate: "2025-01-01",
        status: "published",
        viewCount: 0,
        createdBy: vc83CreatorId,
        createdAt: Date.now(),
        updatedBy: vc83CreatorId,
        updatedAt: Date.now(),
      });
    });

    // Test as guest (t without withIdentity has no identity)
    const episodes = await t.query(api.app_podcasting.getEpisodes, {});
    expect(episodes).toHaveLength(1);
    expect(episodes[0].title).toBe("Public Episode");
  });

  test("Guests cannot read draft episodes", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const { vc83OrgId, vc83CreatorId } = await setupTestOrgs(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_podcasting", {
        organizationId: vc83OrgId,
        title: "Draft Episode",
        slug: "draft-episode",
        description: "Draft test",
        audioUrl: "https://test.com/audio.mp3",
        episodeNumber: 1,
        publishDate: "2025-01-01",
        status: "draft",
        viewCount: 0,
        createdBy: vc83CreatorId,
        createdAt: Date.now(),
        updatedBy: vc83CreatorId,
        updatedAt: Date.now(),
      });
    });

    // Test as guest (t without withIdentity has no identity)
    const episodes = await t.query(api.app_podcasting.getEpisodes, {});
    expect(episodes).toHaveLength(0);
  });

  test("VC83 creators can read draft episodes", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const { vc83OrgId, vc83CreatorId } = await setupTestOrgs(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_podcasting", {
        organizationId: vc83OrgId,
        title: "Draft Episode",
        slug: "draft-episode",
        description: "Draft test",
        audioUrl: "https://test.com/audio.mp3",
        episodeNumber: 1,
        publishDate: "2025-01-01",
        status: "draft",
        viewCount: 0,
        createdBy: vc83CreatorId,
        createdAt: Date.now(),
        updatedBy: vc83CreatorId,
        updatedAt: Date.now(),
      });
    });

    const asCreator = t.withIdentity({ subject: "creator@vc83.com", tokenIdentifier: `user|${vc83CreatorId}`, email: "creator@vc83.com" });
    
    const episodes = await asCreator.query(api.app_podcasting.getEpisodes, {});
    expect(episodes).toHaveLength(1);
    expect(episodes[0].status).toBe("draft");
  });

  test("Non-VC83 users cannot read draft episodes", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const { vc83OrgId, vc83CreatorId, userAId } = await setupTestOrgs(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_podcasting", {
        organizationId: vc83OrgId,
        title: "Draft Episode",
        slug: "draft-episode",
        description: "Draft test",
        audioUrl: "https://test.com/audio.mp3",
        episodeNumber: 1,
        publishDate: "2025-01-01",
        status: "draft",
        viewCount: 0,
        createdBy: vc83CreatorId,
        createdAt: Date.now(),
        updatedBy: vc83CreatorId,
        updatedAt: Date.now(),
      });
    });

    const asUserA = t.withIdentity({ subject: "usera@test.com", tokenIdentifier: `user|${userAId}`, email: "usera@test.com" });
    
    const episodes = await asUserA.query(api.app_podcasting.getEpisodes, {});
    expect(episodes).toHaveLength(0);
  });

  test("Non-VC83 users cannot update episodes", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const { vc83OrgId, vc83CreatorId, userAId } = await setupTestOrgs(t);

    const episodeId = await t.run(async (ctx) => {
      return await ctx.db.insert("app_podcasting", {
        organizationId: vc83OrgId,
        title: "Original Title",
        slug: "original-title",
        description: "Original description",
        audioUrl: "https://test.com/audio.mp3",
        episodeNumber: 1,
        publishDate: "2025-01-01",
        status: "published",
        viewCount: 0,
        createdBy: vc83CreatorId,
        createdAt: Date.now(),
        updatedBy: vc83CreatorId,
        updatedAt: Date.now(),
      });
    });

    const asUserA = t.withIdentity({ subject: "usera@test.com", tokenIdentifier: `user|${userAId}`, email: "usera@test.com" });
    
    await expect(async () => {
      await asUserA.mutation(api.app_podcasting.updateEpisode, {
        episodeId,
        title: "Hacked Title",
      });
    }).rejects.toThrow("Only vc83-system creators can perform this action");
  });

  test("Non-VC83 users cannot delete episodes", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const { vc83OrgId, vc83CreatorId, userAId } = await setupTestOrgs(t);

    const episodeId = await t.run(async (ctx) => {
      return await ctx.db.insert("app_podcasting", {
        organizationId: vc83OrgId,
        title: "Episode to Delete",
        slug: "episode-to-delete",
        description: "Test",
        audioUrl: "https://test.com/audio.mp3",
        episodeNumber: 1,
        publishDate: "2025-01-01",
        status: "published",
        viewCount: 0,
        createdBy: vc83CreatorId,
        createdAt: Date.now(),
        updatedBy: vc83CreatorId,
        updatedAt: Date.now(),
      });
    });

    const asUserA = t.withIdentity({ subject: "usera@test.com", tokenIdentifier: `user|${userAId}`, email: "usera@test.com" });
    
    await expect(async () => {
      await asUserA.mutation(api.app_podcasting.deleteEpisode, {
        episodeId,
      });
    }).rejects.toThrow("Only vc83-system creators can perform this action");
  });

  test("Audit logs are created for episode mutations", async () => {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const { vc83OrgId, vc83CreatorId } = await setupTestOrgs(t);

    const asCreator = t.withIdentity({ subject: "creator@vc83.com", tokenIdentifier: `user|${vc83CreatorId}`, email: "creator@vc83.com" });
    
    await asCreator.mutation(api.app_podcasting.createEpisode, {
      title: "Audited Episode",
      description: "Should create audit log",
      audioUrl: "https://test.com/audio.mp3",
      episodeNumber: 1,
      publishDate: "2025-01-01",
    });

    const auditLogs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .filter((q) => 
          q.and(
            q.eq(q.field("organizationId"), vc83OrgId),
            q.eq(q.field("action"), "episode.create")
          )
        )
        .collect();
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].success).toBe(true);
    expect(auditLogs[0].resource).toBe("episode");
  });
});
