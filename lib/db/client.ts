/**
 * Raindrop Database Client
 *
 * Centralized database client for executing SQL queries against Raindrop SmartSQL.
 * Handles SSL certificate issues in development mode using dynamic import of native Node.js HTTPS.
 */

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL || 'http://localhost:8787';

interface QueryResult {
  rows: any[];
  rowCount?: number;
}

/**
 * Execute a SQL query against the Raindrop database using native Node.js HTTPS with dynamic import
 */
export async function executeQuery(
  sql: string,
  table: string = 'default'
): Promise<QueryResult> {
  if (!RAINDROP_SERVICE_URL) {
    throw new Error('RAINDROP_SERVICE_URL not configured');
  }

  const requestBody = {
    table,
    query: sql
  };

  console.log(`🔍 Executing SQL query on table '${table}':`, sql.substring(0, 100) + '...');

  // Dynamic import of https module to avoid Edge Runtime issues
  const https = await import('https');

  // Create HTTPS agent that bypasses SSL verification in development
  const httpsAgent = process.env.NODE_ENV === 'development'
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  return new Promise((resolve, reject) => {
    const url = new URL(`${RAINDROP_SERVICE_URL}/api/admin/query`);
    const postData = JSON.stringify(requestBody);

    const options: any = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    // Add agent if in development
    if (httpsAgent) {
      options.agent = httpsAgent;
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            console.log(`✅ Query succeeded, returned ${result.rows?.length || 0} rows`);
            resolve({
              rows: result.rows || [],
              rowCount: result.rows?.length || 0,
            });
          } catch (error) {
            console.error('❌ Failed to parse response:', error);
            reject(error);
          }
        } else {
          console.error(`❌ Database query failed: ${res.statusCode}`, data);
          reject(new Error(`Database error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Database connection error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Insert or update a record
 */
export async function upsert(
  table: string,
  data: Record<string, any>
): Promise<void> {
  const columns = Object.keys(data);
  const values = Object.values(data);

  const placeholders = values.map(v => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
    return `'${String(v).replace(/'/g, "''")}'`;
  });

  const sql = `
    INSERT OR REPLACE INTO ${table} (
      ${columns.join(', ')}
    ) VALUES (
      ${placeholders.join(', ')}
    )
  `;

  await executeQuery(sql, table);
}

/**
 * Select records from a table
 */
export async function select(
  table: string,
  where?: string,
  orderBy?: string,
  limit?: number
): Promise<any[]> {
  let sql = `SELECT * FROM ${table}`;

  if (where) sql += ` WHERE ${where}`;
  if (orderBy) sql += ` ORDER BY ${orderBy}`;
  if (limit) sql += ` LIMIT ${limit}`;

  const result = await executeQuery(sql, table);
  return result.rows;
}

/**
 * Count records in a table
 */
export async function count(table: string, where?: string): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM ${table}`;
  if (where) sql += ` WHERE ${where}`;

  const result = await executeQuery(sql, table);
  return result.rows[0]?.count || 0;
}
