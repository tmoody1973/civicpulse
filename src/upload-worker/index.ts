/**
 * Upload Worker (Step 5 of 5)
 *
 * Reads audio from SmartMemory, uploads to Vultr CDN
 * Saves brief to database, cleans up SmartMemory
 */

import { Each, Message } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

interface UploadJob {
  jobId: string;
}

export default class extends Each<UploadJob, Env> {
  async process(message: Message<UploadJob>): Promise<void> {
    console.log(`☁️  Upload Worker: Processing job ${message.body.jobId}`);

    const { jobId } = message.body;

    try {
      // Read metadata and audio from bucket storage
      console.log('   Reading metadata and audio from bucket storage...');
      const metadataObj = await this.env.BRIEF_JOB_STORAGE.get(`job:${jobId}:metadata`);
      const audioObj = await this.env.BRIEF_JOB_STORAGE.get(`job:${jobId}:audio`);

      if (!metadataObj || !audioObj) {
        throw new Error('Metadata or audio not found in bucket storage');
      }

      const metadataJson = await metadataObj.text();
      const audioBase64 = await audioObj.text();
      const metadata = JSON.parse(metadataJson);
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      console.log(`   ✅ Loaded audio (${Math.round(audioBuffer.byteLength / 1024)}KB)`);

      // Upload to Vultr CDN
      console.log('   Uploading to Vultr CDN...');
      const audioUrl = await this.uploadToVultr(audioBuffer, metadata);
      console.log(`   ✅ Uploaded to: ${audioUrl}`);

      // Save brief to database
      console.log('   Saving brief to database...');
      const briefId = await this.saveBriefToDatabase(jobId, audioUrl, metadata);
      console.log(`   ✅ Saved brief ID: ${briefId}`);

      // Clean up bucket storage
      await this.env.BRIEF_JOB_STORAGE.delete(`job:${jobId}:metadata`);
      await this.env.BRIEF_JOB_STORAGE.delete(`job:${jobId}:audio`);
      console.log('   ✅ Cleaned up bucket storage');

      console.log(`\n✅ Brief generation completed!`);
      console.log(`   Job ID: ${jobId}`);
      console.log(`   Audio URL: ${audioUrl}`);

      message.ack();

    } catch (error: any) {
      console.error(`❌ Upload worker failed: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      message.retry({ delaySeconds: 120 });
    }
  }

  private async uploadToVultr(audioBuffer: Buffer, metadata: any): Promise<string> {
    // Lazy load AWS SDK
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const s3 = new S3Client({
      endpoint: this.env.VULTR_STORAGE_ENDPOINT,
      region: 'auto',
      credentials: {
        accessKeyId: this.env.VULTR_ACCESS_KEY,
        secretAccessKey: this.env.VULTR_SECRET_KEY
      }
    });

    const key = `podcasts/${metadata.userId}/daily/${Date.now()}.mp3`;

    await s3.send(new PutObjectCommand({
      Bucket: 'civic-pulse-podcasts',
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000',
      Metadata: {
        userId: metadata.userId,
        briefId: metadata.jobId,
        generatedAt: metadata.createdAt
      }
    }));

    return `${this.env.VULTR_CDN_URL}/${key}`;
  }

  private async saveBriefToDatabase(jobId: string, audioUrl: string, metadata: any): Promise<string> {
    // Calculate estimated duration (MP3 at 192kbps: ~24KB per second)
    const duration = 300; // 5 minutes estimated

    const query = `
      INSERT INTO briefs (
        id, user_id, type, audio_url, transcript,
        written_digest, policy_areas, duration, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    await this.env.HAKIVO_DB.prepare(query).bind(
      jobId,
      metadata.userId,
      'daily',
      audioUrl,
      JSON.stringify({ status: 'generated' }),
      'Brief generated successfully',
      JSON.stringify(metadata.policyInterests),
      duration
    ).run();

    return jobId;
  }
}

export interface Body extends UploadJob {}
