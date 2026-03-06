import { describe, expect, it } from "vitest";

import {
  SUPER_ADMIN_AGENT_QA_MODE_VERSION,
  buildActionCompletionQaDiagnostics,
  resolveSuperAdminAgentQaDeniedReason,
  resolveSuperAdminAgentQaModeRequest,
} from "../../../convex/ai/qaModeContracts";

describe("qaModeContracts", () => {
  it("resolves explicit payload QA mode request deterministically", () => {
    const result = resolveSuperAdminAgentQaModeRequest({
      payloadQa: {
        enabled: true,
        sessionId: " sess_123 ",
        targetAgentId: " agent_123 ",
        targetTemplateRole: " one_of_one_template ",
        label: " regression-pass ",
        runId: " qa_20260303_regression ",
      },
      queryQa: undefined,
    });

    expect(result).toEqual({
      enabled: true,
      sessionId: "sess_123",
      targetAgentId: "agent_123",
      targetTemplateRole: "one_of_one_template",
      label: "regression-pass",
      runId: "qa_20260303_regression",
    });
  });

  it("resolves query flag QA mode request when payload is missing", () => {
    const result = resolveSuperAdminAgentQaModeRequest({
      payloadQa: undefined,
      queryQa: "1",
    });

    expect(result).toEqual({
      enabled: true,
      sessionId: undefined,
      targetAgentId: undefined,
      targetTemplateRole: undefined,
      label: undefined,
      runId: undefined,
    });
  });

  it("builds missing_required_fields diagnostics with deterministic blocked detail", () => {
    const diagnostics = buildActionCompletionQaDiagnostics({
      enforcementMode: "enforce",
      rewriteApplied: true,
      templateRole: "one_of_one_template",
      payload: {
        reasonCode: "claim_tool_unavailable",
        preflightReasonCode: "missing_required_fields",
        requiredTools: ["tool_a", "tool_b", "tool_a"],
        availableTools: ["tool_b", "tool_c"],
        observedTools: ["tool_a"],
        preflightMissingRequiredFields: ["deliverable.pdf", "deliverable.summary"],
      },
    });

    expect(diagnostics).toMatchObject({
      reasonCode: "claim_tool_unavailable",
      preflightReasonCode: "missing_required_fields",
      requiredTools: ["tool_a", "tool_b"],
      availableTools: ["tool_b", "tool_c"],
      observedTools: ["tool_a"],
      missingRequiredFields: ["deliverable.pdf", "deliverable.summary"],
      enforcementMode: "enforce",
      rewriteApplied: true,
      templateRole: "one_of_one_template",
      dispatchDecision: "recovery_attempted_missing_required_fields",
      blockedReason: "missing_required_fields",
      blockedDetail: "missing_required_fields: deliverable.pdf, deliverable.summary",
    });
  });

  it("maps tool_not_observed and tool_unavailable to explicit blocked reasons", () => {
    const toolNotObserved = buildActionCompletionQaDiagnostics({
      payload: {
        preflightReasonCode: "tool_not_observed",
        requiredTools: ["tool_x"],
        observedTools: ["tool_y"],
      },
    });
    const toolUnavailable = buildActionCompletionQaDiagnostics({
      payload: {
        reasonCode: "claim_tool_unavailable",
        requiredTools: ["tool_x"],
        availableTools: ["tool_z"],
      },
    });

    expect(toolNotObserved.blockedReason).toBe("tool_not_observed");
    expect(toolNotObserved.dispatchDecision).toBe("blocked_tool_not_observed");
    expect(toolNotObserved.blockedDetail).toBe(
      "tool_not_observed: required=[tool_x], observed=[tool_y]",
    );
    expect(toolUnavailable.blockedReason).toBe("tool_unavailable");
    expect(toolUnavailable.dispatchDecision).toBe("blocked_tool_unavailable");
    expect(toolUnavailable.blockedDetail).toBe(
      "tool_unavailable: required=[tool_x], available=[tool_z]",
    );
  });

  it("maps source-context preflight failures to deterministic blocked reasons", () => {
    const missingContext = buildActionCompletionQaDiagnostics({
      payload: {
        preflightReasonCode: "missing_audit_session_context",
        requiredTools: ["generate_audit_workflow_deliverable"],
        observedTools: ["generate_audit_workflow_deliverable"],
      },
    });
    const sessionNotFound = buildActionCompletionQaDiagnostics({
      payload: {
        preflightReasonCode: "audit_session_not_found",
        requiredTools: ["generate_audit_workflow_deliverable"],
        observedTools: ["generate_audit_workflow_deliverable"],
      },
    });

    expect(missingContext.blockedReason).toBe("missing_audit_session_context");
    expect(missingContext.dispatchDecision).toBe("blocked_missing_audit_session_context");
    expect(missingContext.blockedDetail).toContain("missing_audit_session_context");

    expect(sessionNotFound.blockedReason).toBe("audit_session_not_found");
    expect(sessionNotFound.dispatchDecision).toBe("blocked_audit_session_not_found");
    expect(sessionNotFound.blockedDetail).toContain("audit_session_not_found");
  });

  it("overrides stale tool_not_observed dispatch decision when preflight source-context reason is present", () => {
    const diagnostics = buildActionCompletionQaDiagnostics({
      payload: {
        preflightReasonCode: "missing_audit_session_context",
        reasonCode: "claim_tool_not_observed",
        requiredTools: ["generate_audit_workflow_deliverable"],
        observedTools: ["generate_audit_workflow_deliverable"],
      },
      samanthaAutoDispatch: {
        dispatchDecision: "blocked_tool_not_observed",
      },
    });

    expect(diagnostics.blockedReason).toBe("missing_audit_session_context");
    expect(diagnostics.dispatchDecision).toBe("blocked_missing_audit_session_context");
  });

  it("preserves explicit auto_dispatch_executed_email diagnostics from runtime telemetry", () => {
    const diagnostics = buildActionCompletionQaDiagnostics({
      enforcementMode: "enforce",
      payload: {
        requiredTools: ["generate_audit_workflow_deliverable"],
      },
      samanthaAutoDispatch: {
        dispatchDecision: "auto_dispatch_executed_email",
        attempted: true,
        executed: true,
      },
    });

    expect(diagnostics.dispatchDecision).toBe("auto_dispatch_executed_email");
    expect(diagnostics.blockedReason).toBeUndefined();
  });

  it("maps ambiguous dispatch blocks to deterministic blocked reasons", () => {
    const ambiguousName = buildActionCompletionQaDiagnostics({
      samanthaAutoDispatch: {
        dispatchDecision: "blocked_ambiguous_name",
      },
    });
    const ambiguousFounderContact = buildActionCompletionQaDiagnostics({
      samanthaAutoDispatch: {
        dispatchDecision: "blocked_ambiguous_founder_contact",
      },
    });

    expect(ambiguousName.dispatchDecision).toBe("blocked_ambiguous_name");
    expect(ambiguousName.blockedReason).toBe("ambiguous_name");
    expect(ambiguousFounderContact.dispatchDecision).toBe(
      "blocked_ambiguous_founder_contact",
    );
    expect(ambiguousFounderContact.blockedReason).toBe("ambiguous_founder_contact");
  });

  it("resolves deny reasons in stable priority order", () => {
    expect(
      resolveSuperAdminAgentQaDeniedReason({
        hasSessionId: false,
        isAuthenticated: false,
        isSuperAdmin: false,
      }),
    ).toBe("qa_session_missing");
    expect(
      resolveSuperAdminAgentQaDeniedReason({
        hasSessionId: true,
        isAuthenticated: false,
        isSuperAdmin: false,
      }),
    ).toBe("qa_session_invalid");
    expect(
      resolveSuperAdminAgentQaDeniedReason({
        hasSessionId: true,
        isAuthenticated: true,
        isSuperAdmin: false,
      }),
    ).toBe("qa_super_admin_required");
    expect(
      resolveSuperAdminAgentQaDeniedReason({
        hasSessionId: true,
        isAuthenticated: true,
        isSuperAdmin: true,
      }),
    ).toBe("qa_denied");
  });

  it("exposes a stable QA mode version token", () => {
    expect(SUPER_ADMIN_AGENT_QA_MODE_VERSION).toBe("super_admin_agent_qa_v1");
  });
});
