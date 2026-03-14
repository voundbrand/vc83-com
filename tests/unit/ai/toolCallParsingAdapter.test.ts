import { describe, expect, it } from "vitest";
import {
  normalizeToolArgumentString,
  normalizeToolCallsForProvider,
  parseToolCallArguments,
} from "../../../convex/ai/toolBroker";
import {
  resolveEvalLifecycleEvidence,
  normalizeEvalArtifactPointer,
  buildEvalRunPlaybackTracePayload,
  WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
  type EvalRunTraceToolExecutionRecord,
} from "../../../convex/ai/chat";

describe("tool call parsing adapter", () => {
  it("normalizes empty-ish argument payloads to an object JSON string", () => {
    expect(normalizeToolArgumentString(undefined)).toBe("{}");
    expect(normalizeToolArgumentString("")).toBe("{}");
    expect(normalizeToolArgumentString("undefined")).toBe("{}");
    expect(normalizeToolArgumentString("null")).toBe("{}");
  });

  it("keeps permissive parsing behavior for chat", () => {
    const parsed = parseToolCallArguments("{not-json", { strict: false });

    expect(parsed.isError).toBe(false);
    expect(parsed.args).toEqual({});
    expect(parsed.error).toBeDefined();
  });

  it("enforces strict parsing behavior for agent runtime", () => {
    const parsed = parseToolCallArguments("{not-json", { strict: true });

    expect(parsed.isError).toBe(true);
    expect(parsed.args).toEqual({});
    expect(parsed.error).toContain("Invalid tool arguments");
  });

  it("rejects non-object JSON payloads in strict mode", () => {
    const parsed = parseToolCallArguments("[1,2,3]", { strict: true });

    expect(parsed.isError).toBe(true);
    expect(parsed.error).toContain("must be a JSON object");
  });

  it("normalizes provider tool call envelopes to always include arguments", () => {
    const toolCalls = normalizeToolCallsForProvider([
      {
        id: "call_1",
        type: "function",
        function: {
          name: "list_forms",
          arguments: undefined,
        },
      },
      {
        id: "call_2",
        type: "function",
        function: {
          name: "search_contacts",
          arguments: "{\"query\":\"alice\"}",
        },
      },
    ]);

    expect(toolCalls[0].function.arguments).toBe("{}");
    expect(toolCalls[1].function.arguments).toBe('{"query":"alice"}');
  });

  it("normalizes structured artifact pointers to lifecycle evidence paths", () => {
    const pointer = normalizeEvalArtifactPointer({
      lifecycleRoot: "tmp/reports/wae/run_abc/lifecycle",
    });
    const resolved = resolveEvalLifecycleEvidence({ artifactPointer: pointer });

    expect(resolved.reasonCodes).toEqual([]);
    expect(resolved.evidence?.pinManifestPath).toBe(
      "tmp/reports/wae/run_abc/lifecycle/pin-manifest.json"
    );
    expect(resolved.evidence?.evidenceIndexPath).toBe(
      "tmp/reports/wae/run_abc/lifecycle/evidence-index.json"
    );
  });

  it("fails closed on missing/invalid lifecycle artifact pointers", () => {
    const missingPointer = resolveEvalLifecycleEvidence({ artifactPointer: undefined });
    expect(missingPointer.reasonCodes).toEqual(["missing_artifact_pointer"]);

    const invalidPointer = resolveEvalLifecycleEvidence({ artifactPointer: "{not-json" });
    expect(invalidPointer.reasonCodes).toEqual(["invalid_artifact_pointer"]);

    const missingPathsPointer = resolveEvalLifecycleEvidence({
      artifactPointer: JSON.stringify({
        contractVersion: "wae_eval_lifecycle_artifact_pointer_v1",
      }),
    });
    expect(missingPathsPointer.reasonCodes).toEqual(["missing_lifecycle_evidence_paths"]);
  });

  it("marks replay blocked with deterministic lexical reason codes on lifecycle evidence mismatch", () => {
    const makeTrace = (
      executionId: string,
      lifecycleRoot: string,
    ): EvalRunTraceToolExecutionRecord => ({
      executionId,
      conversationId: "conversation_1",
      organizationId: "org_1",
      userId: "user_1",
      toolName: "search_contacts",
      status: "success",
      parameters: {},
      result: { ok: true },
      tokensUsed: 10,
      costUsd: 0.001,
      executedAt: 1_700_000_000_000,
      durationMs: 100,
      evalEnvelope: {
        contractVersion: WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
        runId: "run_mismatch",
        scenarioId: "scenario_1",
        agentId: "agent_1",
        label: "test",
        verdict: "passed",
        artifactPointer: normalizeEvalArtifactPointer({ lifecycleRoot }),
        timings: {
          turnStartedAt: 1_700_000_000_000,
          toolStartedAt: 1_700_000_000_001,
          toolCompletedAt: 1_700_000_000_101,
          durationMs: 100,
        },
      },
    });

    const playback = buildEvalRunPlaybackTracePayload({
      organizationId: "org_1" as any,
      runId: "run_mismatch",
      traces: [
        makeTrace("exec_1", "tmp/reports/wae/run_mismatch/lifecycle-a"),
        makeTrace("exec_2", "tmp/reports/wae/run_mismatch/lifecycle-b"),
      ],
    });

    expect(playback.status).toBe("blocked");
    expect(playback.run.lifecycleState).toBe("blocked");
    expect(playback.reasonCodes).toEqual(["lifecycle_evidence_mismatch"]);
    expect(playback.run.lifecycleReasonCodes).toEqual(["lifecycle_evidence_mismatch"]);
  });
});
