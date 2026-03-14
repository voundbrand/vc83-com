import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
  getUserContext: vi.fn(),
}));

import {
  createAgentTemplate,
  createAgentTemplateVersionSnapshot,
  getTemplateCloneDriftReport,
  listTemplateDistributionTelemetry,
  listTemplateCloneInventory,
  distributeAgentTemplateToOrganizations,
  deprecateAgentTemplateLifecycle,
  publishAgentTemplateVersion,
  setPrimaryAgent,
  tuneManagedSpecialistClone,
  updateAgent,
} from "../../../convex/agentOntology";
import { getUserContext, requireAuthenticatedUser } from "../../../convex/rbacHelpers";

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
  private orderDirection: "asc" | "desc" | null = null;
  private takeLimit: number | null = null;

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
    const rows = this.apply();
    return clone(rows[0] ?? null);
  }

  async collect() {
    return clone(this.apply());
  }

  order(direction: "asc" | "desc") {
    this.orderDirection = direction;
    return this;
  }

  async take(limit: number) {
    this.takeLimit = limit;
    return clone(this.apply());
  }

  private apply() {
    const filtered = this.rows.filter((row) => {
      for (const [field, value] of this.filters) {
        if (row[field] !== value) {
          return false;
        }
      }
      return true;
    });
    if (this.orderDirection) {
      filtered.sort((left, right) => {
        const leftValue = typeof left.performedAt === "number" ? left.performedAt : 0;
        const rightValue = typeof right.performedAt === "number" ? right.performedAt : 0;
        if (leftValue !== rightValue) {
          return this.orderDirection === "desc"
            ? rightValue - leftValue
            : leftValue - rightValue;
        }
        return String(left._id).localeCompare(String(right._id));
      });
    }
    if (typeof this.takeLimit === "number") {
      return filtered.slice(0, this.takeLimit);
    }
    return filtered;
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
const requireAuthenticatedUserMock = vi.mocked(requireAuthenticatedUser);

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

function seedWaeGateArtifact(
  db: FakeDb,
  overrides: Partial<Record<string, unknown>> & {
    templateId: string;
    templateVersionId: string;
    templateVersionTag: string;
  },
) {
  const recordedAt =
    typeof overrides.recordedAt === "number" ? overrides.recordedAt : 1_700_000_000_000;
  db.seed("objectActions", {
    _id: `objectActions_wae_${db.rows("objectActions").length + 1}`,
    organizationId: ORG_ID,
    objectId: overrides.templateVersionId,
    actionType: "wae_rollout_gate.recorded",
    actionData: {
      contractVersion: "wae_rollout_gate_decision_v1",
      rolloutContractVersion: "wae_rollout_promotion_contract_v1",
      status: overrides.status ?? "pass",
      reasonCode: overrides.reasonCode ?? "pass",
      templateId: overrides.templateId,
      templateVersionId: overrides.templateVersionId,
      templateVersionTag: overrides.templateVersionTag,
      runId: overrides.runId ?? "wae_run_1",
      suiteKeyHash: overrides.suiteKeyHash ?? "suite_hash_1",
      scenarioMatrixContractVersion:
        overrides.scenarioMatrixContractVersion ?? "wae_matrix_v1",
      completedAt: overrides.completedAt ?? recordedAt,
      recordedAt,
      recordedByUserId: OWNER_USER_ID,
      freshnessWindowMs: overrides.freshnessWindowMs ?? 72 * 60 * 60 * 1000,
      score: {
        verdict: overrides.scoreVerdict ?? "passed",
        decision: overrides.scoreDecision ?? "proceed",
        resultLabel: overrides.resultLabel ?? "PASS",
        weightedScore: overrides.weightedScore ?? 0.93,
        thresholds: {
          pass: 0.85,
          hold: 0.7,
        },
        failedMetrics: overrides.failedMetrics ?? [],
        warnings: overrides.warnings ?? [],
        blockedReasons: overrides.blockedReasons ?? [],
      },
      scenarioCoverage: {
        totalScenarios: overrides.totalScenarios ?? 3,
        runnableScenarios: overrides.runnableScenarios ?? 3,
        skippedScenarios: overrides.skippedScenarios ?? 0,
        passedScenarios: overrides.passedScenarios ?? 3,
        failedScenarios: overrides.failedScenarios ?? 0,
        evaluatedScenarioIds:
          overrides.evaluatedScenarioIds ?? ["Q-001", "OOO-001", "SAM-001"],
        failedScenarioIds: overrides.failedScenarioIds ?? [],
        skippedScenarioIds: overrides.skippedScenarioIds ?? [],
      },
      criticalReasonCodeBudget: {
        allowedCount: overrides.allowedCriticalCount ?? 0,
        observedCount: overrides.observedCriticalCount ?? 0,
        observedReasonCodes: overrides.observedReasonCodes ?? [],
      },
      failureSnapshot: {
        unresolvedCriticalFailures: overrides.unresolvedCriticalFailures ?? 0,
        failedMetrics: overrides.snapshotFailedMetrics ?? [],
        blockedReasons: overrides.snapshotBlockedReasons ?? [],
      },
    },
    performedBy: OWNER_USER_ID,
    performedAt: recordedAt,
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  requireAuthenticatedUserMock.mockResolvedValue({
    userId: OWNER_USER_ID,
    organizationId: ORG_ID,
    session: {
      _id: SESSION_ID as any,
      userId: OWNER_USER_ID as any,
      email: "owner@example.com",
      expiresAt: 1_900_000_000_000,
    },
  } as any);

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

  it("fails closed on locked policy fields for managed template-linked clones", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_locked_clone",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: false,
        templateAgentId: "objects_template_locked",
        templateVersion: "v1",
        cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
        modelId: "openai/gpt-4o-mini",
        templateCloneLinkage: {
          contractVersion: "ath_template_clone_linkage_v1",
          sourceTemplateId: "objects_template_locked",
          sourceTemplateVersion: "v1",
          cloneLifecycleState: "managed_in_sync",
          overridePolicy: {
            mode: "warn",
            fields: {
              modelId: { mode: "locked" },
            },
          },
        },
      },
    });

    await expect(
      (updateAgent as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        agentId: "objects_locked_clone",
        updates: {
          modelId: "anthropic/claude-sonnet",
        },
      }),
    ).rejects.toThrow(/MANAGED_CLONE_OVERRIDE_POLICY_LOCKED/);

    const gateAudit = db.rows("auditLogs").find(
      (row) => row.action === "managed_clone_override_gate_evaluated",
    );
    expect(gateAudit?.success).toBe(false);
    expect(gateAudit?.metadata?.decision).toBe("blocked_locked");
    expect(gateAudit?.metadata?.lockedFields).toEqual(["modelId"]);
  });

  it("requires explicit warn confirmation + reason before applying warn policy fields", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_warn_clone",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: false,
        templateAgentId: "objects_template_warn",
        templateVersion: "v2",
        cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
        toolProfile: "general",
        templateCloneLinkage: {
          contractVersion: "ath_template_clone_linkage_v1",
          sourceTemplateId: "objects_template_warn",
          sourceTemplateVersion: "v2",
          cloneLifecycleState: "managed_in_sync",
          overridePolicy: {
            mode: "warn",
            fields: {
              toolProfile: { mode: "warn" },
            },
          },
        },
      },
    });

    await expect(
      (updateAgent as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        agentId: "objects_warn_clone",
        updates: {
          toolProfile: "support",
        },
      }),
    ).rejects.toThrow(/MANAGED_CLONE_OVERRIDE_POLICY_WARN_CONFIRMATION_REQUIRED/);

    await (updateAgent as any)._handler(createCtx(db), {
      sessionId: SESSION_ID,
      agentId: "objects_warn_clone",
      updates: {
        toolProfile: "support",
      },
      overridePolicyGate: {
        confirmWarnOverride: true,
        reason: "org-specific support workflow",
      },
    });

    const gateAudits = db
      .rows("auditLogs")
      .filter((row) => row.action === "managed_clone_override_gate_evaluated");
    expect(gateAudits).toHaveLength(2);
    expect(gateAudits[0]?.metadata?.decision).toBe("blocked_warn_confirmation_required");
    expect(gateAudits[1]?.metadata?.decision).toBe("allow");
    expect(gateAudits[1]?.metadata?.warnFields).toEqual(["toolProfile"]);
    expect(gateAudits[1]?.metadata?.reason).toBe("org-specific support workflow");
  });

  it("keeps free policy edits pass-through for managed template-linked clones", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_free_clone",
      customProperties: {
        operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
        isPrimary: false,
        templateAgentId: "objects_template_free",
        templateVersion: "v3",
        cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
        toolProfile: "general",
        templateCloneLinkage: {
          contractVersion: "ath_template_clone_linkage_v1",
          sourceTemplateId: "objects_template_free",
          sourceTemplateVersion: "v3",
          cloneLifecycleState: "managed_in_sync",
          overridePolicy: {
            mode: "warn",
            fields: {
              toolProfile: { mode: "free" },
            },
          },
        },
      },
    });

    await (updateAgent as any)._handler(createCtx(db), {
      sessionId: SESSION_ID,
      agentId: "objects_free_clone",
      updates: {
        toolProfile: "support",
      },
    });

    const updated = db.rows("objects").find((row) => row._id === "objects_free_clone");
    expect(updated?.customProperties?.toolProfile).toBe("support");
    const gateAudit = db.rows("auditLogs").find(
      (row) =>
        row.action === "managed_clone_override_gate_evaluated" &&
        row.resourceId === "objects_free_clone",
    );
    expect(gateAudit?.success).toBe(true);
    expect(gateAudit?.metadata?.freeFields).toEqual(["toolProfile"]);
  });
});

