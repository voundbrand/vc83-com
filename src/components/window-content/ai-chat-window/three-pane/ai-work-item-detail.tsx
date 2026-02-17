"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Package, Flag, CheckSquare, User, Building2, FileText, Lightbulb } from "lucide-react"
import type { Id } from "../../../../../convex/_generated/dataModel"

interface AIWorkItemDetailProps {
  itemId: Id<"aiWorkItems">
}

export function AIWorkItemDetail({ itemId }: AIWorkItemDetailProps) {
  const workItem = useQuery(api.ai.workItems.getAIWorkItem, { workItemId: itemId })

  if (!workItem) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs" style={{ color: 'var(--window-document-text-muted)' }}>
          Loading work item details...
        </p>
      </div>
    )
  }

  // Get icon based on type
  const getIcon = () => {
    switch (workItem.type) {
      case "project":
        return Package
      case "milestone":
        return Flag
      case "task":
        return CheckSquare
      case "contact":
        return User
      case "organization":
        return Building2
      default:
        return FileText
    }
  }

  const Icon = getIcon()

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Work Item Info */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5" style={{ color: 'var(--tone-accent-strong)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--window-document-text)' }}>
            {workItem.name}
          </p>
        </div>
        <div className="space-y-1 text-xs" style={{ color: 'var(--window-document-text-muted)' }}>
          <p>Type: <span className="font-mono" style={{ color: 'var(--window-document-text)' }}>{workItem.type}</span></p>
          <p>Created: {formatDate(workItem.createdAt)}</p>
          {workItem.completedAt && (
            <p>Completed: {formatDate(workItem.completedAt)}</p>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
          Status
        </p>
        <span
          className="inline-block px-2 py-1 rounded text-xs font-medium"
          style={{
            background: workItem.status === "completed" ? 'var(--success-bg)' : 'var(--info-bg)',
            color: workItem.status === "completed" ? 'var(--success)' : 'var(--info)',
            border: `1px solid ${workItem.status === "completed" ? 'var(--success)' : 'var(--info)'}`
          }}
        >
          {workItem.status.charAt(0).toUpperCase() + workItem.status.slice(1)}
        </span>
      </div>

      {/* Progress */}
      {workItem.progress && (
        <div className="p-3 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
            Progress
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p style={{ color: 'var(--window-document-text-muted)' }}>Total:</p>
              <p className="font-semibold" style={{ color: 'var(--window-document-text)' }}>{workItem.progress.total}</p>
            </div>
            <div>
              <p style={{ color: 'var(--window-document-text-muted)' }}>Completed:</p>
              <p className="font-semibold" style={{ color: 'var(--success)' }}>{workItem.progress.completed}</p>
            </div>
            <div>
              <p style={{ color: 'var(--window-document-text-muted)' }}>Failed:</p>
              <p className="font-semibold" style={{ color: 'var(--error)' }}>{workItem.progress.failed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Data */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
          Data
        </p>

        {workItem.results ? (
          <div className="space-y-2">
            {Object.entries(workItem.results as Record<string, unknown>).map(([key, value]) => {
              // Skip internal fields
              if (key.startsWith('_') || key === 'createdAt' || key === 'updatedAt') {
                return null
              }

              // Format value based on type - always convert to string for display
              let displayValue: string
              if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value, null, 2)
              } else if (typeof value === 'boolean') {
                displayValue = value ? 'Yes' : 'No'
              } else if (value === null || value === undefined) {
                displayValue = '-'
              } else {
                displayValue = String(value)
              }

              return (
                <div
                  key={key}
                  className="p-2 border rounded"
                  style={{
                    borderColor: 'var(--window-document-border)',
                    background: 'var(--desktop-shell-accent)'
                  }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </p>
                  {displayValue.startsWith('{') ? (
                    <pre
                      className="text-xs whitespace-pre-wrap font-mono"
                      style={{ color: 'var(--window-document-text-muted)' }}
                    >
                      {displayValue}
                    </pre>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--window-document-text-muted)' }}>
                      {displayValue}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-center py-4" style={{ color: 'var(--window-document-text-muted)' }}>
            No data available
          </p>
        )}
      </div>

      {/* Info Note */}
      <div
        className="p-3 border-t"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--desktop-shell-accent)'
        }}
      >
        <p className="text-xs text-center flex items-center justify-center gap-1" style={{ color: 'var(--window-document-text-muted)' }}>
          <Lightbulb className="w-3 h-3" />
          <span>This {workItem.type} was created by AI and has been saved to your database.</span>
        </p>
      </div>
    </div>
  )
}
