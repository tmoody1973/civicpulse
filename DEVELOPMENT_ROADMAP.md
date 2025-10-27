# Civic Pulse - Development Roadmap

**Last Updated:** October 27, 2025
**Hackathon Deadline:** TBD
**Current Status:** Phase 1 - Infrastructure

---

## Overview

This roadmap tracks the development of Civic Pulse from initial infrastructure to launch-ready MVP.
Priority is given to features that enable the core user experience: personalized legislative podcasts.

**Core User Flow:**
1. User signs up (OAuth via WorkOS)
2. Enters ZIP code → Sees their 3 representatives (Geocodio)
3. Selects interests → Gets personalized dashboard
4. Requests podcast → AI generates daily/weekly briefing
5. Listens to podcast → Takes action on bills

---

## Phase 1: Core Infrastructure (Week 1)

**Goal:** Get the foundation working - database, APIs, onboarding

### 1.1 Database & Schema ✅ COMPLETED
- [x] Design database schema (users, bills, representatives, podcasts)
- [x] Set up Raindrop SQL (SQLite)
- [x] Create tables with proper indexes
- [x] Test schema with sample data
- [x] Validate foreign keys and constraints

**Status:** ✅ COMPLETED (October 27, 2025)

---

### 1.2 Geocodio Integration 🔄 IN PROGRESS
**Priority:** CRITICAL - Required for onboarding
**Estimated Time:** 9.5 hours (2 days)
**Detailed Plan:** See `GEOCODIO_IMPLEMENTATION_PLAN.md`
**Task Checklist:** See `GEOCODIO_TASKS.md`

#### Quick Summary:
- **What:** Integrate Geocodio API for instant representative lookup during onboarding
- **Why:** 4x faster than Congress.gov (200ms vs 800ms), includes photos/social media
- **How:** Single API call returns congressional district + 3 legislators with complete data
- **Free Tier:** 2,500 daily lookups (sufficient for MVP)

#### Tasks:
- [ ] **Backend (3 hours)**
  - [ ] Create `lib/api/geocodio.ts` with API client
  - [ ] Create `lib/db/representatives.ts` with database helpers
  - [ ] Create `/api/onboarding/lookup-reps` endpoint
- [ ] **Frontend (3 hours)**
  - [ ] Update `app/onboarding/page.tsx` with 3-step wizard
  - [ ] Create `components/onboarding/representative-card.tsx`
- [ ] **Testing (2 hours)**
  - [ ] Unit tests for Geocodio functions
  - [ ] Integration tests for onboarding flow
- [ ] **Documentation (1.5 hours)**
  - [ ] Update README, .env.example, API docs
  - [ ] Set GEOCODIO_API_KEY in Netlify
  - [ ] Update journal.md

**Acceptance Criteria:**
- ✅ User enters ZIP code → sees 3 representatives < 1 second
- ✅ Representatives saved to database with bioguide_id
- ✅ User linked to their representatives
- ✅ Mobile responsive and accessible

**Status:** 📋 PLANNED - Ready to start

---

### 1.3 Frontend-Backend Connection ⏳ PENDING
**Priority:** HIGH
**Estimated Time:** 4 hours
**Dependencies:** Geocodio integration

#### Tasks:
- [ ] Test API routes from frontend
- [ ] Verify environment variables work
- [ ] Test database queries from API routes
- [ ] Set up error handling and logging
- [ ] Test with real data

**Acceptance Criteria:**
- ✅ Frontend can call backend APIs
- ✅ Environment variables accessible
- ✅ Database queries work
- ✅ No CORS errors

---

### 1.4 Import Real Congressional Data ⏳ PENDING
**Priority:** HIGH
**Estimated Time:** 6 hours
**Dependencies:** Frontend-backend connection

#### Tasks:
- [ ] Set up Congress.gov API client
- [ ] Fetch current Congress bills (119th)
- [ ] Parse and normalize bill data
- [ ] Store in Raindrop SQL
- [ ] Index in Algolia for search
- [ ] Test bill queries

**Acceptance Criteria:**
- ✅ At least 100 recent bills imported
- ✅ All required fields populated (title, summary, status, sponsor)
- ✅ Bills searchable via Algolia
- ✅ Bill detail pages work

