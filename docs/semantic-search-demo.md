# Semantic Search Demo Guide

## Quick Overview

**Civic Pulse uses AI-powered semantic search** to understand what you mean, not just what you type. The system automatically picks the fastest strategy for each query.

---

## Demo Queries (Copy & Paste These)

### 1. Fast Search (Algolia) - Show Speed

**Bill Number Lookup** - Instant (~50ms)
```
HR 1
```
**Expected**: One Big Beautiful Bill Act (exact match)

**Short Keyword** - Fast (~200ms)
```
healthcare
```
**Expected**: All bills mentioning "healthcare" anywhere in title/summary

**With Filters** - Fast with precision
```
Search: climate
Filters: Status = Enacted, Bill Type = hr
```
**Expected**: Only House bills about climate that became law

---

### 2. AI Semantic Search - Show Intelligence

**Conceptual Question** - AI understands intent (~500ms)
```
What bills help veterans with healthcare?
```
**Expected**: Bills about VA healthcare, military benefits, veteran services
**Why AI?**: Understands "help veterans" means benefits, services, support

**Natural Language** - Ask like talking to a person
```
legislation supporting renewable energy and climate action
```
**Expected**: Bills about solar, wind, clean energy, emissions
**Why AI?**: Connects "renewable energy" concept to specific terms

**Complex Question** - Multiple concepts
```
Which bills address affordable housing for low income families?
```
**Expected**: Housing assistance, rent control, subsidies, public housing
**Why AI?**: Understands "affordable housing" + "low income" relationship

---

## Demo Flow (3 Minutes)

### Step 1: Show Fast Search (30 sec)
1. Type: `HR 1` → "See? Instant bill lookup"
2. Type: `healthcare` → "Fast keyword matching"

### Step 2: Show AI Intelligence (90 sec)
3. Type: `What bills help small businesses?`
   - Point out the **sparkle icon** (AI indicator)
   - Show **relevance scores** (85% match, 72% match, etc.)
   - Explain: "It understands 'help small businesses' means loans, tax breaks, grants"

4. Type: `legislation about protecting voting rights`
   - Show results include: election security, voter access, ballot measures
   - Explain: "AI connects 'voting rights' to related concepts"

### Step 3: Show Filters + Speed (30 sec)
5. Search: `climate` + Filters: `Status = Enacted`
   - Show it switches back to fast search (Algolia)
   - Explain: "Filters use fast search for instant results"

### Step 4: Show Highlighting (30 sec)
6. Type: `renewable energy tax credits`
   - Point out **yellow highlighting** on matching terms
   - Show how it highlights in both title AND summary

---

## What to Emphasize

### 1. **Automatic Intelligence**
> "You don't choose AI or fast search - the system picks the best strategy automatically"

### 2. **Visual Indicators**
- ⚡ **Lightning bolt** = Fast search (Algolia)
- ✨ **Sparkles** = AI search (SmartBuckets)
- 🔢 **Percentage badge** = Relevance score (AI only)
- 🟡 **Yellow highlight** = Your search terms

### 3. **Performance**
- Fast search: ~200ms (instant)
- AI search: ~500ms (still fast for AI)
- Hybrid: Tries fast first, AI if needed

### 4. **Real Use Cases**

**For Citizens:**
> "Find bills that affect me" - AI understands your location, interests, needs

**For Advocates:**
> "Track all climate legislation" - AI finds related bills you might miss with keywords

**For Journalists:**
> "What's happening with healthcare reform?" - AI surfaces related stories

---

## Advanced Demo Queries

### Show Semantic Understanding

**Query**: `bills helping students pay for college`
**AI Understands**: student loans, tuition assistance, grants, financial aid, FAFSA

**Query**: `legislation protecting workers rights`
**AI Understands**: minimum wage, unions, workplace safety, benefits, overtime

**Query**: `what are they doing about inflation?`
**AI Understands**: Federal Reserve, interest rates, economic policy, prices

### Show Concept Matching

**Query**: `environmental protection`
**Matches**: EPA, clean air, water quality, endangered species, conservation

**Query**: `criminal justice reform`
**Matches**: sentencing, prison reform, police accountability, bail reform

---

## Common Questions & Answers

### Q: "How does it know what I mean?"
**A**: "We use AI embeddings - the system converts your question into a mathematical concept that matches bills with similar meaning, not just exact words."

### Q: "Is AI slower?"
**A**: "AI is ~500ms, which is still instant for users. But we optimize by using fast keyword search when possible (bill numbers, simple terms)."

### Q: "Can I force AI search?"
**A**: "Yes! Add `strategy=semantic` to the URL, but usually you don't need to - the system picks the best approach."

### Q: "What if AI is wrong?"
**A**: "That's why we show relevance scores and let you use filters to narrow down. Plus fast search is always available for exact matches."

---

## Technical Details (For Developers)

### Search Strategy Decision Tree
```
Input: User query

1. Is it a bill number (HR 1234)?
   → YES: Use Algolia (instant exact match)
   → NO: Continue

2. Does it have filters (status, type, party)?
   → YES: Use Algolia (filters are fast)
   → NO: Continue

3. Is it short (1-2 words)?
   → YES: Use Algolia (keyword matching is fast)
   → NO: Continue

4. Is it a question OR 5+ words?
   → YES: Use SmartBuckets (AI semantic)
   → NO: Use Hybrid (try Algolia, fallback to AI)
```

### Performance Benchmarks
- **Algolia**: 50-300ms (keyword matching)
- **SmartBuckets**: 200-500ms (semantic search with embeddings)
- **Database enrichment**: +50ms (add sponsor, committee info)

### Architecture
1. **Query Analysis** → Determine strategy
2. **Algolia** → Fast keyword index (Algolia service)
3. **SmartBuckets** → AI embeddings (Raindrop SmartBuckets)
4. **Enrichment** → Add metadata from database
5. **Filtering** → Apply user filters
6. **Response** → JSON with results + metadata

---

## Testing Semantic Search

### Manual Testing

```bash
# Test fast search
curl "http://localhost:3000/api/search?q=healthcare"

# Test AI search (5+ words)
curl "http://localhost:3000/api/search?q=what+bills+help+veterans+with+healthcare"

# Force AI search
curl "http://localhost:3000/api/search?q=climate&strategy=semantic"

# Test with filters
curl "http://localhost:3000/api/search?q=healthcare&status=enacted"
```

### Expected Response
```json
{
  "success": true,
  "searchType": "unified",
  "layer": "algolia",  // or "smartbuckets"
  "query": "healthcare",
  "results": [...],
  "meta": {
    "duration": 245,      // ms
    "count": 20,
    "total": 1250,
    "strategy": "algolia" // or "semantic"
  }
}
```

---

## Troubleshooting

### "AI search is slow"
- Expected: 200-500ms is normal for AI
- Check: SmartBuckets indexing is complete (background process)
- Solution: Use filters to trigger fast Algolia search

### "No results for semantic query"
- Check: Bills must be indexed in SmartBuckets first
- Run: `npx tsx scripts/index-smartbuckets-119.ts`
- Wait: Indexing takes time (see progress logs)

### "Strategy not working as expected"
- Check: Console logs show strategy decision
- Debug: Add `console.log` to `determineSearchStrategy()`
- Force: Use `?strategy=semantic` or `?strategy=algolia`

---

**Pro Tip**: For demos, prepare queries ahead of time and test them to ensure SmartBuckets is indexed and working!
