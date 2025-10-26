# API Clients - Implementation Guide

## External API Integrations

This file covers implementation patterns for external APIs:
- Congress.gov API (bills and members/representatives)
- Stripe API (payments)

---

## Congress.gov API

### Configuration

```typescript
// lib/api/congress.ts

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

// Rate limit: 1 request per second
const RATE_LIMIT_MS = 1000;
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve => 
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
}
```

### Fetch Bills

```typescript
export async function fetchBills(params: {
  congress: number;
  type?: 'hr' | 's' | 'hjres' | 'sjres';
  limit?: number;
  offset?: number;
}) {
  // Check cache first (24 hour TTL)
  const cacheKey = `bills:${params.congress}:${params.type}:${params.offset}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;
  
  // Rate limit
  await rateLimit();
  
  const url = new URL(`${BASE_URL}/bill/${params.congress}`);
  url.searchParams.append('api_key', CONGRESS_API_KEY);
  url.searchParams.append('limit', String(params.limit || 20));
  if (params.type) url.searchParams.append('type', params.type);
  if (params.offset) url.searchParams.append('offset', String(params.offset));
  
  const response = await fetch(url.toString(), {
    next: { revalidate: 86400 } // 24 hour cache
  });
  
  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Cache for 24 hours
  await cache.set(cacheKey, data, { ttl: 86400 });
  
  return data;
}
```

### Fetch Bill Details

```typescript
export async function fetchBillDetails(
  congress: number,
  type: string,
  number: string
) {
  const cacheKey = `bill:${congress}:${type}:${number}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;
  
  await rateLimit();
  
  const url = `${BASE_URL}/bill/${congress}/${type}/${number}?api_key=${CONGRESS_API_KEY}`;
  
  const response = await fetch(url, {
    next: { revalidate: 86400 }
  });
  
  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }
  
  const data = await response.json();
  await cache.set(cacheKey, data, { ttl: 86400 });
  
  return data;
}
```

### Fetch Bill Text

```typescript
export async function fetchBillText(
  congress: number,
  type: string,
  number: string
) {
  const cacheKey = `bill-text:${congress}:${type}:${number}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;
  
  await rateLimit();
  
  const url = `${BASE_URL}/bill/${congress}/${type}/${number}/text?api_key=${CONGRESS_API_KEY}`;
  
  const response = await fetch(url, {
    next: { revalidate: 86400 }
  });
  
  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Get the latest version of the bill text
  const latestVersion = data.textVersions?.[0];
  if (!latestVersion?.formats) {
    throw new Error('No bill text available');
  }
  
  // Get plain text format
  const textFormat = latestVersion.formats.find(f => f.type === 'Formatted Text');
  if (!textFormat?.url) {
    throw new Error('No text format available');
  }
  
  await rateLimit();
  
  const textResponse = await fetch(textFormat.url);
  const fullText = await textResponse.text();
  
  await cache.set(cacheKey, fullText, { ttl: 86400 });
  
  return fullText;
}
```

### Error Handling

```typescript
export async function fetchBillsWithRetry(
  params: any,
  maxRetries = 3
) {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchBills(params);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors
      if (error.message.includes('400') || error.message.includes('404')) {
        throw error;
      }
      
      // Exponential backoff
      if (i < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
  }
  
  throw lastError!;
}
```

---

## Congress.gov Members API

### Fetch Members

```typescript
export async function fetchMembers(params: {
  congress?: number;
  state?: string;
  district?: number;
  currentMember?: boolean;
  limit?: number;
  offset?: number;
}) {
  // Check cache first (7 day TTL - membership doesn't change often)
  const cacheKey = `members:${params.congress}:${params.state}:${params.district}:${params.currentMember}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  await rateLimit();

  const url = new URL(`${BASE_URL}/member`);
  url.searchParams.append('api_key', CONGRESS_API_KEY);
  url.searchParams.append('limit', String(params.limit || 20));

  if (params.congress) url.searchParams.append('congress', String(params.congress));
  if (params.state) url.searchParams.append('state', params.state);
  if (params.district) url.searchParams.append('district', String(params.district));
  if (params.currentMember !== undefined) {
    url.searchParams.append('currentMember', String(params.currentMember));
  }
  if (params.offset) url.searchParams.append('offset', String(params.offset));

  const response = await fetch(url.toString(), {
    next: { revalidate: 604800 } // 7 day cache
  });

  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }

  const data = await response.json();

  // Cache for 7 days
  await cache.set(cacheKey, data, { ttl: 604800 });

  return data;
}
```

### Fetch Member Details

```typescript
export async function fetchMemberDetails(bioguideId: string) {
  const cacheKey = `member:${bioguideId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  await rateLimit();

  const url = `${BASE_URL}/member/${bioguideId}?api_key=${CONGRESS_API_KEY}`;

  const response = await fetch(url, {
    next: { revalidate: 604800 } // 7 day cache
  });

  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }

  const data = await response.json();
  await cache.set(cacheKey, data, { ttl: 604800 });

  return data;
}
```

### Get Representatives by State and District

```typescript
interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: number;
  chamber: 'House' | 'Senate';
  imageUrl?: string;
  urls?: string[];
}

