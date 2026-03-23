"use client"

import { useState } from "react"
import { useCmsEditMode } from "@cms"

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

interface CmsEditorControlsProps {
  session: EditorSessionPayload | null
  sessionChecked: boolean
  onSessionChange: (session: EditorSessionPayload | null) => void
}

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function CmsEditorControls({
  session,
  sessionChecked,
  onSessionChange,
}: CmsEditorControlsProps) {
  const { isEditMode, setEditMode } = useCmsEditMode()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/editor/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const payload = await readPayload(response)
      if (!response.ok) {
        setError(
          typeof payload.error === "string"
            ? payload.error
            : "Editor sign-in failed"
        )
        return
      }

      onSessionChange(
        payload.session && typeof payload.session === "object"
          ? (payload.session as EditorSessionPayload)
          : null
      )
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

  async function handleSignOut() {
    setIsSubmitting(true)
    setError(null)

    try {
      await fetch("/api/editor/sign-out", {
        method: "POST",
      })
      onSessionChange(null)
      setEditMode(false)
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
          onClick={() => setIsOpen((current) => !current)}
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
          {isOpen ? "Hide" : "Show"}
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

            <button
              type="button"
              onClick={() => setEditMode(!isEditMode)}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(30, 57, 38, 0.18)",
                backgroundColor: isEditMode ? "#1e3926" : "white",
                color: isEditMode ? "#fffbea" : "#1e3926",
                cursor: "pointer",
                padding: "12px 14px",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {isEditMode ? "Edit mode is on" : "Edit mode is off"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Toggle inline editing for the enabled CMS section.
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
        ) : (
          <form onSubmit={handleSignIn} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1e3926" }}>
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
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
        )
      ) : (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {session
            ? "Editor session ready."
            : "Open the panel to sign in and enable inline editing."}
        </span>
      )}

      {error ? (
        <span style={{ fontSize: 12, color: "#aa2023" }}>{error}</span>
      ) : null}
    </aside>
  )
}
