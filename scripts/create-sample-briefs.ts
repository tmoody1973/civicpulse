#!/usr/bin/env tsx
/**
 * Create Sample Briefs for Testing Marketplace-style Digest
 * Generates mock briefs with featured images and titles
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function executeQuery(sql: string, table: string = 'users'): Promise<any> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Query failed: ${response.status} - ${error}`);
  }

  return response.json();
}

const sampleBriefs = [
  {
    id: `brief_sample_${Date.now()}_1`,
    title: 'Trade War 2.0: Tariffs and Inflation Impact',
    featured_image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80',
    policy_areas: ['Commerce', 'Economics and Public Finance'],
    type: 'daily',
    duration: 420, // 7 minutes
  },
  {
    id: `brief_sample_${Date.now()}_2`,
    title: 'Healthcare Reform: Medicare Expansion Bill Advances',
    featured_image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    policy_areas: ['Health', 'Healthcare'],
    type: 'daily',
    duration: 360, // 6 minutes
  },
  {
    id: `brief_sample_${Date.now()}_3`,
    title: 'Climate Action: New Carbon Emissions Standards',
    featured_image: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b5?w=800&q=80',
    policy_areas: ['Environmental Protection', 'Climate'],
    type: 'daily',
    duration: 480, // 8 minutes
  },
  {
    id: `brief_sample_${Date.now()}_4`,
    title: 'Education Funding: Student Loan Relief Package',
    featured_image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
    policy_areas: ['Education'],
    type: 'weekly',
    duration: 900, // 15 minutes
  },
  {
    id: `brief_sample_${Date.now()}_5`,
    title: 'Infrastructure Investment: Transportation Bill Update',
    featured_image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
    policy_areas: ['Transportation and Public Works'],
    type: 'daily',
    duration: 390, // 6.5 minutes
  },
  {
    id: `brief_sample_${Date.now()}_6`,
    title: 'National Security: Defense Budget Debate Heats Up',
    featured_image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    policy_areas: ['Armed Forces and National Security', 'Defense'],
    type: 'weekly',
    duration: 1080, // 18 minutes
  },
];

const writtenDigest = `# Your Daily Congressional Brief

*Generated on ${new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}*

## 🔥 Breaking News

### Major Legislative Development

Congress is moving forward with significant policy changes that could impact millions of Americans. The latest developments include bipartisan negotiations on key issues affecting the economy, healthcare, and national security.

Lawmakers are working to address pressing concerns raised by constituents across the country. The proposed legislation aims to balance competing interests while ensuring long-term stability and growth.

*Source: Congressional Record • ${new Date().toLocaleDateString()}*

---

## 📜 Featured Legislation

### H.R. 1234: American Progress Act

**Sponsor:** Rep. Jane Smith (D-CA)

**Status:** PASSED HOUSE

**Latest Action:** Referred to Senate Committee on Finance (${new Date().toLocaleDateString()})

**Summary:**

This comprehensive legislation addresses multiple policy areas including economic development, infrastructure investment, and social programs. The bill proposes $2.5 trillion in federal spending over the next decade, with funding allocated to modernizing transportation networks, expanding broadband access, and supporting workforce development initiatives.

Key provisions include tax incentives for clean energy adoption, increased funding for public education, and reforms to healthcare delivery systems. The legislation has garnered support from various stakeholder groups, though concerns remain about long-term fiscal impacts.

**Impact Score:** 85/100

[Read full bill on Congress.gov](https://congress.gov/bill/119th-congress/hr/1234)

---

## 📰 More News

### Committee Hearings Scheduled

Multiple congressional committees have announced upcoming hearings on critical policy matters. Topics include cybersecurity, international trade, immigration reform, and environmental protection.

*[Read more on Congressional Quarterly](https://www.cq.com)*

### Bipartisan Caucus Forms

A new bipartisan caucus has emerged to focus on rural development and agricultural policy. Members from both parties are collaborating to address challenges facing farming communities.

*[Read more on The Hill](https://thehill.com)*

---

## ⚡ Quick Hits

Other bills you might be interested in:

- **[S. 789](https://congress.gov/bill/119th-congress/s/789):** Innovation and Technology Investment Act
- **[H.R. 2345](https://congress.gov/bill/119th-congress/hr/2345):** Veterans Healthcare Expansion Act
- **[S. 456](https://congress.gov/bill/119th-congress/s/456):** Small Business Support and Recovery Act
- **[H.R. 3456](https://congress.gov/bill/119th-congress/hr/3456):** Renewable Energy Development Act

---

*💡 Stay informed. Stay engaged. Stay empowered.*

[Manage your preferences](${process.env.NEXT_PUBLIC_APP_URL}/settings) • [View all briefs](${process.env.NEXT_PUBLIC_APP_URL}/briefs)
`;

const transcript = `SARAH: Good morning, and welcome to your daily congressional brief. I'm Sarah.

JAMES: And I'm James. Today we're covering some major developments on Capitol Hill that could have significant impacts on your daily life.

SARAH: That's right, James. Let's dive right into the top story - the American Progress Act just passed the House and is now heading to the Senate.

JAMES: This is a massive piece of legislation, Sarah. We're talking about $2.5 trillion in federal spending over the next decade.

SARAH: Exactly. The bill focuses on three main areas: infrastructure modernization, clean energy incentives, and expanded social programs.

JAMES: For infrastructure, we're looking at significant investments in transportation networks - roads, bridges, public transit, and rail systems across the country.

SARAH: There's also a major push for broadband expansion, especially in rural areas that currently lack high-speed internet access.

JAMES: Now, the clean energy provisions are particularly interesting. The bill includes substantial tax credits for businesses and homeowners who adopt renewable energy solutions.

SARAH: We're talking solar panels, wind turbines, electric vehicles - all of these would become more affordable under this legislation.

JAMES: The healthcare provisions are getting a lot of attention too. The bill proposes reforms to Medicare and Medicaid that could expand coverage to millions more Americans.

SARAH: Of course, there's debate about the cost. Critics are concerned about adding to the national deficit, while supporters argue these are necessary investments in America's future.

JAMES: The Senate will now take up the bill, and we can expect amendments and negotiations before any final vote.

SARAH: We'll be watching closely as this develops. That's your brief for today.

JAMES: Stay informed, stay engaged, and we'll see you tomorrow.

SARAH: Thanks for listening.`;

async function createSampleBriefs() {
  console.log('\n🎨 Creating Sample Briefs for Marketplace-style Digest\n');
  console.log('='.repeat(70));

  try {
    // Get existing user by email
    console.log('\n👤 Finding user...');

    const userResult = await executeQuery(
      `SELECT id FROM users WHERE email = 'tarikjmoody@gmail.com' LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found. Please sign in to the app first to create your account.');
    }

    const userId = userResult.rows[0].id;
    console.log(`  ✅ Found user: ${userId}`);

    console.log('\n📝 Creating sample briefs...\n');

    for (const brief of sampleBriefs) {
      const escapeSql = (str: string) => str.replace(/'/g, "''");

      console.log(`Creating: ${brief.title}`);

      const newsArticles = [
        {
          title: brief.title,
          summary: `Breaking news coverage of ${brief.title.toLowerCase()}`,
          policy_area: brief.policy_areas[0],
          link: 'https://example.com/news',
          source: 'Congressional Quarterly',
          published_date: new Date().toISOString(),
        }
      ];

      const audioUrl = `https://storage.example.com/briefs/${brief.id}.mp3`;

      await executeQuery(
        `INSERT INTO briefs (
          id, user_id, type, title, featured_image_url,
          audio_url, transcript, written_digest,
          news_articles, bills_covered, policy_areas,
          duration, generated_at
        ) VALUES (
          '${brief.id}',
          '${userId}',
          '${brief.type}',
          '${escapeSql(brief.title)}',
          '${brief.featured_image}',
          '${audioUrl}',
          '${escapeSql(transcript)}',
          '${escapeSql(writtenDigest)}',
          '${escapeSql(JSON.stringify(newsArticles))}',
          '[]',
          '${escapeSql(JSON.stringify(brief.policy_areas))}',
          ${brief.duration},
          CURRENT_TIMESTAMP
        )`,
        'users'
      );

      console.log(`  ✅ Created: ${brief.id}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Successfully created ${sampleBriefs.length} sample briefs!`);
    console.log('\n📍 View them at: http://localhost:3000/briefs');
    console.log('\n💡 Note: You may need to be authenticated as user: ' + userId);
    console.log();

  } catch (error) {
    console.error('\n❌ Failed to create sample briefs:', error);
    process.exit(1);
  }
}

createSampleBriefs();
