# API Routes - Standards & Patterns

## Route Structure

```
app/api/
├── generate-podcast/
│   └── route.ts
├── auth/
│   └── [...nextauth]/route.ts
├── webhooks/
│   └── stripe/route.ts
├── bills/
│   └── route.ts
├── representatives/
│   └── route.ts
└── user/
    └── route.ts
```

---

## Standard Route Pattern

```typescript
// app/api/[resource]/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const requestSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['daily', 'weekly'])
});

export async function POST(req: Request) {
  try {
    // 1. Parse and validate input
    const body = await req.json();
    const validated = requestSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error },
        { status: 400 }
      );
    }
    
    const { userId, type } = validated.data;
    
    // 2. Check authentication
    const session = await getSession(req);
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 3. Rate limiting
    if (!checkRateLimit(userId, 10, 60000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // 4. Execute business logic
    const result = await performAction(userId, type);
    
    // 5. Return success response
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    // 6. Error handling
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Generate Podcast Route

```typescript
// app/api/generate-podcast/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';
import { db } from '@/lib/db';

const requestSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['daily', 'weekly']),
  forceRegenerate: z.boolean().optional()
});

export async function POST(req: Request) {
  const start = Date.now();
  
  try {
    // Validate input
    const body = await req.json();
    const { userId, type, forceRegenerate } = requestSchema.parse(body);
    
    // Check auth with WorkOS session
    const user = await getSession();
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limit: 5 podcasts per hour
    if (!checkRateLimit(userId, 5, 3600000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // Check cache
    if (!forceRegenerate) {
      const cached = await getCachedPodcast(userId, type);
      if (cached) return NextResponse.json(cached);
    }
    
    // Get user data
    const user = await db.users.findUnique({
      where: { id: userId },
      include: { representatives: true, issues: true }
    });
    
    // Select bills
    const bills = await selectBillsForUser(user, type === 'daily' ? 3 : 1);
    
    // Generate dialogue script
    const dialogue = await generateDialogueScript(bills, user.representatives, type);
    
    // Generate audio
    const audioBuffer = await generateDialogue(dialogue);
    
    // Upload to Vultr
    const audioUrl = await uploadPodcast(audioBuffer, userId, type, {
      duration: calculateDuration(audioBuffer),
      billsCovered: bills.map(b => b.id),
      generatedAt: new Date()
    });
    
    // Save to database
    const transcript = dialogue.map(d => `${d.host.toUpperCase()}: ${d.text}`).join('\n\n');
    
    const podcast = await db.podcasts.create({
      data: {
        userId,
        type,
        audioUrl,
        transcript,
        billsCovered: bills.map(b => b.id),
        generatedAt: new Date()
      }
    });
    
    // Track performance
    const duration = Date.now() - start;
    await trackMetric('podcast-generation', duration, { userId, type });
    
    return NextResponse.json({
      success: true,
      audioUrl,
      duration: Math.round(calculateDuration(audioBuffer)),
      billsCovered: bills.map(b => ({ id: b.id, title: b.title }))
    });
    
  } catch (error) {
    console.error('Podcast generation error:', error);
    
    // Provide specific error messages
    if (error.message.includes('ElevenLabs')) {
      return NextResponse.json(
        { error: 'Voice generation failed. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate podcast' },
      { status: 500 }
    );
  }
}
```

---

## Authentication

### WorkOS Integration (Required)

**CRITICAL: Use WorkOS for Raindrop authentication** - Do not use NextAuth or other auth libraries.

```typescript
// lib/auth/workos.ts

import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const clientId = process.env.WORKOS_CLIENT_ID!;

export async function getAuthorizationUrl(provider: 'google' | 'twitter') {
  const authorizationUrl = workos.sso.getAuthorizationUrl({
    clientId,
    provider,
    redirectUri: process.env.WORKOS_REDIRECT_URI!,
  });
  
  return authorizationUrl;
}

export async function authenticateWithCode(code: string) {
  const { profile } = await workos.sso.getProfileAndToken({
    code,
    clientId,
  });
  
  return profile;
}
```

### Auth Routes

```typescript
// app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/auth/workos';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider') as 'google' | 'twitter';
  
  if (!provider) {
    return NextResponse.json({ error: 'Provider required' }, { status: 400 });
  }
  
  const authUrl = await getAuthorizationUrl(provider);
  return NextResponse.redirect(authUrl);
}
```

```typescript
// app/api/auth/callback/route.ts

import { NextResponse } from 'next/server';
import { authenticateWithCode } from '@/lib/auth/workos';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }
  
  try {
    const profile = await authenticateWithCode(code);
    
    // Create or update user in database
    const user = await db.users.upsert({
      where: { email: profile.email },
      create: {
        email: profile.email,
        name: profile.first_name + ' ' + profile.last_name,
      },
      update: {
        name: profile.first_name + ' ' + profile.last_name,
      }
    });
    
    // Create session (use secure cookies)
    const response = NextResponse.redirect('/dashboard');
    response.cookies.set('session', createSessionToken(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.redirect('/login?error=auth_failed');
  }
}
```

### Session Management

```typescript
// lib/auth/session.ts

import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export function createSessionToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export async function getSession() {
  const token = cookies().get('session')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await db.users.findUnique({
      where: { id: decoded.userId }
    });
    
    return user;
  } catch (error) {
    return null;
  }
}

export async function requireAuth() {
  const user = await getSession();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}
```

---

## Rate Limiting

```typescript
// lib/security/rate-limit.ts

const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(
  userId: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];
  
  // Remove old requests
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= limit) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  return true;
}
```

---

## Error Responses

### Standard Error Format
```typescript
{
  error: string;           // User-friendly message
  code?: string;           // Error code for client handling
  details?: any;           // Additional details (dev only)
}
```

### HTTP Status Codes
- **200:** Success
- **400:** Bad Request (validation failed)
- **401:** Unauthorized (not authenticated)
- **403:** Forbidden (authenticated but not allowed)
- **404:** Not Found
- **429:** Rate Limit Exceeded
- **500:** Internal Server Error
- **503:** Service Unavailable (external API down)

---

## Validation

```typescript
// Always use Zod for validation
import { z } from 'zod';

