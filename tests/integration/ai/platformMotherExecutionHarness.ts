import {
  DEFAULT_ORG_AGENT_TEMPLATE_ROLE,
  DEFAULT_OPERATOR_CONTEXT_ID,
} from "../../../convex/agentOntology";
import {
  createPlatformMotherReviewArtifactInternal,
  type PlatformMotherReviewArtifactKind,
} from "../../../convex/ai/platformMotherReviewArtifacts";
import {
  PLATFORM_MOTHER_AUTHORITY_ROLE,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
  PLATFORM_MOTHER_IDENTITY_ROLE,
} from "../../../convex/platformMother";

type FakeRow = Record<string, any> & { _id: string };

export const PLATFORM_ORG_ID = "organizations_platform";
export const CUSTOMER_ORG_A_ID = "organizations_customer_a";
export const CUSTOMER_ORG_B_ID = "organizations_customer_b";
export const REQUESTER_USER_ID = "users_requester";
export const APPROVER_USER_ID = "users_approver";
export const TEMPLATE_ID = "objects_operator_template";
export const PUBLISHED_TEMPLATE_VERSION_ID = "objects_operator_template_v1";
export const DRAFT_TEMPLATE_VERSION_ID = "objects_operator_template_v2";
export const MOTHER_GOVERNANCE_ID = "objects_mother_governance";
export const CREATED_AT = 1_763_000_000_000;

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

