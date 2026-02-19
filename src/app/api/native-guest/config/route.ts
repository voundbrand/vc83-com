/**
 * Native guest chat bootstrap config.
 *
 * Returns the platform org + active onboarding agent IDs used by the
 * native desktop guest AI chat surface.
 */

export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { Id } from "../../../../../convex/_generated/dataModel"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const generatedApi: any = require("../../../../../convex/_generated/api")

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const adminToken = process.env.CONVEX_DEPLOY_KEY

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured")
  }
  if (!adminToken) {
    throw new Error("CONVEX_DEPLOY_KEY is not configured")
  }

  const client = new ConvexHttpClient(convexUrl)
  const maybeAdminClient = client as any
  if (typeof maybeAdminClient.setAdminAuth === "function") {
    maybeAdminClient.setAdminAuth(adminToken)
  }
  return client
}

function getPlatformOrganizationId(): string | null {
  return (
    process.env.PLATFORM_ORG_ID ||
    process.env.TEST_ORG_ID ||
    process.env.NEXT_PUBLIC_PLATFORM_ORG_ID ||
    null
  )
}

export async function GET() {
  try {
    const organizationId = getPlatformOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { error: "Platform organization is not configured" },
        { status: 503 }
      )
    }

    const convex = getConvexClient()
    const configuredAgentId =
      process.env.NEXT_PUBLIC_NATIVE_GUEST_AGENT_ID ||
      process.env.NEXT_PUBLIC_PLATFORM_AGENT_ID ||
      process.env.PLATFORM_AGENT_ID ||
      null

    let agentId = configuredAgentId

    if (!agentId) {
      const activeAgent = await convex.query(generatedApi.internal.agentOntology.getActiveAgentForOrg, {
        organizationId: organizationId as Id<"organizations">,
        channel: "native_guest",
      })
      agentId = activeAgent?._id || null
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "No active native guest agent available" },
        { status: 503 }
      )
    }

    const resolvedContext = await convex.query(
      generatedApi.internal.api.v1.webchatApi.resolvePublicMessageContext,
      {
        organizationId: organizationId as Id<"organizations">,
        agentId: agentId as Id<"objects">,
        channel: "native_guest",
      }
    )

    if (!resolvedContext) {
      return NextResponse.json(
        { error: "Native guest agent context could not be resolved" },
        { status: 503 }
      )
    }

    const bootstrapContract = await convex.query(
      generatedApi.internal.api.v1.webchatApi.getPublicWebchatBootstrap,
      {
        agentId: resolvedContext.agentId,
        channel: "native_guest",
      }
    )

    if (!bootstrapContract) {
      return NextResponse.json(
        { error: "Native guest channel is not enabled on the active agent context" },
        { status: 503 }
      )
    }

    const apiBaseUrl = (
      process.env.NEXT_PUBLIC_API_ENDPOINT_URL ||
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
      ""
    ).replace(/\/+$/, "")

    return NextResponse.json(
      {
        organizationId: bootstrapContract.organizationId,
        agentId: bootstrapContract.agentId,
        agentName: bootstrapContract.config.agentName,
        welcomeMessage: bootstrapContract.config.welcomeMessage,
        apiBaseUrl: apiBaseUrl || undefined,
        channel: bootstrapContract.channel,
        contractVersion: bootstrapContract.contractVersion,
        resolvedAt: bootstrapContract.resolvedAt,
        deploymentDefaults: bootstrapContract.deploymentDefaults,
        widgetConfig: bootstrapContract.config,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    console.error("[NativeGuestConfig] Failed to resolve config:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to resolve native guest config",
      },
      { status: 500 }
    )
  }
}
