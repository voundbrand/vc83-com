"use client";

import React from "react";
import { Paperclip, Video, MessageSquare, ChevronRight, Calendar } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { useProjectDrawer } from "./ProjectDrawerProvider";

interface MeetingCardProps {
  meeting: {
    _id: Id<"objects">;
    name: string;
    description?: string;
    status: string;
    date: number;
    time?: string;
    duration?: number;
    summary?: string;
    fileCount: number;
    videoCount: number;
    commentCount: number;
  };
  isFirst?: boolean;
}

/**
 * Single meeting card in the list
 * Shows meeting metadata and counts for attached content
 */
export function MeetingCard({ meeting, isFirst }: MeetingCardProps) {
  const { openMeetingDetail, themeColors } = useProjectDrawer();

  // Format date
  const formattedDate = formatDate(meeting.date);

  // Status badge color
  const statusColor = getStatusColor(meeting.status);

  return (
    <button
      onClick={() => openMeetingDetail(meeting._id)}
      className="w-full p-4 text-left transition-all duration-200 bg-white border rounded-lg hover:shadow-md group"
      style={{
        borderColor: themeColors.border,
      }}
    >
        {/* Date and status */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">
          <Calendar className="inline w-4 h-4 mr-1" />
          {formattedDate}
          {meeting.time && (
            <span className="ml-2 text-gray-400">
              {meeting.time} Uhr
            </span>
          )}
        </span>

        {meeting.status !== "completed" && (
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: statusColor.bg,
              color: statusColor.text,
            }}
          >
            {getStatusLabel(meeting.status)}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-1 text-base font-semibold text-gray-900">
        {meeting.name}
      </h3>

      {/* Description/summary */}
      {(meeting.summary || meeting.description) && (
        <p className="mb-3 text-sm text-gray-600 line-clamp-2">
          {meeting.summary || meeting.description}
        </p>
      )}

      {/* Content indicators and arrow */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {meeting.fileCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-4 h-4" />
              {meeting.fileCount}
            </span>
          )}

          {meeting.videoCount > 0 && (
            <span className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              {meeting.videoCount}
            </span>
          )}

          {meeting.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {meeting.commentCount}
            </span>
          )}
        </div>

        {/* Arrow indicator */}
        <ChevronRight
          className="w-5 h-5 text-gray-400 transition-transform group-hover:translate-x-1"
          style={{
            color: themeColors.primary,
          }}
        />
      </div>
    </button>
  );
}

/**
 * Format a timestamp to German date format
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate();
  const monthNames = [
    "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day}. ${month} ${year}`;
}

/**
 * Get status badge colors
 */
function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "scheduled":
      return { bg: "#dbeafe", text: "#1e40af" }; // blue
    case "cancelled":
      return { bg: "#fee2e2", text: "#991b1b" }; // red
    case "completed":
    default:
      return { bg: "#dcfce7", text: "#166534" }; // green
  }
}

/**
 * Get German status label
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case "scheduled":
      return "Geplant";
    case "cancelled":
      return "Abgesagt";
    case "completed":
      return "Abgeschlossen";
    default:
      return status;
  }
}
