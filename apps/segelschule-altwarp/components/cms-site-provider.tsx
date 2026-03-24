"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CmsProvider, useCms, useCmsEditMode, useCmsLocale } from "@cms"
import { SessionProvider, useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"
import {
  getCmsSeedStorageKey,
  seedCmsTextFromTranslations,
} from "@/lib/cms-seed"
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/translations"
import { createSegelschuleCmsTransport } from "@/lib/cms-transport"
import { CmsEditorControls } from "@/components/cms-editor-controls"

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

interface EditorSessionRefreshResult {
  session: EditorSessionPayload | null
  error: string | null
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

function CmsLanguageBridge() {
  const { language, setLanguage } = useLanguage()
  const { locale, setLocale } = useCmsLocale()
  const syncOriginRef = useRef<"language" | "locale" | null>(null)

  useEffect(() => {
    if (syncOriginRef.current === "locale") {
      syncOriginRef.current = null
      return
    }

    if (locale !== language) {
      syncOriginRef.current = "language"
      setLocale(language)
    }
  }, [language, locale, setLocale])

  useEffect(() => {
    if (syncOriginRef.current === "language") {
      syncOriginRef.current = null
      return
    }

    if (locale === language) {
      return
    }

    if (SUPPORTED_LANGUAGES.includes(locale as Language)) {
      syncOriginRef.current = "locale"
      setLanguage(locale as Language)
      return
    }

    syncOriginRef.current = "language"
    setLocale(language)
  }, [language, locale, setLanguage, setLocale])

  return null
}

function CmsContentSeedBridge({
  enabled,
  canSeed,
  sessionId,
}: {
  enabled: boolean
  canSeed: boolean
  sessionId: string | null
}) {
  const { transport } = useCms()
  const inFlightRef = useRef(false)
  const attemptedForSessionRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !canSeed || !sessionId) {
      return
    }

    if (typeof window === "undefined") {
      return
    }

    const attemptKey = `${window.location.host}:${sessionId}`
    if (attemptedForSessionRef.current === attemptKey || inFlightRef.current) {
      return
    }

    const storageKey = getCmsSeedStorageKey(window.location.host)
    if (window.sessionStorage.getItem(storageKey) === "done") {
      attemptedForSessionRef.current = attemptKey
      return
    }

    attemptedForSessionRef.current = attemptKey
    inFlightRef.current = true
    let cancelled = false

    void seedCmsTextFromTranslations(transport)
      .then((result) => {
        if (cancelled) {
          return
        }

        if (result.failed === 0) {
          window.sessionStorage.setItem(storageKey, "done")
        }

        console.info("[CMS Seed] Translation seed result", result)
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("[CMS Seed] Unexpected seed error", error)
        }
      })
      .finally(() => {
        inFlightRef.current = false
      })

    return () => {
      cancelled = true
    }
  }, [canSeed, enabled, sessionId, transport])

  return null
}

function CmsEditModeGuard({
  canEdit,
}: {
  canEdit: boolean
}) {
  const { isEditMode, setEditMode } = useCmsEditMode()

  useEffect(() => {
    if (!canEdit && isEditMode) {
      setEditMode(false)
    }
  }, [canEdit, isEditMode, setEditMode])

  return null
}

function CmsSiteProviderInner({
  children,
}: {
  children: React.ReactNode
}) {
  const { language } = useLanguage()
  const { status } = useSession()
  const pathname = usePathname()
  const currentPath = pathname || ""
  const isAdminRoute =
    currentPath === "/admin" || currentPath.startsWith("/admin/")
  const cmsEnabled = isCmsEditorEnabled()
  const [session, setSession] = useState<EditorSessionPayload | null>(null)
  const sessionRef = useRef<EditorSessionPayload | null>(null)
  sessionRef.current = session

  const transportRef = useRef(
    createSegelschuleCmsTransport(() => ({
      includeUnpublished:
        sessionRef.current?.permissions.edit_published_pages === true,
    }))
  )

  const reloadSession = useCallback(
    async (
      options: { commit?: boolean } = {}
    ): Promise<EditorSessionRefreshResult> => {
      const commit = options.commit ?? true

      try {
        const response = await fetch("/api/editor/session", {
          cache: "no-store",
        })
        const payload = await readJsonResponse<EditorSessionResponse>(response)
        if (!payload) {
          if (commit) {
            setSession(null)
          }
          return {
            session: null,
            error: response.ok
              ? null
              : `Editor session check failed (${response.status})`,
          }
        }

        const nextSession =
          response.ok && payload.authenticated ? payload.session : null
        const nextError =
          response.ok || !payload.error
            ? null
            : payload.error || `Editor session check failed (${response.status})`

        if (commit) {
          setSession(nextSession)
        }

        return {
          session: nextSession,
          error: nextError,
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to check editor session"

        if (commit) {
          setSession(null)
        }

        return {
          session: null,
          error: message,
        }
      }
    },
    []
  )

  useEffect(() => {
    if (!cmsEnabled) {
      setSession(null)
      return
    }

    if (status === "loading") {
      return
    }

    let cancelled = false

    async function loadSession() {
      const result = await reloadSession({ commit: false })
      if (cancelled) {
        return
      }
      setSession(result.session)
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [cmsEnabled, isAdminRoute, status, reloadSession])

  return (
    <CmsProvider
      transport={transportRef.current}
      defaultLocale="de"
      initialLocale={language}
      availableLocales={SUPPORTED_LANGUAGES}
      initialEditMode={false}
    >
      <CmsLanguageBridge />
      <CmsContentSeedBridge
        enabled={cmsEnabled}
        canSeed={session?.permissions.edit_published_pages === true}
        sessionId={session?.sessionId || null}
      />
      <CmsEditModeGuard
        canEdit={session?.permissions.edit_published_pages === true}
      />
      {cmsEnabled && !isAdminRoute && session ? (
        <CmsEditorControls
          authMode="platform"
          authProviderId={null}
          session={session}
          sessionError={null}
          sessionChecked
          onSessionChange={setSession}
          onRefreshSession={reloadSession}
        />
      ) : null}
      {children}
    </CmsProvider>
  )
}

export function CmsSiteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider session={null}>
      <CmsSiteProviderInner>
        {children}
      </CmsSiteProviderInner>
    </SessionProvider>
  )
}
