"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability"
import { LayoutModeProvider, useLayoutMode, type LayoutMode } from "./layout-mode-context"
import { AIChatProvider, useAIChatContext } from "@/contexts/ai-chat-context"
import { SinglePaneLayout } from "./single-pane/single-pane-layout"
import { SlickPaneLayout } from "./slick-pane/slick-pane-layout"
import { FourPaneLayout } from "./four-pane/four-pane-layout"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useNotification } from "@/hooks/use-notification"
import type { AIChatSuperAdminQaMode } from "@/hooks/use-ai-chat"
import { useNativeGuestChat, type NativeGuestChatConfig } from "@/hooks/use-ai-chat"
import { useMultipleNamespaces } from "@/hooks/use-namespace-translations"
import { useTranslation } from "@/contexts/translation-context"
import type { Id } from "../../../../convex/_generated/dataModel"
import { resolveOperatorCollaborationShellResolution } from "@/lib/operator-collaboration-cutover"
import { buildPlatformAgentCreationKickoff } from "./onboarding-kickoff-contract"
import { ChatMarkdownMessage } from "./chat-markdown-message"
import {
  getCreditRecoveryAction,
  openCreditRecoveryAction,
} from "@/lib/credits/credit-recovery"

const ONBOARDING_ATTRIBUTION_STORAGE_KEY = "l4yercak3_onboarding_attribution"
const LANDING_COMMERCIAL_INTENT_MAX_AGE_MS = 1000 * 60 * 60 * 12
const SAMANTHA_COLD_TEMPLATE_ROLE = "one_of_one_lead_capture_consultant_template"
const SAMANTHA_WARM_TEMPLATE_ROLE = "one_of_one_warm_lead_capture_consultant_template"
const STORE_COMMERCIAL_HANDOFF_CONTEXT = "store_commercial_handoff"

type LandingCommercialIntentCode =
  | "diagnostic_qualification"
  | "diagnostic_scope_intake"
  | "consulting_sprint_scope_only"
  | "implementation_start_layer1"
  | "implementation_layer_upgrade"

type LandingCommercialRoutingHint = "samantha_lead_capture" | "founder_bridge" | "enterprise_sales"
type LandingCommercialSurface = "one_of_one_landing" | "store"
type LandingCommercialAudienceTemperature = "warm" | "cold"

type LandingCommercialLanguage = "en" | "de"

interface LandingCommercialKickoffPayload {
  offerCode: string
  intentCode: LandingCommercialIntentCode
  surface: LandingCommercialSurface
  audienceTemperature?: LandingCommercialAudienceTemperature
  routingHint?: LandingCommercialRoutingHint
  channel?: string
  lang?: LandingCommercialLanguage
  campaign?: {
    source?: string
    medium?: string
    campaign?: string
    content?: string
    term?: string
    referrer?: string
    landingPath?: string
  }
}

interface CommercialKickoffContractMetadata {
  kind: "commercial_motion_v1"
  contractVersion: "commercial_motion_v1"
  audienceTemperature: "warm" | "cold"
  targetSpecialistDisplayName: string
  targetSpecialistTemplateRole: string
  intentCode: LandingCommercialIntentCode
  offerCode: string
  surface: LandingCommercialSurface
  routingHint?: LandingCommercialRoutingHint
  channel?: string
  campaign: {
    source?: string
    medium?: string
    campaign?: string
    content?: string
    term?: string
    referrer?: string
    landingPath?: string
  }
  [key: string]: unknown
}

interface AIChatWindowProps {
  /** When true, shows back-to-desktop navigation (for /chat route) */
  fullScreen?: boolean
  /** Optional initial layout mode for deep-link entry points */
  initialLayoutMode?: LayoutMode
  /** Optional panel hint for deterministic entry routing */
  initialPanel?: string
  /** Optional deep-link context source */
  openContext?: string
  /** Optional source interview/session context */
  sourceSessionId?: string
  /** Optional source org context */
  sourceOrganizationId?: string
  /** Optional target agent for configuration-scoped chat */
  targetAgentId?: Id<"objects">
}

const SAMANTHA_QA_TEMPLATE_ROLES = new Set([
  "one_of_one_lead_capture_consultant_template",
  "one_of_one_warm_lead_capture_consultant_template",
])
const SAMANTHA_QA_SOURCE_SESSION_TOKEN_STORAGE_KEY =
  "super_admin_samantha_qa_source_session_token"
