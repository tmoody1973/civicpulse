# SQL Migrations Guide - Raindrop Platform

This guide explains how to properly handle database schema changes and data migrations with Raindrop SQL (SQLite/D1).

## Understanding Raindrop SQL Schema Management

Raindrop uses SQLite (Cloudflare D1) with a hybrid approach:
- **Auto-schema creation** through `upsert()` for rapid development
- **Explicit ALTER TABLE** for production schema changes

## Key Concepts

### 1. Auto-Schema Creation (via upsert)
When you use `upsert()` with new fields, Raindrop automatically creates tables/columns:

```typescript
import { upsert } from '@/lib/db/client';

// Auto-creates table and columns if they don't exist
await upsert('users', {
  id: 'user123',
  email: 'user@example.com',
  new_field: 'value', // Adds column automatically
});
```

**Best for:**
- Initial development and prototyping
- New tables and fields during iteration
- Hackathon/MVP development

**Limitations:**
- Race conditions with concurrent operations
- No control over column types or constraints
- Can't handle NOT NULL, DEFAULT, or other constraints
- Not recommended for production schema changes

### 2. Explicit Schema Changes (via ALTER TABLE)
For production migrations, use explicit SQL statements:

```typescript
import { executeQuery } from '@/lib/db/client';

await executeQuery(
  `ALTER TABLE users ADD COLUMN new_column TEXT`,
  'users'
);
```

**Best for:**
- Production database changes
- Adding constraints (NOT NULL, DEFAULT)
- Modifying existing schemas
- Team environments with multiple developers

**Benefits:**
- Explicit control over changes
- Prevents race conditions
- Better error handling
- Audit trail of schema evolution

## Migration Script Template

Create migration scripts in `/scripts/` directory:

```typescript
/**
 * Migration: Add contact_url column to representatives
 * Created: 2025-10-28
 * Author: Your Name
 */
import { executeQuery } from '../lib/db/client';

async function addContactUrlColumn() {
  try {
    console.log('📝 Adding contact_url column...');

    await executeQuery(
      `ALTER TABLE representatives ADD COLUMN contact_url TEXT`,
      'representatives'
    );

    console.log('✅ Column added successfully!');
  } catch (error: any) {
    // Handle "column already exists" gracefully
    if (error.message?.includes('duplicate column name')) {
      console.log('✅ Column already exists, skipping');
      return;
    }

    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
addContactUrlColumn()
  .then(() => {
    console.log('\n✨ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
```

## Running Migrations

### 1. Set Environment Variable
Migrations connect to your Raindrop service URL:

```bash
# Option 1: Export for session
export RAINDROP_SERVICE_URL=https://svc-xxx.lmapp.run

# Option 2: Inline for single command
RAINDROP_SERVICE_URL=https://svc-xxx.lmapp.run npx tsx scripts/add-column.ts
```

### 2. Ensure Raindrop Service is Running
```bash
# Check if running
raindrop build info

# Start if needed
raindrop build run

# Output shows service URL
# Service URL: https://svc-xxx.lmapp.run
```

### 3. Execute Migration
```bash
RAINDROP_SERVICE_URL=https://svc-xxx.lmapp.run npx tsx scripts/your-migration.ts
```

### 4. Verify Changes
Add verification to your migration script:

```typescript
// Check schema after migration
const result = await executeQuery(
  `SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`,
  'users'
);

console.log('Table schema:', result.rows[0]?.sql);
```

## Data Migration Example

For schema changes that also require data updates:

