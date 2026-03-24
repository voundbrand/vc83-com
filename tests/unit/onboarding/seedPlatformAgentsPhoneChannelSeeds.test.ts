import { describe, expect, it } from "vitest";

import {
  ANNE_BECKER_TEMPLATE_AGENT_SEED,
  KANZLEI_MVP_TEMPLATE_AGENT_SEED,
  MOTHER_GOVERNANCE_RUNTIME_SEED,
  MOTHER_SUPPORT_RUNTIME_SEED,
  PERSONAL_OPERATOR_TEMPLATE_AGENT_SEED,
  QUINN_CUSTOM_PROPERTIES,
  SAMANTHA_LEAD_CAPTURE_TEMPLATE_SEED,
  SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_SEED,
} from "../../../convex/onboarding/seedPlatformAgents";

const ENABLED_PHONE_CALL_BINDING = {
  channel: "phone_call",
  enabled: true,
};

const ENABLED_DESKTOP_BINDING = {
  channel: "desktop",
  enabled: true,
};

const ENABLED_SLACK_BINDING = {
  channel: "slack",
  enabled: true,
};

const DISABLED_PHONE_CALL_BINDING = {
  channel: "phone_call",
  enabled: false,
};

describe("platform agent phone-call seed coverage", () => {
  it("adds phone_call explicitly to Quinn but keeps it disabled until telephony-ready", () => {
    expect(QUINN_CUSTOM_PROPERTIES.channelBindings).toContainEqual(
      DISABLED_PHONE_CALL_BINDING,
    );
  });

  it("keeps Mother support and governance runtimes explicitly off the telephony rail", () => {
    for (const seed of [MOTHER_SUPPORT_RUNTIME_SEED, MOTHER_GOVERNANCE_RUNTIME_SEED]) {
      expect(seed.customProperties.channelBindings).toContainEqual(
        DISABLED_PHONE_CALL_BINDING,
      );
      expect(
        seed.customProperties.channelBindings.some(
          (binding) => binding.channel === "phone_call" && binding.enabled === true,
        ),
      ).toBe(false);
    }
  });

  it("enables phone_call on the telephony-capable protected seeds", () => {
    for (const seed of [
      ANNE_BECKER_TEMPLATE_AGENT_SEED,
      KANZLEI_MVP_TEMPLATE_AGENT_SEED,
      PERSONAL_OPERATOR_TEMPLATE_AGENT_SEED,
      SAMANTHA_LEAD_CAPTURE_TEMPLATE_SEED,
      SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_SEED,
    ]) {
      expect(seed.customProperties.channelBindings).toContainEqual(
        ENABLED_PHONE_CALL_BINDING,
      );
    }
  });

  it("normalizes the personal operator seed as the internal desktop/slack orchestrator", () => {
    expect(PERSONAL_OPERATOR_TEMPLATE_AGENT_SEED.subtype).toBe("general");
    expect(PERSONAL_OPERATOR_TEMPLATE_AGENT_SEED.customProperties.agentClass).toBe(
      "internal_operator",
    );
    expect(PERSONAL_OPERATOR_TEMPLATE_AGENT_SEED.customProperties.channelBindings).toContainEqual(
      ENABLED_DESKTOP_BINDING,
    );
    expect(PERSONAL_OPERATOR_TEMPLATE_AGENT_SEED.customProperties.channelBindings).toContainEqual(
      ENABLED_SLACK_BINDING,
    );
  });
});
