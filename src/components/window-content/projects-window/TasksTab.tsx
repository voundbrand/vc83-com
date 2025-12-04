/**
 * TASKS TAB
 * Manage project tasks with filters
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus } from "lucide-react";
import TaskCard from "./TaskCard";
import TaskForm from "./TaskForm";
import type { Id } from "../../../../convex/_generated/dataModel";

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
    milestoneId?: string;
  };
}

interface TasksTabProps {
  projectId: Id<"objects">;
  sessionId: string;
}

export default function TasksTab({ projectId, sessionId }: TasksTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const tasks = useQuery(api.projectOntology.getTasks, {
    sessionId,
    projectId,
  });

  const milestones = useQuery(api.projectOntology.getMilestones, {
    sessionId,
    projectId,
  });

  const teamMembers = useQuery(api.projectOntology.getTeamMembers, {
    sessionId,
    projectId,
  });

  const createTask = useMutation(api.projectOntology.createTask);
  const updateTask = useMutation(api.projectOntology.updateTask);
  const deleteTask = useMutation(api.projectOntology.deleteTask);

  const handleSave = async (data: {
    name: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: number;
    assigneeId?: Id<"users">;
    milestoneId?: Id<"objects">;
  }) => {
    if (editingTask && typeof editingTask === "object" && editingTask !== null && "_id" in editingTask) {
      await updateTask({
        sessionId,
        taskId: editingTask._id as Id<"objects">,
        ...data,
      });
    } else {
      await createTask({
        sessionId,
        projectId,
        ...data,
      });
    }
    setShowForm(false);
    setEditingTask(null);
  };

  const handleDelete = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask({
        sessionId,
        taskId: taskId as Id<"objects">,
      });
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  if (tasks === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  // Enrich tasks with assignee names
  const enrichedTasks = tasks.map((task) => {
    const assigneeId = task.customProperties?.assigneeId;
    const assignee = teamMembers?.find((m) => m.id === assigneeId);
    return {
      ...task,
      customProperties: {
        ...task.customProperties,
        assigneeName: assignee?.name,
      },
    };
  });

  // Filter tasks
  const filteredTasks =
    filterStatus === "all"
      ? enrichedTasks
      : enrichedTasks.filter((t) => t.status === filterStatus);

  return (
    <div className="p-4 space-y-4">
      {/* Header with Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-sm text-gray-900">
            Tasks ({filteredTasks.length})
          </h3>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2 py-1 text-xs border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{ border: "var(--win95-border)" }}
          >
            <option value="all">All Tasks</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 text-xs font-bold border-2 rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
          style={{ border: "var(--win95-border)" }}
        >
          <Plus size={14} />
          Add Task
        </button>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div
          className="p-8 text-center border-2 rounded"
          style={{
            border: "var(--win95-border)",
            backgroundColor: "var(--win95-bg-light)",
          }}
        >
          <p className="text-sm text-gray-600 mb-2">
            {filterStatus === "all" ? "No tasks yet" : `No ${filterStatus} tasks`}
          </p>
          <p className="text-xs text-gray-500">
            Click "Add Task" to create your first task
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <TaskForm
          task={editingTask}
          projectId={projectId}
          sessionId={sessionId}
          milestones={milestones}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