describe("agentOntology mutation paths: template lifecycle (ATH-004)", () => {
  it("fails closed for non-super-admin template lifecycle writes", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValueOnce({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: false,
      roleName: "org_owner",
    } as any);

    await expect(
      (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Ops Template",
      }),
    ).rejects.toThrow(/Template lifecycle operations require super_admin role/);
  });

  it("creates immutable template version snapshots and blocks duplicate version tags", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_200_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Alpha",
        toolProfile: "general",
      });

      const firstSnapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "v1",
          summary: "Initial baseline",
        },
      );

      const versionDoc = db.rows("objects").find((row) => row._id === firstSnapshot.templateVersionId);
      expect(versionDoc?.type).toBe("org_agent_template_version");
      expect(versionDoc?.customProperties?.immutableSnapshot).toBe(true);
      expect(versionDoc?.customProperties?.versionTag).toBe("v1");

      await expect(
        (createAgentTemplateVersionSnapshot as any)._handler(createCtx(db), {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "v1",
        }),
      ).rejects.toThrow(/already exists/);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("publishes and deprecates template/version with deterministic audit envelopes", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_300_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Beta",
      });
      const snapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "v2",
        },
      );
      seedWaeGateArtifact(db, {
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        templateVersionTag: "v2",
        recordedAt: 1_700_300_000_000,
      });

      const publishResult = await (publishAgentTemplateVersion as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        publishReason: "release",
      });
      expect(publishResult).toMatchObject({
        publishedVersion: "v2",
        templateLifecycleStatus: "published",
        versionLifecycleStatus: "published",
      });

      const deprecateVersionResult = await (deprecateAgentTemplateLifecycle as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          target: "version",
          templateVersionId: snapshot.templateVersionId,
          reason: "superseded",
        },
      );
      expect(deprecateVersionResult).toMatchObject({
        target: "version",
        lifecycleStatus: "deprecated",
      });

      const deprecateTemplateResult = await (deprecateAgentTemplateLifecycle as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          target: "template",
          reason: "retired",
        },
      );
      expect(deprecateTemplateResult).toMatchObject({
        target: "template",
        lifecycleStatus: "deprecated",
      });

      const objectActions = db.rows("objectActions");
      const lifecycleActions = objectActions.filter((row) =>
        String(row.actionType).startsWith("agent_template.")
      );
      expect(lifecycleActions.length).toBeGreaterThanOrEqual(5);

      const publishAction = lifecycleActions.find(
        (row) => row.actionType === "agent_template.version_published",
      );
      expect(publishAction?.actionData).toMatchObject({
        contractVersion: "ath_template_lifecycle_v1",
        actor: {
          userId: OWNER_USER_ID,
          sessionId: SESSION_ID,
          role: "super_admin",
        },
        actionType: "agent_template.version_published",
        objectScope: {
          scope: "template_version",
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          templateVersionTag: "v2",
          organizationId: ORG_ID,
          precedenceOrder: [
            "platform_policy",
            "template_baseline",
            "org_clone_overrides",
            "runtime_session_restrictions",
          ],
        },
        timestamp: 1_700_300_000_000,
      });
      expect(publishAction?.actionData?.diff?.changedFields).toEqual([
        "templateLifecycleStatus",
        "templatePublishedVersion",
        "versionLifecycleStatus",
      ]);

      const auditLogs = db.rows("auditLogs");
      const publishAudit = auditLogs.find(
        (row) => row.action === "agent_template.version_published",
      );
      expect(publishAudit).toMatchObject({
        organizationId: ORG_ID,
        userId: OWNER_USER_ID,
        action: "agent_template.version_published",
        resource: "template_version",
        success: true,
      });
      expect(publishAudit?.metadata).toEqual(publishAction?.actionData);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("blocks template publication when WAE gate evidence is missing", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_301_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Missing Gate",
      });
      const snapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "v_gate_missing",
        },
      );

      await (publishAgentTemplateVersion as any)
        ._handler(createCtx(db), {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
        })
        .then(
          () => {
            throw new Error("expected publishAgentTemplateVersion to fail");
          },
          (error: unknown) => {
            expect(String(error)).toContain("No WAE rollout gate artifact was recorded");
          },
        );

      const blockedAction = db.rows("objectActions").find(
        (row) => row.actionType === "agent_template.publish_blocked_wae_gate",
      );
      expect(blockedAction?.actionData).toMatchObject({
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        templateVersionTag: "v_gate_missing",
        reasonCode: "wae_evidence_missing",
      });
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe("agentOntology mutation paths: template distribution (ATH-005)", () => {
  it("fails closed for non-super-admin distribution writes", async () => {
    const db = new FakeDb();
    seedSession(db);
    seedAgent(db, {
      _id: "objects_template_only",
      status: "template",
      customProperties: {},
    });

    getUserContextMock.mockResolvedValueOnce({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: false,
      roleName: "org_owner",
    } as any);

    await expect(
      (distributeAgentTemplateToOrganizations as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        templateId: "objects_template_only",
        targetOrganizationIds: ["organizations_2", "organizations_3"],
        dryRun: true,
      }),
    ).rejects.toThrow(/Template lifecycle operations require super_admin role/);
  });

  it("builds deterministic dry-run plans with sorted target org order and idempotent operations", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_400_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Dist",
      });
      const snapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "dist_v1",
        },
      );
      seedWaeGateArtifact(db, {
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        templateVersionTag: "dist_v1",
        recordedAt: 1_700_400_000_000,
      });

      seedAgent(db, {
        _id: "objects_existing_clone",
        organizationId: "organizations_2",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "dist_v0",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "dist_v0",
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: { mode: "warn" },
          },
        },
      });

      const result = await (distributeAgentTemplateToOrganizations as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          targetOrganizationIds: ["organizations_3", "organizations_2", "organizations_1"],
          dryRun: true,
        },
      );

      expect(result.targetOrganizationIds).toEqual([
        "organizations_1",
        "organizations_2",
        "organizations_3",
      ]);
      expect(result.plan.map((row: any) => [row.organizationId, row.operation])).toEqual([
        ["organizations_1", "create"],
        ["organizations_2", "update"],
        ["organizations_3", "create"],
      ]);

      const clones = db.rows("objects").filter((row) =>
        row.type === "org_agent" && row.organizationId !== ORG_ID,
      );
      expect(clones).toHaveLength(1);
      expect(clones[0]?._id).toBe("objects_existing_clone");
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("applies idempotent upsert rollout and skips on repeat apply", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_500_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Rollout",
      });
      const snapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "rollout_v1",
        },
      );
      seedWaeGateArtifact(db, {
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        templateVersionTag: "rollout_v1",
        recordedAt: 1_700_500_000_000,
      });

      const firstApply = await (distributeAgentTemplateToOrganizations as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          targetOrganizationIds: ["organizations_4"],
          dryRun: false,
        },
      );
      expect(firstApply.plan[0]?.operation).toBe("create");
      expect(firstApply.applied[0]?.operation).toBe("create");

      const secondApply = await (distributeAgentTemplateToOrganizations as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          targetOrganizationIds: ["organizations_4"],
          dryRun: false,
        },
      );
      expect(secondApply.plan[0]?.operation).toBe("skip");
      expect(secondApply.applied[0]?.operation).toBe("skip");

      const org4Clones = db.rows("objects").filter((row) =>
        row.type === "org_agent" && row.organizationId === "organizations_4",
      );
      expect(org4Clones).toHaveLength(1);
      expect(org4Clones[0]?.customProperties?.templateVersion).toBe("rollout_v1");
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("supports staged rollout windows with deterministic job ids and auditable summaries", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_510_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Staged Rollout",
      });
      const snapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "rollout_v2",
        },
      );
      seedWaeGateArtifact(db, {
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        templateVersionTag: "rollout_v2",
        recordedAt: 1_700_510_000_000,
      });

      const firstPlan = await (distributeAgentTemplateToOrganizations as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          targetOrganizationIds: [
            "organizations_3",
            "organizations_2",
            "organizations_1",
          ],
          stagedRollout: {
            stageSize: 2,
            stageStartIndex: 1,
          },
          dryRun: true,
        },
      );

      const secondPlan = await (distributeAgentTemplateToOrganizations as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          targetOrganizationIds: [
            "organizations_3",
            "organizations_2",
            "organizations_1",
          ],
          stagedRollout: {
            stageSize: 2,
            stageStartIndex: 1,
          },
          dryRun: true,
        },
      );

      const differentWindowPlan = await (distributeAgentTemplateToOrganizations as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          targetOrganizationIds: [
            "organizations_3",
            "organizations_2",
            "organizations_1",
          ],
          stagedRollout: {
            stageSize: 1,
            stageStartIndex: 0,
          },
          dryRun: true,
        },
      );

      expect(firstPlan.requestedTargetOrganizationIds).toEqual([
        "organizations_1",
        "organizations_2",
        "organizations_3",
      ]);
      expect(firstPlan.targetOrganizationIds).toEqual([
        "organizations_2",
        "organizations_3",
      ]);
      expect(firstPlan.rolloutWindow).toEqual({
        stageStartIndex: 1,
        stageSize: 2,
        requestedTargetCount: 3,
        stagedTargetCount: 2,
      });
      expect(firstPlan.plan.map((row: any) => row.organizationId)).toEqual([
        "organizations_2",
        "organizations_3",
      ]);
      expect(firstPlan.summary).toEqual({
        plan: {
          creates: 2,
          updates: 0,
          skips: 0,
          blocked: 0,
        },
        applied: {
          creates: 0,
          updates: 0,
          skips: 0,
          blocked: 0,
        },
      });
      expect(secondPlan.distributionJobId).toBe(firstPlan.distributionJobId);
      expect(differentWindowPlan.distributionJobId).not.toBe(firstPlan.distributionJobId);

      const rolloutActions = db
        .rows("objectActions")
        .filter((row) => row.actionType === "template_distribution_plan_generated");
      expect(rolloutActions).toHaveLength(3);
      expect(rolloutActions[0]?.actionData?.rolloutWindow).toEqual({
        stageStartIndex: 1,
        stageSize: 2,
        requestedTargetCount: 3,
        stagedTargetCount: 2,
      });
      expect(rolloutActions[0]?.actionData?.summary).toEqual({
        plan: {
          creates: 2,
          updates: 0,
          skips: 0,
          blocked: 0,
        },
        applied: {
          creates: 0,
          updates: 0,
          skips: 0,
          blocked: 0,
        },
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("applies locked/warn/free policy gates deterministically in rollout plans and summaries", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_515_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Policy Rollout",
        toolProfile: "general",
        modelId: "openai/gpt-4o-mini",
      });
      const snapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "rollout_policy_v1",
        },
      );
      seedWaeGateArtifact(db, {
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        templateVersionTag: "rollout_policy_v1",
        recordedAt: 1_700_515_000_000,
      });

      seedAgent(db, {
        _id: "objects_clone_locked",
        organizationId: "organizations_11",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "rollout_policy_v0",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          modelId: "anthropic/claude-sonnet",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "rollout_policy_v0",
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: {
              mode: "warn",
              fields: {
                modelId: { mode: "locked" },
              },
            },
          },
        },
      });
      seedAgent(db, {
        _id: "objects_clone_warn",
        organizationId: "organizations_12",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "rollout_policy_v0",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          toolProfile: "support",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "rollout_policy_v0",
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: {
              mode: "warn",
              fields: {
                toolProfile: { mode: "warn" },
              },
            },
          },
        },
      });
      seedAgent(db, {
        _id: "objects_clone_free",
        organizationId: "organizations_13",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "rollout_policy_v0",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          toolProfile: "support",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "rollout_policy_v0",
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: {
              mode: "warn",
              fields: {
                toolProfile: { mode: "free" },
              },
            },
          },
        },
      });

      const dryRunBlocked = await (distributeAgentTemplateToOrganizations as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          targetOrganizationIds: [
            "organizations_11",
            "organizations_12",
            "organizations_13",
          ],
          dryRun: true,
        },
      );

      expect(dryRunBlocked.plan.map((row: any) => [row.organizationId, row.operation, row.reason])).toEqual([
        ["organizations_11", "blocked", "locked_override_fields"],
        ["organizations_12", "blocked", "warn_override_confirmation_required"],
        ["organizations_13", "update", "template_version_drift"],
      ]);
      expect(dryRunBlocked.policyGates).toEqual({
        blockedLocked: 1,
        blockedWarnConfirmation: 1,
        warnConfirmed: 0,
        free: 1,
      });

      const applied = await (distributeAgentTemplateToOrganizations as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          targetOrganizationIds: [
            "organizations_11",
            "organizations_12",
            "organizations_13",
          ],
          dryRun: false,
          overridePolicyGate: {
            confirmWarnOverride: true,
            reason: "approved org rollout exception",
          },
        },
      );

      expect(applied.summary).toEqual({
        plan: {
          creates: 0,
          updates: 2,
          skips: 0,
          blocked: 1,
        },
        applied: {
          creates: 0,
          updates: 2,
          skips: 0,
          blocked: 1,
        },
      });
      expect(applied.policyGates).toEqual({
        blockedLocked: 1,
        blockedWarnConfirmation: 0,
        warnConfirmed: 1,
        free: 1,
      });

      const blockedAudit = db
        .rows("auditLogs")
        .find((row) => row.action === "template_distribution_blocked");
      expect(blockedAudit?.metadata?.reason).toBe("locked_override_fields");
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("blocks template distribution when the latest WAE gate fails critical reason-code budget", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_516_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Gate Failed",
      });
      const snapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "rollout_gate_fail_v1",
        },
      );

      seedWaeGateArtifact(db, {
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        templateVersionTag: "rollout_gate_fail_v1",
        recordedAt: 1_700_516_000_000,
        status: "fail",
        reasonCode: "wae_gate_failed",
        scoreVerdict: "failed",
        scoreDecision: "hold",
        resultLabel: "FAIL",
        failedMetrics: ["scenario:OOO-001:tool_correctness"],
        observedCriticalCount: 1,
        observedReasonCodes: ["scenario:OOO-001:forbidden_tool_used:manage_bookings"],
        unresolvedCriticalFailures: 1,
        snapshotFailedMetrics: ["scenario:OOO-001:tool_correctness"],
      });

      await (distributeAgentTemplateToOrganizations as any)
        ._handler(createCtx(db), {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          templateVersionId: snapshot.templateVersionId,
          targetOrganizationIds: ["organizations_7"],
          dryRun: true,
        })
        .then(
          () => {
            throw new Error("expected distributeAgentTemplateToOrganizations to fail");
          },
          (error: unknown) => {
            expect(String(error)).toContain("WAE rollout gate did not pass");
          },
        );

      const blockedAudit = db.rows("auditLogs").find(
        (row) => row.action === "agent_template.distribution_blocked_wae_gate",
      );
      expect(blockedAudit).toMatchObject({
        organizationId: ORG_ID,
        userId: OWNER_USER_ID,
        action: "agent_template.distribution_blocked_wae_gate",
        success: false,
      });
      expect(blockedAudit?.metadata).toMatchObject({
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        templateVersionTag: "rollout_gate_fail_v1",
        reasonCode: "wae_gate_failed",
      });
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe("agentOntology query paths: template distribution telemetry (ATH-012)", () => {
  it("returns deterministic job telemetry rows with rollback/error and affected-org summaries", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    db.seed("objectActions", {
      _id: "objectActions_1",
      organizationId: ORG_ID,
      objectId: "objects_template_1",
      actionType: "template_distribution_applied",
      actionData: {
        distributionJobId: "ath_dist_rollback_1",
        templateId: "objects_template_1",
        templateVersion: "v1",
        operationKind: "rollout_rollback",
        reason: "rollback_after_incident",
        dryRun: false,
        rolloutWindow: {
          stageStartIndex: 0,
          stageSize: 1,
          requestedTargetCount: 2,
          stagedTargetCount: 1,
        },
        summary: {
          plan: { creates: 0, updates: 1, skips: 0, blocked: 1 },
          applied: { creates: 0, updates: 0, skips: 0, blocked: 1 },
        },
        policyGates: {
          blockedLocked: 1,
          blockedWarnConfirmation: 0,
          warnConfirmed: 0,
          free: 0,
        },
        reasonCounts: {
          plan: { locked_override_fields: 1 },
          applied: { locked_override_fields: 1 },
        },
      },
      performedBy: OWNER_USER_ID,
      performedAt: 1_700_900_000_100,
    } as any);
    db.seed("objectActions", {
      _id: "objectActions_2",
      organizationId: ORG_ID,
      objectId: "objects_template_1",
      actionType: "template_distribution_plan_generated",
      actionData: {
        distributionJobId: "ath_dist_plan_1",
        templateId: "objects_template_1",
        templateVersion: "v2",
        operationKind: "rollout_apply",
        reason: "canary_window_1",
        dryRun: true,
        rolloutWindow: {
          stageStartIndex: 0,
          stageSize: 1,
          requestedTargetCount: 2,
          stagedTargetCount: 1,
        },
        summary: {
          plan: { creates: 0, updates: 1, skips: 0, blocked: 0 },
          applied: { creates: 0, updates: 0, skips: 0, blocked: 0 },
        },
        policyGates: {
          blockedLocked: 0,
          blockedWarnConfirmation: 0,
          warnConfirmed: 1,
          free: 0,
        },
        reasonCounts: {
          plan: { template_version_drift: 1 },
          applied: {},
        },
      },
      performedBy: OWNER_USER_ID,
      performedAt: 1_700_900_000_000,
    } as any);

    const result = await (listTemplateDistributionTelemetry as any)._handler(
      createCtx(db),
      {
        sessionId: SESSION_ID,
        templateId: "objects_template_1",
        limit: 20,
      },
    );

    expect(result.rows.map((row: any) => [row.distributionJobId, row.status])).toEqual([
      ["ath_dist_rollback_1", "completed_with_errors"],
      ["ath_dist_plan_1", "planned"],
    ]);
    expect(result.rows[0]).toMatchObject({
      operationKind: "rollout_rollback",
      affectedOrgCounts: {
        requested: 2,
        staged: 1,
        mutated: 0,
        blocked: 1,
      },
      policyGates: {
        blockedLocked: 1,
        blockedWarnConfirmation: 0,
        warnConfirmed: 0,
        free: 0,
      },
    });
    expect(result.summary).toEqual({
      totalJobs: 2,
      byStatus: {
        planned: 1,
        completed: 0,
        completedWithErrors: 1,
      },
      byOperationKind: {
        rolloutApply: 1,
        rolloutRollback: 1,
      },
      totalAffectedOrgs: {
        requested: 4,
        staged: 2,
        mutated: 0,
        blocked: 1,
      },
    });
  });
});

