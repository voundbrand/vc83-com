"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { FileQuestion, X } from "lucide-react"
import { WorkItemDetail } from "../three-pane/work-item-detail"
import type { Id } from "../../../../../convex/_generated/dataModel"

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

interface DetailViewProps {
  selectedWorkItem: WorkItem | null;
  onClearSelection: () => void;
}

export function DetailView({ selectedWorkItem, onClearSelection }: DetailViewProps) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")

  // Empty state - no work item selected
  if (!selectedWorkItem) {
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
            <FileQuestion className="w-4 h-4" style={{ color: 'var(--win95-text)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Item Details
            </span>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <FileQuestion
            className="w-16 h-16 mb-4"
            style={{ color: 'var(--win95-text-muted)' }}
          />
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
            No Item Selected
          </p>
          <p className="text-xs max-w-[250px]" style={{ color: 'var(--win95-text-muted)' }}>
            Select a work item from the list to view details and approve or reject changes
          </p>
        </div>
      </div>
    )
  }

  // Work item selected - show detail
  return (
    <div className="flex flex-col h-full">
      {/* Header with Close Button */}
      <div
        className="flex items-center justify-between gap-2 p-3 border-b-2"
        style={{
          borderColor: 'var(--win95-border-dark)',
          background: 'var(--win95-title-bg)'
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileQuestion className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--win95-text)' }} />
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--win95-text)' }}>
            {selectedWorkItem.name}
          </span>
        </div>
        <button
          onClick={onClearSelection}
          className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
          title="Close detail view"
        >
          <X className="w-4 h-4" style={{ color: 'var(--win95-text-muted)' }} />
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
