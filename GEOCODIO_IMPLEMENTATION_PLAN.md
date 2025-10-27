# Geocodio Integration Implementation Plan

**Last Updated:** October 27, 2025
**Status:** Planning Phase
**Estimated Total Time:** 8-12 hours
**Priority:** Phase 1 (Critical for Onboarding MVP)

---

## Executive Summary

Integrate Geocodio API to provide instant representative lookup during user onboarding. One API call returns congressional district + 3 legislators (1 House Rep + 2 Senators) with complete profile data in ~200ms vs ~800ms+ for Congress.gov.

**Key Advantage:** Geocodio returns the same `bioguide_id` used by Congress.gov, enabling a hybrid approach:
1. **Geocodio** → Fast initial lookup with contact/social data
2. **Congress.gov** → Deep dive data (committees, votes) using the bioguide_id

**Free Tier:** 2,500 daily lookups (sufficient for MVP and early growth)

---

## Prerequisites

### 1. API Credentials
- [ ] Sign up at https://geocod.io
- [ ] Get API key from dashboard
- [ ] Add to environment variables:
  ```bash
  GEOCODIO_API_KEY=your_key_here
  ```

### 2. Database Schema Verification
Verify `representatives` table has these columns:
```sql
CREATE TABLE representatives (
  id TEXT PRIMARY KEY,
  bioguide_id TEXT UNIQUE NOT NULL,  -- KEY: Same as Congress.gov!
  name TEXT NOT NULL,
  party TEXT,
  state TEXT,
  district TEXT,
  chamber TEXT CHECK(chamber IN ('house', 'senate')),
  image_url TEXT,
  office_address TEXT,
  phone TEXT,
  website_url TEXT,
  twitter_handle TEXT,
  facebook_handle TEXT,
  youtube_handle TEXT,
  committees TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bioguide ON representatives(bioguide_id);
CREATE INDEX idx_state_district ON representatives(state, district);
```

Verify `user_representatives` junction table exists:
```sql
CREATE TABLE user_representatives (
  user_id TEXT NOT NULL,
  representative_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, representative_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (representative_id) REFERENCES representatives(id)
);
```

### 3. Database Update Script
Run migration to add missing columns if needed:
```sql
-- Add social media columns if missing
ALTER TABLE representatives ADD COLUMN facebook_handle TEXT;
ALTER TABLE representatives ADD COLUMN youtube_handle TEXT;
```

### 4. Dependencies
Install Geocodio SDK (optional, can use fetch):
```bash
npm install geocodio-library-node
```

---

## Phase 1: Backend API Integration (3 hours)

### Task 1.1: Create Geocodio Client Module
**File:** `lib/api/geocodio.ts`
**Time:** 1 hour
**Dependencies:** None

