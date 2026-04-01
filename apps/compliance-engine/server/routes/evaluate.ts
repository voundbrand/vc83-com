import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { API_PREFIX } from "../lib/constants.js";
import { ValidationError } from "../lib/errors.js";
import type { Framework, EvaluationContext } from "../engine/types.js";
import { evaluate } from "../engine/evaluator.js";

interface EvaluateBody {
  action: string;
  subject_id?: string;
  actor?: string;
  provider_id?: string;
  fields?: Record<string, unknown>;
}

export function registerEvaluateRoutes(
  app: FastifyInstance,
  db: Database.Database,
  frameworks: Framework[],
): void {
  app.post<{ Body: EvaluateBody }>(
    `${API_PREFIX}/evaluate`,
    async (req) => {
      const { action, subject_id, actor, provider_id, fields } = req.body;

      if (!action) {
        throw new ValidationError("action is required");
      }

      const ctx: EvaluationContext = {
        action,
        subject_id,
        actor,
        provider_id,
        fields: fields ?? {},
      };

      const result = evaluate(frameworks, ctx, db);

      // Record evaluation in audit trail
      db.prepare(
        `INSERT INTO audit_events (id, event_type, actor, subject_id, action, outcome, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        "policy.evaluated",
        actor ?? "system",
        subject_id ?? null,
        action,
        result.allowed ? "allowed" : "denied",
        JSON.stringify({
          frameworks: frameworks.map((f) => f.meta.id),
          total_rules: result.results.length,
          blocked_count: result.blocked_by.length,
          warning_count: result.warnings.length,
        }),
      );

      return result;
    },
  );
}
