/**
 * TASK FORM
 * Create or edit project tasks with assignees
 */

"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { X } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface Task {
  _id?: string;
  name: string;
  description?: string;
  status: string;
  customProperties?: {
    priority?: string;
    dueDate?: number;
    assigneeId?: string;
    milestoneId?: string;
  };
}

interface TaskFormProps {
  task?: Task | null;
  projectId: Id<"objects">;
  sessionId: string;
  milestones?: Array<{ _id: string; name: string }>;
  onSave: (data: {
    name: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: number;
    assigneeId?: Id<"users">;
    milestoneId?: Id<"objects">;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function TaskForm({
  task,
  projectId,
  sessionId,
  milestones = [],
  onSave,
  onCancel,
}: TaskFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get team members for assignee dropdown
  const teamMembers = useQuery(api.projectOntology.getTeamMembers, {
    sessionId,
    projectId,
  });

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.customProperties?.priority || "medium");
      setAssigneeId((task.customProperties?.assigneeId as string) || "");
      setMilestoneId((task.customProperties?.milestoneId as string) || "");
      if (task.customProperties?.dueDate) {
        setDueDate(
          new Date(task.customProperties.dueDate).toISOString().split("T")[0]
        );
      }
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Task name is required");
      return;
    }

    setLoading(true);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        assigneeId: assigneeId ? (assigneeId as Id<"users">) : undefined,
        milestoneId: milestoneId ? (milestoneId as Id<"objects">) : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{
          border: "var(--window-document-border)",
          backgroundColor: "var(--window-document-bg)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b-2 sticky top-0"
          style={{
            background: "linear-gradient(90deg, #000080 0%, #1084d0 100%)",
            borderBottom: "var(--window-document-border)",
          }}
        >
          <h3 className="font-bold text-sm text-white">
            {task ? "Edit Task" : "New Task"}
          </h3>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-700">
              Task Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: "var(--window-document-border)" }}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: "var(--window-document-border)" }}
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ border: "var(--window-document-border)" }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {task && (
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ border: "var(--window-document-border)" }}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-700">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: "var(--window-document-border)" }}
            >
              <option value="">Unassigned</option>
              {teamMembers?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.type})
                </option>
              ))}
            </select>
          </div>

          {/* Milestone */}
          {milestones.length > 0 && (
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-700">
                Milestone
              </label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ border: "var(--window-document-border)" }}
              >
                <option value="">No milestone</option>
                {milestones.map((milestone) => (
                  <option key={milestone._id} value={milestone._id}>
                    {milestone.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: "var(--window-document-border)" }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-1.5 text-sm border-2 rounded hover:bg-gray-100 disabled:opacity-50"
              style={{ border: "var(--window-document-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-sm border-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              style={{ border: "var(--window-document-border)" }}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
