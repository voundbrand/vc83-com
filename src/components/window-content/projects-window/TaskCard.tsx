/**
 * TASK CARD
 * Display individual task with assignee and status
 */

"use client";

import React from "react";
import { Calendar, Edit, Trash2, User } from "lucide-react";
import { format } from "date-fns";

interface Task {
  _id: string;
  name: string;
  description?: string;
  status: string;
  customProperties?: {
    priority?: string;
    dueDate?: number;
    assigneeId?: string;
    assigneeName?: string;
  };
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const dueDate = task.customProperties?.dueDate;
  const priority = task.customProperties?.priority || "medium";
  const isCompleted = task.status === "completed";
  const isOverdue = dueDate && !isCompleted && dueDate < Date.now();

  const priorityColors = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  const statusColors = {
    todo: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div
      className="p-3 border-2 rounded bg-white hover:shadow-sm transition-shadow"
      style={{
        border: "var(--win95-border)",
        backgroundColor: "var(--win95-bg-light)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={`font-bold text-sm ${
                isCompleted ? "line-through text-gray-500" : "text-gray-900"
              }`}
            >
              {task.name}
            </h4>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                priorityColors[priority as keyof typeof priorityColors]
              }`}
            >
              {priority}
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs flex-wrap">
            {/* Status */}
            <span
              className={`px-2 py-0.5 rounded font-bold ${
                statusColors[task.status as keyof typeof statusColors] ||
                statusColors.todo
              }`}
            >
              {task.status === "in_progress"
                ? "In Progress"
                : task.status === "todo"
                ? "To Do"
                : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>

            {/* Assignee */}
            {task.customProperties?.assigneeName && (
              <div className="flex items-center gap-1 text-gray-600">
                <User size={12} />
                <span>{task.customProperties.assigneeName}</span>
              </div>
            )}

            {/* Due Date */}
            {dueDate && (
              <div
                className={`flex items-center gap-1 ${
                  isOverdue ? "text-red-600 font-bold" : "text-gray-600"
                }`}
              >
                <Calendar size={12} />
                <span>{format(new Date(dueDate), "MMM d")}</span>
                {isOverdue && <span>⚠️</span>}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(task)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Edit task"
          >
            <Edit size={14} className="text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(task._id)}
            className="p-1 hover:bg-red-100 rounded"
            title="Delete task"
          >
            <Trash2 size={14} className="text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
