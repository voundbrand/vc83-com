"use client"

interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div
        className="px-4 py-2 rounded border-2 max-w-[75%] text-sm"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-selected-bg)',
          color: 'var(--win95-selected-text)',
          borderStyle: 'outset'
        }}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </div>
          <span className="text-base">👤</span>
        </div>
      </div>
    </div>
  )
}
