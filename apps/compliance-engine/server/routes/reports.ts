import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { API_PREFIX } from "../lib/constants.js";
import type { Framework } from "../engine/types.js";

export function registerReportRoutes(
  app: FastifyInstance,
  db: Database.Database,
  frameworks: Framework[],
): void {
  app.get(`${API_PREFIX}/reports/summary`, async () => {
    // Consent stats
    const consentTotal = (
      db.prepare("SELECT COUNT(*) as c FROM consent_records").get() as {
        c: number;
      }
    ).c;
    const consentGranted = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM consent_records WHERE granted = 1",
        )
        .get() as { c: number }
    ).c;

    // Audit stats
    const auditTotal = (
      db.prepare("SELECT COUNT(*) as c FROM audit_events").get() as {
        c: number;
      }
    ).c;
    const auditDenied = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM audit_events WHERE outcome = 'denied'",
        )
        .get() as { c: number }
    ).c;

    // Provider stats
    const providerTotal = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM provider_registry WHERE active = 1",
        )
        .get() as { c: number }
    ).c;
    const providerDpaSigned = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM provider_registry WHERE active = 1 AND dpa_status = 'signed'",
        )
        .get() as { c: number }
    ).c;
    const providerDpaMissing = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM provider_registry WHERE active = 1 AND dpa_status = 'missing'",
        )
        .get() as { c: number }
    ).c;

    // Subject stats
    const subjectTotal = (
      db.prepare("SELECT COUNT(*) as c FROM data_subjects").get() as {
        c: number;
      }
    ).c;
    const subjectErased = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM data_subjects WHERE erased_at IS NOT NULL",
        )
        .get() as { c: number }
    ).c;

    // Evidence stats
    const evidenceTotal = (
      db.prepare("SELECT COUNT(*) as c FROM evidence_artifacts").get() as {
        c: number;
      }
    ).c;

    // Compute posture score (simple weighted formula)
    const dpaScore =
      providerTotal > 0 ? providerDpaSigned / providerTotal : 1;
    const consentScore =
      consentTotal > 0 ? consentGranted / consentTotal : 0;
    const posture = Math.round(
      (dpaScore * 0.4 + consentScore * 0.3 + (evidenceTotal > 0 ? 0.3 : 0)) *
        100,
    );

    return {
      posture_score: posture,
      frameworks: frameworks.map((f) => ({
        id: f.meta.id,
        name: f.meta.name,
        version: f.meta.version,
        rule_count: f.rules.length,
      })),
      consent: {
        total: consentTotal,
        granted: consentGranted,
        revoked: consentTotal - consentGranted,
      },
      audit: {
        total: auditTotal,
        denied: auditDenied,
      },
      providers: {
        total: providerTotal,
        dpa_signed: providerDpaSigned,
        dpa_missing: providerDpaMissing,
      },
      subjects: {
        total: subjectTotal,
        erased: subjectErased,
      },
      evidence: {
        total: evidenceTotal,
      },
      generated_at: new Date().toISOString(),
    };
  });
}
