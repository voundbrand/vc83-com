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

interface InterviewRunnerProps {
  authSessionId?: string;
  sessionId: Id<"agentSessions">;
  onComplete?: (contentDNAId: string) => void;
  onExit?: () => void;
  showProgress?: boolean;
  className?: string;
}

export function InterviewRunner({
  authSessionId,
  sessionId,
  onComplete,
  onExit,
  showProgress = true,
  className = "",
}: InterviewRunnerProps) {
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
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const context = useQuery(api.ai.interviewRunner.getCurrentContext as any, { sessionId } as any) as any;
  const progress = useQuery(api.ai.interviewRunner.getInterviewProgress as any, { sessionId } as any) as any;
  const resumeInterview = useMutation(api.ai.interviewRunner.resumeInterview as any);
  const decideMemoryConsent = useMutation(api.ai.interviewRunner.decideMemoryConsent as any);
  const cancelInterviewSession = useMutation(api.ai.interviewRunner.cancelInterviewSession as any);
  const submitAnswer = useAction(api.ai.interviewRunner.submitInterviewAnswer as any);

  useEffect(() => {
    resumeInterview({ sessionId }).catch(() => {});
  }, [sessionId, resumeInterview]);

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

  const handleCancelAndDelete = useCallback(async () => {
    if (!authSessionId) {
      setError("Authentication session missing. Please reload and try again.");
      return;
    }

    setIsCancelling(true);
    setError(null);
    try {
      await cancelInterviewSession({
        sessionId: authSessionId,
        interviewSessionId: sessionId,
      });
      onExit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel and delete interview session.");
    } finally {
      setIsCancelling(false);
    }
  }, [authSessionId, cancelInterviewSession, onExit, sessionId]);

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
        onDecision={handleMemoryConsentDecision}
        isDeciding={isDecidingConsent}
        error={error}
        onExit={onExit}
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
          <InteriorPanel className="p-6">
            <div className="mb-6">
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
              tx={tx}
            />

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
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <InteriorButton onClick={onExit} variant="ghost" size="sm" disabled={isCancelling}>
              {tx("ui.brain.learn.runner.actions.save_exit", "Save & Exit")}
            </InteriorButton>
            {authSessionId && (
              <InteriorButton
                onClick={handleCancelAndDelete}
                variant="danger"
                size="sm"
                disabled={isCancelling}
              >
                {isCancelling
                  ? tx("ui.brain.learn.runner.actions.cancelling", "Cancelling...")
                  : tx("ui.brain.learn.runner.actions.cancel_delete", "Cancel & Delete")}
              </InteriorButton>
            )}
          </div>
          <InteriorHelperText>{tx("ui.brain.learn.runner.progress_saved", "Progress saved automatically")}</InteriorHelperText>
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
  tx: (key: string, fallback: string, params?: Record<string, string | number>) => string;
}

function QuestionInput({
  questionId,
  expectedDataType,
  validationRules,
  onSubmit,
  isProcessing,
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
            disabled={isProcessing}
            variant="subtle"
            size="sm"
            className="h-8 w-8 px-0"
            title={tx("ui.brain.learn.runner.actions.voice_input", "Voice input (Phase 2)")}
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
  onDecision: (decision: "accept" | "decline") => void;
  isDeciding: boolean;
  error: string | null;
  onExit?: () => void;
  className?: string;
  tx: (key: string, fallback: string, params?: Record<string, string | number>) => string;
}

function InterviewMemoryConsent({
  memoryConsent,
  phaseSummaries,
  memoryCandidateIds,
  onDecision,
  isDeciding,
  error,
  onExit,
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
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <InteriorButton onClick={onExit} variant="ghost">
            {tx("ui.brain.learn.consent.actions.exit_without_saving", "Exit Without Saving")}
          </InteriorButton>
          <div className="flex items-center gap-2">
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
    </InteriorRoot>
  );
}

function InterviewComplete({
  extractedData,
  contentDNAId,
  onRevokeMemory,
  isRevoking = false,
  onViewResults,
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
