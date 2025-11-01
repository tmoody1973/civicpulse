# Resend Newsletter Implementation Guide

**Purpose:** Send personalized weekly briefings to HakiVo users based on their tracked bills and interests

**Built on:** Resend + React Email + Next.js API Routes + Netlify Scheduled Functions

---

## Table of Contents

1. [Overview](#overview)
2. [Setup & Installation](#setup--installation)
3. [Database Schema](#database-schema)
4. [Email Templates](#email-templates)
5. [Briefing Generation Logic](#briefing-generation-logic)
6. [Resend Integration](#resend-integration)
7. [Scheduling (Netlify)](#scheduling-netlify)
8. [Testing](#testing)
9. [User Preferences](#user-preferences)
10. [Analytics & Tracking](#analytics--tracking)

---

## Overview

### What This Does

Sends personalized weekly email briefings to users with:
- Updates on bills they're tracking (status changes, votes, etc.)
- New bills matching their interests
- Summary of congressional activity in their areas of interest
- Clickable links back to the app

### Architecture

```
Monday 7am (Netlify Scheduled Function)
    ↓
[Get all active users from database]
    ↓
For each user:
    ↓
[Generate personalized briefing content]
    ↓
[Render React Email template with user's data]
    ↓
[Send via Resend API]
    ↓
[Track delivery & opens]
```

### User Flow

1. User signs up → default: weekly email enabled
2. User tracks bills → stored in `user_tracked_bills` table
3. User sets interests → stored in `user_preferences` table
4. Monday morning → receives personalized email
5. Clicks bill → goes to app bill detail page
6. Can unsubscribe or change frequency anytime

---

## Setup & Installation

### 1. Create Resend Account

```bash
# Go to https://resend.com
# Sign up (free for 3,000 emails/month)
# Get API key from dashboard
```

### 2. Install Dependencies

```bash
npm install resend @react-email/components
npm install -D @types/react @types/react-dom
```

### 3. Add Environment Variables

```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=briefings@hakivo.app
NEXT_PUBLIC_APP_URL=https://hakivo.netlify.app
```

**Netlify Setup:**
```bash
# Set in Netlify UI: Site Settings > Environment Variables
netlify env:set RESEND_API_KEY "re_xxxxxxxxxxxxxxxxxxxx"
netlify env:set RESEND_FROM_EMAIL "briefings@hakivo.app"
```

### 4. Verify Domain (Required for Production)

```bash
# In Resend Dashboard:
1. Go to "Domains"
2. Click "Add Domain"
3. Enter: hakivo.app
4. Add DNS records (TXT, MX, CNAME)
5. Wait for verification (usually 5-10 minutes)
```

**Why this matters:** Without domain verification, you can only send to verified email addresses (testing). With verification, you can send to anyone.

---

## Database Schema

### Tables Needed

```sql
-- Users table (already exists)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences for newsletters
CREATE TABLE user_newsletter_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  enabled BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'never'
  interests TEXT, -- JSON array: ["healthcare", "climate", "education"]
  last_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills users are tracking (already exists)
CREATE TABLE user_tracked_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  bill_id TEXT REFERENCES bills(id),
  tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, bill_id)
);

-- Newsletter delivery tracking
CREATE TABLE newsletter_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  email_id TEXT, -- Resend email ID
  status TEXT, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  error_message TEXT
);
```

### Create Tables Script

```typescript
// scripts/create-newsletter-tables.ts
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function createTables() {
  console.log('Creating newsletter tables...\n');

  // User newsletter preferences
  const prefsResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'user_newsletter_preferences',
      query: `
        CREATE TABLE IF NOT EXISTS user_newsletter_preferences (
          user_id TEXT PRIMARY KEY REFERENCES users(id),
          enabled BOOLEAN DEFAULT true,
          frequency TEXT DEFAULT 'weekly',
          interests TEXT,
          last_sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    })
  });

  console.log('✅ Created user_newsletter_preferences');

  // Newsletter deliveries
  const deliveriesResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'newsletter_deliveries',
      query: `
        CREATE TABLE IF NOT EXISTS newsletter_deliveries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT REFERENCES users(id),
          email_id TEXT,
          status TEXT DEFAULT 'sent',
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          delivered_at TIMESTAMP,
          opened_at TIMESTAMP,
          clicked_at TIMESTAMP,
          error_message TEXT
        )
      `
    })
  });

  console.log('✅ Created newsletter_deliveries');
  console.log('\n✨ All tables created successfully!');
}

createTables().catch(console.error);
```

**Run it:**
```bash
npx tsx scripts/create-newsletter-tables.ts
```

---

## Email Templates

### 1. Weekly Briefing Template

```tsx
// emails/WeeklyBriefing.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components';

interface BillUpdate {
  id: string;
  billNumber: string;
  title: string;
  oldStatus: string;
  newStatus: string;
  latestAction: string;
  url: string;
}

interface NewBill {
  id: string;
  billNumber: string;
  title: string;
  summary: string;
  sponsor: string;
  relevanceReason: string;
  url: string;
}

interface WeeklyBriefingProps {
  userName: string;
  userEmail: string;
  trackedBillsUpdates: BillUpdate[];
  newBillsMatching: NewBill[];
  weekStartDate: string;
  weekEndDate: string;
  appUrl: string;
  unsubscribeUrl: string;
}

export function WeeklyBriefing({
  userName,
  userEmail,
  trackedBillsUpdates,
  newBillsMatching,
  weekStartDate,
  weekEndDate,
  appUrl,
  unsubscribeUrl,
}: WeeklyBriefingProps) {
  const updateCount = trackedBillsUpdates.length;
  const newCount = newBillsMatching.length;

  return (
    <Html>
      <Head />
      <Preview>
        {updateCount > 0
          ? `${updateCount} ${updateCount === 1 ? 'bill' : 'bills'} you're tracking ${updateCount === 1 ? 'has' : 'have'} updates`
          : 'Your weekly congressional briefing'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Heading style={h1}>HakiVo Weekly Briefing</Heading>
          <Text style={text}>
            Hi {userName}! Here's what happened with your tracked bills from {weekStartDate} to {weekEndDate}.
          </Text>

          {/* Tracked Bills Updates Section */}
          {updateCount > 0 ? (
            <Section style={section}>
              <Heading as="h2" style={h2}>
                🔔 Updates on Bills You're Tracking ({updateCount})
              </Heading>

              {trackedBillsUpdates.map((bill) => (
                <div key={bill.id} style={billCard}>
                  <Text style={billTitle}>
                    <strong>{bill.billNumber}</strong> - {bill.title}
                  </Text>
                  <Text style={statusChange}>
                    <span style={oldStatus}>{bill.oldStatus}</span>
                    {' → '}
                    <span style={newStatus}>{bill.newStatus}</span>
                  </Text>
                  <Text style={latestAction}>
                    Latest: {bill.latestAction}
                  </Text>
                  <Link href={bill.url} style={linkButton}>
                    View Details →
                  </Link>
                </div>
              ))}
            </Section>
          ) : (
            <Section style={section}>
              <Text style={text}>
                No updates this week on the bills you're tracking. We'll keep watching!
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          {/* New Bills Section */}
          {newCount > 0 && (
            <Section style={section}>
              <Heading as="h2" style={h2}>
                🆕 New Bills Matching Your Interests ({newCount})
              </Heading>

              {newBillsMatching.map((bill) => (
                <div key={bill.id} style={billCard}>
                  <Text style={billTitle}>
                    <strong>{bill.billNumber}</strong> - {bill.title}
                  </Text>
                  <Text style={text}>{bill.summary}</Text>
                  <Text style={sponsor}>Sponsor: {bill.sponsor}</Text>
                  <Text style={relevance}>
                    <em>Why this matches: {bill.relevanceReason}</em>
                  </Text>
                  <Link href={bill.url} style={linkButton}>
                    View Bill →
                  </Link>
                </div>
              ))}
            </Section>
          )}

          <Hr style={hr} />

          {/* CTA Section */}
          <Section style={section}>
            <Button href={`${appUrl}/dashboard`} style={button}>
              View Your Dashboard
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you signed up for weekly briefings at HakiVo.
            </Text>
            <Text style={footerText}>
              <Link href={`${appUrl}/settings`} style={footerLink}>
                Change Preferences
              </Link>
              {' · '}
              <Link href={unsubscribeUrl} style={footerLink}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const section = {
  padding: '0 48px',
};

const h1 = {
  color: '#1d4ed8',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
};

const h2 = {
  color: '#333',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '30px 0 20px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const billCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '16px',
};

const billTitle = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const statusChange = {
  fontSize: '14px',
  margin: '8px 0',
  color: '#64748b',
};

const oldStatus = {
  color: '#94a3b8',
  textDecoration: 'line-through',
};

const newStatus = {
  color: '#10b981',
  fontWeight: '600',
};

const latestAction = {
  fontSize: '14px',
  color: '#64748b',
  margin: '8px 0',
};

const sponsor = {
  fontSize: '14px',
  color: '#64748b',
  margin: '8px 0',
};

const relevance = {
  fontSize: '14px',
  color: '#8b5cf6',
  margin: '8px 0',
};

const linkButton = {
  color: '#2563eb',
  fontSize: '14px',
  textDecoration: 'none',
  fontWeight: '500',
};

const button = {
  backgroundColor: '#1d4ed8',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '20px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '30px 0',
};

const footer = {
  padding: '0 48px',
  marginTop: '32px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '8px 0',
};

const footerLink = {
  color: '#8898aa',
  textDecoration: 'underline',
};

export default WeeklyBriefing;
```

### 2. Preview Email Script (for development)

```typescript
// scripts/preview-email.tsx
import { render } from '@react-email/render';
import { WeeklyBriefing } from '../emails/WeeklyBriefing';

const sampleData = {
  userName: 'Sarah Johnson',
  userEmail: 'sarah@example.com',
  trackedBillsUpdates: [
    {
      id: '119-hr-5031',
      billNumber: 'HR 5031',
      title: 'Preserving Patient Access to Long-Term Care Pharmacies Act',
      oldStatus: 'Passed House',
      newStatus: 'In Senate Committee',
      latestAction: 'Referred to Senate Committee on Health, Education, Labor, and Pensions',
      url: 'https://hakivo.app/bills/119-hr-5031',
    },
    {
      id: '119-s-3047',
      billNumber: 'S 3047',
      title: 'Restoring Rural Health Act',
      oldStatus: 'Introduced',
      newStatus: 'Committee Hearing Scheduled',
      latestAction: 'Committee hearing scheduled for November 15',
      url: 'https://hakivo.app/bills/119-s-3047',
    },
  ],
  newBillsMatching: [
    {
      id: '119-hr-5662',
      billNumber: 'HR 5662',
      title: 'Improving Access to Institutional Mental Health Care Act',
      summary: 'Expands Medicare coverage for mental health services in rural areas and increases funding for community mental health centers.',
      sponsor: 'Rep. Thanedar, Shri [D-MI-13]',
      relevanceReason: 'Matches your interest in healthcare access',
      url: 'https://hakivo.app/bills/119-hr-5662',
    },
  ],
  weekStartDate: 'October 21',
  weekEndDate: 'October 27',
  appUrl: 'https://hakivo.app',
  unsubscribeUrl: 'https://hakivo.app/unsubscribe?token=xxx',
};

const emailHtml = render(<WeeklyBriefing {...sampleData} />);

console.log(emailHtml);
```

**Preview in browser:**
```bash
npx tsx scripts/preview-email.tsx > preview.html
open preview.html
```

---

## Briefing Generation Logic

### Get User's Tracked Bills with Updates

```typescript
// lib/newsletters/briefing-generator.ts
import { config } from 'dotenv';
config();

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

interface BillUpdate {
  id: string;
  billNumber: string;
  title: string;
  oldStatus: string;
  newStatus: string;
  latestAction: string;
  url: string;
}

interface NewBill {
  id: string;
  billNumber: string;
  title: string;
  summary: string;
  sponsor: string;
  relevanceReason: string;
  url: string;
}

interface BriefingContent {
  trackedBillsUpdates: BillUpdate[];
  newBillsMatching: NewBill[];
}

/**
 * Get bills user is tracking that have updates this week
 */
export async function getTrackedBillsUpdates(
  userId: string,
  weekAgoTimestamp: string
): Promise<BillUpdate[]> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        SELECT
          b.id,
          b.bill_type,
          b.bill_number,
          b.title,
          b.status,
          b.latest_action_date,
          b.latest_action_text
        FROM bills b
        INNER JOIN user_tracked_bills utb ON b.id = utb.bill_id
        WHERE utb.user_id = '${userId}'
          AND b.latest_action_date >= '${weekAgoTimestamp}'
        ORDER BY b.latest_action_date DESC
      `
    })
  });

  const data = await response.json();
  const bills = data.rows || [];

  // Transform to BillUpdate format
  return bills.map((bill: any) => ({
    id: bill.id,
    billNumber: `${bill.bill_type.toUpperCase()} ${bill.bill_number}`,
    title: bill.title,
    oldStatus: 'In Committee', // TODO: Track historical status changes
    newStatus: bill.status,
    latestAction: bill.latest_action_text,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/bills/${bill.id}`,
  }));
}

/**
 * Find new bills matching user's interests
 */
export async function getNewBillsMatching(
  userId: string,
  interests: string[],
  weekAgoTimestamp: string
): Promise<NewBill[]> {
  // Get bills introduced this week matching user interests
  const interestsFilter = interests.map(i => `policy_area = '${i}'`).join(' OR ');

  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        SELECT
          id,
          bill_type,
          bill_number,
          title,
          summary,
          sponsor_name,
          sponsor_party,
          sponsor_state,
          policy_area,
          introduced_date
        FROM bills
        WHERE (${interestsFilter})
          AND introduced_date >= '${weekAgoTimestamp}'
          AND id NOT IN (
            SELECT bill_id FROM user_tracked_bills WHERE user_id = '${userId}'
          )
        ORDER BY impact_score DESC
        LIMIT 5
      `
    })
  });

  const data = await response.json();
  const bills = data.rows || [];

  return bills.map((bill: any) => ({
    id: bill.id,
    billNumber: `${bill.bill_type.toUpperCase()} ${bill.bill_number}`,
    title: bill.title,
    summary: bill.summary?.substring(0, 200) + '...' || 'Summary not yet available',
    sponsor: `${bill.sponsor_name} [${bill.sponsor_party}-${bill.sponsor_state}]`,
    relevanceReason: `Matches your interest in ${bill.policy_area}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/bills/${bill.id}`,
  }));
}

/**
 * Generate complete briefing content for a user
 */
export async function generateBriefing(
  userId: string,
  interests: string[]
): Promise<BriefingContent> {
  // Calculate date range (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoTimestamp = weekAgo.toISOString().split('T')[0];

  // Get content in parallel
  const [trackedBillsUpdates, newBillsMatching] = await Promise.all([
    getTrackedBillsUpdates(userId, weekAgoTimestamp),
    getNewBillsMatching(userId, interests, weekAgoTimestamp),
  ]);

  return {
    trackedBillsUpdates,
    newBillsMatching,
  };
}
```

---

## Resend Integration

### Resend Client Setup

```typescript
// lib/newsletters/resend-client.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### Send Newsletter Function

```typescript
// lib/newsletters/send-newsletter.ts
import { render } from '@react-email/render';
import { resend } from './resend-client';
import { WeeklyBriefing } from '../../emails/WeeklyBriefing';
import { generateBriefing } from './briefing-generator';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'briefings@hakivo.app';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hakivo.app';

interface User {
  id: string;
  email: string;
  name: string;
  interests: string[];
}

/**
 * Send weekly briefing to a single user
 */
export async function sendWeeklyBriefing(user: User): Promise<void> {
  try {
    // Generate personalized content
    const content = await generateBriefing(user.id, user.interests);

    // Skip if no updates and no new bills
    if (content.trackedBillsUpdates.length === 0 && content.newBillsMatching.length === 0) {
      console.log(`Skipping ${user.email} - no updates this week`);
      return;
    }

    // Format dates
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekStartDate = weekAgo.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const weekEndDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    // Generate unsubscribe token (simple version - enhance with JWT in production)
    const unsubscribeToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

    // Render email
    const emailHtml = render(
      <WeeklyBriefing
        userName={user.name}
        userEmail={user.email}
        trackedBillsUpdates={content.trackedBillsUpdates}
        newBillsMatching={content.newBillsMatching}
        weekStartDate={weekStartDate}
        weekEndDate={weekEndDate}
        appUrl={APP_URL}
        unsubscribeUrl={unsubscribeUrl}
      />
    );

    // Send via Resend
    const updateCount = content.trackedBillsUpdates.length;
    const newCount = content.newBillsMatching.length;

    const subject = updateCount > 0
      ? `Your Weekly Briefing - ${updateCount} ${updateCount === 1 ? 'Update' : 'Updates'}`
      : `Your Weekly Briefing - ${newCount} New ${newCount === 1 ? 'Bill' : 'Bills'}`;

    const { data, error } = await resend.emails.send({
      from: `HakiVo <${FROM_EMAIL}>`,
      to: user.email,
      subject,
      html: emailHtml,
      tags: [
        { name: 'type', value: 'weekly-briefing' },
        { name: 'user_id', value: user.id },
      ],
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    // Track delivery
    await trackDelivery(user.id, data!.id, 'sent');

    console.log(`✅ Sent to ${user.email} (${updateCount} updates, ${newCount} new bills)`);

  } catch (error) {
    console.error(`❌ Failed to send to ${user.email}:`, error);
    await trackDelivery(user.id, null, 'failed', error.message);
  }
}

/**
 * Track newsletter delivery
 */
async function trackDelivery(
  userId: string,
  emailId: string | null,
  status: string,
  errorMessage?: string
): Promise<void> {
  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'newsletter_deliveries',
      query: `
        INSERT INTO newsletter_deliveries (user_id, email_id, status, error_message)
        VALUES ('${userId}', ${emailId ? `'${emailId}'` : 'NULL'}, '${status}', ${errorMessage ? `'${errorMessage}'` : 'NULL'})
      `
    })
  });
}
```

### Batch Send Function

```typescript
// lib/newsletters/batch-send.ts
import { sendWeeklyBriefing } from './send-newsletter';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

interface User {
  id: string;
  email: string;
  name: string;
  interests: string[];
}

/**
 * Get all users who want weekly briefings
 */
async function getActiveUsers(): Promise<User[]> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'users',
      query: `
        SELECT
          u.id,
          u.email,
          u.name,
          unp.interests
        FROM users u
        INNER JOIN user_newsletter_preferences unp ON u.id = unp.user_id
        WHERE unp.enabled = true
          AND unp.frequency = 'weekly'
        ORDER BY u.created_at ASC
      `
    })
  });

  const data = await response.json();
  const users = data.rows || [];

  return users.map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.name || u.email.split('@')[0],
    interests: u.interests ? JSON.parse(u.interests) : [],
  }));
}

