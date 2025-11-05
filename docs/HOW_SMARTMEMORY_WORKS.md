# How SmartMemory Works - Plain English Guide

## What is SmartMemory?

Think of SmartMemory as the brain of HakiVo. Just like your brain has different types of memory (remembering what you had for breakfast vs. how to ride a bike), SmartMemory has four different types of memory that work together to make the app smarter and more personalized.

---

## The Four Types of Memory

### 1. **Working Memory** - What's Happening Right Now
**Real-life analogy:** Your short-term memory during a conversation

When you're using HakiVo right now, Working Memory keeps track of:
- Bills you're looking at in this session
- Podcasts you're listening to today
- Questions you're asking
- Pages you're visiting

**Example:**
```
You open HakiVo → Working Memory starts a new "session"
You click on a climate bill → Working Memory notes "user interested in climate"
You listen to a podcast about it → Working Memory notes "engaged with climate content"
You close HakiVo → Working Memory saves everything to long-term storage
```

**Why it matters:** Working Memory helps the app understand what you're doing RIGHT NOW so it can give you better suggestions immediately.

---

### 2. **Episodic Memory** - What Happened in the Past
**Real-life analogy:** Your memory of specific events ("Remember when we went to that restaurant?")

After you finish a session, Working Memory gets saved to Episodic Memory as a summary:

**Example:**
```
Session from Tuesday, Nov 4th, 2025:
"User explored climate legislation, listened to weekly brief
about renewable energy bills, showed interest in local
representative's environmental voting record. Engaged for 18 minutes."
```

**Why it matters:** When you come back tomorrow, HakiVo can look at your past sessions and say "Last time you were interested in climate bills - here are new ones that just got introduced!"

---

### 3. **Semantic Memory** - What We Know About You
**Real-life analogy:** General facts you know (your favorite food, your home address)

Semantic Memory stores structured facts about your preferences:

**Example:**
```json
{
  "userId": "user-123",
  "topInterests": ["climate change", "healthcare", "education"],
  "location": "Massachusetts, District 7",
  "representatives": ["Warren (Senator)", "Markey (Senator)", "Pressley (Rep)"],
  "listeningHabits": {
    "preferredLength": "10-15 minutes",
    "bestTime": "morning commute",
    "completionRate": "85%"
  },
  "engagementLevel": "high"
}
```

**Why it matters:** This is your "civic profile" - it helps HakiVo understand WHO you are and what you care about, so it can personalize everything from bill recommendations to podcast topics.

---

### 4. **Procedural Memory** - How You Use the App
**Real-life analogy:** Muscle memory (how to ride a bike, type on a keyboard)

Procedural Memory learns your habits and patterns:

**Example:**
```
User habits learned:
- Always listens to daily brief on Monday mornings
- Skips the "bill technical details" section
- Prefers short summaries over full text
- Shares interesting bills on Twitter
- Checks representative voting records weekly
```

**Why it matters:** The app learns how you prefer to use it and adapts. If you always skip certain content, it stops showing it. If you love deep dives, it offers more.

---

## How They Work Together: A Real Example

### **Scenario: You're interested in student loan legislation**

**Day 1 - First Time:**
- You search for "student loans"
- **Working Memory** tracks this search
- You read 3 bills about debt relief
- **Working Memory** notes: "User engaged with student loan content"
- You close the app
- **Working Memory** saves to **Episodic Memory**: "User explored student loan bills for 12 minutes"
- System updates **Semantic Memory**: Add "student loans" to user interests

**Day 2 - Coming Back:**
- You open HakiVo
- **Semantic Memory** says: "This user cares about student loans"
- **Episodic Memory** says: "They looked at debt relief bills yesterday"
- Dashboard shows: "New student loan bill introduced by your representative!"
- You listen to the recommended podcast
- **Procedural Memory** learns: "User responds well to bill notifications about education"

**Day 7 - A Week Later:**
- You open HakiVo
- **All 4 memories work together:**
  - Semantic: "Top interest is student loans"
  - Episodic: "Has viewed 8 education bills over 3 sessions"
  - Procedural: "Prefers audio summaries over text"
  - Working: "Currently viewing dashboard"

