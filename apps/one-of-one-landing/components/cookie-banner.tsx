"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

const STORAGE_KEY = "ooo_cookie_banner_dismissed"

const copy = {
  en: {
    title: "Legally-required cookie banner",
    line1: "sevenlayers.io doesn't use third-party cookies, only a single in-house cookie.",
    line2: "No data is sent to a third party.",
    line3Pre: "(",
    line3Name: "Ursula von der Leyen",
    line3Post: " would be so proud.)",
    tooltip: "Ursula von der Leyen is the President of the European Commission \u2013 NOT to be confused with Hillary Clinton.",
  },
  de: {
    title: "Gesetzlich vorgeschriebenes Cookie-Banner",
    line1: "sevenlayers.io verwendet keine Drittanbieter-Cookies, sondern nur ein einziges eigenes Cookie.",
    line2: "Es werden keine Daten an Dritte weitergegeben.",
    line3Pre: "(",
    line3Name: "Ursula von der Leyen",
    line3Post: " wäre so stolz.)",
    tooltip: "Ursula von der Leyen ist die Präsidentin der Europäischen Kommission \u2013 NICHT zu verwechseln mit Hillary Clinton.",
  },
}

export function CookieBanner() {
  const [show, setShow] = useState(false)
  const [lang, setLang] = useState<"en" | "de">("en")
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
    } catch {
      /* noop */
    }

    const browserLang = navigator.language?.toLowerCase() ?? ""
    if (browserLang.startsWith("de")) setLang("de")

    const timer = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* noop */
    }
  }

  if (!show) return null

  const t = copy[lang]

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border p-4 pr-10 shadow-lg cookie-banner-enter"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-md transition-colors"
        style={{ color: "var(--color-text-tertiary)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--color-text)"
          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--color-text-tertiary)"
          e.currentTarget.style.backgroundColor = "transparent"
        }}
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <p
        className="text-sm font-semibold mb-2"
        style={{ color: "var(--color-text)" }}
      >
        {t.title}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        {t.line1}
      </p>
      <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--color-text-secondary)" }}>
        {t.line2}
      </p>
      <p className="text-xs leading-relaxed mt-1 relative" style={{ color: "var(--color-text-tertiary)" }}>
        {t.line3Pre}
        <span
          className="underline decoration-dotted cursor-help"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={() => {
            tooltipTimeout.current = setTimeout(() => setTooltipOpen(true), 300)
          }}
          onMouseLeave={() => {
            if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
            setTooltipOpen(false)
          }}
        >
          {t.line3Name}
        </span>
        {t.line3Post}
        {tooltipOpen && (
          <span
            className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border p-3 text-xs leading-relaxed shadow-md cookie-banner-enter"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            {t.tooltip}
          </span>
        )}
      </p>
    </div>
  )
}
