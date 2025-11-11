/**
 * Data Fetcher Worker (Step 2 of 5)
 *
 * Fetches bills from civic-db and news from Brave Search
 * Stores results in SmartMemory, sends to script-queue
 */

import { Each, Message } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

interface DataFetchJob {
  jobId: string;
  userId: string;
  policyInterests: string[];
  state?: string | null;
  district?: string | null;
}

export default class extends Each<DataFetchJob, Env> {
  async process(message: Message<DataFetchJob>): Promise<void> {
    console.log(`📊 Data Fetcher: Processing job ${message.body.jobId}`);

    const { jobId, policyInterests, userId } = message.body;

    try {
      // Fetch bills from civic-db (optimized query)
      console.log('   Fetching bills from civic-db...');
      const bills = await this.fetchBills(policyInterests);
      console.log(`   ✅ Fetched ${bills.length} bills`);

      // Fetch news from Brave Search
      console.log('   Fetching news from Brave Search...');
      const news = await this.fetchNews(policyInterests);
      console.log(`   ✅ Fetched ${news.length} news articles`);

      // Store in bucket storage
      await this.env.BRIEF_JOB_STORAGE.put(`job:${jobId}:bills`, JSON.stringify(bills));
      await this.env.BRIEF_JOB_STORAGE.put(`job:${jobId}:news`, JSON.stringify(news));
      console.log('   ✅ Stored data in bucket storage');

      // Send to script-queue
      await this.env.SCRIPT_QUEUE.send({ jobId, userId }, { contentType: 'json' });
      console.log('   ✅ Sent to script-queue');

      message.ack();

    } catch (error: any) {
      console.error(`❌ Data fetcher failed: ${error.message}`);
      message.retry({ delaySeconds: 60 });
    }
  }

  private async fetchBills(interests: string[]): Promise<any[]> {
    const interestConditions = interests.map(interest =>
      `issue_categories LIKE '%${interest}%'`
    ).join(' OR ');

    const query = `
      SELECT
        id,
        title,
        summary,
        plain_english_summary,
        issue_categories,
        impact_score,
        latest_action_date,
        bill_number
      FROM bills
      WHERE (${interestConditions})
      AND latest_action_date >= datetime('now', '-30 days')
      ORDER BY impact_score DESC
      LIMIT 2
    `;

    const result = await this.env.HAKIVO_DB.prepare(query).all();
    return result.results || [];
  }

  private async fetchNews(interests: string[]): Promise<any[]> {
    const query = interests.join(' OR ') + ' news legislation';

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&freshness=pw`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.env.BRAVE_SEARCH_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const results = data.web?.results || [];

    // Keep only essential fields
    return results.map((article: any) => ({
      title: article.title || article.name,
      url: article.url,
      description: article.description?.substring(0, 200)
    }));
  }
}

export interface Body extends DataFetchJob {}
