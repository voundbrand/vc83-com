import { describe, expect, it, vi } from "vitest";
import {
  buildConfigureAgentFieldsProposalEnvelope,
  CONFIGURE_AGENT_FIELDS_PROPOSAL_CONTRACT_VERSION,
  configureAgentFieldsTool,
} from "../../../convex/ai/tools/configureAgentFieldsTool";

describe("configureAgentFieldsTool", () => {
  it("advertises broader safe patch fields, including telephonyConfig, in the tool schema", () => {
    const patchSchema = (configureAgentFieldsTool.parameters.properties.patch as Record<string, unknown>)
      .properties as Record<string, unknown>;
    const nameSchema = patchSchema.name as Record<string, unknown> | undefined;
    const faqEntriesSchema = patchSchema.faqEntries as Record<string, unknown> | undefined;
    const escalationPolicySchema = patchSchema.escalationPolicy as Record<string, unknown> | undefined;
    const telephonyConfigSchema = patchSchema.telephonyConfig as Record<string, unknown> | undefined;

    expect(nameSchema?.type).toBe("string");
    expect(faqEntriesSchema?.type).toBe("array");
    expect(escalationPolicySchema?.type).toBe("object");
    expect(telephonyConfigSchema?.type).toBe("object");
    expect(String(telephonyConfigSchema?.description || "")).toContain("approval-gated");
    expect(String(telephonyConfigSchema?.description || "")).not.toContain("deferred");
  });

  it("builds a structured proposal envelope from conversation-scoped target agent context", async () => {
    const runQuery = vi.fn(async () => ({
      targetAgentId: "objects_target_agent",
    }));
    const proposalPreview = {
      contractVersion: "agent_field_patch_preview_v1",
      targetAgentId: "objects_target_agent",
      targetAgentName: "Anne Operator",
      targetAgentDisplayName: "Anne",
      currentValues: {
        displayName: "Anne",
      },
      proposedPatch: {
        displayName: "Anne v2",
      },
      normalizedUpdates: {
        displayName: "Anne v2",
      },
      changes: [
        {
          field: "displayName",
          label: "Display Name",
          category: "supported",
          applyStatus: "ready",
          before: "Anne",
          after: "Anne v2",
          changed: true,
        },
      ],
      changedFields: ["displayName"],
      unsupportedFields: [],
      deferredFields: [],
      overrideGate: null,
      summary: {
        canApply: true,
        changedFieldCount: 1,
        readyFieldCount: 1,
        unsupportedFieldCount: 0,
        deferredFieldCount: 0,
      },
      proposalMessage: "Propose 1 agent setting update for Anne: display name.",
    };
    const runMutation = vi.fn(async () => proposalPreview);

    const result = await buildConfigureAgentFieldsProposalEnvelope({
      sessionId: "session_123",
      conversationId: "aiConversations_1",
      runQuery,
      runMutation,
    } as any, {
      patch: {
        displayName: "Anne v2",
      },
      rationale: "Reflect the new rollout positioning.",
    });

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runMutation).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      targetAgentId: "objects_target_agent",
      proposalMessage: proposalPreview.proposalMessage,
      parameters: {
        targetAgentId: "objects_target_agent",
        patch: {
          displayName: "Anne v2",
        },
        rationale: "Reflect the new rollout positioning.",
        proposalContractVersion: CONFIGURE_AGENT_FIELDS_PROPOSAL_CONTRACT_VERSION,
        proposalPreview,
      },
    });
  });

  it("fails closed into a blocked proposal envelope when the target agent cannot be resolved", async () => {
    const runQuery = vi.fn(async () => ({}));
    const runMutation = vi.fn();

    const result = await buildConfigureAgentFieldsProposalEnvelope({
      sessionId: "session_123",
      conversationId: "aiConversations_1",
      runQuery,
      runMutation,
    } as any, {
      patch: {
        displayName: "Updated Agent",
      },
    });

    expect(runMutation).not.toHaveBeenCalled();
    expect(result.targetAgentId).toBeNull();
    expect(result.parameters.proposalPreview.summary.canApply).toBe(false);
    expect(result.parameters.proposalPreview.summary.blockedReason).toMatch(
      /Target agent could not be resolved/,
    );
  });

  it("fails closed into a blocked proposal envelope when preview generation throws", async () => {
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce({
        name: "Anne Operator",
        customProperties: {
          displayName: "Anne",
        },
      });
    const runMutation = vi.fn(async () => {
      throw new Error("Managed clone override blocked by locked policy fields: systemPrompt");
    });

    const result = await buildConfigureAgentFieldsProposalEnvelope({
      sessionId: "session_123",
      targetAgentId: "objects_target_agent",
      runQuery,
      runMutation,
    } as any, {
      targetAgentId: "objects_target_agent",
      patch: {
        systemPrompt: "Override prompt",
      },
    });

    expect(runMutation).toHaveBeenCalledTimes(1);
    expect(result.targetAgentId).toBe("objects_target_agent");
    expect(result.parameters.proposalPreview.targetAgentName).toBe("Anne");
    expect(result.parameters.proposalPreview.summary.canApply).toBe(false);
    expect(result.proposalMessage).toMatch(/Managed clone override blocked/);
  });

  it("resolves the target agent from conversation metadata and applies the patch", async () => {
    const runQuery = vi.fn(async () => ({
      targetAgentId: "objects_target_agent",
    }));
    const runMutation = vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
      expect(args).toMatchObject({
        sessionId: "session_123",
        agentId: "objects_target_agent",
        patch: {
          displayName: "Updated Agent",
        },
      });
      return {
        success: true,
        message: "Applied",
        appliedFields: ["displayName"],
        preview: {
          summary: {
            canApply: true,
          },
        },
      };
    });

    const result = await configureAgentFieldsTool.execute({
      sessionId: "session_123",
      conversationId: "aiConversations_1",
      runQuery,
      runMutation,
    } as any, {
      patch: {
        displayName: "Updated Agent",
      },
    });

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runMutation).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      success: true,
      targetAgentId: "objects_target_agent",
      appliedFields: ["displayName"],
    });
  });

  it("fails closed when no session is available", async () => {
    const result = await configureAgentFieldsTool.execute({} as any, {
      targetAgentId: "objects_target_agent",
      patch: {
        displayName: "Updated Agent",
      },
    });

    expect(result).toMatchObject({
      success: false,
      error: "Session ID required to apply agent field updates.",
    });
  });
});
