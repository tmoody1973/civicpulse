# 🎨 HakiVo Dashboard - Complete UX/UI Design Specification

**Version:** 1.0
**Date:** 2025-11-04
**Design System:** shadcn/ui + Tailwind CSS
**Target Devices:** Desktop (1920px), Tablet (768px), Mobile (375px-393px)

---

## 📐 Design Principles

1. **Mobile-First:** Design starts at 375px (iPhone SE) and scales up
2. **Progressive Disclosure:** Show essential info first, details on interaction
3. **Consistent Patterns:** All widgets follow same visual hierarchy
4. **Accessibility:** WCAG 2.1 AA compliant, keyboard navigation, screen reader support
5. **Performance:** Lazy load below-fold content, virtualize long lists
6. **Personalization:** Every element adapts to user preferences

---

## 🖥️ Desktop Layout (1920px × 1080px)

### Full Page Structure

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [Logo] HakiVo Dashboard                    [Search] [Notifications] [User]│ ← 64px header
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  🎯 For You: Here's what's happening in Climate Policy              │ │ ← Hero: 240px
│  │                                                                        │ │
│  │  [Bill Card 1]  [Bill Card 2]  [Bill Card 3]  [Bill Card 4]         │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌────────────────────────────┐  ┌────────────────────────────┐         │
│  │ 📜 Latest Legislation      │  │ 🐦 Representative Activity │         │
│  │ [All categories        ▾]  │  │ [Filter: All Reps      ▾]  │         │
│  │────────────────────────────│  │────────────────────────────│         │
│  │ 3 min  HR-3458: Renewable  │  │ 2 min  Sen. Warren        │         │
│  │        Energy Investment   │  │        "Just voted YES..." │         │
│  │        Your rep: John Doe  │  │        💬 45 🔄 128 ❤️ 892 │         │
│  │                            │  │                            │         │ ← Widget row 1
│  │ 30 min S-1234: Healthcare  │  │ 15 min Rep. John Doe      │         │   400px
│  │        Access Expansion    │  │        "Proud to co-spon...│         │
│  │        Match: Healthcare   │  │        💬 12 🔄 34 ❤️ 256  │         │
│  │                            │  │                            │         │
│  │ See all bills >            │  │ See all tweets >           │         │
│  └────────────────────────────┘  └────────────────────────────┘         │
│                                                                            │
│  ┌────────────────────────────┐  ┌────────────────────────────┐         │
│  │ 📰 Political News          │  │ 🎙️ Your Podcast Queue      │         │
│  │ [Filter: All Sources   ▾]  │  │ [Preferences          ▾]   │         │
│  │────────────────────────────│  │────────────────────────────│         │
│  │ 5 min  The Hill            │  │ ✨ Ready for you:          │         │
│  │        Senate Passes Major │  │                            │         │
│  │        Climate Bill 52-48  │  │ Daily Brief (5 min)       │         │ ← Widget row 2
│  │        🔗 Read full story   │  │ Climate + Healthcare      │         │   400px
│  │                            │  │ [▶ Play] [Download]       │         │
│  │ 20 min Politico            │  │                            │         │
│  │        House Democrats     │  │ Weekly Deep Dive (18 min) │         │
│  │        Unveil Healthcare   │  │ Your Local Reps           │         │
│  │        🔗 Read full story   │  │ [▶ Play] [Download]       │         │
│  │                            │  │                            │         │
│  │ See all news >             │  │ Generate new >             │         │
│  └────────────────────────────┘  └────────────────────────────┘         │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  💬 Ask About Legislation (Perplexity AI)                            │ │
│  │                                                                        │ │
│  │  Suggested questions based on your interests:                         │ │
│  │  💡 What's the latest on climate legislation?                         │ │ ← Chat widget
│  │  💡 Did my rep vote on HR-3458?                                       │ │   300px
│  │  💡 Explain the Student Loan Forgiveness Act                          │ │
│  │  💡 What bills are being debated this week?                           │ │
│  │                                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────────┐   │ │
│  │  │ Ask me anything...                                  [Send →] │   │ │
│  │  └──────────────────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  📊 Your Civic Impact                                                 │ │
│  │                                                                        │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │ │ ← Analytics
│  │  │ 47 Bills │  │ 12 Hours │  │ 8 Topics │  │ 23 Shares│           │ │   200px
│  │  │ Explored │  │ Listening│  │  Learned │  │  Made    │           │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
│                              [Fixed Audio Player]                          │ ← 80px footer
└────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Grid System