/**
 * Send weekly briefings to all active users
 */
export async function sendWeeklyBriefings(): Promise<void> {
  const startTime = Date.now();

  console.log('🚀 Starting weekly briefing batch send\n');

  // Get users
  const users = await getActiveUsers();
  console.log(`📧 Found ${users.length} users to send to\n`);

  if (users.length === 0) {
    console.log('No users to send to. Exiting.');
    return;
  }

  // Send to each user
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const user of users) {
    try {
      await sendWeeklyBriefing(user);
      successCount++;
    } catch (error) {
      if (error.message?.includes('no updates')) {
        skipCount++;
      } else {
        failCount++;
      }
    }

    // Rate limit: wait 100ms between sends
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('✨ Weekly briefing batch complete!');
  console.log('='.repeat(60));
  console.log(`📊 Statistics:`);
  console.log(`   Total users: ${users.length}`);
  console.log(`   Sent: ${successCount}`);
  console.log(`   Skipped (no updates): ${skipCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Duration: ${duration}s`);
  console.log('='.repeat(60));
}
```

---

## Scheduling (Netlify)

### Create Netlify Scheduled Function

```typescript
// netlify/functions/weekly-briefing.ts
import type { Config } from '@netlify/functions';
import { sendWeeklyBriefings } from '../../lib/newsletters/batch-send';

