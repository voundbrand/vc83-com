import { describe, expect, it } from "vitest";
import {
  isManagedUseCaseCloneCandidate,
  resolveDisallowedManagedCloneTuningFields,
} from "../../../convex/agentOntology";

describe("one-of-one managed clone tuning guard", () => {
  it("detects managed use-case clone lifecycle", () => {
    expect(
      isManagedUseCaseCloneCandidate({
        customProperties: { cloneLifecycle: "managed_use_case_clone_v1" },
      })
    ).toBe(true);

    expect(
      isManagedUseCaseCloneCandidate({
        customProperties: { cloneLifecycle: "legacy" },
      })
    ).toBe(false);
  });

  it("accepts sanctioned managed clone tuning fields", () => {
    const disallowed = resolveDisallowedManagedCloneTuningFields([
      "name",
      "subtype",
      "displayName",
      "systemPrompt",
      "toolProfile",
      "enabledTools",
      "disabledTools",
      "teamAccessMode",
      "channelBindings",
    ]);

    expect(disallowed).toEqual([]);
  });

  it("rejects non-sanctioned managed clone tuning fields", () => {
    const disallowed = resolveDisallowedManagedCloneTuningFields([
      "displayName",
      "templateAgentId",
      "templateCloneLinkage",
      "templateAgentId",
    ]);

    expect(disallowed).toEqual(["templateAgentId", "templateCloneLinkage"]);
  });
});
