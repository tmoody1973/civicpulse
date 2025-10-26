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
    targetDuration: 4, // 4-5 minutes (shorter to avoid ElevenLabs timeout)
    billCount: 3,
  },
  weekly: {
    type: 'weekly',
    targetDuration: 10, // 10-12 minutes (reduced from 15-18)
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

  const systemPrompt = `You are an expert podcast script writer for a civic engagement show called "Civic Pulse".
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

Format Requirements:
- Target duration: ${podcastFormat.targetDuration} minutes (approximately ${podcastFormat.targetDuration * 150} words)
- ${format === 'daily' ? 'Generate EXACTLY 8-10 dialogue lines total (brief overview of all bills)' : 'Generate 15-20 dialogue lines (focused dive into the bill)'}
- Each line should be 2-3 sentences MAX (about 50-80 characters per line)
- Include: brief intro (2 lines), bill discussion (5-6 lines), brief outro (2 lines)
- Sarah tends to focus on policy details, James on human impact
- CRITICAL: Total character count MUST stay under 4000 characters (ElevenLabs limit is 5000)

Return the dialogue as a JSON array of objects with this structure:
[
  {"host": "sarah", "text": "Good morning! Welcome to Civic Pulse..."},
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
      max_tokens: 4096,
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
      text: 'Good morning and welcome to Civic Pulse! I\'m Sarah.',
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
      text: 'That\'s what good legislation looks like. You can learn more about this bill and track its progress at congress.gov. Thanks for tuning in to Civic Pulse!',
    },
    {
      host: 'james',
      text: 'Stay informed, stay engaged, and we\'ll see you next time!',
    },
  ];
}
