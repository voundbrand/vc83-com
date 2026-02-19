"use client";

/**
 * INTERVIEW RUNNER
 *
 * Main UI for conducting guided interviews.
 * Displays current question, accepts text/choice/rating input, shows progress.
 *
 * Phase 2 will add: Voice input via Parakeet V3
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../convex/_generated/api") as { api: any };
import type { Id } from "../../../convex/_generated/dataModel";
import { InterviewProgress } from "./interview-progress";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  DEFAULT_VOICE_PREVIEW_TEXT,
  useVoicePreferences,
} from "@/hooks/use-voice-preferences";
import {
  useVoiceRuntime,
  type VoiceRuntimeProviderId,
} from "@/hooks/use-voice-runtime";
import {
  Send,
  Mic,
  Loader2,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  InteriorButton,
  InteriorHeader,
  InteriorHelperText,
  InteriorPanel,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";
import { useWindowManager } from "@/hooks/use-window-manager";
import { AIChatWindow } from "@/components/window-content/ai-chat-window";
import { getVoiceAssistantWindowContract } from "@/components/window-content/ai-chat-window/voice-assistant-contract";
import {
  buildVoiceAgentCoCreationHandoffPayload,
  stageVoiceAgentCoCreationHandoff,
} from "@/lib/voice-assistant/agent-co-creation-handoff";

interface InterviewRunnerProps {
  authSessionId?: string;
  sessionId: Id<"agentSessions">;
  onComplete?: (contentDNAId: string) => void;
  onExit?: () => void;
  showProgress?: boolean;
  className?: string;
}

interface SourceAttributionPreviewEntry {
  fieldId: string;
  phaseId: string;
  phaseName: string;
  questionId: string;
  questionPrompt: string;
  valuePreview: string;
}

interface VoiceConsentSummary {
  channel: string;
  voiceCaptureMode: "voice_enabled";
  activeCheckpointId: string;
  providerFallbackPolicy: string;
  sourceAttributionPolicy: string;
  sourceAttributionCount: number;
  sourceAttributionPreview: SourceAttributionPreviewEntry[];
  memoryCandidateCount: number;
}

export function InterviewRunner({
  authSessionId,
  sessionId,
  onComplete,
  onExit,
  showProgress = true,
  className = "",
}: InterviewRunnerProps) {
  const { openWindow } = useWindowManager();
  const { t } = useNamespaceTranslations("ui.brain");
  const tx = useCallback(
    (key: string, fallback: string, params?: Record<string, string | number>) => {
      const value = t(key, params);
      return value === key ? fallback : value;
    },
    [t],
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDecidingConsent, setIsDecidingConsent] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  const [voiceProviderId, setVoiceProviderId] =
    useState<VoiceRuntimeProviderId>("browser");
  const [voiceId, setVoiceId] = useState("");
  const [voicePreviewText, setVoicePreviewText] = useState(
    DEFAULT_VOICE_PREVIEW_TEXT,
  );
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [isSavingVoicePreferences, setIsSavingVoicePreferences] =
    useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [previewVoiceSessionId, setPreviewVoiceSessionId] = useState<
    string | null
  >(null);
  const [isPreparingAgentHandoff, setIsPreparingAgentHandoff] = useState(false);
  const [agentHandoffFeedback, setAgentHandoffFeedback] = useState<string | null>(null);
  const voicePreferencesHydratedRef = useRef(false);

  const context = useQuery(api.ai.interviewRunner.getCurrentContext as any, { sessionId } as any) as any;
  const progress = useQuery(api.ai.interviewRunner.getInterviewProgress as any, { sessionId } as any) as any;
  const contentDNAObject = useQuery(
    api.ontologyHelpers.getObject as any,
    context?.contentDNAId
      ? { objectId: context.contentDNAId as Id<"objects"> }
      : "skip",
  ) as any;
  const resumeInterview = useMutation(api.ai.interviewRunner.resumeInterview as any);
  const decideMemoryConsent = useMutation(api.ai.interviewRunner.decideMemoryConsent as any);
  const pauseInterviewSession = useMutation(api.ai.interviewRunner.pauseInterviewSession as any);
  const discardInterviewSession = useMutation(api.ai.interviewRunner.discardInterviewSession as any);
  const submitAnswer = useAction(api.ai.interviewRunner.submitInterviewAnswer as any);
  const {
    voicePreferences,
    saveVoicePreferences,
    isLoading: voicePreferencesLoading,
    hasSession: hasVoicePreferenceSession,
  } = useVoicePreferences();
  const voiceRuntime = useVoiceRuntime({
    authSessionId,
    interviewSessionId: sessionId,
  });

  useEffect(() => {
    resumeInterview({ sessionId }).catch(() => {});
  }, [sessionId, resumeInterview]);

  useEffect(() => {
    if (voicePreferencesLoading || voicePreferencesHydratedRef.current) {
      return;
    }
    setVoiceProviderId(voicePreferences.providerId);
    setVoiceId(voicePreferences.voiceId);
    setVoicePreviewText(voicePreferences.previewText);
    voicePreferencesHydratedRef.current = true;
  }, [voicePreferences, voicePreferencesLoading]);

  const handleSubmitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await submitAnswer({ sessionId, answer });

      if (!result.success) {
        setError(result.error || "Failed to process answer");
        return;
      }

      // If interview completed, trigger callback
      if (result.advanceResult?.isComplete) {
        // Context will update via query, completion handled by useEffect
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, submitAnswer]);

  const handleMemoryConsentDecision = useCallback(
    async (decision: "accept" | "decline") => {
      setIsDecidingConsent(true);
      setError(null);
      try {
        await decideMemoryConsent({ sessionId, decision });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save memory consent decision.");
      } finally {
        setIsDecidingConsent(false);
      }
    },
    [decideMemoryConsent, sessionId],
  );

  const handlePauseAndExit = useCallback(async () => {
    setIsPausing(true);
    setError(null);
    try {
      await pauseInterviewSession({ sessionId });
      onExit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause interview session.");
    } finally {
      setIsPausing(false);
    }
  }, [onExit, pauseInterviewSession, sessionId]);

  const handleDiscardInterview = useCallback(async () => {
    setIsDiscarding(true);
    setError(null);
    try {
      await discardInterviewSession({ sessionId });
      setShowDiscardConfirm(false);
      onExit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard interview session.");
    } finally {
      setIsDiscarding(false);
    }
  }, [discardInterviewSession, onExit, sessionId]);

  const ensureVoicePreviewSession = useCallback(async () => {
    if (previewVoiceSessionId) {
      return previewVoiceSessionId;
    }

    const openedSession = await voiceRuntime.openSession({
      requestedProviderId: voiceProviderId,
      requestedVoiceId: voiceId.trim() || undefined,
    });

    if (openedSession.fallbackProviderId) {
      setVoiceFeedback(
        `Provider fallback active (${openedSession.requestedProviderId} -> ${openedSession.providerId}).`,
      );
    }

    setPreviewVoiceSessionId(openedSession.voiceSessionId);
    return openedSession.voiceSessionId;
  }, [previewVoiceSessionId, voiceRuntime, voiceProviderId, voiceId]);

  const handleSaveVoicePreferences = useCallback(async () => {
    if (!hasVoicePreferenceSession) {
      setVoiceFeedback("Sign in is required to save voice preferences.");
      return;
    }

    setIsSavingVoicePreferences(true);
    setVoiceFeedback(null);
    try {
      await saveVoicePreferences({
        providerId: voiceProviderId,
        voiceId,
        previewText: voicePreviewText,
      });
      setVoiceFeedback(
        "Voice preferences saved. Resolution order: user preference -> org default -> browser fallback.",
      );
    } catch (err) {
      setVoiceFeedback(
        err instanceof Error
          ? err.message
          : "Failed to save voice preferences.",
      );
    } finally {
      setIsSavingVoicePreferences(false);
    }
  }, [
    hasVoicePreferenceSession,
    saveVoicePreferences,
    voiceProviderId,
    voiceId,
    voicePreviewText,
  ]);

  const handlePreviewVoice = useCallback(async () => {
    if (!authSessionId) {
      setVoiceFeedback("Authentication session missing. Reload and try again.");
      return;
    }

    setIsPreviewingVoice(true);
    setVoiceFeedback(null);
    try {
      const previewSessionId = await ensureVoicePreviewSession();
      const previewResult = await voiceRuntime.synthesizePreview({
        voiceSessionId: previewSessionId,
        text: voicePreviewText.trim() || DEFAULT_VOICE_PREVIEW_TEXT,
        requestedProviderId: voiceProviderId,
        requestedVoiceId: voiceId.trim() || undefined,
        speakBrowserFallback: true,
      });

      if (!previewResult.success) {
        setVoiceFeedback(
          previewResult.error || "Voice preview failed to synthesize.",
        );
        return;
      }

      if (previewResult.playbackDataUrl && typeof window !== "undefined") {
        const player = new Audio(previewResult.playbackDataUrl);
        await player.play().catch(() => {});
      }

      if (
        previewResult.fallbackProviderId ||
        previewResult.providerId === "browser"
      ) {
        setVoiceFeedback(
          "Preview completed using browser fallback due to provider health or config.",
        );
      } else {
        setVoiceFeedback("Preview completed with ElevenLabs.");
      }
    } catch (err) {
      setVoiceFeedback(
        err instanceof Error ? err.message : "Voice preview failed.",
      );
    } finally {
      setIsPreviewingVoice(false);
    }
  }, [
    authSessionId,
    ensureVoicePreviewSession,
    voiceId,
    voicePreviewText,
    voiceProviderId,
    voiceRuntime,
  ]);

  const handleAgentForThis = useCallback(() => {
    if (!context?.contentDNAId) {
      setError("Content DNA must be saved before creating an agent handoff.");
      return;
    }

    const contentDNAProps = (contentDNAObject?.customProperties || {}) as {
      extractedData?: Record<string, unknown>;
      trustArtifacts?: unknown;
      voiceConsentSummary?: VoiceConsentSummary | null;
      memoryConsent?: {
        status: "pending" | "accepted" | "declined";
        consentScope: string;
        consentPromptVersion: string;
      };
    };

    setIsPreparingAgentHandoff(true);
    setError(null);
    setAgentHandoffFeedback(null);

    try {
      const handoffPayload = buildVoiceAgentCoCreationHandoffPayload({
        contentDNAId: String(context.contentDNAId),
        extractedData:
          contentDNAProps.extractedData
          || (context.extractedData as Record<string, unknown>)
          || {},
        trustArtifacts: (contentDNAProps.trustArtifacts as any) || null,
        voiceConsentSummary:
          contentDNAProps.voiceConsentSummary
          || context.voiceConsentSummary
          || null,
        memoryConsent:
          contentDNAProps.memoryConsent
          || context.memoryConsent
          || null,
      });

      stageVoiceAgentCoCreationHandoff(handoffPayload);

      const aiAssistantWindowContract = getVoiceAssistantWindowContract("ai-assistant");
      openWindow(
        aiAssistantWindowContract.windowId,
        aiAssistantWindowContract.title,
        <AIChatWindow />,
        aiAssistantWindowContract.position,
        aiAssistantWindowContract.size,
        aiAssistantWindowContract.titleKey,
        aiAssistantWindowContract.iconId,
        {
          openContext: "voice_agent_handoff",
          sourceSessionId: String(sessionId),
          sourceContentDNAId: String(context.contentDNAId),
          handoffVersion: handoffPayload.version,
        },
      );

      setAgentHandoffFeedback(
        "Agent handoff draft staged in AI Assistant. Review and send when ready.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stage agent handoff.");
    } finally {
      setIsPreparingAgentHandoff(false);
    }
  }, [contentDNAObject, context, openWindow, sessionId]);

  useEffect(() => {
    return () => {
      if (!previewVoiceSessionId) {
        return;
      }
      void voiceRuntime
        .closeSession({
          voiceSessionId: previewVoiceSessionId,
          activeProviderId: voiceProviderId,
          reason: "voice_preferences_preview_dispose",
        })
        .catch(() => {});
    };
  }, [previewVoiceSessionId, voiceProviderId, voiceRuntime]);

  if (!context || !progress) {
    return (
      <InteriorRoot className={`flex items-center justify-center gap-2 p-8 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
        <InteriorHelperText>{tx("ui.brain.learn.runner.loading", "Loading interview...")}</InteriorHelperText>
      </InteriorRoot>
    );
  }

  const consentAccepted = context.memoryConsent?.status === "accepted" && Boolean(context.contentDNAId);

  if (context.isComplete && !consentAccepted) {
    return (
      <InterviewMemoryConsent
        memoryConsent={context.memoryConsent}
        phaseSummaries={context.phaseSummaries || []}
        memoryCandidateIds={context.memoryCandidateIds || []}
        consentCheckpoints={context.consentCheckpoints || []}
        voiceConsentSummary={context.voiceConsentSummary || null}
        sessionLifecycle={context.sessionLifecycle || null}
        onDecision={handleMemoryConsentDecision}
        isDeciding={isDecidingConsent}
        onPause={handlePauseAndExit}
        isPausing={isPausing}
        onRequestDiscard={() => setShowDiscardConfirm(true)}
        onConfirmDiscard={handleDiscardInterview}
        onCancelDiscard={() => setShowDiscardConfirm(false)}
        showDiscardConfirm={showDiscardConfirm}
        isDiscarding={isDiscarding}
        error={error}
        className={className}
        tx={tx}
      />
    );
  }

  if (context.isComplete) {
    return (
      <InterviewComplete
        extractedData={context.extractedData}
        contentDNAId={context.contentDNAId as string | undefined}
        onRevokeMemory={() => handleMemoryConsentDecision("decline")}
        isRevoking={isDecidingConsent}
        onViewResults={onComplete}
        onAgentForThis={handleAgentForThis}
        isPreparingAgentHandoff={isPreparingAgentHandoff}
        agentHandoffFeedback={agentHandoffFeedback}
        onExit={onExit}
        className={className}
        tx={tx}
      />
    );
  }

  if (!context.question) {
    return (
      <InteriorRoot className={`p-6 text-center ${className}`}>
        <AlertCircle className="mx-auto mb-2 h-8 w-8" style={{ color: "var(--warning)" }} />
        <InteriorTitle className="text-sm">
          {tx("ui.brain.learn.runner.no_question", "No questions available")}
        </InteriorTitle>
        <div className="mt-4">
          <InteriorButton onClick={onExit} variant="subtle">
            {tx("ui.brain.learn.runner.actions.exit", "Exit Interview")}
          </InteriorButton>
        </div>
      </InteriorRoot>
    );
  }

  return (
    <InteriorRoot className={`flex h-full flex-col ${className}`}>
      {showProgress && (
        <div
          className="border-b p-4"
          style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
        >
          <InterviewProgress sessionId={sessionId} variant="compact" />
        </div>
      )}

      {context.phase?.introPrompt && (
        <div
          className="border-b px-4 py-3"
          style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--window-document-text)" }}>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium">{context.phase.phaseName}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {context.adaptiveSession && (
            <InteriorPanel
              className="mb-4 space-y-2 p-4"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--desktop-shell-accent)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--desktop-menu-text-muted)" }}
              >
                {context.adaptiveSession.microSessionLabel}
              </p>
              <p className="text-sm" style={{ color: "var(--window-document-text)" }}>
                {context.adaptiveSession.progressivePrompt}
              </p>
              <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                Active checkpoint: {context.activeConsentCheckpointId || "cp0_capture_notice"}.
                Source attribution remains visible at each checkpoint before any save.
              </p>
              {context.voiceConsentSummary && (
                <div className="rounded border p-2 text-xs" style={{ borderColor: "var(--window-document-border)" }}>
                  <p style={{ color: "var(--window-document-text)" }}>
                    Voice consent policy: {context.voiceConsentSummary.sourceAttributionPolicy}
                  </p>
                  <p className="mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Source-attributed candidates: {context.voiceConsentSummary.sourceAttributionCount}.
                  </p>
                </div>
              )}
            </InteriorPanel>
          )}

          <InteriorPanel className="p-6">
            <div className="mb-6">
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--desktop-menu-text-muted)" }}
              >
                Adaptive prompt
              </p>
              <p className="text-lg leading-relaxed" style={{ color: "var(--window-document-text)" }}>
                {context.question.promptText}
              </p>
              {context.question.helpText && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: "var(--desktop-menu-text-muted)" }}
                  >
                    <HelpCircle className="h-3 w-3" />
                    {showHelp
                      ? tx("ui.brain.learn.runner.help.hide", "Hide hint")
                      : tx("ui.brain.learn.runner.help.show", "Need a hint?")}
                  </button>
                  {showHelp && (
                    <p
                      className="mt-2 rounded p-3 text-sm"
                      style={{ border: "1px solid var(--window-document-border)", color: "var(--desktop-menu-text-muted)" }}
                    >
                      {context.question.helpText}
                    </p>
                  )}
                </div>
              )}
            </div>

            <QuestionInput
              questionId={context.question.questionId}
              expectedDataType={context.question.expectedDataType}
              validationRules={context.question.validationRules}
              onSubmit={handleSubmitAnswer}
              isProcessing={isProcessing}
              onToggleVoiceControls={() => {
                setShowVoiceControls((current) => !current);
              }}
              isVoiceControlsOpen={showVoiceControls}
              tx={tx}
            />

            {showVoiceControls && (
              <InteriorPanel
                className="mt-4 space-y-3 p-4"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--desktop-shell-accent)",
                }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--window-document-text)" }}
                  >
                    Voice runtime preferences
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--desktop-menu-text-muted)" }}
                  >
                    Deterministic order: user preference, then org default voice,
                    then browser fallback when provider health degrades.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label
                      className="block text-xs mb-1"
                      style={{ color: "var(--desktop-menu-text-muted)" }}
                    >
                      Preferred provider
                    </label>
                    <select
                      value={voiceProviderId}
                      onChange={(event) =>
                        setVoiceProviderId(
                          event.target.value === "elevenlabs"
                            ? "elevenlabs"
                            : "browser",
                        )
                      }
                      className="desktop-interior-input w-full text-sm"
                    >
                      <option value="browser">Browser fallback</option>
                      <option value="elevenlabs">ElevenLabs</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-xs mb-1"
                      style={{ color: "var(--desktop-menu-text-muted)" }}
                    >
                      Preferred voice ID (optional)
                    </label>
                    <input
                      value={voiceId}
                      onChange={(event) => setVoiceId(event.target.value)}
                      placeholder="voice_xxxxx"
                      className="desktop-interior-input w-full text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-xs mb-1"
                    style={{ color: "var(--desktop-menu-text-muted)" }}
                  >
                    Preview text
                  </label>
                  <textarea
                    value={voicePreviewText}
                    onChange={(event) => setVoicePreviewText(event.target.value)}
                    rows={2}
                    className="desktop-interior-textarea w-full text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <InteriorButton
                    onClick={handleSaveVoicePreferences}
                    disabled={isSavingVoicePreferences}
                    size="sm"
                    variant="subtle"
                    className="gap-2"
                  >
                    {isSavingVoicePreferences ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Save voice preference
                  </InteriorButton>
                  <InteriorButton
                    onClick={handlePreviewVoice}
                    disabled={isPreviewingVoice}
                    size="sm"
                    variant="primary"
                    className="gap-2"
                  >
                    {isPreviewingVoice ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    Preview voice
                  </InteriorButton>
                </div>

                {voiceFeedback && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--desktop-menu-text-muted)" }}
                  >
                    {voiceFeedback}
                  </p>
                )}
              </InteriorPanel>
            )}

            {error && (
              <InteriorPanel className="mt-4 flex items-center gap-2 p-3 text-sm" style={{ borderColor: "var(--error)", background: "var(--error-bg)", color: "var(--error)" }}>
                <AlertCircle className="h-4 w-4" />
                {error}
              </InteriorPanel>
            )}
          </InteriorPanel>
        </div>
      </div>

      <div
        className="border-t p-4"
        style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {showDiscardConfirm && (
            <InteriorPanel
              className="flex flex-col gap-2 p-3 text-sm"
              style={{
                borderColor: "var(--warning)",
                background: "var(--warning-bg)",
                color: "var(--warning)",
              }}
            >
              <p className="font-medium">
                Discard this interview?
              </p>
              <p>
                This closes the session without saving Content DNA memory. Existing unsaved data remains non-durable.
              </p>
              <div className="flex items-center gap-2">
                <InteriorButton
                  onClick={() => setShowDiscardConfirm(false)}
                  variant="subtle"
                  size="sm"
                >
                  Keep Session
                </InteriorButton>
                <InteriorButton
                  onClick={handleDiscardInterview}
                  disabled={isDiscarding}
                  variant="danger"
                  size="sm"
                  className="gap-2"
                >
                  {isDiscarding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Discard Unsaved Session
                </InteriorButton>
              </div>
            </InteriorPanel>
          )}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <InteriorButton onClick={handlePauseAndExit} variant="ghost" size="sm" disabled={isPausing}>
              {isPausing
                ? tx("ui.brain.learn.runner.actions.pausing", "Pausing...")
                : tx("ui.brain.learn.runner.actions.pause_resume", "Pause & Resume")}
            </InteriorButton>
            <InteriorButton
              onClick={() => setShowDiscardConfirm(true)}
              variant="danger"
              size="sm"
              disabled={isDiscarding}
            >
              {tx("ui.brain.learn.runner.actions.discard", "Discard")}
            </InteriorButton>
          </div>
          <InteriorHelperText>
            {tx("ui.brain.learn.runner.no_write_notice", "No durable memory writes occur until explicit save consent.")}
          </InteriorHelperText>
          </div>
        </div>
      </div>
    </InteriorRoot>
  );
}

interface QuestionInputProps {
  questionId: string;
  expectedDataType: "text" | "list" | "choice" | "rating" | "freeform";
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    options?: string[];
    minValue?: number;
    maxValue?: number;
    required?: boolean;
  };
  onSubmit: (answer: string) => void;
  isProcessing: boolean;
  onToggleVoiceControls?: () => void;
  isVoiceControlsOpen?: boolean;
  tx: (key: string, fallback: string, params?: Record<string, string | number>) => string;
}

function QuestionInput({
  questionId,
  expectedDataType,
  validationRules,
  onSubmit,
  isProcessing,
  onToggleVoiceControls,
  isVoiceControlsOpen = false,
  tx,
}: QuestionInputProps) {
  const [answer, setAnswer] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setAnswer("");
    setValidationError(null);
    textareaRef.current?.focus();
  }, [questionId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [answer]);

  const validate = useCallback((value: string): string | null => {
    if (!validationRules) return null;
    if (validationRules.required && !value.trim()) {
      return tx("ui.brain.learn.runner.validation.required", "This question requires an answer");
    }
    if (validationRules.minLength && value.length < validationRules.minLength)
      return tx(
        "ui.brain.learn.runner.validation.min_length",
        `Please provide at least ${validationRules.minLength} characters`,
        { count: validationRules.minLength },
      );
    if (validationRules.maxLength && value.length > validationRules.maxLength)
      return tx(
        "ui.brain.learn.runner.validation.max_length",
        `Please keep under ${validationRules.maxLength} characters`,
        { count: validationRules.maxLength },
      );
    return null;
  }, [tx, validationRules]);

  const handleSubmit = useCallback(() => {
    const err = validate(answer);
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    onSubmit(answer);
  }, [answer, validate, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  // Choice input
  if (expectedDataType === "choice" && validationRules?.options) {
    return (
      <div className="space-y-2">
        {validationRules.options.map((option) => (
          <InteriorButton
            key={option}
            onClick={() => onSubmit(option)}
            disabled={isProcessing}
            variant={answer === option ? "primary" : "subtle"}
            className="w-full justify-start"
          >
            {option}
          </InteriorButton>
        ))}
      </div>
    );
  }

  // Rating input
  if (expectedDataType === "rating") {
    const min = validationRules?.minValue ?? 1;
    const max = validationRules?.maxValue ?? 5;
    const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div className="flex items-center gap-2 justify-center py-4">
        {range.map((value) => (
          <InteriorButton
            key={value}
            onClick={() => onSubmit(String(value))}
            disabled={isProcessing}
            variant={answer === String(value) ? "primary" : "subtle"}
            size="sm"
            className="h-10 w-10 rounded-full px-0"
          >
            {value}
          </InteriorButton>
        ))}
      </div>
    );
  }

  // Text/freeform input
  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            expectedDataType === "list"
              ? tx("ui.brain.learn.runner.input.list_placeholder", "Enter items separated by commas...")
              : tx("ui.brain.learn.runner.input.placeholder", "Type your answer...")
          }
          disabled={isProcessing}
          className="desktop-interior-textarea min-h-[80px] max-h-[200px] resize-none pr-24 disabled:opacity-50"
          rows={2}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <InteriorButton
            onClick={onToggleVoiceControls}
            disabled={isProcessing}
            variant={isVoiceControlsOpen ? "primary" : "subtle"}
            size="sm"
            className="h-8 w-8 px-0"
            title={tx("ui.brain.learn.runner.actions.voice_input", "Voice controls")}
          >
            <Mic className="h-4 w-4" />
          </InteriorButton>
          <InteriorButton
            onClick={handleSubmit}
            disabled={isProcessing || !answer.trim()}
            variant="primary"
            size="sm"
            className="h-8 w-8 px-0"
            title={tx("ui.brain.learn.runner.actions.submit", "Submit (Enter)")}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </InteriorButton>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div>{validationError && <span style={{ color: "var(--error)" }}>{validationError}</span>}</div>
        <div style={{ color: "var(--desktop-menu-text-muted)" }}>
          {validationRules?.maxLength && <span>{answer.length}/{validationRules.maxLength}</span>}
        </div>
      </div>
    </div>
  );
}

interface InterviewCompleteProps {
  extractedData: Record<string, unknown>;
  contentDNAId?: string;
  onRevokeMemory?: () => void;
  isRevoking?: boolean;
  onViewResults?: (contentDNAId: string) => void;
  onAgentForThis?: () => void;
  isPreparingAgentHandoff?: boolean;
  agentHandoffFeedback?: string | null;
  onExit?: () => void;
  className?: string;
  tx: (key: string, fallback: string, params?: Record<string, string | number>) => string;
}

interface InterviewMemoryConsentProps {
  memoryConsent: {
    status: "pending" | "accepted" | "declined";
    consentScope: string;
    consentPromptVersion: string;
    memoryCandidateIds: string[];
  } | null;
  phaseSummaries: Array<{
    phaseId: string;
    phaseName: string;
    items: Array<{
      fieldId: string;
      label: string;
      valuePreview: string;
      questionId: string;
      questionPrompt: string;
    }>;
  }>;
  memoryCandidateIds: string[];
  consentCheckpoints: Array<{
    checkpointId: string;
    title: string;
    description: string;
    status: "complete" | "active" | "pending";
    sourceAttributionVisible: boolean;
    sourceAttributionPolicy: string;
    sourceAttributionSummary: string;
    sourceAttributionCount: number;
    sourceAttributionPreview: SourceAttributionPreviewEntry[];
    memoryCandidateCount: number;
  }>;
  voiceConsentSummary: VoiceConsentSummary | null;
  sessionLifecycle: {
    state: string;
    checkpointId: string;
    updatedAt: number;
    updatedBy: "system" | "user";
  } | null;
  onDecision: (decision: "accept" | "decline") => void;
  isDeciding: boolean;
  onPause: () => void;
  isPausing: boolean;
  onRequestDiscard: () => void;
  onConfirmDiscard: () => void;
  onCancelDiscard: () => void;
  showDiscardConfirm: boolean;
  isDiscarding: boolean;
  error: string | null;
  className?: string;
  tx: (key: string, fallback: string, params?: Record<string, string | number>) => string;
}

function InterviewMemoryConsent({
  memoryConsent,
  phaseSummaries,
  memoryCandidateIds,
  consentCheckpoints,
  voiceConsentSummary,
  sessionLifecycle,
  onDecision,
  isDeciding,
  onPause,
  isPausing,
  onRequestDiscard,
  onConfirmDiscard,
  onCancelDiscard,
  showDiscardConfirm,
  isDiscarding,
  error,
  className = "",
  tx,
}: InterviewMemoryConsentProps) {
  const status = memoryConsent?.status || "pending";

  return (
    <InteriorRoot className={`flex h-full flex-col ${className}`}>
      <InteriorHeader className="px-6 py-4">
        <InteriorTitle className="text-base">
          {tx("ui.brain.learn.consent.title", "Review Before Saving Memory")}
        </InteriorTitle>
        <InteriorSubtitle className="mt-1">
          We extracted {memoryCandidateIds.length} memory candidate
          {memoryCandidateIds.length === 1 ? "" : "s"} from your interview.
          Decide explicitly whether to persist this Content DNA profile.
        </InteriorSubtitle>
      </InteriorHeader>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {voiceConsentSummary && (
            <VoiceConsentSummaryPanel voiceConsentSummary={voiceConsentSummary} />
          )}

          <InteriorPanel className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Consent checkpoints
            </p>
            <div className="mt-3 space-y-2">
              {consentCheckpoints.map((checkpoint) => (
                <div
                  key={checkpoint.checkpointId}
                  className="rounded border px-3 py-2 text-sm"
                  style={{
                    borderColor:
                      checkpoint.status === "active"
                        ? "var(--tone-accent-strong)"
                        : "var(--window-document-border)",
                    background:
                      checkpoint.status === "active"
                        ? "var(--desktop-shell-accent)"
                        : "transparent",
                  }}
                >
                  <p className="font-medium" style={{ color: "var(--window-document-text)" }}>
                    {checkpoint.title}
                  </p>
                  <p className="mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {checkpoint.description}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Status: {checkpoint.status}. Source attribution visible: {checkpoint.sourceAttributionVisible ? "yes" : "pending"}.
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {checkpoint.sourceAttributionSummary}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Attribution policy: {checkpoint.sourceAttributionPolicy}
                  </p>
                  {checkpoint.sourceAttributionPreview.length > 0 ? (
                    <div className="mt-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--window-document-border)" }}>
                      {checkpoint.sourceAttributionPreview.slice(0, 2).map((entry) => (
                        <p key={`${checkpoint.checkpointId}:${entry.phaseId}:${entry.questionId}:${entry.fieldId}`} style={{ color: "var(--desktop-menu-text-muted)" }}>
                          {entry.phaseName} • {entry.questionId} • {entry.fieldId}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      No attributed candidates yet. Mapping appears as soon as voice or text signal is captured.
                    </p>
                  )}
                </div>
              ))}
            </div>
            {sessionLifecycle && (
              <p className="mt-3 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                Session state: {sessionLifecycle.state} ({sessionLifecycle.checkpointId}).
              </p>
            )}
          </InteriorPanel>

          {phaseSummaries.length === 0 ? (
            <InteriorPanel className="p-4 text-sm">
              {tx("ui.brain.learn.consent.empty", "No extracted data is available to save yet.")}
            </InteriorPanel>
          ) : (
            phaseSummaries.map((phase) => (
              <InteriorPanel key={phase.phaseId} className="p-0">
                <div className="border-b px-4 py-3" style={{ borderColor: "var(--window-document-border)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--window-document-text)" }}>{phase.phaseName}</p>
                </div>
                <div className="p-4 space-y-3">
                  {phase.items.map((item) => (
                    <div key={`${phase.phaseId}-${item.fieldId}`} className="text-sm">
                      <p style={{ color: "var(--window-document-text)" }}>{item.label}</p>
                      <p className="mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>{item.valuePreview}</p>
                      <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Source: {phase.phaseName} • {item.questionId}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Prompt attribution: {item.questionPrompt}
                      </p>
                    </div>
                  ))}
                </div>
              </InteriorPanel>
            ))
          )}

          {status === "declined" && (
            <InteriorPanel className="p-3 text-sm" style={{ borderColor: "var(--warning)", background: "var(--warning-bg)", color: "var(--warning)" }}>
              {tx("ui.brain.learn.consent.unsaved", "Memory is currently unsaved. You can still choose to save it now.")}
            </InteriorPanel>
          )}

          {error && (
            <InteriorPanel className="flex items-center gap-2 p-3 text-sm" style={{ borderColor: "var(--error)", background: "var(--error-bg)", color: "var(--error)" }}>
              <AlertCircle className="h-4 w-4" />
              {error}
            </InteriorPanel>
          )}
        </div>
      </div>

      <div
        className="border-t p-4"
        style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
      >
        <div className="max-w-3xl mx-auto space-y-3">
          {showDiscardConfirm && (
            <InteriorPanel
              className="flex flex-col gap-2 p-3 text-sm"
              style={{
                borderColor: "var(--warning)",
                background: "var(--warning-bg)",
                color: "var(--warning)",
              }}
            >
              <p className="font-medium">Discard this unsaved interview?</p>
              <p>
                This closes the session without writing durable memory. You can keep the session instead.
              </p>
              <div className="flex items-center gap-2">
                <InteriorButton onClick={onCancelDiscard} variant="subtle" size="sm">
                  Keep Session
                </InteriorButton>
                <InteriorButton
                  onClick={onConfirmDiscard}
                  disabled={isDiscarding}
                  variant="danger"
                  size="sm"
                  className="gap-2"
                >
                  {isDiscarding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Discard Session
                </InteriorButton>
              </div>
            </InteriorPanel>
          )}

          <div className="flex items-center justify-between">
            <InteriorButton onClick={onPause} variant="ghost" disabled={isPausing}>
              {isPausing
                ? tx("ui.brain.learn.consent.actions.pausing", "Pausing...")
                : tx("ui.brain.learn.consent.actions.pause_resume", "Pause & Resume")}
            </InteriorButton>
            <div className="flex items-center gap-2">
              <InteriorButton
                onClick={onRequestDiscard}
                disabled={isDiscarding}
                variant="danger"
              >
                {tx("ui.brain.learn.consent.actions.discard", "Discard")}
              </InteriorButton>
            <InteriorButton
              onClick={() => onDecision("decline")}
              disabled={isDeciding}
              variant="subtle"
            >
              {tx("ui.brain.learn.consent.actions.keep_unsaved", "Keep Unsaved")}
            </InteriorButton>
            <InteriorButton
              onClick={() => onDecision("accept")}
              disabled={isDeciding}
              variant="primary"
              className="gap-2"
            >
              {isDeciding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tx("ui.brain.learn.consent.actions.save", "Save to Content DNA")}
            </InteriorButton>
            </div>
          </div>
        </div>
      </div>
    </InteriorRoot>
  );
}

function VoiceConsentSummaryPanel({
  voiceConsentSummary,
}: {
  voiceConsentSummary: VoiceConsentSummary;
}) {
  return (
    <InteriorPanel className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--desktop-menu-text-muted)" }}>
        Voice-aware consent summary
      </p>
      <p className="mt-2 text-sm" style={{ color: "var(--window-document-text)" }}>
        Channel: {voiceConsentSummary.channel} • Active checkpoint: {voiceConsentSummary.activeCheckpointId}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
        {voiceConsentSummary.providerFallbackPolicy}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
        {voiceConsentSummary.sourceAttributionPolicy}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
        Source-attributed candidates: {voiceConsentSummary.sourceAttributionCount}.
      </p>
      {voiceConsentSummary.sourceAttributionPreview.length > 0 && (
        <div className="mt-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--window-document-border)" }}>
          {voiceConsentSummary.sourceAttributionPreview.map((entry) => (
            <p key={`${entry.phaseId}:${entry.questionId}:${entry.fieldId}`} style={{ color: "var(--desktop-menu-text-muted)" }}>
              {entry.phaseName} • {entry.questionId} • {entry.fieldId}
            </p>
          ))}
        </div>
      )}
    </InteriorPanel>
  );
}

function InterviewComplete({
  extractedData,
  contentDNAId,
  onRevokeMemory,
  isRevoking = false,
  onViewResults,
  onAgentForThis,
  isPreparingAgentHandoff = false,
  agentHandoffFeedback = null,
  onExit,
  className = "",
  tx,
}: InterviewCompleteProps) {
  const dataCount = Object.keys(extractedData).length;

  return (
    <InteriorRoot className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="text-center max-w-md">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border"
          style={{ borderColor: "var(--success)", background: "var(--success-bg)" }}
        >
          <CheckCircle className="h-8 w-8" style={{ color: "var(--success)" }} />
        </div>
        <h2 className="mb-2 text-2xl font-semibold" style={{ color: "var(--window-document-text)" }}>
          {tx("ui.brain.learn.complete.title", "Interview Complete!")}
        </h2>
        <p className="mb-6" style={{ color: "var(--desktop-menu-text-muted)" }}>
          We've captured {dataCount} data points about your content style and preferences.
        </p>
        <div className="flex flex-col gap-3">
          {contentDNAId && onViewResults && (
            <InteriorButton
              onClick={() => onViewResults(contentDNAId)}
              variant="primary"
              className="justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {tx("ui.brain.learn.complete.actions.view", "View Content DNA")}
            </InteriorButton>
          )}
          {contentDNAId && onAgentForThis && (
            <InteriorButton
              onClick={onAgentForThis}
              disabled={isPreparingAgentHandoff}
              variant="subtle"
              className="justify-center gap-2"
            >
              {isPreparingAgentHandoff ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {tx("ui.brain.learn.complete.actions.agent_for_this", "Agent for this")}
            </InteriorButton>
          )}
          {agentHandoffFeedback && (
            <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
              {agentHandoffFeedback}
            </p>
          )}
          <InteriorButton onClick={onExit} variant="subtle">
            {tx("ui.brain.learn.complete.actions.return", "Return to Dashboard")}
          </InteriorButton>
          {onRevokeMemory && (
            <InteriorButton
              onClick={onRevokeMemory}
              disabled={isRevoking}
              variant="danger"
              className="justify-center gap-2"
            >
              {isRevoking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tx("ui.brain.learn.complete.actions.revoke", "Revoke Saved Memory")}
            </InteriorButton>
          )}
        </div>
      </div>
    </InteriorRoot>
  );
}

export default InterviewRunner;
