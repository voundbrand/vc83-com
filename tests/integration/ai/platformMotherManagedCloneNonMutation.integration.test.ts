import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { executePlatformMotherApprovedReviewInternal } from "../../../convex/ai/platformMotherReviewArtifacts";
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
  seedMotherGovernanceRuntime,
  seedOrganization,
  seedPrimaryOverrideDriftClone,
  seedWaeGateArtifact,
} from "./platformMotherExecutionHarness";

describe("Platform Mother managed clone non-mutation integration", () => {
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

  it("fails closed without approval and leaves managed clones untouched", async () => {
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
    const artifact = await createGovernanceReviewArtifact(db);

    const beforeTemplate = db.rows("objects").find((row) => row._id === TEMPLATE_ID);
    const beforeClone = db.rows("objects").find(
      (row) => row._id === "objects_clone_customer_a",
    );

    await expect(
      (executePlatformMotherApprovedReviewInternal as any)._handler(createCtx(db), {
        artifactId: artifact.artifactId,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        publishTemplateVersion: true,
        applyDistribution: true,
        repairPrimaryAgentContexts: true,
      }),
    ).rejects.toThrow(/approval envelope/i);

    const afterTemplate = db.rows("objects").find((row) => row._id === TEMPLATE_ID);
    const afterClone = db.rows("objects").find(
      (row) => row._id === "objects_clone_customer_a",
    );

    expect(afterTemplate?.customProperties).toEqual(beforeTemplate?.customProperties);
    expect(afterClone?.customProperties).toEqual(beforeClone?.customProperties);
    expect(
      db.rows("objectActions").some((row) =>
        row.actionType === "agent_template.version_published"
        || row.actionType === "template_distribution_applied"
        || row.actionType === "template_distribution_created"
        || row.actionType === "template_distribution_updated"
        || row.actionType === "primary_agent_context_repaired",
      ),
    ).toBe(false);
  });

  it("fails closed when persisted dry-run evidence is missing and does not mutate customer clones", async () => {
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
    const artifact = await createGovernanceReviewArtifact(db);
    await db.patch("objectActions_dry_run_plan", {
      actionType: "template_distribution_applied",
    });
    const beforeLifecycleMutationCount = db.rows("objectActions").filter((row) =>
      row._id !== "objectActions_dry_run_plan"
      && (
        row.actionType === "agent_template.version_published"
        || row.actionType === "template_distribution_applied"
        || row.actionType === "template_distribution_created"
        || row.actionType === "template_distribution_updated"
        || row.actionType === "primary_agent_context_repaired"
      ),
    ).length;

    const beforeClone = db.rows("objects").find(
      (row) => row._id === "objects_clone_customer_a",
    );

    await expect(
      (executePlatformMotherApprovedReviewInternal as any)._handler(createCtx(db), {
        artifactId: artifact.artifactId,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        approval: {
          approverUserId: APPROVER_USER_ID,
          approverRole: "super_admin",
          reason: "Dry-run evidence review attempted.",
        },
        publishTemplateVersion: true,
        applyDistribution: true,
        repairPrimaryAgentContexts: true,
      }),
    ).rejects.toThrow(/dry-run lifecycle evidence/i);

    const afterClone = db.rows("objects").find(
      (row) => row._id === "objects_clone_customer_a",
    );
    expect(afterClone?.customProperties).toEqual(beforeClone?.customProperties);
    const afterLifecycleMutationCount = db.rows("objectActions").filter((row) =>
      row._id !== "objectActions_dry_run_plan"
      && (
        row.actionType === "agent_template.version_published"
        || row.actionType === "template_distribution_applied"
        || row.actionType === "template_distribution_created"
        || row.actionType === "template_distribution_updated"
        || row.actionType === "primary_agent_context_repaired"
      ),
    ).length;
    expect(afterLifecycleMutationCount).toBe(beforeLifecycleMutationCount);
  });

  it("fails closed when alias-safe target resolution no longer matches the canonical template and leaves clones untouched", async () => {
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
    const artifact = await createGovernanceReviewArtifact(db);
    const artifactRow = db.rows("objects").find((row) => row._id === artifact.artifactId);
    await db.patch(artifact.artifactId, {
      customProperties: {
        ...(artifactRow?.customProperties ?? {}),
        aliasMigrationEvidence: {
          ...((artifactRow?.customProperties as Record<string, any>)?.aliasMigrationEvidence ?? {}),
          sourceTemplateId: "objects_wrong_template",
        },
      },
    });

    const beforeTemplate = db.rows("objects").find((row) => row._id === TEMPLATE_ID);
    const beforeClone = db.rows("objects").find(
      (row) => row._id === "objects_clone_customer_a",
    );

    await expect(
      (executePlatformMotherApprovedReviewInternal as any)._handler(createCtx(db), {
        artifactId: artifact.artifactId,
        sourceMotherRuntimeId: MOTHER_GOVERNANCE_ID,
        approval: {
          approverUserId: APPROVER_USER_ID,
          approverRole: "super_admin",
          reason: "Alias mismatch must fail closed.",
        },
        publishTemplateVersion: true,
        applyDistribution: true,
        repairPrimaryAgentContexts: true,
      }),
    ).rejects.toThrow(/canonical protected template/i);

    const afterTemplate = db.rows("objects").find((row) => row._id === TEMPLATE_ID);
    const afterClone = db.rows("objects").find(
      (row) => row._id === "objects_clone_customer_a",
    );
    expect(afterTemplate?.customProperties).toEqual(beforeTemplate?.customProperties);
    expect(afterClone?.customProperties).toEqual(beforeClone?.customProperties);
  });
});
