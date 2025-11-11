import { Handler } from '@netlify/functions';
import { inngest } from '../../src/inngest/client';

/**
 * Netlify Function: Trigger Brief Generation
 *
 * POST /api/trigger-brief
 *
 * Triggers an Inngest background job to generate a daily brief.
 * Used for manual testing and on-demand brief generation.
 */
export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'text/plain',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const {
      userId,
      userEmail,
      userName,
      state,
      district,
      policyInterests,
    } = body;

    if (!userId || !policyInterests || !Array.isArray(policyInterests)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: userId, policyInterests (array)',
        }),
      };
    }

    console.log(`[TriggerBrief] Sending event for user ${userId}`);

    // Send event to Inngest
    await inngest.send({
      name: 'brief/generate',
      data: {
        userId,
        userEmail,
        userName,
        state,
        district,
        policyInterests,
      },
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Brief generation started',
        userId,
      }),
    };
  } catch (error: any) {
    console.error('[TriggerBrief] Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to trigger brief generation',
        message: error.message,
      }),
    };
  }
};
