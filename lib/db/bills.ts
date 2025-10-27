/**
 * SmartSQL Bill Storage Utilities
 *
 * Stores complete bill data in Raindrop SmartSQL database
 * This is the source of truth for bill data (Algolia is for search only)
 */

import type { EnhancedBill } from '../api/congress-enhanced';

const BACKEND_URL = process.env.RAINDROP_SERVICE_URL;

if (!BACKEND_URL) {
  console.warn('RAINDROP_SERVICE_URL not set - database operations will fail');
}

/**
 * Execute SQL query via Raindrop service /api/bills endpoint
 * The Raindrop service handles SmartSQL via env.CIVIC_DB binding
 */
async function executeSql(sql: string, params: any[] = []): Promise<any> {
  if (!BACKEND_URL) {
    throw new Error('RAINDROP_SERVICE_URL not configured');
  }

  // Use the admin/query endpoint which accepts raw SQL
  const response = await fetch(`${BACKEND_URL}/api/admin/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      table: 'bills',
      query: sql
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Database error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return { rows: result.rows || [] };
}

/**
 * Store or update an enhanced bill in SmartSQL
 * This is the complete bill record with all metadata
 */
export async function storeBillInDatabase(bill: EnhancedBill): Promise<void> {
  const sql = `
    INSERT OR REPLACE INTO bills (
      id, congress, bill_type, bill_number, title, summary, full_text,
      sponsor_bioguide_id, sponsor_name, sponsor_party, sponsor_state,
      introduced_date, latest_action_date, latest_action_text, status,
      issue_categories, impact_score, cosponsor_count, cosponsors,
      congress_url, synced_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;

  const params = [
    bill.id,
    bill.congress,
    bill.billType,
    bill.billNumber,
    bill.title,
    bill.summary || null,
    null, // full_text (optional, for offline access)

    bill.sponsorBioguideId || null,
    bill.sponsorName || null,
    bill.sponsorParty || null,
    bill.sponsorState || null,

    bill.introducedDate,
    bill.latestActionDate,
    bill.latestActionText,
    bill.status,

    JSON.stringify(bill.issueCategories),
    bill.impactScore,
    bill.cosponsors?.count || 0,
    JSON.stringify(bill.cosponsors),

    `https://www.congress.gov/bill/${bill.congress}th-congress/${bill.billType}/${bill.billNumber}`,
  ];

  try {
    await executeSql(sql, params);
    console.log(`💾 Stored bill ${bill.id} in database`);
  } catch (error) {
    console.error(`❌ Failed to store bill ${bill.id}:`, error);
    throw error;
  }
}

/**
 * Store multiple bills in batch
 */
export async function storeBillsBatch(bills: EnhancedBill[]): Promise<number> {
  console.log(`💾 Storing ${bills.length} bills in SmartSQL...`);

  let stored = 0;

  for (const bill of bills) {
    try {
      await storeBillInDatabase(bill);
      stored++;
    } catch (error) {
      console.error(`Failed to store bill ${bill.id}:`, error);
    }
  }

  console.log(`✅ Stored ${stored}/${bills.length} bills in database`);

  return stored;
}

/**
 * Get a bill by ID from SmartSQL
 * Returns complete bill data including full summary (no truncation like Algolia)
 */
export async function getBillById(billId: string): Promise<EnhancedBill | null> {
  const sql = 'SELECT * FROM bills WHERE id = ?';

  try {
    const result = await executeSql(sql, [billId]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      congress: row.congress,
      billType: row.bill_type,
      billNumber: row.bill_number,
      title: row.title,
      summary: row.summary,
      sponsorBioguideId: row.sponsor_bioguide_id,
      sponsorName: row.sponsor_name,
      sponsorParty: row.sponsor_party,
      sponsorState: row.sponsor_state,
      introducedDate: row.introduced_date,
      latestActionDate: row.latest_action_date,
      latestActionText: row.latest_action_text,
      status: row.status,
      issueCategories: JSON.parse(row.issue_categories || '[]'),
      impactScore: row.impact_score,
      cosponsors: JSON.parse(row.cosponsors || '{"count":0,"names":[]}'),
      url: row.congress_url || `https://www.congress.gov/bill/${row.congress}th-congress/${row.bill_type}/${row.bill_number}`,
    };
  } catch (error) {
    console.error(`❌ Failed to get bill ${billId}:`, error);
    return null;
  }
}

/**
 * Get bills by congress number
 */
export async function getBillsByCongress(
  congress: number,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
    minImpactScore?: number;
  } = {}
): Promise<EnhancedBill[]> {
  const {
    limit = 20,
    offset = 0,
    status,
    minImpactScore,
  } = options;

  let sql = 'SELECT * FROM bills WHERE congress = ?';
  const params: any[] = [congress];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (minImpactScore !== undefined) {
    sql += ' AND impact_score >= ?';
    params.push(minImpactScore);
  }

  sql += ' ORDER BY latest_action_date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  try {
    const result = await executeSql(sql, params);

    return (result.rows || []).map((row: any) => ({
      id: row.id,
      congress: row.congress,
      billType: row.bill_type,
      billNumber: row.bill_number,
      title: row.title,
      summary: row.summary,
      sponsorBioguideId: row.sponsor_bioguide_id,
      sponsorName: row.sponsor_name,
      sponsorParty: row.sponsor_party,
      sponsorState: row.sponsor_state,
      introducedDate: row.introduced_date,
      latestActionDate: row.latest_action_date,
      latestActionText: row.latest_action_text,
      status: row.status,
      issueCategories: JSON.parse(row.issue_categories || '[]'),
      impactScore: row.impact_score,
      cosponsors: JSON.parse(row.cosponsors || '{"count":0,"names":[]}'),
    }));
  } catch (error) {
    console.error('❌ Failed to get bills by congress:', error);
    return [];
  }
}

