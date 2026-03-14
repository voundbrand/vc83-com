import { describe, expect, it } from "vitest";

import {
  buildWaeImprovementProposalDraft,
  evaluateWaeImprovementVerificationResult,
  WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
} from "../../../convex/ai/selfImprovement";
import { WAE_EVAL_RECOMMENDATION_PACKET_VERSION } from "../../../convex/ai/tools/evalAnalystTool";

function makeRecommendationPacket(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    contractVersion: WAE_EVAL_RECOMMENDATION_PACKET_VERSION,
    sourceScoreContractVersion: "wae_eval_score_packet_v1",
    runId: "wae_run_402",
    suiteKeyHash: "suite_hash_402",
    verdict: "failed",
    decision: "hold",
    blockedReasons: [],
    recommendationCount: 1,
    recommendations: [
      {
        recommendationId: "prompt:missing_required_outcome",
        target: "prompt",
        priority: "medium",
        clusterReason: "missing_required_outcome",
        title: "Prompt behavior remediation: missing_required_outcome",
        summary: "Tighten the handoff summary prompt.",
        scenarioIds: ["OOO-007"],
        agentIds: ["objects_agent_1"],
        failedMetrics: ["OOO-007:completion_quality"],
        recommendedActions: [
          "Tighten prompt/output instructions for OOO-007.",
        ],
        evidence: [
          {
            evidenceId: "scenario:OOO-007",
            scenarioId: "OOO-007",
            agentId: "objects_agent_1",
            summary: "OOO-007 missed the handoff summary requirement.",
            failedMetrics: ["OOO-007:completion_quality"],
            reasonCodes: ["missing_required_outcome:handoff_summary_missing"],
            artifactPaths: [
              "tmp/reports/wae/wae_run_402/OOO-007/latest.json",
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("WAE improvement proposal draft", () => {
  it("builds a deterministic pending-approval draft for agent/prompt recommendations", () => {
    const draft = buildWaeImprovementProposalDraft({
      recommendationPacket: makeRecommendationPacket(),
      recommendationId: "prompt:missing_required_outcome",
      agentId: "objects_agent_1",
      agentCustomProperties: {
        soul: {
          version: 7,
        },
        soulScope: {
          layer: "L3",
          domain: "user",
          classification: "standard",
          allowPlatformSoulAdmin: false,
        },
      },
    });

    expect(draft.contractVersion).toBe(WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION);
    expect(draft.allowed).toBe(true);
    expect(draft.workflowState).toBe("pending_owner_approval");
    expect(draft.rollbackPlan).toEqual({
      targetVersion: 7,
      autoRollbackOnRegression: true,
    });
    expect(draft.recommendationTarget).toBe("prompt");
    expect(draft.proposalSummary).toContain("Prompt behavior remediation");
    expect(draft.driftSummary).toContain("WAE wae_run_402");
  });

  it("fails closed for unsupported recommendation targets and platform-managed L2 souls", () => {
    const toolTargetDraft = buildWaeImprovementProposalDraft({
      recommendationPacket: makeRecommendationPacket({
        recommendations: [
          {
            recommendationId: "tool:forbidden_tool_used",
            target: "tool",
            priority: "high",
            clusterReason: "forbidden_tool_used",
            title: "Tool contract remediation: forbidden_tool_used",
            summary: "Stop using the forbidden tool.",
            scenarioIds: ["OOO-006"],
            agentIds: ["objects_agent_1"],
            failedMetrics: ["OOO-006:tool_correctness"],
            recommendedActions: ["Fix tool routing."],
            evidence: [],
          },
        ],
      }),
      recommendationId: "tool:forbidden_tool_used",
      agentId: "objects_agent_1",
      agentCustomProperties: {
        soul: {
          version: 3,
        },
      },
    });

    expect(toolTargetDraft.allowed).toBe(false);
    expect(toolTargetDraft.blockedReason).toBe(
      "wae_recommendation_target_requires_manual_followup",
    );

    const platformL2Draft = buildWaeImprovementProposalDraft({
      recommendationPacket: makeRecommendationPacket(),
      recommendationId: "prompt:missing_required_outcome",
      agentId: "objects_agent_1",
      agentCustomProperties: {
        soul: {
          version: 4,
        },
        soulScope: {
          layer: "L2",
          domain: "platform",
          classification: "platform_l2",
          allowPlatformSoulAdmin: true,
        },
      },
    });

    expect(platformL2Draft.allowed).toBe(false);
    expect(platformL2Draft.blockedReason).toBe("platform_soul_admin_required");
  });
});

describe("WAE improvement verification outcome", () => {
  it("requires rollback on failed or blocked post-apply WAE verification", () => {
    const failedDecision = evaluateWaeImprovementVerificationResult({
      contractVersion: "wae_eval_score_packet_v1",
      runId: "wae_run_failed",
      suiteKeyHash: "suite_hash_failed",
      verdict: "failed",
      decision: "hold",
      failedMetrics: ["OOO-007:completion_quality"],
      blockedReasons: [],
    });

    expect(failedDecision.rollbackRequired).toBe(true);
    expect(failedDecision.workflowState).toBe("rolled_back");
    expect(failedDecision.summary).toContain("wae_run_failed");

    const blockedDecision = evaluateWaeImprovementVerificationResult(null);
    expect(blockedDecision.rollbackRequired).toBe(false);
    expect(blockedDecision.workflowState).toBe("blocked");
    expect(blockedDecision.blockedReason).toBe("wae_post_apply_score_missing_or_invalid");
  });

  it("marks verified only when post-apply WAE verification proceeds cleanly", () => {
    const decision = evaluateWaeImprovementVerificationResult({
      contractVersion: "wae_eval_score_packet_v1",
      runId: "wae_run_passed",
      suiteKeyHash: "suite_hash_passed",
      verdict: "passed",
      decision: "proceed",
      failedMetrics: [],
      blockedReasons: [],
    });

    expect(decision).toEqual({
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      workflowState: "verified",
      rollbackRequired: false,
      summary: "Post-apply WAE verification passed for wae_run_passed.",
    });
  });
});