**Implementation:**
```typescript
// lib/api/geocodio.ts

/**
 * Geocodio API Client
 *
 * Provides congressional district and representative lookup
 * using zip code or full address.
 *
 * FREE TIER: 2,500 lookups/day
 * RESPONSE TIME: ~200ms (vs Congress.gov ~800ms)
 */

const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY!;
const BASE_URL = 'https://api.geocod.io/v1.7';

// === Type Definitions ===

export interface CongressionalDistrictData {
  name: string; // e.g., "Congressional District 8"
  district_number: number; // 8 (or 0 for at-large, 98 for non-voting)
  ocd_id: string; // "ocd-division/country:us/state:va/cd:8"
  congress_number: string; // "119th"
  congress_years: string; // "2025-2027"
  proportion: number; // For zip codes that span multiple districts
  current_legislators: Legislator[];
}

export interface Legislator {
  type: 'representative' | 'senator';
  seniority: 'senior' | 'junior' | null;
  bio: {
    last_name: string;
    first_name: string;
    birthday: string; // ISO date
    gender: 'M' | 'F';
    party: string; // "Democrat", "Republican", "Independent"
    photo_url: string;
    photo_attribution: string;
  };
  contact: {
    url: string;
    address: string; // Full office address
    phone: string;
    contact_form: string | null;
  };
  social: {
    rss_url: string | null;
    twitter: string | null;
    facebook: string | null;
    youtube: string | null;
    youtube_id: string | null;
  };
  references: {
    bioguide_id: string; // ⭐ SAME AS CONGRESS.GOV
    thomas_id: string;
    opensecrets_id: string;
    lis_id: string | null;
    cspan_id: string;
    govtrack_id: string;
    votesmart_id: string;
    ballotpedia_id: string;
    washington_post_id: string | null;
    icpsr_id: string;
    wikipedia_id: string;
  };
  source: string;
}

export interface GeocodioResponse {
  input: {
    postal_code?: string;
    address_components?: any;
  };
  results: Array<{
    address_components: any;
    formatted_address: string;
    location: {
      lat: number;
      lng: number;
    };
    accuracy: number;
    accuracy_type: string;
    source: string;
    fields: {
      congressional_districts: CongressionalDistrictData[];
    };
  }>;
}

// === API Functions ===

/**
 * Look up representatives by ZIP code
 *
 * Returns congressional district + all legislators (1 rep + 2 senators)
 *
 * @param zipCode - 5-digit US ZIP code
 * @returns Array of congressional districts (may be multiple if ZIP spans districts)
 * @throws Error if zip code is invalid or API fails
 */
export async function getRepresentativesByZip(
  zipCode: string
): Promise<CongressionalDistrictData[]> {
  // Validate ZIP code
  if (!/^\d{5}$/.test(zipCode)) {
    throw new Error('Invalid ZIP code format. Must be 5 digits.');
  }

  const url = `${BASE_URL}/geocode?postal_code=${zipCode}&fields=cd119&api_key=${GEOCODIO_API_KEY}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 604800 } // Cache for 7 days
    });

    if (!response.ok) {
      throw new Error(`Geocodio API error: ${response.status} ${response.statusText}`);
    }

    const data: GeocodioResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No results found for ZIP code');
    }

    const bestResult = data.results[0];

    if (!bestResult?.fields?.congressional_districts) {
      throw new Error('No congressional district found for ZIP code');
    }

    // Sort by proportion (highest first) for multi-district ZIPs
    return bestResult.fields.congressional_districts.sort(
      (a, b) => b.proportion - a.proportion
    );
  } catch (error) {
    console.error('Geocodio lookup error:', error);
    throw error;
  }
}

/**
 * Look up representatives by full address
 *
 * More accurate than ZIP code for addresses that span multiple districts
 *
 * @param address - Full street address (e.g., "1109 N Highland St, Arlington VA")
 * @returns Array of congressional districts (usually 1)
 */
