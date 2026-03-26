import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PLATFORM_MOTHER_SUPPORT_ENTRYPOINT_CONTRACT_VERSION,
  startPlatformMotherSupportConversation,
} from "../../../convex/ai/chat";
import {
  buildPlatformMotherDispatchExternalContactIdentifier,
  buildPlatformMotherInvocationMetadata,
  canUsePlatformMotherConversationTarget,
  selectPlatformMotherRuntimeInvocationTarget,
  PLATFORM_MOTHER_INVOCATION_CONTRACT_VERSION,
} from "../../../convex/ai/platformMotherControlPlane";
import {
  capturePlatformMotherGovernanceReviewInternal,
  capturePlatformMotherProposalInternal,
  configurePlatformMotherSupportReleaseInternal,
  getPlatformMotherReviewArtifactInternal,
  PLATFORM_MOTHER_REVIEW_ACTION_APPROVED,
  PLATFORM_MOTHER_REVIEW_ACTION_REJECTED,
  PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
  PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
  PLATFORM_MOTHER_SUPPORT_RELEASE_ACTION_UPDATED,
  PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_ACTION_UPDATED,
  reviewPlatformMotherArtifactInternal,
  setPlatformMotherSupportRouteFlagsInternal,
} from "../../../convex/ai/platformMotherReviewArtifacts";
import { DEFAULT_ORG_AGENT_TEMPLATE_ROLE } from "../../../convex/agentOntology";
import {
  PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
  PLATFORM_MOTHER_AUTHORITY_ROLE,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
  PLATFORM_MOTHER_IDENTITY_ROLE,
  PLATFORM_MOTHER_LEGACY_NAME,
  PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
  PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
  PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
  PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY,
  PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
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
const REVIEWER_USER_ID = "users_reviewer";
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
  supportRelease?: Record<string, unknown>;
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
      canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
      legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
      ...(args.mode === "support"
        ? {
            platformMotherSupportRelease:
              args.supportRelease ?? buildSupportRelease(),
          }
        : {}),
    },
  };
}

function buildSupportRelease(
  overrides: Partial<{
    stage: string;
    canaryOrganizationIds: string[];
  }> = {},
) {
  return {
    contractVersion: PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
    stage:
      overrides.stage ?? PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY,
    canaryOrganizationIds: overrides.canaryOrganizationIds ?? [],
    aliasCompatibilityMode: PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
    renameCleanupReady: false,
    reviewArtifactId: "objects_review_artifact",
    approvedByUserId: REVIEWER_USER_ID,
    reviewedAt: CREATED_AT,
  };
}

function seedMotherRuntime(
  db: FakeDb,
  args: {
    id: string;
    mode: "support" | "governance";
    runtimeRole: string;
    supportRelease?: Record<string, unknown>;
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
      canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
      legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
      agentClass: "internal_operator",
      protected: true,
      ...(args.mode === "support"
        ? {
            platformMotherSupportRelease:
              args.supportRelease ?? {
                contractVersion: PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
                stage: "internal_only",
                canaryOrganizationIds: [],
                aliasCompatibilityMode:
                  PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
                renameCleanupReady: false,
              },
          }
        : {}),
    },
  });
}

