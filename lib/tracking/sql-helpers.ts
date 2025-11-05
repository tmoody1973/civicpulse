/**
 * SQL Helper Functions
 *
 * SmartSQL doesn't support parameterized queries (no parameters field),
 * so we need to safely embed values in SQL strings.
 */

/**
 * Escape a string for safe SQL embedding
 * Prevents SQL injection by doubling single quotes
 */
export function escapeSqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  // Escape single quotes by doubling them
  const escaped = String(value).replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Format a value for SQL embedding based on type
 */
export function formatSqlValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'string') {
    return escapeSqlString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return escapeSqlString(value.toISOString());
  }

  // For objects/arrays, convert to JSON string
  if (typeof value === 'object') {
    return escapeSqlString(JSON.stringify(value));
  }

  return escapeSqlString(String(value));
}

/**
 * Build a safe SQL INSERT statement
 */
export function buildInsertQuery(
  table: string,
  columns: string[],
  values: any[]
): string {
  const columnList = columns.join(', ');
  const valueList = values.map(formatSqlValue).join(', ');
  return `INSERT INTO ${table} (${columnList}) VALUES (${valueList})`;
}

/**
 * Build a safe SQL UPDATE statement
 */
export function buildUpdateQuery(
  table: string,
  updates: Record<string, any>,
  whereClause: string
): string {
  const setClause = Object.entries(updates)
    .map(([key, value]) => `${key} = ${formatSqlValue(value)}`)
    .join(', ');
  return `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
}
