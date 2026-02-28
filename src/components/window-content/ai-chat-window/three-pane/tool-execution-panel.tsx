"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { Wrench, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, PanelRightClose } from "lucide-react"
import { type ReactNode, useState } from "react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useNotification } from "@/hooks/use-notification"
import {
  buildFrontlineFeatureIntakeKickoff,
  summarizeToolBoundaryContext,
} from "@/lib/ai/frontline-feature-intake"
import { useQuery } from "convex/react"
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../../convex/_generated/api") as { api: any }

interface ToolExecution {
  id: string
  toolName: string
  status: "proposed" | "approved" | "executing" | "running" | "success" | "error" | "rejected" | "cancelled"
  startTime: Date
  endTime?: Date
  input: Record<string, unknown>
  output?: unknown
  error?: string
}

interface ToolExecutionItemProps {
  execution: ToolExecution
}

function ToolExecutionItem({ execution }: ToolExecutionItemProps): ReactNode {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const [isExpanded, setIsExpanded] = useState(false)

  const statusConfig = {
    proposed: {
      icon: Loader2,
      color: 'var(--warning)',
      bgColor: 'var(--warning-bg)',
      animate: false
    },
    approved: {
      icon: CheckCircle2,
      color: 'var(--success)',
      bgColor: 'var(--success-bg)',
      animate: false
    },
    executing: {
      icon: Loader2,
      color: 'var(--info)',
      bgColor: 'var(--info-bg)',
      animate: true
    },
    running: {
      icon: Loader2,
      color: 'var(--shell-text-dim)',
      bgColor: 'transparent',
      animate: true
    },
    success: {
      icon: CheckCircle2,
      color: 'var(--success)',
      bgColor: 'var(--success-bg)',
      animate: false
    },
    error: {
      icon: XCircle,
      color: 'var(--error)',
      bgColor: 'var(--error-bg)',
      animate: false
    },
    rejected: {
      icon: XCircle,
      color: 'var(--shell-text-dim)',
      bgColor: 'var(--shell-surface-elevated)',
      animate: false
    },
    cancelled: {
      icon: XCircle,
      color: 'var(--shell-text-dim)',
      bgColor: 'var(--shell-surface-elevated)',
      animate: false
    }
  }

  const config = statusConfig[execution.status]
  const StatusIcon = config.icon

  const duration = execution.endTime
    ? Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)
    : null
  const statusLabel =
    execution.status === "proposed"
      ? "Pending approval"
      : execution.status === "approved"
        ? "Approved"
        : execution.status === "executing"
          ? "Executing"
          : execution.status === "rejected"
            ? "Rejected"
            : execution.status === "cancelled"
              ? "Cancelled"
              : execution.status === "success"
                ? "Success"
                : execution.status === "error"
                  ? "Failed"
                  : t("ui.ai_assistant.tool.running")

  return (
    <div
      className="border rounded mb-2"
      style={{
        borderColor: 'var(--shell-border-soft)',
        background: config.bgColor
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-2 hover-menu-item transition-colors"
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" style={{ color: 'var(--shell-text)' }} />
          ) : (
            <ChevronRight className="w-3 h-3" style={{ color: 'var(--shell-text)' }} />
          )}
        </div>
        <StatusIcon
          className={`w-4 h-4 flex-shrink-0 ${config.animate ? 'animate-spin' : ''}`}
          style={{ color: config.color }}
        />
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--shell-text)' }}>
            {execution.toolName}
          </p>
          <p className="text-xs" style={{ color: 'var(--shell-text-dim)' }}>
            {duration !== null
              ? `${duration}s`
              : statusLabel}
          </p>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded ? (
        <div
          className="px-2 pb-2 space-y-2 border-t"
          style={{ borderColor: 'var(--shell-border-soft)' }}
        >
          {/* @ts-expect-error - Translation hook return type needs refinement in Phase 3 */}
          {/* Input */}
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--shell-text)' }}>
              {t("ui.ai_assistant.tool.input")}
            </p>
            <pre
              className="text-xs p-2 rounded overflow-x-auto"
              style={{
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-text)'
              }}
            >
              {JSON.stringify(execution.input as Record<string, string | number | boolean>, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {execution.output && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--shell-text)' }}>
                {t("ui.ai_assistant.tool.output")}
              </p>
              <pre
                className="text-xs p-2 rounded overflow-x-auto"
                style={{
                  background: 'var(--shell-input-surface)',
                  color: 'var(--shell-text)'
                }}
              >
                {typeof execution.output === 'string'
                  ? execution.output
                  : JSON.stringify(execution.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {execution.error && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--error)' }}>
                {t("ui.ai_assistant.tool.error")}
              </p>
              <p className="text-xs p-2 rounded" style={{
                background: 'var(--error-bg)',
                color: 'var(--error)'
              }}>
                {execution.error}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

interface ToolExecutionPanelProps {
  onClose?: () => void
}

export function ToolExecutionPanel({ onClose }: ToolExecutionPanelProps) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const {
    chat,
    currentConversationId,
    organizationId,
    setCurrentConversationId,
    isSending,
    setIsSending,
  } = useAIChatContext()
  const notification = useNotification()
  const [activeTab, setActiveTab] = useState<"tools" | "work">("tools")
  const [frontlineExecutionId, setFrontlineExecutionId] = useState<string | null>(null)
  const useQueryUntyped = useQuery as (query: unknown, args: unknown) => any

  // Get tool executions for the current conversation
  const toolExecutionsData = useQueryUntyped(
    api.ai.conversations.getToolExecutions,
    currentConversationId ? { conversationId: currentConversationId, limit: 20 } : "skip"
  )

  // Get work items (contact syncs + email campaigns)
  const workItems = useQueryUntyped(
    api.ai.workItems.getActiveWorkItems,
    organizationId ? { organizationId } : "skip"
  )

  // Define a type for the raw Convex tool execution data
  interface ConvexToolExecution {
    _id: string;
    toolName: string;
    status?: string;
    error?: string;
    executedAt: number;
    durationMs?: number;
    parameters?: Record<string, unknown>;
    result?: unknown;
  }

  // Transform Convex data to match our interface
  const executions: ToolExecution[] = (toolExecutionsData || []).map((exec: ConvexToolExecution) => {
    const endTime = exec.durationMs ? new Date(exec.executedAt + exec.durationMs) : undefined
    let status: ToolExecution["status"]
    if (exec.status === "proposed") status = "proposed"
    else if (exec.status === "approved") status = "approved"
    else if (exec.status === "executing") status = "executing"
    else if (exec.status === "success") status = "success"
    else if (exec.status === "failed") status = "error"
    else if (exec.status === "rejected") status = "rejected"
    else if (exec.status === "cancelled") status = "cancelled"
    else status = "running"

    return {
      id: exec._id,
      toolName: exec.toolName,
      status,
      startTime: new Date(exec.executedAt),
      endTime,
      input: exec.parameters || {},
      output: exec.result,
      error: exec.error,
    }
  })

  const latestFailedExecution = executions.find((execution) => execution.status === "error")

  const handleStartFrontlineIntake = async () => {
    if (!latestFailedExecution || isSending) {
      return
    }

    const lastUserMessage = [...(chat.messages || [])]
      .reverse()
      .find((message) => message.role === "user")?.content
    const boundaryReason =
      summarizeToolBoundaryContext({
        error: latestFailedExecution.error,
        output: latestFailedExecution.output,
      }) || "tool_execution_failed"
    const kickoff = buildFrontlineFeatureIntakeKickoff({
      trigger: "tool_failure",
      failedToolName: latestFailedExecution.toolName,
      boundaryReason,
      lastUserMessage,
    })

    setFrontlineExecutionId(latestFailedExecution.id)
    setIsSending(true)
    try {
      const result = await chat.sendMessage(kickoff, currentConversationId)
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId)
      }

      notification.info(
        "Let's Capture What's Missing",
        "The assistant will ask what's missing and what you need, then prepare the feature request draft."
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to start intake."
      notification.error(
        "Unable to Start Intake",
        errorMessage.length > 120 ? "Please retry in a moment." : errorMessage
      )
    } finally {
      setFrontlineExecutionId(null)
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Tabs */}
      <div
        className="border-b"
        style={{
          borderColor: 'var(--shell-border-strong)',
          background: 'var(--shell-surface-elevated)'
        }}
      >
        <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: 'var(--shell-border-soft)' }}>
          <Wrench className="w-4 h-4" style={{ color: 'var(--shell-text)' }} />
          <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--shell-text)' }}>
            {t("ui.ai_assistant.tools.title")}
          </span>
          {onClose ? (
            <button
              onClick={onClose}
              className="desktop-shell-button p-1 transition-colors"
              style={{ color: "var(--shell-text)" }}
              title="Close workflow drawer"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Tab Buttons */}
        <div className="flex">
          <button
            onClick={() => setActiveTab("tools")}
            className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
            style={{
              background: activeTab === "tools" ? 'var(--shell-surface)' : 'transparent',
              color: activeTab === "tools" ? 'var(--shell-text)' : 'var(--shell-text-dim)',
              borderBottom: activeTab === "tools" ? '2px solid var(--shell-accent)' : '2px solid transparent'
            }}
          >
            Tool Executions ({executions.length})
          </button>
          <button
            onClick={() => setActiveTab("work")}
            className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
            style={{
              background: activeTab === "work" ? 'var(--shell-surface)' : 'transparent',
              color: activeTab === "work" ? 'var(--shell-text)' : 'var(--shell-text-dim)',
              borderBottom: activeTab === "work" ? '2px solid var(--shell-accent)' : '2px solid transparent'
            }}
          >
            Work Items ({workItems?.length || 0})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {latestFailedExecution ? (
          <div
            className="mb-2 rounded border p-2"
            style={{
              borderColor: "var(--warning)",
              background: "var(--warning-bg)",
            }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
              Looks like we hit a limit in {latestFailedExecution.toolName}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--shell-text-dim)" }}>
              Tell us what's missing and what you need, and we'll turn it into a clear feature request.
            </p>
            <button
              type="button"
              onClick={() => {
                void handleStartFrontlineIntake()
              }}
              disabled={isSending}
              className="mt-2 rounded border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                borderColor: "var(--shell-border-soft)",
                background: "var(--shell-surface)",
                color: "var(--shell-text)",
              }}
            >
              {frontlineExecutionId === latestFailedExecution.id ? "Opening..." : "Tell Us What's Missing"}
            </button>
          </div>
        ) : null}

        {activeTab === "tools" ? (
          executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Wrench className="w-8 h-8 mb-2" style={{ color: 'var(--shell-text-dim)' }} />
              <p className="text-xs" style={{ color: 'var(--shell-text-dim)' }}>
                {t("ui.ai_assistant.tools.empty")}
              </p>
            </div>
          ) : (
            executions.map((execution) => (
              <ToolExecutionItem key={execution.id} execution={execution} />
            ))
          )
        ) : (
          !workItems || workItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="w-8 h-8 mb-2" style={{ color: 'var(--shell-text-dim)' }} />
              <p className="text-xs" style={{ color: 'var(--shell-text-dim)' }}>
                No active work items
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {workItems.map((item: { id: string; name: string; progress: { completed: number; total: number } }) => (
                <div
                  key={item.id}
                  className="p-2 border rounded"
                  style={{
                    borderColor: 'var(--shell-border-soft)',
                    background: 'var(--shell-surface)'
                  }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--shell-text)' }}>
                    {item.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--shell-text-dim)' }}>
                    {item.progress.completed}/{item.progress.total} completed
                  </p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Footer Stats */}
      <div
        className="p-2 border-t text-xs"
        style={{
          borderColor: 'var(--shell-border-soft)',
          color: 'var(--shell-text-dim)'
        }}
      >
        {activeTab === "tools"
          ? `${executions.filter(e => e.status === 'running').length} ${t("ui.ai_assistant.tools.active")}`
          : `${workItems?.length || 0} active work items`
        }
      </div>
    </div>
  )
}
