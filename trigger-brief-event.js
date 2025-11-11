const fetch = require('node-fetch');

async function triggerBrief() {
  const event = {
    name: 'brief/generate',
    data: {
      userId: 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4',
      userEmail: 'test@example.com',
      userName: 'Test User',
      state: 'CA',
      district: '12',
      policyInterests: ['healthcare', 'education']
    }
  };

  const response = await fetch('http://localhost:8288/e/test-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  const result = await response.json();
  console.log('✅ Event sent:', JSON.stringify(result, null, 2));
}

triggerBrief().catch(console.error);
