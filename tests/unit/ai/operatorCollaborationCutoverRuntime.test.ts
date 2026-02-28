import { describe, expect, it } from "vitest";
import { resolveOperatorCollaborationCutoverConfig } from "../../../convex/ai/chat";

describe("chat operator collaboration cutover env resolution", () => {
  const baseArgs = {
    organizationId: "org_runtime",
    conversationId: "conv_runtime",
  };

  it("reads legacy NEXT_PUBLIC aliases from an explicit env snapshot", () => {
    const config = resolveOperatorCollaborationCutoverConfig({
      ...baseArgs,
      env: {
        NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ENABLED: "false",
        NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ROLLOUT_PERCENT: "0",
      },
    });

    expect(config.shellEnabled).toBe(false);
    expect(config.rolloutPercent).toBe(0);
    expect(config.collaborationShellEnabled).toBe(false);
    expect(config.reason).toBe("cutover_disabled");
  });

  it("prioritizes server env keys over legacy aliases", () => {
    const config = resolveOperatorCollaborationCutoverConfig({
      ...baseArgs,
      env: {
        OPERATOR_COLLABORATION_SHELL_ENABLED: "true",
        NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ENABLED: "false",
      },
    });

    expect(config.shellEnabled).toBe(true);
    expect(config.collaborationShellEnabled).toBe(true);
    expect(config.reason).toBe("cutover_enabled");
  });

  it("supports legacy force-legacy rollback aliases", () => {
    const config = resolveOperatorCollaborationCutoverConfig({
      ...baseArgs,
      env: {
        NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_FORCE_LEGACY: "true",
      },
    });

    expect(config.forceLegacyShell).toBe(true);
    expect(config.collaborationShellEnabled).toBe(false);
    expect(config.reason).toBe("legacy_forced");
  });
});
