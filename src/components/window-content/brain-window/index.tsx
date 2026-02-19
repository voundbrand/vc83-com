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

import { useMemo, useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailability } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  GraduationCap,
  Upload,
  Library,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Maximize2,
} from "lucide-react";
import Link from "next/link";
import { ShellBrainIcon } from "@/components/icons/shell-icons";
import {
  InteriorHeader,
  InteriorHelperText,
  InteriorPanel,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTabButton,
  InteriorTabRow,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

// Sub-components
import { LearnMode } from "./learn-mode";
import { TeachMode } from "./teach-mode";
import { ReviewMode } from "./review-mode";

type BrainMode = "learn" | "teach" | "review";

export type BrainTranslate = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>,
) => string;

interface BrainWindowProps {
  initialMode?: BrainMode;
  /** When true, shows back-to-desktop navigation (for /brain route) */
  fullScreen?: boolean;
}

const INTERNAL_BRAIN_WINDOW_ENABLED =
  process.env.NEXT_PUBLIC_INTERNAL_BRAIN_WINDOW === "true";

export function BrainWindow({ initialMode = "learn", fullScreen = false }: BrainWindowProps) {
  const { sessionId, isLoading: authLoading } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t } = useNamespaceTranslations("ui.brain");

  // App availability check (always returns available now - tier system handles limits)
  const { isAvailable, isLoading: appLoading } = useAppAvailability("brain");

  const [mode, setMode] = useState<BrainMode>(initialMode);
  const [interviewSessionId, setInterviewSessionId] = useState<Id<"agentSessions"> | null>(null);

  const tr: BrainTranslate = useMemo(
    () =>
      (key, fallback, params) => {
        const value = t(key, params);
        return value === key ? fallback : value;
      },
    [t],
  );

  const modeConfig = useMemo(
    () => ({
      learn: {
        icon: GraduationCap,
        label: tr("ui.brain.mode.learn.label", "Learn"),
        description: tr("ui.brain.mode.learn.description", "AI interviews you to extract knowledge"),
      },
      teach: {
        icon: Upload,
        label: tr("ui.brain.mode.teach.label", "Teach"),
        description: tr("ui.brain.mode.teach.description", "Upload PDFs, audio, links, and text"),
      },
      review: {
        icon: Library,
        label: tr("ui.brain.mode.review.label", "Review"),
        description: tr("ui.brain.mode.review.description", "Browse your knowledge base"),
      },
    }),
    [tr],
  );

  if (!INTERNAL_BRAIN_WINDOW_ENABLED) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <div className="mb-3 flex items-center gap-2">
            <ShellBrainIcon size={18} tone="muted" />
            <InteriorTitle className="text-base">Brain Window Archived</InteriorTitle>
          </div>
          <InteriorPanel className="space-y-3">
            <InteriorHelperText>
              The Brain window is now internal-only during lifecycle consolidation.
              Use AI Agents for daily operator workflows.
            </InteriorHelperText>
            <div>
              <Link
                href="/agents"
                className="desktop-interior-button desktop-interior-button-secondary inline-flex h-9 items-center px-3"
              >
                Open AI Agents
              </Link>
            </div>
          </InteriorPanel>
        </div>
      </InteriorRoot>
    );
  }

  // Loading state
  if (authLoading || appLoading) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center gap-2 p-6">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
        <InteriorHelperText>{tr("ui.brain.state.loading", "Loading Brain...")}</InteriorHelperText>
      </InteriorRoot>
    );
  }

  // Auth check
  if (!sessionId || !currentOrg) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" style={{ color: "var(--warning)" }} />
            <InteriorTitle className="text-base">
              {tr("ui.brain.state.auth_required.title", "Authentication Required")}
            </InteriorTitle>
          </div>
          <InteriorPanel className="space-y-2">
            <InteriorHelperText>
              {tr("ui.brain.state.auth_required.body", "Please sign in to access the Brain.")}
            </InteriorHelperText>
          </InteriorPanel>
        </div>
      </InteriorRoot>
    );
  }

  // App availability check
  if (!isAvailable) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-3 flex items-center gap-2">
            <ShellBrainIcon size={18} tone="muted" />
            <InteriorTitle className="text-base">
              {tr("ui.brain.state.unavailable.title", "Brain Not Available")}
            </InteriorTitle>
          </div>
          <InteriorPanel>
            <InteriorHelperText>
              {tr(
                "ui.brain.state.unavailable.body",
                "This feature is not enabled for your organization.",
              )}
            </InteriorHelperText>
          </InteriorPanel>
        </div>
      </InteriorRoot>
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
    <InteriorRoot className="flex h-full flex-col">
      <InteriorHeader className="px-3 py-2">
        <div className="flex items-center gap-2">
          {fullScreen && (
            <Link
              href="/"
              className="desktop-interior-button desktop-interior-button-ghost inline-flex h-8 items-center justify-center px-2"
              title={tr("ui.brain.nav.back_to_desktop", "Back to Desktop")}
              aria-label={tr("ui.brain.nav.back_to_desktop", "Back to Desktop")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}

          <div className="flex items-center gap-2">
            <ShellBrainIcon size={18} />
            <InteriorTitle className="text-sm">{tr("ui.windows.brain.title", "Brain")}</InteriorTitle>
          </div>

          {!fullScreen && (
            <Link
              href="/brain"
              className="desktop-interior-button desktop-interior-button-ghost ml-auto inline-flex h-8 items-center justify-center px-2"
              title={tr("ui.brain.nav.open_fullscreen", "Open Full Screen")}
              aria-label={tr("ui.brain.nav.open_fullscreen", "Open Full Screen")}
            >
              <Maximize2 className="h-4 w-4" />
            </Link>
          )}
        </div>
        <InteriorSubtitle className="mt-1">
          {tr("ui.brain.subtitle", "Trust knowledge hub for learn, teach, and review workflows.")}
        </InteriorSubtitle>
      </InteriorHeader>

      <InteriorTabRow className="px-3 py-2">
        {(Object.keys(modeConfig) as BrainMode[]).map((modeKey) => {
          const config = modeConfig[modeKey];
          const Icon = config.icon;
          return (
            <InteriorTabButton
              key={modeKey}
              active={mode === modeKey}
              onClick={() => setMode(modeKey)}
              title={config.description}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <span>{config.label}</span>
            </InteriorTabButton>
          );
        })}
      </InteriorTabRow>

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
            tr={tr}
          />
        )}

        {mode === "teach" && (
          <TeachMode
            sessionId={sessionId}
            organizationId={organizationId}
            tr={tr}
          />
        )}

        {mode === "review" && (
          <ReviewMode
            sessionId={sessionId}
            organizationId={organizationId}
            tr={tr}
          />
        )}
      </div>
    </InteriorRoot>
  );
}

export default BrainWindow;
