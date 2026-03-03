import { describe, expect, it } from "vitest";
import {
  buildFirstWordsHandshake,
  buildMidwifeFiveBlockShape,
} from "../../../convex/ai/interviewRunner";

describe("birthing identity contracts", () => {
  it("produces a deterministic midwife five-block shape from captured interview candidates", () => {
    const shape = buildMidwifeFiveBlockShape([
      {
        fieldId: "identityNorthStar",
        label: "Identity north star",
        value: "Protect customer trust",
        valuePreview: "Protect customer trust",
        phaseId: "identity_anchors",
        phaseName: "Identity Anchors",
        questionId: "q1_identity_north_star",
        questionPrompt: "What is this agent's identity north star?",
      },
      {
        fieldId: "voiceSignature",
        label: "Voice signature",
        value: "Calm and direct",
        valuePreview: "Calm and direct",
        phaseId: "identity_anchors",
        phaseName: "Identity Anchors",
        questionId: "q1_voice_signature",
        questionPrompt: "How should the agent sound when things get tense?",
      },
      {
        fieldId: "nonNegotiableGuardrails",
        label: "Non-negotiable guardrails",
        value: ["No legal advice"],
        valuePreview: "No legal advice",
        phaseId: "guardrail_contract",
        phaseName: "Guardrail Contract",
        questionId: "q2_non_negotiable_guardrails",
        questionPrompt: "List the non-negotiable guardrails.",
      },
      {
        fieldId: "admiredThinkers",
        label: "Admired thinkers",
        value: ["Peter Drucker"],
        valuePreview: "Peter Drucker",
        phaseId: "knowledge_layer",
        phaseName: "Knowledge and Inspiration",
        questionId: "q4_admired_thinkers",
        questionPrompt: "Who do you admire and learn from?",
      },
      {
        fieldId: "customerPromise",
        label: "Customer promise",
        value: "Respond with accountability",
        valuePreview: "Respond with accountability",
        phaseId: "identity_anchors",
        phaseName: "Identity Anchors",
        questionId: "q1_customer_promise",
        questionPrompt: "What promise should the agent reinforce?",
      },
    ] as any);

    expect(shape.contractVersion).toBe("midwife_5_block_shape.v1");
    expect(shape.blockCount).toBe(5);
    expect(shape.blocks).toHaveLength(5);
    expect(shape.completedBlockCount).toBeGreaterThanOrEqual(4);
    expect(shape.blocks.find((block) => block.blockId === "boundaries_guardrails")?.isComplete).toBe(true);
  });

  it("builds first-words handshake preview with dream team mention and confirmation prompt", () => {
    const handshake = buildFirstWordsHandshake({
      sessionId: "session_123" as any,
      generatedAt: 1_740_000_000_000,
      extractedData: {
        businessName: "Atlas Fitness",
        industry: "Fitness coaching",
        targetAudience: "Busy founders",
        primaryUseCase: "Customer Support",
        identityNorthStar: "Protect customer trust above all else.",
        voiceSignature: "Confident and warm.",
        nonNegotiableGuardrails: ["Never fabricate outcomes"],
        handoffSignals: ["Policy ambiguity", "High-risk requests"],
      },
    });

    expect(handshake.contractVersion).toBe("first_words_handshake.v1");
    expect(handshake.includesDreamTeamMention).toBe(true);
    expect(handshake.preview).toContain("Based on your onboarding compilation");
    expect(handshake.preview).toContain("Business Context:");
    expect(handshake.preview).toContain("Workspace: Atlas Fitness");
    expect(handshake.preview).toContain("Private Context (teaser)");
    expect(handshake.preview).toContain("Dream Team");
    expect(handshake.confirmationPrompt).toContain("Does this feel right");
    expect(handshake.status).toBe("ready_for_confirmation");
  });
});
