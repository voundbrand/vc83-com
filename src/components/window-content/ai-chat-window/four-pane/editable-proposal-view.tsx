"use client"

import { useState } from "react"
import { Code2, FileText, AlertTriangle } from "lucide-react"
import { ProjectForm } from "@/components/forms/project-form"
import { MilestoneForm } from "@/components/forms/milestone-form"
import { ContactForm } from "@/components/forms/contact-form"
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
  showJson: boolean
  onToggleJson: () => void
  onApprove: (executionId: Id<"aiToolExecutions">, dontAskAgain: boolean, editedParams?: ToolParameters) => void
  onReject: (executionId: Id<"aiToolExecutions">) => void
  onCustomInstruction?: (executionId: Id<"aiToolExecutions">, instruction: string) => void
}

export function EditableProposalView({
  execution,
  showJson,
  onToggleJson,
  onApprove,
  onReject,
  onCustomInstruction,
}: EditableProposalViewProps) {
  const [editMode, setEditMode] = useState(false) // Start in review mode
  const [editedParams, setEditedParams] = useState(execution.parameters)
  const [hasChanges, setHasChanges] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Type-safe form change handlers that convert specific form data to ToolParameters
  const handleProjectFormChange = (values: { name: string; description?: string; status?: string; startDate?: string; endDate?: string; tags?: string[] }) => {
    const newParams: ToolParameters = { ...execution.parameters, ...values }
    setEditedParams(newParams)
    setHasChanges(JSON.stringify(newParams) !== JSON.stringify(execution.parameters))
  }

  const handleMilestoneFormChange = (values: { name: string; description?: string; dueDate?: string; status?: string; progress?: number }) => {
    const newParams: ToolParameters = { ...execution.parameters, ...values }
    setEditedParams(newParams)
    setHasChanges(JSON.stringify(newParams) !== JSON.stringify(execution.parameters))
  }

  const handleContactFormChange = (values: { name: string; email?: string; phone?: string; organization?: string; jobTitle?: string; location?: string; notes?: string }) => {
    const newParams: ToolParameters = { ...execution.parameters, ...values }
    setEditedParams(newParams)
    setHasChanges(JSON.stringify(newParams) !== JSON.stringify(execution.parameters))
  }

  const handleApprove = async (dontAskAgain: boolean = false) => {
    setIsLoading(true)
    await onApprove(execution._id, dontAskAgain, hasChanges ? editedParams : execution.parameters)
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

  // Determine which form to show based on tool name and action
  const getFormComponent = () => {
    const action = execution.parameters?.action || ""

    if (execution.toolName === "manage_projects") {
      if (action === "create_project") {
        return (
          <ProjectForm
            mode="create"
            initialValues={{
              name: execution.parameters.name || "",
              description: execution.parameters.description,
              status: execution.parameters.status,
              startDate: execution.parameters.startDate,
              endDate: execution.parameters.endDate,
            }}
            onChange={handleProjectFormChange}
            showJson={showJson}
          />
        )
      }

      if (action === "create_milestone") {
        return (
          <MilestoneForm
            mode="create"
            initialValues={{
              name: execution.parameters.name || "",
              description: execution.parameters.description,
              dueDate: execution.parameters.dueDate,
              status: execution.parameters.status,
              progress: execution.parameters.progress,
            }}
            onChange={handleMilestoneFormChange}
            showJson={showJson}
          />
        )
      }
    }

    if (execution.toolName === "manage_crm") {
      if (action === "create_contact") {
        return (
          <ContactForm
            mode="create"
            initialValues={{
              name: execution.parameters.name || "",
              email: execution.parameters.email,
              phone: execution.parameters.phone,
              organization: execution.parameters.organization,
              jobTitle: execution.parameters.jobTitle,
              location: execution.parameters.location,
              notes: execution.parameters.notes,
            }}
            onChange={handleContactFormChange}
            showJson={showJson}
          />
        )
      }
    }

    // Fallback: Show JSON for unsupported tools
    return (
      <pre
        className="text-xs p-3 rounded overflow-x-auto font-mono"
        style={{
          background: 'var(--win95-input-bg)',
          color: 'var(--win95-text)',
          border: '2px solid var(--win95-border)'
        }}
      >
        {JSON.stringify(execution.parameters, null, 2)}
      </pre>
    )
  }

  // Get read-only parameter preview (for review mode)
  const getParameterPreview = () => {
    const action = execution.parameters?.action || ""

    if (execution.toolName === "manage_projects") {
      if (action === "create_project") {
        return (
          <div className="space-y-2 text-sm" style={{ color: 'var(--win95-text)' }}>
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
          <div className="space-y-2 text-sm" style={{ color: 'var(--win95-text)' }}>
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
          <div className="space-y-2 text-sm" style={{ color: 'var(--win95-text)' }}>
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
          background: 'var(--win95-input-bg)',
          color: 'var(--win95-text)',
          border: '2px solid var(--win95-border)'
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
        className="flex items-center justify-between gap-2 p-3 border-b-2"
        style={{
          borderColor: 'var(--win95-border-dark)',
          background: 'var(--win95-title-bg)'
        }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
            {editMode ? "Edit Proposal" : "Review Proposal"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Mode Toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              background: editMode ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
              color: editMode ? 'white' : 'var(--win95-text)',
            }}
            onMouseEnter={(e) => {
              if (!editMode) {
                e.currentTarget.style.background = 'var(--win95-hover-light)'
              }
            }}
            onMouseLeave={(e) => {
              if (!editMode) {
                e.currentTarget.style.background = 'var(--win95-bg-light)'
              }
            }}
          >
            <FileText className="w-3 h-3" />
            {editMode ? "Review Mode" : "Edit Mode"}
          </button>

          {/* JSON Toggle (only in edit mode) */}
          {editMode && (
            <button
              onClick={onToggleJson}
              className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
              style={{
                borderColor: 'var(--win95-border)',
                background: showJson ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
                color: showJson ? 'white' : 'var(--win95-text)',
              }}
              onMouseEnter={(e) => {
                if (!showJson) {
                  e.currentTarget.style.background = 'var(--win95-hover-light)'
                }
              }}
              onMouseLeave={(e) => {
                if (!showJson) {
                  e.currentTarget.style.background = 'var(--win95-bg-light)'
                }
              }}
            >
              <Code2 className="w-3 h-3" />
              {showJson ? "Form View" : "JSON View"}
            </button>
          )}
        </div>
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
                <p className="text-xs" style={{ color: 'var(--win95-text)' }}>
                  {execution.proposalMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tool Name */}
        <div className="mb-4">
          <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
            Tool: <span className="font-mono" style={{ color: 'var(--win95-text)' }}>{execution.toolName}</span>
          </p>
          <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
            Action: <span className="font-mono" style={{ color: 'var(--win95-text)' }}>{String(execution.parameters?.action || "N/A")}</span>
          </p>
        </div>

        {/* Parameters: Review or Edit Mode */}
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
            {editMode && hasChanges ? "✏️ Modified Parameters" : "Parameters"}
          </p>

          {editMode ? (
            // Edit Mode: Show editable forms
            getFormComponent()
          ) : (
            // Review Mode: Show read-only preview
            <div
              className="p-3 rounded border-2"
              style={{
                background: 'var(--win95-bg)',
                borderColor: 'var(--win95-border)'
              }}
            >
              {getParameterPreview()}
            </div>
          )}
        </div>

        {/* Change Indicator (only in edit mode) */}
        {editMode && hasChanges && !showJson && (
          <div
            className="p-2 border-2 rounded text-xs"
            style={{
              borderColor: 'var(--warning)',
              background: 'var(--warning-bg)',
              color: 'var(--warning)'
            }}
          >
            ⚠️ You have modified the AI's proposal. The tool will execute with your changes.
          </div>
        )}
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
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-input-bg)',
              color: 'var(--win95-text)'
            }}
            rows={3}
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customText.trim() || isLoading}
            className="mt-2 px-3 py-1 rounded text-xs disabled:opacity-50 border-2"
            style={{
              background: 'var(--win95-highlight)',
              color: 'white',
              borderColor: 'var(--win95-highlight)'
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
          borderColor: 'var(--win95-border-dark)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <button
          onClick={() => handleApprove(false)}
          disabled={isLoading}
          className="w-full px-4 py-2 text-left rounded border-2 transition-colors disabled:opacity-50 text-sm"
          style={{
            borderColor: 'var(--win95-highlight)',
            background: 'var(--win95-highlight-subtle)',
            color: 'var(--win95-text)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = 'var(--win95-hover-light)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--win95-highlight-subtle)';
          }}
        >
          <span className="font-bold" style={{ color: 'var(--win95-highlight)' }}>1</span>
          {" "}Yes{hasChanges ? " (with edits)" : ""}
        </button>

        <button
          onClick={() => handleApprove(true)}
          disabled={isLoading}
          className="w-full px-4 py-2 text-left rounded border transition-colors disabled:opacity-50 text-sm"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)',
            color: 'var(--win95-text)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = 'var(--win95-hover-light)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--win95-bg)';
          }}
        >
          <span className="font-bold" style={{ color: 'var(--win95-text-muted)' }}>2</span>
          {" "}Yes, and don't ask again
        </button>

        <button
          onClick={handleReject}
          disabled={isLoading}
          className="w-full px-4 py-2 text-left rounded border transition-colors disabled:opacity-50 text-sm"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)',
            color: 'var(--win95-text)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = 'var(--win95-hover-light)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--win95-bg)';
          }}
        >
          <span className="font-bold" style={{ color: 'var(--win95-text-muted)' }}>3</span>
          {" "}No
        </button>

        {onCustomInstruction && (
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            disabled={isLoading}
            className="w-full px-4 py-2 text-left rounded border transition-colors disabled:opacity-50 text-xs"
            style={{
              borderColor: 'var(--win95-border-light)',
              background: 'var(--win95-bg)',
              color: 'var(--win95-text-muted)'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = 'var(--win95-hover-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--win95-bg)';
            }}
          >
            Tell the AI what to do instead
          </button>
        )}
      </div>
    </div>
  )
}
