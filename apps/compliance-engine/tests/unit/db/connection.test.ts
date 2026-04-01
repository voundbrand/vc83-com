import { describe, it, expect, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../../../server/db/connection.js";

describe("createMemoryDatabase", () => {
  let db: Database.Database;

  afterEach(() => {
    db?.open && db.close();
  });

  it("creates all 6 tables", () => {
    db = createMemoryDatabase();
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as { name: string }[];

    const names = tables.map((t) => t.name);
    expect(names).toContain("schema_version");
    expect(names).toContain("consent_records");
    expect(names).toContain("audit_events");
    expect(names).toContain("evidence_artifacts");
    expect(names).toContain("provider_registry");
    expect(names).toContain("data_subjects");
  });

  it("records initial schema version", () => {
    db = createMemoryDatabase();
    const row = db
      .prepare("SELECT MAX(version) as v FROM schema_version")
      .get() as { v: number };

    expect(row.v).toBe(1);
  });

  it("enforces foreign keys", () => {
    db = createMemoryDatabase();
    const fk = db.pragma("foreign_keys") as { foreign_keys: number }[];
    expect(fk[0].foreign_keys).toBe(1);
  });

  it("can insert and read consent records", () => {
    db = createMemoryDatabase();
    db.prepare(
      `INSERT INTO consent_records (id, subject_id, consent_type, granted, legal_basis, purpose, policy_version)
       VALUES ('c1', 'subj-1', 'data_processing', 1, 'art6_1a', 'analytics', '1.0')`,
    ).run();

    const row = db
      .prepare("SELECT * FROM consent_records WHERE id = 'c1'")
      .get() as Record<string, unknown>;

    expect(row.subject_id).toBe("subj-1");
    expect(row.granted).toBe(1);
    expect(row.legal_basis).toBe("art6_1a");
  });

  it("can insert and read audit events", () => {
    db = createMemoryDatabase();
    db.prepare(
      `INSERT INTO audit_events (id, event_type, actor, action, outcome)
       VALUES ('e1', 'consent.granted', 'user-123', 'grant_consent', 'allowed')`,
    ).run();

    const row = db
      .prepare("SELECT * FROM audit_events WHERE id = 'e1'")
      .get() as Record<string, unknown>;

    expect(row.event_type).toBe("consent.granted");
    expect(row.actor).toBe("user-123");
  });

  it("supports provider registry CRUD", () => {
    db = createMemoryDatabase();
    db.prepare(
      `INSERT INTO provider_registry (id, name, provider_type, dpa_status, data_location)
       VALUES ('p1', 'Hetzner', 'hosting', 'signed', 'DE')`,
    ).run();

    const row = db
      .prepare("SELECT * FROM provider_registry WHERE id = 'p1'")
      .get() as Record<string, unknown>;

    expect(row.name).toBe("Hetzner");
    expect(row.dpa_status).toBe("signed");
    expect(row.data_location).toBe("DE");
  });
});
