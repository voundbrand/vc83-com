"use client";

import React from "react";
import { useProjectDrawer } from "./ProjectDrawerProvider";

interface MeetingNotesProps {
  notes: string;
}

/**
 * Displays rich HTML meeting notes in a styled container
 * Renders HTML content safely with appropriate styling
 */
export function MeetingNotes({ notes }: MeetingNotesProps) {
  const { themeColors } = useProjectDrawer();

  // Check if notes contain HTML
  const isHtml = /<[a-z][\s\S]*>/i.test(notes);

  if (isHtml) {
    return (
      <div
        className="p-4 overflow-hidden prose border rounded-lg prose-sm max-w-none"
        style={{
          backgroundColor: themeColors.background,
          borderColor: themeColors.border,
        }}
        dangerouslySetInnerHTML={{ __html: notes }}
      />
    );
  }

  // Plain text - render with line breaks preserved
  return (
    <div
      className="p-4 overflow-hidden text-sm border rounded-lg whitespace-pre-wrap"
      style={{
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        color: "#374151", // gray-700
      }}
    >
      {notes}
    </div>
  );
}
