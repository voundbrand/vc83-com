"use client";

import React from "react";
import { Calendar, Loader2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { useProjectDrawer } from "./ProjectDrawerProvider";
import { useProjectMeetings } from "./hooks/useProjectMeetings";
import { MeetingCard } from "./MeetingCard";

// Meeting type from the API
interface Meeting {
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
  createdAt: number;
}

/**
 * Timeline list of meetings for the project
 * Shows loading, empty, and error states
 */
export function MeetingList() {
  const { themeColors } = useProjectDrawer();
  const { meetings, isLoading, error } = useProjectMeetings();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: themeColors.primary }}
        />
        <p className="text-sm text-gray-500">Meetings werden geladen...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full"
          style={{ backgroundColor: "#fef2f2" }}
        >
          <Calendar className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-sm text-center text-red-600">
          {error.message || "Fehler beim Laden der Meetings"}
        </p>
        <p className="text-xs text-center text-gray-500">
          Bitte versuchen Sie es später erneut.
        </p>
      </div>
    );
  }

  // Empty state
  if (!meetings || meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full"
          style={{ backgroundColor: themeColors.background }}
        >
          <Calendar
            className="w-8 h-8"
            style={{ color: themeColors.primary }}
          />
        </div>
        <p className="text-sm text-center text-gray-600">
          Noch keine Meetings vorhanden
        </p>
        <p className="text-xs text-center text-gray-500">
          Neue Meetings werden hier angezeigt.
        </p>
      </div>
    );
  }

  // Group meetings by month/year for timeline
  // Cast to Meeting[] as the API returns the correct shape
  const groupedMeetings = groupMeetingsByMonth(meetings as Meeting[]);

  return (
    <div className="py-4">
      {Object.entries(groupedMeetings).map(([monthKey, monthMeetings]) => (
        <div key={monthKey} className="mb-6">
          {/* Month header */}
          <div
            className="sticky top-0 z-10 px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: themeColors.background,
              color: themeColors.accent,
            }}
          >
            {monthKey}
          </div>

          {/* Meeting cards with timeline */}
          <div className="relative pl-8 pr-4">
            {/* Timeline line */}
            <div
              className="absolute left-6 top-0 bottom-0 w-0.5"
              style={{ backgroundColor: themeColors.border }}
            />

            {/* Meeting cards */}
            {monthMeetings.map((meeting, index) => (
              <div key={meeting._id} className="relative mb-4">
                {/* Timeline dot */}
                <div
                  className="absolute -left-2 top-4 w-3 h-3 rounded-full border-2"
                  style={{
                    backgroundColor: "white",
                    borderColor: themeColors.primary,
                  }}
                />

                <MeetingCard
                  meeting={meeting}
                  isFirst={index === 0}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Groups meetings by month/year for the timeline view
 */
function groupMeetingsByMonth(meetings: Meeting[]): Record<string, Meeting[]> {
  const grouped: Record<string, Meeting[]> = {};

  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];

  for (const meeting of meetings) {
    const date = new Date(meeting.date);
    const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(meeting);
  }

  return grouped;
}
