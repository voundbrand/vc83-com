"use client"

import { useAction, useQuery } from "convex/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getLocaleLabel, useTranslation } from "@/contexts/translation-context"
import {
  buildVoiceLanguageCatalogFromVoices,
  formatVoiceLanguageLabel,
  normalizeVoiceLanguageCode,
} from "@/lib/voice/catalog-language"

// Dynamic require avoids deep generated API type instantiation in hooks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../convex/_generated/api") as { api: any }

const VOICE_INPUT_LANGUAGE_STORAGE_KEY = "ai_chat_voice_input_language"
const APP_LANGUAGE_SELECTION_VALUE = "__app_language__"

type VoiceInputLanguageOption = {
  value: string
  label: string
}

type ElevenLabsVoiceCatalogEntry = {
  voiceId: string
  name: string
  category?: string
  language?: string
  languages?: string[]
  labels?: Record<string, string>
}

const FALLBACK_VOICE_INPUT_LANGUAGE_OPTIONS: ReadonlyArray<VoiceInputLanguageOption> = [
  { value: "en", label: "English (EN)" },
  { value: "de", label: "German (DE)" },
  { value: "pl", label: "Polish (PL)" },
  { value: "es", label: "Spanish (ES)" },
  { value: "fr", label: "French (FR)" },
  { value: "ja", label: "Japanese (JA)" },
]

