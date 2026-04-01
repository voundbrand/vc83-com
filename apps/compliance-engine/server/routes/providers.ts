import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { API_PREFIX } from "../lib/constants.js";
import { ValidationError, NotFoundError } from "../lib/errors.js";

interface ProviderBody {
  name: string;
  provider_type: string;
  dpa_status?: string;
  data_location?: string;
  transfer_mechanism?: string;
  tom_status?: string;
  dpa_signed_at?: string;
  dpa_expires_at?: string;
  metadata?: Record<string, unknown>;
}

interface ProviderPatchBody {
  dpa_status?: string;
  data_location?: string;
  transfer_mechanism?: string;
  tom_status?: string;
  active?: boolean;
  dpa_signed_at?: string;
  dpa_expires_at?: string;
  metadata?: Record<string, unknown>;
}

interface ProviderQuery {
  dpa_status?: string;
  provider_type?: string;
  active?: string;
  limit?: string;
  offset?: string;
}

export function registerProviderRoutes(
  app: FastifyInstance,
  db: Database.Database,
): void {
  // Register a provider
  app.post<{ Body: ProviderBody }>(
    `${API_PREFIX}/providers`,
    async (req, reply) => {
      const {
        name,
        provider_type,
        dpa_status,
        data_location,
        transfer_mechanism,
        tom_status,
        dpa_signed_at,
        dpa_expires_at,
        metadata,
      } = req.body;

      if (!name || !provider_type) {
        throw new ValidationError("name and provider_type are required");
      }

      const id = randomUUID();

      db.prepare(
        `INSERT INTO provider_registry
         (id, name, provider_type, dpa_status, data_location, transfer_mechanism, tom_status, dpa_signed_at, dpa_expires_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        name,
        provider_type,
        dpa_status ?? "missing",
        data_location ?? null,
        transfer_mechanism ?? null,
        tom_status ?? "unknown",
        dpa_signed_at ?? null,
        dpa_expires_at ?? null,
        metadata ? JSON.stringify(metadata) : null,
      );

      // Audit
      db.prepare(
        `INSERT INTO audit_events (id, event_type, actor, action, resource, outcome, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        "provider.registered",
        "system",
        "register_provider",
        `provider:${id}`,
        "recorded",
        JSON.stringify({ name, provider_type, dpa_status: dpa_status ?? "missing" }),
      );

      reply.code(201);
      return { id, name, provider_type, dpa_status: dpa_status ?? "missing" };
    },
  );

  // List providers
  app.get<{ Querystring: ProviderQuery }>(
    `${API_PREFIX}/providers`,
    async (req) => {
      const { dpa_status, provider_type, active, limit, offset } = req.query;

      let sql = "SELECT * FROM provider_registry WHERE 1=1";
      const params: unknown[] = [];

      if (dpa_status) {
        sql += " AND dpa_status = ?";
        params.push(dpa_status);
      }
      if (provider_type) {
        sql += " AND provider_type = ?";
        params.push(provider_type);
      }
      if (active !== undefined) {
        sql += " AND active = ?";
        params.push(active === "true" ? 1 : 0);
      }

      sql += " ORDER BY registered_at DESC";
      sql += " LIMIT ? OFFSET ?";
      params.push(Number(limit) || 100);
      params.push(Number(offset) || 0);

      const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

      return {
        providers: rows.map((r) => ({
          ...r,
          active: r.active === 1,
          metadata: r.metadata ? JSON.parse(r.metadata as string) : null,
        })),
        count: rows.length,
      };
    },
  );

  // Update provider
  app.patch<{ Params: { id: string }; Body: ProviderPatchBody }>(
    `${API_PREFIX}/providers/:id`,
    async (req) => {
      const { id } = req.params;
      const existing = db
        .prepare("SELECT * FROM provider_registry WHERE id = ?")
        .get(id);

      if (!existing) {
        throw new NotFoundError("provider", id);
      }

      const updates: string[] = [];
      const params: unknown[] = [];

      const fields: Array<[keyof ProviderPatchBody, string]> = [
        ["dpa_status", "dpa_status"],
        ["data_location", "data_location"],
        ["transfer_mechanism", "transfer_mechanism"],
        ["tom_status", "tom_status"],
        ["dpa_signed_at", "dpa_signed_at"],
        ["dpa_expires_at", "dpa_expires_at"],
      ];

      for (const [bodyKey, dbCol] of fields) {
        if (req.body[bodyKey] !== undefined) {
          updates.push(`${dbCol} = ?`);
          params.push(req.body[bodyKey]);
        }
      }

      if (req.body.active !== undefined) {
        updates.push("active = ?");
        params.push(req.body.active ? 1 : 0);
      }

      if (req.body.metadata !== undefined) {
        updates.push("metadata = ?");
        params.push(JSON.stringify(req.body.metadata));
      }

      if (updates.length === 0) {
        throw new ValidationError("No fields to update");
      }

      params.push(id);
      db.prepare(
        `UPDATE provider_registry SET ${updates.join(", ")} WHERE id = ?`,
      ).run(...params);

      const updated = db
        .prepare("SELECT * FROM provider_registry WHERE id = ?")
        .get(id) as Record<string, unknown>;

      return {
        ...updated,
        active: updated.active === 1,
        metadata: updated.metadata
          ? JSON.parse(updated.metadata as string)
          : null,
      };
    },
  );
}