**Container:** `max-w-[1920px] mx-auto px-8`

**Widget Grid:**
- 2-column layout: `grid grid-cols-2 gap-6`
- Column ratio: 1:1 (equal width)
- Gap between widgets: 24px
- Gap between rows: 24px

**Spacing:**
- Page padding: 32px horizontal
- Section spacing: 48px vertical
- Widget padding: 24px
- Card padding: 16px

### Desktop Component Specs

**1. Hero Section "For You"**
```
Height: 240px
Background: gradient-to-r from-blue-600 to-indigo-600
Text Color: white
Padding: 32px
Border Radius: 16px

Header:
  - Font: Inter Bold, 32px
  - Text: "For You: Here's what's happening in [Top Interest]"
  - Margin Bottom: 24px

Bill Cards (Horizontal Scroll):
  - Width: 280px each
  - Height: 140px
  - Background: white/10 backdrop-blur
  - Border: 1px solid white/20
  - Padding: 16px
  - Gap: 16px
  - Overflow: scroll-x-auto with custom scrollbar
```

**2. Widget Container (Standard)**
```
Height: 400px
Background: white (light mode) / gray-900 (dark mode)
Border: 1px solid gray-200 / gray-700
Border Radius: 12px
Padding: 0 (header and content have their own padding)
Box Shadow: 0 2px 8px rgba(0,0,0,0.04)

Widget Header:
  - Height: 64px
  - Padding: 20px 24px
  - Border Bottom: 1px solid gray-200 / gray-700
  - Display: flex justify-between items-center

Widget Content:
  - Height: calc(400px - 64px - 48px) = 288px
  - Padding: 16px 24px
  - Overflow: scroll-y-auto

Widget Footer:
  - Height: 48px
  - Padding: 12px 24px
  - Border Top: 1px solid gray-200 / gray-700
  - Text Align: right
```

**3. Legislation Feed Widget**
```
Title: "Latest Legislation"
  - Font: Inter SemiBold, 18px
  - Color: gray-900 / white

Dropdown Filter:
  - Width: 200px
  - Height: 40px
  - Border: 1px solid gray-300
  - Border Radius: 8px
  - Padding: 8px 12px
  - Icon: ChevronDown (16px)

Bill Item:
  - Height: 56px
  - Display: flex items-center
  - Border Bottom: 1px solid gray-100 / gray-800
  - Padding: 12px 0

  Timestamp:
    - Font: Inter Medium, 14px
    - Color: gray-500
    - Width: 80px
    - Flex Shrink: 0

  Bill Title:
    - Font: Inter SemiBold, 16px
    - Color: gray-900 / white
    - Line Clamp: 1
    - Flex: 1

  Subtitle (Relevance Reason):
    - Font: Inter Regular, 13px
    - Color: gray-600 / gray-400
    - Line Clamp: 1
    - Margin Top: 2px
```

**4. Twitter Feed Widget**
```
Title: "Representative Activity"
Dropdown: Same as Legislation widget

Tweet Item:
  - Height: auto (min 72px)
  - Padding: 12px 0
  - Border Bottom: 1px solid gray-100 / gray-800

  Tweet Header:
    - Display: flex items-center gap-2
    - Margin Bottom: 8px

    Avatar:
      - Size: 32px circle
      - Background: gradient based on party

    Name:
      - Font: Inter SemiBold, 14px
      - Color: gray-900 / white

    Handle:
      - Font: Inter Regular, 13px
      - Color: gray-500

    Timestamp:
      - Font: Inter Regular, 12px
      - Color: gray-400
      - Margin Left: auto

  Tweet Text:
    - Font: Inter Regular, 14px
    - Color: gray-700 / gray-300
    - Line Clamp: 2
    - Margin Bottom: 8px

  Engagement Metrics:
    - Display: flex gap-4
    - Font: Inter Medium, 12px
    - Color: gray-500

    Icons: 💬 🔄 ❤️ (14px)
```

