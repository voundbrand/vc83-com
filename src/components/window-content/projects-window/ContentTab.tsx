/**
 * CONTENT TAB
 * Manages editable content blocks for project pages.
 * Allows viewing/editing content in both DE and EN languages.
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  FileText,
  Languages,
  History,
  Save,
  X,
  Edit2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ContentTabProps {
  projectId: string;
  sessionId: string;
  organizationId: Id<"organizations">;
}

interface ContentBlock {
  blockId: string;
  content: { de: string; en: string };
  version: number;
  lastModifiedAt: number;
  modifiedByName?: string;
}

interface ContentRevision {
  version: number;
  content: { de: string; en: string };
  createdAt: number;
  createdByName?: string;
  changeNote?: string;
}

type Language = "de" | "en";

export default function ContentTab({
  projectId,
  sessionId,
  organizationId,
}: ContentTabProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("de");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["hero", "cta"])
  );
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

  // Fetch all content blocks for this project
  const projectContent = useQuery(api.projectContent.getProjectContent, {
    projectId,
  });

  // Fetch revision history for selected block
  const revisions = useQuery(
    api.projectContent.getContentRevisions,
    showHistoryFor
      ? { projectId, blockId: showHistoryFor }
      : "skip"
  );

  // Mutations
  const saveContentBlock = useMutation(api.projectContent.saveContentBlock);
  const restoreVersion = useMutation(api.projectContent.restoreContentVersion);

  // Group content by section
  const contentBySection: Record<string, ContentBlock[]> = {};
  if (projectContent) {
    Object.entries(projectContent).forEach(([blockId, block]) => {
      const section = blockId.split(".")[0];
      if (!contentBySection[section]) {
        contentBySection[section] = [];
      }
      contentBySection[section].push({
        blockId,
        ...block,
      });
    });
  }

  // Start editing a block
  const handleStartEdit = (blockId: string, currentValue: string) => {
    setEditingBlockId(blockId);
    setEditValue(currentValue);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingBlockId(null);
    setEditValue("");
  };

  // Save content
  const handleSave = async () => {
    if (!editingBlockId) return;

    setIsSaving(true);
    try {
      const content =
        selectedLanguage === "de" ? { de: editValue } : { en: editValue };

      await saveContentBlock({
        projectId,
        blockId: editingBlockId,
        organizationId,
        content,
        modifiedBy: sessionId,
        modifiedByName: "Admin", // TODO: Get actual user name
        changeNote: "Edited via admin UI",
      });

      setEditingBlockId(null);
      setEditValue("");
    } catch (error) {
      console.error("Failed to save content:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Restore a previous version
  const handleRestore = async (version: number) => {
    if (!showHistoryFor) return;

    try {
      await restoreVersion({
        projectId,
        blockId: showHistoryFor,
        organizationId,
        targetVersion: version,
        restoredBy: sessionId,
        restoredByName: "Admin",
      });

      setShowHistoryFor(null);
    } catch (error) {
      console.error("Failed to restore version:", error);
    }
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Loading state
  if (projectContent === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2
            size={32}
            className="animate-spin mx-auto mb-2"
            style={{ color: "var(--tone-accent)" }}
          />
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            Loading content...
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!projectContent || Object.keys(projectContent).length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText
            size={48}
            className="mx-auto mb-4"
            style={{ color: "var(--neutral-gray)" }}
          />
          <p
            className="font-semibold mb-2"
            style={{ color: "var(--window-document-text)" }}
          >
            No Content Blocks Yet
          </p>
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            Content blocks will appear here once users start editing the project
            page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <div
        className="flex items-center justify-between p-3 border-2"
        style={{
          borderColor: "var(--window-document-border)",
          backgroundColor: "var(--window-document-bg-elevated)",
        }}
      >
        <div className="flex items-center gap-2">
          <Languages size={16} style={{ color: "var(--tone-accent)" }} />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--window-document-text)" }}
          >
            Language:
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedLanguage("de")}
            className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
              selectedLanguage === "de" ? "border-purple-500 bg-purple-50" : ""
            }`}
            style={{
              borderColor:
                selectedLanguage === "de"
                  ? "var(--tone-accent)"
                  : "var(--window-document-border)",
              backgroundColor:
                selectedLanguage === "de"
                  ? "#f3e8ff"
                  : "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            🇩🇪 German
          </button>
          <button
            onClick={() => setSelectedLanguage("en")}
            className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
              selectedLanguage === "en" ? "border-purple-500 bg-purple-50" : ""
            }`}
            style={{
              borderColor:
                selectedLanguage === "en"
                  ? "var(--tone-accent)"
                  : "var(--window-document-border)",
              backgroundColor:
                selectedLanguage === "en"
                  ? "#f3e8ff"
                  : "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            🇬🇧 English
          </button>
        </div>
      </div>

      {/* Content Sections */}
      {Object.entries(contentBySection)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([section, blocks]) => (
          <div
            key={section}
            className="border-2"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              style={{ backgroundColor: "var(--window-document-bg-elevated)" }}
            >
              <div className="flex items-center gap-2">
                {expandedSections.has(section) ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                <span
                  className="text-sm font-bold uppercase"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {section}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--tone-accent)",
                    color: "white",
                  }}
                >
                  {blocks.length} blocks
                </span>
              </div>
            </button>

            {/* Section Content */}
            {expandedSections.has(section) && (
              <div className="border-t-2" style={{ borderColor: "var(--window-document-border)" }}>
                {blocks
                  .sort((a, b) => a.blockId.localeCompare(b.blockId))
                  .map((block) => (
                    <div
                      key={block.blockId}
                      className="p-3 border-b last:border-b-0"
                      style={{ borderColor: "var(--window-document-border)" }}
                    >
                      {/* Block Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <code
                            className="text-xs px-1 py-0.5 rounded"
                            style={{
                              backgroundColor: "#f3f4f6",
                              color: "#6b7280",
                            }}
                          >
                            {block.blockId}
                          </code>
                          <div
                            className="text-xs mt-1 flex items-center gap-2"
                            style={{ color: "var(--neutral-gray)" }}
                          >
                            <span>v{block.version}</span>
                            {block.lastModifiedAt && (
                              <>
                                <span>•</span>
                                <span>
                                  {format(
                                    new Date(block.lastModifiedAt),
                                    "MMM d, yyyy HH:mm"
                                  )}
                                </span>
                              </>
                            )}
                            {block.modifiedByName && (
                              <>
                                <span>•</span>
                                <span>by {block.modifiedByName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setShowHistoryFor(block.blockId)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="View history"
                          >
                            <History size={14} style={{ color: "var(--neutral-gray)" }} />
                          </button>
                          {editingBlockId !== block.blockId && (
                            <button
                              onClick={() =>
                                handleStartEdit(
                                  block.blockId,
                                  block.content[selectedLanguage] || ""
                                )
                              }
                              className="p-1.5 hover:bg-purple-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} style={{ color: "var(--tone-accent)" }} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Block Content */}
                      {editingBlockId === block.blockId ? (
                        <div className="space-y-2">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full p-2 text-sm border-2 rounded resize-y min-h-[80px]"
                            style={{
                              borderColor: "var(--tone-accent)",
                              backgroundColor: "white",
                            }}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={isSaving}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border-2 transition-colors"
                              style={{
                                borderColor: "var(--success)",
                                backgroundColor: "#dcfce7",
                                color: "#166534",
                              }}
                            >
                              {isSaving ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Save size={12} />
                              )}
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border-2 transition-colors"
                              style={{
                                borderColor: "var(--window-document-border)",
                                backgroundColor: "var(--window-document-bg-elevated)",
                                color: "var(--window-document-text)",
                              }}
                            >
                              <X size={12} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="text-sm whitespace-pre-wrap"
                          style={{ color: "var(--window-document-text)" }}
                        >
                          {block.content[selectedLanguage] || (
                            <span style={{ color: "var(--neutral-gray)", fontStyle: "italic" }}>
                              No content for {selectedLanguage === "de" ? "German" : "English"}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}

      {/* History Modal */}
      {showHistoryFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowHistoryFor(null)}
          />
          <div
            className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto border-2"
            style={{
              borderColor: "var(--window-document-border)",
              backgroundColor: "var(--window-document-bg)",
            }}
          >
            {/* Modal Header */}
            <div
              className="sticky top-0 flex items-center justify-between p-3 border-b-2"
              style={{
                borderColor: "var(--window-document-border)",
                backgroundColor: "var(--window-titlebar-bg)",
              }}
            >
              <div className="flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
                <History size={16} />
                <span className="font-bold text-sm">Version History</span>
              </div>
              <button
                onClick={() => setShowHistoryFor(null)}
                className="rounded p-1"
                style={{ backgroundColor: "transparent", color: "var(--window-document-text)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = "var(--desktop-menu-hover)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              <code
                className="text-xs px-2 py-1 rounded mb-4 inline-block"
                style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
              >
                {showHistoryFor}
              </code>

              {revisions === undefined ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    size={24}
                    className="animate-spin"
                    style={{ color: "var(--tone-accent)" }}
                  />
                </div>
              ) : revisions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle
                    size={32}
                    className="mx-auto mb-2"
                    style={{ color: "var(--neutral-gray)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--neutral-gray)" }}
                  >
                    No revision history available
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {revisions.map((rev: ContentRevision) => (
                    <div
                      key={rev.version}
                      className="p-3 border-2"
                      style={{ borderColor: "var(--window-document-border)" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: "var(--tone-accent)",
                              color: "white",
                            }}
                          >
                            v{rev.version}
                          </span>
                          <span
                            className="text-xs flex items-center gap-1"
                            style={{ color: "var(--neutral-gray)" }}
                          >
                            <Clock size={12} />
                            {format(new Date(rev.createdAt), "MMM d, yyyy HH:mm")}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRestore(rev.version)}
                          className="text-xs px-2 py-1 border hover:bg-purple-50"
                          style={{
                            borderColor: "var(--tone-accent)",
                            color: "var(--tone-accent)",
                          }}
                        >
                          Restore
                        </button>
                      </div>
                      {rev.createdByName && (
                        <p
                          className="text-xs mb-2"
                          style={{ color: "var(--neutral-gray)" }}
                        >
                          by {rev.createdByName}
                        </p>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                          🇩🇪 {rev.content.de || <em className="text-gray-400">empty</em>}
                        </p>
                        <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                          🇬🇧 {rev.content.en || <em className="text-gray-400">empty</em>}
                        </p>
                      </div>
                      {rev.changeNote && (
                        <p
                          className="text-xs mt-2 italic"
                          style={{ color: "var(--neutral-gray)" }}
                        >
                          Note: {rev.changeNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
