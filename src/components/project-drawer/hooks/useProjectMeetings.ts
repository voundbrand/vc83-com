"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useProjectDrawer } from "../ProjectDrawerProvider";

/**
 * Hook to fetch project meetings
 * Requires frontend session authentication
 */
export function useProjectMeetings() {
  const { session, config } = useProjectDrawer();

  // Fetch meetings using frontend session
  const meetings = useQuery(
    api.meetingOntology.getProjectMeetings,
    session
      ? {
          sessionId: session.sessionId,
          organizationId: config.organizationId,
          projectId: config.projectId,
        }
      : "skip"
  );

  return {
    meetings: meetings ?? null,
    isLoading: meetings === undefined,
    error: meetings instanceof Error ? meetings : null,
  };
}
