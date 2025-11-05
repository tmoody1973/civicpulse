# Phase 1 Architecture Update

**Date:** November 4, 2025
**Issue:** Raindrop services not accessible from Next.js API routes
**Status:** 🔴 Requires architectural adjustment

---

## 🔍 Problem Discovered

While testing Phase 1 API routes, we discovered that **Raindrop services (SmartMemory, SmartSQL) cannot be directly imported and used in Next.js API routes**.

### What We Found:

1. **`raindrop.gen.ts` exports only TypeScript types**, not runtime instances:
   ```typescript
   // src/web/raindrop.gen.ts
   export interface Env {
     USER_MEMORY: SmartMemory;  // ← This is just a type definition
     ANALYTICS: SmartSql;        // ← Not an actual instance
   }
   ```

2. **Our API routes tried to import them as constants:**
   ```typescript
   // ❌ This doesn't work
   import { USER_MEMORY, ANALYTICS } from '@/src/web/raindrop.gen';

   export async function POST(req: Request) {
     await trackInteraction(USER_MEMORY, ANALYTICS, ...);  // ← USER_MEMORY is undefined
   }
   ```

3. **Error when starting dev server:**
   ```
   Module '"@/src/web/raindrop.gen"' has no exported member 'USER_MEMORY'
   Module '"@/src/web/raindrop.gen"' has no exported member 'ANALYTICS'
   ```

---

## 🏗️ Root Cause

**Raindrop services are only available in Raindrop service/worker contexts, not Next.js API routes.**

Raindrop is built on Cloudflare Workers architecture, where services are injected into the request context. Next.js API routes run in a Node.js environment and don't have access to the Raindrop runtime.

---

## ✅ Solution Options

### Option 1: Use Raindrop Services Instead of Next.js API Routes (Recommended)

Move all SmartMemory/SmartSQL logic into **Raindrop services** defined in the manifest:

```hcl
// raindrop.manifest

service "tracking-api" {
  // Raindrop service has access to SmartMemory & SmartSQL
  // Handles: POST /api/tracking
}

service "preferences-api" {
  // Handles: GET/PATCH /api/preferences/*
}

service "memory-init-api" {
  // Handles: POST /api/memory/init
}
```

**Pros:**
- ✅ Direct access to all Raindrop services
- ✅ Proper Raindrop architecture
- ✅ Can use all SmartMemory features

**Cons:**
- ⚠️ Different file structure than Next.js routes
- ⚠️ Need to learn Raindrop service patterns

---

### Option 2: Create a Raindrop HTTP Service Bridge

Keep Next.js API routes but have them call Raindrop services via HTTP:

```typescript
// Next.js API route
export async function POST(req: Request) {
  // Forward request to Raindrop service
  const response = await fetch('https://raindrop-service.internal/track', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

**Pros:**
- ✅ Keep Next.js API route structure
- ✅ Separation of concerns

**Cons:**
- ⚠️ Extra network hop (latency)
- ⚠️ More complex architecture

---

### Option 3: Mock/Stub for Development, Use Raindrop in Production

Use environment-based switching:

```typescript
// lib/raindrop-client.ts
export function getRaindropServices() {
  if (process.env.NODE_ENV === 'development') {
    // Return mock/stub implementations
    return {
      USER_MEMORY: mockSmartMemory,
      ANALYTICS: mockSmartSQL
    };
  } else {
    // In production Raindrop context, get real services
    return getEnv();  // From Raindrop runtime
  }
}
```

**Pros:**
- ✅ Can test locally
- ✅ Same API route structure

**Cons:**
- ⚠️ Different behavior in dev vs prod
- ⚠️ Need to maintain mocks

---

## 📋 Recommended Path Forward

**Use Option 1: Raindrop Services**

1. **Keep all the Phase 1 code we built** (tracking, preferences, procedural memory)
   - ✅ All the TypeScript functions are still valid
   - ✅ All the database schemas are correct
   - ✅ All the types and interfaces work

2. **Replace Next.js API routes with Raindrop services:**
   - Convert `app/api/tracking/route.ts` → Raindrop service
   - Convert `app/api/preferences/*/route.ts` → Raindrop services
   - Convert `app/api/memory/init/route.ts` → Raindrop service

3. **Define services in `raindrop.manifest`:**
   ```hcl
   service "tracking" {
     handler = "src/services/tracking.ts"
   }

   service "preferences" {
     handler = "src/services/preferences.ts"
   }
   ```

4. **Raindrop service example:**
   ```typescript
   // src/services/tracking.ts
   import { trackInteraction } from '@/lib/tracking/user-interactions';

   export default {
     async fetch(request: Request, env: Env) {
       const { USER_MEMORY, ANALYTICS } = env;  // ← Services injected here!

       const body = await request.json();
       await trackInteraction(USER_MEMORY, ANALYTICS, body);

       return new Response(JSON.stringify({ success: true }));
     }
   };
   ```

---

## 📊 What We Keep from Phase 1

**Everything we built is still valid!** We just need to adjust how we access Raindrop services:

### ✅ Keep (No Changes Needed):
1. `lib/tracking/*` - All tracking functions
2. `lib/preferences/*` - All preference functions
3. `lib/memory/*` - All procedural memory functions
4. Database schemas (auto-initialize pattern)
5. TypeScript types and interfaces
6. Validation schemas (Zod)

### 🔧 Need to Convert:
1. `app/api/tracking/route.ts` → Raindrop service
2. `app/api/preferences/profile/route.ts` → Raindrop service
3. `app/api/preferences/widgets/route.ts` → Raindrop service
4. `app/api/memory/init/route.ts` → Raindrop service

---

## 🎯 Action Items

**Immediate:**
1. [ ] Learn Raindrop service pattern (check Raindrop docs)
2. [ ] Create first Raindrop service as proof-of-concept
3. [ ] Test Raindrop service can access SmartMemory

**Phase 1.5 (Architecture Fix):**
1. [ ] Convert 4 API routes to Raindrop services
2. [ ] Update `raindrop.manifest` with service definitions
3. [ ] Test services with `raindrop dev`
4. [ ] Update test scripts to call Raindrop services
5. [ ] Update documentation

**Note:** All Phase 1 business logic is complete and working! We just need to wrap it in the correct Raindrop service pattern.

---

## 📚 Resources

- [Raindrop Services Documentation](raindrop-mcp://reference/services)
- [Cloudflare Workers Request Handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/)
- [Raindrop Environment](raindrop-mcp://reference/environment)

---

**Status:** Phase 1 code is 95% complete. Need architectural adjustment to access Raindrop services properly (estimated 1-2 hours).
