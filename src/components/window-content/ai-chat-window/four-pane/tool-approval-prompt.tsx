"use client"

import { useState, useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import type { Id } from "../../../../../convex/_generated/dataModel"

interface ToolApprovalPromptProps {
  execution: {
    _id: Id<"aiToolExecutions">;
    toolName: string;
    parameters: Record<string, unknown>;
    proposalMessage?: string;
  };
  onApprove: (executionId: Id<"aiToolExecutions">, dontAskAgain: boolean) => Promise<void>;
  onReject: (executionId: Id<"aiToolExecutions">) => Promise<void>;
  onCustomInstruction?: (executionId: Id<"aiToolExecutions">, instruction: string) => Promise<void>;
}

// Helper to get human-friendly tool action titles
function getToolActionTitle(toolName: string): string {
  const titles: Record<string, string> = {
    create_contact: "Create Contact",
    update_contact: "Update Contact",
    create_event: "Create Event",
    update_event: "Update Event",
    create_organization: "Create Organization",
    send_email_campaign: "Send Email Campaign",
    sync_contacts: "Sync Contacts",
  };
  return titles[toolName] || toolName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export function ToolApprovalPrompt({
  execution,
  onApprove,
  onReject,
  onCustomInstruction
}: ToolApprovalPromptProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Keyboard shortcuts (1, 2, 3)
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (isLoading) return; // Ignore keyboard during loading

      if (e.key === "1") {
        e.preventDefault();
        setIsLoading(true);
        await onApprove(execution._id, false);
        setIsLoading(false);
      }
      if (e.key === "2") {
        e.preventDefault();
        setIsLoading(true);
        await onApprove(execution._id, true);
        setIsLoading(false);
      }
      if (e.key === "3") {
        e.preventDefault();
        setIsLoading(true);
        await onReject(execution._id);
        setIsLoading(false);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [execution._id, onApprove, onReject, isLoading]);

  const handleCustomSubmit = async () => {
    if (!customText.trim() || !onCustomInstruction) return;

    setIsLoading(true);
    await onCustomInstruction(execution._id, customText);
    setCustomText("");
    setShowCustomInput(false);
    setIsLoading(false);
  };

  return (
    <div
      className="border-2 p-4 rounded mb-3"
      style={{
        borderColor: 'var(--warning)',
        background: 'var(--warning-bg)'
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5" style={{ color: 'var(--warning)' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--shell-text)' }}>
          AI wants to {getToolActionTitle(execution.toolName)}
        </h3>
      </div>

      {/* Proposal Message (if provided) */}
      {execution.proposalMessage && (
        <p className="text-xs mb-3" style={{ color: 'var(--shell-text-dim)' }}>
          {execution.proposalMessage}
        </p>
      )}

      {/* Parameters Preview */}
      <div
        className="mb-4 p-3 rounded"
        style={{
          background: 'var(--shell-surface)',
          borderLeft: '3px solid var(--warning)'
        }}
      >
        <ToolParametersPreview
          toolName={execution.toolName}
          parameters={execution.parameters}
        />
      </div>

      {/* Custom Instruction Input */}
      {showCustomInput && (
        <div className="mb-3">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Tell the AI what to do instead..."
            className="w-full p-2 border rounded text-xs"
            style={{
              borderColor: 'var(--shell-border)',
              background: 'var(--shell-input-surface)',
              color: 'var(--shell-text)'
            }}
            rows={3}
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customText.trim() || isLoading}
            className="mt-2 px-3 py-1 rounded text-xs disabled:opacity-50"
            style={{
              background: 'var(--shell-accent)',
              color: 'white',
              borderColor: 'var(--shell-accent)'
            }}
          >
            Send Instruction
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={async () => {
            setIsLoading(true);
            await onApprove(execution._id, false);
            setIsLoading(false);
          }}
          disabled={isLoading}
          className="w-full px-4 py-2 text-left rounded border-2 transition-colors disabled:opacity-50 text-sm"
          style={{
            borderColor: 'var(--shell-accent)',
            background: 'var(--shell-accent-soft)',
            color: 'var(--shell-text)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = 'var(--shell-hover-surface)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--shell-accent-soft)';
          }}
        >
          <span className="font-bold" style={{ color: 'var(--shell-accent)' }}>1</span>
          {" "}Yes
        </button>

        <button
          onClick={async () => {
            setIsLoading(true);
            await onApprove(execution._id, true);
            setIsLoading(false);
          }}
          disabled={isLoading}
          className="w-full px-4 py-2 text-left rounded border transition-colors disabled:opacity-50 text-sm"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-surface)',
            color: 'var(--shell-text)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = 'var(--shell-hover-surface)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--shell-surface)';
          }}
        >
          <span className="font-bold" style={{ color: 'var(--shell-text-dim)' }}>2</span>
          {" "}Yes, and don't ask again
        </button>

        <button
          onClick={async () => {
            setIsLoading(true);
            await onReject(execution._id);
            setIsLoading(false);
          }}
          disabled={isLoading}
          className="w-full px-4 py-2 text-left rounded border transition-colors disabled:opacity-50 text-sm"
          style={{
            borderColor: 'var(--shell-border)',
            background: 'var(--shell-surface)',
            color: 'var(--shell-text)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = 'var(--shell-hover-surface)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--shell-surface)';
          }}
        >
          <span className="font-bold" style={{ color: 'var(--shell-text-dim)' }}>3</span>
          {" "}No
        </button>

        {onCustomInstruction && (
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            disabled={isLoading}
            className="w-full px-4 py-2 text-left rounded border transition-colors disabled:opacity-50 text-xs"
            style={{
              borderColor: 'var(--shell-border-soft)',
              background: 'var(--shell-surface)',
              color: 'var(--shell-text-dim)'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = 'var(--shell-hover-surface)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--shell-surface)';
            }}
          >
            Tell the AI what to do instead
          </button>
        )}
      </div>
    </div>
  );
}

// Tool-specific parameter previews
function ToolParametersPreview({ toolName, parameters }: {
  toolName: string;
  parameters: Record<string, unknown>;
}) {
  if (toolName === "create_contact") {
    return (
      <div className="space-y-1 text-sm" style={{ color: 'var(--shell-text)' }}>
        <div><strong>Name:</strong> {String(parameters.firstName || "")} {String(parameters.lastName || "")}</div>
        <div><strong>Email:</strong> {String(parameters.email || "N/A")}</div>
        {parameters.phone ? <div><strong>Phone:</strong> {String(parameters.phone)}</div> : null}
        {parameters.company ? <div><strong>Company:</strong> {String(parameters.company)}</div> : null}
      </div>
    );
  }

  if (toolName === "create_event") {
    return (
      <div className="space-y-1 text-sm" style={{ color: 'var(--shell-text)' }}>
        <div><strong>Title:</strong> {String(parameters.title || parameters.eventName || "")}</div>
        {parameters.description ? <div><strong>Description:</strong> {String(parameters.description)}</div> : null}
        {parameters.startDate ? (
          <div><strong>Date:</strong> {new Date(parameters.startDate as string).toLocaleDateString()}</div>
        ) : null}
        {parameters.location ? <div><strong>Location:</strong> {String(parameters.location)}</div> : null}
      </div>
    );
  }

  // Generic fallback
  return (
    <pre
      className="text-xs overflow-auto max-h-32"
      style={{
        color: 'var(--shell-text)',
        fontFamily: 'monospace'
      }}
    >
      {JSON.stringify(parameters, null, 2)}
    </pre>
  );
}
