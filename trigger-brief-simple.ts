#!/usr/bin/env npx tsx

import { inngest } from './src/inngest/client';

async function triggerBrief() {
  console.log('🚀 Triggering brief generation...\n');

  try {
    await inngest.send({
      name: 'brief/generate',
      data: {
        userId: 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4',
        userEmail: 'test@example.com',
        userName: 'Test User',
        policyInterests: ['Education', 'Science']
      }
    });

    console.log('✅ Event sent successfully!');
    console.log('📍 Check Inngest Dev Server: http://localhost:8288');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

triggerBrief();
