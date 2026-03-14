import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type TestInfo } from "@playwright/test";
import {
  buildDeterministicWaeCanaryTimestampMs,
  emitWaeCanaryEvidenceBundle,
  type WaeCanaryRunContext,
} from "./utils/wae-canary-evidence";
import {
  emitWaeEvalArtifactBundle,
  resolveWaeRunContext,
  writeWaePlaywrightArtifactMetadata,
} from "./utils/wae-eval-artifact-bundle";
import { ensureWaeLifecycleArtifacts } from "./utils/wae-eval-fixture";
import { buildWaeScenarioDsl, type WaeScenarioDslRow } from "./utils/wae-scenario-dsl";
import {
  buildPassingScenarioEvidence,
  buildWaeDeterministicAttemptTimestampMs,
  evaluateWaeScenarioEvidence,
  executeWaeScenarioAttempt,
  isNegativePathScenario,
  type WaeScenarioObservedEvidence,
} from "./utils/wae-scenario-eval-harness";

const PRIMARY_RUN_CONTEXT = resolveWaeRunContext("wae-204-seeded-agent-evals");
const SUITE_RUN_ID = PRIMARY_RUN_CONTEXT.runId;
const RETRY_RUN_ID = `${SUITE_RUN_ID}-retry-retention`;
const dsl = buildWaeScenarioDsl();

const runnableScenarios = dsl.scenarios.filter((scenario) => scenario.runtime.verdict === "RUN");
const skippedScenarios = dsl.scenarios.filter((scenario) => scenario.runtime.verdict === "SKIPPED");
const criticalScenarios = runnableScenarios.filter(
  (scenario) =>
    scenario.priority === "P0"
    || scenario.requiredToolsAllOf.length > 0
    || scenario.requiredToolsAnyOf.length > 0
    || scenario.forbiddenTools.length > 0,
);
const negativePathScenarios = runnableScenarios.filter((scenario) => isNegativePathScenario(scenario));
const scenariosWithForbiddenTools = runnableScenarios.filter(
  (scenario) => scenario.forbiddenTools.length > 0,
);
const scenariosWithRequiredTools = runnableScenarios.filter(
  (scenario) => scenario.requiredToolsAllOf.length > 0 || scenario.requiredToolsAnyOf.length > 0,
);
const bundleOnlyScenarios = runnableScenarios.filter(
  (scenario) => !criticalScenarios.some((criticalScenario) => criticalScenario.id === scenario.id),
);
const canaryRollbackScenarioIds = criticalScenarios.slice(0, 12).map((scenario) => scenario.id);

const CANARY_PROMOTE_RUN_CONTEXT: WaeCanaryRunContext = {
  ...PRIMARY_RUN_CONTEXT,
  runId: `${SUITE_RUN_ID}-candidate-promote`,
};
const CANARY_ROLLBACK_RUN_CONTEXT: WaeCanaryRunContext = {
  ...PRIMARY_RUN_CONTEXT,
  runId: `${SUITE_RUN_ID}-candidate-rollback`,
};
const WAE_REPORTS_ROOT = path.join(process.cwd(), "tmp", "reports", "wae");

function stripNegativeOutcomes(outcomes: string[]): string[] {
  return outcomes.filter(
    (outcome) =>
      !(
        outcome.startsWith("failure_")
        || outcome.startsWith("refuses_")
        || outcome.startsWith("denies_")
        || outcome.startsWith("no_")
        || outcome.includes("deescalation")
        || outcome.includes("explicit_failure")
        || outcome.includes("high_stakes")
        || outcome.includes("human_handoff")
        || outcome.includes("privacy")
        || outcome.includes("blocked")
        || outcome.includes("flagged")
        || outcome.includes("negative_path_handled")
      ),
  );
}

