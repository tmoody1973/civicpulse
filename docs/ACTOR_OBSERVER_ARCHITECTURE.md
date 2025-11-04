# HakiVo Actor/Observer Architecture

**Improving User Experience with Raindrop Actors & Observers**

---

## Executive Summary

Raindrop's Actor/Observer pattern can transform HakiVo from a request-response app into a **proactive, intelligent civic engagement platform**. This document outlines high-impact implementations prioritized by user value.

---

## Core Concepts

### **Actors** = Stateful Compute Units
- Persistent identity (per user, bill, topic)
- 10GB storage per actor
- Serial request processing (data consistency)
- Built-in alarms (scheduled wake-ups)

### **Observers** = Event Listeners
- **Bucket Observers**: React to file uploads
- **Queue Observers**: Process async messages
- **Each**: Process messages individually
- **Batch**: Process multiple messages efficiently

---

## Priority 1: Audio Generation Queue Manager (Actor + Observer)

### **Problem:**
Podcast generation takes 30-60s, blocking user interaction. No visibility into generation status.

### **Solution: Podcast Generation Actor**

**Actor Responsibilities:**
```typescript
actor "podcast-generator" {
  // Per-user instance: env.PODCAST_GENERATOR.idFromName(userId)

  storage: {
    queue: PodcastRequest[]           // User's pending podcasts
    current: GenerationStatus          // What's generating now
    history: CompletedPodcast[]        // Last 10 podcasts
    preferences: GenerationSettings    // Voice, speed, length
  }

  methods: {
    async queuePodcast(request: PodcastRequest)
    async checkStatus(): GenerationStatus
    async cancelGeneration(podcastId: string)
    async updatePreferences(prefs: GenerationSettings)
  }

  alarms: {
    // Wake up every 5min to check queue
    setAlarm(Date.now() + 5 * 60 * 1000)
  }
}
```

**Queue Observer:**
```typescript
observer "podcast-queue-handler" {
  source {
    queue = "podcast-generation-queue"
  }

  // Processes one podcast at a time
  async process(request: PodcastRequest) {
    // 1. Fetch bills
    // 2. Generate dialogue (Claude)
    // 3. Generate audio (ElevenLabs)
    // 4. Upload to Vultr
    // 5. Update actor with result
    // 6. Trigger notification
  }
}
```

**User Experience:**
```
Before: "Generating podcast..." [60s spinner] 😴
After:  "Queued! Position #2 (~2 min)" [real-time updates] 🎯
        "Generating dialogue..."
        "Creating audio..."
        🔔 "Your daily brief is ready!"
```

**Implementation:**
- Queue: `podcast-generation-queue`
- Actor: `podcast-generator-{userId}`
- Observer: Watches queue, processes requests
- Alarm: Actor wakes up to process queued items

---

## Priority 2: Bill Update Monitor (Observer + Actor)

### **Problem:**
Users miss important bill status changes. No real-time tracking.

### **Solution: Bill Tracking Actor**

**Bucket Observer:**
```typescript
observer "bill-update-detector" {
  source {
    bucket = "bill-sync-data"
    rule {
      actions = ["PutObject"]
      prefix = "congress-119/"  // Only watch current congress
    }
  }

  // Triggers when Congress.gov data updates
  async process(notification: BucketEventNotification) {
    // 1. Parse updated bill data
    // 2. Compare with previous state
    // 3. Detect status changes
    // 4. Queue notifications for affected users
  }
}
```

**Actor Per Tracked Bill:**
```typescript
actor "bill-tracker" {
  // Per bill: env.BILL_TRACKER.idFromName(billId)

  storage: {
    billData: BillSnapshot           // Current state
    subscribers: UserId[]            // Who's tracking this
    lastUpdate: timestamp            // For change detection
    changeHistory: StatusChange[]    // Audit trail
  }

  methods: {
    async subscribe(userId: string)
    async unsubscribe(userId: string)
    async notifyChange(change: StatusChange)
    async getChangeHistory(): StatusChange[]
  }
}
```

**User Experience:**
```
Before: Check manually every day 😞
After:  🔔 "HR-1234 passed the House! (Was: In Committee)"
        🔔 "Your tracked bill has a new cosponsor"
        🔔 "Hearing scheduled for next week"
```

---

## Priority 3: Smart Recommendation Engine (Actor)

### **Problem:**
Generic "featured bills" don't match user interests. No personalization.

### **Solution: User Intelligence Actor**

