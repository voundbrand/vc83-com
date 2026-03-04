import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
  getUserContext: vi.fn(),
}));

import {
  backfillCatalogPublishedFlags,
  setAgentBlocker,
  setCatalogPublishedStatus,
  setSeedStatusOverride,
} from "../../../convex/ai/agentCatalogAdmin";
import { getUserContext, requireAuthenticatedUser } from "../../../convex/rbacHelpers";

type FakeRow = Record<string, any> & { _id: string };

const SUPER_USER_ID = "users_super";
const ORG_ID = "organizations_super";
const DEFAULT_DATASET = "agp_v1";
const DEFAULT_AGENT_NUMBER = 42;

function clone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

class FakeQuery {
  private filters = new Map<string, unknown>();

  constructor(private readonly rows: FakeRow[]) {}

  withIndex(
    _indexName: string,
    build: (q: { eq: (field: string, value: unknown) => unknown }) => unknown,
  ) {
    const query = {
      eq: (field: string, value: unknown) => {
        this.filters.set(field, value);
        return query;
      },
    };
    build(query);
    return this;
  }

  async first() {
    const rows = this.apply();
    return clone(rows[0] ?? null);
  }

  async collect() {
    return clone(this.apply());
  }

  private apply() {
    return this.rows.filter((row) => {
      for (const [field, value] of this.filters) {
        if (row[field] !== value) {
          return false;
        }
      }
      return true;
    });
  }
}

class FakeDb {
  private readonly tables = new Map<string, FakeRow[]>();
  private insertCounter = 0;

  seed(table: string, row: FakeRow) {
    this.table(table).push(clone(row));
  }

  rows(table: string) {
    return clone(this.table(table));
  }

  async get(id: string) {
    const found = this.findById(id);
    return clone(found ?? null);
  }

  query(table: string) {
    return new FakeQuery(this.table(table));
  }

  async insert(table: string, doc: Record<string, unknown>) {
    const id = `${table}_${++this.insertCounter}`;
    this.table(table).push({
      _id: id,
      ...clone(doc),
    });
    return id;
  }

  async patch(id: string, patch: Record<string, unknown>) {
    const found = this.findById(id);
    if (!found) {
      throw new Error(`Document not found for patch: ${id}`);
    }
    Object.assign(found, clone(patch));
  }

