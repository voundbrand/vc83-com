import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createMemoryDatabase } from "../../server/db/connection.js";
import { buildApp } from "../../server/app.js";
import type { Config } from "../../server/config.js";

function makeTestApp(): { app: FastifyInstance; cleanup: () => void } {
  const db = createMemoryDatabase();
  const config: Config = {
    host: "127.0.0.1",
    port: 0,
    dbPath: ":memory:",
    vaultPath: "/tmp/compliance-test-vault",
    encryptionKey: undefined,
    frameworks: ["gdpr"],
    logLevel: "silent",
  };

  const app = buildApp({ db, config });
  return {
    app,
    cleanup: () => {
      app.close();
      db.close();
    },
  };
}

describe("Compliance Engine Server", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("GET /healthz returns ok", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("GET /readyz returns ready with schema version", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.status).toBe("ready");
    expect(body.schemaVersion).toBe(1);
  });

  it("unknown routes return 404", async () => {
    const { app, cleanup: c } = makeTestApp();
    cleanup = c;

    const res = await app.inject({ method: "GET", url: "/nonexistent" });
    expect(res.statusCode).toBe(404);
  });
});
