"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import {
  Users,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronRight
} from "lucide-react"
import { type ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Id } from "../../../../../convex/_generated/dataModel"

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

interface WorkItemCardProps {
  item: WorkItem;
  isSelected: boolean;
  onSelect: (item: WorkItem) => void;
}

function WorkItemCard({ item, isSelected, onSelect }: WorkItemCardProps): ReactNode {
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
      icon: Clock,
      label: "Preview"
    },
    draft: {
      color: 'var(--info)',
      bgColor: 'var(--info-bg)',
      icon: Clock,
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
      className="w-full text-left p-3 border-b transition-colors hover:bg-gray-50"
      style={{
        borderColor: 'var(--win95-border-light)',
        background: isSelected ? 'var(--win95-highlight-subtle)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--win95-highlight)' : '3px solid transparent'
      }}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4" style={{ color: 'var(--win95-text)' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <p className="text-sm font-medium truncate mb-1" style={{ color: 'var(--win95-text)' }}>
            {item.name}
          </p>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
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
                className="h-1.5 rounded overflow-hidden"
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
                {item.progress.completed}/{item.progress.total} items
                {item.progress.failed > 0 && (
                  <span style={{ color: 'var(--error)' }}> • {item.progress.failed} failed</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--win95-text-muted)' }} />
      </div>
    </button>
  );
}

interface WorkItemListProps {
  organizationId: Id<"organizations">;
  selectedItem: WorkItem | null;
  onSelectItem: (item: WorkItem | null) => void;
}

export function WorkItemList({ organizationId, selectedItem, onSelectItem }: WorkItemListProps) {
  const { t } = useNamespaceTranslations("ui.ai_assistant");

  // Get active work items (contact syncs + email campaigns)
  const workItems = useQuery(
    api.ai.workItems.getActiveWorkItems,
    { organizationId }
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2 p-3 border-b-2"
        style={{
          borderColor: 'var(--win95-border-dark)',
          background: 'var(--win95-title-bg)'
        }}
      >
        <Loader2 className="w-4 h-4" style={{ color: 'var(--win95-text)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
          Active Work
        </span>
      </div>

      {/* Work Items List */}
      <div className="flex-1 overflow-y-auto">
        {!workItems || workItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Users className="w-8 h-8 mb-2" style={{ color: 'var(--win95-text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
              No active work items
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--win95-text-muted)' }}>
              Start a contact sync or email campaign
            </p>
          </div>
        ) : (
          workItems.map((item) => (
            <WorkItemCard
              key={item.id}
              item={item}
              isSelected={selectedItem?.id === item.id}
              onSelect={onSelectItem}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div
        className="p-2 border-t text-xs"
        style={{
          borderColor: 'var(--win95-border-light)',
          color: 'var(--win95-text-muted)'
        }}
      >
        {workItems?.length || 0} active work item{workItems?.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
