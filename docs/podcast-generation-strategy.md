# 🎙️ Daily Audio Brief - Generation Strategy & UX Design

**Version:** 1.0
**Date:** 2025-11-04
**Purpose:** Define podcast generation approach, timing, and dashboard UX

---

## 🤔 The Core Question

**Should daily briefs be auto-generated or user-generated?**

### Option 1: Auto-Generated at Fixed Time
**Approach:** Generate briefs for all users at 6am daily
- ✅ Convenience: Content ready when users wake up
- ✅ Habit formation: Encourages daily engagement
- ✅ Batch efficiency: Process all users at once
- ❌ Waste: Many users won't listen every day
- ❌ Cost: High API usage (generates for everyone)
- ❌ Fixed timing: Doesn't adapt to user schedules
- ❌ Storage: Must store audio files indefinitely

**Cost Estimate:**
- 1000 users × 365 days = 365,000 generations/year
- If only 30% listen → 70% wasted
- Annual waste: ~$15,000-20,000 in unnecessary API calls

### Option 2: On-Demand Generation
**Approach:** User clicks "Generate Daily Brief" button
- ✅ Cost-effective: Only generates when requested
- ✅ User control: Generate when convenient
- ✅ No waste: Every generation gets listened to
- ❌ Wait time: 30-60 second generation latency
- ❌ Friction: Requires user action
- ❌ Less magical: Feels like work, not a service

**Cost Estimate:**
- 1000 users × 30% engagement × 365 days = 109,500 generations/year
- 70% cost savings vs. auto-generation
- Better resource utilization

### Option 3: Hybrid Smart Generation (⭐ RECOMMENDED)
**Approach:** Learn user behavior and generate intelligently

---

## ⭐ Recommended Strategy: Intelligent Hybrid Approach

### How It Works

**For New Users (First 7 Days):**
1. **On-Demand Mode**
   - Show prominent "Generate Your Daily Brief" button
   - Display what topics will be covered
   - 30-60 second generation time (show progress)
   - After generation, ask: "Want this daily at [time]?"

**For Engaged Users (Listened to 3+ briefs in past week):**
2. **Smart Auto-Generation**
   - Learn user's listening time from history
   - Pre-generate 30 minutes before their usual time
   - Show "Your daily brief is ready!" notification
   - If user doesn't listen within 24 hours → skip next day

