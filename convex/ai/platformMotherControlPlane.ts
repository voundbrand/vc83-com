import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  canUsePlatformMotherCustomerFacingSupport,
  isPlatformMotherAuthorityRecord,
  PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
  PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
  readPlatformMotherRuntimeMode,
} from "../platformMother";

// Lazy-load api/internal to avoid deep type instantiation costs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _generatedApiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGeneratedApi(): any {
  if (!_generatedApiCache) {
    _generatedApiCache = require("../_generated/api");
  }
  return _generatedApiCache;
}

export const PLATFORM_MOTHER_INVOCATION_CONTRACT_VERSION =
  "platform_mother_invocation_v1" as const;

export type PlatformMotherInvocationMode =
  | typeof PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING
  | typeof PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT
  | typeof PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE;

type PlatformMotherRuntimeCandidate = {
  _id?: string;
  organizationId?: string;
  type?: string;
  name?: string;
  status?: string;
  updatedAt?: number;
  customProperties?: Record<string, unknown> | null;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolvePlatformOrgIdFromEnv(): Id<"organizations"> {
  const platformOrgId = normalizeOptionalString(process.env.PLATFORM_ORG_ID);
  if (platformOrgId) {
    return platformOrgId as Id<"organizations">;
  }
  const testOrgId = normalizeOptionalString(process.env.TEST_ORG_ID);
  if (testOrgId) {
    return testOrgId as Id<"organizations">;
  }
  throw new Error("PLATFORM_ORG_ID or TEST_ORG_ID must be set for Platform Mother control-plane resolution.");
}

export function canUsePlatformMotherConversationTarget(args: {
  conversationOrganizationId: Id<"organizations"> | string;
  targetAgent: PlatformMotherRuntimeCandidate | null | undefined;
}): boolean {
  const targetAgent = args.targetAgent;
  if (!targetAgent || targetAgent.type !== "org_agent") {
    return false;
  }
  if (String(targetAgent.organizationId) === String(args.conversationOrganizationId)) {
    return true;
  }
  return canUsePlatformMotherCustomerFacingSupport({
    requestingOrganizationId: String(args.conversationOrganizationId),
    name: targetAgent.name,
    status: targetAgent.status,
    customProperties: targetAgent.customProperties ?? undefined,
  });
}

export function selectPlatformMotherRuntimeInvocationTarget<
  T extends PlatformMotherRuntimeCandidate,
>(
  agents: T[],
  args: {
    mode: typeof PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT | typeof PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE;
  },
): T | null {
  const runtimeCandidates = agents
    .filter((agent) => agent.status === "active")
    .filter((agent) => agent.type === "org_agent")
    .filter((agent) =>
      isPlatformMotherAuthorityRecord(
        agent.name,
        agent.customProperties ?? undefined,
      ),
    )
    .filter((agent) =>
      readPlatformMotherRuntimeMode(agent.customProperties ?? undefined) === args.mode,
    )
    .sort((left, right) => {
      const updatedAtDelta = (right.updatedAt ?? 0) - (left.updatedAt ?? 0);
      if (updatedAtDelta !== 0) {
        return updatedAtDelta;
      }
      return String(left._id ?? "").localeCompare(String(right._id ?? ""));
    });

  return runtimeCandidates[0] ?? null;
}

export function buildPlatformMotherInvocationMetadata(args: {
  mode: PlatformMotherInvocationMode;
  source: string;
  targetAgentId: string;
  targetOrganizationId: string;
  requestingOrganizationId?: string;
  metadata?: Record<string, unknown> | null;
}): Record<string, unknown> {
  const workflowIntent =
    args.mode === PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT
      ? "support_intake"
      : args.mode === PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING
        ? "platform_mother_onboarding"
        : "platform_mother_governance";

  return {
    ...(args.metadata ?? {}),
    skipOutbound: true,
    source: args.source,
    targetAgentId: args.targetAgentId,
    intent: workflowIntent,
    workflowIntent,
    platformMotherRuntimeMode: args.mode,
    platformMotherInvocationSource: args.source,
    platformMotherInvocation: {
      contractVersion: PLATFORM_MOTHER_INVOCATION_CONTRACT_VERSION,
      mode: args.mode,
      source: args.source,
      targetAgentId: args.targetAgentId,
      targetOrganizationId: args.targetOrganizationId,
      requestingOrganizationId: args.requestingOrganizationId,
    },
  };
}

export function buildPlatformMotherDispatchExternalContactIdentifier(args: {
  mode: PlatformMotherInvocationMode;
  targetOrganizationId: string;
  requestingOrganizationId?: string;
  dispatchKey?: string;
}): string {
  const key = normalizeOptionalString(args.dispatchKey) ?? "default";
  const requester = normalizeOptionalString(args.requestingOrganizationId) ?? "platform";
  return [
    "platform_mother",
    args.mode,
    requester,
    normalizeOptionalString(args.targetOrganizationId) ?? "unknown",
    key,
  ].join(":");
}

async function resolvePlatformMotherInvocationTarget(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  mode: PlatformMotherInvocationMode,
): Promise<{
  agentId: Id<"objects">;
  organizationId: Id<"organizations">;
  runtimeMode: PlatformMotherInvocationMode;
  name?: string;
  status?: string;
  customProperties?: Record<string, unknown> | null;
}> {
  const generatedApi = getGeneratedApi();
  const platformOrgId = resolvePlatformOrgIdFromEnv();

  if (mode === PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING) {
    const workerId = await ctx.runMutation(generatedApi.internal.ai.workerPool.getOnboardingWorker, {
      platformOrgId,
    }) as Id<"objects">;
    const worker = await ctx.runQuery(generatedApi.internal.agentOntology.getAgentInternal, {
      agentId: workerId,
    }) as PlatformMotherRuntimeCandidate | null;
    if (!worker || !workerId) {
      throw new Error("Platform Mother onboarding worker resolution failed.");
    }
    return {
      agentId: workerId,
      organizationId: platformOrgId,
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING,
      name: worker.name,
      status: worker.status,
      customProperties: worker.customProperties ?? null,
    };
  }

  const agents = await ctx.runQuery(generatedApi.internal.agentOntology.getAllActiveAgentsForOrg, {
    organizationId: platformOrgId,
  }) as PlatformMotherRuntimeCandidate[];
  const runtimeTarget = selectPlatformMotherRuntimeInvocationTarget(agents, {
    mode,
  });
  if (!runtimeTarget?._id) {
    throw new Error(`Platform Mother ${mode} runtime not found on the platform org.`);
  }

  return {
    agentId: runtimeTarget._id as Id<"objects">,
    organizationId: platformOrgId,
    runtimeMode: mode,
    name: runtimeTarget.name,
    status: runtimeTarget.status,
    customProperties: runtimeTarget.customProperties ?? null,
  };
}

export const resolvePlatformMotherInvocationTargetInternal = internalAction({
  args: {
    mode: v.union(
      v.literal(PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING),
      v.literal(PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT),
      v.literal(PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE),
    ),
  },
  handler: async (ctx, args) =>
    await resolvePlatformMotherInvocationTarget(ctx, args.mode),
});

export const dispatchPlatformMotherGovernanceMessageInternal = internalAction({
  args: {
    message: v.string(),
    requestingOrganizationId: v.optional(v.id("organizations")),
    dispatchKey: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const generatedApi = getGeneratedApi();
    const target = await resolvePlatformMotherInvocationTarget(
      ctx,
      PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
    );
    const metadata =
      args.metadata && typeof args.metadata === "object" && !Array.isArray(args.metadata)
        ? (args.metadata as Record<string, unknown>)
        : {};

    return await ctx.runAction(generatedApi.api["ai/kernel/agentExecution"].processInboundMessage, {
      organizationId: target.organizationId,
      channel: "api_test",
      externalContactIdentifier: buildPlatformMotherDispatchExternalContactIdentifier({
        mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
        targetOrganizationId: String(target.organizationId),
        requestingOrganizationId: args.requestingOrganizationId
          ? String(args.requestingOrganizationId)
          : undefined,
        dispatchKey: args.dispatchKey,
      }),
      message: args.message,
      metadata: buildPlatformMotherInvocationMetadata({
        mode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
        source: "platform_mother_governance_dispatch",
        targetAgentId: String(target.agentId),
        targetOrganizationId: String(target.organizationId),
        requestingOrganizationId: args.requestingOrganizationId
          ? String(args.requestingOrganizationId)
          : undefined,
        metadata,
      }),
    });
  },
});
