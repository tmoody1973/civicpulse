import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  saveNewsArticles,
  type NewsArticleInput,
} from '@/lib/db/news-articles';

export async function POST(req: NextRequest) {
  try {
    const { userId, articles } = await req.json();

    console.log(`📰 /api/news/save - Saving ${articles?.length || 0} articles for user ${userId}`);

    // Validate input
    if (!userId || !articles || !Array.isArray(articles)) {
      return NextResponse.json(
        { error: 'Invalid input: userId and articles array required' },
        { status: 400 }
      );
    }

    // Optional: Check authentication
    // For now, allowing Inngest to call this endpoint without auth
    // In production, you might want to add Inngest signature verification

    // Convert articles to database format
    const newsArticleInputs: NewsArticleInput[] = articles.map((article: any) => ({
      title: article.title,
      url: article.url,
      summary: article.summary || '',
      source: article.source || 'Unknown',
      publishedDate: article.publishedDate || new Date().toISOString(),
      imageUrl: article.imageUrl || null,
      relevantTopics: article.relevantTopics || [],
    }));

    // Save to database
    const savedArticles = await saveNewsArticles(newsArticleInputs);

    console.log(`✅ Successfully saved ${savedArticles.length} articles`);

    return NextResponse.json({
      success: true,
      count: savedArticles.length,
      articles: savedArticles
    });

  } catch (error: any) {
    console.error('Error saving articles:', error);
    return NextResponse.json(
      {
        error: 'Failed to save articles',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
