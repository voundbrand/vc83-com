"use client"

import { useEffect, useState } from "react"
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
  rationale?: string
  [key: string]: unknown
}

interface AgentFieldPatchPreviewChange {
  field: string
  label: string
  category: "supported" | "unsupported" | "deferred"
  applyStatus:
    | "ready"
    | "no_change"
    | "blocked_locked"
    | "blocked_warn_confirmation_required"
    | "unsupported"
    | "deferred"
  before: unknown
  after: unknown
  changed: boolean
  reason?: string
}

interface AgentFieldPatchPreview {
  targetAgentId?: string | null
  targetAgentName: string
  targetAgentDisplayName?: string
  changes: AgentFieldPatchPreviewChange[]
  summary?: {
    canApply?: boolean
    changedFieldCount?: number
    readyFieldCount?: number
    unsupportedFieldCount?: number
    deferredFieldCount?: number
    blockedReason?: string
  }
  overrideGate?: {
    decision?: string
    lockedFields?: string[]
    warnFields?: string[]
    freeFields?: string[]
    reason?: string | null
  }
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
  onUpdateParameters?: (
    executionId: Id<"aiToolExecutions">,
    parameters: ToolParameters,
  ) => Promise<
    | {
        parameters?: ToolParameters
        proposalMessage?: string
      }
    | void
  >
}

function readOverridePolicyGate(parameters: ToolParameters | undefined): {
  confirmWarnOverride: boolean
  reason: string
} {
  const gate =
    parameters?.overridePolicyGate
    && typeof parameters.overridePolicyGate === "object"
    && !Array.isArray(parameters.overridePolicyGate)
      ? parameters.overridePolicyGate as Record<string, unknown>
      : null
  return {
    confirmWarnOverride: gate?.confirmWarnOverride === true,
    reason: typeof gate?.reason === "string" ? gate.reason : "",
  }
}

function isAgentFieldPatchPreview(value: unknown): value is AgentFieldPatchPreview {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.targetAgentName === "string" && Array.isArray(record.changes)
}

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) return "None"
  if (typeof value === "string") return value || "(empty)"
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function formatOverrideGateMessage(
  overrideGate: AgentFieldPatchPreview["overrideGate"] | undefined
): string | null {
  if (!overrideGate) {
    return null
  }
  if (overrideGate.decision === "blocked_locked" && overrideGate.lockedFields?.length) {
    return `Managed-clone policy locked: ${overrideGate.lockedFields.join(", ")}.`
  }
  if (
    overrideGate.decision === "blocked_warn_confirmation_required"
    && overrideGate.warnFields?.length
  ) {
    return `Managed-clone override confirmation required: ${overrideGate.warnFields.join(", ")}.`
  }
  if (overrideGate.decision === "allow" && overrideGate.warnFields?.length) {
    return `Warn-gated override acknowledged: ${overrideGate.warnFields.join(", ")}.`
  }
  return null
}

