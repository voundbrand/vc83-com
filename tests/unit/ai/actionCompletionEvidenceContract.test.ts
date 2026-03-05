import { describe, expect, it } from "vitest";
import {
  ACTION_COMPLETION_EVIDENCE_CONTRACT_VERSION,
  buildActionCompletionEvidenceContract,
  resolveActionCompletionContractEnforcement,
  verifyActionCompletionEvidenceContract,
} from "../../../convex/ai/agentExecution";

describe("action completion evidence contract", () => {
  it("builds deterministic action_completion_evidence_v1 records", () => {
    const evidence = buildActionCompletionEvidenceContract({
      outcomeKey: "audit_workflow_deliverable_pdf",
      requiredTools: ["generate_audit_workflow_deliverable"],
      toolResults: [
        {
          tool: "generate_audit_workflow_deliverable",
          status: "success",
          result: { outputRef: "object:deliverable_123" },
        },
        {
          tool: "generate_audit_workflow_deliverable",
          status: "success",
          result: { id: "object:deliverable_122" },
        },
      ],
      turnId: "turn_987",
    });

    expect(evidence).toEqual({
      contractVersion: ACTION_COMPLETION_EVIDENCE_CONTRACT_VERSION,
      outcomeKey: "audit_workflow_deliverable_pdf",
      requiredTools: ["generate_audit_workflow_deliverable"],
      requiredFields: [],
      observedToolCalls: [
        {
          toolName: "generate_audit_workflow_deliverable",
          callId: "tool_call_1",
          turnId: "turn_987",
          status: "success",
          outputRef: "object:deliverable_123",
        },
        {
          toolName: "generate_audit_workflow_deliverable",
          callId: "tool_call_2",
          turnId: "turn_987",
          status: "success",
          outputRef: "object:deliverable_122",
        },
      ],
      preconditionCheck: {
        passed: true,
        missingFields: [],
      },
      decision: {
        status: "pass",
        failureCode: null,
      },
    });
  });

  it("verifies unavailable-tool failures deterministically", () => {
    const evidence = buildActionCompletionEvidenceContract({
      outcomeKey: "audit_workflow_deliverable_pdf",
      requiredTools: ["generate_audit_workflow_deliverable"],
      toolResults: [],
      turnId: "turn_988",
    });

    const verdict = verifyActionCompletionEvidenceContract({
      evidence,
      availableToolNames: [],
    });

    expect(verdict).toEqual({
      passed: false,
      failureCode: "claim_tool_unavailable",
      failureDetail:
        "Required tools unavailable: generate_audit_workflow_deliverable",
    });
  });

  it("verifies not-observed failures when required tools do not succeed", () => {
    const evidence = buildActionCompletionEvidenceContract({
      outcomeKey: "audit_workflow_deliverable_pdf",
      requiredTools: ["generate_audit_workflow_deliverable"],
      toolResults: [
        {
          tool: "generate_audit_workflow_deliverable",
          status: "error",
          error: "failed",
        },
      ],
      turnId: "turn_989",
    });

    const verdict = verifyActionCompletionEvidenceContract({
      evidence,
      availableToolNames: ["generate_audit_workflow_deliverable"],
    });

    expect(verdict).toEqual({
      passed: false,
      failureCode: "claim_tool_not_observed",
      failureDetail:
        "Required tools not observed with success status: generate_audit_workflow_deliverable",
    });
  });

  it("wires evidence into enforcement payloads with turn-bound call evidence", () => {
    const decision = resolveActionCompletionContractEnforcement({
      authorityConfig: {
        actionCompletionContract: {
          contractVersion: "aoh_action_completion_template_contract_v1",
          mode: "enforce",
          outcomes: [
            {
              outcome: "audit_workflow_deliverable_pdf",
              requiredTools: ["generate_audit_workflow_deliverable"],
              unavailableMessage: "unavailable",
              notObservedMessage: "not observed",
            },
          ],
        },
      },
      claims: [
        {
          contractVersion: "aoh_action_completion_claim_v1",
          outcome: "audit_workflow_deliverable_pdf",
          status: "completed",
        },
      ],
      malformedClaimCount: 0,
      toolResults: [
        {
          tool: "generate_audit_workflow_deliverable",
          status: "success",
          result: { outputRef: "object:deliverable_42" },
        },
      ],
      availableToolNames: ["generate_audit_workflow_deliverable"],
      turnId: "turn_42",
    });

    expect(decision.enforced).toBe(false);
    expect(decision.payload.status).toBe("pass");
    expect(decision.payload.evidence).toMatchObject({
      contractVersion: ACTION_COMPLETION_EVIDENCE_CONTRACT_VERSION,
      outcomeKey: "audit_workflow_deliverable_pdf",
      decision: {
        status: "pass",
        failureCode: null,
      },
    });
    expect(decision.payload.evidence?.observedToolCalls).toEqual([
      {
        toolName: "generate_audit_workflow_deliverable",
        callId: "tool_call_1",
        turnId: "turn_42",
        status: "success",
        outputRef: "object:deliverable_42",
      },
    ]);
  });

  it("keeps required-tool invariant matrix deterministic for pass/unavailable/not_observed outcomes", () => {
    const requiredTools = [
      "generate_audit_workflow_deliverable",
      "request_audit_deliverable_email",
    ];
    const matrix = [
      {
        label: "all_required_tools_observed",
        availableToolNames: [...requiredTools],
        toolResults: [
          { tool: "generate_audit_workflow_deliverable", status: "success" as const },
          { tool: "request_audit_deliverable_email", status: "success" as const },
        ],
      },
      {
        label: "required_tool_unavailable",
        availableToolNames: ["generate_audit_workflow_deliverable"],
        toolResults: [
          { tool: "generate_audit_workflow_deliverable", status: "success" as const },
        ],
      },
      {
        label: "required_tool_not_observed",
        availableToolNames: [...requiredTools],
        toolResults: [
          { tool: "generate_audit_workflow_deliverable", status: "success" as const },
          {
            tool: "request_audit_deliverable_email",
            status: "error" as const,
            error: "delivery_failed",
          },
        ],
      },
    ].map((scenario, index) => {
      const evidence = buildActionCompletionEvidenceContract({
        outcomeKey: "audit_workflow_deliverable_pdf",
        requiredTools,
        toolResults: scenario.toolResults,
        turnId: `turn_matrix_${index + 1}`,
      });
      const verdict = verifyActionCompletionEvidenceContract({
        evidence,
        availableToolNames: scenario.availableToolNames,
      });
      return {
        label: scenario.label,
        passed: verdict.passed,
        failureCode: verdict.failureCode,
      };
    });

    expect(matrix).toEqual([
      {
        label: "all_required_tools_observed",
        passed: true,
        failureCode: undefined,
      },
      {
        label: "required_tool_unavailable",
        passed: false,
        failureCode: "claim_tool_unavailable",
      },
      {
        label: "required_tool_not_observed",
        passed: false,
        failureCode: "claim_tool_not_observed",
      },
    ]);
  });
});
