# Dashboard Build Journey - Making Democracy Accessible

## November 3, 2025 - Starting the Personalized Dashboard

**What I'm Building:** A smart, personalized dashboard that transforms how people engage with Congress. Think of it like your morning news app, but specifically for the legislation and political news that matters to YOU.

**The Problem I'm Solving:**
Right now, staying informed about Congress is overwhelming. There are thousands of bills, hundreds of news stories, and it's impossible to know what's relevant to your life. It's like trying to drink from a fire hose. Most people give up and just scroll past political news, which means they miss laws that could directly impact them.

**How I'm Doing It:**
Imagine you tell the app "I care about health care, education, and climate change." The dashboard becomes your personal legislative assistant:

1. **Morning Audio Brief** - Like having your own NPR podcast that only covers YOUR topics. Every morning at 6 AM, the app automatically creates a 5-7 minute audio briefing just for you. It starts with breaking political news related to your interests, then covers the latest bills from Congress that match what you care about.

2. **Smart News Feed** - Instead of showing you every article from Capitol Hill, we use an AI called Perplexity to find and summarize only the stories related to your chosen topics. It's like having a really smart assistant who reads 100 articles and tells you "here are the 5 you actually need to know about."

3. **Your Representatives** - The dashboard always shows your 2 Senators and 1 House Representative, with their contact info and what bills they're working on. We're keeping this front and center because these are YOUR elected officials.

4. **Bill Tracker** - Only see bills that match your interests. If you picked "health care," you'll see health care bills. If you want to track something outside your interests, there's a search feature for that.

5. **Listen or Read** - Some people learn by listening (commute, exercise), others by reading. We give you BOTH formats for every brief - an audio version and a more detailed written version with links to dive deeper.

**What I Learned:**
The Perplexity API prompts you shared are perfect! They show exactly how to ask the AI to find congressional news stories and return them in a structured format (JSON) that our app can use. It's like giving the AI a template to fill out - "find me stories about [topic], and for each one tell me: title, summary, policy area, and link." This makes it super easy to display the news in a clean, organized way.

**Technical Approach (In Simple Terms):**
Think of this like building with LEGO blocks:
- **Database** = Filing cabinet that stores user preferences, audio files, bills
- **API Routes** = Doors that let different parts of the app talk to each other
- **Components** = Individual LEGO pieces (audio player, news cards, bill lists)
- **PWA (Progressive Web App)** = Makes the website work like a native phone app - you can download audio for offline listening, get push notifications, and even add it to your home screen

**What's Next:**
Today I'm setting up the foundation:
1. Creating the database structure to store briefs, user preferences, and playback progress
2. Building the Perplexity integration to fetch and summarize news
3. Designing the audio player that works offline
4. Making sure your representatives always show on the dashboard

This enables users to have a truly personalized civic engagement experience. Instead of feeling overwhelmed by politics, they'll feel informed and empowered.

**Quick Win 🎉:**
Created a comprehensive 3,914-line feature specification that maps out exactly how the dashboard will work for different types of users (engaged citizens, journalists, students, teachers). It's like having a blueprint before building a house - everything is planned out.

**Social Media Snippet:**
"Building a dashboard that makes democracy accessible. Your morning political news + congressional bills that matter to YOU, delivered as a 5-min audio brief or detailed written digest. No more fire hose of overwhelming news. Just signal, no noise. 🎙️📰 #CivicTech #OpenGov"

---

## Progress Log

### Setting Up the Foundation

**What already exists:**
✅ **User interests/subject areas** - When users sign up, they pick topics they care about (healthcare, education, climate, etc.). This is already saved in the database.

✅ **The Hill RSS feeds** - We're already pulling news from 7 different The Hill feeds based on what users picked. If you selected "healthcare," you get healthcare news automatically.

✅ **Onboarding** - Users complete a smooth onboarding flow where they enter their zip code, pick interests, and set notification preferences.

