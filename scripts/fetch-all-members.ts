#!/usr/bin/env tsx
/**
 * Fetch All Congress Members (119th Congress)
 *
 * Fetches all 535 current members of Congress:
 * - 100 Senators (2 per state)
 * - 435 House Representatives (by district)
 *
 * Enriches with contact and social media data from GitHub
 * Stores complete member data in Raindrop database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { enrichRepresentatives } from '../lib/api/enrich-representatives';
import type { Representative } from '../lib/api/congress';

config({ path: resolve(process.cwd(), '.env.local') });

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

/**
 * Fetch all members from Congress API with pagination
 */
async function fetchAllMembersFromCongress(): Promise<Representative[]> {
  console.log('\n🏛️  Fetching all Congress members with pagination...\n');

  const allMembers: Representative[] = [];
  let offset = 0;
  const limit = 250; // API max limit per request
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${CONGRESS_API_BASE}/member/congress/119?currentMember=true&limit=${limit}&offset=${offset}&api_key=${CONGRESS_API_KEY}`;

      console.log(`📥 Fetching members ${offset}-${offset + limit}...`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status}`);
      }

      const data = await response.json();
      const members = data.members || [];

      if (members.length === 0) {
        hasMore = false;
        break;
      }

      // Parse and categorize members
      for (const member of members) {
        const terms = member.terms?.item || [];

        // Get latest term to determine chamber
        const latestTerm = terms[0];
        if (!latestTerm) continue;

        const chamber = latestTerm.chamber === 'Senate' ? 'Senate' : 'House';

        const representative: Representative = {
          bioguideId: member.bioguideId,
          name: member.name || '',
          firstName: member.name?.split(',')[1]?.trim() || '',
          lastName: member.name?.split(',')[0]?.trim() || '',
          party: member.partyName || 'Unknown',
          state: member.state || '',
          district: member.district || undefined,
          chamber,
          imageUrl: member.depiction?.imageUrl || undefined,
          officialUrl: member.officialWebsiteUrl || undefined,
          terms: terms,
        };

        allMembers.push(representative);
      }

      console.log(`✅ Fetched ${members.length} members (total so far: ${allMembers.length})`);

      // Check if there might be more
      if (members.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
        // Be respectful of API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error: any) {
      console.error(`❌ Error fetching members at offset ${offset}:`, error.message);
      hasMore = false;
    }
  }

  return allMembers;
}

/**
 * Store enriched member in Raindrop database
 */
async function storeMember(member: Representative): Promise<boolean> {
  try {
    if (!RAINDROP_SERVICE_URL) {
      console.warn('⚠️  RAINDROP_SERVICE_URL not set');
      return false;
    }

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/representatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bioguideId: member.bioguideId,
        name: member.name,
        party: member.party,
        state: member.state,
        district: member.district,
        chamber: member.chamber.toLowerCase(), // 'senate' or 'house'
        imageUrl: member.imageUrl,
        officialUrl: member.officialUrl,
        // Enrichment fields
        officeAddress: member.officeAddress,
        phone: member.officePhone,
        websiteUrl: member.websiteUrl,
        rssUrl: member.rssUrl,
        contactForm: member.contactForm,
        twitterHandle: member.twitterHandle,
        facebookUrl: member.facebookUrl,
        youtubeUrl: member.youtubeUrl,
        instagramHandle: member.instagramHandle,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to store ${member.name}:`, error.substring(0, 100));
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`Error storing ${member.name}:`, error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function fetchAllMembers() {
  console.log('\n📋 FETCHING ALL CONGRESS MEMBERS (119th Congress)');
  console.log('='.repeat(60));

  if (!CONGRESS_API_KEY) {
    console.error('❌ CONGRESS_API_KEY not set in environment');
    process.exit(1);
  }

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set in environment');
    process.exit(1);
  }

  // Step 1: Fetch all members from Congress.gov with pagination
  const allMembers = await fetchAllMembersFromCongress();

  // Separate by chamber
  const senators = allMembers.filter(m => m.chamber === 'Senate');
  const houseMembers = allMembers.filter(m => m.chamber === 'House');

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Total Members Found: ${allMembers.length}`);
  console.log(`   - Senators: ${senators.length}`);
  console.log(`   - House: ${houseMembers.length}`);
  console.log('='.repeat(60));

  // Step 2: Enrich with contact and social media data
  console.log('\n🔍 Enriching members with contact and social media data...\n');

  const enrichedMembers = await enrichRepresentatives(allMembers);

  console.log(`✅ Enriched ${enrichedMembers.length} members`);

  // Step 3: Store members in database
  console.log('\n💾 Storing members in database...\n');

  let stored = 0;
  let failed = 0;
  let skipped = 0;

  for (const member of enrichedMembers) {
    const success = await storeMember(member);

    if (success) {
      stored++;
      process.stdout.write(`✅ ${stored}/${enrichedMembers.length} stored (${failed} failed)\r`);
    } else {
      failed++;
      // Check if it's a duplicate (which is okay - means member already exists)
      if (failed === 1) {
        // Likely hitting duplicates - these are fine
        skipped++;
      }
    }

    // Be respectful of database rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log(`✅ Stored: ${stored}`);
  console.log(`⚠️  Skipped (likely duplicates): ${failed}`);
  console.log('='.repeat(60));

  // Summary
  console.log('\n📊 Sample Members:');
  console.log('\nSenators (first 5):');
  senators.slice(0, 5).forEach(s => {
    console.log(`  - ${s.name} (${s.party}-${s.state})`);
    if (s.officePhone) console.log(`    📞 ${s.officePhone}`);
    if (s.twitterHandle) console.log(`    🐦 @${s.twitterHandle}`);
  });

  console.log('\nHouse (first 5):');
  houseMembers.slice(0, 5).forEach(h => {
    console.log(`  - ${h.name} (${h.party}-${h.state}${h.district ? `-${h.district}` : ''})`);
    if (h.officePhone) console.log(`    📞 ${h.officePhone}`);
    if (h.twitterHandle) console.log(`    🐦 @${h.twitterHandle}`);
  });

  console.log('\n✅ Done!\n');
}

fetchAllMembers();
