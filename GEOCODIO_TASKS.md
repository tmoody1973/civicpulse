# Geocodio Integration - Task Checklist

**Priority:** Phase 1 - Critical for Onboarding MVP
**Estimated Time:** 9.5 hours (2 days)
**Status:** Not Started

---

## Quick Start

1. Get API key from https://geocod.io
2. Add to environment: `GEOCODIO_API_KEY=your_key`
3. Follow tasks sequentially
4. Check off each task as completed

---

## Phase 1: Backend API Integration (3 hours)

### Task 1.1: Create Geocodio Client Module ⏱️ 1 hour
**File:** `lib/api/geocodio.ts`

- [ ] Define TypeScript interfaces (CongressionalDistrictData, Legislator, GeocodioResponse)
- [ ] Implement `getRepresentativesByZip(zipCode: string)` function
- [ ] Implement `getRepresentativesByAddress(address: string)` function
- [ ] Add helper functions (extractStateFromAddress, extractDistrictNumber, extractStateFromOcdId)
- [ ] Add input validation (ZIP code format)
- [ ] Add error handling with descriptive messages
- [ ] Add response caching (7 days with Next.js revalidate)
- [ ] Test manually with sample ZIP code (94102, 22201)

**Acceptance Criteria:**
- ✅ All TypeScript interfaces compile without errors
- ✅ Functions return expected data structure
- ✅ Invalid ZIP codes throw errors
- ✅ Caching works (check Network tab)

---

### Task 1.2: Create Database Helper Functions ⏱️ 1.5 hours
**File:** `lib/db/representatives.ts`

- [ ] Create `saveLegislatorsToDatabase(legislators: Legislator[], db: D1Database)` function
  - Uses INSERT OR REPLACE to update existing reps
  - Returns array of representative IDs
  - Handles bioguide_id uniqueness
- [ ] Create `linkUserToRepresentatives(userId: string, repIds: string[], db: D1Database)` function
  - Uses INSERT OR IGNORE to prevent duplicates
  - Links user to all 3 representatives
- [ ] Create `getUserRepresentatives(userId: string, db: D1Database)` function
  - Returns user's 3 representatives
  - Orders by chamber (House first, then Senate)
- [ ] Add helper functions for data extraction
- [ ] Add error handling and logging
- [ ] Add TypeScript types

**Acceptance Criteria:**
- ✅ Representatives saved to database correctly
- ✅ User-representative links created without duplicates
- ✅ getUserRepresentatives returns all 3 reps
- ✅ bioguide_id is unique constraint

---

### Task 1.3: Create Onboarding API Route ⏱️ 30 minutes
**File:** `app/api/onboarding/lookup-reps/route.ts`

- [ ] Create POST endpoint
- [ ] Add Zod schema validation (zipCode required, userId optional)
- [ ] Call `getRepresentativesByZip()` to fetch data
- [ ] Call `saveLegislatorsToDatabase()` to save reps
- [ ] Call `linkUserToRepresentatives()` if userId provided
- [ ] Update user's zip_code, congressional_district, state if userId provided
- [ ] Return clean JSON response with district + representatives
- [ ] Add error handling (400 validation, 404 not found, 500 server error)

**Acceptance Criteria:**
- ✅ POST /api/onboarding/lookup-reps works with valid ZIP
- ✅ Returns district info + 3 representatives
- ✅ Saves to database correctly
- ✅ Links to user if userId provided
- ✅ Returns appropriate error codes

---

## Phase 2: Frontend Integration (3 hours)

### Task 2.1: Update Onboarding Page ⏱️ 2 hours
**File:** `app/onboarding/page.tsx`

- [ ] Create 3-step wizard UI (ZIP → Reps → Interests)
- [ ] Add progress indicator (3 bars)
- [ ] Step 1: ZIP code input form
  - Input field with validation (5 digits only)
  - Submit button with loading state
  - Error message display
- [ ] Step 2: Representatives display
  - District info card (name, state, congress)
  - 3 representative cards with photos
  - Party badges and chamber badges
  - Contact info (phone, website)
