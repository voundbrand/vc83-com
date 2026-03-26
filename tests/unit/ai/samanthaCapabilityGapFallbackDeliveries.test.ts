import { describe, expect, it, vi } from "vitest";

import { executeSamanthaCapabilityGapFallbackDeliveries } from "../../../convex/ai/agents/samantha/runtimeModule";

describe("Samantha capability-gap fallback deliveries", () => {
  it("skips both lead and sales deliveries when domain config is missing", async () => {
    const sendEmail = vi.fn();

    const result = await executeSamanthaCapabilityGapFallbackDeliveries({
      organizationId: "org_1",
      sessionId: "session_1",
      turnId: "turn_1",
      proposalKey: "scope_key",
      unavailableToolName: "generate_audit_workflow_deliverable",
      reasonCode: "claim_tool_unavailable",
      inboundMessage: "Please send my report to ava@example.com",
      responseLanguage: "en",
      recentUserMessages: [],
      preflightAuditSession: {
        capturedEmail: "ava@example.com",
        capturedName: "Ava Rivers",
      },
      preflightAuditLookupTarget: {
        ok: false,
      },
      actionCompletionLinearIssue: {
        issueNumber: "LIN-123",
        issueUrl: "https://linear.example/LIN-123",
      },
      threadDeepLink: "https://thread.example/1",
      resolveAuditSessionForLookupTarget: async () => null,
      resolveDomainConfigIdForOrg: async () => undefined,
      sendEmail,
    });

    expect(result.leadEmailDelivery).toMatchObject({
      success: false,
      skipped: true,
      reason: "missing_domain_config",
    });
    expect(result.salesEmailDelivery).toMatchObject({
      success: false,
      skipped: true,
      reason: "missing_domain_config",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends both lead and sales fallback emails when domain config exists", async () => {
    const sendEmail = vi.fn(async (args: { to: string }) => ({
      success: true,
      messageId: `msg:${args.to}`,
    }));

    const result = await executeSamanthaCapabilityGapFallbackDeliveries({
      organizationId: "org_2",
      sessionId: "session_2",
      turnId: "turn_2",
      proposalKey: "scope_key_2",
      unavailableToolName: "generate_audit_workflow_deliverable",
      reasonCode: "claim_tool_unavailable",
      inboundMessage: "no inline email here",
      responseLanguage: "en",
      recentUserMessages: ["my email is person@example.com"],
      preflightAuditSession: null,
      preflightAuditLookupTarget: {
        ok: true,
        channel: "webchat",
        sessionToken: "token_123",
      },
      actionCompletionLinearIssue: null,
      threadDeepLink: "https://thread.example/2",
      resolveAuditSessionForLookupTarget: async () => ({
        capturedEmail: "resolved@example.com",
        capturedName: "Resolved Name",
      }),
      resolveDomainConfigIdForOrg: async () => "domain_123",
      sendEmail,
      salesInbox: "sales@example.com",
    });

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail.mock.calls[0]?.[0]).toMatchObject({
      to: "resolved@example.com",
      subject: "Update: your One of One workflow report email request",
    });
    expect(sendEmail.mock.calls[1]?.[0]).toMatchObject({
      to: "sales@example.com",
      subject: "Samantha capability-gap fallback triggered",
    });
    expect(result.leadEmailDelivery).toMatchObject({
      success: true,
      messageId: "msg:resolved@example.com",
    });
    expect(result.salesEmailDelivery).toMatchObject({
      success: true,
      messageId: "msg:sales@example.com",
    });
  });

  it("skips lead delivery but still sends sales email when lead email is missing", async () => {
    const sendEmail = vi.fn(async () => ({
      success: true,
      messageId: "sales-msg",
    }));

    const result = await executeSamanthaCapabilityGapFallbackDeliveries({
      organizationId: "org_3",
      sessionId: "session_3",
      turnId: "turn_3",
      proposalKey: "scope_key_3",
      unavailableToolName: "generate_audit_workflow_deliverable",
      reasonCode: "claim_tool_unavailable",
      inboundMessage: "no email provided",
      responseLanguage: "de",
      recentUserMessages: ["kein email vorhanden"],
      preflightAuditSession: {
        capturedName: "Franziska",
      },
      preflightAuditLookupTarget: {
        ok: false,
      },
      actionCompletionLinearIssue: null,
      threadDeepLink: "https://thread.example/3",
      resolveAuditSessionForLookupTarget: async () => null,
      resolveDomainConfigIdForOrg: async () => "domain_456",
      sendEmail,
      salesInbox: "sales@example.com",
    });

    expect(result.leadEmailDelivery).toMatchObject({
      success: false,
      skipped: true,
      reason: "missing_lead_email",
    });
    expect(result.salesEmailDelivery).toMatchObject({
      success: true,
      messageId: "sales-msg",
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]?.[0]).toMatchObject({
      to: "sales@example.com",
      subject: "Samantha capability-gap fallback triggered",
    });
  });
});
