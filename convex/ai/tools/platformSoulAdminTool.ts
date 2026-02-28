import type { Id } from "../../_generated/dataModel";
import {
  PLATFORM_SOUL_SCOPE_CAPABILITY,
  type PlatformSoulAction,
} from "../platformSoulScope";
import type { AITool, ToolExecutionContext } from "./registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

const ALLOWED_ACTIONS: PlatformSoulAction[] = [
  "view",
  "propose",
  "approve_apply",
  "rollback",
];

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isPlatformSoulAction(value: unknown): value is PlatformSoulAction {
  return (
    typeof value === "string"
    && (ALLOWED_ACTIONS as string[]).includes(value)
  );
}

function buildDeterministicMatrixLabel(
  matrix: {
    actions: Array<{ action: PlatformSoulAction; allowed: boolean; reason: string }>;
  },
) {
  return matrix.actions.map((row) => ({
    action: row.action,
    label: row.allowed ? "PASS" : "FAIL",
    reason: row.reason,
  }));
}

export const platformSoulAdminTool: AITool = {
  name: "platform_soul_admin",
  description:
    "Privileged platform soul administration for L2 platform-agent souls only. "
    + "Actions: view, propose, approve_apply, rollback. "
    + "L3 user-agent souls are explicitly denied. "
    + "Privileged write actions require reasonCode + ticketId + active elevationId.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["view", "propose", "approve_apply", "rollback"],
        description: "Requested action in the platform_soul_admin matrix.",
      },
      targetAgentId: {
        type: "string",
        description: "Object ID of the target platform agent.",
      },
      proposalType: {
        type: "string",
        enum: ["add", "modify", "remove", "add_faq"],
        description: "Required for action=propose.",
      },
      targetField: {
        type: "string",
        description: "Required for action=propose.",
      },
      proposedValue: {
        type: "string",
        description: "Required for action=propose.",
      },
      reason: {
        type: "string",
        description: "Required for action=propose; audit rationale for the proposed change.",
      },
      reasonCode: {
        type: "string",
        description:
          "Required for privileged write actions. Deterministic reason code for audit evidence.",
      },
      ticketId: {
        type: "string",
        description:
          "Required for privileged write actions. Linked change-control ticket/reference.",
      },
      elevationId: {
        type: "string",
        description:
          "Required for privileged write actions. Time-bound elevation id from startPlatformSoulAdminElevationAuth.",
      },
      currentValue: {
        type: "string",
        description: "Optional current value for modify/remove proposal context.",
      },
      proposalId: {
        type: "string",
        description: "Required for action=approve_apply.",
      },
      targetVersion: {
        type: "number",
        description: "Required for action=rollback.",
      },
      historyLimit: {
        type: "number",
        description: "Optional version history size for action=view (default 5).",
      },
    },
    required: ["action", "targetAgentId"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      action: PlatformSoulAction;
      targetAgentId: string;
      proposalType?: "add" | "modify" | "remove" | "add_faq";
      targetField?: string;
      proposedValue?: string;
      reason?: string;
      reasonCode?: string;
      ticketId?: string;
      elevationId?: string;
      currentValue?: string;
      proposalId?: string;
      targetVersion?: number;
      historyLimit?: number;
    },
  ) => {
    if (!ctx.userId || !ctx.organizationId) {
      return {
        resultLabel: "FAIL",
        error: "Missing runtime actor context for platform_soul_admin.",
      };
    }

    const action = isPlatformSoulAction(args.action) ? args.action : null;
    if (!action) {
      return {
        capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
        resultLabel: "FAIL",
        error: `Unsupported action. Allowed actions: ${ALLOWED_ACTIONS.join(", ")}.`,
      };
    }

    const targetAgentId = normalizeNonEmptyString(args.targetAgentId);
    if (!targetAgentId) {
      return {
        capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
        action,
        resultLabel: "FAIL",
        error: "targetAgentId is required.",
      };
    }

    const capabilityMatrix = await ctx.runQuery(
      getInternal().ai.platformSoulAdmin.resolveCapabilityMatrix,
      {
        actorUserId: ctx.userId,
        organizationId: ctx.organizationId,
        targetAgentId: targetAgentId as Id<"objects">,
      },
    );

    const selectedAction = capabilityMatrix.actions.find(
      (row: { action: PlatformSoulAction }) => row.action === action,
    );

    if (!selectedAction?.allowed) {
      return {
        capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
        action,
        resultLabel: "FAIL",
        denied: true,
        denialReason:
          capabilityMatrix.denialReason
          || selectedAction?.reason
          || "Denied by platform_soul_admin policy.",
        actionMatrix: buildDeterministicMatrixLabel(capabilityMatrix),
      };
    }

    if (action === "view") {
      const viewResult = await ctx.runQuery(getInternal().ai.platformSoulAdmin.viewScopedSoul, {
        actorUserId: ctx.userId,
        organizationId: ctx.organizationId,
        targetAgentId: targetAgentId as Id<"objects">,
        historyLimit:
          typeof args.historyLimit === "number" && Number.isFinite(args.historyLimit)
            ? Math.max(1, Math.min(Math.floor(args.historyLimit), 25))
            : undefined,
      });

      return {
        capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
        action,
        resultLabel: viewResult.resultLabel || "PASS",
        actionMatrix: buildDeterministicMatrixLabel(capabilityMatrix),
        output: viewResult,
      };
    }

    if (action === "propose") {
      const proposalType = args.proposalType;
      const targetField = normalizeNonEmptyString(args.targetField);
      const proposedValue = normalizeNonEmptyString(args.proposedValue);
      const reason = normalizeNonEmptyString(args.reason);
      const reasonCode = normalizeNonEmptyString(args.reasonCode);
      const ticketId = normalizeNonEmptyString(args.ticketId);
      const elevationId = normalizeNonEmptyString(args.elevationId);

      if (
        !proposalType
        || !targetField
        || !proposedValue
        || !reason
        || !reasonCode
        || !ticketId
        || !elevationId
      ) {
        return {
          capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
          action,
          resultLabel: "FAIL",
          error:
            "proposalType, targetField, proposedValue, reason, reasonCode, ticketId, and elevationId are required for action=propose.",
          actionMatrix: buildDeterministicMatrixLabel(capabilityMatrix),
        };
      }

      const proposalResult = await ctx.runMutation(
        getInternal().ai.platformSoulAdmin.proposeScopedSoulProposal,
        {
          actorUserId: ctx.userId,
          organizationId: ctx.organizationId,
          targetAgentId: targetAgentId as Id<"objects">,
          proposalType,
          targetField,
          proposedValue,
          reason,
          currentValue: normalizeNonEmptyString(args.currentValue) || undefined,
          reasonCode,
          ticketId,
          elevationId: elevationId as Id<"objects">,
        },
      );

      return {
        capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
        action,
        resultLabel: proposalResult.resultLabel || (proposalResult.success ? "PASS" : "FAIL"),
        actionMatrix: buildDeterministicMatrixLabel(capabilityMatrix),
        output: proposalResult,
      };
    }

    if (action === "approve_apply") {
      const proposalId = normalizeNonEmptyString(args.proposalId);
      const reasonCode = normalizeNonEmptyString(args.reasonCode);
      const ticketId = normalizeNonEmptyString(args.ticketId);
      const elevationId = normalizeNonEmptyString(args.elevationId);
      if (!proposalId || !reasonCode || !ticketId || !elevationId) {
        return {
          capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
          action,
          resultLabel: "FAIL",
          error:
            "proposalId, reasonCode, ticketId, and elevationId are required for action=approve_apply.",
          actionMatrix: buildDeterministicMatrixLabel(capabilityMatrix),
        };
      }

      const applyResult = await ctx.runMutation(
        getInternal().ai.platformSoulAdmin.approveApplyScopedSoulProposal,
        {
          actorUserId: ctx.userId,
          organizationId: ctx.organizationId,
          targetAgentId: targetAgentId as Id<"objects">,
          proposalId: proposalId as Id<"soulProposals">,
          reasonCode,
          ticketId,
          elevationId: elevationId as Id<"objects">,
        },
      );

      return {
        capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
        action,
        resultLabel: applyResult.resultLabel || (applyResult.success ? "PASS" : "FAIL"),
        actionMatrix: buildDeterministicMatrixLabel(capabilityMatrix),
        output: applyResult,
      };
    }

    const targetVersion = args.targetVersion;
    const reasonCode = normalizeNonEmptyString(args.reasonCode);
    const ticketId = normalizeNonEmptyString(args.ticketId);
    const elevationId = normalizeNonEmptyString(args.elevationId);
    if (
      typeof targetVersion !== "number"
      || !Number.isFinite(targetVersion)
      || !reasonCode
      || !ticketId
      || !elevationId
    ) {
      return {
        capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
        action,
        resultLabel: "FAIL",
        error:
          "targetVersion, reasonCode, ticketId, and elevationId are required for action=rollback.",
        actionMatrix: buildDeterministicMatrixLabel(capabilityMatrix),
      };
    }

    const rollbackResult = await ctx.runMutation(
      getInternal().ai.platformSoulAdmin.rollbackScopedSoul,
      {
        actorUserId: ctx.userId,
        organizationId: ctx.organizationId,
        targetAgentId: targetAgentId as Id<"objects">,
        targetVersion: Math.floor(targetVersion),
        reasonCode,
        ticketId,
        elevationId: elevationId as Id<"objects">,
      },
    );

    return {
      capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
      action,
      resultLabel: rollbackResult.resultLabel || (rollbackResult.success ? "PASS" : "FAIL"),
      actionMatrix: buildDeterministicMatrixLabel(capabilityMatrix),
      output: rollbackResult,
    };
  },
};
