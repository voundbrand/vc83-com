"use client"

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="px-4 py-3 rounded border-2"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'white',
          borderStyle: 'inset'
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