**Actor Per User:**
```typescript
actor "user-intelligence" {
  // env.USER_INTELLIGENCE.idFromName(userId)

  storage: {
    interactions: {
      billsViewed: { billId: viewCount }[]
      podcastsListened: { topic: duration }[]
      searchQueries: { query: frequency }[]
      issuePreferences: { category: weight }[]
    }

    profile: {
      topTopics: string[]              // Derived from behavior
      readingLevel: "simple" | "detailed"
      preferredLength: "5min" | "15min"
      activeTime: { start: hour, end: hour }
    }

    recommendations: {
      dailyBills: BillRecommendation[]
      weeklyTopics: TopicSuggestion[]
      nextPodcast: PodcastSuggestion
    }
  }

  methods: {
    async trackInteraction(event: UserEvent)
    async getDailyRecommendations(): Bill[]
    async getNextPodcast(): PodcastSuggestion
    async updateProfile()
  }

  alarms: {
    // Update recommendations daily at 6am
    setAlarm(getTomorrowAt(6, 0, 0))
  }
}
```

**Queue Observer for Analytics:**
```typescript
observer "interaction-tracker" {
  source {
    queue = "user-interactions"
    batch_size = 100  // Process in batches
  }

  async process(batch: MessageBatch<UserEvent>) {
    // Update user intelligence actors
    for (const event of batch.messages) {
      const actor = env.USER_INTELLIGENCE.idFromName(event.userId);
      await actor.trackInteraction(event.body);
    }
    batch.ackAll();
  }
}
```

**User Experience:**
```
Before: Random bills, no personalization 😕
After:  "Based on your interests: Healthcare Reform"
        "People who viewed HR-1234 also viewed..."
        "Your daily brief is ready (Healthcare focus)"
```

---

## Priority 4: Onboarding Guide Actor

### **Problem:**
New users don't know where to start. High drop-off rate.

### **Solution: Interactive Onboarding Actor**

**Actor Per New User:**
```typescript
actor "onboarding-guide" {
  // env.ONBOARDING_GUIDE.idFromName(userId)

  storage: {
    stage: "location" | "interests" | "first_search" | "first_podcast" | "completed"
    progress: {
      locationSet: boolean
      interestsChosen: boolean
      firstSearchDone: boolean
      firstPodcastGenerated: boolean
    }
    startedAt: timestamp
    completedAt: timestamp | null
  }

  methods: {
    async getNextStep(): OnboardingStep
    async completeStep(step: string)
    async skipToEnd()
    async restart()
  }

  alarms: {
    // Send reminder if stuck on a step for 24hrs
    setAlarm(Date.now() + 24 * 60 * 60 * 1000)
  }
}
```

**User Experience:**
```
Before: "Here's HakiVo. Good luck!" 🤷
After:  "Let's get you started! First, where do you live?"
        ✅ "Great! Now pick 3 topics you care about"
        ✅ "Try searching for healthcare bills"
        ✅ "Generate your first podcast!"
        🎉 "You're all set! Here's what to explore next..."
```

---

## Priority 5: Search Analytics Observer

### **Problem:**
No insights into what users search for. Can't improve search relevance.

### **Solution: Search Analytics Aggregator**

**Queue Observer:**
```typescript
observer "search-analytics" {
  source {
    queue = "search-queries"
    batch_size = 50
  }

  async process(batch: MessageBatch<SearchQuery>) {
    // Aggregate search patterns
    const analytics = {
      topQueries: Map<string, count>
      topicsSearched: Map<string, count>
      zeroResultQueries: string[]
      avgResultsPerQuery: number
      popularFilters: Map<string, count>
    };

    // Store in KV Cache for dashboard
    await env.ANALYTICS_CACHE.put("search_analytics", analytics);

    batch.ackAll();
  }
}
```

**Actor for Trending Topics:**
```typescript
actor "trending-topics" {
  // Single instance: env.TRENDING_TOPICS.idFromName("global")

  storage: {
    hourly: { topic: count, timestamp }[]
    daily: { topic: count, date }[]
    weekly: { topic: count, week }[]
    emerging: { topic: velocity }[]  // Fast-rising topics
  }

  methods: {
    async getTrendingNow(): Topic[]
    async getEmergingTopics(): Topic[]
    async getTopicVelocity(topic: string): number
  }

  alarms: {
    // Update trending every hour
    setAlarm(Date.now() + 60 * 60 * 1000)
  }
}
```

**User Experience:**
```
Before: Static "featured" section 😴
After:  🔥 "Trending Now: Immigration Reform"
        📈 "Emerging Topic: AI Regulation"
        🔍 "Popular searches this week"
```

---

## Implementation Priority

### **Phase 1: Immediate Impact** (Week 1)
1. ✅ **Podcast Generation Queue Manager**
   - Biggest pain point
   - Clear user value
   - Foundation for other actors

