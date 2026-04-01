import { describe, expect, it } from "vitest";
import { hasReleaseReadyToolRoutingCandidate } from "../../../convex/ai/kernel/agentExecution";

describe("runtime model release gate guard", () => {
  it("accepts routing pools that include at least one tools+json capable release-ready model", () => {
    const hasCandidate = hasReleaseReadyToolRoutingCandidate({
      platformEnabledModels: [
        {
          capabilityMatrix: {
            text: true,
            tools: false,
            json: false,
          },
        },
        {
          capabilityMatrix: {
            text: true,
            tools: true,
            json: true,
          },
        },
      ],
    });

    expect(hasCandidate).toBe(true);
  });

  it("rejects routing pools with no tools+json capable release-ready models", () => {
    const hasCandidate = hasReleaseReadyToolRoutingCandidate({
      platformEnabledModels: [
        {
          capabilityMatrix: {
            text: true,
            tools: true,
            json: false,
          },
        },
        {
          capabilityMatrix: {
            text: true,
            tools: false,
            json: true,
          },
        },
      ],
    });

    expect(hasCandidate).toBe(false);
  });
});
