"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { Wrench, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, Users, Mail, AlertTriangle, Settings, GripHorizontal, X, Minimize2, Maximize2, Clock, SlidersHorizontal } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { useWindowManager } from "@/hooks/use-window-manager"

interface ToolExecution {
  id: string
  toolName: string
  status: "proposed" | "approved" | "executing" | "running" | "success" | "error" | "rejected" | "cancelled"
  startTime: Date
  endTime?: Date
  input: Record<string, unknown>
  output?: unknown
  error?: string
  isMinimized?: boolean
  proposalMessage?: string
}

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

interface ToolExecutionPanelProps {
  selectedWorkItem: WorkItem | null;
  onSelectWorkItem: (item: WorkItem | null) => void;
  selectedToolExecution: ToolExecution | null;
  onSelectToolExecution: (execution: ToolExecution | null) => void;
  onOpenSettings?: () => void;
}

interface ToolExecutionItemProps {
  execution: ToolExecution
  isSelected?: boolean
  onSelect?: (execution: ToolExecution) => void
  onMinimize?: (id: string, minimized: boolean) => void
  onCancel?: (id: string) => void
}

function ToolExecutionItem({ execution, isSelected, onSelect, onMinimize, onCancel }: ToolExecutionItemProps) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDebug, setShowDebug] = useState(false)

  const statusConfig = {
    proposed: {
      icon: Clock,
      color: 'var(--warning)',
      bgColor: 'var(--warning-bg)',
      animate: false,
      label: "Pending Approval"
    },
    approved: {
      icon: CheckCircle2,
      color: 'var(--success)',
      bgColor: 'var(--success-bg)',
      animate: false,
      label: "Approved"
    },
    executing: {
      icon: Loader2,
      color: 'var(--info)',
      bgColor: 'var(--info-bg)',
      animate: true,
      label: "Executing..."
    },
    running: {
      icon: Loader2,
      color: 'var(--win95-text-muted)',
      bgColor: 'transparent',
      animate: true,
      label: "Running..."
    },
    success: {
      icon: CheckCircle2,
      color: 'var(--success)',
      bgColor: 'var(--success-bg)',
      animate: false,
      label: "Success"
    },
    error: {
      icon: XCircle,
      color: 'var(--error)',
      bgColor: 'var(--error-bg)',
      animate: false,
      label: "Failed"
    },
    rejected: {
      icon: XCircle,
      color: 'var(--win95-text-muted)',
      bgColor: 'var(--win95-bg-light)',
      animate: false,
      label: "Rejected"
    },
    cancelled: {
      icon: X,
      color: 'var(--win95-text-muted)',
      bgColor: 'var(--win95-bg-light)',
      animate: false,
      label: "Cancelled"
    }
  }

  const config = statusConfig[execution.status]
  const StatusIcon = config.icon

  const duration = execution.endTime
    ? Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)
    : null

  // If minimized, show tiny tile
  if (execution.isMinimized) {
    return (
      <div
        className="border rounded mb-1 cursor-pointer transition-all hover:border-gray-400"
        style={{
          borderColor: 'var(--win95-border-light)',
          background: 'var(--win95-bg-light)',
          height: '24px',
          opacity: 0.6
        }}
        onClick={() => onMinimize?.(execution.id, false)}
        title={`${execution.toolName} - Click to restore`}
      >
        <div className="flex items-center gap-1 px-2 py-0.5 h-full">
          <StatusIcon
            className={`w-3 h-3 flex-shrink-0 ${config.animate ? 'animate-spin' : ''}`}
            style={{ color: config.color }}
          />
          <p className="text-xs truncate flex-1" style={{ color: 'var(--win95-text-muted)' }}>
            {execution.toolName}
          </p>
          <Maximize2 className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--win95-text-muted)' }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="border rounded mb-2 cursor-pointer transition-all"
      style={{
        borderColor: isSelected ? 'var(--win95-highlight)' : 'var(--win95-border-light)',
        background: isSelected ? 'var(--win95-highlight-subtle)' : config.bgColor,
        borderWidth: isSelected ? '2px' : '1px'
      }}
      onClick={() => onSelect?.(execution)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--win95-hover-light)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          className="flex items-center gap-2 flex-1 rounded transition-colors"
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
              {config.label} • {duration !== null
                ? `${duration}s`
                : (t("ui.ai_assistant.tool.running") as string)}
            </p>
          </div>
        </button>

        {/* Cancel Button - Only show for proposed tools */}
        {execution.status === 'proposed' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel?.(execution.id);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--error)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--win95-text-muted)';
            }}
            className="p-1 rounded transition-colors flex-shrink-0"
            title="Cancel (dismiss without feedback)"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Minimize Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMinimize?.(execution.id, true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--win95-hover-light)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          className="p-1 rounded transition-colors flex-shrink-0"
          title="Minimize"
        >
          <Minimize2 className="w-3 h-3" style={{ color: 'var(--win95-text-muted)' }} />
        </button>
      </div>

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

          {/* Debug Protocol Toggle */}
          <div className="border-t pt-2" style={{ borderColor: 'var(--win95-border-light)' }}>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between px-2 py-1 rounded transition-colors text-xs"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--win95-hover-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span className="font-semibold" style={{ color: 'var(--win95-text)' }}>
                Debug Protocol
              </span>
              {showDebug ? (
                <ChevronDown className="w-3 h-3" style={{ color: 'var(--win95-text-muted)' }} />
              ) : (
                <ChevronRight className="w-3 h-3" style={{ color: 'var(--win95-text-muted)' }} />
              )}
            </button>

            {/* Debug Output */}
            {showDebug && (
              <div className="mt-2">
                <pre
                  className="text-xs p-2 rounded overflow-x-auto font-mono max-h-64 overflow-y-auto"
                  style={{
                    background: 'var(--win95-bg)',
                    color: 'var(--win95-text)',
                    borderLeft: '2px solid var(--win95-highlight)'
                  }}
                >
{`[Tool Execution Protocol]
Tool: ${execution.toolName}
Status: ${execution.status}
Started: ${execution.startTime.toISOString()}
${execution.endTime ? `Ended: ${execution.endTime.toISOString()}` : 'Still running...'}

[Input Parameters]
${JSON.stringify(execution.input, null, 2)}

${execution.output ? `[Output Data]
${typeof execution.output === 'string' ? execution.output : JSON.stringify(execution.output, null, 2)}` : ''}

${execution.error ? `[Error Details]
${execution.error}` : ''}

[Status History]
- Initialized: ${execution.startTime.toISOString()}
${execution.status === 'running' ? '- Currently executing...' : ''}
${execution.endTime ? `- Completed: ${execution.endTime.toISOString()}` : ''}
${execution.error ? '- Error encountered during execution' : ''}
`}
                </pre>
              </div>
            )}
          </div>
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

