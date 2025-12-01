"use client"

export function ChatFooter() {
  // TODO: Connect to actual token counter from Convex
  const tokens = 150
  const estimatedCost = (tokens * 0.000015).toFixed(4) // ~$0.015 per 1K tokens for Claude

  return (
    <div
      className="px-4 py-1 border-t text-[10px] flex items-center justify-between"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)',
        color: 'var(--win95-text)'
      }}
    >
      <div className="flex items-center gap-3">
        <span title="Tokens used in this conversation">
          💬 {tokens.toLocaleString()} tokens
        </span>
        <span title="Estimated cost">
          💰 €{estimatedCost}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} title="AI Online" />
        <span>Ready</span>
      </div>
    </div>
  )
}
