# Civic Pulse - Development Rules

**Project:** AI-powered civic engagement platform (Liquid Metal Hackathon)
**Stack:** Next.js 16 App Router + Raindrop Platform + Vultr + Netlify + ElevenLabs + Claude Sonnet 4

---

## Critical Requirements

### Tech Stack (Non-Negotiable)
- **Frontend:** Next.js 16 App Router (no Pages Router), shadcn/ui only, Tailwind CSS
- **Backend:** Raindrop Platform (SmartSQL, SmartMemory, SmartInference)
- **Deployment:** Netlify (hackathon sponsor - required)
- **Auth:** WorkOS (OAuth with Google, Twitter)
- **Storage:** Vultr Object Storage + CDN (required for hackathon)
- **AI:** Claude Sonnet 4 (analysis), ElevenLabs text-to-dialogue (voice)
- **Payments:** Stripe only
- **Language:** TypeScript strict mode

### Hackathon Compliance
- ✅ Built on Raindrop Platform (all API routes, DB, caching)
- ✅ Uses Vultr service (Object Storage for podcast audio)
- ✅ Deployed on Netlify (hackathon sponsor)
- ✅ ElevenLabs for voice (text-to-dialogue endpoint)
- ✅ All code written during hackathon (check git timestamps)
- ✅ Progressive git commits (no big bang)
- ✅ Launch-ready (auth, payments, error handling)

---

## MCP Servers (Development Tools)

**CRITICAL: Use MCP servers proactively during development**

### Available MCP Servers
- **Next.js MCP Server**: Runtime introspection for running Next.js dev server
- **Raindrop MCP Server**: Access to Raindrop documentation and examples
- **Netlify MCP Server**: Deployment, environment variables, site management

### When to Use Next.js MCP Server

**Use proactively for:**
- Inspecting runtime errors and diagnostics
- Understanding current route structure
- Checking build status and compilation errors
- Querying component hierarchy
- Getting route information
- Clearing cache when needed

**Workflow:**
```bash
# Start Next.js dev server first
npm run dev

# MCP server connects to http://localhost:3000/_next/mcp
# Use nextjs_runtime tool to query running app
```

**Example queries:**
- "What routes are available?"
- "Check for errors in the running app"
- "Show me the current component tree"
- "What's the build status?"
- "Clear the Next.js cache"

### When to Use Raindrop MCP Server

**Use for:**
- Fetching Raindrop Platform documentation
- Understanding SmartSQL capabilities
- Learning SmartBuckets API patterns
- Checking SmartMemory usage
- Getting AI Models integration examples

**Example queries:**
- "How do I use SmartSQL with SQLite?"
- "Show me SmartBuckets document search examples"
- "What AI models are available via env.AI.run()?"
- "How does SmartMemory work?"

### When to Use Netlify MCP Server

**Use proactively for:**
- **Deploying site**: Create preview and production deploys
- **Environment variables**: Get, set, update, delete env vars
- **Site management**: Get site info, list projects, check deploy status
- **Forms**: Manage Netlify Forms and submissions
- **Extensions**: Install and configure Netlify extensions (databases, etc.)

**Common operations:**

**Deployment:**
```typescript
// Deploy preview
netlify_deploy_services_updater: deploy-site
{
  deployDirectory: "/Users/tarikmoody/Documents/Projects/civicpulse",
  siteId: "your-site-id" // Get from netlify link or UI
}

// Check deploy status
netlify_deploy_services_reader: get-deploy
{
  deployId: "deploy-id-from-previous-call"
}
```

**Environment Variables:**
```typescript
// Get all environment variables
netlify_project_services_updater: manage-env-vars
{
  siteId: "your-site-id",
  getAllEnvVars: true
}

// Set environment variable
netlify_project_services_updater: manage-env-vars
{
  siteId: "your-site-id",
  upsertEnvVar: true,
  envVarKey: "CONGRESS_API_KEY",
  envVarValue: "your-key-here",
  newVarContext: "all", // or "production", "deploy-preview", etc.
  newVarScopes: ["all"] // or ["builds", "functions", "runtime"]
}

// Delete environment variable
netlify_project_services_updater: manage-env-vars
{
  siteId: "your-site-id",
  deleteEnvVar: true,
  envVarKey: "OLD_KEY"
}
```

**Site Management:**
```typescript
// Get all projects
netlify_project_services_reader: get-projects
{
  teamSlug: "your-team-slug" // optional
}

// Get specific project
netlify_project_services_reader: get-project
{
  siteId: "your-site-id"
}

// Update project name
netlify_project_services_updater: update-project-name
{
  siteId: "your-site-id",
  name: "civic-pulse" // must be hyphenated alphanumeric
}
```

