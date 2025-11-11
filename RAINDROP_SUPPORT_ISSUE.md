# Raindrop Deployment Issue - Support Request

**Date:** January 10, 2025
**Project:** HakiVo (civic-pulse)
**Service URL:** `https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run`
**Version ID:** `01k8kf2b9x7snxw0gya5zfvmya` (currently running)
**Phantom Version:** `01k9qgfw0ekhnza2rpwmry7k6z` (blocking deployment)

---

## Problem Summary

We are unable to deploy updated code to our Raindrop application because of a phantom version (`01k9qgfw0ekhnza2rpwmry7k6z`) that is blocking all deployment attempts with the error:

```
[internal] Application civic-pulse@01k9qgfw0ekhnza2rpwmry7k6z is currently branching from this version, please wait until it deploys
```

However, when we check for this version using `raindrop build list`, it does not appear in the list of versions, suggesting it's stuck in an intermediate "branching" state.

**Based on Raindrop documentation:** According to the official docs, this error indicates that version `01k9qgfw` is in the process of branching from our current version `01k8kf2b`, but the branching operation appears to have not completed. The documentation states that branching creates a new version and marks it as sandboxed, but something went wrong during this process, leaving the version in a locked state that blocks all subsequent operations.

---

## What We're Trying to Accomplish

### Goal
Update the `admin-api` service to include `news_articles` in its table whitelist so we can:
1. Create the `news_articles` table in CIVIC_DB
2. Store fetched news articles for our personalized news dashboard feature
3. Complete our hackathon project requirements

### Required Change
**Source file:** `src/admin-api/index.ts`
**Change:** Add `news_articles` to the `CIVIC_DB_TABLES` whitelist array (already done in source)

```typescript
const CIVIC_DB_TABLES = [
  'users',
  'bills',
  'representatives',
  'user_bills',
  'podcasts',
  'rss_articles',
  'vote_records',
  'sync_history',
  'briefs',
  'news_articles' // ← This line needs to be in deployed version
];
```

### Current Deployment State
**Deployed version** (`01k8kf2b`) does **NOT** have `news_articles` in the whitelist.
**Local dist files** (`dist/admin-api/index.js`) **DO** have `news_articles` after running `raindrop build`.

---

## Timeline of Events

### 1. Initial State
- Application `civic-pulse` version `01k8kf2b` was running successfully
- admin-api service had outdated whitelist (missing `news_articles`)

### 2. First Deployment Attempt
```bash
raindrop build          # Successfully built with updated whitelist
raindrop build deploy --amend --start
```

**Result:** Deployment failed with phantom version error

### 3. Troubleshooting Attempts

#### Attempt 1: Check for phantom version
```bash
raindrop build list --app civic-pulse
```
**Result:** Only shows version `01k8kf2b` - version `01k9qgfw` not found

#### Attempt 2: Try to delete phantom version
```bash
raindrop build delete 01k9qgfw0ekhnza2rpwmry7k6z
```
**Result:** Error - version not found

#### Attempt 3: Stop and redeploy
```bash
raindrop build stop
raindrop build deploy --amend
```
**Result:** Same phantom version error

#### Attempt 4: Fresh deployment (no --amend)
```bash
raindrop build deploy --start
```
**Result:** Same phantom version error

#### Attempt 5: Check running services
```bash
raindrop build status
```
**Result:** Shows 38 modules running, all in "running" state, but this is the OLD version without our changes

---

## Detailed Error Information

### Error Message
```
[internal] Application civic-pulse@01k9qgfw0ekhnza2rpwmry7k6z is currently branching from this version, please wait until it deploys
```

### When Error Occurs
- During the deploy phase after successful build
- Happens with both `--amend` and fresh deployment
- Blocks ALL deployment attempts

### What We've Verified
1. ✅ Source code (`src/admin-api/index.ts`) has correct whitelist with `news_articles`
2. ✅ Built dist files (`dist/admin-api/index.js`) have correct whitelist with `news_articles`
3. ✅ Build command (`raindrop build`) completes successfully
4. ✅ Current running version (`01k8kf2b`) is stable and functioning
5. ❌ Cannot deploy updated code due to phantom version blocking

