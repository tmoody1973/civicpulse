/**
 * Script Generator Worker (Step 3 of 5)
 *
 * Reads bills and news from SmartMemory, generates dialogue script with Claude
 * Stores script in SmartMemory, sends to audio-queue
 */

import { Each, Message } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

interface ScriptJob {
  jobId: string;
  userId: string;
}

export default class extends Each<ScriptJob, Env> {
  async process(message: Message<ScriptJob>): Promise<void> {
    console.log(`🤖 Script Generator: Processing job ${message.body.jobId}`);

    const { jobId } = message.body;

    try {
      // Read bills and news from bucket storage
      console.log('   Reading data from bucket storage...');
      const billsObj = await this.env.BRIEF_JOB_STORAGE.get(`job:${jobId}:bills`);
      const newsObj = await this.env.BRIEF_JOB_STORAGE.get(`job:${jobId}:news`);

      if (!billsObj || !newsObj) {
        throw new Error('Bills or news data not found in bucket storage');
      }

      const billsJson = await billsObj.text();
      const newsJson = await newsObj.text();
      const bills = JSON.parse(billsJson);
      const news = JSON.parse(newsJson);
      console.log(`   ✅ Loaded ${bills.length} bills, ${news.length} news articles`);

      // Generate script with Claude
      console.log('   Generating dialogue script with Claude...');
      const script = await this.generateScript(bills, news);
      console.log(`   ✅ Generated script with ${script.length} dialogue turns`);

      // Store script in bucket storage
      await this.env.BRIEF_JOB_STORAGE.put(`job:${jobId}:script`, JSON.stringify(script));
      console.log('   ✅ Stored script in bucket storage');

      // Clean up bills and news (no longer needed)
      await this.env.BRIEF_JOB_STORAGE.delete(`job:${jobId}:bills`);
      await this.env.BRIEF_JOB_STORAGE.delete(`job:${jobId}:news`);

      // Send to audio-queue
      await this.env.AUDIO_QUEUE.send({ jobId }, { contentType: 'json' });
      console.log('   ✅ Sent to audio-queue');

      message.ack();

    } catch (error: any) {
      console.error(`❌ Script generator failed: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      message.retry({ delaySeconds: 120 });
    }
  }

  private async generateScript(bills: any[], news: any[]): Promise<any[]> {
    // Lazy load Anthropic SDK
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: this.env.ANTHROPIC_API_KEY });

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

BILLS:
${bills.map((b, i) => `${i+1}. ${b.title} - ${(b.summary || b.plain_english_summary || 'No summary').substring(0, 300)}`).join('\n')}

NEWS:
${news.slice(0, 3).map((a, i) => `${i+1}. ${a.title}`).join('\n')}

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

    return JSON.parse(jsonMatch[0]);
  }
}

export interface Body extends ScriptJob {}