**5. News Feed Widget**
```
Title: "Political News"
Dropdown: Same as others

News Item:
  - Height: 72px
  - Padding: 12px 0
  - Border Bottom: 1px solid gray-100 / gray-800

  News Header:
    - Display: flex items-center gap-2
    - Margin Bottom: 6px

    Source Badge:
      - Font: Inter SemiBold, 11px uppercase
      - Padding: 2px 8px
      - Border Radius: 4px
      - Background: Unique color per source
        - The Hill: blue-100 / blue-900
        - Politico: red-100 / red-900
        - Perplexity: purple-100 / purple-900

    Timestamp:
      - Font: Inter Regular, 12px
      - Color: gray-400
      - Margin Left: auto

  News Title:
    - Font: Inter SemiBold, 15px
    - Color: gray-900 / white
    - Line Clamp: 2
    - Margin Bottom: 6px

  Read Link:
    - Font: Inter Medium, 13px
    - Color: blue-600 / blue-400
    - Display: flex items-center gap-1
    - Icon: ExternalLink (14px)
```

**6. Perplexity Chat Widget**
```
Height: 300px
Background: white / gray-900
Border: Same as other widgets
Border Radius: 12px

Header:
  - Height: 56px
  - Padding: 16px 24px
  - Border Bottom: 1px solid gray-200 / gray-700

  Title:
    - Font: Inter SemiBold, 18px
    - Display: flex items-center gap-2
    - Icon: 💬 (20px)

Suggested Questions:
  - Padding: 16px 24px
  - Display: grid grid-cols-2 gap-2

  Question Button:
    - Height: 48px
    - Padding: 12px 16px
    - Background: blue-50 / blue-900/20
    - Border: 1px solid blue-200 / blue-700
    - Border Radius: 8px
    - Font: Inter Medium, 13px
    - Color: blue-700 / blue-300
    - Hover: blue-100 / blue-800/40
    - Icon: 💡 (16px) left aligned

Chat Input:
  - Height: 56px
  - Padding: 16px 24px
  - Border Top: 1px solid gray-200 / gray-700

  Input Field:
    - Height: 40px
    - Padding: 8px 16px
    - Border: 1px solid gray-300 / gray-600
    - Border Radius: 20px (pill shape)
    - Font: Inter Regular, 14px
    - Placeholder: "Ask me anything..."

  Send Button:
    - Width: 40px
    - Height: 40px
    - Background: blue-600
    - Border Radius: 20px (circle)
    - Icon: Send (16px white)
    - Position: absolute right-2
```

**7. Civic Impact Dashboard**
```
Height: 200px
Background: gradient-to-br from-purple-600 to-pink-600
Border Radius: 12px
Padding: 32px
Text Color: white

Title:
  - Font: Inter Bold, 24px
  - Margin Bottom: 24px

Stat Cards:
  - Display: grid grid-cols-4 gap-4
  - Each card:
    - Background: white/10 backdrop-blur
    - Border: 1px solid white/20
    - Border Radius: 12px
    - Padding: 20px
    - Text Align: center

    Value:
      - Font: Inter Bold, 36px
      - Color: white
      - Margin Bottom: 8px

    Label:
      - Font: Inter Medium, 13px
      - Color: white/80
```

---

## 📱 Mobile Layout (375px × 812px - iPhone SE / iPhone 15 Pro)

### Full Page Structure

