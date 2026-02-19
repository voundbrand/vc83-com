import { describe, expect, it } from "vitest";
import { findRetiredModelIds } from "../../../convex/ai/settings";

describe("settings lifecycle guard", () => {
  it("returns retired model IDs present in enabled model selections", () => {
    const retired = findRetiredModelIds(
      [
        { modelId: "openai/gpt-4o-mini" },
        { modelId: "anthropic/claude-sonnet-4.5" },
      ],
      [
        { modelId: "openai/gpt-4o-mini", lifecycleStatus: "enabled" },
        { modelId: "anthropic/claude-sonnet-4.5", lifecycleStatus: "retired" },
      ]
    );

    expect(retired).toEqual(["anthropic/claude-sonnet-4.5"]);
  });

  it("returns empty list when selected models are active", () => {
    const retired = findRetiredModelIds(
      [{ modelId: "openai/gpt-4o-mini" }],
      [{ modelId: "openai/gpt-4o-mini", lifecycleStatus: "default" }]
    );

    expect(retired).toEqual([]);
  });
});