- [ ] Add state management (useState for step, zipCode, district, representatives, loading, error)
- [ ] Add API call to `/api/onboarding/lookup-reps`
- [ ] Add error handling with user-friendly messages
- [ ] Add responsive design (mobile-first)
- [ ] Add accessibility (labels, ARIA, keyboard navigation)

**Acceptance Criteria:**
- ✅ User can enter ZIP code and see representatives
- ✅ Loading states work correctly
- ✅ Error messages display clearly
- ✅ Mobile responsive (test on 375px, 768px, 1920px)
- ✅ Keyboard navigation works
- ✅ Screen reader friendly

---

### Task 2.2: Create Representative Card Component ⏱️ 1 hour
**File:** `components/onboarding/representative-card.tsx`

- [ ] Create reusable RepresentativeCard component
- [ ] Add avatar with party color indicator
- [ ] Add name, party, chamber badges
- [ ] Add contact info (phone, website)
- [ ] Add social media buttons (Twitter, Facebook)
- [ ] Support compact and detailed variants
- [ ] Add hover effects
- [ ] Make responsive
- [ ] Add accessibility

**Acceptance Criteria:**
- ✅ Component renders correctly
- ✅ Party color indicator shows correct color
- ✅ Contact links work
- ✅ Social media buttons link correctly
- ✅ Responsive on all screen sizes

---

## Phase 3: Testing & Validation (2 hours)

### Task 3.1: Unit Tests ⏱️ 1 hour
**File:** `__tests__/lib/api/geocodio.test.ts`

- [ ] Test `getRepresentativesByZip()` with valid ZIP
- [ ] Test `getRepresentativesByZip()` with invalid ZIP
- [ ] Test multi-district ZIP sorting by proportion
- [ ] Test `extractStateFromOcdId()` helper
- [ ] Mock API responses for reliability
- [ ] Ensure all tests pass

**Test Cases:**
- ✅ Valid ZIP returns 3 legislators
- ✅ Invalid ZIP format throws error
- ✅ Multi-district ZIP sorted correctly
- ✅ Helper functions extract data correctly

---

### Task 3.2: Integration Testing ⏱️ 1 hour
**Manual Test Checklist:**

- [ ] Enter valid ZIP (94102) → See 3 representatives
- [ ] Enter invalid ZIP (1234) → See error message
- [ ] Check database → Representatives saved with correct data
- [ ] Check user_representatives → User linked correctly
- [ ] Verify bioguide_id matches Congress.gov
- [ ] Test different states:
  - [ ] California (94102)
  - [ ] Texas (78701)
  - [ ] New York (10001)
  - [ ] Florida (33101)
- [ ] Test edge cases:
  - [ ] At-large districts (Vermont 05001, Wyoming 82001)
  - [ ] Non-voting delegates (DC 20001)
- [ ] Test mobile responsiveness (iPhone SE, iPad, Desktop)
- [ ] Test accessibility:
  - [ ] Tab navigation works
  - [ ] Screen reader announces correctly
  - [ ] Error messages are clear

**Performance Benchmarks:**
- [ ] API response < 300ms
- [ ] Database insert < 100ms per rep
- [ ] Total onboarding flow < 1 second

---

## Phase 4: Documentation & Deployment (1.5 hours)

### Task 4.1: Update Documentation ⏱️ 30 minutes

- [ ] Update README.md with Geocodio setup instructions
- [ ] Update .env.example with GEOCODIO_API_KEY
- [ ] Document /api/onboarding/lookup-reps in API_ENDPOINTS.md
- [ ] Update DATABASE_SCHEMA.md with representatives table changes
- [ ] Add troubleshooting section for common errors

---

### Task 4.2: Environment Variables ⏱️ 15 minutes

- [ ] Add GEOCODIO_API_KEY to Netlify:
  ```bash
  netlify env:set GEOCODIO_API_KEY "your_key_here"
  ```
