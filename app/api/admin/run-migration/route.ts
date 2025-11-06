/**
 * Database Migration Runner
 *
 * Executes SQL migrations on Raindrop SmartSQL
 * Auth: Requires ADMIN_SECRET for security
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Get SQL client using Raindrop SmartSQL
 * Since we don't have direct SDK access in this context,
 * we'll write a simple wrapper that could be replaced with actual SDK
 */
async function getSqlClient() {
  const RAINDROP_SQL_URL = process.env.RAINDROP_SERVICE_URL;

  if (!RAINDROP_SQL_URL) {
    throw new Error('RAINDROP_SERVICE_URL not configured');
  }

  return {
    async query(sql: string) {
      // For now, we'll use a direct SQL execution approach
      // In production, this should use the Raindrop SDK
      const response = await fetch(RAINDROP_SQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql,
          database: 'hakivo-personalized-news'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SQL execution failed: ${error}`);
      }

      return await response.json();
    }
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    const adminSecret = process.env.ADMIN_SECRET || 'dev-admin-secret';

    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get migration file path from request
    const { migrationFile } = await req.json();

    if (!migrationFile) {
      return NextResponse.json(
        { error: 'Migration file name required' },
        { status: 400 }
      );
    }

    // 3. Read migration file
    const migrationPath = path.join(
      process.cwd(),
      'lib',
      'db',
      'migrations',
      migrationFile
    );

    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json(
        { error: `Migration file not found: ${migrationFile}` },
        { status: 404 }
      );
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`📄 Read migration: ${migrationFile}`);
    console.log(`SQL length: ${sqlContent.length} characters`);

    // 4. Split SQL into individual statements (by semicolons)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // 5. Execute each statement
    const sql = await getSqlClient();
    const results = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + '...');

      try {
        const result = await sql.query(statement);
        results.push({
          statement: i + 1,
          success: true,
          result
        });
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error);
        results.push({
          statement: i + 1,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Continue with remaining statements (CREATE IF NOT EXISTS should be safe)
      }
    }

    // 6. Return summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Migration complete: ${successCount} succeeded, ${failCount} failed`);

    return NextResponse.json({
      success: failCount === 0,
      message: `Migration ${migrationFile} executed`,
      stats: {
        total: statements.length,
        succeeded: successCount,
        failed: failCount
      },
      results
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - List available migrations
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const adminSecret = process.env.ADMIN_SECRET || 'dev-admin-secret';

    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const migrationsDir = path.join(process.cwd(), 'lib', 'db', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      return NextResponse.json({
        migrations: [],
        message: 'No migrations directory found'
      });
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return NextResponse.json({
      migrations: files,
      count: files.length
    });

  } catch (error) {
    console.error('Error listing migrations:', error);
    return NextResponse.json(
      {
        error: 'Failed to list migrations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
