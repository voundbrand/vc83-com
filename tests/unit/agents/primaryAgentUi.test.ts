import { describe, expect, it } from "vitest";
import {
  canMakePrimaryInUi,
  canPauseAgentInUi,
  countActiveAgents,
  isPrimaryAgentRecord,
} from "../../../src/components/window-content/agents/primary-agent-ui";

describe("primary agent UI guards", () => {
  it("identifies primary flag from custom properties", () => {
    expect(isPrimaryAgentRecord({ customProperties: { isPrimary: true } })).toBe(true);
    expect(isPrimaryAgentRecord({ customProperties: { isPrimary: false } })).toBe(false);
  });

  it("prevents pausing the only active primary agent", () => {
    const canPause = canPauseAgentInUi(
      { status: "active", customProperties: { isPrimary: true } },
      1
    );
    expect(canPause).toBe(false);
  });

  it("allows pausing a primary agent when another active agent exists", () => {
    const canPause = canPauseAgentInUi(
      { status: "active", customProperties: { isPrimary: true } },
      2
    );
    expect(canPause).toBe(true);
  });

  it("only shows make-primary action for active non-primary agents", () => {
    expect(canMakePrimaryInUi({ status: "active", customProperties: { isPrimary: false } })).toBe(true);
    expect(canMakePrimaryInUi({ status: "active", customProperties: { isPrimary: true } })).toBe(false);
    expect(canMakePrimaryInUi({ status: "paused", customProperties: { isPrimary: false } })).toBe(false);
  });

  it("counts active agents for primary pause guard", () => {
    const activeCount = countActiveAgents([
      { status: "active", customProperties: { isPrimary: true } },
      { status: "paused", customProperties: { isPrimary: false } },
      { status: "active", customProperties: { isPrimary: false } },
    ]);

    expect(activeCount).toBe(2);
  });
});
