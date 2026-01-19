"use client";

/**
 * BUILDER CHAT PANEL
 *
 * Chat interface for the AI page builder.
 * Shows conversation history and input for prompts.
 */

import { useState, useRef, useEffect } from "react";
import { useBuilder } from "@/contexts/builder-context";
import { Sparkles, Send, Save, RefreshCw, AlertCircle } from "lucide-react";

// ============================================================================
// MESSAGE COMPONENTS
// ============================================================================

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-indigo-600 text-white rounded-2xl rounded-tr-md px-4 py-2">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ content, hasSchema }: { content: string; hasSchema?: boolean }) {
  // Extract just the text part if there's JSON
  const textContent = content.replace(/```json[\s\S]*?```/g, "").trim();

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-2 shadow-sm">
        {textContent && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{textContent}</p>
        )}
        {hasSchema && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
            <Sparkles className="w-3 h-3" />
            <span>Page generated - see preview</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SystemMessage({ content }: { content: string }) {
  const isError = content.toLowerCase().startsWith("error");

  return (
    <div className="flex justify-center">
      <div
        className={`max-w-[90%] rounded-lg px-3 py-1.5 text-xs ${
          isError
            ? "bg-red-50 text-red-600 border border-red-200"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SAVE DIALOG
// ============================================================================

function SaveDialog({
  isOpen,
  onClose,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Save as Project
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isSaving}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BuilderChatPanel() {
  const {
    messages,
    isGenerating,
    generationError,
    sendMessage,
    saveAsProject,
    pageSchema,
    reset,
  } = useBuilder();

  const [input, setInput] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isGenerating]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSave = async (name: string) => {
    setIsSaving(true);
    try {
      const projectId = await saveAsProject(name);
      if (projectId) {
        setShowSaveDialog(false);
        // Could redirect to project page here
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Page Builder
              </h2>
              <p className="text-xs text-gray-500">
                Describe your landing page
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pageSchema && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Save as project"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={reset}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Start over"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message if empty */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              What would you like to build?
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Describe your landing page and I&apos;ll generate it for you. Try
              something like:
            </p>
            <div className="mt-4 space-y-2">
              {[
                "A landing page for a sailing school with a hero, features about lessons, and a booking CTA",
                "A simple landing page for my coffee shop with opening hours",
                "A professional page for my consulting business",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="block w-full max-w-md mx-auto text-left text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg px-4 py-2 transition-colors"
                >
                  &quot;{suggestion}&quot;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => {
          if (message.role === "user") {
            return <UserMessage key={message.id} content={message.content} />;
          }
          if (message.role === "assistant") {
            return (
              <AssistantMessage
                key={message.id}
                content={message.content}
                hasSchema={!!message.pageSchema}
              />
            );
          }
          return <SystemMessage key={message.id} content={message.content} />;
        })}

        {/* Typing indicator */}
        {isGenerating && <TypingIndicator />}

        {/* Error message */}
        {generationError && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{generationError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the page you want to create..."
            disabled={isGenerating}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl resize-none overflow-hidden min-h-[44px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-400 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      {/* Save Dialog */}
      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
