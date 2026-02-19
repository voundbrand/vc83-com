"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { parseLayersAIResponse, type AIWorkflowResponse } from "./ai-workflow-schema";

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  workflowData?: AIWorkflowResponse;
  warnings?: string[];
  error?: string;
}

interface AIPromptOverlayProps {
  open: boolean;
  onClose: () => void;
  onApplyWorkflow: (
    nodes: AIWorkflowResponse["nodes"],
    edges: AIWorkflowResponse["edges"],
  ) => void;
  currentWorkflowSummary: string;
}

// ============================================================================
// SUGGESTION CHIPS
// ============================================================================

const SUGGESTIONS = [
  "Lead capture funnel with email follow-up",
  "Webhook to CRM with Slack notification",
  "Form submission to booking confirmation",
];

// ============================================================================
// COMPONENT
// ============================================================================

export function AIPromptOverlay({
  open,
  onClose,
  onApplyWorkflow,
  currentWorkflowSummary,
}: AIPromptOverlayProps) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<Id<"aiConversations"> | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendMessageAction = useAction(api.ai.chat.sendMessage);

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending || !user) return;

      setInput("");

      // Add user message
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsSending(true);

      try {
        // Prepend workflow context
        const contextPrefix =
          currentWorkflowSummary && currentWorkflowSummary !== "Empty canvas - no nodes or edges."
            ? `[CURRENT WORKFLOW STATE]\n${currentWorkflowSummary}\n---\n`
            : "[CURRENT WORKFLOW STATE]\nEmpty canvas - no nodes or edges.\n---\n";

        const result = await sendMessageAction({
          conversationId,
          message: contextPrefix + trimmed,
          organizationId: user.currentOrganization?.id as Id<"organizations">,
          userId: user.id as Id<"users">,
          context: "layers_builder",
        });

        if (result.conversationId && !conversationId) {
          setConversationId(result.conversationId);
        }

        // Parse AI response for workflow JSON
        const parsed = parseLayersAIResponse(result.message);

        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: result.message,
          workflowData: parsed.data ?? undefined,
          warnings: parsed.warnings,
          error: parsed.error,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong. Try again.";

        // Categorize errors
        let displayError = errorMessage;
        if (errorMessage.toLowerCase().includes("budget")) {
          displayError = "Monthly AI budget exceeded. Check your AI settings to increase the limit.";
        } else if (errorMessage.toLowerCase().includes("rate limit")) {
          displayError = "Rate limit reached. Please wait a moment and try again.";
        } else if (errorMessage.toLowerCase().includes("not enabled")) {
          displayError = "AI features are not enabled for this organization. Enable them in Settings.";
        }

        const errorMsg: ChatMessage = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: displayError,
          error: displayError,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, user, conversationId, currentWorkflowSummary, sendMessageAction],
  );

  const handleApply = useCallback(
    (data: AIWorkflowResponse) => {
      onApplyWorkflow(data.nodes, data.edges);
    },
    [onApplyWorkflow],
  );

  if (!open) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
      <div
        className="pointer-events-auto relative flex w-[560px] max-h-[520px] flex-col rounded-xl border border-slate-700 shadow-2xl backdrop-blur-sm"
        style={{ background: "rgba(9, 9, 11, 0.97)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600/20 text-blue-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <h3 className="text-sm font-medium text-slate-100">AI Workflow Builder</h3>
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              Cmd+K
            </kbd>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[120px]">
          {messages.length === 0 && !isSending && (
            <div className="text-center py-6">
              <p className="text-xs text-slate-400 mb-4">
                Describe the workflow you want to build, or try a suggestion:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSubmit(s)}
                    className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:border-blue-500/50 hover:text-blue-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-2 text-xs text-slate-200">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Text response */}
                  {msg.error ? (
                    <div className="rounded-lg border border-red-500/30 bg-red-900/10 px-3 py-2 text-xs text-red-300">
                      {msg.error}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {/* Show description or strip JSON from displayed text */}
                      {msg.workflowData?.description
                        ? msg.workflowData.description
                        : stripCodeBlocks(msg.content)}
                    </div>
                  )}

                  {/* Warnings */}
                  {msg.warnings && msg.warnings.length > 0 && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-900/10 px-3 py-2 text-xs text-yellow-300">
                      {msg.warnings.join(". ")}
                    </div>
                  )}

                  {/* Apply card */}
                  {msg.workflowData && (
                    <WorkflowPreviewCard
                      data={msg.workflowData}
                      onApply={() => handleApply(msg.workflowData!)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
              Generating workflow...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-800 px-5 py-3">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(input);
                }
              }}
              placeholder="Describe your workflow..."
              className="flex-1 resize-none rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
              disabled={isSending}
            />
            <button
              onClick={() => handleSubmit(input)}
              disabled={!input.trim() || isSending || !user}
              className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-600">
            Enter to send, Shift+Enter for new line, Escape to close
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WORKFLOW PREVIEW CARD
// ============================================================================

function WorkflowPreviewCard({
  data,
  onApply,
}: {
  data: AIWorkflowResponse;
  onApply: () => void;
}) {
  const [applied, setApplied] = useState(false);

  const nodesByCategory = data.nodes.reduce<Record<string, number>>((acc, n) => {
    const prefix = n.type.startsWith("trigger_") ? "Trigger" : n.type.startsWith("lc_") ? "LC Native" : n.type.startsWith("if_") || n.type === "merge" || n.type === "split_ab" || n.type === "filter" || n.type === "transform" || n.type === "wait_delay" ? "Logic" : "Integration";
    acc[prefix] = (acc[prefix] || 0) + 1;
    return acc;
  }, {});

  const summary = Object.entries(nodesByCategory)
    .map(([cat, count]) => `${count} ${cat}`)
    .join(", ");

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-900/10 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-blue-300">
            {data.nodes.length} node{data.nodes.length !== 1 ? "s" : ""}, {data.edges.length} edge{data.edges.length !== 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">{summary}</p>
        </div>
        <button
          onClick={() => {
            onApply();
            setApplied(true);
          }}
          disabled={applied}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {applied ? "Applied" : "Apply to Canvas"}
        </button>
      </div>
      {/* Mini node list */}
      <div className="mt-2 flex flex-wrap gap-1">
        {data.nodes.map((n) => (
          <span
            key={n.id}
            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400"
          >
            {n.label || n.type}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/** Strip ```json...``` code blocks from text for display, leaving surrounding prose. */
function stripCodeBlocks(text: string): string {
  return text
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .trim() || "Workflow generated successfully.";
}
