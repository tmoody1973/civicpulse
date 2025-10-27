/**
 * Algolia Bill Sync Utilities
 *
 * Syncs congressional bills from Congress.gov API to Algolia search index
 * Handles both initial bulk sync and incremental updates
 */

import { algoliaAdmin, BILLS_INDEX, indexSettings, type AlgoliaBill } from './algolia-config';
import { fetchEnhancedBillsBatch, fetchAllBillsForCongress, type EnhancedBill } from '../api/congress-enhanced';
import { storeBillInDatabase, storeBillsBatch, markBillSyncedToAlgolia } from '../db/bills';

// Type for Algolia v5 search response
interface AlgoliaSearchResponse<T = unknown> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  facets?: Record<string, Record<string, number>>;
  exhaustiveFacetsCount?: boolean;
  exhaustiveNbHits?: boolean;
  query: string;
  params: string;
  processingTimeMS: number;
}

/**
 * Transform enhanced bill to Algolia format
 * IMPORTANT: Truncate large fields to stay under Algolia's 10KB record limit
 */
function transformToAlgoliaBill(bill: EnhancedBill): AlgoliaBill {
  // Truncate summary to max 5000 characters (to stay well under 10KB limit)
  const summary = bill.summary || '';
  const truncatedSummary = summary.length > 5000
    ? summary.substring(0, 5000) + '...'
    : summary;

  // Truncate latest action to 500 characters
  const latestAction = bill.latestActionText;
  const truncatedLatestAction = latestAction.length > 500
    ? latestAction.substring(0, 500) + '...'
    : latestAction;

  // Truncate title to 500 characters (just in case)
  const title = bill.title;
  const truncatedTitle = title.length > 500
    ? title.substring(0, 500) + '...'
    : title;

  return {
    objectID: bill.id,
    billNumber: `${bill.billType.toUpperCase()} ${bill.billNumber}`,
    billType: bill.billType,
    congress: bill.congress,
    title: truncatedTitle,
    summary: truncatedSummary,
    sponsor: {
      name: bill.sponsorName,
      party: bill.sponsorParty,
      state: bill.sponsorState,
      bioguideId: bill.sponsorBioguideId,
    },
    cosponsors: bill.cosponsors,
    issueCategories: bill.issueCategories,
    status: bill.status,
    introducedDate: new Date(bill.introducedDate).getTime(),
    latestAction: truncatedLatestAction,
    latestActionDate: new Date(bill.latestActionDate).getTime(),
    impactScore: bill.impactScore,
    url: `/bills/${bill.id}`,
    cosponsorCount: bill.cosponsors?.count || 0,
  };
}

/**
 * Initialize Algolia index with correct settings
 * Call this once before first sync
 */
export async function initializeAlgoliaIndex(): Promise<void> {
  console.log('🔧 Initializing Algolia index...');

  try {
    // Set index settings (v5 API)
    await algoliaAdmin.setSettings({
      indexName: BILLS_INDEX,
      indexSettings,
    });

    console.log('✅ Algolia index initialized with settings');
  } catch (error) {
    console.error('❌ Failed to initialize Algolia index:', error);
    throw error;
  }
}

/**
 * Sync a batch of bills to both SmartSQL and Algolia
 * Returns number of bills successfully synced
 */
export async function syncBillsBatch(bills: EnhancedBill[]): Promise<number> {
  if (bills.length === 0) {
    console.log('⚠️ No bills to sync');
    return 0;
  }

  console.log(`📤 Syncing ${bills.length} bills to SmartSQL and Algolia...`);

  try {
    // STEP 1: Store in SmartSQL database (source of truth)
    console.log(`💾 Storing ${bills.length} bills in SmartSQL...`);
    const storedCount = await storeBillsBatch(bills);
    console.log(`✅ Stored ${storedCount} bills in SmartSQL`);

    // STEP 2: Sync to Algolia search index (truncated for search)
    console.log(`🔍 Indexing ${bills.length} bills in Algolia...`);
    const algoliaBills = bills.map(transformToAlgoliaBill);

    const responses = await algoliaAdmin.saveObjects({
      indexName: BILLS_INDEX,
      objects: algoliaBills,
    });

    console.log(`✅ Indexed ${bills.length} bills in Algolia`);

    // STEP 3: Mark bills as synced to Algolia
    for (const bill of bills) {
      await markBillSyncedToAlgolia(bill.id);
    }

    return bills.length;
  } catch (error) {
    console.error('❌ Failed to sync bills:', error);
    throw error;
  }
}

/**
 * Sync a single bill to both SmartSQL and Algolia (for real-time updates)
 */
export async function syncSingleBill(bill: EnhancedBill): Promise<void> {
  console.log(`📤 Syncing bill ${bill.billType}${bill.billNumber} to SmartSQL and Algolia...`);

  try {
    // STEP 1: Store in SmartSQL (source of truth)
    await storeBillInDatabase(bill);

    // STEP 2: Sync to Algolia (search index)
    const algoliaBill = transformToAlgoliaBill(bill);
    await algoliaAdmin.saveObjects({
      indexName: BILLS_INDEX,
      objects: [algoliaBill],
    });

    // STEP 3: Mark as synced
    await markBillSyncedToAlgolia(bill.id);

    console.log(`✅ Synced bill ${bill.id} to SmartSQL and Algolia`);
  } catch (error) {
    console.error(`❌ Failed to sync bill ${bill.id}:`, error);
    throw error;
  }
}

