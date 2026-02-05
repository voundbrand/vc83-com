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
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { InterviewProgress } from "./interview-progress";
import {
  Send,
  Mic,
  Loader2,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface InterviewRunnerProps {
  sessionId: Id<"agentSessions">;
  onComplete?: (contentDNAId: string) => void;
  onExit?: () => void;
  showProgress?: boolean;
  className?: string;
}

export function InterviewRunner({
  sessionId,
  onComplete,
  onExit,
  showProgress = true,
  className = "",
}: InterviewRunnerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // @ts-expect-error - Convex TS2589 deep type instantiation
  const context = useQuery(api.ai.interviewRunner.getCurrentContext, { sessionId });
  const progress = useQuery(api.ai.interviewRunner.getInterviewProgress, { sessionId });
  const resumeInterview = useMutation(api.ai.interviewRunner.resumeInterview);
  const submitAnswer = useAction(api.ai.interviewRunner.submitInterviewAnswer);

  useEffect(() => {
    resumeInterview({ sessionId }).catch(() => {});
  }, [sessionId, resumeInterview]);

  useEffect(() => {
    if (context?.isComplete && context.extractedData) {
      const dnaId = (context.extractedData as Record<string, unknown>).contentDNAId as string;
      if (dnaId && onComplete) onComplete(dnaId);
    }
  }, [context?.isComplete, context?.extractedData, onComplete]);

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

  if (!context || !progress) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-zinc-400">Loading interview...</span>
      </div>
    );
  }

  if (context.isComplete) {
    return (
      <InterviewComplete
        extractedData={context.extractedData}
        onViewResults={onComplete}
        onExit={onExit}
        className={className}
      />
    );
  }

  if (!context.question) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-zinc-300">No questions available</p>
        <button onClick={onExit} className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">
          Exit Interview
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {showProgress && (
        <div className="p-4 border-b border-zinc-700 bg-zinc-800/50">
          <InterviewProgress sessionId={sessionId} variant="compact" />
        </div>
      )}

      {context.phase?.introPrompt && (
        <div className="px-4 py-3 bg-purple-900/20 border-b border-purple-800/30">
          <div className="flex items-center gap-2 text-sm text-purple-300">
            <ChevronRight className="w-4 h-4" />
            <span className="font-medium">{context.phase.phaseName}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6">
            <div className="mb-6">
              <p className="text-lg text-zinc-100 leading-relaxed">{context.question.promptText}</p>
              {context.question.helpText && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-400"
                  >
                    <HelpCircle className="w-3 h-3" />
                    {showHelp ? "Hide hint" : "Need a hint?"}
                  </button>
                  {showHelp && (
                    <p className="mt-2 text-sm text-zinc-400 bg-zinc-900/50 rounded p-3">
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
            />

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800/30 rounded text-sm text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={onExit} className="text-sm text-zinc-500 hover:text-zinc-400">
            Save & Exit
          </button>
          <span className="text-xs text-zinc-600">Progress saved automatically</span>
        </div>
      </div>
    </div>
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
}

function QuestionInput({
  questionId,
  expectedDataType,
  validationRules,
  onSubmit,
  isProcessing,
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
    if (validationRules.required && !value.trim()) return "This question requires an answer";
    if (validationRules.minLength && value.length < validationRules.minLength)
      return `Please provide at least ${validationRules.minLength} characters`;
    if (validationRules.maxLength && value.length > validationRules.maxLength)
      return `Please keep under ${validationRules.maxLength} characters`;
    return null;
  }, [validationRules]);

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
          <button
            key={option}
            onClick={() => onSubmit(option)}
            disabled={isProcessing}
            className={`w-full p-3 text-left rounded-lg border transition-colors ${
              answer === option
                ? "border-purple-500 bg-purple-900/30 text-purple-200"
                : "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600"
            } disabled:opacity-50`}
          >
            {option}
          </button>
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
          <button
            key={value}
            onClick={() => onSubmit(String(value))}
            disabled={isProcessing}
            className={`w-10 h-10 rounded-full border-2 transition-colors ${
              answer === String(value)
                ? "border-purple-500 bg-purple-600 text-white"
                : "border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
            } disabled:opacity-50`}
          >
            {value}
          </button>
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
          placeholder={expectedDataType === "list" ? "Enter items separated by commas..." : "Type your answer..."}
          disabled={isProcessing}
          className="w-full px-4 py-3 pr-24 bg-zinc-900 border border-zinc-700 rounded-lg resize-none min-h-[80px] max-h-[200px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          rows={2}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <button
            disabled={isProcessing}
            className="p-2 bg-zinc-700 text-zinc-400 hover:bg-zinc-600 rounded-lg disabled:opacity-50"
            title="Voice input (Phase 2)"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !answer.trim()}
            className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
            title="Submit (Enter)"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div>{validationError && <span className="text-red-400">{validationError}</span>}</div>
        <div className="text-zinc-600">
          {validationRules?.maxLength && <span>{answer.length}/{validationRules.maxLength}</span>}
        </div>
      </div>
    </div>
  );
}

interface InterviewCompleteProps {
  extractedData: Record<string, unknown>;
  onViewResults?: (contentDNAId: string) => void;
  onExit?: () => void;
  className?: string;
}

function InterviewComplete({ extractedData, onViewResults, onExit, className = "" }: InterviewCompleteProps) {
  const dataCount = Object.keys(extractedData).length;
  const contentDNAId = extractedData.contentDNAId as string | undefined;

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">Interview Complete!</h2>
        <p className="text-zinc-400 mb-6">
          We've captured {dataCount} data points about your content style and preferences.
        </p>
        <div className="flex flex-col gap-3">
          {contentDNAId && onViewResults && (
            <button
              onClick={() => onViewResults(contentDNAId)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              View Content DNA
            </button>
          )}
          <button onClick={onExit} className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg">
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewRunner;
