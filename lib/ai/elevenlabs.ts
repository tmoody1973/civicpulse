/**
 * ElevenLabs Text-to-Dialogue API Client
 *
 * Generates natural multi-host podcast audio using ElevenLabs text-to-dialogue endpoint
 * Benefits: Natural flow, proper timing, single API call for complete conversation
 */

import type { DialogueLine } from './claude';

const API_BASE = 'https://api.elevenlabs.io/v1';
const API_KEY = process.env.ELEVENLABS_API_KEY;
const SARAH_VOICE_ID = process.env.ELEVENLABS_SARAH_VOICE_ID;
const JAMES_VOICE_ID = process.env.ELEVENLABS_JAMES_VOICE_ID;

if (!API_KEY) {
  console.warn('ELEVENLABS_API_KEY not set - audio generation will not work');
}

if (!SARAH_VOICE_ID || !JAMES_VOICE_ID) {
  console.warn('ElevenLabs voice IDs not set - using defaults');
}

export interface AudioGenerationOptions {
  modelId?: string; // Default: 'eleven_multilingual_v2'
  outputFormat?: 'mp3_44100_192' | 'mp3_22050_32' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000';
  stability?: number; // 0-1, default: 0.5
  similarityBoost?: number; // 0-1, default: 0.75
}

/**
 * Generate complete podcast audio from dialogue script
 * Uses text-to-dialogue endpoint for natural two-voice conversation
 * CRITICAL: Must stay under 5000 character limit
 */
export async function generateDialogue(
  dialogue: DialogueLine[],
  options: AudioGenerationOptions = {}
): Promise<Buffer> {
  const {
    modelId = 'eleven_v3', // v3 model for text-to-dialogue (required)
    outputFormat = 'mp3_44100_192',
  } = options;

  // Validate character count BEFORE processing
  const totalCharacters = dialogue.reduce((sum, line) => sum + line.text.length, 0);
  console.log(`📊 Dialogue stats: ${dialogue.length} lines, ${totalCharacters} characters`);

  if (totalCharacters > 4800) {
    throw new Error(
      `Dialogue too long: ${totalCharacters} characters exceeds safe limit of 4800 (ElevenLabs max is 5000). ` +
      `Please reduce dialogue to 8-10 short lines.`
    );
  }

  // Transform dialogue lines into ElevenLabs text-to-dialogue format
  const inputs = dialogue.map((line) => ({
    text: line.text,
    voice_id: line.host === 'sarah' ? SARAH_VOICE_ID : JAMES_VOICE_ID,
  }));

  const requestBody = {
    model_id: modelId, // eleven_v3 required for text-to-dialogue
    inputs: inputs, // ElevenLabs uses "inputs" not "dialogue"
  };

  console.log(`🎙️ Generating multi-voice dialogue with ${dialogue.length} turns`);

  try {
    const response = await fetch(`${API_BASE}/text-to-dialogue?output_format=${outputFormat}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY!,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(180000), // 180 second (3 minute) timeout for audio generation
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs API error (${response.status}):`, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    console.log(`✅ Generated ${audioBuffer.length} bytes of multi-voice audio`);
    return audioBuffer;
  } catch (error) {
    console.error('Error generating dialogue with ElevenLabs:', error);
    throw error;
  }
}

/**
 * Calculate estimated duration of audio in seconds
 * Rough estimate: ~150 words per minute for natural conversation
 */
export function estimateAudioDuration(dialogue: DialogueLine[]): number {
  const totalWords = dialogue.reduce((sum, line) => {
    const wordCount = line.text.split(/\s+/).length;
    return sum + wordCount;
  }, 0);

  const wordsPerSecond = 150 / 60; // 150 words per minute
  return Math.ceil(totalWords / wordsPerSecond);
}

/**
 * Get available voices from ElevenLabs
 * Use this to find voice IDs for Sarah and James
 */
export async function getAvailableVoices(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/voices`, {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Error fetching voices from ElevenLabs:', error);
    throw error;
  }
}

/**
 * Generate test audio with placeholder voices
 * For development when API keys aren't configured
 */
export async function generateTestAudio(): Promise<Buffer> {
  // Return empty MP3 buffer for testing
  // In production, this would call the actual API
  console.warn('Using test audio - configure ELEVENLABS_API_KEY for real audio generation');

  // Return a minimal valid MP3 header (silence)
  const mp3Header = Buffer.from([
    0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);

  return mp3Header;
}