export async function getRepresentativesByAddress(
  address: string
): Promise<CongressionalDistrictData[]> {
  const url = `${BASE_URL}/geocode?q=${encodeURIComponent(address)}&fields=cd119&api_key=${GEOCODIO_API_KEY}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 604800 }
    });

    if (!response.ok) {
      throw new Error(`Geocodio API error: ${response.status} ${response.statusText}`);
    }

    const data: GeocodioResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No results found for address');
    }

    const bestResult = data.results[0];

    if (!bestResult?.fields?.congressional_districts) {
      throw new Error('No congressional district found for address');
    }

    return bestResult.fields.congressional_districts;
  } catch (error) {
    console.error('Geocodio lookup error:', error);
    throw error;
  }
}

// === Helper Functions ===

/**
 * Extract state abbreviation from office address
 *
 * @example "1226 Longworth House Office Building Washington DC 20515-4608" → "DC"
 */
export function extractStateFromAddress(address: string): string {
  const stateMatch = address.match(/\b([A-Z]{2})\b/);
  return stateMatch ? stateMatch[1] : 'Unknown';
}

/**
 * Extract district number from congressional district name
 *
 * @example "Congressional District 8" → 8
 */
export function extractDistrictNumber(districtName: string): number | null {
  const match = districtName.match(/District (\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Convert district data to state abbreviation
 *
 * @example "ocd-division/country:us/state:va/cd:8" → "VA"
 */
export function extractStateFromOcdId(ocdId: string): string {
  const match = ocdId.match(/state:([a-z]{2})/);
  return match ? match[1].toUpperCase() : 'Unknown';
}
```

**Acceptance Criteria:**
- [ ] All TypeScript interfaces defined
- [ ] getRepresentativesByZip() function implemented with error handling
- [ ] getRepresentativesByAddress() function implemented
- [ ] Helper functions for data extraction
- [ ] Input validation (ZIP code format)
- [ ] Response caching (7 days)
- [ ] Error handling with descriptive messages

---

### Task 1.2: Create Database Helper Functions
**File:** `lib/db/representatives.ts`
**Time:** 1.5 hours
**Dependencies:** Task 1.1

**Implementation:**
```typescript
// lib/db/representatives.ts

import type { D1Database } from '@cloudflare/workers-types';
import type { Legislator } from '@/lib/api/geocodio';
import { generateUUID } from '@/lib/utils';

/**
 * Save legislators from Geocodio to database
 *
 * Uses INSERT OR REPLACE to update existing representatives
 * Returns array of representative IDs
 */
export async function saveLegislatorsToDatabase(
  legislators: Legislator[],
  db: D1Database
): Promise<string[]> {
  const savedIds: string[] = [];

  for (const legislator of legislators) {
    // Check if representative already exists
    const existing = await db
      .prepare('SELECT id FROM representatives WHERE bioguide_id = ?')
      .bind(legislator.references.bioguide_id)
      .first<{ id: string }>();

    const id = existing?.id || generateUUID();

    // Extract state from address
    const state = extractStateFromAddress(legislator.contact.address);

    // Prepare data
    const name = `${legislator.bio.first_name} ${legislator.bio.last_name}`;
    const chamber = legislator.type === 'representative' ? 'house' : 'senate';
    const district = legislator.type === 'representative' ? extractDistrictNumber(legislator.name) : null;

    // Insert or update
    await db
      .prepare(`
        INSERT OR REPLACE INTO representatives (
          id, bioguide_id, name, party, state, district, chamber,
          image_url, office_address, phone, website_url,
          twitter_handle, facebook_handle, youtube_handle,
          committees, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        id,
        legislator.references.bioguide_id,
        name,
        legislator.bio.party,
        state,
        district,
        chamber,
        legislator.bio.photo_url,
        legislator.contact.address,
        legislator.contact.phone,
        legislator.contact.url,
        legislator.social.twitter,
        legislator.social.facebook,
        legislator.social.youtube,
        JSON.stringify([]) // Empty committees array for now
      )
      .run();

    savedIds.push(id);
  }

  return savedIds;
}

/**
 * Link user to their representatives
 */
export async function linkUserToRepresentatives(
  userId: string,
  representativeIds: string[],
  db: D1Database
): Promise<void> {
  for (const repId of representativeIds) {
    await db
      .prepare(`
        INSERT OR IGNORE INTO user_representatives (user_id, representative_id)
        VALUES (?, ?)
      `)
      .bind(userId, repId)
      .run();
  }
}

/**
 * Get user's representatives
 */
export async function getUserRepresentatives(
  userId: string,
  db: D1Database
) {
  const result = await db
    .prepare(`
      SELECT r.*
      FROM representatives r
      INNER JOIN user_representatives ur ON r.id = ur.representative_id
      WHERE ur.user_id = ?
      ORDER BY r.chamber DESC, r.name
    `)
    .bind(userId)
    .all();

  return result.results;
}

/**
 * Helper: Extract state from address string
 */
function extractStateFromAddress(address: string): string {
  const stateMatch = address.match(/\b([A-Z]{2})\b/);
  return stateMatch ? stateMatch[1] : 'Unknown';
}

/**
 * Helper: Extract district number from name
 */
function extractDistrictNumber(name: string): number | null {
  const match = name.match(/District (\d+)/);
  return match ? parseInt(match[1]) : null;
}
```

**Acceptance Criteria:**
- [ ] saveLegislatorsToDatabase() handles INSERT OR REPLACE logic
- [ ] linkUserToRepresentatives() uses INSERT OR IGNORE to prevent duplicates
- [ ] getUserRepresentatives() returns all 3 representatives
- [ ] Proper error handling and logging
- [ ] Type safety with TypeScript

---

### Task 1.3: Create Onboarding API Route
**File:** `app/api/onboarding/lookup-reps/route.ts`
**Time:** 30 minutes
**Dependencies:** Task 1.1, Task 1.2

**Implementation:**
```typescript
// app/api/onboarding/lookup-reps/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepresentativesByZip } from '@/lib/api/geocodio';
import { saveLegislatorsToDatabase, linkUserToRepresentatives } from '@/lib/db/representatives';
import { getEnv } from '@/lib/env';

