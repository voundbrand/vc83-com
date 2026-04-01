import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { API_PREFIX } from "../lib/constants.js";
import { ValidationError } from "../lib/errors.js";

interface AuditBody {
  event_type: string;
  actor: string;
  subject_id?: string;
  action: string;
  resource?: string;
  outcome?: string;
  framework?: string;
  rule_id?: string;
  details?: Record<string, unknown>;
}

interface AuditQuery {
  subject_id?: string;
  event_type?: string;
  actor?: string;
  framework?: string;
  from?: string;
  to?: string;
  limit?: string;
  offset?: string;
}

export function registerAuditRoutes(
  app: FastifyInstance,
  db: Database.Database,
): void {
  // Append an audit event
  app.post<{ Body: AuditBody }>(
    `${API_PREFIX}/audit`,
    async (req, reply) => {
      const {
        event_type,
        actor,
        subject_id,
        action,
        resource,
        outcome,
        framework,
        rule_id,
        details,
      } = req.body;

      if (!event_type || !actor || !action) {
        throw new ValidationError(
          "event_type, actor, and action are required",
        );
      }

      const id = randomUUID();

      db.prepare(
        `INSERT INTO audit_events
         (id, event_type, actor, subject_id, action, resource, outcome, framework, rule_id, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        event_type,
        actor,
        subject_id ?? null,
        action,
        resource ?? null,
        outcome ?? "recorded",
        framework ?? null,
        rule_id ?? null,
        details ? JSON.stringify(details) : null,
      );

      reply.code(201);
      return {
        id,
        event_type,
        actor,
        action,
        recorded_at: new Date().toISOString(),
      };
    },
  );

  // Query audit events
  app.get<{ Querystring: AuditQuery }>(
    `${API_PREFIX}/audit`,
    async (req) => {
      const {
        subject_id,
        event_type,
        actor,
        framework,
        from,
        to,
        limit,
        offset,
      } = req.query;

      let sql = "SELECT * FROM audit_events WHERE 1=1";
      const params: unknown[] = [];

      if (subject_id) {
        sql += " AND subject_id = ?";
        params.push(subject_id);
      }
      if (event_type) {
        sql += " AND event_type = ?";
        params.push(event_type);
      }
      if (actor) {
        sql += " AND actor = ?";
        params.push(actor);
      }
      if (framework) {
        sql += " AND framework = ?";
        params.push(framework);
      }
      if (from) {
        sql += " AND recorded_at >= ?";
        params.push(from);
      }
      if (to) {
        sql += " AND recorded_at <= ?";
        params.push(to);
      }

      sql += " ORDER BY recorded_at DESC";
      sql += " LIMIT ? OFFSET ?";
      params.push(Number(limit) || 100);
      params.push(Number(offset) || 0);

      const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

      // Count total (for pagination)
      let countSql = "SELECT COUNT(*) as total FROM audit_events WHERE 1=1";
      const countParams: unknown[] = [];
      if (subject_id) {
        countSql += " AND subject_id = ?";
        countParams.push(subject_id);
      }
      if (event_type) {
        countSql += " AND event_type = ?";
        countParams.push(event_type);
      }
      if (actor) {
        countSql += " AND actor = ?";
        countParams.push(actor);
      }
      if (framework) {
        countSql += " AND framework = ?";
        countParams.push(framework);
      }
      if (from) {
        countSql += " AND recorded_at >= ?";
        countParams.push(from);
      }
      if (to) {
        countSql += " AND recorded_at <= ?";
        countParams.push(to);
      }

      const countRow = db.prepare(countSql).get(...countParams) as {
        total: number;
      };

      return {
        events: rows.map((r) => ({
          ...r,
          details: r.details ? JSON.parse(r.details as string) : null,
        })),
        count: rows.length,
        total: countRow.total,
      };
    },
  );
}
