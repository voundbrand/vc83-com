"use client"

import { useState, useRef, useEffect } from "react"

export function ChatInput() {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    // TODO: Send message to AI via Convex action
    console.log("Sending message:", message)
    setMessage("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t-2 p-3"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)'
      }}
    >
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift+Enter for new line)"
          className="flex-1 px-3 py-2 border-2 resize-none overflow-hidden min-h-[40px] max-h-[120px]"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'white',
            borderStyle: 'inset',
            fontSize: '13px',
            fontFamily: 'system-ui, sans-serif'
          }}
          rows={1}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="retro-button px-4 py-2 font-pixel text-xs whitespace-nowrap"
        >
          Send 📤
        </button>
      </div>

      <div className="mt-2 text-[10px] text-gray-500">
        Quick: /email, /forms, /crm, /events
      </div>
    </form>
  )
}
