#!/usr/bin/env node
/**
 * Create News Articles Table in Raindrop SmartSQL
 *
 * Creates the 'news_articles' table to store personalized news articles with image metadata.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { executeQuery } from './lib/db/client';

async function createNewsArticlesTable() {
  try {
    console.log('📰 Creating news_articles table in Raindrop SmartSQL...');

    // Check if table exists
    console.log('\n1️⃣ Checking existing tables...');
    const existingTables = await executeQuery(
      "SELECT name FROM sqlite_master WHERE type='table'",
      'users'
    );
    console.log('   Found tables:', existingTables.rows);

    // Create the news_articles table
    console.log('\n2️⃣ Creating news_articles table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS news_articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        summary TEXT,
        source TEXT,
        published_date TEXT,
        relevant_topics TEXT,
        image_url TEXT,
        image_alt TEXT,
        image_photographer TEXT,
        image_photographer_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await executeQuery(createTableSQL, 'users');
    console.log('   ✅ News articles table created successfully');

    // Create index on relevant_topics for filtering
    console.log('\n3️⃣ Creating index on relevant_topics...');
    const createTopicsIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_news_articles_topics
      ON news_articles(relevant_topics)
    `;

    await executeQuery(createTopicsIndexSQL, 'users');
    console.log('   ✅ Topics index created successfully');

    // Create index on created_at for sorting
    console.log('\n4️⃣ Creating index on created_at...');
    const createCreatedIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_news_articles_created
      ON news_articles(created_at DESC)
    `;

    await executeQuery(createCreatedIndexSQL, 'users');
    console.log('   ✅ Created_at index created successfully');

    // Verify table was created
    console.log('\n5️⃣ Verifying table creation...');
    const verifyTables = await executeQuery(
      "SELECT name FROM sqlite_master WHERE type='table'",
      'users'
    );
    console.log('   Tables in users namespace:', verifyTables.rows);

    // Check table schema
    console.log('\n6️⃣ Checking table schema...');
    const schemaResult = await executeQuery(
      "PRAGMA table_info(news_articles)",
      'users'
    );
    console.log('   News articles table schema:');
    schemaResult.rows.forEach((col: any) => {
      console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''}`);
    });

    console.log('\n✅ News articles table setup complete!');
    console.log('📊 Personalized news articles can now be cached with images.');

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

createNewsArticlesTable();
