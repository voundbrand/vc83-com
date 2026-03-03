import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
  getUserContext: vi.fn(),
}));

import {
  setPrimaryAgent,
  tuneManagedSpecialistClone,
  updateAgent,
} from "../../../convex/agentOntology";
import { getUserContext } from "../../../convex/rbacHelpers";

type FakeRow = Record<string, any> & { _id: string };

const ORG_ID = "organizations_1";
const OWNER_USER_ID = "users_owner";
const OTHER_USER_ID = "users_other";
const SESSION_ID = "sessions_owner";
const DEFAULT_OPERATOR_CONTEXT_ID = "__org_default__";
const MANAGED_CLONE_LIFECYCLE = "managed_use_case_clone_v1";

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

  filter(
    build: (q: {
      field: (name: string) => string;
      eq: (field: string, value: unknown) => boolean;
    }) => unknown,
  ) {
    const query = {
      field: (name: string) => name,
      eq: (field: string, value: unknown) => {
        this.filters.set(field, value);
        return true;
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

  rows(table: string): FakeRow[] {
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

const getUserContextMock = vi.mocked(getUserContext);

function createCtx(db: FakeDb) {
  return { db } as any;
}

function seedSession(db: FakeDb) {
  db.seed("sessions", {
    _id: SESSION_ID,
    userId: OWNER_USER_ID,
  });
}

function seedAgent(
  db: FakeDb,
  overrides: Partial<FakeRow> & { _id: string },
) {
  db.seed("objects", {
    _id: overrides._id,
    organizationId: ORG_ID,
    type: "org_agent",
    subtype: "general",
    name: "Agent",
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    customProperties: {
      operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
      isPrimary: false,
    },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  getUserContextMock.mockResolvedValue({
    userId: OWNER_USER_ID,
    organizationId: ORG_ID,
    isGlobal: false,
    roleName: "org_owner",
  } as any);
});

describe("agentOntology mutation paths: setPrimaryAgent", () => {
  it("allows org owner to reassign primary within owner contract", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_primary_old",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: true,
      },
    });
    seedAgent(db, {
      _id: "objects_target",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: false,
      },
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    try {
      const result = await (setPrimaryAgent as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        agentId: "objects_target",
        reason: "owner-driven reassignment",
      });

      expect(result).toMatchObject({
        primaryAgentId: "objects_target",
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        previousPrimaryAgentIds: ["objects_primary_old"],
      });

      const objects = db.rows("objects");
      const oldPrimary = objects.find((row) => row._id === "objects_primary_old");
      const target = objects.find((row) => row._id === "objects_target");
      expect(oldPrimary?.customProperties?.isPrimary).toBe(false);
      expect(target?.customProperties?.isPrimary).toBe(true);

      const actions = db.rows("objectActions");
      expect(actions).toHaveLength(1);
      expect(actions[0]?.actionType).toBe("primary_reassigned");
      expect(actions[0]?.actionData).toMatchObject({
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        previousPrimaryAgentIds: ["objects_primary_old"],
        reason: "owner-driven reassignment",
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("blocks non-owned agent reassignment attempts", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_other_owner",
      customProperties: {
        operatorId: OTHER_USER_ID,
        isPrimary: false,
      },
    });

    await expect(
      (setPrimaryAgent as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        agentId: "objects_other_owner",
      }),
    ).rejects.toThrow(/ONE_OF_ONE_AGENT_ACCESS_DENIED/);
  });

  it("blocks inactive primary target even when owner contract matches", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_paused",
      status: "paused",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: false,
      },
    });

    await expect(
      (setPrimaryAgent as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        agentId: "objects_paused",
      }),
    ).rejects.toThrow("Primary agent must be active");
  });
});

describe("agentOntology mutation paths: updateAgent", () => {
  it("allows sanctioned managed clone tuning fields and writes deterministic audit traces", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_managed_clone",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: false,
        cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
      },
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_100_000_000);
    try {
      await (updateAgent as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        agentId: "objects_managed_clone",
        updates: {
          toolProfile: "support",
          displayName: "Support Specialist",
        },
      });

      const updatedAgent = db.rows("objects").find((row) => row._id === "objects_managed_clone");
      expect(updatedAgent?.customProperties?.displayName).toBe("Support Specialist");
      expect(updatedAgent?.customProperties?.toolProfile).toBe("support");

      const actions = db.rows("objectActions");
      expect(actions).toHaveLength(1);
      expect(actions[0]?.actionType).toBe("managed_clone_tuned");
      expect(actions[0]?.actionData).toEqual({
        updatedFields: ["displayName", "toolProfile"],
        mutationSurface: "owner_managed_clone_tuning",
      });

      const auditLogs = db.rows("auditLogs");
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        action: "managed_clone_tuned",
        resource: "org_agent",
        resourceId: "objects_managed_clone",
        success: true,
        metadata: {
          updatedFields: ["displayName", "toolProfile"],
          mutationSurface: "owner_managed_clone_tuning",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
        },
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("fails closed when managed clone update includes disallowed fields", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_managed_clone",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: false,
        cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
      },
    });

    await expect(
      (updateAgent as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        agentId: "objects_managed_clone",
        updates: {
          name: "Forbidden rename",
        },
      }),
    ).rejects.toThrow(/ONE_OF_ONE_MANAGED_CLONE_TUNING_FIELD_FORBIDDEN/);

    expect(db.rows("objectActions")).toHaveLength(0);
    expect(db.rows("auditLogs")).toHaveLength(0);
  });

  it("keeps non-managed non-primary updates blocked", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_non_primary_standard",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: false,
      },
    });

    await expect(
      (updateAgent as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        agentId: "objects_non_primary_standard",
        updates: {
          displayName: "Should fail",
        },
      }),
    ).rejects.toThrow(/ONE_OF_ONE_PRIMARY_AGENT_REQUIRED/);
  });

  it("keeps non-owned updates blocked even for sanctioned fields", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_non_owned_managed",
      customProperties: {
        operatorId: OTHER_USER_ID,
        isPrimary: false,
        cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
      },
    });

    await expect(
      (updateAgent as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        agentId: "objects_non_owned_managed",
        updates: {
          displayName: "No access",
        },
      }),
    ).rejects.toThrow(/ONE_OF_ONE_AGENT_ACCESS_DENIED/);
  });

  it("provides owner-facing managed clone tuning mutation surface", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_managed_clone_surface",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: false,
        cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
      },
    });

    await (tuneManagedSpecialistClone as any)._handler(createCtx(db), {
      sessionId: SESSION_ID,
      agentId: "objects_managed_clone_surface",
      updates: {
        displayName: "Surface Update",
      },
    });

    const actions = db.rows("objectActions");
    expect(actions).toHaveLength(1);
    expect(actions[0]?.actionType).toBe("managed_clone_tuned");
  });
});
