# v0.dev Prompts for Civic Pulse

**Tech Stack:** Next.js 16 App Router, shadcn/ui, Tailwind CSS, TypeScript
**Design Style:** Professional NPR-quality, civic tech, clean and accessible

---

## 1. Landing Page / Hero Section

```
Create a Next.js 16 landing page for "Civic Pulse" - a comprehensive civic engagement hub that helps citizens understand what Congress is actually doing.

Tech stack:
- Next.js 16 App Router
- shadcn/ui components
- Tailwind CSS
- TypeScript

Design requirements:
- Professional NPR-quality aesthetic
- Clean, trustworthy civic tech design
- Mobile-first responsive

Hero section should include:
- Bold headline: "Know What Congress Is Doing"
- Subheadline: "Track bills, understand legislation, follow your representatives' votes, and stay informed—all in plain English"
- Two CTA buttons: "Start Free" (primary) and "Explore Features" (secondary)
- Hero image/illustration showing legislative dashboard with bills, voting records, and analytics
- Social proof: "Join 10,000+ informed citizens"

Features section (4 columns):
1. "Track Bills" - Follow legislation that matters to you | icon with document/bill
2. "Plain English Summaries" - AI transforms complex bills into clear explanations | icon with lightbulb
3. "Know Your Reps" - See how your representatives vote and what they sponsor | icon with people/users
4. "Audio Briefings" - Listen to summaries on your commute (optional) | icon with headphones

How It Works section (3 steps):
1. "Enter Your Location" - We find your representatives automatically
2. "Pick Your Issues" - Healthcare, climate, economy, education, etc.
3. "Stay Informed" - Get bill updates, voting records, and plain-English analysis

Include a live example card showing:
- Bill card preview (H.R. 1234 - Healthcare Reform Act)
- Status badge "Passed House"
- AI summary excerpt (2 lines)
- Your rep's vote highlighted
- "Track This Bill" button
- Optional: Small audio player icon showing "Listen to 4-min summary"

Color scheme: Professional blues and grays with accent colors for political balance (not partisan)
Typography: Clean, readable sans-serif
Spacing: Generous whitespace, accessibility-focused

Use shadcn/ui components: Button, Card, Badge, Separator
```

---

## 2. Onboarding Flow (Multi-Step Form)

```
Create a 3-step onboarding flow for Civic Pulse using Next.js 16 and shadcn/ui.

Tech stack:
- Next.js 16 App Router
- shadcn/ui components (Card, Input, Button, Checkbox, Progress)
- Tailwind CSS
- TypeScript

Design: Clean, progressive disclosure, mobile-friendly

Step 1: Location
- Title: "Where are you located?"
- Description: "We'll find your representatives and relevant legislation automatically"
- Zip code input field (5 digits, validation)
- Auto-detect button (optional)
- Next button (disabled until valid zip entered)

Step 2: Interests
- Title: "What issues matter to you?"
- Description: "We'll prioritize bills, votes, and updates on these topics"
- Multi-select checkbox grid (3 columns on desktop, 1 on mobile):
  * Healthcare
  * Housing
  * Climate
  * Education
  * Economy
  * Immigration
  * Defense
  * Technology
  * Justice
  * Agriculture
  * Veterans
  * Trade
- Selected count indicator: "3 of 12 selected"
- Back and Next buttons

Step 3: Information Preferences
- Title: "How do you want to stay informed?"
- Description: "Customize how you receive congressional updates"
- Notification preferences (checkboxes):
  * Email notifications for tracked bills
  * Weekly digest of congressional activity
  * Alerts when your representatives vote
  * Optional: Audio briefings (toggle section)
    - If enabled, show radio buttons:
      * Daily Brief (5-7 min) - "Morning audio summary"
      * Weekly Deep Dive (15-18 min) - "Friday comprehensive audio"
      * Both - "Stay fully informed" (recommended badge)
    - Time picker: "Deliver daily brief at: [7:00 AM]"
- Back and "Get Started" button

Progress indicator at top showing 1/3, 2/3, 3/3
Use shadcn/ui: Card, Input, Label, Checkbox, RadioGroup, Button, Progress, Badge, Switch

Ensure full mobile responsiveness with touch-friendly targets (min 44x44px)
```

---

## 3. Dashboard / Main App View

