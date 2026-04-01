import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { API_PREFIX } from "../lib/constants.js";
import { ValidationError, NotFoundError } from "../lib/errors.js";
import type { Vault } from "../vault/vault.js";

interface EvidenceUploadBody {
  title: string;
  artifact_type: string;
  data: string; // base64-encoded
  mime_type?: string;
  provider_id?: string;
  uploaded_by?: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

interface EvidenceQuery {
  artifact_type?: string;
  provider_id?: string;
  limit?: string;
  offset?: string;
}

export function registerEvidenceRoutes(
  app: FastifyInstance,
  db: Database.Database,
  vault: Vault,
): void {
  // Upload evidence artifact
  app.post<{ Body: EvidenceUploadBody }>(
    `${API_PREFIX}/evidence`,
    async (req, reply) => {
      const {
        title,
        artifact_type,
        data,
        mime_type,
        provider_id,
        uploaded_by,
        expires_at,
        metadata,
      } = req.body;

      if (!title || !artifact_type || !data) {
        throw new ValidationError(
          "title, artifact_type, and data are required",
        );
      }

      // Decode base64 data
      const buffer = Buffer.from(data, "base64");

      // Store in vault
      const entry = vault.store(buffer);

      // Record metadata in DB
      const id = randomUUID();
      db.prepare(
        `INSERT INTO evidence_artifacts
         (id, title, artifact_type, file_path, file_hash, mime_type, size_bytes, provider_id, uploaded_by, expires_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        title,
        artifact_type,
        entry.filePath,
        entry.fileHash,
        mime_type ?? null,
        entry.sizeBytes,
        provider_id ?? null,
        uploaded_by ?? "system",
        expires_at ?? null,
        metadata ? JSON.stringify(metadata) : null,
      );

      // Audit the upload
      db.prepare(
        `INSERT INTO audit_events (id, event_type, actor, action, resource, outcome, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        "evidence.uploaded",
        uploaded_by ?? "system",
        "upload_evidence",
        `evidence:${id}`,
        "recorded",
        JSON.stringify({
          title,
          artifact_type,
          file_hash: entry.fileHash,
          encrypted: entry.encrypted,
        }),
      );

      reply.code(201);
      return {
        id,
        title,
        artifact_type,
        file_hash: entry.fileHash,
        size_bytes: entry.sizeBytes,
        encrypted: entry.encrypted,
        recorded_at: new Date().toISOString(),
      };
    },
  );

  // List evidence artifacts
  app.get<{ Querystring: EvidenceQuery }>(
    `${API_PREFIX}/evidence`,
    async (req) => {
      const { artifact_type, provider_id, limit, offset } = req.query;

      let sql = "SELECT * FROM evidence_artifacts WHERE 1=1";
      const params: unknown[] = [];

      if (artifact_type) {
        sql += " AND artifact_type = ?";
        params.push(artifact_type);
      }
      if (provider_id) {
        sql += " AND provider_id = ?";
        params.push(provider_id);
      }

      sql += " ORDER BY recorded_at DESC";
      sql += " LIMIT ? OFFSET ?";
      params.push(Number(limit) || 100);
      params.push(Number(offset) || 0);

      const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

      return {
        artifacts: rows.map((r) => ({
          ...r,
          metadata: r.metadata ? JSON.parse(r.metadata as string) : null,
        })),
        count: rows.length,
      };
    },
  );

  // Get single evidence artifact metadata
  app.get<{ Params: { id: string } }>(
    `${API_PREFIX}/evidence/:id`,
    async (req) => {
      const row = db
        .prepare("SELECT * FROM evidence_artifacts WHERE id = ?")
        .get(req.params.id) as Record<string, unknown> | undefined;

      if (!row) {
        throw new NotFoundError("evidence_artifact", req.params.id);
      }

      return {
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      };
    },
  );
}
