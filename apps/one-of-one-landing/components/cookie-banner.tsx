"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

const STORAGE_KEY = "ooo_cookie_banner_dismissed"

const copy = {
  en: {
    title: "Legally-required cookie banner",
    line1: "sevenlayers.io doesn't use third-party cookies, only a single in-house cookie.",
    line2: "No data is sent to a third party.",
  },
  de: {
    title: "Gesetzlich vorgeschriebenes Cookie-Banner",
    line1: "sevenlayers.io verwendet keine Drittanbieter-Cookies, sondern nur ein einziges eigenes Cookie.",
    line2: "Es werden keine Daten an Dritte weitergegeben.",
  },
}

export function CookieBanner() {
  const [show, setShow] = useState(false)
  const [lang, setLang] = useState<"en" | "de">("en")

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
    </div>
  )
}
