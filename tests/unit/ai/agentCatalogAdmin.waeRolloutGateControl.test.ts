import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getCurrentDefaultTemplateWaeRolloutGateStatus,
  previewCurrentDefaultTemplateWaeRolloutGate,
  recordCurrentDefaultTemplateWaeRolloutGate,
} from "../../../convex/ai/agentCatalogAdmin";
import {
  WAE_EVAL_RUN_RECORD_CONTRACT_VERSION,
  WAE_EVAL_SCENARIO_RECORD_CONTRACT_VERSION,
  type WaeEvalRunRecordInput,
  type WaeEvalScenarioRecordInput,
} from "../../../convex/ai/tools/evalAnalystTool";
import {
  FakeDb,
  PLATFORM_ORG_ID,
  createCtx,
} from "../../integration/ai/platformMotherExecutionHarness";

const SUPER_ADMIN_ROLE_ID = "roles_super_admin";
const SUPER_ADMIN_USER_ID = "users_super_admin";
const SUPER_ADMIN_SESSION_ID = "sessions_super_admin";
const TEMPLATE_ID = "objects_operator_template";
const TEMPLATE_VERSION_ID = "objects_operator_template_v1";

function seedSuperAdmin(db: FakeDb) {
  db.seed("roles", {
    _id: SUPER_ADMIN_ROLE_ID,
    name: "super_admin",
    isActive: true,
  } as any);
  db.seed("users", {
    _id: SUPER_ADMIN_USER_ID,
    email: "super-admin@example.com",
    defaultOrgId: PLATFORM_ORG_ID,
    global_role_id: SUPER_ADMIN_ROLE_ID,
  } as any);
  db.seed("sessions", {
    _id: SUPER_ADMIN_SESSION_ID,
    userId: SUPER_ADMIN_USER_ID,
    organizationId: PLATFORM_ORG_ID,
    email: "super-admin@example.com",
    expiresAt: Date.now() + 60_000,
  } as any);
}

function seedProtectedOperatorTemplate(db: FakeDb) {
  db.seed("objects", {
    _id: TEMPLATE_ID,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent",
    subtype: "general",
    name: "One-of-One Operator Template",
    status: "template",
    createdAt: 1_763_000_000_000,
    updatedAt: 1_763_000_100_000,
    customProperties: {
      protected: true,
      templateRole: "personal_life_operator_template",
      templateLifecycleStatus: "published",
      templatePublishedVersionId: TEMPLATE_VERSION_ID,
      templatePublishedVersion: "template_v1",
      templateVersion: "template_v1",
    },
  } as any);
  db.seed("objects", {
    _id: TEMPLATE_VERSION_ID,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent_template_version",
    subtype: "general",
    name: "One-of-One Operator Template @ template_v1",
    status: "template_version",
    createdAt: 1_763_000_000_000,
    updatedAt: 1_763_000_100_000,
    customProperties: {
      sourceTemplateId: TEMPLATE_ID,
      versionTag: "template_v1",
      lifecycleStatus: "published",
    },
  } as any);
}

function makeWaeRunRecord(): WaeEvalRunRecordInput {
  return {
    contractVersion: WAE_EVAL_RUN_RECORD_CONTRACT_VERSION,
    runId: "wae_run_1",
    suiteKeyHash: "suite_hash_1",
    templateVersionTag: "template_v1",
    scenarioMatrixContractVersion: "wae_eval_scenario_matrix_v1",
    lifecycleStatus: "passed",
    counts: {
      scenarios: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
    },
    lifecycleEvidence: {
      pinManifestPath: "tmp/reports/wae/wae_run_1/lifecycle/pin-manifest.json",
      createReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/create-receipt.json",
      resetReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/reset-receipt.json",
      teardownReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/teardown-receipt.json",
      evidenceIndexPath: "tmp/reports/wae/wae_run_1/lifecycle/evidence-index.json",
    },
  };
}

