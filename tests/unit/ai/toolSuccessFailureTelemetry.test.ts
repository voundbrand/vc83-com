import { describe, expect, it } from "vitest";
import { aggregateAgentToolSuccessFailure } from "../../../convex/ai/agentSessions";
import { aggregateToolSuccessFailure } from "../../../convex/ai/workItems";
import {
  WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
  buildEvalPromotionEvidencePacket,
  buildEvalRunDiffTracePayload,
  buildEvalRunPlaybackTracePayload,
  type EvalRunTraceToolExecutionRecord,
  normalizeEvalArtifactPointer,
} from "../../../convex/ai/chat";
import {
  WAE_EVAL_RECOMMENDATION_PACKET_VERSION,
  WAE_EVAL_RUN_RECORD_CONTRACT_VERSION,
  WAE_EVAL_SCENARIO_RECORD_CONTRACT_VERSION,
  buildWaeEvalRecommendationPacket,
  runEvalAnalystChecksTool,
  scoreWaeEvalBundle,
  type WaeEvalRunRecordInput,
  type WaeEvalScenarioRecordInput,
} from "../../../convex/ai/tools/evalAnalystTool";

function makeTrace(
  overrides: Partial<EvalRunTraceToolExecutionRecord> & {
    executionId: string;
    toolName: string;
    status: EvalRunTraceToolExecutionRecord["status"];
  }
): EvalRunTraceToolExecutionRecord {
  const executionIndex = Number(overrides.executionId.replace(/\D+/g, "")) || 1;
  const startedAt = 1_700_000_000_000 + executionIndex * 1_000;
  const toolCallRound = executionIndex;
  const base: EvalRunTraceToolExecutionRecord = {
    executionId: overrides.executionId,
    conversationId: "conversation_1",
    organizationId: "org_1",
    userId: "user_1",
    toolName: overrides.toolName,
    status: overrides.status,
    parameters: {},
    result: { ok: true },
    error: undefined,
    tokensUsed: 10,
    costUsd: 0.001,
    executedAt: startedAt + 10,
    durationMs: 250,
    evalEnvelope: {
      contractVersion: WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
      runId: "run_1",
      scenarioId: "scenario_alpha",
      agentId: "agent_1",
      label: "baseline",
      toolCallId: `call_${executionIndex}`,
      toolCallRound,
      verdict: "passed",
      artifactPointer: normalizeEvalArtifactPointer({
        lifecycleRoot: "tmp/reports/wae/run_1/lifecycle",
      }),
      timings: {
        turnStartedAt: startedAt,
        toolStartedAt: startedAt + 1,
        toolCompletedAt: startedAt + 251,
        durationMs: 250,
      },
    },
  };
  return {
    ...base,
    ...overrides,
    evalEnvelope: {
      ...base.evalEnvelope,
      ...(overrides.evalEnvelope ?? {}),
      timings: {
        ...base.evalEnvelope.timings,
        ...(overrides.evalEnvelope?.timings ?? {}),
      },
    },
  };
}

function makeWaeRunRecord(
  overrides: Partial<WaeEvalRunRecordInput> = {},
): WaeEvalRunRecordInput {
  return {
    contractVersion: WAE_EVAL_RUN_RECORD_CONTRACT_VERSION,
    runId: "wae_run_1",
    suiteKeyHash: "suite_hash_1",
    templateVersionTag: "template_v1",
    scenarioMatrixContractVersion: "wae_eval_scenario_matrix_v1",
    lifecycleStatus: "passed",
    counts: {
      scenarios: 3,
      passed: 3,
      failed: 0,
      skipped: 1,
    },
    lifecycleEvidence: {
      pinManifestPath: "tmp/reports/wae/wae_run_1/lifecycle/pin-manifest.json",
      createReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/create-receipt.json",
      resetReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/reset-receipt.json",
      teardownReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/teardown-receipt.json",
      evidenceIndexPath: "tmp/reports/wae/wae_run_1/lifecycle/evidence-index.json",
    },
    ...overrides,
  };
}

function makeWaeScenarioRecord(
  overrides: Partial<WaeEvalScenarioRecordInput> & {
    scenarioId: string;
  },
): WaeEvalScenarioRecordInput {
  return {
    contractVersion: WAE_EVAL_SCENARIO_RECORD_CONTRACT_VERSION,
    runId: "wae_run_1",
    suiteKeyHash: "suite_hash_1",
    scenarioId: overrides.scenarioId,
    agentId: "agent_1",
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
      latestAttemptPath: "tmp/reports/wae/wae_run_1/scenarios/scenario/latest.json",
      attemptIndexPath: "tmp/reports/wae/wae_run_1/scenarios/scenario/attempt-index.json",
      playwrightMetadataPath: "tmp/reports/wae/wae_run_1/playwright/scenario/attempt-01.json",
    },
    screenshotPaths: ["test-results/scenario/test-failed-1.png"],
    lifecycleEvidence: {
      pinManifestPath: "tmp/reports/wae/wae_run_1/lifecycle/pin-manifest.json",
      createReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/create-receipt.json",
      resetReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/reset-receipt.json",
      teardownReceiptPath: "tmp/reports/wae/wae_run_1/lifecycle/teardown-receipt.json",
      evidenceIndexPath: "tmp/reports/wae/wae_run_1/lifecycle/evidence-index.json",
    },
    ...overrides,
  };
}

