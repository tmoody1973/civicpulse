/**
 * Generate a valid test session token for local testing
 *
 * Usage:
 *   npx tsx scripts/generate-test-session.ts [email] [userId]
 *
 * Example:
 *   npx tsx scripts/generate-test-session.ts test@hakivo.com test_123
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'civic-pulse-secret-change-in-production';

// Get email and userId from command line args
const email = process.argv[2] || 'test@hakivo.com';
const userId = process.argv[3] || 'test_user_' + Date.now();

// Generate session token
const sessionToken = jwt.sign(
  { userId, email },
  JWT_SECRET,
  { expiresIn: '7d' }
);

console.log('\n🎟️  Test Session Token Generated');
console.log('='.repeat(50));
console.log('Email:', email);
console.log('User ID:', userId);
console.log('Expires:', '7 days');
console.log('='.repeat(50));
console.log('\n📋 Cookie Header:');
console.log(`Cookie: civic_pulse_session=${sessionToken}`);
console.log('\n💡 Use in curl:');
console.log(`curl -H "Cookie: civic_pulse_session=${sessionToken}" ...`);
console.log('');