---

## Phase 2: Core Features (Week 2)

**Goal:** Build the main user-facing features

### 2.1 Algolia Search Integration ⏳ PENDING
**Priority:** HIGH
**Estimated Time:** 8 hours

#### Tasks:
- [ ] Set up Algolia account and index
- [ ] Create search schema (bills, representatives)
- [ ] Implement search API endpoint
- [ ] Build search UI component
- [ ] Add filters (date, status, chamber, committee)
- [ ] Add sorting options
- [ ] Implement pagination

**Acceptance Criteria:**
- ✅ Full-text search works < 100ms
- ✅ Filters work correctly
- ✅ Results relevant to query
- ✅ Mobile responsive

---

### 2.2 Legislation Page ⏳ PENDING
**Priority:** HIGH
**Estimated Time:** 6 hours

#### Tasks:
- [ ] Design legislation page layout
- [ ] Implement bill list with cards
- [ ] Add filters sidebar (status, chamber, date range)
- [ ] Add search integration
- [ ] Add sorting (date, relevance, status)
- [ ] Add pagination
- [ ] Add loading states

**Acceptance Criteria:**
- ✅ Shows recent bills by default
- ✅ Filters work correctly
- ✅ Search integrated
- ✅ Pagination works
- ✅ Mobile responsive

---

### 2.3 Bill Detail Page ⏳ PENDING
**Priority:** HIGH
**Estimated Time:** 8 hours

#### Tasks:
- [ ] Design bill detail page
- [ ] Show full bill information
- [ ] Show sponsor and cosponsors
- [ ] Show current status and timeline
- [ ] Show committee assignments
- [ ] Add "Add to Podcast" button
- [ ] Add social sharing
- [ ] Show related bills

**Acceptance Criteria:**
- ✅ All bill data displayed clearly
- ✅ Sponsor links to representative profile
- ✅ Timeline shows progression
- ✅ Actions work (add to podcast, share)

---

### 2.4 Generate Test Podcast ⏳ PENDING
**Priority:** HIGH
**Estimated Time:** 12 hours

#### Tasks:
- [ ] Set up Claude Sonnet 4 API client
- [ ] Design prompt for dialogue generation
- [ ] Test dialogue generation with sample bills
- [ ] Set up ElevenLabs text-to-dialogue
- [ ] Test audio generation
- [ ] Set up Vultr Object Storage
- [ ] Implement upload to Vultr CDN
- [ ] Create podcast generation API endpoint
- [ ] Test end-to-end flow

**Acceptance Criteria:**
- ✅ Can generate dialogue script from bills
- ✅ Can generate audio from dialogue
- ✅ Audio uploaded to Vultr CDN
- ✅ Podcast < 60s generation time for daily
- ✅ Audio quality is NPR-level

---

## Phase 3: Authentication & Deployment (Week 3)

**Goal:** Make it production-ready with auth and deployment

### 3.1 WorkOS Authentication ⏳ PENDING
**Priority:** MEDIUM
**Estimated Time:** 8 hours

#### Tasks:
- [ ] Set up WorkOS account
- [ ] Configure OAuth providers (Google, Twitter)
- [ ] Create auth routes (login, callback, logout)
- [ ] Implement session management
- [ ] Protect API routes with auth
- [ ] Create login/signup UI
- [ ] Test auth flow end-to-end

**Acceptance Criteria:**
- ✅ Users can sign up with Google
- ✅ Users can sign up with Twitter
- ✅ Sessions persist across page reloads
- ✅ Protected routes redirect to login
- ✅ Logout works correctly

---

### 3.2 Deploy to Netlify ⏳ PENDING
**Priority:** MEDIUM
**Estimated Time:** 4 hours

#### Tasks:
- [ ] Create netlify.toml configuration
- [ ] Set up environment variables in Netlify
- [ ] Configure build settings
- [ ] Set up continuous deployment from GitHub
- [ ] Test production build locally
- [ ] Deploy to preview
- [ ] Test preview deployment
- [ ] Deploy to production

**Acceptance Criteria:**
- ✅ Site accessible at civicpulse.netlify.app
- ✅ All features work in production
- ✅ Environment variables set correctly
- ✅ Auto-deploy on git push