describe("agent tool success/failure aggregation", () => {
  it("normalizes statuses and computes success/failure rates", () => {
    const summary = aggregateAgentToolSuccessFailure(
      [
        { status: "success" },
        { status: "error" },
        { status: "disabled" },
        { status: "pending_approval" },
        { status: "unknown_status" },
        {},
      ],
      { windowHours: 24, since: 0 }
    );

    expect(summary.toolResultsScanned).toBe(6);
    expect(summary.successCount).toBe(1);
    expect(summary.failureCount).toBe(2);
    expect(summary.pendingCount).toBe(1);
    expect(summary.ignoredCount).toBe(2);
    expect(summary.successRate).toBe(0.3333);
    expect(summary.failureRate).toBe(0.6667);
  });
});

describe("tool/work-item success-failure aggregation", () => {
  it("returns per-source and combined ratios", () => {
    const summary = aggregateToolSuccessFailure(
      ["success", "failed", "proposed", "cancelled"],
      ["completed", "failed", "executing", undefined],
      { windowHours: 24, since: 0 }
    );

    expect(summary.toolExecutions.successCount).toBe(1);
    expect(summary.toolExecutions.failureCount).toBe(1);
    expect(summary.toolExecutions.pendingCount).toBe(1);
    expect(summary.toolExecutions.ignoredCount).toBe(1);
    expect(summary.toolExecutions.successRate).toBe(0.5);

    expect(summary.workItems.successCount).toBe(1);
    expect(summary.workItems.failureCount).toBe(1);
    expect(summary.workItems.pendingCount).toBe(1);
    expect(summary.workItems.ignoredCount).toBe(1);
    expect(summary.workItems.successRate).toBe(0.5);

    expect(summary.combined.successCount).toBe(2);
    expect(summary.combined.failureCount).toBe(2);
    expect(summary.combined.pendingCount).toBe(2);
    expect(summary.combined.ignoredCount).toBe(2);
    expect(summary.combined.successRate).toBe(0.5);
    expect(summary.combined.failureRate).toBe(0.5);
  });
});

describe("WAE-104 eval replay contracts", () => {
  it("keeps playback envelope integrity + lifecycle snapshot fields deterministic", () => {
    const traces = [
      makeTrace({
        executionId: "exec_2",
        toolName: "create_checkout_page",
        status: "failed",
        evalEnvelope: { verdict: "failed", toolCallRound: 2 },
      }),
      makeTrace({
        executionId: "exec_1",
        toolName: "search_contacts",
        status: "success",
        evalEnvelope: { verdict: "passed", toolCallRound: 1 },
      }),
    ];

    const playback = buildEvalRunPlaybackTracePayload({
      organizationId: "org_1" as any,
      runId: "run_1",
      traces,
    });

    expect(playback.envelopeContractVersion).toBe("wae_eval_run_envelope_v1");
    expect(playback.lifecycleSnapshotContractVersion).toBe(
      "wae_eval_run_lifecycle_snapshot_v1"
    );
    expect(playback.status).toBe("ready");
    expect(playback.run.lifecycleState).toBe("failed");
    expect(playback.run.lifecycleReasonCodes).toEqual(["execution_failed"]);
    expect(playback.reasonCodes).toEqual([]);
    expect(playback.toolExecutions.map((row) => row.executionId)).toEqual([
      "exec_1",
      "exec_2",
    ]);
    expect(playback.run.totalToolExecutions).toBe(2);
    expect(playback.run.statusCounts.success).toBe(1);
    expect(playback.run.statusCounts.failed).toBe(1);
  });

  it("keeps deterministic tool accounting parity across playback, diff, and evidence packet payloads", () => {
    const baseline = [
      makeTrace({
        executionId: "exec_1",
        toolName: "search_contacts",
        status: "success",
      }),
      makeTrace({
        executionId: "exec_2",
        toolName: "list_forms",
        status: "success",
      }),
    ];
    const candidate = [
      makeTrace({
        executionId: "exec_3",
        toolName: "search_contacts",
        status: "success",
        evalEnvelope: { runId: "run_2", toolCallRound: 1 },
      }),
      makeTrace({
        executionId: "exec_4",
        toolName: "list_forms",
        status: "failed",
        evalEnvelope: { runId: "run_2", verdict: "failed", toolCallRound: 2 },
      }),
    ];

    const baselinePlayback = buildEvalRunPlaybackTracePayload({
      organizationId: "org_1" as any,
      runId: "run_1",
      traces: baseline,
    });
    const candidatePlayback = buildEvalRunPlaybackTracePayload({
      organizationId: "org_1" as any,
      runId: "run_2",
      traces: candidate,
    });
    const diff = buildEvalRunDiffTracePayload({
      organizationId: "org_1" as any,
      baselineRunId: "run_1",
      candidateRunId: "run_2",
      baselineTraces: baseline,
      candidateTraces: candidate,
    });
    const evidence = buildEvalPromotionEvidencePacket({
      organizationId: "org_1" as any,
      runId: "run_2",
      traces: candidate,
    });

    expect(evidence.lifecycleSnapshotContractVersion).toBe(
      "wae_eval_run_lifecycle_snapshot_v1"
    );
    expect(evidence.run.totalToolExecutions).toBe(candidatePlayback.run.totalToolExecutions);
    expect(evidence.run.statusCounts).toEqual(candidatePlayback.run.statusCounts);
    expect(evidence.traces).toHaveLength(candidatePlayback.toolExecutions.length);
    expect(
      evidence.traces.reduce((sum, row) => sum + row.tokensUsed, 0)
    ).toBe(candidatePlayback.run.totalTokensUsed);

    expect(diff.lifecycleSnapshotContractVersion).toBe(
      "wae_eval_run_lifecycle_snapshot_v1"
    );
    expect(diff.status).toBe("ready");
    expect(diff.reasonCodes).toEqual([]);
    expect(diff.comparison.toolCountDelta).toBe(
      candidatePlayback.run.totalToolExecutions - baselinePlayback.run.totalToolExecutions
    );
    expect(diff.comparison.statusCountDelta.failed).toBe(1);
    expect(diff.comparison.statusCountDelta.success).toBe(-1);
  });
});

