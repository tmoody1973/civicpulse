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
 * Generate complete podcast audio from dialogue script with automatic chunking
 * Uses text-to-dialogue endpoint for natural two-voice conversation
 * Handles long-form content by splitting into chunks and concatenating
 */
export async function generateDialogue(
  dialogue: DialogueLine[],
  options: AudioGenerationOptions = {}
): Promise<Buffer> {
  const {
    modelId = 'eleven_v3', // MUST be v3 family for text-to-dialogue (eleven_v3, eleven_turbo_v3, etc.)
    outputFormat = 'mp3_44100_192',
  } = options;

  const totalCharacters = dialogue.reduce((sum, line) => sum + line.text.length, 0);
  console.log(`📊 Dialogue stats: ${dialogue.length} lines, ${totalCharacters} characters`);

  // Character limit per chunk (conservative to account for formatting)
  const CHUNK_LIMIT = 4500;

  // If dialogue fits in one chunk, generate directly
  if (totalCharacters <= CHUNK_LIMIT) {
    console.log(`✅ Dialogue fits in single chunk, generating...`);
    return await generateDialogueChunk(dialogue, modelId, outputFormat);
  }

  // Split dialogue into chunks
  console.log(`📦 Splitting dialogue into chunks (limit: ${CHUNK_LIMIT} chars/chunk)...`);
  const chunks: DialogueLine[][] = [];
  let currentChunk: DialogueLine[] = [];
  let currentLength = 0;

  for (const line of dialogue) {
    const lineLength = line.text.length;

    // If adding this line exceeds the limit, start a new chunk
    if (currentLength + lineLength > CHUNK_LIMIT && currentChunk.length > 0) {
      chunks.push(currentChunk);
      console.log(`   Chunk ${chunks.length}: ${currentChunk.length} lines, ${currentLength} chars`);

      currentChunk = [line];
      currentLength = lineLength;
    } else {
      currentChunk.push(line);
      currentLength += lineLength;
    }
  }

  // Add the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
    console.log(`   Chunk ${chunks.length}: ${currentChunk.length} lines, ${currentLength} chars`);
  }

  console.log(`📦 Created ${chunks.length} chunks`);

  // Generate audio for each chunk
  const audioChunks: Buffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🎙️  Generating chunk ${i + 1}/${chunks.length}...`);

    try {
      const chunkAudio = await generateDialogueChunk(chunks[i], modelId, outputFormat);
      audioChunks.push(chunkAudio);
      console.log(`✅ Chunk ${i + 1} generated: ${chunkAudio.length} bytes`);
    } catch (error) {
      console.error(`❌ Failed to generate chunk ${i + 1}:`, error);
      throw new Error(`Failed to generate audio chunk ${i + 1}: ${error}`);
    }

    // Rate limiting: wait 1 second between chunks to avoid hitting API limits
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Concatenate all audio chunks
  console.log(`🔗 Concatenating ${audioChunks.length} audio chunks...`);
  const finalAudio = Buffer.concat(audioChunks);
  console.log(`✅ Final audio: ${finalAudio.length} bytes`);

  return finalAudio;
}

/**
 * Generate audio for a single dialogue chunk
 * Internal function called by generateDialogue
 */
async function generateDialogueChunk(
  dialogueChunk: DialogueLine[],
  modelId: string,
  outputFormat: string
): Promise<Buffer> {
  // Transform dialogue lines into ElevenLabs text-to-dialogue format
  const inputs = dialogueChunk.map((line) => ({
    text: line.text,
    voice_id: line.host === 'sarah' ? SARAH_VOICE_ID : JAMES_VOICE_ID,
  }));

  const requestBody = {
    model_id: modelId,
    inputs: inputs,
  };

  const response = await fetch(`${API_BASE}/text-to-dialogue?output_format=${outputFormat}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY!,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(180000), // 3 minute timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`ElevenLabs API error (${response.status}):`, errorText);
    throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Calculate estimated duration of audio in seconds
 * Rough estimate: ~150 words per minute for natural conversation
 */
export function estimateAudioDuration(dialogue: DialogueLine[]): number {
  const totalCharacters = dialogue.reduce((sum, line) => sum + line.text.length, 0);

  // Based on empirical testing: 7267 characters = ~500 seconds (8+ minutes)
  // This gives us ~14.5 characters per second for conversational dialogue
  const charactersPerSecond = 14.5;

  return Math.ceil(totalCharacters / charactersPerSecond);
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