- **Result:** HakiVo automatically generates a personalized audio brief:
  "Here's an update on the 3 student loan bills you've been following,
  plus a new bill your representative just co-sponsored."

---

## Privacy & Control

### What Gets Stored?
- **YES:** Your interests, listening habits, bills you view
- **NO:** Private conversations, personal information outside the app
- **NEVER:** Shared with third parties without explicit consent

### You're Always in Control
- View all stored memories in Settings
- Delete specific memories or entire history
- Pause learning/personalization anytime
- Export your data

---

## The Magic: How It Gets Smarter

### Week 1: Basic Personalization
```
"You looked at climate bills → Here are more climate bills"
```

### Month 1: Pattern Recognition
```
"You always check what your local rep is doing on Fridays
→ We'll have their weekly activity ready Friday morning"
```

### Month 3: Predictive Intelligence
```
"Based on your interest in climate bills, education funding,
and healthcare access, you might care about this new infrastructure
bill because it covers all three areas in your district"
```

### Month 6: Proactive Assistance
```
"A bill you viewed 2 months ago just passed the House -
want to hear what changed and what happens next?"
```

---

## Technical Implementation (For Developers)

### Working Memory Flow
```typescript
// User starts session
const { sessionId, workingMemory } = await smartMemory.startWorkingMemorySession();

// Track interactions
await workingMemory.putMemory({
  content: "User viewed HR-3458 renewable energy bill",
  key: "bill_interaction"
});

// End session (auto-saves to episodic)
await workingMemory.endSession(true);
```

### Semantic Memory Query
```typescript
// Get user profile
const profile = await smartMemory.getSemanticMemory(userId);

// Use for personalization
const recommendations = await smartBucket.search({
  input: profile.topInterests.join(' '),
  requestId: `recommend-${userId}`
});
```

### Episodic Memory Search
```typescript
// Find relevant past sessions
const pastSessions = await smartMemory.searchEpisodicMemory(
  "student loans education bills",
  { nMostRecent: 5 }
);

// Use for context in conversations
```

### Procedural Memory Storage
```typescript
// Learn user habits
await proceduralMemory.putProcedure(
  `habits_${userId}`,
  JSON.stringify({
    preferredBriefTime: "08:00",
    averageSessionLength: "15min",
    favoriteFeatures: ["podcast", "tracking"]
  })
);
```

---

## Why This Matters for Civic Engagement

**Traditional civic apps:** Static, one-size-fits-all
**HakiVo with SmartMemory:** Adapts to each citizen

### The Impact:
- **Higher engagement:** People return because content is relevant
- **Better informed:** Focus on bills that actually affect you
- **Easier participation:** App learns how you want to engage
- **Sustained interest:** Keeps civic engagement manageable and rewarding

**Bottom line:** Democracy is complex. SmartMemory makes it personal, manageable, and actually useful for everyday citizens.

---

## Real User Journeys

### Sarah - Busy Parent
- Week 1: Explores education bills randomly
- Week 2: HakiVo learns she cares about school funding
- Week 3: Auto-generates 5-minute morning briefs about education
- Month 2: Alerts her when local rep votes on education bills
- Result: Stays engaged without spending hours researching

### James - Climate Activist
- Week 1: Deep dives into environmental legislation
- Week 2: HakiVo learns he prefers detailed analysis
- Week 3: Recommends complex bills he'd miss otherwise
- Month 2: Connects related bills across different policy areas
- Result: Becomes more effective advocate with better information

### Maria - First-Time Voter
- Week 1: Overwhelmed by amount of legislation
- Week 2: HakiVo learns she prefers simple explanations
- Week 3: Provides "Explain Like I'm 5" summaries
- Month 2: Gradually introduces more complex topics
- Result: Builds civic knowledge at her own pace

---

## The Future: What's Coming

- **Cross-user learning:** "People interested in X also care about Y"
- **Predictive alerts:** "Based on your interests, this bill will likely matter to you"
- **Community insights:** "Others in your district are tracking these bills"
- **Impact tracking:** "This bill you followed just became law - here's what changes"

**SmartMemory turns HakiVo from a tool into a partner in civic engagement.**
