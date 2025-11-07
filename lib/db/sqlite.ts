/**
 * SQLite Database Helper
 *
 * Provides access to the Civic Pulse SQLite database.
 * Used for podcast job queue and other persistent data.
 */

import Database from 'better-sqlite3';
import path from 'path';

/**
 * Get database connection
 *
 * Uses RAINDROP_SQL_URL env var if available, otherwise falls back to local file.
 */
export function getDatabase(): Database.Database {
  const dbPath = process.env.RAINDROP_SQL_URL || path.join(process.cwd(), 'civic-db.sqlite');

  console.log(`[Database] Connecting to: ${dbPath}`);

  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  return db;
}

/**
 * Execute query with automatic connection handling
 */
export function query<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDatabase();

  try {
    const stmt = db.prepare(sql);
    const results = stmt.all(...params) as T[];
    return results;
  } finally {
    db.close();
  }
}

/**
 * Execute single row query
 */
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const db = getDatabase();

  try {
    const stmt = db.prepare(sql);
    const result = stmt.get(...params) as T | undefined;
    return result || null;
  } finally {
    db.close();
  }
}

/**
 * Execute INSERT/UPDATE/DELETE
 */
export function execute(sql: string, params: any[] = []): Database.RunResult {
  const db = getDatabase();

  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return result;
  } finally {
    db.close();
  }
}