interface ActionItemTileProps {
  actionButton: {
    label: string;
    action: string;
    variant: string;
  };
  message: string;
}

function ActionItemTile({ actionButton, message }: ActionItemTileProps) {
  const { closeWindow, openWindow } = useWindowManager()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (actionButton.action === 'open_settings_integrations') {
      // Close window if it exists to reset state, then open with integrations tab
      closeWindow('manage')

      // Open Manage window with Integrations tab
      import('@/components/window-content/org-owner-manage-window').then((module) => {
        openWindow(
          'manage',
          'Manage',
          <module.ManageWindow initialTab="integrations" />,
          { x: 200, y: 50 },
          { width: 1200, height: 700 }
        )
      })
    }
  }

  return (
    <div
      className="border-2 p-2 mb-2 transition-colors"
      style={{
        borderColor: 'var(--win95-border-light)',
        background: 'var(--win95-bg-light)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: Info */}
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--win95-text)' }}>
              Action Required
            </p>
            <p className="text-xs line-clamp-1" style={{ color: 'var(--win95-text-muted)' }}>
              {message}
            </p>
          </div>
        </div>

        {/* Right: Action button */}
        <button
          className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors flex-shrink-0"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)',
            color: 'var(--win95-highlight)',
          }}
          title={actionButton.label}
          onClick={handleClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--win95-hover-light)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--win95-bg-light)';
          }}
        >
          <Settings size={12} />
        </button>
      </div>
    </div>
  );
}

