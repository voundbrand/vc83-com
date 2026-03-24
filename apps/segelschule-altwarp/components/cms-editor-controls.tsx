"use client"

import { useState } from "react"
import { signIn, signOut } from "next-auth/react"
import { CmsLocaleSelect, useCmsEditMode } from "@cms"
import type { SegelschuleResolvedAuthMode } from "@/lib/auth"
import { languageNames } from "@/lib/translations"

interface EditorSessionPayload {
  sessionId: string
  email: string
  permissions: {
    edit_published_pages: boolean
    publish_pages: boolean
    "media_library.upload": boolean
  }
  user: {
    firstName: string
    lastName: string
  } | null
}

interface EditorSessionRefreshResult {
  session: EditorSessionPayload | null
  error: string | null
}

interface CmsEditorControlsProps {
  authMode: SegelschuleResolvedAuthMode
  authProviderId: string | null
  session: EditorSessionPayload | null
  sessionError: string | null
  sessionChecked: boolean
  onSessionChange: (session: EditorSessionPayload | null) => void
  onRefreshSession: () => Promise<EditorSessionRefreshResult>
}

const CMS_LOCALE_LABELS: Record<string, string> = languageNames.en

function mapCredentialsSignInError(error: string | null | undefined): string {
  if (!error || error === "CredentialsSignin") {
    return "E-Mail oder Passwort ist ungültig."
  }
  if (error === "AccessDenied") {
    return "Sie haben keine Berechtigung für die CMS-Administration."
  }
  return "Die Anmeldung ist fehlgeschlagen."
}

function mapOidcSignInError(error: string | null | undefined): string {
  if (!error) {
    return "Die OIDC-Anmeldung konnte nicht gestartet werden."
  }
  if (error === "AccessDenied") {
    return "Der Zugriff wurde vom Identity Provider oder von der Plattform verweigert."
  }
  return "Die OIDC-Anmeldung ist fehlgeschlagen."
}

