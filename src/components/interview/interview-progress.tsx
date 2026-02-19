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
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
const { api } = require("../../../convex/_generated/api") as { api: any };
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
  const useQueryAny = useQuery as any;
  const progress = useQueryAny(api.ai.interviewRunner.getInterviewProgress, {
    sessionId,
  });

  if (!progress) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-2 w-full rounded-full" style={{ background: "var(--window-document-border)" }} />
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--window-document-border)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ background: "var(--tone-accent-strong)", width: `${progress.percentComplete}%` }}
          />
        </div>
        <span className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {progress.percentComplete}%
        </span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 overflow-hidden rounded-full" style={{ background: "var(--window-document-border)" }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                background: progress.isComplete ? "var(--success)" : "var(--tone-accent-strong)",
                width: `${progress.percentComplete}%`,
              }}
            />
          </div>
          <span className="w-12 text-right text-sm font-medium" style={{ color: "var(--window-document-text)" }}>
            {progress.percentComplete}%
          </span>
        </div>

        {/* Current Phase */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2" style={{ color: "var(--desktop-menu-text-muted)" }}>
            <MessageSquare className="h-4 w-4" />
            <span>{progress.currentPhaseName}</span>
          </div>
          {showEstimatedTime && !progress.isComplete && (
            <div className="flex items-center gap-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
              <Clock className="h-3 w-3" />
              <span className="text-xs">~{progress.estimatedMinutesRemaining} min left</span>
            </div>
          )}
          {progress.isComplete && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--success)" }}>
              <CheckCircle className="h-3 w-3" />
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
        <h3 className="text-sm font-medium" style={{ color: "var(--window-document-text)" }}>
          {progress.templateName}
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-xs"
          style={{
            color: progress.isComplete ? "var(--success)" : "var(--tone-accent-strong)",
            background: progress.isComplete ? "var(--success-bg)" : "var(--desktop-shell-accent)",
          }}
        >
          {progress.isComplete ? "Complete" : "In Progress"}
        </span>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          <span>
            Phase {progress.completedPhases + 1} of {progress.totalPhases}
          </span>
          <span>{progress.percentComplete}% complete</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--window-document-border)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              background: progress.isComplete ? "var(--success)" : "var(--tone-accent-strong)",
              width: `${progress.percentComplete}%`,
            }}
          />
        </div>
      </div>

      {/* Phase List */}
      <div className="space-y-1">
        {/* This would need phase names from template - simplified for now */}
        <div className="flex items-center gap-2 text-sm">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: "var(--tone-accent-strong)", color: "#0f0f0f" }}
          >
            <span className="text-xs text-white">{progress.completedPhases + 1}</span>
          </div>
          <span style={{ color: "var(--window-document-text)" }}>{progress.currentPhaseName}</span>
          <span className="ml-auto text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Question {progress.currentQuestionIndex + 1}
          </span>
        </div>
      </div>

      {/* Time Estimate */}
      {showEstimatedTime && !progress.isComplete && (
        <div
          className="flex items-center gap-2 border-t pt-2 text-sm"
          style={{ borderColor: "var(--window-document-border)", color: "var(--desktop-menu-text-muted)" }}
        >
          <Clock className="h-4 w-4" />
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
            className="h-2.5 w-2.5 rounded-full transition-colors"
            style={{
              background:
                phase.status === "completed"
                  ? "var(--success)"
                  : phase.status === "current"
                    ? "var(--tone-accent-strong)"
                    : phase.status === "skipped"
                      ? "var(--desktop-menu-text-muted)"
                      : "var(--window-document-border)",
            }}
            title={`${phase.name} - ${phase.status}`}
          />

          {/* Connector Line */}
          {index < phases.length - 1 && (
            <div
              className="h-0.5 w-4"
              style={{
                background: phase.status === "completed" ? "var(--success)" : "var(--window-document-border)",
              }}
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
  const useQueryAny = useQuery as any;
  const progress = useQueryAny(api.ai.interviewRunner.getInterviewProgress, {
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
      className={`cursor-pointer rounded-lg border p-4 transition-colors ${className}`}
      style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium" style={{ color: "var(--window-document-text)" }}>
            {clientName || "Anonymous"}
          </h4>
          <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>{formatDate(startedAt)}</p>
        </div>
        {progress && (
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{
              color: progress.isComplete ? "var(--success)" : "var(--warning)",
              background: progress.isComplete ? "var(--success-bg)" : "var(--warning-bg)",
            }}
          >
            {progress.isComplete ? "Complete" : `${progress.percentComplete}%`}
          </span>
        )}
      </div>

      {/* Template Name */}
      {progress && (
        <p className="mb-3 text-sm" style={{ color: "var(--desktop-menu-text-muted)" }}>{progress.templateName}</p>
      )}

      {/* Progress Bar */}
      {progress && !progress.isComplete && (
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--window-document-border)" }}>
          <div
            className="h-full transition-all duration-300"
            style={{ background: "var(--tone-accent-strong)", width: `${progress.percentComplete}%` }}
          />
        </div>
      )}

      {/* Completed indicator */}
      {progress?.isComplete && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--success)" }}>
          <CheckCircle className="h-4 w-4" />
          <span>Interview complete - Content DNA ready</span>
        </div>
      )}
    </div>
  );
}