/**
 * Get trending/high-impact bills
 */
export async function getTrendingBills(limit: number = 10): Promise<EnhancedBill[]> {
  const sql = `
    SELECT * FROM bills
    WHERE congress = 119
    ORDER BY impact_score DESC, latest_action_date DESC
    LIMIT ?
  `;

  try {
    const result = await executeSql(sql, [limit]);

    return (result.rows || []).map((row: any) => ({
      id: row.id,
      congress: row.congress,
      billType: row.bill_type,
      billNumber: row.bill_number,
      title: row.title,
      summary: row.summary,
      sponsorBioguideId: row.sponsor_bioguide_id,
      sponsorName: row.sponsor_name,
      sponsorParty: row.sponsor_party,
      sponsorState: row.sponsor_state,
      introducedDate: row.introduced_date,
      latestActionDate: row.latest_action_date,
      latestActionText: row.latest_action_text,
      status: row.status,
      issueCategories: JSON.parse(row.issue_categories || '[]'),
      impactScore: row.impact_score,
      cosponsors: JSON.parse(row.cosponsors || '{"count":0,"names":[]}'),
    }));
  } catch (error) {
    console.error('❌ Failed to get trending bills:', error);
    return [];
  }
}

/**
 * Update sync timestamp when bill is synced to Algolia
 */
export async function markBillSyncedToAlgolia(billId: string): Promise<void> {
  const sql = `
    UPDATE bills
    SET synced_to_algolia_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  try {
    await executeSql(sql, [billId]);
  } catch (error) {
    console.error(`❌ Failed to mark bill ${billId} as synced:`, error);
  }
}

/**
 * Get bills that need syncing to Algolia
 * (bills that have never been synced or were updated after last sync)
 */
export async function getBillsNeedingSync(limit: number = 100): Promise<EnhancedBill[]> {
  const sql = `
    SELECT * FROM bills
    WHERE synced_to_algolia_at IS NULL
       OR updated_at > synced_to_algolia_at
    ORDER BY updated_at DESC
    LIMIT ?
  `;

  try {
    const result = await executeSql(sql, [limit]);

    return (result.rows || []).map((row: any) => ({
      id: row.id,
      congress: row.congress,
      billType: row.bill_type,
      billNumber: row.bill_number,
      title: row.title,
      summary: row.summary,
      sponsorBioguideId: row.sponsor_bioguide_id,
      sponsorName: row.sponsor_name,
      sponsorParty: row.sponsor_party,
      sponsorState: row.sponsor_state,
      introducedDate: row.introduced_date,
      latestActionDate: row.latest_action_date,
      latestActionText: row.latest_action_text,
      status: row.status,
      issueCategories: JSON.parse(row.issue_categories || '[]'),
      impactScore: row.impact_score,
      cosponsors: JSON.parse(row.cosponsors || '{"count":0,"names":[]}'),
    }));
  } catch (error) {
    console.error('❌ Failed to get bills needing sync:', error);
    return [];
  }
}

/**
 * Get database stats
 */
export async function getBillDatabaseStats(): Promise<{
  totalBills: number;
  billsByCongress: Record<number, number>;
  billsByStatus: Record<string, number>;
  needingSync: number;
}> {
  try {
    // Total bills
    const totalResult = await executeSql('SELECT COUNT(*) as count FROM bills');
    const totalBills = totalResult.rows[0]?.count || 0;

    // Bills by congress
    const congressResult = await executeSql(
      'SELECT congress, COUNT(*) as count FROM bills GROUP BY congress ORDER BY congress DESC'
    );
    const billsByCongress: Record<number, number> = {};
    (congressResult.rows || []).forEach((row: any) => {
      billsByCongress[row.congress] = row.count;
    });

    // Bills by status
    const statusResult = await executeSql(
      'SELECT status, COUNT(*) as count FROM bills GROUP BY status'
    );
    const billsByStatus: Record<string, number> = {};
    (statusResult.rows || []).forEach((row: any) => {
      billsByStatus[row.status] = row.count;
    });

    // Bills needing sync
    const syncResult = await executeSql(
      'SELECT COUNT(*) as count FROM bills WHERE synced_to_algolia_at IS NULL OR updated_at > synced_to_algolia_at'
    );
    const needingSync = syncResult.rows[0]?.count || 0;

    return {
      totalBills,
      billsByCongress,
      billsByStatus,
      needingSync,
    };
  } catch (error) {
    console.error('❌ Failed to get database stats:', error);
    return {
      totalBills: 0,
      billsByCongress: {},
      billsByStatus: {},
      needingSync: 0,
    };
  }
}
