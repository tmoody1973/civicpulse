/**
 * Widget Preferences API
 *
 * Handles dashboard widget preferences (show/hide, reorder) using SmartMemory
 * Stores in ANALYTICS database (SmartSQL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@raindrop-platform/client';
import type { WidgetPreferences } from '@/lib/types/dashboard-widgets';
import { getDefaultWidgetPreferences } from '@/lib/types/dashboard-widgets';

// GET - Fetch widget preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // Query ANALYTICS database for widget preferences
    const result = await sql`
      SELECT widget_preferences
      FROM user_profiles
      WHERE email = ${userEmail}
    `;

    if (result.rows.length === 0 || !result.rows[0].widget_preferences) {
      // Return defaults if no preferences found
      return NextResponse.json({
        success: true,
        preferences: getDefaultWidgetPreferences(),
        message: 'Using default widget preferences',
      });
    }

    const preferences = JSON.parse(result.rows[0].widget_preferences) as WidgetPreferences;

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error fetching widget preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch preferences',
      },
      { status: 500 }
    );
  }
}

// POST - Save widget preferences
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const preferences: WidgetPreferences = await req.json();

    // Validate preferences structure
    if (!preferences.widgets || typeof preferences.widgets !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid preferences format' },
        { status: 400 }
      );
    }

    // Update or insert widget preferences
    await sql`
      INSERT INTO user_profiles (email, widget_preferences, updated_at)
      VALUES (${userEmail}, ${JSON.stringify(preferences)}, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE
      SET widget_preferences = ${JSON.stringify(preferences)},
          updated_at = CURRENT_TIMESTAMP
    `;

    console.log(`✅ Widget preferences saved for ${userEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Widget preferences saved',
    });
  } catch (error) {
    console.error('Error saving widget preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save preferences',
      },
      { status: 500 }
    );
  }
}
