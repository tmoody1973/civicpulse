# SmartSQL Setup Guide

## Current Status

The SmartSQL integration code is complete, but the database needs to be initialized in your Raindrop backend.

## Issue

When running `npm run test:smartsql`, you see:
```
Error: Database error: 404 - {"error":"Not Found","path":"/sql","method":"POST"}
```

This means the `/sql` endpoint doesn't exist on your Raindrop service yet.

## Solution: Initialize SmartSQL in Raindrop Backend

### Option 1: Use Raindrop Framework (Recommended)

Your project uses `@liquidmetal-ai/raindrop-framework`. You need to configure SmartSQL in your Raindrop backend service.

**1. Check your Raindrop service code:**

Look for where you initialize your Raindrop service (likely in `src/` directory or backend code).

**2. Add SmartSQL initialization:**

```typescript
import { SmartSQL } from '@liquidmetal-ai/raindrop-framework';

// Initialize SmartSQL
const db = new SmartSQL({
  dialect: 'sqlite', // or 'postgres'
  storage: 'civicpulse.db' // SQLite file path
});

// Expose /sql endpoint
app.post('/sql', async (req, res) => {
  const { sql, params = [] } = req.body;

  try {
    const result = await db.execute(sql, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**3. Initialize database schema:**

Run the schema from `lib/db/schema.sql` when your service starts:

```typescript
import fs from 'fs';
import path from 'path';

// On service startup
const schema = fs.readFileSync(
  path.resolve(__dirname, '../lib/db/schema.sql'),
  'utf-8'
);

// Split by statements and execute
const statements = schema.split(';').filter(s => s.trim());
for (const statement of statements) {
  await db.execute(statement);
}
```

### Option 2: Use Raindrop CLI

If you're using Raindrop modules/services via CLI:

```bash
# Deploy your service with SmartSQL enabled
raindrop build deploy --with-sql

# Or initialize SmartSQL module separately
raindrop module create --type smartsql --name civicpulse-db
```

### Option 3: Temporary Workaround - Skip SmartSQL for Now

If you want to test the flow without SmartSQL, modify the sync logic to skip database storage:

**Update `lib/search/algolia-sync.ts`:**

```typescript
export async function syncSingleBill(bill: EnhancedBill): Promise<void> {
  console.log(`📤 Syncing bill ${bill.billType}${bill.billNumber}...`);

  try {
    // STEP 1: Store in SmartSQL (TEMPORARILY DISABLED)
    // await storeBillInDatabase(bill);
    console.log(`⚠️  SmartSQL storage skipped (not configured yet)`);

    // STEP 2: Sync to Algolia (search index)
    const algoliaBill = transformToAlgoliaBill(bill);
    await algoliaAdmin.saveObjects({
      indexName: BILLS_INDEX,
      objects: [algoliaBill],
    });

    // STEP 3: Mark as synced (TEMPORARILY DISABLED)
    // await markBillSyncedToAlgolia(bill.id);

    console.log(`✅ Synced bill ${bill.id} to Algolia`);
  } catch (error) {
    console.error(`❌ Failed to sync bill ${bill.id}:`, error);
    throw error;
  }
}
```

## Testing Without SmartSQL

For now, you can test just the Algolia integration:

```bash
# Test Algolia + Congress.gov fallback (works)
npm run test:search
```

This will:
1. ✅ Fetch from Congress.gov API
2. ✅ Enhance bill
3. ⚠️  Skip SmartSQL (not configured)
4. ✅ Sync to Algolia
5. ✅ Verify searchable

## When SmartSQL is Ready

Once you've configured SmartSQL in your Raindrop backend, the full flow will work:

```bash
# Test complete flow: Congress.gov → SmartSQL → Algolia
npm run test:smartsql
```

This will:
1. ✅ Fetch from Congress.gov API
2. ✅ Enhance bill
3. ✅ Store complete data in SmartSQL
4. ✅ Sync truncated data to Algolia
5. ✅ Verify in both databases

## Next Steps

1. **Option A**: Configure SmartSQL in Raindrop backend (recommended for production)
2. **Option B**: Use temporary workaround to continue development with Algolia-only
3. **Option C**: Ask Raindrop support how to enable SmartSQL endpoint

For now, all your search functionality works via Algolia. SmartSQL adds:
- Complete bill data storage (no truncation)
- User interactions (bookmarks, views)
- Podcast metadata tracking
- Bill popularity stats

But these features can be added later once SmartSQL is configured.