```
┌─────────────────────────────┐
│ [☰] HakiVo    [🔔] [User]  │ ← 56px header
├─────────────────────────────┤
│                             │
│ 🎯 For You                  │
│ Climate Policy Updates      │
│                             │
│ ┌───────────────────────┐  │
│ │ HR-3458: Renewable... │  │ ← Hero: 180px
│ │ Your rep: John Doe    │  │   Single card
│ │ [Listen] [Track]      │  │   Swipeable
│ └───────────────────────┘  │
│ ● ○ ○ ○                    │ ← Dots indicator
│                             │
├─────────────────────────────┤
│ 📜 Latest Legislation       │
│ [All categories        ▾]   │
│                             │
│ 3 min  HR-3458: Renewable   │
│        Energy Investment... │
│        Your rep: John Doe   │ ← Widget: 280px
│                             │   Collapsed
│ 30 min S-1234: Healthcare   │
│        Access Expansion...  │
│        Match: Healthcare    │
│                             │
│ [Show 3 more bills]         │
├─────────────────────────────┤
│ 🐦 Representative Activity  │
│ [Filter: All Reps      ▾]   │
│                             │
│ 2 min  Sen. Warren          │
│        "Just voted YES..."  │ ← Widget: 240px
│        💬 45 🔄 128 ❤️ 892   │   Collapsed
│                             │
│ [Show 4 more tweets]        │
├─────────────────────────────┤
│ 📰 Political News           │
│ [Filter: All          ▾]    │
│                             │
│ 5 min  The Hill             │
│        Senate Passes Major  │ ← Widget: 240px
│        Climate Bill...      │   Collapsed
│        🔗 Read full story    │
│                             │
│ [Show 4 more articles]      │
├─────────────────────────────┤
│ 🎙️ Your Podcast Queue       │
│                             │
│ Daily Brief (5 min)         │
│ Climate + Healthcare        │ ← Widget: 200px
│ [▶ Play Now]                │   Collapsed
│                             │
│ [View full queue]           │
├─────────────────────────────┤
│ 💬 Ask About Legislation    │
│                             │
│ 💡 What's the latest on...  │
│ 💡 Did my rep vote on...    │ ← Chat: 280px
│ 💡 Explain the Student...   │   Expandable
│                             │
│ ┌─────────────────────────┐│
│ │ Ask me anything...  [→] ││
│ └─────────────────────────┘│
├─────────────────────────────┤
│ 📊 Your Civic Impact        │
│                             │
│ ┌─────┐ ┌─────┐            │
│ │ 47  │ │ 12  │            │ ← Analytics: 160px
│ │Bills│ │Hours│            │   2x2 grid
│ └─────┘ └─────┘            │
│ ┌─────┐ ┌─────┐            │
│ │  8  │ │ 23  │            │
│ │Topic│ │Share│            │
│ └─────┘ └─────┘            │
└─────────────────────────────┘
│   [Fixed Audio Player]      │ ← 72px footer
└─────────────────────────────┘
```

### Mobile Behavior & Interactions

**1. Hero Section**
- **Layout:** Single card display (not grid)
- **Interaction:** Swipeable carousel (touch gestures)
- **Indicator:** Dots showing position (4 bills = 4 dots)
- **Height:** 180px (reduced from desktop 240px)
- **Card Size:** Full width - 32px margins
- **Swipe:** Snap to card, spring animation
- **Accessibility:** Arrow buttons for keyboard users

**2. Widget Collapsing**
- **Default State:** Show 3-4 items only
- **Expansion:** Tap "Show X more" to expand in-place
- **Scroll:** Widget content scrolls vertically when expanded
- **Collapse:** Tap header to collapse back
- **Animation:** Smooth expand/collapse (300ms ease-in-out)

**3. Dropdown Filters**
- **Mobile Optimization:** Full-screen modal on tap
- **List View:** Radio buttons (single select)
- **Search:** Filter search input at top
- **Apply:** "Apply Filter" button at bottom
- **Cancel:** Swipe down or tap outside to dismiss

