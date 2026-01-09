/**
 * MEETING FORM (Admin)
 * Create or edit project meetings with comprehensive fields
 */

"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, FileText } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface Meeting {
  _id?: Id<"objects">;
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
}

interface MeetingFormAdminProps {
  meeting?: Meeting | null;
  sessionId: string;
  organizationId: Id<"organizations">;
  onSave: (data: {
    name: string;
    description?: string;
    date: number;
    time: string;
    duration: number;
    timezone?: string;
    status?: string;
    notes?: string;
    summary?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function MeetingFormAdmin({
  meeting,
  sessionId: _sessionId,
  organizationId: _organizationId,
  onSave,
  onCancel,
}: MeetingFormAdminProps) {
  // sessionId and organizationId reserved for future file attachment feature
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [timezone, setTimezone] = useState("Europe/Berlin");
  const [status, setStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!meeting?._id;

  useEffect(() => {
    if (meeting) {
      setName(meeting.name);
      setDescription(meeting.description || "");
      setStatus(meeting.status || "scheduled");

      if (meeting.customProperties?.date) {
        setDate(new Date(meeting.customProperties.date).toISOString().split("T")[0]);
      }
      setTime(meeting.customProperties?.time || "10:00");
      setDuration(meeting.customProperties?.duration || 60);
      setTimezone(meeting.customProperties?.timezone || "Europe/Berlin");
      setNotes(meeting.customProperties?.notes || "");
      setSummary(meeting.customProperties?.summary || "");
    } else {
      // Set defaults for new meeting
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split("T")[0]);
    }
  }, [meeting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Meeting name is required");
      return;
    }

    if (!date) {
      setError("Meeting date is required");
      return;
    }

    setLoading(true);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        date: new Date(date).getTime(),
        time,
        duration,
        timezone,
        status,
        notes: notes.trim() || undefined,
        summary: summary.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save meeting");
      setLoading(false);
    }
  };

  const durationOptions = [
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1.5 hours" },
    { value: 120, label: "2 hours" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          border: "var(--win95-border)",
          backgroundColor: "var(--win95-bg)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b-2 flex-shrink-0"
          style={{
            background: "linear-gradient(90deg, #000080 0%, #1084d0 100%)",
            borderBottom: "var(--win95-border)",
          }}
        >
          <h3 className="font-bold text-sm text-white">
            {isEditing ? "Edit Meeting" : "New Meeting"}
          </h3>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded">
              {error}
            </div>
          )}

          {/* Basic Info Section */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-gray-700 border-b pb-1">Basic Information</h4>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-700">
                Meeting Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="e.g., Kickoff Meeting, Design Review"
                className="w-full px-2 py-1.5 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ border: "var(--win95-border)" }}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-700">
                Brief Description / Agenda
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="What will be discussed in this meeting?"
                className="w-full px-2 py-1.5 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ border: "var(--win95-border)" }}
              />
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-gray-700 border-b pb-1 flex items-center gap-1">
              <Calendar size={12} />
              Date & Time
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ border: "var(--win95-border)" }}
                  required
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">
                  Time *
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ border: "var(--win95-border)" }}
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ border: "var(--win95-border)" }}
                >
                  {durationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ border: "var(--win95-border)" }}
                >
                  <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status (only for editing) */}
          {isEditing && (
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-gray-700 border-b pb-1">Status</h4>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">
                  Meeting Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ border: "var(--win95-border)" }}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          )}

          {/* Notes Section (only for editing) */}
          {isEditing && (
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-gray-700 border-b pb-1 flex items-center gap-1">
                <FileText size={12} />
                Meeting Content (Post-Meeting)
              </h4>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">
                  Summary (shown in meeting list)
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Brief summary of what was discussed and decided"
                  className="w-full px-2 py-1.5 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ border: "var(--win95-border)" }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">
                  Detailed Notes (HTML supported)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  placeholder="## Topics Discussed&#10;- Item 1&#10;- Item 2&#10;&#10;## Action Items&#10;- [ ] Task 1&#10;- [ ] Task 2"
                  className="w-full px-2 py-1.5 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  style={{ border: "var(--win95-border)" }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use HTML or Markdown-style formatting. Clients will see this in the meeting detail view.
                </p>
              </div>
            </div>
          )}

          {/* Help Text for New Meetings */}
          {!isEditing && (
            <div className="p-3 bg-blue-50 rounded text-xs text-blue-700 border border-blue-200">
              <p className="font-bold mb-1">Tip: Add content after the meeting</p>
              <p>
                After creating the meeting, you can edit it to add notes, videos, and files.
                Videos can be added directly from the meeting card in the expanded view.
              </p>
            </div>
          )}
        </form>

        {/* Actions */}
        <div
          className="flex gap-2 justify-end p-4 border-t-2 flex-shrink-0"
          style={{ borderTop: "var(--win95-border)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-1.5 text-sm border-2 rounded hover:bg-gray-100 disabled:opacity-50"
            style={{ border: "var(--win95-border)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 text-sm border-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            style={{ border: "var(--win95-border)" }}
          >
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}