function requiredToolFailureEvidence(scenario: WaeScenarioDslRow): WaeScenarioObservedEvidence {
  const passingEvidence = buildPassingScenarioEvidence(scenario);
  const observedTools = passingEvidence.observedTools.filter(
    (toolName) =>
      !scenario.requiredToolsAllOf.includes(toolName) && !scenario.requiredToolsAnyOf.includes(toolName),
  );
  return {
    ...passingEvidence,
    actualVerdict: "FAILED",
    observedTools,
    reasonCodes: [],
  };
}

function buildScenarioAttemptTimestamp(runId: string, scenarioId: string, attempt: number): number {
  return buildWaeDeterministicAttemptTimestampMs({
    runId,
    scenarioId,
    attempt,
  });
}

async function recordPlaywrightMetadata(args: {
  runId?: string;
  scenario: WaeScenarioDslRow;
  attempt: number;
  testId: string;
  title: string;
  projectName: string;
  outputDir: string;
  outputPath: (fileName: string) => string;
}): Promise<void> {
  await writeWaePlaywrightArtifactMetadata({
    runId: args.runId ?? SUITE_RUN_ID,
    scenarioId: args.scenario.id,
    attempt: args.attempt,
    testId: args.testId,
    title: args.title,
    projectName: args.projectName,
    outputDir: args.outputDir,
    tracePath: args.outputPath("trace.zip"),
    screenshotPaths: [args.outputPath("test-failed-1.png")],
    videoPath: args.outputPath("video.webm"),
    recordedAtMs: buildScenarioAttemptTimestamp(
      args.runId ?? SUITE_RUN_ID,
      args.scenario.id,
      args.attempt,
    ),
  });
}

function buildRollbackCanaryEvidence(scenario: WaeScenarioDslRow): WaeScenarioObservedEvidence {
  const passingEvidence = buildPassingScenarioEvidence(scenario);
  if (!canaryRollbackScenarioIds.includes(scenario.id)) {
    return passingEvidence;
  }

  const forbiddenTool = scenario.forbiddenTools[0];
  if (forbiddenTool) {
    return {
      ...passingEvidence,
      actualVerdict: "FAILED",
      observedTools: [...passingEvidence.observedTools, forbiddenTool],
      reasonCodes: [],
    };
  }

  const missingToolEvidence = passingEvidence.observedTools.filter(
    (toolName) =>
      !scenario.requiredToolsAllOf.includes(toolName) && !scenario.requiredToolsAnyOf.includes(toolName),
  );
  return {
    ...passingEvidence,
    actualVerdict: "FAILED",
    observedTools: missingToolEvidence,
    observedOutcomes: [],
    reasonCodes: [],
  };
}

async function emitSyntheticCanaryRun(args: {
  runContext: WaeCanaryRunContext;
  label: string;
  testInfo: TestInfo;
  buildEvidence?: (scenario: WaeScenarioDslRow) => WaeScenarioObservedEvidence;
}) {
  await fs.rm(path.join(WAE_REPORTS_ROOT, args.runContext.runId), {
    recursive: true,
    force: true,
  });
  await ensureWaeLifecycleArtifacts(args.runContext);

  for (const scenario of dsl.scenarios) {
    const attempt = 1;
    const evidence = args.buildEvidence
      ? args.buildEvidence(scenario)
      : buildPassingScenarioEvidence(scenario);
    await executeWaeScenarioAttempt({
      runId: args.runContext.runId,
      scenario,
      evidence,
      attempt,
      recordedAtMs: buildScenarioAttemptTimestamp(args.runContext.runId, scenario.id, attempt),
    });
    await recordPlaywrightMetadata({
      runId: args.runContext.runId,
      scenario,
      attempt,
      testId: `${args.testInfo.testId}:${args.label}:${scenario.id}`,
      title: `${args.testInfo.title} :: ${args.label} :: ${scenario.id}`,
      projectName: args.testInfo.project.name,
      outputDir: args.testInfo.outputDir,
      outputPath: (fileName) => args.testInfo.outputPath(`${args.label}-${scenario.id}-${fileName}`),
    });
  }

  return await emitWaeEvalArtifactBundle(args.runContext);
}