**4. Legislation Feed Widget**
```
Container:
  - Width: 100vw - 32px (16px margins)
  - Height: 280px (collapsed), auto (expanded)
  - Padding: 16px
  - Border Radius: 12px
  - Background: white / gray-900

Header:
  - Height: 48px
  - Display: flex justify-between items-center
  - Padding Bottom: 12px
  - Border Bottom: 1px solid gray-200

  Title:
    - Font: Inter SemiBold, 16px (reduced from 18px)
    - Color: gray-900 / white

  Filter Button:
    - Width: 140px (reduced from 200px)
    - Height: 36px (reduced from 40px)
    - Font: Inter Medium, 13px
    - Padding: 8px 12px

Content:
  - Padding: 12px 0
  - Max Height: 180px (collapsed)

  Bill Item:
    - Height: 60px
    - Padding: 10px 0
    - Border Bottom: 1px solid gray-100

    Layout: Vertical stack (not horizontal)

    Timestamp:
      - Font: Inter Medium, 12px
      - Color: gray-500
      - Margin Bottom: 4px

    Bill Title:
      - Font: Inter SemiBold, 14px
      - Color: gray-900 / white
      - Line Clamp: 1
      - Margin Bottom: 2px

    Subtitle:
      - Font: Inter Regular, 12px
      - Color: gray-600 / gray-400
      - Line Clamp: 1

Footer:
  - Height: 40px
  - Text Align: center

  Expand Button:
    - Font: Inter Medium, 13px
    - Color: blue-600 / blue-400
    - Padding: 8px
    - Full width
```

**5. Twitter Feed Widget**
```
Container: Same as Legislation

Tweet Item:
  - Height: auto (min 68px)
  - Padding: 10px 0
  - Border Bottom: 1px solid gray-100

  Tweet Header:
    - Display: flex items-center gap-2
    - Margin Bottom: 6px

    Avatar:
      - Size: 28px (reduced from 32px)

    Name + Handle:
      - Font: Inter SemiBold, 13px / Regular 12px
      - Display: flex flex-col (stacked, not horizontal)

    Timestamp:
      - Position: absolute top-right
      - Font: Inter Regular, 11px

  Tweet Text:
    - Font: Inter Regular, 13px
    - Line Clamp: 2
    - Margin Bottom: 6px

  Engagement Metrics:
    - Display: flex gap-3 (reduced from gap-4)
    - Font: Inter Medium, 11px
    - Icons: 12px (reduced from 14px)
```

**6. News Feed Widget**
```
Container: Same as others

News Item:
  - Height: 68px
  - Padding: 10px 0

  News Header:
    - Display: flex items-center gap-2
    - Margin Bottom: 4px

    Source Badge:
      - Font: Inter SemiBold, 10px uppercase
      - Padding: 2px 6px
      - Border Radius: 3px

    Timestamp:
      - Font: Inter Regular, 11px
      - Margin Left: auto

  News Title:
    - Font: Inter SemiBold, 14px
    - Line Clamp: 2
    - Margin Bottom: 4px

  Read Link:
    - Font: Inter Medium, 12px
    - Icon: 12px
```

**7. Perplexity Chat Widget**
```
Container:
  - Height: 280px (default), expands to 600px when active
  - Full-screen modal on tap input (better mobile UX)

Suggested Questions:
  - Display: grid grid-cols-1 gap-2 (single column)
  - Padding: 12px 16px

  Question Button:
    - Height: 44px (touch target)
    - Padding: 10px 14px
    - Font: Inter Medium, 12px
    - Icon: 14px

Chat Input:
  - Height: 52px
  - Padding: 12px 16px

  Input Field:
    - Height: 36px
    - Padding: 8px 14px
    - Font: Inter Regular, 13px
    - Border Radius: 18px

  Send Button:
    - Size: 36px
    - Icon: 14px

Chat Modal (when active):
  - Full screen: 100vh
  - Header with "Close" button
  - Scrollable message list
  - Fixed input at bottom
  - Keyboard-aware (pushes content up)
```

**8. Civic Impact Dashboard**
```
Container:
  - Height: 160px (reduced from 200px)
  - Padding: 20px 16px
  - Border Radius: 12px

Title:
  - Font: Inter Bold, 18px (reduced from 24px)
  - Margin Bottom: 16px

Stat Cards:
  - Display: grid grid-cols-2 gap-3 (2x2 grid)
  - Each card:
    - Height: 52px
    - Padding: 12px
    - Border Radius: 8px

    Value:
      - Font: Inter Bold, 24px (reduced from 36px)
      - Margin Bottom: 4px

    Label:
      - Font: Inter Medium, 10px (reduced from 13px)
      - Line Clamp: 1
```

### Mobile Navigation

