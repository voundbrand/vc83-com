"use client";

import React, { useEffect } from "react";
import { X, ArrowLeft, Calendar, Clock, Loader2 } from "lucide-react";
import { useProjectDrawer } from "./ProjectDrawerProvider";
import { useMeetingDetails } from "./hooks/useMeetingDetails";
import { MeetingNotes } from "./MeetingNotes";
import { MeetingVideos } from "./MeetingVideos";
import { MeetingFiles } from "./MeetingFiles";
import { MeetingComments } from "./MeetingComments";

/**
 * Full-screen modal displaying meeting details
 * Includes notes, videos, files, and comments sections
 */
export function MeetingDetailModal() {
  const { selectedMeetingId, closeMeetingDetail, themeColors } = useProjectDrawer();
  const { meeting, isLoading, error } = useMeetingDetails(selectedMeetingId);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedMeetingId) {
        closeMeetingDetail();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedMeetingId, closeMeetingDetail]);

  // Don't render if no meeting selected
  if (!selectedMeetingId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={closeMeetingDetail}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col pointer-events-auto overflow-hidden"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
            }}
          >
            {/* Back button */}
            <button
              onClick={closeMeetingDetail}
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: themeColors.accent }}
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>

            {/* Title (shown when loaded) */}
            {meeting && (
              <h2
                className="text-lg font-semibold truncate max-w-[200px]"
                style={{ color: themeColors.accent }}
              >
                {meeting.name}
              </h2>
            )}

            {/* Close button */}
            <button
              onClick={closeMeetingDetail}
              className="p-2 transition-colors rounded hover:bg-gray-100"
              aria-label="Schließen"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: themeColors.primary }}
                />
                <p className="text-sm text-gray-500">Meeting wird geladen...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
                <p className="text-sm text-center text-red-600">
                  {error.message || "Fehler beim Laden des Meetings"}
                </p>
              </div>
            ) : meeting ? (
              <div className="p-6 space-y-6">
                {/* Meeting header info */}
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {meeting.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {/* Date */}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatFullDate(meeting.customProperties.date)}
                      {meeting.customProperties.time && (
                        <>, {meeting.customProperties.time} Uhr</>
                      )}
                    </span>

                    {/* Duration */}
                    {meeting.customProperties.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {meeting.customProperties.duration} Minuten
                      </span>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <hr style={{ borderColor: themeColors.border }} />

                {/* Summary */}
                {meeting.customProperties.summary && (
                  <section>
                    <h3 className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                      📝 Zusammenfassung
                    </h3>
                    <p className="text-gray-600">
                      {meeting.customProperties.summary}
                    </p>
                  </section>
                )}

                {/* Notes */}
                {meeting.customProperties.notes && (
                  <>
                    <hr style={{ borderColor: themeColors.border }} />
                    <section>
                      <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                        📋 Meeting-Notizen
                      </h3>
                      <MeetingNotes notes={meeting.customProperties.notes} />
                    </section>
                  </>
                )}

                {/* Videos */}
                {meeting.videos && meeting.videos.length > 0 && (
                  <>
                    <hr style={{ borderColor: themeColors.border }} />
                    <section>
                      <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                        🎬 Videos
                      </h3>
                      <MeetingVideos videos={meeting.videos} />
                    </section>
                  </>
                )}

                {/* Files */}
                {meeting.files && meeting.files.length > 0 && (
                  <>
                    <hr style={{ borderColor: themeColors.border }} />
                    <section>
                      <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                        📎 Dateien
                      </h3>
                      <MeetingFiles files={meeting.files} />
                    </section>
                  </>
                )}

                {/* Comments */}
                <>
                  <hr style={{ borderColor: themeColors.border }} />
                  <section>
                    <MeetingComments meetingId={selectedMeetingId} />
                  </section>
                </>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Format timestamp to full German date
 */
function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate();
  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day}. ${month} ${year}`;
}
