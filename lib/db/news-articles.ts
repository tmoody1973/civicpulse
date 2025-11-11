/**
 * CRUD Operations for News Articles
 *
 * Manages personalized news articles with image metadata in the database.
 */

import { executeQuery } from './client';
import { createHash } from 'crypto';

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  publishedDate: string;
  relevantTopics: string[];
  imageUrl?: string;
  imageAlt?: string;
  imagePhotographer?: string | null;
  imagePhotographerUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsArticleInput {
  title: string;
  url: string;
  summary: string;
  source: string;
  publishedDate: string;
  imageUrl?: string | null;
  relevantTopics: string[];
}

/**
 * Generate a unique ID for an article based on title and URL
 */
function generateArticleId(title: string, url: string): string {
  const hash = createHash('sha256');
  hash.update(`${title}|${url}`);
  return hash.digest('hex').substring(0, 16);
}

/**
 * Escape SQL string values for Raindrop SmartSQL
 */
function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Save news articles to the database
 * Skips duplicates based on URL
 */
export async function saveNewsArticles(
  articles: NewsArticleInput[]
): Promise<NewsArticle[]> {
  const savedArticles: NewsArticle[] = [];

  for (const article of articles) {
    const id = generateArticleId(article.title, article.url);
    const topicsJson = JSON.stringify(article.relevantTopics);

    try {
      // Check if article already exists by URL
      const existing = await getNewsArticleByUrl(article.url);

      if (existing) {
        // Article already exists, skip insert
        savedArticles.push(existing);
        continue;
      }

      // Article doesn't exist, insert it
      const sql = `
        INSERT INTO news_articles (
          id, title, url, summary, source, published_date, relevant_topics, image_url
        ) VALUES (
          ${escapeSql(id)},
          ${escapeSql(article.title)},
          ${escapeSql(article.url)},
          ${escapeSql(article.summary)},
          ${escapeSql(article.source)},
          ${escapeSql(article.publishedDate)},
          ${escapeSql(topicsJson)},
          ${escapeSql(article.imageUrl || null)}
        )
      `;

      await executeQuery(sql, 'news_articles');

      savedArticles.push({
        id,
        ...article,
        imageUrl: article.imageUrl || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error: any) {
      console.error(`Failed to save article ${article.title.substring(0, 50)}:`, error.message);
    }
  }

  return savedArticles;
}

/**
 * Get a news article by URL
 */
export async function getNewsArticleByUrl(url: string): Promise<NewsArticle | null> {
  const sql = `
    SELECT * FROM news_articles WHERE url = ${escapeSql(url)} LIMIT 1
  `;

  const result = await executeQuery(sql, 'news_articles');

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return parseNewsArticleRow(row);
}

/**
 * Get recent news articles (within a time window)
 */
export async function getRecentNewsArticles(
  topics: string[],
  maxAgeMs: number,
  limit: number = 20
): Promise<NewsArticle[]> {
  const cutoffDate = new Date(Date.now() - maxAgeMs);
  const cutoffTimestamp = cutoffDate.toISOString();

  // Build topic filter (articles matching any of the user's topics)
  let topicFilter = '';
  if (topics.length > 0) {
    const topicConditions = topics.map(
      topic => `relevant_topics LIKE ${escapeSql(`%${topic}%`)}`
    );
    topicFilter = `AND (${topicConditions.join(' OR ')})`;
  }

  const sql = `
    SELECT * FROM news_articles
    WHERE created_at >= ${escapeSql(cutoffTimestamp)}
    ${topicFilter}
    ORDER BY published_date DESC, created_at DESC
    LIMIT ${limit}
  `;

  const result = await executeQuery(sql, 'news_articles');

  return result.rows.map(parseNewsArticleRow);
}

/**
 * Delete old news articles (cleanup task)
 */
export async function deleteOldNewsArticles(maxAgeDays: number = 7): Promise<number> {
  const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const cutoffTimestamp = cutoffDate.toISOString();

  const sql = `
    DELETE FROM news_articles
    WHERE created_at < ${escapeSql(cutoffTimestamp)}
  `;

  const result = await executeQuery(sql, 'news_articles');

  // SQLite returns changes in result
  return (result as any).changes || 0;
}

/**
 * Parse a database row into a NewsArticle object
 */
function parseNewsArticleRow(row: any): NewsArticle {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    summary: row.summary || '',
    source: row.source || '',
    publishedDate: row.published_date || '',
    relevantTopics: row.relevant_topics ? JSON.parse(row.relevant_topics) : [],
    imageUrl: row.image_url || undefined,
    imageAlt: row.image_alt || undefined,
    imagePhotographer: row.image_photographer || undefined,
    imagePhotographerUrl: row.image_photographer_url || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
