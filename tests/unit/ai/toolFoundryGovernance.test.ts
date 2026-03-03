import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
  getUserContext: vi.fn(),
}));

import type { Id } from "../../../convex/_generated/dataModel";
import { buildCapabilityGapBlockedPayload } from "../../../convex/ai/agentToolOrchestration";
import {
  CORE_TOOL_CLASS_ALLOWLIST,
  TOOL_FOUNDRY_TOOL_CLASSES,
} from "../../../convex/ai/toolFoundry/integrity";
import {
  attachLinearIssueToProposal,
  buildToolSpecProposalBacklogRecord,
  persistRuntimeCapabilityGapProposal,
  submitProposalPromotionDecision,
} from "../../../convex/ai/toolFoundry/proposalBacklog";
import { CRITICAL_TOOL_NAMES } from "../../../convex/ai/tools/contracts";
import { getUserContext, requireAuthenticatedUser } from "../../../convex/rbacHelpers";

type FakeRow = Record<string, any> & { _id: string };

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

  rows(table: string) {
    return this.table(table).map((row) => structuredClone(row));
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

describe("tool foundry governance and promotion wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedUserMock.mockResolvedValue({
      userId: "users_super",
      organizationId: "organizations_super",
      session: {
        _id: "sessions_super",
        userId: "users_super",
        email: "super.admin@test.dev",
        expiresAt: Date.now() + 60_000,
      },
    } as any);
    getUserContextMock.mockResolvedValue({
      isGlobal: true,
      roleName: "super_admin",
    } as any);
  });

  it("keeps critical tool contracts covered by immutable core allowlist", () => {
    for (const toolName of CRITICAL_TOOL_NAMES) {
      expect(CORE_TOOL_CLASS_ALLOWLIST).toHaveProperty(toolName);
      const mappedClass =
        CORE_TOOL_CLASS_ALLOWLIST[toolName as keyof typeof CORE_TOOL_CLASS_ALLOWLIST];
      expect(TOOL_FOUNDRY_TOOL_CLASSES).toContain(mappedClass);
    }
  });

  it("provides session-based super-admin promotion decision path for caller wiring", async () => {
    const db = new FakeDb();
    const organizationId = "organizations_super" as Id<"organizations">;
    const agentId = "objects_agent_1" as Id<"objects">;
    const sessionId = "agentSessions_1" as Id<"agentSessions">;
    const blocked = buildCapabilityGapBlockedPayload({
      requestedToolName: "issue_refund_transfer",
      parsedArgs: { invoiceId: "INV-44" },
      organizationId,
      agentId,
      sessionId,
      now: 1_700_000_000_000,
    });
    const record = buildToolSpecProposalBacklogRecord({
      organizationId,
      blockedCapabilityGap: blocked,
      sourceTrace: {
        agentId,
        sessionId,
      },
      observedAt: 1_700_000_000_000,
      now: 1_700_000_000_000,
    }) as any;
    db.seed("toolFoundryProposalBacklog", {
      _id: "tool_foundry_backlog_1",
      ...record,
    });

    const result = await (submitProposalPromotionDecision as any)._handler(
      { db } as any,
      {
        sessionId: "sessions_super",
        organizationId,
        proposalKey: record.proposalKey,
        decision: "granted",
        reason: "approved",
      },
    );

    expect(result).toMatchObject({
      status: "updated",
      proposalKey: record.proposalKey,
      backlogStatus: "promoted",
    });
    const rows = db.rows("toolFoundryProposalBacklog");
    expect(rows[0]?.status).toBe("promoted");
  });

  it("fails closed for non-super-admin session on session-based promotion decision path", async () => {
    const db = new FakeDb();
    getUserContextMock.mockResolvedValueOnce({
      isGlobal: false,
      roleName: "org_owner",
    } as any);

    await expect(
      (submitProposalPromotionDecision as any)._handler(
        { db } as any,
        {
          sessionId: "sessions_user",
          organizationId: "organizations_super",
          proposalKey: "toolspec:x",
          decision: "granted",
        },
      ),
    ).rejects.toMatchObject({
      data: {
        code: "TF_FORBIDDEN_SUPER_ADMIN_REQUIRED",
      },
    });
  });

  it("persists Linear issue metadata on runtime capability-gap backlog rows", async () => {
    const db = new FakeDb();
    const organizationId = "organizations_super" as Id<"organizations">;
    const agentId = "objects_agent_1" as Id<"objects">;
    const sessionId = "agentSessions_1" as Id<"agentSessions">;
    const observedAt = 1_700_000_000_000;
    const blocked = buildCapabilityGapBlockedPayload({
      requestedToolName: "issue_refund_transfer",
      parsedArgs: { invoiceId: "INV-44" },
      organizationId,
      agentId,
      sessionId,
      now: observedAt,
    });

    const persistResult = await (persistRuntimeCapabilityGapProposal as any)._handler(
      { db } as any,
      {
        organizationId,
        blockedCapabilityGap: blocked,
        sourceTrace: {
          agentId,
          sessionId,
        },
        observedAt,
      },
    );

    expect(persistResult.status).toBe("inserted");

    const linkedAt = observedAt + 5000;
    const linkResult = await (attachLinearIssueToProposal as any)._handler(
      { db } as any,
      {
        organizationId,
        proposalKey: persistResult.proposalKey,
        issueId: "issue_123",
        issueNumber: "ENG-42",
        issueUrl: "https://linear.app/l4yercak3/issue/ENG-42",
        linkedAt,
      },
    );

    expect(linkResult).toMatchObject({
      status: "updated",
      proposalKey: persistResult.proposalKey,
      linearIssue: {
        issueId: "issue_123",
        issueNumber: "ENG-42",
        issueUrl: "https://linear.app/l4yercak3/issue/ENG-42",
      },
    });

    const rows = db.rows("toolFoundryProposalBacklog");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.linearIssue).toMatchObject({
      issueId: "issue_123",
      issueNumber: "ENG-42",
      issueUrl: "https://linear.app/l4yercak3/issue/ENG-42",
      linkedAt,
      lastSyncedAt: linkedAt,
    });
  });
});
