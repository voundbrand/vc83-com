"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useCurrentOrganization } from "@/hooks/use-auth";
import {
  Bug,
  Lightbulb,
  MessageSquare,
  CreditCard,
  Star,
  Send,
  CheckCircle2,
} from "lucide-react";

const CATEGORIES = [
  { id: "bug" as const, label: "Bug Report", icon: Bug, color: "#dc2626" },
  { id: "feature" as const, label: "Feature Request", icon: Lightbulb, color: "#f59e0b" },
  { id: "feedback" as const, label: "General Feedback", icon: MessageSquare, color: "#6B46C1" },
  { id: "billing" as const, label: "Billing Question", icon: CreditCard, color: "#059669" },
];

export function FeedbackWindow() {
  const currentOrganization = useCurrentOrganization();
  const submitFeedback = useAction(api.feedback.submitFeedback);

  const [category, setCategory] = useState<"bug" | "feature" | "feedback" | "billing">("feedback");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentOrganization?.id || !message.trim() || rating === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        organizationId: currentOrganization.id as Id<"organizations">,
        category,
        rating,
        message: message.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
      console.error("Feedback submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
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
          Thank You!
        </h2>
        <p className="text-sm text-center mb-4" style={{ color: "var(--win95-text)" }}>
          Your feedback has been submitted successfully.
        </p>
        <p className="text-xs text-center" style={{ color: "var(--neutral-gray)" }}>
          Our team will review it shortly. If you submitted a bug report or billing question,
          we'll get back to you via email.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setCategory("feedback");
            setRating(0);
            setMessage("");
          }}
          className="mt-6 px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            background: "var(--win95-bg-light)",
            border: "2px solid var(--win95-border)",
            color: "var(--win95-text)",
          }}
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{
          background: "linear-gradient(90deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h2 className="font-pixel text-sm text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Send Feedback
        </h2>
        <p className="text-xs mt-0.5 text-white/80">
          Help us improve the platform
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Category */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="flex items-center gap-2 p-2.5 rounded text-xs font-medium transition-all"
                  style={{
                    background: isSelected ? cat.color + "15" : "var(--win95-bg-light)",
                    border: `2px solid ${isSelected ? cat.color : "var(--win95-border)"}`,
                    color: isSelected ? cat.color : "var(--win95-text)",
                  }}
                >
                  <Icon size={16} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={28}
                  fill={star <= (hoveredRating || rating) ? "#f59e0b" : "none"}
                  stroke={star <= (hoveredRating || rating) ? "#f59e0b" : "var(--win95-border)"}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          {rating === 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Click a star to rate your experience
            </p>
          )}
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Your Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              category === "bug"
                ? "Describe the bug: what happened, what you expected, and steps to reproduce..."
                : category === "feature"
                  ? "Describe the feature you'd like to see..."
                  : category === "billing"
                    ? "Describe your billing question or concern..."
                    : "Share your thoughts..."
            }
            rows={5}
            className="w-full p-3 rounded text-sm resize-none"
            style={{
              background: "var(--win95-bg-light)",
              border: "2px solid var(--win95-border)",
              color: "var(--win95-text)",
              outline: "none",
            }}
          />
          <p className="text-xs mt-1 text-right" style={{ color: "var(--neutral-gray)" }}>
            {message.length} characters
          </p>
        </div>

        {/* Error */}
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

      {/* Submit */}
      <div className="p-4 border-t" style={{ borderColor: "var(--win95-border)" }}>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !message.trim() || rating === 0}
          className="w-full py-2.5 rounded text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
          style={{
            background: "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
            color: "var(--win95-on-highlight)",
            border: "none",
            opacity: isSubmitting || !message.trim() || rating === 0 ? 0.5 : 1,
            cursor: isSubmitting || !message.trim() || rating === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Send size={16} />
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
}