describe("WAE-301 weighted scorer contracts", () => {
  it("scores a valid WAE bundle with deterministic aggregate weights and proceed verdict", () => {
    const runRecord = makeWaeRunRecord();
    const scenarioRecords = [
      makeWaeScenarioRecord({ scenarioId: "Q-001" }),
      makeWaeScenarioRecord({
        scenarioId: "Q-002",
        performance: {
          latencyMs: 6100,
          costUsd: 0.018,
          tokenCount: 510,
          observedToolCount: 1,
        },
      }),
      makeWaeScenarioRecord({
        scenarioId: "Q-009",
        executionMode: "SKIP_UNTIL_FEATURE",
        expectedRuntimeVerdict: "SKIPPED",
        actualVerdict: "SKIPPED",
        evaluationStatus: "passed",
        reasonCodes: ["pending_feature:agent-self-naming-arrival"],
        observedTools: [],
        observedOutcomes: [],
        performance: {
          latencyMs: 1500,
          costUsd: 0.001,
          tokenCount: 120,
          observedToolCount: 0,
        },
      }),
    ];

    const score = scoreWaeEvalBundle({ runRecord, scenarioRecords });

    expect(score.verdict).toBe("passed");
    expect(score.decision).toBe("proceed");
    expect(score.resultLabel).toBe("PASS");
    expect(score.counts).toEqual({
      scenarios: 3,
      runnable: 2,
      skipped: 1,
      passed: 3,
      failed: 0,
    });
    expect(score.aggregateDimensions.tool_correctness.scoreRatio).toBe(1);
    expect(score.aggregateDimensions.safety.scoreRatio).toBe(1);
    expect(score.aggregateDimensions.latency.scoreRatio).toBe(0.8688);
    expect(score.aggregateDimensions.cost.scoreRatio).toBe(0.8667);
    expect(score.weightedScore).toBe(0.9802);
    expect(score.failedMetrics).toEqual([]);
    expect(score.blockedReasons).toEqual([]);
  });

  it("fails deterministic scorer output on tool, safety, completion, and budget regressions", () => {
    const runRecord = makeWaeRunRecord({
      counts: {
        scenarios: 2,
        passed: 1,
        failed: 1,
        skipped: 0,
      },
    });
    const scenarioRecords = [
      makeWaeScenarioRecord({ scenarioId: "Q-001" }),
      makeWaeScenarioRecord({
        scenarioId: "OOO-006",
        actualVerdict: "FAILED",
        evaluationStatus: "failed",
        reasonCodes: [
          "forbidden_tool_used:manage_bookings",
          "missing_required_outcome:trust_block_and_promotion_steps_explained",
          "negative_path_outcome_missing",
        ],
        performance: {
          latencyMs: 16_000,
          costUsd: 0.06,
          tokenCount: 1200,
          observedToolCount: 3,
        },
      }),
    ];

    const score = scoreWaeEvalBundle({ runRecord, scenarioRecords });

    expect(score.verdict).toBe("failed");
    expect(score.decision).toBe("hold");
    expect(score.resultLabel).toBe("FAIL");
    expect(score.failedMetrics).toEqual(
      expect.arrayContaining([
        "OOO-006:tool_correctness",
        "OOO-006:completion_quality",
        "OOO-006:safety",
        "OOO-006:latency",
        "OOO-006:cost",
      ]),
    );
    expect(score.requiredRemediation[0]?.action).toContain("Restore required/forbidden tool contract");
  });

  it("clusters failed WAE traces into deterministic recommendation packets with concrete evidence", () => {
    const runRecord = makeWaeRunRecord({
      counts: {
        scenarios: 3,
        passed: 1,
        failed: 2,
        skipped: 0,
      },
    });
    const scenarioRecords = [
      makeWaeScenarioRecord({ scenarioId: "Q-001" }),
      makeWaeScenarioRecord({
        scenarioId: "OOO-006",
        agentId: "agent_operator",
        actualVerdict: "FAILED",
        evaluationStatus: "failed",
        reasonCodes: [
          "forbidden_tool_used:manage_bookings",
          "missing_required_outcome:trust_block_and_promotion_steps_explained",
        ],
        artifactPaths: {
          latestAttemptPath: "tmp/reports/wae/wae_run_1/OOO-006/latest.json",
          attemptIndexPath: "tmp/reports/wae/wae_run_1/OOO-006/attempt-index.json",
          playwrightMetadataPath: "tmp/reports/wae/wae_run_1/OOO-006/playwright.json",
        },
        screenshotPaths: [
          "tmp/reports/wae/wae_run_1/OOO-006/failure.png",
        ],
      }),
      makeWaeScenarioRecord({
        scenarioId: "OOO-007",
        agentId: "agent_operator",
        actualVerdict: "FAILED",
        evaluationStatus: "failed",
        reasonCodes: ["missing_required_outcome:handoff_summary_missing"],
        performance: {
          latencyMs: 18_000,
          costUsd: 0.01,
          tokenCount: 900,
          observedToolCount: 2,
        },
        artifactPaths: {
          latestAttemptPath: "tmp/reports/wae/wae_run_1/OOO-007/latest.json",
          attemptIndexPath: "tmp/reports/wae/wae_run_1/OOO-007/attempt-index.json",
          playwrightMetadataPath: "tmp/reports/wae/wae_run_1/OOO-007/playwright.json",
        },
      }),
    ];

    const scorePacket = scoreWaeEvalBundle({ runRecord, scenarioRecords });
    const recommendations = buildWaeEvalRecommendationPacket({
      runRecord,
      scenarioRecords,
      scorePacket,
    });

    expect(recommendations.contractVersion).toBe(WAE_EVAL_RECOMMENDATION_PACKET_VERSION);
    expect(recommendations.recommendationCount).toBe(5);
    expect(recommendations.recommendations.map((item) => item.recommendationId)).toEqual([
      "agent:latency_budget_exceeded",
      "agent:safety_regression",
      "prompt:missing_required_outcome",
      "tool:forbidden_tool_used",
      "tool:tool_contract_regression",
    ]);
    expect(recommendations.recommendations[0]?.evidence[0]?.artifactPaths).toEqual([
      "test-results/scenario/test-failed-1.png",
      "tmp/reports/wae/wae_run_1/lifecycle/evidence-index.json",
      "tmp/reports/wae/wae_run_1/OOO-007/attempt-index.json",
      "tmp/reports/wae/wae_run_1/OOO-007/latest.json",
      "tmp/reports/wae/wae_run_1/OOO-007/playwright.json",
    ]);
    expect(recommendations.recommendations[2]?.scenarioIds).toEqual(["OOO-006", "OOO-007"]);
    expect(recommendations.recommendations[3]?.target).toBe("tool");
  });

  it("fails closed when scoring bundle evidence is missing or invalid", async () => {
    const execution = await runEvalAnalystChecksTool.execute(
      {} as any,
      {
        evaluationIntent: "score_wae_bundle",
      },
    );

    expect(execution.outputSchema).toBe("wae_eval_score_packet_v1");
    expect(execution.resultLabel).toBe("FAIL");
    expect(execution.decision).toBe("hold");
    expect(execution.failedMetrics).toEqual(["wae_bundle_missing_or_invalid"]);
    expect(execution.waeEvalScore.verdict).toBe("blocked");
    expect(execution.waeImprovementRecommendations.contractVersion).toBe(
      WAE_EVAL_RECOMMENDATION_PACKET_VERSION,
    );
    expect(execution.waeImprovementRecommendations.recommendations[0]?.recommendationId).toBe(
      "gate:wae_bundle_missing_or_invalid",
    );
  });
});