export async function getRepresentativesByLocation(
  state: string,
  district?: number
): Promise<Representative[]> {
  // Fetch current members for the state
  const membersData = await fetchMembers({
    state,
    district,
    currentMember: true,
    limit: 20
  });

  const representatives: Representative[] = [];

  for (const member of membersData.members || []) {
    representatives.push({
      bioguideId: member.bioguideId,
      name: member.name,
      party: member.partyName || 'Unknown',
      state: member.state,
      district: member.district,
      chamber: member.terms?.[0]?.chamber === 'Senate' ? 'Senate' : 'House',
      imageUrl: member.depiction?.imageUrl,
      urls: member.officialWebsiteUrl ? [member.officialWebsiteUrl] : []
    });
  }

  return representatives;
}
```

### Get Current Congress Members by State

```typescript
export async function getCurrentCongressMembersByState(
  state: string
): Promise<{ senators: Representative[]; representative?: Representative }> {
  const allMembers = await getRepresentativesByLocation(state);

  const senators = allMembers.filter(m => m.chamber === 'Senate');
  const representatives = allMembers.filter(m => m.chamber === 'House');

  return {
    senators,
    representative: representatives[0] // User will have one representative
  };
}
```

---

## Stripe API

### Configuration

```typescript
// lib/api/stripe.ts

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});
```

### Create Checkout Session

```typescript
export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    customer_email: await getUserEmail(userId),
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
  });
  
  return session;
}
```

### Handle Webhook Events

```typescript
export async function handleWebhookEvent(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    
    return event;
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}
```

### Process Subscription Events

```typescript
export async function handleCheckoutComplete(
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.userId;
  if (!userId) {
    throw new Error('No userId in session metadata');
  }
  
  // Update user subscription in database
  await db.users.update({
    where: { id: userId },
    data: {
      subscriptionTier: 'premium',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
    }
  });
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  
  // Find user by Stripe customer ID
  const user = await db.users.findFirst({
    where: { stripeCustomerId: customerId }
  });
  
  if (!user) {
    throw new Error('User not found for customer ID');
  }
  
  // Update subscription status
  const isActive = subscription.status === 'active';
  
  await db.users.update({
    where: { id: user.id },
    data: {
      subscriptionTier: isActive ? 'premium' : 'free',
      stripeSubscriptionId: subscription.id,
    }
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  
  const user = await db.users.findFirst({
    where: { stripeCustomerId: customerId }
  });
  
  if (user) {
    await db.users.update({
      where: { id: user.id },
      data: {
        subscriptionTier: 'free',
        stripeSubscriptionId: null,
      }
    });
  }
}
```

---

## Caching Strategy

### Cache Keys
```typescript
// Bills - 24 hour cache
`bills:${congress}:${type}:${offset}`
`bill:${congress}:${type}:${number}`
`bill-text:${congress}:${type}:${number}`

// Members - 7 day cache
`members:${congress}:${state}:${district}:${currentMember}`
`member:${bioguideId}`

// User data - no cache (always fresh)
```

### Cache TTLs
- **Bills list:** 24 hours (86400s)
- **Bill details:** 24 hours (86400s)
- **Bill full text:** 24 hours (86400s)
- **Members list:** 7 days (604800s)
- **Member details:** 7 days (604800s)
- **User sessions:** 7 days (604800s)

---

## Error Handling Patterns

### Retry Logic
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry client errors (4xx)
      if (error.message.match(/^(400|401|403|404)/)) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}
```

### Graceful Degradation
```typescript
export async function fetchBillsOrCache(params: any) {
  try {
    return await fetchBills(params);
  } catch (error) {
    console.error('Congress API failed, using stale cache:', error);
    
    // Try to get stale cache data
    const cacheKey = `bills:${params.congress}:${params.type}`;
    const staleData = await cache.get(cacheKey, { allowStale: true });
    
    if (staleData) {
      return staleData;
    }
    
    // If no cache, return empty result
    return { bills: [], error: 'Service temporarily unavailable' };
  }
}
```

---

## Testing

### Mock API Responses

```typescript
// __tests__/api/congress.test.ts

jest.mock('node-fetch');

describe('Congress API', () => {
  it('fetches bills with caching', async () => {
    const mockResponse = {
      bills: [
        { congress: 118, type: 'hr', number: '1' }
      ]
    };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });
    
    const bills = await fetchBills({ congress: 118 });
    expect(bills).toEqual(mockResponse);
    
    // Second call should use cache (no fetch)
    const cachedBills = await fetchBills({ congress: 118 });
    expect(cachedBills).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  
  it('respects rate limit', async () => {
    const start = Date.now();
    
    await fetchBills({ congress: 118 });
    await fetchBills({ congress: 118 });
    
    const duration = Date.now() - start;
    expect(duration).toBeGreaterThanOrEqual(1000); // 1 second rate limit
  });
});
```

---

## Performance Monitoring

### Track API Latency

```typescript
async function fetchWithMetrics<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    await trackMetric(`api.${name}.success`, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    await trackMetric(`api.${name}.error`, duration);
    
    throw error;
  }
}

// Usage
const bills = await fetchWithMetrics('congress.bills', 
  () => fetchBills({ congress: 118 })
);
```

---

## API Rate Limits Summary

| API | Rate Limit | Cache TTL | Retry Strategy |
|-----|------------|-----------|----------------|
| Congress.gov (Bills) | 1 req/sec | 24 hours | 3 retries, exponential backoff |
| Congress.gov (Members) | 1 req/sec | 7 days | 3 retries, exponential backoff |
| Stripe | No limit | No cache | Handle webhooks only |

---

## Best Practices

### Always:
- ✅ Check cache before API call
- ✅ Respect rate limits
- ✅ Use appropriate cache TTLs
- ✅ Handle errors gracefully
- ✅ Log API errors with context
- ✅ Use retry logic for server errors
- ✅ Don't retry client errors (4xx)

### Never:
- ❌ Make API calls without caching
- ❌ Ignore rate limits
- ❌ Expose API keys in client code
- ❌ Cache indefinitely (set TTLs)
- ❌ Swallow errors silently
- ❌ Make unnecessary API calls

---

**Always prioritize cached data for performance and cost savings. Only fetch fresh data when necessary.**