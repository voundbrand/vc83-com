import { describe, expect, it, vi } from "vitest";

import {
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
} from "../../../convex/ai/samanthaAuditContract";
import {
  executeSamanthaCapabilityGapUnavailableHandling,
  type SamanthaAutoDispatchRuntimeEnforcementPayloadLike,
  type SamanthaCapabilityGapLinearIssue,
  type SamanthaCapabilityGapUnavailableHandlingArgs,
} from "../../../convex/ai/agents/samantha/runtimeModule";

interface TestEnforcementPayload extends SamanthaAutoDispatchRuntimeEnforcementPayloadLike {
  contractVersion: string;
  status: "pass" | "enforced";
  observedViolation: boolean;
}

function buildPayload(
  overrides: Partial<TestEnforcementPayload> = {},
): TestEnforcementPayload {
  return {
    contractVersion: "test_contract",
    status: "pass",
    observedViolation: false,
    reasonCode: undefined,
    preflightReasonCode: undefined,
    preflightMissingRequiredFields: undefined,
    outcome: undefined,
    requiredTools: [],
    availableTools: [],
    enforcementMode: "enforce",
    ...overrides,
  };
}

function buildBaseArgs(
  overrides: Partial<
    SamanthaCapabilityGapUnavailableHandlingArgs<
      TestEnforcementPayload,
      SamanthaCapabilityGapLinearIssue
    >
  > = {},
): SamanthaCapabilityGapUnavailableHandlingArgs<
  TestEnforcementPayload,
  SamanthaCapabilityGapLinearIssue
> {
  return {
    organizationId: "org_1",
    organizationName: "Org One",
    sessionId: "session_1",
    turnId: "turn_1",
    inboundMessage: "Please generate the report.",
    assistantContent: "Acknowledged.",
    actionCompletionTicketRequestIntent: false,
    actionCompletionResponseLanguage: "en",
    actionCompletionEnforcement: null,
    actionCompletionEnforcementPayload: null,
    actionCompletionLinearIssue: null,
    samanthaCapabilityGapFallbackDelivery: null,
    recentUserMessagesForPreflight: ["my email is ava@example.com"],
    preflightAuditSession: {
      capturedEmail: "ava@example.com",
      capturedName: "Ava Rivers",
    },
    preflightAuditLookupTarget: {
      ok: false,
    },
    sourceAuditContext: {
      ingressChannel: "webchat",
    },
    runtimeIncident: {
      proposalKey: "scope_key_1",
      manifestHash: "manifest_hash_1",
      idempotencyKey: "idem_1",
      idempotencyScopeKey: "scope_key_1",
      payloadHash: "payload_hash_1",
    },
    formatCapabilityGapLinearIssueLine: () => "Feature request ticket created internally.",
    createFeatureRequestIssue: vi.fn(async () => ({
      issueId: "issue_1",
      issueNumber: "LIN-1",
      issueUrl: "https://linear.example/LIN-1",
    })),
    notifyRuntimeIncident: vi.fn(async () => null),
    scheduleRuntimeIncidentAlert: vi.fn(async () => {}),
    buildRuntimeIncidentThreadDeepLink: vi.fn(() => "https://thread.example/fallback"),
    resolveAuditSessionForLookupTarget: vi.fn(async () => null),
    resolveDomainConfigIdForOrg: vi.fn(async () => "domain_1"),
    sendEmail: vi.fn(async () => ({
      success: true,
      messageId: "msg_1",
    })),
    onError: vi.fn(),
    ...overrides,
  };
}

