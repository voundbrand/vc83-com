"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Loader2, Edit2, Trash2, Plus } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { KanbanColumn } from "./kanban-column";
import { ContactCard } from "./contact-card";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Active Pipelines Tab
 *
 * Shows organization pipelines with:
 * - Pipeline selector dropdown in header
 * - Edit/Delete actions on selected pipeline
 * - Full-width kanban board with drag-and-drop
 * - Interactive stage management (add/delete/edit stages)
 */

interface ActivePipelinesTabProps {
  initialPipelineId?: Id<"objects"> | null;
}

export function ActivePipelinesTab({ initialPipelineId }: ActivePipelinesTabProps = {}) {
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const currentOrganizationId = currentOrganization?.id as Id<"organizations"> | undefined;
  const { t } = useNamespaceTranslations("ui.crm");
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  const [selectedPipelineId, setSelectedPipelineId] = useState<Id<"objects"> | null>(initialPipelineId || null);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [isEditingPipeline, setIsEditingPipeline] = useState(false);
  const [editPipelineName, setEditPipelineName] = useState("");
  const [editPipelineDescription, setEditPipelineDescription] = useState("");
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newPipelineDescription, setNewPipelineDescription] = useState("");

  // Query organization's pipelines
  const pipelines = useQuery(
    api.crmPipeline.getOrganizationPipelines,
    sessionId && currentOrganizationId
      ? { sessionId, organizationId: currentOrganizationId }
      : "skip"
  );

  // Query pipeline with stages and contacts
  const pipelineWithStages = useQuery(
    api.crmPipeline.getPipelineWithStagesAndContacts,
    sessionId && selectedPipelineId
      ? { sessionId, pipelineId: selectedPipelineId }
      : "skip"
  );

  // Mutations
  const moveContact = useMutation(api.crmPipeline.moveContactToStage);
  const updatePipeline = useMutation(api.crmPipeline.updatePipeline);
  const deletePipeline = useMutation(api.crmPipeline.deletePipeline);
  const deleteStage = useMutation(api.crmPipeline.deleteStage);
  const createPipeline = useMutation(api.crmPipeline.createPipeline);

  // Auto-select first pipeline or default pipeline when pipelines load
  useEffect(() => {
    if (!selectedPipelineId && pipelines && pipelines.length > 0) {
      const defaultPipeline = pipelines.find(p =>
        (p.customProperties as { isDefault?: boolean })?.isDefault
      );
      setSelectedPipelineId(defaultPipeline?._id || pipelines[0]._id);
    }
  }, [pipelines, selectedPipelineId]);

  // Update selection when initialPipelineId changes
  useEffect(() => {
    if (initialPipelineId) {
      setSelectedPipelineId(initialPipelineId);
    }
  }, [initialPipelineId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveContactId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !sessionId || !selectedPipelineId) {
      setActiveContactId(null);
      return;
    }

    const contactId = active.id as Id<"objects">;
    const toStageId = over.id as Id<"objects">;

    try {
      await moveContact({
        sessionId,
        contactId,
        pipelineId: selectedPipelineId,
        toStageId,
      });
    } catch (error) {
      console.error("Failed to move contact:", error);
      notification.error(
        t("ui.crm.pipeline.update_failed") || "Failed to move contact",
        "Please try again."
      );
    }

    setActiveContactId(null);
  };

  const handleEditPipeline = () => {
    if (!pipelineWithStages) return;
    setEditPipelineName(pipelineWithStages.pipeline.name);
    setEditPipelineDescription(pipelineWithStages.pipeline.description || "");
    setIsEditingPipeline(true);
  };

  const handleSaveEdit = async () => {
    if (!sessionId || !selectedPipelineId) return;

    try {
      await updatePipeline({
        sessionId,
        pipelineId: selectedPipelineId,
        updates: {
          name: editPipelineName,
          description: editPipelineDescription,
        },
      });
      setIsEditingPipeline(false);
      notification.success(
        t("ui.crm.pipeline.update_success") || "Pipeline updated",
        "Changes saved successfully."
      );
    } catch (error) {
      console.error("Failed to update pipeline:", error);
      notification.error(
        t("ui.crm.pipeline.update_failed") || "Failed to update pipeline",
        "Please try again."
      );
    }
  };

  const handleCancelEdit = () => {
    setIsEditingPipeline(false);
    setEditPipelineName("");
    setEditPipelineDescription("");
  };

  const handleDeletePipeline = async () => {
    if (!sessionId || !selectedPipelineId || !pipelineWithStages) return;

    const confirmed = await confirmDialog.confirm({
      title: t("ui.crm.pipeline.delete") || "Delete Pipeline",
      message: t("ui.crm.pipeline.confirm_delete") || `Are you sure you want to delete "${pipelineWithStages.pipeline.name}"?`,
      confirmText: t("ui.crm.pipeline.delete") || "Delete",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await deletePipeline({
        sessionId,
        pipelineId: selectedPipelineId,
      });
      // Clear selection after delete
      setSelectedPipelineId(null);
      notification.success(
        t("ui.crm.pipeline.delete_success") || "Pipeline deleted",
        "The pipeline has been archived."
      );
    } catch (error) {
      console.error("Failed to delete pipeline:", error);
      notification.error(
        t("ui.crm.pipeline.delete_failed") || "Failed to delete pipeline",
        "Please try again."
      );
    }
  };

  const handleDeleteStage = async (stageId: Id<"objects">) => {
    if (!sessionId) return;

    const confirmed = await confirmDialog.confirm({
      title: t("ui.crm.pipeline.delete_stage") || "Delete Stage",
      message: t("ui.crm.pipeline.confirm_delete_stage") || "Are you sure you want to delete this stage?",
      confirmText: t("ui.crm.pipeline.delete") || "Delete",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await deleteStage({
        sessionId,
        stageId,
      });
      notification.success(
        t("ui.crm.pipeline.delete_stage_success") || "Stage deleted",
        "The stage has been removed."
      );
    } catch (error) {
      console.error("Failed to delete stage:", error);
      notification.error(
        t("ui.crm.pipeline.delete_stage_failed") || "Failed to delete stage",
        t("ui.crm.pipeline.cannot_delete_stage_with_contacts") || "Make sure the stage has no contacts."
      );
    }
  };

  const handleCreatePipeline = async () => {
    if (!sessionId || !currentOrganizationId) return;
    if (!newPipelineName.trim()) {
      notification.error(
        t("ui.crm.pipeline.name_required") || "Name required",
        "Please enter a pipeline name."
      );
      return;
    }

    try {
      const result = await createPipeline({
        sessionId,
        organizationId: currentOrganizationId,
        name: newPipelineName,
        description: newPipelineDescription,
      });

      // Select the newly created pipeline
      if (result && result.pipelineId) {
        setSelectedPipelineId(result.pipelineId);
      }

      // Reset form
      setIsCreatingPipeline(false);
      setNewPipelineName("");
      setNewPipelineDescription("");

      notification.success(
        t("ui.crm.pipeline.create_success") || "Pipeline created",
        "Your new pipeline is ready to use."
      );
    } catch (error) {
      console.error("Failed to create pipeline:", error);
      notification.error(
        t("ui.crm.pipeline.create_failed") || "Failed to create pipeline",
        "Please try again."
      );
    }
  };

  const handleCancelCreate = () => {
    setIsCreatingPipeline(false);
    setNewPipelineName("");
    setNewPipelineDescription("");
  };

  // Loading state
  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p style={{ color: "var(--neutral-gray)" }} className="text-sm">
          {t("ui.crm.pipeline.not_authenticated") || "Please sign in to view pipelines"}
        </p>
      </div>
    );
  }

  if (pipelines === undefined) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="animate-spin" size={24} style={{ color: "var(--tone-accent)" }} />
        <p className="ml-3 text-sm" style={{ color: "var(--window-document-text)" }}>
          {t("ui.crm.pipeline.loading") || "Loading pipelines..."}
        </p>
      </div>
    );
  }

  // No pipelines state - show empty state with "New Pipeline" button
  if (!pipelines || pipelines.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <confirmDialog.Dialog />
        <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
          <TrendingUp size={48} className="mb-4 opacity-30" style={{ color: "var(--neutral-gray)" }} />
          <p className="font-pixel text-sm mb-2" style={{ color: "var(--window-document-text)" }}>
            {t("ui.crm.pipeline.no_pipelines") || "No Pipelines Found"}
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.crm.pipeline.no_pipelines_hint") ||
             "Create a new pipeline or go to the Templates tab to copy a template"}
          </p>

          {/* New Pipeline Button */}
          <button
            onClick={() => setIsCreatingPipeline(true)}
            className="desktop-interior-button px-4 py-2 flex items-center gap-2 text-sm"
            style={{ background: "var(--success)", color: "white" }}
          >
            <Plus size={16} />
            <span className="font-pixel">{t("ui.crm.pipeline.create_new") || "Create New Pipeline"}</span>
          </button>

          {/* Create Mode Form (shows when button clicked) */}
          {isCreatingPipeline && (
            <div
              className="mt-6 w-full max-w-md p-4 border-2 space-y-3"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
            >
              <h3 className="text-sm font-bold mb-3" style={{ color: "var(--window-document-text)" }}>
                {t("ui.crm.pipeline.create_new") || "Create New Pipeline"}
              </h3>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.crm.pipeline.name") || "Pipeline Name"} *
                </label>
                <input
                  type="text"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  className="w-full retro-input px-3 py-2 text-sm"
                  style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}
                  placeholder={t("ui.crm.pipeline.name_placeholder") || "Enter pipeline name"}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.crm.pipeline.description") || "Description"}
                </label>
                <textarea
                  value={newPipelineDescription}
                  onChange={(e) => setNewPipelineDescription(e.target.value)}
                  className="w-full retro-input px-3 py-2 text-sm"
                  style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}
                  placeholder={t("ui.crm.pipeline.description_placeholder") || "Enter pipeline description"}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePipeline}
                  className="desktop-interior-button px-4 py-2 text-xs font-pixel"
                  style={{ background: "var(--success)", color: "white" }}
                >
                  {t("ui.crm.pipeline.create") || "Create Pipeline"}
                </button>
                <button
                  onClick={handleCancelCreate}
                  className="desktop-interior-button px-4 py-2 text-xs font-pixel"
                  style={{ background: "var(--neutral-gray)", color: "white" }}
                >
                  {t("ui.crm.pipeline.cancel") || "Cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single Column Layout with Header Controls
  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--window-document-bg)' }}>
      <confirmDialog.Dialog />
      {/* Header: Pipeline Selector + Actions */}
      <div
        className="p-3 border-b-2 flex items-center justify-between gap-4"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg-elevated)'
        }}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Pipeline Dropdown */}
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "var(--window-document-text)" }} />
            <select
              className="retro-input px-3 py-1.5 text-sm"
              style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}
              value={selectedPipelineId || ""}
              onChange={(e) => setSelectedPipelineId(e.target.value as Id<"objects">)}
            >
              <option value="" disabled>
                {t("ui.crm.pipeline.select_pipeline") || "Select a pipeline..."}
              </option>
              {pipelines.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}
                  {(p.customProperties as { isDefault?: boolean })?.isDefault && " ★"}
                </option>
              ))}
            </select>

            {/* Create New Pipeline Button */}
            <button
              onClick={() => setIsCreatingPipeline(true)}
              className="desktop-interior-button px-3 py-1.5 flex items-center gap-2 text-xs"
              style={{ background: "var(--success)", color: "white" }}
              title={t("ui.crm.pipeline.create_new") || "Create new pipeline"}
            >
              <Plus size={14} />
              <span className="font-pixel">{t("ui.crm.pipeline.create_new") || "New"}</span>
            </button>
          </div>

          {/* Pipeline Info (when selected) */}
          {pipelineWithStages && !isEditingPipeline && (
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: "var(--neutral-gray)" }}>
                {pipelineWithStages.pipeline.description || t("ui.crm.pipeline.no_description") || "No description"}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {selectedPipelineId && (
          <div className="flex gap-2">
            {!isEditingPipeline ? (
              <>
                <button
                  onClick={handleEditPipeline}
                  className="desktop-interior-button px-3 py-1.5 flex items-center gap-2 text-xs"
                  style={{ background: "var(--tone-accent)", color: "var(--window-document-text)" }}
                  title={t("ui.crm.pipeline.edit") || "Edit pipeline"}
                >
                  <Edit2 size={14} />
                  <span className="font-pixel">{t("ui.crm.pipeline.edit") || "Edit"}</span>
                </button>
                <button
                  onClick={handleDeletePipeline}
                  className="desktop-interior-button px-3 py-1.5 flex items-center gap-2 text-xs"
                  style={{ background: "var(--error)", color: "white" }}
                  title={t("ui.crm.pipeline.delete") || "Delete pipeline"}
                >
                  <Trash2 size={14} />
                  <span className="font-pixel">{t("ui.crm.pipeline.delete") || "Delete"}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="desktop-interior-button px-3 py-1.5 text-xs font-pixel"
                  style={{ background: "var(--success)", color: "white" }}
                >
                  {t("ui.crm.pipeline.save") || "Save"}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="desktop-interior-button px-3 py-1.5 text-xs font-pixel"
                  style={{ background: "var(--neutral-gray)", color: "white" }}
                >
                  {t("ui.crm.pipeline.cancel") || "Cancel"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Mode: New Pipeline Form */}
      {isCreatingPipeline && (
        <div className="p-4 border-b-2 space-y-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--window-document-text)" }}>
            {t("ui.crm.pipeline.create_new") || "Create New Pipeline"}
          </h3>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "var(--window-document-text)" }}>
              {t("ui.crm.pipeline.name") || "Pipeline Name"} *
            </label>
            <input
              type="text"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              className="w-full retro-input px-3 py-2 text-sm"
              style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}
              placeholder={t("ui.crm.pipeline.name_placeholder") || "Enter pipeline name"}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "var(--window-document-text)" }}>
              {t("ui.crm.pipeline.description") || "Description"}
            </label>
            <textarea
              value={newPipelineDescription}
              onChange={(e) => setNewPipelineDescription(e.target.value)}
              className="w-full retro-input px-3 py-2 text-sm"
              style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}
              placeholder={t("ui.crm.pipeline.description_placeholder") || "Enter pipeline description"}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreatePipeline}
              className="desktop-interior-button px-4 py-2 text-xs font-pixel"
              style={{ background: "var(--success)", color: "white" }}
            >
              {t("ui.crm.pipeline.create") || "Create Pipeline"}
            </button>
            <button
              onClick={handleCancelCreate}
              className="desktop-interior-button px-4 py-2 text-xs font-pixel"
              style={{ background: "var(--neutral-gray)", color: "white" }}
            >
              {t("ui.crm.pipeline.cancel") || "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Mode: Pipeline Details Form */}
      {isEditingPipeline && pipelineWithStages && (
        <div className="p-4 border-b-2 space-y-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "var(--window-document-text)" }}>
              {t("ui.crm.pipeline.name") || "Pipeline Name"}
            </label>
            <input
              type="text"
              value={editPipelineName}
              onChange={(e) => setEditPipelineName(e.target.value)}
              className="w-full retro-input px-3 py-2 text-sm"
              style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}
              placeholder={t("ui.crm.pipeline.name_placeholder") || "Enter pipeline name"}
            />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "var(--window-document-text)" }}>
              {t("ui.crm.pipeline.description") || "Description"}
            </label>
            <textarea
              value={editPipelineDescription}
              onChange={(e) => setEditPipelineDescription(e.target.value)}
              className="w-full retro-input px-3 py-2 text-sm"
              style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}
              placeholder={t("ui.crm.pipeline.description_placeholder") || "Enter pipeline description"}
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {!selectedPipelineId ? (
          <div className="flex items-center justify-center h-full p-4">
            <p style={{ color: "var(--neutral-gray)" }} className="text-sm">
              {t("ui.crm.pipeline.select_to_view") || "Select a pipeline to view"}
            </p>
          </div>
        ) : !pipelineWithStages ? (
          <div className="flex items-center justify-center h-full p-4">
            <Loader2 className="animate-spin" size={24} style={{ color: "var(--tone-accent)" }} />
            <p className="ml-3 text-sm" style={{ color: "var(--window-document-text)" }}>
              {t("ui.crm.pipeline.loading_stages") || "Loading pipeline stages..."}
            </p>
          </div>
        ) : (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {/* Kanban Board */}
            <div className="h-full flex gap-4 p-4 overflow-x-auto">
              {pipelineWithStages.stages.map(stage => {
                const stageContacts = pipelineWithStages.contactsByStage[stage._id] || [];
                return (
                  <KanbanColumn
                    key={stage._id}
                    stageId={stage._id}
                    stageLabel={stage.name}
                    contacts={stageContacts}
                    isEditMode={isEditingPipeline}
                    onDeleteStage={handleDeleteStage}
                  />
                );
              })}

              {/* Add Stage Button (placeholder for future interactive stage builder) */}
              <div
                className="w-[280px] flex-shrink-0 border-2 rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-opacity-80 transition-colors"
                style={{
                  borderColor: "var(--window-document-border)",
                  borderStyle: "dashed",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="text-center">
                  <Plus size={32} className="mx-auto mb-2" style={{ color: "var(--neutral-gray)" }} />
                  <p className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.crm.pipeline.add_stage") || "Add Stage"}
                  </p>
                </div>
              </div>
            </div>

            <DragOverlay>
              {activeContactId && (() => {
                const allContacts = Object.values(pipelineWithStages.contactsByStage).flat();
                const activeContact = allContacts.find((c) => c?._id === activeContactId);
                return activeContact ? <ContactCard contact={activeContact as Record<string, unknown> & { _id: string }} /> : null;
              })()}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