**What I'm adding right now:**
I'm building the "filing system" (database tables) that will store:
- **Daily audio briefs** (separate from general podcasts - these are your personalized morning briefings)
- **Playback progress** (so if you pause a 7-minute brief at minute 3, it remembers where you left off)
- **Downloaded briefs** (for offline listening on airplane mode, subway, etc.)
- **News articles cache** (store Perplexity-enhanced summaries so we don't re-fetch constantly)
- **Email/push notification queue** (for sending "Your daily brief is ready!" notifications)

**Why this matters:**
Without a good filing system, nothing else works. It's like trying to run a library without a card catalog - chaos. But since we already have users, interests, and news feeds working, we're building on a solid foundation.

**How the Policy Area Alignment Works:**

You were spot-on about needing alignment! Here's how it all connects:

**Three Systems Speaking the Same Language:**
1. **User Interests** (15 categories) - What YOU pick: "Healthcare", "Climate", "Education"
2. **Congress.gov Policy Areas** (32 official categories) - How bills are officially tagged: "Health", "Environmental Protection"
3. **AI-Generated Categories** - Claude analyzes bills and finds topics: "health insurance", "climate change", "medical research"

**The Translation System:**
We have a mapping that connects all three. Example:
- You pick: `"healthcare"`
- Maps to Congress.gov: `"Health"`
- Also matches AI keywords: "medical", "medicare", "insurance", "pharmaceutical"

This means when you select "Healthcare" in onboarding, we can:
- ✅ Show you bills where `policy_area = "Health"`
- ✅ Show you bills with AI-detected keywords like "medicare expansion"
- ✅ Pull news from The Hill's Healthcare feed
- ✅ Generate audio briefs focused on your healthcare topics

It's like having a smart translator that knows "Healthcare" = "Health" = "Medical" = all related bills and news.

**Next up:**
After the database is ready, I'll build the Perplexity integration. This will take The Hill articles and enhance them with AI - finding related bills, summarizing key points, and organizing by policy area using the SAME alignment system. Think of it as upgrading from basic RSS to smart, AI-curated news that speaks your language.

---

## AI Policy Inference - Switching to Cerebras

**What just happened:**
Tried to run the AI policy inference script to categorize 2,689 bills that don't have policy areas yet. The script uses Claude to read each bill and assign it to one of 18 official categories (Healthcare, Defense, etc.).

**The problem:**
Hit a Claude API credit limit! The error: "Your credit balance is too low to access the Anthropic API."

**The solution:**
Switching to Cerebras API instead! Here's why this is actually BETTER:

**Cerebras vs Claude for Bulk Tasks:**
- **Speed**: Cerebras is 20x faster (inference on specialized AI chips)
- **Cost**: ~90% cheaper than Claude for simple classification tasks
- **Accuracy**: Still very good for straightforward categorization like this
- **Scale**: Can process all 2,689 bills in minutes instead of hours

**What is Cerebras?**
Think of it as a race car built specifically for AI tasks. While Claude is like a brilliant professor (great for complex reasoning), Cerebras is like a super-fast calculator (perfect for bulk categorization). For "read this bill, pick 1 of 18 categories," Cerebras is the right tool.

**Update - Script Running Successfully!**

Just tested Cerebras with 10 bills first:
- ✅ 100% success rate
- ⚡ 6 seconds for 10 bills (600ms per bill)
- 💰 ~$0.0001 per bill (vs ~$0.001 with Claude)

Now running on all 2,689 bills in the background!

**Database Stats:**
- **Total Bills:** 21,605
  - Congress 119: 10,608 bills
  - Congress 118: 10,997 bills
- **With Official Policy Area:** 18,916 (87.5%)
- **Without Official Policy Area:** 2,689 (12.5%) ← Cerebras is fixing these!

**Progress (currently at bill 375/2,689 - 14% complete):**
The script is processing bills at ~600ms each and maintaining 100% success rate. Sample categories being assigned:
- Health: Hospital services, Social Security, FDA regulations
- Public Lands and Natural Resources: Fisheries, wilderness areas, land management
- International Affairs: Foreign policy, sanctions, diplomacy
- Agriculture and Food: Farm programs, food safety
- Armed Forces and National Security: Military pay, defense operations
- Transportation and Public Works: Highway projects, aviation safety

**Estimated completion:** ~20-25 more minutes

**What this enables:**
Once done, ALL 21,605 bills will have policy areas (either official from Congress.gov OR AI-inferred from Cerebras). This means:
- ✅ Users see ALL relevant bills based on their interests, not just 87.5%
- ✅ Newly introduced bills get categorized immediately
- ✅ Better audio briefings with complete coverage
- ✅ More accurate personalized recommendations

---

## Embeddable Player Feature - Making Content Shareable

**New Requirement Added:**
Make audio briefs and podcasts embeddable on other websites (like YouTube videos)!

**What this means:**
You know how you can embed a YouTube video on your blog? Same thing, but for HakiVo audio briefs. Journalists can embed a legislative brief in their article, teachers can put it in their online classroom, advocacy groups on their websites - all with HakiVo branding.

**How it works:**
1. User listens to a brief they like
2. Clicks "Share" button
3. Gets an embed code to copy/paste
4. That code creates a mini audio player on any website
5. Player shows "Powered by HakiVo" branding with link back to our site

**Why this is strategic:**
- **Free marketing**: Every embed is a billboard for HakiVo
- **Traffic growth**: Each player links back to hakivo.com
- **Network effects**: Good content spreads organically
- **Use cases**: News articles, classrooms, advocacy sites, social media

**Technical approach:**
We'll create a special `/embed` route that shows a minimal, branded audio player in an iframe. The player will be lightweight (fast loading), accessible, and mobile-responsive. Think: Spotify's embed player or SoundCloud's widget.

---

## Daily Brief Generation System - Making It Personal

**What I Built:** The complete pipeline for generating personalized daily audio briefs! This is the heart of the dashboard - it takes your interests and automatically creates a custom 8-12 minute audio brief every morning.

**The Problem I Solved:**
Users with 5+ policy interests would be overwhelmed if we sent separate briefs for each topic. That's 5+ audio files to listen to every day - nobody has time for that! We needed a smart way to give users complete coverage without overwhelming them.

**The Solution - The "Smart News Anchor" Approach:**

Think of it like having two professional news anchors (Sarah and James) who know exactly what YOU care about. Every morning, they create ONE unified brief with 3 sections:

1. **Breaking News (2-3 min)** - The absolute most important story across ALL your interests. Just the top story, explained in detail so you understand why it matters.

2. **Featured Legislation (5-7 min)** - Deep dive into the 2-3 most significant bills from your topics. These aren't random - we pick them using a smart priority system:
   - Bills that just became law = highest priority
   - Bills that just passed a chamber = very important
   - Bills with high impact scores = affects many people
   - Recent activity = happening now, not 3 months ago

3. **Quick Hits (1-2 min)** - Rapid-fire mentions of other notable bills. You get the headline and one-sentence description. If something catches your attention, you can look it up later in the detailed written version.

**Why This Works:**
- **One morning habit:** Listen to ONE brief during your commute or morning coffee
- **Complete coverage:** All your interests covered, but prioritized so you hear the most important stuff first
- **Two formats:** Audio for listening, detailed written digest for deep diving with links to full bills
- **Smart, not dumb:** We don't just dump information on you - we intelligently prioritize based on what's actually important

**The Technical Magic Behind It:**

1. **Smart Prioritization Algorithm:** We rank bills using a formula:
   - Status points: Enacted = 1000, Passed chamber = 500, In committee = 100
   - PLUS impact score (0-100 based on people affected, money involved, controversy)
   - MINUS days since last action (recent activity gets boosted)

   This means you always hear about bills that are (a) moving forward, (b) affecting many people, and (c) happening RIGHT NOW.

2. **Perplexity AI for News:** Instead of just showing you RSS feeds, we use Perplexity AI to search the internet for congressional news related to YOUR topics. It returns 5-8 sentence summaries with context about why it matters and what the implications are. Much better than a 2-sentence RSS snippet!

3. **Feature Images for Written Digest:**
   - News articles: Extract the featured image from the article itself (Open Graph images)
   - Bills: Use the sponsor's official Congress.gov photo
   - Fallback: Policy area icons (healthcare = medical cross, etc.)

4. **Multi-Voice Dialogue Generation:**
   - Claude (AI) writes the script as a natural conversation between Sarah and James
   - ElevenLabs generates the audio using their "text-to-dialogue" feature - both voices in one API call!
   - Upload to Vultr CDN for fast streaming worldwide

**What I Learned:**
The key insight was: **Don't make users choose between topics**. Instead, use smart prioritization to give them ONE brief that covers ALL their interests, but focuses on what's actually important. It's like having a personal news anchor who knows you.

Also discovered that users need BOTH formats:
- **Audio** for passive consumption (commute, exercise, cooking)
- **Written** for active engagement (reading details, clicking links, bookmarking)

The written version has ALL the bills and news (even the ones not in the audio), with links to dive deeper. So nothing is hidden - it's just intelligently organized.

**What's Next:**
This brief generation system enables:
- Automatic morning briefs at 6 AM (scheduled jobs)
- Email notifications: "Your daily brief is ready!"
- Push notifications on mobile
- Offline playback (download the audio, listen later)
- Embeddable player (share your brief on social media)

Users wake up, get a notification, and have their personalized congressional brief ready to go. It's like having a personal policy assistant.

**Quick Win 🎉:**
Built the complete daily brief generation API with:
- Perplexity news integration (5-8 sentence summaries)
- Smart bill prioritization (status + impact + recency)
- 3-part script structure (Breaking + Featured + Quick Hits)
- Multi-voice audio generation (Sarah + James)
- Detailed written digest with feature images
- One unified brief instead of 5+ separate ones = not overwhelming!

**Social Media Snippet:**
"Just built the personalized daily brief generator! 🎙️ One 8-12 minute audio brief covers ALL your policy interests - no more information overwhelm. Uses smart prioritization (bill status + impact + recency) to feature what actually matters. Plus a detailed written version with links. Audio for passive listening, written for deep diving. Best of both worlds! #CivicTech #AI"
