"use client";

import { useState } from "react";
import { TrendingUp, Edit2, Trash2, Plus, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Pipeline List Component
 *
 * Displays list of organization pipelines with CRUD actions.
 * Similar to contacts list - shows pipelines on the left for selection.
 */

interface Pipeline {
  _id: Id<"objects">;
  name: string;
  description?: string;
  subtype?: string;
  status?: string;
  customProperties?: {
    isDefault?: boolean;
    color?: string;
    stageCount?: number;
  };
}

interface PipelineListProps {
  pipelines: Pipeline[];
  selectedPipelineId: Id<"objects"> | null;
  onSelectPipeline: (pipelineId: Id<"objects">) => void;
  onPipelineDeleted?: () => void;
}

export function PipelineList({
  pipelines,
  selectedPipelineId,
  onSelectPipeline,
  onPipelineDeleted,
}: PipelineListProps) {
  const { t } = useNamespaceTranslations("ui.crm");
  const { sessionId } = useAuth();
  const [editingId, setEditingId] = useState<Id<"objects"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deletingId, setDeletingId] = useState<Id<"objects"> | null>(null);

  const updatePipeline = useMutation(api.crmPipeline.updatePipeline);
  const deletePipeline = useMutation(api.crmPipeline.deletePipeline);

  const handleEdit = (pipeline: Pipeline) => {
    setEditingId(pipeline._id);
    setEditName(pipeline.name);
    setEditDescription(pipeline.description || "");
  };

  const handleSaveEdit = async (pipelineId: Id<"objects">) => {
    if (!sessionId) return;

    try {
      await updatePipeline({
        sessionId,
        pipelineId,
        updates: {
          name: editName,
          description: editDescription,
        },
      });
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update pipeline:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const handleDelete = async (pipelineId: Id<"objects">) => {
    if (!sessionId) return;
    if (!confirm(t("ui.crm.pipeline.confirm_delete") || "Are you sure you want to delete this pipeline?")) {
      return;
    }

    try {
      setDeletingId(pipelineId);
      await deletePipeline({
        sessionId,
        pipelineId,
      });
      onPipelineDeleted?.();
    } catch (error) {
      console.error("Failed to delete pipeline:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--window-document-bg-elevated)" }}>
      {/* Header */}
      <div className="p-3 border-b-2" style={{ borderColor: "var(--window-document-border)" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            {t("ui.crm.pipeline.my_pipelines") || "My Pipelines"}
          </h3>
          <button
            className="desktop-interior-button p-1.5"
            style={{ background: "var(--tone-accent)", color: "var(--window-document-text)" }}
            title={t("ui.crm.pipeline.create_new") || "Create new pipeline"}
          >
            <Plus size={14} />
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {pipelines.length} {pipelines.length === 1 ? "pipeline" : "pipelines"}
        </p>
      </div>

      {/* Pipeline List */}
      <div className="flex-1 overflow-y-auto">
        {pipelines.map((pipeline) => {
          const isSelected = selectedPipelineId === pipeline._id;
          const isEditing = editingId === pipeline._id;
          const isDeleting = deletingId === pipeline._id;
          const pipelineColor = pipeline.customProperties?.color || "var(--tone-accent)";

          return (
            <div
              key={pipeline._id}
              className={`border-b-2 transition-colors ${isSelected ? "shadow-inner" : ""}`}
              style={{
                borderColor: "var(--window-document-border)",
                background: isSelected ? "var(--desktop-menu-hover)" : "var(--window-document-bg-elevated)",
              }}
            >
              {isEditing ? (
                // Edit Mode
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full retro-input px-2 py-1 text-xs"
                    style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}
                    placeholder="Pipeline name"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full retro-input px-2 py-1 text-xs"
                    style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}
                    placeholder="Description"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(pipeline._id)}
                      className="desktop-interior-button px-2 py-1 text-xs flex-1"
                      style={{ background: "var(--success)", color: "white" }}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="desktop-interior-button px-2 py-1 text-xs flex-1"
                      style={{ background: "var(--neutral-gray)", color: "white" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <button
                  onClick={() => onSelectPipeline(pipeline._id)}
                  className="w-full p-3 text-left hover:opacity-80 transition-opacity"
                  disabled={isDeleting}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div
                        className="p-1.5 rounded border flex-shrink-0"
                        style={{
                          backgroundColor: "var(--window-document-bg)",
                          borderColor: pipelineColor,
                          color: pipelineColor,
                        }}
                      >
                        <TrendingUp size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4
                            className="text-sm font-bold truncate"
                            style={{ color: isSelected ? "var(--window-document-text)" : "var(--window-document-text)" }}
                          >
                            {pipeline.name}
                          </h4>
                          {pipeline.customProperties?.isDefault && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                background: "var(--tone-accent)",
                                color: "white",
                              }}
                            >
                              Default
                            </span>
                          )}
                        </div>
                        {pipeline.description && (
                          <p
                            className="text-xs truncate mb-1"
                            style={{ color: isSelected ? "var(--window-document-text)" : "var(--neutral-gray)" }}
                          >
                            {pipeline.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {pipeline.subtype && (
                            <span className="capitalize">{pipeline.subtype}</span>
                          )}
                          {pipeline.customProperties?.stageCount !== undefined && (
                            <span>
                              {pipeline.customProperties.stageCount}{" "}
                              {pipeline.customProperties.stageCount === 1 ? "stage" : "stages"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1 flex-shrink-0">
                      {isDeleting ? (
                        <Loader2 size={14} className="animate-spin" style={{ color: "var(--neutral-gray)" }} />
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(pipeline);
                            }}
                            className="desktop-interior-button p-1.5 hover:bg-blue-500 transition-colors"
                            style={{ background: "var(--window-document-bg-elevated)" }}
                            title="Edit pipeline"
                          >
                            <Edit2 size={12} style={{ color: "var(--window-document-text)" }} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(pipeline._id);
                            }}
                            className="desktop-interior-button p-1.5 hover:bg-red-500 transition-colors"
                            style={{ background: "var(--window-document-bg-elevated)" }}
                            title="Delete pipeline"
                          >
                            <Trash2 size={12} style={{ color: "var(--error)" }} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
