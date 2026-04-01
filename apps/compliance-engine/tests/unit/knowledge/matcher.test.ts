import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import {
  loadProviderKnowledge,
  matchProvider,
  listKnownProviders,
} from "../../../server/knowledge/matcher.js";
import type { ProviderKnowledge } from "../../../server/knowledge/types.js";

const KNOWLEDGE_DIR = resolve(
  import.meta.dirname ?? ".",
  "..",
  "..",
  "..",
  "knowledge",
);

describe("loadProviderKnowledge", () => {
  it("loads all provider YAML files from knowledge directory", () => {
    const records = loadProviderKnowledge(KNOWLEDGE_DIR);
    expect(records.length).toBeGreaterThanOrEqual(7);

    const ids = records.map((r) => r.id);
    expect(ids).toContain("hetzner");
    expect(ids).toContain("openrouter");
    expect(ids).toContain("elevenlabs");
    expect(ids).toContain("anthropic");
    expect(ids).toContain("openai");
    expect(ids).toContain("twilio");
    expect(ids).toContain("convex");
  });

  it("returns empty array for non-existent directory", () => {
    const records = loadProviderKnowledge("/nonexistent");
    expect(records).toEqual([]);
  });

  it("parses Hetzner knowledge correctly", () => {
    const records = loadProviderKnowledge(KNOWLEDGE_DIR);
    const hetzner = records.find((r) => r.id === "hetzner");

    expect(hetzner).toBeDefined();
    expect(hetzner!.name).toBe("Hetzner Online GmbH");
    expect(hetzner!.provider_type).toBe("hosting");
    expect(hetzner!.data_location).toBe("DE");
    expect(hetzner!.dpa_available).toBe(true);
    expect(hetzner!.transfer_mechanism).toBe("none_required");
    expect(hetzner!.known_certifications).toContain("ISO27001");
  });

  it("parses OpenRouter knowledge with US location and SCC requirement", () => {
    const records = loadProviderKnowledge(KNOWLEDGE_DIR);
    const openrouter = records.find((r) => r.id === "openrouter");

    expect(openrouter).toBeDefined();
    expect(openrouter!.data_location).toBe("US");
    expect(openrouter!.transfer_mechanism).toBe("scc_required");
    expect(openrouter!.eu_routing_available).toBe(true);
  });
});

describe("matchProvider", () => {
  const knowledge: ProviderKnowledge[] = [
    {
      id: "hetzner",
      name: "Hetzner Online GmbH",
      provider_type: "hosting",
      data_location: "DE",
      jurisdiction: "EU",
      dpa_available: true,
      transfer_mechanism: "none_required",
      known_certifications: ["ISO27001"],
    },
    {
      id: "openrouter",
      name: "OpenRouter Inc.",
      provider_type: "ai_inference",
      data_location: "US",
      jurisdiction: "US",
      dpa_available: true,
      transfer_mechanism: "scc_required",
      known_certifications: [],
    },
  ];

  it("matches by exact ID", () => {
    const match = matchProvider(knowledge, "hetzner");
    expect(match?.id).toBe("hetzner");
  });

  it("matches by exact name (case-insensitive)", () => {
    const match = matchProvider(knowledge, "Hetzner Online GmbH");
    expect(match?.id).toBe("hetzner");
  });

  it("matches by partial name", () => {
    const match = matchProvider(knowledge, "openrouter");
    expect(match?.id).toBe("openrouter");
  });

  it("returns null for unknown provider", () => {
    const match = matchProvider(knowledge, "unknown_provider");
    expect(match).toBeNull();
  });

  it("is case-insensitive", () => {
    const match = matchProvider(knowledge, "HETZNER");
    expect(match?.id).toBe("hetzner");
  });
});

describe("listKnownProviders", () => {
  const knowledge: ProviderKnowledge[] = [
    {
      id: "hetzner",
      name: "Hetzner",
      provider_type: "hosting",
      data_location: "DE",
      jurisdiction: "EU",
      dpa_available: true,
      transfer_mechanism: "none",
      known_certifications: [],
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      provider_type: "ai_inference",
      data_location: "US",
      jurisdiction: "US",
      dpa_available: true,
      transfer_mechanism: "scc",
      known_certifications: [],
    },
  ];

  it("returns all providers without filter", () => {
    const results = listKnownProviders(knowledge);
    expect(results).toHaveLength(2);
  });

  it("filters by provider type", () => {
    const results = listKnownProviders(knowledge, "hosting");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("hetzner");
  });
});
