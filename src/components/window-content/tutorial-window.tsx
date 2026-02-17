"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { ChevronLeft, ChevronRight, Check, SkipForward, BookOpen } from "lucide-react";
import confetti from "canvas-confetti";

interface TutorialStep {
  title: string;
  description: string;
  action: string | null;
}

interface TutorialWindowProps {
  tutorialId: string;
  onClose: () => void;
  onAction?: (action: string) => void;
}

/**
 * Interactive Tutorial Window
 *
 * Displays step-by-step guided tutorials with progress tracking.
 * Users can pause/resume tutorials anytime from Settings.
 */
export function TutorialWindow({ tutorialId, onClose, onAction }: TutorialWindowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { sessionId } = useAuth();

  // Load tutorial progress (skip if no session)
  const progress = useQuery(
    api.tutorialOntology.getTutorialProgress,
    sessionId ? { tutorialId, sessionId } : "skip"
  );
  const startTutorial = useMutation(api.tutorialOntology.startTutorial);
  const updateProgress = useMutation(api.tutorialOntology.updateTutorialProgress);
  const skipTutorial = useMutation(api.tutorialOntology.skipTutorial);
  const completeTutorial = useMutation(api.tutorialOntology.completeTutorial);

  // Tutorial definitions (should match backend)
  const tutorials: Record<string, { name: string; steps: TutorialStep[] }> = {
    welcome: {
      name: "Welcome to l4yercak3",
      steps: [
        {
          title: "Welcome",
          description: "Let's get you set up with l4yercak3 in just a few minutes. This tutorial will show you the key features and help you create your first contact, project, and invoice.",
          action: null,
        },
        {
          title: "Your API Key",
          description: "Your API key connects your templates to the l4yercak3 backend. You can find it anytime in Settings > API Keys. When you download a template, you'll add this key to your .env.local file.",
          action: "view_api_keys",
        },
        {
          title: "Download a Template",
          description: "Templates are pre-built websites that connect to your backend instantly. Start with the Freelancer Portal template - it includes a client dashboard, invoicing, and project management. Deploy it to Vercel for free!",
          action: "view_templates",
        },
        {
          title: "Add Your First Contact",
          description: "The CRM helps you manage clients and prospects. Add contact information, track interactions, and organize your relationships. Let's add your first contact now.",
          action: "open_crm",
        },
        {
          title: "Create a Project",
          description: "Projects help you organize work for your clients. Track deliverables, deadlines, and budgets all in one place. Create your first project to get started.",
          action: "open_projects",
        },
        {
          title: "Send an Invoice",
          description: "The invoicing system lets you bill clients directly from the platform. Create professional invoices with line items, taxes, and payment tracking. Try creating your first invoice!",
          action: "open_invoicing",
        },
        {
          title: "You're All Set",
          description: "Great job! You now know the basics of l4yercak3. Explore the platform and remember - you can always access tutorials from Settings > Tutorials. Happy building!",
          action: null,
        },
      ],
    },
  };

  const tutorial = tutorials[tutorialId];

  // Initialize tutorial on mount
  useEffect(() => {
    if (!sessionId) return; // Need session to start tutorial

    // Only proceed if progress has loaded (not undefined)
    if (progress === undefined) {
      return; // Still loading
    }

    if (progress === null) {
      // No progress yet, start the tutorial
      startTutorial({ tutorialId, sessionId }).catch((err) => {
        console.error("Failed to start tutorial:", err);
        // If start fails, just don't show an error - user can retry from Settings
      });
    } else if (progress) {
      // Resume from saved progress
      setCurrentStepIndex(progress.currentStep);
    }
  }, [progress, tutorialId, sessionId, startTutorial]);

  // Update progress when step changes
  useEffect(() => {
    if (!sessionId) return;
    if (progress !== undefined && progress !== null) {
      updateProgress({ tutorialId, sessionId, currentStep: currentStepIndex }).catch((err) => {
        console.error("Failed to update tutorial progress:", err);
        // Silently fail - progress will sync on next interaction
      });
    }
  }, [currentStepIndex, tutorialId, sessionId, updateProgress, progress]);

  // Show loading state while progress is loading
  if (progress === undefined) {
    return (
      <div className="h-full flex items-center justify-center p-6" style={{ background: 'var(--win95-bg)' }}>
        <div className="text-center">
          <p className="text-sm" style={{ color: 'var(--win95-text)' }}>Loading tutorial...</p>
        </div>
      </div>
    );
  }

  if (!tutorial) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Tutorial not found</p>
        <RetroButton onClick={onClose} className="mt-4">Close</RetroButton>
      </div>
    );
  }

  const currentStep = tutorial.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tutorial.steps.length - 1;
  const progressPercentage = Math.round((currentStepIndex / tutorial.steps.length) * 100);

  const handleNext = () => {
    if (!sessionId) return;
    if (isLastStep) {
      // Trigger celebration confetti
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Launch confetti from different positions
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Complete the tutorial and close window after confetti
      completeTutorial({ tutorialId, sessionId });
      setTimeout(() => {
        onClose();
      }, 1500); // Close after 1.5 seconds to enjoy the confetti
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, tutorial.steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleAction = () => {
    console.log('[Tutorial] handleAction called', {
      action: currentStep.action,
      hasOnAction: !!onAction,
      onActionType: typeof onAction,
      onActionValue: onAction,
      currentStep
    });
    if (currentStep.action && onAction) {
      console.log('[Tutorial] Calling onAction with:', currentStep.action);
      try {
        const result = onAction(currentStep.action);
        console.log('[Tutorial] onAction returned:', result);
      } catch (err) {
        console.error('[Tutorial] Error calling onAction:', err);
      }
      // Auto-advance to next step after action
      setTimeout(() => handleNext(), 500);
    } else {
      console.log('[Tutorial] Action skipped - no action or no onAction callback');
    }
  };

  const handleSkip = async () => {
    if (!sessionId) return;
    await skipTutorial({ tutorialId, sessionId });
    onClose();
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'var(--win95-bg)' }}
    >
      {/* Header */}
      <div
        className="p-4 border-b-2 flex items-center justify-between"
        style={{ borderColor: 'var(--win95-border)' }}
      >
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6" style={{ color: "var(--win95-highlight)" }} />
          <div>
            <h2 className="font-pixel text-sm" style={{ color: 'var(--win95-text)' }}>
              {tutorial.name}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Step {currentStepIndex + 1} of {tutorial.steps.length}
            </p>
          </div>
        </div>
        <RetroButton
          variant="outline"
          size="sm"
          onClick={handleSkip}
          className="text-xs flex items-center gap-1"
          title="Skip tutorial - you can restart it anytime from Settings"
        >
          <span>Skip</span>
          <SkipForward className="h-3 w-3" />
        </RetroButton>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-3">
        <div
          className="h-2 border-2 overflow-hidden"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPercentage}%`,
              background: 'var(--win95-highlight)',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--win95-text)' }}>
            {currentStep.title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--win95-text)' }}>
            {currentStep.description}
          </p>

          {/* Action Button */}
          {currentStep.action && (
            <div className="pt-4">
              <RetroButton
                onClick={handleAction}
                className="w-full"
                size="lg"
              >
                {getActionButtonText(currentStep.action)}
              </RetroButton>
            </div>
          )}

          {/* Visual indicators */}
          <div className="pt-6 flex justify-center gap-2">
            {tutorial.steps.map((_, index) => (
              <div
                key={index}
                className="h-2 w-2 rounded-full border-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: index <= currentStepIndex ? 'var(--primary-purple)' : 'transparent',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div
        className="p-4 border-t-2 flex items-center justify-between"
        style={{ borderColor: 'var(--win95-border)' }}
      >
        <RetroButton
          onClick={handlePrevious}
          disabled={isFirstStep}
          variant="outline"
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </RetroButton>

        <RetroButton
          onClick={handleNext}
          className="flex items-center gap-1"
        >
          {isLastStep ? (
            <>
              <span>Finish</span>
              <Check className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </RetroButton>
      </div>

      {/* Info Footer */}
      <div
        className="px-4 py-2 text-xs text-center border-t"
        style={{
          color: 'var(--neutral-gray)',
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        Tip: You can restart this tutorial anytime from Settings -&gt; Tutorials
      </div>
    </div>
  );
}

/**
 * Get Action Button Text
 */
function getActionButtonText(action: string): string {
  const actionTexts: Record<string, string> = {
    view_api_keys: "View My API Keys",
    view_templates: "Browse Templates",
    open_crm: "Open CRM",
    open_projects: "Open Projects",
    open_invoicing: "Open Invoicing",
  };

  return actionTexts[action] || "Continue";
}
