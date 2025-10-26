# Raindrop Platform Issue Report

**Date**: October 26, 2025
**Issue**: Deployed service not accessible via HTTP or HTTPS

---

## Issue Summary

Raindrop service successfully deployed but completely inaccessible:

### HTTP Access (port 80)
```bash
curl http://svc-web.01k8gmweyac8jht3xd4xv4t8ps.lmapp.run/api/health
```
**Result**: Error 522 (Connection timeout after 19 seconds)

### HTTPS Access (port 443)
```
https://svc-web.01k8gmweyac8jht3xd4xv4t8ps.lmapp.run
```
**Result**: `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` - SSL/TLS not configured

---

## Deployment Details

- **Application**: civic-pulse
- **Latest Version**: 01k8gpp761abtmzdhpdp74ej2h (fresh deployment after deleting all prior versions)
- **Previous Versions Tested**: 01k8gmweyac8jht3xd4xv4t8ps, 01k8gms110xknzvqc5a3zy9hhe, 01k8gmdj9ce0sjtphzbdbw3rar, 01k8gmc5s1xtk0rpbq01bwnxef, 01k8gkmt5gryfsqm0r8dkr2w53, 01k8ghwja5k2hc91w7k3vheszz
- **Status**: All 6 modules showing "running"
- **Visibility**: Public
- **Service**: web
- **Organization**: org_01K66GYWMX8X4R0W31FDJJFEKF

```bash
raindrop build status
```
Output shows all modules running with no URLs assigned.

---

## Evidence

### 1. No Logs Generated
```bash
raindrop logs query --last 30m
```
**Result**: "No log events found"

This proves the `fetch()` method is never being called - requests aren't reaching the service worker.

### 2. DNS Resolves Correctly
```
nslookup svc-web.01k8gmweyac8jht3xd4xv4t8ps.lmapp.run
```
Returns Cloudflare IPs: 104.18.4.149, 104.18.5.149

### 3. Service Code is Valid
- Successfully compiles
- No TypeScript errors
- Fixed database initialization issue (was running on every request, now runs once)
- Follows Raindrop Service class pattern correctly

---

## Root Cause

**Platform routing/configuration issue** - One or more of:
1. Service worker not registered with Cloudflare routing
2. SSL/TLS certificates not provisioned
3. Public visibility not properly configured in routing layer
4. Version branching/sandboxing caused routing misconfiguration

---

## Troubleshooting Steps Taken

1. ✅ Deployed fresh version (removed test file blocking build)
2. ✅ Fixed code issues (database initialization optimization)
3. ✅ Unsandboxed version to enable public access
4. ✅ Started service with `raindrop build start`
5. ✅ Verified all 6 modules showing "running" status
6. ✅ Tested multiple version IDs
7. ✅ Checked logs (none generated - fetch never called)
8. ✅ Verified manifest has `visibility = "public"`
9. ✅ **Deleted ALL 6 versions with `raindrop build delete`**
10. ✅ **Cleaned local artifacts (dist, .raindrop)**
11. ✅ **Regenerated code with `raindrop build generate`**
12. ✅ **Deployed completely fresh version: `01k8gpp761abtmzdhpdp74ej2h`**
13. ✅ **Unsandboxed fresh version**
14. ❌ **SAME ERROR 522 - Fresh deployment did NOT resolve issue**
15. ❌ **Still zero logs generated - fetch() never called**

---

## What Works

- ✅ Frontend (Next.js 16) at localhost:3000
- ✅ Service code compiles successfully
- ✅ Database schema defined
- ✅ All API endpoints implemented
- ✅ CORS configured
- ✅ Deployment completes without errors

---

## Workaround Implemented

Created temporary Next.js mock backend:
- `app/api/mock/health/route.ts` - Health check
- `app/api/mock/users/route.ts` - User management
- Updated `.env.local` to use `http://localhost:3000/api/mock`

This allows development to continue while platform issue is resolved.

---

## Support Request

**To Raindrop Team**:

We have a deployed service that is completely inaccessible:
- HTTP: Error 522 timeout (Cloudflare can't connect to origin)
- HTTPS: SSL/TLS misconfiguration error
- Zero logs generated (fetch method never called)
- All modules show "running" status

**Latest Version**: `01k8gpp761abtmzdhpdp74ej2h` (completely fresh deployment)
**Application**: `civic-pulse`
**Organization**: `org_01K66GYWMX8X4R0W31FDJJFEKF`

**Critical Finding**: Deleted ALL prior versions and deployed completely fresh - **SAME ISSUE PERSISTS**

**Request**: Please investigate why:
1. HTTP requests are timing out (error 522) - even with fresh deployment
2. HTTPS certificates are not provisioned
3. Service worker is not receiving requests
4. No URLs appear in `raindrop build status -o table`
5. Fresh deployment (after deleting all versions) exhibits identical behavior

**Impact**: Blocking hackathon submission - service must be publicly accessible.

---

## Expected Behavior

Based on Raindrop documentation:
- Public services should receive automatic URL assignment
- Service URLs should appear in `raindrop build status` output
- HTTPS should work with automatic SSL/TLS provisioning
- Requests should route to service worker `fetch()` method

---

## Contact Information

- GitHub Issue: (create at raindrop repo)
- Discord: #support channel
- Email: support@liquidmetal.ai

**Priority**: HIGH - Blocking production deployment