const SAMANTHA_QA_SOURCE_AUDIT_CHANNEL_STORAGE_KEY =
  "super_admin_samantha_qa_source_audit_channel"

function isSamanthaQaTemplateRole(value?: string): boolean {
  return Boolean(value && SAMANTHA_QA_TEMPLATE_ROLES.has(value))
}

function readSuperAdminQaModeFromSearch(
  search: string,
  sessionId?: string
): AIChatSuperAdminQaMode | undefined {
  if (!search) {
    return undefined
  }
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const enabledToken = (params.get("qa") || params.get("qaMode") || "").trim().toLowerCase()
  const enabled = enabledToken === "1" || enabledToken === "true" || enabledToken === "on" || enabledToken === "super_admin_agent_qa"
  if (!enabled) {
    return undefined
  }
  const targetAgentId = (params.get("qaAgentId") || "").trim() || undefined
  const targetTemplateRole = (params.get("qaTemplateRole") || "").trim() || undefined
  const label = (params.get("qaLabel") || "").trim() || undefined
  const runIdFromQuery = (params.get("qaRunId") || params.get("runId") || "").trim() || undefined
  const runId = runIdFromQuery || `qa_${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`
  const samanthaQaMode = isSamanthaQaTemplateRole(targetTemplateRole)
  const querySourceSessionToken = (params.get("qaSourceSessionToken") || "").trim() || undefined
  const querySourceAuditChannelToken = (params.get("qaSourceAuditChannel") || "").trim().toLowerCase()
  const querySourceAuditChannel = querySourceAuditChannelToken === "native_guest"
    ? "native_guest"
    : querySourceAuditChannelToken === "webchat"
      ? "webchat"
      : undefined
  const queryIngressChannel = (params.get("qaIngressChannel") || "").trim() || undefined
  const queryOriginSurface = (params.get("qaOriginSurface") || "").trim() || undefined
  const storedSourceSessionToken =
    typeof window !== "undefined"
      ? (window.localStorage.getItem(SAMANTHA_QA_SOURCE_SESSION_TOKEN_STORAGE_KEY) || "").trim() || undefined
      : undefined
  const storedSourceAuditChannelToken =
    typeof window !== "undefined"
      ? (window.localStorage.getItem(SAMANTHA_QA_SOURCE_AUDIT_CHANNEL_STORAGE_KEY) || "").trim().toLowerCase()
      : ""
  const storedSourceAuditChannel = storedSourceAuditChannelToken === "native_guest"
    ? "native_guest"
    : storedSourceAuditChannelToken === "webchat"
      ? "webchat"
      : undefined
  const sourceSessionToken = samanthaQaMode
    ? (querySourceSessionToken || storedSourceSessionToken)
    : undefined
  const sourceAuditChannel = samanthaQaMode
    ? (querySourceAuditChannel || storedSourceAuditChannel || "webchat")
    : undefined
  if (typeof window !== "undefined" && samanthaQaMode) {
    if (querySourceSessionToken) {
      window.localStorage.setItem(
        SAMANTHA_QA_SOURCE_SESSION_TOKEN_STORAGE_KEY,
        querySourceSessionToken
      )
    }
    if (querySourceAuditChannel) {
      window.localStorage.setItem(
        SAMANTHA_QA_SOURCE_AUDIT_CHANNEL_STORAGE_KEY,
        querySourceAuditChannel
      )
    }
  }
  return {
    enabled: true,
    sessionId,
    targetAgentId,
    targetTemplateRole,
    label,
    runId,
    sourceSessionToken,
    sourceAuditChannel,
    ingressChannel: samanthaQaMode ? (queryIngressChannel || "desktop") : undefined,
    originSurface: samanthaQaMode ? (queryOriginSurface || "super_admin_qa_chat") : undefined,
  }
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readLandingCommercialKickoffPayload(): LandingCommercialKickoffPayload | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(ONBOARDING_ATTRIBUTION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      channel?: unknown
      capturedAt?: unknown
      lang?: unknown
      commercialIntent?: {
        offerCode?: unknown
        intentCode?: unknown
        surface?: unknown
        audienceTemperature?: unknown
        audience_temperature?: unknown
        routingHint?: unknown
      }
      campaign?: {
        source?: unknown
        medium?: unknown
        campaign?: unknown
        content?: unknown
        term?: unknown
        referrer?: unknown
        landingPath?: unknown
      }
    }

    const capturedAt = typeof parsed?.capturedAt === "number" ? parsed.capturedAt : 0
    if (capturedAt > 0 && Date.now() - capturedAt > LANDING_COMMERCIAL_INTENT_MAX_AGE_MS) {
      return null
    }

    const offerCode = cleanOptionalString(parsed?.commercialIntent?.offerCode)
    const intentCode = cleanOptionalString(parsed?.commercialIntent?.intentCode)
    const surface = cleanOptionalString(parsed?.commercialIntent?.surface)
    const audienceTemperature = cleanOptionalString(
      parsed?.commercialIntent?.audienceTemperature ?? parsed?.commercialIntent?.audience_temperature
    )
    const routingHint = cleanOptionalString(parsed?.commercialIntent?.routingHint) as
      | LandingCommercialRoutingHint
      | undefined
    const channel = cleanOptionalString(parsed?.channel)
    const rawLang = cleanOptionalString(parsed?.lang)
    const lang: LandingCommercialLanguage | undefined =
      rawLang === "de" ? "de" : rawLang === "en" ? "en" : undefined
    const campaign = {
      source: cleanOptionalString(parsed?.campaign?.source),
      medium: cleanOptionalString(parsed?.campaign?.medium),
      campaign: cleanOptionalString(parsed?.campaign?.campaign),
      content: cleanOptionalString(parsed?.campaign?.content),
      term: cleanOptionalString(parsed?.campaign?.term),
      referrer: cleanOptionalString(parsed?.campaign?.referrer),
      landingPath: cleanOptionalString(parsed?.campaign?.landingPath),
    }

    if (!offerCode || !intentCode || !surface) return null
    if (surface !== "one_of_one_landing" && surface !== "store") return null
    if (
      intentCode !== "diagnostic_qualification"
      && intentCode !== "diagnostic_scope_intake"
      && intentCode !== "consulting_sprint_scope_only"
      && intentCode !== "implementation_start_layer1"
      && intentCode !== "implementation_layer_upgrade"
    ) {
      return null
    }
    const normalizedAudienceTemperature =
      audienceTemperature === "warm" || audienceTemperature === "cold"
        ? audienceTemperature
        : undefined

    return {
      offerCode,
      intentCode,
      surface,
      audienceTemperature: normalizedAudienceTemperature,
      routingHint,
      channel,
      lang,
      campaign,
    }
  } catch {
    return null
  }
}

