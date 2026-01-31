"use client"

import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, Lock } from "lucide-react"

export function BuilderBrowserWindow() {
  const builderUrl = "/builder"

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Browser Chrome */}
      <div
        className="flex flex-col gap-1 px-2 py-1.5 border-b"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Navigation bar */}
        <div className="flex items-center gap-1.5">
          {/* Nav buttons */}
          <div className="flex items-center gap-0.5">
            <button
              className="p-1 border"
              style={{
                background: "var(--win95-bg)",
                borderColor: "var(--win95-border)",
                color: "var(--win95-text-disabled, #808080)",
              }}
              disabled
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
            <button
              className="p-1 border"
              style={{
                background: "var(--win95-bg)",
                borderColor: "var(--win95-border)",
                color: "var(--win95-text-disabled, #808080)",
              }}
              disabled
            >
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              className="p-1 border"
              style={{
                background: "var(--win95-bg)",
                borderColor: "var(--win95-border)",
                color: "var(--win95-text-disabled, #808080)",
              }}
              disabled
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>

          {/* Address bar */}
          <div
            className="flex-1 flex items-center gap-1.5 px-2 py-1 border text-xs font-mono"
            style={{
              background: "white",
              borderColor: "var(--win95-border)",
              borderStyle: "inset",
              color: "var(--win95-text)",
            }}
          >
            <Lock className="w-3 h-3 flex-shrink-0" style={{ color: "var(--win95-highlight)" }} />
            <span className="truncate">app.l4yercak3.com/builder</span>
          </div>

          {/* Open full screen link */}
          <a
            href={builderUrl}
            className="flex items-center gap-1 px-2 py-1 border text-xs font-pixel whitespace-nowrap transition-colors hover:brightness-110"
            style={{
              background: "var(--win95-highlight)",
              borderColor: "var(--win95-border)",
              color: "white",
            }}
          >
            <ExternalLink className="w-3 h-3" />
            Open Full Screen
          </a>
        </div>
      </div>

      {/* Iframe content */}
      <div className="flex-1 relative min-h-0">
        <iframe
          src={builderUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="AI Builder"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
        />
      </div>
    </div>
  )
}
