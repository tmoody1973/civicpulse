/**
 * Audio Generator Worker (Step 4 of 5)
 *
 * Reads dialogue script from SmartMemory, generates audio with ElevenLabs
 * Stores audio as base64 in SmartMemory (to avoid buffer issues), sends to upload-queue
 */

import { Each, Message } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

interface AudioJob {
  jobId: string;
}

export default class extends Each<AudioJob, Env> {
  async process(message: Message<AudioJob>): Promise<void> {
    console.log(`🎙️  Audio Generator: Processing job ${message.body.jobId}`);

    const { jobId } = message.body;

    try {
      // Read script from bucket storage
      console.log('   Reading script from bucket storage...');
      const scriptObj = await this.env.BRIEF_JOB_STORAGE.get(`job:${jobId}:script`);

      if (!scriptObj) {
        throw new Error('Script not found in bucket storage');
      }

      const scriptJson = await scriptObj.text();
      const script = JSON.parse(scriptJson);
      console.log(`   ✅ Loaded script with ${script.length} dialogue turns`);

      // Generate audio with ElevenLabs
      console.log('   Generating audio with ElevenLabs (may take 5-10 min)...');
      const audioBuffer = await this.generateAudio(script);
      const audioSizeKB = Math.round(audioBuffer.byteLength / 1024);
      console.log(`   ✅ Generated audio (${audioSizeKB}KB)`);

      // Convert to base64 for storage (avoids ArrayBuffer serialization issues)
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      await this.env.BRIEF_JOB_STORAGE.put(`job:${jobId}:audio`, audioBase64);
      console.log('   ✅ Stored audio in bucket storage');

      // Clean up script (no longer needed)
      await this.env.BRIEF_JOB_STORAGE.delete(`job:${jobId}:script`);

      // Send to upload-queue
      await this.env.UPLOAD_QUEUE.send({ jobId }, { contentType: 'json' });
      console.log('   ✅ Sent to upload-queue');

      message.ack();

    } catch (error: any) {
      console.error(`❌ Audio generator failed: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      message.retry({ delaySeconds: 300 }); // Longer retry for audio generation
    }
  }

  private async generateAudio(script: any[]): Promise<ArrayBuffer> {
    const inputs = script.map((line: any) => ({
      text: line.text,
      voice_id: line.host === 'sarah'
        ? this.env.ELEVENLABS_SARAH_VOICE_ID
        : this.env.ELEVENLABS_JAMES_VOICE_ID
    }));

    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_192',
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          inputs,
          model_id: 'eleven_monolingual_v1'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    return await response.arrayBuffer();
  }
}

export interface Body extends AudioJob {}
