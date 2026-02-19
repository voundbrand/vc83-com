"use client"

import { useState } from "react"
import { FileText, AlertTriangle } from "lucide-react"
import type { Id } from "../../../../../convex/_generated/dataModel"

// Type for tool execution parameters with common fields
interface ToolParameters {
  action?: string
  name?: string
  description?: string
  status?: string
  startDate?: string
  endDate?: string
  dueDate?: string
  progress?: number
  email?: string
  phone?: string
  organization?: string
  jobTitle?: string
  location?: string
  notes?: string
  [key: string]: unknown
}

interface ToolExecution {
  _id: Id<"aiToolExecutions">
  toolName: string
  parameters: ToolParameters
  proposalMessage?: string
  status: string
}

interface EditableProposalViewProps {
  execution: ToolExecution
  onApprove: (executionId: Id<"aiToolExecutions">, dontAskAgain: boolean) => void
  onReject: (executionId: Id<"aiToolExecutions">) => void
  onCustomInstruction?: (executionId: Id<"aiToolExecutions">, instruction: string) => void
}

export function EditableProposalView({
  execution,
  onApprove,
  onReject,
  onCustomInstruction,
}: EditableProposalViewProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleApprove = async (dontAskAgain: boolean = false) => {
    setIsLoading(true)
    await onApprove(execution._id, dontAskAgain)
    setIsLoading(false)
  }

  const handleReject = async () => {
    setIsLoading(true)
    await onReject(execution._id)
    setIsLoading(false)
  }

  const handleCustomSubmit = async () => {
    if (!customText.trim() || !onCustomInstruction) return
    setIsLoading(true)
    await onCustomInstruction(execution._id, customText)
    setCustomText("")
    setShowCustomInput(false)
    setIsLoading(false)
  }

  // Get read-only parameter preview
  const getParameterPreview = () => {
    const action = execution.parameters?.action || ""

    if (execution.toolName === "manage_projects") {
      if (action === "create_project") {
        return (
          <div className="space-y-2 text-sm" style={{ color: 'var(--shell-text)' }}>
            <div>
              <span className="font-semibold">Name:</span> {String(execution.parameters.name || "N/A")}
            </div>
            {execution.parameters.description && (
              <div>
                <span className="font-semibold">Description:</span> {String(execution.parameters.description)}
              </div>
            )}
            {execution.parameters.status && (
              <div>
                <span className="font-semibold">Status:</span> {String(execution.parameters.status)}
              </div>
            )}
            {execution.parameters.startDate && (
              <div>
                <span className="font-semibold">Start Date:</span> {new Date(String(execution.parameters.startDate)).toLocaleDateString()}
              </div>
            )}
            {execution.parameters.endDate && (
              <div>
                <span className="font-semibold">End Date:</span> {new Date(String(execution.parameters.endDate)).toLocaleDateString()}
              </div>
            )}
          </div>
        )
      }

      if (action === "create_milestone") {
        return (
          <div className="space-y-2 text-sm" style={{ color: 'var(--shell-text)' }}>
            <div>
              <span className="font-semibold">Name:</span> {String(execution.parameters.name || "N/A")}
            </div>
            {execution.parameters.description && (
              <div>
                <span className="font-semibold">Description:</span> {String(execution.parameters.description)}
              </div>
            )}
            {execution.parameters.dueDate && (
              <div>
                <span className="font-semibold">Due Date:</span> {new Date(String(execution.parameters.dueDate)).toLocaleDateString()}
              </div>
            )}
            {execution.parameters.status && (
              <div>
                <span className="font-semibold">Status:</span> {String(execution.parameters.status)}
              </div>
            )}
            {execution.parameters.progress !== undefined && (
              <div>
                <span className="font-semibold">Progress:</span> {String(execution.parameters.progress)}%
              </div>
            )}
          </div>
        )
      }
    }

    if (execution.toolName === "manage_crm") {
      if (action === "create_contact") {
        return (
          <div className="space-y-2 text-sm" style={{ color: 'var(--shell-text)' }}>
            <div>
              <span className="font-semibold">Name:</span> {String(execution.parameters.name || "N/A")}
            </div>
            {execution.parameters.email && (
              <div>
                <span className="font-semibold">Email:</span> {String(execution.parameters.email)}
              </div>
            )}
            {execution.parameters.phone && (
              <div>
                <span className="font-semibold">Phone:</span> {String(execution.parameters.phone)}
              </div>
            )}
            {execution.parameters.organization && (
              <div>
                <span className="font-semibold">Organization:</span> {String(execution.parameters.organization)}
              </div>
            )}
            {execution.parameters.jobTitle && (
              <div>
                <span className="font-semibold">Job Title:</span> {String(execution.parameters.jobTitle)}
              </div>
            )}
            {execution.parameters.location && (
              <div>
                <span className="font-semibold">Location:</span> {String(execution.parameters.location)}
              </div>
            )}
            {execution.parameters.notes && (
              <div>
                <span className="font-semibold">Notes:</span> {String(execution.parameters.notes)}
              </div>
            )}
          </div>
        )
      }
    }

    // Fallback: Show formatted JSON
    return (
      <pre
        className="text-xs p-3 rounded overflow-x-auto font-mono"
        style={{
          background: 'var(--shell-input-surface)',
          color: 'var(--shell-text)',
          border: '2px solid var(--shell-border)'
        }}
      >
        {JSON.stringify(execution.parameters, null, 2)}
      </pre>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2 p-3 border-b-2"
        style={{
          borderColor: 'var(--shell-border-strong)',
          background: 'var(--shell-title-bg)'
        }}
      >
        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--shell-text)' }}>
          Review Proposal
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* AI's Proposal Message */}
        {execution.proposalMessage && (
          <div
            className="mb-4 p-3 border-2 rounded"
            style={{
              borderColor: 'var(--info)',
              background: 'var(--info-bg)',
            }}
          >
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--info)' }} />
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--info)' }}>
                  AI Proposal
                </p>
                <p className="text-xs" style={{ color: 'var(--shell-text)' }}>
                  {execution.proposalMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tool Name */}
        <div className="mb-4">
          <p className="text-xs" style={{ color: 'var(--shell-text-dim)' }}>
            Tool: <span className="font-mono" style={{ color: 'var(--shell-text)' }}>{execution.toolName}</span>
          </p>
          <p className="text-xs" style={{ color: 'var(--shell-text-dim)' }}>
            Action: <span className="font-mono" style={{ color: 'var(--shell-text)' }}>{String(execution.parameters?.action || "N/A")}</span>
          </p>
        </div>

        {/* Parameters */}
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--shell-text)' }}>
            Parameters
          </p>
          <div
            className="p-3 rounded border-2"
            style={{
              background: 'var(--shell-surface)',
              borderColor: 'var(--shell-border)'
            }}
          >
            {getParameterPreview()}
          </div>
        </div>
      </div>

      {/* Custom Instruction Input */}
      {showCustomInput && (
        <div className="px-4 pb-3">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Tell the AI what to do instead..."
            className="w-full p-2 border-2 rounded text-xs"
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
            className="mt-2 px-3 py-1 rounded text-xs disabled:opacity-50 border-2"
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

      {/* Actions */}
      <div
        className="p-3 border-t-2 space-y-2"
        style={{
          borderColor: 'var(--shell-border-strong)',
          background: 'var(--shell-surface-elevated)'
        }}
      >
        <button
          onClick={() => handleApprove(false)}
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
          onClick={() => handleApprove(true)}
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
          onClick={handleReject}
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
  )
}
