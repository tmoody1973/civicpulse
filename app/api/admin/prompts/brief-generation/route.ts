/**
 * Admin API: Manage Brief Generation Prompt
 *
 * GET: Retrieve current brief generation prompt
 * PUT: Update brief generation prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';

// Default prompt (fallback)
const DEFAULT_PROMPT = `Create a personalized daily congressional brief for a user interested in: {policy_areas}.

**3-PART STRUCTURE (8-12 minutes total):**

**PART 1 - BREAKING NEWS (2-3 min):**
{breaking_news}

**PART 2 - TOP STORIES (5-7 min):**
Cover 3-5 bills/news stories:
{top_stories}

**PART 3 - QUICK HITS (1-2 min):**
{quick_hits}

**REQUIREMENTS:**
- Natural, conversational NPR-style dialogue between two hosts
- Target 8-12 minutes of audio (approximately 6000-9000 characters total)
- Generate 25-35 dialogue lines for natural conversation flow
- Each line should be 2-4 sentences MAX
- Use extra context snippets to add specific details, quotes, and facts for richer storytelling
- Hosts named Sarah (analytical) and James (conversational)
- Start with compelling hook, explain real-world impact, cite credible sources
- Include what's at stake for everyday people
- NO: political bias, technical jargon without explanation, promotional language
- Output strict JSON array format: [{"host": "sarah", "text": "..."}, ...]`;

export async function GET(req: NextRequest) {
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
    // For now, allow all authenticated users
    // TODO: Add admin role check

    // Get prompt from database
    const result = await executeQuery(
      `SELECT prompt_text, updated_at, updated_by FROM system_prompts WHERE prompt_key = 'brief_generation'`,
      'users'
    );

    if (result.rows.length === 0) {
      // Return default prompt if not found
      return NextResponse.json({
        success: true,
        prompt: DEFAULT_PROMPT,
        isDefault: true,
        updated_at: null,
        updated_by: null,
      });
    }

    return NextResponse.json({
      success: true,
      prompt: result.rows[0].prompt_text,
      isDefault: false,
      updated_at: result.rows[0].updated_at,
      updated_by: result.rows[0].updated_by,
    });

  } catch (error: any) {
    console.error('Error fetching brief generation prompt:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch prompt',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Update prompt in database (using UPSERT)
    await executeQuery(
      `INSERT OR REPLACE INTO system_prompts (prompt_key, prompt_text, updated_at, updated_by, created_at)
       VALUES (
         'brief_generation',
         '${prompt.replace(/'/g, "''")}',
         CURRENT_TIMESTAMP,
         '${user.email}',
         COALESCE((SELECT created_at FROM system_prompts WHERE prompt_key = 'brief_generation'), CURRENT_TIMESTAMP)
       )`,
      'users'
    );

    console.log(`✅ Brief generation prompt updated by ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Prompt updated successfully',
      updated_by: user.email,
      updated_at: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error updating brief generation prompt:', error);

    return NextResponse.json(
      {
        error: 'Failed to update prompt',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
