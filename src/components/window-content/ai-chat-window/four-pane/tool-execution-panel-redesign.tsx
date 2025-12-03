"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { Wrench, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, Users, Mail } from "lucide-react"
import { type ReactNode, useState } from "react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"

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

interface WorkItem {
  id: Id<"contactSyncs"> | Id<"emailCampaigns">;
  type: "contact_sync" | "email_campaign";
  name: string;
  status: string;
  createdAt: number;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

interface ToolExecutionPanelProps {
  selectedWorkItem: WorkItem | null;
  onSelectWorkItem: (item: WorkItem | null) => void;
}

interface ToolExecutionItemProps {
  execution: ToolExecution
}

function ToolExecutionItem({ execution }: ToolExecutionItemProps) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const [isExpanded, setIsExpanded] = useState(false)

  const statusConfig = {
    running: {
      icon: Loader2,
      color: 'var(--win95-text-muted)',
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
        borderColor: 'var(--win95-border-light)',
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
            <ChevronDown className="w-3 h-3" style={{ color: 'var(--win95-text)' }} />
          ) : (
            <ChevronRight className="w-3 h-3" style={{ color: 'var(--win95-text)' }} />
          )}
        </div>
        <StatusIcon
          className={`w-4 h-4 flex-shrink-0 ${config.animate ? 'animate-spin' : ''}`}
          style={{ color: config.color }}
        />
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--win95-text)' }}>
            {execution.toolName}
          </p>
          <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
            {duration !== null
              ? `${duration}s`
              : (t("ui.ai_assistant.tool.running") as string)}
          </p>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded ? (
        <div
          className="px-2 pb-2 space-y-2 border-t"
          style={{ borderColor: 'var(--win95-border-light)' }}
        >
          {/* @ts-expect-error - Translation hook return type needs refinement */}
          {/* Input */}
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
              {t("ui.ai_assistant.tool.input") as string}
            </p>
            <pre
              className="text-xs p-2 rounded overflow-x-auto"
              style={{
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-text)'
              }}
            >
              {JSON.stringify(execution.input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {execution.output && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                {t("ui.ai_assistant.tool.output") as string}
              </p>
              <pre
                className="text-xs p-2 rounded overflow-x-auto"
                style={{
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-text)'
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
                {t("ui.ai_assistant.tool.error") as string}
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

interface WorkItemCardProps {
  item: WorkItem;
  isSelected: boolean;
  onSelect: (item: WorkItem) => void;
}

function WorkItemCard({ item, isSelected, onSelect }: WorkItemCardProps) {
  const Icon = item.type === "contact_sync" ? Users : Mail;

  // Status configuration
  const statusConfig: Record<string, {
    color: string;
    bgColor: string;
    icon: typeof CheckCircle2;
    label: string;
  }> = {
    preview: {
      color: 'var(--info)',
      bgColor: 'var(--info-bg)',
      icon: Loader2,
      label: "Preview"
    },
    draft: {
      color: 'var(--info)',
      bgColor: 'var(--info-bg)',
      icon: Loader2,
      label: "Draft"
    },
    executing: {
      color: 'var(--warning)',
      bgColor: 'var(--warning-bg)',
      icon: Loader2,
      label: "Running"
    },
    sending: {
      color: 'var(--warning)',
      bgColor: 'var(--warning-bg)',
      icon: Loader2,
      label: "Sending"
    },
    pending: {
      color: 'var(--warning)',
      bgColor: 'var(--warning-bg)',
      icon: Loader2,
      label: "Pending"
    },
    completed: {
      color: 'var(--success)',
      bgColor: 'var(--success-bg)',
      icon: CheckCircle2,
      label: "Complete"
    },
    failed: {
      color: 'var(--error)',
      bgColor: 'var(--error-bg)',
      icon: XCircle,
      label: "Failed"
    }
  };

  const config = statusConfig[item.status] || statusConfig.preview;
  const StatusIcon = config.icon;

  // Progress percentage
  const progressPercent = item.progress.total > 0
    ? Math.round((item.progress.completed / item.progress.total) * 100)
    : 0;

  // Time formatting
  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left p-2 border rounded mb-2 transition-colors hover:bg-gray-50"
      style={{
        borderColor: isSelected ? 'var(--win95-highlight)' : 'var(--win95-border-light)',
        background: isSelected ? 'var(--win95-highlight-subtle)' : 'transparent',
        borderWidth: isSelected ? '2px' : '1px'
      }}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--win95-text)' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <p className="text-xs font-medium truncate mb-1" style={{ color: 'var(--win95-text)' }}>
            {item.name}
          </p>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
              style={{
                background: config.bgColor,
                color: config.color
              }}
            >
              <StatusIcon className={`w-3 h-3 ${item.status === 'executing' || item.status === 'sending' ? 'animate-spin' : ''}`} />
              {config.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
              {timeAgo(item.createdAt)}
            </span>
          </div>

          {/* Progress Bar */}
          {item.progress.total > 0 && (
            <div className="space-y-1">
              <div
                className="h-1 rounded overflow-hidden"
                style={{ background: 'var(--win95-border-light)' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    background: config.color
                  }}
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                {item.progress.completed}/{item.progress.total}
                {item.progress.failed > 0 && (
                  <span style={{ color: 'var(--error)' }}> • {item.progress.failed} failed</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function ToolExecutionPanel({ selectedWorkItem, onSelectWorkItem }: ToolExecutionPanelProps) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { currentConversationId, organizationId } = useAIChatContext()

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

  // Transform Convex data to match our interface
  const executions: ToolExecution[] = (toolExecutionsData || []).map((exec: any) => ({
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
      {/* Header */}
      <div
        className="border-b-2 p-3"
        style={{
          borderColor: 'var(--win95-border-dark)',
          background: 'var(--win95-title-bg)'
        }}
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4" style={{ color: 'var(--win95-text)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
            {t("ui.ai_assistant.tools.title") as string}
          </span>
        </div>
      </div>

      {/* Content - No Tabs! */}
      <div className="flex-1 overflow-y-auto">
        {/* Tool Executions Section */}
        <div className="p-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold" style={{ color: 'var(--win95-text)' }}>
              Tool Execution ({executions.length})
            </p>
          </div>

          {executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Wrench className="w-6 h-6 mb-2" style={{ color: 'var(--win95-text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                {t("ui.ai_assistant.tools.empty") as string}
              </p>
            </div>
          ) : (
            executions.map((execution) => (
              <ToolExecutionItem key={execution.id} execution={execution} />
            ))
          )}
        </div>

        {/* Work Items Section - Below Tool Execution */}
        <div
          className="border-t-2 p-2"
          style={{ borderColor: 'var(--win95-border-light)' }}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold" style={{ color: 'var(--win95-text)' }}>
              Work Items ({workItems?.length || 0})
            </p>
          </div>

          {!workItems || workItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Users className="w-6 h-6 mb-2" style={{ color: 'var(--win95-text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                No active work items
              </p>
            </div>
          ) : (
            workItems.map((item) => (
              <WorkItemCard
                key={item.id}
                item={item}
                isSelected={selectedWorkItem?.id === item.id}
                onSelect={onSelectWorkItem}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
