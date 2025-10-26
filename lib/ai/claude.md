# AI Services - Implementation Guide

## ElevenLabs Text-to-Dialogue

### Endpoint
`POST https://api.elevenlabs.io/v1/text-to-dialogue`

### Critical Implementation
```typescript
// lib/ai/elevenlabs.ts

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SARAH_VOICE_ID = process.env.ELEVENLABS_SARAH_VOICE_ID;
const JAMES_VOICE_ID = process.env.ELEVENLABS_JAMES_VOICE_ID;

interface DialogueEntry {
  host: 'sarah' | 'james';
  text: string;
}

export async function generateDialogue(dialogue: DialogueEntry[]): Promise<Buffer> {
  const inputs = dialogue.map(entry => ({
    text: entry.text,
    voice_id: entry.host === 'sarah' ? SARAH_VOICE_ID : JAMES_VOICE_ID
  }));
  
  const response = await fetch(
    'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_192',
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        inputs,
        model_id: 'eleven_monolingual_v1',
        settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }
  
  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}
```

### Voice Settings
- **Stability:** 0.5 (balanced)
- **Similarity Boost:** 0.75 (high quality)
- **Output Format:** `mp3_44100_192` (44.1kHz, 192kbps)

### Error Handling
- Retry with exponential backoff (3 attempts)
- Implement circuit breaker (5 failures → open for 60s)
- Fallback: Generate transcript only, queue for retry

---

## Claude Sonnet 4 (Anthropic)

### Model
`claude-sonnet-4-20250514`

### Script Generation
```typescript
// lib/ai/claude.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateDialogueScript(
  bills: Bill[],
  representatives: Representative[],
  type: 'daily' | 'weekly'
): Promise<DialogueEntry[]> {
  const prompt = `Create a podcast dialogue between Sarah and James about these bills.

Format: Return a JSON array of dialogue entries:
[
  { "host": "sarah", "text": "..." },
  { "host": "james", "text": "..." }
]

Guidelines:
- Sarah introduces topics, James adds context
- Use contractions for natural flow
- Include acknowledgments ("That's right", "Exactly")
- Plain language, no jargon
- ${type === 'daily' ? '2 minutes per bill' : '15-18 minutes total'}

Bills: ${JSON.stringify(bills)}
Representatives: ${representatives.map(r => r.name).join(', ')}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: type === 'daily' ? 2000 : 5000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  const responseText = message.content[0].text;
  return JSON.parse(responseText);
}
```

### Prompt Guidelines
- Specify exact output format (JSON array)
- Emphasize conversational markers
- Include bill context and user representatives
- Set appropriate max_tokens (daily: 2000, weekly: 5000)

### Rate Limits
- Respect API tier limits
- Implement retry with exponential backoff
- Log all errors with bill IDs for debugging

---

## Dialogue Quality Tips

### Natural Conversation
```typescript
// Good dialogue
{ host: 'sarah', text: "Good morning! Today we're looking at a healthcare bill..." }
{ host: 'james', text: "That's right, Sarah. This one's particularly interesting because..." }

// Bad dialogue (too formal)
{ host: 'sarah', text: "Good morning. We will now discuss House Resolution 1234..." }
{ host: 'james', text: "I concur. The aforementioned legislation addresses..." }
```

### Balance
- Sarah typically: 55% of content (introduces, explains)
- James typically: 45% of content (context, impact)
- Alternate every 2-4 sentences for natural flow

### Length Guidelines
- **Daily brief:** 20-25 dialogue entries (5-7 min total)
- **Weekly deep dive:** 50-60 dialogue entries (15-18 min total)

---

## Testing

```bash
# Test ElevenLabs API
curl -X POST https://api.elevenlabs.io/v1/text-to-dialogue \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs":[{"text":"Test","voice_id":"'$SARAH_VOICE_ID'"}]}'

# Test Claude API
npm run test:claude-dialogue
```

---

## Common Issues

### ElevenLabs
- **401 Unauthorized:** Check API key in env vars
- **422 Validation Error:** Verify voice IDs are correct
- **Audio too fast/slow:** Adjust text length and punctuation

### Claude
- **Invalid JSON:** Add explicit format instructions to prompt
- **Too formal:** Emphasize conversational tone and contractions
- **Wrong length:** Adjust max_tokens parameter

---

**Always test dialogue naturalness before production deployment.**