- [ ] Verify variable is set:
  ```bash
  netlify env:list | grep GEOCODIO
  ```
- [ ] Test deploy with real API key
- [ ] Verify onboarding works in production

---

### Task 4.3: Update Journal ⏱️ 15 minutes
**File:** `journal.md`

- [ ] Add entry about Geocodio integration
- [ ] Explain speed improvement (4x faster)
- [ ] Share bioguide_id discovery (hybrid approach)
- [ ] Note free tier limits (2,500/day)
- [ ] Create social media snippet

---

### Task 4.4: Update PRD Status ⏱️ 15 minutes
**File:** `civicpulse-prd-corrected.md`

- [ ] Mark Geocodio integration as ✅ complete
- [ ] Update implementation status section
- [ ] Add to Phase 1 checklist

---

## Integration with Overall Roadmap

### Before Geocodio (Current State)
```
IMMEDIATE (This Week)
1. ✅ Database schema testing
2. ⏳ Verify frontend-backend connection
3. ⏳ Import real Congressional data
```

### After Geocodio (Updated Roadmap)
```
IMMEDIATE (This Week)
1. ✅ Database schema testing
2. ✅ Geocodio integration ← YOU ARE HERE
3. ⏳ Verify frontend-backend connection
4. ⏳ Import real Congressional data

HIGH PRIORITY (Week 2)
1. Implement Algolia search
2. Build legislation page with filters
3. Build bill detail page
4. Generate test podcast

MEDIUM PRIORITY (Week 3)
1. Implement WorkOS authentication
2. Deploy to Netlify
3. Set up Vultr Object Storage
4. Integrate ElevenLabs
```

---

## Success Criteria (Complete When...)

### Development Checklist
- [ ] All 11 tasks completed
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Zero TypeScript errors
- [ ] Zero console warnings
- [ ] Lighthouse score 90+ for onboarding page

### User Experience Checklist
- [ ] Representative lookup < 300ms
- [ ] 3 representatives displayed with photos
- [ ] Party colors correct (Blue=Dem, Red=Rep, Purple=Ind)
- [ ] Contact info works (phone links, website links)
- [ ] Mobile responsive on all screen sizes
- [ ] Accessible (keyboard nav, screen reader)
- [ ] Error messages are user-friendly

### Production Readiness
- [ ] GEOCODIO_API_KEY set in Netlify
- [ ] Works in production environment
- [ ] Database has correct schema
- [ ] No API errors in logs
- [ ] Performance meets benchmarks

---

## Quick Commands

```bash
# Start development
npm run dev

# Run tests
npm run test

# Type check
npm run type-check

# Deploy to Netlify
netlify deploy --prod

# Set environment variable
netlify env:set GEOCODIO_API_KEY "your_key"

# Check environment variables
netlify env:list

# Test API endpoint locally
curl -X POST http://localhost:3000/api/onboarding/lookup-reps \
  -H "Content-Type: application/json" \
  -d '{"zipCode":"94102"}'
```

---

## Troubleshooting

### Error: "Invalid ZIP code format"
- Ensure ZIP is exactly 5 digits
- No spaces or dashes allowed

### Error: "No congressional district found"
- Verify ZIP code is valid US ZIP
- Try with full address instead

### Error: "Geocodio API error: 401"
- Check GEOCODIO_API_KEY is set correctly
- Verify API key is active in Geocodio dashboard

### Error: "Database error"
- Verify representatives table exists
- Check schema matches expected structure
- Ensure CIVIC_DB is accessible

### Representatives not showing photos
- Check image_url is saved to database
- Verify photo_url from Geocodio response
- Check CORS settings if images blocked

---

## Resources

- **Geocodio Docs:** https://www.geocod.io/docs/
- **Geocodio Dashboard:** https://dash.geocod.io/
- **API Playground:** https://www.geocod.io/docs/#geocoding
- **Full Implementation Plan:** See GEOCODIO_IMPLEMENTATION_PLAN.md

---

**Last Updated:** October 27, 2025
**Next Review:** After Phase 1 completion
