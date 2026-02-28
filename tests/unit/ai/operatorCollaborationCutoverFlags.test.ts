import { describe, expect, it } from "vitest";
import {
  resolveOperatorCollaborationCutoverFlags,
  resolveOperatorCollaborationShellResolution,
} from "../../../src/lib/operator-collaboration-cutover";

describe("operator collaboration cutover flags", () => {
  it("enables collaboration shell by default", () => {
    const flags = resolveOperatorCollaborationCutoverFlags({});
    const resolution = resolveOperatorCollaborationShellResolution({
      organizationId: "org_default",
      requestedLayoutMode: "four-pane",
      env: {},
    });

    expect(flags.shellEnabled).toBe(true);
    expect(flags.rolloutPercent).toBe(100);
    expect(resolution.collaborationShellEnabled).toBe(true);
    expect(resolution.resolvedLayoutMode).toBe("slick");
  });

  it("forces legacy shell when explicit rollback flag is enabled", () => {
    const resolution = resolveOperatorCollaborationShellResolution({
      organizationId: "org_rollback",
      requestedLayoutMode: "single",
      env: {
        NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_FORCE_LEGACY: "true",
      },
    });

    expect(resolution.collaborationShellEnabled).toBe(false);
    expect(resolution.reason).toBe("legacy_forced");
    expect(resolution.resolvedLayoutMode).toBe("single");
  });

  it("holds back cutover when rollout percent excludes the org cohort", () => {
    const resolution = resolveOperatorCollaborationShellResolution({
      organizationId: "org_canary_holdback",
      requestedLayoutMode: "slick",
      env: {
        NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ROLLOUT_PERCENT: "0",
      },
    });

    expect(resolution.collaborationShellEnabled).toBe(false);
    expect(resolution.reason).toBe("cohort_holdback");
    expect(resolution.resolvedLayoutMode).toBe("four-pane");
  });

  it("produces deterministic cohort buckets for the same organization", () => {
    const first = resolveOperatorCollaborationShellResolution({
      organizationId: "org_deterministic",
      requestedLayoutMode: "slick",
      env: {
        NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ROLLOUT_PERCENT: "35",
      },
    });
    const second = resolveOperatorCollaborationShellResolution({
      organizationId: "org_deterministic",
      requestedLayoutMode: "four-pane",
      env: {
        NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ROLLOUT_PERCENT: "35",
      },
    });

    expect(first.cohortBucket).toBe(second.cohortBucket);
    expect(first.collaborationShellEnabled).toBe(
      second.collaborationShellEnabled
    );
  });
});
