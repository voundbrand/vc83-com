/**
 * MILESTONES TAB
 * Manage project milestones
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus } from "lucide-react";
import MilestoneCard from "./MilestoneCard";
import MilestoneForm from "./MilestoneForm";
import type { Id } from "../../../../convex/_generated/dataModel";

interface Milestone {
  _id: string;
  name: string;
  description?: string;
  status: string;
  dueDate?: number;
}

interface MilestonesTabProps {
  projectId: Id<"objects">;
  sessionId: string;
}

export default function MilestonesTab({
  projectId,
  sessionId,
}: MilestonesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const milestones = useQuery(api.projectOntology.getMilestones, {
    sessionId,
    projectId,
  });

  const createMilestone = useMutation(api.projectOntology.createMilestone);
  const updateMilestone = useMutation(api.projectOntology.updateMilestone);
  const deleteMilestone = useMutation(api.projectOntology.deleteMilestone);

  const handleSave = async (data: {
    name: string;
    description?: string;
    status: string;
    dueDate?: number;
  }) => {
    if (editingMilestone && typeof editingMilestone === "object" && editingMilestone !== null && "_id" in editingMilestone) {
      await updateMilestone({
        sessionId,
        milestoneId: editingMilestone._id as Id<"objects">,
        ...data,
      });
    } else {
      await createMilestone({
        sessionId,
        projectId,
        ...data,
      });
    }
    setShowForm(false);
    setEditingMilestone(null);
  };

  const handleDelete = async (milestoneId: string) => {
    if (confirm("Are you sure you want to delete this milestone?")) {
      await deleteMilestone({
        sessionId,
        milestoneId: milestoneId as Id<"objects">,
      });
    }
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMilestone(null);
  };

  if (milestones === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Loading milestones...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-gray-900">
          Milestones ({milestones.length})
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 text-xs font-bold border-2 rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
          style={{ border: "var(--win95-border)" }}
        >
          <Plus size={14} />
          Add Milestone
        </button>
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div
          className="p-8 text-center border-2 rounded"
          style={{
            border: "var(--win95-border)",
            backgroundColor: "var(--win95-bg-light)",
          }}
        >
          <p className="text-sm text-gray-600 mb-2">No milestones yet</p>
          <p className="text-xs text-gray-500">
            Click "Add Milestone" to create your first milestone
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <MilestoneCard
              key={milestone._id}
              milestone={milestone}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <MilestoneForm
          milestone={editingMilestone}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
