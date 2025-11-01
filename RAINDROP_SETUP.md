# Civic Pulse - Raindrop Platform Integration

## Current Status

✅ **Raindrop application is fully operational**

Your project is already configured and running on the Raindrop Platform with all core services active.

---

## Application Overview

**Application Name:** `civic-pulse`
**Version ID:** `01k8kf2b3gre3k5my2x4mnrn58`
**Environment:** Sandbox (Development)
**Status:** Running

### Active Modules (8)

1. **web** - Main Next.js application service
   - URL: `svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run`
   - Visibility: Public
   - Handles all HTTP requests and API endpoints

2. **civic-db** - SQLite database (SmartSQL)
   - Local file: `.raindrop/civic-db.sqlite`
   - Tables: users, bills, representatives, user_bills, podcasts, rss_articles, vote_records
   - Accessed via `this.env.CIVIC_DB` in services or `env.SMARTSQL` in scripts

3. **bills-smartbucket** - AI-powered semantic search for bills
   - URL: `https://api-01k8nvdg5asr3t3w02apta7dz8.01k66gywmx8x4r0w31fdjjfekf.lmapp.run`
   - Stores bill full text with automatic indexing
   - Accessed via `this.env.BILLS_SMARTBUCKET` or `env.BILLS_SMARTBUCKET`

4. **podcast-audio** - S3-compatible bucket for podcast storage
   - Stores generated podcast MP3 files
   - Accessed via `this.env.PODCAST_AUDIO`

5. **_mem** - SmartMemory service (internal)
6. **annotation-bucket** - Document storage (internal)
7. **annotation-service** - Annotation processing (internal)
8. **env** - Environment configuration (internal)

---

## Project Structure

```
civicpulse/
├── raindrop.manifest           # Raindrop application definition
├── .raindrop/                  # Local Raindrop data
│   ├── civic-db.sqlite         # Local SQLite database
│   └── config.json             # Version and sandbox config
├── src/
│   └── web/
│       ├── index.ts            # Main Raindrop service (API endpoints)
│       └── raindrop.gen.ts     # Auto-generated types from manifest
├── dist/
│   └── web/
│       └── index.js            # Compiled service code
├── scripts/
│   └── run-migration.ts        # Database migration script
└── lib/
    └── db/
        └── index.ts            # Next.js database client (HTTP-based)
```

---

## How to Use Raindrop Services

### Pattern 1: Inside Raindrop Services (src/web/index.ts)

Use `this.env.SERVICE_NAME` to access Raindrop resources:

```typescript
import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

export default class extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    // Access SQL database
    const result = await this.env.CIVIC_DB.prepare(`
      SELECT * FROM bills WHERE congress = ?
    `).bind(119).all();

    // Access SmartBucket for semantic search
    const searchResults = await this.env.BILLS_SMARTBUCKET.search({
      input: "climate change legislation",
      requestId: `search-${Date.now()}`,
    });

    // Upload to SmartBucket
    await this.env.BILLS_SMARTBUCKET.put(
      'bills/119/hr1234.txt',
      billFullText,
      { httpMetadata: { contentType: 'text/plain' } }
    );

    // Access podcast audio bucket
    await this.env.PODCAST_AUDIO.put('podcast-123.mp3', audioBuffer);

    return new Response(JSON.stringify(result.results));
  }
}
```

### Pattern 2: In Scripts (Outside Services)

Use `env` from `@raindrop-lm/raindrop` package:

```typescript
import { env } from '@raindrop-lm/raindrop';

// Access SmartSQL
const result = await env.SMARTSQL.run(
  `SELECT * FROM bills WHERE congress = ?`,
  [119]
);

// Access SmartBucket
const searchResults = await env.BILLS_SMARTBUCKET.search({
  input: "healthcare reform",
  requestId: `search-${Date.now()}`,
});
```

### Pattern 3: From Next.js (HTTP Client)

The Next.js app communicates with Raindrop services via HTTP:

