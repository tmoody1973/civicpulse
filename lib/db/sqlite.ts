/**
 * SQLite Database Helper
 *
 * Provides access to the Civic Pulse SQLite database.
 * Supports both local SQLite (development) and Turso (production).
 *
 * Environment Detection:
 * - Turso: TURSO_DATABASE_URL starts with "libsql://"
 * - Local: Falls back to better-sqlite3
 */

import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';

type TursoClient = ReturnType<typeof createClient>;
type LocalClient = Database.Database;

/**
 * Detect if we're using Turso or local SQLite
 */
function isTurso(): boolean {
  const url = process.env.TURSO_DATABASE_URL;
  return !!url && url.startsWith('libsql://');
}

/**
 * Get Turso client (production)
 */
function getTursoClient(): TursoClient {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set for production');
  }

  console.log(`[Database] Connecting to Turso: ${url}`);

  return createClient({
    url,
    authToken,
  });
}

/**
 * Get local SQLite client (development)
 */
function getLocalClient(): LocalClient {
  const dbPath = process.env.RAINDROP_SQL_URL || path.join(process.cwd(), 'civic-db.sqlite');

  console.log(`[Database] Connecting to local SQLite: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Enable WAL mode for better concurrency

  return db;
}

/**
 * Execute query with automatic connection handling
 * Returns array of rows
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (isTurso()) {
    const client = getTursoClient();
    const result = await client.execute({
      sql,
      args: params,
    });
    return result.rows as T[];
  } else {
    const db = getLocalClient();
    try {
      const stmt = db.prepare(sql);
      const results = stmt.all(...params) as T[];
      return results;
    } finally {
      db.close();
    }
  }
}

/**
 * Execute single row query
 * Returns single row or null
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  if (isTurso()) {
    const client = getTursoClient();
    const result = await client.execute({
      sql,
      args: params,
    });
    return (result.rows[0] as T) || null;
  } else {
    const db = getLocalClient();
    try {
      const stmt = db.prepare(sql);
      const result = stmt.get(...params) as T | undefined;
      return result || null;
    } finally {
      db.close();
    }
  }
}

/**
 * Execute INSERT/UPDATE/DELETE
 * Returns execution result with changes count
 */
export async function execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
  if (isTurso()) {
    const client = getTursoClient();
    const result = await client.execute({
      sql,
      args: params,
    });
    return { changes: result.rowsAffected };
  } else {
    const db = getLocalClient();
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return { changes: result.changes };
    } finally {
      db.close();
    }
  }
}
