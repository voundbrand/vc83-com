"use client";

/**
 * CHAT WIDGET
 *
 * Embeddable webchat widget for AI agents.
 * Can be embedded on any website via script tag, React component, or iframe.
 *
 * Usage (React):
 *   import { ChatWidget } from "@/components/chat-widget";
 *   <ChatWidget agentId="abc123" apiUrl="https://api.l4yercak3.com" />
 *
 * Usage (Script tag):
 *   <script src="https://l4yercak3.com/widget.js" data-agent-id="abc123"></script>
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, User, Bot } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface WebchatConfig {
  agentId: string;
  agentName: string;
  welcomeMessage: string;
  brandColor: string;
  position: "bottom-right" | "bottom-left";
  collectContactInfo: boolean;
  bubbleText: string;
  offlineMessage: string;
  avatar?: string;
  language: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatWidgetProps {
  /** Agent ID to connect to */
  agentId: string;
  /** API base URL (defaults to /api/v1) */
  apiUrl?: string;
  /** Override position (default comes from config) */
  position?: "bottom-right" | "bottom-left";
  /** Override brand color */
  brandColor?: string;
  /** Initially open */
  defaultOpen?: boolean;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const STORAGE_KEY_PREFIX = "l4yercak3_webchat_";

function getStorageKey(agentId: string, key: string): string {
  return `${STORAGE_KEY_PREFIX}${agentId}_${key}`;
}

function getSessionToken(agentId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getStorageKey(agentId, "sessionToken"));
}

function setSessionToken(agentId: string, token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(agentId, "sessionToken"), token);
}

function getStoredMessages(agentId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(getStorageKey(agentId, "messages"));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function setStoredMessages(agentId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  // Keep only last 50 messages to avoid localStorage limits
  const toStore = messages.slice(-50);
  localStorage.setItem(getStorageKey(agentId, "messages"), JSON.stringify(toStore));
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChatWidget({
  agentId,
  apiUrl = "/api/v1",
  position: positionOverride,
  brandColor: brandColorOverride,
  defaultOpen = false,
}: ChatWidgetProps) {
  // State
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [config, setConfig] = useState<WebchatConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived values
  const position = positionOverride || config?.position || "bottom-right";
  const brandColor = brandColorOverride || config?.brandColor || "#7c3aed";

  // ============================================================================
  // FETCH CONFIG
  // ============================================================================

  useEffect(() => {
    async function fetchConfig() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/webchat/config/${agentId}`);
        if (!response.ok) {
          throw new Error("Failed to load chat configuration");
        }
        const data = await response.json();
        setConfig(data);

        // Load stored messages
        const storedMessages = getStoredMessages(agentId);
        if (storedMessages.length > 0) {
          setMessages(storedMessages);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load widget");
        console.error("[ChatWidget] Config fetch failed:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, [agentId, apiUrl]);

  // ============================================================================
  // AUTO SCROLL
  // ============================================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;

      setIsSending(true);
      setError(null);

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const updated = [...prev, userMessage];
        setStoredMessages(agentId, updated);
        return updated;
      });
      setInput("");

      try {
        const sessionToken = getSessionToken(agentId);

        const response = await fetch(`${apiUrl}/webchat/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agentId,
            message: text.trim(),
            sessionToken,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to send message");
        }

        const data = await response.json();

        // Store session token for future messages
        if (data.sessionToken) {
          setSessionToken(agentId, data.sessionToken);
        }

        // Add assistant response
        if (data.response) {
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: data.response,
            timestamp: Date.now(),
          };
          setMessages((prev) => {
            const updated = [...prev, assistantMessage];
            setStoredMessages(agentId, updated);
            return updated;
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        console.error("[ChatWidget] Send failed:", err);
      } finally {
        setIsSending(false);
      }
    },
    [agentId, apiUrl, isSending]
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Position styles
  const positionStyles =
    position === "bottom-left"
      ? { left: "20px", bottom: "20px" }
      : { right: "20px", bottom: "20px" };

  // Loading state (config not yet loaded)
  if (isLoading) {
    return (
      <div className="fixed z-[9999]" style={positionStyles}>
        <button
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: brandColor }}
          disabled
        >
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </button>
      </div>
    );
  }

  // Error state
  if (error && !config) {
    return null; // Silently fail if config couldn't load
  }

  return (
    <div className="fixed z-[9999]" style={positionStyles}>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="mb-4 w-[380px] max-w-[calc(100vw-40px)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            height: "min(600px, calc(100vh - 120px))",
            border: `1px solid ${brandColor}20`,
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: brandColor }}
          >
            <div className="flex items-center gap-3">
              {config?.avatar ? (
                <img
                  src={config.avatar}
                  alt={config.agentName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-white text-sm">
                  {config?.agentName || "Chat"}
                </h3>
                <p className="text-white/70 text-xs">Online</p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {/* Welcome message */}
            {messages.length === 0 && config?.welcomeMessage && (
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: `${brandColor}20` }}
                >
                  <Bot className="w-4 h-4" style={{ color: brandColor }} />
                </div>
                <div
                  className="rounded-2xl rounded-tl-md px-4 py-2 max-w-[80%] bg-white shadow-sm"
                  style={{ border: `1px solid ${brandColor}10` }}
                >
                  <p className="text-sm text-gray-700">{config.welcomeMessage}</p>
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    message.role === "user" ? "bg-gray-200" : ""
                  }`}
                  style={
                    message.role === "assistant"
                      ? { backgroundColor: `${brandColor}20` }
                      : undefined
                  }
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Bot className="w-4 h-4" style={{ color: brandColor }} />
                  )}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "rounded-tr-md text-white"
                      : "rounded-tl-md bg-white shadow-sm"
                  }`}
                  style={
                    message.role === "user"
                      ? { backgroundColor: brandColor }
                      : { border: `1px solid ${brandColor}10` }
                  }
                >
                  <p className={`text-sm ${message.role === "user" ? "text-white" : "text-gray-700"}`}>
                    {message.content}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isSending && (
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: `${brandColor}20` }}
                >
                  <Bot className="w-4 h-4" style={{ color: brandColor }} />
                </div>
                <div
                  className="rounded-2xl rounded-tl-md px-4 py-3 bg-white shadow-sm"
                  style={{ border: `1px solid ${brandColor}10` }}
                >
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: brandColor, animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: brandColor, animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: brandColor, animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-gray-100 bg-white"
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={isSending}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: brandColor }}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>

          {/* Powered by */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-400 text-center">
              Powered by{" "}
              <a
                href="https://l4yercak3.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-600"
              >
                l4yercak3
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        style={{ backgroundColor: brandColor }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}

export default ChatWidget;