export function EditableProposalView({
  execution,
  onApprove,
  onReject,
  onCustomInstruction,
  onUpdateParameters,
}: EditableProposalViewProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [draftParameters, setDraftParameters] = useState(execution.parameters)
  const [draftProposalMessage, setDraftProposalMessage] = useState(
    execution.proposalMessage
  )
  const initialOverrideGate = readOverridePolicyGate(draftParameters)
  const [overrideWarnConfirmed, setOverrideWarnConfirmed] = useState(
    initialOverrideGate.confirmWarnOverride
  )
  const [overrideWarnReason, setOverrideWarnReason] = useState(
    initialOverrideGate.reason
  )
  const agentFieldPatchPreview = isAgentFieldPatchPreview(
    draftParameters?.proposalPreview
  )
    ? draftParameters.proposalPreview
    : null
  const approvalBlockedReason =
    agentFieldPatchPreview?.summary?.canApply === false
      ? agentFieldPatchPreview.summary.blockedReason || "This patch cannot be applied yet."
      : null
  const proposalRationale =
    typeof draftParameters?.rationale === "string" && draftParameters.rationale.trim().length > 0
      ? draftParameters.rationale.trim()
      : null
  const overrideGateMessage = formatOverrideGateMessage(
    agentFieldPatchPreview?.overrideGate
  )
  const requiresWarnOverrideConfirmation =
    execution.toolName === "configure_agent_fields"
    && agentFieldPatchPreview?.overrideGate?.decision === "blocked_warn_confirmation_required"
    && (agentFieldPatchPreview.overrideGate.warnFields?.length ?? 0) > 0
  const canRefreshWarnOverride =
    requiresWarnOverrideConfirmation
    && overrideWarnConfirmed
    && overrideWarnReason.trim().length > 0
    && Boolean(onUpdateParameters)

  useEffect(() => {
    setDraftParameters(execution.parameters)
    setDraftProposalMessage(execution.proposalMessage)
  }, [execution._id, execution.parameters, execution.proposalMessage])

  useEffect(() => {
    const nextOverrideGate = readOverridePolicyGate(draftParameters)
    setOverrideWarnConfirmed(nextOverrideGate.confirmWarnOverride)
    setOverrideWarnReason(nextOverrideGate.reason)
  }, [draftParameters])

  const handleApprove = async (dontAskAgain: boolean = false) => {
    if (approvalBlockedReason) return
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

  const handleWarnOverrideRefresh = async () => {
    if (!canRefreshWarnOverride || !onUpdateParameters) return
    setIsLoading(true)
    const nextParameters = {
      ...draftParameters,
      overridePolicyGate: {
        confirmWarnOverride: true,
        reason: overrideWarnReason.trim(),
      },
    }
    const updateResult = await onUpdateParameters(execution._id, nextParameters)
    setDraftParameters(updateResult?.parameters || nextParameters)
    if (updateResult?.proposalMessage !== undefined) {
      setDraftProposalMessage(updateResult.proposalMessage)
    }
    setIsLoading(false)
  }

  // Get read-only parameter preview
  const getParameterPreview = () => {
    const action = draftParameters?.action || ""

    if (execution.toolName === "configure_agent_fields" && agentFieldPatchPreview) {
      return (
        <div className="space-y-3">
          <div className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
            Target agent:{" "}
            <span style={{ color: "var(--shell-text)" }}>
              {agentFieldPatchPreview.targetAgentDisplayName || agentFieldPatchPreview.targetAgentName}
            </span>
          </div>
          <div className="space-y-2">
            {agentFieldPatchPreview.changes.map((change) => {
              const statusColor =
                change.applyStatus === "ready" ? "var(--success)" :
                change.applyStatus === "no_change" ? "var(--shell-text-dim)" :
                change.applyStatus === "deferred" ? "var(--warning)" :
                "var(--error)"
              const statusBg =
                change.applyStatus === "ready" ? "var(--success-bg)" :
                change.applyStatus === "no_change" ? "var(--shell-surface-elevated)" :
                change.applyStatus === "deferred" ? "var(--warning-bg)" :
                "var(--error-bg)"
              return (
                <div
                  key={change.field}
                  className="rounded border p-2"
                  style={{
                    borderColor: "var(--shell-border)",
                    background: "var(--shell-input-surface)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                      {change.label}
                    </div>
                    <span
                      className="rounded px-2 py-0.5 text-[10px] uppercase"
                      style={{ color: statusColor, background: statusBg }}
                    >
                      {change.applyStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-[10px] uppercase" style={{ color: "var(--shell-text-dim)" }}>
                        Current
                      </div>
                      <pre
                        className="whitespace-pre-wrap break-words rounded p-2 text-[11px]"
                        style={{
                          background: "var(--shell-surface)",
                          color: "var(--shell-text)",
                        }}
                      >
                        {formatPreviewValue(change.before)}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] uppercase" style={{ color: "var(--shell-text-dim)" }}>
                        Proposed
                      </div>
                      <pre
                        className="whitespace-pre-wrap break-words rounded p-2 text-[11px]"
                        style={{
                          background: "var(--shell-surface)",
                          color: "var(--shell-text)",
                        }}
                      >
                        {formatPreviewValue(change.after)}
                      </pre>
                    </div>
                  </div>
                  {change.reason && (
                    <p className="mt-2 text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
                      {change.reason}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (execution.toolName === "manage_projects") {
      if (action === "create_project") {
        return (
          <div className="space-y-2 text-sm" style={{ color: 'var(--shell-text)' }}>
            <div>
              <span className="font-semibold">Name:</span> {String(draftParameters.name || "N/A")}
            </div>
            {draftParameters.description && (
              <div>
                <span className="font-semibold">Description:</span> {String(draftParameters.description)}
              </div>
            )}
            {draftParameters.status && (
              <div>
                <span className="font-semibold">Status:</span> {String(draftParameters.status)}
              </div>
            )}
            {draftParameters.startDate && (
              <div>
                <span className="font-semibold">Start Date:</span> {new Date(String(draftParameters.startDate)).toLocaleDateString()}
              </div>
            )}
            {draftParameters.endDate && (
              <div>
                <span className="font-semibold">End Date:</span> {new Date(String(draftParameters.endDate)).toLocaleDateString()}
              </div>
            )}
          </div>
        )
      }

      if (action === "create_milestone") {
        return (
          <div className="space-y-2 text-sm" style={{ color: 'var(--shell-text)' }}>
            <div>
              <span className="font-semibold">Name:</span> {String(draftParameters.name || "N/A")}
            </div>
            {draftParameters.description && (
              <div>
                <span className="font-semibold">Description:</span> {String(draftParameters.description)}
              </div>
            )}
            {draftParameters.dueDate && (
              <div>
                <span className="font-semibold">Due Date:</span> {new Date(String(draftParameters.dueDate)).toLocaleDateString()}
              </div>
            )}
            {draftParameters.status && (
              <div>
                <span className="font-semibold">Status:</span> {String(draftParameters.status)}
              </div>
            )}
            {draftParameters.progress !== undefined && (
              <div>
                <span className="font-semibold">Progress:</span> {String(draftParameters.progress)}%
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
              <span className="font-semibold">Name:</span> {String(draftParameters.name || "N/A")}
            </div>
            {draftParameters.email && (
              <div>
                <span className="font-semibold">Email:</span> {String(draftParameters.email)}
              </div>
            )}
            {draftParameters.phone && (
              <div>
                <span className="font-semibold">Phone:</span> {String(draftParameters.phone)}
              </div>
            )}
            {draftParameters.organization && (
              <div>
                <span className="font-semibold">Organization:</span> {String(draftParameters.organization)}
              </div>
            )}
            {draftParameters.jobTitle && (
              <div>
                <span className="font-semibold">Job Title:</span> {String(draftParameters.jobTitle)}
              </div>
            )}
            {draftParameters.location && (
              <div>
                <span className="font-semibold">Location:</span> {String(draftParameters.location)}
              </div>
            )}
            {draftParameters.notes && (
              <div>
                <span className="font-semibold">Notes:</span> {String(draftParameters.notes)}
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
        {JSON.stringify(draftParameters, null, 2)}
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
        {draftProposalMessage && (
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
                  {draftProposalMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {proposalRationale && (
          <div
            className="mb-4 rounded border p-3"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-input-surface)",
            }}
          >
            <p className="mb-1 text-[11px] font-semibold" style={{ color: "var(--shell-text)" }}>
              Rationale
            </p>
            <p className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
              {proposalRationale}
            </p>
          </div>
        )}

        {/* Tool Name */}
        <div className="mb-4">
          <p className="text-xs" style={{ color: 'var(--shell-text-dim)' }}>
            Tool: <span className="font-mono" style={{ color: 'var(--shell-text)' }}>{execution.toolName}</span>
          </p>
          <p className="text-xs" style={{ color: 'var(--shell-text-dim)' }}>
            Action: <span className="font-mono" style={{ color: 'var(--shell-text)' }}>
              {execution.toolName === "configure_agent_fields"
                ? "agent_field_patch"
                : String(draftParameters?.action || "N/A")}
            </span>
          </p>
        </div>

        {agentFieldPatchPreview?.summary && (
          <div
            className="mb-4 rounded border p-3 text-[11px]"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-surface)",
              color: "var(--shell-text-dim)",
            }}
          >
            Ready {agentFieldPatchPreview.summary.readyFieldCount ?? 0}
            {" · "}
            Changed {agentFieldPatchPreview.summary.changedFieldCount ?? 0}
            {" · "}
            Deferred {agentFieldPatchPreview.summary.deferredFieldCount ?? 0}
            {" · "}
            Unsupported {agentFieldPatchPreview.summary.unsupportedFieldCount ?? 0}
          </div>
        )}

        {approvalBlockedReason && (
          <div
            className="mb-4 rounded border-2 p-3 text-xs"
            style={{
              borderColor: "var(--warning)",
              background: "var(--warning-bg)",
              color: "var(--shell-text)",
            }}
          >
            {approvalBlockedReason}
          </div>
        )}

        {overrideGateMessage && (
          <div
            className="mb-4 rounded border p-3 text-xs"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-surface)",
              color: "var(--shell-text)",
            }}
          >
            {overrideGateMessage}
          </div>
        )}

        {requiresWarnOverrideConfirmation && (
          <div
            className="mb-4 rounded border-2 p-3 text-xs space-y-3"
            style={{
              borderColor: "var(--warning)",
              background: "var(--warning-bg)",
              color: "var(--shell-text)",
            }}
          >
            <p>
              Warn-gated managed-clone overrides require explicit confirmation and a reason before approval.
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={overrideWarnConfirmed}
                onChange={(event) => setOverrideWarnConfirmed(event.target.checked)}
                aria-label="Confirm warn policy override"
              />
              <span>I confirm this warn override.</span>
            </label>
            <div>
              <label
                htmlFor="proposal-override-reason"
                className="mb-1 block text-[11px]"
                style={{ color: "var(--shell-text-dim)" }}
              >
                Override reason
              </label>
              <input
                id="proposal-override-reason"
                value={overrideWarnReason}
                onChange={(event) => setOverrideWarnReason(event.target.value)}
                className="w-full rounded border px-2 py-1 text-xs"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-text)",
                }}
                placeholder="Explain why this override is needed"
              />
            </div>
            <button
              onClick={handleWarnOverrideRefresh}
              disabled={isLoading || !canRefreshWarnOverride}
              className="rounded border px-3 py-1.5 text-xs disabled:opacity-50"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-surface)",
                color: "var(--shell-text)",
              }}
            >
              Refresh Proposal With Override
            </button>
          </div>
        )}

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
            {execution.toolName === "configure_agent_fields"
              && agentFieldPatchPreview
              && agentFieldPatchPreview.changes.length === 0 && (
                <p className="mt-3 text-xs" style={{ color: "var(--shell-text-dim)" }}>
                  No structured field diff is available for this proposal. Review the blocked reason and ask the AI to
                  regenerate the patch within a target-agent-scoped chat.
                </p>
              )}
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
          disabled={isLoading || Boolean(approvalBlockedReason)}
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
          disabled={isLoading || Boolean(approvalBlockedReason)}
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