function getCallbackUrl(): string {
  if (typeof window === "undefined") {
    return "/"
  }

  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`
  return path || "/"
}

function PenPaperIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="3"
        width="13"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7 8h7M7 11h7M7 14h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14.8 16.8l3.9-3.9a1.2 1.2 0 011.7 0l.5.5a1.2 1.2 0 010 1.7L17 19l-2.7.6.5-2.8z"
        fill="currentColor"
      />
    </svg>
  )
}

export function CmsEditorControls({
  authMode,
  authProviderId,
  session,
  sessionError,
  sessionChecked,
  onSessionChange,
  onRefreshSession,
}: CmsEditorControlsProps) {
  const { isEditMode, setEditMode } = useCmsEditMode()
  const [isOpen, setIsOpen] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handlePlatformSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await signIn("platform", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: getCallbackUrl(),
      })

      if (!result || result.ok === false || result.error) {
        setError(mapCredentialsSignInError(result?.error))
        return
      }

      const refreshed = await onRefreshSession()
      if (refreshed.error) {
        setError(refreshed.error)
        return
      }

      setPassword("")
      setIsOpen(true)
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Editor sign-in failed"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOidcSignIn() {
    setIsSubmitting(true)
    setError(null)

    try {
      if (!authProviderId) {
        setError("OIDC provider is not configured for this organization.")
        return
      }

      const result = await signIn(authProviderId, {
        callbackUrl: getCallbackUrl(),
      })
      if (result?.error) {
        setError(mapOidcSignInError(result.error))
      }
    } catch (signInError) {
      if (signInError instanceof Error) {
        setError(signInError.message)
      } else {
        setError(mapOidcSignInError(null))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true)
    setError(null)

    try {
      await fetch("/api/editor/sign-out", {
        method: "POST",
      })
      await signOut({ redirect: false })
      onSessionChange(null)
      setEditMode(false)
      await onRefreshSession()
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Editor sign-out failed"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const editorName = session?.user
    ? `${session.user.firstName} ${session.user.lastName}`.trim()
    : session?.email || "Editor"
  const activeError = error || sessionError
  const canToggleEditMode = session?.permissions.edit_published_pages === true

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open editor tools"
        title="Open editor tools"
        style={{
          position: "fixed",
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 70,
          width: 56,
          height: 56,
          borderRadius: 999,
          border: "1px solid rgba(30, 57, 38, 0.22)",
          backgroundColor: "rgba(255, 251, 234, 0.98)",
          color: "#1e3926",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 16px 36px rgba(30, 57, 38, 0.2)",
          backdropFilter: "blur(12px)",
          padding: 0,
        }}
      >
        <PenPaperIcon />
      </button>
    )
  }

  return (
    <aside
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 70,
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        borderRadius: 18,
        border: "1px solid rgba(30, 57, 38, 0.18)",
        backgroundColor: "rgba(255, 251, 234, 0.98)",
        boxShadow: "0 24px 60px rgba(30, 57, 38, 0.16)",
        backdropFilter: "blur(14px)",
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Shared CMS
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3926" }}>
            {session ? editorName : "Editor access"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(30, 57, 38, 0.18)",
            backgroundColor: "white",
            color: "#1e3926",
            cursor: "pointer",
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Minimize
        </button>
      </div>

      {!sessionChecked ? (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          Checking editor session...
        </span>
      ) : null}

      {isOpen ? (
        session ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {canToggleEditMode ? (
                <span
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    fontSize: 12,
                    padding: "4px 10px",
                  }}
                >
                  edit
                </span>
              ) : (
                <span
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    fontSize: 12,
                    padding: "4px 10px",
                  }}
                >
                  no edit permission
                </span>
              )}
              {session.permissions.publish_pages ? (
                <span
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#dbeafe",
                    color: "#1d4ed8",
                    fontSize: 12,
                    padding: "4px 10px",
                  }}
                >
                  publish
                </span>
              ) : null}
              {session.permissions["media_library.upload"] ? (
                <span
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    fontSize: 12,
                    padding: "4px 10px",
                  }}
                >
                  media
                </span>
              ) : null}
            </div>

            <CmsLocaleSelect
              label="Content language"
              localeLabels={CMS_LOCALE_LABELS}
              disabled={isSubmitting}
              wrapperStyle={{ gap: 4 }}
            />

            <button
              type="button"
              onClick={() => {
                if (!canToggleEditMode) {
                  return
                }
                setEditMode(!isEditMode)
              }}
              disabled={!canToggleEditMode}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(30, 57, 38, 0.18)",
                backgroundColor:
                  canToggleEditMode && isEditMode ? "#1e3926" : "white",
                color:
                  canToggleEditMode && isEditMode ? "#fffbea" : "#1e3926",
                cursor: canToggleEditMode ? "pointer" : "not-allowed",
                opacity: canToggleEditMode ? 1 : 0.65,
                padding: "12px 14px",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {!canToggleEditMode
                  ? "Edit mode unavailable"
                  : isEditMode
                    ? "Edit mode is on"
                    : "Edit mode is off"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {canToggleEditMode
                  ? "Toggle inline editing for the enabled CMS section."
                  : "Your role does not include edit_published_pages for this site."}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                void handleSignOut()
              }}
              disabled={isSubmitting}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(170, 32, 35, 0.22)",
                backgroundColor: "rgba(170, 32, 35, 0.08)",
                color: "#aa2023",
                cursor: "pointer",
                padding: "10px 12px",
                fontWeight: 600,
              }}
            >
              Sign out
            </button>
          </div>
        ) : authMode === "platform" ? (
          <form onSubmit={handlePlatformSignIn} style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Sign in with your platform account.
            </span>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1e3926" }}>
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(30, 57, 38, 0.18)",
                  padding: "10px 12px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1e3926" }}>
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(30, 57, 38, 0.18)",
                  padding: "10px 12px",
                }}
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                borderRadius: 12,
                border: "none",
                backgroundColor: "#1e3926",
                color: "#fffbea",
                cursor: "pointer",
                padding: "12px 14px",
                fontWeight: 700,
              }}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : authMode === "oidc" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              This organization uses OIDC login for editor access.
            </span>
            <button
              type="button"
              disabled={isSubmitting || !authProviderId}
              onClick={() => {
                void handleOidcSignIn()
              }}
              style={{
                borderRadius: 12,
                border: "none",
                backgroundColor: "#1e3926",
                color: "#fffbea",
                cursor: "pointer",
                padding: "12px 14px",
                fontWeight: 700,
              }}
            >
              {isSubmitting ? "Redirecting..." : "Continue with OIDC"}
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: "#64748b" }}>
            Mock auth mode is active. CMS editing is unavailable in this mode.
          </span>
        )
      ) : (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {session
            ? "Editor session ready."
            : "Open the panel to sign in and enable inline editing."}
        </span>
      )}

      {activeError ? (
        <span style={{ fontSize: 12, color: "#aa2023" }}>{activeError}</span>
      ) : null}
    </aside>
  )
}