function buildCommercialMotionKickoffContract(
  payload: LandingCommercialKickoffPayload
): CommercialKickoffContractMetadata {
  // Fail closed: only route warm specialist when explicit warm signal is present.
  const warmAudience = payload.audienceTemperature === "warm"
  const targetTemplateRole = warmAudience ? SAMANTHA_WARM_TEMPLATE_ROLE : SAMANTHA_COLD_TEMPLATE_ROLE
  const targetDisplayName = warmAudience ? "Samantha Warm" : "Samantha"

  return {
    kind: "commercial_motion_v1",
    contractVersion: "commercial_motion_v1",
    audienceTemperature: warmAudience ? "warm" : "cold",
    targetSpecialistDisplayName: targetDisplayName,
    targetSpecialistTemplateRole: targetTemplateRole,
    intentCode: payload.intentCode,
    offerCode: payload.offerCode,
    surface: payload.surface,
    routingHint: payload.routingHint,
    channel: payload.channel,
    lang: payload.lang,
    campaign: {
      source: payload.campaign?.source,
      medium: payload.campaign?.medium,
      campaign: payload.campaign?.campaign,
      content: payload.campaign?.content,
      term: payload.campaign?.term,
      referrer: payload.campaign?.referrer,
      landingPath: payload.campaign?.landingPath,
    },
  }
}

function buildCommercialKickoffStarterMessage(payload: LandingCommercialKickoffPayload): string {
  const isGerman = payload.lang === "de"

  if (payload.intentCode === "diagnostic_qualification") {
    return isGerman
      ? "Ich möchte die kostenlose Diagnose durchführen und den besten nächsten Workflow-Schritt verstehen."
      : "I want to run the free diagnostic and understand the best next workflow step."
  }
  if (payload.intentCode === "consulting_sprint_scope_only") {
    return isGerman
      ? "Ich möchte einen Consulting-Sprint planen und die richtige Strategie erarbeiten."
      : "I want to scope a consulting sprint and map the right strategy."
  }
  return isGerman
    ? "Ich möchte den Implementierungsstart besprechen und die Bereitschaft für den Launch bestätigen."
    : "I want to discuss implementation start and confirm readiness for launch."
}

