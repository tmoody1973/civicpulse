#!/usr/bin/env npx tsx

/**
 * Trigger brief generation via Inngest HTTP API
 * This sends an event to the running Inngest dev server
 */

async function triggerBrief() {
  console.log('🚀 Triggering brief generation via Inngest...\n');

  const payload = {
    name: 'brief/generate',
    data: {
      userId: 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4',
      userEmail: 'test@example.com',
      userName: 'Test User',
      policyInterests: ['Education', 'Science']
    }
  };

  try {
    const response = await fetch('http://localhost:8288/e/brief/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Failed to trigger event:', response.status, text);
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Event triggered successfully!');
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    console.log('\n📍 Check Inngest Dev Server: http://localhost:8288');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

triggerBrief();