const billQuerySchema = z.object({
  congress: z.number().int().min(100).max(200),
  type: z.enum(['hr', 's', 'hjres', 'sjres']).optional(),
  limit: z.number().int().min(1).max(100).default(20)
});

// In route
const params = billQuerySchema.parse(queryParams);
```

---

## Logging

```typescript
// lib/logging/logger.ts

export function logRequest(req: Request, duration: number, status: number) {
  console.log({
    method: req.method,
    url: req.url,
    duration,
    status,
    timestamp: new Date().toISOString()
  });
}

export function logError(error: Error, context: Record<string, any>) {
  console.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
}
```

---

## Testing

```typescript
// __tests__/api/generate-podcast.test.ts

import { POST } from '@/app/api/generate-podcast/route';

describe('POST /api/generate-podcast', () => {
  it('generates podcast for valid request', async () => {
    const req = new Request('http://localhost:3000/api/generate-podcast', {
      method: 'POST',
      body: JSON.stringify({ userId: 'test-123', type: 'daily' })
    });
    
    const response = await POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('audioUrl');
  });
  
  it('rejects unauthenticated requests', async () => {
    const req = new Request('http://localhost:3000/api/generate-podcast', {
      method: 'POST',
      body: JSON.stringify({ type: 'daily' })
    });
    
    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});
```

---

## Performance

### Timeouts
- Max execution time: 60s (Raindrop limit)
- For longer operations, use background jobs

### Caching
- Cache GET responses with appropriate TTL
- Use SmartMemory for frequently accessed data
- Invalidate cache on mutations

### Monitoring
- Track request duration
- Alert if p95 > 500ms
- Monitor error rate (target <1%)

---

**Always validate input, check auth, handle errors gracefully, and log appropriately.**