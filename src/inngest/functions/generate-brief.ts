import { inngest } from '../client';
import Anthropic from '@anthropic-ai/sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface BriefEvent {
  name: 'brief/generate';
  data: {
    userId: string;
    userEmail?: string;
    userName?: string;
    state?: string;
    district?: string;
    policyInterests: string[];
  };
}

export const generateBriefFunction = inngest.createFunction(
  {
    id: 'generate-daily-brief',
    name: 'Generate Daily Brief',
    retries: 3
  },
  { event: 'brief/generate' },
  async ({ event, step }) => {
    const { userId, policyInterests, state, district } = event.data;

    // Step 1: Fetch legislative news using Perplexity API
    const bills = await step.run('fetch-legislative-news', async () => {
      console.log(`📊 Fetching legislative news using Perplexity API`);

      try {
        const prompt = `Give me an extended summary (5 items) of the latest U.S. Congressional legislation and bills from the past 14 days. For each item, include:
- date
- type (e.g., Bill Introduction, Committee Hearing, Floor Vote, Legislative Action)
- title
- detailed summary
- source_url (for each item)

Output the result as a valid JSON array.

Prioritize recently introduced bills, active legislation, and congressional actions. Focus on bills that impact policy areas like healthcare, education, infrastructure, technology, and civil rights.

Search the following websites for source material:
- congress.gov
- npr.org
- politico.com
- thehill.com
- rollcall.com
- cnn.com

Fetch only news and legislation published in the last 14 days and exclude duplicates and outdated items.`;

        console.log(`🔍 Querying Perplexity for Congressional news`);

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY!}`
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: 'You are a precise legislative news aggregator. Always return valid JSON arrays.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.2,
            max_tokens: 2000,
            search_domain_filter: ['congress.gov', 'npr.org', 'politico.com', 'thehill.com', 'rollcall.com', 'cnn.com'],
            search_recency_filter: 'month'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️  Perplexity API error: ${response.status} - ${errorText}`);
          return [];
        }

        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content || '';

        // Extract JSON array from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.warn(`⚠️  Failed to extract JSON from Perplexity response`);
          return [];
        }

        const recentArticles = JSON.parse(jsonMatch[0]);
        console.log(`✅ Fetched ${recentArticles.length} recent legislative news items from Perplexity`);

        // If we have few or no recent bills, fetch an older bill to add variety
        let olderArticles = [];
        if (recentArticles.length < 3) {
          console.log(`📊 Fetching older bills to supplement recent news...`);

          const olderPrompt = `Give me 2 notable U.S. Congressional bills or legislative actions from 30-90 days ago that are still relevant and in active debate. For each item, include:
- date
- type (e.g., Bill Introduction, Committee Hearing, Floor Vote, Legislative Action)
- title
- detailed summary
- source_url (for each item)

Output the result as a valid JSON array.

Focus on bills that impact policy areas like healthcare, education, infrastructure, technology, and civil rights.`;

          try {
            const olderResponse = await fetch('https://api.perplexity.ai/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY!}`
              },
              body: JSON.stringify({
                model: 'sonar',
                messages: [
                  { role: 'system', content: 'You are a precise legislative news aggregator. Always return valid JSON arrays.' },
                  { role: 'user', content: olderPrompt }
                ],
                temperature: 0.3,
                max_tokens: 2000,
                search_domain_filter: ['congress.gov', 'npr.org', 'politico.com', 'thehill.com', 'rollcall.com'],
                search_recency_filter: 'month'
              })
            });

            if (olderResponse.ok) {
              const olderData = await olderResponse.json() as any;
              const olderContent = olderData.choices?.[0]?.message?.content || '';
              const olderJsonMatch = olderContent.match(/\[[\s\S]*\]/);

              if (olderJsonMatch) {
                olderArticles = JSON.parse(olderJsonMatch[0]);
                console.log(`✅ Fetched ${olderArticles.length} older legislative items to add variety`);
              }
            }
          } catch (error) {
            console.warn(`⚠️  Failed to fetch older bills: ${error}`);
          }
        }

        // Combine recent and older bills
        const allArticles = [...recentArticles, ...olderArticles];

        // Transform to consistent format
        return allArticles.map((item: any) => ({
          title: item.title,
          url: item.source_url,
          description: item.detailed_summary?.substring(0, 300),
          extraSnippets: [item.detailed_summary],
          thumbnail: null,
          topic: 'Congressional Legislation',
          date: item.date,
          type: item.type
        }));

      } catch (error: any) {
        console.warn(`⚠️  Failed to fetch legislative news: ${error.message}`);
        return [];
      }
    });

    // Step 2: Fetch personalized news using Perplexity API
    const news = await step.run('fetch-news', async () => {
      console.log(`📰 Fetching personalized news for interests: ${policyInterests.join(', ')}`);

      try {
        const allArticles = [];

        // Map policy interests to appropriate government domains
        const interestDomainMap: Record<string, string> = {
          'Education': 'ed.gov',
          'Healthcare': 'hhs.gov',
          'Environment': 'epa.gov',
          'Technology': 'fcc.gov',
          'Science': 'nsf.gov',
          'Energy': 'energy.gov',
          'Defense': 'defense.gov',
          'Agriculture': 'usda.gov',
          'Transportation': 'transportation.gov',
          'Housing': 'hud.gov'
        };

        for (const interest of policyInterests) {
          const govDomain = interestDomainMap[interest] || 'usa.gov';

          // Build domain list (add rollcall.com for all, edweek.org for Education)
          const baseDomains = [govDomain, 'npr.org', 'politico.com', 'thehill.com', 'rollcall.com'];
          const domainList = interest === 'Education'
            ? [...baseDomains, 'edweek.org']
            : baseDomains;

          const domainListText = domainList.map(d => `- ${d}`).join('\n');

          const prompt = `Give me an extended summary (5 items) of the latest U.S. ${interest.toLowerCase()} policy and legislation from the past 7 days. For each item, include:
- date
- type (e.g., Federal Regulation, Legal Ruling, Congressional Oversight, Official Statement, Legislative Agenda)
- title
- detailed summary
- source_url (for each item)

Output the result as a valid JSON array.

Search only the following websites for source material:
${domainListText}

Fetch only news and policy published in the last 7 days and exclude duplicates and outdated items.`;

          console.log(`🔍 Querying Perplexity for: "${interest}"`);

          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY!}`
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [
                {
                  role: 'system',
                  content: 'You are a precise policy news aggregator. Always return valid JSON arrays with complete source URLs.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.2,
              max_tokens: 2000,
              search_domain_filter: domainList,
              search_recency_filter: 'week',
              return_images: true,
              image_domain_filter: domainList,
              image_format_filter: ['jpeg', 'png', 'webp']
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.warn(`⚠️  Perplexity API error for "${interest}": ${response.status}`);
            console.warn(`   Error details: ${errorText.substring(0, 200)}`);
            continue;
          }

          const data = await response.json() as any;
          const content = data.choices?.[0]?.message?.content || '';

          // Extract images from Perplexity response (if available)
          const images = data.images || [];
          if (images.length > 0) {
            console.log(`   🖼️  Found ${images.length} images from Perplexity for "${interest}"`);
            console.log(`      First image: ${images[0]?.image_url?.substring(0, 80)}...`);
          }

          // Extract JSON array from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            console.warn(`⚠️  Failed to extract JSON for "${interest}"`);
            continue;
          }

          const items = JSON.parse(jsonMatch[0]);
          console.log(`   ✅ Found ${items.length} items for "${interest}"`);

          // Transform to consistent format with first image as thumbnail
          const articles = items.map((item: any, index: number) => ({
            title: item.title,
            url: item.source_url,
            description: item.detailed_summary?.substring(0, 200),
            extraSnippets: [item.detailed_summary],
            topic: interest,
            thumbnail: index === 0 && images.length > 0 ? images[0]?.image_url : null,
            date: item.date,
            type: item.type,
            image: images[index]?.image_url || null
          }));

          allArticles.push(...articles);
        }

        // Remove duplicates by URL
        const uniqueArticles = Array.from(
          new Map(allArticles.map(a => [a.url, a])).values()
        );

        console.log(`✅ Fetched ${uniqueArticles.length} total policy news items (${policyInterests.length} topics queried)`);
        if (uniqueArticles.length > 0) {
          console.log(`   First article: ${uniqueArticles[0].title}`);
        }
        return uniqueArticles;
      } catch (error: any) {
        console.warn(`⚠️  Failed to fetch news: ${error.message}`);
        console.warn(`   Continuing brief generation without news articles`);
        return [];
      }
    });

    // Step 3: Generate dialogue script with Claude
    const script = await step.run('generate-script', async () => {
      console.log(`🤖 Generating dialogue script with Claude...`);

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

      const systemPrompt = `You are a podcast script writer for HakiVo.
Create natural dialogue between Sarah and James covering these bills and news.

Guidelines:
- NPR-quality conversational tone
- Plain language, no jargon
- 15-20 dialogue lines (5-7 minutes of audio)
- Alternate speakers naturally
- Include intro, bill discussion, outro

Return JSON array:
[
  {"host": "sarah", "text": "..."},
  {"host": "james", "text": "..."}
]`;

      const userPrompt = `Create dialogue covering:

LEGISLATIVE NEWS:
${bills.map((b: any, i: number) => {
  let text = `${i+1}. ${b.title}`;
  if (b.description) text += `\n   ${b.description}`;
  if (b.extraSnippets?.length > 0) {
    text += `\n   Key points: ${b.extraSnippets.join(' | ')}`;
  }
  return text;
}).join('\n\n')}

POLICY NEWS (with key quotes and context):
${news.slice(0, 4).map((a: any, i: number) => {
  let newsText = `${i+1}. [${a.topic.toUpperCase()}] ${a.title}`;
  if (a.description) newsText += `\n   Summary: ${a.description}`;
  if (a.extraSnippets?.length > 0) {
    newsText += `\n   Key quotes: ${a.extraSnippets.slice(0, 2).map((s: string) => `"${s.substring(0, 150)}..."`).join(' | ')}`;
  }
  return newsText;
}).join('\n\n')}

Generate the complete dialogue as JSON array.`;

      const msgResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
        ]
      });

      const responseText = msgResponse.content[0].type === 'text'
        ? msgResponse.content[0].text
        : '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from Claude response');
      }

      const dialogue = JSON.parse(jsonMatch[0]);
      console.log(`✅ Generated script with ${dialogue.length} dialogue turns`);
      return dialogue;
    });

    // Step 4: Generate audio and upload (combined to avoid Inngest size limits)
    const result = await step.run('generate-audio-and-upload', async () => {
      console.log(`🎙️  Generating audio with ElevenLabs (may take 10-15 min)...`);

      const inputs = script.map((line: any) => ({
        text: line.text,
        voice_id: line.host === 'sarah'
          ? process.env.ELEVENLABS_SARAH_VOICE_ID!
          : process.env.ELEVENLABS_JAMES_VOICE_ID!
      }));

      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_192',
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY!
          },
          body: JSON.stringify({
            inputs,
            model_id: 'eleven_v3'
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(`✅ Generated audio (${Math.round(arrayBuffer.byteLength / 1024)}KB)`);

      // Immediately upload to Vultr (don't serialize between steps)
      console.log(`☁️  Uploading to Vultr CDN and saving to database...`);

      // Convert ArrayBuffer to Uint8Array for S3 upload
      const buffer = new Uint8Array(arrayBuffer);

      // Upload to Vultr
      const s3 = new S3Client({
        endpoint: process.env.VULTR_STORAGE_ENDPOINT!,
        region: 'auto',
        credentials: {
          accessKeyId: process.env.VULTR_ACCESS_KEY!,
          secretAccessKey: process.env.VULTR_SECRET_KEY!
        }
      });

      const key = `podcasts/${userId}/daily/${Date.now()}.mp3`;

      await s3.send(new PutObjectCommand({
        Bucket: 'civic-pulse-podcasts',
        Key: key,
        Body: buffer,
        ContentType: 'audio/mpeg',
        CacheControl: 'public, max-age=31536000',
        Metadata: {
          userId: userId,
          briefId: `brief-${Date.now()}`,
          generatedAt: new Date().toISOString()
        }
      }));

      const audioUrl = `${process.env.VULTR_CDN_URL}/${key}`;
      console.log(`✅ Uploaded to: ${audioUrl}`);

      // Generate written digest
      console.log(`📝 Generating written digest...`);
      const writtenDigest = `# Daily Civic Brief - ${new Date().toLocaleDateString()}

## Legislative News

${bills.map((b: any) => `### ${b.title}
${b.description || ''}

${b.extraSnippets?.length > 0 ? `**Key Points:**
${b.extraSnippets.slice(0, 2).map((s: string) => `- ${s}`).join('\n')}
` : ''}
**Source:** ${b.url}
`).join('\n')}

## Policy News & Analysis

${news.slice(0, 6).map((a: any) => `### [${a.topic.toUpperCase()}] ${a.title}
${a.description || ''}

${a.extraSnippets?.length > 0 ? `**Key Points:**
${a.extraSnippets.slice(0, 2).map((s: string) => `- ${s}`).join('\n')}
` : ''}
**Source:** ${a.url}
`).join('\n')}

---
*Generated by HakiVo - Your AI Civic Engagement Assistant*
`;

      // Use image from Perplexity response (much simpler than og:image extraction!)
      let featureImageUrl = null;
      try {
        if (news.length > 0) {
          // Get first image from first article (Perplexity returns images)
          const firstArticle = news[0];
          if (firstArticle.image || firstArticle.thumbnail) {
            const imageUrl = firstArticle.image || firstArticle.thumbnail;
            console.log(`🖼️  Using Perplexity-provided image: ${imageUrl.substring(0, 80)}...`);
            featureImageUrl = imageUrl;
          } else {
            console.log(`ℹ️  No image available from Perplexity for first article`);
          }
        } else {
          console.log(`ℹ️  No news articles available for feature image`);
        }
      } catch (error: any) {
        console.warn(`⚠️  Failed to extract feature image: ${error.message}`);
      }

      console.log(`✅ Written digest generated (${writtenDigest.length} chars)`);

      // Generate creative headline and title
      console.log(`✨ Generating creative headline...`);
      let headline = 'Daily Civic Brief';
      let title = `${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

      try {
        // Get top 2 stories for headline generation
        const topStories = [
          ...bills.slice(0, 1).map((b: any) => ({ type: 'bill', title: b.title, topic: 'Congress' })),
          ...news.slice(0, 1).map((n: any) => ({ type: 'news', title: n.title, topic: n.topic }))
        ];

        const headlinePrompt = `Based on these top civic stories, generate a catchy, engaging headline (5-8 words) and a subtitle (8-12 words) for today's daily brief:

${topStories.map((s, i) => `${i + 1}. [${s.topic}] ${s.title}`).join('\n')}

Format:
HEADLINE: [catchy 5-8 word headline]
SUBTITLE: [informative 8-12 word subtitle]

The headline should be engaging, action-oriented, and capture the most important story. The subtitle should provide context.`;

        const headlineResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            temperature: 0.8,
            messages: [{
              role: 'user',
              content: headlinePrompt
            }]
          })
        });

        if (headlineResponse.ok) {
          const headlineData = await headlineResponse.json() as any;
          const content = headlineData.content?.[0]?.text || '';

          const headlineMatch = content.match(/HEADLINE:\s*(.+?)(?:\n|$)/i);
          const subtitleMatch = content.match(/SUBTITLE:\s*(.+?)(?:\n|$)/i);

          if (headlineMatch) {
            headline = headlineMatch[1].trim();
            console.log(`   ✅ Generated headline: "${headline}"`);
          }
          if (subtitleMatch) {
            title = subtitleMatch[1].trim();
            console.log(`   ✅ Generated title: "${title}"`);
          }
        }
      } catch (error: any) {
        console.warn(`⚠️  Failed to generate headline: ${error.message}`);
        // Keep default values
      }

      // Save to database via Next.js API endpoint
      const briefId = `brief-${Date.now()}`;
      const nextjsApiUrl = process.env.NEXTJS_API_URL || 'http://localhost:3000';

      console.log(`💾 Saving brief to database via Next.js API: ${briefId}`);

      try {
        const saveResponse = await fetch(`${nextjsApiUrl}/api/briefs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            briefId,
            userId,
            audioUrl,
            writtenDigest,
            featureImageUrl,
            policyAreas: policyInterests,
            duration: 300,
            headline,
            title,
          }),
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          console.warn(`⚠️  Failed to save brief to database: ${saveResponse.status} - ${errorText}`);
          console.warn(`   Brief audio is available at: ${audioUrl}`);
        } else {
          const result = await saveResponse.json();
          console.log(`✅ Brief saved successfully: ${result.briefId}`);
        }
      } catch (error: any) {
        console.warn(`⚠️  Database save error: ${error.message}`);
        console.warn(`   Brief audio is available at: ${audioUrl}`);
      }

      return {
        briefId,
        audioUrl,
        featureImageUrl,
        writtenDigest,
        duration: 300
      };
    });

    console.log(`\n✅ Brief generation completed!`);
    console.log(`   Brief ID: ${result.briefId}`);
    console.log(`   Audio URL: ${result.audioUrl}`);
    if (result.featureImageUrl) {
      console.log(`   Feature Image: ${result.featureImageUrl}`);
    }
    console.log(`   Written Digest: ${result.writtenDigest.length} characters`);

    return result;
  }
);
