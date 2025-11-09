/**
 * Claude Haiku 4.5 Dialogue Generator
 *
 * Generates natural podcast dialogue scripts using Anthropic Claude API
 * Model: claude-haiku-4-5-20251001
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Bill } from '../api/congress';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface DialogueLine {
  host: 'sarah' | 'james';
  text: string;
}

export interface PodcastFormat {
  type: 'daily' | 'weekly';
  targetDuration: number; // in minutes
  billCount: number;
}

const PODCAST_FORMATS: Record<string, PodcastFormat> = {
  daily: {
    type: 'daily',
    targetDuration: 10, // 8-12 minutes for comprehensive coverage
    billCount: 3,
  },
  weekly: {
    type: 'weekly',
    targetDuration: 15, // 15-18 minutes for deep dive
    billCount: 1, // One bill, deep dive
  },
};

/**
 * Generate podcast dialogue script from bills
 */
export async function generateDialogueScript(
  bills: Bill[],
  format: 'daily' | 'weekly' = 'daily'
): Promise<DialogueLine[]> {
  const podcastFormat = PODCAST_FORMATS[format];

  const systemPrompt = `You are an expert podcast script writer for a civic engagement show called "HakiVo".
Your job is to create natural, engaging dialogue between two hosts: Sarah and James.

Style Guidelines:
- NPR-quality professional yet conversational tone
- Explain legislation in plain language accessible to all citizens
- Highlight real-world impact on everyday people
- Balance optimism with realistic analysis
- Natural back-and-forth between hosts (not monologues)
- Use analogies and examples to clarify complex topics
- End with clear call-to-action (how listeners can engage)

Natural Expression Guidelines:
- Write in a conversational, engaging tone
- Use natural language variations (contractions, questions, exclamations)
- Vary sentence structure and pacing
- Include conversational markers like "Well...", "You know...", "Actually..."
- Express emotion through word choice and punctuation (! ?)
- Keep it authentic and relatable

Format Requirements - THIS IS CRITICAL:
- Target duration: ${podcastFormat.targetDuration} minutes (approximately ${podcastFormat.targetDuration * 150} words)
- ${format === 'daily' ? 'YOU MUST GENERATE AT LEAST 25-35 DIALOGUE LINES (MINIMUM 25, TARGET 30-35)' : 'YOU MUST GENERATE AT LEAST 40-50 DIALOGUE LINES'}
- This is for 8-12 minutes of audio - DO NOT create short scripts!
- Each line should be 2-4 sentences (conversational exchanges, not monologues)
- Structure: engaging intro (3-4 lines) + detailed discussion of EACH topic (20-25 lines total) + strong outro (2-3 lines)
- Sarah focuses on policy details, James on human impact and real-world connections
- Alternate speakers frequently (every 1-2 lines) for natural conversation
- Total output should be 6000-9000 characters for comprehensive coverage

REMEMBER: The listener wants a FULL briefing with detailed analysis, not a quick summary.
Generate AT LEAST 30 dialogue lines with substantive discussion of each topic.

Return the dialogue as a JSON array of objects with this structure:
[
  {"host": "sarah", "text": "Good morning! Welcome to HakiVo..."},
  {"host": "james", "text": "Hey Sarah, great to be here! Today's episode is packed..."},
  ...
]`;

  const billSummaries = bills.map((bill, idx) =>
    `Bill ${idx + 1}: ${bill.billType.toUpperCase()} ${bill.billNumber}
Title: ${bill.title}
Sponsor: ${bill.sponsorName}
Latest Action: ${bill.latestActionText} (${bill.latestActionDate})
${bill.summary ? `Summary: ${bill.summary}` : ''}
`
  ).join('\n\n');

  const userPrompt = `Create a ${format} podcast episode covering these bills:\n\n${billSummaries}\n\nGenerate the complete dialogue script as a JSON array.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: format === 'daily' ? 8192 : 12288, // Increased for longer briefs (daily: 8k, weekly: 12k)
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the JSON response
    // Claude might wrap the JSON in markdown code blocks, so we need to extract it
    let jsonText = content.text.trim();

    // Remove markdown code blocks if present
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    }

    const dialogue: DialogueLine[] = JSON.parse(jsonText);

    // Validate the structure
    if (!Array.isArray(dialogue) || dialogue.length === 0) {
      throw new Error('Invalid dialogue structure from Claude');
    }

    for (const line of dialogue) {
      if (!line.host || !line.text) {
        throw new Error('Invalid dialogue line structure');
      }
      if (line.host !== 'sarah' && line.host !== 'james') {
        throw new Error(`Invalid host name: ${line.host}`);
      }
    }

    // Validate minimum length requirements
    const minLines = format === 'daily' ? 15 : 30;  // Lower minimums to allow 5-10 min daily, 10-20 min weekly
    if (dialogue.length < minLines) {
      throw new Error(
        `Dialogue script too short: ${dialogue.length} lines (minimum ${minLines} required for ${format} brief). ` +
        `This would produce a ${Math.round(dialogue.length * 0.3)} minute brief instead of the target ${podcastFormat.targetDuration} minutes.`
      );
    }

    return dialogue;
  } catch (error) {
    console.error('Error generating dialogue with Claude:', error);
    throw error;
  }
}

/**
 * Generate a simple test dialogue (for development/testing)
 */
export function generateTestDialogue(): DialogueLine[] {
  return [
    {
      host: 'sarah',
      text: 'Good morning and welcome to HakiVo! I\'m Sarah.',
    },
    {
      host: 'james',
      text: 'And I\'m James. Today we\'re breaking down the latest legislation coming out of Washington that could impact your daily life.',
    },
    {
      host: 'sarah',
      text: 'That\'s right. We\'re looking at three bills that just moved through committee this week, covering everything from healthcare access to renewable energy infrastructure.',
    },
    {
      host: 'james',
      text: 'Let\'s dive in. First up, H.R. 1234, the Healthcare Modernization Act. This one\'s been generating a lot of buzz.',
    },
    {
      host: 'sarah',
      text: 'It certainly has. The bill proposes to expand telehealth coverage under Medicare, making it easier for seniors to access medical care from home.',
    },
    {
      host: 'james',
      text: 'Which is huge, especially for folks in rural areas who might be hours away from the nearest specialist. The pandemic showed us how valuable telehealth can be.',
    },
    {
      host: 'sarah',
      text: 'Exactly. The bill also includes funding for digital literacy programs to help older Americans get comfortable with the technology.',
    },
    {
      host: 'james',
      text: 'I love that they\'re thinking about the practical barriers, not just the policy on paper.',
    },
    {
      host: 'sarah',
      text: 'That\'s what good legislation looks like. You can learn more about this bill and track its progress at congress.gov. Thanks for tuning in to HakiVo!',
    },
    {
      host: 'james',
      text: 'Stay informed, stay engaged, and we\'ll see you next time!',
    },
  ];
}