  private findById(id: string) {
    for (const rows of this.tables.values()) {
      const found = rows.find((row) => row._id === id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private table(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }
}

const requireAuthenticatedUserMock = vi.mocked(requireAuthenticatedUser);
const getUserContextMock = vi.mocked(getUserContext);

function seedAgentEntry(db: FakeDb, overrides: Partial<FakeRow> = {}) {
  db.seed("agentCatalogEntries", {
    _id: "agent_catalog_entry_1",
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: DEFAULT_AGENT_NUMBER,
    catalogStatus: "done",
    runtimeStatus: "live",
    blockers: [],
    seedStatus: "skeleton",
    updatedAt: 0,
    ...overrides,
  });
}

function seedUser(db: FakeDb, overrides: Partial<FakeRow> = {}) {
  db.seed("users", {
    _id: SUPER_USER_ID,
    email: "super.admin@test.dev",
    firstName: "Super",
    lastName: "Admin",
    ...overrides,
  });
}

function createCtx(db: FakeDb) {
  return { db } as any;
}

async function invokeSetAgentBlocker(
  db: FakeDb,
  overrides: Partial<{
    datasetVersion: string;
    catalogAgentNumber: number;
    blocker: string;
    action: "add" | "remove";
  }> = {},
) {
  return await (setAgentBlocker as any)._handler(createCtx(db), {
    sessionId: "sessions_super",
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: DEFAULT_AGENT_NUMBER,
    blocker: "Needs review",
    action: "add",
    ...overrides,
  });
}

async function invokeSetSeedStatusOverride(
  db: FakeDb,
  overrides: Partial<{
    datasetVersion: string;
    catalogAgentNumber: number;
    override: {
      seedStatus: "full" | "skeleton" | "missing";
      reason: string;
    };
  }> = {},
) {
  return await (setSeedStatusOverride as any)._handler(createCtx(db), {
    sessionId: "sessions_super",
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: DEFAULT_AGENT_NUMBER,
    override: {
      seedStatus: "full",
      reason: "Manual validation",
    },
    ...overrides,
  });
}

async function invokeSetCatalogPublishedStatus(
  db: FakeDb,
  overrides: Partial<{
    datasetVersion: string;
    catalogAgentNumber: number;
    published: boolean;
    reason: string;
  }> = {},
) {
  return await (setCatalogPublishedStatus as any)._handler(createCtx(db), {
    sessionId: "sessions_super",
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: DEFAULT_AGENT_NUMBER,
    published: true,
    reason: "Release readiness complete.",
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  requireAuthenticatedUserMock.mockResolvedValue({
    userId: SUPER_USER_ID,
    organizationId: ORG_ID,
    session: {
      _id: "sessions_super",
      userId: SUPER_USER_ID,
      email: "super.admin@test.dev",
      expiresAt: Date.now() + 60_000,
    },
  } as any);

  getUserContextMock.mockResolvedValue({
    userId: SUPER_USER_ID,
    organizationId: ORG_ID,
    session: {
      _id: "sessions_super",
      userId: SUPER_USER_ID,
      email: "super.admin@test.dev",
      expiresAt: Date.now() + 60_000,
    },
    isGlobal: true,
    roleName: "super_admin",
  } as any);
});

describe("agent catalog controlled writes: setAgentBlocker", () => {
  it("requires super-admin and fails closed for non-super-admin sessions", async () => {
    const db = new FakeDb();
    seedAgentEntry(db);

    getUserContextMock.mockResolvedValueOnce({
      isGlobal: false,
      roleName: "org_owner",
    } as any);

    await expect(invokeSetAgentBlocker(db)).rejects.toMatchObject({
      data: {
        code: "FORBIDDEN",
      },
    });
  });

  it("adds/removes blockers with dedupe normalization and writes agent_catalog.* audit actions", async () => {
    const db = new FakeDb();
    seedAgentEntry(db, {
      blockers: ["Needs legal sign-off", "Needs legal sign-off", "Needs QA review"],
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    try {
      const addResult = await invokeSetAgentBlocker(db, {
        blocker: "  Needs legal   sign-off  ",
        action: "add",
      });

      expect(addResult.changed).toBe(true);
      expect(addResult.blockers).toEqual(["Needs legal sign-off", "Needs QA review"]);

      const removeResult = await invokeSetAgentBlocker(db, {
        blocker: "Needs legal sign-off",
        action: "remove",
      });

      expect(removeResult.changed).toBe(true);
      expect(removeResult.blockers).toEqual(["Needs QA review"]);

      const storedEntry = db.rows("agentCatalogEntries")[0];
      expect(storedEntry?.blockers).toEqual(["Needs QA review"]);

      const actionTypes = db.rows("objectActions").map((row) => row.actionType);
      expect(actionTypes).toEqual([
        "agent_catalog.blocker_add",
        "agent_catalog.blocker_remove",
      ]);
      for (const actionType of actionTypes) {
        expect(actionType.startsWith("agent_catalog.")).toBe(true);
      }
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("rejects empty blockers", async () => {
    const db = new FakeDb();
    seedAgentEntry(db);

    await expect(
      invokeSetAgentBlocker(db, {
        blocker: "   ",
        action: "add",
      }),
    ).rejects.toMatchObject({
      data: {
        code: "INVALID_ARGUMENT",
      },
    });

    expect(db.rows("objectActions")).toHaveLength(0);
  });

  it("rejects missing catalog agents", async () => {
    const db = new FakeDb();

    await expect(
      invokeSetAgentBlocker(db, {
        catalogAgentNumber: 9999,
      }),
    ).rejects.toMatchObject({
      data: {
        code: "NOT_FOUND",
      },
    });
  });
});

describe("agent catalog controlled writes: setSeedStatusOverride", () => {
  it("requires super-admin and fails closed for non-super-admin sessions", async () => {
    const db = new FakeDb();
    seedAgentEntry(db);
    seedUser(db);

    getUserContextMock.mockResolvedValueOnce({
      isGlobal: false,
      roleName: "org_owner",
    } as any);

    await expect(invokeSetSeedStatusOverride(db)).rejects.toMatchObject({
      data: {
        code: "FORBIDDEN",
      },
    });
  });

  it("requires a non-empty override reason", async () => {
    const db = new FakeDb();
    seedAgentEntry(db);
    seedUser(db);

    await expect(
      invokeSetSeedStatusOverride(db, {
        override: {
          seedStatus: "full",
          reason: "   ",
        },
      }),
    ).rejects.toMatchObject({
      data: {
        code: "INVALID_ARGUMENT",
      },
    });
  });

  it("persists override metadata separately from computed seed status and writes agent_catalog.* audit action", async () => {
    const db = new FakeDb();
    seedAgentEntry(db, {
      seedStatus: "missing",
    });
    seedUser(db, {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@test.dev",
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_100_000_000);
    try {
      const result = await invokeSetSeedStatusOverride(db, {
        override: {
          seedStatus: "full",
          reason: "  Manual seed review completed  ",
        },
      });

      expect(result.computedSeedStatus).toBe("missing");
      expect(result.seedStatusOverride).toMatchObject({
        seedStatus: "full",
        reason: "Manual seed review completed",
        actorUserId: SUPER_USER_ID,
        actorLabel: "Ada Lovelace",
        updatedAt: 1_700_100_000_000,
      });

      const storedEntry = db.rows("agentCatalogEntries")[0];
      expect(storedEntry?.seedStatus).toBe("missing");
      expect(storedEntry?.seedStatusOverride).toMatchObject({
        seedStatus: "full",
        reason: "Manual seed review completed",
        actorUserId: SUPER_USER_ID,
        actorLabel: "Ada Lovelace",
        updatedAt: 1_700_100_000_000,
      });

      const objectActions = db.rows("objectActions");
      expect(objectActions).toHaveLength(1);
      expect(objectActions[0]?.actionType).toBe("agent_catalog.seed_override_set");
      expect(objectActions[0]?.actionType.startsWith("agent_catalog.")).toBe(true);
      expect(objectActions[0]?.actionData).toMatchObject({
        computedSeedStatus: "missing",
      });
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe("agent catalog controlled writes: setCatalogPublishedStatus + backfill", () => {
  it("updates explicit published flag and records agent_catalog.* audit action", async () => {
    const db = new FakeDb();
    seedAgentEntry(db, {
      published: false,
      runtimeStatus: "live",
      catalogStatus: "done",
    });

    const result = await invokeSetCatalogPublishedStatus(db, {
      published: true,
      reason: "Ready for storefront release",
    });

    expect(result.published).toBe(true);
    const storedEntry = db.rows("agentCatalogEntries")[0];
    expect(storedEntry?.published).toBe(true);
    const objectActions = db.rows("objectActions");
    expect(objectActions[0]?.actionType).toBe("agent_catalog.published_set");
  });

  it("backfills missing published fields using legacy inference and writes audit action", async () => {
    const db = new FakeDb();
    seedAgentEntry(db, {
      _id: "agent_catalog_entry_legacy_live",
      catalogAgentNumber: 41,
      published: undefined,
      runtimeStatus: "live",
      catalogStatus: "done",
    });
    seedAgentEntry(db, {
      _id: "agent_catalog_entry_legacy_hidden",
      catalogAgentNumber: 52,
      published: undefined,
      runtimeStatus: "template_only",
      catalogStatus: "pending",
    });

    const result = await (backfillCatalogPublishedFlags as any)._handler(createCtx(db), {
      sessionId: "sessions_super",
      datasetVersion: DEFAULT_DATASET,
      dryRun: false,
    });

    expect(result.updatedCount).toBe(2);
    const entries = db.rows("agentCatalogEntries");
    const live = entries.find((row) => row.catalogAgentNumber === 41);
    const hidden = entries.find((row) => row.catalogAgentNumber === 52);
    expect(live?.published).toBe(true);
    expect(hidden?.published).toBe(false);
    const actionTypes = db.rows("objectActions").map((row) => row.actionType);
    expect(actionTypes).toContain("agent_catalog.published_backfill");
  });
});
