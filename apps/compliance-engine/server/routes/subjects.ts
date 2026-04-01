import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { API_PREFIX } from "../lib/constants.js";
import { ValidationError, NotFoundError } from "../lib/errors.js";

interface SubjectBody {
  external_id?: string;
  pseudonym: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export function registerSubjectRoutes(
  app: FastifyInstance,
  db: Database.Database,
): void {
  // Register a data subject
  app.post<{ Body: SubjectBody }>(
    `${API_PREFIX}/subjects`,
    async (req, reply) => {
      const { external_id, pseudonym, category, metadata } = req.body;

      if (!pseudonym) {
        throw new ValidationError("pseudonym is required");
      }

      const id = randomUUID();

      db.prepare(
        `INSERT INTO data_subjects (id, external_id, pseudonym, category, metadata)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        id,
        external_id ?? null,
        pseudonym,
        category ?? "client",
        metadata ? JSON.stringify(metadata) : null,
      );

      reply.code(201);
      return { id, pseudonym, category: category ?? "client" };
    },
  );

  // Get data subject info
  app.get<{ Params: { id: string } }>(
    `${API_PREFIX}/subjects/:id`,
    async (req) => {
      const row = db
        .prepare("SELECT * FROM data_subjects WHERE id = ?")
        .get(req.params.id) as Record<string, unknown> | undefined;

      if (!row) {
        throw new NotFoundError("data_subject", req.params.id);
      }

      return {
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      };
    },
  );

  // Art 17 — Right to erasure
  app.delete<{ Params: { id: string } }>(
    `${API_PREFIX}/subjects/:id`,
    async (req) => {
      const { id } = req.params;
      const subject = db
        .prepare("SELECT * FROM data_subjects WHERE id = ?")
        .get(id) as Record<string, unknown> | undefined;

      if (!subject) {
        throw new NotFoundError("data_subject", id);
      }

      // Mark as erased (soft delete — we need to keep the record for audit)
      db.prepare(
        "UPDATE data_subjects SET erased_at = datetime('now'), metadata = NULL WHERE id = ?",
      ).run(id);

      // Delete consent records for this subject
      db.prepare("DELETE FROM consent_records WHERE subject_id = ?").run(id);

      // Audit the erasure
      db.prepare(
        `INSERT INTO audit_events (id, event_type, actor, subject_id, action, outcome, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        "subject.erased",
        "system",
        id,
        "erase_subject",
        "completed",
        JSON.stringify({
          pseudonym: subject.pseudonym,
          article: "GDPR Art 17",
        }),
      );

      return {
        status: "erased",
        subject_id: id,
        erased_at: new Date().toISOString(),
      };
    },
  );

  // Art 20 — Right to data portability (export)
  app.get<{ Params: { id: string } }>(
    `${API_PREFIX}/subjects/:id/export`,
    async (req) => {
      const { id } = req.params;
      const subject = db
        .prepare("SELECT * FROM data_subjects WHERE id = ?")
        .get(id) as Record<string, unknown> | undefined;

      if (!subject) {
        throw new NotFoundError("data_subject", id);
      }

      // Collect all data associated with this subject
      const consentRecords = db
        .prepare("SELECT * FROM consent_records WHERE subject_id = ?")
        .all(id) as Record<string, unknown>[];

      const auditEvents = db
        .prepare("SELECT * FROM audit_events WHERE subject_id = ?")
        .all(id) as Record<string, unknown>[];

      // Audit the export
      db.prepare(
        `INSERT INTO audit_events (id, event_type, actor, subject_id, action, outcome, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        "subject.exported",
        "system",
        id,
        "export_subject",
        "completed",
        JSON.stringify({ article: "GDPR Art 20" }),
      );

      return {
        subject: {
          ...subject,
          metadata: subject.metadata
            ? JSON.parse(subject.metadata as string)
            : null,
        },
        consent_records: consentRecords.map((r) => ({
          ...r,
          granted: r.granted === 1,
          metadata: r.metadata ? JSON.parse(r.metadata as string) : null,
        })),
        audit_events: auditEvents.map((r) => ({
          ...r,
          details: r.details ? JSON.parse(r.details as string) : null,
        })),
        exported_at: new Date().toISOString(),
        format: "application/json",
        article: "GDPR Art 20",
      };
    },
  );
}
