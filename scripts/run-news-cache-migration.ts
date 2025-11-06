/**
 * Migration Script: Create personalized_news_cache table
 *
 * Run with: npx tsx scripts/run-news-cache-migration.ts
 */

import { executeQuery } from '../lib/db/client';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🚀 Starting personalized news cache migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '..',
      'lib',
      'db',
      'migrations',
      '001_create_personalized_news_cache.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`📄 Read migration file: ${migrationPath}`);
    console.log(`📏 SQL length: ${sqlContent.length} characters\n`);

    // Split into individual statements
    // Remove all comment lines first
    const cleanedSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + '...\n');

      try {
        // Use 'users' as the database context (like other tables in the project)
        await executeQuery(statement + ';', 'users');
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      } catch (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error);
        console.error('Continuing with remaining statements...\n');
      }
    }

    console.log('✅ Migration complete!');
    console.log('\nYou can now test the personalized news endpoint:\n');
    console.log('  GET http://localhost:3000/api/news/personalized\n');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigration();
