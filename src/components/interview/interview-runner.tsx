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
  MicOff,
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
import { WebPublishingWindow } from "@/components/window-content/web-publishing-window";
import { IntegrationsWindow } from "@/components/window-content/integrations-window";
import {
  buildVoiceAgentCoCreationHandoffPayload,
  stageVoiceAgentCoCreationHandoff,
} from "@/lib/voice-assistant/agent-co-creation-handoff";
import {
  resolveVoiceCaptureFallbackMimeType,
  resolveVoiceCapturePreferredMimeTypes,
} from "@/lib/voice-assistant/runtime-policy";

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

type VoiceCaptureState = "idle" | "listening" | "transcribing" | "error";

interface VoiceTranscriptEntry {
  id: string;
  text: string;
  source: "captured" | "system";
  createdAt: number;
}

type DeployChannelChoice = "webchat" | "telegram" | "both";

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
  const [draftAnswer, setDraftAnswer] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [isSavingVoicePreferences, setIsSavingVoicePreferences] =
    useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [previewVoiceSessionId, setPreviewVoiceSessionId] = useState<
    string | null
  >(null);
  const [captureVoiceSessionId, setCaptureVoiceSessionId] = useState<
    string | null
  >(null);
  const [voiceCaptureState, setVoiceCaptureState] =
    useState<VoiceCaptureState>("idle");
  const [voiceCaptureError, setVoiceCaptureError] = useState<string | null>(
    null,
  );
  const [voiceTranscriptEntries, setVoiceTranscriptEntries] = useState<
    VoiceTranscriptEntry[]
  >([]);
  const [isPreparingAgentHandoff, setIsPreparingAgentHandoff] = useState(false);
  const [agentHandoffFeedback, setAgentHandoffFeedback] = useState<string | null>(null);
  const voicePreferencesHydratedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureChunksRef = useRef<Blob[]>([]);

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

  const handleSubmitAnswer = useCallback(
    async (answer: string): Promise<boolean> => {
      const normalizedAnswer = answer.trim();
      if (!normalizedAnswer) return false;
      setIsProcessing(true);
      setError(null);
      try {
        const result = await submitAnswer({ sessionId, answer: normalizedAnswer });

        if (!result.success) {
          setError(result.error || "Failed to process answer");
          return false;
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit");
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [sessionId, submitAnswer],
  );

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

  const appendTranscriptEntry = useCallback(
    (entry: Omit<VoiceTranscriptEntry, "id" | "createdAt">) => {
      setVoiceTranscriptEntries((current) => {
        const next: VoiceTranscriptEntry[] = [
          ...current,
          {
            id: `voice:${Date.now()}:${Math.random().toString(16).slice(2)}`,
            createdAt: Date.now(),
            ...entry,
          },
        ];
        return next.slice(-8);
      });
    },
    [],
  );

  const releaseVoiceMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const closeCaptureSession = useCallback(
    (voiceSessionIdToClose: string, reason: string) => {
      void voiceRuntime
        .closeSession({
          voiceSessionId: voiceSessionIdToClose,
          activeProviderId: voiceProviderId,
          reason,
        })
        .catch(() => {});
      setCaptureVoiceSessionId((current) =>
        current === voiceSessionIdToClose ? null : current,
      );
    },
    [voiceProviderId, voiceRuntime],
  );

  const ensureCaptureVoiceSession = useCallback(async () => {
    if (captureVoiceSessionId) {
      return captureVoiceSessionId;
    }

    const openedSession = await voiceRuntime.openSession({
      requestedProviderId: voiceProviderId,
      requestedVoiceId: voiceId.trim() || undefined,
    });

    if (openedSession.fallbackProviderId) {
      setVoiceFeedback(
        `Voice capture fallback active (${openedSession.requestedProviderId} -> ${openedSession.providerId}).`,
      );
    }

    setCaptureVoiceSessionId(openedSession.voiceSessionId);
    return openedSession.voiceSessionId;
  }, [captureVoiceSessionId, voiceRuntime, voiceProviderId, voiceId]);

  const transcribeCapturedAudio = useCallback(
    async (voiceSessionIdToUse: string, audioBlob: Blob) => {
      setVoiceCaptureState("transcribing");
      try {
        const result = await voiceRuntime.transcribeAudioBlob({
          voiceSessionId: voiceSessionIdToUse,
          blob: audioBlob,
          requestedProviderId: voiceProviderId,
          requestedVoiceId: voiceId.trim() || undefined,
        });

        if (!result.success || !result.text?.trim()) {
          const transcriptError = result.error || "Voice transcription returned no text.";
          setVoiceCaptureError(transcriptError);
          setVoiceCaptureState("error");
          appendTranscriptEntry({
            source: "system",
            text: `Voice transcript unavailable: ${transcriptError}`,
          });
          return;
        }

        const transcript = result.text.trim();
        setDraftAnswer((current) =>
          current.trim().length > 0 ? `${current.trim()} ${transcript}` : transcript,
        );
        appendTranscriptEntry({ source: "captured", text: transcript });
        setVoiceCaptureError(null);
        setVoiceCaptureState("idle");
      } catch (err) {
        const transcriptError =
          err instanceof Error ? err.message : "Voice transcription failed.";
        setVoiceCaptureError(transcriptError);
        setVoiceCaptureState("error");
        appendTranscriptEntry({
          source: "system",
          text: `Voice transcript unavailable: ${transcriptError}`,
        });
      } finally {
        closeCaptureSession(voiceSessionIdToUse, "interview_voice_capture_complete");
      }
    },
    [
      appendTranscriptEntry,
      closeCaptureSession,
      voiceId,
      voiceProviderId,
      voiceRuntime,
    ],
  );

  const stopVoiceCapture = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      releaseVoiceMediaStream();
      if (voiceCaptureState !== "transcribing") {
        setVoiceCaptureState("idle");
      }
      return;
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [releaseVoiceMediaStream, voiceCaptureState]);

  const startVoiceCapture = useCallback(async () => {
    if (voiceCaptureState === "listening" || voiceCaptureState === "transcribing") {
      return;
    }

    if (!authSessionId) {
      const authError = "Authentication session missing. Reload and try again.";
      setVoiceCaptureError(authError);
      setVoiceCaptureState("error");
      appendTranscriptEntry({ source: "system", text: authError });
      return;
    }

    if (
      typeof window === "undefined"
      || typeof window.MediaRecorder === "undefined"
      || !navigator.mediaDevices?.getUserMedia
    ) {
      const unsupportedError =
        "Voice capture requires MediaRecorder support. Use typed fallback on this device.";
      setVoiceCaptureError(unsupportedError);
      setVoiceCaptureState("error");
      appendTranscriptEntry({ source: "system", text: unsupportedError });
      return;
    }

    setVoiceCaptureError(null);
    setVoiceCaptureState("idle");

    try {
      const voiceSessionIdForCapture = await ensureCaptureVoiceSession();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      captureChunksRef.current = [];

      const preferredMimeTypes = resolveVoiceCapturePreferredMimeTypes(
        voiceProviderId,
      );
      const supportedMimeType = preferredMimeTypes.find((mimeType) =>
        window.MediaRecorder.isTypeSupported(mimeType),
      );

      const recorder = supportedMimeType
        ? new window.MediaRecorder(stream, { mimeType: supportedMimeType })
        : new window.MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          captureChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setVoiceCaptureError("Voice capture failed. Use typed fallback.");
        setVoiceCaptureState("error");
      };
      recorder.onstop = () => {
        releaseVoiceMediaStream();
        mediaRecorderRef.current = null;
        const audioType =
          captureChunksRef.current[0]?.type
          || resolveVoiceCaptureFallbackMimeType(voiceProviderId);
        const audioBlob = new Blob(captureChunksRef.current, { type: audioType });
        captureChunksRef.current = [];

        if (!audioBlob.size) {
          setVoiceCaptureState("idle");
          return;
        }

        void transcribeCapturedAudio(voiceSessionIdForCapture, audioBlob);
      };

      recorder.start();
      setVoiceCaptureState("listening");
      appendTranscriptEntry({
        source: "system",
        text: "Listening now. Tap Stop Mic when you finish your answer.",
      });
    } catch (err) {
      releaseVoiceMediaStream();
      const startError =
        err instanceof Error ? err.message : "Unable to start voice capture.";
      setVoiceCaptureError(startError);
      setVoiceCaptureState("error");
      appendTranscriptEntry({ source: "system", text: startError });
      if (captureVoiceSessionId) {
        closeCaptureSession(captureVoiceSessionId, "interview_voice_capture_failed_to_start");
      }
    }
  }, [
    appendTranscriptEntry,
    authSessionId,
    captureVoiceSessionId,
    closeCaptureSession,
    ensureCaptureVoiceSession,
    releaseVoiceMediaStream,
    transcribeCapturedAudio,
    voiceCaptureState,
  ]);

  const toggleVoiceCapture = useCallback(() => {
    if (voiceCaptureState === "listening") {
      stopVoiceCapture();
      return;
    }
    if (voiceCaptureState === "transcribing") {
      return;
    }
    void startVoiceCapture();
  }, [startVoiceCapture, stopVoiceCapture, voiceCaptureState]);

  const handleQuestionSubmit = useCallback(
    async (answer: string) => {
      const submitted = await handleSubmitAnswer(answer);
      if (submitted) {
        setDraftAnswer("");
      }
    },
    [handleSubmitAnswer],
  );

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

  const openDeployWebchatHandoff = useCallback(() => {
    openWindow(
      "webchat-deployment",
      "Webchat Deployment",
      <WebPublishingWindow initialTab="webchat-deployment" />,
      { x: 125, y: 65 },
      { width: 1000, height: 680 },
      undefined,
      "webchat-deployment",
      {
        initialTab: "webchat-deployment",
        initialPanel: "webchat-deployment",
        openContext: "onboarding_completion_webchat",
      },
    );
  }, [openWindow]);

  const openDeployTelegramHandoff = useCallback(() => {
    openWindow(
      "integrations",
      "Integrations & API",
      <IntegrationsWindow initialPanel="telegram" />,
      { x: 150, y: 100 },
      { width: 900, height: 650 },
      "ui.windows.integrations.title",
      "integrations",
      {
        initialPanel: "telegram",
        openContext: "onboarding_completion_telegram",
      },
    );
  }, [openWindow]);

  const openDeployBothHandoff = useCallback(() => {
    openDeployWebchatHandoff();
    openDeployTelegramHandoff();
  }, [openDeployTelegramHandoff, openDeployWebchatHandoff]);

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

  useEffect(() => {
    if (!context?.question?.questionId) {
      return;
    }
    setDraftAnswer("");
    setVoiceCaptureError(null);
    setVoiceTranscriptEntries([]);
    setShowHelp(false);
    if (voiceCaptureState === "listening") {
      stopVoiceCapture();
    }
  }, [context?.question?.questionId, stopVoiceCapture, voiceCaptureState]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      releaseVoiceMediaStream();
      if (captureVoiceSessionId) {
        closeCaptureSession(captureVoiceSessionId, "interview_voice_capture_dispose");
      }
    };
  }, [
    captureVoiceSessionId,
    closeCaptureSession,
    releaseVoiceMediaStream,
  ]);

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
        onDeployWebchat={openDeployWebchatHandoff}
        onDeployTelegram={openDeployTelegramHandoff}
        onDeployBoth={openDeployBothHandoff}
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

  const isListening = voiceCaptureState === "listening";
  const isTranscribing = voiceCaptureState === "transcribing";
  const voiceCaptureStatusLabel = isListening
    ? "Listening"
    : isTranscribing
      ? "Transcribing"
      : voiceCaptureState === "error"
        ? "Needs Attention"
        : "Ready";
  const trainingCadenceLabel =
    context.trainingMode?.cadence === "ongoing"
      ? "Ongoing recursion"
      : "First-run calibration";
  const coachingTrackLabel =
    context.trainingMode?.coachingTrack === "team"
      ? "Team coaching"
      : "One-on-one coaching";

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

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl">
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
                Soul-binding mode: {trainingCadenceLabel} · {coachingTrackLabel}.
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

          <InteriorPanel className="p-4 md:p-6">
            <div className="mb-5">
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--desktop-menu-text-muted)" }}
              >
                Adaptive prompt
              </p>
              <p className="mt-1 text-lg leading-relaxed" style={{ color: "var(--window-document-text)" }}>
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

            <div className="grid gap-4 lg:min-h-[34rem] lg:grid-cols-[minmax(18rem,0.95fr)_minmax(0,1.35fr)]">
              <div
                className="flex min-h-[22rem] flex-col justify-between rounded border p-4"
                style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
              >
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--desktop-menu-text-muted)" }}
                  >
                    Voice orb
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    State: {voiceCaptureStatusLabel}. Voice and typed fallback stay in the same consent path.
                  </p>
                </div>

                <div className="my-4 flex flex-col items-center gap-3">
                  <div
                    className={`interview-voice-orb ${
                      isListening
                        ? "interview-voice-orb-listening"
                        : isTranscribing
                          ? "interview-voice-orb-transcribing"
                          : voiceCaptureState === "error"
                            ? "interview-voice-orb-error"
                            : ""
                    }`}
                  >
                    <span className="interview-voice-orb-core" />
                  </div>
                  <InteriorButton
                    onClick={toggleVoiceCapture}
                    disabled={isProcessing || isTranscribing}
                    variant={isListening ? "danger" : "primary"}
                    className="w-full max-w-56 gap-2 justify-center"
                  >
                    {isTranscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    {isListening ? "Stop Mic" : isTranscribing ? "Transcribing..." : "Start Mic"}
                  </InteriorButton>
                </div>

                <div className="space-y-2">
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
                    {voiceTranscriptEntries.length === 0 ? (
                      <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Transcript appears here after each recorded answer.
                      </p>
                    ) : (
                      voiceTranscriptEntries.map((entry) => (
                        <p
                          key={entry.id}
                          className="text-xs"
                          style={{
                            color:
                              entry.source === "captured"
                                ? "var(--window-document-text)"
                                : "var(--desktop-menu-text-muted)",
                          }}
                        >
                          {entry.text}
                        </p>
                      ))
                    )}
                  </div>
                  {voiceCaptureError && (
                    <p className="text-xs" style={{ color: "var(--error)" }}>
                      {voiceCaptureError}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <InteriorPanel
                  className="space-y-3 p-4"
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
                      Typed fallback
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--desktop-menu-text-muted)" }}
                    >
                      You can always type, even while voice runtime providers degrade.
                    </p>
                  </div>
                  <QuestionInput
                    questionId={context.question.questionId}
                    value={draftAnswer}
                    onValueChange={setDraftAnswer}
                    expectedDataType={context.question.expectedDataType}
                    validationRules={context.question.validationRules}
                    onSubmit={handleQuestionSubmit}
                    isProcessing={isProcessing}
                    onToggleVoiceControls={() => {
                      setShowVoiceControls((current) => !current);
                    }}
                    isVoiceControlsOpen={showVoiceControls}
                    tx={tx}
                  />
                </InteriorPanel>

                {showVoiceControls && (
                  <InteriorPanel
                    className="space-y-3 p-4"
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
              </div>
            </div>

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
        <div className="max-w-5xl mx-auto space-y-3">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
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
  value: string;
  onValueChange: (value: string) => void;
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
  value,
  onValueChange,
  expectedDataType,
  validationRules,
  onSubmit,
  isProcessing,
  onToggleVoiceControls,
  isVoiceControlsOpen = false,
  tx,
}: QuestionInputProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValidationError(null);
    textareaRef.current?.focus();
  }, [questionId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

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
    const err = validate(value);
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    onSubmit(value);
  }, [onSubmit, validate, value]);

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
            onClick={() => {
              onValueChange(option);
              onSubmit(option);
            }}
            disabled={isProcessing}
            variant={value === option ? "primary" : "subtle"}
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
        {range.map((ratingValue) => (
          <InteriorButton
            key={ratingValue}
            onClick={() => {
              const normalized = String(ratingValue);
              onValueChange(normalized);
              onSubmit(normalized);
            }}
            disabled={isProcessing}
            variant={value === String(ratingValue) ? "primary" : "subtle"}
            size="sm"
            className="h-10 w-10 rounded-full px-0"
          >
            {ratingValue}
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
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
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
            disabled={isProcessing || !value.trim()}
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
          {validationRules?.maxLength && <span>{value.length}/{validationRules.maxLength}</span>}
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
  onDeployWebchat?: () => void;
  onDeployTelegram?: () => void;
  onDeployBoth?: () => void;
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
  onDeployWebchat,
  onDeployTelegram,
  onDeployBoth,
  onExit,
  className = "",
  tx,
}: InterviewCompleteProps) {
  const dataCount = Object.keys(extractedData).length;
  const [selectedDeployChoice, setSelectedDeployChoice] =
    useState<DeployChannelChoice | null>(null);

  const deploySetupPackets: Record<
    Exclude<DeployChannelChoice, "both">,
    { title: string; steps: string[] }
  > = {
    webchat: {
      title: "Webchat setup packet",
      steps: [
        "Open Webchat Deployment with your current organization context.",
        "Select the trained agent and confirm webchat channel binding is enabled.",
        "Copy the bootstrap/config snippets and run one live visitor smoke test.",
      ],
    },
    telegram: {
      title: "Telegram setup packet",
      steps: [
        "Open Integrations > Telegram to continue onboarding.",
        "Choose platform bot onboarding or deploy your custom BYOA bot token.",
        "Validate one direct message and confirm delivery path in the Telegram panel.",
      ],
    },
  };

  const selectedPackets: Array<Exclude<DeployChannelChoice, "both">> =
    selectedDeployChoice === "both"
      ? ["webchat", "telegram"]
      : selectedDeployChoice
        ? [selectedDeployChoice]
        : [];

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
          First-run calibration is designed to complete in about 15 minutes, then deploy handoff starts immediately.
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
          {(onDeployWebchat || onDeployTelegram || onDeployBoth) && (
            <InteriorPanel className="space-y-2 p-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--desktop-menu-text-muted)" }}>
                Deploy handoff
              </p>
              <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                Choose where to deploy now. Setup packets stay inline so onboarding does not dead-end.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {onDeployWebchat && (
                  <InteriorButton
                    onClick={() => {
                      setSelectedDeployChoice("webchat");
                      onDeployWebchat();
                    }}
                    variant={selectedDeployChoice === "webchat" ? "primary" : "subtle"}
                    size="sm"
                  >
                    Deploy to Webchat
                  </InteriorButton>
                )}
                {onDeployTelegram && (
                  <InteriorButton
                    onClick={() => {
                      setSelectedDeployChoice("telegram");
                      onDeployTelegram();
                    }}
                    variant={selectedDeployChoice === "telegram" ? "primary" : "subtle"}
                    size="sm"
                  >
                    Deploy to Telegram
                  </InteriorButton>
                )}
                {onDeployBoth && (
                  <InteriorButton
                    onClick={() => {
                      setSelectedDeployChoice("both");
                      onDeployBoth();
                    }}
                    variant={selectedDeployChoice === "both" ? "primary" : "subtle"}
                    size="sm"
                  >
                    Deploy to Both
                  </InteriorButton>
                )}
              </div>
              {selectedPackets.length > 0 && (
                <div className="space-y-2">
                  {selectedPackets.map((packetKey) => (
                    <div
                      key={packetKey}
                      className="rounded border p-2"
                      style={{ borderColor: "var(--window-document-border)" }}
                    >
                      <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                        {deploySetupPackets[packetKey].title}
                      </p>
                      <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {deploySetupPackets[packetKey].steps.map((step) => (
                          <li key={`${packetKey}:${step}`}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </InteriorPanel>
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
