/**
 * MEETINGS TAB
 * Manage project meetings for client-facing project drawer
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus, Video, FileText, MessageSquare } from "lucide-react";
import MeetingCardAdmin from "./MeetingCardAdmin";
import MeetingFormAdmin from "./MeetingFormAdmin";
import type { Id } from "../../../../convex/_generated/dataModel";

interface Meeting {
  _id: Id<"objects">;
  name: string;
  description?: string;
  status: string;
  customProperties?: {
    date?: number;
    time?: string;
    duration?: number;
    timezone?: string;
    notes?: string;
    summary?: string;
    embeddedVideos?: Array<{ url: string; title: string }>;
    mediaLinks?: Array<{ mediaId: string; displayOrder: number }>;
    attendees?: Array<{ name: string; email?: string; role?: string }>;
    meetingLink?: string;
    recordingUrl?: string;
  };
  createdAt?: number;
  updatedAt?: number;
}

interface MeetingsTabProps {
  projectId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

export default function MeetingsTab({
  projectId,
  sessionId,
  organizationId,
}: MeetingsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const meetings = useQuery(api.meetingOntology.getProjectMeetingsAdmin, {
    sessionId,
    projectId,
  });

  const createMeeting = useMutation(api.meetingOntology.createMeeting);
  const updateMeeting = useMutation(api.meetingOntology.updateMeeting);
  const deleteMeeting = useMutation(api.meetingOntology.deleteMeeting);

  const handleCreate = async (data: {
    name: string;
    description?: string;
    date: number;
    time: string;
    duration: number;
    timezone?: string;
    status?: string;
    notes?: string;
    summary?: string;
  }) => {
    await createMeeting({
      sessionId,
      projectId,
      name: data.name,
      description: data.description,
      date: data.date,
      time: data.time,
      duration: data.duration,
      timezone: data.timezone,
      status: data.status,
    });
    setShowForm(false);
  };

  const handleUpdate = async (data: {
    name: string;
    description?: string;
    date: number;
    time: string;
    duration: number;
    timezone?: string;
    status?: string;
    notes?: string;
    summary?: string;
  }) => {
    if (!editingMeeting) return;

    await updateMeeting({
      sessionId,
      meetingId: editingMeeting._id,
      name: data.name,
      description: data.description,
      date: data.date,
      time: data.time,
      duration: data.duration,
      timezone: data.timezone,
      status: data.status,
      notes: data.notes,
      summary: data.summary,
    });
    setShowForm(false);
    setEditingMeeting(null);
  };

  const handleDelete = async (meetingId: Id<"objects">) => {
    if (confirm("Are you sure you want to delete this meeting? This will also delete all comments.")) {
      await deleteMeeting({
        sessionId,
        meetingId,
      });
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMeeting(null);
  };

  if (meetings === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Loading meetings...</div>
      </div>
    );
  }

  // Calculate totals for summary
  const totalVideos = meetings.reduce((acc, m) => {
    const videos = (m?.customProperties?.embeddedVideos as Array<{ url: string; title: string }>) || [];
    return acc + videos.length;
  }, 0);

  const totalFiles = meetings.reduce((acc, m) => {
    const files = (m?.customProperties?.mediaLinks as Array<{ mediaId: string }>) || [];
    return acc + files.length;
  }, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-sm text-gray-900">
            Meetings ({meetings.length})
          </h3>
          {/* Summary Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Video size={12} />
              {totalVideos} videos
            </span>
            <span className="flex items-center gap-1">
              <FileText size={12} />
              {totalFiles} files
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingMeeting(null);
            setShowForm(true);
          }}
          className="px-3 py-1.5 text-xs font-bold border-2 rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
          style={{ border: "var(--win95-border)" }}
        >
          <Plus size={14} />
          Add Meeting
        </button>
      </div>

      {/* Info Banner */}
      <div
        className="p-3 border-2 rounded text-xs"
        style={{
          border: "var(--win95-border)",
          backgroundColor: "#e0e7ff",
        }}
      >
        <div className="flex items-start gap-2">
          <MessageSquare size={14} className="text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-purple-800 mb-1">Client-Facing Meetings</p>
            <p className="text-purple-700">
              These meetings are visible to clients in the Project Drawer. Add notes, videos, and files after each meeting.
            </p>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <div
          className="p-8 text-center border-2 rounded"
          style={{
            border: "var(--win95-border)",
            backgroundColor: "var(--win95-bg-light)",
          }}
        >
          <p className="text-sm text-gray-600 mb-2">No meetings yet</p>
          <p className="text-xs text-gray-500">
            Click &quot;Add Meeting&quot; to schedule your first project meeting
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <MeetingCardAdmin
              key={meeting?._id}
              meeting={meeting as Meeting}
              sessionId={sessionId}
              organizationId={organizationId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <MeetingFormAdmin
          meeting={editingMeeting}
          sessionId={sessionId}
          organizationId={organizationId}
          onSave={editingMeeting ? handleUpdate : handleCreate}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
