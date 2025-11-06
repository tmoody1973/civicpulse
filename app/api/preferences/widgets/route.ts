/**
 * Widget Preferences API
 *
 * Handles dashboard widget preferences (show/hide, reorder)
 * Stores in users table widget_preferences column as JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';
import type { WidgetPreferences } from '@/lib/types/dashboard-widgets';
import { getDefaultWidgetPreferences } from '@/lib/types/dashboard-widgets';

// GET - Fetch widget preferences
export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log(`📊 Fetching widget preferences for user: ${user.id}`);

    // Query users table for widget_preferences column
    const result = await executeQuery(
      `SELECT widget_preferences FROM users WHERE id = '${user.id}' LIMIT 1`,
      'users'
    );

    // If no user found or no preferences set, return defaults
    if (!result.rows || result.rows.length === 0 || !result.rows[0].widget_preferences) {
      console.log(`⚠️ No preferences found for user ${user.id}, using defaults`);
      return NextResponse.json({
        success: true,
        preferences: getDefaultWidgetPreferences(),
        message: 'Using default widget preferences',
      });
    }

    // Parse JSON preferences from database
    const preferencesJson = result.rows[0].widget_preferences as string;
    const storedPreferences = JSON.parse(preferencesJson) as WidgetPreferences;

    // Merge with defaults to add any new widgets that were added after user's preferences were saved
    const defaults = getDefaultWidgetPreferences();
    const mergedPreferences: WidgetPreferences = {
      ...storedPreferences,
      widgets: {
        ...defaults.widgets, // Start with all defaults
        ...storedPreferences.widgets, // Override with stored preferences
      },
    };

    // Ensure all default widgets are present (for new widgets added to the platform)
    Object.keys(defaults.widgets).forEach((widgetId) => {
      if (!mergedPreferences.widgets[widgetId as keyof typeof mergedPreferences.widgets]) {
        mergedPreferences.widgets[widgetId as keyof typeof mergedPreferences.widgets] =
          defaults.widgets[widgetId as keyof typeof defaults.widgets];
      }
    });

    console.log(`✅ Widget preferences loaded for user ${user.id}`);

    return NextResponse.json({
      success: true,
      preferences: mergedPreferences,
    });
  } catch (error) {
    console.error('Error fetching widget preferences:', error);

    // Return defaults on error
    return NextResponse.json({
      success: true,
      preferences: getDefaultWidgetPreferences(),
      message: 'Error loading preferences, using defaults',
    });
  }
}

// POST - Save widget preferences
export async function POST(req: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const preferences: WidgetPreferences = await req.json();

    // Validate preferences structure
    if (!preferences.widgets || typeof preferences.widgets !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid preferences format' },
        { status: 400 }
      );
    }

    console.log(`💾 Saving widget preferences for user: ${user.id}`);

    // Convert preferences to JSON string for storage
    const preferencesJson = JSON.stringify(preferences);

    // Update users table widget_preferences column
    await executeQuery(
      `UPDATE users
       SET widget_preferences = '${preferencesJson.replace(/'/g, "''")}'
       WHERE id = '${user.id}'`,
      'users'
    );

    console.log(`✅ Updated widget preferences for ${user.id}`);

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
