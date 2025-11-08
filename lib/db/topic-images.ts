/**
 * Topic Images Storage (Netlify Blobs)
 *
 * Store and retrieve topic header images for personalized news.
 * Images are fetched once from Pexels and cached permanently in Netlify Blobs.
 *
 * Why Netlify Blobs instead of SQLite:
 * - SQLite requires writable filesystem (not available in Netlify Functions)
 * - Netlify Blobs provides persistent key-value storage across serverless invocations
 * - Designed for Netlify platform (hackathon requirement)
 */

import { getStore } from '@netlify/blobs';

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

/**
 * Get Netlify Blobs store for topic images
 */
function getTopicImagesStore() {
  return getStore('topic-images');
}

/**
 * No initialization needed for Netlify Blobs
 */
export function initTopicImagesTable() {
  // No-op: Netlify Blobs are created automatically
  console.log('Using Netlify Blobs for topic images (no initialization needed)');
}

/**
 * Get topic image from Netlify Blobs
 */
export async function getTopicImage(topic: string): Promise<TopicImage | null> {
  try {
    const store = getTopicImagesStore();
    const data = await store.get(topic, { type: 'json' }) as TopicImageData | null;

    if (!data) {
      return null;
    }

    return {
      ...data,
      createdAt: new Date(data.createdAt),
    };
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
 * Store topic image in Netlify Blobs
 */
export async function saveTopicImage(topicImage: Omit<TopicImage, 'createdAt'>): Promise<void> {
  try {
    const store = getTopicImagesStore();

    const data: TopicImageData = {
      ...topicImage,
      createdAt: new Date().toISOString(),
    };

    await store.setJSON(topicImage.topic, data);
    console.log(`Saved topic image for "${topicImage.topic}" to Netlify Blobs`);
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