---

### 3.3 Vultr Object Storage & CDN ⏳ PENDING
**Priority:** MEDIUM
**Estimated Time:** 4 hours

#### Tasks:
- [ ] Set up Vultr Object Storage bucket
- [ ] Configure CORS for audio files
- [ ] Enable Vultr CDN
- [ ] Test upload from API
- [ ] Test CDN delivery
- [ ] Configure cache headers
- [ ] Test streaming from mobile

**Acceptance Criteria:**
- ✅ Can upload podcasts to Vultr
- ✅ CDN delivers audio < 1s to first byte
- ✅ Audio streams smoothly on mobile
- ✅ CORS configured correctly

---

### 3.4 Dashboard & Podcast Player ⏳ PENDING
**Priority:** MEDIUM
**Estimated Time:** 10 hours

#### Tasks:
- [ ] Design dashboard layout
- [ ] Show user's representatives
- [ ] Show recent bills relevant to user
- [ ] Show latest podcast
- [ ] Implement audio player
- [ ] Add playback controls
- [ ] Add transcript display
- [ ] Add bill links in transcript
- [ ] Make player sticky on mobile

**Acceptance Criteria:**
- ✅ Dashboard shows personalized content
- ✅ Audio player works on desktop
- ✅ Audio player works on mobile
- ✅ Transcript syncs with audio
- ✅ Bill links work

---

## Phase 4: Polish & Launch (Week 4)

**Goal:** Make it launch-ready

### 4.1 Mobile Optimization ⏳ PENDING
**Priority:** MEDIUM
**Estimated Time:** 6 hours

#### Tasks:
- [ ] Test on iPhone SE (375px)
- [ ] Test on iPhone 15 Pro (393px)
- [ ] Test on iPad (768px)
- [ ] Fix layout issues
- [ ] Optimize touch targets (min 44x44px)
- [ ] Test audio player on mobile
- [ ] Test background playback
- [ ] Add PWA manifest

**Acceptance Criteria:**
- ✅ All pages responsive on mobile
- ✅ Touch targets meet minimum size
- ✅ Audio player works on iOS
- ✅ Audio player works on Android
- ✅ Can install as PWA

---

### 4.2 Performance Optimization ⏳ PENDING
**Priority:** MEDIUM
**Estimated Time:** 4 hours

#### Tasks:
- [ ] Run Lighthouse audit
- [ ] Optimize images
- [ ] Add lazy loading
- [ ] Minimize JavaScript bundle
- [ ] Add caching headers
- [ ] Optimize database queries
- [ ] Add loading skeletons
- [ ] Test page load time

**Acceptance Criteria:**
- ✅ Lighthouse score > 90
- ✅ Page load < 2s
- ✅ Images optimized
- ✅ Bundle size < 500KB

---

### 4.3 Error Handling & Monitoring ⏳ PENDING
**Priority:** MEDIUM
**Estimated Time:** 4 hours

#### Tasks:
- [ ] Add error boundaries
- [ ] Add 404 page
- [ ] Add 500 error page
- [ ] Set up error logging
- [ ] Add API error handling
- [ ] Add user-friendly error messages
- [ ] Test error scenarios

**Acceptance Criteria:**
- ✅ Errors don't crash app
- ✅ Error messages user-friendly
- ✅ Errors logged for debugging
- ✅ 404 page works

---

### 4.4 Final Testing & Documentation ⏳ PENDING
**Priority:** LOW
**Estimated Time:** 6 hours

#### Tasks:
- [ ] Write user documentation
- [ ] Create demo video
- [ ] Test entire user flow
- [ ] Fix any bugs found
- [ ] Update README
- [ ] Create submission materials
- [ ] Prepare pitch deck

**Acceptance Criteria:**
- ✅ All features work end-to-end
- ✅ Demo video < 3 minutes
- ✅ README complete
- ✅ Submission ready

---

## Timeline Summary