function seedOrganization(
  db: FakeDb,
  args: {
    id: string;
    name: string;
    onboardingLifecycleState?: string | null;
  },
) {
  db.seed("organizations", {
    _id: args.id,
    name: args.name,
    onboardingLifecycleState: args.onboardingLifecycleState ?? "claimed_workspace",
    createdAt: CREATED_AT - 300,
    updatedAt: CREATED_AT - 300,
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
  const previousIdentityEnabled = process.env.PLATFORM_MOTHER_IDENTITY_ENABLED;
  const previousSupportRouteEnabled = process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED;
  const previousRenameQuinnEnabled = process.env.PLATFORM_MOTHER_RENAME_QUINN_ENABLED;

  beforeEach(() => {
    delete process.env.PLATFORM_ORG_ID;
    process.env.TEST_ORG_ID = PLATFORM_ORG_ID;
    delete process.env.PLATFORM_MOTHER_IDENTITY_ENABLED;
    delete process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED;
    delete process.env.PLATFORM_MOTHER_RENAME_QUINN_ENABLED;
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

    if (previousIdentityEnabled === undefined) {
      delete process.env.PLATFORM_MOTHER_IDENTITY_ENABLED;
    } else {
      process.env.PLATFORM_MOTHER_IDENTITY_ENABLED = previousIdentityEnabled;
    }

    if (previousSupportRouteEnabled === undefined) {
      delete process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED;
    } else {
      process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED = previousSupportRouteEnabled;
    }

    if (previousRenameQuinnEnabled === undefined) {
      delete process.env.PLATFORM_MOTHER_RENAME_QUINN_ENABLED;
    } else {
      process.env.PLATFORM_MOTHER_RENAME_QUINN_ENABLED = previousRenameQuinnEnabled;
    }
  });

  function enableMotherSupportRouteFlags() {
    process.env.PLATFORM_MOTHER_IDENTITY_ENABLED = "true";
    process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED = "true";
  }

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

  it("fails closed for Mother support conversations until the support route canary is opened", () => {
    const supportBlocked = canUsePlatformMotherConversationTarget({
      conversationOrganizationId: "org_customer",
      targetAgent: buildMotherRuntimeCandidate({
        id: "mother_support",
        mode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
      }),
    });
    enableMotherSupportRouteFlags();
    const supportAllowed = canUsePlatformMotherConversationTarget({
      conversationOrganizationId: "org_customer",
      targetAgent: buildMotherRuntimeCandidate({
        id: "mother_support",
        mode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
        supportRelease: buildSupportRelease({
          stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
          canaryOrganizationIds: ["org_customer"],
        }),
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

    expect(supportBlocked).toBe(false);
    expect(supportAllowed).toBe(true);
    expect(governanceAllowed).toBe(false);
  });

  it("reuses the explicit Mother support entrypoint when an active support thread already exists", async () => {
    enableMotherSupportRouteFlags();

    const runAction = vi.fn(async () => ({
      agentId: MOTHER_SUPPORT_ID,
      organizationId: PLATFORM_ORG_ID,
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
      name: "Mother Support",
      status: "active",
      customProperties: {
        authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
        identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
        legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
        platformMotherSupportRelease: buildSupportRelease({
          stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
          canaryOrganizationIds: [CUSTOMER_ORG_ID],
        }),
      },
    }));
    const runQuery = vi.fn(async () => ({
      _id: SUPPORT_CONVERSATION_ID,
      status: "active" as const,
    }));
    const runMutation = vi.fn(async () => {
      throw new Error("createConversation should not run when an active Mother support thread exists.");
    });

    const result = await (startPlatformMotherSupportConversation as any)._handler(
      {
        runAction,
        runQuery,
        runMutation,
      },
      {
        organizationId: CUSTOMER_ORG_ID,
        userId: ACTOR_USER_ID,
        title: "Need platform help",
      },
    );

    expect(runMutation).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        contractVersion: PLATFORM_MOTHER_SUPPORT_ENTRYPOINT_CONTRACT_VERSION,
        conversationId: SUPPORT_CONVERSATION_ID,
        targetAgentId: MOTHER_SUPPORT_ID,
        targetOrganizationId: PLATFORM_ORG_ID,
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        conversationStatus: "active",
        entrypointStatus: "reused",
      }),
    );
  });

  it("creates an explicit Mother support conversation when no active support thread exists", async () => {
    enableMotherSupportRouteFlags();

    const runAction = vi.fn(async () => ({
      agentId: MOTHER_SUPPORT_ID,
      organizationId: PLATFORM_ORG_ID,
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
      name: "Mother Support",
      status: "active",
      customProperties: {
        authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
        identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
        legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
        platformMotherSupportRelease: buildSupportRelease({
          stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
          canaryOrganizationIds: [CUSTOMER_ORG_ID],
        }),
      },
    }));
    const runQuery = vi.fn(async () => null);
    const runMutation = vi.fn(async () => "aiConversations_new_support");

    const result = await (startPlatformMotherSupportConversation as any)._handler(
      {
        runAction,
        runQuery,
        runMutation,
      },
      {
        organizationId: CUSTOMER_ORG_ID,
        userId: ACTOR_USER_ID,
        title: "Need platform help",
      },
    );

    expect(runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: CUSTOMER_ORG_ID,
        userId: ACTOR_USER_ID,
        title: "Need platform help",
        targetAgentId: MOTHER_SUPPORT_ID,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        contractVersion: PLATFORM_MOTHER_SUPPORT_ENTRYPOINT_CONTRACT_VERSION,
        conversationId: "aiConversations_new_support",
        entrypointStatus: "created",
        conversationStatus: "active",
      }),
    );
  });

  it("fails closed when the explicit Mother support entrypoint is not rollout-enabled for the org", async () => {
    const runAction = vi.fn(async () => ({
      agentId: MOTHER_SUPPORT_ID,
      organizationId: PLATFORM_ORG_ID,
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
      name: "Mother Support",
      status: "active",
      customProperties: {
        authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
        identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
        legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
        platformMotherSupportRelease: buildSupportRelease({
          stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
          canaryOrganizationIds: ["organizations_other_canary"],
        }),
      },
    }));
    const runQuery = vi.fn();
    const runMutation = vi.fn();

    await expect(
      (startPlatformMotherSupportConversation as any)._handler(
        {
          runAction,
          runQuery,
          runMutation,
        },
        {
          organizationId: CUSTOMER_ORG_ID,
          userId: ACTOR_USER_ID,
          title: "Need platform help",
        },
      ),
    ).rejects.toThrow(/support entry is not enabled/i);

    expect(runQuery).not.toHaveBeenCalled();
    expect(runMutation).not.toHaveBeenCalled();
  });

  it("captures support proposals as Mother review artifacts with dry-run lifecycle evidence only", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedMotherRuntime(db, {
      id: MOTHER_SUPPORT_ID,
      mode: "support",
      runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
    });
    seedOrganization(db, {
      id: CUSTOMER_ORG_ID,
      name: "Customer A",
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
        requiredEvidence: ["template_certification"],
        satisfiedEvidence: ["template_certification"],
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

  it("approves a Mother review artifact through internal programmatic controls without executing lifecycle", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedMotherRuntime(db, {
      id: MOTHER_SUPPORT_ID,
      mode: "support",
      runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
    });
    seedMotherRuntime(db, {
      id: MOTHER_GOVERNANCE_ID,
      mode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    });
    seedManagedClone(db, {
      organizationId: CUSTOMER_ORG_ID,
      id: "objects_customer_clone_a",
    });
    seedSupportConversation(db, MOTHER_SUPPORT_ID);

    const proposal = await (capturePlatformMotherProposalInternal as any)._handler(
      createCtx(db),
      {
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        actorUserId: ACTOR_USER_ID,
        sourceConversationId: SUPPORT_CONVERSATION_ID,
        proposalSummary: "Approve the Mother support proposal for internal review.",
      },
    );

    const approved = await (reviewPlatformMotherArtifactInternal as any)._handler(
      createCtx(db),
      {
        artifactId: proposal.artifactId,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        decision: "approve",
        approval: {
          approverUserId: REVIEWER_USER_ID,
          approverRole: "super_admin",
          reason: "Programmatic review approved the proposal.",
          ticketId: "OPS-PSA-013",
        },
      },
    );

    expect(approved.artifact.approvalStatus).toBe("approved");
    expect(approved.artifact.executionStatus).toBe("approved_no_execution");
    expect(approved.artifact.approval?.approverUserId).toBe(REVIEWER_USER_ID);

    const loaded = await (getPlatformMotherReviewArtifactInternal as any)._handler(
      createCtx(db),
      {
        artifactId: proposal.artifactId,
      },
    );
    expect(
      loaded?.evidence.objectActions.some(
        (row: any) => row.actionType === PLATFORM_MOTHER_REVIEW_ACTION_APPROVED,
      ),
    ).toBe(true);
    expect(
      loaded?.evidence.objectActions.some(
        (row: any) => row.actionType === PLATFORM_MOTHER_REVIEW_ACTION_REJECTED,
      ),
    ).toBe(false);
  });

  it("rejects a Mother review artifact through internal programmatic controls and records audit evidence", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedMotherRuntime(db, {
      id: MOTHER_SUPPORT_ID,
      mode: "support",
      runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
    });
    seedMotherRuntime(db, {
      id: MOTHER_GOVERNANCE_ID,
      mode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    });
    seedManagedClone(db, {
      organizationId: CUSTOMER_ORG_ID,
      id: "objects_customer_clone_a",
    });
    seedSupportConversation(db, MOTHER_SUPPORT_ID);

    const proposal = await (capturePlatformMotherProposalInternal as any)._handler(
      createCtx(db),
      {
        runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
        actorUserId: ACTOR_USER_ID,
        sourceConversationId: SUPPORT_CONVERSATION_ID,
        proposalSummary: "Reject the Mother support proposal for missing detail.",
      },
    );

    const rejected = await (reviewPlatformMotherArtifactInternal as any)._handler(
      createCtx(db),
      {
        artifactId: proposal.artifactId,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        decision: "reject",
        rejection: {
          reviewerUserId: REVIEWER_USER_ID,
          reasonCode: "missing_risk_notes",
          reason: "Rollback and blast-radius notes are missing.",
          ticketId: "OPS-PSA-013-R",
        },
      },
    );

    expect(rejected.artifact.approvalStatus).toBe("rejected");
    expect(rejected.artifact.executionStatus).toBe("not_requested");
    expect(rejected.artifact.rejection?.reviewerUserId).toBe(REVIEWER_USER_ID);

    const loaded = await (getPlatformMotherReviewArtifactInternal as any)._handler(
      createCtx(db),
      {
        artifactId: proposal.artifactId,
      },
    );
    expect(
      loaded?.evidence.objectActions.some(
        (row: any) => row.actionType === PLATFORM_MOTHER_REVIEW_ACTION_REJECTED,
      ),
    ).toBe(true);
  });

  it("records a canary-approved Mother support release from an approved governance review artifact", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedOrganization(db, {
      id: CUSTOMER_ORG_ID,
      name: "Customer A",
    });
    seedOrganization(db, {
      id: CUSTOMER_ORG_B_ID,
      name: "Customer B",
    });
    seedMotherRuntime(db, {
      id: MOTHER_SUPPORT_ID,
      mode: "support",
      runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
    });
    seedMotherRuntime(db, {
      id: MOTHER_GOVERNANCE_ID,
      mode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    });
    seedManagedClone(db, {
      organizationId: CUSTOMER_ORG_ID,
      id: "objects_customer_clone_a",
    });

    const review = await (capturePlatformMotherGovernanceReviewInternal as any)._handler(
      createCtx(db),
      {
        artifactKind: "migration_plan",
        actorUserId: ACTOR_USER_ID,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        targetOrganizationIds: [CUSTOMER_ORG_B_ID, CUSTOMER_ORG_ID],
        stagedRollout: {
          stageSize: 1,
        },
      },
    );
    await (reviewPlatformMotherArtifactInternal as any)._handler(createCtx(db), {
      artifactId: review.artifactId,
      sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
      decision: "approve",
      approval: {
        approverUserId: REVIEWER_USER_ID,
        approverRole: "super_admin",
        reason: "Reviewed canary scope and Quinn rename safety evidence.",
      },
    });

    const release = await (configurePlatformMotherSupportReleaseInternal as any)._handler(
      createCtx(db),
      {
        artifactId: review.artifactId,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        supportRuntimeId: MOTHER_SUPPORT_ID,
        releaseStage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
        canaryOrganizationIds: [CUSTOMER_ORG_ID],
      },
    );

    expect(release.releaseStatus).toEqual(
      expect.objectContaining({
        contractVersion: PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
        stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
        canaryOrganizationIds: [CUSTOMER_ORG_ID],
        reviewArtifactId: review.artifactId,
        approvedByUserId: REVIEWER_USER_ID,
      }),
    );
    const supportRuntime = db.rows("objects").find((row) => row._id === MOTHER_SUPPORT_ID);
    expect(
      supportRuntime?.customProperties?.platformMotherSupportRelease,
    ).toEqual(expect.objectContaining({
      stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
      canaryOrganizationIds: [CUSTOMER_ORG_ID],
      reviewArtifactId: review.artifactId,
    }));
    expect(
      db.rows("objectActions").some(
        (row) => row.actionType === PLATFORM_MOTHER_SUPPORT_RELEASE_ACTION_UPDATED,
      ),
    ).toBe(true);
  });

  it("records Mother support route flags when a reviewed release is set live", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedOrganization(db, {
      id: CUSTOMER_ORG_ID,
      name: "Customer A",
    });
    seedMotherRuntime(db, {
      id: MOTHER_SUPPORT_ID,
      mode: "support",
      runtimeRole: PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
    });
    seedMotherRuntime(db, {
      id: MOTHER_GOVERNANCE_ID,
      mode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    });
    seedManagedClone(db, {
      organizationId: CUSTOMER_ORG_ID,
      id: "objects_customer_clone_a",
    });

    const review = await (capturePlatformMotherGovernanceReviewInternal as any)._handler(
      createCtx(db),
      {
        artifactKind: "migration_plan",
        actorUserId: ACTOR_USER_ID,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        targetOrganizationIds: [CUSTOMER_ORG_ID],
      },
    );
    await (reviewPlatformMotherArtifactInternal as any)._handler(createCtx(db), {
      artifactId: review.artifactId,
      sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
      decision: "approve",
      approval: {
        approverUserId: REVIEWER_USER_ID,
        approverRole: "super_admin",
        reason: "Reviewed live rollout artifact and Quinn alias safety evidence.",
      },
    });
    await (configurePlatformMotherSupportReleaseInternal as any)._handler(
      createCtx(db),
      {
        artifactId: review.artifactId,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        supportRuntimeId: MOTHER_SUPPORT_ID,
        releaseStage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY,
      },
    );

    const routeFlags = await (setPlatformMotherSupportRouteFlagsInternal as any)._handler(
      createCtx(db),
      {
        artifactId: review.artifactId,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        supportRuntimeId: MOTHER_SUPPORT_ID,
        actorUserId: REVIEWER_USER_ID,
        enabled: true,
      },
    );

    expect(routeFlags.routeFlags).toEqual(
      expect.objectContaining({
        contractVersion: PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
        identityEnabled: true,
        supportRouteEnabled: true,
        reviewArtifactId: review.artifactId,
        updatedByUserId: REVIEWER_USER_ID,
      }),
    );
    const supportRuntime = db.rows("objects").find((row) => row._id === MOTHER_SUPPORT_ID);
    expect(
      supportRuntime?.customProperties?.platformMotherSupportRouteFlags,
    ).toEqual(expect.objectContaining({
      identityEnabled: true,
      supportRouteEnabled: true,
      reviewArtifactId: review.artifactId,
    }));
    expect(
      db.rows("objectActions").some(
        (row) => row.actionType === PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_ACTION_UPDATED,
      ),
    ).toBe(true);
  });

  it("captures governance proposals against explicit rollout targets via the existing dry-run engine", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedMotherRuntime(db, {
      id: MOTHER_GOVERNANCE_ID,
      mode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    });
    seedOrganization(db, {
      id: CUSTOMER_ORG_ID,
      name: "Customer A",
    });
    seedOrganization(db, {
      id: CUSTOMER_ORG_B_ID,
      name: "Customer B",
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

  it("captures read-only migration review packets with partial-rollout and org-intervention context", async () => {
    const db = new FakeDb();
    seedCanonicalOperatorTemplate(db);
    seedOrganization(db, {
      id: CUSTOMER_ORG_ID,
      name: "Customer A",
    });
    seedOrganization(db, {
      id: CUSTOMER_ORG_B_ID,
      name: "Customer B",
    });
    seedMotherRuntime(db, {
      id: MOTHER_GOVERNANCE_ID,
      mode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
    });
    seedManagedClone(db, {
      organizationId: CUSTOMER_ORG_ID,
      id: "objects_customer_clone_a",
    });

    const beforeClone = db.rows("objects").find(
      (row) => row._id === "objects_customer_clone_a",
    );

    const result = await (capturePlatformMotherGovernanceReviewInternal as any)._handler(
      createCtx(db),
      {
        artifactKind: "migration_plan",
        actorUserId: ACTOR_USER_ID,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        targetOrganizationIds: [CUSTOMER_ORG_B_ID, CUSTOMER_ORG_ID],
        stagedRollout: {
          stageSize: 1,
        },
      },
    );

    expect(result.artifact.artifactKind).toBe("migration_plan");
    expect(result.artifact.reviewContext).toEqual(
      expect.objectContaining({
        requestedTargetOrganizationIds: [CUSTOMER_ORG_ID, CUSTOMER_ORG_B_ID],
        stagedTargetOrganizationIds: [CUSTOMER_ORG_ID],
        rolloutWindow: expect.objectContaining({
          requestedTargetCount: 2,
          stagedTargetCount: 1,
          partialRolloutDetected: true,
        }),
        driftSummary: expect.objectContaining({
          totalOrganizations: 2,
          missingCloneCount: 1,
          interventionCount: 2,
        }),
      }),
    );
    expect(result.artifact.aliasMigrationEvidence?.legacyIdentityAlias).toBe("Quinn");
    expect(result.artifact.execution.downstreamObjectActionIds).toEqual([
      result.dryRun.lifecycleActionId,
    ]);
    expect(result.reviewContext.interventionPackets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          organizationId: CUSTOMER_ORG_B_ID,
          reviewState: "missing_clone",
          reviewReasons: expect.arrayContaining([
            "missing_managed_clone",
            "partial_rollout_deferred",
          ]),
        }),
      ]),
    );

    const loaded = await (getPlatformMotherReviewArtifactInternal as any)._handler(
      createCtx(db),
      {
        artifactId: result.artifactId,
      },
    );
    expect(loaded?.evidence.relatedObjectActions).toHaveLength(1);
    expect(loaded?.evidence.relatedObjectActions[0]?.actionType).toBe(
      "template_distribution_plan_generated",
    );

    const objectActions = db.rows("objectActions");
    expect(
      objectActions.some((row) =>
        row.actionType === "template_distribution_applied"
        || row.actionType === "template_distribution_created"
        || row.actionType === "template_distribution_updated",
      ),
    ).toBe(false);

    const afterClone = db.rows("objects").find(
      (row) => row._id === "objects_customer_clone_a",
    );
    expect(afterClone?.customProperties).toEqual(beforeClone?.customProperties);
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