```typescript
// lib/db/index.ts
const BACKEND_URL = process.env.RAINDROP_SERVICE_URL;

async function executeSql(sql: string, params: any[] = []): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  return response.json();
}
```

**Note:** Set `RAINDROP_SERVICE_URL` environment variable to the web service URL.

---

## Common Commands

### View Application Status

```bash
# Check all running modules
raindrop build status

# Find all resources with full details
raindrop build find -o full

# Find specific module type (e.g., smartbucket)
raindrop build find --moduleType smartbucket
```

### Start/Stop Application

```bash
# Start the application (if stopped)
raindrop build start

# Stop the application
raindrop build stop

# Deploy updates
raindrop build deploy
```

### Database Operations

```bash
# Run migration script
tsx scripts/run-migration.ts

# Access database directly via web service
curl -X POST https://your-web-service-url/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"bills","query":"SELECT * FROM bills LIMIT 10"}'
```

### SmartBucket Operations

```bash
# Sync bills to SmartBucket (via web service)
curl -X POST https://your-web-service-url/api/smartbucket/sync \
  -H "Content-Type: application/json" \
  -d '{"limit":10}'

# Search bills semantically
curl -X POST https://your-web-service-url/api/smartbucket/search \
  -H "Content-Type: application/json" \
  -d '{"query":"climate change legislation","limit":5}'
```

### Environment Variables

```bash
# Get environment variable
raindrop build env get civic-pulse:env:MY_VAR

# List all available modules (to see env var names)
raindrop build find -o compact
```

---

## API Endpoints (via web service)

Your Raindrop service exposes these endpoints:

### Health
- `GET /api/health` - Service health check

### Users
- `POST /api/users` - Create user
- `GET /api/users?email={email}` - Get user by email
- `PUT /api/users/preferences` - Update user preferences

### Bills
- `POST /api/bills` - Create/update bill
- `GET /api/bills?category={category}&limit={limit}` - Get bills

### Representatives
- `POST /api/representatives` - Create/update representative
- `GET /api/representatives?state={state}&district={district}` - Get representatives

### RSS Feeds
- `POST /api/rss` - Save RSS article
- `GET /api/rss?feedId={feedId}&limit={limit}` - Get RSS articles

### SmartBucket
- `POST /api/smartbucket/sync` - Sync bills to SmartBucket
- `POST /api/smartbucket/search` - Semantic search bills

### Admin (Development only)
- `POST /api/admin/query` - Execute SQL query
- `POST /api/admin/count` - Get table count

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  zip_code TEXT,
  state TEXT,
  district TEXT,
  interests TEXT,              -- JSON array
  email_notifications BOOLEAN DEFAULT true,
  audio_enabled BOOLEAN DEFAULT true,
  audio_frequencies TEXT,      -- JSON array: ['daily', 'weekly']
  subscription_tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Bills Table

```sql
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  congress INTEGER NOT NULL,
  bill_type TEXT NOT NULL,
  bill_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,
  sponsor_bioguide_id TEXT,
  sponsor_name TEXT,
  sponsor_party TEXT,
  sponsor_state TEXT,
  introduced_date TEXT,
  latest_action_date TEXT,
  latest_action_text TEXT,
  status TEXT NOT NULL,
  issue_categories TEXT,         -- JSON array
  impact_score INTEGER DEFAULT 0,
  cosponsor_count INTEGER DEFAULT 0,
  congress_url TEXT,
  smartbucket_key TEXT,          -- SmartBucket document key
  synced_to_smartbucket_at DATETIME,
  searchable_text TEXT,
  plain_english_summary TEXT,
  tracking_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(congress, bill_type, bill_number)
)
```

### Representatives Table

