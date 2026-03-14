import { describe, expect, it } from "vitest";
import type { Doc } from "../../../convex/_generated/dataModel";
import {
  WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
  buildEvalPromotionEvidencePacket,
  buildEvalRunDiffTracePayload,
  buildEvalRunPlaybackTracePayload,
  normalizeEvalArtifactPointer,
  toEvalRunTraceRecord,
} from "../../../convex/ai/chat";

function makeExecutionDoc(args: {
  id: string;
  runId: string;
  toolName: string;
  status: "success" | "failed";
  verdict: "passed" | "failed" | "blocked";
  artifactPointer?: string;
  contractVersion?: string;
  scenarioId?: string;
}): Doc<"aiToolExecutions"> {
  const n = Number(args.id.replace(/\D+/g, "")) || 1;
  const startedAt = 1_700_100_000_000 + n * 100;
  return {
    _id: args.id as any,
    _creationTime: startedAt,
    conversationId: "conv_1" as any,
    organizationId: "org_1" as any,
    userId: "user_1" as any,
    toolName: args.toolName,
    parameters: { query: "acme" },
    result: { ok: true },
    error: undefined,
    status: args.status,
    tokensUsed: 12,
    costUsd: 0.0012,
    executedAt: startedAt + 1,
    durationMs: 90,
    evalEnvelope: {
      contractVersion:
        args.contractVersion ?? WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
      runId: args.runId,
      scenarioId: args.scenarioId ?? "scenario_eval_1",
      agentId: "agent_eval_1",
      label: "lane_b",
      toolCallId: `call_${args.id}`,
      toolCallRound: n,
      verdict: args.verdict,
      artifactPointer:
        args.artifactPointer
        ?? normalizeEvalArtifactPointer({
          lifecycleRoot: `tmp/reports/wae/${args.runId}/lifecycle`,
        }),
      timings: {
        turnStartedAt: startedAt,
        toolStartedAt: startedAt + 1,
        toolCompletedAt: startedAt + 91,
        durationMs: 90,
      },
    },
  } as unknown as Doc<"aiToolExecutions">;
}

describe("eval replay contracts", () => {
  it("keeps deterministic playback/diff/evidence parity for failed-scenario reruns", () => {
    const baselineDocs = [
      makeExecutionDoc({
        id: "exec_1",
        runId: "run_baseline",
        toolName: "search_contacts",
        status: "success",
        verdict: "passed",
      }),
      makeExecutionDoc({
        id: "exec_2",
        runId: "run_baseline",
        toolName: "list_forms",
        status: "failed",
        verdict: "failed",
      }),
    ];
    const candidateDocs = [
      makeExecutionDoc({
        id: "exec_10",
        runId: "run_candidate",
        toolName: "search_contacts",
        status: "success",
        verdict: "passed",
      }),
      makeExecutionDoc({
        id: "exec_11",
        runId: "run_candidate",
        toolName: "list_forms",
        status: "failed",
        verdict: "failed",
      }),
    ];

    const baselineTraces = baselineDocs
      .map((doc) => toEvalRunTraceRecord(doc))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const candidateTraces = candidateDocs
      .map((doc) => toEvalRunTraceRecord(doc))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const baselinePlayback = buildEvalRunPlaybackTracePayload({
      organizationId: "org_1" as any,
      runId: "run_baseline",
      traces: baselineTraces,
    });
    const candidatePlayback = buildEvalRunPlaybackTracePayload({
      organizationId: "org_1" as any,
      runId: "run_candidate",
      traces: candidateTraces,
    });
    const evidencePacket = buildEvalPromotionEvidencePacket({
      organizationId: "org_1" as any,
      runId: "run_candidate",
      traces: candidateTraces,
    });
    const diff = buildEvalRunDiffTracePayload({
      organizationId: "org_1" as any,
      baselineRunId: "run_baseline",
      candidateRunId: "run_candidate",
      baselineTraces,
      candidateTraces,
    });

    expect(baselinePlayback.status).toBe("ready");
    expect(candidatePlayback.status).toBe("ready");
    expect(baselinePlayback.run.lifecycleState).toBe("failed");
    expect(candidatePlayback.run.lifecycleState).toBe("failed");
    expect(baselinePlayback.run.lifecycleReasonCodes).toEqual(["execution_failed"]);
    expect(candidatePlayback.run.lifecycleReasonCodes).toEqual(["execution_failed"]);

    expect(evidencePacket.status).toBe("ready");
    expect(evidencePacket.run.lifecycleState).toBe(candidatePlayback.run.lifecycleState);
    expect(evidencePacket.run.lifecycleReasonCodes).toEqual(
      candidatePlayback.run.lifecycleReasonCodes,
    );
    expect(evidencePacket.run.totalToolExecutions).toBe(
      candidatePlayback.run.totalToolExecutions,
    );

    expect(diff.status).toBe("ready");
    expect(diff.reasonCodes).toEqual([]);
    expect(
      diff.comparison.sequenceDiff.every(
        (entry) => entry.changeType === "unchanged" || entry.changeType === "modified",
      ),
    ).toBe(true);
    expect(diff.comparison.sequenceDiff.some((entry) => entry.changeType === "added")).toBe(
      false,
    );
    expect(diff.comparison.sequenceDiff.some((entry) => entry.changeType === "removed")).toBe(
      false,
    );
    expect(diff.comparison.verdictChanged).toBe(false);
    expect(diff.comparison.lifecycleStateChanged).toBe(false);
  });

  it("fails closed and keeps reason-code parity when lifecycle evidence diverges", () => {
    const mismatchedDocs = [
      makeExecutionDoc({
        id: "exec_20",
        runId: "run_blocked",
        toolName: "search_contacts",
        status: "success",
        verdict: "failed",
        artifactPointer: normalizeEvalArtifactPointer({
          lifecycleRoot: "tmp/reports/wae/run_blocked/lifecycle-A",
        }),
      }),
      makeExecutionDoc({
        id: "exec_21",
        runId: "run_blocked",
        toolName: "list_forms",
        status: "failed",
        verdict: "failed",
        artifactPointer: normalizeEvalArtifactPointer({
          lifecycleRoot: "tmp/reports/wae/run_blocked/lifecycle-B",
        }),
      }),
      makeExecutionDoc({
        id: "exec_22",
        runId: "run_blocked",
        toolName: "list_forms",
        status: "success",
        verdict: "passed",
        contractVersion: "legacy_contract",
      }),
    ];

    const traces = mismatchedDocs
      .map((doc) => toEvalRunTraceRecord(doc))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    expect(traces).toHaveLength(2);

    const playback = buildEvalRunPlaybackTracePayload({
      organizationId: "org_1" as any,
      runId: "run_blocked",
      traces,
    });
    const evidencePacket = buildEvalPromotionEvidencePacket({
      organizationId: "org_1" as any,
      runId: "run_blocked",
      traces,
    });

    expect(playback.status).toBe("blocked");
    expect(playback.run.lifecycleState).toBe("blocked");
    expect(playback.reasonCodes).toEqual(["lifecycle_evidence_mismatch"]);
    expect(playback.run.lifecycleReasonCodes).toEqual(["lifecycle_evidence_mismatch"]);

    expect(evidencePacket.status).toBe("blocked");
    expect(evidencePacket.reasonCodes).toEqual(playback.reasonCodes);
    expect(evidencePacket.run.lifecycleState).toBe(playback.run.lifecycleState);
    expect(evidencePacket.run.lifecycleReasonCodes).toEqual(
      playback.run.lifecycleReasonCodes,
    );
  });
});
