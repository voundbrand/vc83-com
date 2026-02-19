"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability"
import { LayoutModeProvider, useLayoutMode } from "./layout-mode-context"
import { AIChatProvider } from "@/contexts/ai-chat-context"
import { SinglePaneLayout } from "./single-pane/single-pane-layout"
import { ThreePaneLayout } from "./three-pane/three-pane-layout"
import { FourPaneLayout } from "./four-pane/four-pane-layout"
import {
  ArrowLeft,
  Bot,
  Coins,
  Loader2,
  LogIn,
  Maximize2,
  RotateCcw,
  SendHorizontal,
  ShoppingCart,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import {
  buildAccountSignupUrl,
  resolveAppBaseUrl,
  type GuestConversionAction,
  type NativeGuestChatConfig,
  useNativeGuestChat,
} from "@/hooks/use-ai-chat"
import { useAuth } from "@/hooks/use-auth"

interface AIChatWindowProps {
  /** When true, shows back-to-desktop navigation (for /chat route) */
  fullScreen?: boolean
}

function AIChatWindowContent({ fullScreen = false }: { fullScreen?: boolean }) {
  const { mode } = useLayoutMode()

  if (mode === "four-pane") {
    return <FourPaneLayout />
  }

  if (mode === "three-pane") {
    return <ThreePaneLayout />
  }

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
      <SinglePaneLayout />
      {!fullScreen && (
        <div className="absolute top-2 right-2 z-10">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors hover-menu-item"
            style={{ color: "var(--shell-text-dim)" }}
            title="Open Full Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </Link>
        </div>
      )}
    </>
  )
}