export default async (req: Request) => {
  console.log('📅 Weekly briefing scheduled function triggered');

  try {
    await sendWeeklyBriefings();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weekly briefing error:', error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Schedule: Every Monday at 7:00 AM EST
export const config: Config = {
  schedule: '0 12 * * 1', // Cron: 12:00 PM UTC = 7:00 AM EST
};
```

### Alternative: Manual Trigger Script

```typescript
// scripts/send-weekly-briefings.ts
import { sendWeeklyBriefings } from '../lib/newsletters/batch-send';

async function main() {
  await sendWeeklyBriefings();
}

main().catch(console.error);
```

**Run manually:**
```bash
npx tsx scripts/send-weekly-briefings.ts
```

### Netlify Deployment

```bash
# Deploy to Netlify
netlify deploy --prod

# Verify scheduled function is registered
netlify functions:list

# Check logs
netlify functions:log weekly-briefing
```

---

## Testing

### 1. Test Email Rendering

```bash
# Preview in browser
npx tsx scripts/preview-email.tsx > preview.html
open preview.html
```

### 2. Test Single User Send

```typescript
// scripts/test-single-send.ts
import { sendWeeklyBriefing } from '../lib/newsletters/send-newsletter';

async function testSend() {
  const testUser = {
    id: 'test-user-1',
    email: 'your-email@example.com', // Your email
    name: 'Test User',
    interests: ['Healthcare', 'Education'],
  };

  await sendWeeklyBriefing(testUser);
  console.log('Check your email!');
}

testSend().catch(console.error);
```

**Run it:**
```bash
npx tsx scripts/test-single-send.ts
```

### 3. Test Briefing Generation

```typescript
// scripts/test-briefing-generation.ts
import { generateBriefing } from '../lib/newsletters/briefing-generator';

async function test() {
  const content = await generateBriefing(
    'test-user-1',
    ['Healthcare', 'Education']
  );

  console.log('Generated briefing content:');
  console.log(JSON.stringify(content, null, 2));
}

test().catch(console.error);
```

### 4. Test Batch Send (Dry Run)

```typescript
// Add dry-run mode to batch-send.ts
export async function sendWeeklyBriefings(dryRun = false): Promise<void> {
  // ... existing code ...

  for (const user of users) {
    if (dryRun) {
      console.log(`[DRY RUN] Would send to ${user.email}`);
      continue;
    }

    await sendWeeklyBriefing(user);
  }
}
```

**Run dry run:**
```bash
# Modify script to pass dryRun=true
npx tsx scripts/send-weekly-briefings.ts --dry-run
```

---

## User Preferences

### API Route for User Preferences

```typescript
// app/api/newsletter-preferences/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

export async function GET(req: Request) {
  try {
    const user = await requireAuth();

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'user_newsletter_preferences',
        query: `SELECT * FROM user_newsletter_preferences WHERE user_id = '${user.id}'`
      })
    });

    const data = await response.json();
    const prefs = data.rows?.[0];

    return NextResponse.json({
      enabled: prefs?.enabled ?? true,
      frequency: prefs?.frequency ?? 'weekly',
      interests: prefs?.interests ? JSON.parse(prefs.interests) : [],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const { enabled, frequency, interests } = body;

    await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'user_newsletter_preferences',
        query: `
          INSERT INTO user_newsletter_preferences (user_id, enabled, frequency, interests, updated_at)
          VALUES ('${user.id}', ${enabled}, '${frequency}', '${JSON.stringify(interests)}', CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET
            enabled = ${enabled},
            frequency = '${frequency}',
            interests = '${JSON.stringify(interests)}',
            updated_at = CURRENT_TIMESTAMP
        `
      })
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Settings Page Component

