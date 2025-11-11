import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

interface BriefJobData {
  userId: string;
  userEmail: string;
  userName?: string | null;
  state?: string | null;
  district?: string | null;
  policyInterests: string[];
  forceRegenerate: boolean;
}

export default class extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle test brief request
    if (url.pathname === '/test-brief') {
      try {
        const testJob: BriefJobData = {
          userId: 'test-user-123',
          userEmail: 'test@example.com',
          userName: 'Test User',
          state: 'CA',
          district: '12',
          policyInterests: ['Healthcare', 'Education', 'Climate'],
          forceRegenerate: false
        };

        console.log('📤 Sending test message to brief-queue:', JSON.stringify(testJob, null, 2));

        // Send message to brief-queue
        await this.env.BRIEF_QUEUE.send(testJob, {
          contentType: 'json'
        });

        return new Response(JSON.stringify({
          success: true,
          message: 'Test message sent to brief-queue',
          jobData: testJob
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('❌ Failed to send test message:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle test news request
    if (url.pathname === '/test-news') {
      try {
        const testJob = {
          userId: 'test-user-456',
          userEmail: 'test@example.com',
          interests: ['Technology', 'Politics'],
          state: 'NY',
          district: '15',
          limit: 10,
          forceRefresh: false
        };

        console.log('📤 Sending test message to news-queue:', JSON.stringify(testJob, null, 2));

        await this.env.NEWS_QUEUE.send(testJob, {
          contentType: 'json'
        });

        return new Response(JSON.stringify({
          success: true,
          message: 'Test message sent to news-queue',
          jobData: testJob
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('❌ Failed to send test message:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Default response with instructions
    return new Response(JSON.stringify({
      message: 'Test service ready',
      endpoints: {
        '/test-brief': 'Send test message to brief-queue',
        '/test-news': 'Send test message to news-queue'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
