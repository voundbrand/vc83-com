"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useData } from "@/lib/data-context"

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts || !Array.isArray(message.parts)) return ""
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const router = useRouter()
  const { addBenefit, addProvision, addLeistung } = useData()

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return

      // Handle navigation
      if (toolCall.toolName === "navigateTo" || toolCall.toolName === "listMyOffers") {
        const args = toolCall.args as { redirectUrl?: string }
        if (args.redirectUrl) {
          setTimeout(() => router.push(args.redirectUrl!), 500)
        }
      }

      // Handle create actions - add to data context
      if (toolCall.toolName === "createBenefit") {
        const args = toolCall.args as {
          title: string
          description: string
          category: string
          discount: string | null
        }
        addBenefit({
          title: args.title,
          description: args.description,
          category: args.category,
          discount: args.discount || undefined,
          provider: "Muster Tech Solutions GmbH",
          image: "/diverse-designers-brainstorming.png",
        })
      }

      if (toolCall.toolName === "createProvision") {
        const args = toolCall.args as {
          title: string
          description: string
          category: string
          commission: string
        }
        addProvision({
          title: args.title,
          description: args.description,
          category: args.category,
          commission: args.commission,
          provider: "Muster Tech Solutions GmbH",
          image: "/accountant-desk.png",
        })
      }

      if (toolCall.toolName === "createLeistung") {
        const args = toolCall.args as {
          title: string
          description: string
          category: string
          skills: string[]
          hourlyRate: string | null
          location: string
        }
        addLeistung({
          title: args.title,
          description: args.description,
          category: args.category,
          skills: args.skills,
          hourlyRate: args.hourlyRate || undefined,
          location: args.location,
          provider: "Julia Schneider",
          rating: 5.0,
          image: "/diverse-woman-portrait.png",
        })
      }
    },
  })

  const isLoading = status === "streaming" || status === "submitted"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all",
          "bg-primary hover:bg-primary/90",
          isOpen && "rotate-90"
        )}
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-[380px] shadow-2xl border-border">
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              Gründungswerft Assistent
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                  <Bot className="h-12 w-12 mb-4 text-primary/50" />
                  <p className="text-sm">
                    Hallo! Ich bin der Gründungswerft Assistent.
                    Wie kann ich Ihnen heute helfen?
                  </p>
                  <div className="mt-4 space-y-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        sendMessage({ text: "Ich möchte einen neuen Benefit erstellen" })
                      }}
                    >
                      Neuen Benefit erstellen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        sendMessage({ text: "Zeige mir meine Angebote" })
                      }}
                    >
                      Meine Angebote anzeigen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        sendMessage({ text: "Ich möchte eine neue Leistung anbieten" })
                      }}
                    >
                      Neue Leistung anbieten
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const text = getMessageText(message)
                    if (!text) return null

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === "assistant" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm max-w-[80%]",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {text}
                        </div>
                        {message.role === "user" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="rounded-lg bg-muted px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>

          <CardFooter className="border-t p-3">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Schreiben Sie eine Nachricht..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  )
}
