/**
 * Admin API: Initialize Database Tables
 *
 * Creates system tables if they don't exist
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    // Check authentication and admin status
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // In production, check if user is admin
    // TODO: Add admin role check

    // Create system_prompts table
    await executeQuery(
      `CREATE TABLE IF NOT EXISTS system_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_key TEXT NOT NULL UNIQUE,
        prompt_text TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      'users'
    );

    console.log('✅ system_prompts table created successfully');

    return NextResponse.json({
      success: true,
      message: 'Database tables initialized successfully',
      tables: ['system_prompts'],
    });

  } catch (error: any) {
    console.error('Error initializing database:', error);

    return NextResponse.json(
      {
        error: 'Failed to initialize database',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
