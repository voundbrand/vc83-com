import type { AITool, ToolExecutionContext } from "./registry";
import type { Id } from "../../_generated/dataModel";
import {
  AGENT_FIELD_PATCH_CONTRACT_VERSION,
  type AgentFieldPatchInput,
  type AgentFieldPatchPreview,
} from "../../agentOntology";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

export const CONFIGURE_AGENT_FIELDS_TOOL_NAME = "configure_agent_fields" as const;
export const CONFIGURE_AGENT_FIELDS_PROPOSAL_CONTRACT_VERSION =
  "agent_field_patch_proposal_v1" as const;

type ConfigureAgentFieldsOverridePolicyGate = {
  confirmWarnOverride?: boolean;
  reason?: string;
};

export interface ConfigureAgentFieldsProposalPreview
  extends Omit<AgentFieldPatchPreview, "targetAgentId"> {
  targetAgentId?: Id<"objects"> | null;
}

export interface ConfigureAgentFieldsToolArgs {
  targetAgentId?: string;
  patch: AgentFieldPatchInput;
  rationale?: string;
  overridePolicyGate?: ConfigureAgentFieldsOverridePolicyGate;
  proposalPreview?: unknown;
  proposalContractVersion?: string;
}

export interface ConfigureAgentFieldsProposalEnvelope {
  targetAgentId?: Id<"objects"> | null;
  proposalMessage: string;
  parameters: {
    targetAgentId?: Id<"objects">;
    patch: AgentFieldPatchInput;
    rationale?: string;
    overridePolicyGate?: ConfigureAgentFieldsOverridePolicyGate;
    proposalPreview: ConfigureAgentFieldsProposalPreview;
    proposalContractVersion: typeof CONFIGURE_AGENT_FIELDS_PROPOSAL_CONTRACT_VERSION;
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeAgentFieldPatchInput(value: unknown): AgentFieldPatchInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as AgentFieldPatchInput;
}

async function resolveTargetAgentId(
  ctx: ToolExecutionContext,
  targetAgentId: unknown,
): Promise<Id<"objects"> | null> {
  if (typeof targetAgentId === "string" && targetAgentId.trim().length > 0) {
    return targetAgentId as Id<"objects">;
  }
  if (!ctx.conversationId) {
    return null;
  }
  const conversation = await (ctx as any).runQuery(
    generatedApi.internal.ai.conversations.getConversationMetadataInternal,
    {
      conversationId: ctx.conversationId,
    },
  ) as { targetAgentId?: Id<"objects"> } | null;
  return conversation?.targetAgentId ?? null;
}

async function loadTargetAgentLabel(
  ctx: ToolExecutionContext,
  targetAgentId: Id<"objects"> | null,
): Promise<{ targetAgentName: string; targetAgentDisplayName?: string }> {
  if (!targetAgentId) {
    return {
      targetAgentName: "Unresolved target agent",
    };
  }

  const agent = await (ctx as any).runQuery(
    generatedApi.internal.agentOntology.getAgentInternal,
    {
      agentId: targetAgentId,
    },
  ) as
    | {
        name?: string;
        customProperties?: {
          displayName?: unknown;
        };
      }
    | null;

  const targetAgentDisplayName = normalizeOptionalString(
    agent?.customProperties?.displayName,
  );
  const targetAgentName =
    targetAgentDisplayName
    || normalizeOptionalString(agent?.name)
    || String(targetAgentId);

  return {
    targetAgentName,
    targetAgentDisplayName,
  };
}

async function buildBlockedConfigureAgentFieldsProposalPreview(
  ctx: ToolExecutionContext,
  args: {
    patch: AgentFieldPatchInput;
    targetAgentId?: Id<"objects"> | null;
    blockedReason: string;
  },
): Promise<ConfigureAgentFieldsProposalPreview> {
  const targetAgentLabel = await loadTargetAgentLabel(
    ctx,
    args.targetAgentId ?? null,
  );
  const proposalMessage = `Proposed agent field patch for ${targetAgentLabel.targetAgentName} is blocked: ${args.blockedReason}`;

  return {
    contractVersion: AGENT_FIELD_PATCH_CONTRACT_VERSION,
    targetAgentId: args.targetAgentId ?? null,
    targetAgentName: targetAgentLabel.targetAgentName,
    targetAgentDisplayName: targetAgentLabel.targetAgentDisplayName,
    proposedPatch: args.patch,
    normalizedUpdates: {},
    changes: [],
    changedFields: [],
    unsupportedFields: [],
    deferredFields: [],
    overrideGate: null,
    summary: {
      canApply: false,
      changedFieldCount: 0,
      readyFieldCount: 0,
      unsupportedFieldCount: 0,
      deferredFieldCount: 0,
      blockedReason: args.blockedReason,
    },
    proposalMessage,
  };
}

export async function buildConfigureAgentFieldsProposalEnvelope(
  ctx: ToolExecutionContext,
  args: ConfigureAgentFieldsToolArgs,
): Promise<ConfigureAgentFieldsProposalEnvelope> {
  const patch = normalizeAgentFieldPatchInput(args.patch);
  const rationale = normalizeOptionalString(args.rationale);

  if (!ctx.sessionId) {
    const preview = await buildBlockedConfigureAgentFieldsProposalPreview(ctx, {
      patch,
      blockedReason:
        "Session ID required to preview agent field changes before approval.",
    });
    return {
      targetAgentId: null,
      proposalMessage: preview.proposalMessage,
      parameters: {
        patch,
        ...(rationale ? { rationale } : {}),
        ...(args.overridePolicyGate
          ? { overridePolicyGate: args.overridePolicyGate }
          : {}),
        proposalPreview: preview,
        proposalContractVersion:
          CONFIGURE_AGENT_FIELDS_PROPOSAL_CONTRACT_VERSION,
      },
    };
  }

  const resolvedTargetAgentId = await resolveTargetAgentId(ctx, args.targetAgentId);
  if (!resolvedTargetAgentId) {
    const preview = await buildBlockedConfigureAgentFieldsProposalPreview(ctx, {
      patch,
      blockedReason:
        "Target agent could not be resolved for this configuration patch.",
    });
    return {
      targetAgentId: null,
      proposalMessage: preview.proposalMessage,
      parameters: {
        patch,
        ...(rationale ? { rationale } : {}),
        ...(args.overridePolicyGate
          ? { overridePolicyGate: args.overridePolicyGate }
          : {}),
        proposalPreview: preview,
        proposalContractVersion:
          CONFIGURE_AGENT_FIELDS_PROPOSAL_CONTRACT_VERSION,
      },
    };
  }

  try {
    const preview = await (ctx as any).runMutation(
      generatedApi.api.agentOntology.previewAgentFieldPatch,
      {
        sessionId: ctx.sessionId,
        agentId: resolvedTargetAgentId,
        patch,
        overridePolicyGate: args.overridePolicyGate,
      },
    ) as AgentFieldPatchPreview;

    return {
      targetAgentId: resolvedTargetAgentId,
      proposalMessage:
        normalizeOptionalString(preview?.proposalMessage)
        || `Propose agent setting updates for ${preview.targetAgentName}.`,
      parameters: {
        targetAgentId: resolvedTargetAgentId,
        patch,
        ...(rationale ? { rationale } : {}),
        ...(args.overridePolicyGate
          ? { overridePolicyGate: args.overridePolicyGate }
          : {}),
        proposalPreview: preview as ConfigureAgentFieldsProposalPreview,
        proposalContractVersion:
          CONFIGURE_AGENT_FIELDS_PROPOSAL_CONTRACT_VERSION,
      },
    };
  } catch (error) {
    const preview = await buildBlockedConfigureAgentFieldsProposalPreview(ctx, {
      patch,
      targetAgentId: resolvedTargetAgentId,
      blockedReason:
        error instanceof Error
          ? error.message
          : "Agent field patch preview could not be built.",
    });
    return {
      targetAgentId: resolvedTargetAgentId,
      proposalMessage: preview.proposalMessage,
      parameters: {
        targetAgentId: resolvedTargetAgentId,
        patch,
        ...(rationale ? { rationale } : {}),
        ...(args.overridePolicyGate
          ? { overridePolicyGate: args.overridePolicyGate }
          : {}),
        proposalPreview: preview,
        proposalContractVersion:
          CONFIGURE_AGENT_FIELDS_PROPOSAL_CONTRACT_VERSION,
      },
    };
  }
}

export const configureAgentFieldsTool: AITool = {
  name: CONFIGURE_AGENT_FIELDS_TOOL_NAME,
  description:
    "Propose and, after approval, apply a structured patch to an agent's saved settings. Use this only when the operator is explicitly configuring an agent and you have concrete field changes to propose.",
  status: "ready",
  windowName: "Agents",
  parameters: {
    type: "object",
    properties: {
      targetAgentId: {
        type: "string",
        description:
          "Optional org_agent ID. Omit this when the current chat conversation is already scoped to a target agent.",
      },
      patch: {
        type: "object",
        description:
          "Structured agent field patch. Unsupported or deferred fields will be surfaced explicitly in the approval preview instead of being silently applied.",
        additionalProperties: true,
        properties: {
          displayName: { type: "string" },
          agentClass: {
            type: "string",
            enum: ["internal_operator", "external_customer_facing"],
          },
          personality: { type: "string" },
          language: { type: "string" },
          voiceLanguage: { type: "string" },
          elevenLabsVoiceId: { type: "string" },
          brandVoiceInstructions: { type: "string" },
          systemPrompt: { type: "string" },
          autonomyLevel: {
            type: "string",
            enum: ["supervised", "sandbox", "autonomous", "delegation", "draft_only"],
          },
          modelId: { type: "string" },
          temperature: { type: "number" },
          channelBindings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                channel: { type: "string" },
                enabled: { type: "boolean" },
              },
              required: ["channel", "enabled"],
            },
          },
          blockedTopics: {
            type: "array",
            items: { type: "string" },
          },
          telephonyConfig: {
            type: "object",
            description:
              "Recognized but deferred in the first chat-side apply slice. Proposals including this will be blocked until telephony apply support lands.",
          },
        },
      },
      rationale: {
        type: "string",
        description: "Optional human-readable explanation for why these field changes are being proposed.",
      },
      overridePolicyGate: {
        type: "object",
        description:
          "Optional managed-clone override acknowledgement payload. The first slice surfaces warn-gated patches but does not auto-collect confirmation in chat.",
        properties: {
          confirmWarnOverride: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    },
    required: ["patch"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: ConfigureAgentFieldsToolArgs,
  ) => {
    if (!ctx.sessionId) {
      return {
        success: false,
        error: "Session ID required to apply agent field updates.",
      };
    }

    const resolvedTargetAgentId = await resolveTargetAgentId(ctx, args.targetAgentId);
    if (!resolvedTargetAgentId) {
      return {
        success: false,
        error: "Target agent could not be resolved for this configuration patch.",
      };
    }

    const result = await (ctx as any).runMutation(
      generatedApi.api.agentOntology.applyAgentFieldPatch,
      {
        sessionId: ctx.sessionId,
        agentId: resolvedTargetAgentId,
        patch: normalizeAgentFieldPatchInput(args.patch),
        overridePolicyGate: args.overridePolicyGate,
      },
    ) as {
      success?: boolean;
      message?: string;
      preview?: unknown;
      appliedFields?: string[];
    };

    if (result?.success !== true) {
      return {
        success: false,
        error: result?.message || "Agent field patch could not be applied.",
        targetAgentId: resolvedTargetAgentId,
        preview: result?.preview,
      };
    }

    return {
      success: true,
      message: result.message || "Applied agent field patch.",
      targetAgentId: resolvedTargetAgentId,
      appliedFields: Array.isArray(result.appliedFields) ? result.appliedFields : [],
      preview: result.preview,
    };
  },
};
