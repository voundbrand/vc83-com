import { describe, expect, it } from "vitest";
import { AGENT_CATALOG } from "../../../apps/one-of-one-landing/scripts/elevenlabs/lib/catalog";
import { readLocalAgentSource } from "../../../apps/one-of-one-landing/scripts/elevenlabs/lib/source-of-truth";

describe("Anne Becker ElevenLabs config", () => {
  it("registers Anne Becker with the provided live agent id", () => {
    expect(AGENT_CATALOG.anne_becker.defaultAgentId).toBe("agent_5801km2dzv9ye1btjthfeca9507k");
    expect(AGENT_CATALOG.anne_becker.envVar).toBe("ANNE_BECKER_ELEVENLABS_AGENT_ID");
  });

  it("loads the local prompt, first message, and knowledge base for the live demo agent", () => {
    const source = readLocalAgentSource("anne_becker");

    expect(source.name).toBe("Anne Becker");
    expect(source.prompt).toContain("two-week live demo period");
    expect(source.firstMessage).toContain("Marcus Engel Immobilien");
    expect(source.knowledgeBase?.content).toContain("Friedrich-Ebert-Str. 2, 16225 Eberswalde");
    expect(source.knowledgeBase?.content).toContain("IHK-certified");
    expect(Object.keys(source.managedBuiltInTools)).toContain("end_call");
    expect(Object.keys(source.managedBuiltInTools)).toContain("transfer_to_number");
  });
});