**Bottom Navigation (Alternative Layout Option)**
```
If we add bottom nav (consider for Phase 7):

┌─────────────────────────────┐
│                             │
│    Main content area        │
│                             │
│                             │
└─────────────────────────────┘
│ [🏠] [📜] [🐦] [📰] [👤]    │ ← 64px bottom nav
└─────────────────────────────┘

Icons:
  - Home (Dashboard)
  - Bills (Legislation Feed)
  - Reps (Twitter Feed)
  - News (News Feed)
  - Profile (Settings)

Active state:
  - Icon color: blue-600
  - Label: 11px below icon
  - Indicator: 2px line above
```

### Mobile Gestures

**Swipe Gestures:**
- **Swipe Left/Right on Hero:** Navigate between recommended bills
- **Swipe Down on Widgets:** Refresh content (pull-to-refresh)
- **Swipe Up from Bottom:** Open audio player (if minimized)
- **Swipe Left on Bill/Tweet:** Quick actions (Track, Share, Hide)

**Tap Gestures:**
- **Single Tap on Bill:** Navigate to bill detail page
- **Long Press on Bill:** Show quick action menu
- **Double Tap on Widget Header:** Collapse/expand
- **Tap Outside Modal:** Dismiss modal

**Scroll Behavior:**
- **Scroll Snap:** Hero cards snap to center
- **Momentum Scrolling:** Native iOS/Android feel
- **Scroll to Top:** Tap status bar (iOS) or header
- **Infinite Scroll:** Load more as user scrolls (legislation, tweets, news)

---

## 📐 Responsive Breakpoints

### Tailwind CSS Breakpoints

```css
/* Mobile (default) */
@media (min-width: 0px) {
  /* 375px - 767px */
  .dashboard-grid { grid-template-columns: 1fr; }
  .widget { height: 280px; }
  .hero-card { width: 100%; }
}

/* Tablet */
@media (min-width: 768px) {
  /* 768px - 1279px */
  .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
  .widget { height: 360px; }
  .hero-card { width: calc(50% - 12px); }
}

/* Desktop */
@media (min-width: 1280px) {
  /* 1280px+ */
  .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
  .widget { height: 400px; }
  .hero-card { width: 280px; }
}

/* Large Desktop */
@media (min-width: 1920px) {
  /* 1920px+ */
  .container { max-width: 1920px; }
  .widget { height: 440px; }
}
```

### Component Responsive Classes

**Hero Section:**
```jsx
<div className="
  h-[180px] md:h-[220px] lg:h-[240px]
  p-4 md:p-6 lg:p-8
  rounded-xl md:rounded-2xl
  mb-6 md:mb-8 lg:mb-12
">
```

**Widget Grid:**
```jsx
<div className="
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2
  gap-4 md:gap-5 lg:gap-6
">
```

**Widget:**
```jsx
<div className="
  h-[280px] md:h-[360px] lg:h-[400px]
  rounded-lg md:rounded-xl
  p-4 md:p-5 lg:p-6
">
```

**Typography:**
```jsx
<h2 className="
  text-base md:text-lg lg:text-xl
  font-semibold
  mb-3 md:mb-4 lg:mb-6
">
```

---

## 🎨 Color System

### Light Mode Palette

```css
/* Primary (Blue) */
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-200: #bfdbfe;
--color-primary-300: #93c5fd;
--color-primary-400: #60a5fa;
--color-primary-500: #3b82f6;  /* Main */
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;
--color-primary-800: #1e40af;
--color-primary-900: #1e3a8a;

/* Neutral (Gray) */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827;

/* Semantic Colors */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;

/* Source Colors */
--color-the-hill: #0ea5e9;      /* Sky blue */
--color-politico: #dc2626;      /* Red */
--color-congress: #7c3aed;      /* Purple */
--color-perplexity: #8b5cf6;    /* Violet */
```

### Dark Mode Palette

