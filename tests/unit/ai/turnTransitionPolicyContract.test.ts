import { describe, expect, it } from "vitest";
import {
  AGENT_TURN_STATE_VALUES,
  AGENT_TURN_TRANSITION_POLICY_RULES,
  AGENT_TURN_TRANSITION_VALUES,
  assertAgentTurnTransitionEdge,
  isAllowedAgentTurnTransitionEdge,
} from "../../../convex/schemas/aiSchemas";

describe("agent turn transition policy contract", () => {
  it("locks canonical state and transition values for replay parity", () => {
    expect(AGENT_TURN_STATE_VALUES).toEqual([
      "queued",
      "running",
      "suspended",
      "completed",
      "failed",
      "cancelled",
    ]);
    expect(AGENT_TURN_TRANSITION_VALUES).toEqual(
      expect.arrayContaining([
        "inbound_received",
        "turn_enqueued",
        "lease_acquired",
        "lease_heartbeat",
        "turn_suspended",
        "turn_completed",
        "turn_failed",
        "duplicate_dropped",
      ]),
    );
  });

  it("allows valid replay edges for the runtime execution path", () => {
    expect(
      isAllowedAgentTurnTransitionEdge({
        transition: "inbound_received",
        toState: "queued",
      }),
    ).toBe(true);
    expect(
      isAllowedAgentTurnTransitionEdge({
        transition: "lease_acquired",
        fromState: "queued",
        toState: "running",
      }),
    ).toBe(true);
    expect(
      isAllowedAgentTurnTransitionEdge({
        transition: "turn_completed",
        fromState: "running",
        toState: "completed",
      }),
    ).toBe(true);
  });

  it("rejects illegal state transitions and throws in assert hook", () => {
    expect(
      isAllowedAgentTurnTransitionEdge({
        transition: "turn_completed",
        fromState: "queued",
        toState: "completed",
      }),
    ).toBe(false);

    expect(() =>
      assertAgentTurnTransitionEdge({
        transition: "lease_heartbeat",
        fromState: "queued",
        toState: "queued",
      }),
    ).toThrow(/Invalid agent turn transition edge/);
  });

  it("retains legacy-compatible stale recovery checkpoint support", () => {
    const staleRuleIds = AGENT_TURN_TRANSITION_POLICY_RULES
      .filter((rule) => rule.transition === "stale_recovered")
      .map((rule) => rule.ruleId);

    expect(staleRuleIds).toEqual(expect.arrayContaining(["TCG-TP-21", "TCG-TP-22"]));
    expect(
      isAllowedAgentTurnTransitionEdge({
        transition: "stale_recovered",
        fromState: "running",
        toState: "running",
      }),
    ).toBe(true);
  });
});
