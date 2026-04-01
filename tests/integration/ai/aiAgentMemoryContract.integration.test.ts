import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  assembleRuntimeSystemMessages,
  buildRuntimeMemoryLaneTelemetry,
  evaluateAiAgentMemoryRuntimeContract,
} from "../../../convex/ai/kernel/agentExecution";

const ORG_A = "org_a" as Id<"organizations">;

describe("aiAgentMemory contract integration", () => {
  it("keeps memory layering deterministic while aiAgentMemory remains deprecated", () => {
    const aiAgentMemoryContract = evaluateAiAgentMemoryRuntimeContract({
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_A,
      sessionChannel: "slack",
      requestedChannel: "slack",
      sessionExternalContactIdentifier: "slack:C123:user:U123",
      requestedExternalContactIdentifier: "slack:C123:user:U123",
      sessionRoutingKey: "route:slack:T123",
      requestedSessionRoutingKey: "route:slack:T123",
    });

    const messages = assembleRuntimeSystemMessages({
      systemPrompt: "BASE SYSTEM PROMPT",
      pinnedNotesContext: "--- OPERATOR PINNED NOTES (L3) ---\nKeep one visible operator.",
      rollingSummaryContext: "--- ROLLING SESSION MEMORY (L2) ---\nCarry concise context.",
      reactivationMemoryContext: "--- REACTIVATION MEMORY (L5) ---\nResume from last session.",
      contactMemoryContext: "--- STRUCTURED CONTACT MEMORY (L4) ---\nPreferred email: owner@example.com",
      composerRuntimeContext: "--- COMPOSER RUNTIME CONTROLS ---",
      planFeasibilityContext: "--- PLAN FEASIBILITY ---",
    });

    expect(aiAgentMemoryContract.allowed).toBe(false);
    expect(aiAgentMemoryContract.decision).toBe("deprecate");
    expect(aiAgentMemoryContract.reason).toBe("deprecated_contract");

    expect(messages).toHaveLength(7);
    expect(messages[1].content).toContain("--- OPERATOR PINNED NOTES (L3) ---");
    expect(messages[2].content).toContain("--- ROLLING SESSION MEMORY (L2) ---");
    expect(messages[3].content).toContain("--- REACTIVATION MEMORY (L5) ---");
    expect(messages[4].content).toContain("--- STRUCTURED CONTACT MEMORY (L4) ---");
    expect(messages.map((message) => message.content).join("\n")).not.toContain(
      "AI AGENT MEMORY"
    );

    const memoryTelemetry = buildRuntimeMemoryLaneTelemetry({
      aiAgentMemoryContract,
      rollingMemoryRefresh: { success: true },
      contactMemoryRefresh: { success: true, insertedCount: 1, supersededCount: 0 },
    });
    expect(memoryTelemetry.layerOrder).toEqual(["L3", "L2", "L5", "L4"]);
    expect(memoryTelemetry.aiAgentMemory.reason).toBe("deprecated_contract");
    expect(memoryTelemetry.contactMemoryRefresh.status).toBe("success");
  });
});
