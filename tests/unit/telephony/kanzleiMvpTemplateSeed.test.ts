import { describe, expect, it } from "vitest";

import {
  KANZLEI_MVP_TEMPLATE_AGENT_SEED,
  PROTECTED_TEMPLATE_AGENT_SEEDS,
} from "../../../convex/onboarding/seedPlatformAgents";
import {
  KANZLEI_MVP_TEMPLATE_ROLE,
  createKanzleiMvpTelephonyConfigSeed,
} from "../../../src/lib/telephony/agent-telephony";

describe("Kanzlei MVP template seed", () => {
  it("is registered as a protected platform template", () => {
    const registered = PROTECTED_TEMPLATE_AGENT_SEEDS.find(
      (seed) => seed.role === KANZLEI_MVP_TEMPLATE_ROLE,
    );

    expect(registered).toBeDefined();
    expect(registered).toBe(KANZLEI_MVP_TEMPLATE_AGENT_SEED);
    expect(registered?.name).toBe("Kanzlei MVP Customer Telephony");
    expect(registered?.customProperties.templateRole).toBe(KANZLEI_MVP_TEMPLATE_ROLE);
    expect(registered?.customProperties.protected).toBe(true);
    expect(registered?.customProperties.agentClass).toBe("external_customer_facing");
    expect(registered?.customProperties.channelBindings).toContainEqual({
      channel: "phone_call",
      enabled: true,
    });
  });

  it("seeds single-agent Kanzlei prompt content instead of the multi-agent demo wedge", () => {
    const seed = createKanzleiMvpTelephonyConfigSeed();

    expect(seed.elevenlabs.systemPrompt).toContain("digitale Kanzleiassistenz");
    expect(seed.elevenlabs.systemPrompt).toContain("Do not invent internal specialist colleagues.");
    expect(seed.elevenlabs.firstMessage).toContain("digitale Kanzleiassistenz");
    expect(seed.elevenlabs.knowledgeBase).toContain("single-agent intake template");
    expect(Object.keys(seed.elevenlabs.managedTools)).toEqual(
      expect.arrayContaining(["end_call", "transfer_to_number"]),
    );
    expect(Object.keys(seed.elevenlabs.managedTools)).not.toContain("transfer_to_agent");
  });
});
