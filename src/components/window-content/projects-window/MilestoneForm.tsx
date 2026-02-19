/**
 * MILESTONE FORM
 * Create or edit project milestones
 */

"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Milestone {
  _id?: string;
  name: string;
  description?: string;
  status: string;
  customProperties?: {
    dueDate?: number;
  };
}

interface MilestoneFormProps {
  milestone?: Milestone | null;
  onSave: (data: {
    name: string;
    description?: string;
    status: string;
    dueDate?: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function MilestoneForm({
  milestone,
  onSave,
  onCancel,
}: MilestoneFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (milestone) {
      setName(milestone.name);
      setDescription(milestone.description || "");
      setStatus(milestone.status);
      if (milestone.customProperties?.dueDate) {
        setDueDate(
          new Date(milestone.customProperties.dueDate).toISOString().split("T")[0]
        );
      }
    }
  }, [milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Milestone name is required");
      return;
    }

    setLoading(true);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save milestone");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded shadow-lg max-w-md w-full"
        style={{
          border: "var(--window-document-border)",
          backgroundColor: "var(--window-document-bg)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b-2"
          style={{
            background: "linear-gradient(90deg, #000080 0%, #1084d0 100%)",
            borderBottom: "var(--window-document-border)",
          }}
        >
          <h3 className="font-bold text-sm text-white">
            {milestone ? "Edit Milestone" : "New Milestone"}
          </h3>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-700">
              Milestone Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
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
              maxLength={200}
              className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ border: "var(--window-document-border)" }}
            />
          </div>

          {/* Status */}
          {milestone && (
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
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