function AIChatWindowContent({
  fullScreen = false,
  allowLegacyShellFallback = false,
}: {
  fullScreen?: boolean
  allowLegacyShellFallback?: boolean
}) {
  const { mode } = useLayoutMode()
  const { latestConversationEvent } = useAIChatContext()

  useEffect(() => {
    if (!latestConversationEvent) {
      return
    }
    // Canonical conversation session event binding for web/desktop shells.
    console.info("[conversation_event_bound]", latestConversationEvent)
  }, [latestConversationEvent])

  if (!allowLegacyShellFallback) {
    return (
      <>
        {fullScreen && (
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: "var(--shell-border-strong)", background: "var(--shell-surface-elevated)" }}
          >
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover-menu-item"
              style={{ color: "var(--shell-text-dim)" }}
              title="Back to Desktop"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-sm font-medium" style={{ color: "var(--shell-text)" }}>
              AI Assistant
            </span>
            <div className="flex-1" />
          </div>
        )}
        <SlickPaneLayout />
      </>
    )
  }

  if (mode === "four-pane") {
    return <FourPaneLayout />
  }

  const activeSinglePaneLayout = mode === "slick" ? <SlickPaneLayout /> : <SinglePaneLayout />

  return (
    <>
      {fullScreen && (
        <div
          className="flex items-center gap-2 px-3 py-2 border-b"
          style={{ borderColor: "var(--shell-border-strong)", background: "var(--shell-surface-elevated)" }}
        >
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover-menu-item"
            style={{ color: "var(--shell-text-dim)" }}
            title="Back to Desktop"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-medium" style={{ color: "var(--shell-text)" }}>
            AI Assistant
          </span>
          <div className="flex-1" />
        </div>
      )}
      {activeSinglePaneLayout}
    </>
  )
}

function buildSupportIntakeKickoff(args: {
  openContext?: string
  sourceSessionId?: string
  sourceOrganizationId?: string
}): string {
  const tokens = (args.openContext || "support:unknown:unknown:support_intake").split(":")
  const [channelRaw, productRaw, accountRaw, sourceRaw] = tokens
  const intakeChannel = channelRaw === "community" ? "community" : "support"
  const selectedProduct = productRaw || "unknown"
  const selectedAccount = accountRaw || "unknown"
  const entrySource = sourceRaw || "support_intake"
  const sourceSessionLine = args.sourceSessionId
    ? `source_session_id=${args.sourceSessionId}`
    : "source_session_id=unknown"
  const sourceOrgLine = args.sourceOrganizationId
    ? `source_organization_id=${args.sourceOrganizationId}`
    : "source_organization_id=unknown"

  return [
    "Route this conversation through the platform support intake workflow.",
    "intent=support_intake",
    `intake_channel=${intakeChannel}`,
    `selected_product=${selectedProduct}`,
    `selected_account=${selectedAccount}`,
    `entry_source=${entrySource}`,
    sourceSessionLine,
    sourceOrgLine,
    "required_sequence=triage.v1 -> troubleshooting.v1 -> escalation_decision.v1",
    "response_contract:",
    "1) Clarify the issue with targeted questions if details are missing.",
    "2) Provide actionable resolution steps with explicit verification checks.",
    "3) If unresolved or account-critical, produce escalation-ready summary fields.",
  ].join("\n")
}

interface CmsRewriteKickoffPayload {
  contractVersion?: string
  application?: {
    id?: string
    name?: string
  }
  field?: {
    page?: string
    section?: string
    key?: string
    label?: string
    locale?: string
  }
  currentText?: string
  instruction?: string
}

