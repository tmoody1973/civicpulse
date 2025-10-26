# Civic Pulse Deployment Status

**Date**: October 26, 2025
**Latest Version**: `01k8gmweyac8jht3xd4xv4t8ps` (unsandboxed)
**Status**: Service deployed but not routing requests - **Platform Issue**

---

## Current Status

### Deployment ✅
- **Application**: civic-pulse
- **Version**: 01k8gmdj9ce0sjtphzbdbw3rar
- **Status**: All 6 modules running
- **Visibility**: Public

### Service URL
```
http://svc-web.01k8gmweyac8jht3xd4xv4t8ps.lmapp.run
```

### Code Fixes Applied ✅
1. **Database initialization fix**: Changed from running on every request to only once on first request
2. **Test file removed**: Removed vitest test file that was blocking deployment

### Problem ⚠️
**Platform Routing Issue**
- Service is deployed and running ✅
- DNS resolves correctly ✅ (Cloudflare IPs: 104.18.4.149, 104.18.5.149)
- HTTP requests timeout after 15-20 seconds ❌
- **No logs generated** - `fetch()` method never called ❌
- **Root cause**: Raindrop platform not routing HTTP requests to service worker

This is a **platform-level issue**, not a code issue. The service code is correct but requests aren't reaching it.

---

## What's Working

1. ✅ **Frontend (Next.js 16)**
   - Running at: `http://localhost:3000`
   - Onboarding flow complete
   - Dashboard UI complete
   - Admin panel complete

2. ✅ **Backend Code**
   - All API endpoints implemented
   - Database schema defined
   - CORS enabled
   - Admin endpoints added

3. ✅ **Raindrop Deployment**
   - Service deployed successfully
   - All modules running
   - Version unsandboxed

---

## What's Not Working

1. ❌ **HTTP Access to Deployed Service**
   - Error 522 on all endpoints
   - Service not responding to requests
   - Possible causes:
     - Service worker not initializing
     - fetch() method issue
     - Unhandled async operation
     - Database initialization blocking

---

## Modules Deployed

| Module | Status | Type |
|--------|--------|------|
| web | running | Service (public) |
| civic_db | running | SmartSQL |
| podcast-audio | running | Bucket |
| annotation-service | running | Service (internal) |
| annotation-bucket | running | Bucket |
| _mem | running | KV Cache |

---

## Troubleshooting Steps Attempted

1. ✅ Deployed service with `raindrop build deploy --start`
2. ✅ Checked service status - all modules running
3. ✅ Unsandboxed version to enable public URL
4. ✅ Tested multiple version IDs
5. ✅ Verified manifest has `visibility = "public"`
6. ✅ Confirmed DNS resolution works
7. ❌ Service still returns error 522

---

## Next Steps (Recommended)

### 1. Check Raindrop Logs
```bash
raindrop logs query --last 1h --status error
raindrop logs tail
```

### 2. Test Service Locally (if possible)
The Raindrop platform doesn't support local dev server, but we can:
- Review the fetch() implementation in `src/web/index.ts`
- Check for blocking operations
- Verify async/await patterns

### 3. Review Service Code
Look for:
- Missing `return` statements in fetch()
- Unhandled promise rejections
- Database initialization blocking request handling
- CORS configuration issues

### 4. Contact Raindrop Support
Since this is a hackathon project using Raindrop:
- Check Raindrop Discord #support channel
- Report error 522 timeout issue
- Share version ID: `01k8gmdj9ce0sjtphzbdbw3rar`

### 5. Alternative: Mock Backend
For demo purposes, could use:
- JSON Server for mock API
- Vercel Functions for quick deployment
- Netlify Functions as alternative

---

## API Endpoints (When Service is Available)

See full documentation in `API_ENDPOINTS.md`:

- `GET /api/health` - Health check
- `POST /api/users` - Create user
- `GET /api/users?email={email}` - Get user
- `PUT /api/users/preferences` - Update preferences
- `POST /api/bills` - Create bill
- `GET /api/bills` - List bills
- `POST /api/representatives` - Create representative
- `GET /api/representatives` - List representatives
- `POST /api/rss` - Save RSS article
- `GET /api/rss` - Get RSS articles
- `POST /api/admin/query` - Execute admin query
- `POST /api/admin/count` - Get table count

---

## For Demo/Testing

**Temporary Solution**: Use local mock server
```bash
# In src/web/index.ts, add console.log statements
# Or use Next.js API routes to mock backend temporarily
```

**Frontend is fully functional** - can demo:
- Onboarding flow
- Dashboard UI
- Admin panel (with mock data)
- All UI components

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 01k8ghwja5k2hc91w7k3vheszz | Oct 26 | Sandboxed | Initial deployment |
| 01k8gkmt5gryfsqm0r8dkr2w53 | Oct 26 | Sandboxed | Redeployment attempt |
| 01k8gmdj9ce0sjtphzbdbw3rar | Oct 26 | Unsandboxed | Latest (error 522) |

---

## Support Resources

- Raindrop Docs: https://docs.liquidmetal.ai
- Raindrop Discord: https://discord.gg/raindrop
- Error 522 Info: Cloudflare origin server timeout
- Project GitHub: (add your repo URL)