```
Create the main dashboard for Civic Pulse - a comprehensive civic engagement hub.

Tech stack:
- Next.js 16 App Router
- shadcn/ui components
- Tailwind CSS
- TypeScript

Layout:
- Sidebar navigation (collapsible on mobile):
  * Dashboard (home icon)
  * Bills (document icon) - primary
  * Representatives (users icon) - primary
  * Audio Briefings (headphones icon) - optional
  * Settings (cog icon)
- Main content area

Dashboard content (top to bottom):

1. Congressional Activity Overview (stats bar):
   - "23 bills updated this week"
   - "Your reps voted 12 times"
   - "5 bills you're tracking advanced"
   - "New audio brief available" (if enabled)

2. Bills Requiring Attention (featured section, tabs):
   Tabs: "High Impact" | "Tracked Bills" | "Your Issues" | "Recent Updates"

   Bill cards show:
   - Bill number (H.R. 1234)
   - Title (truncated to 2 lines)
   - Status badge (In Committee / House Vote / Passed)
   - Issue tags: Healthcare, Economy
   - Impact indicator (High/Medium/Low with color)
   - AI Summary excerpt (1-2 lines)
   - Your representatives' positions (Yea/Nay/Pending icons)
   - Actions: "Track" button, "Read Summary", "Listen (4 min)" icon
   - Last action date

3. Your Representatives Section (3 cards in row):
   Each card shows:
   - Photo placeholder
   - Name and party (Rep. Jane Smith (D))
   - Role (Representative, CA-12)
   - Recent activity: "Voted on 3 bills this week"
   - Alignment score: "78% match on your issues"
   - Quick actions: Contact, View Votes, Full Profile

4. Recent Representative Activity (condensed list):
   - Rep name voted Yea on H.R. 1234 (Healthcare Reform)
   - Senator name sponsored S. 567 (Climate Action)
   - Rep name gave floor speech on Education Funding
   - "View all activity →" link

5. Optional: Latest Audio Brief (if user enabled, collapsible card):
   - "Your Daily Brief" or "Weekly Deep Dive"
   - Date and duration
   - Compact audio player
   - Play button, progress bar
   - "Listen later" / "Mark played" actions

6. Engagement Stats (small cards):
   - Streak: "7 day engagement streak"
   - Bills tracked: "12 active"
   - Actions: "5 representatives contacted"
   - Knowledge: "34 bills reviewed"

Color scheme:
- Neutral grays for backgrounds
- Blue for primary actions
- Red/Yellow/Green for impact levels (not partisan)
- Subtle borders, cards with shadows

Mobile: Stack vertically, sidebar becomes bottom nav or hamburger menu
Use shadcn/ui: Tabs, Card, Badge, Button, Avatar, Progress, Separator

Ensure accessibility: proper labels, keyboard navigation, screen reader support
```

---

## 4. Bill Detail Page

```
Create a detailed bill view page for Civic Pulse.

Tech stack:
- Next.js 16 App Router
- shadcn/ui components
- Tailwind CSS
- TypeScript

Header section:
- Bill number (H.R. 1234) with chamber badge
- Full title (2-3 lines max)
- Sponsor info with photo: "Sponsored by Rep. Jane Smith (D-CA)"
- Status badge: "In Committee" / "House Vote Scheduled" / "Passed"
- Action buttons: "Track this bill" (primary), "Share" (secondary)

Stats bar (4 metrics in row):
- Cosponsors: "45 cosponsors"
- Bipartisan: Yes/No badge
- Introduced: "Oct 15, 2025"
- Impact Score: 85/100 with progress bar

Main content (tabs):
1. Overview tab:
   - AI Plain English Summary (2-3 paragraphs)
   - Key Provisions (bullet list with icons)
   - Affected Groups (cards showing impact):
     * Group name
     * Impact indicator (Positive/Negative/Mixed)
     * Description
   - Local Impact section (Urban/Suburban/Rural breakdowns)

2. Timeline tab:
   - Vertical timeline showing:
     * Introduced (date)
     * Committee hearing (date)
     * Committee vote (date)
     * House floor debate (date)
     * Final vote (future/pending)
   - Use connecting lines, icons for each step

3. Votes tab:
   - Party breakdown chart (visual)
   - Vote tallies: Yea/Nay/Present
   - Your representatives' votes (highlighted cards)
   - Full roll call (expandable)

4. Speeches tab:
   - Congressional Record excerpts
   - Speaker cards with:
     * Photo and name
     * Date and chamber
     * Stance badge (Support/Oppose/Neutral)
     * Quote excerpt (2-3 lines)
     * "Read full speech" link

5. Full Text tab:
   - Formatted bill text
   - Section navigation
   - Search within document

Sidebar (desktop):
- Related bills (3 cards)
- Committee info
- Issue categories tags
- Complexity score: 7/10
- Estimated cost (if available)

Mobile: Tabs become accordion or scrollable tabs
Use shadcn/ui: Tabs, Card, Badge, Button, Avatar, Progress, Separator, Accordion

Design: Clean, scannable, focused on clarity and accessibility
```

---

## 5. Audio Player Component (Standalone)