function makeWaeScenarioRecord(scenarioId: string): WaeEvalScenarioRecordInput {
  return {
    contractVersion: WAE_EVAL_SCENARIO_RECORD_CONTRACT_VERSION,
    runId: "wae_run_1",
    suiteKeyHash: "suite_hash_1",
    scenarioId,
    agentId: "agent_operator",
    attempt: 1,
    executionMode: "RUN",
    expectedRuntimeVerdict: "RUN",
    actualVerdict: "PASSED",
    evaluationStatus: "passed",
    reasonCodes: [],
    observedTools: ["search_contacts"],
    observedOutcomes: ["handoff_completed"],
    skippedSubchecks: [],
    performance: {
      latencyMs: 3200,
      costUsd: 0.009,
      tokenCount: 420,
      observedToolCount: 1,
    },
    artifactPaths: {
      latestAttemptPath: `tmp/reports/wae/wae_run_1/scenarios/${scenarioId}/latest.json`,
      attemptIndexPath: `tmp/reports/wae/wae_run_1/scenarios/${scenarioId}/attempt-index.json`,
      playwrightMetadataPath: `tmp/reports/wae/wae_run_1/playwright/${scenarioId}/attempt-01.json`,
    },
    screenshotPaths: [`test-results/${scenarioId}/attempt-01.png`],
    lifecycleEvidence: {
      pinManifestPath: "tmp/reports/wae/wae_run_1/lifecycle/pin-manifest.json",
      createReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/create-receipt.json",
      resetReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/reset-receipt.json",
      teardownReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/teardown-receipt.json",
      evidenceIndexPath: "tmp/reports/wae/wae_run_1/lifecycle/evidence-index.json",
    },
  };
}

describe("agentCatalogAdmin current template WAE rollout gate controls", () => {
  const previousTestOrgId = process.env.TEST_ORG_ID;

  beforeEach(() => {
    process.env.TEST_ORG_ID = PLATFORM_ORG_ID;
  });

  afterEach(() => {
    if (previousTestOrgId === undefined) {
      delete process.env.TEST_ORG_ID;
    } else {
      process.env.TEST_ORG_ID = previousTestOrgId;
    }
  });

  it("reports current protected operator template gate status", async () => {
    const db = new FakeDb();
    seedSuperAdmin(db);
    seedProtectedOperatorTemplate(db);

    const result = await (getCurrentDefaultTemplateWaeRolloutGateStatus as any)._handler(
      createCtx(db),
      { sessionId: SUPER_ADMIN_SESSION_ID },
    );

    expect(result.template).toMatchObject({
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_ID,
      templateVersionTag: "template_v1",
    });
    expect(result.evaluation.allowed).toBe(false);
    expect(result.evaluation.reasonCode).toBe("wae_evidence_missing");
    expect(result.gate).toBeNull();
  });

  it("previews and records a passing WAE rollout gate for the current protected operator template", async () => {
    const db = new FakeDb();
    seedSuperAdmin(db);
    seedProtectedOperatorTemplate(db);
    const runRecord = makeWaeRunRecord();
    const scenarioRecords = [
      makeWaeScenarioRecord("Q-001"),
      makeWaeScenarioRecord("Q-002"),
    ];

    const preview = await (previewCurrentDefaultTemplateWaeRolloutGate as any)._handler(
      createCtx(db),
      {
        sessionId: SUPER_ADMIN_SESSION_ID,
        waeRunRecord: runRecord,
        waeScenarioRecords: scenarioRecords,
      },
    );

    expect(preview.template.templateVersionTag).toBe("template_v1");
    expect(preview.artifact.status).toBe("pass");
    expect(preview.canRecord).toBe(true);

    const recorded = await (recordCurrentDefaultTemplateWaeRolloutGate as any)._handler(
      createCtx(db),
      {
        sessionId: SUPER_ADMIN_SESSION_ID,
        waeRunRecord: runRecord,
        waeScenarioRecords: scenarioRecords,
      },
    );

    expect(recorded.artifact.status).toBe("pass");
    expect(recorded.evaluation.allowed).toBe(true);

    const gateAction = db.rows("objectActions").find(
      (row) => row.actionType === "wae_rollout_gate.recorded",
    );
    expect(gateAction?.objectId).toBe(TEMPLATE_VERSION_ID);
    expect(gateAction?.actionData?.templateId).toBe(TEMPLATE_ID);
    expect(gateAction?.actionData?.templateVersionTag).toBe("template_v1");
  });
});
