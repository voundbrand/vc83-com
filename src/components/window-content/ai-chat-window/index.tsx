"use client"

import { useEffect, useRef } from "react"
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability"
import { LayoutModeProvider, useLayoutMode, type LayoutMode } from "./layout-mode-context"
import { AIChatProvider, useAIChatContext } from "@/contexts/ai-chat-context"
import { SinglePaneLayout } from "./single-pane/single-pane-layout"
import { SlickPaneLayout } from "./slick-pane/slick-pane-layout"
import { FourPaneLayout } from "./four-pane/four-pane-layout"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { resolveOperatorCollaborationShellResolution } from "@/lib/operator-collaboration-cutover"
import { buildPlatformAgentCreationKickoff } from "./onboarding-kickoff-contract"

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
}

function AIChatWindowContent({
  fullScreen = false,
  allowLegacyShellFallback = false,
}: {
  fullScreen?: boolean
  allowLegacyShellFallback?: boolean
}) {
  const { mode } = useLayoutMode()

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

function AIChatEntryBootstrap({
  initialPanel,
  openContext,
  sourceSessionId,
  sourceOrganizationId,
}: {
  initialPanel?: string
  openContext?: string
  sourceSessionId?: string
  sourceOrganizationId?: string
}) {
  const { chat, currentConversationId, setCurrentConversationId, isSending, setIsSending } = useAIChatContext()
  const seededEntryKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const normalizedPanel = typeof initialPanel === "string" ? initialPanel.trim().toLowerCase() : ""
    const isAgentCreationPanel = normalizedPanel === "agent-creation"
    const isSupportIntakePanel = normalizedPanel === "support-intake"
    if (!isAgentCreationPanel && !isSupportIntakePanel) {
      return
    }

    if (chat.messages.length > 0 || isSending) {
      return
    }

    const entryKey = [
      normalizedPanel,
      openContext || (isAgentCreationPanel ? "agent_creation" : "support_intake"),
      sourceSessionId || "none",
      sourceOrganizationId || "none",
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
      : buildSupportIntakeKickoff({
          openContext,
          sourceSessionId,
          sourceOrganizationId,
        })

    setIsSending(true)
    void chat
      .sendMessage(kickoffMessage, currentConversationId)
      .then((result) => {
        if (!currentConversationId && result.conversationId) {
          setCurrentConversationId(result.conversationId)
        }
      })
      .catch((error) => {
        console.error("[AIChatWindow] Failed to seed creation kickoff:", error)
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
    openContext,
    setCurrentConversationId,
    setIsSending,
    sourceOrganizationId,
    sourceSessionId,
  ])

  return null
}

function AIChatSignedOutState({ fullScreen }: { fullScreen?: boolean }) {
  const handleSignIn = () => {
    if (typeof window !== "undefined") {
      const returnPath = window.location.pathname === "/chat" ? "/chat" : "/"
      window.sessionStorage.setItem("auth_return_url", returnPath)
      window.location.href = "/?openLogin=aiAssistant"
    }
  }

  return (
    <div className="h-full flex flex-col">
      {fullScreen ? (
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
      ) : null}

      <div className="flex flex-1 items-center justify-center px-4">
        <div
          className="w-full max-w-md rounded-2xl border p-6"
          style={{
            borderColor: "var(--shell-border-strong)",
            background: "var(--shell-surface-elevated)",
          }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--shell-text)" }}>
            Sign in to open SevenLayers chat
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--shell-text-dim)" }}>
            Chat requires an authenticated workspace. Sign in to continue.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold"
            style={{
              borderColor: "var(--shell-border-soft)",
              background: "var(--shell-button-primary-gradient)",
              color: "var(--shell-on-accent)",
            }}
          >
            Sign in
          </button>
        </div>
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
}: AIChatWindowProps = {}) {
  const { isSignedIn, isLoading, user } = useAuth()

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
    <AIChatProvider>
      <LayoutModeProvider initialMode={shellResolution.resolvedLayoutMode}>
        <div className="h-full flex flex-col relative">
          {isSignedIn ? (
            <AIChatEntryBootstrap
              initialPanel={initialPanel}
              openContext={openContext}
              sourceSessionId={sourceSessionId}
              sourceOrganizationId={sourceOrganizationId}
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