export class FakeDb {
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

export function createCtx(db: FakeDb) {
  return { db } as any;
}

export function seedOrganization(
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

export function seedMotherGovernanceRuntime(db: FakeDb) {
  db.seed("objects", {
    _id: MOTHER_GOVERNANCE_ID,
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
      runtimeMode: "governance",
      runtimeRole: PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE,
      agentClass: "internal_operator",
      protected: true,
      canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
      legacyIdentityAliases: ["Quinn"],
    },
  });
}

export function seedCanonicalOperatorTemplate(db: FakeDb) {
  db.seed("objects", {
    _id: TEMPLATE_ID,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent",
    subtype: "general",
    name: "One-of-One Operator Template",
    status: "template",
    createdAt: CREATED_AT - 200,
    updatedAt: CREATED_AT - 60,
    customProperties: {
      protected: true,
      templateRole: DEFAULT_ORG_AGENT_TEMPLATE_ROLE,
      templatePublishedVersion: "operator_rollout_v1",
      templatePublishedVersionId: PUBLISHED_TEMPLATE_VERSION_ID,
      templateLifecycleStatus: "published",
      systemPrompt: "Platform operator prompt v1",
      agentClass: "internal_operator",
    },
  });

  db.seed("objects", {
    _id: PUBLISHED_TEMPLATE_VERSION_ID,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent_template_version",
    subtype: "general",
    name: "One-of-One Operator Template @ operator_rollout_v1",
    status: "template_version",
    createdAt: CREATED_AT - 180,
    updatedAt: CREATED_AT - 150,
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

  db.seed("objects", {
    _id: DRAFT_TEMPLATE_VERSION_ID,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent_template_version",
    subtype: "general",
    name: "One-of-One Operator Template @ operator_rollout_v2",
    status: "template_version",
    createdAt: CREATED_AT - 120,
    updatedAt: CREATED_AT - 90,
    customProperties: {
      sourceTemplateId: TEMPLATE_ID,
      versionTag: "operator_rollout_v2",
      lifecycleStatus: "draft",
      snapshot: {
        baselineCustomProperties: {
          systemPrompt: "Platform operator prompt v2",
          agentClass: "internal_operator",
        },
      },
    },
  });
}

export function seedWaeGateArtifact(
  db: FakeDb,
  args?: {
    templateVersionId?: string;
    templateVersionTag?: string;
    runId?: string;
  },
) {
  const recordedAt = Date.now();
  db.seed("objectActions", {
    _id: `objectActions_wae_${args?.templateVersionId || "v1"}`,
    organizationId: PLATFORM_ORG_ID,
    objectId: args?.templateVersionId || PUBLISHED_TEMPLATE_VERSION_ID,
    actionType: "wae_rollout_gate.recorded",
    actionData: {
      contractVersion: "wae_rollout_gate_decision_v1",
      rolloutContractVersion: "wae_rollout_promotion_contract_v1",
      status: "pass",
      reasonCode: "pass",
      templateId: TEMPLATE_ID,
      templateVersionId: args?.templateVersionId || PUBLISHED_TEMPLATE_VERSION_ID,
      templateVersionTag: args?.templateVersionTag || "operator_rollout_v1",
      runId: args?.runId || "wae_run_1",
      suiteKeyHash: "suite_hash_1",
      scenarioMatrixContractVersion: "wae_matrix_v1",
      completedAt: recordedAt,
      recordedAt,
      recordedByUserId: APPROVER_USER_ID,
      freshnessWindowMs: 72 * 60 * 60 * 1000,
      score: {
        verdict: "passed",
        decision: "proceed",
        resultLabel: "PASS",
        weightedScore: 0.94,
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
    performedBy: APPROVER_USER_ID,
    performedAt: recordedAt,
  });
}

export function seedManagedClone(
  db: FakeDb,
  args: {
    organizationId: string;
    id: string;
    templateVersion?: string;
    systemPrompt?: string;
    operatorId?: string;
    isPrimary?: boolean;
  },
) {
  db.seed("objects", {
    _id: args.id,
    organizationId: args.organizationId,
    type: "org_agent",
    subtype: "general",
    name: "Org Operator",
    status: "active",
    createdAt: CREATED_AT - 80,
    updatedAt: CREATED_AT - 80,
    customProperties: {
      templateAgentId: TEMPLATE_ID,
      templateVersion: args.templateVersion || "operator_rollout_v1",
      cloneLifecycle: "managed_use_case_clone_v1",
      systemPrompt: args.systemPrompt || "Org-local prompt",
      agentClass: "internal_operator",
      templateCloneLinkage: {
        contractVersion: "ath_template_clone_linkage_v1",
        sourceTemplateId: TEMPLATE_ID,
        sourceTemplateVersion: args.templateVersion || "operator_rollout_v1",
        cloneLifecycleState: "managed_in_sync",
        overridePolicy: {
          mode: "free",
        },
      },
      ...(args.operatorId ? { operatorId: args.operatorId } : {}),
      ...(typeof args.isPrimary === "boolean" ? { isPrimary: args.isPrimary } : {}),
    },
  });
}

export function seedDryRunPlanEvidence(
  db: FakeDb,
  args?: {
    actionId?: string;
    distributionJobId?: string;
    requestedTargetOrganizationIds?: string[];
    stagedTargetOrganizationIds?: string[];
    templateVersionId?: string;
    templateVersionTag?: string;
  },
) {
  const requestedTargetOrganizationIds =
    args?.requestedTargetOrganizationIds
    || [CUSTOMER_ORG_A_ID, CUSTOMER_ORG_B_ID];
  const stagedTargetOrganizationIds =
    args?.stagedTargetOrganizationIds || requestedTargetOrganizationIds;
  const actionId = args?.actionId || "objectActions_dry_run_plan";
  const distributionJobId = args?.distributionJobId || "mother_dry_run_1";

  db.seed("objectActions", {
    _id: actionId,
    organizationId: PLATFORM_ORG_ID,
    objectId: TEMPLATE_ID,
    actionType: "template_distribution_plan_generated",
    actionData: {
      contractVersion: "ath_template_lifecycle_v1",
      distributionJobId,
      templateId: TEMPLATE_ID,
      templateVersionId: args?.templateVersionId || DRAFT_TEMPLATE_VERSION_ID,
      templateVersion: args?.templateVersionTag || "operator_rollout_v2",
      operationKind: "rollout_apply",
      reason: "platform_mother_migration_plan_dry_run",
      dryRun: true,
      requestedTargetOrganizationIds,
      targetOrganizationIds: stagedTargetOrganizationIds,
      rolloutWindow: {
        stageStartIndex: 0,
        stageSize: stagedTargetOrganizationIds.length,
        requestedTargetCount: requestedTargetOrganizationIds.length,
        stagedTargetCount: stagedTargetOrganizationIds.length,
      },
      summary: {
        plan: {
          creates: 1,
          updates: 1,
          skips: 0,
          blocked: 0,
        },
        applied: {
          creates: 0,
          updates: 0,
          skips: 0,
          blocked: 0,
        },
      },
      policyGates: {
        blockedLocked: 0,
        blockedWarnConfirmation: 0,
        warnConfirmed: 0,
        free: 1,
      },
      reasonCounts: {
        plan: {
          missing_clone: 1,
          template_version_drift: 1,
        },
        applied: {},
      },
      overridePolicyGate: {
        confirmWarnOverride: false,
        reason: null,
      },
    },
    performedBy: MOTHER_GOVERNANCE_ID,
    performedAt: CREATED_AT - 20,
  });

  return {
    actionId,
    distributionJobId,
    requestedTargetOrganizationIds,
    stagedTargetOrganizationIds,
  };
}

export async function createGovernanceReviewArtifact(
  db: FakeDb,
  args?: {
    artifactKind?: Exclude<PlatformMotherReviewArtifactKind, "proposal_review">;
    dryRunCorrelationId?: string;
    dryRunActionId?: string;
    requestedTargetOrganizationIds?: string[];
    stagedTargetOrganizationIds?: string[];
    targetTemplateVersionId?: string;
    targetTemplateVersionTag?: string;
  },
) {
  const requestedTargetOrganizationIds =
    args?.requestedTargetOrganizationIds
    || [CUSTOMER_ORG_A_ID, CUSTOMER_ORG_B_ID];
  const stagedTargetOrganizationIds =
    args?.stagedTargetOrganizationIds || requestedTargetOrganizationIds;

  return await (createPlatformMotherReviewArtifactInternal as any)._handler(
    createCtx(db),
    {
      actorUserId: REQUESTER_USER_ID,
      artifact: {
        artifactKind: args?.artifactKind || "migration_plan",
        targetTemplateRole: DEFAULT_ORG_AGENT_TEMPLATE_ROLE,
        targetTemplateId: TEMPLATE_ID,
        targetTemplateVersionId:
          args?.targetTemplateVersionId || DRAFT_TEMPLATE_VERSION_ID,
        targetTemplateVersionTag:
          args?.targetTemplateVersionTag || "operator_rollout_v2",
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        proposalSummary: "Approve the Mother-managed rollout packet.",
        proposalDetails:
          "Approved execution must reuse publish, distribution, and repair machinery.",
        execution: {
          status: "dry_run_pending",
          dryRunCorrelationId: args?.dryRunCorrelationId || "mother_dry_run_1",
          downstreamObjectActionIds: [
            args?.dryRunActionId || "objectActions_dry_run_plan",
          ],
          downstreamAuditLogIds: [],
          templateDistributionJobId:
            args?.dryRunCorrelationId || "mother_dry_run_1",
          executionSummary: "Persisted dry-run evidence for approved Mother execution.",
          recordedAt: CREATED_AT - 10,
        },
        aliasMigrationEvidence: {
          evidenceKind: "lookup_fallback",
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAlias: "Quinn",
          evidenceSummary:
            "Mother governance preserved Quinn alias-safe resolution for rollout execution.",
          matchedFields: ["canonicalIdentityName", "legacyIdentityAliases"],
          sourceTemplateId: TEMPLATE_ID,
          sourceTemplateVersionId:
            args?.targetTemplateVersionId || DRAFT_TEMPLATE_VERSION_ID,
          sourceTemplateVersionTag:
            args?.targetTemplateVersionTag || "operator_rollout_v2",
          recordedAt: CREATED_AT - 10,
        },
        reviewContext: {
          contractVersion: "platform_mother_review_context_v1",
          requestedTargetOrganizationIds,
          stagedTargetOrganizationIds,
          recentDistributionJobIds: [
            args?.dryRunCorrelationId || "mother_dry_run_1",
          ],
          rolloutWindow: {
            stageStartIndex: 0,
            stageSize: stagedTargetOrganizationIds.length,
            requestedTargetCount: requestedTargetOrganizationIds.length,
            stagedTargetCount: stagedTargetOrganizationIds.length,
            partialRolloutDetected:
              requestedTargetOrganizationIds.length
              !== stagedTargetOrganizationIds.length,
            historicalPartialRolloutDetected: false,
          },
          driftSummary: {
            totalOrganizations: requestedTargetOrganizationIds.length,
            missingCloneCount: requestedTargetOrganizationIds.includes(CUSTOMER_ORG_B_ID)
              ? 1
              : 0,
            interventionCount: requestedTargetOrganizationIds.length,
            reviewStateCounts: {
              missingClone: requestedTargetOrganizationIds.includes(CUSTOMER_ORG_B_ID)
                ? 1
                : 0,
              inSync: 0,
              overridden: 0,
              stale: 1,
              blocked: 0,
            },
            riskLevelCounts: {
              low: 0,
              medium: 0,
              high: requestedTargetOrganizationIds.length,
            },
          },
          interventionPackets: requestedTargetOrganizationIds.map((organizationId) => ({
            organizationId,
            organizationName:
              organizationId === CUSTOMER_ORG_A_ID ? "Customer A" : "Customer B",
            reviewState:
              organizationId === CUSTOMER_ORG_B_ID ? "missing_clone" : "stale",
            riskLevel: "high",
            reviewReasons:
              organizationId === CUSTOMER_ORG_B_ID
                ? ["missing_managed_clone"]
                : ["stale_template_version"],
            ...(organizationId === CUSTOMER_ORG_A_ID
              ? {
                  cloneAgentId: "objects_clone_customer_a",
                  cloneLifecycleState: "managed_in_sync",
                  sourceTemplateVersion: "operator_rollout_v1",
                }
              : {}),
            targetTemplateVersion:
              args?.targetTemplateVersionTag || "operator_rollout_v2",
            changedFields: ["systemPrompt"],
            blockedFields: [],
            overriddenFields: [],
          })),
        },
        createdAt: CREATED_AT - 10,
        createdByUserId: REQUESTER_USER_ID,
      },
    },
  );
}

export function seedPrimaryOverrideDriftClone(db: FakeDb) {
  seedManagedClone(db, {
    organizationId: CUSTOMER_ORG_A_ID,
    id: "objects_clone_customer_a",
    templateVersion: "operator_rollout_v1",
    systemPrompt: "Org-local prompt v1",
  });
}

export function seedExistingPrimaryPeer(db: FakeDb) {
  db.seed("objects", {
    _id: "objects_peer_customer_a",
    organizationId: CUSTOMER_ORG_A_ID,
    type: "org_agent",
    subtype: "general",
    name: "Legacy Peer",
    status: "active",
    createdAt: CREATED_AT - 70,
    updatedAt: CREATED_AT - 70,
    customProperties: {
      agentClass: "internal_operator",
      operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
      isPrimary: false,
    },
  });
}
