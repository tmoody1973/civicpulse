/**
 * Vultr Object Storage Client
 *
 * S3-compatible object storage for podcast audio files
 * Includes CDN support for fast global delivery
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = 'civic-pulse-podcasts';
const endpoint = process.env.VULTR_STORAGE_ENDPOINT;
const accessKeyId = process.env.VULTR_ACCESS_KEY;
const secretAccessKey = process.env.VULTR_SECRET_KEY;
const cdnUrl = process.env.VULTR_CDN_URL;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.warn('Vultr storage credentials not configured - upload will fail');
}

// Initialize S3 client for Vultr
const s3Client = new S3Client({
  endpoint: endpoint || 'https://ewr1.vultrobjects.com', // Default to Newark region
  region: 'us-east-1', // Vultr uses this as default
  forcePathStyle: true, // Required for S3-compatible services like Vultr
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

export interface PodcastMetadata {
  userId: string;
  type: 'daily' | 'weekly';
  duration: number; // in seconds
  billsCovered: string[]; // Bill IDs
  generatedAt: Date;
}

/**
 * Upload podcast audio to Vultr Object Storage
 * Returns CDN URL for fast access
 * Falls back to local storage if Vultr is unavailable
 */
export async function uploadPodcast(
  audioBuffer: Buffer,
  metadata: PodcastMetadata
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${metadata.userId}/${metadata.type}/${timestamp}.mp3`;

  // Try Vultr first
  if (endpoint && accessKeyId && secretAccessKey) {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: audioBuffer,
        ContentType: 'audio/mpeg',
        CacheControl: 'public, max-age=31536000', // Cache for 1 year
        Metadata: {
          userId: metadata.userId,
          type: metadata.type,
          duration: metadata.duration.toString(),
          billsCovered: metadata.billsCovered.join(','),
          generatedAt: metadata.generatedAt.toISOString(),
        },
      });

      await s3Client.send(command);

      // Return CDN URL if configured, otherwise S3 URL
      if (cdnUrl) {
        return `${cdnUrl}/${filename}`;
      } else {
        return `${endpoint}/${BUCKET_NAME}/${filename}`;
      }
    } catch (error) {
      console.warn('Vultr upload failed, falling back to local storage:', error);
    }
  }

  // Fallback: Save to local public folder
  const fs = await import('fs/promises');
  const path = await import('path');

  const localDir = path.join(process.cwd(), 'public', 'podcasts', metadata.userId, metadata.type);
  await fs.mkdir(localDir, { recursive: true });

  const localPath = path.join(localDir, `${timestamp}.mp3`);
  await fs.writeFile(localPath, audioBuffer);

  console.log(`✅ Saved to local storage: ${localPath}`);

  // Return relative URL that works with Next.js static files
  return `/podcasts/${metadata.userId}/${metadata.type}/${timestamp}.mp3`;
}

/**
 * Get podcast audio from storage
 */
export async function getPodcast(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('No audio data received');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error fetching podcast from Vultr:', error);
    throw error;
  }
}

/**
 * Delete podcast from storage
 */
export async function deletePodcast(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting podcast from Vultr:', error);
    throw error;
  }
}

/**
 * Generate a mock local URL for testing when Vultr isn't configured
 */
export function generateMockPodcastUrl(userId: string, type: string): string {
  const timestamp = new Date().toISOString();
  return `/api/podcasts/mock/${userId}/${type}/${timestamp}.mp3`;
}
