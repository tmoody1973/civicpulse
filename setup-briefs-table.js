#!/usr/bin/env node
/**
 * Setup Briefs Table in Raindrop SmartSQL
 *
 * Creates the 'briefs' table in the correct namespace to store generated daily briefs.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL || 'http://localhost:8787';

async function executeQuery(sql, table = 'default') {
  const requestBody = {
    table,
    query: sql
  };

  console.log(`🔍 Executing SQL query on table '${table}':`, sql.substring(0, 100) + '...');

  // Dynamic import of https module
  const https = await import('https');

  // Create HTTPS agent that bypasses SSL verification in development
  const httpsAgent = process.env.NODE_ENV === 'development'
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  return new Promise((resolve, reject) => {
    const url = new URL(`${RAINDROP_SERVICE_URL}/api/admin/query`);
    const postData = JSON.stringify(requestBody);

    const options = {
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

async function setupBriefsTable() {
  try {
    console.log('📋 Setting up briefs table in Raindrop SmartSQL...');

    // Check if table exists
    console.log('\n1️⃣ Checking existing tables...');
    const existingTables = await executeQuery(
      "SELECT name FROM sqlite_master WHERE type='table'",
      'users'
    );
    console.log('   Found tables:', existingTables.rows);

    // Create the briefs table
    console.log('\n2️⃣ Creating briefs table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS briefs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        audio_url TEXT NOT NULL,
        duration INTEGER NOT NULL,
        transcript TEXT,
        bills_covered TEXT,
        written_digest TEXT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await executeQuery(createTableSQL, 'users');
    console.log('   ✅ Briefs table created successfully');

    // Create an index on user_id for faster queries
    console.log('\n3️⃣ Creating index on user_id...');
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_briefs_user_id ON briefs(user_id)
    `;

    await executeQuery(createIndexSQL, 'users');
    console.log('   ✅ Index created successfully');

    // Verify table was created
    console.log('\n4️⃣ Verifying table creation...');
    const verifyTables = await executeQuery(
      "SELECT name FROM sqlite_master WHERE type='table'",
      'users'
    );
    console.log('   Tables in users namespace:', verifyTables.rows);

    // Check table schema
    console.log('\n5️⃣ Checking table schema...');
    const schemaResult = await executeQuery(
      "PRAGMA table_info(briefs)",
      'users'
    );
    console.log('   Briefs table schema:');
    schemaResult.rows.forEach((col) => {
      console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''}`);
    });

    console.log('\n✅ Briefs table setup complete!');
    console.log('📊 You can now generate briefs and they will be saved to this table.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupBriefsTable();