describe("Samantha capability-gap unavailable handling", () => {
  it("creates a Linear issue and appends the internal-ticket line for enforced unavailable claims", async () => {
    const createFeatureRequestIssue = vi.fn(async () => ({
      issueId: "issue_2",
      issueNumber: "LIN-2",
      issueUrl: "https://linear.example/LIN-2",
    }));
    const args = buildBaseArgs({
      assistantContent: "I cannot complete this outcome right now.",
      actionCompletionTicketRequestIntent: true,
      actionCompletionEnforcement: {
        enforced: true,
        payload: buildPayload({
          reasonCode: "claim_tool_unavailable",
          outcome: "generic_outcome",
          requiredTools: ["generic_tool"],
          availableTools: [],
        }),
      },
      createFeatureRequestIssue,
    });

    const result = await executeSamanthaCapabilityGapUnavailableHandling(args);

    expect(createFeatureRequestIssue).toHaveBeenCalledTimes(1);
    expect(createFeatureRequestIssue.mock.calls[0]?.[0]).toMatchObject({
      category: "action_completion_capability_gap",
      toolName: "generic_tool",
      organizationName: "Org One",
    });
    expect(result.actionCompletionLinearIssue?.issueNumber).toBe("LIN-2");
    expect(result.assistantContent).toContain("Feature request ticket created internally.");
  });

  it("notifies runtime incident and triggers fallback deliveries for Samantha audit deliverable gaps", async () => {
    const createFeatureRequestIssue = vi.fn(async () => ({
      issueId: "issue_3",
      issueNumber: "LIN-3",
      issueUrl: "https://linear.example/LIN-3",
    }));
    const notifyRuntimeIncident = vi.fn(async () => ({
      success: true,
      emitted: true,
      deduped: false,
      threadDeepLink: "https://thread.example/incident-1",
    }));
    const sendEmail = vi.fn(async (args: { to: string }) => ({
      success: true,
      messageId: `msg:${args.to}`,
    }));
    const args = buildBaseArgs({
      actionCompletionEnforcement: {
        enforced: false,
        payload: buildPayload({
          reasonCode: "claim_tool_unavailable",
          outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
          requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
          availableTools: [],
        }),
      },
      actionCompletionEnforcementPayload: buildPayload({
        reasonCode: "claim_tool_unavailable",
        outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
        requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
        availableTools: [],
      }),
      createFeatureRequestIssue,
      notifyRuntimeIncident,
      sendEmail,
      preflightAuditLookupTarget: {
        ok: true,
        channel: "webchat",
        sessionToken: "source_session_1",
      },
      resolveAuditSessionForLookupTarget: vi.fn(async () => ({
        capturedEmail: "ava@example.com",
        capturedName: "Ava Rivers",
      })),
    });

    const result = await executeSamanthaCapabilityGapUnavailableHandling(args);

    expect(createFeatureRequestIssue).toHaveBeenCalledTimes(1);
    expect(createFeatureRequestIssue.mock.calls[0]?.[0]).toMatchObject({
      category: "samantha_audit_deliverable_capability_gap",
      toolName: AUDIT_DELIVERABLE_TOOL_NAME,
    });
    expect(notifyRuntimeIncident).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(result.samanthaCapabilityGapFallbackDelivery?.leadEmailDelivery?.success).toBe(true);
    expect(result.samanthaCapabilityGapFallbackDelivery?.salesEmailDelivery?.success).toBe(true);
  });

  it("schedules incident alerts and skips fallback delivery for non-Samantha unavailable claims", async () => {
    const scheduleRuntimeIncidentAlert = vi.fn(async () => {});
    const notifyRuntimeIncident = vi.fn(async () => null);
    const args = buildBaseArgs({
      actionCompletionEnforcementPayload: buildPayload({
        reasonCode: "claim_tool_unavailable",
        outcome: "generic_outcome",
        requiredTools: ["generic_tool"],
        availableTools: [],
      }),
      scheduleRuntimeIncidentAlert,
      notifyRuntimeIncident,
    });

    const result = await executeSamanthaCapabilityGapUnavailableHandling(args);

    expect(scheduleRuntimeIncidentAlert).toHaveBeenCalledTimes(1);
    expect(notifyRuntimeIncident).not.toHaveBeenCalled();
    expect(result.samanthaCapabilityGapFallbackDelivery).toBeNull();
  });
});
