"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { Wrench, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { type ReactNode, useState } from "react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"

interface ToolExecution {
  id: string
  toolName: string
  status: "running" | "success" | "error"
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
    }
  }

  const config = statusConfig[execution.status]
  const StatusIcon = config.icon

  const duration = execution.endTime
    ? Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)
    : null

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
        className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 transition-colors"
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
              : t("ui.ai_assistant.tool.running")}
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

export function ToolExecutionPanel() {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { currentConversationId, organizationId } = useAIChatContext()
  const [activeTab, setActiveTab] = useState<"tools" | "work">("tools")

  // Get tool executions for the current conversation
  const toolExecutionsData = useQuery(
    api.ai.conversations.getToolExecutions,
    currentConversationId ? { conversationId: currentConversationId, limit: 20 } : "skip"
  )

  // Get work items (contact syncs + email campaigns)
  const workItems = useQuery(
    api.ai.workItems.getActiveWorkItems,
    organizationId ? { organizationId } : "skip"
  )

  // Define a type for the raw Convex tool execution data
  interface ConvexToolExecution {
    _id: string;
    toolName: string;
    success?: boolean;
    error?: string;
    executedAt: number;
    completedAt?: number;
    input?: Record<string, unknown>;
    output?: unknown;
  }

  // Transform Convex data to match our interface
  const executions: ToolExecution[] = (toolExecutionsData || []).map((exec: ConvexToolExecution) => ({
    id: exec._id,
    toolName: exec.toolName,
    status: exec.success ? "success" : exec.error ? "error" : "running",
    startTime: new Date(exec.executedAt),
    endTime: exec.completedAt ? new Date(exec.completedAt) : undefined,
    input: exec.input as Record<string, unknown>,
    output: exec.output,
    error: exec.error
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Header with Tabs */}
      <div
        className="border-b-2"
        style={{
          borderColor: 'var(--shell-border-strong)',
          background: 'var(--shell-title-bg)'
        }}
      >
        <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: 'var(--shell-border-soft)' }}>
          <Wrench className="w-4 h-4" style={{ color: 'var(--shell-text)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--shell-text)' }}>
            {t("ui.ai_assistant.tools.title")}
          </span>
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
