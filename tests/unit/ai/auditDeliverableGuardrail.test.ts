import { describe, expect, it } from "vitest";
import { resolveAuditDeliverableInvocationGuardrail } from "../../../convex/ai/agentExecution";
import {
  ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
  ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
  SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
} from "../../../convex/ai/samanthaAuditContract";

function buildTemplateActionCompletionContract(mode: "off" | "observe" | "enforce") {
  return {
    contractVersion: ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
    mode,
    outcomes: [
      {
        outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
        requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
        unavailableMessage: "tool unavailable fallback",
        notObservedMessage: "tool not observed fallback",
      },
    ],
  };
}

function buildClaim(status: "in_progress" | "completed" = "in_progress"): string {
  return [
    "```action_completion_claim",
    JSON.stringify({
      contractVersion: ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
      outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
      status,
    }),
    "```",
  ].join("\n");
}

describe("audit deliverable invocation guardrail", () => {
  it("passes when contract claim has observed tool execution in the same turn", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Generate my workflow report now.",
      assistantContent: `Generating your workflow report now.\n\n${buildClaim()}`,
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "success",
        },
      ],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
    });

    expect(result.enforced).toBe(false);
    expect(result.reason).toBeUndefined();
    expect(result.payload.status).toBe("pass");
    expect(result.payload.evidence?.contractVersion).toBe("action_completion_evidence_v1");
    expect(result.payload.evidence?.outcomeKey).toBe(AUDIT_DELIVERABLE_OUTCOME_KEY);
  });

  it("fails closed when contract claim exists without observed tool execution", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Generate my workflow report now.",
      assistantContent: `Generating now.\n\n${buildClaim("completed")}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages: [
        "My phone is +1 555-555-1212 and yes, founder contact is okay.",
      ],
      capturedEmail: "test@example.com",
      capturedName: "Ava Rivers",
    });

    expect(result.enforced).toBe(true);
    expect(result.reason).toBe("tool_not_invoked");
    expect(result.payload.reasonCode).toBe("claim_tool_not_observed");
    expect(result.payload.preflightReasonCode).toBe("tool_not_observed");
    expect(result.assistantContent).toContain("retry delivery");
  });

  it("emits missing_required_fields preflight reason when user requests PDF without qualification data", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Generate my workflow report now.",
      assistantContent: `Generating now.\n\n${buildClaim("completed")}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages: ["Need this today."],
      capturedEmail: null,
      capturedName: null,
    });

    expect(result.enforced).toBe(true);
    expect(result.reason).toBe("missing_required_fields");
    expect(result.payload.reasonCode).toBe("claim_tool_not_observed");
    expect(result.payload.preflightReasonCode).toBe("missing_required_fields");
    expect(result.payload.preflightMissingRequiredFields).toEqual([
      "email",
      "first_name",
      "founder_contact_preference",
      "last_name",
      "phone",
    ]);
  });

  it("builds targeted Samantha recovery prompt for partially parsed freeform payloads", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Generate my workflow report now.",
      assistantContent: `Generating now.\n\n${buildClaim("completed")}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages: [
        "Franziska Splettstoesser, info@apothekevital.de, ja Remington kann mich kontaktieren.",
      ],
      capturedEmail: null,
      capturedName: null,
    });

    expect(result.enforced).toBe(true);
    expect(result.reason).toBe("missing_required_fields");
    expect(result.payload.preflightMissingRequiredFields).toEqual(["phone"]);
    expect(result.assistantContent).toContain("I captured these details so far:");
    expect(result.assistantContent).toContain("Name: Franziska Splettstoesser");
    expect(result.assistantContent).toContain("Email: info@apothekevital.de");
    expect(result.assistantContent).toContain("Founder contact: Yes");
    expect(result.assistantContent).toContain("Please confirm your phone number.");
    expect(result.assistantContent).not.toContain("Please confirm your email address.");
  });

  it("does not flag first/last name as missing when provided as explicit split fields", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Generate my workflow report now.",
      assistantContent: `Generating now.\n\n${buildClaim("completed")}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages: [
        "first_name: Ava",
        "last_name: Rivers",
        "phone: +1 555-555-1212",
        "yes, founder contact is okay",
      ],
      capturedEmail: "test@example.com",
      capturedName: null,
    });

    expect(result.enforced).toBe(true);
    expect(result.reason).toBe("tool_not_invoked");
    expect(result.payload.preflightReasonCode).toBe("tool_not_observed");
    expect(result.payload.preflightMissingRequiredFields).toBeUndefined();
  });

  it("accepts German Vorname/Nachname fields and does not emit missing_required_fields for names", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage:
        "Hier sind alle Daten für den Implementierungsplan als PDF, bitte jetzt sofort mit generate_audit_workflow_deliverable erstellen und senden.",
      assistantContent: `Ich erstelle es jetzt.\n\n${buildClaim("completed")}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages: [
        "Vorname: Franziska",
        "Nachname: Splettstoeser",
        "E-Mail: info@apothekevital.de",
        "Telefon: +49 151 40427103",
        "Founder-Contact gewünscht: Ja",
      ],
      capturedEmail: null,
      capturedName: null,
    });

    expect(result.enforced).toBe(true);
    expect(result.reason).toBe("tool_not_invoked");
    expect(result.payload.preflightReasonCode).toBe("tool_not_observed");
    expect(result.payload.preflightMissingRequiredFields).toBeUndefined();
  });

  it("accepts arbitrary structured name labels when two name-token fields are provided", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Generate now with generate_audit_workflow_deliverable.",
      assistantContent: `Working on it.\n\n${buildClaim("completed")}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages: [
        "prenom: Ava",
        "nom: Rivers",
        "email: ava@example.com",
        "phone: +33 6 12 34 56 78",
        "founder contact preference: yes",
      ],
      capturedEmail: null,
      capturedName: null,
    });

    expect(result.enforced).toBe(true);
    expect(result.reason).toBe("tool_not_invoked");
    expect(result.payload.preflightReasonCode).toBe("tool_not_observed");
    expect(result.payload.preflightMissingRequiredFields).toBeUndefined();
  });

  it("enforces for non-Samantha templates when metadata declares enforce mode", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: "custom_sales_template",
        actionCompletionContract: buildTemplateActionCompletionContract("enforce"),
      },
      inboundMessage: "generate the file",
      assistantContent: `Done.\n\n${buildClaim("completed")}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
    });

    expect(result.enforced).toBe(true);
    expect(result.payload.enforcementMode).toBe("enforce");
    expect(result.payload.reasonCode).toBe("claim_tool_not_observed");
    expect(result.assistantContent).toContain("did not execute in this turn");
  });

  it("does not fail-closed in observe mode (migration-safe) even when claim is unsupported", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: "custom_sales_template",
        actionCompletionContract: buildTemplateActionCompletionContract("observe"),
      },
      inboundMessage: "generate the file",
      assistantContent: `Done.\n\n${buildClaim("completed")}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
    });

    expect(result.enforced).toBe(false);
    expect(result.reason).toBeUndefined();
    expect(result.payload.enforcementMode).toBe("observe");
    expect(result.payload.observedViolation).toBe(true);
    expect(result.payload.reasonCode).toBe("claim_tool_not_observed");
  });

  it("keeps enforcement language-agnostic (German content + structured claim)", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage:
        "Hier sind alle Daten, bitte jetzt sofort den Implementierungsplan als PDF erstellen und senden.",
      assistantContent: `Perfekt, ich bereite alles vor.\n\n${buildClaim()}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
    });

    expect(result.enforced).toBe(true);
    expect(result.payload.reasonCode).toBe("claim_tool_not_observed");
  });

  it("enforces unavailable-tool fallback when scope removed the tool", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        displayName: "Samantha",
        enabledTools: [AUDIT_DELIVERABLE_TOOL_NAME],
      },
      inboundMessage: "Please generate the PDF report now.",
      assistantContent: `One moment.\n\n${buildClaim("completed")}`,
      toolResults: [],
      availableToolNames: [],
    });

    expect(result.enforced).toBe(true);
    expect(result.reason).toBe("tool_unavailable");
    expect(result.assistantContent).toContain("not available yet in the current runtime scope");
    expect(result.payload.reasonCode).toBe("claim_tool_unavailable");
  });

  it("fails closed for warm Samantha when user explicitly requests PDF generation without a claim block", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
        actionCompletionContract: buildTemplateActionCompletionContract("enforce"),
      },
      inboundMessage:
        `Bitte jetzt sofort mit ${AUDIT_DELIVERABLE_TOOL_NAME} erstellen und senden.`,
      assistantContent:
        "Ich habe Ihre Daten aufgenommen und leite weiter.",
      toolResults: [],
      availableToolNames: [],
    });

    expect(result.enforced).toBe(true);
    expect(result.reason).toBe("tool_unavailable");
    expect(result.payload.reasonCode).toBe("claim_tool_unavailable");
  });

  it("does not enforce for non-contracted runtimes", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: "some_other_template",
      },
      inboundMessage: "Generate my implementation PDF now.",
      assistantContent: `Generating now.\n\n${buildClaim()}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
    });

    expect(result.enforced).toBe(false);
    expect(result.payload.status).toBe("pass");
    expect(result.payload.enforcementMode).toBe("off");
  });

  it("fails closed when claim block payload is malformed", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Generate my implementation PDF now.",
      assistantContent:
        "Generating now.\n\n```action_completion_claim\n{\"status\":\"in_progress\"}\n```",
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
    });

    expect(result.enforced).toBe(true);
    expect(result.payload.reasonCode).toBe("claim_payload_invalid");
    expect(result.assistantContent).toContain("invalid");
  });
});
