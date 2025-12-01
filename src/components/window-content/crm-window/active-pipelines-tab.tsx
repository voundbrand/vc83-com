"use client";

import { useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { KanbanColumn } from "./kanban-column";
import { ContactCard } from "./contact-card";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Active Pipelines Tab
 *
 * Shows user's organization pipelines (copied from templates).
 * Allows selecting which pipeline to view and dragging contacts between stages.
 */

export function ActivePipelinesTab() {
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const currentOrganizationId = currentOrganization?.id as Id<"organizations"> | undefined;
  const { t } = useNamespaceTranslations("ui.crm");

  const [selectedPipelineId, setSelectedPipelineId] = useState<Id<"objects"> | null>(null);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);

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

  // Move contact mutation
  const moveContact = useMutation(api.crmPipeline.moveContactToStage);

  // Auto-select first pipeline or default pipeline
  const effectivePipelineId = selectedPipelineId || pipelines?.find(p =>
    (p.customProperties as { isDefault?: boolean })?.isDefault
  )?._id || pipelines?.[0]?._id || null;

  if (effectivePipelineId && effectivePipelineId !== selectedPipelineId) {
    setSelectedPipelineId(effectivePipelineId);
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveContactId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !sessionId || !effectivePipelineId) {
      setActiveContactId(null);
      return;
    }

    const contactId = active.id as Id<"objects">;
    const toStageId = over.id as Id<"objects">;

    try {
      await moveContact({
        sessionId,
        contactId,
        pipelineId: effectivePipelineId,
        toStageId,
      });
    } catch (error) {
      console.error("Failed to move contact:", error);
      alert(t("ui.crm.pipeline.update_failed") || "Failed to move contact. Please try again.");
    }

    setActiveContactId(null);
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
        <Loader2 className="animate-spin" size={24} style={{ color: "var(--win95-highlight)" }} />
        <p className="ml-3 text-sm" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.loading") || "Loading pipelines..."}
        </p>
      </div>
    );
  }

  // No pipelines state
  if (!pipelines || pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <TrendingUp size={48} className="mb-4 opacity-30" style={{ color: "var(--neutral-gray)" }} />
        <p className="font-pixel text-sm mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.no_pipelines") || "No Pipelines Found"}
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.crm.pipeline.no_pipelines_hint") ||
           "Go to the Templates tab to copy a pipeline template to your organization"}
        </p>
      </div>
    );
  }

  // Loading pipeline stages
  if (!pipelineWithStages) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="animate-spin" size={24} style={{ color: "var(--win95-highlight)" }} />
        <p className="ml-3 text-sm" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.loading_stages") || "Loading pipeline stages..."}
        </p>
      </div>
    );
  }

  const { pipeline, stages, contactsByStage } = pipelineWithStages;

  // Find active contact for drag overlay
  const allContacts = Object.values(contactsByStage).flat();
  const activeContact = activeContactId
    ? allContacts.find((c: any) => c?._id === activeContactId)
    : null;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col" style={{ background: 'var(--win95-bg)' }}>
        {/* Pipeline Selector Header */}
        {pipelines.length > 1 && (
          <div
            className="flex items-center justify-between p-3 border-b-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)'
            }}
          >
            <label className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              {t("ui.crm.pipeline.select_pipeline") || "Pipeline:"}
            </label>
            <select
              className="retro-input px-3 py-1 text-sm"
              value={effectivePipelineId || ""}
              onChange={(e) => setSelectedPipelineId(e.target.value as Id<"objects">)}
            >
              {pipelines.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}
                  {(p.customProperties as { isDefault?: boolean })?.isDefault && " (Default)"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pipeline Info */}
        <div
          className="p-3 border-b-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <h3 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
            {pipeline.name}
          </h3>
          {pipeline.description && (
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {pipeline.description}
            </p>
          )}
        </div>

        {/* Kanban Board */}
        <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
          {stages.map(stage => {
            const stageContacts = contactsByStage[stage._id] || [];
            return (
              <KanbanColumn
                key={stage._id}
                stageId={stage._id}
                stageLabel={stage.name}
                contacts={stageContacts}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeContact && <ContactCard contact={activeContact} />}
      </DragOverlay>
    </DndContext>
  );
}
