import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../../../server/db/connection.js";
import { evaluate } from "../../../server/engine/evaluator.js";
import { createInlineFramework } from "../../../server/engine/loader.js";
import type {
  Framework,
  EvaluationContext,
  Rule,
} from "../../../server/engine/types.js";

function makeConsentRule(consentType: string, legalBasis?: string[]): Rule {
  return {
    id: `test.consent.${consentType}`,
    description: `Requires ${consentType} consent`,
    severity: "block",
    condition: {
      type: "requires_consent",
      consent_type: consentType,
      legal_basis: legalBasis,
    },
    action: { type: "deny", message: `No ${consentType} consent` },
  };
}

describe("evaluator", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createMemoryDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("allows when no rules exist", () => {
    const frameworks: Framework[] = [];
    const ctx: EvaluationContext = {
      action: "process_data",
      fields: {},
    };
    const result = evaluate(frameworks, ctx, db);
    expect(result.allowed).toBe(true);
    expect(result.results).toHaveLength(0);
  });

  it("blocks when requires_consent and no consent exists", () => {
    const fw = createInlineFramework(
      { id: "test", name: "Test", version: "1.0", description: "Test" },
      [makeConsentRule("data_processing")],
    );

    const result = evaluate(
      [fw],
      { action: "process", subject_id: "user-1", fields: {} },
      db,
    );

    expect(result.allowed).toBe(false);
    expect(result.blocked_by).toHaveLength(1);
    expect(result.blocked_by[0].rule_id).toBe("test.consent.data_processing");
  });

  it("allows when consent exists and is granted", () => {
    // Insert consent
    db.prepare(
      `INSERT INTO consent_records (id, subject_id, consent_type, granted, legal_basis, purpose, policy_version)
       VALUES ('c1', 'user-1', 'data_processing', 1, 'art6_1a', 'testing', '1.0')`,
    ).run();

    const fw = createInlineFramework(
      { id: "test", name: "Test", version: "1.0", description: "Test" },
      [makeConsentRule("data_processing", ["art6_1a", "art6_1b"])],
    );

    const result = evaluate(
      [fw],
      { action: "process", subject_id: "user-1", fields: {} },
      db,
    );

    expect(result.allowed).toBe(true);
  });

  it("blocks when consent is revoked", () => {
    db.prepare(
      `INSERT INTO consent_records (id, subject_id, consent_type, granted, legal_basis, purpose, policy_version)
       VALUES ('c1', 'user-1', 'data_processing', 0, 'art6_1a', 'testing', '1.0')`,
    ).run();

    const fw = createInlineFramework(
      { id: "test", name: "Test", version: "1.0", description: "Test" },
      [makeConsentRule("data_processing")],
    );

    const result = evaluate(
      [fw],
      { action: "process", subject_id: "user-1", fields: {} },
      db,
    );

    expect(result.allowed).toBe(false);
  });

  it("evaluates requires_field condition", () => {
    const fw = createInlineFramework(
      { id: "test", name: "Test", version: "1.0", description: "Test" },
      [
        {
          id: "test.field",
          description: "Purpose required",
          severity: "block",
          condition: { type: "requires_field", field: "purpose" },
          action: { type: "deny", message: "No purpose" },
        },
      ],
    );

    // Without field
    const r1 = evaluate([fw], { action: "x", fields: {} }, db);
    expect(r1.allowed).toBe(false);

    // With field
    const r2 = evaluate([fw], { action: "x", fields: { purpose: "analytics" } }, db);
    expect(r2.allowed).toBe(true);
  });

  it("evaluates field_matches condition", () => {
    const fw = createInlineFramework(
      { id: "test", name: "Test", version: "1.0", description: "Test" },
      [
        {
          id: "test.match",
          description: "Country must be DE",
          severity: "block",
          condition: {
            type: "field_matches",
            field: "country",
            values: ["DE", "AT", "CH"],
          },
          action: { type: "deny", message: "Invalid country" },
        },
      ],
    );

    const r1 = evaluate([fw], { action: "x", fields: { country: "DE" } }, db);
    expect(r1.allowed).toBe(true);

    const r2 = evaluate([fw], { action: "x", fields: { country: "US" } }, db);
    expect(r2.allowed).toBe(false);
  });

  it("evaluates compound all_of condition", () => {
    const fw = createInlineFramework(
      { id: "test", name: "Test", version: "1.0", description: "Test" },
      [
        {
          id: "test.compound",
          description: "Both fields required",
          severity: "block",
          condition: {
            type: "all_of",
            conditions: [
              { type: "requires_field", field: "purpose" },
              { type: "requires_field", field: "legal_basis" },
            ],
          },
          action: { type: "deny", message: "Missing fields" },
        },
      ],
    );

    const r1 = evaluate([fw], { action: "x", fields: { purpose: "a" } }, db);
    expect(r1.allowed).toBe(false);

    const r2 = evaluate(
      [fw],
      { action: "x", fields: { purpose: "a", legal_basis: "b" } },
      db,
    );
    expect(r2.allowed).toBe(true);
  });

  it("evaluates provider_requires condition", () => {
    // Register a provider with signed DPA
    db.prepare(
      `INSERT INTO provider_registry (id, name, provider_type, dpa_status, data_location, active)
       VALUES ('hetzner', 'Hetzner', 'hosting', 'signed', 'DE', 1)`,
    ).run();

    const fw = createInlineFramework(
      { id: "test", name: "Test", version: "1.0", description: "Test" },
      [
        {
          id: "test.provider_dpa",
          description: "DPA required",
          severity: "block",
          condition: { type: "provider_requires", requirement: "dpa_signed" },
          action: { type: "deny", message: "No DPA" },
        },
      ],
    );

    // With valid provider
    const r1 = evaluate(
      [fw],
      { action: "transfer", provider_id: "hetzner", fields: {} },
      db,
    );
    expect(r1.allowed).toBe(true);

    // With unknown provider
    const r2 = evaluate(
      [fw],
      { action: "transfer", provider_id: "unknown", fields: {} },
      db,
    );
    expect(r2.allowed).toBe(false);
  });

  it("always_deny condition always fails", () => {
    const fw = createInlineFramework(
      { id: "test", name: "Test", version: "1.0", description: "Test" },
      [
        {
          id: "test.deny",
          description: "Always denied",
          severity: "block",
          condition: { type: "always_deny" },
          action: { type: "deny", message: "Denied" },
        },
      ],
    );

    const result = evaluate([fw], { action: "x", fields: {} }, db);
    expect(result.allowed).toBe(false);
  });

  it("separates warnings from blocks", () => {
    const fw = createInlineFramework(
      { id: "test", name: "Test", version: "1.0", description: "Test" },
      [
        {
          id: "test.block",
          description: "Must have consent",
          severity: "block",
          condition: { type: "requires_field", field: "consent" },
          action: { type: "deny", message: "No consent" },
        },
        {
          id: "test.warn",
          description: "Should have purpose",
          severity: "warn",
          condition: { type: "requires_field", field: "purpose" },
          action: { type: "warn", message: "No purpose" },
        },
      ],
    );

    const result = evaluate([fw], { action: "x", fields: {} }, db);
    expect(result.allowed).toBe(false);
    expect(result.blocked_by).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });
});