const requestSchema = z.object({
  zipCode: z.string().regex(/^\d{5}$/, 'Invalid ZIP code'),
  userId: z.string().uuid().optional()
});

export async function POST(req: Request) {
  try {
    // 1. Validate input
    const body = await req.json();
    const { zipCode, userId } = requestSchema.parse(body);

    // 2. Look up representatives via Geocodio
    const districtData = await getRepresentativesByZip(zipCode);
    const primaryDistrict = districtData[0];

    if (!primaryDistrict?.current_legislators) {
      return NextResponse.json(
        { error: 'No representatives found for ZIP code' },
        { status: 404 }
      );
    }

    // 3. Get Raindrop environment
    const env = getEnv();

    // 4. Save legislators to database
    const repIds = await saveLegislatorsToDatabase(
      primaryDistrict.current_legislators,
      env.CIVIC_DB
    );

    // 5. Link to user if userId provided
    if (userId) {
      await linkUserToRepresentatives(userId, repIds, env.CIVIC_DB);

      // Update user's zip code and district
      await env.CIVIC_DB
        .prepare(`
          UPDATE users
          SET
            zip_code = ?,
            congressional_district = ?,
            state = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(
          zipCode,
          primaryDistrict.name,
          extractStateFromOcdId(primaryDistrict.ocd_id),
          userId
        )
        .run();
    }

    // 6. Return representative data
    const representatives = primaryDistrict.current_legislators.map(leg => ({
      bioguide_id: leg.references.bioguide_id,
      name: `${leg.bio.first_name} ${leg.bio.last_name}`,
      party: leg.bio.party,
      type: leg.type,
      photo: leg.bio.photo_url,
      phone: leg.contact.phone,
      website: leg.contact.url,
      twitter: leg.social.twitter,
      facebook: leg.social.facebook
    }));

    return NextResponse.json({
      success: true,
      district: {
        name: primaryDistrict.name,
        number: primaryDistrict.district_number,
        state: extractStateFromOcdId(primaryDistrict.ocd_id),
        congress: primaryDistrict.congress_number
      },
      representatives
    });

  } catch (error) {
    console.error('Representative lookup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to look up representatives' },
      { status: 500 }
    );
  }
}

function extractStateFromOcdId(ocdId: string): string {
  const match = ocdId.match(/state:([a-z]{2})/);
  return match ? match[1].toUpperCase() : 'Unknown';
}
```

**Acceptance Criteria:**
- [ ] Validates ZIP code format with Zod
- [ ] Calls Geocodio API
- [ ] Saves legislators to database
- [ ] Links legislators to user (if userId provided)
- [ ] Returns clean response with district + representatives
- [ ] Proper error handling (400 for validation, 404 for no results, 500 for server errors)

---

## Phase 2: Frontend Integration (3 hours)

### Task 2.1: Update Onboarding Page
**File:** `app/onboarding/page.tsx`
**Time:** 2 hours
**Dependencies:** Phase 1

**Implementation:**
```typescript
// app/onboarding/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, MapPin, User } from 'lucide-react';

interface Representative {
  bioguide_id: string;
  name: string;
  party: string;
  type: 'representative' | 'senator';
  photo: string;
  phone: string;
  website: string;
  twitter: string | null;
  facebook: string | null;
}

interface District {
  name: string;
  number: number;
  state: string;
  congress: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [zipCode, setZipCode] = useState('');
  const [district, setDistrict] = useState<District | null>(null);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleZipCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/onboarding/lookup-reps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to look up representatives');
      }

      const data = await response.json();
      setDistrict(data.district);
      setRepresentatives(data.representatives);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    // TODO: Save interests and complete onboarding
    router.push('/dashboard');
  };

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to Civic Pulse</h1>
        <p className="text-muted-foreground">
          Let's personalize your experience in 3 quick steps
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-2 w-16 rounded-full ${
              i <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Find Your Representatives'}
            {step === 2 && 'Your Representatives'}
            {step === 3 && 'Choose Your Interests'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Enter your ZIP code to see who represents you in Congress'}
            {step === 2 && `You're in ${district?.name}, ${district?.state}`}
            {step === 3 && 'Select topics you care about'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Step 1: ZIP Code Input */}
          {step === 1 && (
            <form onSubmit={handleZipCodeSubmit} className="space-y-4">
              <div>
                <Label htmlFor="zip" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  ZIP Code
                </Label>
                <Input
                  id="zip"
                  type="text"
                  placeholder="94102"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  maxLength={5}
                  className="text-lg mt-2"
                  disabled={loading}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  We'll instantly find your 3 representatives (1 House + 2 Senate)
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading || zipCode.length !== 5}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding your representatives...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Representatives Display */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  Your Congressional District
                </div>
                <p className="font-semibold">
                  {district?.name}, {district?.state}
                </p>
                <p className="text-sm text-muted-foreground">
                  {district?.congress} Congress (2025-2027)
                </p>
              </div>

              <div className="space-y-3">
                {representatives.map((rep) => (
                  <div
                    key={rep.bioguide_id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={rep.photo} alt={rep.name} />
                      <AvatarFallback>
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{rep.name}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary">{rep.party}</Badge>
                        <Badge variant="outline">
                          {rep.type === 'representative' ? 'House Representative' : 'U.S. Senator'}
                        </Badge>
                      </div>
                      <div className="mt-3 text-sm text-muted-foreground space-y-1">
                        <p>📞 {rep.phone}</p>
                        <a
                          href={rep.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline block"
                        >
                          🌐 {rep.website.replace('https://', '')}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Interests (TODO) */}
          {step === 3 && (
            <div>
              <p className="text-muted-foreground">Interest selection coming soon...</p>
            </div>
          )}
        </CardContent>

        <CardFooter>
          {step === 2 && (
            <Button onClick={handleContinue} className="w-full">
              Continue to Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Step 1: ZIP code input with validation
- [ ] Step 2: Representative cards with photos, party, type, contact info
- [ ] Progress indicator showing current step
- [ ] Error handling with user-friendly messages
- [ ] Loading states with spinners
- [ ] Responsive design (mobile-first)
- [ ] Accessibility (proper labels, keyboard navigation)

---

### Task 2.2: Create Representative Card Component
**File:** `components/onboarding/representative-card.tsx`
**Time:** 1 hour
**Dependencies:** None

**Implementation:**
```typescript
// components/onboarding/representative-card.tsx

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Phone, Mail, Twitter, Facebook } from 'lucide-react';

interface Representative {
  bioguide_id: string;
  name: string;
  party: string;
  type: 'representative' | 'senator';
  photo: string;
  phone: string;
  website: string;
  twitter: string | null;
  facebook: string | null;
}

interface RepresentativeCardProps {
  representative: Representative;
  variant?: 'compact' | 'detailed';
}

export function RepresentativeCard({ representative, variant = 'compact' }: RepresentativeCardProps) {
  const partyColor = {
    Democrat: 'bg-blue-500',
    Republican: 'bg-red-500',
    Independent: 'bg-purple-500'
  }[representative.party] || 'bg-gray-500';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={representative.photo} alt={representative.name} />
              <AvatarFallback>{representative.name[0]}</AvatarFallback>
            </Avatar>
            <div
              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${partyColor}`}
              title={representative.party}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{representative.name}</h3>

            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">{representative.party}</Badge>
              <Badge variant="outline">
                {representative.type === 'representative' ? '🏛️ House' : '🏛️ Senate'}
              </Badge>
            </div>

            {variant === 'detailed' && (
              <div className="mt-4 space-y-2">
                {/* Contact info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${representative.phone}`} className="hover:text-primary">
                    {representative.phone}
                  </a>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4" />
                  <a
                    href={representative.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary truncate"
                  >
                    {representative.website.replace('https://', '')}
                  </a>
                </div>

                {/* Social media */}
                <div className="flex gap-2 mt-3">
                  {representative.twitter && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://twitter.com/${representative.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {representative.facebook && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://facebook.com/${representative.facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Facebook className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Acceptance Criteria:**
- [ ] Displays avatar with party color indicator
- [ ] Shows name, party, chamber
- [ ] Compact and detailed variants
- [ ] Contact info links (phone, website)
- [ ] Social media buttons
- [ ] Responsive design
- [ ] Accessibility

---

## Phase 3: Testing & Validation (2 hours)

### Task 3.1: Unit Tests
**File:** `__tests__/lib/api/geocodio.test.ts`
**Time:** 1 hour

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getRepresentativesByZip, extractStateFromOcdId } from '@/lib/api/geocodio';

describe('Geocodio API', () => {
  describe('getRepresentativesByZip', () => {
    it('should return congressional district data for valid ZIP', async () => {
      const result = await getRepresentativesByZip('94102');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('current_legislators');
      expect(result[0].current_legislators).toHaveLength(3); // 1 rep + 2 senators
    });

    it('should throw error for invalid ZIP format', async () => {
      await expect(getRepresentativesByZip('1234')).rejects.toThrow('Invalid ZIP code');
      await expect(getRepresentativesByZip('abcde')).rejects.toThrow('Invalid ZIP code');
    });

    it('should sort by proportion for multi-district ZIPs', async () => {
      const result = await getRepresentativesByZip('22201'); // Arlington, VA

      if (result.length > 1) {
        expect(result[0].proportion).toBeGreaterThanOrEqual(result[1].proportion);
      }
    });
  });

  describe('extractStateFromOcdId', () => {
    it('should extract state from OCD ID', () => {
      expect(extractStateFromOcdId('ocd-division/country:us/state:va/cd:8')).toBe('VA');
      expect(extractStateFromOcdId('ocd-division/country:us/state:ca/cd:12')).toBe('CA');
    });

    it('should return "Unknown" for invalid OCD ID', () => {
      expect(extractStateFromOcdId('invalid')).toBe('Unknown');
    });
  });
});
```

**Acceptance Criteria:**
- [ ] Tests for successful lookups
- [ ] Tests for invalid input
- [ ] Tests for helper functions
- [ ] Mock API responses for reliability
- [ ] All tests passing

---

### Task 3.2: Integration Testing
**Time:** 1 hour

**Manual test checklist:**
- [ ] Enter valid ZIP code → See 3 representatives
- [ ] Enter invalid ZIP code → See error message
- [ ] Check database → Representatives saved correctly
- [ ] Check user_representatives → User linked correctly
- [ ] Verify bioguide_id matches Congress.gov
- [ ] Test with different states (CA, TX, NY, FL)
- [ ] Test with at-large districts (VT, WY)
- [ ] Test with non-voting delegates (DC, PR)
- [ ] Test mobile responsiveness
- [ ] Test accessibility (keyboard navigation)

**Performance benchmarks:**
- [ ] API response < 300ms (Geocodio average)
- [ ] Database insert < 100ms per representative
- [ ] Total onboarding flow < 1 second

---

## Phase 4: Documentation & Deployment (1.5 hours)

### Task 4.1: Update Documentation
**Files to update:**
- [ ] README.md - Add Geocodio setup instructions
- [ ] .env.example - Add GEOCODIO_API_KEY
- [ ] API_ENDPOINTS.md - Document /api/onboarding/lookup-reps
- [ ] DATABASE_SCHEMA.md - Document representatives table updates

**Time:** 30 minutes

---

### Task 4.2: Environment Variables
**Netlify deployment:**

```bash
# Add to Netlify environment variables
netlify env:set GEOCODIO_API_KEY "your_key_here"

# Verify
netlify env:list
```

**Time:** 15 minutes

**Acceptance Criteria:**
- [ ] GEOCODIO_API_KEY set in Netlify
- [ ] Variable available in both build and runtime
- [ ] Test deploy works with real API key

---

### Task 4.3: Update Journal
**File:** `journal.md`
**Time:** 15 minutes

Add entry:
```markdown
## October 27, 2025 - [TIME] - Lightning-Fast Onboarding with Geocodio 🚀

**What I Built:** Integrated Geocodio API for instant representative lookup

**The Problem I Solved:**
Slow onboarding was killing conversion. Congress.gov API took 800ms+ and required
multiple calls to get representative photos and social media. Users were dropping off.

**How I Did It:**
Geocodio is like a phone book that already has all the info organized. One ZIP code →
instant results with 3 representatives (1 House + 2 Senate) including photos, contact
info, social media in 200ms. 4x faster than before!

**The Magic:**
Geocodio returns the same bioguide_id as Congress.gov. This means:
- Fast onboarding with Geocodio
- Deep dives with Congress.gov when user clicks representative
- Best of both worlds!

**What I Learned:**
Sometimes the best solution isn't building it yourself - it's finding the right API.
Geocodio gives us 2,500 free lookups/day, perfect for MVP.

**What's Next:**
Now that onboarding is instant, users can get to their personalized dashboard
immediately. This unlocks:
- Bill recommendations based on their district
- Voting records of their specific representatives
- Alerts when their reps take action

**Social Media Snippet:**
🚀 Just made onboarding 4x faster with Geocodio! One ZIP code → instant rep lookup
with photos & contact info. From 800ms to 200ms. User experience matters! #CivicTech
```

---

### Task 4.4: Update PRD Status
**File:** `civicpulse-prd-corrected.md`
**Time:** 15 minutes

Add to implementation status section:
```markdown
## Implementation Status

### Phase 1: Core Infrastructure ✅
- [x] Database schema (Raindrop SQL)
- [x] Geocodio API integration
- [x] Representative lookup (onboarding)
- [ ] Congress.gov API integration (bills)
- [ ] Algolia search setup
```

---

## Integration with Overall Roadmap

### Updated Priority List

**IMMEDIATE (This Week)**
1. ✅ Database schema testing (COMPLETED)
2. ✅ Geocodio integration (IN PROGRESS - THIS PLAN)
3. ⏳ Verify frontend-backend connection
4. ⏳ Import real Congressional data

**HIGH PRIORITY (Week 2)**
1. Implement Algolia search
2. Build legislation page with filters
3. Build bill detail page
4. Generate test podcast

**MEDIUM PRIORITY (Week 3)**
1. Implement WorkOS authentication
2. Deploy to Netlify
3. Set up Vultr Object Storage
4. Integrate ElevenLabs

### Why Geocodio is Phase 1 Priority

**User Impact:**
- First impression matters - instant onboarding vs slow loading = higher conversion
- Personalization starts here - can't recommend bills without knowing user's reps
- Foundation for all features - district-based filtering, rep voting records, alerts

**Technical Dependencies:**
- Needed for onboarding flow
- Required for user profile completion
- Blocks personalization features

**Risk Mitigation:**
- Simple integration (3 hours)
- Free tier sufficient for MVP
- No vendor lock-in (can switch to Congress.gov if needed)

---

## Success Metrics

### Development Metrics
- [ ] All 4 phases completed in 8-12 hours
- [ ] All tests passing
- [ ] Zero TypeScript errors
- [ ] Lighthouse score 90+ for onboarding page

### User Experience Metrics
- [ ] Representative lookup < 300ms
- [ ] 3 representatives displayed with photos
- [ ] Mobile-responsive on all screen sizes
- [ ] Zero errors in production

### Business Metrics (Post-Launch)
- [ ] Onboarding completion rate > 80%
- [ ] Average onboarding time < 60 seconds
- [ ] Geocodio API usage < 2,000 lookups/day (free tier buffer)

---

## Risk Assessment & Mitigation

### Risk 1: Geocodio API Downtime
**Likelihood:** Low
**Impact:** High (blocks onboarding)
**Mitigation:**
- Implement circuit breaker pattern
- Fallback to cached representatives list
- Display error message with retry option
- Monitor uptime with status page

### Risk 2: Free Tier Limit Exceeded
**Likelihood:** Medium (if viral)
**Impact:** Medium
**Mitigation:**
- Monitor daily usage via Geocodio dashboard
- Alert at 80% of daily limit (2,000 lookups)
- Paid tier is $0.50/1,000 lookups (affordable)
- Can cache ZIP → district mapping for common zips

### Risk 3: Data Accuracy Issues
**Likelihood:** Low
**Impact:** Medium
**Mitigation:**
- Geocodio sources from @unitedstates project (same as Congress.gov)
- Validate bioguide_id matches between Geocodio and Congress.gov
- Allow users to report incorrect data
- Cross-reference with Congress.gov for critical operations

### Risk 4: Integration Complexity
**Likelihood:** Low
**Impact:** Low
**Mitigation:**
- Well-documented API with examples
- TypeScript types ensure correctness
- Unit tests catch regressions
- Simple REST API (no SDK required)

---

## Next Steps After Completion

1. **Enhance with Congress.gov Integration:**
   - Use bioguide_id from Geocodio to fetch detailed data from Congress.gov
   - Committee assignments
   - Voting records
   - Sponsored bills

2. **Add ZIP Code Autocomplete:**
   - Suggest ZIP codes as user types
   - Use browser geolocation for automatic detection

3. **Cache Common ZIP Codes:**
   - Pre-populate database with top 1000 ZIP codes
   - Reduces API calls by 80%+

4. **Representative Profile Pages:**
   - Link from onboarding to detailed representative pages
   - Show voting history, committee assignments, sponsored bills
   - Contact form integration

5. **District-Based Features:**
   - Filter bills by impact on user's district
   - Show representatives' positions on bills
   - Alert when representatives vote on tracked bills

---

## Appendix: API Reference

### Geocodio API

**Base URL:** `https://api.geocod.io/v1.7`

**Endpoints:**

1. **Geocode (Forward)**
   ```
   GET /geocode?postal_code={zip}&fields=cd119&api_key={key}
   GET /geocode?q={address}&fields=cd119&api_key={key}
   ```

2. **Response Format:**
   ```json
   {
     "results": [
       {
         "fields": {
           "congressional_districts": [
             {
               "name": "Congressional District 8",
               "district_number": 8,
               "ocd_id": "ocd-division/country:us/state:va/cd:8",
               "congress_number": "119th",
               "congress_years": "2025-2027",
               "proportion": 1.0,
               "current_legislators": [
                 {
                   "type": "representative",
                   "bio": { ... },
                   "contact": { ... },
                   "social": { ... },
                   "references": {
                     "bioguide_id": "B001292"
                   }
                 }
               ]
             }
           ]
         }
       }
     ]
   }
   ```

**Rate Limits:**
- Free tier: 2,500 requests/day
- Paid tier: $0.50 per 1,000 requests
- No per-second rate limit

**Fields:**
- `cd119` - 119th Congress (2025-2027) - CURRENT
- `cd` - Always returns current Congress
- `cd118`, `cd117`, etc. - Historical data

---

## Estimated Timeline

| Phase | Tasks | Hours | Completion Date |
|-------|-------|-------|-----------------|
| **Phase 1: Backend** | 3 tasks | 3 hours | Day 1 |
| **Phase 2: Frontend** | 2 tasks | 3 hours | Day 1-2 |
| **Phase 3: Testing** | 2 tasks | 2 hours | Day 2 |
| **Phase 4: Docs** | 4 tasks | 1.5 hours | Day 2 |
| **Total** | **11 tasks** | **9.5 hours** | **2 days** |

**Recommended Schedule:**
- **Day 1 Morning (4 hours):** Phase 1 (Backend) + Phase 2 Task 1
- **Day 1 Afternoon (4 hours):** Phase 2 Task 2 + Phase 3
- **Day 2 Morning (2 hours):** Phase 4 (Documentation & Deployment)

---

**END OF IMPLEMENTATION PLAN**

This plan provides step-by-step guidance for integrating Geocodio into Civic Pulse.
Follow each task sequentially, checking off acceptance criteria as you complete them.

The integration is designed to be completed in 2 days, enabling instant representative
lookup during onboarding and laying the foundation for all personalization features.
