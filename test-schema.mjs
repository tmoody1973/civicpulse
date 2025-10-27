// Quick test to verify database schema
import fetch from 'node-fetch';

const BACKEND_URL = 'https://civic-pulse-bafyh-a1.httpsapi.com';

async function testSchema() {
  try {
    // Test if tables exist by querying sqlite_master
    const response = await fetch(`${BACKEND_URL}/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      })
    });

    const data = await response.json();
    console.log('Database tables:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSchema();
