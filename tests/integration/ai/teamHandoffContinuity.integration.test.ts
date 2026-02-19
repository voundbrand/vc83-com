import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt } from "../../../convex/ai/agentExecution";

describe("team handoff continuity integration", () => {
  it("injects standardized handoff payload fields into specialist prompt context", () => {
    const prompt = buildAgentSystemPrompt(
      {
        displayName: "Billing Specialist",
        autonomyLevel: "autonomous",
      },
      [],
      undefined,
      undefined,
      undefined,
      {
        sharedContext: "Customer is waiting on corrected invoice totals.",
        lastHandoff: {
          fromAgent: "Maya PM",
          reason: "Needs billing correction expertise",
          summary: "Invoice INV-129 has a duplicated tax line item.",
          goal: "Correct the invoice and explain the revised total.",
        },
      }
    );

    expect(prompt).toContain("--- TEAM HANDOFF ---");
    expect(prompt).toContain("You were tagged in by Maya PM.");
    expect(prompt).toContain("Reason: Needs billing correction expertise");
    expect(prompt).toContain("Summary: Invoice INV-129 has a duplicated tax line item.");
    expect(prompt).toContain("Goal: Correct the invoice and explain the revised total.");
    expect(prompt).toContain("Shared notes: Customer is waiting on corrected invoice totals.");
  });

  it("preserves continuity for legacy contextSummary-only handoffs", () => {
    const prompt = buildAgentSystemPrompt(
      {
        displayName: "CRM Specialist",
        autonomyLevel: "autonomous",
      },
      [],
      undefined,
      undefined,
      undefined,
      {
        lastHandoff: {
          fromAgent: "PM Agent",
          reason: "Need CRM merge support",
          contextSummary: "Legacy context says contact records need dedupe.",
        },
      }
    );

    expect(prompt).toContain("Reason: Need CRM merge support");
    expect(prompt).toContain(
      "Summary: Legacy context says contact records need dedupe."
    );
  });
});