**Forms Management:**
```typescript
// Enable forms
netlify_project_services_updater: update-forms
{
  siteId: "your-site-id",
  forms: "enabled"
}

// Get form submissions
netlify_project_services_updater: manage-form-submissions
{
  siteId: "your-site-id",
  action: "get-submissions",
  formId: "form-id",
  limit: 20,
  offset: 0
}
```

**Extensions (for databases, etc.):**
```typescript
// List available extensions
netlify_extension_services_reader: get-extensions

// Get extension details
netlify_extension_services_reader: get-full-extension-details
{
  extensionSlug: "netlify-postgres", // or other extension
  teamId: "your-team-id"
}

// Install extension
netlify_extension_services_updater: change-extension-installation
{
  extensionSlug: "netlify-postgres",
  shouldBeInstalled: true,
  teamId: "your-team-id",
  siteId: "your-site-id"
}
```

**Example workflows:**
- "Deploy the site to Netlify preview"
- "Set all environment variables for production"
- "Check the status of the last deploy"
- "Enable forms for this project"
- "Install the Netlify Postgres extension"
- "Get all environment variables"
- "Update the CONGRESS_API_KEY for production only"

### Development Workflow with MCP Servers

1. **Start development**: `npm run dev`
2. **Use Next.js MCP**: Check runtime state, errors, routes
3. **Use Raindrop MCP**: Fetch docs when implementing Raindrop features
4. **Use Netlify MCP**: Deploy, manage env vars, check deploy status
5. **Iterate**: Make changes, use MCPs to verify
6. **Debug**: Use Next.js MCP to inspect errors in real-time
7. **Deploy**: Use Netlify MCP to deploy and manage production

**Best Practice:** Use MCP servers BEFORE implementing features to understand current state and correct patterns.

### MCP Server Priority

**During implementation:**
1. **Raindrop MCP** → Get documentation for Raindrop features
2. **Next.js MCP** → Verify runtime behavior, check errors
3. **Netlify MCP** → Deploy and manage configuration

**During deployment:**
1. **Netlify MCP** → Set env vars, deploy site
2. **Next.js MCP** → Verify build, check for errors
3. **Raindrop MCP** → Confirm database connection strings

---

## Development Journal

**File:** `journal.md` in project root  
**Purpose:** Share development journey on social media  
**Audience:** Non-technical people (family, friends, civic tech enthusiasts)

### Entry Format (Every Significant Change)
```markdown
## [Date/Time] - [What I Built]

**What I Built:** Plain language description
**The Problem I Solved:** User need addressed
**How I Did It:** Technical approach using analogies
**What I Learned:** Insights, surprises, "aha" moments
**What's Next:** What this enables

**Quick Win 🎉:** Shareable achievement
**Social Media Snippet:** Ready-to-post content
```

### Writing Rules
- Use plain language, avoid jargon
- Explain with analogies (database = filing cabinet)
- Focus on user impact, not implementation
- Tell stories (challenges, mistakes, breakthroughs)
- Make entries shareable as LinkedIn/Twitter posts
- Journal when: starting features, solving bugs, integrating APIs, discoveries

---

## Automatic Refactoring

Apply these principles without asking:
- Extract complex logic into named functions (>50 lines = refactor)
- Replace magic numbers/strings with constants
- Remove duplicate code (create utilities)
- Use modern patterns (const/let, arrow functions, destructuring, optional chaining)
- React: Extract components, use hooks, Server Components by default
- Performance: Memoize expensive ops, lazy load, optimize images

Ask first for architectural changes affecting multiple files.

---

## Core Architecture

### Podcast Generation Flow
```
User requests podcast
  ↓
Raindrop API route
  ↓
1. Fetch bills (Congress.gov API)
2. Generate dialogue script (Claude API returns array)
3. Generate complete audio (ElevenLabs text-to-dialogue - single call!)
4. Upload to Vultr Object Storage
5. Return CDN URL to user
```

### ElevenLabs Text-to-Dialogue (Critical)
**Use `/v1/text-to-dialogue` endpoint** - generates complete multi-host conversation in one call

```typescript
// Input format from Claude
const dialogue = [
  { host: 'sarah', text: 'Good morning...' },
  { host: 'james', text: 'Today we\'re covering...' }
];

// Single API call generates complete audio
const audioBuffer = await generateDialogue(dialogue);
```

