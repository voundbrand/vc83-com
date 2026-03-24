import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_OPERATOR_CONTEXT_ID } from "../../../convex/agentOntology";
import {
  PLATFORM_MOTHER_REVIEW_ACTION_APPROVED,
  PLATFORM_MOTHER_REVIEW_ACTION_EXECUTION_COMPLETED,
  executePlatformMotherApprovedReviewInternal,
  getPlatformMotherReviewArtifactInternal,
} from "../../../convex/ai/platformMotherReviewArtifacts";
import {
  APPROVER_USER_ID,
  CUSTOMER_ORG_A_ID,
  CUSTOMER_ORG_B_ID,
  DRAFT_TEMPLATE_VERSION_ID,
  FakeDb,
  MOTHER_GOVERNANCE_ID,
  PLATFORM_ORG_ID,
  TEMPLATE_ID,
  createCtx,
  createGovernanceReviewArtifact,
  seedCanonicalOperatorTemplate,
  seedDryRunPlanEvidence,
  seedExistingPrimaryPeer,
  seedMotherGovernanceRuntime,
  seedOrganization,
  seedPrimaryOverrideDriftClone,
  seedWaeGateArtifact,
} from "./platformMotherExecutionHarness";

describe("Platform Mother approved rollout integration", () => {
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

  it("dispatches approved Mother rollout through the existing publish, distribute, and repair paths", async () => {
    const db = new FakeDb();
    seedOrganization(db, { id: CUSTOMER_ORG_A_ID, name: "Customer A" });
    seedOrganization(db, { id: CUSTOMER_ORG_B_ID, name: "Customer B" });
    seedMotherGovernanceRuntime(db);
    seedCanonicalOperatorTemplate(db);
    seedWaeGateArtifact(db, {
      templateVersionId: DRAFT_TEMPLATE_VERSION_ID,
      templateVersionTag: "operator_rollout_v2",
    });
    seedDryRunPlanEvidence(db);
    seedPrimaryOverrideDriftClone(db);
    seedExistingPrimaryPeer(db);
    const artifact = await createGovernanceReviewArtifact(db);

    const result = await (executePlatformMotherApprovedReviewInternal as any)._handler(
      createCtx(db),
      {
        artifactId: artifact.artifactId,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        approval: {
          approverUserId: APPROVER_USER_ID,
          approverRole: "super_admin",
          reason: "Dry-run, alias, and rollout evidence reviewed.",
          ticketId: "OPS-PSA-011",
        },
        publishTemplateVersion: true,
        applyDistribution: true,
        repairPrimaryAgentContexts: true,
        overridePolicyGate: {
          confirmWarnOverride: true,
          reason: "Approved Mother rollout override confirmation.",
        },
      },
    );

    expect(result.executionPlan).toEqual({
      publishTemplateVersion: true,
      applyDistribution: true,
      repairPrimaryAgentContexts: true,
    });
    expect(result.publishResult?.templateVersionId).toBe(DRAFT_TEMPLATE_VERSION_ID);
    expect(result.distributionResult?.distributionJobId).toBe("mother_dry_run_1");
    expect(result.distributionResult?.summary.applied).toEqual({
      creates: 1,
      updates: 1,
      skips: 0,
      blocked: 0,
    });
    expect(result.repairResults).toHaveLength(2);

    const template = db.rows("objects").find((row) => row._id === TEMPLATE_ID);
    const draftVersion = db.rows("objects").find(
      (row) => row._id === DRAFT_TEMPLATE_VERSION_ID,
    );
    const cloneA = db.rows("objects").find(
      (row) => row._id === "objects_clone_customer_a",
    );
    const cloneB = db.rows("objects").find(
      (row) =>
        row.organizationId === CUSTOMER_ORG_B_ID
        && row.type === "org_agent"
        && row.customProperties?.templateAgentId === TEMPLATE_ID,
    );

    expect(template?.customProperties?.templatePublishedVersionId).toBe(
      DRAFT_TEMPLATE_VERSION_ID,
    );
    expect(template?.customProperties?.templatePublishedVersion).toBe(
      "operator_rollout_v2",
    );
    expect(draftVersion?.customProperties?.lifecycleStatus).toBe("published");
    expect(cloneA?.customProperties?.templateVersion).toBe("operator_rollout_v2");
    expect(cloneA?.customProperties?.systemPrompt).toBe(
      "Platform operator prompt v2",
    );
    expect(cloneA?.customProperties?.operatorId).toBe(DEFAULT_OPERATOR_CONTEXT_ID);
    expect(cloneA?.customProperties?.isPrimary).toBe(true);
    expect(cloneB?.customProperties?.templateVersion).toBe("operator_rollout_v2");
    expect(cloneB?.customProperties?.operatorId).toBe(DEFAULT_OPERATOR_CONTEXT_ID);
    expect(cloneB?.customProperties?.isPrimary).toBe(true);

    const actionTypes = db.rows("objectActions").map((row) => row.actionType);
    expect(actionTypes).toContain("agent_template.version_published");
    expect(actionTypes).toContain("template_distribution_applied");
    expect(actionTypes).toContain("template_distribution_updated");
    expect(actionTypes).toContain("template_distribution_created");
    expect(actionTypes).toContain("primary_agent_context_repaired");
    expect(actionTypes).toContain(PLATFORM_MOTHER_REVIEW_ACTION_APPROVED);
    expect(actionTypes).toContain(PLATFORM_MOTHER_REVIEW_ACTION_EXECUTION_COMPLETED);

    const repairActions = db.rows("objectActions").filter(
      (row) => row.actionType === "primary_agent_context_repaired",
    );
    expect(repairActions).toHaveLength(2);
    expect(
      repairActions.every(
        (row) => row.actionData?.reviewArtifactId === artifact.artifactId,
      ),
    ).toBe(true);
    const executionAction = db.rows("objectActions").find(
      (row) => row.actionType === PLATFORM_MOTHER_REVIEW_ACTION_EXECUTION_COMPLETED,
    );
    expect(executionAction?.actionData?.artifactId).toBe(artifact.artifactId);
    expect(executionAction?.actionData?.dryRunCorrelationId).toBe("mother_dry_run_1");

    expect(result.artifact.approvalStatus).toBe("approved");
    expect(result.artifact.executionStatus).toBe("executed_via_existing_lifecycle");
    expect(result.artifact.execution.dryRunCorrelationId).toBe("mother_dry_run_1");
    expect(
      result.artifact.execution.downstreamObjectActionIds.length,
    ).toBeGreaterThan(4);

    const loaded = await (getPlatformMotherReviewArtifactInternal as any)._handler(
      createCtx(db),
      {
        artifactId: artifact.artifactId,
      },
    );
    expect(loaded?.artifact.executionStatus).toBe("executed_via_existing_lifecycle");
    expect(
      loaded?.evidence.relatedObjectActions.some(
        (row: any) => row.actionType === "template_distribution_applied",
      ),
    ).toBe(true);
  });
});
