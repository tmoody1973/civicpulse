/**
 * Database Initialization Endpoint
 *
 * Creates all required tables and indexes
 */

import { NextResponse } from 'next/server';
import { initializeDatabase, isDatabaseInitialized } from '@/lib/db';

export async function POST() {
  try {
    console.log('🔧 Database initialization requested...');

    // Check if already initialized
    const isInitialized = await isDatabaseInitialized();

    if (isInitialized) {
      return NextResponse.json({
        success: true,
        message: 'Database already initialized',
        alreadyInitialized: true,
      });
    }

    // Initialize schema
    await initializeDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      alreadyInitialized: false,
    });
  } catch (error: any) {
    console.error('Failed to initialize database:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize database',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const isInitialized = await isDatabaseInitialized();

    return NextResponse.json({
      success: true,
      initialized: isInitialized,
    });
  } catch (error: any) {
    console.error('Failed to check database status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check database status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
