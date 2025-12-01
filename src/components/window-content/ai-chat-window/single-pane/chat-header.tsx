"use client"

import { useLayoutMode } from "../layout-mode-context"

export function ChatHeader() {
  const { mode, switchToThreePane } = useLayoutMode()

  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-b-2"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)'
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <span className="font-pixel text-xs" style={{ color: 'var(--win95-text)' }}>
          AI Assistant
        </span>
        <span
          className="ml-2 w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--success)' }}
          title="Online"
        />
      </div>

      <div className="flex items-center gap-2">
        {mode === "single" && (
          <button
            className="retro-button px-2 py-0.5 text-xs font-pixel"
            onClick={switchToThreePane}
            title="Switch to workflow mode"
          >
            📊 Workflow
          </button>
        )}
      </div>
    </div>
  )
}
