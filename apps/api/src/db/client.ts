import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const migrationsDirectory = fileURLToPath(new URL('../../drizzle/', import.meta.url));

function listMigrationFiles(): string[] {
  return readdirSync(migrationsDirectory)
    .filter((fileName) => /^\d+_.*\.sql$/.test(fileName))
    .sort((left, right) => left.localeCompare(right));
}

export function createDatabase(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedMigrationRows = db
    .prepare('SELECT filename FROM schema_migrations ORDER BY filename')
    .all() as Array<{ filename: string }>;
  const appliedMigrations = new Set(appliedMigrationRows.map((row) => row.filename));
  const markMigrationApplied = db.prepare(
    'INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)'
  );

  for (const migrationFile of listMigrationFiles()) {
    if (appliedMigrations.has(migrationFile)) {
      continue;
    }

    const migrationPath = fileURLToPath(new URL(`../../drizzle/${migrationFile}`, import.meta.url));
    const sql = readFileSync(migrationPath, 'utf8');
    const appliedAt = new Date().toISOString();

    db.transaction(() => {
      db.exec(sql);
      markMigrationApplied.run(migrationFile, appliedAt);
    })();
  }

  return db;
}
