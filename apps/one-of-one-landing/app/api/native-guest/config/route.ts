export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { NATIVE_GUEST_ONBOARDING_SURFACE_ONE_OF_ONE_LANDING_AUDIT } from "../../../../../../convex/onboarding/universalOnboardingPolicy";
// Dynamic require avoids excessively deep Convex API type instantiation in this route.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal;

interface NativeGuestActiveAgentCandidate {
  _id: string;
  name?: string;
  customProperties?: Record<string, unknown>;
}

const DEFAULT_ONE_OF_ONE_AUDIT_TEMPLATE_ROLE =
  "one_of_one_lead_capture_consultant_template";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isPrimaryAgent(candidate: NativeGuestActiveAgentCandidate): boolean {
  return candidate.customProperties?.isPrimary === true;
}

function hasEnabledChannelBinding(
  candidate: NativeGuestActiveAgentCandidate,
  channel: string
): boolean {
  const channelBindings = candidate.customProperties?.channelBindings;
  if (!Array.isArray(channelBindings)) {
    return false;
  }

  return channelBindings.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const record = entry as Record<string, unknown>;
    const boundChannel = normalizeOptionalString(record.channel);
    return boundChannel === channel && record.enabled === true;
  });
}

function resolvePrimaryAwareNativeGuestAgentId(
  activeAgents: NativeGuestActiveAgentCandidate[],
  channel: string = "native_guest"
): string | null {
  if (!Array.isArray(activeAgents) || activeAgents.length === 0) {
    return null;
  }

  const sortedPrimaryAgents = activeAgents
    .filter(isPrimaryAgent)
    .sort((a, b) => String(a._id).localeCompare(String(b._id)));
  if (sortedPrimaryAgents.length === 0) {
    return null;
  }

  const channelPrimary =
    sortedPrimaryAgents.find((agent) => hasEnabledChannelBinding(agent, channel))
    || sortedPrimaryAgents[0];
  return channelPrimary?._id || null;
}

function resolveAgentIdByConfiguredSelector(
  activeAgents: NativeGuestActiveAgentCandidate[],
  args: {
    templateRole?: string | null;
    agentName?: string | null;
    channel?: string;
  }
): string | null {
  if (!Array.isArray(activeAgents) || activeAgents.length === 0) {
    return null;
  }

  const normalizedTemplateRole = normalizeOptionalString(args.templateRole)?.toLowerCase();
  const normalizedAgentName = normalizeOptionalString(args.agentName)?.toLowerCase();
  const channel = normalizeOptionalString(args.channel) || "native_guest";

  if (normalizedTemplateRole) {
    const roleCandidates = activeAgents
      .filter((agent) => {
      const templateRole = normalizeOptionalString(agent.customProperties?.templateRole);
      return templateRole?.toLowerCase() === normalizedTemplateRole;
      })
      .sort((left, right) => String(left._id).localeCompare(String(right._id)));
    const byRole =
      roleCandidates.find((agent) => hasEnabledChannelBinding(agent, channel))
      || roleCandidates[0];
    if (byRole?._id) {
      return byRole._id;
    }
  }

  if (normalizedAgentName) {
    const nameCandidates = activeAgents
      .filter((agent) => {
        const topLevelName = normalizeOptionalString(agent.name);
        const displayName = normalizeOptionalString(agent.customProperties?.displayName);
        return (
          topLevelName?.toLowerCase() === normalizedAgentName ||
          displayName?.toLowerCase() === normalizedAgentName
        );
      })
      .sort((left, right) => String(left._id).localeCompare(String(right._id)));
    const byName =
      nameCandidates.find((agent) => hasEnabledChannelBinding(agent, channel))
      || nameCandidates[0];
    if (byName?._id) {
      return byName._id;
    }
  }

  return null;
}

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const adminToken = process.env.CONVEX_DEPLOY_KEY;

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  if (!adminToken) {
    throw new Error("CONVEX_DEPLOY_KEY is not configured");
  }

  const client = new ConvexHttpClient(convexUrl);
  const maybeAdminClient = client as ConvexHttpClient & {
    setAdminAuth?: (token: string) => void;
  };
  if (typeof maybeAdminClient.setAdminAuth === "function") {
    maybeAdminClient.setAdminAuth(adminToken);
  }
  return client;
}

function getPlatformOrganizationId(): string | null {
  return (
    process.env.PLATFORM_ORG_ID ||
    process.env.TEST_ORG_ID ||
    process.env.NEXT_PUBLIC_PLATFORM_ORG_ID ||
    null
  );
}

type InternalQueryRef = FunctionReference<"query", "internal">;

async function queryInternal<QueryRef extends InternalQueryRef>(
  convex: ConvexHttpClient,
  queryRef: QueryRef,
  args: FunctionArgs<QueryRef>
): Promise<FunctionReturnType<QueryRef>> {
  const publicQueryRef =
    queryRef as unknown as FunctionReference<
      "query",
      "public",
      FunctionArgs<QueryRef>,
      FunctionReturnType<QueryRef>
    >;
  return convex.query(publicQueryRef, args);
}

