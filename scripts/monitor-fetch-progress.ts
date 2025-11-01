#!/usr/bin/env tsx
/**
 * Monitor 119th Congress Fetch Progress
 * 
 * Shows real-time statistics about the ongoing fetch operation
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

interface Progress {
  lastProcessed: string;
  totalFetched: number;
  timestamp: string;
}

function loadProgress(): Progress | null {
  try {
    const data = readFileSync('./progress/fetch-119-progress.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function getDatabaseStats() {
  try {
    // Get total count
    const countResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: 'SELECT COUNT(*) as count FROM bills WHERE congress = 119'
      })
    });

    if (!countResponse.ok) return null;
    
    const countData = await countResponse.json();
    const total = countData.rows?.[0]?.count || 0;

    // Get full text count
    const fullTextResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: 'SELECT COUNT(*) as count FROM bills WHERE congress = 119 AND full_text IS NOT NULL AND full_text != \'\''
      })
    });

    const fullTextData = await fullTextResponse.json();
    const withFullText = fullTextData.rows?.[0]?.count || 0;

    // Get policy area count
    const policyResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: 'SELECT COUNT(*) as count FROM bills WHERE congress = 119 AND policy_area IS NOT NULL'
      })
    });

    const policyData = await policyResponse.json();
    const withPolicy = policyData.rows?.[0]?.count || 0;

    // Get top sponsors
    const sponsorsResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `
          SELECT sponsor_name, COUNT(*) as count 
          FROM bills 
          WHERE congress = 119 AND sponsor_name IS NOT NULL
          GROUP BY sponsor_name 
          ORDER BY count DESC 
          LIMIT 5
        `
      })
    });

    const sponsorsData = await sponsorsResponse.json();
    const topSponsors = sponsorsData.rows || [];

    // Get top policy areas
    const areasResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `
          SELECT policy_area, COUNT(*) as count 
          FROM bills 
          WHERE congress = 119 AND policy_area IS NOT NULL
          GROUP BY policy_area 
          ORDER BY count DESC 
          LIMIT 5
        `
      })
    });

    const areasData = await areasResponse.json();
    const topAreas = areasData.rows || [];

    return {
      total,
      withFullText,
      withPolicy,
      fullTextPercentage: total > 0 ? Math.round((withFullText / total) * 100) : 0,
      policyPercentage: total > 0 ? Math.round((withPolicy / total) * 100) : 0,
      topSponsors,
      topAreas
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

async function displayStats() {
  console.clear();
  console.log('📊 119th Congress Fetch Progress Monitor');
  console.log('='.repeat(60));
  console.log(`⏰ Last updated: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));
  console.log();

  // Load progress file
  const progress = loadProgress();
  
  if (!progress) {
    console.log('⚠️  No progress file found. Fetch may not have started yet.');
    return;
  }

  console.log('📝 Progress File:');
  console.log(`   Last processed: ${progress.lastProcessed}`);
  console.log(`   Total fetched: ${progress.totalFetched}`);
  console.log(`   Last update: ${new Date(progress.timestamp).toLocaleString()}`);
  console.log();

  // Get database stats
  const stats = await getDatabaseStats();
  
  if (!stats) {
    console.log('⚠️  Could not fetch database statistics');
    return;
  }

  console.log('📊 Database Statistics:');
  console.log(`   Total bills: ${stats.total}`);
  console.log(`   With full text: ${stats.withFullText} (${stats.fullTextPercentage}%)`);
  console.log(`   With policy area: ${stats.withPolicy} (${stats.policyPercentage}%)`);
  console.log();

  // Estimated total bills for 119th Congress
  const ESTIMATED_TOTAL = 5858; // HR bills
  const percentComplete = Math.round((stats.total / ESTIMATED_TOTAL) * 100);
  const remaining = ESTIMATED_TOTAL - stats.total;
  
  console.log('📈 Fetch Progress:');
  console.log(`   Progress: ${stats.total}/${ESTIMATED_TOTAL} (${percentComplete}%)`);
  console.log(`   Remaining: ~${remaining} bills`);
  
  // Calculate estimated time remaining (assuming 4 seconds per bill)
  const estimatedSecondsRemaining = remaining * 4;
  const estimatedMinutes = Math.round(estimatedSecondsRemaining / 60);
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMinutes = estimatedMinutes % 60;
  
  if (estimatedHours > 0) {
    console.log(`   Estimated time: ~${estimatedHours}h ${remainingMinutes}m remaining`);
  } else {
    console.log(`   Estimated time: ~${remainingMinutes}m remaining`);
  }
  console.log();

  // Progress bar
  const barWidth = 50;
  const filled = Math.round((stats.total / ESTIMATED_TOTAL) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
  console.log(`   [${bar}] ${percentComplete}%`);
  console.log();

  if (stats.topSponsors.length > 0) {
    console.log('👥 Top Sponsors:');
    stats.topSponsors.forEach((s: any, i: number) => {
      console.log(`   ${i + 1}. ${s.sponsor_name} (${s.count} bills)`);
    });
    console.log();
  }

  if (stats.topAreas.length > 0) {
    console.log('📋 Top Policy Areas:');
    stats.topAreas.forEach((a: any, i: number) => {
      console.log(`   ${i + 1}. ${a.policy_area} (${a.count} bills)`);
    });
    console.log();
  }

  console.log('='.repeat(60));
  console.log('Press Ctrl+C to exit | Refreshes every 30 seconds');
  console.log('='.repeat(60));
}

async function main() {
  // Display once immediately
  await displayStats();

  // Then refresh every 30 seconds
  setInterval(async () => {
    await displayStats();
  }, 30000);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
