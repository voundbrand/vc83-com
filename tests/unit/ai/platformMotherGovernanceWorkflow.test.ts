import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildPlatformMotherDispatchExternalContactIdentifier,
  buildPlatformMotherInvocationMetadata,
  canUsePlatformMotherConversationTarget,
  selectPlatformMotherRuntimeInvocationTarget,
  PLATFORM_MOTHER_INVOCATION_CONTRACT_VERSION,
} from "../../../convex/ai/platformMotherControlPlane";
import {
  capturePlatformMotherProposalInternal,
  PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
  PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
} from "../../../convex/ai/platformMotherReviewArtifacts";
import { DEFAULT_ORG_AGENT_TEMPLATE_ROLE } from "../../../convex/agentOntology";
import {
  PLATFORM_MOTHER_AUTHORITY_ROLE,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
  PLATFORM_MOTHER_IDENTITY_ROLE,
  PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
  PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
} from "../../../convex/platformMother";

type FakeRow = Record<string, any> & { _id: string };
type Candidate = {
  _id: string;
  organizationId: string;
  type: string;
  name?: string;
  status?: string;
  updatedAt?: number;
  customProperties?: Record<string, unknown>;
};

const PLATFORM_ORG_ID = "organizations_platform";
const CUSTOMER_ORG_ID = "organizations_customer";
const CUSTOMER_ORG_B_ID = "organizations_customer_b";
const ACTOR_USER_ID = "users_customer";
const TEMPLATE_ID = "objects_operator_template";
const TEMPLATE_VERSION_ID = "objects_operator_template_version";
const MOTHER_SUPPORT_ID = "objects_mother_support";
const MOTHER_GOVERNANCE_ID = "objects_mother_governance";
const NON_MOTHER_AGENT_ID = "objects_not_mother";
const SUPPORT_CONVERSATION_ID = "aiConversations_support";
const CREATED_AT = 1_763_000_000_000;

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

function buildMotherRuntimeCandidate(args: {
  id: string;
  mode: "support" | "governance";
  runtimeRole: string;
  updatedAt?: number;
}): Candidate {
  return {
    _id: args.id,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent",
    name: PLATFORM_MOTHER_CANONICAL_NAME,
    status: "active",
    updatedAt: args.updatedAt ?? 0,
    customProperties: {
      authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
      identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
      runtimeMode: args.mode,
      runtimeRole: args.runtimeRole,
      agentClass: "internal_operator",
      protected: true,
    },
  };
}

function seedMotherRuntime(
  db: FakeDb,
  args: {
    id: string;
    mode: "support" | "governance";
    runtimeRole: string;
  },
) {
  db.seed("objects", {
    _id: args.id,
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
      runtimeMode: args.mode,
      runtimeRole: args.runtimeRole,
      agentClass: "internal_operator",
      protected: true,
    },
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
          agentClass: "internal_operator",
        },
      },
    },
  });

  seedWaeGateArtifact(db, {
    templateId: TEMPLATE_ID,
    templateVersionId: TEMPLATE_VERSION_ID,
    templateVersionTag: "operator_rollout_v1",
  });
}

