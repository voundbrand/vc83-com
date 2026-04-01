import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { createMemoryDatabase } from "../../server/db/connection.js";
import { loadFrameworks } from "../../server/engine/loader.js";
import { buildApp } from "../../server/app.js";
import type { Config } from "../../server/config.js";
import type Database from "better-sqlite3";

const FRAMEWORKS_DIR = resolve(
  import.meta.dirname ?? new URL(".", import.meta.url).pathname,
  "..",
  "..",
  "frameworks",
);

const TEST_CONFIG: Config = {
  host: "127.0.0.1",
  port: 0,
  dbPath: ":memory:",
  vaultPath: "/tmp/compliance-test-vault",
  encryptionKey: undefined,
  frameworks: ["gdpr"],
  logLevel: "silent",
};

describe("Evaluation Flow (GDPR)", () => {
  let app: FastifyInstance;
  let db: Database.Database;

  beforeEach(() => {
    db = createMemoryDatabase();
    const frameworks = loadFrameworks(FRAMEWORKS_DIR, ["gdpr"]);
    app = buildApp({ db, config: TEST_CONFIG, frameworks });
  });

  afterEach(() => {
    app.close();
    db.close();
  });

  it("denies data processing without consent", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/evaluate",
      payload: {
        action: "process_data",
        subject_id: "client-1",
        actor: "agent-samantha",
        fields: { purpose: "scheduling" },
      },
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.payload);
    expect(result.allowed).toBe(false);
    expect(result.blocked_by.length).toBeGreaterThan(0);

    // Should be blocked by consent rule
    const consentBlock = result.blocked_by.find(
      (r: { rule_id: string }) => r.rule_id === "gdpr.consent.data_processing",
    );
    expect(consentBlock).toBeDefined();
  });

  it("allows data processing with valid consent", async () => {
    // First, record consent
    await app.inject({
      method: "POST",
      url: "/api/v1/consent",
      payload: {
        subject_id: "client-1",
        consent_type: "data_processing",
        granted: true,
        legal_basis: "art6_1a",
        purpose: "AI agent scheduling assistance",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/evaluate",
      payload: {
        action: "process_data",
        subject_id: "client-1",
        actor: "agent-samantha",
        fields: {
          purpose: "scheduling",
          data_categories: "contact_info",
        },
      },
    });

    const result = JSON.parse(res.payload);

    // Consent rule should pass now
    const consentResult = result.results.find(
      (r: { rule_id: string }) => r.rule_id === "gdpr.consent.data_processing",
    );
    expect(consentResult?.passed).toBe(true);
  });

  it("warns about missing purpose", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/evaluate",
      payload: {
        action: "process_data",
        subject_id: "client-1",
        fields: {},
      },
    });

    const result = JSON.parse(res.payload);
    const purposeWarning = result.warnings.find(
      (r: { rule_id: string }) =>
        r.rule_id === "gdpr.minimization.purpose_stated",
    );
    expect(purposeWarning).toBeDefined();
  });

  it("checks provider DPA for transfers", async () => {
    // Register provider without DPA
    db.prepare(
      `INSERT INTO provider_registry (id, name, provider_type, dpa_status, data_location, active)
       VALUES ('openai', 'OpenAI', 'llm', 'missing', 'US', 1)`,
    ).run();

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/evaluate",
      payload: {
        action: "transfer_data",
        subject_id: "client-1",
        provider_id: "openai",
        fields: { purpose: "LLM inference" },
      },
    });

    const result = JSON.parse(res.payload);

    // Should have DPA block
    const dpaBlock = result.blocked_by.find(
      (r: { rule_id: string }) => r.rule_id === "gdpr.transfer.provider_dpa",
    );
    expect(dpaBlock).toBeDefined();

    // Should have EU location warning
    const locationWarn = result.warnings.find(
      (r: { rule_id: string }) => r.rule_id === "gdpr.transfer.eu_location",
    );
    expect(locationWarn).toBeDefined();
  });

  it("allows transfer to EU provider with signed DPA", async () => {
    db.prepare(
      `INSERT INTO provider_registry (id, name, provider_type, dpa_status, data_location, active)
       VALUES ('hetzner', 'Hetzner', 'hosting', 'signed', 'DE', 1)`,
    ).run();

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/evaluate",
      payload: {
        action: "transfer_data",
        provider_id: "hetzner",
        fields: { purpose: "Data hosting" },
      },
    });

    const result = JSON.parse(res.payload);

    // Transfer rules should pass
    const dpaResult = result.results.find(
      (r: { rule_id: string }) => r.rule_id === "gdpr.transfer.provider_dpa",
    );
    expect(dpaResult?.passed).toBe(true);

    const locationResult = result.results.find(
      (r: { rule_id: string }) => r.rule_id === "gdpr.transfer.eu_location",
    );
    expect(locationResult?.passed).toBe(true);
  });

  it("records evaluation in audit trail", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/evaluate",
      payload: {
        action: "process_data",
        subject_id: "client-1",
        actor: "agent-test",
        fields: {},
      },
    });

    const auditRes = await app.inject({
      method: "GET",
      url: "/api/v1/audit?event_type=policy.evaluated",
    });

    const audit = JSON.parse(auditRes.payload);
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0].action).toBe("process_data");
    expect(audit.events[0].actor).toBe("agent-test");
  });

  it("validates required action field", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/evaluate",
      payload: { fields: {} },
    });

    expect(res.statusCode).toBe(400);
  });
});
