import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt } from "../../../convex/ai/kernel/agentExecution";

describe("team access mode prompting integration", () => {
  it("renders invisible mode guidance in handoff context", () => {
    const prompt = buildAgentSystemPrompt(
      {
        displayName: "Primary Agent",
        autonomyLevel: "autonomous",
      },
      [],
      undefined,
      undefined,
      undefined,
      {
        teamAccessMode: "invisible",
        lastHandoff: {
          fromAgent: "Primary Agent",
          reason: "Need specialist advice",
          summary: "Review the pricing objection and suggest framing.",
        },
      }
    );

    expect(prompt).toContain("Access mode: invisible");
    expect(prompt).toContain("treat specialist output as internal advice");
  });

  it("renders meeting mode guidance in handoff context", () => {
    const prompt = buildAgentSystemPrompt(
      {
        displayName: "Primary Agent",
        autonomyLevel: "autonomous",
      },
      [],
      undefined,
      undefined,
      undefined,
      {
        teamAccessMode: "meeting",
        lastHandoff: {
          fromAgent: "Primary Agent",
          reason: "Coordinate specialist review",
          summary: "Need sales + operations synthesis for proposal scope",
        },
      }
    );

    expect(prompt).toContain("Access mode: meeting");
    expect(prompt).toContain("Keep the primary agent visible");
  });

  it("layers soul mode + archetype overlays while enforcing sensitive guardrails", () => {
    const prompt = buildAgentSystemPrompt(
      {
        displayName: "Primary Agent",
        autonomyLevel: "autonomous",
        activeSoulMode: "private",
        activeArchetype: "life_coach",
      },
      [],
    );

    expect(prompt).toContain("--- CORE IDENTITY INVARIANTS ---");
    expect(prompt).toContain("Active mode: private (Private Mode)");
    expect(prompt).toContain("--- ARCHETYPE OVERLAY ---");
    expect(prompt).toContain("Archetype: The Life Coach");
    expect(prompt).toContain("--- SENSITIVE ARCHETYPE GUARDRAILS ---");
    expect(prompt).toContain("read-only execution = true");
    expect(prompt).toContain("Runtime is enforcing read-only execution");
  });
});
