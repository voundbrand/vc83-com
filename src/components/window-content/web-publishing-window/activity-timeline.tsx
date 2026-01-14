"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  XCircle,
  Info,
  Bug,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  Webhook,
  Shuffle,
} from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ActivityTimelineProps {
  applicationId: Id<"objects">;
  debugMode: boolean;
}

type SeverityFilter = "all" | "debug" | "info" | "warning" | "error";
type CategoryFilter = "all" | "api" | "sync" | "object" | "webhook" | "transform";

interface ActivityEvent {
  _id: Id<"activityEvents">;
  eventType: string;
  severity: "debug" | "info" | "warning" | "error";
  category: string;
  summary: string;
  timestamp: number;
  details?: {
    requestId?: string;
    method?: string;
    endpoint?: string;
    statusCode?: number;
    objectType?: string;
    objectId?: Id<"objects">;
    objectName?: string;
    inputSummary?: string;
    outputSummary?: string;
    syncDirection?: string;
    recordsAffected?: number;
    durationMs?: number;
    errorCode?: string;
    errorMessage?: string;
    stackTrace?: string;
    sourceFile?: string;
    sourceLine?: number;
    correlationId?: string;
  };
}

/**
 * Activity Timeline Component
 *
 * Displays a real-time stream of activity events with:
 * - Severity-based coloring and icons
 * - Category filtering
 * - Expandable details in debug mode
 * - Correlation tracking for request chains
 */
