import { describe, expect, it } from "vitest";

import {
  SUPER_ADMIN_AGENT_QA_MODE_VERSION,
  SUPER_ADMIN_AGENT_QA_TURN_EVENT,
  buildSuperAdminAgentQaTurnTelemetryEnvelope,
} from "../../../convex/ai/qaModeContracts";

describe("super-admin QA telemetry envelope contract", () => {
  it("builds deterministic v1 envelope shape", () => {
    const envelope = buildSuperAdminAgentQaTurnTelemetryEnvelope({
      qaRunId: "qa_20260303_samantha_pdf",
      sessionId: "sess_123",
      turnId: "turn_456",
      agentId: "agent_789",
      qaDiagnostics: {
        reasonCode: "claim_tool_unavailable",
        preflightReasonCode: "missing_required_fields",
        requiredTools: ["generate_pdf", "send_email", "generate_pdf"],
        availableTools: ["send_email"],
        observedTools: ["send_email"],
        missingRequiredFields: ["deliverable.summary"],
        enforcementMode: "enforce",
        dispatchDecision: "recovery_attempted_missing_required_fields",
        blockedReason: "missing_required_fields",
        blockedDetail: "missing_required_fields: deliverable.summary",
      },
    });

    expect(envelope).toEqual({
      event: SUPER_ADMIN_AGENT_QA_TURN_EVENT,
      modeVersion: SUPER_ADMIN_AGENT_QA_MODE_VERSION,
      qaRunId: "qa_20260303_samantha_pdf",
      sessionId: "sess_123",
      turnId: "turn_456",
      agentId: "agent_789",
      preflightReasonCode: "missing_required_fields",
      reasonCode: "claim_tool_unavailable",
      requiredTools: ["generate_pdf", "send_email"],
      availableTools: ["send_email"],
      preflightMissingRequiredFields: ["deliverable.summary"],
      actionCompletionEnforcementMode: "enforce",
      dispatchDecision: "recovery_attempted_missing_required_fields",
      blockedReason: "missing_required_fields",
      blockedDetail: "missing_required_fields: deliverable.summary",
    });
  });

  it("remains compatible with terminal QA formatter parser", async () => {
    const { parseQaLogLine } = await import("../../../scripts/ai/super-admin-agent-qa-log-formatter.mjs");
    const envelope = buildSuperAdminAgentQaTurnTelemetryEnvelope({
      qaRunId: "qa_compat_001",
      sessionId: "sess_compat",
      turnId: "turn_compat",
      agentId: "agent_compat",
      qaDiagnostics: {
        requiredTools: ["generate_pdf"],
        availableTools: ["generate_pdf"],
        observedTools: [],
        missingRequiredFields: [],
        enforcementMode: "observe",
      },
    });

    const parsed = parseQaLogLine(JSON.stringify(envelope));
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      eventName: SUPER_ADMIN_AGENT_QA_TURN_EVENT,
      qaRunId: "qa_compat_001",
      sessionId: "sess_compat",
      turnId: "turn_compat",
      agentId: "agent_compat",
      actionDecision: "observe",
      requiredTools: ["generate_pdf"],
      availableTools: ["generate_pdf"],
      missingRequiredFields: [],
    });
  });

  it("retains docx execution dispatch decision in envelope", () => {
    const envelope = buildSuperAdminAgentQaTurnTelemetryEnvelope({
      qaRunId: "qa_docx_001",
      sessionId: "sess_docx",
      turnId: "turn_docx",
      agentId: "agent_docx",
      qaDiagnostics: {
        requiredTools: ["generate_audit_workflow_deliverable"],
        availableTools: ["generate_audit_workflow_deliverable"],
        observedTools: ["generate_audit_workflow_deliverable"],
        missingRequiredFields: [],
        enforcementMode: "enforce",
        dispatchDecision: "auto_dispatch_executed_docx",
      },
    });

    expect(envelope.dispatchDecision).toBe("auto_dispatch_executed_docx");
    expect(envelope.blockedReason).toBeUndefined();
  });
});