```typescript
/**
 * Migration: Move contact URLs from twitter_handle to contact_url
 */
import { executeQuery } from '../lib/db/client';

async function migrateContactUrls() {
  try {
    // Step 1: Add new column
    console.log('📝 Step 1: Adding contact_url column...');
    await executeQuery(
      `ALTER TABLE representatives ADD COLUMN contact_url TEXT`,
      'representatives'
    );

    // Step 2: Fetch existing data
    console.log('📊 Step 2: Fetching representatives...');
    const result = await executeQuery(
      `SELECT bioguide_id, name, twitter_handle FROM representatives`,
      'representatives'
    );

    console.log(`Found ${result.rows.length} representatives`);

    let updated = 0;

    // Step 3: Migrate data
    for (const rep of result.rows) {
      const twitterHandle = rep.twitter_handle as string | null;

      // Check if twitter_handle contains a URL (not a handle)
      const isUrl = twitterHandle && (
        twitterHandle.includes('http') ||
        twitterHandle.includes('.gov') ||
        twitterHandle.includes('.com')
      );

      if (isUrl) {
        console.log(`📝 Migrating ${rep.name}...`);

        // Move URL to contact_url field
        await executeQuery(
          `UPDATE representatives
           SET contact_url = '${twitterHandle.replace(/'/g, "''")}',
               twitter_handle = NULL,
               updated_at = '${new Date().toISOString()}'
           WHERE bioguide_id = '${rep.bioguide_id}'`,
          'representatives'
        );

        updated++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Updated: ${updated} records`);
    console.log(`   Skipped: ${result.rows.length - updated} records`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrateContactUrls()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
```

## Best Practices

### 1. Make Migrations Idempotent
Always check if the migration has already run:

```typescript
// Check if column exists
const tableInfo = await executeQuery(
  `PRAGMA table_info(users)`,
  'users'
);

const columnExists = tableInfo.rows.some(
  (col: any) => col.name === 'new_column'
);

if (!columnExists) {
  await executeQuery(
    `ALTER TABLE users ADD COLUMN new_column TEXT`,
    'users'
  );
}
```

### 2. Escape Single Quotes in SQL
Always escape user input:

```typescript
const value = "O'Brien"; // Contains single quote

// ❌ Wrong - SQL injection risk
await executeQuery(
  `UPDATE users SET name = '${value}'`,
  'users'
);

// ✅ Correct - escape quotes
await executeQuery(
  `UPDATE users SET name = '${value.replace(/'/g, "''")}'`,
  'users'
);
```

### 3. Use Environment Variables
Never hardcode service URLs:

```typescript
// ✅ Good
const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;
if (!RAINDROP_SERVICE_URL) {
  throw new Error('RAINDROP_SERVICE_URL not set');
}

// ❌ Bad
const url = 'https://svc-xxx.lmapp.run'; // Hardcoded!
```

### 4. Log Progress
Provide clear status updates:

```typescript
console.log('🔍 Starting migration...');
console.log('📊 Found 150 records to update');
console.log('📝 Updating record 1/150...');
console.log('✅ Migration complete! Updated 150 records');
```

### 5. Handle Errors Gracefully
Catch specific errors and provide helpful messages:

```typescript
try {
  await executeQuery('ALTER TABLE ...', 'users');
} catch (error: any) {
  if (error.message?.includes('duplicate column')) {
    console.log('✅ Column already exists, skipping');
    return;
  }

  if (error.message?.includes('NOT NULL constraint failed')) {
    console.error('❌ Migration failed: NULL values found');
    console.error('   Fix: Add default values before adding NOT NULL constraint');
  }

  throw error;
}
```

## Common Pitfalls

### 1. Using INSERT OR REPLACE with Partial Data
**Problem:** Requires ALL NOT NULL columns

```typescript
// ❌ Fails if 'name' is NOT NULL
await executeQuery(
  `INSERT OR REPLACE INTO users (id, email) VALUES ('123', 'test@example.com')`,
  'users'
);

// ✅ Use UPDATE for partial changes
await executeQuery(
  `UPDATE users SET email = 'test@example.com' WHERE id = '123'`,
  'users'
);
```

**Why:** `INSERT OR REPLACE` deletes the old row and inserts a new one, requiring all NOT NULL fields.

### 2. Forgetting Environment Variables
**Problem:** Migration runs before .env.local is loaded

```bash
# ❌ Won't find RAINDROP_SERVICE_URL
npx tsx scripts/migration.ts

# ✅ Explicitly pass environment variable
RAINDROP_SERVICE_URL=https://svc-xxx.lmapp.run npx tsx scripts/migration.ts
```

**Why:** `npx tsx` doesn't automatically load `.env.local` files.

### 3. Not Checking Service Status
**Problem:** Migration fails because Raindrop isn't running

```typescript
// ✅ Check service first
const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;
if (!RAINDROP_SERVICE_URL) {
  console.error('❌ RAINDROP_SERVICE_URL not set');
  process.exit(1);
}

// Test connection
try {
  await executeQuery('SELECT 1', 'users');
} catch (error) {
  console.error('❌ Cannot connect to Raindrop service');
  console.error('   Run: raindrop build run');
  process.exit(1);
}
```

### 4. Forgetting to Update Schema Docs
Always document schema changes:

```sql
-- db/civic-db/0000_initial_schema.sql
CREATE TABLE IF NOT EXISTS representatives (
  bioguide_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_url TEXT,  -- ← Document new column
  twitter_handle TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Checklist

Before running in production:

- [ ] Migration is idempotent (can run multiple times safely)
- [ ] RAINDROP_SERVICE_URL environment variable is set
- [ ] Raindrop service is running (`raindrop build run`)
- [ ] Tested on local database first
- [ ] Schema docs updated (db/civic-db/*.sql)
- [ ] Error handling for duplicate columns/constraints
- [ ] Progress logging for debugging
- [ ] SQL injection protection (escaped quotes)
- [ ] Rollback plan documented

## Complete Workflow Example

```bash
# 1. Start Raindrop service
raindrop build run

# 2. Get service URL
raindrop build info
# Output: Service URL: https://svc-xxx.lmapp.run

# 3. Create migration script
cat > scripts/add-new-column.ts << 'EOF'
import { executeQuery } from '../lib/db/client';

async function addColumn() {
  try {
    console.log('📝 Adding column...');

    await executeQuery(
      `ALTER TABLE users ADD COLUMN new_column TEXT`,
      'users'
    );

    console.log('✅ Done!');
  } catch (error: any) {
    if (error.message?.includes('duplicate column')) {
      console.log('✅ Column exists, skipping');
      return;
    }
    throw error;
  }
}

addColumn()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
EOF

# 4. Run migration
RAINDROP_SERVICE_URL=https://svc-xxx.lmapp.run npx tsx scripts/add-new-column.ts

# 5. Update schema documentation
# Edit db/civic-db/0000_initial_schema.sql

# 6. Commit changes
git add scripts/add-new-column.ts db/civic-db/0000_initial_schema.sql
git commit -m "feat(db): add new_column to users table"
```

## Troubleshooting

### Error: "ECONNREFUSED ::1:8787"
**Cause:** Raindrop service not running

**Fix:**
```bash
# Start service
raindrop build run

# Use correct URL
export RAINDROP_SERVICE_URL=https://svc-xxx.lmapp.run
```

### Error: "no such column: X"
**Cause:** Column doesn't exist yet

**Fix:** Run migration to add column first

### Error: "NOT NULL constraint failed"
**Cause:** Trying to insert NULL for NOT NULL column

**Fix:**
```typescript
// Add column as nullable first
await executeQuery(
  `ALTER TABLE users ADD COLUMN new_column TEXT NULL`,
  'users'
);

// Set default values
await executeQuery(
  `UPDATE users SET new_column = 'default' WHERE new_column IS NULL`,
  'users'
);

// Then add NOT NULL constraint (SQLite limitation - requires recreate table)
```

### Error: "duplicate column name"
**Cause:** Column already exists

**Fix:** This is expected behavior for idempotent migrations. Your script should catch this and continue:

```typescript
catch (error: any) {
  if (error.message?.includes('duplicate column')) {
    console.log('✅ Already exists, skipping');
    return;
  }
  throw error;
}
```

## When to Use Auto-Schema vs. Migrations

### Use Auto-Schema (upsert) When:
- ✅ Building MVP/prototype
- ✅ Hackathon development
- ✅ Adding fields during iteration
- ✅ Local development only

### Use Explicit Migrations When:
- ✅ Production database changes
- ✅ Multi-developer team
- ✅ Need constraints (NOT NULL, DEFAULT)
- ✅ Modifying existing data
- ✅ Version control of schema changes

**Hybrid Approach (Recommended):**
- Development: Use `upsert()` for fast iteration
- Production: Write explicit migrations before deploying

Think of it like **scaffolding vs. permanent construction** - you need both at different stages!

## Resources

- [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