```tsx
// app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState('weekly');
  const [interests, setInterests] = useState<string[]>([]);

  const availableInterests = [
    'Healthcare',
    'Education',
    'Climate & Environment',
    'Veterans Affairs',
    'Small Business',
    'Agriculture',
    'Technology',
    'Defense',
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    const res = await fetch('/api/newsletter-preferences');
    const data = await res.json();
    setEnabled(data.enabled);
    setFrequency(data.frequency);
    setInterests(data.interests);
  }

  async function savePreferences() {
    await fetch('/api/newsletter-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, frequency, interests }),
    });
    alert('Preferences saved!');
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Newsletter Preferences</h1>

      {/* Enable/Disable */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mr-2"
          />
          <span>Send me weekly briefings</span>
        </label>
      </div>

      {/* Frequency */}
      {enabled && (
        <div className="mb-6">
          <label className="block mb-2 font-medium">Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      )}

      {/* Interests */}
      {enabled && (
        <div className="mb-6">
          <label className="block mb-2 font-medium">Your Interests</label>
          <div className="grid grid-cols-2 gap-2">
            {availableInterests.map((interest) => (
              <label key={interest} className="flex items-center">
                <input
                  type="checkbox"
                  checked={interests.includes(interest)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setInterests([...interests, interest]);
                    } else {
                      setInterests(interests.filter((i) => i !== interest));
                    }
                  }}
                  className="mr-2"
                />
                <span>{interest}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={savePreferences}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Save Preferences
      </button>
    </div>
  );
}
```

