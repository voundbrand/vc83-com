"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getLocaleLabel, useTranslation } from "@/contexts/translation-context"

const VOICE_INPUT_LANGUAGE_STORAGE_KEY = "ai_chat_voice_input_language"
const APP_LANGUAGE_SELECTION_VALUE = "__app_language__"

type VoiceInputLanguageOption = {
  value: string
  label: string
}

const MANUAL_VOICE_INPUT_LANGUAGE_OPTIONS: ReadonlyArray<VoiceInputLanguageOption> = [
  { value: "en-US", label: "English (US)" },
  { value: "de-DE", label: "Deutsch (DE)" },
  { value: "pl-PL", label: "Polski (PL)" },
  { value: "es-ES", label: "Espanol (ES)" },
  { value: "fr-FR", label: "Francais (FR)" },
  { value: "ja-JP", label: "Japanese (JP)" },
]

const BASE_LANGUAGE_TO_SPEECH_LOCALE: Readonly<Record<string, string>> = {
  en: "en-US",
  de: "de-DE",
  pl: "pl-PL",
  es: "es-ES",
  fr: "fr-FR",
  ja: "ja-JP",
}

const SUPPORTED_SPEECH_LOCALES = new Set(
  MANUAL_VOICE_INPUT_LANGUAGE_OPTIONS.map((option) => option.value.toLowerCase()),
)

function normalizeLocale(locale: string | null | undefined): string {
  return String(locale || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
}

function isSupportedSpeechLocale(locale: string | null | undefined): locale is string {
  return SUPPORTED_SPEECH_LOCALES.has(normalizeLocale(locale))
}

function resolveSpeechLocale(locale: string | null | undefined): string {
  const normalizedLocale = normalizeLocale(locale)
  if (!normalizedLocale) {
    return "en-US"
  }

  const exactMatch = MANUAL_VOICE_INPUT_LANGUAGE_OPTIONS.find(
    (option) => option.value.toLowerCase() === normalizedLocale,
  )
  if (exactMatch) {
    return exactMatch.value
  }

  const baseLanguage = normalizedLocale.split("-")[0] || "en"
  return BASE_LANGUAGE_TO_SPEECH_LOCALE[baseLanguage] || "en-US"
}

function resolveLanguageLabel(locale: string): string {
  const normalizedBase = normalizeLocale(locale).split("-")[0] || "en"
  return getLocaleLabel(normalizedBase)
}

export function useAIChatVoiceInputLanguage() {
  const { locale: appLocale } = useTranslation()
  const appVoiceInputLanguage = useMemo(() => resolveSpeechLocale(appLocale), [appLocale])
  const [manualVoiceInputLanguage, setManualVoiceInputLanguage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const storedLanguage = window.localStorage.getItem(VOICE_INPUT_LANGUAGE_STORAGE_KEY)
    if (isSupportedSpeechLocale(storedLanguage)) {
      setManualVoiceInputLanguage(resolveSpeechLocale(storedLanguage))
      return
    }

    window.localStorage.removeItem(VOICE_INPUT_LANGUAGE_STORAGE_KEY)
    setManualVoiceInputLanguage(null)
  }, [])

  const setSelectedLanguageValue = useCallback((value: string) => {
    if (typeof window === "undefined") {
      return
    }

    if (value === APP_LANGUAGE_SELECTION_VALUE) {
      window.localStorage.removeItem(VOICE_INPUT_LANGUAGE_STORAGE_KEY)
      setManualVoiceInputLanguage(null)
      return
    }

    if (!isSupportedSpeechLocale(value)) {
      return
    }

    const normalized = resolveSpeechLocale(value)
    window.localStorage.setItem(VOICE_INPUT_LANGUAGE_STORAGE_KEY, normalized)
    setManualVoiceInputLanguage(normalized)
  }, [])

  const voiceInputLanguage = manualVoiceInputLanguage || appVoiceInputLanguage
  const selectedLanguageValue = manualVoiceInputLanguage || APP_LANGUAGE_SELECTION_VALUE
  const appLanguageLabel = resolveLanguageLabel(appLocale)

  const languageOptions = useMemo<VoiceInputLanguageOption[]>(
    () => [
      {
        value: APP_LANGUAGE_SELECTION_VALUE,
        label: `App language (${appLanguageLabel})`,
      },
      ...MANUAL_VOICE_INPUT_LANGUAGE_OPTIONS,
    ],
    [appLanguageLabel],
  )

  return {
    voiceInputLanguage,
    selectedLanguageValue,
    languageOptions,
    setSelectedLanguageValue,
    isUsingAppLanguage: selectedLanguageValue === APP_LANGUAGE_SELECTION_VALUE,
  }
}