### **Phase 2: Retention** (Week 2)
2. ✅ **Bill Update Monitor**
   - Keeps users engaged
   - Push notifications
   - Viral potential (share alerts)

3. ✅ **Onboarding Guide Actor**
   - Reduces drop-off
   - Clearer value prop
   - Data for user intelligence

### **Phase 3: Personalization** (Week 3)
4. ✅ **User Intelligence Actor**
   - Improves engagement
   - Better recommendations
   - Data-driven UX

### **Phase 4: Insights** (Week 4)
5. ✅ **Search Analytics Observer**
   - Product insights
   - SEO opportunities
   - Content strategy

---

## Technical Architecture

### **Manifest Structure**
```hcl
application "hakivo" {

  # Actors
  actor "podcast-generator" {}
  actor "bill-tracker" {}
  actor "user-intelligence" {}
  actor "onboarding-guide" {}
  actor "trending-topics" {}

  # Queues
  queue "podcast-generation-queue" {}
  queue "user-interactions" {}
  queue "search-queries" {}
  queue "bill-updates" {}

  # Observers
  observer "podcast-queue-handler" {
    source {
      queue = "podcast-generation-queue"
    }
  }

  observer "bill-update-detector" {
    source {
      bucket = "bill-sync-data"
      rule {
        actions = ["PutObject"]
        prefix = "congress-119/"
      }
    }
  }

  observer "interaction-tracker" {
    source {
      queue = "user-interactions"
      batch_size = 100
    }
  }

  observer "search-analytics" {
    source {
      queue = "search-queries"
      batch_size = 50
    }
  }

  # Resources
  kv_cache "actor-state" {}
  kv_cache "analytics" {}
}
```

### **API Integration Pattern**
```typescript
// In Next.js API routes
export async function POST(req: Request) {
  const { userId } = await auth(req);

  // Get user's podcast generator actor
  const actorId = env.PODCAST_GENERATOR.idFromName(userId);
  const actor = env.PODCAST_GENERATOR.get(actorId);

  // Queue podcast (non-blocking)
  const queuePosition = await actor.queuePodcast({
    type: "daily",
    bills: selectedBills
  });

  return Response.json({
    queued: true,
    position: queuePosition,
    estimatedTime: queuePosition * 45 // seconds
  });
}
```

---

## Benefits Summary

### **For Users:**
- ⚡ **Instant feedback** - No more waiting for podcasts
- 🔔 **Proactive notifications** - Never miss important updates
- 🎯 **Smart recommendations** - Content they actually care about
- 🚀 **Smoother onboarding** - Clear path to value
- 📊 **Better search** - Results improve over time

### **For Product:**
- 📈 **Higher engagement** - Personalized experience
- 🔄 **Lower churn** - Timely notifications keep users coming back
- 💡 **Product insights** - Real data on user behavior
- 🎨 **Flexible architecture** - Easy to add new features
- 🏗️ **Scalable foundation** - Raindrop handles infrastructure

### **For Development:**
- 🔧 **Declarative config** - raindrop.manifest defines everything
- 🔄 **Auto-generated code** - `raindrop build generate` scaffolds observers
- 📦 **Built-in patterns** - Each/Batch base classes
- 🛡️ **Type safety** - Full TypeScript support
- 🔍 **Observability** - Built-in logging and monitoring

---

## Next Steps

1. **Start with Phase 1** - Implement Podcast Generation Queue Manager
2. **Test with real users** - Measure queue wait times and satisfaction
3. **Iterate based on feedback** - Adjust batch sizes, alarm frequencies
4. **Roll out incrementally** - One actor/observer at a time
5. **Monitor metrics** - Track engagement, retention, error rates

---

## Questions to Consider

- **Should we use Each or Batch for podcast generation?**
  - Start with Each for better error handling per podcast
  - Switch to Batch later if volume increases

- **How many podcast generators do we need?**
  - Start with 1 actor per user
  - Scale to separate actors for daily/weekly if needed

- **Should bill tracking be per-user or per-bill?**
  - Per-bill is more efficient (single source of truth)
  - Per-user for privacy/isolation trade-offs

- **What's the right alarm frequency?**
  - Podcast queue: Every 5 minutes (balance responsiveness/cost)
  - Recommendations: Daily at 6am (when users are active)
  - Trending topics: Hourly (enough for trend detection)

---

## Conclusion

Raindrop's Actor/Observer pattern transforms HakiVo from a static web app into an **intelligent, reactive platform** that anticipates user needs and delivers proactive value.

**Start with podcast generation** (biggest pain point), then layer on personalization and monitoring to create a world-class civic engagement experience.

**The architecture is ready. Let's build it! 🚀**
