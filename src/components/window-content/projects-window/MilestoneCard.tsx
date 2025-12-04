/**
 * MILESTONE CARD
 * Display individual milestone with status and actions
 */

"use client";

import React from "react";
import { Calendar, Edit, Trash2, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";

interface Milestone {
  _id: string;
  name: string;
  description?: string;
  status: string;
  customProperties?: {
    dueDate?: number;
  };
}

interface MilestoneCardProps {
  milestone: Milestone;
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestoneId: string) => void;
}

export default function MilestoneCard({
  milestone,
  onEdit,
  onDelete,
}: MilestoneCardProps) {
  const dueDate = milestone.customProperties?.dueDate;
  const isCompleted = milestone.status === "completed";
  const isOverdue =
    dueDate && !isCompleted && dueDate < Date.now();

  return (
    <div
      className="p-4 border-2 rounded bg-white"
      style={{
        border: "var(--win95-border)",
        backgroundColor: "var(--win95-bg-light)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {isCompleted ? (
            <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          ) : (
            <Circle className="text-gray-400 flex-shrink-0 mt-0.5" size={20} />
          )}

          <div className="flex-1 min-w-0">
            <h4
              className={`font-bold text-sm mb-1 ${
                isCompleted ? "line-through text-gray-500" : "text-gray-900"
              }`}
            >
              {milestone.name}
            </h4>

            {milestone.description && (
              <p className="text-xs text-gray-600 mb-2">{milestone.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs">
              {/* Status */}
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  milestone.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : milestone.status === "in_progress"
                    ? "bg-blue-100 text-blue-700"
                    : milestone.status === "cancelled"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {milestone.status === "in_progress" ? "In Progress" : milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
              </span>

              {/* Due Date */}
              {dueDate && (
                <div
                  className={`flex items-center gap-1 ${
                    isOverdue ? "text-red-600 font-bold" : "text-gray-600"
                  }`}
                >
                  <Calendar size={12} />
                  <span>
                    Due: {format(new Date(dueDate), "MMM d, yyyy")}
                  </span>
                  {isOverdue && <span className="text-red-600 font-bold">⚠️ Overdue</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(milestone)}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Edit milestone"
          >
            <Edit size={14} className="text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(milestone._id)}
            className="p-1.5 hover:bg-red-100 rounded"
            title="Delete milestone"
          >
            <Trash2 size={14} className="text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