/**
 * Delete a bill from Algolia index
 */
export async function deleteBillFromAlgolia(billId: string): Promise<void> {
  console.log(`🗑️ Deleting bill ${billId} from Algolia...`);

  try {
    // Delete object (v5 API)
    await algoliaAdmin.deleteObject({
      indexName: BILLS_INDEX,
      objectID: billId,
    });
    console.log(`✅ Deleted bill ${billId} from Algolia`);
  } catch (error) {
    console.error(`❌ Failed to delete bill ${billId}:`, error);
    throw error;
  }
}

/**
 * Full sync: Fetch all bills for a congress and sync to Algolia
 * This is a LONG operation (can take 10-30 minutes for 10,000+ bills)
 *
 * @param congress - Congress number (default: 119)
 * @param batchSize - Number of bills to sync per batch (default: 250)
 */
export async function performFullSync(congress: number = 119, batchSize: number = 250): Promise<number> {
  console.log(`🚀 Starting full Algolia sync for Congress ${congress}...`);

  let totalSynced = 0;
  let offset = 0;

  try {
    // Initialize index first
    await initializeAlgoliaIndex();

    while (true) {
      // Fetch batch from Congress.gov
      const bills = await fetchEnhancedBillsBatch({
        congress,
        limit: batchSize,
        offset,
        includeCosponsors: false, // Skip for speed
      });

      if (bills.length === 0) {
        break; // No more bills
      }

      // Sync to Algolia
      const synced = await syncBillsBatch(bills);
      totalSynced += synced;

      console.log(`📊 Progress: ${totalSynced} bills synced`);

      offset += batchSize;

      // Rate limit between batches (be nice to Alg olia API)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Full sync complete: ${totalSynced} bills synced to Algolia`);

    return totalSynced;
  } catch (error) {
    console.error(`❌ Full sync failed after ${totalSynced} bills:`, error);
    throw error;
  }
}

/**
 * Incremental sync: Fetch recent bills (last 24 hours) and update Algolia
 * This is the daily cron job - much faster than full sync
 */
export async function performIncrementalSync(congress: number = 119): Promise<number> {
  console.log(`🔄 Starting incremental sync for Congress ${congress}...`);

  try {
    // Fetch recent bills (sorted by update date)
    const recentBills = await fetchEnhancedBillsBatch({
      congress,
      limit: 250, // Fetch most recent 250 bills
      offset: 0,
      includeCosponsors: false,
    });

    // Sync to Algolia
    const synced = await syncBillsBatch(recentBills);

    console.log(`✅ Incremental sync complete: ${synced} bills updated`);

    return synced;
  } catch (error) {
    console.error('❌ Incremental sync failed:', error);
    throw error;
  }
}

/**
 * Clear all bills from Algolia index (use with caution!)
 */
export async function clearAlgoliaIndex(): Promise<void> {
  console.log('⚠️ Clearing Algolia index...');

  try {
    // Clear objects (v5 API)
    await algoliaAdmin.clearObjects({
      indexName: BILLS_INDEX,
    });
    console.log('✅ Algolia index cleared');
  } catch (error) {
    console.error('❌ Failed to clear Algolia index:', error);
    throw error;
  }
}

/**
 * Get Algolia index stats (number of records, size, etc.)
 */
export async function getAlgoliaStats(): Promise<{
  numberOfRecords: number;
  dataSize: number;
  fileSize: number;
}> {
  try {
    // Search with empty query to get total count (v5 API)
    const stats = await algoliaAdmin.search({
      requests: [{
        indexName: BILLS_INDEX,
        query: '',
        hitsPerPage: 0,
        attributesToRetrieve: [],
      }],
    });

    const result = stats.results[0] as AlgoliaSearchResponse;
    return {
      numberOfRecords: result.nbHits || 0,
      dataSize: 0, // Not available in search response
      fileSize: 0, // Not available in search response
    };
  } catch (error: any) {
    // 404 means index doesn't exist yet
    if (error.status === 404) {
      return {
        numberOfRecords: 0,
        dataSize: 0,
        fileSize: 0,
      };
    }

    console.error('❌ Failed to get Algolia stats:', error);
    throw error;
  }
}

/**
 * Test Algolia connection and search
 */
export async function testAlgoliaConnection(): Promise<boolean> {
  console.log('🧪 Testing Algolia connection...');

  try {
    // Try a simple search (v5 API)
    // If index doesn't exist, it will be created automatically on first write
    const result = await algoliaAdmin.search({
      requests: [{
        indexName: BILLS_INDEX,
        query: '',
        hitsPerPage: 0,
      }],
    });

    console.log(`✅ Algolia connection successful`);
    return true;
  } catch (error: any) {
    // 404 means index doesn't exist yet, but connection is good
    if (error.status === 404) {
      console.log(`✅ Algolia connection successful (index will be created on first sync)`);
      return true;
    }

    console.error('❌ Algolia connection failed:', error);
    return false;
  }
}