**For Dormant Users (Haven't listened in 7+ days):**
3. **Pause Auto-Generation**
   - Stop auto-generating to save costs
   - Show "Generate Daily Brief" button again
   - Resume auto-generation after they listen again

### User Learning Algorithm

```typescript
interface UserListeningPattern {
  userId: string;
  avgListeningTime: Date; // e.g., 7:30am
  listenDays: string[];   // e.g., ['monday', 'tuesday', 'friday']
  completionRate: number; // e.g., 0.85 (85% completion)
  lastListened: Date;
  totalBriefsListened: number;
}

function shouldAutoGenerate(user: UserListeningPattern): boolean {
  // Rule 1: User is engaged (listened 3+ times in past week)
  const recentListens = user.totalBriefsListened >= 3;

  // Rule 2: User listened within past 48 hours
  const isActive = (Date.now() - user.lastListened.getTime()) < (48 * 60 * 60 * 1000);

  // Rule 3: Today is one of their typical listening days
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  const isListeningDay = user.listenDays.includes(today);

  // Rule 4: High completion rate (actually listens when generated)
  const hasHighEngagement = user.completionRate > 0.7;

  return recentListens && isActive && isListeningDay && hasHighEngagement;
}

function getGenerationTime(user: UserListeningPattern): Date {
  // Generate 30 minutes before user's typical listening time
  const generationTime = new Date(user.avgListeningTime);
  generationTime.setMinutes(generationTime.getMinutes() - 30);
  return generationTime;
}
```

---

## 🎨 Dashboard UX Design

### Podcast Queue Widget - Desktop

```
┌────────────────────────────────────────────────┐
│ 🎙️ Your Podcast Queue           [Preferences] │
├────────────────────────────────────────────────┤
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │  ✨ Ready for you:                       │  │
│ │                                           │  │
│ │  Daily Brief (5 min)                     │  │
│ │  Climate + Healthcare                    │  │
│ │  Updated 30 mins ago                     │  │
│ │                                           │  │
│ │  [▶ Play Now]  [Download]  [Share]      │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ─── or ───                                     │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │  🎯 Generate New Brief                   │  │
│ │                                           │  │
│ │  Topics: Climate, Healthcare, Education   │  │
│ │  Length: ~5 minutes                      │  │
│ │  Focus: Your local representatives       │  │
│ │                                           │  │
│ │  [Generate Daily Brief →]                │  │
│ │  Takes ~45 seconds                       │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Past Briefs (7)                                │
│ • Nov 3 - Climate & Education (listened)       │
│ • Nov 2 - Healthcare Updates (listened)        │
│ • Nov 1 - Weekly Roundup (listened)            │
│                                                │
│ View full history >                            │
└────────────────────────────────────────────────┘
```

### States & Transitions

**State 1: No Brief Available (New User)**
```
┌────────────────────────────────────────────────┐
│ 🎙️ Your Podcast Queue                         │
├────────────────────────────────────────────────┤
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │  Welcome to HakiVo! 👋                   │  │
│ │                                           │  │
│ │  Get your first personalized daily brief │  │
│ │  covering legislation you care about.     │  │
│ │                                           │  │
│ │  We'll cover:                             │  │
│ │  • Climate legislation from your state   │  │
│ │  • Healthcare bills affecting you        │  │
│ │  • Your representatives' activity        │  │
│ │                                           │  │
│ │  Length: ~5 minutes                      │  │
│ │                                           │  │
│ │  [Generate My First Brief →]             │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

**State 2: Generating (Loading State)**
```
┌────────────────────────────────────────────────┐
│ 🎙️ Your Podcast Queue                         │
├────────────────────────────────────────────────┤
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │  🎙️ Generating your daily brief...       │  │
│ │                                           │  │
│ │  [████████░░░░] 65%                      │  │
│ │                                           │  │
│ │  Current step:                            │  │
│ │  ✓ Fetching latest bills                 │  │
│ │ ✓ Analyzing your preferences             │  │
│ │ ⏳ Generating dialogue script...          │  │
│ │ ○ Creating audio with ElevenLabs         │  │
│ │                                           │  │
│ │  Estimated time: ~30 seconds              │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

**State 3: Ready to Listen (Brief Available)**
```
┌────────────────────────────────────────────────┐
│ 🎙️ Your Podcast Queue                         │
├────────────────────────────────────────────────┤
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │  ✨ Your daily brief is ready!           │  │
│ │                                           │  │
│ │  Daily Brief - Nov 4, 2025               │  │
│ │  Duration: 5 min 23 sec                  │  │
│ │                                           │  │
│ │  Topics covered:                          │  │
│ │  • HR-3458: Renewable Energy Act         │  │
│ │  • S-1234: Healthcare Expansion          │  │
│ │  • Your rep voted on 3 bills this week   │  │
│ │                                           │  │
│ │  [▶ Play Now]  [Download]  [Share]      │  │
│ │                                           │  │
│ │  💡 Tip: Listen during your commute!      │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ [🔄 Generate New Brief]  [⚙️ Preferences]      │
└────────────────────────────────────────────────┘
```

**State 4: Auto-Gen Prompt (For Engaged Users)**
```
┌────────────────────────────────────────────────┐
│ 🎙️ Your Podcast Queue           [⚡ Auto-Gen] │
├────────────────────────────────────────────────┤
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │  ✨ Your daily brief is ready!           │  │
│ │  Auto-generated at 7:00 AM               │  │
│ │                                           │  │
│ │  Daily Brief - Nov 4, 2025               │  │
│ │  Duration: 5 min 23 sec                  │  │
│ │                                           │  │
│ │  [▶ Play Now]  [Download]  [Share]      │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ℹ️ We noticed you usually listen at 7:30 AM   │
│ Want to change this? [Update preferences]      │
└────────────────────────────────────────────────┘
```

**State 5: Offer Auto-Gen (After 3rd Listen)**
```
┌────────────────────────────────────────────────┐
│ 🎙️ Your Podcast Queue                         │
├────────────────────────────────────────────────┤
│                                                │
│ ✨ Love your daily briefs?                     │
│                                                │
│ We can automatically generate them for you     │
│ every morning at 7:00 AM (based on your        │
│ listening pattern).                            │
│                                                │
│ [✓ Yes, auto-generate daily]                  │
│ [✗ No, I'll generate manually]                │
│                                                │
│ You can change this anytime in preferences.    │
└────────────────────────────────────────────────┘
```

---

## 📱 Mobile UX

**Collapsed State (Default)**
```
┌─────────────────────────────┐
│ 🎙️ Your Podcast Queue       │
├─────────────────────────────┤
│                             │
│ ✨ Ready for you:           │
│                             │
│ Daily Brief (5 min)         │
│ Climate + Healthcare        │
│                             │
│ [▶ Play Now]                │
│                             │
│ [Generate New Brief →]      │
└─────────────────────────────┘
```

**Expanded State (Tap to Expand)**
```
┌─────────────────────────────┐
│ 🎙️ Your Podcast Queue   [✕] │
├─────────────────────────────┤
│                             │
│ Daily Brief - Nov 4         │
│ Duration: 5 min 23 sec      │
│                             │
│ Topics covered:             │
│ • HR-3458: Renewable...     │
│ • S-1234: Healthcare...     │
│ • Your rep voted on...      │
│                             │
│ [▶ Play Now]                │
│ [Download]  [Share]         │
│                             │
│ ─────────────────────────   │
│                             │
│ Past Briefs (7)             │
│ • Nov 3 - Climate          │
│ • Nov 2 - Healthcare       │
│ • Nov 1 - Weekly Roundup   │
│                             │
│ [View All]                  │
│                             │
│ ⚙️ Preferences              │
│ • Auto-generate: ON         │
│ • Time: 7:00 AM             │
│ • Length: 5-7 min           │
│ • Topics: 3 selected        │
│                             │
│ [Update Preferences]        │
└─────────────────────────────┘
```

---

## ⚙️ Preferences Modal

**Desktop Modal (Click "Preferences" button)**
```
┌──────────────────────────────────────────────┐
│ 🎙️ Podcast Preferences                  [✕] │
├──────────────────────────────────────────────┤
│                                              │
│ Auto-Generation                              │
│ ┌──────────────────────────────────────────┐│
│ │ [●] Auto-generate daily                  ││
│ │ [ ] Generate only when I request         ││
│ └──────────────────────────────────────────┘│
│                                              │
│ Generation Time                              │
│ ┌──────────────────────────────────────────┐│
│ │ Generate at: [7:00 AM          ▾]       ││
│ │                                           ││
│ │ ℹ️ Brief will be ready by 7:30 AM        ││
│ └──────────────────────────────────────────┘│
│                                              │
│ Brief Length                                 │
│ ┌──────────────────────────────────────────┐│
│ │ [ ] Quick (3-5 min)                      ││
│ │ [●] Standard (5-7 min)                   ││
│ │ [ ] In-depth (15-18 min)                 ││
│ └──────────────────────────────────────────┘│
│                                              │
│ Topics to Cover (Select 2-5)                 │
│ ┌──────────────────────────────────────────┐│
│ │ [✓] Climate & Environment                ││
│ │ [✓] Healthcare                           ││
│ │ [✓] Education                            ││
│ │ [ ] Economy & Jobs                       ││
│ │ [ ] Defense & Security                   ││
│ │ [ ] Immigration                          ││
│ └──────────────────────────────────────────┘│
│                                              │
│ Focus                                        │
│ ┌──────────────────────────────────────────┐│
│ │ [✓] My representatives' activity         ││
│ │ [✓] Bills from my state                  ││
│ │ [ ] Trending national bills              ││
│ │ [ ] Committee hearings                   ││
│ └──────────────────────────────────────────┘│
│                                              │
│ Listening Days                               │
│ ┌──────────────────────────────────────────┐│
│ │ [✓] Mon [✓] Tue [✓] Wed [✓] Thu [✓] Fri ││
│ │ [ ] Sat [ ] Sun                          ││
│ └──────────────────────────────────────────┘│
│                                              │
│          [Cancel]  [Save Preferences]        │
└──────────────────────────────────────────────┘
```

---

## 🔔 Notification Strategy

### When Brief is Ready

**Desktop Notification (if enabled)**
```
┌────────────────────────────────┐
│ 🎙️ HakiVo                      │
│                                │
│ Your daily brief is ready!     │
│                                │
│ 5 min • Climate + Healthcare   │
│                                │
│ [Play Now]  [Dismiss]          │
└────────────────────────────────┘
```

**Mobile Push Notification**
```
🎙️ HakiVo
Your daily brief is ready!

5 min • Climate + Healthcare • 3 bills covered

Tap to listen →
```

**In-App Banner (Top of Dashboard)**
```
┌──────────────────────────────────────────────────────┐
│ ✨ Your daily brief is ready! [▶ Play Now] [Dismiss] │
└──────────────────────────────────────────────────────┘
```

### Notification Timing

**Smart Notification Rules:**
1. **Quiet Hours:** Don't notify between 10pm - 7am
2. **Device Context:** Only push if app is not open
3. **Frequency Cap:** Max 1 podcast notification per day
4. **User Preference:** Respect notification settings

---

## 🎯 User Journey Flows

### New User Journey

```
Day 1:
  → See "Generate My First Brief" button
  → Click button
  → See generation progress (45 seconds)
  → Brief ready! Listen
  → After listening: "Want this daily?" prompt
  → Choose auto-gen time: 7:00 AM

Day 2:
  → Brief auto-generated at 6:30 AM
  → Push notification at 7:00 AM
  → User listens during commute
  → Reinforces habit

Day 3:
  → Brief auto-generated
  → User doesn't listen
  → No generation next day

Day 5:
  → User manually generates brief
  → System asks: "Resume daily generation?"
  → User confirms
  → Habit loop restored
```

### Engaged User Journey

```
Week 1:
  → User listens 5/7 days
  → System learns: prefers Monday-Friday at 7:30am
  → Auto-generates accordingly

Week 2:
  → User travels (different timezone)
  → Doesn't listen for 3 days
  → System pauses auto-generation
  → Shows "Generate when ready" button

Week 3:
  → User returns, generates manually
  → System detects pattern resumption
  → Resumes auto-generation
  → User happy with smart behavior
```

### Dormant User Re-engagement

```
Week 1:
  → User listens daily (engaged)

Week 2:
  → User stops listening
  → System generates 2 more days
  → Then pauses auto-generation

Week 3:
  → Dashboard shows: "Generate New Brief" button
  → Email: "Miss your daily briefs? We saved your preferences"
  → User clicks, listens again
  → Re-engagement successful
```

---

## 💰 Cost Analysis

### Generation Costs (Per Brief)

**API Costs:**
- Claude API (dialogue generation): $0.015
- ElevenLabs TTS (5 min audio): $0.24
- Vultr Storage (50MB file): $0.001
- **Total per brief:** ~$0.26

**Monthly Costs by Strategy:**

**Pure Auto-Generation (All Users):**
- 1000 users × 30 days = 30,000 briefs
- Cost: 30,000 × $0.26 = **$7,800/month**
- Waste: 70% don't listen = **$5,460 wasted**

**Pure On-Demand:**
- 1000 users × 30% engagement × 30 days = 9,000 briefs
- Cost: 9,000 × $0.26 = **$2,340/month**
- Waste: $0 (all generated are listened to)

**Smart Hybrid (Recommended):**
- Auto-gen for engaged users: 300 users × 25 days = 7,500 briefs
- On-demand for others: 700 users × 20% × 30 days = 4,200 briefs
- Total: 11,700 briefs
- Cost: 11,700 × $0.26 = **$3,042/month**
- Waste: ~10% = **$304 wasted**

**Savings: $4,758/month (61% reduction vs. pure auto-gen)**

---

## 📊 Success Metrics

### Engagement Metrics
- **Daily Active Listeners (DAL):** Target 40%+ of users
- **Completion Rate:** Target 70%+ finish entire brief
- **Listen Frequency:** Target 4+ days/week for engaged users
- **Generation Success Rate:** Target 95%+ complete under 60 seconds

### Cost Efficiency
- **Cost Per Engaged User:** Target <$5/month
- **Waste Rate:** Target <15% of generations unwatched
- **API Cost Growth:** Target linear (not exponential) with users

### User Satisfaction
- **NPS Score:** Target 50+ (promoters - detractors)
- **Feature Usage:** Target 60%+ users listen at least once
- **Retention:** Target 50%+ still listening after 30 days

---

## 🚀 Implementation Roadmap

### Phase 1: MVP (Week 1)
- ✅ On-demand generation only
- ✅ "Generate Daily Brief" button
- ✅ Loading state with progress
- ✅ Play/download/share actions
- ✅ Basic error handling

### Phase 2: User Learning (Week 2)
- ✅ Track listening patterns
- ✅ Detect typical listening time
- ✅ Store user preferences
- ✅ Calculate engagement score

### Phase 3: Smart Auto-Gen (Week 3)
- ✅ Auto-generate for engaged users
- ✅ Pre-generate 30 mins before usual time
- ✅ Pause for dormant users
- ✅ Resume detection algorithm

### Phase 4: Preferences & Notifications (Week 4)
- ✅ Preferences modal
- ✅ Custom generation times
- ✅ Topic selection
- ✅ Push notifications
- ✅ Email notifications

### Phase 5: Optimization & Polish (Week 5)
- ✅ A/B test notification timing
- ✅ Optimize generation costs
- ✅ Improve completion rate
- ✅ Add social sharing features
- ✅ Launch publicly

---

## ✅ Recommended Approach Summary

**My Honest Opinion: Hybrid is the Way to Go! 🎯**

**Why?**
1. **User Experience:** Feels magical (auto-generated) without being wasteful
2. **Cost Efficiency:** 61% cost reduction vs. pure auto-gen
3. **Flexibility:** Adapts to each user's unique needs
4. **Scalability:** Costs grow linearly with engaged users, not total users
5. **Retention:** Builds habits without forcing behavior

**Implementation Priority:**
1. Start with **on-demand** (MVP - Week 1)
2. Add **learning algorithm** (Week 2)
3. Enable **smart auto-gen** (Week 3)
4. Polish with **preferences** (Week 4)
5. Optimize and **scale** (Week 5)

**This approach maximizes user delight while minimizing waste. Win-win! 🚀**

---

**Ready to build the smartest civic podcast platform? Let's do this! 🎙️**
