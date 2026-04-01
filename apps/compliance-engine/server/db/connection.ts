import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SCHEMA_PATH = resolve(
  import.meta.dirname ?? new URL(".", import.meta.url).pathname,
  "schema.sql",
);

export function createDatabase(dbPath: string): Database.Database {
  // Ensure parent directory exists
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  // Enable WAL mode for concurrent reads
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  // Apply schema
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);

  // Record schema version if not exists
  const version = db
    .prepare("SELECT MAX(version) as v FROM schema_version")
    .get() as { v: number | null } | undefined;

  if (!version?.v) {
    db.prepare(
      "INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema')",
    ).run();
  }

  return db;
}

/** Create an in-memory database for testing */
export function createMemoryDatabase(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);

  db.prepare(
    "INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema')",
  ).run();

  return db;
}