```
Create a professional podcast audio player component for Civic Pulse.

Tech stack:
- Next.js 16 (React component)
- shadcn/ui components
- Tailwind CSS
- TypeScript

Design: NPR-style, professional audio player

Two variants needed:

1. Compact Player (for lists):
   - Episode title (1 line, truncated)
   - Play/pause button
   - Progress bar (thin)
   - Duration "6 min"
   - Size: fits in card, ~80px height

2. Full Player (for detail view):
   - Episode title (full, 2 lines max)
   - Date and type badge ("Daily Brief" / "Weekly Deep Dive")
   - Large play/pause button (center or left)
   - Waveform visualization (visual progress indicator)
   - Time elapsed / Total time (3:24 / 6:00)
   - Progress bar (draggable)
   - Playback speed control (1x, 1.25x, 1.5x, 2x)
   - Volume control
   - Additional controls:
     * Skip back 15s
     * Skip forward 15s
     * Download button
     * Share button
     * Transcript toggle

Visual elements:
- Waveform: Use gradient bars (blue/purple) that fill as audio plays
- Progress bar: Rounded, smooth, animated on drag
- Buttons: Clear icons (lucide-react)
- Hover states: Subtle animations
- Loading state: Skeleton animation

Mobile considerations:
- Touch-friendly controls (min 44x44px)
- Simplified controls on small screens
- Fixed position player at bottom option

States to show:
- Loading
- Playing
- Paused
- Buffering
- Error

Accessibility:
- ARIA labels for all controls
- Keyboard navigation
- Screen reader announcements for play/pause, time updates

Use shadcn/ui: Button, Slider, Select, Tooltip
Color: Professional blues and grays, subtle gradients for waveform
```

---

## 6. Representative Profile Card

```
Create a representative profile card component for Civic Pulse.

Tech stack:
- Next.js 16 (React component)
- shadcn/ui components
- Tailwind CSS
- TypeScript

Design: Professional, trustworthy, non-partisan

Card variants:

1. Compact Card (for dashboard grid):
   - Photo (circular, 80x80px)
   - Name (Rep. Jane Smith)
   - Party badge (D / R / I) - use neutral colors
   - District (CA-12 or "California Senator")
   - Contact button
   - Recent activity indicator: "3 votes this week"
   - Size: ~200px wide, responsive

2. Detailed Card (for representative page):
   - Photo (larger, 120x120px)
   - Name and title
   - Party and state
   - Term dates
   - Office location
   - Contact methods (grid):
     * Phone icon + number
     * Email icon + address
     * Website icon + link
     * Twitter icon + handle
   - Committees list (chips/badges)
   - "Alignment Score" with your interests: 75% match (optional)
   - Recent activity section:
     * Bills sponsored (3)
     * Votes cast (15)
     * Floor speeches (2)

3. Voting Record Mini Card:
   - Photo (small, 48x48px)
   - Name
   - Vote badge: "Yea" / "Nay" / "Present" / "Did Not Vote"
   - Vote date

Common elements:
- Party indicators use subtle colors (not bright red/blue)
- Professional typography
- Clear hierarchy
- Icons from lucide-react
- Hover states with subtle elevation

Actions:
- Contact (primary button)
- View full profile (secondary)
- Track voting record (tertiary)

Use shadcn/ui: Card, Avatar, Badge, Button, Separator
Ensure accessibility and mobile responsiveness
```

---

## 7. Pricing Page

```
Create a pricing page for Civic Pulse's freemium model.

Tech stack:
- Next.js 16 App Router
- shadcn/ui components
- Tailwind CSS
- TypeScript

Layout:
- Page header:
  * Title: "Choose Your Plan"
  * Subtitle: "Start free, upgrade for unlimited tracking and AI-powered insights"

Two-column pricing cards (centered, max-width):

1. Free Tier Card:
   - Title: "Free"
   - Price: "$0/month"
   - Description: "Perfect for getting started"
   - Features list (with checkmark icons):
     ✓ Dashboard access
     ✓ Track up to 5 bills
     ✓ View your representatives
     ✓ AI bill summaries (basic)
     ✓ Voting record access
     ✓ Email notifications
     ✓ 1 weekly audio brief (optional)
   - CTA: "Current Plan" (if logged in) or "Get Started" (outline button)

2. Premium Tier Card (highlighted/featured):
   - "Most Popular" badge at top
   - Title: "Premium"
   - Price: "$9.99/month"
   - Description: "For engaged citizens"
   - Features list (with checkmark icons):
     ✓ Unlimited bill tracking
     ✓ Advanced AI analysis & insights
     ✓ Real-time vote alerts
     ✓ Representative voting patterns
     ✓ Bill impact predictions
     ✓ Priority notifications
     ✓ Export reports & transcripts
     ✓ Daily + weekly audio briefs (optional)
     ✓ Ad-free experience
     ✓ Early access to features
   - CTA: "Upgrade to Premium" (primary button, prominent)
   - Styling: Subtle border highlight, shadow, different background

Below cards - FAQ accordion:
- "Can I cancel anytime?" - Yes, no commitment
- "What payment methods?" - Credit/debit cards via Stripe
- "Is my data secure?" - Yes, encryption details
- "Can I switch plans?" - Yes, prorate explanation
- "Are audio briefings required?" - No, completely optional feature

Trust indicators:
- "Secure payment via Stripe" with logo
- "30-day money-back guarantee"
- "Cancel anytime, no questions asked"

Mobile: Stack cards vertically
Use shadcn/ui: Card, Badge, Button, Accordion
Color: Professional, trustworthy, highlight Premium with subtle accent
```

