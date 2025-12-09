"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Package, Flag, CheckSquare, User, Building2, Calendar, FileText } from "lucide-react"
import type { Id } from "../../../../../convex/_generated/dataModel"

interface AIWorkItemDetailProps {
  itemId: Id<"aiWorkItems">
}

export function AIWorkItemDetail({ itemId }: AIWorkItemDetailProps) {
  const workItem = useQuery(api.ai.workItems.getAIWorkItem, { workItemId: itemId })

  if (!workItem) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
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
      <div className="p-3 border-b" style={{ borderColor: 'var(--win95-border-light)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5" style={{ color: 'var(--win95-highlight)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
            {workItem.name}
          </p>
        </div>
        <div className="space-y-1 text-xs" style={{ color: 'var(--win95-text-muted)' }}>
          <p>Type: <span className="font-mono" style={{ color: 'var(--win95-text)' }}>{workItem.type}</span></p>
          <p>Created: {formatDate(workItem.createdAt)}</p>
          {workItem.completedAt && (
            <p>Completed: {formatDate(workItem.completedAt)}</p>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--win95-border-light)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
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
        <div className="p-3 border-b" style={{ borderColor: 'var(--win95-border-light)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
            Progress
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p style={{ color: 'var(--win95-text-muted)' }}>Total:</p>
              <p className="font-semibold" style={{ color: 'var(--win95-text)' }}>{workItem.progress.total}</p>
            </div>
            <div>
              <p style={{ color: 'var(--win95-text-muted)' }}>Completed:</p>
              <p className="font-semibold" style={{ color: 'var(--success)' }}>{workItem.progress.completed}</p>
            </div>
            <div>
              <p style={{ color: 'var(--win95-text-muted)' }}>Failed:</p>
              <p className="font-semibold" style={{ color: 'var(--error)' }}>{workItem.progress.failed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Data */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
          Data
        </p>

        {workItem.results ? (
          <div className="space-y-2">
            {Object.entries(workItem.results as Record<string, any>).map(([key, value]) => {
              // Skip internal fields
              if (key.startsWith('_') || key === 'createdAt' || key === 'updatedAt') {
                return null
              }

              // Format value based on type
              let displayValue = value
              if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value, null, 2)
              } else if (typeof value === 'boolean') {
                displayValue = value ? 'Yes' : 'No'
              } else if (value === null || value === undefined) {
                displayValue = '-'
              }

              return (
                <div
                  key={key}
                  className="p-2 border rounded"
                  style={{
                    borderColor: 'var(--win95-border-light)',
                    background: 'var(--win95-bg-light)'
                  }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </p>
                  {typeof displayValue === 'string' && displayValue.startsWith('{') ? (
                    <pre
                      className="text-xs whitespace-pre-wrap font-mono"
                      style={{ color: 'var(--win95-text-muted)' }}
                    >
                      {displayValue}
                    </pre>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                      {displayValue}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-center py-4" style={{ color: 'var(--win95-text-muted)' }}>
            No data available
          </p>
        )}
      </div>

      {/* Info Note */}
      <div
        className="p-3 border-t"
        style={{
          borderColor: 'var(--win95-border-light)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <p className="text-xs text-center" style={{ color: 'var(--win95-text-muted)' }}>
          💡 This {workItem.type} was created by AI and has been saved to your database.
        </p>
      </div>
    </div>
  )
}
