/**
 * PROJECT DETAIL VIEW
 * Main tabbed interface for viewing project details
 */

"use client";

import React, { useState } from "react";
import { ArrowLeft, Edit } from "lucide-react";
import { format } from "date-fns";
import MilestonesTab from "./MilestonesTab";
import TasksTab from "./TasksTab";
import TeamTab from "./TeamTab";
import CommentsTab from "./CommentsTab";
import ActivityTab from "./ActivityTab";
import MeetingsTab from "./MeetingsTab";
import type { Id } from "../../../../convex/_generated/dataModel";

interface Project {
  _id: string;
  name: string;
  description?: string;
  status: string;
  subtype: string;
  customProperties?: {
    projectCode?: string;
    priority?: string;
    progress?: number;
    startDate?: number;
    targetEndDate?: number;
    budget?: {
      amount: number;
      currency: string;
    };
    detailedDescription?: string;
  };
}

interface ProjectDetailViewProps {
  project: Project;
  sessionId: string;
  organizationId: Id<"organizations">;
  onBack: () => void;
  onEdit: (project: Project) => void;
}

type TabType = "overview" | "milestones" | "tasks" | "team" | "meetings" | "comments" | "activity";

export default function ProjectDetailView({
  project,
  sessionId,
  organizationId,
  onBack,
  onEdit,
}: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "milestones", label: "Milestones" },
    { id: "tasks", label: "Tasks" },
    { id: "team", label: "Team" },
    { id: "meetings", label: "Meetings" },
    { id: "comments", label: "Comments" },
    { id: "activity", label: "Activity" },
  ];

  const priorityColors = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-700",
    planning: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    on_hold: "bg-yellow-100 text-yellow-700",
    completed: "bg-purple-100 text-purple-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="p-4 border-b-2"
        style={{
          border: "var(--win95-border)",
          backgroundColor: "var(--win95-bg-light)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm hover:text-purple-700"
          >
            <ArrowLeft size={16} />
            <span>Back to Projects</span>
          </button>
          <button
            onClick={() => onEdit(project)}
            className="px-3 py-1.5 text-xs font-bold border-2 rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
            style={{ border: "var(--win95-border)" }}
          >
            <Edit size={14} />
            Edit Project
          </button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900">{project.name}</h2>
              <span className="text-xs font-mono text-gray-500">
                {project.customProperties?.projectCode}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-gray-600 mb-2">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {/* Status */}
          <span
            className={`px-2 py-1 rounded text-xs font-bold ${
              statusColors[project.status as keyof typeof statusColors] ||
              statusColors.draft
            }`}
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace("_", " ")}
          </span>

          {/* Priority */}
          {project.customProperties?.priority && (
            <span
              className={`px-2 py-1 rounded text-xs font-bold ${
                priorityColors[
                  project.customProperties.priority as keyof typeof priorityColors
                ] || priorityColors.medium
              }`}
            >
              {project.customProperties.priority} Priority
            </span>
          )}

          {/* Progress */}
          {project.customProperties?.progress !== undefined && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all"
                  style={{
                    width: `${project.customProperties.progress}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-600">
                {project.customProperties.progress}%
              </span>
            </div>
          )}

          {/* Dates */}
          {project.customProperties?.startDate && (
            <span className="text-xs text-gray-600">
              Started: {format(new Date(project.customProperties.startDate), "MMM d, yyyy")}
            </span>
          )}
          {project.customProperties?.targetEndDate && (
            <span className="text-xs text-gray-600">
              Due: {format(new Date(project.customProperties.targetEndDate), "MMM d, yyyy")}
            </span>
          )}

          {/* Budget */}
          {project.customProperties?.budget && (
            <span className="text-xs text-gray-600">
              Budget: {project.customProperties.budget.currency}{" "}
              {project.customProperties.budget.amount.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b-2"
        style={{
          border: "var(--win95-border)",
          backgroundColor: "var(--win95-bg)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-bold border-r-2 transition-colors ${
              activeTab === tab.id
                ? "bg-white text-purple-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            style={{ borderRight: "var(--win95-border)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && (
          <div className="p-4 space-y-4">
            <div
              className="p-4 border-2 rounded"
              style={{
                border: "var(--win95-border)",
                backgroundColor: "var(--win95-bg-light)",
              }}
            >
              <h3 className="font-bold text-sm mb-2">Project Overview</h3>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">Type:</span>{" "}
                    <span className="font-bold">
                      {project.subtype.replace("_", " ").charAt(0).toUpperCase() +
                        project.subtype.replace("_", " ").slice(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>{" "}
                    <span className="font-bold">{project.status}</span>
                  </div>
                  {project.customProperties?.priority && (
                    <div>
                      <span className="text-gray-600">Priority:</span>{" "}
                      <span className="font-bold">{project.customProperties.priority}</span>
                    </div>
                  )}
                  {project.customProperties?.progress !== undefined && (
                    <div>
                      <span className="text-gray-600">Progress:</span>{" "}
                      <span className="font-bold">{project.customProperties.progress}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Description */}
            {project.customProperties?.detailedDescription && (
              <div
                className="p-4 border-2 rounded"
                style={{
                  border: "var(--win95-border)",
                  backgroundColor: "var(--win95-bg-light)",
                }}
              >
                <h3 className="font-bold text-sm mb-2">Detailed Description</h3>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: String(project.customProperties.detailedDescription),
                  }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "milestones" && (
          <MilestonesTab
            projectId={project._id as Id<"objects">}
            sessionId={sessionId}
          />
        )}

        {activeTab === "tasks" && (
          <TasksTab
            projectId={project._id as Id<"objects">}
            sessionId={sessionId}
          />
        )}

        {activeTab === "team" && (
          <TeamTab
            projectId={project._id as Id<"objects">}
            sessionId={sessionId}
            organizationId={organizationId}
          />
        )}

        {activeTab === "meetings" && (
          <MeetingsTab
            projectId={project._id as Id<"objects">}
            sessionId={sessionId}
            organizationId={organizationId}
          />
        )}

        {activeTab === "comments" && (
          <CommentsTab
            projectId={project._id as Id<"objects">}
            sessionId={sessionId}
          />
        )}

        {activeTab === "activity" && (
          <ActivityTab
            projectId={project._id as Id<"objects">}
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  );
}