---

## Analytics & Tracking

### Track Opens & Clicks with Resend Webhooks

```typescript
// app/api/webhooks/resend/route.ts
import { NextResponse } from 'next/server';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

export async function POST(req: Request) {
  try {
    const event = await req.json();

    const { type, data } = event;

    // Update delivery status based on event type
    if (type === 'email.delivered') {
      await updateDeliveryStatus(data.email_id, 'delivered', 'delivered_at');
    } else if (type === 'email.opened') {
      await updateDeliveryStatus(data.email_id, 'opened', 'opened_at');
    } else if (type === 'email.clicked') {
      await updateDeliveryStatus(data.email_id, 'clicked', 'clicked_at');
    } else if (type === 'email.bounced') {
      await updateDeliveryStatus(data.email_id, 'bounced', null, data.reason);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateDeliveryStatus(
  emailId: string,
  status: string,
  timestampField?: string,
  errorMessage?: string
) {
  let query = `
    UPDATE newsletter_deliveries
    SET status = '${status}'
  `;

  if (timestampField) {
    query += `, ${timestampField} = CURRENT_TIMESTAMP`;
  }

  if (errorMessage) {
    query += `, error_message = '${errorMessage}'`;
  }

  query += ` WHERE email_id = '${emailId}'`;

  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: 'newsletter_deliveries', query })
  });
}
```

**Configure webhook in Resend:**
1. Go to Resend Dashboard > Webhooks
2. Add endpoint: `https://hakivo.netlify.app/api/webhooks/resend`
3. Select events: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`

---

## Summary

**What you get:**
- ✅ Personalized weekly briefings for each user
- ✅ Updates on bills they're tracking
- ✅ New bills matching their interests
- ✅ Beautiful React Email templates
- ✅ Scheduled sending (Netlify Functions)
- ✅ User preference management
- ✅ Delivery tracking and analytics
- ✅ Professional email deliverability

**Time to implement:** ~6 hours

**Cost:** Free for first 3,000 emails/month (covers ~750 users with weekly emails)

**Next steps:**
1. Set up Resend account and verify domain
2. Create database tables
3. Build email template
4. Implement briefing generation
5. Test with your own email
6. Deploy to Netlify
7. Monitor and iterate!

---

**Questions or issues?** Check:
- Resend docs: https://resend.com/docs
- React Email docs: https://react.email/docs
- Netlify scheduled functions: https://docs.netlify.com/functions/scheduled-functions/