function seedWaeGateArtifact(
  db: FakeDb,
  overrides: {
    templateId: string;
    templateVersionId: string;
    templateVersionTag: string;
  },
) {
  const recordedAt = Date.now();
  db.seed("objectActions", {
    _id: `objectActions_wae_${db.rows("objectActions").length + 1}`,
    organizationId: PLATFORM_ORG_ID,
    objectId: overrides.templateVersionId,
    actionType: "wae_rollout_gate.recorded",
    actionData: {
      contractVersion: "wae_rollout_gate_decision_v1",
      rolloutContractVersion: "wae_rollout_promotion_contract_v1",
      status: "pass",
      reasonCode: "pass",
      templateId: overrides.templateId,
      templateVersionId: overrides.templateVersionId,
      templateVersionTag: overrides.templateVersionTag,
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

function seedManagedClone(
  db: FakeDb,
  args: {
    organizationId: string;
    id: string;
    templateVersion?: string;
  },
) {
  db.seed("objects", {
    _id: args.id,
    organizationId: args.organizationId,
    type: "org_agent",
    subtype: "general",
    name: "Org Operator",
    status: "active",
    createdAt: CREATED_AT - 120,
    updatedAt: CREATED_AT - 120,
    customProperties: {
      templateAgentId: TEMPLATE_ID,
      templateVersion: args.templateVersion ?? "operator_rollout_v0",
      cloneLifecycle: "managed_use_case_clone_v1",
      systemPrompt: "Org-local prompt",
      agentClass: "internal_operator",
      templateCloneLinkage: {
        contractVersion: "ath_template_clone_linkage_v1",
        sourceTemplateId: TEMPLATE_ID,
        sourceTemplateVersion: args.templateVersion ?? "operator_rollout_v0",
        cloneLifecycleState: "managed_in_sync",
        overridePolicy: {
          mode: "free",
        },
      },
    },
  });
}

function seedSupportConversation(db: FakeDb, targetAgentId: string) {
  db.seed("aiConversations", {
    _id: SUPPORT_CONVERSATION_ID,
    organizationId: CUSTOMER_ORG_ID,
    userId: ACTOR_USER_ID,
    targetAgentId,
    status: "active",
    createdAt: CREATED_AT - 10,
    updatedAt: CREATED_AT - 5,
  });
}

describe("platform Mother governance workflow contracts", () => {
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

  it("selects the support runtime without falling back to governance", () => {
    const selected = selectPlatformMotherRuntimeInvocationTarget(
      [
        buildMotherRuntimeCandidate({
          id: "mother_governance",
          mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
          runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
          updatedAt: 2,
        }),
        buildMotherRuntimeCandidate({
          id: "mother_support",
          mode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
          runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
          updatedAt: 1,
        }),
      ],
      { mode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT },
    );

    expect(selected?._id).toBe("mother_support");
  });

  it("selects the governance runtime deterministically", () => {
    const selected = selectPlatformMotherRuntimeInvocationTarget(
      [
        buildMotherRuntimeCandidate({
          id: "mother_governance_b",
          mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
          runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
          updatedAt: 5,
        }),
        buildMotherRuntimeCandidate({
          id: "mother_governance_a",
          mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
          runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
          updatedAt: 5,
        }),
      ],
      { mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE },
    );

    expect(selected?._id).toBe("mother_governance_a");
  });

  it("builds a governance dispatch envelope that stays off the desktop operator rail", () => {
    const metadata = buildPlatformMotherInvocationMetadata({
      mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
      source: "platform_mother_governance_dispatch",
      targetAgentId: "mother_governance",
      targetOrganizationId: "org_platform",
      requestingOrganizationId: "org_customer",
      metadata: {
        dryRunId: "dry_run_1",
      },
    });

    expect(metadata.skipOutbound).toBe(true);
    expect(metadata.workflowIntent).toBe("platform_mother_governance");
    expect(metadata.targetAgentId).toBe("mother_governance");
    expect(metadata.platformMotherInvocation).toEqual(
      expect.objectContaining({
        contractVersion: PLATFORM_MOTHER_INVOCATION_CONTRACT_VERSION,
        mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
        source: "platform_mother_governance_dispatch",
        requestingOrganizationId: "org_customer",
      }),
    );
    expect(
      buildPlatformMotherDispatchExternalContactIdentifier({
        mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
        targetOrganizationId: "org_platform",
        requestingOrganizationId: "org_customer",
        dispatchKey: "dry_run_1",
      }),
    ).toBe("platform_mother:governance:org_customer:org_platform:dry_run_1");
  });

  it("allows Mother support conversations while blocking governance as a cross-org chat target", () => {
    const supportAllowed = canUsePlatformMotherConversationTarget({
      conversationOrganizationId: "org_customer",
      targetAgent: buildMotherRuntimeCandidate({
        id: "mother_support",
        mode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
      }),
    });
    const governanceAllowed = canUsePlatformMotherConversationTarget({
      conversationOrganizationId: "org_customer",
      targetAgent: buildMotherRuntimeCandidate({
        id: "mother_governance",
        mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
        runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
      }),
    });

    expect(supportAllowed).toBe(true);
    expect(governanceAllowed).toBe(false);
  });

  it("captures support proposals as Mother review artifacts with dry-run lifecycle evidence only", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedMotherRuntime(db, {
      id: MOTHER_SUPPORT_ID,
      mode: "support",
      runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
    });
    seedManagedClone(db, {
      organizationId: CUSTOMER_ORG_ID,
      id: "objects_customer_clone",
    });
    seedSupportConversation(db, MOTHER_SUPPORT_ID);

    const beforeClone = db.rows("objects").find(
      (row) => row._id === "objects_customer_clone",
    );

    const result = await (capturePlatformMotherProposalInternal as any)._handler(
      createCtx(db),
      {
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        actorUserId: ACTOR_USER_ID,
        sourceConversationId: SUPPORT_CONVERSATION_ID,
        proposalSummary: "Tighten operator onboarding handoff and escalation wording.",
        proposalDetails: "Capture customer-facing support signal only.",
      },
    );

    expect(result.artifact.targetTemplateRole).toBe(DEFAULT_ORG_AGENT_TEMPLATE_ROLE);
    expect(result.artifact.targetTemplateId).toBe(TEMPLATE_ID);
    expect(result.artifact.targetTemplateVersionId).toBe(TEMPLATE_VERSION_ID);
    expect(result.artifact.targetTemplateVersionTag).toBe("operator_rollout_v1");
    expect(result.artifact.requestingOrganizationId).toBe(CUSTOMER_ORG_ID);
    expect(result.artifact.sourceConversationId).toBe(SUPPORT_CONVERSATION_ID);
    expect(result.artifact.sourceMotherRuntimeId).toBe(MOTHER_SUPPORT_ID);
    expect(result.artifact.executionStatus).toBe("dry_run_pending");
    expect(result.artifact.execution.templateDistributionJobId).toBe(
      result.dryRun?.distributionJobId,
    );
    expect(result.artifact.policyFamilyScope).toEqual(
      expect.objectContaining({
        motherOwnedWarnFields: expect.arrayContaining(["systemPrompt"]),
        outOfScopeFields: [],
        eligible: true,
      }),
    );
    expect(result.artifact.rolloutGateRequirements).toEqual(
      expect.objectContaining({
        requiredEvidence: ["wae_rollout_gate"],
        satisfiedEvidence: ["wae_rollout_gate"],
        status: "satisfied_for_review",
        dryRunCorrelationId: result.dryRun?.distributionJobId,
      }),
    );
    expect(result.artifact.execution.downstreamObjectActionIds).toEqual([
      result.dryRun?.lifecycleActionId,
    ]);
    expect(result.dryRun?.targetOrganizationIds).toEqual([CUSTOMER_ORG_ID]);
    expect(result.dryRun?.plan[0]).toEqual(
      expect.objectContaining({
        organizationId: CUSTOMER_ORG_ID,
        operation: "blocked",
        reason: "warn_override_confirmation_required",
      }),
    );
    expect(result.dryRun?.plan[0]?.policyGate).toEqual(
      expect.objectContaining({
        decision: "blocked_warn_confirmation_required",
      }),
    );

    const objectActions = db.rows("objectActions");
    expect(
      objectActions.some(
        (row) =>
          row.objectId === TEMPLATE_ID
          && row.actionType === "template_distribution_plan_generated",
      ),
    ).toBe(true);
    expect(
      objectActions.some(
        (row) =>
          row.objectId === result.artifactId
          && row.actionType === PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
      ),
    ).toBe(true);
    expect(
      objectActions.some((row) =>
        row.actionType === "template_distribution_applied"
        || row.actionType === "template_distribution_created"
        || row.actionType === "template_distribution_updated",
      ),
    ).toBe(false);

    const reviewArtifactRow = db.rows("objects").find((row) => row._id === result.artifactId);
    expect(reviewArtifactRow).toEqual(
      expect.objectContaining({
        organizationId: PLATFORM_ORG_ID,
        type: PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
        status: "pending",
      }),
    );

    const afterClone = db.rows("objects").find(
      (row) => row._id === "objects_customer_clone",
    );
    expect(afterClone?.customProperties).toEqual(beforeClone?.customProperties);
  });

  it("captures governance proposals against explicit rollout targets via the existing dry-run engine", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedMotherRuntime(db, {
      id: MOTHER_GOVERNANCE_ID,
      mode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    });
    seedManagedClone(db, {
      organizationId: CUSTOMER_ORG_ID,
      id: "objects_customer_clone_a",
    });

    const result = await (capturePlatformMotherProposalInternal as any)._handler(
      createCtx(db),
      {
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
        actorUserId: ACTOR_USER_ID,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        dryRunTargetOrganizationIds: [
          CUSTOMER_ORG_B_ID,
          CUSTOMER_ORG_ID,
          CUSTOMER_ORG_ID,
        ],
        proposalSummary: "Assess rollout scope before any publish or sync action.",
      },
    );

    expect(result.artifact.sourceMotherRuntimeId).toBe(MOTHER_GOVERNANCE_ID);
    expect(result.dryRun?.targetOrganizationIds).toEqual([
      CUSTOMER_ORG_B_ID,
      CUSTOMER_ORG_ID,
    ].sort((left, right) => left.localeCompare(right)));
    expect(result.artifact.policyFamilyScope.outOfScopeFields).toEqual([]);
    expect(result.artifact.rolloutGateRequirements.status).toBe(
      "satisfied_for_review",
    );
    expect(
      result.dryRun?.plan.map((row: any) => [row.organizationId, row.operation]),
    ).toEqual([
      [CUSTOMER_ORG_ID, "blocked"],
      [CUSTOMER_ORG_B_ID, "create"],
    ]);
    expect(result.artifact.executionStatus).toBe("dry_run_pending");
  });

  it("rejects support proposal capture when the conversation target is not an active Mother support runtime", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedMotherRuntime(db, {
      id: MOTHER_GOVERNANCE_ID,
      mode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    });
    seedSupportConversation(db, MOTHER_GOVERNANCE_ID);

    await expect(
      (capturePlatformMotherProposalInternal as any)._handler(createCtx(db), {
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        actorUserId: ACTOR_USER_ID,
        sourceConversationId: SUPPORT_CONVERSATION_ID,
        proposalSummary: "This should fail closed.",
      }),
    ).rejects.toThrow(/active Mother runtime for the requested proposal mode/i);
  });

  it("rejects unsupported target template roles outside personal_life_operator_template", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedMotherRuntime(db, {
      id: MOTHER_GOVERNANCE_ID,
      mode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    });
    db.seed("objects", {
      _id: NON_MOTHER_AGENT_ID,
      organizationId: CUSTOMER_ORG_ID,
      type: "org_agent",
      subtype: "general",
      name: "Non Mother",
      status: "active",
      createdAt: CREATED_AT - 20,
      updatedAt: CREATED_AT - 20,
      customProperties: {
        agentClass: "internal_operator",
      },
    });

    await expect(
      (capturePlatformMotherProposalInternal as any)._handler(createCtx(db), {
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
        actorUserId: ACTOR_USER_ID,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        targetTemplateRole: "customer_telephony_anne_becker_template",
        proposalSummary: "Telephony should remain outside Mother proposal scope.",
      }),
    ).rejects.toThrow(/personal_life_operator_template/i);
  });
});
