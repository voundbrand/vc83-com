import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import type { MutationCtx } from "../../../convex/_generated/server";
import {
  attachCmsRequestLinkageRecord,
  attachCmsRequestChangeManifestRecord,
  createCmsRequestRecord,
  transitionCmsRequestRecord,
  updateCmsRequestApprovalRecord,
} from "../../../convex/cmsAgentRequestLifecycle";

type GenericDoc = Record<string, unknown> & { _id: string; _creationTime: number };

class FakeDb {
  private counters = new Map<string, number>();
  private tables = new Map<string, GenericDoc[]>();
  public queriedIndexes: string[] = [];

  constructor(seedObjects: GenericDoc[] = []) {
    this.tables.set("objects", [...seedObjects]);
    this.tables.set("objectActions", []);
  }

  query(table: string) {
    const rows = this.tables.get(table) || [];
    return {
      withIndex: (
        indexName: string,
        configure: (q: { eq: (field: string, value: unknown) => unknown }) => unknown
      ) => {
        this.queriedIndexes.push(indexName);
        const filters: Record<string, unknown> = {};
        const q = {
          eq: (field: string, value: unknown) => {
            filters[field] = value;
            return q;
          },
        };
        configure(q);
        const filtered = rows.filter((doc) =>
          Object.entries(filters).every(([field, value]) => doc[field] === value)
        );
        return {
          collect: async () => filtered,
          first: async () => filtered[0] ?? null,
        };
      },
    };
  }

