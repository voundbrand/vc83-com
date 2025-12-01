"use client"

interface SystemMessageProps {
  content: string
}

export function SystemMessage({ content }: SystemMessageProps) {
  return (
    <div className="flex justify-center">
      <div
        className="px-4 py-2 rounded border-2 max-w-[80%] text-center text-sm"
        style={{
          borderColor: 'var(--win95-border)',
          background: '#ffffcc', // Light yellow like Windows notifications
          color: '#000'
        }}
      >
        <div className="flex items-start gap-2">
          <span className="text-lg">ℹ️</span>
          <div className="flex-1 leading-relaxed">{content}</div>
        </div>
      </div>
    </div>
  )
}
