"use client";

import { useMemo, useState } from "react";
import { useAction } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { serializeShellUrlState } from "@/lib/shell/url-state";
import {
  CheckCircle2,
  Frown,
  LifeBuoy,
  Meh,
  MessageSquare,
  Send,
  Smile,
} from "lucide-react";
// Dynamic require avoids deep type instantiation in generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../convex/_generated/api") as { api: any };

type FeedbackSentiment = "negative" | "neutral" | "positive";

type FeedbackRuntimeContext = {
  app?: string;
  panel?: string;
  context?: string;
  pagePath?: string;
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  locale?: string;
  userAgent?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  source?: string;
};

const SENTIMENT_OPTIONS: Array<{
  id: FeedbackSentiment;
  label: string;
  description: string;
  icon: typeof Smile;
  color: string;
}> = [
  {
    id: "negative",
    label: "Negative",
    description: "Something blocked or degraded your workflow.",
    icon: Frown,
    color: "var(--error)",
  },
  {
    id: "neutral",
    label: "Neutral",
    description: "The experience was okay but needs refinement.",
    icon: Meh,
    color: "var(--warning)",
  },
  {
    id: "positive",
    label: "Positive",
    description: "The experience met or exceeded expectations.",
    icon: Smile,
    color: "var(--success)",
  },
];

function captureRuntimeContext(): FeedbackRuntimeContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const params = new URLSearchParams(window.location.search);
  const runtimeContext: FeedbackRuntimeContext = {
    app:
      params.get("app") ||
      params.get("openWindow") ||
      params.get("window") ||
      undefined,
    panel: params.get("panel") || params.get("tab") || undefined,
    context: params.get("context") || undefined,
    pagePath: window.location.pathname,
    pageUrl: window.location.href,
    pageTitle: document.title || undefined,
    referrer: document.referrer || undefined,
    locale: navigator.language,
    userAgent: navigator.userAgent,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    source: "feedback_modal",
  };

  return runtimeContext;
}

