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

interface NativeGuestActiveAgentCandidate {
  _id: string
  customProperties?: Record<string, unknown>
}

const SUPPORTED_NATIVE_GUEST_LOCALES = new Set(["en", "de", "pl", "es", "fr", "ja"])
const GUEST_WELCOME_NAMESPACE = "ui.ai_assistant"
const GUEST_WELCOME_TRANSLATION_KEY = "ui.ai_assistant.guest.welcome"

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeLocaleCandidate(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return null
  }
  const base = normalized.split(/[-_]/)[0]?.trim().toLowerCase() || ""
  return SUPPORTED_NATIVE_GUEST_LOCALES.has(base) ? base : null
}

function parseAcceptLanguageHeader(value: string | null): string[] {
  if (!value || value.trim().length === 0) {
    return []
  }
  return value
    .split(",")
    .map((segment) => segment.split(";")[0]?.trim())
    .filter((segment): segment is string => Boolean(segment))
}

export function resolvePreferredNativeGuestLocale(args: {
  explicitLocale?: string | null
  acceptLanguageHeader?: string | null
}): string {
  const explicit = normalizeLocaleCandidate(args.explicitLocale)
  if (explicit) {
    return explicit
  }

  const headerCandidates = parseAcceptLanguageHeader(args.acceptLanguageHeader || null)
  for (const candidate of headerCandidates) {
    const normalized = normalizeLocaleCandidate(candidate)
    if (normalized) {
      return normalized
    }
  }

  return "en"
}

function isPrimaryAgent(candidate: NativeGuestActiveAgentCandidate): boolean {
  return candidate.customProperties?.isPrimary === true
}

function hasEnabledChannelBinding(
  candidate: NativeGuestActiveAgentCandidate,
  channel: string
): boolean {
  const channelBindings = candidate.customProperties?.channelBindings
  if (!Array.isArray(channelBindings)) {
    return false
  }
  return channelBindings.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false
    }
    const record = entry as Record<string, unknown>
    const boundChannel = normalizeOptionalString(record.channel)
    const enabled = record.enabled
    return boundChannel === channel && enabled === true
  })
}

export function resolvePrimaryAwareNativeGuestAgentId(
  activeAgents: NativeGuestActiveAgentCandidate[],
  channel: string = "native_guest"
): string | null {
  if (!Array.isArray(activeAgents) || activeAgents.length === 0) {
    return null
  }

  const sortedPrimaryAgents = activeAgents
    .filter(isPrimaryAgent)
    .sort((a, b) => String(a._id).localeCompare(String(b._id)))
  if (sortedPrimaryAgents.length === 0) {
    return null
  }

  const channelPrimary =
    sortedPrimaryAgents.find((agent) => hasEnabledChannelBinding(agent, channel))
    || sortedPrimaryAgents[0]
  return channelPrimary?._id || null
}

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

async function getLocalizedGuestWelcomeMessage(args: {
  convex: ConvexHttpClient
  locale: string
  fallbackMessage: string
}): Promise<string> {
  const loadTranslation = async (locale: string): Promise<string | null> => {
    try {
      const translations = await args.convex.query(
        generatedApi.api.ontologyTranslations.getTranslationsByNamespace,
        {
          locale,
          namespace: GUEST_WELCOME_NAMESPACE,
        }
      ) as Record<string, unknown> | null
      return normalizeOptionalString(translations?.[GUEST_WELCOME_TRANSLATION_KEY])
    } catch {
      return null
    }
  }

  const localeMessage = await loadTranslation(args.locale)
  if (localeMessage) {
    return localeMessage
  }

  if (args.locale !== "en") {
    const fallbackEnglishMessage = await loadTranslation("en")
    if (fallbackEnglishMessage) {
      return fallbackEnglishMessage
    }
  }

  return args.fallbackMessage
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const preferredLocale = resolvePreferredNativeGuestLocale({
      explicitLocale:
        requestUrl.searchParams.get("locale")
        || requestUrl.searchParams.get("lang")
        || requestUrl.searchParams.get("language"),
      acceptLanguageHeader: request.headers.get("accept-language"),
    })

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

    const activeAgents = await convex.query(
      generatedApi.internal.agentOntology.getAllActiveAgentsForOrg,
      {
        organizationId: organizationId as Id<"organizations">,
      }
    )
    const typedActiveAgents = activeAgents as NativeGuestActiveAgentCandidate[]
    const activeAgentIdSet = new Set(
      typedActiveAgents
        .map((agent) => normalizeOptionalString(agent._id))
        .filter((value): value is string => Boolean(value))
    )

    const normalizedConfiguredAgentId = normalizeOptionalString(configuredAgentId)
    let agentId =
      normalizedConfiguredAgentId && activeAgentIdSet.has(normalizedConfiguredAgentId)
        ? normalizedConfiguredAgentId
        : null

    if (!agentId) {
      agentId = resolvePrimaryAwareNativeGuestAgentId(
        typedActiveAgents,
        "native_guest"
      )
    }

    if (!agentId) {
      const activeAgent = await convex.query(
        generatedApi.internal.agentOntology.getActiveAgentForOrg,
        {
          organizationId: organizationId as Id<"organizations">,
          channel: "native_guest",
        }
      )
      agentId = activeAgent?._id || null
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "No active native guest agent available" },
        { status: 503 }
      )
    }

    let resolvedContext: {
      agentId: Id<"objects">
    } | null = null
    try {
      resolvedContext = await convex.query(
        generatedApi.internal.api.v1.webchatApi.resolvePublicMessageContext,
        {
          organizationId: organizationId as Id<"organizations">,
          agentId: agentId as Id<"objects">,
          channel: "native_guest",
        }
      )
    } catch (error) {
      console.warn(
        `[NativeGuestConfig] Failed candidate agent context resolution for ${agentId}`,
        error
      )
      resolvedContext = null
    }

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
    const localizedWelcomeMessage = await getLocalizedGuestWelcomeMessage({
      convex,
      locale: preferredLocale,
      fallbackMessage: bootstrapContract.config.welcomeMessage,
    })
    const localizedWidgetConfig = {
      ...bootstrapContract.config,
      welcomeMessage: localizedWelcomeMessage,
      language: preferredLocale,
    }

    return NextResponse.json(
      {
        organizationId: bootstrapContract.organizationId,
        agentId: bootstrapContract.agentId,
        agentName: bootstrapContract.config.agentName,
        welcomeMessage: localizedWelcomeMessage,
        apiBaseUrl: apiBaseUrl || undefined,
        channel: bootstrapContract.channel,
        contractVersion: bootstrapContract.contractVersion,
        resolvedAt: bootstrapContract.resolvedAt,
        deploymentDefaults: bootstrapContract.deploymentDefaults,
        locale: preferredLocale,
        widgetConfig: localizedWidgetConfig,
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
