/**
 * MEETING CARD (Admin)
 * Display individual meeting with status, content counts, and actions
 */

"use client";

import React, { useState, useRef } from "react";
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
  Upload,
  Download,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery } from "convex/react";
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

/**
 * File item component that fetches and displays file metadata
 */
function FileItem({
  mediaId,
  onRemove,
}: {
  mediaId: string;
  onRemove: () => void;
}) {
  const media = useQuery(api.organizationMedia.getMedia, {
    mediaId: mediaId as Id<"organizationMedia">,
  });

  if (!media) {
    return (
      <div className="flex items-center gap-2 p-2 bg-white rounded border text-xs">
        <Loader2 size={12} className="text-gray-400 animate-spin" />
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center justify-between p-2 bg-white rounded border text-xs">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText size={12} className="text-gray-400 flex-shrink-0" />
        <span className="font-medium truncate">{media.filename}</span>
        <span className="text-gray-400 flex-shrink-0">
          ({formatFileSize(media.sizeBytes)})
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {media.url && (
          <a
            href={media.url}
            download={media.filename}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-blue-100 rounded"
            title="Download file"
          >
            <Download size={12} className="text-blue-600" />
          </a>
        )}
        <button
          onClick={onRemove}
          className="p-1 hover:bg-red-100 rounded"
          title="Remove file"
        >
          <X size={12} className="text-red-600" />
        </button>
      </div>
    </div>
  );
}

export default function MeetingCardAdmin({
  meeting,
  sessionId,
  organizationId,
  onEdit,
  onDelete,
}: MeetingCardAdminProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addEmbeddedVideo = useMutation(api.meetingOntology.addEmbeddedVideo);
  const removeEmbeddedVideo = useMutation(api.meetingOntology.removeEmbeddedVideo);
  const generateUploadUrl = useMutation(api.organizationMedia.generateUploadUrl);
  const saveMedia = useMutation(api.organizationMedia.saveMedia);
  const attachFileToMeeting = useMutation(api.meetingOntology.attachFileToMeeting);
  const detachFileFromMeeting = useMutation(api.meetingOntology.detachFileFromMeeting);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError(null);

    try {
      // Step 1: Generate upload URL
      const uploadUrl = await generateUploadUrl({
        sessionId,
        organizationId,
        estimatedSizeBytes: file.size,
      });

      // Step 2: Upload file to storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await response.json();

      // Step 3: Save media metadata
      const result = await saveMedia({
        sessionId,
        organizationId,
        storageId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        category: "general",
      });

      // Step 4: Attach to meeting
      await attachFileToMeeting({
        sessionId,
        meetingId: meeting._id,
        mediaId: result.mediaId,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = async (mediaId: string) => {
    if (!confirm("Remove this file from the meeting?")) return;

    try {
      await detachFileFromMeeting({
        sessionId,
        meetingId: meeting._id,
        mediaId: mediaId as Id<"organizationMedia">,
      });
    } catch (error) {
      console.error("Failed to remove file:", error);
    }
  };

  return (
    <div
      className="border-2 rounded bg-white overflow-hidden"
      style={{
        border: "var(--window-document-border)",
        backgroundColor: "var(--window-document-bg-elevated)",
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
        <div className="border-t-2 p-4 space-y-4" style={{ borderTop: "var(--window-document-border)" }}>
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
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-bold text-xs text-gray-700 flex items-center gap-1">
                <FileText size={12} />
                Files ({files.length})
              </h5>
              <label className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer">
                {uploadingFile ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={12} />
                    Upload File
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Upload Error */}
            {uploadError && (
              <div className="mb-2 p-2 text-xs text-red-600 bg-red-50 rounded border border-red-200">
                {uploadError}
              </div>
            )}

            {/* File List */}
            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <FileItem
                    key={index}
                    mediaId={file.mediaId}
                    onRemove={() => handleRemoveFile(file.mediaId)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No files attached</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
