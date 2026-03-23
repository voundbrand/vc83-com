"use client"

import { useEffect, useRef, useState } from "react"
import { CmsProvider, useCmsEditMode, useCmsLocale } from "@cms"
import { useLanguage } from "@/lib/language-context"
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
}

function CmsLanguageBridge() {
  const { language } = useLanguage()
  const { locale, setLocale } = useCmsLocale()

  useEffect(() => {
    if (locale !== language) {
      setLocale(language)
    }
  }, [language, locale, setLocale])

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

export function CmsSiteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { language } = useLanguage()
  const cmsEnabled = process.env.NEXT_PUBLIC_CMS_EDITOR_ENABLED === "true"
  const [session, setSession] = useState<EditorSessionPayload | null>(null)
  const [sessionChecked, setSessionChecked] = useState(!cmsEnabled)
  const sessionRef = useRef<EditorSessionPayload | null>(null)
  sessionRef.current = session

  const transportRef = useRef(
    createSegelschuleCmsTransport(() => ({
      includeUnpublished:
        sessionRef.current?.permissions.edit_published_pages === true,
    }))
  )

  useEffect(() => {
    if (!cmsEnabled) {
      setSession(null)
      setSessionChecked(true)
      return
    }

    let cancelled = false

    async function loadSession() {
      try {
        const response = await fetch("/api/editor/session", {
          cache: "no-store",
        })
        const payload = (await response.json()) as EditorSessionResponse
        if (!cancelled) {
          setSession(payload.authenticated ? payload.session : null)
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[CMS Editor] Failed to load editor session:", error)
          setSession(null)
        }
      } finally {
        if (!cancelled) {
          setSessionChecked(true)
        }
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [cmsEnabled])

  return (
    <CmsProvider
      transport={transportRef.current}
      defaultLocale="de"
      initialLocale={language}
      initialEditMode={false}
    >
      <CmsLanguageBridge />
      <CmsEditModeGuard
        canEdit={session?.permissions.edit_published_pages === true}
      />
      {cmsEnabled ? (
        <CmsEditorControls
          session={session}
          sessionChecked={sessionChecked}
          onSessionChange={setSession}
        />
      ) : null}
      {children}
    </CmsProvider>
  )
}