export function FeedbackWindow() {
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const submitFeedback = useAction(apiAny.feedback.submitFeedback);
  const { tWithFallback } = useNamespaceTranslations("ui.feedback");

  const [sentiment, setSentiment] = useState<FeedbackSentiment>("neutral");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(sessionId && currentOrganization?.id && message.trim().length > 0);

  const messageHint = useMemo(() => {
    switch (sentiment) {
      case "negative":
        return tWithFallback(
          "ui.feedback.sentiment.negative.hint",
          "Tell us what failed, where it happened, and what you expected.",
        );
      case "neutral":
        return tWithFallback(
          "ui.feedback.sentiment.neutral.hint",
          "Share what worked and where the flow still feels unclear.",
        );
      case "positive":
      default:
        return tWithFallback(
          "ui.feedback.sentiment.positive.hint",
          "Tell us what worked so we can preserve it while we improve.",
        );
    }
  }, [sentiment, tWithFallback]);

  const openSupportIntake = () => {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = serializeShellUrlState(
      {
        app: "tickets",
        panel: "support-intake",
        context: "feedback_modal",
      },
      "/",
    );

    window.location.assign(nextUrl);
  };

  const handleSubmit = async () => {
    if (!sessionId || !currentOrganization?.id || !message.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        sessionId,
        organizationId: currentOrganization.id as Id<"organizations">,
        sentiment,
        message: message.trim(),
        runtimeContext: captureRuntimeContext(),
      });
      setSubmitted(true);
    } catch (submitError) {
      setError(
        tWithFallback(
          "ui.feedback.error.submit_failed",
          "Failed to submit feedback. Please try again.",
        ),
      );
      console.error("Feedback submission error:", submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8" style={{ background: "var(--win95-bg)" }}>
        <div
          className="rounded-full p-6 mb-6"
          style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
        >
          <CheckCircle2 size={48} style={{ color: "white" }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--success)" }}>
          {tWithFallback("ui.feedback.success.title", "Thanks for your feedback")}
        </h2>
        <p className="text-sm text-center mb-4" style={{ color: "var(--win95-text)" }}>
          {tWithFallback(
            "ui.feedback.success.description",
            "Your message was sent to our support team with runtime context so they can act quickly.",
          )}
        </p>
        <div className="mt-2 flex w-full flex-col gap-2 sm:max-w-sm">
          <button
            onClick={openSupportIntake}
            className="w-full px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
              color: "var(--win95-on-highlight)",
              border: "none",
            }}
          >
            <LifeBuoy size={16} />
            {tWithFallback("ui.feedback.button.open_support", "Open Support Intake")}
          </button>
          <button
            onClick={() => {
              setSubmitted(false);
              setSentiment("neutral");
              setMessage("");
            }}
            className="w-full rounded border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)",
              color: "var(--win95-text)",
            }}
          >
            {tWithFallback("ui.feedback.button.submit_another", "Submit Another")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--win95-bg)" }}>
      <div
        className="px-4 py-3 border-b"
        style={{
          background: "linear-gradient(90deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h2 className="font-pixel text-sm text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          {tWithFallback("ui.feedback.title", "Feedback")}
        </h2>
        <p className="text-xs mt-0.5 text-white/80">
          {tWithFallback("ui.feedback.subtitle", "Share sentiment and context so support can triage faster")}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <fieldset>
          <legend className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            {tWithFallback("ui.feedback.sentiment.label", "Sentiment")}
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SENTIMENT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = sentiment === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSentiment(option.id)}
                  className="rounded border p-3 text-left transition-colors"
                  aria-pressed={isSelected}
                  style={{
                    background: isSelected ? `${option.color}1A` : "var(--win95-bg-light)",
                    borderColor: isSelected ? option.color : "var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Icon size={16} style={{ color: isSelected ? option.color : "var(--neutral-gray)" }} />
                    {tWithFallback(`ui.feedback.sentiment.${option.id}.label`, option.label)}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tWithFallback(`ui.feedback.sentiment.${option.id}.description`, option.description)}
                  </p>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="block text-xs font-bold" style={{ color: "var(--win95-text)" }} htmlFor="feedback-message">
              {tWithFallback("ui.feedback.message.label", "Your message")}
            </label>
            <button
              type="button"
              onClick={openSupportIntake}
              className="text-xs underline inline-flex items-center gap-1"
              style={{ color: "var(--win95-highlight)" }}
            >
              <LifeBuoy size={12} />
              {tWithFallback("ui.feedback.link.open_support", "Need help now? Open support intake")}
            </button>
          </div>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={tWithFallback("ui.feedback.message.placeholder", "Describe what happened and what you expected.")}
            rows={6}
            className="w-full resize-none rounded border p-3 text-sm"
            style={{
              background: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)",
              color: "var(--win95-text)",
              outline: "none",
            }}
          />
          <div className="mt-1 flex items-center justify-between text-xs" style={{ color: "var(--neutral-gray)" }}>
            <span>{messageHint}</span>
            <span>{message.length}</span>
          </div>
        </div>

        {error && (
          <div
            className="p-3 rounded text-xs"
            style={{
              background: "var(--error-bg, #fee2e2)",
              color: "var(--error, #dc2626)",
              border: "1px solid var(--error)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div className="p-4 border-t" style={{ borderColor: "var(--win95-border)" }}>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !canSubmit}
          className="w-full py-2.5 rounded text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
          style={{
            background: "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
            color: "var(--win95-on-highlight)",
            border: "none",
            opacity: isSubmitting || !canSubmit ? 0.5 : 1,
            cursor: isSubmitting || !canSubmit ? "not-allowed" : "pointer",
          }}
        >
          <Send size={16} />
          {isSubmitting
            ? tWithFallback("ui.feedback.button.submitting", "Submitting...")
            : tWithFallback("ui.feedback.button.submit", "Submit Feedback")}
        </button>
      </div>
    </div>
  );
}
