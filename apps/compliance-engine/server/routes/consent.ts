import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { API_PREFIX } from "../lib/constants.js";
import { ValidationError, NotFoundError } from "../lib/errors.js";

interface ConsentBody {
  subject_id: string;
  consent_type: string;
  granted: boolean;
  legal_basis: string;
  purpose: string;
  policy_version?: string;
  source?: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

interface ConsentQuery {
  subject_id?: string;
  consent_type?: string;
  limit?: string;
  offset?: string;
}

export function registerConsentRoutes(
  app: FastifyInstance,
  db: Database.Database,
): void {
  // Record a consent decision
  app.post<{ Body: ConsentBody }>(
    `${API_PREFIX}/consent`,
    async (req, reply) => {
      const {
        subject_id,
        consent_type,
        granted,
        legal_basis,
        purpose,
        policy_version,
        source,
        expires_at,
        metadata,
      } = req.body;

      if (!subject_id || !consent_type || !legal_basis || !purpose) {
        throw new ValidationError(
          "subject_id, consent_type, legal_basis, and purpose are required",
        );
      }

      if (typeof granted !== "boolean") {
        throw new ValidationError("granted must be a boolean");
      }

      const id = randomUUID();

      db.prepare(
        `INSERT INTO consent_records
         (id, subject_id, consent_type, granted, legal_basis, purpose, policy_version, source, expires_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        subject_id,
        consent_type,
        granted ? 1 : 0,
        legal_basis,
        purpose,
        policy_version ?? "1.0",
        source ?? "api",
        expires_at ?? null,
        metadata ? JSON.stringify(metadata) : null,
      );

      // Emit audit event for consent change
      db.prepare(
        `INSERT INTO audit_events (id, event_type, actor, subject_id, action, resource, outcome, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        granted ? "consent.granted" : "consent.revoked",
        source ?? "api",
        subject_id,
        granted ? "grant_consent" : "revoke_consent",
        `consent:${consent_type}`,
        "recorded",
        JSON.stringify({ consent_id: id, legal_basis, purpose }),
      );

      reply.code(201);
      return {
        id,
        subject_id,
        consent_type,
        granted,
        legal_basis,
        purpose,
        recorded_at: new Date().toISOString(),
      };
    },
  );

  // Query consent records
  app.get<{ Querystring: ConsentQuery }>(
    `${API_PREFIX}/consent`,
    async (req) => {
      const { subject_id, consent_type, limit, offset } = req.query;

      let sql = "SELECT * FROM consent_records WHERE 1=1";
      const params: unknown[] = [];

      if (subject_id) {
        sql += " AND subject_id = ?";
        params.push(subject_id);
      }
      if (consent_type) {
        sql += " AND consent_type = ?";
        params.push(consent_type);
      }

      sql += " ORDER BY recorded_at DESC";
      sql += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit) || 100);
      params.push(Number(offset) || 0);

      const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

      return {
        records: rows.map((r) => ({
          ...r,
          granted: r.granted === 1,
          metadata: r.metadata ? JSON.parse(r.metadata as string) : null,
        })),
        count: rows.length,
      };
    },
  );

  // Check consent status (quick boolean check for agent tools)
  app.get<{ Querystring: { subject_id: string; consent_type: string } }>(
    `${API_PREFIX}/consent/check`,
    async (req) => {
      const { subject_id, consent_type } = req.query;

      if (!subject_id || !consent_type) {
        throw new ValidationError(
          "subject_id and consent_type are required",
        );
      }

      // Get most recent consent decision for this subject+type
      // Use rowid as tiebreaker when multiple records share the same timestamp
      const row = db
        .prepare(
          `SELECT granted, legal_basis, expires_at, recorded_at
           FROM consent_records
           WHERE subject_id = ? AND consent_type = ?
           ORDER BY recorded_at DESC, rowid DESC
           LIMIT 1`,
        )
        .get(subject_id, consent_type) as {
        granted: number;
        legal_basis: string;
        expires_at: string | null;
        recorded_at: string;
      } | undefined;

      if (!row) {
        return {
          has_consent: false,
          reason: "no_record",
        };
      }

      // Check expiry
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return {
          has_consent: false,
          reason: "expired",
          expired_at: row.expires_at,
        };
      }

      return {
        has_consent: row.granted === 1,
        legal_basis: row.legal_basis,
        recorded_at: row.recorded_at,
        reason: row.granted === 1 ? "active_consent" : "consent_revoked",
      };
    },
  );
}
