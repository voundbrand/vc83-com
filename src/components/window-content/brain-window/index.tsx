"use client";

/**
 * BRAIN WINDOW
 *
 * Knowledge hub with three modes:
 * - Learn: AI interviews user to extract tacit knowledge (Content DNA)
 * - Teach: User inputs knowledge directly (PDFs, audio, links, text)
 * - Review: Browse and manage the organization's knowledge base
 *
 * Think NotebookLM - multi-modal knowledge capture and retrieval.
 */

import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailability } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  Brain,
  GraduationCap,
  Upload,
  Library,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Maximize2,
} from "lucide-react";
import Link from "next/link";

// Sub-components
import { LearnMode } from "./learn-mode";
import { TeachMode } from "./teach-mode";
import { ReviewMode } from "./review-mode";

type BrainMode = "learn" | "teach" | "review";

const MODE_CONFIG = {
  learn: {
    icon: GraduationCap,
    label: "Learn",
    description: "AI interviews you to extract knowledge",
  },
  teach: {
    icon: Upload,
    label: "Teach",
    description: "Upload PDFs, audio, links, and text",
  },
  review: {
    icon: Library,
    label: "Review",
    description: "Browse your knowledge base",
  },
} as const;

interface BrainWindowProps {
  initialMode?: BrainMode;
  /** When true, shows back-to-desktop navigation (for /brain route) */
  fullScreen?: boolean;
}

export function BrainWindow({ initialMode = "learn", fullScreen = false }: BrainWindowProps) {
  const { sessionId, isLoading: authLoading } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t } = useNamespaceTranslations("ui.brain");

  // App availability check (always returns available now - tier system handles limits)
  const { isAvailable, isLoading: appLoading } = useAppAvailability("brain");

  const [mode, setMode] = useState<BrainMode>(initialMode);
  const [interviewSessionId, setInterviewSessionId] = useState<Id<"agentSessions"> | null>(null);

  // Loading state
  if (authLoading || appLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-zinc-400">Loading Brain...</span>
      </div>
    );
  }

  // Auth check
  if (!sessionId || !currentOrg) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-900 p-8">
        <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-lg font-medium text-zinc-100 mb-2">Authentication Required</h2>
        <p className="text-zinc-400 text-center">Please sign in to access the Brain.</p>
      </div>
    );
  }

  // App availability check
  if (!isAvailable) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-900 p-8">
        <Brain className="w-12 h-12 text-zinc-600 mb-4" />
        <h2 className="text-lg font-medium text-zinc-100 mb-2">Brain Not Available</h2>
        <p className="text-zinc-400 text-center">
          This feature is not enabled for your organization.
        </p>
      </div>
    );
  }

  // Get organization ID for child components
  const organizationId = currentOrg.id as Id<"organizations">;

  const handleInterviewStart = (sessionId: Id<"agentSessions">) => {
    setInterviewSessionId(sessionId);
  };

  const handleInterviewComplete = (contentDNAId: string) => {
    console.log("Interview complete, Content DNA ID:", contentDNAId);
    setInterviewSessionId(null);
    // Could switch to Review mode to show the new knowledge
    setMode("review");
  };

  const handleInterviewExit = () => {
    setInterviewSessionId(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header with mode tabs */}
      <div className="border-b border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center gap-2 p-2">
          {/* Back to desktop link (full-screen mode only) */}
          {fullScreen && (
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
              title="Back to Desktop"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}

          <div className="flex items-center gap-2 px-3 py-1">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="font-medium text-zinc-100">Brain</span>
          </div>

          <div className="flex-1 flex items-center gap-1 ml-4">
            {(Object.keys(MODE_CONFIG) as BrainMode[]).map((modeKey) => {
              const config = MODE_CONFIG[modeKey];
              const Icon = config.icon;
              const isActive = mode === modeKey;

              return (
                <button
                  key={modeKey}
                  onClick={() => setMode(modeKey)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-zinc-100 border-t border-l border-r border-zinc-700"
                      : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                  title={config.description}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/brain"
              className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
              title="Open Full Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Mode content */}
      <div className="flex-1 overflow-hidden">
        {mode === "learn" && (
          <LearnMode
            sessionId={sessionId}
            organizationId={organizationId}
            interviewSessionId={interviewSessionId}
            onInterviewStart={handleInterviewStart}
            onInterviewComplete={handleInterviewComplete}
            onInterviewExit={handleInterviewExit}
          />
        )}

        {mode === "teach" && (
          <TeachMode
            sessionId={sessionId}
            organizationId={organizationId}
          />
        )}

        {mode === "review" && (
          <ReviewMode
            sessionId={sessionId}
            organizationId={organizationId}
          />
        )}
      </div>
    </div>
  );
}

export default BrainWindow;
