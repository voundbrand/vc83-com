import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { resolve } from "node:path";
import { createMemoryDatabase } from "../../server/db/connection.js";
import { buildApp } from "../../server/app.js";
import { loadFrameworks } from "../../server/engine/loader.js";
import { loadProviderKnowledge } from "../../server/knowledge/matcher.js";
import type { Config } from "../../server/config.js";

const FRAMEWORKS_DIR = resolve(
  import.meta.dirname ?? ".",
  "..",
  "..",
  "frameworks",
);

const KNOWLEDGE_DIR = resolve(
  import.meta.dirname ?? ".",
  "..",
  "..",
  "knowledge",
);

function makeTestApp(): { app: FastifyInstance; cleanup: () => void } {
  const db = createMemoryDatabase();
  const config: Config = {
    host: "127.0.0.1",
    port: 0,
    dbPath: ":memory:",
    vaultPath: "/tmp/compliance-test-vault",
    encryptionKey: undefined,
    frameworks: ["gdpr", "stgb_203"],
    logLevel: "silent",
  };

  const frameworks = loadFrameworks(FRAMEWORKS_DIR, config.frameworks);
  const knowledge = loadProviderKnowledge(KNOWLEDGE_DIR);

  const app = buildApp({ db, config, frameworks, knowledge });
  return {
    app,
    cleanup: () => {
      app.close();
      db.close();
    },
  };
}

