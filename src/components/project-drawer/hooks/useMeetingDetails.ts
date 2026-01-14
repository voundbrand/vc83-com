"use client";

import { useQuery } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { useProjectDrawer } from "../ProjectDrawerProvider";

/**
 * Hook to fetch meeting details
 * Requires frontend session authentication
 */
export function useMeetingDetails(meetingId: Id<"objects"> | null) {
  const { session } = useProjectDrawer();

  // Fetch meeting details using frontend session
  const meeting = useQuery(
    api.meetingOntology.getMeetingDetails,
    session && meetingId
      ? {
          sessionId: session.sessionId,
          meetingId,
        }
      : "skip"
  );

  return {
    meeting: meeting ?? null,
    isLoading: meeting === undefined,
    error: meeting instanceof Error ? meeting : null,
  };
}
