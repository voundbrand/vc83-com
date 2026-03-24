"use client"

import Link from "next/link"
import Image from "next/image"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react"
import { useSearchParams } from "next/navigation"
import { signIn, signOut } from "next-auth/react"
import type { SegelschuleResolvedAuthMode } from "@/lib/auth"

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

interface EditorSessionResponse {
  authenticated: boolean
  session: EditorSessionPayload | null
  error?: string
}

interface CmsAdminLoginCardProps {
  authMode: SegelschuleResolvedAuthMode
  authProviderId: string | null
}

type PlatformOAuthProvider = "apple" | "google" | "github" | "microsoft"
type AdminLanguage = "en" | "de"

const PLATFORM_OAUTH_PROVIDERS: PlatformOAuthProvider[] = [
  "apple",
  "google",
  "github",
  "microsoft",
]
const SESSION_CHECK_TIMEOUT_MS = 8000
const ADMIN_LANGUAGE_STORAGE_KEY = "segelschule_admin_language"

const LOGIN_COPY: Record<
  AdminLanguage,
  {
    title: string
    subtitle: string
    checkingSession: string
    signedInAs: string
    backToMainPage: string
    openMainPlatform: string
    signOut: string
    rbacSummaryIntro: string
    rbacNoPermissionDetail: string
    permissionEditPublishedPages: string
    permissionPublishPages: string
    permissionMediaUpload: string
    useSameMethod: string
    continueWith: string
    orUseEmail: string
    email: string
    password: string
    signingIn: string
    signInWithEmail: string
    redirecting: string
    continueWithOidc: string
    mockMode: string
    sessionCheckFailed: string
    sessionCheckTimedOut: string
    sessionCheckFailedWithStatus: (status: number) => string
    credentialsInvalid: string
    noCmsPermission: string
    signInFailed: string
    oauthTokenInvalid: string
    oauthStartFailed: string
    oidcNotConfigured: string
    mainAppUrlMissing: string
    browserRedirectUnavailable: string
  }
