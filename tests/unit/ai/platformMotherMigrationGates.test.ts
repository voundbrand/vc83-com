import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_ORG_AGENT_TEMPLATE_ROLE,
  resolvePlatformMotherPolicyFamilyScope,
} from "../../../convex/agentOntology";
import { capturePlatformMotherProposalInternal } from "../../../convex/ai/platformMotherReviewArtifacts";
import {
  PLATFORM_MOTHER_AUTHORITY_ROLE,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_IDENTITY_ROLE,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
  PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
} from "../../../convex/platformMother";

type FakeRow = Record<string, any> & { _id: string };

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

  async collect() {
    return clone(
      this.rows.filter((row) => {
        for (const [field, value] of this.filters.entries()) {
          if (row[field] !== value) {
            return false;
          }
        }
        return true;
      }),
    );
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
    return clone(this.findById(id));
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

function createCtx(db: FakeDb) {
  return { db } as any;
}

const PLATFORM_ORG_ID = "organizations_platform";
const CUSTOMER_ORG_ID = "organizations_customer";
const ACTOR_USER_ID = "users_customer";
const TEMPLATE_ID = "objects_operator_template";
const TEMPLATE_VERSION_ID = "objects_operator_template_version";
const MOTHER_SUPPORT_ID = "objects_mother_support";
const SUPPORT_CONVERSATION_ID = "aiConversations_support";
const CREATED_AT = 1_763_000_000_000;

function seedMotherSupportRuntime(db: FakeDb) {
  db.seed("objects", {
    _id: MOTHER_SUPPORT_ID,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent",
    subtype: "general",
    name: PLATFORM_MOTHER_CANONICAL_NAME,
    status: "active",
    createdAt: CREATED_AT - 100,
    updatedAt: CREATED_AT,
    customProperties: {
      authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
      identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
      runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
      agentClass: "internal_operator",
      protected: true,
    },
  });
}

function seedSupportConversation(db: FakeDb) {
  db.seed("aiConversations", {
    _id: SUPPORT_CONVERSATION_ID,
    organizationId: CUSTOMER_ORG_ID,
    userId: ACTOR_USER_ID,
    targetAgentId: MOTHER_SUPPORT_ID,
    status: "active",
    createdAt: CREATED_AT - 10,
    updatedAt: CREATED_AT - 5,
  });
}

function seedCanonicalOperatorTemplate(db: FakeDb) {
  db.seed("objects", {
    _id: TEMPLATE_ID,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent",
    subtype: "general",
    name: "One-of-One Operator Template",
    status: "template",
    createdAt: CREATED_AT - 200,
    updatedAt: CREATED_AT - 50,
    customProperties: {
      protected: true,
      templateRole: DEFAULT_ORG_AGENT_TEMPLATE_ROLE,
      templatePublishedVersion: "operator_rollout_v1",
      templatePublishedVersionId: TEMPLATE_VERSION_ID,
      templateLifecycleStatus: "published",
      systemPrompt: "Platform operator prompt v1",
      channelBindings: [{ channel: "desktop", enabled: true }],
      agentClass: "internal_operator",
    },
  });

  db.seed("objects", {
    _id: TEMPLATE_VERSION_ID,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent_template_version",
    subtype: "general",
    name: "One-of-One Operator Template @ operator_rollout_v1",
    status: "template_version",
    createdAt: CREATED_AT - 150,
    updatedAt: CREATED_AT - 75,
    customProperties: {
      sourceTemplateId: TEMPLATE_ID,
      versionTag: "operator_rollout_v1",
      lifecycleStatus: "published",
      snapshot: {
        baselineCustomProperties: {
          systemPrompt: "Platform operator prompt v1",
          channelBindings: [{ channel: "desktop", enabled: true }],
          agentClass: "internal_operator",
        },
      },
    },
  });
}

function seedWaeGateArtifact(db: FakeDb) {
  const recordedAt = Date.now();
  db.seed("objectActions", {
    _id: "objectActions_wae_1",
    organizationId: PLATFORM_ORG_ID,
    objectId: TEMPLATE_VERSION_ID,
    actionType: "wae_rollout_gate.recorded",
    actionData: {
      contractVersion: "wae_rollout_gate_decision_v1",
      rolloutContractVersion: "wae_rollout_promotion_contract_v1",
      status: "pass",
      reasonCode: "pass",
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_ID,
      templateVersionTag: "operator_rollout_v1",
      runId: "wae_run_1",
      suiteKeyHash: "suite_hash_1",
      scenarioMatrixContractVersion: "wae_matrix_v1",
      completedAt: recordedAt,
      recordedAt,
      recordedByUserId: ACTOR_USER_ID,
      freshnessWindowMs: 72 * 60 * 60 * 1000,
      score: {
        verdict: "passed",
        decision: "proceed",
        resultLabel: "PASS",
        weightedScore: 0.93,
        thresholds: {
          pass: 0.85,
          hold: 0.65,
        },
        failedMetrics: [],
        warnings: [],
        blockedReasons: [],
      },
      scenarioCoverage: {
        totalScenarios: 8,
        runnableScenarios: 8,
        skippedScenarios: 0,
        passedScenarios: 8,
        failedScenarios: 0,
        evaluatedScenarioIds: ["scenario_1"],
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
    performedBy: ACTOR_USER_ID,
    performedAt: recordedAt,
  });
}

function seedManagedClone(db: FakeDb, overrides: Record<string, unknown>) {
  db.seed("objects", {
    _id: "objects_customer_clone",
    organizationId: CUSTOMER_ORG_ID,
    type: "org_agent",
    subtype: "general",
    name: "Org Operator",
    status: "active",
    createdAt: CREATED_AT - 120,
    updatedAt: CREATED_AT - 120,
    customProperties: {
      templateAgentId: TEMPLATE_ID,
      templateVersion: "operator_rollout_v0",
      cloneLifecycle: "managed_use_case_clone_v1",
      systemPrompt: "Org-local prompt",
      channelBindings: [{ channel: "desktop", enabled: true }],
      agentClass: "internal_operator",
      templateCloneLinkage: {
        contractVersion: "ath_template_clone_linkage_v1",
        sourceTemplateId: TEMPLATE_ID,
        sourceTemplateVersion: "operator_rollout_v0",
        cloneLifecycleState: "managed_in_sync",
        overridePolicy: {
          mode: "free",
        },
      },
      ...overrides,
    },
  });
}

describe("platform Mother migration gates", () => {
  const previousPlatformOrgId = process.env.PLATFORM_ORG_ID;
  const previousTestOrgId = process.env.TEST_ORG_ID;

  beforeEach(() => {
    delete process.env.PLATFORM_ORG_ID;
    process.env.TEST_ORG_ID = PLATFORM_ORG_ID;
  });

  afterEach(() => {
    if (previousPlatformOrgId === undefined) {
      delete process.env.PLATFORM_ORG_ID;
    } else {
      process.env.PLATFORM_ORG_ID = previousPlatformOrgId;
    }

    if (previousTestOrgId === undefined) {
      delete process.env.TEST_ORG_ID;
    } else {
      process.env.TEST_ORG_ID = previousTestOrgId;
    }
  });

  it("classifies Mother-governed template fields and blocks org-local rollout fields", () => {
    const scope = resolvePlatformMotherPolicyFamilyScope([
      "templateAgentId",
      "templateVersion",
      "systemPrompt",
      "channelBindings",
      "telephonyConfig",
    ]);

    expect(scope.motherOwnedLockedFields).toEqual([
      "templateAgentId",
      "templateVersion",
    ]);
    expect(scope.motherOwnedWarnFields).toEqual(["systemPrompt"]);
    expect(scope.outOfScopeFields).toEqual(["channelBindings", "telephonyConfig"]);
    expect(scope.customerOwnedContextFields).toContain("displayName");
    expect(scope.eligible).toBe(false);
  });

  it("records policy-family scope and satisfied rollout-gate requirements on successful review capture", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedWaeGateArtifact(db);
    seedMotherSupportRuntime(db);
    seedSupportConversation(db);
    seedManagedClone(db, {
      systemPrompt: "Org-local prompt",
    });

    const result = await (capturePlatformMotherProposalInternal as any)._handler(
      createCtx(db),
      {
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        actorUserId: ACTOR_USER_ID,
        sourceConversationId: SUPPORT_CONVERSATION_ID,
        proposalSummary: "Review the support-driven operator prompt refinement.",
      },
    );

    expect(result.artifact.policyFamilyScope).toEqual(
      expect.objectContaining({
        motherOwnedLockedFields: expect.arrayContaining([
          "templateCloneLinkage",
          "templateVersion",
        ]),
        motherOwnedWarnFields: expect.arrayContaining(["systemPrompt"]),
        outOfScopeFields: [],
        eligible: true,
      }),
    );
    expect(result.artifact.rolloutGateRequirements).toEqual(
      expect.objectContaining({
        targetTemplateRole: DEFAULT_ORG_AGENT_TEMPLATE_ROLE,
        targetTemplateVersionId: TEMPLATE_VERSION_ID,
        targetTemplateVersionTag: "operator_rollout_v1",
        requiredEvidence: ["wae_rollout_gate"],
        satisfiedEvidence: ["wae_rollout_gate"],
        status: "satisfied_for_review",
        dryRunCorrelationId: result.dryRun?.distributionJobId,
      }),
    );
  });

  it("fails closed when Mother governance would claim org-local channel routing fields", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedWaeGateArtifact(db);
    seedMotherSupportRuntime(db);
    seedSupportConversation(db);
    seedManagedClone(db, {
      channelBindings: [{ channel: "desktop", enabled: false }],
    });

    await expect(
      (capturePlatformMotherProposalInternal as any)._handler(createCtx(db), {
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        actorUserId: ACTOR_USER_ID,
        sourceConversationId: SUPPORT_CONVERSATION_ID,
        proposalSummary: "This should fail because channel routing is org-local.",
      }),
    ).rejects.toThrow(/customer-owned operator fields/i);
  });

  it("fails closed when WAE rollout evidence is missing for the target template version", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedMotherSupportRuntime(db);
    seedSupportConversation(db);
    seedManagedClone(db, {
      systemPrompt: "Org-local prompt",
    });

    await expect(
      (capturePlatformMotherProposalInternal as any)._handler(createCtx(db), {
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        actorUserId: ACTOR_USER_ID,
        sourceConversationId: SUPPORT_CONVERSATION_ID,
        proposalSummary: "Missing rollout evidence must fail closed.",
      }),
    ).rejects.toThrow(/WAE rollout gate/i);
  });
});