function decodeUtf8Base64(value: string): string | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const binary = window.atob(value)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function parseCmsRewriteKickoffPayload(openContext?: string): CmsRewriteKickoffPayload | null {
  if (!openContext || !openContext.startsWith("cms_rewrite:")) {
    return null
  }

  const encodedPayload = openContext.slice("cms_rewrite:".length).trim()
  if (!encodedPayload) {
    return null
  }

  const decoded = decodeUtf8Base64(encodedPayload)
  if (!decoded) {
    return null
  }

  try {
    const parsed = JSON.parse(decoded) as CmsRewriteKickoffPayload
    if (!parsed || typeof parsed !== "object") {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function cleanKickoffString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : fallback
}

function buildCmsRewriteKickoff(args: {
  openContext?: string
  sourceSessionId?: string
  sourceOrganizationId?: string
}): string {
  const payload = parseCmsRewriteKickoffPayload(args.openContext)

  const appName = cleanKickoffString(payload?.application?.name, "Unknown app")
  const appId = cleanKickoffString(payload?.application?.id, "unknown")
  const page = cleanKickoffString(payload?.field?.page, "unknown")
  const section = cleanKickoffString(payload?.field?.section, "unknown")
  const key = cleanKickoffString(payload?.field?.key, "unknown")
  const label = cleanKickoffString(payload?.field?.label, key)
  const locale = cleanKickoffString(payload?.field?.locale, "unknown")
  const currentText = cleanKickoffString(payload?.currentText, "(empty)")
  const instruction = cleanKickoffString(
    payload?.instruction,
    "Rewrite this field with One-of-One clarity while preserving factual meaning."
  )
  const sourceSessionLine = args.sourceSessionId
    ? `source_session_id=${args.sourceSessionId}`
    : "source_session_id=unknown"
  const sourceOrgLine = args.sourceOrganizationId
    ? `source_organization_id=${args.sourceOrganizationId}`
    : "source_organization_id=unknown"

  return [
    "Route this conversation through a CMS rewrite assist flow.",
    "intent=cms_copy_rewrite",
    `application_name=${appName}`,
    `application_id=${appId}`,
    `target_locale=${locale}`,
    `target_field=${page}.${section}.${key}`,
    `target_label=${label}`,
    sourceSessionLine,
    sourceOrgLine,
    "",
    "Rewrite instruction:",
    instruction,
    "",
    "Current field text:",
    currentText,
    "",
    "Response contract:",
    "1) Return exactly 3 rewrite options in the target locale.",
    "2) Keep each option concise and publication-ready.",
    "3) Preserve factual meaning and avoid inventing claims.",
    "4) End with one recommended option and a one-line rationale.",
    "5) Do not perform any side effects or mutate CMS data.",
  ].join("\n")
}

function AIChatEntryBootstrap({
  initialPanel,
  openContext,
  sourceSessionId,
  sourceOrganizationId,
  superAdminQaEnabled,
}: {
  initialPanel?: string
  openContext?: string
  sourceSessionId?: string
  sourceOrganizationId?: string
  superAdminQaEnabled?: boolean
}) {
  const { chat, currentConversationId, setCurrentConversationId, isSending, setIsSending } = useAIChatContext()
  const notification = useNotification()
  const seededEntryKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const normalizedPanel = typeof initialPanel === "string" ? initialPanel.trim().toLowerCase() : ""
    const isAgentCreationPanel = normalizedPanel === "agent-creation"
    const isSupportIntakePanel = normalizedPanel === "support-intake"
    const isCmsRewritePanel = normalizedPanel === "cms-rewrite"
    const isChatRoute = typeof window !== "undefined" && window.location.pathname === "/chat"
    const normalizedOpenContext = typeof openContext === "string" ? openContext.trim().toLowerCase() : ""
    const isStoreCommercialHandoff = normalizedOpenContext === STORE_COMMERCIAL_HANDOFF_CONTEXT
    const commercialKickoff =
      !isAgentCreationPanel && !isSupportIntakePanel && !isCmsRewritePanel && (isChatRoute || isStoreCommercialHandoff)
        ? readLandingCommercialKickoffPayload()
        : null
    if (superAdminQaEnabled) {
      return
    }
    if (!isAgentCreationPanel && !isSupportIntakePanel && !isCmsRewritePanel && !commercialKickoff) {
      return
    }

    const requiresEmptyConversation =
      isAgentCreationPanel || isSupportIntakePanel || Boolean(commercialKickoff)

    if (requiresEmptyConversation && (chat.messages.length > 0 || isSending)) {
      return
    }

    if (!requiresEmptyConversation && isSending) {
      return
    }

    const entryKey = [
      normalizedPanel,
      openContext || (isAgentCreationPanel
        ? "agent_creation"
        : isSupportIntakePanel
          ? "support_intake"
          : isCmsRewritePanel
            ? "cms_rewrite"
            : "support_intake"),
      sourceSessionId || "none",
      sourceOrganizationId || "none",
      commercialKickoff?.intentCode || "none",
      commercialKickoff?.offerCode || "none",
      commercialKickoff?.routingHint || "none",
      commercialKickoff?.campaign?.campaign || "none",
      commercialKickoff?.campaign?.source || "none",
    ].join(":")

    if (seededEntryKeyRef.current === entryKey) {
      return
    }
    seededEntryKeyRef.current = entryKey
    if (isAgentCreationPanel && typeof window !== "undefined") {
      window.sessionStorage.setItem("builder_clone_first_enforced", "true")
    }

    const kickoffMessage = isAgentCreationPanel
      ? buildPlatformAgentCreationKickoff({
          openContext,
          sourceSessionId,
          sourceOrganizationId,
        })
      : isSupportIntakePanel
        ? buildSupportIntakeKickoff({
            openContext,
            sourceSessionId,
            sourceOrganizationId,
          })
        : isCmsRewritePanel
          ? buildCmsRewriteKickoff({
              openContext,
              sourceSessionId,
              sourceOrganizationId,
            })
        : commercialKickoff
          ? buildCommercialKickoffStarterMessage(commercialKickoff)
          : null
    const kickoffContract = commercialKickoff
      ? buildCommercialMotionKickoffContract(commercialKickoff)
      : undefined

    if (!kickoffMessage) {
      return
    }

    setIsSending(true)
    void chat
      .sendMessage(
        kickoffMessage,
        currentConversationId,
        kickoffContract ? { kickoffContract } : undefined
      )
      .then((result) => {
        if (!currentConversationId && result.conversationId) {
          setCurrentConversationId(result.conversationId)
        }
      })
      .catch((error) => {
        const creditRecovery = getCreditRecoveryAction(error)
        if (creditRecovery) {
          notification.error(
            "No Credits Available",
            "You are out of credits. Re-up now to keep the conversation going.",
            {
              action: {
                label: creditRecovery.actionLabel,
                onClick: () => openCreditRecoveryAction(creditRecovery.actionUrl),
              },
            }
          )
        } else {
          console.error("[AIChatWindow] Failed to seed creation kickoff:", error)
        }
        seededEntryKeyRef.current = null
      })
      .finally(() => {
        setIsSending(false)
      })
  }, [
    chat,
    currentConversationId,
    initialPanel,
    isSending,
    notification,
    openContext,
    setCurrentConversationId,
    setIsSending,
    sourceOrganizationId,
    sourceSessionId,
    superAdminQaEnabled,
  ])

  return null
}

