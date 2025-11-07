/**
 * Test script to add a job to the image-fetch queue
 */

import { imageQueue } from './lib/queue/image-queue';

async function test() {
  console.log('🧪 Adding test job to queue...');

  const job = await imageQueue.add('test-image', {
    articleId: 'test-123',
    articleUrl: 'https://example.com/article',
    title: 'Test Article',
    description: 'Testing image queue',
    keywords: ['test', 'technology'],
  });

  console.log(`✅ Job ${job.id} added to queue`);
  console.log('   Check worker logs to see if it processes this job');

  // Give worker time to pick up the job
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check job status
  const state = await job.getState();
  console.log(`📊 Job state: ${state}`);

  process.exit(0);
}

test();
