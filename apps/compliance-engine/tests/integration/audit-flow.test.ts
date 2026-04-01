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

describe("Audit Trail", () => {
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

  it("records and queries audit events", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/audit",
      payload: {
        event_type: "agent.tool_call",
        actor: "agent-samantha",
        subject_id: "client-1",
        action: "search_calendar",
        resource: "calendar:client-1",
        outcome: "allowed",
        details: { tool: "calendar_search", query: "next appointment" },
      },
    });

    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload);
    expect(created.id).toBeDefined();
    expect(created.event_type).toBe("agent.tool_call");

    // Query by subject
    const queryRes = await app.inject({
      method: "GET",
      url: "/api/v1/audit?subject_id=client-1",
    });

    const result = JSON.parse(queryRes.payload);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].action).toBe("search_calendar");
    expect(result.events[0].details.tool).toBe("calendar_search");
    expect(result.total).toBe(1);
  });

  it("filters by event_type", async () => {
    // Create multiple events
    await app.inject({
      method: "POST",
      url: "/api/v1/audit",
      payload: {
        event_type: "agent.start",
        actor: "agent-1",
        action: "start_session",
      },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/audit",
      payload: {
        event_type: "agent.tool_call",
        actor: "agent-1",
        action: "use_tool",
      },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/audit",
      payload: {
        event_type: "agent.end",
        actor: "agent-1",
        action: "end_session",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit?event_type=agent.tool_call",
    });

    const result = JSON.parse(res.payload);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].action).toBe("use_tool");
  });

  it("filters by framework", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/audit",
      payload: {
        event_type: "policy.evaluated",
        actor: "engine",
        action: "evaluate",
        framework: "gdpr",
        rule_id: "gdpr.consent.required",
        outcome: "denied",
      },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/audit",
      payload: {
        event_type: "policy.evaluated",
        actor: "engine",
        action: "evaluate",
        framework: "stgb_203",
        rule_id: "stgb203.secrecy.check",
        outcome: "allowed",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit?framework=gdpr",
    });

    const result = JSON.parse(res.payload);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].rule_id).toBe("gdpr.consent.required");
  });

  it("supports pagination", async () => {
    // Create 5 events
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/api/v1/audit",
        payload: {
          event_type: "test.event",
          actor: "test",
          action: `action-${i}`,
        },
      });
    }

    const page1 = await app.inject({
      method: "GET",
      url: "/api/v1/audit?limit=2&offset=0",
    });
    const r1 = JSON.parse(page1.payload);
    expect(r1.events).toHaveLength(2);
    expect(r1.total).toBe(5);

    const page2 = await app.inject({
      method: "GET",
      url: "/api/v1/audit?limit=2&offset=2",
    });
    const r2 = JSON.parse(page2.payload);
    expect(r2.events).toHaveLength(2);
  });

  it("validates required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/audit",
      payload: {
        event_type: "test",
        // missing actor and action
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("handles events with no details gracefully", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/audit",
      payload: {
        event_type: "simple.event",
        actor: "system",
        action: "heartbeat",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit?event_type=simple.event",
    });

    const result = JSON.parse(res.payload);
    expect(result.events[0].details).toBeNull();
  });
});
