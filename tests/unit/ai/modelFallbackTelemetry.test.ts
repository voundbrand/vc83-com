import { describe, expect, it } from "vitest";
import {
  aggregateAgentModelFallback,
} from "../../../convex/ai/agentSessions";
import {
  aggregateConversationModelFallback,
} from "../../../convex/ai/conversations";

describe("agent model fallback aggregation", () => {
  it("computes fallback rate and reason/source breakdowns", () => {
    const summary = aggregateAgentModelFallback(
      [
        {
          performedAt: 1,
          modelResolution: {
            selectedModel: "openai/gpt-4o-mini",
            selectionSource: "preferred",
            fallbackUsed: false,
          },
        },
        {
          performedAt: 2,
          modelResolution: {
            selectedModel: "openai/gpt-4o-mini",
            usedModel: "anthropic/claude-3-5-sonnet",
            selectionSource: "org_default",
            fallbackUsed: true,
            fallbackReason: "retry_chain",
          },
        },
        {
          performedAt: 3,
        },
      ],
      { windowHours: 24, since: 0 }
    );

    expect(summary.actionsScanned).toBe(3);
    expect(summary.actionsWithModelResolution).toBe(2);
    expect(summary.fallbackCount).toBe(1);
    expect(summary.fallbackRate).toBe(0.5);
    expect(summary.selectionSources).toEqual([
      { source: "preferred", count: 1 },
      { source: "org_default", count: 1 },
    ]);
    expect(summary.fallbackReasons).toEqual([{ reason: "retry_chain", count: 1 }]);
  });
});

describe("conversation model fallback aggregation", () => {
  it("ignores records without valid model resolution and computes fallback rate", () => {
    const summary = aggregateConversationModelFallback(
      [
        {
          timestamp: 1,
          modelResolution: {
            requestedModel: "openai/gpt-4o",
            selectedModel: "openai/gpt-4o",
            selectionSource: "preferred",
            fallbackUsed: false,
          },
        },
        {
          timestamp: 2,
          modelResolution: {
            requestedModel: "openai/gpt-4o",
            selectedModel: "openai/gpt-4o-mini",
            selectionSource: "org_default",
            fallbackUsed: true,
            fallbackReason: "org_default",
          },
        },
        {
          timestamp: 3,
          modelResolution: {
            selectedModel: "openai/gpt-4o-mini",
            selectionSource: "preferred",
          } as unknown as {
            requestedModel?: string;
            selectedModel: string;
            selectionSource: string;
            fallbackUsed: boolean;
            fallbackReason?: string;
          },
        },
      ],
      { windowHours: 24, since: 0 }
    );

    expect(summary.messagesScanned).toBe(3);
    expect(summary.messagesWithModelResolution).toBe(2);
    expect(summary.fallbackCount).toBe(1);
    expect(summary.fallbackRate).toBe(0.5);
    expect(summary.selectionSources).toEqual([
      { source: "preferred", count: 1 },
      { source: "org_default", count: 1 },
    ]);
    expect(summary.fallbackReasons).toEqual([{ reason: "org_default", count: 1 }]);
  });
});
