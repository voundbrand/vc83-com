import Fastify, { type FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import type { Config } from "./config.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerConsentRoutes } from "./routes/consent.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { registerEvaluateRoutes } from "./routes/evaluate.js";
import { registerPiiRoutes } from "./routes/pii.js";
import { registerEvidenceRoutes } from "./routes/evidence.js";
import { registerProviderRoutes } from "./routes/providers.js";
import { registerSubjectRoutes } from "./routes/subjects.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerGovernanceRoutes } from "./routes/governance.js";
import { ComplianceError } from "./lib/errors.js";
import { Vault } from "./vault/vault.js";
import type { Framework } from "./engine/types.js";
import type { ProviderKnowledge } from "./knowledge/types.js";

export interface AppDeps {
  db: Database.Database;
  config: Config;
  frameworks?: Framework[];
  knowledge?: ProviderKnowledge[];
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: {
      level: deps.config.logLevel,
    },
  });

  // Global error handler
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ComplianceError) {
      reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
      return;
    }

    app.log.error(error);
    reply.code(500).send({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  });

  // Health routes (no prefix)
  registerHealthRoutes(app, deps.db);

  // API routes
  registerConsentRoutes(app, deps.db);
  registerAuditRoutes(app, deps.db);
  registerEvaluateRoutes(app, deps.db, deps.frameworks ?? []);
  registerPiiRoutes(app);

  const vault = new Vault(deps.config.vaultPath, deps.config.encryptionKey);
  registerEvidenceRoutes(app, deps.db, vault);
  registerProviderRoutes(app, deps.db);
  registerSubjectRoutes(app, deps.db);
  registerReportRoutes(app, deps.db, deps.frameworks ?? []);
  registerGovernanceRoutes(
    app,
    deps.db,
    deps.frameworks ?? [],
    deps.knowledge ?? [],
  );

  return app;
}
