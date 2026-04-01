import { describe, expect, it } from "vitest";

import {
  DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
  RUNTIME_MODULE_INTENT_ROUTER_CONTRACT_VERSION,
  buildRuntimeModuleIntentRoutingContext,
  type RuntimeModuleIntentRoutingDecision,
} from "../../../convex/ai/agents/der_terminmacher/runtimeModule";
import {
  buildRuntimeModuleIntentRoutingContext as buildRuntimeModuleIntentRoutingContextFromAgentExecution,
} from "../../../convex/ai/kernel/agentExecution";

function buildDecision(
  overrides: Partial<RuntimeModuleIntentRoutingDecision>,
): RuntimeModuleIntentRoutingDecision {
  return {
    contractVersion: RUNTIME_MODULE_INTENT_ROUTER_CONTRACT_VERSION,
    decision: "selected",
    selectedModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    confidence: 0.8123,
    thresholds: {
      highConfidence: 0.72,
      ambiguous: 0.48,
    },
    reasonCodes: ["booking_intent_signal"],
    candidates: [
      {
        moduleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
        confidence: 0.8123,
        reasonCodes: ["booking_intent_signal", "voice_runtime_present"],
      },
    ],
    ...overrides,
  };
}

describe("runtime module intent routing context formatter", () => {
  it("returns null for default route with no selected module", () => {
    const context = buildRuntimeModuleIntentRoutingContext(
      buildDecision({
        decision: "default",
        selectedModuleKey: null,
        confidence: 0.19,
        reasonCodes: ["no_strong_runtime_module_signal"],
        candidates: [],
      }),
    );

    expect(context).toBeNull();
  });

  it("formats selected routing decision with deterministic numeric precision", () => {
    const context = buildRuntimeModuleIntentRoutingContext(
      buildDecision({
        confidence: 0.98765,
        thresholds: {
          highConfidence: 0.718,
          ambiguous: 0.483,
        },
      }),
    );

    expect(context).toContain("--- RUNTIME MODULE INTENT ROUTING ---");
    expect(context).toContain("Decision: selected");
    expect(context).toContain("Confidence: 0.988");
    expect(context).toContain("Selected module: der_terminmacher_runtime_module_v1");
    expect(context).toContain("Thresholds: high=0.72, ambiguous=0.48");
    expect(context).toContain("Reason codes: booking_intent_signal");
    expect(context).toContain(
      "Candidate der_terminmacher_runtime_module_v1: confidence=0.812 reasons=booking_intent_signal, voice_runtime_present",
    );
    expect(context).toContain("--- END RUNTIME MODULE INTENT ROUTING ---");
  });

  it("includes clarification question when provided", () => {
    const question =
      "Quick clarification before I proceed: do you want me to switch into appointment concierge mode and prepare a preview booking plan?";
    const context = buildRuntimeModuleIntentRoutingContext(
      buildDecision({
        decision: "clarification_required",
        selectedModuleKey: null,
        confidence: 0.5,
        clarificationQuestion: question,
      }),
    );

    expect(context).toContain(`Clarification question: ${question}`);
  });

  it("preserves backward-compatible formatter export through agentExecution", () => {
    const decision = buildDecision({
      confidence: 0.741,
      reasonCodes: ["booking_intent_signal", "contact_payload_signal"],
    });

    expect(
      buildRuntimeModuleIntentRoutingContextFromAgentExecution(decision),
    ).toBe(buildRuntimeModuleIntentRoutingContext(decision));
  });
});
