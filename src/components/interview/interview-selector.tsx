"use client";

/**
 * INTERVIEW SELECTOR
 *
 * Template picker to start a new interview.
 * Shows available templates with mode, duration, and description.
 * Auto-seeds default templates if none exist for the organization.
 */

import { useQuery, useMutation } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../convex/_generated/api") as { api: any };
import type { Id } from "../../../convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  Clock,
  Zap,
  BookOpen,
  Sparkles,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  InteriorButton,
  InteriorHelperText,
  InteriorPanel,
  InteriorRoot,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

interface InterviewSelectorProps {
  sessionId: string; // Auth session ID for API calls
  organizationId: Id<"organizations">;
  onStart: (interviewSessionId: Id<"agentSessions">) => void;
  onCancel?: () => void;
  className?: string;
}

interface InterviewTemplateListItem {
  _id: Id<"objects">;
  customProperties: {
    templateName: string;
    description: string;
    mode: "quick" | "standard" | "deep_discovery";
    estimatedMinutes: number;
    phases: Array<{ phaseName: string }>;
  };
}

const MODE_CONFIG = {
  quick: { icon: Zap, label: "Quick", description: "Fast 5-10 min interview" },
  standard: { icon: BookOpen, label: "Standard", description: "Balanced 15-20 min" },
  deep_discovery: { icon: Sparkles, label: "Deep Discovery", description: "Thorough 30+ min" },
} as const;

const MODE_ACCENT: Record<keyof typeof MODE_CONFIG, { border: string; bg: string; icon: string }> = {
  quick: { border: "#9a7f2f", bg: "rgba(183, 144, 77, 0.2)", icon: "#b7904d" },
  standard: { border: "#4e6f98", bg: "rgba(104, 135, 177, 0.2)", icon: "#6887b1" },
  deep_discovery: { border: "#6f62a8", bg: "rgba(111, 98, 168, 0.2)", icon: "#988dd6" },
};