---

## 8. Settings Page

```
Create a comprehensive settings page for Civic Pulse.

Tech stack:
- Next.js 16 App Router
- shadcn/ui components
- Tailwind CSS
- TypeScript

Layout: Sidebar navigation (tabs on mobile)

Sidebar sections:
- Profile
- Preferences
- Notifications
- Subscription
- Privacy
- Account

Main content area (changes based on selection):

1. Profile Section:
   - Avatar upload (circular, 120x120px)
   - Full name input
   - Email (read-only, verified badge)
   - Location:
     * Zip code (changeable)
     * Auto-detected district
     * State/City (read-only)
   - Save changes button

2. Preferences Section:
   - Interests & Priorities:
     * Multi-select chips (same as onboarding)
     * "Edit interests" that shows checkboxes
     * Bill priority threshold: High Impact / Medium+ / All
   - Notification Preferences:
     * Email frequency: Immediate / Daily digest / Weekly
     * Alert types: Bill updates, Rep votes, Speeches
   - Optional Audio Briefings (toggle to enable):
     * Frequency: Radio buttons (Daily / Weekly / Both)
     * Daily delivery time: Time picker
     * Weekly delivery day: Dropdown (Monday-Sunday)
     * Briefing length: Standard (5-7 min) / Extended (12-15 min)
   - Save preferences button

3. Notifications Section:
   - Email Notifications (toggle switches):
     * Bill updates (tracked bills)
     * Representative votes
     * Representative activity (speeches, sponsorships)
     * Weekly congressional summary
     * New audio briefings ready (if enabled)
     * Product updates
   - Push Notifications (toggle switches):
     * Breaking legislative news
     * Your representatives vote on tracked bills
     * Bills you track advance stages
     * High-impact bills in your issues
   - Notification frequency: Immediate / Daily digest / Weekly

4. Subscription Section (if premium):
   - Current plan card:
     * Plan name (Premium)
     * Price $9.99/month
     * Next billing date
     * Payment method (last 4 digits)
   - Actions:
     * Update payment method
     * View billing history
     * Download invoices
     * Cancel subscription (destructive, secondary)

   Or (if free):
   - Upgrade card with benefits list
   - "Upgrade to Premium" CTA

5. Privacy Section:
   - Data usage preferences:
     * Usage analytics (toggle)
     * Personalization (toggle)
   - Download your data (button)
   - Data retention policy (info text)

6. Account Section:
   - Connected accounts:
     * Google (if connected, with disconnect button)
     * Twitter (if connected, with disconnect button)
   - Change password (if email auth)
   - Delete account (destructive, with confirmation modal)

Use shadcn/ui: Tabs, Card, Input, Switch, Button, Select, Label, Separator, Dialog
Mobile: Tabs become full-width, stack vertically
Design: Clean, organized, clear sections with good spacing
```

---

## Usage Instructions

1. **Copy the prompt** for the component you want to create
2. **Paste into v0.dev** (https://v0.dev)
3. **Generate** the component
4. **Iterate** by asking v0 for adjustments
5. **Export** the code and integrate into your Next.js project

## Tips for Best Results

- Start with the **Landing Page** to establish visual style
- Then do **Onboarding** and **Dashboard** as core flows
- Build **reusable components** (Audio Player, Rep Card) early
- Use v0's iteration feature to refine designs
- Ask v0 to make components more accessible if needed
- Request "mobile-first responsive" in follow-ups
- Always specify "use shadcn/ui components" for consistency

## After Generation

Each generated component should:
- ✅ Use Next.js 16 App Router patterns
- ✅ Include TypeScript types
- ✅ Use shadcn/ui components
- ✅ Be mobile-responsive
- ✅ Include proper accessibility (ARIA labels, keyboard nav)
- ✅ Match the Civic Pulse brand (professional, civic tech aesthetic)

You can then copy the code directly into your project!