Benefits: Natural flow, proper timing, no manual combining, faster, more reliable

### Database Schema
- **users:** id, email, location, preferences, subscription_tier
- **bills:** congress, bill_number, title, full_text, issue_categories, impact_score
- **representatives:** bioguide_id, name, party, state, district, chamber
- **podcasts:** user_id, type, audio_url, transcript, bills_covered, generated_at
- Use Raindrop SmartSQL for all queries

---

## Key Rules (Must Follow)

### API Integration
- **Congress.gov:** 1 req/sec limit, cache 24hrs
- **Claude:** Use claude-sonnet-4-20250514, retry with backoff
- **ElevenLabs:** Use text-to-dialogue, output format `mp3_44100_192`
- **Vultr Storage:** S3-compatible, enable CDN, set cache headers
- Always check cache first, handle failures gracefully

### Security
- Never commit API keys (use env vars)
- Rate limit: 100 req/hr per user
- Validate all inputs with Zod
- **CRITICAL: Use WorkOS for Raindrop Auth** (Google, Twitter OAuth via WorkOS)
- Hash sensitive data, encrypt location

### Performance Targets
- Page load: <2s (Lighthouse 90+)
- Podcast generation: <60s daily, <120s weekly
- API response: <500ms (non-generative)
- Database queries: <100ms
- Audio streaming: <1s to first byte

### Mobile-First
- Test on: iPhone SE (375px), iPhone 15 Pro (393px), iPad (768px), Desktop (1920px)
- Touch targets: min 44x44px
- Audio player: background playback, lock screen controls
- Fixed player at bottom on mobile

### Error Handling
- User-friendly messages (no stack traces)
- Graceful degradation (if API fails, use cache or queue retry)
- Log all errors with context
- Implement circuit breakers for external services

---

## Git Standards

### Commit Format
```
<type>(<scope>): <subject>

feat(podcast): add text-to-dialogue integration
fix(audio): improve dialogue naturalness
docs(api): update endpoint documentation
refactor(db): extract bill queries
```

Types: feat, fix, docs, style, refactor, perf, test, chore

### Before Commit
```bash
npm run type-check
npm run lint
npm test
```

---

## Nested Documentation

Detailed rules in context-specific claude.md files:
- `/lib/api/claude.md` - API client implementation details
- `/lib/ai/claude.md` - ElevenLabs & Claude API specifics
- `/lib/storage/claude.md` - Vultr Object Storage configuration
- `/components/claude.md` - Component patterns & shadcn/ui usage
- `/app/api/claude.md` - API route standards & error handling

---

## Quick Commands

```bash
npm run dev              # Start development
npm run build            # Production build
npm run test             # Run tests
netlify dev              # Test with Netlify Dev (functions, redirects)
netlify deploy           # Deploy preview
netlify deploy --prod    # Deploy to production
netlify env:list         # List environment variables
netlify open             # Open Netlify dashboard
npx shadcn-ui add button # Add UI component
```

---

## Environment Variables Required

```bash
# Netlify (set via Netlify UI or CLI)
NEXT_PUBLIC_APP_URL=https://civicpulse.netlify.app

# Raindrop Platform
RAINDROP_SQL_URL=
RAINDROP_SMART_MEMORY_URL=

# Vultr Object Storage
VULTR_STORAGE_ENDPOINT=
VULTR_ACCESS_KEY=
VULTR_SECRET_KEY=
VULTR_CDN_URL=

# External APIs
CONGRESS_API_KEY=
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_SARAH_VOICE_ID=
ELEVENLABS_JAMES_VOICE_ID=

# Stripe Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# WorkOS Authentication
WORKOS_API_KEY=
WORKOS_CLIENT_ID=
WORKOS_REDIRECT_URI=
NEXT_PUBLIC_WORKOS_CLIENT_ID=
```

**Setting Environment Variables on Netlify:**
```bash
# Via CLI
netlify env:set CONGRESS_API_KEY "your-key-here"
netlify env:set ANTHROPIC_API_KEY "your-key-here"

# Or via Netlify UI: Site Settings > Environment Variables
```

---

## Common Pitfalls

- ❌ Don't use Pages Router (use App Router)
- ❌ Don't bypass Raindrop SDK
- ❌ Don't hardcode API keys
- ❌ Don't use separate voice generation (use text-to-dialogue)
- ❌ Don't use NextAuth or other auth libraries (use WorkOS)
- ❌ Don't skip journal entries
- ❌ Don't commit outside hackathon window
- ❌ Don't store audio in Raindrop (use Vultr)
- ❌ Don't skip mobile testing
- ❌ Don't forget to set environment variables in Netlify UI

