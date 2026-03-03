import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "../../rbacHelpers";
import { evaluateToolVersionPromotion } from "./contracts";
import {
  TOOL_FOUNDRY_INTEGRITY_CONTRACT_VERSION,
  TOOL_FOUNDRY_MUTATING_POLICY_VERSION,
  assertToolFoundrySuperAdmin,
  enforceCoreToolImmutability,
  enforceMutatingClassApprovalGate,
  resolveCanonicalToolId,
  resolveToolClassPolicy,
  throwToolFoundryIntegrityError,
} from "./integrity";

type ToolFoundryDefinitionRecord = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  status: string;
  customProperties?: Record<string, unknown>;
};

async function requireToolFoundrySuperAdmin(
  ctx: any,
  sessionId: string,
): Promise<{ userId: Id<"users">; organizationId: Id<"organizations"> }> {
  const { userId, organizationId } = await requireAuthenticatedUser(ctx, sessionId);
  const userContext = await getUserContext(ctx, userId);
  assertToolFoundrySuperAdmin(userContext);
  return { userId, organizationId };
}

function readToolCustomProperties(
  record: ToolFoundryDefinitionRecord | null,
): Record<string, unknown> {
  if (!record?.customProperties || typeof record.customProperties !== "object") {
    return {};
  }
  return record.customProperties;
}

async function getToolDefinitionByCanonicalId(args: {
  ctx: any;
  organizationId: Id<"organizations">;
  canonicalToolId: string;
}): Promise<ToolFoundryDefinitionRecord | null> {
  const rows = (await args.ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("type", "tool_foundry_tool_definition"),
    )
    .collect()) as ToolFoundryDefinitionRecord[];

  for (const row of rows) {
    const props = readToolCustomProperties(row);
    if (props.canonicalToolId === args.canonicalToolId) {
      return row;
    }
  }
  return null;
}

function ensureFoundRecord(
  existing: ToolFoundryDefinitionRecord | null,
  canonicalToolId: string,
): ToolFoundryDefinitionRecord {
  if (existing) {
    return existing;
  }
  throwToolFoundryIntegrityError({
    code: "TF_TOOL_NOT_FOUND",
    message: "Tool Foundry operation denied: tool definition not found.",
    details: { canonicalToolId },
  });
}

export const registerToolDefinition = mutation({
  args: {
    sessionId: v.string(),
    toolId: v.string(),
    toolClass: v.string(),
    description: v.optional(v.string()),
    approvalMetadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireToolFoundrySuperAdmin(
      ctx,
      args.sessionId,
    );
    const { canonicalToolId, normalizedInputToolId, aliasMatched } =
      resolveCanonicalToolId(args.toolId);
    const { toolClass } = resolveToolClassPolicy(args.toolClass);
    const parsedApproval = enforceMutatingClassApprovalGate({
      operation: "register",
      toolClass,
      approvalMetadata: args.approvalMetadata,
    });

    enforceCoreToolImmutability({
      operation: "register",
      canonicalToolId,
      aliasMatched,
    });

    const existing = await getToolDefinitionByCanonicalId({
      ctx,
      organizationId,
      canonicalToolId,
    });
    if (existing) {
      throwToolFoundryIntegrityError({
        code: "TF_ALIAS_OVERRIDE_FORBIDDEN",
        message: "Tool Foundry operation denied: tool already registered.",
        details: { canonicalToolId, existingObjectId: String(existing._id) },
      });
    }

    const now = Date.now();
    const toolObjectId = await ctx.db.insert("objects", {
      organizationId,
      type: "tool_foundry_tool_definition",
      subtype: toolClass,
      name: canonicalToolId,
      description: args.description?.trim() || `Tool Foundry definition for ${canonicalToolId}`,
      status: "draft",
      customProperties: {
        integrityContractVersion: TOOL_FOUNDRY_INTEGRITY_CONTRACT_VERSION,
        mutatingPolicyVersion: TOOL_FOUNDRY_MUTATING_POLICY_VERSION,
        canonicalToolId,
        submittedToolId: normalizedInputToolId,
        toolClass,
        approvalMetadata: parsedApproval ?? undefined,
        stage: "draft",
        publishedAt: undefined,
        promotedAt: undefined,
        deprecatedAt: undefined,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: toolObjectId,
      actionType: "tool_foundry.register",
      actionData: {
        canonicalToolId,
        toolClass,
      },
      performedBy: userId,
      performedAt: now,
    });

    return {
      success: true,
      toolObjectId,
      canonicalToolId,
      toolClass,
      status: "draft" as const,
    };
  },
});

export const publishToolDefinition = mutation({
  args: {
    sessionId: v.string(),
    toolId: v.string(),
    approvalMetadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireToolFoundrySuperAdmin(
      ctx,
      args.sessionId,
    );
    const { canonicalToolId } = resolveCanonicalToolId(args.toolId);
    const existing = ensureFoundRecord(
      await getToolDefinitionByCanonicalId({ ctx, organizationId, canonicalToolId }),
      canonicalToolId,
    );
    const existingProps = readToolCustomProperties(existing);
    const isExistingCoreTool = existingProps.coreTool === true;
    enforceCoreToolImmutability({
      operation: "publish",
      canonicalToolId,
      isExistingCoreTool,
    });

    const { toolClass } = resolveToolClassPolicy(existingProps.toolClass);
    const parsedApproval = enforceMutatingClassApprovalGate({
      operation: "publish",
      toolClass,
      approvalMetadata: args.approvalMetadata ?? existingProps.approvalMetadata,
    });

    const now = Date.now();
    await ctx.db.patch(existing._id, {
      status: "published",
      customProperties: {
        ...existingProps,
        approvalMetadata: parsedApproval ?? existingProps.approvalMetadata,
        publishedAt: now,
      },
      updatedAt: now,
    });
    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: existing._id,
      actionType: "tool_foundry.publish",
      actionData: { canonicalToolId, toolClass },
      performedBy: userId,
      performedAt: now,
    });

    return {
      success: true,
      canonicalToolId,
      status: "published" as const,
    };
  },
});