```css
/* Background */
--color-dark-bg: #0f172a;       /* slate-900 */
--color-dark-surface: #1e293b;  /* slate-800 */
--color-dark-border: #334155;   /* slate-700 */

/* Text */
--color-dark-text-primary: #f1f5f9;    /* slate-100 */
--color-dark-text-secondary: #cbd5e1;  /* slate-300 */
--color-dark-text-muted: #64748b;      /* slate-500 */

/* Primary (adjusted for dark) */
--color-dark-primary: #60a5fa;  /* Lighter blue for visibility */
```

### Widget-Specific Colors

```css
/* Legislation Widget */
--widget-legislation-header: var(--color-primary-600);
--widget-legislation-accent: var(--color-primary-100);

/* Twitter Widget */
--widget-twitter-header: #1da1f2;  /* Twitter blue */
--widget-twitter-accent: #e8f5fe;

/* News Widget */
--widget-news-header: var(--color-gray-700);
--widget-news-accent: var(--color-gray-100);

/* Perplexity Widget */
--widget-perplexity-header: var(--color-perplexity);
--widget-perplexity-accent: #ede9fe;

/* Podcast Widget */
--widget-podcast-header: #ec4899;  /* Pink */
--widget-podcast-accent: #fce7f3;
```

---

## 🔤 Typography System

### Font Family
```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Font Scale

```css
/* Mobile */
--text-xs: 11px;      /* Timestamps, small labels */
--text-sm: 12px;      /* Secondary text, captions */
--text-base: 13px;    /* Body text */
--text-lg: 14px;      /* Emphasized text */
--text-xl: 16px;      /* Widget titles */
--text-2xl: 18px;     /* Section headers */
--text-3xl: 24px;     /* Page title */

/* Desktop (scaled up) */
--text-xs: 12px;
--text-sm: 13px;
--text-base: 14px;
--text-lg: 15px;
--text-xl: 18px;
--text-2xl: 24px;
--text-3xl: 32px;
```

### Font Weights
```css
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.25;    /* Headlines */
--leading-snug: 1.375;    /* Subheadings */
--leading-normal: 1.5;    /* Body text */
--leading-relaxed: 1.625; /* Long-form text */
```

---

## ♿ Accessibility Features

### Keyboard Navigation

**Tab Order:**
1. Header navigation
2. Hero section cards (left to right)
3. Widget filters (top to bottom, left to right)
4. Widget content items
5. Footer links
6. Fixed audio player

**Keyboard Shortcuts:**
- `Tab` - Navigate forward
- `Shift + Tab` - Navigate backward
- `Enter` / `Space` - Activate button/link
- `Escape` - Close modal/dropdown
- `Arrow Keys` - Navigate within widgets
- `Home` - Scroll to top
- `End` - Scroll to bottom
- `/` - Focus search input
- `?` - Show keyboard shortcuts help

**Focus States:**
```css
.focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove outline for mouse users */
.focus:not(.focus-visible) {
  outline: none;
}
```

### Screen Reader Support

**ARIA Labels:**
```jsx
<nav aria-label="Main navigation">
<section aria-labelledby="legislation-heading">
<button aria-label="Filter legislation by policy category" aria-expanded="false">
<div role="status" aria-live="polite" aria-atomic="true">
  {/* Dynamic content updates */}
</div>
```

**Semantic HTML:**
```jsx
<header>
  <nav>
    <ul role="menu">
      <li role="menuitem">
```

**Alternative Text:**
```jsx
<img src="avatar.jpg" alt="Senator Elizabeth Warren profile picture" />
<svg aria-hidden="true" focusable="false">
  {/* Decorative icon */}
</svg>
```

### Color Contrast

**WCAG AA Compliance:**
- Normal text (16px): 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

**Examples:**
- Primary blue (#3b82f6) on white: 4.56:1 ✅
- Gray-700 (#374151) on white: 10.69:1 ✅
- White on primary-600 (#2563eb): 7.35:1 ✅

### Touch Targets

**Minimum Sizes (Mobile):**
- Buttons: 44px × 44px (iOS) / 48px × 48px (Android)
- Links in body text: 44px × 44px tap area
- Form inputs: 44px height minimum
- Checkboxes/radios: 44px × 44px tap area

**Spacing:**
- Minimum 8px gap between touch targets
- 16px padding around important CTAs

---

## 🎬 Animations & Transitions

### Transition Timings

```css
/* Micro-interactions */
--duration-instant: 100ms;    /* Hover effects */
--duration-quick: 200ms;      /* Button clicks */
--duration-normal: 300ms;     /* Widget expand/collapse */
--duration-slow: 500ms;       /* Page transitions */