export function InterviewSelector({
  sessionId,
  organizationId,
  onStart,
  onCancel,
  className = "",
}: InterviewSelectorProps) {
  const { t } = useNamespaceTranslations("ui.brain");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>) => {
    const value = t(key, params);
    return value === key ? fallback : value;
  };
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"objects"> | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const seedAttemptedRef = useRef(false);

  const templates = useQuery(api.interviewTemplateOntology.listTemplates, {
    sessionId,
    organizationId,
    status: "active",
  }) as InterviewTemplateListItem[] | undefined;

  const startInterview = useMutation(api.ai.interviewRunner.startInterview);
  const ensureTemplates = useMutation(api.interviewTemplateOntology.ensureDefaultTemplates);

  // Auto-seed templates if none exist
  useEffect(() => {
    if (templates && templates.length === 0 && !seedAttemptedRef.current && !isSeeding) {
      seedAttemptedRef.current = true;
      setIsSeeding(true);

      ensureTemplates({ sessionId, organizationId })
        .then((result) => {
          console.log("[InterviewSelector] Templates seeded:", result);
          setIsSeeding(false);
        })
        .catch((err) => {
          console.error("[InterviewSelector] Failed to seed templates:", err);
          setIsSeeding(false);
        });
    }
  }, [templates, sessionId, organizationId, ensureTemplates, isSeeding]);

  const handleStart = async () => {
    if (!selectedTemplateId) return;

    setIsStarting(true);
    setError(null);

    try {
      const result = await startInterview({
        sessionId: `interview_${Date.now()}`,
        templateId: selectedTemplateId,
        organizationId,
        channel: "interview",
      });

      onStart(result.sessionId);
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError(err instanceof Error ? err.message : "Failed to start interview");
      setIsStarting(false);
    }
  };

  if (!templates) {
    return (
      <InteriorRoot className={`flex items-center justify-center gap-2 p-8 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
        <InteriorHelperText>{tx("ui.brain.learn.selector.loading", "Loading templates...")}</InteriorHelperText>
      </InteriorRoot>
    );
  }

  if (templates.length === 0) {
    // Show loading during seeding
    if (isSeeding) {
      return (
        <InteriorRoot className={`flex items-center justify-center gap-2 p-8 ${className}`}>
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
          <InteriorHelperText>
            {tx("ui.brain.learn.selector.seeding", "Setting up interview templates...")}
          </InteriorHelperText>
        </InteriorRoot>
      );
    }

    // Only show error if seeding was attempted and failed
    return (
      <InteriorRoot className={`p-6 text-center ${className}`}>
        <AlertCircle className="mx-auto mb-2 h-8 w-8" style={{ color: "var(--warning)" }} />
        <InteriorTitle className="text-sm">
          {tx("ui.brain.learn.selector.empty.title", "No interview templates available")}
        </InteriorTitle>
        <InteriorHelperText className="mt-1">
          {tx(
            "ui.brain.learn.selector.empty.body",
            "Create a template in the Interview Designer first.",
          )}
        </InteriorHelperText>
        {onCancel && (
          <div className="mt-4">
            <InteriorButton onClick={onCancel} variant="subtle">
              {tx("ui.brain.learn.selector.actions.go_back", "Go Back")}
            </InteriorButton>
          </div>
        )}
      </InteriorRoot>
    );
  }

  return (
    <InteriorRoot className={`flex h-full flex-col ${className}`}>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-3xl space-y-2">
          {templates.map((template) => {
            const props = template.customProperties;

            const modeConfig = MODE_CONFIG[props.mode] || MODE_CONFIG.standard;
            const ModeIcon = modeConfig.icon;
            const accent = MODE_ACCENT[props.mode] ?? MODE_ACCENT.standard;
            const isSelected = selectedTemplateId === template._id;

            return (
              <InteriorPanel
                key={template._id}
                onClick={() => setSelectedTemplateId(template._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedTemplateId(template._id);
                  }
                }}
                className={`w-full cursor-pointer p-3 text-left transition-colors ${isStarting ? "opacity-70" : ""}`}
                style={
                  isSelected
                    ? {
                        borderColor: "var(--tone-accent-strong)",
                        background: "var(--desktop-shell-accent)",
                      }
                    : undefined
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className="rounded border p-1.5"
                    style={{ borderColor: accent.border, background: accent.bg }}
                  >
                    <ModeIcon className="h-4 w-4" style={{ color: accent.icon }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                        {props.templateName}
                      </h3>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4" style={{ color: "var(--success)" }} />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {props.description}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        ~{props.estimatedMinutes} min
                      </span>
                      <span>{props.phases?.length || 0} phases</span>
                      <span style={{ color: accent.icon }}>{modeConfig.label}</span>
                    </div>
                  </div>
                </div>
              </InteriorPanel>
            );
          })}
        </div>
      </div>

      {error && (
        <InteriorPanel className="mx-3 mb-3 flex items-center gap-2 p-3" style={{ borderColor: "var(--error)", background: "var(--error-bg)" }}>
          <AlertCircle className="h-4 w-4" style={{ color: "var(--error)" }} />
          {error}
        </InteriorPanel>
      )}

      <div className="border-t p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {onCancel && (
            <InteriorButton onClick={onCancel} disabled={isStarting} variant="ghost">
              {tx("ui.brain.learn.selector.actions.cancel", "Cancel")}
            </InteriorButton>
          )}
          <InteriorButton
            onClick={handleStart}
            disabled={!selectedTemplateId || isStarting}
            variant="primary"
            className="ml-auto gap-2"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tx("ui.brain.learn.selector.actions.starting", "Starting...")}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {tx("ui.brain.learn.selector.actions.start", "Start Interview")}
              </>
            )}
          </InteriorButton>
        </div>
      </div>
    </InteriorRoot>
  );
}

export default InterviewSelector;