function normalizeLocale(locale: string | null | undefined): string {
  return String(locale || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
}

function isValidLanguageCode(value: string | null | undefined): value is string {
  return /^[a-z]{2,3}$/.test(String(value || "").trim().toLowerCase())
}

function resolveVoiceInputLanguage(locale: string | null | undefined): string {
  const normalizedLocale = normalizeLocale(locale)
  if (!normalizedLocale) {
    return "en"
  }
  const normalizedCode = normalizeVoiceLanguageCode(normalizedLocale)
  if (normalizedCode) {
    return normalizedCode
  }

  const baseLanguage = normalizedLocale.split("-")[0]
  if (isValidLanguageCode(baseLanguage)) {
    return baseLanguage
  }

  return "en"
}

function resolveLanguageLabel(locale: string): string {
  const normalizedBase = resolveVoiceInputLanguage(locale)
  return getLocaleLabel(normalizedBase)
}

export function useAIChatVoiceInputLanguage() {
  const { sessionId, user } = useAuth()
  const organizationId = user?.currentOrganization?.id
  const userPreferences = useQuery(
    apiAny.userPreferences.get,
    sessionId ? { sessionId } : "skip",
  ) as { language?: unknown } | null | undefined
  const listElevenLabsVoices = useAction(apiAny.integrations.elevenlabs.listElevenLabsVoices)
  const { locale: appLocale } = useTranslation()
  const appVoiceInputLanguage = useMemo(() => resolveVoiceInputLanguage(appLocale), [appLocale])
  const [manualVoiceInputLanguage, setManualVoiceInputLanguage] = useState<string | null>(null)
  const [forceAppLanguage, setForceAppLanguage] = useState(false)
  const [catalogLanguageOptions, setCatalogLanguageOptions] = useState<VoiceInputLanguageOption[]>([])

  useEffect(() => {
    if (!sessionId || !organizationId) {
      setCatalogLanguageOptions([])
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const result = (await listElevenLabsVoices({
          sessionId,
          organizationId,
          pageSize: 100,
        })) as {
          success: boolean
          voices?: ElevenLabsVoiceCatalogEntry[]
        }
        if (cancelled || !result.success) {
          return
        }
        const catalog = buildVoiceLanguageCatalogFromVoices(
          Array.isArray(result.voices) ? result.voices : [],
        )
        const nextOptions = catalog.map((entry) => ({
          value: entry.code,
          label: `${entry.label} (${entry.code.toUpperCase()})`,
        }))
        setCatalogLanguageOptions(nextOptions)
      } catch {
        if (!cancelled) {
          setCatalogLanguageOptions([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [listElevenLabsVoices, organizationId, sessionId])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const storedLanguage = window.localStorage.getItem(VOICE_INPUT_LANGUAGE_STORAGE_KEY)
    if (storedLanguage === APP_LANGUAGE_SELECTION_VALUE) {
      setForceAppLanguage(true)
      setManualVoiceInputLanguage(null)
      return
    }
    const normalizedStoredLanguage = resolveVoiceInputLanguage(storedLanguage)
    if (isValidLanguageCode(normalizedStoredLanguage)) {
      setForceAppLanguage(false)
      setManualVoiceInputLanguage(normalizedStoredLanguage)
      return
    }

    window.localStorage.removeItem(VOICE_INPUT_LANGUAGE_STORAGE_KEY)
    setForceAppLanguage(false)
    setManualVoiceInputLanguage(null)
  }, [])

  const setSelectedLanguageValue = useCallback((value: string) => {
    if (typeof window === "undefined") {
      return
    }

    if (value === APP_LANGUAGE_SELECTION_VALUE) {
      window.localStorage.setItem(
        VOICE_INPUT_LANGUAGE_STORAGE_KEY,
        APP_LANGUAGE_SELECTION_VALUE,
      )
      setForceAppLanguage(true)
      setManualVoiceInputLanguage(null)
      return
    }

    const normalized = resolveVoiceInputLanguage(value)
    if (!isValidLanguageCode(normalized)) {
      return
    }

    window.localStorage.setItem(VOICE_INPUT_LANGUAGE_STORAGE_KEY, normalized)
    setForceAppLanguage(false)
    setManualVoiceInputLanguage(normalized)
  }, [])

  const persistedVoiceInputLanguage = useMemo(() => {
    if (!userPreferences || typeof userPreferences.language !== "string") {
      return null
    }
    const normalized = resolveVoiceInputLanguage(userPreferences.language)
    return isValidLanguageCode(normalized) ? normalized : null
  }, [userPreferences])

  const voiceInputLanguage = forceAppLanguage
    ? appVoiceInputLanguage
    : manualVoiceInputLanguage || persistedVoiceInputLanguage || appVoiceInputLanguage
  const selectedLanguageValue = forceAppLanguage
    ? APP_LANGUAGE_SELECTION_VALUE
    : manualVoiceInputLanguage || persistedVoiceInputLanguage || APP_LANGUAGE_SELECTION_VALUE
  const appLanguageLabel = resolveLanguageLabel(appLocale)

  const languageOptions = useMemo<VoiceInputLanguageOption[]>(() => {
    const optionMap = new Map<string, VoiceInputLanguageOption>()

    for (const option of catalogLanguageOptions) {
      optionMap.set(option.value, option)
    }

    for (const option of FALLBACK_VOICE_INPUT_LANGUAGE_OPTIONS) {
      if (!optionMap.has(option.value)) {
        optionMap.set(option.value, option)
      }
    }

    if (!optionMap.has(appVoiceInputLanguage)) {
      optionMap.set(appVoiceInputLanguage, {
        value: appVoiceInputLanguage,
        label: `${formatVoiceLanguageLabel(appVoiceInputLanguage)} (${appVoiceInputLanguage.toUpperCase()})`,
      })
    }

    return [
      {
        value: APP_LANGUAGE_SELECTION_VALUE,
        label: `App language (${appLanguageLabel})`,
      },
      ...Array.from(optionMap.values()).sort((left, right) =>
        left.label.localeCompare(right.label),
      ),
    ]
  }, [appLanguageLabel, appVoiceInputLanguage, catalogLanguageOptions])

  return {
    voiceInputLanguage,
    selectedLanguageValue,
    languageOptions,
    setSelectedLanguageValue,
    isUsingAppLanguage: selectedLanguageValue === APP_LANGUAGE_SELECTION_VALUE,
  }
}
