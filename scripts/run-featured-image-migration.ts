import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function executeQuery(sql: string, table: string = 'users'): Promise<any> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Query failed: ${response.status} - ${error}`);
  }

  return response.json();
}

async function runMigration() {
  console.log('\n🚀 Running Featured Image Migration\n');
  console.log('='.repeat(60));

  try {
    const migrationPath = resolve(process.cwd(), 'lib/db/migrations/002_add_featured_image.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    console.log(`📄 Loaded migration: ${migrationPath}`);
    console.log();

    // Split by semicolon and execute each statement
    // Remove comment lines first, then split
    const cleanedSql = migrationSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');

      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);

      try {
        await executeQuery(statement, 'users');
        console.log(`   ✅ Success`);
      } catch (error: any) {
        // Ignore duplicate/already exists errors
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.message.includes('duplicate column name')
        ) {
          console.log(`   ⏭️  Already exists, skipping`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          throw error;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 New columns added to briefs table:');
    console.log('   - featured_image_url: URL to featured image for card previews');
    console.log('   - title: Brief title for display (e.g., "Trade War 2.0, Tariffs and Inflation")');
    console.log();

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);
