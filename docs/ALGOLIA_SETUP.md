# Algolia Setup Guide

This guide walks you through setting up Algolia for the HakiVo legislation search system.

## Step 1: Create Algolia Account

1. **Sign up for Algolia**
   - Go to https://www.algolia.com/users/sign_up
   - Sign up with email or GitHub
   - Select "Free" plan (10,000 searches/month, perfect for MVP)

2. **Create Application**
   - After signup, you'll be prompted to create an application
   - Application name: **civic-pulse-production**
   - Region: Select closest to your users (e.g., US East)
   - Click "Create Application"

3. **Create Index**
   - In your new application dashboard, go to "Indices"
   - Click "Create Index"
   - Index name: **bills**
   - Click "Create"

## Step 2: Get API Credentials

1. **Navigate to API Keys**
   - In the Algolia dashboard, click "API Keys" in the left sidebar
   - You'll see several keys listed

2. **Copy Required Keys**
   - **Application ID**: Copy the "Application ID" at the top
   - **Admin API Key**: Copy the "Admin API Key" (keep this secret!)
   - **Search-Only API Key**: Copy the "Search-Only API Key" (safe for client-side)

## Step 3: Add Environment Variables

### Local Development (.env.local)

Create or update `/Users/tarikmoody/Documents/Projects/hakivo/.env.local`:

```bash
# Algolia Search
ALGOLIA_APP_ID=your-application-id-here
ALGOLIA_ADMIN_API_KEY=your-admin-api-key-here
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-only-key-here
```

**Replace the values** with your actual credentials from Step 2.

**IMPORTANT:** Never commit `.env.local` to git! It's already in `.gitignore`.

### Production (Netlify)

Add the same variables to Netlify:

**Option 1: Netlify UI**
1. Go to https://app.netlify.com
2. Select your site
3. Go to Site Settings → Environment Variables
4. Click "Add a variable"
5. Add all three variables:
   - `ALGOLIA_APP_ID`
   - `ALGOLIA_ADMIN_API_KEY`
   - `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY`

**Option 2: Netlify CLI**
```bash
netlify env:set ALGOLIA_APP_ID "your-application-id-here"
netlify env:set ALGOLIA_ADMIN_API_KEY "your-admin-api-key-here"
netlify env:set NEXT_PUBLIC_ALGOLIA_SEARCH_KEY "your-search-only-key-here"
```

## Step 3.5: Install Algolia CLI (Optional but Recommended)

The Algolia CLI is helpful for development, testing, and debugging.

**macOS:**
```bash
brew install algolia-cli
```

**Linux/Windows:**
```bash
npm install -g @algolia/cli
```

**Authenticate:**
```bash
algolia auth
```

This will prompt you for:
- Application ID
- Admin API Key

**Useful CLI commands:**
```bash
# List indices
algolia indices list

# View index settings
algolia indices settings bills

# Search from command line (for testing)
algolia indices search bills --query "healthcare"

# Export index configuration
algolia indices config bills > bills-config.json

# Import data from JSON file
algolia indices import bills data.json
```

**When to use CLI vs Script:**
- **CLI**: Quick testing, manual data uploads, debugging
- **Script** (`configure-algolia.ts`): Automated configuration, CI/CD, version control

Both approaches work fine! The CLI is great for rapid iteration during development.

## Step 4: Configure Algolia Index

Once you've added the environment variables, run the configuration script:

```bash
npx tsx scripts/configure-algolia.ts
```

This script will:
- Configure searchable attributes (bill number, title, summary, etc.)
- Set up faceting for filters (categories, status, party, etc.)
- Configure custom ranking (popularity, progress, bipartisan score)
- Enable typo tolerance for better search experience

**Expected output:**
```
🔧 Configuring Algolia index...
✅ Algolia index configured!
```

## Step 5: Verify Setup

You can verify the index is configured correctly in the Algolia dashboard:

1. Go to your application dashboard
2. Click on the "bills" index
3. Click "Configuration" in the left sidebar
4. You should see:
   - **Searchable Attributes**: billNumber, title, shortTitle, etc.
   - **Facets**: issueCategories, congress, sponsorParty, etc.
   - **Custom Ranking**: trackingCount, progressScore, etc.

## Troubleshooting

### Error: "Invalid credentials"
- Double-check that you copied the correct API keys
- Make sure there are no extra spaces in the environment variables
- Verify you're using the Admin API Key (not the Search-Only key) for the configuration script
- **CLI test**: Run `algolia indices list` to verify credentials work

### Error: "Index not found"
- Make sure you created an index named exactly "bills" (lowercase)
- The index name is case-sensitive
- **CLI test**: Run `algolia indices list` to see all your indices

### Error: "Cannot find module 'algoliasearch'"
- Run `npm install` to ensure all dependencies are installed
- Check that `algoliasearch` is in your `package.json`

### Configuration script doesn't run
- Make sure you've set the environment variables in `.env.local`
- Restart your terminal to pick up new environment variables
- Try running: `ALGOLIA_APP_ID=xxx ALGOLIA_ADMIN_API_KEY=yyy npx tsx scripts/configure-algolia.ts`
- **CLI alternative**: Use `algolia indices settings bills` to manually configure settings

## Next Steps

After completing this setup:

1. ✅ Algolia account created
2. ✅ "bills" index created
3. ✅ Environment variables configured (local + Netlify)
4. ✅ Index settings configured

**You're ready to proceed with Day 2:** Database schema updates and implementing directed search (bill number lookup).

See `/docs/SEARCH_IMPLEMENTATION_PLAN.md` for next steps.

## Cost Monitoring

**Free Tier Limits:**
- 10,000 search requests/month
- 10,000 records
- Unlimited indices

**Monitor usage:**
1. Go to Algolia dashboard
2. Click "Usage" in left sidebar
3. View current month's search requests

**Expected usage for MVP:**
- ~500-1,000 searches/month during testing
- ~2,000-5,000 searches/month with initial users
- Well within free tier limits

**When to upgrade:**
- If you exceed 10,000 searches/month
- When you need more records (>10,000 bills)
- When you need advanced features (A/B testing, query suggestions)

## Resources

- [Algolia Documentation](https://www.algolia.com/doc/)
- [Algolia JavaScript Client](https://www.algolia.com/doc/api-client/getting-started/install/javascript/)
- [Index Settings Reference](https://www.algolia.com/doc/api-reference/settings-api-parameters/)
- [Custom Ranking Guide](https://www.algolia.com/doc/guides/managing-results/must-do/custom-ranking/)
