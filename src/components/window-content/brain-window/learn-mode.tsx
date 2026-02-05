"use client";

/**
 * LEARN MODE
 *
 * AI interviews the user to extract tacit knowledge.
 * Wraps the existing InterviewSelector and InterviewRunner components.
 */

import type { Id } from "../../../../convex/_generated/dataModel";
import { InterviewSelector, InterviewRunner, InterviewResults } from "@/components/interview";
import { GraduationCap, Sparkles } from "lucide-react";

interface LearnModeProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  interviewSessionId: Id<"agentSessions"> | null;
  onInterviewStart: (sessionId: Id<"agentSessions">) => void;
  onInterviewComplete: (contentDNAId: string) => void;
  onInterviewExit: () => void;
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
    <div className="flex flex-col h-full">
      {/* Intro section */}
      <div className="p-6 border-b border-zinc-700 bg-gradient-to-br from-purple-900/20 to-zinc-900">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Teach the AI About You
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Through a guided interview, we'll extract your unique voice, expertise,
            and preferences to create your Content DNA profile.
          </p>
        </div>
      </div>

      {/* Template selector */}
      <div className="flex-1 overflow-hidden">
        <InterviewSelector
          sessionId={sessionId}
          organizationId={organizationId}
          onStart={onInterviewStart}
          className="h-full"
        />
      </div>

      {/* Benefits footer */}
      <div className="p-4 border-t border-zinc-700 bg-zinc-800/30">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Personalized AI responses</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Content in your voice</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Better recommendations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LearnMode;