function AIChatSignedOutState({ fullScreen }: { fullScreen?: boolean }) {
  const { t } = useMultipleNamespaces(["ui.ai_assistant", "ui.login"])
  const { locale } = useTranslation()
  const tx = useCallback(
    (key: string, fallback: string, params?: Record<string, string | number>) => {
      const translated = t(key, params)
      return translated === key ? fallback : translated
    },
    [t]
  )
  const [input, setInput] = useState("")
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  const [welcomeMessage, setWelcomeMessage] = useState<string>("")
  const [config, setConfig] = useState<NativeGuestChatConfig | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const guestChat = useNativeGuestChat(config, { preferredLocale: locale })

  useEffect(() => {
    let isCancelled = false
    setConfigLoading(true)
    setConfigError(null)

    void fetch("/api/native-guest/config", {
      method: "GET",
      cache: "no-store",
      headers:
        typeof window !== "undefined"
          ? {
              "Accept-Language":
                (window.navigator.languages && window.navigator.languages.length > 0
                  ? window.navigator.languages.join(",")
                  : window.navigator.language) || locale,
            }
          : undefined,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string
          organizationId?: string
          agentId?: string
          apiBaseUrl?: string
          welcomeMessage?: string
        }

        if (!response.ok || !payload.organizationId || !payload.agentId) {
          throw new Error(payload.error || "Guest chat is not available right now.")
        }

        if (isCancelled) {
          return
        }

        setConfig({
          organizationId: payload.organizationId,
          agentId: payload.agentId,
          apiBaseUrl: payload.apiBaseUrl,
        })
        setWelcomeMessage(payload.welcomeMessage || "")
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }
        const message =
          error instanceof Error
            ? error.message
            : "Guest chat is not available right now."
        setConfigError(message)
      })
      .finally(() => {
        if (!isCancelled) {
          setConfigLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [guestChat.isSending, guestChat.messages.length])

  const openAuthWindow = (mode: "signin" | "signup") => {
    if (typeof window === "undefined") return
    const returnPath = window.location.pathname === "/chat" ? "/chat" : "/"
    const params = new URLSearchParams({
      openLogin: "aiAssistant",
      authMode: mode,
    })
    window.sessionStorage.setItem("auth_return_url", returnPath)
    window.location.href = `/?${params.toString()}`
  }

  const submitGuestMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || guestChat.isSending) {
      return
    }
    setInput("")
    await guestChat.sendMessage(trimmed)
    setShowAuthPrompt(true)
  }

  const showAuthCtas = showAuthPrompt || guestChat.messages.length > 0
  const resolvedWelcomeMessage =
    welcomeMessage
    || tx(
      "ui.ai_assistant.guest.welcome",
      "Hey, I am Quinn. Tell me what you want to build and I will map the next steps."
    )

  return (
    <div className="h-full flex flex-col" lang={locale}>
      {fullScreen ? (
        <div
          className="flex items-center gap-2 px-3 py-2 border-b"
          style={{ borderColor: "var(--shell-border-strong)", background: "var(--shell-surface-elevated)" }}
        >
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover-menu-item"
            style={{ color: "var(--shell-text-dim)" }}
            title={tx("ui.ai_assistant.chat.back_to_desktop", "Back to Desktop")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-medium" style={{ color: "var(--shell-text)" }}>
            {tx("ui.ai_assistant.chat.title", "AI Assistant")}
          </span>
          <div className="flex-1" />
        </div>
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden desktop-shell-surface">
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--shell-border-soft)" }}>
          <h2 className="font-pixel text-xs uppercase tracking-wide desktop-shell-text">
            {tx("ui.ai_assistant.guest.entry_title", "Try Quinn Before You Sign In")}
          </h2>
          <p className="mt-1 text-xs desktop-shell-text-muted">
            {tx(
              "ui.ai_assistant.guest.entry_subtitle",
              "Describe your workflow goal. I will draft a plan, then you can create an account to continue."
            )}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
          {configLoading ? (
            <div className="desktop-shell-note flex items-center gap-2 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {tx("ui.ai_assistant.guest.loading", "Preparing guest chat...")}
            </div>
          ) : null}

          {!configLoading && configError ? (
            <div className="desktop-shell-note text-xs" style={{ borderColor: "var(--warning)" }}>
              {configError}
            </div>
          ) : null}

          {!configLoading && !configError && guestChat.messages.length === 0 ? (
            <div className="desktop-shell-note text-sm">{resolvedWelcomeMessage}</div>
          ) : null}

          {guestChat.messages.map((message) => (
            <div key={message.id} className="flex flex-col gap-1">
              <span className="font-pixel text-xs uppercase tracking-wide desktop-shell-text-muted">
                {message.role === "user"
                  ? tx("ui.ai_assistant.guest.you", "You")
                  : tx("ui.ai_assistant.guest.quinn", "Quinn")}
              </span>
              <div
                className="rounded-md border px-3 py-2 text-sm"
                style={{
                  borderColor:
                    message.role === "user"
                      ? "var(--shell-border-strong)"
                      : "var(--shell-border-soft)",
                  background:
                    message.role === "user"
                      ? "var(--shell-button-surface)"
                      : "var(--shell-surface-elevated)",
                }}
              >
                {message.role === "assistant" ? (
                  <ChatMarkdownMessage content={message.content} />
                ) : (
                  <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {message.content}
                  </span>
                )}
              </div>
            </div>
          ))}

          {guestChat.isSending ? (
            <div className="desktop-shell-note flex items-center gap-2 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {tx("ui.ai_assistant.guest.replying", "Quinn is replying...")}
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {showAuthCtas ? (
          <div className="px-4 py-3 border-t" style={{ borderColor: "var(--shell-border-soft)" }}>
            <p className="text-xs desktop-shell-text-muted mb-2">
              {tx(
                "ui.ai_assistant.guest.auth_prompt",
                "Keep this conversation and continue by creating an account or signing in."
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openAuthWindow("signup")}
                className="flex-1 beveled-button py-2"
              >
                <span className="font-pixel text-xs">
                  {tx("ui.login.check.create_free_account", "Create Free Account")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => openAuthWindow("signin")}
                className="flex-1 beveled-button py-2"
              >
                <span className="font-pixel text-xs">
                  {tx("ui.login.button_sign_in", "Sign In")}
                </span>
              </button>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={submitGuestMessage}
          className="px-4 py-3 border-t"
          style={{ borderColor: "var(--shell-border-soft)" }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={guestChat.isSending || !guestChat.isConfigured}
              placeholder={tx(
                "ui.ai_assistant.guest.input_placeholder",
                "Example: I want a lead intake flow for my business."
              )}
              className="flex-1 h-10 px-3 rounded border text-sm desktop-shell-input"
              style={{
                borderColor: "var(--shell-border-strong)",
                background: "var(--shell-surface-elevated)",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || guestChat.isSending || !guestChat.isConfigured}
              className="beveled-button h-10 px-4"
            >
              <span className="font-pixel text-xs">
                {tx("ui.ai_assistant.guest.send", "Send")}
              </span>
            </button>
          </div>
          {guestChat.error ? (
            <p className="mt-2 text-xs" style={{ color: "var(--warning)" }}>
              {guestChat.error}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  )
}

export function AIChatWindow({
  fullScreen = false,
  initialLayoutMode,
  initialPanel,
  openContext,
  sourceSessionId,
  sourceOrganizationId,
  targetAgentId,
}: AIChatWindowProps = {}) {
  const { isSignedIn, isLoading, user, isSuperAdmin, sessionId } = useAuth()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() || ""
  const superAdminQaMode = useMemo(() => {
    if (!isSuperAdmin || typeof window === "undefined") {
      return undefined
    }
    return readSuperAdminQaModeFromSearch(search ? `?${search}` : "", sessionId || undefined)
  }, [isSuperAdmin, search, sessionId])

  const guard = useAppAvailabilityGuard({
    code: "ai-assistant",
    name: "AI Assistant",
    description:
      "AI-powered assistant for automating emails, CRM updates, form processing, event management, and workflow orchestration through natural language conversations",
  })

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-xs" style={{ color: "var(--neutral-gray)" }}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    )
  }

  if (isSignedIn && guard) return guard
  if (!isSignedIn) {
    return <AIChatSignedOutState fullScreen={fullScreen} />
  }

  const shellResolution = resolveOperatorCollaborationShellResolution({
    organizationId:
      sourceOrganizationId || (user?.currentOrganization?.id ? String(user.currentOrganization.id) : undefined),
    requestedLayoutMode: initialLayoutMode,
  })

  return (
    <AIChatProvider
      superAdminQaMode={superAdminQaMode}
      targetAgentId={targetAgentId}
    >
      <LayoutModeProvider initialMode={shellResolution.resolvedLayoutMode}>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          {superAdminQaMode?.enabled ? (
            <div
              className="mx-3 mt-3 rounded-lg border px-3 py-2 text-xs"
              style={{
                borderColor: "var(--shell-border-strong)",
                background: "var(--shell-surface-elevated)",
                color: "var(--shell-text)",
              }}
            >
              <p className="font-semibold">
                Super Admin Agent QA Mode
              </p>
              <p style={{ color: "var(--shell-text-dim)" }}>
                Target agent: {superAdminQaMode.targetAgentId || "default route"} · target template:{" "}
                {superAdminQaMode.targetTemplateRole || "default template role"}
              </p>
              <p style={{ color: "var(--shell-text-dim)" }}>
                QA run: {superAdminQaMode.runId || "unscoped"}
              </p>
              {superAdminQaMode.runId ? (
                <div className="mt-2">
                  <Link
                    href={`/?app=organizations&panel=qa-runs&qaRunId=${encodeURIComponent(superAdminQaMode.runId)}`}
                    className="inline-flex items-center rounded border px-2 py-1 text-[11px] font-semibold"
                    style={{
                      borderColor: "var(--shell-border-strong)",
                      color: "var(--shell-text)",
                    }}
                  >
                    Open QA run
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
          {isSignedIn ? (
            <AIChatEntryBootstrap
              initialPanel={initialPanel}
              openContext={openContext}
              sourceSessionId={sourceSessionId}
              sourceOrganizationId={sourceOrganizationId}
              superAdminQaEnabled={superAdminQaMode?.enabled === true}
            />
          ) : null}
          <AIChatWindowContent
            fullScreen={fullScreen}
            allowLegacyShellFallback={!shellResolution.collaborationShellEnabled}
          />
        </div>
      </LayoutModeProvider>
    </AIChatProvider>
  )
}
