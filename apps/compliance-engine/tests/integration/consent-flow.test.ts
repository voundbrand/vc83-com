import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createMemoryDatabase } from "../../server/db/connection.js";
import { buildApp } from "../../server/app.js";
import type { Config } from "../../server/config.js";
import type Database from "better-sqlite3";

const TEST_CONFIG: Config = {
  host: "127.0.0.1",
  port: 0,
  dbPath: ":memory:",
  vaultPath: "/tmp/compliance-test-vault",
  encryptionKey: undefined,
  frameworks: ["gdpr"],
  logLevel: "silent",
};

describe("Consent Flow", () => {
  let app: FastifyInstance;
  let db: Database.Database;

  beforeEach(() => {
    db = createMemoryDatabase();
    app = buildApp({ db, config: TEST_CONFIG });
  });

  afterEach(() => {
    app.close();
    db.close();
  });

  it("records and retrieves consent", async () => {
    // Record consent
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/consent",
      payload: {
        subject_id: "user-1",
        consent_type: "data_processing",
        granted: true,
        legal_basis: "art6_1a",
        purpose: "AI agent assistance",
      },
    });

    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload);
    expect(created.id).toBeDefined();
    expect(created.granted).toBe(true);

    // Query consent
    const queryRes = await app.inject({
      method: "GET",
      url: "/api/v1/consent?subject_id=user-1",
    });

    expect(queryRes.statusCode).toBe(200);
    const result = JSON.parse(queryRes.payload);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].subject_id).toBe("user-1");
    expect(result.records[0].granted).toBe(true);
  });

  it("consent check returns true for active consent", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/consent",
      payload: {
        subject_id: "user-2",
        consent_type: "analytics",
        granted: true,
        legal_basis: "art6_1a",
        purpose: "Usage analytics",
      },
    });

    const checkRes = await app.inject({
      method: "GET",
      url: "/api/v1/consent/check?subject_id=user-2&consent_type=analytics",
    });

    expect(checkRes.statusCode).toBe(200);
    const check = JSON.parse(checkRes.payload);
    expect(check.has_consent).toBe(true);
    expect(check.reason).toBe("active_consent");
  });

  it("consent check returns false when no record exists", async () => {
    const checkRes = await app.inject({
      method: "GET",
      url: "/api/v1/consent/check?subject_id=unknown&consent_type=data_processing",
    });

    expect(checkRes.statusCode).toBe(200);
    const check = JSON.parse(checkRes.payload);
    expect(check.has_consent).toBe(false);
    expect(check.reason).toBe("no_record");
  });

  it("consent revocation overrides previous grant", async () => {
    // Grant
    await app.inject({
      method: "POST",
      url: "/api/v1/consent",
      payload: {
        subject_id: "user-3",
        consent_type: "marketing",
        granted: true,
        legal_basis: "art6_1a",
        purpose: "Email marketing",
      },
    });

    // Revoke
    await app.inject({
      method: "POST",
      url: "/api/v1/consent",
      payload: {
        subject_id: "user-3",
        consent_type: "marketing",
        granted: false,
        legal_basis: "art6_1a",
        purpose: "Email marketing",
        source: "user_request",
      },
    });

    const checkRes = await app.inject({
      method: "GET",
      url: "/api/v1/consent/check?subject_id=user-3&consent_type=marketing",
    });

    const check = JSON.parse(checkRes.payload);
    expect(check.has_consent).toBe(false);
    expect(check.reason).toBe("consent_revoked");
  });

  it("consent creates audit trail automatically", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/consent",
      payload: {
        subject_id: "user-4",
        consent_type: "data_processing",
        granted: true,
        legal_basis: "art6_1b",
        purpose: "Contract performance",
      },
    });

    // Check audit trail was created
    const auditRes = await app.inject({
      method: "GET",
      url: "/api/v1/audit?subject_id=user-4",
    });

    const audit = JSON.parse(auditRes.payload);
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0].event_type).toBe("consent.granted");
    expect(audit.events[0].action).toBe("grant_consent");
  });

  it("validates required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/consent",
      payload: {
        subject_id: "user-5",
        // missing consent_type, legal_basis, purpose
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("consent check validates required params", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/consent/check?subject_id=user-5",
      // missing consent_type
    });

    expect(res.statusCode).toBe(400);
  });

  it("supports expired consent detection", async () => {
    // Record consent with past expiry
    const pastDate = new Date("2020-01-01").toISOString();
    await app.inject({
      method: "POST",
      url: "/api/v1/consent",
      payload: {
        subject_id: "user-6",
        consent_type: "data_processing",
        granted: true,
        legal_basis: "art6_1a",
        purpose: "Testing",
        expires_at: pastDate,
      },
    });

    const checkRes = await app.inject({
      method: "GET",
      url: "/api/v1/consent/check?subject_id=user-6&consent_type=data_processing",
    });

    const check = JSON.parse(checkRes.payload);
    expect(check.has_consent).toBe(false);
    expect(check.reason).toBe("expired");
  });
});
