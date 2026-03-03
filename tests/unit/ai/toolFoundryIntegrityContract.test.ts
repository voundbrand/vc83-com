import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
  getUserContext: vi.fn(),
}));

import {
  deprecateToolDefinition,
  promoteToolDefinition,
  publishToolDefinition,
  registerToolDefinition,
} from "../../../convex/ai/toolFoundry/admin";
import { resolveToolClassPolicy } from "../../../convex/ai/toolFoundry/integrity";
import { getUserContext, requireAuthenticatedUser } from "../../../convex/rbacHelpers";

type FakeRow = Record<string, any> & { _id: string };

const SUPER_USER_ID = "users_super";
const ORG_ID = "organizations_super";

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
    return this.apply()[0] ?? null;
  }

  async collect() {
    return this.apply();
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
    this.table(table).push(structuredClone(row));
  }

  rows(table: string) {
    return this.table(table).map((row) => structuredClone(row));
  }

  query(table: string) {
    return new FakeQuery(this.table(table));
  }

  async insert(table: string, doc: Record<string, unknown>) {
    const id = `${table}_${++this.insertCounter}`;
    this.table(table).push({
      _id: id,
      ...structuredClone(doc),
    });
    return id;
  }

  async patch(id: string, patch: Record<string, unknown>) {
    const found = this.findById(id);
    if (!found) {
      throw new Error(`Document not found for patch: ${id}`);
    }
    Object.assign(found, structuredClone(patch));
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

function createCtx(db: FakeDb) {
  return { db } as any;
}

function approvedMetadata() {
  return {
    policyId: "policy_mutate_v1",
    policyVersion: "v1",
    requestedBy: "ops",
    state: "approved",
    approvedBy: "ops_lead",
    approvedAt: 1_700_000_000_000,
  };
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
    isGlobal: true,
    roleName: "super_admin",
  } as any);
});

describe("tool foundry integrity contract", () => {
  it("allows super_admin register/publish/promote/deprecate flows", async () => {
    const db = new FakeDb();
    const ctx = createCtx(db);

    const registerResult = await (registerToolDefinition as any)._handler(ctx, {
      sessionId: "sessions_super",
      toolId: "issue_refund_transfer",
      toolClass: "mutate",
      description: "Refund transfer tool",
      approvalMetadata: approvedMetadata(),
    });

    expect(registerResult.success).toBe(true);
    expect(registerResult.status).toBe("draft");

    const publishResult = await (publishToolDefinition as any)._handler(ctx, {
      sessionId: "sessions_super",
      toolId: "issue_refund_transfer",
    });
    expect(publishResult).toMatchObject({
      success: true,
      canonicalToolId: "issue_refund_transfer",
      status: "published",
    });

    const promoteResult = await (promoteToolDefinition as any)._handler(ctx, {
      sessionId: "sessions_super",
      toolId: "issue_refund_transfer",
      toStage: "staged",
      evidence: {
        policyBundleHash: "hash_1",
        specValidated: true,
        contractTestsPassed: true,
      },
    });
    expect(promoteResult.success).toBe(true);
    expect(promoteResult.toStage).toBe("staged");

    const deprecateResult = await (deprecateToolDefinition as any)._handler(ctx, {
      sessionId: "sessions_super",
      toolId: "issue_refund_transfer",
      reason: "Replaced by v2",
    });
    expect(deprecateResult).toMatchObject({
      success: true,
      canonicalToolId: "issue_refund_transfer",
      status: "deprecated",
    });
  });

  it("denies non-super-admin paths with stable code", async () => {
    const db = new FakeDb();
    const ctx = createCtx(db);
    getUserContextMock.mockResolvedValueOnce({
      isGlobal: false,
      roleName: "org_owner",
    } as any);

    await expect(
      (registerToolDefinition as any)._handler(ctx, {
        sessionId: "sessions_user",
        toolId: "issue_refund_transfer",
        toolClass: "mutate",
        approvalMetadata: approvedMetadata(),
      }),
    ).rejects.toMatchObject({
      data: {
        code: "TF_FORBIDDEN_SUPER_ADMIN_REQUIRED",
      },
    });
  });

  it("protects immutable core tool IDs and alias override attempts", async () => {
    const db = new FakeDb();
    const ctx = createCtx(db);

    await expect(
      (registerToolDefinition as any)._handler(ctx, {
        sessionId: "sessions_super",
        toolId: "manage_crm",
        toolClass: "mutate",
        approvalMetadata: approvedMetadata(),
      }),
    ).rejects.toMatchObject({
      data: {
        code: "TF_CORE_TOOL_IMMUTABLE",
      },
    });

    await expect(
      (registerToolDefinition as any)._handler(ctx, {
        sessionId: "sessions_super",
        toolId: "manageCRM",
        toolClass: "mutate",
        approvalMetadata: approvedMetadata(),
      }),
    ).rejects.toMatchObject({
      data: {
        code: "TF_ALIAS_OVERRIDE_FORBIDDEN",
      },
    });
  });

  it("fails closed for unknown class and missing policy mapping", async () => {
    let missingPolicyError: unknown;
    try {
      resolveToolClassPolicy("mutate", {
        read: { mutating: false, approvalRequired: false },
      });
    } catch (error) {
      missingPolicyError = error;
    }
    expect(missingPolicyError).toMatchObject({
      data: {
        code: "TF_FAIL_CLOSED_POLICY_MISSING",
      },
    });

    const db = new FakeDb();
    const ctx = createCtx(db);
    await expect(
      (registerToolDefinition as any)._handler(ctx, {
        sessionId: "sessions_super",
        toolId: "tool_unknown",
        toolClass: "quantum_mutate",
        approvalMetadata: approvedMetadata(),
      }),
    ).rejects.toMatchObject({
      data: {
        code: "TF_FAIL_CLOSED_UNKNOWN_TOOL_CLASS",
      },
    });
  });

  it("requires approved mutating-class metadata and fails closed on malformed metadata", async () => {
    const db = new FakeDb();
    const ctx = createCtx(db);

    await expect(
      (registerToolDefinition as any)._handler(ctx, {
        sessionId: "sessions_super",
        toolId: "mutating_tool_without_approval",
        toolClass: "mutate",
      }),
    ).rejects.toMatchObject({
      data: {
        code: "TF_FAIL_CLOSED_POLICY_PARSE_ERROR",
      },
    });

    await expect(
      (registerToolDefinition as any)._handler(ctx, {
        sessionId: "sessions_super",
        toolId: "mutating_tool_bad_approval_state",
        toolClass: "mutate",
        approvalMetadata: {
          policyId: "policy_x",
          policyVersion: "v1",
          requestedBy: "ops",
          state: "pending",
        },
      }),
    ).rejects.toMatchObject({
      data: {
        code: "TF_FAIL_CLOSED_APPROVAL_REQUIRED",
      },
    });
  });
});
