"use client";

/**
 * INTERVIEW SELECTOR
 *
 * Template picker to start a new interview.
 * Shows available templates with mode, duration, and description.
 * Auto-seeds default templates if none exist for the organization.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
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

interface InterviewSelectorProps {
  sessionId: string; // Auth session ID for API calls
  organizationId: Id<"organizations">;
  onStart: (interviewSessionId: Id<"agentSessions">) => void;
  onCancel?: () => void;
  className?: string;
}

const MODE_CONFIG = {
  quick: { icon: Zap, label: "Quick", color: "yellow", description: "Fast 5-10 min interview" },
  standard: { icon: BookOpen, label: "Standard", color: "blue", description: "Balanced 15-20 min" },
  deep_discovery: { icon: Sparkles, label: "Deep Discovery", color: "purple", description: "Thorough 30+ min" },
} as const;

export function InterviewSelector({
  sessionId,
  organizationId,
  onStart,
  onCancel,
  className = "",
}: InterviewSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"objects"> | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const seedAttemptedRef = useRef(false);

  const templates = useQuery(api.interviewTemplateOntology.listTemplates, {
    sessionId,
    organizationId,
    status: "active",
  });

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
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-zinc-400">Loading templates...</span>
      </div>
    );
  }

  if (templates.length === 0) {
    // Show loading during seeding
    if (isSeeding) {
      return (
        <div className={`flex items-center justify-center p-8 ${className}`}>
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <span className="ml-2 text-zinc-400">Setting up interview templates...</span>
        </div>
      );
    }

    // Only show error if seeding was attempted and failed
    return (
      <div className={`p-6 text-center ${className}`}>
        <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-zinc-300 mb-2">No interview templates available</p>
        <p className="text-sm text-zinc-500">Create a template in the Interview Designer first.</p>
        {onCancel && (
          <button onClick={onCancel} className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-700">
        <h2 className="text-lg font-semibold text-zinc-100">Start an Interview</h2>
        <p className="text-sm text-zinc-500">Choose a template to begin extracting Content DNA</p>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3 max-w-2xl mx-auto">
          {templates.map((template) => {
            const props = template.customProperties as {
              templateName: string;
              description: string;
              mode: "quick" | "standard" | "deep_discovery";
              estimatedMinutes: number;
              phases: Array<{ phaseName: string }>;
            };

            const modeConfig = MODE_CONFIG[props.mode] || MODE_CONFIG.standard;
            const ModeIcon = modeConfig.icon;
            const isSelected = selectedTemplateId === template._id;

            return (
              <button
                key={template._id}
                onClick={() => setSelectedTemplateId(template._id)}
                disabled={isStarting}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-purple-500 bg-purple-900/20"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                } disabled:opacity-50`}
              >
                <div className="flex items-start gap-4">
                  {/* Mode Icon */}
                  <div className={`p-2 rounded-lg bg-${modeConfig.color}-900/30`}>
                    <ModeIcon className={`w-5 h-5 text-${modeConfig.color}-400`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-zinc-100">{props.templateName}</h3>
                      {isSelected && <CheckCircle className="w-4 h-4 text-purple-400" />}
                    </div>
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{props.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{props.estimatedMinutes} min
                      </span>
                      <span>{props.phases?.length || 0} phases</span>
                      <span className={`text-${modeConfig.color}-400`}>{modeConfig.label}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isStarting}
              className="px-4 py-2 text-zinc-400 hover:text-zinc-300 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleStart}
            disabled={!selectedTemplateId || isStarting}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Interview
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewSelector;