function GuestAIChatWindow({ fullScreen = false }: { fullScreen?: boolean }) {
  const [message, setMessage] = useState("")
  const [config, setConfig] = useState<NativeGuestChatConfig | null>(null)
  const [agentName, setAgentName] = useState("AI Assistant")
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Try the onboarding assistant for free. Ask anything about setup, pricing, or credits."
  )
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  const { isSignedIn } = useAuth()
  const guestChat = useNativeGuestChat(config)

  useEffect(() => {
    let cancelled = false

    const loadConfig = async () => {
      setConfigLoading(true)
      setConfigError(null)

      try {
        const response = await fetch("/api/native-guest/config", { cache: "no-store" })
        const payload = (await response.json().catch(() => ({}))) as {
          organizationId?: string
          agentId?: string
          agentName?: string
          welcomeMessage?: string
          apiBaseUrl?: string
          error?: string
        }

        if (!response.ok || !payload.organizationId || !payload.agentId) {
          throw new Error(payload.error || "Guest chat is not configured")
        }

        if (cancelled) return
        setConfig({
          organizationId: payload.organizationId,
          agentId: payload.agentId,
          apiBaseUrl: payload.apiBaseUrl,
        })
        if (payload.agentName) setAgentName(payload.agentName)
        if (payload.welcomeMessage) setWelcomeMessage(payload.welcomeMessage)
      } catch (error) {
        if (!cancelled) {
          setConfigError(error instanceof Error ? error.message : "Unable to start guest chat")
        }
      } finally {
        if (!cancelled) {
          setConfigLoading(false)
        }
      }
    }

    loadConfig()
    return () => {
      cancelled = true
    }
  }, [])

  const appBaseUrl = useMemo(() => resolveAppBaseUrl(), [])

  const openLogin = (returnUrl: string) => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem("auth_return_url", returnUrl)
    window.location.href = "/?openLogin=aiAssistant"
  }

  const handleConversionAction = (action: GuestConversionAction) => {
    if (typeof window === "undefined") return

    if (action.kind === "resume_chat") {
      if (!isSignedIn) {
        openLogin("/chat")
        return
      }
      window.location.href = action.href
      return
    }

    if (action.kind === "upgrade_plan" || action.kind === "buy_credits") {
      const fallbackHref =
        action.kind === "buy_credits"
          ? `${appBaseUrl}/?openWindow=store&panel=credits`
          : `${appBaseUrl}/?openWindow=store&panel=plans`
      const targetHref = action.href || fallbackHref
      if (!isSignedIn) {
        openLogin(targetHref.replace(appBaseUrl, "") || "/")
        return
      }
      window.location.href = targetHref
      return
    }

    if (action.kind === "create_account") {
      const targetHref =
        action.href ||
        buildAccountSignupUrl({
          provider: "google",
          claimToken: guestChat.claimToken,
          appBaseUrl,
        })
      window.location.href = targetHref
      return
    }

    window.location.href = action.href
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!message.trim()) return
    const current = message
    setMessage("")
    await guestChat.sendMessage(current)
  }

  return (
    <div className="h-full flex flex-col relative" style={{ background: "var(--shell-surface)" }}>
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
            AI Assistant (Guest)
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => openLogin(fullScreen ? "/chat" : "/")}
            className="desktop-shell-button px-2 py-1 text-xs flex items-center gap-1.5"
          >
            <LogIn className="w-3 h-3" />
            Sign in
          </button>
        </div>
      )}

      {!fullScreen && (
        <div className="absolute top-2 right-2 z-10">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors hover-menu-item"
            style={{ color: "var(--shell-text-dim)" }}
            title="Open Full Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div
        className="px-4 py-2 border-b-2 flex items-center justify-between"
        style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface-elevated)" }}
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <div className="text-xs font-pixel" style={{ color: "var(--shell-text)" }}>
            {agentName} - Guest Mode
          </div>
        </div>
        <button
          type="button"
          onClick={() => guestChat.reset()}
          className="desktop-shell-button px-2 py-1 text-[11px] flex items-center gap-1"
          title="Start a new guest session"
        >
          <RotateCcw className="w-3 h-3" />
          New Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {configLoading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Connecting guest assistant...
          </div>
        )}

        {!configLoading && (configError || !guestChat.isConfigured) && (
          <div
            className="border rounded p-3 text-xs space-y-2"
            style={{
              borderColor: "var(--error)",
              background: "var(--error-bg, rgba(239,68,68,0.15))",
              color: "var(--shell-text)",
            }}
          >
            <p>{configError || "Guest mode is currently unavailable."}</p>
            <button
              type="button"
              onClick={() => openLogin(fullScreen ? "/chat" : "/")}
              className="desktop-shell-button px-3 py-1.5 text-[11px] flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in to continue
            </button>
          </div>
        )}

        {!configLoading && !configError && guestChat.isConfigured && guestChat.messages.length === 0 && (
          <div
            className="border rounded p-3 text-xs space-y-3"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-surface-elevated)",
              color: "var(--shell-text)",
            }}
          >
            <p>{welcomeMessage}</p>
            <div className="flex flex-wrap gap-2">
              {guestChat.conversionActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => handleConversionAction(action)}
                  className="desktop-shell-button px-2.5 py-1 text-[11px]"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {guestChat.messages.map((chatMessage) => (
          <div
            key={chatMessage.id}
            className={`flex gap-2 ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {chatMessage.role !== "user" && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--shell-surface-elevated)", border: "1px solid var(--shell-border)" }}
              >
                <Bot className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              </div>
            )}

            <div
              className="max-w-[80%] rounded px-3 py-2 text-xs border"
              style={
                chatMessage.role === "user"
                  ? {
                      background: "var(--primary)",
                      color: "white",
                      borderColor: "var(--primary)",
                    }
                  : {
                      background: "var(--shell-surface-elevated)",
                      color: "var(--shell-text)",
                      borderColor: "var(--shell-border)",
                    }
              }
            >
              <p className="whitespace-pre-wrap">{chatMessage.content}</p>
              {chatMessage.actions && chatMessage.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chatMessage.actions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => handleConversionAction(action)}
                      className="desktop-shell-button px-2 py-1 text-[10px]"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {chatMessage.role === "user" && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--shell-surface-elevated)", border: "1px solid var(--shell-border)" }}
              >
                <UserRound className="w-3.5 h-3.5" style={{ color: "var(--neutral-gray)" }} />
              </div>
            )}
          </div>
        ))}

        {guestChat.isSending && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Processing your request...
          </div>
        )}
      </div>

      {guestChat.error && (
        <div
          className="px-3 py-2 text-xs border-t"
          style={{
            borderColor: "var(--error)",
            background: "var(--error-bg, rgba(239,68,68,0.15))",
            color: "var(--error)",
          }}
        >
          {guestChat.error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t-2 p-3"
        style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface-elevated)" }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask the assistant anything..."
            disabled={guestChat.isSending || !guestChat.isConfigured || !!configError}
            className="desktop-interior-input flex-1 min-w-0 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!message.trim() || guestChat.isSending || !guestChat.isConfigured || !!configError}
            className="desktop-shell-button px-4 py-2 font-pixel text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <SendHorizontal className="w-3.5 h-3.5" />
            Send
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleConversionAction({
                key: "create-account-footer",
                kind: "create_account",
                label: "Create account",
                href: buildAccountSignupUrl({
                  provider: "google",
                  claimToken: guestChat.claimToken,
                }),
              })
            }
            className="desktop-shell-button px-2.5 py-1 text-[11px] flex items-center gap-1"
          >
            <LogIn className="w-3 h-3" />
            Create account
          </button>
          <button
            type="button"
            onClick={() =>
              handleConversionAction({
                key: "upgrade-footer",
                kind: "upgrade_plan",
                label: "Upgrade",
                href: `${appBaseUrl}/?openWindow=store&panel=plans`,
              })
            }
            className="desktop-shell-button px-2.5 py-1 text-[11px] flex items-center gap-1"
          >
            <ShoppingCart className="w-3 h-3" />
            Upgrade
          </button>
          <button
            type="button"
            onClick={() =>
              handleConversionAction({
                key: "credits-footer",
                kind: "buy_credits",
                label: "Buy credits",
                href: `${appBaseUrl}/?openWindow=store&panel=credits`,
              })
            }
            className="desktop-shell-button px-2.5 py-1 text-[11px] flex items-center gap-1"
          >
            <Coins className="w-3 h-3" />
            Buy credits
          </button>
        </div>
      </form>
    </div>
  )
}

export function AIChatWindow({ fullScreen = false }: AIChatWindowProps = {}) {
  const { isSignedIn, isLoading } = useAuth()

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

  if (!isSignedIn) {
    return <GuestAIChatWindow fullScreen={fullScreen} />
  }

  if (guard) return guard

  return (
    <AIChatProvider>
      <LayoutModeProvider>
        <div className="h-full flex flex-col relative">
          <AIChatWindowContent fullScreen={fullScreen} />
        </div>
      </LayoutModeProvider>
    </AIChatProvider>
  )
}
