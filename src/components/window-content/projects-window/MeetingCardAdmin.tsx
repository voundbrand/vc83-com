/**
 * MEETING CARD (Admin)
 * Display individual meeting with status, content counts, and actions
 */

"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Edit,
  Trash2,
  Video,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Plus,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
}

interface MeetingCardAdminProps {
  meeting: Meeting;
  sessionId: string;
  organizationId: Id<"organizations">;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: Id<"objects">) => void;
}

export default function MeetingCardAdmin({
  meeting,
  sessionId,
  organizationId: _organizationId,
  onEdit,
  onDelete,
}: MeetingCardAdminProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);

  const addEmbeddedVideo = useMutation(api.meetingOntology.addEmbeddedVideo);
  const removeEmbeddedVideo = useMutation(api.meetingOntology.removeEmbeddedVideo);

  const date = meeting.customProperties?.date;
  const time = meeting.customProperties?.time;
  const duration = meeting.customProperties?.duration;
  const videos = meeting.customProperties?.embeddedVideos || [];
  const files = meeting.customProperties?.mediaLinks || [];
  const notes = meeting.customProperties?.notes;
  const summary = meeting.customProperties?.summary;

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const handleAddVideo = async () => {
    if (!videoUrl.trim()) return;

    setAddingVideo(true);
    try {
      await addEmbeddedVideo({
        sessionId,
        meetingId: meeting._id,
        url: videoUrl.trim(),
        title: videoTitle.trim() || "Video",
      });
      setVideoUrl("");
      setVideoTitle("");
      setShowAddVideo(false);
    } catch (error) {
      console.error("Failed to add video:", error);
    } finally {
      setAddingVideo(false);
    }
  };

  const handleRemoveVideo = async (url: string) => {
    if (!confirm("Remove this video?")) return;

    try {
      await removeEmbeddedVideo({
        sessionId,
        meetingId: meeting._id,
        url,
      });
    } catch (error) {
      console.error("Failed to remove video:", error);
    }
  };

  return (
    <div
      className="border-2 rounded bg-white overflow-hidden"
      style={{
        border: "var(--win95-border)",
        backgroundColor: "var(--win95-bg-light)",
      }}
    >
      {/* Main Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Date & Time Row */}
            <div className="flex items-center gap-3 mb-2 text-xs text-gray-600">
              {date && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {format(new Date(date), "MMM d, yyyy")}
                </span>
              )}
              {time && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {time}
                </span>
              )}
              {duration && (
                <span className="text-gray-500">({duration} min)</span>
              )}
            </div>

            {/* Title */}
            <h4 className="font-bold text-sm text-gray-900 mb-1">
              {meeting.name}
            </h4>

            {/* Description/Summary */}
            {(summary || meeting.description) && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {summary || meeting.description}
              </p>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-xs">
              {/* Status Badge */}
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  statusColors[meeting.status as keyof typeof statusColors] ||
                  statusColors.scheduled
                }`}
              >
                {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
              </span>

              {/* Content Counts */}
              {videos.length > 0 && (
                <span className="flex items-center gap-1 text-purple-600">
                  <Video size={12} />
                  {videos.length}
                </span>
              )}
              {files.length > 0 && (
                <span className="flex items-center gap-1 text-purple-600">
                  <FileText size={12} />
                  {files.length}
                </span>
              )}
              {notes && (
                <span className="flex items-center gap-1 text-green-600">
                  <MessageSquare size={12} />
                  Has notes
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-gray-100 rounded"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronUp size={16} className="text-gray-600" />
              ) : (
                <ChevronDown size={16} className="text-gray-600" />
              )}
            </button>
            <button
              onClick={() => onEdit(meeting)}
              className="p-1.5 hover:bg-gray-100 rounded"
              title="Edit meeting"
            >
              <Edit size={14} className="text-gray-600" />
            </button>
            <button
              onClick={() => onDelete(meeting._id)}
              className="p-1.5 hover:bg-red-100 rounded"
              title="Delete meeting"
            >
              <Trash2 size={14} className="text-red-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t-2 p-4 space-y-4" style={{ borderTop: "var(--win95-border)" }}>
          {/* Notes Section */}
          {notes && (
            <div>
              <h5 className="font-bold text-xs text-gray-700 mb-2 flex items-center gap-1">
                <MessageSquare size={12} />
                Meeting Notes
              </h5>
              <div
                className="prose prose-sm max-w-none text-xs p-3 bg-white rounded border"
                dangerouslySetInnerHTML={{ __html: notes }}
              />
            </div>
          )}

          {/* Videos Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-bold text-xs text-gray-700 flex items-center gap-1">
                <Video size={12} />
                Videos ({videos.length})
              </h5>
              <button
                onClick={() => setShowAddVideo(!showAddVideo)}
                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus size={12} />
                Add Video
              </button>
            </div>

            {/* Add Video Form */}
            {showAddVideo && (
              <div className="p-3 mb-3 border rounded bg-gray-50 space-y-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste video URL (YouTube, Vimeo, Loom, Google Drive)"
                  className="w-full px-2 py-1 text-xs border rounded"
                />
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Video title (optional)"
                  className="w-full px-2 py-1 text-xs border rounded"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddVideo}
                    disabled={!videoUrl.trim() || addingVideo}
                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {addingVideo ? "Adding..." : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddVideo(false);
                      setVideoUrl("");
                      setVideoTitle("");
                    }}
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Video List */}
            {videos.length > 0 ? (
              <div className="space-y-2">
                {videos.map((video, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white rounded border text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="font-medium truncate">{video.title}</span>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline truncate"
                      >
                        {video.url}
                      </a>
                    </div>
                    <button
                      onClick={() => handleRemoveVideo(video.url)}
                      className="p-1 hover:bg-red-100 rounded flex-shrink-0"
                    >
                      <X size={12} className="text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No videos attached</p>
            )}
          </div>

          {/* Files Section */}
          <div>
            <h5 className="font-bold text-xs text-gray-700 mb-2 flex items-center gap-1">
              <FileText size={12} />
              Files ({files.length})
            </h5>
            {files.length > 0 ? (
              <div className="space-y-1">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-white rounded border text-xs"
                  >
                    <FileText size={12} className="text-gray-400" />
                    <span className="text-gray-600">File ID: {file.mediaId}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                No files attached. Use the edit form to attach files.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
