import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";

export function registerHealthRoutes(
  app: FastifyInstance,
  db: Database.Database,
): void {
  app.get("/healthz", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/readyz", async (_req, reply) => {
    try {
      const row = db
        .prepare("SELECT MAX(version) as v FROM schema_version")
        .get() as { v: number | null } | undefined;

      if (!row?.v) {
        reply.code(503);
        return { status: "not_ready", reason: "database not initialized" };
      }

      return {
        status: "ready",
        schemaVersion: row.v,
        timestamp: new Date().toISOString(),
      };
    } catch {
      reply.code(503);
      return { status: "not_ready", reason: "database unreachable" };
    }
  });
}
