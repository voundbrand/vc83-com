"use client";

/**
 * LEARN MODE
 *
 * AI interviews the user to extract tacit knowledge.
 * Wraps the existing InterviewSelector and InterviewRunner components.
 */

import type { Id } from "../../../../convex/_generated/dataModel";
import { InterviewSelector, InterviewRunner } from "@/components/interview";
import type { BrainTranslate } from "./index";

interface LearnModeProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  interviewSessionId: Id<"agentSessions"> | null;
  onInterviewStart: (sessionId: Id<"agentSessions">) => void;
  onInterviewComplete: (contentDNAId: string) => void;
  onInterviewExit: () => void;
  tr: BrainTranslate;
}

export function LearnMode({
  sessionId,
  organizationId,
  interviewSessionId,
  onInterviewStart,
  onInterviewComplete,
  onInterviewExit,
}: LearnModeProps) {
  // If we have an active interview session, show the runner
  if (interviewSessionId) {
    return (
      <InterviewRunner
        authSessionId={sessionId}
        sessionId={interviewSessionId}
        onComplete={onInterviewComplete}
        onExit={onInterviewExit}
        showProgress={true}
        className="h-full"
      />
    );
  }

  // Otherwise show the selector with a nice intro
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <InterviewSelector
          sessionId={sessionId}
          organizationId={organizationId}
          onStart={onInterviewStart}
          className="h-full"
        />
      </div>
    </div>
  );
}

export default LearnMode;
