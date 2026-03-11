import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

export function createDatabase(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  const migrationPath = fileURLToPath(new URL('../../drizzle/0000_initial.sql', import.meta.url));
  db.exec(readFileSync(migrationPath, 'utf8'));
  return db;
}
