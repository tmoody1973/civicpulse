#!/usr/bin/env tsx
/**
 * Test Script for Daily Brief Generation
 *
 * Tests the key components of the brief generation system:
 * - Database schema validation
 * - Bill prioritization query
 * - User preferences retrieval
 * - Check existing brief logic
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

interface QueryResult {
  rows: any[];
  rowCount?: number;
}

async function executeQuery(sql: string, table: string = 'default'): Promise<QueryResult> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, query: sql }),
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.status} - ${await response.text()}`);
  }

  return response.json();
}

async function testDatabaseSchema() {
  console.log('\n📋 Test 1: Database Schema Validation\n');
  console.log('=' .repeat(60));

  try {
    // Check if briefs table exists
    const result = await executeQuery(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='briefs'`,
      'briefs'
    );

    if (result.rows && result.rows.length > 0) {
      console.log('✅ Briefs table exists');

      // Get table schema
      const schema = await executeQuery(`PRAGMA table_info(briefs)`, 'briefs');
      console.log(`✅ Briefs table has ${schema.rows?.length || 0} columns:`);
      schema.rows?.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
    } else {
      console.log('❌ Briefs table does NOT exist');
      console.log('💡 Run the migration: npx tsx scripts/run-migrations.ts');
    }
  } catch (error) {
    console.error('❌ Schema test failed:', error);
  }
}

async function testUserPreferences() {
  console.log('\n👤 Test 2: User Preferences Retrieval\n');
  console.log('=' .repeat(60));

  try {
    // Get first user from database
    const usersResult = await executeQuery(
      `SELECT id, email, interests FROM users LIMIT 1`,
      'users'
    );

    if (!usersResult.rows || usersResult.rows.length === 0) {
      console.log('⚠️  No users in database - skipping user preferences test');
      return;
    }

    const user = usersResult.rows[0];
    console.log(`✅ Found user: ${user.email} (${user.id})`);

    if (user.interests) {
      const interests = JSON.parse(user.interests);
      console.log(`✅ User interests (${interests.length}):`, interests);

      if (interests.length === 0) {
        console.log('⚠️  User has no interests set - they would get an error in brief generation');
      } else if (interests.length >= 5) {
        console.log(`✅ User has ${interests.length} interests - will test multi-interest logic`);
      }
    } else {
      console.log('❌ User has no interests field set');
    }
  } catch (error) {
    console.error('❌ User preferences test failed:', error);
  }
}

async function testBillPrioritization() {
  console.log('\n📜 Test 3: Bill Prioritization Query\n');
  console.log('=' .repeat(60));

  try {
    // Test the smart prioritization query with a sample policy area
    const policyAreas = ['Health', 'Healthcare'];
    const policyFilters = policyAreas.map(area => `policy_area = '${area}' OR ai_policy_area = '${area}'`).join(' OR ');

    const query = `
      SELECT
        id, bill_type, bill_number, title, status,
        policy_area, ai_policy_area, impact_score,
        latest_action_date,
        CASE
          WHEN status = 'enacted' THEN 1000
          WHEN status = 'passed_senate' OR status = 'passed_house' THEN 500
          WHEN status = 'in_committee' THEN 100
          ELSE 50
        END + impact_score + (JULIANDAY('now') - JULIANDAY(latest_action_date)) * -1 as priority_score
      FROM bills
      WHERE (${policyFilters})
        AND congress = 119
        AND latest_action_date >= DATE('now', '-30 days')
      ORDER BY priority_score DESC
      LIMIT 5
    `;

    console.log('🔍 Testing priority query for policy areas:', policyAreas.join(', '));

    const result = await executeQuery(query, 'bills');

    if (result.rows && result.rows.length > 0) {
      console.log(`✅ Found ${result.rows.length} prioritized bills:\n`);

      result.rows.forEach((bill, idx) => {
        console.log(`${idx + 1}. ${bill.bill_type.toUpperCase()} ${bill.bill_number}: ${bill.title.substring(0, 60)}...`);
        console.log(`   Status: ${bill.status}`);
        console.log(`   Policy Area: ${bill.policy_area || bill.ai_policy_area || 'None'}`);
        console.log(`   Impact Score: ${bill.impact_score}/100`);
        console.log(`   Priority Score: ${Math.round(bill.priority_score)}`);
        console.log(`   Last Action: ${bill.latest_action_date}`);
        console.log();
      });
    } else {
      console.log('❌ No bills found matching the criteria');
      console.log('💡 This could mean:');
      console.log('   - No bills in the database for these policy areas');
      console.log('   - No bills with recent activity (last 30 days)');
      console.log('   - Database might be empty');
    }
  } catch (error) {
    console.error('❌ Bill prioritization test failed:', error);
  }
}

async function testCheckExistingBrief() {
  console.log('\n🔎 Test 4: Check Existing Brief Logic\n');
  console.log('=' .repeat(60));

  try {
    // Get first user
    const usersResult = await executeQuery(
      `SELECT id FROM users LIMIT 1`,
      'users'
    );

    if (!usersResult.rows || usersResult.rows.length === 0) {
      console.log('⚠️  No users in database - skipping existing brief test');
      return;
    }

    const userId = usersResult.rows[0].id;

    // Check if user has a brief today
    const briefResult = await executeQuery(
      `SELECT * FROM briefs
       WHERE user_id = '${userId}' AND type = 'daily'
       AND DATE(generated_at) = DATE('now')
       ORDER BY generated_at DESC
       LIMIT 1`,
      'briefs'
    );

    if (briefResult.rows && briefResult.rows.length > 0) {
      const brief = briefResult.rows[0];
      console.log(`✅ User already has a brief today!`);
      console.log(`   Brief ID: ${brief.id}`);
      console.log(`   Generated: ${brief.generated_at}`);
      console.log(`   Duration: ${brief.duration}s`);
      console.log(`   Audio URL: ${brief.audio_url}`);
    } else {
      console.log('✅ No existing brief for today - user would generate a new one');
    }

    // Check total briefs for user
    const totalResult = await executeQuery(
      `SELECT COUNT(*) as count FROM briefs WHERE user_id = '${userId}'`,
      'briefs'
    );

    if (totalResult.rows && totalResult.rows.length > 0) {
      console.log(`✅ User has ${totalResult.rows[0].count} total briefs in history`);
    }
  } catch (error) {
    console.error('❌ Existing brief test failed:', error);
  }
}

async function testDatabaseStats() {
  console.log('\n📊 Test 5: Database Statistics\n');
  console.log('=' .repeat(60));

  try {
    // Count bills
    const billsResult = await executeQuery(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN policy_area IS NOT NULL THEN 1 END) as with_policy,
        COUNT(CASE WHEN ai_policy_area IS NOT NULL THEN 1 END) as with_ai_policy
      FROM bills
      WHERE congress = 119`,
      'bills'
    );

    if (billsResult.rows && billsResult.rows.length > 0) {
      const stats = billsResult.rows[0];
      console.log(`✅ Bills (Congress 119):`);
      console.log(`   Total: ${stats.total}`);
      console.log(`   With Official Policy Area: ${stats.with_policy} (${Math.round(stats.with_policy / stats.total * 100)}%)`);
      console.log(`   With AI-Inferred Policy Area: ${stats.with_ai_policy} (${Math.round(stats.with_ai_policy / stats.total * 100)}%)`);
    }

    // Count users
    const usersResult = await executeQuery(
      `SELECT COUNT(*) as count FROM users`,
      'users'
    );

    if (usersResult.rows && usersResult.rows.length > 0) {
      console.log(`✅ Total users: ${usersResult.rows[0].count}`);
    }

    // Count briefs
    const briefsResult = await executeQuery(
      `SELECT COUNT(*) as count FROM briefs`,
      'briefs'
    );

    if (briefsResult.rows && briefsResult.rows.length > 0) {
      console.log(`✅ Total briefs generated: ${briefsResult.rows[0].count}`);
    }
  } catch (error) {
    console.error('❌ Database stats test failed:', error);
  }
}

async function main() {
  console.log('\n🧪 Daily Brief Generation - Test Suite');
  console.log('='.repeat(60));
  console.log(`Testing against: ${RAINDROP_SERVICE_URL}`);
  console.log('='.repeat(60));

  try {
    await testDatabaseSchema();
    await testUserPreferences();
    await testBillPrioritization();
    await testCheckExistingBrief();
    await testDatabaseStats();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('   1. If briefs table doesn\'t exist: Run migrations');
    console.log('   2. Test full API: curl -X POST http://localhost:3000/api/briefs/generate-daily');
    console.log('   3. Monitor for errors in dev server logs');
    console.log();
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
