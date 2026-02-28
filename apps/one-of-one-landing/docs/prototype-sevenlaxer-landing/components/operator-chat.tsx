"use client"

import { useState, useRef, useEffect } from "react"
import { Send, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "assistant",
  content:
    "Welcome. I'm here to find the highest-leverage workflow you should automate first. Let's start with the basics — what does your business do, and roughly what revenue are you at?",
}

export function OperatorChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const simulateResponse = (userMessage: string) => {
    setIsTyping(true)

    // Determine which question we're on based on message count
    const questionIndex = Math.floor((messages.length - 1) / 2)

    const responses = [
      "Got it. How many people on your team?",
      "Walk me through a typical Monday morning. What's the first thing you deal with?",
      "Of everything on your plate this week, what's the one thing you wish someone else could handle — but nobody does it the way you would?",
      "Last one: if I could hand you back 10 hours this week, what would you spend them on?",
      `Based on what you've told me, here's the workflow that would give you the most leverage:

**Client Communication Automation**

Your highest-impact opportunity is automating the back-and-forth that happens between initial inquiry and booked appointment. Right now, you're the integration layer — the human middleware between your inbox, calendar, and the judgment calls that determine which leads get priority.

An operator configured around your business would:
- Qualify inbound leads using your criteria (not generic rules)
- Handle the scheduling dance without losing the personal touch
- Flag only the edge cases that genuinely need your judgment
- Keep your CRM updated without you touching it

This workflow alone typically recovers 8-12 hours per week for operators at your stage.

You just spent seven minutes with an operator that doesn't know you yet. Imagine what it does after six months of learning your business.`,
    ]

    setTimeout(() => {
      const responseContent =
        questionIndex < responses.length
          ? responses[questionIndex]
          : "Thank you for sharing. Based on everything you've told me, I can see several high-leverage opportunities. The paths below will show you how to move forward."

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: responseContent,
        },
      ])
      setIsTyping(false)
    }, 1500)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    simulateResponse(input.trim())
  }

  return (
    <div className="chat-container flex flex-col h-[500px] md:h-[600px] w-full max-w-3xl mx-auto overflow-hidden">
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface-hover)",
        }}
      >
        <Image
          src="/images/samantha-avatar.png"
          alt="Samantha"
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <p
            className="font-medium text-sm"
            style={{ color: "var(--color-text)" }}
          >
            Samantha
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Private AI audit — 7 minutes
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {message.role === "user" ? (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                <User className="w-4 h-4 text-white" />
              </div>
            ) : (
              <Image
                src="/images/samantha-avatar.png"
                alt="Samantha"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div
              className={`max-w-[80%] px-4 py-3 ${
                message.role === "user"
                  ? "chat-message-user"
                  : "chat-message-assistant"
              }`}
            >
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--color-text)" }}
              >
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <Image
              src="/images/samantha-avatar.png"
              alt="Samantha"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div className="chat-message-assistant px-4 py-3">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: "var(--color-text-tertiary)",
                    animationDelay: "0ms",
                  }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: "var(--color-text-tertiary)",
                    animationDelay: "150ms",
                  }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: "var(--color-text-tertiary)",
                    animationDelay: "300ms",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-4 border-t flex gap-3"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your response..."
          className="chat-input flex-1 px-4 py-3 text-sm"
          disabled={isTyping}
        />
        <Button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="btn-accent px-4 py-3 rounded-md flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}