interface ResizableDividerProps {
  onDrag: (deltaY: number) => void;
}

function ResizableDivider({ onDrag }: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      startYRef.current = e.clientY;
      onDrag(deltaY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag]);

  return (
    <div
      className="group relative cursor-row-resize select-none"
      onMouseDown={handleMouseDown}
      style={{
        height: '8px',
        borderTop: '1px solid var(--win95-border-light)',
        borderBottom: '1px solid var(--win95-border-light)',
        background: isDragging ? 'var(--win95-highlight)' : 'var(--win95-bg)',
        transition: isDragging ? 'none' : 'background-color 0.15s'
      }}
    >
      {/* Visual grip indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <GripHorizontal
          className="w-4 h-4 transition-opacity"
          style={{
            color: isDragging ? 'white' : 'var(--win95-text-muted)',
            opacity: isDragging ? 1 : 0.4
          }}
        />
      </div>

      {/* Hover effect overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: 'var(--win95-highlight)',
          opacity: isDragging ? 0 : 0.2
        }}
      />
    </div>
  );
}

export function ToolExecutionPanel({ selectedWorkItem, onSelectWorkItem, selectedToolExecution, onSelectToolExecution, onOpenSettings }: ToolExecutionPanelProps) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { currentConversationId, organizationId } = useAIChatContext()

  // Minimize mutation
  const minimizeExecution = useMutation(api.ai.conversations.minimizeToolExecution)

  const handleMinimize = async (executionId: string, isMinimized: boolean) => {
    try {
      await minimizeExecution({
        executionId: executionId as Id<"aiToolExecutions">,
        isMinimized,
      })
    } catch (error) {
      console.error("[Tool Execution] Failed to toggle minimize:", error)
    }
  }

  // Cancel mutation
  const cancelExecution = useMutation(api.ai.conversations.cancelToolExecution)

  const handleCancel = async (executionId: string) => {
    try {
      await cancelExecution({
        executionId: executionId as Id<"aiToolExecutions">,
      })
    } catch (error) {
      console.error("[Tool Execution] Failed to cancel:", error)
    }
  }

  // Resizable divider state
  const STORAGE_KEY = 'ai-chat-tool-execution-split';
  const DEFAULT_TOP_HEIGHT = 50; // Default 50% for top panel
  const MIN_HEIGHT = 20; // Minimum 20% for each panel
  const MAX_HEIGHT = 80; // Maximum 80% for each panel

  const [topPanelHeight, setTopPanelHeight] = useState<number>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_HEIGHT && parsed <= MAX_HEIGHT) {
          return parsed;
        }
      }
    }
    return DEFAULT_TOP_HEIGHT;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleDividerDrag = useCallback((deltaY: number) => {
    if (!containerRef.current) return;

    const containerHeight = containerRef.current.clientHeight;
    const deltaPercent = (deltaY / containerHeight) * 100;

    setTopPanelHeight((prev) => {
      const newHeight = prev + deltaPercent;
      // Clamp between min and max
      const clampedHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, clampedHeight.toString());
      }

      return clampedHeight;
    });
  }, []);

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
    status: string;
    executedAt: number;
    durationMs?: number;
    parameters: Record<string, unknown>;
    result?: unknown;
    error?: string;
    isMinimized?: boolean;
    proposalMessage?: string;
  }

  // Transform Convex data to match our interface
  const executions: ToolExecution[] = (toolExecutionsData || []).map((exec: ConvexToolExecution) => {
    // Calculate end time from executedAt + durationMs
    const endTime = exec.durationMs
      ? new Date(exec.executedAt + exec.durationMs)
      : undefined;

    // Map database status to UI status
    let uiStatus: ToolExecution["status"];
    if (exec.status === "proposed") uiStatus = "proposed";
    else if (exec.status === "approved") uiStatus = "approved";
    else if (exec.status === "executing") uiStatus = "executing";
    else if (exec.status === "success") uiStatus = "success";
    else if (exec.status === "failed") uiStatus = "error";
    else if (exec.status === "rejected") uiStatus = "rejected";
    else uiStatus = "running"; // fallback

    return {
      id: exec._id,
      toolName: exec.toolName,
      status: uiStatus,
      startTime: new Date(exec.executedAt),
      endTime,
      input: exec.parameters as Record<string, unknown>,
      output: exec.result,
      error: exec.error,
      isMinimized: exec.isMinimized || false,
      proposalMessage: exec.proposalMessage,
    };
  })

  // Define a type for action button output
  interface ActionButtonOutput {
    actionButton: {
      label: string;
      action: string;
      variant: string;
    };
    message?: string;
  }

  // Extract action items from failed executions with actionButton
  const actionItems = executions
    .filter(exec => exec.status === 'error' && exec.output && typeof exec.output === 'object' && 'actionButton' in exec.output)
    .map(exec => ({
      id: exec.id,
      actionButton: (exec.output as ActionButtonOutput).actionButton,
      message: (exec.output as ActionButtonOutput).message || exec.error || 'Action required'
    }))

  const bottomPanelHeight = 100 - topPanelHeight;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="border-b-2 p-3 flex-shrink-0"
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

      {/* Resizable Content Container */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
        {/* Tool Executions Section - Top Panel */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ height: `${topPanelHeight}%` }}
        >
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--win95-text)' }}>
                Tool Execution ({executions.length})
              </p>
              {/* Settings Button */}
              <button
                onClick={() => onOpenSettings?.()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--win95-hover-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                className="p-1 rounded transition-colors"
                title="AI Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--win95-text-muted)' }} />
              </button>
            </div>

            {executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Wrench className="w-6 h-6 mb-2" style={{ color: 'var(--win95-text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                  {t("ui.ai_assistant.tools.empty") as string}
                </p>
              </div>
            ) : (
              <>
                {/* Regular (non-minimized) executions */}
                {executions.filter(e => !e.isMinimized).map((execution) => (
                  <ToolExecutionItem
                    key={execution.id}
                    execution={execution}
                    isSelected={selectedToolExecution?.id === execution.id}
                    onSelect={(exec) => {
                      onSelectToolExecution(exec)
                      onSelectWorkItem(null) // Clear work item selection
                    }}
                    onMinimize={handleMinimize}
                    onCancel={handleCancel}
                  />
                ))}

                {/* Minimized executions section */}
                {executions.filter(e => e.isMinimized).length > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--win95-border-light)' }}>
                    <p className="text-xs mb-1 px-1" style={{ color: 'var(--win95-text-muted)' }}>
                      Minimized ({executions.filter(e => e.isMinimized).length})
                    </p>
                    {executions.filter(e => e.isMinimized).map((execution) => (
                      <ToolExecutionItem
                        key={execution.id}
                        execution={execution}
                        onMinimize={handleMinimize}
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Resizable Divider */}
        <ResizableDivider onDrag={handleDividerDrag} />

        {/* Work Items Section - Bottom Panel */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ height: `${bottomPanelHeight}%` }}
        >
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--win95-text)' }}>
                Work Items ({(actionItems?.length || 0) + (workItems?.length || 0)})
              </p>
            </div>

            {/* Action Items - Show first */}
            {actionItems.map((actionItem) => (
              <ActionItemTile
                key={actionItem.id}
                actionButton={actionItem.actionButton}
                message={actionItem.message}
              />
            ))}

            {/* Regular Work Items */}
            {!workItems || workItems.length === 0 ? (
              actionItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Users className="w-6 h-6 mb-2" style={{ color: 'var(--win95-text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                    No active work items
                  </p>
                </div>
              )
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
    </div>
  )
}
