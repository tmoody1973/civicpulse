#!/usr/bin/env tsx
/**
 * Test fetching enhanced bill data: cosponsors, actions, amendments
 */

import { 
  fetchBillCosponsors, 
  fetchBillActions, 
  fetchBillAmendments 
} from '../lib/api/congress';

async function testBill(congress: number, billType: string, billNumber: number) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📄 Testing: ${billType.toUpperCase()} ${billNumber} (Congress ${congress})`);
  console.log('='.repeat(70));
  
  // Test 1: Cosponsors
  console.log('\n👥 COSPONSORS (Who else supports this bill?)');
  console.log('-'.repeat(70));
  
  const cosponsors = await fetchBillCosponsors(congress, billType, billNumber);
  
  if (cosponsors && cosponsors.length > 0) {
    console.log(`   ✅ Found ${cosponsors.length} cosponsors\n`);
    
    // Show first 5
    cosponsors.slice(0, 5).forEach((cosponsor, i) => {
      console.log(`   ${i + 1}. ${cosponsor.name} (${cosponsor.party}-${cosponsor.state})`);
      console.log(`      Joined: ${cosponsor.sponsorshipDate}`);
    });
    
    if (cosponsors.length > 5) {
      console.log(`   ... and ${cosponsors.length - 5} more`);
    }
    
    // Analyze bipartisan support
    const parties = cosponsors.reduce((acc, c) => {
      acc[c.party] = (acc[c.party] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n   📊 Party Breakdown:');
    Object.entries(parties).forEach(([party, count]) => {
      console.log(`      ${party}: ${count} cosponsors`);
    });
    
    const isBipartisan = Object.keys(parties).length > 1;
    if (isBipartisan) {
      console.log('\n   ✨ BIPARTISAN SUPPORT - Has support from multiple parties!');
    }
  } else {
    console.log('   ℹ️  No cosponsors yet (or data not available)');
  }
  
  // Test 2: Actions (Legislative History)
  console.log('\n\n📜 ACTIONS (What happened to this bill?)');
  console.log('-'.repeat(70));
  
  const actions = await fetchBillActions(congress, billType, billNumber);
  
  if (actions && actions.length > 0) {
    console.log(`   ✅ Found ${actions.length} actions (legislative history)\n`);
    
    // Show most recent 5 actions
    actions.slice(0, 5).forEach((action, i) => {
      console.log(`   ${action.actionDate}: ${action.text.substring(0, 80)}...`);
      if (action.type) console.log(`      Type: ${action.type}`);
    });
    
    if (actions.length > 5) {
      console.log(`\n   ... and ${actions.length - 5} earlier actions`);
    }
    
    // Check if bill has progressed
    const hasPassedHouse = actions.some(a => 
      a.text.toLowerCase().includes('passed house') || 
      a.text.toLowerCase().includes('passed/agreed to in house')
    );
    const hasPassedSenate = actions.some(a => 
      a.text.toLowerCase().includes('passed senate') ||
      a.text.toLowerCase().includes('passed/agreed to in senate')
    );
    
    console.log('\n   📊 Bill Progress:');
    if (hasPassedHouse) console.log('      ✅ Passed House');
    if (hasPassedSenate) console.log('      ✅ Passed Senate');
    if (hasPassedHouse && hasPassedSenate) {
      console.log('\n      🎉 MAJOR PROGRESS - Passed both chambers!');
    }
  } else {
    console.log('   ℹ️  No actions recorded yet');
  }
  
  // Test 3: Amendments
  console.log('\n\n✏️  AMENDMENTS (Proposed changes to this bill)');
  console.log('-'.repeat(70));
  
  const amendments = await fetchBillAmendments(congress, billType, billNumber);
  
  if (amendments && amendments.length > 0) {
    console.log(`   ✅ Found ${amendments.length} amendments\n`);
    
    amendments.slice(0, 3).forEach((amendment, i) => {
      console.log(`   ${i + 1}. Amendment ${amendment.number} (${amendment.type})`);
      if (amendment.purpose) {
        console.log(`      Purpose: ${amendment.purpose.substring(0, 100)}...`);
      }
      console.log(`      Latest: ${amendment.latestActionText}`);
      console.log('');
    });
    
    if (amendments.length > 3) {
      console.log(`   ... and ${amendments.length - 3} more amendments`);
    }
  } else {
    console.log('   ℹ️  No amendments (bill might be new or straightforward)');
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
}

async function main() {
  console.log('\n🧪 TESTING ENHANCED BILL DATA FETCHING\n');
  console.log('We\'ll test with HR 3076 from Congress 117 (known to have lots of data)\n');
  
  // Wait 1 second between requests (respect rate limit)
  await testBill(117, 'hr', 3076);
  
  console.log('⏱️  Waiting 3 seconds (rate limit)...\n');
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('Now testing a bill from current Congress 119...\n');
  await testBill(119, 's', 1462); // Fix Our Forests Act
  
  console.log('\n✅ Testing complete!\n');
  console.log('💡 What this data enables:');
  console.log('   • Bipartisan support indicators (cosponsor party breakdown)');
  console.log('   • Bill progress tracking (which chamber, what stage)');
  console.log('   • Amendment activity (how much debate/refinement)');
  console.log('   • Timeline visualization (when things happened)');
  console.log('   • Ranking by support level (more cosponsors = more support)\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
