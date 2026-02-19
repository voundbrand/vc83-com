import { describe, expect, it } from "vitest";
import {
  AGENT_LIFECYCLE_STATE_VALUES,
  AGENT_LIFECYCLE_TRANSITION_RULES,
  assertLifecycleTransition,
  isAllowedLifecycleTransition,
  resolveSessionLifecycleState,
} from "../../../convex/ai/agentLifecycle";

describe("agent lifecycle contract", () => {
  it("locks canonical lifecycle state ordering for docs/runtime parity", () => {
    expect(AGENT_LIFECYCLE_STATE_VALUES).toEqual([
      "draft",
      "active",
      "paused",
      "escalated",
      "takeover",
      "resolved",
    ]);
  });

  it("allows only canonical transition checkpoints", () => {
    expect(
      isAllowedLifecycleTransition({
        from: "active",
        to: "draft",
        actor: "agent",
        checkpoint: "approval_requested",
      }),
    ).toBe(true);

    expect(
      isAllowedLifecycleTransition({
        from: "active",
        to: "resolved",
        actor: "system",
        checkpoint: "agent_resumed",
      }),
    ).toBe(false);
  });

  it("keeps pause/escalation/resume checkpoints in transition rules", () => {
    const transitionKeys = AGENT_LIFECYCLE_TRANSITION_RULES.map(
      (rule) => `${rule.from}:${rule.to}:${rule.actor}:${rule.checkpoint}`,
    );

    expect(transitionKeys).toEqual(
      expect.arrayContaining([
        "active:paused:system:escalation_detected",
        "paused:escalated:system:escalation_created",
        "escalated:takeover:operator:escalation_taken_over",
        "takeover:resolved:operator:escalation_resolved",
        "resolved:active:system:agent_resumed",
      ]),
    );
  });

  it("throws when invalid transitions are attempted", () => {
    expect(() =>
      assertLifecycleTransition({
        from: "draft",
        to: "escalated",
        actor: "operator",
        checkpoint: "approval_resolved",
      }),
    ).toThrow(/Invalid lifecycle transition/);
  });

  it("derives fallback lifecycle state from session escalation context", () => {
    expect(resolveSessionLifecycleState({})).toBe("active");
    expect(resolveSessionLifecycleState({ escalationState: { status: "pending" } })).toBe(
      "escalated",
    );
    expect(
      resolveSessionLifecycleState({
        status: "handed_off",
        escalationState: { status: "taken_over" },
      }),
    ).toBe("takeover");
    expect(resolveSessionLifecycleState({ escalationState: { status: "resolved" } })).toBe(
      "resolved",
    );
  });
});
