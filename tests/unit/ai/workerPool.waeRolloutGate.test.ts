import { beforeEach, describe, expect, it, vi } from "vitest";

import { spawnUseCaseAgent } from "../../../convex/ai/workerPool";

type FakeRow = Record<string, any> & { _id: string };

const ORG_ID = "organizations_1";
const OWNER_USER_ID = "users_owner";
const REQUESTER_USER_ID = "users_requester";
const TEMPLATE_ID = "objects_template_1";
const TEMPLATE_VERSION_ID = "objects_template_version_1";

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
    build?: (q: { eq: (field: string, value: unknown) => unknown }) => unknown,
  ) {
    const query = {
      eq: (field: string, value: unknown) => {
        this.filters.set(field, value);
        return query;
      },
    };
    if (build) {
      build(query);
    }
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
    return clone(this.apply()[0] ?? null);
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

  query(table: string) {
    return new FakeQuery(this.table(table));
  }

  async get(id: string) {
    return clone(this.findById(id));
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
      throw new Error(`Missing row for patch: ${id}`);
    }
    Object.assign(found, clone(patch));
  }

  private findById(id: string) {
    for (const rows of this.tables.values()) {
      const row = rows.find((entry) => entry._id === id);
      if (row) {
        return row;
      }
    }
    return null;
  }

  private table(table: string) {
    if (!this.tables.has(table)) {
      this.tables.set(table, []);
    }
    return this.tables.get(table)!;
  }
}

function createCtx(db: FakeDb) {
  return { db } as any;
}

function seedOrganizationMember(db: FakeDb, userId: string) {
  db.seed("organizationMembers", {
    _id: `organizationMembers_${userId}`,
    organizationId: ORG_ID,
    userId,
    isActive: true,
  });
}

function seedTemplate(db: FakeDb) {
  db.seed("objects", {
    _id: TEMPLATE_ID,
    organizationId: ORG_ID,
    type: "org_agent",
    subtype: "general",
    name: "Protected Template",
    description: "Template for WAE rollout gate checks",
    status: "template",
    createdAt: 1,
    updatedAt: 1_700_610_000_000,
    customProperties: {
      protected: true,
      templateVersion: "template_v1",
      templatePublishedVersionId: TEMPLATE_VERSION_ID,
      clonePolicy: {
        spawnEnabled: true,
      },
    },
  });

  db.seed("objects", {
    _id: TEMPLATE_VERSION_ID,
    organizationId: ORG_ID,
    type: "org_agent_template_version",
    subtype: "general",
    name: "Protected Template v1",
    status: "completed",
    createdAt: 1,
    updatedAt: 1_700_610_000_000,
    customProperties: {
      sourceTemplateId: TEMPLATE_ID,
      versionTag: "template_v1",
    },
  });
}

function seedWaeGateArtifact(db: FakeDb, recordedAt: number) {
  db.seed("objectActions", {
    _id: "objectActions_wae_gate",
    organizationId: ORG_ID,
    objectId: TEMPLATE_VERSION_ID,
    actionType: "wae_rollout_gate.recorded",
    actionData: {
      contractVersion: "wae_rollout_gate_decision_v1",
      rolloutContractVersion: "wae_rollout_promotion_contract_v1",
      status: "pass",
      reasonCode: "pass",
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_ID,
      templateVersionTag: "template_v1",
      runId: "wae_run_stale",
      suiteKeyHash: "suite_hash_stale",
      scenarioMatrixContractVersion: "wae_matrix_v1",
      completedAt: recordedAt,
      recordedAt,
      recordedByUserId: REQUESTER_USER_ID,
      freshnessWindowMs: 72 * 60 * 60 * 1000,
      score: {
        verdict: "passed",
        decision: "proceed",
        resultLabel: "PASS",
        weightedScore: 0.91,
        thresholds: {
          pass: 0.85,
          hold: 0.7,
        },
        failedMetrics: [],
        warnings: [],
        blockedReasons: [],
      },
      scenarioCoverage: {
        totalScenarios: 3,
        runnableScenarios: 3,
        skippedScenarios: 0,
        passedScenarios: 3,
        failedScenarios: 0,
        evaluatedScenarioIds: ["OOO-001", "Q-001", "SAM-001"],
        failedScenarioIds: [],
        skippedScenarioIds: [],
      },
      criticalReasonCodeBudget: {
        allowedCount: 0,
        observedCount: 0,
        observedReasonCodes: [],
      },
      failureSnapshot: {
        unresolvedCriticalFailures: 0,
        failedMetrics: [],
        blockedReasons: [],
      },
    },
    performedBy: REQUESTER_USER_ID,
    performedAt: recordedAt,
  });
}

describe("workerPool WAE rollout gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed for stale WAE gate evidence before spawning a managed clone", async () => {
    const db = new FakeDb();
    seedOrganizationMember(db, OWNER_USER_ID);
    seedOrganizationMember(db, REQUESTER_USER_ID);
    seedTemplate(db);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_900_000_001);
    try {
      seedWaeGateArtifact(db, 1_700_640_000_000);

      await expect(
        (spawnUseCaseAgent as any)._handler(createCtx(db), {
          organizationId: ORG_ID,
          templateAgentId: TEMPLATE_ID,
          ownerUserId: OWNER_USER_ID,
          requestedByUserId: REQUESTER_USER_ID,
          useCase: "Lead capture",
        }),
      ).rejects.toThrow(/WAE rollout gate evidence is stale/);

      const blockedAction = db.rows("objectActions").find(
        (row) => row.actionType === "template_clone_spawn_blocked_wae_gate",
      );
      expect(blockedAction?.actionData).toMatchObject({
        templateAgentId: TEMPLATE_ID,
        templateVersionId: TEMPLATE_VERSION_ID,
        templateVersionTag: "template_v1",
        reasonCode: "wae_evidence_stale",
      });
    } finally {
      nowSpy.mockRestore();
    }
  });
});
