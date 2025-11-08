/**
 * Topic Images Database Operations
 *
 * Store and retrieve topic header images for personalized news.
 * Images are fetched once from Pexels and cached permanently.
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'civic-db.sqlite');

export interface TopicImage {
  topic: string;
  imageUrl: string;
  imageAlt: string;
  photographer: string;
  photographerUrl: string;
  createdAt: Date;
}

interface TopicImageRow {
  topic: string;
  image_url: string;
  image_alt: string;
  photographer: string;
  photographer_url: string;
  created_at: string;
}

/**
 * Initialize topic_images table
 */
export function initTopicImagesTable() {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS topic_images (
      topic TEXT PRIMARY KEY,
      image_url TEXT NOT NULL,
      image_alt TEXT NOT NULL,
      photographer TEXT NOT NULL,
      photographer_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.close();
}

/**
 * Get topic image from database
 */
export function getTopicImage(topic: string): TopicImage | null {
  const db = new Database(dbPath);

  try {
    const row = db.prepare(`
      SELECT * FROM topic_images WHERE topic = ?
    `).get(topic) as TopicImageRow | undefined;

    if (!row) {
      return null;
    }

    return {
      topic: row.topic,
      imageUrl: row.image_url,
      imageAlt: row.image_alt,
      photographer: row.photographer,
      photographerUrl: row.photographer_url,
      createdAt: new Date(row.created_at),
    };
  } finally {
    db.close();
  }
}

/**
 * Get multiple topic images from database
 */
export function getTopicImages(topics: string[]): TopicImage[] {
  if (topics.length === 0) return [];

  const db = new Database(dbPath);

  try {
    const placeholders = topics.map(() => '?').join(', ');
    const rows = db.prepare(`
      SELECT * FROM topic_images WHERE topic IN (${placeholders})
    `).all(...topics) as TopicImageRow[];

    return rows.map(row => ({
      topic: row.topic,
      imageUrl: row.image_url,
      imageAlt: row.image_alt,
      photographer: row.photographer,
      photographerUrl: row.photographer_url,
      createdAt: new Date(row.created_at),
    }));
  } finally {
    db.close();
  }
}

/**
 * Store topic image in database
 */
export function saveTopicImage(topicImage: Omit<TopicImage, 'createdAt'>): void {
  const db = new Database(dbPath);

  try {
    db.prepare(`
      INSERT OR REPLACE INTO topic_images (
        topic, image_url, image_alt, photographer, photographer_url
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      topicImage.topic,
      topicImage.imageUrl,
      topicImage.imageAlt,
      topicImage.photographer,
      topicImage.photographerUrl
    );
  } finally {
    db.close();
  }
}

/**
 * Store multiple topic images in database
 */
export function saveTopicImages(topicImages: Omit<TopicImage, 'createdAt'>[]): void {
  if (topicImages.length === 0) return;

  const db = new Database(dbPath);

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO topic_images (
        topic, image_url, image_alt, photographer, photographer_url
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((images: Omit<TopicImage, 'createdAt'>[]) => {
      for (const image of images) {
        stmt.run(
          image.topic,
          image.imageUrl,
          image.imageAlt,
          image.photographer,
          image.photographerUrl
        );
      }
    });

    transaction(topicImages);
  } finally {
    db.close();
  }
}

/**
 * Get all topics that don't have images yet
 */
export function getMissingTopicImages(topics: string[]): string[] {
  if (topics.length === 0) return [];

  const db = new Database(dbPath);

  try {
    const placeholders = topics.map(() => '?').join(', ');
    const existingTopics = db.prepare(`
      SELECT topic FROM topic_images WHERE topic IN (${placeholders})
    `).all(...topics) as { topic: string }[];

    const existingSet = new Set(existingTopics.map(row => row.topic));
    return topics.filter(topic => !existingSet.has(topic));
  } finally {
    db.close();
  }
}
