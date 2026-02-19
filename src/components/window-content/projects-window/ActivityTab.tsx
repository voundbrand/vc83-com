/**
 * ACTIVITY TAB
 * Display project activity log
 */

"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  CheckCircle,
  Plus,
  Edit,
  Trash,
  Users,
  MessageSquare,
} from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ActivityTabProps {
  projectId: Id<"objects">;
  sessionId: string;
}

export default function ActivityTab({ projectId, sessionId }: ActivityTabProps) {
  const activities = useQuery(api.projectOntology.getActivityLog, {
    sessionId,
    projectId,
    limit: 100,
  });

  if (activities === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Loading activity...</div>
      </div>
    );
  }

  const getActivityIcon = (actionType: string) => {
    if (actionType.includes("created")) return <Plus size={16} className="text-green-600" />;
    if (actionType.includes("updated")) return <Edit size={16} className="text-blue-600" />;
    if (actionType.includes("deleted")) return <Trash size={16} className="text-red-600" />;
    if (actionType.includes("completed")) return <CheckCircle size={16} className="text-green-600" />;
    if (actionType.includes("team_member")) return <Users size={16} className="text-purple-600" />;
    if (actionType.includes("comment")) return <MessageSquare size={16} className="text-blue-600" />;
    return <FileText size={16} className="text-gray-600" />;
  };

  const getActivityText = (activity: unknown) => {
    const act = activity as { actionType: string; actionData?: { [key: string]: unknown } };
    const data = act.actionData || {};

    switch (act.actionType) {
      case "milestone_created":
        return `created milestone "${data.milestoneName}"`;
      case "milestone_updated":
        return `updated milestone "${data.milestoneName}"`;
      case "milestone_deleted":
        return `deleted milestone "${data.milestoneName}"`;
      case "task_created":
        return `created task "${data.taskName}"`;
      case "task_updated":
        return `updated task "${data.taskName}"`;
      case "task_deleted":
        return `deleted task "${data.taskName}"`;
      case "team_member_added":
        return `added a team member with role ${data.role}`;
      case "team_member_removed":
        return `removed a team member`;
      case "comment_created":
        return `posted a comment`;
      case "comment_deleted":
        return `deleted a comment`;
      default:
        return act.actionType.replace(/_/g, " ");
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <h3 className="font-bold text-sm text-gray-900">
        Activity Log ({activities.length})
      </h3>

      {/* Activity List */}
      {activities.length === 0 ? (
        <div
          className="p-8 text-center border-2 rounded"
          style={{
            border: "var(--window-document-border)",
            backgroundColor: "var(--window-document-bg-elevated)",
          }}
        >
          <p className="text-sm text-gray-600">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity._id}
              className="p-3 border-2 rounded bg-white flex items-start gap-3"
              style={{
                border: "var(--window-document-border)",
                backgroundColor: "var(--window-document-bg-elevated)",
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.actionType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-bold">{activity.performerName}</span>{" "}
                  {getActivityText(activity)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDistanceToNow(new Date(activity.performedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