test.describe("WAE seeded-agent eval suites", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await Promise.all([
      fs.rm(path.join(WAE_REPORTS_ROOT, PRIMARY_RUN_CONTEXT.runId), {
        recursive: true,
        force: true,
      }),
      fs.rm(path.join(WAE_REPORTS_ROOT, RETRY_RUN_ID), {
        recursive: true,
        force: true,
      }),
      fs.rm(path.join(WAE_REPORTS_ROOT, CANARY_PROMOTE_RUN_CONTEXT.runId), {
        recursive: true,
        force: true,
      }),
      fs.rm(path.join(WAE_REPORTS_ROOT, CANARY_ROLLBACK_RUN_CONTEXT.runId), {
        recursive: true,
        force: true,
      }),
    ]);
    await ensureWaeLifecycleArtifacts(PRIMARY_RUN_CONTEXT);
  });

  test.afterAll(async () => {
    await emitWaeEvalArtifactBundle(PRIMARY_RUN_CONTEXT);
  });

  test("loads deterministic matrix slices for critical, negative, and pending-feature coverage", async () => {
    expect(dsl.contractVersion).toBe("wae_eval_playwright_scenario_dsl_v1");
    expect(dsl.matrixContractVersion).toBe("wae_eval_scenario_matrix_v1");
    expect(dsl.counts.scenarios).toBe(51);
    expect(runnableScenarios.length + skippedScenarios.length).toBe(dsl.counts.scenarios);
    expect(runnableScenarios.length).toBeGreaterThan(0);
    expect(skippedScenarios.length).toBeGreaterThan(0);
    expect(criticalScenarios.length).toBeGreaterThanOrEqual(28);
    expect(negativePathScenarios.length).toBeGreaterThanOrEqual(10);
  });

  for (const scenario of criticalScenarios) {
    test(`[critical-pathway] ${scenario.id} enforces required/forbidden tool contract`, async (
      {},
      testInfo,
    ) => {
      const evidence = buildPassingScenarioEvidence(scenario);
      const evaluation = evaluateWaeScenarioEvidence({ scenario, evidence });

      expect(evaluation.passed).toBe(true);
      expect(evaluation.reasonCodes).toEqual([]);
      expect(evaluation.expectedRuntimeVerdict).toBe("RUN");
      expect(evidence.actualVerdict).toBe("PASSED");

      const attempt = testInfo.retry + 1;
      const execution = await executeWaeScenarioAttempt({
        runId: SUITE_RUN_ID,
        scenario,
        evidence,
        attempt,
        recordedAtMs: buildScenarioAttemptTimestamp(SUITE_RUN_ID, scenario.id, attempt),
      });
      await recordPlaywrightMetadata({
        scenario,
        attempt,
        testId: testInfo.testId,
        title: testInfo.title,
        projectName: testInfo.project.name,
        outputDir: testInfo.outputDir,
        outputPath: (fileName) => testInfo.outputPath(fileName),
      });

      expect(execution.evaluation.passed).toBe(true);
      expect(execution.attemptArtifact.evaluationStatus).toBe("passed");
      expect(execution.index.latestAttempt).toBe(attempt);
    });
  }

  for (const scenario of skippedScenarios) {
    test(`[pending-feature-skipped] ${scenario.id} preserves SKIPPED semantics`, async ({}, testInfo) => {
      const evidence = buildPassingScenarioEvidence(scenario);
      const evaluation = evaluateWaeScenarioEvidence({ scenario, evidence });

      expect(evidence.actualVerdict).toBe("SKIPPED");
      expect(evidence.observedTools).toEqual([]);
      expect(evidence.observedOutcomes).toEqual([]);
      expect(evaluation.passed).toBe(true);
      expect(evaluation.expectedRuntimeVerdict).toBe("SKIPPED");
      expect(evidence.reasonCodes).toEqual([...scenario.runtime.reasonCodes].sort());
      expect(
        evidence.reasonCodes.some((reasonCode) => reasonCode.startsWith("pending_feature:")),
      ).toBe(true);

      const attempt = testInfo.retry + 1;
      const execution = await executeWaeScenarioAttempt({
        runId: SUITE_RUN_ID,
        scenario,
        evidence,
        attempt,
        recordedAtMs: buildScenarioAttemptTimestamp(SUITE_RUN_ID, scenario.id, attempt),
      });
      await recordPlaywrightMetadata({
        scenario,
        attempt,
        testId: testInfo.testId,
        title: testInfo.title,
        projectName: testInfo.project.name,
        outputDir: testInfo.outputDir,
        outputPath: (fileName) => testInfo.outputPath(fileName),
      });

      expect(execution.evaluation.passed).toBe(true);
      expect(execution.attemptArtifact.actualVerdict).toBe("SKIPPED");
      expect(execution.index.latestAttempt).toBe(attempt);
    });
  }

  test("emits scorer-ingestion source rows for remaining runnable scenarios", async ({}, testInfo) => {
    const createdScenarioIds: string[] = [];

    for (const scenario of bundleOnlyScenarios) {
      const attempt = testInfo.retry + 1;
      const evidence = buildPassingScenarioEvidence(scenario);
      const execution = await executeWaeScenarioAttempt({
        runId: SUITE_RUN_ID,
        scenario,
        evidence,
        attempt,
        recordedAtMs: buildScenarioAttemptTimestamp(SUITE_RUN_ID, scenario.id, attempt),
      });

      await recordPlaywrightMetadata({
        scenario,
        attempt,
        testId: `${testInfo.testId}:${scenario.id}`,
        title: `${testInfo.title} :: ${scenario.id}`,
        projectName: testInfo.project.name,
        outputDir: testInfo.outputDir,
        outputPath: (fileName) => testInfo.outputPath(`${scenario.id}-${fileName}`),
      });

      expect(execution.evaluation.passed).toBe(true);
      createdScenarioIds.push(scenario.id);
    }

    expect(createdScenarioIds).toEqual(bundleOnlyScenarios.map((scenario) => scenario.id));
  });

  test("forbidden tool non-usage violations are rejected deterministically", async () => {
    const mismatches = scenariosWithForbiddenTools
      .map((scenario) => {
        const forbiddenTool = scenario.forbiddenTools[0];
        if (!forbiddenTool) {
          return null;
        }
        const evidence = buildPassingScenarioEvidence(scenario);
        const invalidEvidence: WaeScenarioObservedEvidence = {
          ...evidence,
          actualVerdict: "FAILED",
          observedTools: [...evidence.observedTools, forbiddenTool],
        };
        const evaluation = evaluateWaeScenarioEvidence({ scenario, evidence: invalidEvidence });
        const expectedReasonCode = `forbidden_tool_used:${forbiddenTool}`;
        if (!evaluation.reasonCodes.includes(expectedReasonCode) || evaluation.passed) {
          return scenario.id;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value));

    expect(mismatches).toEqual([]);
  });

  test("required tool pathways fail closed when required tools are absent", async () => {
    const mismatches = scenariosWithRequiredTools
      .map((scenario) => {
        const evidence = requiredToolFailureEvidence(scenario);
        const evaluation = evaluateWaeScenarioEvidence({ scenario, evidence });
        if (evaluation.passed) {
          return scenario.id;
        }

        const hasAllOfFailureCoverage = scenario.requiredToolsAllOf.every((toolName) =>
          evaluation.reasonCodes.includes(`missing_required_tool:${toolName}`)
        );
        const hasAnyOfFailureCoverage =
          scenario.requiredToolsAnyOf.length === 0
          || evaluation.reasonCodes.includes("missing_required_any_tool");

        if (!hasAllOfFailureCoverage || !hasAnyOfFailureCoverage) {
          return scenario.id;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value));

    expect(mismatches).toEqual([]);
  });

  test("negative-path scenarios fail when negative outcomes are not present", async () => {
    const mismatches = negativePathScenarios
      .map((scenario) => {
        const evidence = buildPassingScenarioEvidence(scenario);
        const invalidEvidence: WaeScenarioObservedEvidence = {
          ...evidence,
          actualVerdict: "FAILED",
          observedOutcomes: stripNegativeOutcomes(evidence.observedOutcomes),
        };
        const evaluation = evaluateWaeScenarioEvidence({ scenario, evidence: invalidEvidence });
        if (!evaluation.reasonCodes.includes("negative_path_outcome_missing") || evaluation.passed) {
          return scenario.id;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value));

    expect(mismatches).toEqual([]);
  });

  test("deterministic retry attempts retain prior artifacts for replay evidence", async () => {
    await fs.rm(path.join(WAE_REPORTS_ROOT, RETRY_RUN_ID), {
      recursive: true,
      force: true,
    });
    const scenario = dsl.scenarios.find((candidate) => candidate.id === "Q-001");
    if (!scenario) {
      throw new Error("Expected Q-001 scenario to exist in WAE DSL.");
    }

    const firstAttemptEvidence: WaeScenarioObservedEvidence = {
      ...buildPassingScenarioEvidence(scenario),
      actualVerdict: "FAILED",
      observedTools: ["manage_bookings"],
      reasonCodes: [],
    };
    const firstAttempt = await executeWaeScenarioAttempt({
      runId: RETRY_RUN_ID,
      scenario,
      evidence: firstAttemptEvidence,
      attempt: 1,
      recordedAtMs: buildScenarioAttemptTimestamp(RETRY_RUN_ID, scenario.id, 1),
    });

    expect(firstAttempt.evaluation.passed).toBe(false);
    expect(firstAttempt.evaluation.reasonCodes).toContain("forbidden_tool_used:manage_bookings");
    expect(firstAttempt.index.latestAttempt).toBe(1);

    const secondAttemptEvidence = buildPassingScenarioEvidence(scenario);
    const secondAttempt = await executeWaeScenarioAttempt({
      runId: RETRY_RUN_ID,
      scenario,
      evidence: secondAttemptEvidence,
      attempt: 2,
      recordedAtMs: buildScenarioAttemptTimestamp(RETRY_RUN_ID, scenario.id, 2),
    });

    expect(secondAttempt.evaluation.passed).toBe(true);
    expect(secondAttempt.index.latestAttempt).toBe(2);
    expect(secondAttempt.index.latestStatus).toBe("passed");
    expect(secondAttempt.index.retainedAttempts.map((attempt) => attempt.attempt)).toEqual([1, 2]);

    const retainedAttemptOnePath = secondAttempt.index.retainedAttempts[0]?.artifactPath;
    if (!retainedAttemptOnePath) {
      throw new Error("Expected retained artifact path for first attempt.");
    }

    const retainedAttemptOne = JSON.parse(
      await fs.readFile(retainedAttemptOnePath, "utf8"),
    ) as { evaluationStatus: string; attempt: number };
    const latestArtifact = JSON.parse(await fs.readFile(secondAttempt.latestPath, "utf8")) as {
      evaluationStatus: string;
      attempt: number;
    };

    expect(retainedAttemptOne.attempt).toBe(1);
    expect(retainedAttemptOne.evaluationStatus).toBe("failed");
    expect(latestArtifact.attempt).toBe(2);
    expect(latestArtifact.evaluationStatus).toBe("passed");
  });

  test("emits schema-versioned scorer bundle with lifecycle evidence pointers", async () => {
    const bundle = await emitWaeEvalArtifactBundle(PRIMARY_RUN_CONTEXT);

    expect(bundle.runRecord.contractVersion).toBe("wae_eval_scorer_run_record_v1");
    expect(bundle.traceMetadata.contractVersion).toBe("wae_eval_trace_metadata_v1");
    expect(bundle.scenarioRecords.length).toBe(dsl.counts.scenarios);
    expect(bundle.runRecord.counts.scenarios).toBe(dsl.counts.scenarios);
    expect(bundle.runRecord.counts.failed).toBe(0);
    expect(bundle.runRecord.counts.skipped).toBe(skippedScenarios.length);
    expect(bundle.scenarioRecords[0]?.lifecycleEvidence.evidenceIndexPath).toContain(
      "tmp/reports/wae/",
    );
    expect(bundle.lifecycleEvidenceIndex.artifacts.bundle).toContain(
      bundle.runRecord.bundlePaths.scenarioRecordsJsonl,
    );
  });

  test("emits deterministic canary promotion and rollback evidence bundles", async ({}, testInfo) => {
    const baselineBundle = await emitWaeEvalArtifactBundle(PRIMARY_RUN_CONTEXT);
    const promoteBundle = await emitSyntheticCanaryRun({
      runContext: CANARY_PROMOTE_RUN_CONTEXT,
      label: "candidate-promote",
      testInfo,
    });
    const rollbackBundle = await emitSyntheticCanaryRun({
      runContext: CANARY_ROLLBACK_RUN_CONTEXT,
      label: "candidate-rollback",
      testInfo,
      buildEvidence: buildRollbackCanaryEvidence,
    });

    const promoteEvidence = await emitWaeCanaryEvidenceBundle({
      baselineContext: PRIMARY_RUN_CONTEXT,
      baselineBundle,
      candidateContext: CANARY_PROMOTE_RUN_CONTEXT,
      candidateBundle: promoteBundle,
      generatedAtMs: buildDeterministicWaeCanaryTimestampMs({
        baselineRunId: PRIMARY_RUN_CONTEXT.runId,
        candidateRunId: CANARY_PROMOTE_RUN_CONTEXT.runId,
        phase: "promote",
      }),
    });
    const rollbackEvidence = await emitWaeCanaryEvidenceBundle({
      baselineContext: PRIMARY_RUN_CONTEXT,
      baselineBundle,
      candidateContext: CANARY_ROLLBACK_RUN_CONTEXT,
      candidateBundle: rollbackBundle,
      generatedAtMs: buildDeterministicWaeCanaryTimestampMs({
        baselineRunId: PRIMARY_RUN_CONTEXT.runId,
        candidateRunId: CANARY_ROLLBACK_RUN_CONTEXT.runId,
        phase: "rollback",
      }),
    });

    expect(promoteEvidence.decision.decision).toBe("promote");
    expect(promoteEvidence.decision.reasonCodes).toEqual([]);
    expect(promoteEvidence.decision.candidate.verification.workflowState).toBe("verified");
    expect(promoteEvidence.decision.isolation).toEqual({
      sameOrganization: true,
      sameOrganizationSlug: true,
      sameSuiteKeyHash: true,
      deterministicReplay: true,
    });
    expect(promoteEvidence.lifecycleEvidenceIndex.artifacts.bundle).toContain(
      promoteEvidence.decision.evidencePaths.decisionPath,
    );

    expect(rollbackEvidence.decision.decision).toBe("rollback");
    expect(rollbackEvidence.decision.reasonCodes).toEqual(
      expect.arrayContaining([
        "candidate_failed_scenarios_increased",
        "candidate_rollout_gate_failed",
        "candidate_scenario_regression",
        "candidate_verification_regressed",
        "candidate_weighted_score_regressed",
      ]),
    );
    expect(rollbackEvidence.decision.candidate.verification.workflowState).toBe("rolled_back");
    expect(rollbackEvidence.decision.counts.regressions).toBeGreaterThan(0);
    expect(rollbackEvidence.decision.delta.failedScenarios).toBeGreaterThan(0);
    expect(rollbackEvidence.lifecycleEvidenceIndex.artifacts.bundle).toContain(
      rollbackEvidence.decision.evidencePaths.bundleIndexPath,
    );
  });
});