/* Easing Functions */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--spring: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Bounce */
```

### Component Animations

**Widget Expand/Collapse:**
```css
.widget {
  transition: height 300ms var(--ease-in-out);
}

.widget-content {
  transition: max-height 300ms var(--ease-in-out),
              opacity 200ms var(--ease-in-out);
}
```

**Button Hover:**
```css
.button {
  transition: background-color 100ms var(--ease-out),
              transform 100ms var(--ease-out);
}

.button:hover {
  transform: translateY(-1px);
}

.button:active {
  transform: translateY(0);
}
```

**Modal Entrance:**
```css
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal {
  animation: modal-enter 200ms var(--ease-out);
}
```

**Loading States:**
```css
@keyframes skeleton-loading {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: 200px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-gray-200) 0%,
    var(--color-gray-300) 50%,
    var(--color-gray-200) 100%
  );
  background-size: 200px 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}
```

**Swipe Carousel:**
```css
.carousel {
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.carousel-item {
  scroll-snap-align: center;
  transition: transform 200ms var(--spring);
}

.carousel-item:active {
  transform: scale(0.98);
}
```

---

## 🔧 Performance Optimizations

### Loading Strategy

**Above the Fold (Priority):**
1. Header (0ms)
2. Hero section (0ms)
3. First 2 widgets (0ms)

**Below the Fold (Lazy Load):**
1. Chat widget (when visible)
2. Analytics dashboard (when visible)
3. Additional widget content (on expand)

**Code Splitting:**
```jsx
// Lazy load heavy components
const PerplexityChat = lazy(() => import('./PerplexityChat'));
const CivicImpactDashboard = lazy(() => import('./CivicImpactDashboard'));

// Use Suspense with skeleton
<Suspense fallback={<WidgetSkeleton />}>
  <PerplexityChat />
</Suspense>
```

### Virtual Scrolling

**For long lists (100+ items):**
```jsx
import { useVirtual } from 'react-virtual';

// Only render visible items + buffer
const rowVirtualizer = useVirtual({
  size: bills.length,
  parentRef: containerRef,
  estimateSize: useCallback(() => 60, []), // 60px per item
  overscan: 5 // Buffer 5 items above/below
});
```

### Image Optimization

```jsx
// Use Next.js Image component
<Image
  src={representative.avatar}
  width={32}
  height={32}
  quality={75}
  loading="lazy"
  placeholder="blur"
  alt={representative.name}
/>
```

### Caching Strategy

**API Responses:**
- Legislation feed: 5 minutes
- Twitter feed: 5 minutes
- News feed: 5 minutes
- User profile: 1 hour
- Bill details: 24 hours

**Browser Cache:**
```
Cache-Control: public, max-age=300, stale-while-revalidate=60
```

---

## 📏 Spacing System

### Spacing Scale (4px base)

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Component Spacing

**Widget Spacing:**
- Padding: 24px (desktop), 16px (mobile)
- Gap between widgets: 24px (desktop), 16px (mobile)
- Gap between sections: 48px (desktop), 32px (mobile)

**Content Spacing:**
- Between items: 12px
- Between groups: 24px
- Between sections: 48px

---

## 🎯 Next Steps for Implementation

1. **Set up Tailwind Config** with custom colors, spacing, and typography
2. **Create Base Components** (Widget, Card, Button, Dropdown)
3. **Build Layout Components** (DashboardLayout, WidgetGrid)
4. **Implement Widgets** one by one (start with Legislation)
5. **Add Responsiveness** and test on all breakpoints
6. **Implement Animations** with Framer Motion
7. **Add Accessibility** features (ARIA, keyboard nav)
8. **Performance Audit** with Lighthouse
9. **User Testing** on real devices
10. **Polish & Launch** 🚀

---

**This UX design ensures a world-class dashboard experience across all devices! 🎨**