> = {
  en: {
    title: "CMS Admin",
    subtitle: "Sign in to edit website content with your assigned permissions.",
    checkingSession: "Checking session...",
    signedInAs: "Signed in as",
    backToMainPage: "Back to main page",
    openMainPlatform: "Go to sevenlayers platform",
    signOut: "Sign out",
    rbacSummaryIntro: "Access is controlled by your role permissions:",
    rbacNoPermissionDetail: "no editor permissions",
    permissionEditPublishedPages: "edit published pages",
    permissionPublishPages: "publish pages",
    permissionMediaUpload: "media upload",
    useSameMethod: "Use the same sign-in method as in the main platform.",
    continueWith: "Continue with",
    orUseEmail: "or use email",
    email: "Email",
    password: "Password",
    signingIn: "Signing in...",
    signInWithEmail: "Sign in with email",
    redirecting: "Redirecting...",
    continueWithOidc: "Continue with OIDC",
    mockMode: "Mock auth mode is active.",
    sessionCheckFailed: "Session check failed.",
    sessionCheckTimedOut: "Session check timed out. You can still sign in below.",
    sessionCheckFailedWithStatus: (status: number) =>
      `Session check failed (${status}). Please sign in again.`,
    credentialsInvalid: "Email or password is invalid.",
    noCmsPermission: "You do not have CMS permission for this site.",
    signInFailed: "Sign-in failed.",
    oauthTokenInvalid: "OAuth session token is invalid or expired. Please try again.",
    oauthStartFailed: "Failed to start OAuth sign-in.",
    oidcNotConfigured: "OIDC provider is not configured for this organization.",
    mainAppUrlMissing:
      "NEXT_PUBLIC_API_ENDPOINT_URL or NEXT_PUBLIC_APP_URL must point to the main app.",
    browserRedirectUnavailable: "Browser redirect is unavailable.",
  },
  de: {
    title: "CMS-Admin",
    subtitle: "Melde dich an, um Inhalte mit deinen zugewiesenen Rechten zu bearbeiten.",
    checkingSession: "Sitzung wird geprüft...",
    signedInAs: "Angemeldet als",
    backToMainPage: "Zurück zur Hauptseite",
    openMainPlatform: "Zur sevenlayers Plattform",
    signOut: "Abmelden",
    rbacSummaryIntro: "Der Zugriff wird über Rollen-Berechtigungen gesteuert:",
    rbacNoPermissionDetail: "keine Editor-Berechtigungen",
    permissionEditPublishedPages: "veröffentlichte Seiten bearbeiten",
    permissionPublishPages: "Seiten veröffentlichen",
    permissionMediaUpload: "Medien hochladen",
    useSameMethod: "Nutze dieselbe Anmeldung wie in der Hauptplattform.",
    continueWith: "Weiter mit",
    orUseEmail: "oder per E-Mail",
    email: "E-Mail",
    password: "Passwort",
    signingIn: "Anmeldung läuft...",
    signInWithEmail: "Mit E-Mail anmelden",
    redirecting: "Weiterleitung...",
    continueWithOidc: "Mit OIDC fortfahren",
    mockMode: "Mock-Authentifizierung ist aktiv.",
    sessionCheckFailed: "Sitzungsprüfung fehlgeschlagen.",
    sessionCheckTimedOut:
      "Sitzungsprüfung hat zu lange gedauert. Du kannst dich unten trotzdem anmelden.",
    sessionCheckFailedWithStatus: (status: number) =>
      `Sitzungsprüfung fehlgeschlagen (${status}). Bitte erneut anmelden.`,
    credentialsInvalid: "E-Mail oder Passwort ist ungültig.",
    noCmsPermission: "Du hast keine CMS-Berechtigung für diese Website.",
    signInFailed: "Anmeldung fehlgeschlagen.",
    oauthTokenInvalid:
      "OAuth-Sitzungstoken ist ungültig oder abgelaufen. Bitte erneut versuchen.",
    oauthStartFailed: "OAuth-Anmeldung konnte nicht gestartet werden.",
    oidcNotConfigured:
      "OIDC-Provider ist für diese Organisation nicht konfiguriert.",
    mainAppUrlMissing:
      "NEXT_PUBLIC_API_ENDPOINT_URL oder NEXT_PUBLIC_APP_URL muss auf die Haupt-App zeigen.",
    browserRedirectUnavailable: "Browser-Weiterleitung ist nicht verfügbar.",
  },
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const raw = await response.text().catch(() => "")
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function mapCredentialsSignInError(
  error: string | null | undefined,
  language: AdminLanguage
): string {
  const copy = LOGIN_COPY[language]
  if (!error || error === "CredentialsSignin") {
    return copy.credentialsInvalid
  }
  if (error === "AccessDenied") {
    return copy.noCmsPermission
  }
  return copy.signInFailed
}

function mapSessionTokenSignInError(
  error: string | null | undefined,
  language: AdminLanguage
): string {
  const copy = LOGIN_COPY[language]
  if (!error || error === "CredentialsSignin") {
    return copy.oauthTokenInvalid
  }
  if (error === "AccessDenied") {
    return copy.noCmsPermission
  }
  return copy.signInFailed
}

function getMainAppBaseUrl(): string | null {
  const endpointUrl = process.env.NEXT_PUBLIC_API_ENDPOINT_URL?.trim()
  if (endpointUrl) {
    return endpointUrl
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl) {
    return appUrl
  }

  return null
}

function tryParseUrl(value: string | null | undefined): URL | null {
  if (!value) {
    return null
  }

  try {
    return new URL(value)
  } catch {
    return null
  }
}

function resolveAdminCallbackUrl(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  const browserAdminUrl = new URL("/admin", window.location.origin)
  const configuredAppUrl = tryParseUrl(process.env.NEXT_PUBLIC_APP_URL?.trim())
  if (!configuredAppUrl) {
    return browserAdminUrl.toString()
  }

  const mainAppBaseUrl = tryParseUrl(getMainAppBaseUrl())
  if (mainAppBaseUrl && window.location.origin === mainAppBaseUrl.origin) {
    return new URL("/admin", configuredAppUrl).toString()
  }

  return browserAdminUrl.toString()
}

function getMainPlatformHomeUrl(): string | null {
  const mainAppBaseUrl = tryParseUrl(getMainAppBaseUrl())
  if (!mainAppBaseUrl) {
    return null
  }
  return new URL("/", mainAppBaseUrl).toString()
}

function formatProviderName(provider: PlatformOAuthProvider): string {
  if (provider === "apple") {
    return "Apple"
  }
  if (provider === "google") {
    return "Google"
  }
  if (provider === "github") {
    return "GitHub"
  }
  return "Microsoft"
}

function getProviderButtonStyle(): CSSProperties {
  const base: CSSProperties = {
    borderRadius: 10,
    border: "1px solid rgba(30, 57, 38, 0.25)",
    cursor: "pointer",
    padding: "8px 10px",
    fontWeight: 600,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#ffffff",
    color: "#1e3926",
  }
  return base
}

function getProviderIcon(provider: PlatformOAuthProvider) {
  if (provider === "apple") {
    return (
      <svg
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M16.37 1.43c0 1.13-.42 2.26-1.23 3.08-.84.86-2.17 1.51-3.35 1.47-.15-1.12.43-2.29 1.22-3.11.88-.9 2.3-1.54 3.36-1.44zM20.8 17.3c-.56 1.27-.82 1.84-1.55 2.95-1 1.55-2.42 3.5-4.17 3.51-1.56.02-1.96-1.01-4.08-1.01-2.13.01-2.56 1.04-4.13 1.01-1.74-.02-3.1-1.78-4.1-3.33-2.8-4.29-3.1-9.32-1.36-11.97C2.64 6.56 4.57 5.45 6.4 5.45c1.84 0 3.01 1.02 4.52 1.02 1.48 0 2.37-1.02 4.52-1.02 1.61 0 3.34.88 4.56 2.41-4.01 2.2-3.37 7.93.8 9.44z" />
      </svg>
    )
  }

  if (provider === "github") {
    return (
      <svg
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    )
  }

  if (provider === "microsoft") {
    return (
      <svg
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
      </svg>
    )
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function CmsAdminLoginCard({
  authMode,
  authProviderId,
}: CmsAdminLoginCardProps) {
  const searchParams = useSearchParams()
  const consumedOAuthSessionRef = useRef<string | null>(null)
  const languageRef = useRef<AdminLanguage>("en")
  const [language, setLanguage] = useState<AdminLanguage>("en")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [session, setSession] = useState<EditorSessionPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = LOGIN_COPY[language]

  useEffect(() => {
    languageRef.current = language
  }, [language])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const storedLanguage = window.localStorage.getItem(ADMIN_LANGUAGE_STORAGE_KEY)
    if (storedLanguage === "en" || storedLanguage === "de") {
      setLanguage(storedLanguage)
      return
    }

    const browserLanguage = window.navigator.language?.toLowerCase() || ""
    setLanguage(browserLanguage.startsWith("de") ? "de" : "en")
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, language)
  }, [language])

  const refreshEditorSession = useCallback(async () => {
    const activeCopy = LOGIN_COPY[languageRef.current]
    setIsLoading(true)
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      controller.abort()
    }, SESSION_CHECK_TIMEOUT_MS)

    try {
      const response = await fetch("/api/editor/session", {
        cache: "no-store",
        signal: controller.signal,
      })
      const payload = await readJsonResponse<EditorSessionResponse>(response)

      if (!payload) {
        setSession(null)
        setError(
          response.ok
            ? null
            : activeCopy.sessionCheckFailedWithStatus(response.status)
        )
        return
      }

      setSession(response.ok && payload.authenticated ? payload.session : null)
      setError(!response.ok && payload.error ? payload.error : null)
    } catch (sessionError) {
      setSession(null)
      setError(
        sessionError instanceof DOMException && sessionError.name === "AbortError"
          ? activeCopy.sessionCheckTimedOut
          : sessionError instanceof Error
          ? sessionError.message
          : activeCopy.sessionCheckFailed
      )
    } finally {
      window.clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshEditorSession()
  }, [refreshEditorSession])

  useEffect(() => {
    if (authMode !== "platform" || session) {
      return
    }

    const sessionToken =
      searchParams?.get("session")?.trim() ||
      searchParams?.get("session_token")?.trim() ||
      null

    if (!sessionToken) {
      return
    }

    if (consumedOAuthSessionRef.current === sessionToken) {
      return
    }
    consumedOAuthSessionRef.current = sessionToken

    let cancelled = false

    async function consumePlatformSessionToken() {
      setIsSubmitting(true)
      setError(null)

      try {
        const result = await signIn("platform_session", {
          redirect: false,
          sessionToken,
          callbackUrl: "/admin",
        })

        if (!result || result.ok === false || result.error) {
          setError(mapSessionTokenSignInError(result?.error, language))
          return
        }

        if (typeof window !== "undefined") {
          const cleanUrl = new URL(window.location.href)
          cleanUrl.searchParams.delete("session")
          cleanUrl.searchParams.delete("session_token")
          cleanUrl.searchParams.delete("isNewUser")
          cleanUrl.searchParams.delete("oauthProvider")
          window.history.replaceState(
            {},
            "",
            `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`
          )
        }

        await refreshEditorSession()
      } finally {
        if (!cancelled) {
          setIsSubmitting(false)
        }
      }
    }

    void consumePlatformSessionToken()

    return () => {
      cancelled = true
    }
  }, [authMode, language, refreshEditorSession, searchParams, session])

  async function handlePlatformSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await signIn("platform", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: "/admin",
      })

      if (!result || result.ok === false || result.error) {
        setError(mapCredentialsSignInError(result?.error, language))
        return
      }

      setPassword("")
      await refreshEditorSession()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOidcSignIn() {
    setIsSubmitting(true)
    setError(null)

    if (!authProviderId) {
      setError(copy.oidcNotConfigured)
      setIsSubmitting(false)
      return
    }

    await signIn(authProviderId, {
      callbackUrl: "/admin",
    })
  }

  function handlePlatformOAuthSignIn(provider: PlatformOAuthProvider) {
    setError(null)
    setIsSubmitting(true)

    try {
      const mainAppBaseUrl = getMainAppBaseUrl()
      if (!mainAppBaseUrl) {
        setError(copy.mainAppUrlMissing)
        setIsSubmitting(false)
        return
      }

      if (typeof window === "undefined") {
        setError(copy.browserRedirectUnavailable)
        setIsSubmitting(false)
        return
      }

      const callback = resolveAdminCallbackUrl()
      if (!callback) {
        setError(copy.browserRedirectUnavailable)
        setIsSubmitting(false)
        return
      }
      const loginInitUrl = new URL("/api/auth/login/init", mainAppBaseUrl)
      loginInitUrl.searchParams.set("client", "platform_web")
      loginInitUrl.searchParams.set("provider", provider)
      loginInitUrl.searchParams.set("callback", callback)
      window.location.assign(loginInitUrl.toString())
    } catch (oauthError) {
      setError(
        oauthError instanceof Error
          ? oauthError.message
          : copy.oauthStartFailed
      )
      setIsSubmitting(false)
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true)
    setError(null)
    try {
      await fetch("/api/editor/sign-out", { method: "POST" })
      await signOut({ redirect: false })
      setSession(null)
      await refreshEditorSession()
    } finally {
      setIsSubmitting(false)
    }
  }

  const editorName = session?.user
    ? `${session.user.firstName} ${session.user.lastName}`.trim()
    : session?.email || "Editor"
  const mainPlatformHomeUrl = getMainPlatformHomeUrl()
  const permissionDetails = session
    ? [
        session.permissions.edit_published_pages
          ? copy.permissionEditPublishedPages
          : null,
        session.permissions.publish_pages ? copy.permissionPublishPages : null,
        session.permissions["media_library.upload"]
          ? copy.permissionMediaUpload
          : null,
      ].filter((value): value is string => Boolean(value))
    : []
  const rbacSummary = session
    ? `${copy.rbacSummaryIntro} ${
        permissionDetails.length > 0
          ? permissionDetails.join(", ")
          : copy.rbacNoPermissionDetail
      }.`
    : null

  return (
    <section
      style={{
        width: "min(380px, 100%)",
        position: "relative",
        borderRadius: 16,
        border: "1px solid rgba(30, 57, 38, 0.2)",
        background: "rgba(255, 255, 255, 0.92)",
        padding: 18,
        display: "grid",
        gap: 12,
        textAlign: "center",
        boxShadow: "0 24px 60px rgba(30, 57, 38, 0.12)",
      }}
    >
      <label
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "inline-flex",
        }}
      >
        <select
          aria-label="Language"
          value={language}
          onChange={(event) =>
            setLanguage(event.target.value === "de" ? "de" : "en")
          }
          style={{
            borderRadius: 8,
            border: "1px solid rgba(30, 57, 38, 0.2)",
            padding: "3px 7px",
            backgroundColor: "#ffffff",
            color: "#1e3926",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <option value="en">EN</option>
          <option value="de">DE</option>
        </select>
      </label>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingRight: 0,
          minHeight: 64,
        }}
      >
        <Image
          src="/sevenlayers-splash-icon.png"
          alt="sevenlayers"
          width={60}
          height={60}
          style={{ display: "block", width: 60, height: 60, objectFit: "contain" }}
          priority
        />
        <div
          style={{
            fontFamily: "var(--font-jost), sans-serif",
            color: "#1e3926",
            textTransform: "uppercase",
            display: "grid",
            justifyItems: "center",
          }}
        >
          <div
            style={{
              lineHeight: 1.05,
              display: "grid",
              gap: 1,
              justifyItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "0.45em",
                paddingLeft: "0.1em",
              }}
            >
              SEVEN
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 300,
                letterSpacing: "0.653em",
                paddingLeft: "0.1em",
                marginTop: 1,
              }}
            >
              LAYERS
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.12em",
                lineHeight: 1.15,
                textTransform: "none",
                marginTop: 2,
                textAlign: "center",
                justifySelf: "center",
              }}
            >
              CMS
            </div>
          </div>
        </div>
      </div>
      <p style={{ margin: 0, padding: "2px 0", color: "#475569", textAlign: "left" }}>
        {copy.subtitle}
      </p>

      {isLoading ? (
        <p style={{ margin: 0, padding: "2px 0", color: "#64748b" }}>
          {copy.checkingSession}
        </p>
      ) : null}

      {session ? (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0, padding: "2px 0", color: "#14532d", fontWeight: 700 }}>
            {copy.signedInAs} {editorName}
          </p>
          <p
            style={{
              margin: 0,
              padding: "2px 0",
              color: "#475569",
              fontSize: 13,
              textAlign: "left",
            }}
          >
            {rbacSummary}
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link
              href="/"
              style={{
                textDecoration: "underline",
                color: "#1e3926",
                fontWeight: 700,
              }}
            >
              {copy.backToMainPage}
            </Link>
            <button
              type="button"
              onClick={() => {
                void handleSignOut()
              }}
              disabled={isSubmitting}
              style={{
                border: "none",
                background: "transparent",
                color: "#aa2023",
                cursor: "pointer",
                padding: 0,
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              {copy.signOut}
            </button>
          </div>
        </div>
      ) : authMode === "platform" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <p
            style={{
              margin: 0,
              padding: "2px 0",
              color: "#475569",
              fontSize: 13,
              textAlign: "left",
            }}
          >
            {copy.useSameMethod}
          </p>

          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "1fr",
            }}
          >
            {PLATFORM_OAUTH_PROVIDERS.map((provider) => (
              <button
                key={provider}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  handlePlatformOAuthSignIn(provider)
                }}
                style={getProviderButtonStyle()}
              >
                {getProviderIcon(provider)}
                <span>
                  {copy.continueWith} {formatProviderName(provider)}
                </span>
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#94a3b8",
              fontSize: 12,
            }}
          >
            <span
              style={{
                flex: 1,
                height: 1,
                backgroundColor: "rgba(148, 163, 184, 0.4)",
              }}
            />
            <span>{copy.orUseEmail}</span>
            <span
              style={{
                flex: 1,
                height: 1,
                backgroundColor: "rgba(148, 163, 184, 0.4)",
              }}
            />
          </div>

          <form onSubmit={handlePlatformSignIn} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, textAlign: "left" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1e3926" }}>
                {copy.email}
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
                  textAlign: "center",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, textAlign: "left" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1e3926" }}>
                {copy.password}
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
                  textAlign: "center",
                }}
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                borderRadius: 10,
                border: "none",
                backgroundColor: "#1e3926",
                color: "#fffbea",
                cursor: "pointer",
                padding: "10px 12px",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {isSubmitting ? copy.signingIn : copy.signInWithEmail}
            </button>
          </form>
        </div>
      ) : authMode === "oidc" ? (
        <button
          type="button"
          onClick={() => {
            void handleOidcSignIn()
          }}
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
          {isSubmitting ? copy.redirecting : copy.continueWithOidc}
        </button>
      ) : (
        <p style={{ margin: 0, padding: "2px 0", color: "#92400e" }}>
          {copy.mockMode}
        </p>
      )}

      {error ? (
        <p style={{ margin: 0, padding: "2px 0", color: "#aa2023", fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      {mainPlatformHomeUrl ? (
        <div
          style={{
            marginTop: 10,
            paddingTop: 14,
            paddingBottom: 8,
            borderTop: "1px solid rgba(148, 163, 184, 0.28)",
          }}
        >
          <a
            href={mainPlatformHomeUrl}
            style={{
              display: "block",
              fontSize: 11,
              color: "#64748b",
              textDecoration: "underline",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            {copy.openMainPlatform}
          </a>
        </div>
      ) : null}
    </section>
  )
}