describe("Governance API — Full Flow", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("POST /governance/assess returns requirements for lawyer profession", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/governance/assess",
      payload: { profession: "lawyer" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.frameworks).toHaveLength(2);
    const fwIds = body.frameworks.map((f: { id: string }) => f.id);
    expect(fwIds).toContain("gdpr");
    expect(fwIds).toContain("stgb_203");

    expect(body.deployment_requirements).toBeDefined();
    expect(body.deployment_requirements.hosting).toBeDefined();
    expect(body.deployment_requirements.inference).toBeDefined();
    expect(body.decision).toBe("GO"); // No providers yet = no provider blockers
  });

  it("POST /governance/onboard-provider auto-populates from knowledge base", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/governance/onboard-provider",
      payload: { name: "hetzner" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);

    expect(body.name).toBe("Hetzner Online GmbH");
    expect(body.provider_type).toBe("hosting");
    expect(body.data_location).toBe("DE");
    expect(body.knowledge_matched).toBe(true);
    expect(body.knowledge.dpa_available).toBe(true);
    expect(body.knowledge.dpa_url).toContain("hetzner");
    expect(body.evidence_gaps).toBeDefined();
    expect(body.evidence_gaps.length).toBeGreaterThan(0);
  });

  it("POST /governance/onboard-provider handles unknown provider", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/governance/onboard-provider",
      payload: { name: "SomeNewProvider", provider_type: "analytics" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);

    expect(body.name).toBe("SomeNewProvider");
    expect(body.provider_type).toBe("analytics");
    expect(body.knowledge_matched).toBe(false);
    expect(body.knowledge).toBeNull();
  });

  it("GET /governance/evidence-gaps returns per-provider gaps after onboarding", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    // Onboard two providers
    await app.inject({
      method: "POST",
      url: "/api/v1/governance/onboard-provider",
      payload: { name: "hetzner" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/governance/onboard-provider",
      payload: { name: "openrouter" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/governance/evidence-gaps",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.providers).toHaveLength(2);
    expect(body.total_gaps).toBeGreaterThan(0);
    expect(body.all_clear).toBe(false);

    // Hetzner should have DPA gap (not yet signed)
    const hetznerGaps = body.providers.find(
      (p: { provider_name: string }) => p.provider_name === "Hetzner Online GmbH",
    );
    expect(hetznerGaps).toBeDefined();
    const dpaMissing = hetznerGaps.gaps.find(
      (g: { evidence_type: string }) => g.evidence_type === "dpa",
    );
    expect(dpaMissing.status).toBe("missing");

    // OpenRouter should have transfer mechanism gap
    const orGaps = body.providers.find(
      (p: { provider_name: string }) => p.provider_name === "OpenRouter Inc.",
    );
    expect(orGaps).toBeDefined();
    expect(orGaps.data_location).toBe("US");
  });

  it("GET /governance/readiness returns NO_GO with blockers", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    // Onboard a provider without signing DPA
    await app.inject({
      method: "POST",
      url: "/api/v1/governance/onboard-provider",
      payload: { name: "openrouter" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/governance/readiness",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.decision).toBe("NO_GO");
    expect(body.blockers.length).toBeGreaterThan(0);
    expect(body.posture_score).toBeLessThan(100);
    expect(typeof body.evidence_count).toBe("number");
    expect(body.generated_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    expect(body.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    expect(
      body.blockers.every(
        (b: { owner?: unknown }) => typeof b.owner === "string",
      ),
    ).toBe(true);
  });

  it("GET /governance/readiness fails closed for non-EU provider without transfer mechanism", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    await app.inject({
      method: "POST",
      url: "/api/v1/providers",
      payload: {
        name: "US Inference Vendor",
        provider_type: "ai_inference",
        dpa_status: "signed",
        data_location: "US",
        transfer_mechanism: "none",
        tom_status: "documented",
        metadata: {
          subprocessor_list_url: "https://example.com/subprocessors",
        },
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/governance/readiness",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.decision).toBe("NO_GO");
    const transferBlockers = body.blockers.filter(
      (b: { description: string }) =>
        b.description.includes("transfer mechanism required"),
    );
    expect(transferBlockers.length).toBeGreaterThan(0);
    expect(
      transferBlockers.every(
        (b: { owner?: string }) => b.owner === "unassigned",
      ),
    ).toBe(true);
  });

  it("GET /governance/readiness returns GO when provider DPA is signed", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    // Register provider directly with signed DPA
    await app.inject({
      method: "POST",
      url: "/api/v1/providers",
      payload: {
        name: "Hetzner",
        provider_type: "hosting",
        dpa_status: "signed",
        data_location: "DE",
        transfer_mechanism: "none_required",
        tom_status: "documented",
        metadata: {
          subprocessor_list_url: "https://hetzner.com/subs",
        },
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/governance/readiness",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.decision).toBe("GO");
    expect(body.blockers).toHaveLength(0);
  });

  it("GET /governance/checklist returns structured checklist", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    await app.inject({
      method: "POST",
      url: "/api/v1/governance/onboard-provider",
      payload: { name: "hetzner" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/governance/checklist",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.title).toBe("Deployment Go-Live Checklist");
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThan(0);

    // Each item should have required fields
    for (const item of body.items) {
      expect(item.id).toMatch(/^CL-\d{3}$/);
      expect(item.category).toBeDefined();
      expect(item.status).toMatch(/^(done|pending|blocked)$/);
    }
  });

  it("POST /governance/generate-doc generates subprocessor inventory", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    // Onboard provider first
    await app.inject({
      method: "POST",
      url: "/api/v1/governance/onboard-provider",
      payload: { name: "hetzner" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/governance/generate-doc",
      payload: {
        template: "subprocessor_inventory",
        company_name: "Test Law Firm GmbH",
        governance_owner: "Dr. Test",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.template).toBe("subprocessor_inventory");
    expect(body.format).toBe("markdown");
    expect(body.content).toContain("Subprocessor Inventory");
    expect(body.content).toContain("Test Law Firm GmbH");
    expect(body.content).toContain("Hetzner");
    expect(body.content).toContain("Dr. Test");
  });

  it("POST /governance/generate-doc generates incident matrix", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/governance/generate-doc",
      payload: {
        template: "incident_matrix",
        company_name: "Test Corp",
        governance_owner: "Jane Doe",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.content).toContain("Incident Contact Matrix");
    expect(body.content).toContain("P0");
    expect(body.content).toContain("72 hours");
    expect(body.content).toContain("Jane Doe");
  });

  it("POST /governance/generate-doc rejects unknown template", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/governance/generate-doc",
      payload: { template: "nonexistent" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("GET /governance/knowledge lists all known providers", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/governance/knowledge",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.count).toBeGreaterThanOrEqual(7);
    const ids = body.providers.map((p: { id: string }) => p.id);
    expect(ids).toContain("hetzner");
    expect(ids).toContain("openrouter");
  });

  it("GET /governance/knowledge/:query looks up specific provider", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/governance/knowledge/elevenlabs",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.found).toBe(true);
    expect(body.provider.id).toBe("elevenlabs");
    expect(body.provider.data_location).toBe("US");
    expect(body.provider.transfer_mechanism).toBe("scc_required");
  });

  it("GET /governance/knowledge/:query returns not found for unknown", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/governance/knowledge/nonexistent",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.found).toBe(false);
  });

  it("full onboarding flow: assess → onboard → gaps → readiness", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    // Step 1: Assess for lawyer
    const assessRes = await app.inject({
      method: "POST",
      url: "/api/v1/governance/assess",
      payload: { profession: "lawyer" },
    });
    const assess = JSON.parse(assessRes.payload);
    expect(assess.frameworks).toHaveLength(2);

    // Step 2: Onboard providers
    await app.inject({
      method: "POST",
      url: "/api/v1/governance/onboard-provider",
      payload: { name: "hetzner" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/governance/onboard-provider",
      payload: { name: "openrouter" },
    });

    // Step 3: Check evidence gaps
    const gapsRes = await app.inject({
      method: "GET",
      url: "/api/v1/governance/evidence-gaps",
    });
    const gaps = JSON.parse(gapsRes.payload);
    expect(gaps.providers).toHaveLength(2);
    expect(gaps.all_clear).toBe(false);

    // Step 4: Check readiness — should be NO_GO
    const readyRes = await app.inject({
      method: "GET",
      url: "/api/v1/governance/readiness",
    });
    const ready = JSON.parse(readyRes.payload);
    expect(ready.decision).toBe("NO_GO");
    expect(ready.blockers.length).toBeGreaterThan(0);

    // Step 5: Sign DPAs
    const providers = gaps.providers;
    for (const p of providers) {
      await app.inject({
        method: "PATCH",
        url: `/api/v1/providers/${p.provider_id}`,
        payload: {
          dpa_status: "signed",
          tom_status: "documented",
        },
      });
    }

    // Step 6: Re-check readiness
    const ready2Res = await app.inject({
      method: "GET",
      url: "/api/v1/governance/readiness",
    });
    const ready2 = JSON.parse(ready2Res.payload);

    // OpenRouter is US-based but now has signed DPA — may still have transfer gap
    // depending on if transfer_mechanism was set. But DPA blocker should be resolved.
    const dpaBlockers = ready2.blockers.filter(
      (b: { description: string }) => b.description.includes("DPA"),
    );
    expect(dpaBlockers).toHaveLength(0);
  });
});