---

## Netlify Deployment

### Configuration File
Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
  NEXT_TELEMETRY_DISABLED = "1"

# API Routes as Netlify Functions
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# Stripe Webhook
[[redirects]]
  from = "/api/webhooks/stripe"
  to = "/.netlify/functions/stripe-webhook"
  status = 200

# WorkOS Callback
[[redirects]]
  from = "/api/auth/callback"
  to = "/.netlify/functions/auth-callback"
  status = 200

# SPA fallback for client-side routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  conditions = {Role = ["missing"]}

[functions]
  node_bundler = "esbuild"
  directory = ".netlify/functions"
```

### Deployment Workflow

**Initial Setup:**
```bash
# Login to Netlify
netlify login

# Initialize site
netlify init

# Link to existing site (or create new)
netlify link
```

**Development:**
```bash
# Test locally with Netlify Dev (includes functions)
netlify dev

# This runs Next.js dev server + Netlify Functions locally
# Access at http://localhost:8888
```

**Deployment:**
```bash
# Deploy preview (draft)
netlify deploy

# Check preview URL, test thoroughly

# Deploy to production
netlify deploy --prod

# Or connect GitHub for auto-deploy on push
```

### Next.js + Netlify Integration

**Install Netlify Plugin:**
```bash
npm install -D @netlify/plugin-nextjs
```

**Next.js Config for Netlify:**
```javascript
// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Output for Netlify
  output: 'standalone',

  // Turbopack
  turbopack: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vultr-cdn.civicpulse.com',
      },
    ],
  },
};

export default config;
```

### Environment Variables Setup

**Set all variables:**
```bash
netlify env:set CONGRESS_API_KEY "your-key"
netlify env:set ANTHROPIC_API_KEY "your-key"
netlify env:set ELEVENLABS_API_KEY "your-key"
netlify env:set ELEVENLABS_SARAH_VOICE_ID "your-id"
netlify env:set ELEVENLABS_JAMES_VOICE_ID "your-id"
netlify env:set WORKOS_API_KEY "your-key"
netlify env:set WORKOS_CLIENT_ID "your-id"
netlify env:set WORKOS_REDIRECT_URI "https://civicpulse.netlify.app/api/auth/callback"
netlify env:set STRIPE_SECRET_KEY "your-key"
netlify env:set STRIPE_WEBHOOK_SECRET "your-webhook-secret"
netlify env:set VULTR_STORAGE_ENDPOINT "your-endpoint"
netlify env:set VULTR_ACCESS_KEY "your-key"
netlify env:set VULTR_SECRET_KEY "your-secret"
netlify env:set RAINDROP_SQL_URL "your-url"
```

**Public variables (client-side):**
```bash
netlify env:set NEXT_PUBLIC_APP_URL "https://civicpulse.netlify.app"
netlify env:set NEXT_PUBLIC_WORKOS_CLIENT_ID "your-client-id"
netlify env:set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "your-publishable-key"
```

### Netlify Functions (API Routes)

Next.js API routes automatically become Netlify Functions. No extra config needed with `@netlify/plugin-nextjs`.

**Example API Route:**
```typescript
// app/api/generate-podcast/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // This automatically becomes a Netlify Function
  // Available at: /.netlify/functions/generate-podcast

  return NextResponse.json({ success: true });
}
```

### Debugging Netlify Deployment

**Check build logs:**
```bash
netlify open:site
# Navigate to Deploys > [Latest Deploy] > Deploy log
```

**Test functions locally:**
```bash
netlify functions:list
netlify functions:invoke generate-podcast --payload '{"userId":"test"}'
```

**Common issues:**
- Environment variables not set → Use `netlify env:list` to verify
- Build fails → Check Node version in `netlify.toml`
- Functions timeout → Increase timeout in Netlify UI (max 26s on free tier)
- 404 on routes → Check `redirects` in `netlify.toml`

---

## Success Criteria

### Voice Agent Category
- ElevenLabs text-to-dialogue for natural multi-host conversations
- Dual hosts (Sarah + James) with professional NPR-quality
- Daily (5-7 min) + weekly (15-18 min) formats

### AI for Public Good Category
- Demonstrate civic engagement impact
- Accessibility (audio > 40-page bills)
- Transparency (Congressional Record sources)
- User testimonials and metrics

---

**Keep journal.md updated daily. Read nested claude.md files for detailed guidance. Focus on shipping features, not perfection.**