```sql
CREATE TABLE representatives (
  bioguide_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  party TEXT,
  chamber TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT,
  image_url TEXT,
  office_address TEXT,
  phone TEXT,
  website_url TEXT,
  rss_url TEXT,
  contact_form TEXT,
  twitter_handle TEXT,
  facebook_url TEXT,
  youtube_url TEXT,
  instagram_handle TEXT,
  committees TEXT,               -- JSON array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Other Tables

- **user_bills** - Track which bills users follow
- **podcasts** - Generated podcast metadata
- **rss_articles** - Cached RSS feed articles
- **vote_records** - Representative voting records

---

## Development Workflow

### 1. Start Raindrop Application

```bash
# Application starts automatically when you run
raindrop build start

# Check status
raindrop build status
```

### 2. Start Next.js Dev Server

```bash
# In another terminal
npm run dev

# Next.js will communicate with Raindrop service
# Make sure RAINDROP_SERVICE_URL is set in .env
```

### 3. Make Changes to Raindrop Service

```bash
# Edit src/web/index.ts
# Then rebuild and deploy
raindrop build validate
raindrop build deploy
```

### 4. Database Migrations

```bash
# Run migration script
tsx scripts/run-migration.ts

# Or use HTTP endpoint
curl -X POST http://localhost:3000/api/migrate
```

### 5. SmartBucket Sync

```bash
# Sync bills to SmartBucket for semantic search
curl -X POST https://your-web-service-url/api/smartbucket/sync \
  -H "Content-Type: application/json" \
  -d '{"limit":100}'
```

---

## Environment Variables

### Required for Next.js Integration

Add to `.env.local`:

```bash
# Raindrop web service URL (from raindrop build find)
RAINDROP_SERVICE_URL=https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run

# Congress.gov API
CONGRESS_API_KEY=your-key-here

# Claude API
ANTHROPIC_API_KEY=your-key-here

# ElevenLabs API
ELEVENLABS_API_KEY=your-key-here
ELEVENLABS_SARAH_VOICE_ID=voice-id-here
ELEVENLABS_JAMES_VOICE_ID=voice-id-here

# Vultr Object Storage (for podcast audio CDN)
VULTR_STORAGE_ENDPOINT=your-endpoint
VULTR_ACCESS_KEY=your-key
VULTR_SECRET_KEY=your-secret
VULTR_CDN_URL=your-cdn-url

# WorkOS Authentication
WORKOS_API_KEY=your-key
WORKOS_CLIENT_ID=your-client-id
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Stripe Payments
STRIPE_SECRET_KEY=your-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

---

## Troubleshooting

### Service Not Responding

```bash
# Check status
raindrop build status

# Restart service
raindrop build stop
raindrop build start
```

### Database Issues

```bash
# Reinitialize database
curl -X POST https://your-web-service-url/api/health

# Check local database
sqlite3 .raindrop/civic-db.sqlite "SELECT COUNT(*) FROM bills;"
```

### SmartBucket Search Not Working

```bash
# Verify bills are synced
curl -X POST https://your-web-service-url/api/smartbucket/sync

# Check SmartBucket status
raindrop build find --moduleType smartbucket
```

### Authentication Issues

```bash
# Relogin to Raindrop
raindrop auth login

# Check current auth status
raindrop auth list
```

---

## Next Steps

Your Raindrop application is fully set up! Here's what you can do:

1. **Continue Building Features**: Add new API endpoints in `src/web/index.ts`
2. **Integrate with Next.js**: Use the Raindrop service URLs in your Next.js API routes
3. **Use SmartBucket**: Implement semantic search for bills
4. **Deploy to Production**: Use `raindrop build unsandbox` when ready for production
5. **Add SmartMemory**: Uncomment SmartMemory in `raindrop.manifest` for AI agent context

## Resources

- **Raindrop CLI Help**: `raindrop --help`
- **Build Commands**: `raindrop build --help`
- **Manifest Documentation**: Check `raindrop.manifest` for all available resources
- **Local Database**: `.raindrop/civic-db.sqlite`
- **Service Code**: `src/web/index.ts`

---

**Your Raindrop setup is complete and ready for development!** 🚀