export function ActivityTimeline({
  applicationId,
  debugMode,
}: ActivityTimelineProps) {
  const { sessionId } = useAuth();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Query activity events
  const eventsResult = useQuery(
    api.activityProtocol.getActivityEvents,
    sessionId
      ? {
          sessionId,
          applicationId,
          severity: severityFilter !== "all" ? severityFilter : undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          debugMode,
          limit: 100,
        }
      : "skip"
  );

  const events = eventsResult?.events as ActivityEvent[] | undefined;

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "debug":
        return <Bug size={12} className="text-gray-400" />;
      case "info":
        return <Info size={12} className="text-blue-500" />;
      case "warning":
        return <AlertTriangle size={12} className="text-yellow-500" />;
      case "error":
        return <XCircle size={12} className="text-red-500" />;
      default:
        return <Activity size={12} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "debug":
        return "var(--neutral-gray)";
      case "info":
        return "#3B82F6";
      case "warning":
        return "var(--warning)";
      case "error":
        return "var(--error)";
      default:
        return "var(--neutral-gray)";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "api":
        return <Globe size={12} />;
      case "sync":
        return <RefreshCw size={12} />;
      case "object":
        return <Database size={12} />;
      case "webhook":
        return <Webhook size={12} />;
      case "transform":
        return <Shuffle size={12} />;
      default:
        return <Activity size={12} />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleString();
  };

  if (!sessionId) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Please log in to view activity.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div
        className="px-4 py-2 border-b-2 flex items-center gap-4"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--neutral-gray)" }} />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
            className="px-2 py-1 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "white",
            }}
          >
            <option value="all">All Severities</option>
            {debugMode && <option value="debug">Debug</option>}
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-2 py-1 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "white",
            }}
          >
            <option value="all">All Categories</option>
            <option value="api">API</option>
            <option value="sync">Sync</option>
            <option value="object">Objects</option>
            <option value="webhook">Webhooks</option>
            <option value="transform">Transforms</option>
          </select>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className="flex items-center gap-1 px-2 py-1 text-xs border-2"
          style={{
            borderColor: autoRefresh
              ? "var(--success)"
              : "var(--win95-border)",
            background: autoRefresh ? "var(--success)" : "white",
            color: autoRefresh ? "white" : "var(--neutral-gray)",
          }}
        >
          <RefreshCw size={12} className={autoRefresh ? "animate-spin" : ""} />
          Live
        </button>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto">
        {events === undefined ? (
          <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
            Loading activity...
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center">
            <Activity
              size={32}
              className="mx-auto mb-2"
              style={{ color: "var(--neutral-gray)" }}
            />
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              No activity events yet.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Events will appear here as your application interacts with the backend.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--win95-border)" }}>
            {events.map((event) => (
              <EventRow
                key={event._id}
                event={event}
                debugMode={debugMode}
                expanded={expandedEvents.has(event._id)}
                onToggle={() => toggleExpanded(event._id)}
                getSeverityIcon={getSeverityIcon}
                getSeverityColor={getSeverityColor}
                getCategoryIcon={getCategoryIcon}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>
        )}

        {eventsResult?.hasMore && (
          <div className="p-4 text-center">
            <RetroButton variant="secondary" size="sm">
              Load More
            </RetroButton>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Event Row
 */
function EventRow({
  event,
  debugMode,
  expanded,
  onToggle,
  getSeverityIcon,
  getSeverityColor,
  getCategoryIcon,
  formatTimestamp,
}: {
  event: ActivityEvent;
  debugMode: boolean;
  expanded: boolean;
  onToggle: () => void;
  getSeverityIcon: (severity: string) => React.ReactNode;
  getSeverityColor: (severity: string) => string;
  getCategoryIcon: (category: string) => React.ReactNode;
  formatTimestamp: (timestamp: number) => string;
}) {
  return (
    <div
      className="hover:bg-gray-50 transition-colors"
      style={{ borderColor: "var(--win95-border)" }}
    >
      {/* Main Row */}
      <div
        className="px-4 py-2 flex items-start gap-3 cursor-pointer"
        onClick={debugMode && event.details ? onToggle : undefined}
      >
        {/* Expand Arrow (debug mode only) */}
        {debugMode && event.details && (
          <button className="mt-0.5 text-gray-400">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {/* Severity Icon */}
        <div className="mt-0.5">{getSeverityIcon(event.severity)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Summary */}
          <p
            className="text-xs"
            style={{ color: getSeverityColor(event.severity) }}
          >
            {event.summary}
          </p>

          {/* Meta Row */}
          <div className="flex items-center gap-2 mt-1">
            {/* Category */}
            <span
              className="flex items-center gap-1 text-xs px-1.5 py-0.5"
              style={{
                background: "var(--win95-bg-light)",
                color: "var(--neutral-gray)",
              }}
            >
              {getCategoryIcon(event.category)}
              {event.category}
            </span>

            {/* Event Type */}
            <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {event.eventType}
            </span>

            {/* Duration (if available) */}
            {debugMode && event.details?.durationMs && (
              <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {event.details.durationMs}ms
              </span>
            )}

            {/* Correlation ID (if available and in debug mode) */}
            {debugMode && event.details?.correlationId && (
              <span
                className="text-xs px-1.5 py-0.5"
                style={{
                  background: "var(--win95-highlight)",
                  color: "white",
                  fontSize: "10px",
                }}
                title="Correlation ID - click to filter related events"
              >
                {event.details.correlationId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-xs shrink-0" style={{ color: "var(--neutral-gray)" }}>
          {formatTimestamp(event.timestamp)}
        </span>
      </div>

      {/* Expanded Details (debug mode) */}
      {debugMode && expanded && event.details && (
        <div
          className="px-4 py-3 ml-10 mr-4 mb-2 border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <div className="space-y-2 font-mono text-xs">
            {/* Request Info */}
            {(event.details.method || event.details.endpoint) && (
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--neutral-gray)" }}>Request:</span>
                <span style={{ color: "var(--win95-text)" }}>
                  {event.details.method} {event.details.endpoint}
                </span>
                {event.details.statusCode && (
                  <span
                    style={{
                      color:
                        event.details.statusCode >= 400
                          ? "var(--error)"
                          : "var(--success)",
                    }}
                  >
                    ({event.details.statusCode})
                  </span>
                )}
              </div>
            )}

            {/* Object Info */}
            {event.details.objectType && (
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--neutral-gray)" }}>Object:</span>
                <span style={{ color: "var(--win95-text)" }}>
                  {event.details.objectType}
                  {event.details.objectName && ` - "${event.details.objectName}"`}
                </span>
                {event.details.objectId && (
                  <span style={{ color: "var(--neutral-gray)", fontSize: "10px" }}>
                    ({event.details.objectId})
                  </span>
                )}
              </div>
            )}

            {/* Sync Info */}
            {event.details.syncDirection && (
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--neutral-gray)" }}>Sync:</span>
                <span style={{ color: "var(--win95-text)" }}>
                  {event.details.syncDirection}
                  {event.details.recordsAffected !== undefined &&
                    ` (${event.details.recordsAffected} records)`}
                </span>
              </div>
            )}

            {/* Input/Output Summary */}
            {event.details.inputSummary && (
              <div>
                <span style={{ color: "var(--neutral-gray)" }}>Input:</span>
                <pre
                  className="mt-1 p-2 overflow-x-auto"
                  style={{
                    background: "white",
                    border: "1px solid var(--win95-border)",
                  }}
                >
                  {event.details.inputSummary}
                </pre>
              </div>
            )}
            {event.details.outputSummary && (
              <div>
                <span style={{ color: "var(--neutral-gray)" }}>Output:</span>
                <pre
                  className="mt-1 p-2 overflow-x-auto"
                  style={{
                    background: "white",
                    border: "1px solid var(--win95-border)",
                  }}
                >
                  {event.details.outputSummary}
                </pre>
              </div>
            )}

            {/* Error Info */}
            {event.details.errorMessage && (
              <div>
                <span style={{ color: "var(--error)" }}>Error:</span>
                <span className="ml-2" style={{ color: "var(--error)" }}>
                  {event.details.errorCode && `[${event.details.errorCode}] `}
                  {event.details.errorMessage}
                </span>
              </div>
            )}
            {event.details.stackTrace && (
              <div>
                <span style={{ color: "var(--neutral-gray)" }}>Stack Trace:</span>
                <pre
                  className="mt-1 p-2 overflow-x-auto text-red-600"
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid var(--error)",
                    fontSize: "10px",
                  }}
                >
                  {event.details.stackTrace}
                </pre>
              </div>
            )}

            {/* Source Location */}
            {event.details.sourceFile && (
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--neutral-gray)" }}>Source:</span>
                <span style={{ color: "var(--win95-text)" }}>
                  {event.details.sourceFile}
                  {event.details.sourceLine && `:${event.details.sourceLine}`}
                </span>
              </div>
            )}

            {/* Correlation ID */}
            {event.details.correlationId && (
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--neutral-gray)" }}>Correlation ID:</span>
                <code
                  className="px-1"
                  style={{
                    background: "white",
                    color: "var(--win95-highlight)",
                  }}
                >
                  {event.details.correlationId}
                </code>
              </div>
            )}

            {/* Request ID */}
            {event.details.requestId && (
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--neutral-gray)" }}>Request ID:</span>
                <code
                  className="px-1"
                  style={{ background: "white", color: "var(--neutral-gray)" }}
                >
                  {event.details.requestId}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
