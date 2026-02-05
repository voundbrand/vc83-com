"use client";

/**
 * INTERVIEW PROGRESS
 *
 * Progress indicator for guided interview sessions.
 * Shows current phase, completion percentage, and estimated time.
 *
 * Used by both agency dashboard (monitoring) and client UI (guidance).
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CheckCircle, Circle, Clock, MessageSquare } from "lucide-react";

interface InterviewProgressProps {
  sessionId: Id<"agentSessions">;
  variant?: "compact" | "detailed" | "minimal";
  showEstimatedTime?: boolean;
  className?: string;
}

export function InterviewProgress({
  sessionId,
  variant = "compact",
  showEstimatedTime = true,
  className = "",
}: InterviewProgressProps) {
  const progress = useQuery(api.ai.interviewRunner.getInterviewProgress, {
    sessionId,
  });

  if (!progress) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-2 bg-zinc-700 rounded-full w-full" />
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-500"
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>
        <span className="text-xs text-zinc-400">{progress.percentComplete}%</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progress.isComplete ? "bg-green-500" : "bg-purple-500"
              }`}
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
          <span className="text-sm font-medium text-zinc-300 w-12 text-right">
            {progress.percentComplete}%
          </span>
        </div>

        {/* Current Phase */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <MessageSquare className="w-4 h-4" />
            <span>{progress.currentPhaseName}</span>
          </div>
          {showEstimatedTime && !progress.isComplete && (
            <div className="flex items-center gap-1 text-zinc-500">
              <Clock className="w-3 h-3" />
              <span className="text-xs">~{progress.estimatedMinutesRemaining} min left</span>
            </div>
          )}
          {progress.isComplete && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Complete
            </span>
          )}
        </div>
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-200">{progress.templateName}</h3>
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${
            progress.isComplete
              ? "bg-green-900 text-green-300"
              : "bg-purple-900 text-purple-300"
          }`}
        >
          {progress.isComplete ? "Complete" : "In Progress"}
        </span>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
          <span>
            Phase {progress.completedPhases + 1} of {progress.totalPhases}
          </span>
          <span>{progress.percentComplete}% complete</span>
        </div>
        <div className="h-2.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              progress.isComplete ? "bg-green-500" : "bg-purple-500"
            }`}
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>
      </div>

      {/* Phase List */}
      <div className="space-y-1">
        {/* This would need phase names from template - simplified for now */}
        <div className="flex items-center gap-2 text-sm">
          <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
            <span className="text-xs text-white">{progress.completedPhases + 1}</span>
          </div>
          <span className="text-zinc-200">{progress.currentPhaseName}</span>
          <span className="text-xs text-zinc-500 ml-auto">
            Question {progress.currentQuestionIndex + 1}
          </span>
        </div>
      </div>

      {/* Time Estimate */}
      {showEstimatedTime && !progress.isComplete && (
        <div className="flex items-center gap-2 text-sm text-zinc-400 pt-2 border-t border-zinc-700">
          <Clock className="w-4 h-4" />
          <span>Estimated {progress.estimatedMinutesRemaining} minutes remaining</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PHASE INDICATOR COMPONENT
// ============================================================================

interface PhaseIndicatorProps {
  phases: Array<{
    id: string;
    name: string;
    status: "completed" | "current" | "upcoming" | "skipped";
  }>;
  className?: string;
}

export function PhaseIndicator({ phases, className = "" }: PhaseIndicatorProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {phases.map((phase, index) => (
        <div key={phase.id} className="flex items-center">
          {/* Phase Dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              phase.status === "completed"
                ? "bg-green-500"
                : phase.status === "current"
                  ? "bg-purple-500"
                  : phase.status === "skipped"
                    ? "bg-zinc-600"
                    : "bg-zinc-700"
            }`}
            title={`${phase.name} - ${phase.status}`}
          />

          {/* Connector Line */}
          {index < phases.length - 1 && (
            <div
              className={`w-4 h-0.5 ${
                phase.status === "completed" ? "bg-green-500" : "bg-zinc-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// INTERVIEW CARD COMPONENT (for listings)
// ============================================================================

interface InterviewCardProps {
  sessionId: Id<"agentSessions">;
  clientName?: string;
  startedAt: number;
  onClick?: () => void;
  className?: string;
}

export function InterviewCard({
  sessionId,
  clientName,
  startedAt,
  onClick,
  className = "",
}: InterviewCardProps) {
  const progress = useQuery(api.ai.interviewRunner.getInterviewProgress, {
    sessionId,
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-zinc-200">{clientName || "Anonymous"}</h4>
          <p className="text-xs text-zinc-500">{formatDate(startedAt)}</p>
        </div>
        {progress && (
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              progress.isComplete
                ? "bg-green-900 text-green-300"
                : "bg-yellow-900 text-yellow-300"
            }`}
          >
            {progress.isComplete ? "Complete" : `${progress.percentComplete}%`}
          </span>
        )}
      </div>

      {/* Template Name */}
      {progress && (
        <p className="text-sm text-zinc-400 mb-3">{progress.templateName}</p>
      )}

      {/* Progress Bar */}
      {progress && !progress.isComplete && (
        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>
      )}

      {/* Completed indicator */}
      {progress?.isComplete && (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Interview complete - Content DNA ready</span>
        </div>
      )}
    </div>
  );
}