### What We've Tested
- Querying the deployed admin-api returns "Invalid table name" for `news_articles` (confirming deployed version doesn't have updated whitelist)
- Local dist files correctly include `news_articles` in whitelist (line 111 of dist/admin-api/index.js)
- All 38 modules show as "running" in `raindrop build status` but these are running the OLD code

---

## Expected Behavior vs Actual Behavior

### Expected
1. Run `raindrop build` → Generates updated dist files
2. Run `raindrop build deploy --amend --start` → Uploads new bundles to existing version
3. Services restart with updated code
4. admin-api now accepts `news_articles` as valid table

### Actual
1. ✅ Run `raindrop build` → Generates updated dist files
2. ❌ Run `raindrop build deploy --amend --start` → Fails with phantom version error
3. ❌ Services continue running OLD code
4. ❌ admin-api still rejects `news_articles` as invalid table

---

## Impact

### Business Impact
- Cannot complete hackathon project feature (personalized news dashboard)
- Missing deadline for Liquid Metal hackathon submission
- User-facing feature is broken (shows "No personalized news yet" despite articles being fetched)

### Technical Impact
- Stuck on version `01k8kf2b` - cannot deploy any updates
- Cannot add new tables to CIVIC_DB via admin-api
- Forced to use workarounds (direct CIVIC_DB.exec() from services)

---

## Insights from Official Documentation

According to the [Raindrop Versioning Documentation](https://docs.raindrop.liquidmetal.ai/reference/versioning) and [Build CLI Documentation](https://docs.raindrop.liquidmetal.ai/reference/cli/build):

### About Branching
- "Creates new version based on current or specified version"
- "New branch is automatically marked as sandboxed"
- "Fails if application is in locked or sandbox state"

### About Locked State
The documentation mentions "locked state" extensively:
- `raindrop build start`: "Fails if application is in locked state"
- `raindrop build stop`: "Fails if application is in locked state"
- `raindrop build branch`: "Fails if application is in locked or sandbox state"
- `raindrop build checkout`: "Fails if application is in locked state"

**However, the documentation does NOT explain:**
- How an application enters a locked state
- How to exit a locked state
- How long a branching operation should take
- What to do if a branching operation hangs indefinitely

### Our Specific Issue
We appear to be stuck in the branching phase where:
1. Version `01k9qgfw` was created (we can see it in error messages)
2. The branching operation never completed (version not visible in `raindrop build list`)
3. The application is in a "locked state" preventing all operations
4. No documented way to unlock or cancel the hanging branch operation

## Questions for Raindrop Support

1. **How can we clear the phantom version `01k9qgfw0ekhnza2rpwmry7k6z` that's stuck in branching state?**
   - Is there a backend command to force-complete or cancel the branch?
   - Can you manually remove this version from the catalog?
   - Is there a hidden state we can't see with `raindrop build list`?

2. **What causes a branching operation to hang indefinitely?**
   - Is this a leftover from a failed deployment?
   - Is there a timeout we should wait for?
   - Can branching operations be cancelled if they hang?

3. **How do we unlock an application stuck in "locked state"?**
   - The documentation mentions locked state but doesn't explain how to unlock
   - Is there a `raindrop build unlock` command we're missing?
   - Can locked state be cleared manually from the backend?

4. **Can we force a fresh deployment bypassing the branch check?**
   - Is there a way to completely bypass the phantom version check?
   - Can we use `--lock <value>` flag mentioned in deploy docs to override?
   - Should we delete version `01k8kf2b` entirely and start fresh?

5. **Alternative solutions?**
   - Can we manually upload bundles?
   - Can we use a different deployment strategy?
   - Should we recreate the entire application with a new name?

---

## Workarounds Attempted

### Workaround 1: Use test-service to create table directly
We have a `test-service` with an endpoint that can create the table using `env.CIVIC_DB.exec()` directly, bypassing the admin-api whitelist. However:
- This is not a proper long-term solution
- admin-api still needs the updated whitelist for queries
- This doesn't solve the deployment blocker for future updates

### Workaround 2: Create new application
We could create a completely new Raindrop application, but:
- Lose all data in CIVIC_DB
- Lose environment variables and configuration
- Requires updating all client code with new service URL
- Not ideal during a hackathon time crunch

---

## Files and Logs Available

We can provide:
- Complete raindrop.manifest
- dist/admin-api/index.js (built bundle)
- src/admin-api/index.ts (source code)
- Full deployment logs
- Output of `raindrop build status`
- Output of `raindrop build list`

---

## Request

**Please help us either:**
1. Clear the phantom version `01k9qgfw0ekhnza2rpwmry7k6z` so we can deploy, OR
2. Provide alternative method to deploy our updated admin-api bundle, OR
3. Force a fresh deployment that bypasses the version conflict

**Time sensitive:** This is for a hackathon submission with deadline approaching.

---

## Contact Information

**GitHub:** @tarikmoody
**Project:** HakiVo - AI-powered civic engagement platform
**Hackathon:** Liquid Metal AI Hackathon
**Service URL:** `https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run`

---

## Appendix: Deployment Command Outputs

### raindrop build (successful)
```
Building Raindrop application...
✓ Build completed successfully
✓ Generated bundles in dist/
```

### raindrop build deploy --amend --start (failed)
```
Building production release...
Successful build of 38 modules in 1m 13.512s
[internal] Application civic-pulse@01k9qgfw0ekhnza2rpwmry7k6z is currently branching from this version, please wait until it deploys
```

### raindrop build list
```
VERSIONS
--------
01k8kf2b9x7snxw0gya5zfvmya    running    civic-pulse    (current)
```
Note: Phantom version `01k9qgfw` does NOT appear in this list

### raindrop build status
```
38 modules all showing "running" status
But these are running the OLD code without our updates
```

---

Thank you for your help! 🙏
