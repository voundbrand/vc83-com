import { describe, it, expect, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../../../server/db/connection.js";
import { runMigrations } from "../../../server/db/migrations.js";

describe("runMigrations", () => {
  let db: Database.Database;

  afterEach(() => {
    db?.open && db.close();
  });

  it("returns 0 when no pending migrations", () => {
    db = createMemoryDatabase();
    const applied = runMigrations(db);
    expect(applied).toBe(0);
  });

  it("schema_version table starts at version 1", () => {
    db = createMemoryDatabase();
    runMigrations(db);

    const row = db
      .prepare("SELECT MAX(version) as v FROM schema_version")
      .get() as { v: number };

    expect(row.v).toBe(1);
  });
});
