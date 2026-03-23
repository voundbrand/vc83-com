"use client"

import { FileQuestion, X, AlertTriangle } from "lucide-react"
import { WorkItemDetail } from "../three-pane/work-item-detail"
import { EditableProposalView } from "./editable-proposal-view"
import { AISettingsView } from "./ai-settings-view"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useQuery, useMutation } from "convex/react"
import { useNotification } from "@/hooks/use-notification"
import { useAuth } from "@/hooks/use-auth"
import type { Id } from "../../../../../convex/_generated/dataModel"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../../../../convex/_generated/api").api

interface WorkItem {
  id: Id<"contactSyncs"> | Id<"emailCampaigns"> | Id<"aiWorkItems">;
  type: "contact_sync" | "email_campaign" | `ai_${string}`;
  name: string;
  status: string;
  createdAt: number;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

interface ToolExecution {
  id: string
  _id?: Id<"aiToolExecutions">
  toolName: string
  status: "proposed" | "approved" | "executing" | "running" | "success" | "error" | "rejected" | "cancelled"
  startTime?: Date
  endTime?: Date
  input?: Record<string, unknown>
  parameters?: Record<string, unknown>
  output?: unknown
  error?: string
  isMinimized?: boolean
  proposalMessage?: string
}

interface DetailViewProps {
  selectedWorkItem: WorkItem | null;
  onClearSelection: () => void;
  selectedToolExecution: ToolExecution | null;
  onClearToolExecution: () => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export function DetailView({ selectedWorkItem, onClearSelection, selectedToolExecution, onClearToolExecution, showSettings, onCloseSettings }: DetailViewProps) {
  const { currentConversationId } = useAIChatContext()
  const { sessionId } = useAuth()
  const notification = useNotification()
  const selectedExecutionId = selectedToolExecution
    ? (selectedToolExecution._id || selectedToolExecution.id as Id<"aiToolExecutions">)
    : null
  // Query pending tool executions (approval prompts)
  const pendingExecutions = (useQuery as any)(
    generatedApi.ai.conversations.getPendingToolExecutions,
    currentConversationId ? { conversationId: currentConversationId } : "skip"
  ) as
    | Array<{
        _id: Id<"aiToolExecutions">
        toolName: string
        parameters: Record<string, unknown>
        proposalMessage?: string
        status: ToolExecution["status"]
      }>
    | undefined

  // Mutations for approval/rejection
  const approveExecution = (useMutation as any)(
    generatedApi.ai.conversations.approveToolExecution
  ) as (args: { executionId: Id<"aiToolExecutions">; dontAskAgain?: boolean }) => Promise<unknown>
  const rejectExecution = (useMutation as any)(
    generatedApi.ai.conversations.rejectToolExecution
  ) as (args: { executionId: Id<"aiToolExecutions"> }) => Promise<unknown>
  const customInstruction = (useMutation as any)(
    generatedApi.ai.conversations.customInstructionForExecution
  ) as (args: { executionId: Id<"aiToolExecutions">; instruction: string }) => Promise<unknown>
  const updateExecutionParameters = (useMutation as any)(
    generatedApi.ai.conversations.updateToolExecutionParameters
  ) as (args: {
    executionId: Id<"aiToolExecutions">
    parameters: Record<string, unknown>
    proposalMessage?: string
  }) => Promise<unknown>
  const previewAgentFieldPatch = (useMutation as any)(
    generatedApi.agentOntology.previewAgentFieldPatch
  ) as (args: {
    sessionId: string
    agentId: Id<"objects">
    patch: unknown
    overridePolicyGate?: {
      confirmWarnOverride?: boolean
      reason?: string
    }
  }) => Promise<{ proposalMessage?: string }>

  const resolveExecution = (executionId: Id<"aiToolExecutions">) => {
    if (
      selectedToolExecution
      && (selectedToolExecution._id || selectedToolExecution.id) === executionId
    ) {
      return selectedToolExecution
    }
    return pendingExecutions?.find((execution) => execution._id === executionId) || null
  }

  const handleApprove = async (executionId: Id<"aiToolExecutions">, dontAskAgain: boolean) => {
    try {
      await approveExecution({ executionId, dontAskAgain })
      notification.success(
        "Approved",
        dontAskAgain
          ? "Action approved. Similar actions will run automatically."
          : "Action approved and executing..."
      )
    } catch (error) {
      notification.error(
        "Approval Failed",
        error instanceof Error ? error.message : "Failed to approve action"
      )
    }
  }

  const handleReject = async (executionId: Id<"aiToolExecutions">) => {
    try {
      await rejectExecution({ executionId })
      notification.info("Rejected", "Action has been cancelled")
      onClearToolExecution() // Clear selection after rejection
    } catch (error) {
      notification.error(
        "Rejection Failed",
        error instanceof Error ? error.message : "Failed to reject action"
      )
    }
  }

  const handleCustomInstruction = async (executionId: Id<"aiToolExecutions">, instruction: string) => {
    try {
      await customInstruction({ executionId, instruction })
      notification.info("Custom Instruction", "Your instruction has been sent to the AI")
    } catch (error) {
      notification.error(
        "Failed",
        error instanceof Error ? error.message : "Failed to send instruction"
      )
    }
  }

  const handleUpdateParameters = async (
    executionId: Id<"aiToolExecutions">,
    parameters: Record<string, unknown>
  ) => {
    try {
      const execution = resolveExecution(executionId)
      let nextParameters = parameters
      let nextProposalMessage: string | undefined

      if (execution?.toolName === "configure_agent_fields") {
        if (!sessionId) {
          throw new Error("Session required to refresh agent field proposals")
        }
        const targetAgentId =
          typeof parameters.targetAgentId === "string"
            ? parameters.targetAgentId
            : (
                parameters.proposalPreview as
                  | { targetAgentId?: string | null }
                  | undefined
              )?.targetAgentId
        if (!targetAgentId) {
          throw new Error("Target agent could not be resolved for this proposal")
        }

        const preview = await previewAgentFieldPatch({
          sessionId,
          agentId: targetAgentId as Id<"objects">,
          patch: parameters.patch ?? {},
          overridePolicyGate: parameters.overridePolicyGate as
            | { confirmWarnOverride?: boolean; reason?: string }
            | undefined,
        })

        nextParameters = {
          ...parameters,
          targetAgentId,
          proposalPreview: preview,
        }
        nextProposalMessage = preview.proposalMessage
      }

      await (updateExecutionParameters as any)({
        executionId,
        parameters: nextParameters,
        ...(nextProposalMessage !== undefined
          ? { proposalMessage: nextProposalMessage }
          : {}),
      })

      notification.success("Proposal Updated", "Approval preview refreshed")
      return {
        parameters: nextParameters,
        proposalMessage: nextProposalMessage,
      }
    } catch (error) {
      notification.error(
        "Update Failed",
        error instanceof Error ? error.message : "Failed to refresh proposal"
      )
      return undefined
    }
  }

  // Priority 1: Show selected tool execution (if clicked from panel)
  if (selectedToolExecution) {
    // Only show editable form for "proposed" executions
    // For other statuses (executing, success, error), show a read-only view
    if (selectedToolExecution.status === "proposed") {
      return (
        <EditableProposalView
          execution={{
            _id: selectedExecutionId as Id<"aiToolExecutions">,
            toolName: selectedToolExecution.toolName,
            parameters: selectedToolExecution.parameters || selectedToolExecution.input || {},
            proposalMessage: selectedToolExecution.proposalMessage,
            status: selectedToolExecution.status
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          onCustomInstruction={handleCustomInstruction}
          onUpdateParameters={handleUpdateParameters}
        />
      )
    } else {
      // Show read-only execution details for non-proposed executions
      return (
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between gap-2 p-3 border-b"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--desktop-shell-accent)'
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--window-document-text)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--window-document-text)' }}>
                Tool Execution Details
              </span>
            </div>
            <button
              onClick={onClearToolExecution}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-4 h-4" style={{ color: 'var(--window-document-text-muted)' }} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                  Tool Name
                </p>
                <p className="text-sm font-mono" style={{ color: 'var(--window-document-text-muted)' }}>
                  {selectedToolExecution.toolName}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                  Status
                </p>
                <span
                  className="inline-block px-2 py-1 rounded text-xs font-medium"
                  style={{
                    background: selectedToolExecution.status === "success" ? 'var(--success-bg)' :
                               selectedToolExecution.status === "error" ? 'var(--error-bg)' :
                               'var(--info-bg)',
                    color: selectedToolExecution.status === "success" ? 'var(--success)' :
                          selectedToolExecution.status === "error" ? 'var(--error)' :
                          'var(--info)',
                    border: `1px solid ${selectedToolExecution.status === "success" ? 'var(--success)' :
                                        selectedToolExecution.status === "error" ? 'var(--error)' :
                                        'var(--info)'}`
                  }}
                >
                  {selectedToolExecution.status.toUpperCase()}
                </span>
              </div>

              {selectedToolExecution.proposalMessage && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Proposal Message
                  </p>
                  <p className="text-sm" style={{ color: 'var(--window-document-text-muted)' }}>
                    {selectedToolExecution.proposalMessage}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
                  Parameters
                </p>
                <pre
                  className="text-xs p-3 rounded overflow-x-auto font-mono"
                  style={{
                    background: 'var(--window-document-bg)',
                    color: 'var(--window-document-text)',
                    border: '1px solid var(--window-document-border)'
                  }}
                >
                  {JSON.stringify(selectedToolExecution.parameters || selectedToolExecution.input || {}, null, 2)}
                </pre>
              </div>

              {selectedToolExecution.output !== undefined && selectedToolExecution.output !== null && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
                    Result
                  </p>
                  <div
                    className="p-3 rounded border"
                    style={{
                      background: 'var(--success-bg)',
                      borderColor: 'var(--success)',
                    }}
                  >
                    <pre
                      className="text-xs overflow-x-auto font-mono whitespace-pre-wrap break-words"
                      style={{
                        color: 'var(--window-document-text)',
                      }}
                    >
                      {typeof selectedToolExecution.output === 'string'
                        ? selectedToolExecution.output
                        : JSON.stringify(selectedToolExecution.output, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedToolExecution.error && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--error)' }}>
                    Error Details
                  </p>
                  <div
                    className="p-3 rounded border"
                    style={{
                      background: 'var(--error-bg)',
                      borderColor: 'var(--error)',
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--window-document-text)' }}>
                      {selectedToolExecution.error}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="p-3 border-t"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--desktop-shell-accent)'
            }}
          >
            <p className="text-xs text-center" style={{ color: 'var(--window-document-text-muted)' }}>
              This execution has already been {selectedToolExecution.status === "success" ? "completed" : selectedToolExecution.status}.
              {selectedToolExecution.status === "success" && " Check the Work Items section for created items."}
            </p>
          </div>
        </div>
      )
    }
  }

  // Priority 2: Show approval prompts if there are pending executions (auto-display)
  if (pendingExecutions && pendingExecutions.length > 0) {
    // Show editable form for the first pending execution
    const currentExecution = pendingExecutions[0]

    return (
      <EditableProposalView
        execution={currentExecution}
        onApprove={handleApprove}
        onReject={handleReject}
        onCustomInstruction={handleCustomInstruction}
        onUpdateParameters={handleUpdateParameters}
      />
    )
  }

  // Priority 3: Show settings view if requested
  if (showSettings && onCloseSettings) {
    return <AISettingsView onClose={onCloseSettings} />
  }

  // Priority 4: Show work item detail if selected
  if (selectedWorkItem) {
    return (
      <div className="flex flex-col h-full">
        {/* Header with Close Button */}
        <div
          className="flex items-center justify-between gap-2 p-3 border-b"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--desktop-shell-accent)'
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileQuestion className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--window-document-text)' }} />
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--window-document-text)' }}>
              {selectedWorkItem.name}
            </span>
          </div>
          <button
            onClick={onClearSelection}
            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
            title="Close detail view"
          >
            <X className="w-4 h-4" style={{ color: 'var(--window-document-text-muted)' }} />
          </button>
        </div>

        {/* Detail Content (reuse existing WorkItemDetail component) */}
        <div className="flex-1 overflow-hidden">
          <WorkItemDetail
            item={selectedWorkItem}
            onActionComplete={onClearSelection}
          />
        </div>
      </div>
    )
  }

  // Priority 5: Empty state - nothing to show
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 p-3 border-b"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--desktop-shell-accent)'
        }}
      >
        <div className="flex items-center gap-2">
          <FileQuestion className="w-4 h-4" style={{ color: 'var(--window-document-text)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--window-document-text)' }}>
            Detail View
          </span>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <FileQuestion
          className="w-16 h-16 mb-4"
          style={{ color: 'var(--window-document-text-muted)' }}
        />
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
          No Item Selected
        </p>
        <p className="text-xs max-w-[250px]" style={{ color: 'var(--window-document-text-muted)' }}>
          Select a work item from the list or wait for AI actions to approve
        </p>
      </div>
    </div>
  )
}
