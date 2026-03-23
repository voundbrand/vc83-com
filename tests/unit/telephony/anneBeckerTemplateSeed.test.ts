import { describe, expect, it } from "vitest";

import {
  ANNE_BECKER_TEMPLATE_AGENT_SEED,
  PROTECTED_TEMPLATE_AGENT_SEEDS,
} from "../../../convex/onboarding/seedPlatformAgents";
import { CHANNELS } from "../../../src/components/window-content/agents/types";
import {
  ANNE_BECKER_TEMPLATE_ROLE,
  createAnneBeckerTelephonyConfigSeed,
} from "../../../src/lib/telephony/agent-telephony";

describe("Anne Becker template seed", () => {
  it("is registered as a protected platform template", () => {
    const registered = PROTECTED_TEMPLATE_AGENT_SEEDS.find(
      (seed) => seed.role === ANNE_BECKER_TEMPLATE_ROLE,
    );

    expect(registered).toBeDefined();
    expect(registered).toBe(ANNE_BECKER_TEMPLATE_AGENT_SEED);
    expect(registered?.name).toBe("Anne Becker Customer Telephony");
    expect(registered?.customProperties.templateRole).toBe(ANNE_BECKER_TEMPLATE_ROLE);
    expect(registered?.customProperties.protected).toBe(true);
    expect(registered?.customProperties.agentClass).toBe("external_customer_facing");
    expect(registered?.customProperties.channelBindings).toContainEqual({
      channel: "phone_call",
      enabled: true,
    });
    expect(registered?.customProperties.telephonyConfig).toMatchObject({
      selectedProvider: "elevenlabs",
    });
  });

  it("seeds Anne-specific provider content instead of generic defaults", () => {
    const seed = createAnneBeckerTelephonyConfigSeed();

    expect(seed.elevenlabs.systemPrompt).toContain("You are Anne Becker");
    expect(seed.elevenlabs.firstMessage).toContain("Anne Becker");
    expect(seed.elevenlabs.knowledgeBase).toContain("Marcus Engel Immobilien");
    expect(Object.keys(seed.elevenlabs.managedTools)).toEqual(
      expect.arrayContaining(["end_call", "transfer_to_number"]),
    );
  });
});

describe("agent channel catalog", () => {
  it("exposes phone_call as a selectable first-class channel", () => {
    expect(CHANNELS).toContain("phone_call");
  });
});