| Week | Phase | Key Deliverables | Hours |
|------|-------|------------------|-------|
| **Week 1** | Infrastructure | Database, Geocodio, Congressional data | 25.5 |
| **Week 2** | Core Features | Search, Legislation page, Bill detail, Podcast generation | 34 |
| **Week 3** | Auth & Deploy | WorkOS, Netlify, Vultr, Dashboard | 26 |
| **Week 4** | Polish & Launch | Mobile, Performance, Testing | 20 |
| **Total** | | **Ready for Hackathon Submission** | **105.5 hours** |

**Estimated Calendar Time:** 4 weeks
**Full-Time Equivalent:** ~2.5 weeks (40 hours/week)

---

## Critical Path (Must-Haves for Launch)

1. ✅ Database schema (DONE)
2. 🔄 Geocodio integration (IN PROGRESS)
3. ⏳ Congressional data import
4. ⏳ Bill detail page
5. ⏳ Podcast generation
6. ⏳ WorkOS authentication
7. ⏳ Deploy to Netlify
8. ⏳ Audio player

**Everything else can be iterated post-launch.**

---

## Risk Mitigation

### Risk 1: Podcast Generation Too Slow
**Mitigation:**
- Test early (Phase 2.4)
- Optimize prompts for shorter responses
- Use background jobs if needed
- Cache generated podcasts

### Risk 2: Congress.gov API Rate Limits
**Mitigation:**
- Implement aggressive caching (24 hours)
- Use Algolia for search (not direct API)
- Batch import during off-peak hours
- Monitor usage daily

### Risk 3: ElevenLabs Costs Too High
**Mitigation:**
- Calculate cost per podcast upfront
- Limit free users to 1 podcast/day
- Cache popular podcasts for reuse
- Consider alternative voices

### Risk 4: Geocodio Free Tier Exceeded
**Mitigation:**
- Monitor daily usage (2,500 limit)
- Alert at 80% (2,000 lookups)
- Cache common ZIP codes
- Paid tier only $0.50/1,000 if needed

---

## Success Metrics

### Development Metrics
- [ ] All Phase 1 tasks completed
- [ ] All Phase 2 tasks completed
- [ ] All Phase 3 tasks completed
- [ ] Zero critical bugs
- [ ] Lighthouse score > 90

### User Experience Metrics (Post-Launch)
- [ ] Onboarding completion rate > 80%
- [ ] Average onboarding time < 60 seconds
- [ ] Podcast generation success rate > 95%
- [ ] Audio playback success rate > 99%
- [ ] Mobile traffic > 50%

### Business Metrics (Post-Launch)
- [ ] 100 signups in first week
- [ ] 500 signups in first month
- [ ] 10% DAU/MAU ratio
- [ ] Average 3 podcasts generated per user
- [ ] 5% conversion to paid tier

---

## Next Steps (Immediate Actions)

1. **Today:**
   - [ ] Review Geocodio implementation plan
   - [ ] Get Geocodio API key
   - [ ] Start Task 1.1 (Create Geocodio client module)

2. **This Week:**
   - [ ] Complete Geocodio integration (all 11 tasks)
   - [ ] Verify frontend-backend connection
   - [ ] Start Congressional data import

3. **Next Week:**
   - [ ] Complete Algolia search
   - [ ] Build legislation page
   - [ ] Build bill detail page
   - [ ] Generate first test podcast

---

## Resources

### Documentation
- **Main PRD:** `civicpulse-prd-corrected.md`
- **Geocodio Plan:** `GEOCODIO_IMPLEMENTATION_PLAN.md`
- **Geocodio Tasks:** `GEOCODIO_TASKS.md`
- **Product Enhancements:** `PRODUCT_ENHANCEMENTS.md`
- **API Endpoints:** `API_ENDPOINTS.md`
- **Database Schema:** `DATABASE_SCHEMA.md` (to be created)

### APIs & Services
- **Raindrop MCP:** For documentation and examples
- **Next.js MCP:** For runtime debugging
- **Netlify MCP:** For deployment
- **Congress.gov:** https://api.congress.gov
- **Geocodio:** https://www.geocod.io/docs/
- **WorkOS:** https://workos.com/docs
- **ElevenLabs:** https://elevenlabs.io/docs
- **Algolia:** https://www.algolia.com/doc/

### Development Journal
- **Journal:** `journal.md` - Updated after each significant feature

---

**Last Updated:** October 27, 2025
**Next Review:** After Phase 1 completion