export async function GET() {
  try {
    const organizationId = getPlatformOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: "Platform organization is not configured" },
        { status: 503 }
      );
    }

    const convex = getConvexClient();
    const configuredOneOfOneAgentId =
      process.env.NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_ID ||
      null;
    const configuredGenericAgentId =
      process.env.NEXT_PUBLIC_NATIVE_GUEST_AGENT_ID ||
      process.env.NEXT_PUBLIC_PLATFORM_AGENT_ID ||
      process.env.PLATFORM_AGENT_ID ||
      null;
    const configuredTemplateRole =
      process.env.NEXT_PUBLIC_ONE_OF_ONE_AUDIT_TEMPLATE_ROLE ||
      process.env.ONE_OF_ONE_AUDIT_TEMPLATE_ROLE ||
      DEFAULT_ONE_OF_ONE_AUDIT_TEMPLATE_ROLE;
    const configuredAgentName =
      process.env.NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_NAME ||
      process.env.ONE_OF_ONE_AUDIT_AGENT_NAME ||
      null;

    const activeAgents = await queryInternal(
      convex,
      generatedInternalApi.agentOntology.getAllActiveAgentsForOrg,
      {
        organizationId: organizationId as Id<"organizations">,
      }
    );
    const typedActiveAgents = activeAgents as NativeGuestActiveAgentCandidate[];
    const activeAgent = await queryInternal(
      convex,
      generatedInternalApi.agentOntology.getActiveAgentForOrg,
      {
        organizationId: organizationId as Id<"organizations">,
        channel: "native_guest",
      }
    );

    const candidateAgentIds: string[] = [];
    const candidateSet = new Set<string>();
    const activeAgentIdSet = new Set(
      typedActiveAgents
        .map((agent) => normalizeOptionalString(agent._id))
        .filter((value): value is string => Boolean(value))
    );
    const normalizedActiveAgentId = normalizeOptionalString(activeAgent?._id);
    if (normalizedActiveAgentId) {
      activeAgentIdSet.add(normalizedActiveAgentId);
    }
    const appendCandidateAgentId = (candidate?: string | null) => {
      const normalized = normalizeOptionalString(candidate);
      if (!normalized || candidateSet.has(normalized)) {
        return;
      }
      if (activeAgentIdSet.size > 0 && !activeAgentIdSet.has(normalized)) {
        return;
      }
      candidateSet.add(normalized);
      candidateAgentIds.push(normalized);
    };

    appendCandidateAgentId(configuredOneOfOneAgentId);
    appendCandidateAgentId(
      resolveAgentIdByConfiguredSelector(typedActiveAgents, {
        templateRole: configuredTemplateRole,
        agentName: configuredAgentName,
        channel: "native_guest",
      })
    );
    appendCandidateAgentId(configuredGenericAgentId);
    appendCandidateAgentId(
      resolvePrimaryAwareNativeGuestAgentId(typedActiveAgents, "native_guest")
    );
    appendCandidateAgentId(activeAgent?._id || null);

    if (candidateAgentIds.length === 0) {
      return NextResponse.json(
        { error: "No active native guest agent available" },
        { status: 503 }
      );
    }

    let bootstrapContract: {
      organizationId: Id<"organizations">;
      agentId: Id<"objects">;
      channel: string;
      contractVersion: string;
      config: {
        agentName: string;
      };
    } | null = null;

    for (const candidateAgentId of candidateAgentIds) {
      let resolvedContext:
        | {
          agentId: Id<"objects">;
        }
        | null = null;
      try {
        resolvedContext = await queryInternal(
          convex,
          generatedInternalApi.api.v1.webchatApi.resolvePublicMessageContext,
          {
            organizationId: organizationId as Id<"organizations">,
            agentId: candidateAgentId as Id<"objects">,
            channel: "native_guest",
            deploymentMode: "direct_agent_entry",
          }
        );
      } catch (error) {
        console.warn(
          `[LandingNativeGuestConfig] Skipping candidate agentId due to context resolution error: ${candidateAgentId}`,
          error
        );
        continue;
      }
      if (!resolvedContext) {
        continue;
      }

      const candidateBootstrap = await queryInternal(
        convex,
        generatedInternalApi.api.v1.webchatApi.getPublicWebchatBootstrap,
        {
          agentId: resolvedContext.agentId,
          channel: "native_guest",
        }
      );
      if (!candidateBootstrap) {
        continue;
      }

      bootstrapContract = candidateBootstrap;
      break;
    }

    if (!bootstrapContract) {
      return NextResponse.json(
        { error: "Native guest channel is not enabled on the active agent context" },
        { status: 503 }
      );
    }

    const apiBaseUrl = (
      process.env.NEXT_PUBLIC_API_ENDPOINT_URL ||
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
      ""
    ).replace(/\/+$/, "");

    return NextResponse.json(
      {
        organizationId: bootstrapContract.organizationId,
        agentId: bootstrapContract.agentId,
        agentName: bootstrapContract.config.agentName,
        apiBaseUrl: apiBaseUrl || undefined,
        channel: bootstrapContract.channel,
        onboardingSurface:
          NATIVE_GUEST_ONBOARDING_SURFACE_ONE_OF_ONE_LANDING_AUDIT,
        contractVersion: bootstrapContract.contractVersion,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[LandingNativeGuestConfig] Failed to resolve config:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to resolve native guest config",
      },
      { status: 500 }
    );
  }
}
