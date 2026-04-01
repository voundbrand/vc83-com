import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  description: string;
  up: string;
}

// Add future migrations here
const MIGRATIONS: Migration[] = [
  // { version: 2, description: "Add retention_class to evidence", up: "ALTER TABLE ..." },
];

export function runMigrations(db: Database.Database): number {
  const current = (
    db
      .prepare("SELECT MAX(version) as v FROM schema_version")
      .get() as { v: number | null }
  )?.v ?? 0;

  let applied = 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      db.exec(migration.up);
      db.prepare(
        "INSERT INTO schema_version (version, description) VALUES (?, ?)",
      ).run(migration.version, migration.description);
      applied++;
    }
  }

  return applied;
}
