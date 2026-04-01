import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrations.js";
import { loadFrameworks } from "./engine/loader.js";
import { loadProviderKnowledge } from "./knowledge/matcher.js";
import { buildApp } from "./app.js";

const config = loadConfig();
const db = createDatabase(config.dbPath);
const migrated = runMigrations(db);

if (migrated > 0) {
  console.log(`Applied ${migrated} migration(s)`);
}

const frameworksDir = resolve(
  import.meta.dirname ?? new URL(".", import.meta.url).pathname,
  "..",
  "frameworks",
);
const frameworks = loadFrameworks(frameworksDir, config.frameworks);
console.log(
  `Loaded ${frameworks.length} framework(s): ${frameworks.map((f) => f.meta.id).join(", ") || "none"}`,
);

const knowledgeDir = resolve(
  import.meta.dirname ?? new URL(".", import.meta.url).pathname,
  "..",
  "knowledge",
);
const knowledge = loadProviderKnowledge(knowledgeDir);
console.log(
  `Loaded ${knowledge.length} provider knowledge record(s): ${knowledge.map((k) => k.id).join(", ") || "none"}`,
);

const app = buildApp({ db, config, frameworks, knowledge });

try {
  await app.listen({ host: config.host, port: config.port });
  console.log();
  console.log("  +---------------------------------------------------+");
  console.log("  |  Compliance Engine                                 |");
  console.log(`  |  Listening: ${`${config.host}:${config.port}`.padEnd(38)}|`);
  console.log(`  |  Database:  ${config.dbPath.padEnd(38)}|`);
  console.log(`  |  Frameworks: ${config.frameworks.join(", ").padEnd(37)}|`);
  console.log("  +---------------------------------------------------+");
  console.log();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown
const shutdown = () => {
  app.close();
  db.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