export const promoteToolDefinition = mutation({
  args: {
    sessionId: v.string(),
    toolId: v.string(),
    toStage: v.union(v.literal("staged"), v.literal("canary"), v.literal("trusted")),
    approvalMetadata: v.optional(v.any()),
    evidence: v.object({
      policyBundleHash: v.optional(v.string()),
      specValidated: v.optional(v.boolean()),
      contractTestsPassed: v.optional(v.boolean()),
      regressionTestsPassed: v.optional(v.boolean()),
      securityReviewPassed: v.optional(v.boolean()),
      humanApproverId: v.optional(v.string()),
      rollbackPlanId: v.optional(v.string()),
      canaryRuns: v.optional(v.number()),
      canarySuccessRate: v.optional(v.number()),
      threatModelVersion: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireToolFoundrySuperAdmin(
      ctx,
      args.sessionId,
    );
    const { canonicalToolId } = resolveCanonicalToolId(args.toolId);
    const existing = ensureFoundRecord(
      await getToolDefinitionByCanonicalId({ ctx, organizationId, canonicalToolId }),
      canonicalToolId,
    );
    const existingProps = readToolCustomProperties(existing);
    const isExistingCoreTool = existingProps.coreTool === true;
    enforceCoreToolImmutability({
      operation: "promote",
      canonicalToolId,
      isExistingCoreTool,
    });

    const { toolClass } = resolveToolClassPolicy(existingProps.toolClass);
    const parsedApproval = enforceMutatingClassApprovalGate({
      operation: "promote",
      toolClass,
      approvalMetadata: args.approvalMetadata ?? existingProps.approvalMetadata,
    });

    const fromStage = (() => {
      const raw = typeof existingProps.stage === "string" ? existingProps.stage.trim() : "";
      if (raw === "draft" || raw === "staged" || raw === "canary" || raw === "trusted") {
        return raw;
      }
      return "draft" as const;
    })();

    const promotionDecision = evaluateToolVersionPromotion({
      from: fromStage,
      to: args.toStage,
      evidence: args.evidence,
    });
    if (!promotionDecision.allowed) {
      throwToolFoundryIntegrityError({
        code: "TF_FAIL_CLOSED_APPROVAL_REQUIRED",
        message: "Tool Foundry promotion denied by integrity contract evidence gate.",
        details: {
          canonicalToolId,
          fromStage,
          toStage: args.toStage,
          reasons: promotionDecision.reasons,
        },
      });
    }

    const now = Date.now();
    await ctx.db.patch(existing._id, {
      customProperties: {
        ...existingProps,
        approvalMetadata: parsedApproval ?? existingProps.approvalMetadata,
        stage: args.toStage,
        promotedAt: now,
        promotedBy: String(userId),
      },
      updatedAt: now,
    });
    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: existing._id,
      actionType: "tool_foundry.promote",
      actionData: {
        canonicalToolId,
        fromStage,
        toStage: args.toStage,
      },
      performedBy: userId,
      performedAt: now,
    });

    return {
      success: true,
      canonicalToolId,
      fromStage,
      toStage: args.toStage,
    };
  },
});

export const deprecateToolDefinition = mutation({
  args: {
    sessionId: v.string(),
    toolId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireToolFoundrySuperAdmin(
      ctx,
      args.sessionId,
    );
    const { canonicalToolId } = resolveCanonicalToolId(args.toolId);
    const existing = ensureFoundRecord(
      await getToolDefinitionByCanonicalId({ ctx, organizationId, canonicalToolId }),
      canonicalToolId,
    );
    const existingProps = readToolCustomProperties(existing);
    const isExistingCoreTool = existingProps.coreTool === true;
    enforceCoreToolImmutability({
      operation: "deprecate",
      canonicalToolId,
      isExistingCoreTool,
    });

    const reason = args.reason.trim();
    if (!reason) {
      throwToolFoundryIntegrityError({
        code: "TF_FAIL_CLOSED_POLICY_PARSE_ERROR",
        message: "Tool Foundry deprecation denied: reason is required.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(existing._id, {
      status: "deprecated",
      customProperties: {
        ...existingProps,
        deprecatedAt: now,
        deprecatedBy: String(userId),
        deprecationReason: reason,
      },
      updatedAt: now,
    });
    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: existing._id,
      actionType: "tool_foundry.deprecate",
      actionData: { canonicalToolId, reason },
      performedBy: userId,
      performedAt: now,
    });

    return {
      success: true,
      canonicalToolId,
      status: "deprecated" as const,
    };
  },
});
