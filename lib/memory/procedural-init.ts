/**
 * Procedural Memory Initialization
 * Phase 1: Foundation & Memory System
 *
 * Initializes SmartMemory with system prompts and templates
 * Procedural memory = "how to do things" - consistent AI behavior
 */

import type { SmartMemory } from '@liquidmetal-ai/raindrop-framework';
import {
  RECOMMENDATION_PROMPTS,
  PERSONALIZATION_TEMPLATES,
  PODCAST_SCRIPT_TEMPLATES,
  CHAT_ASSISTANT_PROMPTS,
  ANALYTICS_PROMPTS,
  SYSTEM_MESSAGES,
} from './prompts';

/**
 * Initialize procedural memory with all system prompts and templates
 *
 * This should be called once when initializing a new user's memory context
 *
 * @param memory - SmartMemory instance
 * @param userId - User ID (for logging/tracking purposes)
 * @param force - Force reinitialization even if already initialized
 */
export async function initializeProceduralMemory(
  memory: SmartMemory,
  userId?: string,
  force: boolean = false
): Promise<void> {
  try {
    console.log(`Initializing procedural memory${userId ? ` for user ${userId}` : ''}...`);

    // Get procedural memory interface
    const proceduralMemory = await memory.getProceduralMemory();

    // Check if already initialized (unless force is true)
    if (!force) {
      const existingInit = await proceduralMemory.getProcedure('system_initialized');
      if (existingInit) {
        console.log('Procedural memory already initialized, skipping...');
        return;
      }
    }

    // Store recommendation prompts
    await proceduralMemory.putProcedure(
      'prompt_recommendation_bills',
      RECOMMENDATION_PROMPTS.billRecommendation
    );

    await proceduralMemory.putProcedure(
      'prompt_recommendation_news',
      RECOMMENDATION_PROMPTS.newsRecommendation
    );

    await proceduralMemory.putProcedure(
      'prompt_recommendation_podcast_topics',
      RECOMMENDATION_PROMPTS.podcastTopics
    );

    // Store personalization templates
    await proceduralMemory.putProcedure(
      'template_hero_greeting',
      PERSONALIZATION_TEMPLATES.heroGreeting
    );

    await proceduralMemory.putProcedure(
      'template_rep_activity_summary',
      PERSONALIZATION_TEMPLATES.repActivitySummary
    );

    await proceduralMemory.putProcedure(
      'template_bill_relevance',
      PERSONALIZATION_TEMPLATES.billRelevance
    );

    await proceduralMemory.putProcedure(
      'template_engagement_nudge_new',
      PERSONALIZATION_TEMPLATES.engagementNudge.newUser
    );

    await proceduralMemory.putProcedure(
      'template_engagement_nudge_returning',
      PERSONALIZATION_TEMPLATES.engagementNudge.returningUser
    );

    await proceduralMemory.putProcedure(
      'template_engagement_nudge_engaged',
      PERSONALIZATION_TEMPLATES.engagementNudge.highlyEngaged
    );

    // Store podcast script templates
    await proceduralMemory.putProcedure(
      'template_podcast_daily_opening',
      JSON.stringify(PODCAST_SCRIPT_TEMPLATES.dailyOpening)
    );

    await proceduralMemory.putProcedure(
      'template_podcast_weekly_opening',
      JSON.stringify(PODCAST_SCRIPT_TEMPLATES.weeklyOpening)
    );

    await proceduralMemory.putProcedure(
      'template_podcast_bill_intro',
      JSON.stringify(PODCAST_SCRIPT_TEMPLATES.billIntro)
    );

    await proceduralMemory.putProcedure(
      'template_podcast_rep_activity',
      JSON.stringify(PODCAST_SCRIPT_TEMPLATES.repActivity)
    );

    await proceduralMemory.putProcedure(
      'template_podcast_daily_closing',
      JSON.stringify(PODCAST_SCRIPT_TEMPLATES.dailyClosing)
    );

    await proceduralMemory.putProcedure(
      'template_podcast_weekly_closing',
      JSON.stringify(PODCAST_SCRIPT_TEMPLATES.weeklyClosing)
    );

    // Store chat assistant prompts
    await proceduralMemory.putProcedure(
      'prompt_chat_system',
      CHAT_ASSISTANT_PROMPTS.systemPrompt
    );

    await proceduralMemory.putProcedure(
      'prompt_chat_suggested_questions',
      JSON.stringify(CHAT_ASSISTANT_PROMPTS.suggestedQuestions)
    );

    await proceduralMemory.putProcedure(
      'prompt_chat_response_format',
      CHAT_ASSISTANT_PROMPTS.responseFormat
    );

    // Store analytics prompts
    await proceduralMemory.putProcedure(
      'prompt_analytics_weekly_digest',
      ANALYTICS_PROMPTS.weeklyDigest
    );

    await proceduralMemory.putProcedure(
      'prompt_analytics_learning_pattern',
      ANALYTICS_PROMPTS.learningPattern
    );

    // Store system messages
    await proceduralMemory.putProcedure(
      'message_no_recommendations',
      SYSTEM_MESSAGES.noRecommendations
    );

    await proceduralMemory.putProcedure(
      'message_no_representatives',
      SYSTEM_MESSAGES.noRepresentatives
    );

    await proceduralMemory.putProcedure(
      'message_api_error',
      SYSTEM_MESSAGES.apiError
    );

    await proceduralMemory.putProcedure(
      'message_first_time_user',
      SYSTEM_MESSAGES.firstTimeUser
    );

    // Mark as initialized
    await proceduralMemory.putProcedure(
      'system_initialized',
      new Date().toISOString()
    );

    console.log('Procedural memory initialized successfully');
  } catch (error) {
    console.error('Error initializing procedural memory:', error);
    throw error;
  }
}

/**
 * Get a specific prompt from procedural memory
 */
export async function getPrompt(
  memory: SmartMemory,
  promptKey: string
): Promise<string | null> {
  const proceduralMemory = await memory.getProceduralMemory();
  return await proceduralMemory.getProcedure(promptKey);
}

/**
 * Get a specific template from procedural memory
 */
export async function getTemplate(
  memory: SmartMemory,
  templateKey: string
): Promise<string | null> {
  const proceduralMemory = await memory.getProceduralMemory();
  return await proceduralMemory.getProcedure(templateKey);
}

/**
 * Update a specific prompt/template in procedural memory
 */
export async function updateProcedure(
  memory: SmartMemory,
  key: string,
  value: string
): Promise<void> {
  const proceduralMemory = await memory.getProceduralMemory();
  await proceduralMemory.putProcedure(key, value);
}

/**
 * List all procedures in memory
 */
export async function listProcedures(memory: SmartMemory) {
  const proceduralMemory = await memory.getProceduralMemory();
  return await proceduralMemory.listProcedures();
}
