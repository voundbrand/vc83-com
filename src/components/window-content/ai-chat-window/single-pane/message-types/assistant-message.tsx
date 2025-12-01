"use client"

interface AssistantMessageProps {
  content: string
  toolExecution?: {
    status: "running" | "success" | "error"
    message: string
  }
  quickActions?: Array<{
    label: string
    onClick: () => void
  }>
}

export function AssistantMessage({ content, toolExecution, quickActions }: AssistantMessageProps) {
  return (
    <div className="flex justify-start">
      <div
        className="px-4 py-2 rounded border-2 max-w-[75%] text-sm"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)',
          color: 'var(--win95-text)',
          borderStyle: 'inset'
        }}
      >
        <div className="flex items-start gap-2">
          <span className="text-base">🤖</span>
          <div className="flex-1 space-y-2">
            <div className="leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </div>

            {/* Tool execution status */}
            {toolExecution && (
              <div
                className="px-3 py-2 rounded border text-xs flex items-center gap-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: toolExecution.status === "running" ? 'var(--win95-bg)' :
                             toolExecution.status === "success" ? 'var(--success)' :
                             'var(--error)',
                  color: toolExecution.status === "running" ? 'var(--win95-text)' : '#ffffff'
                }}
              >
                {toolExecution.status === "running" && <span className="animate-spin">⚙️</span>}
                {toolExecution.status === "success" && <span>✅</span>}
                {toolExecution.status === "error" && <span>❌</span>}
                <span>{toolExecution.message}</span>
              </div>
            )}

            {/* Quick actions */}
            {quickActions && quickActions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    className="retro-button px-3 py-1 text-xs"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
