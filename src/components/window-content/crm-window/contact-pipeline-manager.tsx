"use client";

import { useState } from "react";
import { TrendingUp, Plus, X, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Contact Pipeline Manager
 *
 * Allows viewing, adding, removing, and managing a contact's pipelines and stages
 */

// Types for pipeline-related data from Convex queries
interface PipelineStageFromQuery {
  _id: Id<"objects">;
  name: string;
  customProperties?: Record<string, unknown>;
}

interface ContactPipelineItem {
  pipeline: {
    _id: Id<"objects">;
    name?: string;
    description?: string;
    customProperties?: Record<string, unknown>;
  } | null;
  stage: {
    _id: Id<"objects">;
    name?: string;
  } | null;
  stages?: PipelineStageFromQuery[];
  properties?: Record<string, unknown>;
  linkId?: Id<"objectLinks">;
}

interface ContactPipelineManagerProps {
  contactId: Id<"objects">;
}

export function ContactPipelineManager({ contactId }: ContactPipelineManagerProps) {
  const { t } = useNamespaceTranslations("ui.crm");
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const currentOrganizationId = currentOrganization?.id as Id<"organizations"> | undefined;

  const [showAddPipeline, setShowAddPipeline] = useState(false);
  const [selectedNewPipeline, setSelectedNewPipeline] = useState<Id<"objects"> | "">("");
  const [selectedNewStage, setSelectedNewStage] = useState<Id<"objects"> | "">("");

  // Query contact's pipelines
  const contactPipelines = useQuery(
    api.crmPipeline.getContactPipelines,
    sessionId && contactId
      ? { sessionId, contactId }
      : "skip"
  );

  // Query organization's available pipelines
  const availablePipelines = useQuery(
    api.crmPipeline.getOrganizationPipelines,
    sessionId && currentOrganizationId
      ? { sessionId, organizationId: currentOrganizationId }
      : "skip"
  );

  // Query stages for selected pipeline
  const newPipelineStages = useQuery(
    api.crmPipeline.getPipelineWithStages,
    sessionId && selectedNewPipeline
      ? { sessionId, pipelineId: selectedNewPipeline as Id<"objects"> }
      : "skip"
  );

  // Mutations
  const addToPipeline = useMutation(api.crmPipeline.addContactToPipeline);
  const removeFromPipeline = useMutation(api.crmPipeline.removeContactFromPipeline);
  const moveToStage = useMutation(api.crmPipeline.moveContactToStage);

  const [addingToPipeline, setAddingToPipeline] = useState(false);
  const [removing, setRemoving] = useState<Id<"objects"> | null>(null);
  const [movingStage, setMovingStage] = useState<Id<"objects"> | null>(null);

  const handleAddToPipeline = async () => {
    if (!sessionId || !selectedNewPipeline || !selectedNewStage) return;

    try {
      setAddingToPipeline(true);
      await addToPipeline({
        sessionId,
        contactId,
        pipelineId: selectedNewPipeline as Id<"objects">,
        stageId: selectedNewStage as Id<"objects">,
      });
      setShowAddPipeline(false);
      setSelectedNewPipeline("");
      setSelectedNewStage("");
    } catch (error) {
      console.error("Failed to add contact to pipeline:", error);
      alert("Failed to add to pipeline. Please try again.");
    } finally {
      setAddingToPipeline(false);
    }
  };

  const handleRemoveFromPipeline = async (pipelineId: Id<"objects">) => {
    if (!sessionId) return;
    if (!confirm("Remove contact from this pipeline?")) return;

    try {
      setRemoving(pipelineId);
      await removeFromPipeline({
        sessionId,
        contactId,
        pipelineId,
      });
    } catch (error) {
      console.error("Failed to remove from pipeline:", error);
      alert("Failed to remove. Please try again.");
    } finally {
      setRemoving(null);
    }
  };

  const handleMoveToStage = async (pipelineId: Id<"objects">, newStageId: Id<"objects">) => {
    if (!sessionId) return;

    try {
      setMovingStage(pipelineId);
      await moveToStage({
        sessionId,
        contactId,
        pipelineId,
        toStageId: newStageId,
      });
    } catch (error) {
      console.error("Failed to move to stage:", error);
      alert("Failed to move. Please try again.");
    } finally {
      setMovingStage(null);
    }
  };

  // Filter out pipelines the contact is already in
  const pipelinesNotIn = availablePipelines?.filter(
    (p) => !(contactPipelines as ContactPipelineItem[] | undefined)?.some((cp) => cp.pipeline?._id === p._id)
  ) || [];

  if (!sessionId || !currentOrganizationId) {
    return null;
  }

  return (
    <div className="border-2 rounded p-3" style={{ background: 'var(--window-document-bg-elevated)', borderColor: 'var(--window-document-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} style={{ color: 'var(--tone-accent)' }} />
          <span className="text-xs font-pixel" style={{ color: 'var(--tone-accent)' }}>
            {t("ui.crm.contact_detail.pipelines_label") || "PIPELINES"}
          </span>
        </div>
        {pipelinesNotIn.length > 0 && !showAddPipeline && (
          <button
            onClick={() => setShowAddPipeline(true)}
            className="desktop-interior-button px-2 py-1 flex items-center gap-1"
            title="Add to pipeline"
          >
            <Plus size={12} />
            <span className="text-xs">{t("ui.crm.contact_detail.add_to_pipeline") || "Add"}</span>
          </button>
        )}
      </div>

      {/* Current pipelines */}
      {contactPipelines && contactPipelines.length > 0 ? (
        <div className="space-y-2">
          {(contactPipelines as ContactPipelineItem[]).map((item) => {
            const pipeline = item.pipeline;
            const currentStage = item.stage;
            const stages = item.stages || [];
            const pipelineColor = (pipeline?.customProperties as { color?: string })?.color || "#6B46C1";
            const isMoving = movingStage === pipeline?._id;
            const isRemoving = removing === pipeline?._id;

            return (
              <div
                key={pipeline?._id}
                className="border rounded p-2"
                style={{
                  borderColor: pipelineColor,
                  background: `${pipelineColor}10`,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: pipelineColor }}>
                      {pipeline?.name || "Unknown Pipeline"}
                    </div>
                    {pipeline?.description && (
                      <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                        {pipeline.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => pipeline?._id && handleRemoveFromPipeline(pipeline._id)}
                    disabled={isRemoving || !pipeline?._id}
                    className="desktop-interior-button px-1.5 py-0.5"
                    title="Remove from pipeline"
                    style={{ opacity: isRemoving ? 0.5 : 1 }}
                  >
                    {isRemoving ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  </button>
                </div>

                {/* Stage selector */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--window-document-text)' }}>
                    {t("ui.crm.contact_detail.current_stage") || "Current Stage:"}
                  </label>
                  <select
                    className="retro-input w-full px-2 py-1 text-xs"
                    value={currentStage?._id || ""}
                    onChange={(e) => pipeline?._id && handleMoveToStage(pipeline._id, e.target.value as Id<"objects">)}
                    disabled={isMoving || stages.length === 0 || !pipeline?._id}
                    style={{ opacity: isMoving ? 0.5 : 1 }}
                  >
                    {(stages as PipelineStageFromQuery[]).map((stage) => (
                      <option key={stage._id} value={stage._id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-center py-3" style={{ color: 'var(--neutral-gray)' }}>
          {t("ui.crm.contact_detail.no_pipelines") || "Not in any pipelines"}
        </div>
      )}

      {/* Add to pipeline form */}
      {showAddPipeline && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
          <div className="space-y-2">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--window-document-text)' }}>
                {t("ui.crm.contact_detail.select_pipeline") || "Select Pipeline:"}
              </label>
              <select
                className="retro-input w-full px-2 py-1 text-xs"
                value={selectedNewPipeline}
                onChange={(e) => {
                  setSelectedNewPipeline(e.target.value as Id<"objects">);
                  setSelectedNewStage("");
                }}
              >
                <option value="">-- Select Pipeline --</option>
                {pipelinesNotIn.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedNewPipeline && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--window-document-text)' }}>
                  {t("ui.crm.contact_detail.select_stage") || "Select Stage:"}
                </label>
                <select
                  className="retro-input w-full px-2 py-1 text-xs"
                  value={selectedNewStage}
                  onChange={(e) => setSelectedNewStage(e.target.value as Id<"objects">)}
                >
                  <option value="">-- Select Stage --</option>
                  {(newPipelineStages?.stages as PipelineStageFromQuery[] | undefined)?.map((stage) => (
                    <option key={stage._id} value={stage._id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddToPipeline}
                disabled={!selectedNewPipeline || !selectedNewStage || addingToPipeline}
                className="desktop-interior-button px-3 py-1 text-xs flex-1"
                style={{
                  background: selectedNewPipeline && selectedNewStage ? 'var(--tone-accent)' : 'var(--neutral-gray)',
                  color: 'var(--window-document-text)',
                  opacity: addingToPipeline ? 0.5 : 1,
                }}
              >
                {addingToPipeline ? (
                  <>
                    <Loader2 size={12} className="animate-spin inline mr-1" />
                    Adding...
                  </>
                ) : (
                  "Add to Pipeline"
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddPipeline(false);
                  setSelectedNewPipeline("");
                  setSelectedNewStage("");
                }}
                className="desktop-interior-button px-3 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
