/**
 * Topic Images Storage (Dual Mode: Netlify Blobs + SQLite)
 *
 * Store and retrieve topic header images for personalized news.
 * Images are fetched once from Pexels and cached permanently.
 *
 * Storage Strategy:
 * - PRODUCTION (Netlify): Uses Netlify Blobs (serverless key-value store)
 * - LOCAL DEV: Uses SQLite (file-based database)
 *
 * This dual-mode approach ensures:
 * 1. Local development works without Netlify runtime
 * 2. Production uses Netlify Blobs (no writable filesystem needed)
 * 3. Same API regardless of environment
 */

import { getStore } from '@netlify/blobs';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface TopicImage {
  topic: string;
  imageUrl: string;
  imageAlt: string;
  photographer: string;
  photographerUrl: string;
  createdAt: Date;
}

interface TopicImageData {
  topic: string;
  imageUrl: string;
  imageAlt: string;
  photographer: string;
  photographerUrl: string;
  createdAt: string;
}

// Detect if we're running on Netlify
const isNetlify = process.env.NETLIFY === 'true' || process.env.NETLIFY_DEV === 'true';

// SQLite database for local development
let db: Database.Database | null = null;

function getDatabase() {
  if (!db) {
    const dataDir = path.join(process.cwd(), 'data');

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'topic-images.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Get Netlify Blobs store for topic images (production only)
 */
function getTopicImagesStore() {
  if (!isNetlify) {
    throw new Error('Netlify Blobs not available in local development');
  }
  return getStore('topic-images');
}

/**
 * Initialize storage (SQLite table for local dev, no-op for Netlify Blobs)
 */
export function initTopicImagesTable() {
  if (isNetlify) {
    console.log('Using Netlify Blobs for topic images (no initialization needed)');
    return;
  }

  // Local development: create SQLite table
  console.log('Using SQLite for topic images (local development)');
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS topic_images (
      topic TEXT PRIMARY KEY,
      imageUrl TEXT NOT NULL,
      imageAlt TEXT NOT NULL,
      photographer TEXT NOT NULL,
      photographerUrl TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  console.log('Topic images table initialized (SQLite)');
}

/**
 * Get topic image from storage (Netlify Blobs or SQLite)
 */
export async function getTopicImage(topic: string): Promise<TopicImage | null> {
  try {
    if (isNetlify) {
      // Production: Use Netlify Blobs
      const store = getTopicImagesStore();
      const data = await store.get(topic, { type: 'json' }) as TopicImageData | null;

      if (!data) {
        return null;
      }

      return {
        ...data,
        createdAt: new Date(data.createdAt),
      };
    } else {
      // Local dev: Use SQLite
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM topic_images WHERE topic = ?');
      const row = stmt.get(topic) as TopicImageData | undefined;

      if (!row) {
        return null;
      }

      return {
        ...row,
        createdAt: new Date(row.createdAt),
      };
    }
  } catch (error) {
    console.error(`Failed to get topic image for "${topic}":`, error);
    return null;
  }
}

/**
 * Get multiple topic images from Netlify Blobs
 */
export async function getTopicImages(topics: string[]): Promise<TopicImage[]> {
  if (topics.length === 0) return [];

  try {
    // Fetch all topics in parallel
    const results = await Promise.all(
      topics.map(topic => getTopicImage(topic))
    );

    // Filter out null results
    return results.filter((img): img is TopicImage => img !== null);
  } catch (error) {
    console.error('Failed to get topic images:', error);
    return [];
  }
}

/**
 * Store topic image in storage (Netlify Blobs or SQLite)
 */
export async function saveTopicImage(topicImage: Omit<TopicImage, 'createdAt'>): Promise<void> {
  try {
    const data: TopicImageData = {
      ...topicImage,
      createdAt: new Date().toISOString(),
    };

    if (isNetlify) {
      // Production: Use Netlify Blobs
      const store = getTopicImagesStore();
      await store.setJSON(topicImage.topic, data);
      console.log(`Saved topic image for "${topicImage.topic}" to Netlify Blobs`);
    } else {
      // Local dev: Use SQLite
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO topic_images (topic, imageUrl, imageAlt, photographer, photographerUrl, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        data.topic,
        data.imageUrl,
        data.imageAlt,
        data.photographer,
        data.photographerUrl,
        data.createdAt
      );
      console.log(`Saved topic image for "${topicImage.topic}" to SQLite`);
    }
  } catch (error) {
    console.error(`Failed to save topic image for "${topicImage.topic}":`, error);
    throw error;
  }
}

/**
 * Store multiple topic images in Netlify Blobs
 */
export async function saveTopicImages(topicImages: Omit<TopicImage, 'createdAt'>[]): Promise<void> {
  if (topicImages.length === 0) return;

  try {
    // Save all images in parallel
    await Promise.all(
      topicImages.map(image => saveTopicImage(image))
    );
    console.log(`Saved ${topicImages.length} topic images to Netlify Blobs`);
  } catch (error) {
    console.error('Failed to save topic images:', error);
    throw error;
  }
}

/**
 * Get all topics that don't have images yet
 */
export async function getMissingTopicImages(topics: string[]): Promise<string[]> {
  if (topics.length === 0) return [];

  try {
    const existingImages = await getTopicImages(topics);
    const existingSet = new Set(existingImages.map(img => img.topic));
    return topics.filter(topic => !existingSet.has(topic));
  } catch (error) {
    console.error('Failed to get missing topic images:', error);
    // Return all topics as missing on error (fallback to fetching all)
    return topics;
  }
}
