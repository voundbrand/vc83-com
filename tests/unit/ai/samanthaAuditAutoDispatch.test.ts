import { describe, expect, it } from "vitest";

import {
  ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
  resolveSamanthaClaimRecoveryDecision,
  resolveAuditDeliverableInvocationGuardrail,
  resolveSamanthaAuditAutoDispatchPlan,
  shouldAttemptSamanthaClaimRecoveryAutoDispatch,
} from "../../../convex/ai/agentExecution";
import {
  ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
  ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
  SAMANTHA_RUNTIME_MODULE_ADAPTER,
} from "../../../convex/ai/samanthaAuditContract";

describe("Samantha audit auto-dispatch planner", () => {
  const enforcementContract = {
    contractVersion: ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
    mode: "enforce" as const,
    outcomes: [
      {
        outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
        requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
        unavailableMessage: "tool unavailable",
        notObservedMessage: "tool not observed",
      },
    ],
  };
  const completionClaim = [
    "```action_completion_claim",
    JSON.stringify({
      contractVersion: ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
      outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
      status: "completed",
    }),
    "```",
  ].join("\n");

  it("builds deterministic tool args from multilingual structured input", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "Prenom: Amelie",
        "Nom: Dupont",
        "Email: amelie.dupont@example.fr",
        "Telephone: +33 6 12 34 56 78",
        "Preference de contact fondateur: oui",
        "Veuillez generer le PDF maintenant.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
      auditSessionWorkflowRecommendation: "Automate lead triage and follow-up routing.",
    });

    expect(plan.shouldDispatch).toBe(true);
    expect(plan.skipReasonCodes).toEqual([]);
    expect(plan.missingRequiredFields).toEqual([]);
    expect(plan.toolArgs).toMatchObject({
      email: "amelie.dupont@example.fr",
      firstName: "Amelie",
      lastName: "Dupont",
      phone: "+33612345678",
      founderContactRequested: true,
      workflowRecommendation: "Automate lead triage and follow-up routing.",
    });
  });

  it("parses comma-delimited freeform intake payloads and keeps dispatch eligible", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "Franziska Splettstoesser, info@apothekevital.de, +49 151 40427103,",
        "Apotheke, 6million, nein ki, ja ich habe budget, ja Remington kann mich kontaktieren.",
        "Bitte jetzt den PDF Report erstellen.",
      ].join(" "),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.shouldDispatch).toBe(true);
    expect(plan.missingRequiredFields).toEqual([]);
    expect(plan.ambiguousFounderContact).toBe(false);
    expect(plan.toolArgs).toMatchObject({
      firstName: "Franziska",
      lastName: "Splettstoesser",
      email: "info@apothekevital.de",
      phone: "+4915140427103",
      founderContactRequested: true,
    });
  });

  it("supports mononym payloads deterministically by duplicating into split name fields", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "email: prince@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: "Prince",
      contactMemory: [],
      auditSessionWorkflowRecommendation: "Automate lead routing.",
    });

    expect(plan.ambiguousName).toBe(false);
    expect(plan.shouldDispatch).toBe(true);
    expect(plan.toolArgs?.firstName).toBe("Prince");
    expect(plan.toolArgs?.lastName).toBe("Prince");
  });

  it("marks malformed multi-token names as ambiguous and blocks auto-dispatch", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "email: someone@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: "Ava ???",
      contactMemory: [],
    });

    expect(plan.ambiguousName).toBe(true);
    expect(plan.shouldDispatch).toBe(false);
  });

  it("does not dispatch when required fields are missing", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Please generate my PDF. Email: someone@example.com",
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.shouldDispatch).toBe(false);
    expect(plan.skipReasonCodes).toContain("missing_required_fields");
    expect(plan.missingRequiredFields).toEqual([
      "first_name",
      "founder_contact_preference",
      "last_name",
      "phone",
    ]);
  });

  it("materializes dispatch args for claim-recovery even when message only confirms fields", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
      auditSessionWorkflowRecommendation: "Automate lead triage and response routing.",
    });

    expect(plan.requestDetected).toBe(false);
    expect(plan.shouldDispatch).toBe(false);
    expect(plan.toolArgs).toMatchObject({
      email: "ava@example.com",
      firstName: "Ava",
      lastName: "Rivers",
      phone: "+14155551212",
      founderContactRequested: true,
    });
  });

  it("does not dispatch when the deliverable tool is unavailable", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.toolAvailable).toBe(false);
    expect(plan.missingRequiredFields).toEqual([]);
    expect(plan.shouldDispatch).toBe(false);
  });

  it("marks ambiguous founder-contact phrasing as blocked", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes no",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.ambiguousFounderContact).toBe(true);
    expect(plan.shouldDispatch).toBe(false);
    expect(plan.missingRequiredFields).toContain("founder_contact_preference");
  });

  it("adds deterministic docx request hint to tool args when explicitly requested", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate DOCX now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.shouldDispatch).toBe(true);
    expect(plan.toolArgs?.outputFormats).toEqual(["pdf", "docx"]);
  });

  it("does not treat unrelated boolean fields as founder-contact ambiguity when structured founder row exists", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "Vorname: Franziska",
        "Nachname: Splettstoeser",
        "E-Mail: info@apothekevital.de",
        "Telefon: +49 151 40427103",
        "Founder-Contact gewünscht: Ja",
        "KI-Projekterfahrung: Nein",
        "Bitte jetzt sofort das PDF erstellen und senden.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.ambiguousFounderContact).toBe(false);
    expect(plan.missingRequiredFields).not.toContain("founder_contact_preference");
    expect(plan.shouldDispatch).toBe(true);
    expect(plan.toolArgs?.founderContactRequested).toBe(true);
  });

  it("does not dispatch twice in the same turn when tool call already exists", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "success",
        },
      ],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.alreadyAttempted).toBe(true);
    expect(plan.preexistingInvocationStatus).toBe("executed_success");
    expect(plan.retryEligibleAfterFailure).toBe(false);
    expect(plan.shouldDispatch).toBe(false);
  });

  it("re-opens deterministic auto-dispatch after a prior failed tool attempt when all required fields are present", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "error",
          error: "missing_required_contact_fields",
        },
      ],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.alreadyAttempted).toBe(true);
    expect(plan.preexistingInvocationStatus).toBe("executed_error");
    expect(plan.retryEligibleAfterFailure).toBe(true);
    expect(plan.skipReasonCodes).not.toContain("tool_already_attempted");
    expect(plan.shouldDispatch).toBe(true);
  });

  it("does not retry auto-dispatch when a prior in-turn attempt is pending approval", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "pending_approval",
        },
      ],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.alreadyAttempted).toBe(true);
    expect(plan.preexistingInvocationStatus).toBe("queued_pending_approval");
    expect(plan.retryEligibleAfterFailure).toBe(false);
    expect(plan.skipReasonCodes).toContain("tool_already_attempted");
    expect(plan.shouldDispatch).toBe(false);
  });

  it("treats model-selected deliverable tool as request detection for confirmation replies", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "go ahead and try",
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      requestedToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages: [
        "first_name: Franziska",
        "last_name: Splettstoeser",
        "email: info@apothekevital.de",
        "phone: +49 151 40427103",
        "founder contact preference: yes",
      ],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
      auditSessionWorkflowRecommendation: "Vacation request management automation.",
    });

    expect(plan.requestDetected).toBe(true);
    expect(plan.retryEligibleAfterFailure).toBe(false);
    expect(plan.missingRequiredFields).toEqual([]);
    expect(plan.shouldDispatch).toBe(true);
    expect(plan.skipReasonCodes).toEqual([]);
  });

  it("retries auto-dispatch when confirmation reply follows a model-selected in-turn error", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "ok go for it",
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "error",
          error: "missing_required_contact_fields",
        },
      ],
      requestedToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages: [
        "first_name: Franziska",
        "last_name: Splettstoeser",
        "email: info@apothekevital.de",
        "phone: +49 151 40427103",
        "founder contact preference: yes",
      ],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
      auditSessionWorkflowRecommendation: "Vacation request management automation.",
    });

    expect(plan.requestDetected).toBe(true);
    expect(plan.preexistingInvocationStatus).toBe("executed_error");
    expect(plan.retryEligibleAfterFailure).toBe(true);
    expect(plan.shouldDispatch).toBe(true);
    expect(plan.skipReasonCodes).toEqual([]);
  });

  it("recovers phone from free-form recent history and unlocks retry after prior execution error", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Please generate the workflow PDF now.",
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "error",
          error: "missing_required_contact_fields",
        },
      ],
      recentUserMessages: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "my number is 415-555-1212",
        "founder contact preference: yes",
      ],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.missingRequiredFields).toEqual([]);
    expect(plan.toolArgs?.phone).toBe("4155551212");
    expect(plan.preexistingInvocationStatus).toBe("executed_error");
    expect(plan.retryEligibleAfterFailure).toBe(true);
    expect(plan.shouldDispatch).toBe(true);
  });

  it("remains disabled for non-Samantha templates", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: "custom_sales_template",
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(plan.eligible).toBe(false);
    expect(plan.shouldDispatch).toBe(false);
    expect(plan.skipReasonCodes).toContain("not_samantha_runtime");
  });

  it("marks missing source context deterministically when tool invocation fails with context error", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
        actionCompletionContract: enforcementContract,
      },
      inboundMessage: "Generate the workflow report PDF now.",
      assistantContent: `Running it.\n\n${completionClaim}`,
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "error",
          result: {
            success: false,
            error: "missing_audit_session_context",
          },
        },
      ],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
    });

    expect(result.enforced).toBe(true);
    expect(result.payload.reasonCode).toBe("claim_tool_not_observed");
    expect(result.payload.preflightReasonCode).toBe("missing_audit_session_context");
    expect(result.reason).toBe("missing_audit_session_context");
  });

  it("marks missing audit session deterministically when tool invocation cannot find source session", () => {
    const result = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
        actionCompletionContract: enforcementContract,
      },
      inboundMessage: "Generate the workflow report PDF now.",
      assistantContent: `Running it.\n\n${completionClaim}`,
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "error",
          result: {
            success: false,
            error: "audit_session_not_found",
          },
        },
      ],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
    });

    expect(result.enforced).toBe(true);
    expect(result.payload.reasonCode).toBe("claim_tool_not_observed");
    expect(result.payload.preflightReasonCode).toBe("audit_session_not_found");
    expect(result.reason).toBe("audit_session_not_found");
  });

  it("attempts claim-recovery auto-dispatch when Samantha claim was blocked as tool_not_observed", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
      auditSessionWorkflowRecommendation: "Automate inbound lead qualification triage.",
    });

    expect(
      shouldAttemptSamanthaClaimRecoveryAutoDispatch({
        plan,
        alreadyAttempted: false,
        enforcementPayload: {
          contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
          status: "enforced",
          enforcementMode: "enforce",
          observedViolation: true,
          reasonCode: "claim_tool_not_observed",
          outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
          requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
          observedTools: [],
          availableTools: [AUDIT_DELIVERABLE_TOOL_NAME],
          malformedClaimCount: 0,
        },
      }),
    ).toBe(true);
  });

  it("recovers in-turn when fields are confirmed but no explicit generate verb is present", () => {
    const recentUserMessages = [
      "First Name: Franziska",
      "Last Name: Splettstoeser",
      "Email: info@apothekevital.de",
      "Phone: +49 151 40427103",
      "Founder Contact: yes",
      "Do you have all my information?",
    ];
    const inboundMessage = "ok go for it";

    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage,
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages,
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
      auditSessionWorkflowRecommendation: "Vacation request management agent",
    });

    expect(plan.requestDetected).toBe(false);
    expect(plan.shouldDispatch).toBe(false);
    expect(plan.missingRequiredFields).toEqual([]);
    expect(plan.toolArgs).toMatchObject({
      email: "info@apothekevital.de",
      firstName: "Franziska",
      lastName: "Splettstoeser",
      phone: "+4915140427103",
      founderContactRequested: true,
    });

    const blockedGuardrail = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
        actionCompletionContract: enforcementContract,
      },
      inboundMessage,
      assistantContent: `Running now.\n\n${completionClaim}`,
      toolResults: [],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages,
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(blockedGuardrail.enforced).toBe(true);
    expect(blockedGuardrail.reason).toBe("tool_not_invoked");
    expect(blockedGuardrail.payload.reasonCode).toBe("claim_tool_not_observed");
    expect(blockedGuardrail.payload.preflightReasonCode).toBe("tool_not_observed");

    expect(
      shouldAttemptSamanthaClaimRecoveryAutoDispatch({
        plan,
        alreadyAttempted: false,
        enforcementPayload: blockedGuardrail.payload,
      })
    ).toBe(true);

    const recoveredGuardrail = resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
        actionCompletionContract: enforcementContract,
      },
      inboundMessage,
      assistantContent: `Running now.\n\n${completionClaim}`,
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "success",
          result: {
            success: true,
            deliverableUrl: "https://example.com/audit.pdf",
          },
        },
      ],
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      recentUserMessages,
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(recoveredGuardrail.enforced).toBe(false);
    expect(recoveredGuardrail.reason).toBeUndefined();
    expect(recoveredGuardrail.payload.status).toBe("pass");
  });

  it("does not attempt claim-recovery auto-dispatch when required fields are missing", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: "Generate PDF now. Email: ava@example.com",
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    expect(
      shouldAttemptSamanthaClaimRecoveryAutoDispatch({
        plan,
        alreadyAttempted: false,
        enforcementPayload: {
          contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
          status: "enforced",
          enforcementMode: "enforce",
          observedViolation: true,
          reasonCode: "claim_tool_not_observed",
          outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
          requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
          observedTools: [],
          availableTools: [AUDIT_DELIVERABLE_TOOL_NAME],
          malformedClaimCount: 0,
        },
      }),
    ).toBe(false);

    expect(
      resolveSamanthaClaimRecoveryDecision({
        plan,
        alreadyAttempted: false,
        enforcementPayload: {
          contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
          status: "enforced",
          enforcementMode: "enforce",
          observedViolation: true,
          reasonCode: "claim_tool_not_observed",
          outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
          requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
          observedTools: [],
          availableTools: [AUDIT_DELIVERABLE_TOOL_NAME],
          malformedClaimCount: 0,
        },
      }).reasonCode
    ).toBe("lead_data_incomplete");
  });

  it("returns retry_eligible_after_failure when recovery should retry after a prior execution error", () => {
    const plan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "error",
          error: "deliverable_generation_failed",
        },
      ],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    const decision = resolveSamanthaClaimRecoveryDecision({
      plan,
      alreadyAttempted: false,
      enforcementPayload: {
        contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
        status: "enforced",
        enforcementMode: "enforce",
        observedViolation: true,
        reasonCode: "claim_tool_not_observed",
        outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
        requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
        observedTools: [],
        availableTools: [AUDIT_DELIVERABLE_TOOL_NAME],
        malformedClaimCount: 0,
      },
    });

    expect(decision.shouldAttempt).toBe(true);
    expect(decision.reasonCode).toBe("retry_eligible_after_failure");
  });

  it("keeps auto-dispatch invocation status parity between runtime adapter and planner matrix", () => {
    const scenarios: Array<{
      label: string;
      toolResults: Array<{
        tool: string;
        status: "success" | "pending_approval" | "blocked" | "disabled" | "error";
        error?: string;
      }>;
      expectedStatus:
        | "not_attempted"
        | "queued_pending_approval"
        | "executed_success"
        | "executed_error"
        | "executed_blocked"
        | "executed_disabled";
    }> = [
      {
        label: "not_attempted",
        toolResults: [],
        expectedStatus: "not_attempted",
      },
      {
        label: "executed_success",
        toolResults: [{ tool: AUDIT_DELIVERABLE_TOOL_NAME, status: "success" }],
        expectedStatus: "executed_success",
      },
      {
        label: "queued_pending_approval",
        toolResults: [{ tool: AUDIT_DELIVERABLE_TOOL_NAME, status: "pending_approval" }],
        expectedStatus: "queued_pending_approval",
      },
      {
        label: "executed_blocked",
        toolResults: [{ tool: AUDIT_DELIVERABLE_TOOL_NAME, status: "blocked" }],
        expectedStatus: "executed_blocked",
      },
      {
        label: "executed_disabled",
        toolResults: [{ tool: AUDIT_DELIVERABLE_TOOL_NAME, status: "disabled" }],
        expectedStatus: "executed_disabled",
      },
      {
        label: "executed_error",
        toolResults: [
          {
            tool: AUDIT_DELIVERABLE_TOOL_NAME,
            status: "error",
            error: "deliverable_generation_failed",
          },
        ],
        expectedStatus: "executed_error",
      },
    ];

    const matrix = scenarios.map((scenario) => {
      const attempted = scenario.toolResults.length > 0;
      const adapterStatus = SAMANTHA_RUNTIME_MODULE_ADAPTER.resolveAutoDispatchInvocationStatus({
        attempted,
        toolResults: scenario.toolResults,
      });
      const plan = resolveSamanthaAuditAutoDispatchPlan({
        authorityConfig: {
          templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
        },
        inboundMessage: [
          "first_name: Ava",
          "last_name: Rivers",
          "email: ava@example.com",
          "phone: +1 415 555 1212",
          "founder contact preference: yes",
          "Generate PDF now.",
        ].join("\n"),
        availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
        toolResults: scenario.toolResults,
        recentUserMessages: [],
        capturedEmail: null,
        capturedName: null,
        contactMemory: [],
      });
      return {
        label: scenario.label,
        adapterStatus,
        plannerStatus: plan.preexistingInvocationStatus,
        expectedStatus: scenario.expectedStatus,
      };
    });

    expect(matrix).toEqual([
      {
        label: "not_attempted",
        adapterStatus: "not_attempted",
        plannerStatus: "not_attempted",
        expectedStatus: "not_attempted",
      },
      {
        label: "executed_success",
        adapterStatus: "executed_success",
        plannerStatus: "executed_success",
        expectedStatus: "executed_success",
      },
      {
        label: "queued_pending_approval",
        adapterStatus: "queued_pending_approval",
        plannerStatus: "queued_pending_approval",
        expectedStatus: "queued_pending_approval",
      },
      {
        label: "executed_blocked",
        adapterStatus: "executed_blocked",
        plannerStatus: "executed_blocked",
        expectedStatus: "executed_blocked",
      },
      {
        label: "executed_disabled",
        adapterStatus: "executed_disabled",
        plannerStatus: "executed_disabled",
        expectedStatus: "executed_disabled",
      },
      {
        label: "executed_error",
        adapterStatus: "executed_error",
        plannerStatus: "executed_error",
        expectedStatus: "executed_error",
      },
    ]);
  });

  it("keeps claim-recovery decision parity matrix between wrapper and runtime adapter", () => {
    const basePlan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: {
        templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      },
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
        "Generate PDF now.",
      ].join("\n"),
      availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
      toolResults: [],
      recentUserMessages: [],
      capturedEmail: null,
      capturedName: null,
      contactMemory: [],
    });

    const buildPayload = (args: {
      reasonCode?: "claim_tool_not_observed" | "claim_tool_unavailable";
      outcome?: string;
      requiredTools?: string[];
    }) => {
      if (!args.reasonCode) {
        return null;
      }
      return {
        contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
        status: "enforced" as const,
        enforcementMode: "enforce" as const,
        observedViolation: true,
        reasonCode: args.reasonCode,
        outcome: args.outcome || AUDIT_DELIVERABLE_OUTCOME_KEY,
        requiredTools: args.requiredTools || [AUDIT_DELIVERABLE_TOOL_NAME],
        observedTools: [],
        availableTools: [AUDIT_DELIVERABLE_TOOL_NAME],
        malformedClaimCount: 0,
      };
    };

    const scenarios: Array<{
      label: string;
      plan: typeof basePlan | null;
      alreadyAttempted: boolean;
      enforcementPayload: ReturnType<typeof buildPayload>;
      expectedReasonCode:
        | "plan_missing"
        | "already_attempted"
        | "not_samantha_runtime"
        | "tool_unavailable_in_scope"
        | "tool_already_attempted"
        | "lead_data_incomplete"
        | "enforcement_reason_not_tool_not_observed"
        | "enforcement_not_audit_deliverable"
        | "retry_eligible_after_failure"
        | "eligible_for_recovery";
      expectedShouldAttempt: boolean;
    }> = [
      {
        label: "plan_missing",
        plan: null,
        alreadyAttempted: false,
        enforcementPayload: buildPayload({ reasonCode: "claim_tool_not_observed" }),
        expectedReasonCode: "plan_missing",
        expectedShouldAttempt: false,
      },
      {
        label: "already_attempted_flag",
        plan: basePlan,
        alreadyAttempted: true,
        enforcementPayload: buildPayload({ reasonCode: "claim_tool_not_observed" }),
        expectedReasonCode: "already_attempted",
        expectedShouldAttempt: false,
      },
      {
        label: "not_samantha_runtime",
        plan: { ...basePlan, eligible: false },
        alreadyAttempted: false,
        enforcementPayload: buildPayload({ reasonCode: "claim_tool_not_observed" }),
        expectedReasonCode: "not_samantha_runtime",
        expectedShouldAttempt: false,
      },
      {
        label: "tool_unavailable",
        plan: { ...basePlan, toolAvailable: false },
        alreadyAttempted: false,
        enforcementPayload: buildPayload({ reasonCode: "claim_tool_not_observed" }),
        expectedReasonCode: "tool_unavailable_in_scope",
        expectedShouldAttempt: false,
      },
      {
        label: "tool_already_attempted",
        plan: {
          ...basePlan,
          alreadyAttempted: true,
          retryEligibleAfterFailure: false,
        },
        alreadyAttempted: false,
        enforcementPayload: buildPayload({ reasonCode: "claim_tool_not_observed" }),
        expectedReasonCode: "tool_already_attempted",
        expectedShouldAttempt: false,
      },
      {
        label: "lead_data_incomplete",
        plan: {
          ...basePlan,
          toolArgs: undefined,
          missingRequiredFields: ["phone"],
        },
        alreadyAttempted: false,
        enforcementPayload: buildPayload({ reasonCode: "claim_tool_not_observed" }),
        expectedReasonCode: "lead_data_incomplete",
        expectedShouldAttempt: false,
      },
      {
        label: "enforcement_reason_mismatch",
        plan: basePlan,
        alreadyAttempted: false,
        enforcementPayload: buildPayload({ reasonCode: "claim_tool_unavailable" }),
        expectedReasonCode: "enforcement_reason_not_tool_not_observed",
        expectedShouldAttempt: false,
      },
      {
        label: "enforcement_not_audit_deliverable",
        plan: basePlan,
        alreadyAttempted: false,
        enforcementPayload: buildPayload({
          reasonCode: "claim_tool_not_observed",
          outcome: "other_outcome",
          requiredTools: ["other_tool"],
        }),
        expectedReasonCode: "enforcement_not_audit_deliverable",
        expectedShouldAttempt: false,
      },
      {
        label: "retry_eligible_after_failure",
        plan: { ...basePlan, retryEligibleAfterFailure: true },
        alreadyAttempted: false,
        enforcementPayload: buildPayload({ reasonCode: "claim_tool_not_observed" }),
        expectedReasonCode: "retry_eligible_after_failure",
        expectedShouldAttempt: true,
      },
      {
        label: "eligible_for_recovery",
        plan: basePlan,
        alreadyAttempted: false,
        enforcementPayload: buildPayload({ reasonCode: "claim_tool_not_observed" }),
        expectedReasonCode: "eligible_for_recovery",
        expectedShouldAttempt: true,
      },
    ];

    const matrix = scenarios.map((scenario) => {
      const wrapperDecision = resolveSamanthaClaimRecoveryDecision({
        plan: scenario.plan,
        alreadyAttempted: scenario.alreadyAttempted,
        enforcementPayload: scenario.enforcementPayload,
      });
      const adapterDecision = SAMANTHA_RUNTIME_MODULE_ADAPTER.resolveClaimRecoveryDecision({
        plan: scenario.plan,
        alreadyAttempted: scenario.alreadyAttempted,
        enforcementReasonCode: scenario.enforcementPayload?.reasonCode,
        enforcementTargetsAuditDeliverable: Boolean(
          scenario.enforcementPayload
          && scenario.enforcementPayload.outcome === AUDIT_DELIVERABLE_OUTCOME_KEY
          && scenario.enforcementPayload.requiredTools.includes(
            AUDIT_DELIVERABLE_TOOL_NAME
          )
        ),
      });
      const wrapperShouldAttempt = shouldAttemptSamanthaClaimRecoveryAutoDispatch({
        plan: scenario.plan,
        alreadyAttempted: scenario.alreadyAttempted,
        enforcementPayload: scenario.enforcementPayload,
      });
      const adapterShouldAttempt =
        SAMANTHA_RUNTIME_MODULE_ADAPTER.shouldAttemptClaimRecoveryAutoDispatch({
          plan: scenario.plan,
          alreadyAttempted: scenario.alreadyAttempted,
          enforcementReasonCode: scenario.enforcementPayload?.reasonCode,
          enforcementTargetsAuditDeliverable: Boolean(
            scenario.enforcementPayload
            && scenario.enforcementPayload.outcome === AUDIT_DELIVERABLE_OUTCOME_KEY
            && scenario.enforcementPayload.requiredTools.includes(
              AUDIT_DELIVERABLE_TOOL_NAME
            )
          ),
        });

      expect(wrapperDecision).toEqual(adapterDecision);
      expect(wrapperShouldAttempt).toBe(adapterShouldAttempt);

      return {
        label: scenario.label,
        reasonCode: wrapperDecision.reasonCode,
        shouldAttempt: wrapperDecision.shouldAttempt,
      };
    });

    expect(matrix).toEqual([
      {
        label: "plan_missing",
        reasonCode: "plan_missing",
        shouldAttempt: false,
      },
      {
        label: "already_attempted_flag",
        reasonCode: "already_attempted",
        shouldAttempt: false,
      },
      {
        label: "not_samantha_runtime",
        reasonCode: "not_samantha_runtime",
        shouldAttempt: false,
      },
      {
        label: "tool_unavailable",
        reasonCode: "tool_unavailable_in_scope",
        shouldAttempt: false,
      },
      {
        label: "tool_already_attempted",
        reasonCode: "tool_already_attempted",
        shouldAttempt: false,
      },
      {
        label: "lead_data_incomplete",
        reasonCode: "lead_data_incomplete",
        shouldAttempt: false,
      },
      {
        label: "enforcement_reason_mismatch",
        reasonCode: "enforcement_reason_not_tool_not_observed",
        shouldAttempt: false,
      },
      {
        label: "enforcement_not_audit_deliverable",
        reasonCode: "enforcement_not_audit_deliverable",
        shouldAttempt: false,
      },
      {
        label: "retry_eligible_after_failure",
        reasonCode: "retry_eligible_after_failure",
        shouldAttempt: true,
      },
      {
        label: "eligible_for_recovery",
        reasonCode: "eligible_for_recovery",
        shouldAttempt: true,
      },
    ]);
  });
});
