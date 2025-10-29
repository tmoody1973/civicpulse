/**
 * Bill Tracking API
 *
 * POST /api/bills/track - Track a bill
 * DELETE /api/bills/track - Untrack a bill
 */

import { NextRequest, NextResponse } from 'next/server';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

/**
 * Track a bill for a user
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, billId } = await req.json();

    if (!userId || !billId) {
      return NextResponse.json(
        { error: 'userId and billId are required' },
        { status: 400 }
      );
    }

    // Insert into user_bills table (track)
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'user_bills',
        query: `
          INSERT INTO user_bills (user_id, bill_id, tracked_at)
          VALUES ('${userId}', '${billId}', datetime('now'))
          ON CONFLICT(user_id, bill_id) DO UPDATE SET tracked_at = datetime('now')
        `
      })
    });

    if (!response.ok) {
      throw new Error('Failed to track bill');
    }

    console.log(`✅ User ${userId} tracked bill ${billId}`);

    return NextResponse.json({
      success: true,
      message: 'Bill tracked successfully'
    });

  } catch (error: any) {
    console.error('Track bill error:', error);
    return NextResponse.json(
      { error: 'Failed to track bill', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Untrack a bill for a user
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const billId = searchParams.get('billId');

    if (!userId || !billId) {
      return NextResponse.json(
        { error: 'userId and billId are required' },
        { status: 400 }
      );
    }

    // Delete from user_bills table (untrack)
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'user_bills',
        query: `
          DELETE FROM user_bills
          WHERE user_id = '${userId}' AND bill_id = '${billId}'
        `
      })
    });

    if (!response.ok) {
      throw new Error('Failed to untrack bill');
    }

    console.log(`✅ User ${userId} untracked bill ${billId}`);

    return NextResponse.json({
      success: true,
      message: 'Bill untracked successfully'
    });

  } catch (error: any) {
    console.error('Untrack bill error:', error);
    return NextResponse.json(
      { error: 'Failed to untrack bill', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get tracked bills for a user
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get all tracked bill IDs for user
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'user_bills',
        query: `
          SELECT bill_id FROM user_bills
          WHERE user_id = '${userId}'
        `
      })
    });

    const data = await response.json();
    const trackedBillIds = (data.rows || []).map((row: any) => row.bill_id);

    return NextResponse.json({
      success: true,
      trackedBills: trackedBillIds
    });

  } catch (error: any) {
    console.error('Get tracked bills error:', error);
    return NextResponse.json(
      { error: 'Failed to get tracked bills', message: error.message },
      { status: 500 }
    );
  }
}
