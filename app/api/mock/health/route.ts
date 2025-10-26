import { NextResponse } from 'next/server';

/**
 * Mock health check endpoint
 * Temporary replacement for Raindrop backend while platform issue is resolved
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'civic-pulse-mock',
    version: '0.1.0',
    note: 'Using Next.js mock backend - Raindrop platform issue pending resolution'
  });
}