describe("agentOntology query paths: template drift report (ATH-006)", () => {
  it("returns deterministic target order and field-ordered drift diffs", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_600_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Drift",
        toolProfile: "general",
        enabledTools: ["list_events", "create_event"],
        disabledTools: ["manage_polymarket"],
        autonomyLevel: "autonomous",
        modelProvider: "openrouter",
        modelId: "openai/gpt-4o-mini",
        systemPrompt: "Template prompt",
        channelBindings: [
          { channel: "webchat", enabled: true, welcomeMessage: "Hi" },
          { channel: "slack", enabled: true },
        ],
      });
      const snapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "drift_v1",
        },
      );

      seedAgent(db, {
        _id: "objects_clone_b",
        organizationId: "organizations_9",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "drift_v1",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          toolProfile: "support",
          enabledTools: ["create_contact", "create_event", "list_events", "create_contact"],
          disabledTools: ["manage_bookings", "manage_polymarket"],
          autonomyLevel: "supervised",
          modelProvider: "anthropic",
          modelId: "claude-sonnet",
          systemPrompt: "Org override prompt",
          channelBindings: [
            { channel: "slack", enabled: false },
            { channel: "webchat", enabled: true, welcomeMessage: "Hello from clone" },
          ],
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "drift_v1",
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: {
              mode: "warn",
              fields: {
                modelProvider: { mode: "locked" },
                modelId: { mode: "locked" },
              },
            },
          },
        },
      });
      seedAgent(db, {
        _id: "objects_clone_a",
        organizationId: "organizations_8",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "drift_v1",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "drift_v1",
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: { mode: "warn" },
          },
        },
      });

      const result = await (getTemplateCloneDriftReport as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
        targetOrganizationIds: ["organizations_9", "organizations_8"],
      });

      expect(result.fields).toEqual([
        "toolProfile",
        "enabledTools",
        "disabledTools",
        "autonomyLevel",
        "modelProvider",
        "modelId",
        "systemPrompt",
        "channelBindings",
      ]);
      expect(result.targets.map((row: any) => row.organizationId)).toEqual([
        "organizations_8",
        "organizations_9",
      ]);

      const diffFields = result.targets[1]?.diff?.map((entry: any) => entry.field);
      expect(diffFields).toEqual([
        "toolProfile",
        "enabledTools",
        "disabledTools",
        "autonomyLevel",
        "modelProvider",
        "modelId",
        "systemPrompt",
        "channelBindings",
      ]);
      expect(result.targets[1]?.policyState).toBe("blocked");
      expect(result.targets[1]?.diff?.[1]).toMatchObject({
        field: "enabledTools",
        templateValue: ["create_event", "list_events"],
        cloneValue: ["create_contact", "create_event", "list_events"],
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("classifies in_sync/overridden/stale/blocked and keeps legacy fallback clones queryable", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_700_000_000);
    try {
      const created = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template States",
        toolProfile: "general",
        autonomyLevel: "autonomous",
        modelProvider: "openrouter",
        modelId: "openai/gpt-4o-mini",
        systemPrompt: "Baseline",
      });
      const snapshot = await (createAgentTemplateVersionSnapshot as any)._handler(
        createCtx(db),
        {
          sessionId: SESSION_ID,
          templateId: created.templateId,
          versionTag: "state_v1",
        },
      );

      seedAgent(db, {
        _id: "objects_clone_insync",
        organizationId: "organizations_1",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "state_v1",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          toolProfile: "general",
          autonomyLevel: "autonomous",
          modelProvider: "openrouter",
          modelId: "openai/gpt-4o-mini",
          systemPrompt: "Baseline",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "state_v1",
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: { mode: "warn" },
          },
        },
      });
      seedAgent(db, {
        _id: "objects_clone_override",
        organizationId: "organizations_2",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "state_v1",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          toolProfile: "support",
          autonomyLevel: "autonomous",
          modelProvider: "openrouter",
          modelId: "openai/gpt-4o-mini",
          systemPrompt: "Baseline",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "state_v1",
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: { mode: "free" },
          },
        },
      });
      seedAgent(db, {
        _id: "objects_clone_stale",
        organizationId: "organizations_3",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "state_v0",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          toolProfile: "general",
          autonomyLevel: "autonomous",
          modelProvider: "openrouter",
          modelId: "openai/gpt-4o-mini",
          systemPrompt: "Baseline",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "state_v0",
            cloneLifecycleState: "managed_override_pending_sync",
            overridePolicy: { mode: "warn" },
          },
        },
      });
      seedAgent(db, {
        _id: "objects_clone_blocked",
        organizationId: "organizations_4",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "state_v1",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          toolProfile: "general",
          autonomyLevel: "autonomous",
          modelProvider: "openrouter",
          modelId: "anthropic/claude-sonnet",
          systemPrompt: "Baseline",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: created.templateId,
            sourceTemplateVersion: "state_v1",
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: {
              mode: "warn",
              fields: {
                modelId: { mode: "locked" },
              },
            },
          },
        },
      });
      seedAgent(db, {
        _id: "objects_clone_legacy",
        organizationId: "organizations_5",
        customProperties: {
          templateAgentId: created.templateId,
          templateVersion: "state_v1",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          overridePolicy: {
            mode: "free",
            fields: {
              toolProfile: { mode: "free" },
              modelProvider: { mode: "free" },
              modelId: { mode: "free" },
            },
          },
          toolProfile: "support",
          autonomyLevel: "autonomous",
          modelProvider: "openrouter",
          modelId: "openai/gpt-4o-mini",
          systemPrompt: "Baseline",
        },
      });

      const result = await (getTemplateCloneDriftReport as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        templateId: created.templateId,
        templateVersionId: snapshot.templateVersionId,
      });

      const stateByClone = Object.fromEntries(
        result.targets.map((row: any) => [row.cloneAgentId, row.policyState]),
      );
      expect(stateByClone).toMatchObject({
        objects_clone_insync: "in_sync",
        objects_clone_override: "overridden",
        objects_clone_stale: "stale",
        objects_clone_blocked: "blocked",
        objects_clone_legacy: "overridden",
      });

      const legacy = result.targets.find((row: any) => row.cloneAgentId === "objects_clone_legacy");
      expect(legacy).toMatchObject({
        sourceTemplateVersion: "state_v1",
        cloneLifecycleState: "managed_in_sync",
        policyState: "overridden",
      });
      expect(legacy?.diff?.map((entry: any) => entry.field)).toEqual(["toolProfile"]);
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe("agentOntology query paths: template clone inventory (ATH-008)", () => {
  it("returns deterministic cross-org inventory rows with policy/risk filters", async () => {
    const db = new FakeDb();
    seedSession(db);

    getUserContextMock.mockResolvedValue({
      userId: OWNER_USER_ID,
      organizationId: ORG_ID,
      isGlobal: true,
      roleName: "super_admin",
    } as any);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_800_000_000);
    try {
      db.seed("organizations", { _id: "organizations_1", name: "Alpha Org" } as any);
      db.seed("organizations", { _id: "organizations_2", name: "Beta Org" } as any);
      db.seed("organizations", { _id: "organizations_3", name: "Gamma Org" } as any);

      const templateA = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Alpha",
        toolProfile: "general",
        modelProvider: "openrouter",
        modelId: "openai/gpt-4o-mini",
      });
      const templateB = await (createAgentTemplate as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        organizationId: ORG_ID,
        subtype: "general",
        name: "Template Beta",
        toolProfile: "support",
      });

      seedAgent(db, {
        _id: "objects_clone_insync",
        organizationId: "organizations_1",
        name: "Clone In Sync",
        customProperties: {
          templateAgentId: templateA.templateId,
          templateVersion: "v1",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          toolProfile: "general",
          modelProvider: "openrouter",
          modelId: "openai/gpt-4o-mini",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: templateA.templateId,
            sourceTemplateVersion: `${templateA.templateId}@1700800000000`,
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: { mode: "warn" },
          },
        },
      });
      seedAgent(db, {
        _id: "objects_clone_stale",
        organizationId: "organizations_2",
        name: "Clone Stale",
        customProperties: {
          templateAgentId: templateA.templateId,
          templateVersion: "old_v0",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          toolProfile: "general",
          modelProvider: "openrouter",
          modelId: "openai/gpt-4o-mini",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: templateA.templateId,
            sourceTemplateVersion: "old_v0",
            cloneLifecycleState: "managed_override_pending_sync",
            overridePolicy: {
              mode: "warn",
              fields: {
                modelProvider: { mode: "free" },
                modelId: { mode: "free" },
              },
            },
          },
        },
      });
      seedAgent(db, {
        _id: "objects_clone_blocked",
        organizationId: "organizations_3",
        name: "Clone Blocked",
        customProperties: {
          templateAgentId: templateB.templateId,
          templateVersion: "v2",
          cloneLifecycle: MANAGED_CLONE_LIFECYCLE,
          modelId: "anthropic/claude-sonnet",
          templateCloneLinkage: {
            contractVersion: "ath_template_clone_linkage_v1",
            sourceTemplateId: templateB.templateId,
            sourceTemplateVersion: `${templateB.templateId}@1700800000000`,
            cloneLifecycleState: "managed_in_sync",
            overridePolicy: {
              mode: "warn",
              fields: {
                modelId: { mode: "locked" },
              },
            },
          },
        },
      });

      const highRisk = await (listTemplateCloneInventory as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        filters: {
          riskLevel: "high",
        },
      });

      expect(highRisk.rows.map((row: any) => [row.organizationId, row.cloneAgentId])).toEqual([
        ["organizations_2", "objects_clone_stale"],
        ["organizations_3", "objects_clone_blocked"],
      ]);
      expect(highRisk.summary.byPolicyState).toMatchObject({
        in_sync: 0,
        overridden: 0,
        stale: 1,
        blocked: 1,
      });
      expect(highRisk.summary.byRisk).toMatchObject({
        high: 2,
        medium: 0,
        low: 0,
      });

      const templateFiltered = await (listTemplateCloneInventory as any)._handler(createCtx(db), {
        sessionId: SESSION_ID,
        filters: {
          templateId: templateA.templateId,
          policyState: "stale",
        },
      });
      expect(templateFiltered.rows).toHaveLength(1);
      expect(templateFiltered.rows[0]).toMatchObject({
        templateName: "Template Alpha",
        cloneAgentId: "objects_clone_stale",
        policyState: "stale",
        riskLevel: "high",
      });
    } finally {
      nowSpy.mockRestore();
    }
  });
});