  async get(id: string) {
    for (const rows of this.tables.values()) {
      const found = rows.find((doc) => doc._id === id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  async insert(table: string, value: Record<string, unknown>) {
    const rows = this.tables.get(table) || [];
    this.tables.set(table, rows);
    const next = (this.counters.get(table) || 0) + 1;
    this.counters.set(table, next);
    const id = `${table}_${next}`;
    rows.push({
      _id: id,
      _creationTime: Date.now(),
      ...value,
    });
    return id as any;
  }

  async patch(id: string, patch: Record<string, unknown>) {
    const record = await this.get(id);
    if (!record) {
      throw new Error(`Record not found: ${id}`);
    }
    const currentCustomProperties =
      (record.customProperties as Record<string, unknown> | undefined) || {};
    const patchCustomProperties =
      (patch.customProperties as Record<string, unknown> | undefined) || {};
    Object.assign(record, patch, {
      customProperties: {
        ...currentCustomProperties,
        ...patchCustomProperties,
      },
    });
  }

  getObjectsByType(type: string): GenericDoc[] {
    return (this.tables.get("objects") || []).filter((doc) => doc.type === type);
  }
}

function buildCtx(db: FakeDb): MutationCtx {
  return { db } as unknown as MutationCtx;
}

const ORG_ID = "organizations_1" as Id<"organizations">;
const USER_ID = "users_1" as Id<"users">;

describe("cms agent request lifecycle mutations", () => {
  it("uses indexed idempotency marker lookup and replays with same payload", async () => {
    const db = new FakeDb();
    const ctx = buildCtx(db);

    const first = await createCmsRequestRecord({
      ctx,
      organizationId: ORG_ID,
      actorUserId: USER_ID,
      source: "internal",
      target: { targetSite: "site-a" },
      intentPayload: { op: "copy", path: "hero.title", value: "A" },
      riskTier: "low",
      idempotencyKey: "cms-req-1",
      lineage: { targetAppPath: "apps/site-a" },
    });

    const replay = await createCmsRequestRecord({
      ctx,
      organizationId: ORG_ID,
      actorUserId: USER_ID,
      source: "internal",
      target: { targetSite: "site-a" },
      intentPayload: { op: "copy", path: "hero.title", value: "A" },
      riskTier: "low",
      idempotencyKey: "cms-req-1",
      lineage: { targetAppPath: "apps/site-a" },
    });

    expect(first.idempotentReplay).toBe(false);
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.requestId).toBe(first.requestId);
    expect(db.getObjectsByType("cms_request")).toHaveLength(1);
    expect(db.getObjectsByType("cms_request_idempotency")).toHaveLength(1);
    expect(db.queriedIndexes.includes("by_org_type_name")).toBe(true);
    expect(db.queriedIndexes.includes("by_org_type")).toBe(false);
  });

  it("rejects idempotent replay when payload changes", async () => {
    const db = new FakeDb();
    const ctx = buildCtx(db);

    await createCmsRequestRecord({
      ctx,
      organizationId: ORG_ID,
      actorUserId: USER_ID,
      source: "internal",
      target: { targetSite: "site-a" },
      intentPayload: { op: "copy", path: "hero.title", value: "A" },
      riskTier: "low",
      idempotencyKey: "cms-req-2",
      lineage: { targetAppPath: "apps/site-a" },
    });

    await expect(
      createCmsRequestRecord({
        ctx,
        organizationId: ORG_ID,
        actorUserId: USER_ID,
        source: "internal",
        target: { targetSite: "site-a" },
        intentPayload: { op: "copy", path: "hero.title", value: "B" },
        riskTier: "low",
        idempotencyKey: "cms-req-2",
        lineage: { targetAppPath: "apps/site-a" },
      })
    ).rejects.toThrow(/already used with different CMS request payload/);
  });

  it("fails closed for invalid lifecycle transition", async () => {
    const db = new FakeDb();
    const ctx = buildCtx(db);
    const created = await createCmsRequestRecord({
      ctx,
      organizationId: ORG_ID,
      actorUserId: USER_ID,
      source: "public",
      target: { targetSite: "site-a" },
      intentPayload: { op: "copy" },
      riskTier: "low",
      idempotencyKey: "cms-req-3",
      lineage: { targetAppPath: "apps/site-a" },
    });

    await expect(
      transitionCmsRequestRecord({
        ctx,
        requestId: created.requestId,
        actorUserId: USER_ID,
        toStatus: "merged",
        source: "public",
        canPublishTerminalTransition: true,
      })
    ).rejects.toThrow(/Invalid CMS request status transition/);
  });

  it("denies terminal transition when publish authority is missing", async () => {
    const db = new FakeDb();
    const ctx = buildCtx(db);
    const created = await createCmsRequestRecord({
      ctx,
      organizationId: ORG_ID,
      actorUserId: USER_ID,
      source: "public",
      target: { targetSite: "site-a" },
      intentPayload: { op: "copy" },
      riskTier: "low",
      idempotencyKey: "cms-req-4",
      lineage: { targetAppPath: "apps/site-a" },
    });

    await transitionCmsRequestRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      toStatus: "planning",
      source: "public",
      canPublishTerminalTransition: false,
    });
    await transitionCmsRequestRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      toStatus: "awaiting_approval",
      source: "public",
      canPublishTerminalTransition: false,
    });
    await transitionCmsRequestRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      toStatus: "applying",
      source: "public",
      canPublishTerminalTransition: false,
    });

    await expect(
      transitionCmsRequestRecord({
        ctx,
        requestId: created.requestId,
        actorUserId: USER_ID,
        toStatus: "merged",
        source: "public",
        canPublishTerminalTransition: false,
      })
    ).rejects.toThrow(/publish_pages required/);
  });

  it("requires approval state to be approved before merged transition", async () => {
    const db = new FakeDb();
    const ctx = buildCtx(db);
    const created = await createCmsRequestRecord({
      ctx,
      organizationId: ORG_ID,
      actorUserId: USER_ID,
      source: "internal",
      target: { targetSite: "site-a" },
      intentPayload: { op: "copy" },
      riskTier: "high",
      idempotencyKey: "cms-req-5",
      lineage: { targetAppPath: "apps/site-a" },
    });

    await transitionCmsRequestRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      toStatus: "planning",
      source: "internal",
      canPublishTerminalTransition: true,
    });
    await transitionCmsRequestRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      toStatus: "awaiting_approval",
      source: "internal",
      canPublishTerminalTransition: true,
    });
    await transitionCmsRequestRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      toStatus: "applying",
      source: "internal",
      canPublishTerminalTransition: true,
    });

    await expect(
      transitionCmsRequestRecord({
        ctx,
        requestId: created.requestId,
        actorUserId: USER_ID,
        toStatus: "merged",
        source: "internal",
        canPublishTerminalTransition: true,
      })
    ).rejects.toThrow(/without approved approval state/);

    await updateCmsRequestApprovalRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      source: "internal",
      status: "approved",
      reason: "approved in test",
    });

    const merged = await transitionCmsRequestRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      toStatus: "merged",
      source: "internal",
      canPublishTerminalTransition: true,
    });

    expect(merged.status).toBe("merged");
  });

  it("persists deterministic change manifest on cms_request objects", async () => {
    const db = new FakeDb();
    const ctx = buildCtx(db);
    const created = await createCmsRequestRecord({
      ctx,
      organizationId: ORG_ID,
      actorUserId: USER_ID,
      source: "internal",
      target: { targetSite: "site-a" },
      intentPayload: { op: "copy" },
      riskTier: "low",
      idempotencyKey: "cms-req-6",
      lineage: { targetAppPath: "apps/site-a" },
    });

    const result = await attachCmsRequestChangeManifestRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      source: "internal",
      changeManifest: {
        contractVersion: "cms_content_change_manifest.v1",
        targetAppPath: "apps/site-a",
        operationClass: "content_copy",
        riskTier: "low",
        touchedFiles: ["apps/site-a/content/home.en.json"],
        requiredVerifyProfiles: ["V-TYPE", "V-UNIT"],
        patches: [
          {
            filePath: "apps/site-a/content/home.en.json",
            operations: [
              {
                op: "replace",
                path: "/headline",
                value: "Updated",
              },
            ],
          },
        ],
        diffUx: {
          canonicalKeyOrderingApplied: true,
          keyReorderingIsCosmetic: true,
          semanticChanges: [
            {
              filePath: "apps/site-a/content/home.en.json",
              path: "/headline",
              op: "replace",
              before: "Old",
              after: "Updated",
            },
          ],
          semanticChangeCount: 1,
        },
      },
    });

    expect(result.changeManifest.touchedFiles).toEqual([
      "apps/site-a/content/home.en.json",
    ]);

    const request = await db.get(created.requestId);
    expect(request?.customProperties?.changeManifest).toBeTruthy();
    expect(
      (request?.customProperties?.changeManifest as Record<string, unknown>).operationClass
    ).toBe("content_copy");
  });

  it("persists and merges PR linkage fields on cms_request objects", async () => {
    const db = new FakeDb();
    const ctx = buildCtx(db);
    const created = await createCmsRequestRecord({
      ctx,
      organizationId: ORG_ID,
      actorUserId: USER_ID,
      source: "internal",
      target: { targetSite: "site-a" },
      intentPayload: { op: "copy" },
      riskTier: "low",
      idempotencyKey: "cms-req-7",
      lineage: { targetAppPath: "apps/site-a" },
    });

    const firstLinkage = await attachCmsRequestLinkageRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      source: "internal",
      linkage: {
        prNumber: 42,
        prUrl: "https://github.com/org/repo/pull/42",
      },
    });
    expect(firstLinkage.linkage.prNumber).toBe(42);
    expect(firstLinkage.linkage.prUrl).toBe("https://github.com/org/repo/pull/42");

    const secondLinkage = await attachCmsRequestLinkageRecord({
      ctx,
      requestId: created.requestId,
      actorUserId: USER_ID,
      source: "internal",
      linkage: {
        previewUrl: "https://preview.example.com",
      },
    });

    expect(secondLinkage.linkage.prNumber).toBe(42);
    expect(secondLinkage.linkage.prUrl).toBe("https://github.com/org/repo/pull/42");
    expect(secondLinkage.linkage.previewUrl).toBe("https://preview.example.com");
  });
});
