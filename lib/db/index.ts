/**
 * Database Helper Functions
 *
 * Interfaces with Raindrop SmartSQL backend for data persistence
 */

import { Representative, Bill } from '../api/congress';

const BACKEND_URL = process.env.RAINDROP_SERVICE_URL;

if (!BACKEND_URL) {
  console.warn('RAINDROP_SERVICE_URL not set - database operations will fail');
}

/**
 * Execute SQL query on Raindrop backend
 */
async function executeSql(sql: string, params: any[] = []): Promise<any> {
  if (!BACKEND_URL) {
    throw new Error('RAINDROP_SERVICE_URL not configured');
  }

  const response = await fetch(`${BACKEND_URL}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Database error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<void> {
  console.log('📊 Initializing database schema...');

  // Create tables one by one (SQLite doesn't support multiple statements in one query via fetch)
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      state TEXT,
      district INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Representatives table
    `CREATE TABLE IF NOT EXISTS representatives (
      bioguide_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      party TEXT,
      state TEXT NOT NULL,
      district INTEGER,
      chamber TEXT NOT NULL CHECK (chamber IN ('Senate', 'House')),
      image_url TEXT,
      official_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Bills table
    `CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      congress INTEGER NOT NULL,
      bill_type TEXT NOT NULL,
      bill_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      introduced_date TEXT,
      latest_action_date TEXT,
      latest_action_text TEXT,
      sponsor_bioguide_id TEXT,
      sponsor_name TEXT,
      url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(congress, bill_type, bill_number)
    )`,
  ];

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_representatives_state_district ON representatives(state, district)',
    'CREATE INDEX IF NOT EXISTS idx_representatives_chamber ON representatives(chamber)',
    'CREATE INDEX IF NOT EXISTS idx_bills_congress_date ON bills(congress, latest_action_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_bills_sponsor ON bills(sponsor_bioguide_id)',
  ];

  try {
    for (const sql of tables) {
      await executeSql(sql);
    }
    for (const sql of indexes) {
      await executeSql(sql);
    }
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Store or update a representative
 */
export async function storeRepresentative(rep: Representative): Promise<void> {
  const sql = `
    INSERT OR REPLACE INTO representatives (
      bioguide_id, name, first_name, last_name, party, state, district,
      chamber, image_url, official_url, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const params = [
    rep.bioguideId,
    rep.name,
    rep.firstName,
    rep.lastName,
    rep.party,
    rep.state,
    rep.district ?? null,
    rep.chamber,
    rep.imageUrl ?? null,
    rep.officialUrl ?? null,
  ];

  await executeSql(sql, params);
}

/**
 * Store multiple representatives
 */
export async function storeRepresentatives(reps: Representative[]): Promise<void> {
  console.log(`💾 Storing ${reps.length} representatives in database...`);

  for (const rep of reps) {
    await storeRepresentative(rep);
  }

  console.log(`✅ Stored ${reps.length} representatives`);
}

/**
 * Store or update a bill
 */
export async function storeBill(bill: Bill): Promise<void> {
  const billId = `${bill.congress}-${bill.billType}-${bill.billNumber}`;

  const sql = `
    INSERT OR REPLACE INTO bills (
      id, congress, bill_type, bill_number, title, summary,
      introduced_date, latest_action_date, latest_action_text,
      sponsor_bioguide_id, sponsor_name, url, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const params = [
    billId,
    bill.congress,
    bill.billType,
    bill.billNumber,
    bill.title,
    bill.summary ?? null,
    bill.introducedDate ?? null,
    bill.latestActionDate ?? null,
    bill.latestActionText ?? null,
    bill.sponsorBioguideId ?? null,
    bill.sponsorName ?? null,
    bill.url ?? null,
  ];

  await executeSql(sql, params);
}

/**
 * Store multiple bills
 */
export async function storeBills(bills: Bill[]): Promise<void> {
  console.log(`💾 Storing ${bills.length} bills in database...`);

  for (const bill of bills) {
    await storeBill(bill);
  }

  console.log(`✅ Stored ${bills.length} bills`);
}

/**
 * Get representatives by state and district
 */
export async function getRepresentatives(state: string, district?: number): Promise<Representative[]> {
  let sql = 'SELECT * FROM representatives WHERE state = ?';
  const params: any[] = [state];

  if (district !== undefined) {
    sql += ' AND district = ?';
    params.push(district);
  }

  const result = await executeSql(sql, params);

  return (result.rows || []).map((row: any) => ({
    bioguideId: row.bioguide_id,
    name: row.name,
    firstName: row.first_name,
    lastName: row.last_name,
    party: row.party,
    state: row.state,
    district: row.district,
    chamber: row.chamber,
    imageUrl: row.image_url,
    officialUrl: row.official_url,
  }));
}

/**
 * Get recent bills
 */
export async function getRecentBills(limit: number = 20, offset: number = 0): Promise<Bill[]> {
  const sql = `
    SELECT * FROM bills
    ORDER BY latest_action_date DESC
    LIMIT ? OFFSET ?
  `;

  const result = await executeSql(sql, [limit, offset]);

  return (result.rows || []).map((row: any) => ({
    congress: row.congress,
    billType: row.bill_type,
    billNumber: row.bill_number,
    title: row.title,
    summary: row.summary,
    introducedDate: row.introduced_date,
    latestActionDate: row.latest_action_date,
    latestActionText: row.latest_action_text,
    sponsorBioguideId: row.sponsor_bioguide_id,
    sponsorName: row.sponsor_name,
    url: row.url,
  }));
}

/**
 * Check if database is initialized
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const result = await executeSql(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='representatives'"
    );
    return result.rows && result.rows.length > 0;
  } catch (error) {
    return false;
  }
}
