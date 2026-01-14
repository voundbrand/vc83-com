"use client";

import { useState } from "react";
import {
  FileCode,
  Plus,
  Trash2,
  Edit2,
  X,
  ChevronDown,
  ChevronRight,
  Database,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Eye,
  Pencil,
  MoreHorizontal,
} from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PageMappingTabProps {
  applicationId: Id<"objects">;
  debugMode: boolean;
}

interface ObjectBinding {
  objectType: string;
  accessMode: "read" | "write" | "read_write";
  boundObjectIds?: Id<"objects">[];
  syncEnabled: boolean;
  syncDirection?: "push" | "pull" | "bidirectional";
}

interface ApplicationPage {
  _id: Id<"objects">;
  name: string;
  description?: string;
  status: string;
  customProperties?: {
    path: string;
    detectionMethod: string;
    pageType?: string;
    objectBindings: ObjectBinding[];
    lastDetectedAt?: number;
    lastActivityAt?: number;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Page Mapping Tab
 *
 * Displays detected pages/screens and their object bindings.
 * Allows users to configure which data types are used on each page.
 */
export function PageMappingTab({
  applicationId,
  debugMode,
}: PageMappingTabProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  // Reserved for future inline editing feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_editingBindings, _setEditingBindings] = useState<string | null>(null);

  // Query pages
  const pages = useQuery(
    api.activityProtocol.getApplicationPages,
    sessionId
      ? { sessionId, applicationId, status: "active" }
      : "skip"
  ) as ApplicationPage[] | undefined;

  // Mutations - reserved for future inline editing feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _updatePageBindings = useMutation(api.activityProtocol.updatePageBindings);
  const updatePageStatus = useMutation(api.activityProtocol.updatePageStatus);
  const deletePage = useMutation(api.activityProtocol.deletePage);

  const toggleExpanded = (pageId: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const handleDeletePage = async (pageId: Id<"objects">, pageName: string) => {
    if (!sessionId) return;

    if (!confirm(`Delete page "${pageName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deletePage({ sessionId, pageId });
      notification.success("Success", "Page deleted");
    } catch {
      notification.error("Error", "Failed to delete page");
    }
  };

  const handleArchivePage = async (pageId: Id<"objects">) => {
    if (!sessionId) return;

    try {
      await updatePageStatus({ sessionId, pageId, status: "archived" });
      notification.success("Success", "Page archived");
    } catch {
      notification.error("Error", "Failed to archive page");
    }
  };

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getDetectionMethodBadge = (method: string) => {
    switch (method) {
      case "cli_auto":
        return { label: "CLI Auto", color: "var(--success)" };
      case "manual":
        return { label: "Manual", color: "var(--win95-highlight)" };
      case "runtime":
        return { label: "Runtime", color: "var(--warning)" };
      default:
        return { label: method, color: "var(--neutral-gray)" };
    }
  };

  const getAccessModeIcon = (mode: string) => {
    switch (mode) {
      case "read":
        return <Eye size={12} />;
      case "write":
        return <Pencil size={12} />;
      case "read_write":
        return <MoreHorizontal size={12} />;
      default:
        return null;
    }
  };

  const getSyncDirectionIcon = (direction?: string) => {
    switch (direction) {
      case "push":
        return <ArrowUpRight size={12} />;
      case "pull":
        return <ArrowDownLeft size={12} />;
      case "bidirectional":
        return <ArrowLeftRight size={12} />;
      default:
        return null;
    }
  };

  if (!sessionId) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Please log in to view pages.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 border-b-2 flex items-center justify-between"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <div>
          <h4
            className="text-sm font-bold"
            style={{ color: "var(--win95-text)" }}
          >
            Detected Pages
          </h4>
          <p className="text-xs mt-0.5" style={{ color: "var(--neutral-gray)" }}>
            {pages?.length ?? 0} pages detected in this application
          </p>
        </div>
        <RetroButton
          variant="secondary"
          size="sm"
          className="flex items-center gap-1"
        >
          <Plus size={14} />
          Add Page
        </RetroButton>
      </div>

      {/* Page List */}
      <div className="flex-1 overflow-y-auto">
        {pages === undefined ? (
          <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
            Loading pages...
          </div>
        ) : pages.length === 0 ? (
          <div className="p-8 text-center">
            <FileCode
              size={32}
              className="mx-auto mb-2"
              style={{ color: "var(--neutral-gray)" }}
            />
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              No pages detected yet.
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--neutral-gray)" }}
            >
              Run the CLI to auto-detect pages, or add them manually.
            </p>
            <RetroButton
              variant="primary"
              size="sm"
              className="mt-4 flex items-center gap-2 mx-auto"
            >
              <Plus size={14} />
              Add Page Manually
            </RetroButton>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--win95-border)" }}>
            {pages.map((page) => (
              <PageRow
                key={page._id}
                page={page}
                expanded={expandedPages.has(page._id)}
                onToggle={() => toggleExpanded(page._id)}
                onDelete={() => handleDeletePage(page._id, page.name)}
                onArchive={() => handleArchivePage(page._id)}
                debugMode={debugMode}
                formatRelativeTime={formatRelativeTime}
                getDetectionMethodBadge={getDetectionMethodBadge}
                getAccessModeIcon={getAccessModeIcon}
                getSyncDirectionIcon={getSyncDirectionIcon}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Page Row
 */
function PageRow({
  page,
  expanded,
  onToggle,
  onDelete,
  onArchive: _onArchive, // Reserved for future archive functionality
  debugMode,
  formatRelativeTime,
  getDetectionMethodBadge,
  getAccessModeIcon,
  getSyncDirectionIcon,
}: {
  page: ApplicationPage;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onArchive: () => void;
  debugMode: boolean;
  formatRelativeTime: (timestamp?: number) => string;
  getDetectionMethodBadge: (method: string) => { label: string; color: string };
  getAccessModeIcon: (mode: string) => React.ReactNode;
  getSyncDirectionIcon: (direction?: string) => React.ReactNode;
}) {
  const props = page.customProperties;
  const bindings = props?.objectBindings ?? [];
  const detectionBadge = getDetectionMethodBadge(props?.detectionMethod ?? "unknown");

  return (
    <div style={{ borderColor: "var(--win95-border)" }}>
      {/* Main Row */}
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        {/* Expand Arrow */}
        <button className="mt-0.5 text-gray-400">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Page Icon */}
        <FileCode size={16} style={{ color: "var(--win95-highlight)" }} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Page Name */}
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold"
              style={{ color: "var(--win95-text)" }}
            >
              {page.name}
            </span>
            <span
              className="px-1.5 py-0.5 text-xs"
              style={{ background: detectionBadge.color, color: "white" }}
            >
              {detectionBadge.label}
            </span>
            {props?.pageType && (
              <span
                className="px-1.5 py-0.5 text-xs"
                style={{
                  background: "var(--win95-bg-light)",
                  color: "var(--neutral-gray)",
                }}
              >
                {props.pageType}
              </span>
            )}
          </div>

          {/* Path */}
          <p className="text-xs mt-0.5" style={{ color: "var(--neutral-gray)" }}>
            <code
              className="px-1"
              style={{ background: "var(--win95-bg-light)" }}
            >
              {props?.path ?? page.description}
            </code>
          </p>

          {/* Bindings Summary */}
          {bindings.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Database size={12} style={{ color: "var(--neutral-gray)" }} />
              <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {bindings.length} object binding{bindings.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                ({bindings.map((b) => b.objectType).join(", ")})
              </span>
            </div>
          )}

          {/* Debug Info */}
          {debugMode && (
            <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
              {props?.lastDetectedAt && (
                <span>Detected: {formatRelativeTime(props.lastDetectedAt)}</span>
              )}
              {props?.lastActivityAt && (
                <span>Last active: {formatRelativeTime(props.lastActivityAt)}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <RetroButton
            variant="secondary"
            size="sm"
            className="flex items-center gap-1"
          >
            <Edit2 size={12} />
          </RetroButton>
          <RetroButton
            variant="secondary"
            size="sm"
            className="flex items-center gap-1 text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 size={12} />
          </RetroButton>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div
          className="px-4 py-3 ml-10 mr-4 mb-3 border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          {/* Object Bindings */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h5
                className="text-xs font-bold"
                style={{ color: "var(--win95-text)" }}
              >
                Object Bindings
              </h5>
              <RetroButton
                variant="secondary"
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus size={12} />
                Add Binding
              </RetroButton>
            </div>

            {bindings.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                No object bindings configured. Add bindings to control which data
                types this page can access.
              </p>
            ) : (
              <div className="space-y-2">
                {bindings.map((binding, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "white",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Object Type */}
                      <span
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: "var(--win95-highlight)",
                          color: "white",
                        }}
                      >
                        {binding.objectType}
                      </span>

                      {/* Access Mode */}
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "var(--neutral-gray)" }}
                      >
                        {getAccessModeIcon(binding.accessMode)}
                        {binding.accessMode.replace("_", "/")}
                      </span>

                      {/* Sync Status */}
                      {binding.syncEnabled ? (
                        <span
                          className="flex items-center gap-1 text-xs px-1.5 py-0.5"
                          style={{
                            background: "var(--success)",
                            color: "white",
                          }}
                        >
                          <RefreshCw size={10} />
                          {getSyncDirectionIcon(binding.syncDirection)}
                          {binding.syncDirection}
                        </span>
                      ) : (
                        <span
                          className="text-xs px-1.5 py-0.5"
                          style={{
                            background: "var(--neutral-gray)",
                            color: "white",
                          }}
                        >
                          No sync
                        </span>
                      )}
                    </div>

                    {/* Binding Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit binding"
                      >
                        <Edit2 size={12} style={{ color: "var(--neutral-gray)" }} />
                      </button>
                      <button
                        className="p-1 hover:bg-red-50 rounded"
                        title="Remove binding"
                      >
                        <X size={12} style={{ color: "var(--error)" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Debug: Raw Data */}
          {debugMode && (
            <div>
              <h5
                className="text-xs font-bold mb-2"
                style={{ color: "var(--win95-text)" }}
              >
                Raw Page Data
              </h5>
              <pre
                className="p-2 text-xs overflow-x-auto"
                style={{
                  background: "white",
                  border: "1px solid var(--win95-border)",
                  fontFamily: "monospace",
                }}
              >
                {JSON.stringify(page, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
