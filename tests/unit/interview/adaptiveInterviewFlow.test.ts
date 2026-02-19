import { describe, expect, it } from "vitest";
import {
  buildInterviewPromptContext,
  buildPhaseCoverageSummary,
  shouldAdvancePhaseEarly,
} from "../../../convex/ai/interviewRunner";
import { customerAgentIdentityBlueprintTemplate } from "../../../convex/seeds/interviewTemplates";
import type { InterviewState } from "../../../convex/schemas/interviewSchemas";

function createState(overrides: Partial<InterviewState>): InterviewState {
  return {
    currentPhaseIndex: 0,
    currentQuestionIndex: 0,
    completedPhases: [],
    skippedPhases: [],
    extractedData: {},
    currentFollowUpCount: 0,
    pendingFollowUp: false,
    startedAt: 1739854321000,
    lastActivityAt: 1739854321000,
    phaseStartTimes: {
      [customerAgentIdentityBlueprintTemplate.phases[0].phaseId]: 1739854321000,
    },
    isComplete: false,
    ...overrides,
  };
}

describe("adaptive interview helpers", () => {
  it("reports missing required fields for current phase coverage", () => {
    const phase = customerAgentIdentityBlueprintTemplate.phases[1];
    const coverage = buildPhaseCoverageSummary(
      customerAgentIdentityBlueprintTemplate,
      phase,
      {
        nonNegotiableGuardrails: ["No legal advice"],
      },
    );

    expect(coverage.capturedFieldCount).toBe(1);
    expect(coverage.missingRequiredFieldIds).toEqual(["approvalRequiredActions"]);
    expect(coverage.remainingQuestionCount).toBe(2);
  });

  it("allows adaptive early advance only after required trust fields are captured", () => {
    const phase = customerAgentIdentityBlueprintTemplate.phases[1];
    const state = createState({
      currentPhaseIndex: 1,
      currentQuestionIndex: 1,
      extractedData: {
        nonNegotiableGuardrails: ["No legal advice"],
        approvalRequiredActions: ["Pricing overrides"],
      },
      phaseStartTimes: {
        [customerAgentIdentityBlueprintTemplate.phases[0].phaseId]: 1739854321000,
        [phase.phaseId]: 1739854350000,
      },
    });

    const canAdvance = shouldAdvancePhaseEarly({
      template: customerAgentIdentityBlueprintTemplate,
      phase,
      state,
      extractionResults: [
        {
          confidence: 0.92,
          needsFollowUp: false,
        },
      ],
    });

    expect(canAdvance).toBe(true);
  });

  it("keeps progressive prompt hints in the LLM interview context", () => {
    const prompt = buildInterviewPromptContext({
      interviewerPersonality: "Trust-first and concise.",
      followUpDepth: 2,
      silenceHandling: "Offer one concrete example.",
      currentPhaseIndex: 1,
      totalPhases: 4,
      currentQuestionIndex: 0,
      totalQuestionsInPhase: 3,
      microSessionLabel: "Micro-session 2 of 6",
      progressivePrompt: "Capture required trust details next.",
      activeConsentCheckpointId: "cp1_summary_review",
      voiceCaptureMode: "voice_enabled",
      sourceAttributionPolicy:
        "At every checkpoint, source attribution shows phase, question ID, and original prompt before save options.",
      phase: {
        phaseId: "guardrail_contract",
        phaseName: "Guardrail Contract",
        completionPrompt: "Move to handoff boundaries.",
      },
      question: {
        questionId: "q2_non_negotiable_guardrails",
        promptText: "List the non-negotiable guardrails.",
        expectedDataType: "list",
        extractionField: "nonNegotiableGuardrails",
      },
      currentFollowUpCount: 0,
      pendingFollowUp: false,
      extractedData: {},
    });

    expect(prompt).toContain("Adaptive pacing: Micro-session 2 of 6");
    expect(prompt).toContain("Progressive focus: Capture required trust details next.");
    expect(prompt).toContain("Active consent checkpoint: cp1_summary_review");
    expect(prompt).toContain("Source attribution policy: At every checkpoint, source attribution shows phase, question ID, and original prompt before save options.");
  });
});
