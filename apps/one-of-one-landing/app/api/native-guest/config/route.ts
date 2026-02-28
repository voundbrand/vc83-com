export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../../../../convex/_generated/dataModel";
const generatedApi: any = require("../../../../../../convex/_generated/api");

interface NativeGuestActiveAgentCandidate {
  _id: string;
  name?: string;
  customProperties?: Record<string, unknown>;
}

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
  }
): string | null {
  if (!Array.isArray(activeAgents) || activeAgents.length === 0) {
    return null;
  }

  const normalizedTemplateRole = normalizeOptionalString(args.templateRole)?.toLowerCase();
  const normalizedAgentName = normalizeOptionalString(args.agentName)?.toLowerCase();

  if (normalizedTemplateRole) {
    const byRole = activeAgents.find((agent) => {
      const templateRole = normalizeOptionalString(agent.customProperties?.templateRole);
      return templateRole?.toLowerCase() === normalizedTemplateRole;
    });
    if (byRole?._id) {
      return byRole._id;
    }
  }

  if (normalizedAgentName) {
    const byName = activeAgents.find((agent) => {
      const topLevelName = normalizeOptionalString(agent.name);
      const displayName = normalizeOptionalString(agent.customProperties?.displayName);
      return (
        topLevelName?.toLowerCase() === normalizedAgentName ||
        displayName?.toLowerCase() === normalizedAgentName
      );
    });
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
    const configuredAgentId =
      process.env.NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_ID ||
      process.env.NEXT_PUBLIC_NATIVE_GUEST_AGENT_ID ||
      process.env.NEXT_PUBLIC_PLATFORM_AGENT_ID ||
      process.env.PLATFORM_AGENT_ID ||
      null;
    const configuredTemplateRole =
      process.env.NEXT_PUBLIC_ONE_OF_ONE_AUDIT_TEMPLATE_ROLE ||
      process.env.ONE_OF_ONE_AUDIT_TEMPLATE_ROLE ||
      null;
    const configuredAgentName =
      process.env.NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_NAME ||
      process.env.ONE_OF_ONE_AUDIT_AGENT_NAME ||
      null;

    let agentId = configuredAgentId;
    if (!agentId) {
      const activeAgents = await convex.query(
        generatedApi.internal.agentOntology.getAllActiveAgentsForOrg,
        {
          organizationId: organizationId as Id<"organizations">,
        }
      );
      const typedActiveAgents = activeAgents as NativeGuestActiveAgentCandidate[];

      agentId = resolveAgentIdByConfiguredSelector(typedActiveAgents, {
        templateRole: configuredTemplateRole,
        agentName: configuredAgentName,
      });
    }

    if (!agentId) {
      const activeAgents = await convex.query(
        generatedApi.internal.agentOntology.getAllActiveAgentsForOrg,
        {
          organizationId: organizationId as Id<"organizations">,
        }
      );
      agentId = resolvePrimaryAwareNativeGuestAgentId(
        activeAgents as NativeGuestActiveAgentCandidate[],
        "native_guest"
      );
    }

    if (!agentId) {
      const activeAgent = await convex.query(
        generatedApi.internal.agentOntology.getActiveAgentForOrg,
        {
          organizationId: organizationId as Id<"organizations">,
          channel: "native_guest",
        }
      );
      agentId = activeAgent?._id || null;
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "No active native guest agent available" },
        { status: 503 }
      );
    }

    const resolvedContext = await convex.query(
      generatedApi.internal.api.v1.webchatApi.resolvePublicMessageContext,
      {
        organizationId: organizationId as Id<"organizations">,
        agentId: agentId as Id<"objects">,
        channel: "native_guest",
      }
    );

    if (!resolvedContext) {
      return NextResponse.json(
        { error: "Native guest agent context could not be resolved" },
        { status: 503 }
      );
    }

    const bootstrapContract = await convex.query(
      generatedApi.internal.api.v1.webchatApi.getPublicWebchatBootstrap,
      {
        agentId: resolvedContext.agentId,
        channel: "native_guest",
      }
    );

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
