import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
}));

import {
  attachLayeredContextWorkflow,
  detachLayeredContextWorkflow,
  getAgentLayeredContextWorkflowIdsInternal,
  getAgentLayeredContextWorkflows,
  AGENT_LAYERED_CONTEXT_LINK_TYPE,
} from "../../../convex/agentOntology";
import { requireAuthenticatedUser } from "../../../convex/rbacHelpers";

type FakeRow = Record<string, any> & { _id: string };

const SESSION_ID = "sessions_owner";
const USER_ID = "users_owner";
const ORG_ID = "organizations_main";
const AGENT_ID = "objects_agent";
const WORKFLOW_ID = "objects_workflow";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class FakeQuery {
  private filters = new Map<string, unknown>();

  constructor(private readonly rows: FakeRow[]) {}

  withIndex(
    _indexName: string,
    build?: (q: { eq: (field: string, value: unknown) => unknown }) => unknown,
  ) {
    const query = {
      eq: (field: string, value: unknown) => {
        this.filters.set(field, value);
        return query;
      },
    };
    build?.(query);
    return this;
  }

  async collect() {
    return clone(this.apply());
  }

  async first() {
    return clone(this.apply()[0] ?? null);
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

  async get(id: string) {
    return clone(this.findById(id) ?? null);
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

  async delete(id: string) {
    for (const rows of this.tables.values()) {
      const index = rows.findIndex((row) => row._id === id);
      if (index >= 0) {
        rows.splice(index, 1);
        return;
      }
    }
  }

  rows(table: string) {
    return clone(this.table(table));
  }

  private table(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
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
}

const requireAuthenticatedUserMock = vi.mocked(requireAuthenticatedUser);

function createCtx(db: FakeDb) {
  return { db } as any;
}

function seedSession(db: FakeDb) {
  db.seed("sessions", {
    _id: SESSION_ID,
    userId: USER_ID,
  });
}

function seedAgent(db: FakeDb) {
  db.seed("objects", {
    _id: AGENT_ID,
    organizationId: ORG_ID,
    type: "org_agent",
    subtype: "general",
    name: "Platform Agent",
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    customProperties: {},
  });
}

function seedWorkflow(db: FakeDb) {
  db.seed("objects", {
    _id: WORKFLOW_ID,
    organizationId: ORG_ID,
    type: "layer_workflow",
    subtype: "workflow",
    name: "Business Context Workflow",
    description: "Website + source material",
    status: "active",
    createdAt: 1,
    updatedAt: 20,
    customProperties: {
      nodes: [{ id: "n1" }, { id: "n2" }],
      edges: [{ id: "e1" }],
      metadata: { mode: "live" },
    },
  });
}

describe("agent layered context workflow links", () => {
  beforeEach(() => {
    requireAuthenticatedUserMock.mockReset();
    requireAuthenticatedUserMock.mockResolvedValue({
      userId: USER_ID,
      organizationId: ORG_ID,
    } as any);
  });

  it("attaches, lists, and detaches workflows for an agent", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db);
    seedWorkflow(db);
    const ctx = createCtx(db);

    const attachResult = await (attachLayeredContextWorkflow as any)._handler(ctx, {
      sessionId: SESSION_ID,
      agentId: AGENT_ID,
      workflowId: WORKFLOW_ID,
    });

    expect(attachResult.success).toBe(true);
    expect(attachResult.attached).toBe(true);

    const linkedWorkflows = await (getAgentLayeredContextWorkflows as any)._handler(ctx, {
      sessionId: SESSION_ID,
      agentId: AGENT_ID,
    });

    expect(linkedWorkflows).toHaveLength(1);
    expect(linkedWorkflows[0]).toMatchObject({
      workflowId: WORKFLOW_ID,
      name: "Business Context Workflow",
      nodeCount: 2,
      edgeCount: 1,
      workflowMode: "live",
    });

    const linkedWorkflowIds = await (getAgentLayeredContextWorkflowIdsInternal as any)._handler(
      ctx,
      { agentId: AGENT_ID },
    );
    expect(linkedWorkflowIds).toEqual([WORKFLOW_ID]);

    const detachResult = await (detachLayeredContextWorkflow as any)._handler(ctx, {
      sessionId: SESSION_ID,
      agentId: AGENT_ID,
      workflowId: WORKFLOW_ID,
    });

    expect(detachResult.success).toBe(true);
    expect(detachResult.detached).toBe(true);
    expect(db.rows("objectLinks")).toEqual([]);
  });

  it("deduplicates repeated attach attempts", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db);
    seedWorkflow(db);
    db.seed("objectLinks", {
      _id: "objectLinks_existing",
      organizationId: ORG_ID,
      fromObjectId: AGENT_ID,
      toObjectId: WORKFLOW_ID,
      linkType: AGENT_LAYERED_CONTEXT_LINK_TYPE,
      createdAt: 5,
    });
    const ctx = createCtx(db);

    const result = await (attachLayeredContextWorkflow as any)._handler(ctx, {
      sessionId: SESSION_ID,
      agentId: AGENT_ID,
      workflowId: WORKFLOW_ID,
    });

    expect(result.success).toBe(true);
    expect(result.attached).toBe(false);
    expect(db.rows("objectLinks")).toHaveLength(1);
  });
});
