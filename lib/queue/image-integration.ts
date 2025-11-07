/**
 * Image Queue Integration Helper
 *
 * Helper functions to queue image fetch jobs for briefs and news articles.
 * Call these after saving briefs to automatically fetch images in the background.
 */

import { imageQueue } from './image-queue';

/**
 * News Article Interface (matches what fetchNewsArticles returns)
 */
export interface NewsArticle {
  title: string;
  description?: string;
  summary?: string;
  url?: string;
  source?: string;
  category?: string;
}

/**
 * Queue image fetch for a brief's featured image
 */
export async function queueBriefImage(params: {
  briefId: string;
  title: string;
  description: string;
  keywords?: string[];
}) {
  await imageQueue.add('fetch-brief-image', {
    briefId: params.briefId,
    title: params.title,
    description: params.description,
    keywords: params.keywords || [],
  });

  console.log(`📸 Queued featured image fetch for brief ${params.briefId}`);
}

/**
 * Queue image fetch for multiple news articles within a brief
 *
 * This creates separate image jobs for each news article so they each
 * get relevant thumbnails for display in the UI.
 */
export async function queueNewsArticleImages(params: {
  briefId: string;
  newsArticles: NewsArticle[];
}) {
  const jobs = [];

  for (let i = 0; i < params.newsArticles.length; i++) {
    const article = params.newsArticles[i];

    // Create a unique ID for this article within the brief
    const articleId = `${params.briefId}-article-${i}`;

    // Extract keywords from category or create from title
    const keywords = article.category
      ? [article.category]
      : article.title.split(' ').slice(0, 3); // First 3 words as fallback

    const job = imageQueue.add('fetch-article-image', {
      articleId,
      briefId: params.briefId,
      title: article.title,
      description: article.description || article.summary || article.title,
      keywords,
    });

    jobs.push(job);
  }

  await Promise.all(jobs);

  console.log(`📸 Queued ${jobs.length} article image fetches for brief ${params.briefId}`);
}

/**
 * Queue all images for a brief (featured + all article thumbnails)
 *
 * This is the main function to call after generating a brief.
 */
export async function queueAllBriefImages(params: {
  briefId: string;
  briefTitle: string;
  briefDescription: string;
  newsArticles: NewsArticle[];
  keywords?: string[];
}) {
  // Queue featured image for the brief
  await queueBriefImage({
    briefId: params.briefId,
    title: params.briefTitle,
    description: params.briefDescription,
    keywords: params.keywords,
  });

  // Queue thumbnail images for each news article
  if (params.newsArticles && params.newsArticles.length > 0) {
    await queueNewsArticleImages({
      briefId: params.briefId,
      newsArticles: params.newsArticles,
    });
  }

  console.log(`📸 Queued all images for brief ${params.briefId}`);
}
