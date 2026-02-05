/**
 * News API Route
 *
 * GET /api/news - Fetch NBA news from RSS feeds with VADER sentiment analysis
 * Query params:
 *   - team: Filter by team abbreviation (e.g., 'LAL', 'GSW')
 *   - refresh: Force refresh cache if 'true'
 *
 * Sentiment is analyzed using VADER on Reddit comments when available,
 * falling back to headline analysis if no comments are found.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews, filterNewsByTeam } from '@/lib/news-fetcher';
import { analyzeSentiment, analyzeMultipleSentiments } from '@/lib/sentiment';
import { fetchRedditComments, extractKeywords } from '@/lib/reddit';
import { supabase, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import { NewsItem } from '@/lib/types';
import { CACHE_DURATION } from '@/lib/constants';

// In-memory cache for when Supabase is not configured
let memoryCache: {
  items: NewsItem[];
  lastUpdated: number;
} | null = null;

/**
 * Analyze sentiment for a news item using Reddit comments
 * Falls back to headline analysis if no comments found
 */
async function analyzeNewsItemSentiment(headline: string, summary: string) {
  try {
    // Extract keywords and fetch Reddit comments
    const searchQuery = extractKeywords(headline);
    const comments = await fetchRedditComments(searchQuery);

    if (comments.length >= 3) {
      // Analyze Reddit comments for real fan sentiment
      const analysis = await analyzeMultipleSentiments(comments);
      return {
        score: analysis.overall.score,
        label: analysis.overall.label,
        emoji: analysis.overall.emoji,
        breakdown: analysis.breakdown,
        source: 'reddit' as const,
        commentCount: analysis.commentCount,
      };
    } else {
      // Fallback: analyze the headline and summary with VADER
      const sentiment = await analyzeSentiment(`${headline} ${summary}`);
      return {
        score: sentiment.score,
        label: sentiment.label,
        emoji: sentiment.emoji,
        breakdown: sentiment.breakdown,
        source: 'headline' as const,
        commentCount: 0,
      };
    }
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    // Return neutral on error
    return {
      score: 0,
      label: 'neutral' as const,
      emoji: '🟡',
      breakdown: { positive: 33, neutral: 34, negative: 33 },
      source: 'fallback' as const,
      commentCount: 0,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamFilter = searchParams.get('team') || 'ALL';
    const forceRefresh = searchParams.get('refresh') === 'true';

    let newsItems: NewsItem[] = [];
    let cached = false;
    let lastUpdated = new Date().toISOString();

    const now = Date.now();

    if (isSupabaseConfigured()) {
      // Try to get cached news from Supabase
      if (!forceRefresh) {
        const { data: cachedNews } = await supabase
          .from(TABLES.NEWS_ITEMS)
          .select('*')
          .order('published_at', { ascending: false })
          .limit(50);

        if (cachedNews && cachedNews.length > 0) {
          const oldestItem = cachedNews[cachedNews.length - 1];
          const cacheAge = now - new Date(oldestItem.created_at).getTime();

          if (cacheAge < CACHE_DURATION.NEWS) {
            newsItems = cachedNews as NewsItem[];
            cached = true;
            lastUpdated = cachedNews[0].created_at;
          }
        }
      }

      // Fetch fresh news if needed
      if (!cached || forceRefresh) {
        const freshNews = await fetchAllNews();

        // Analyze sentiment for each news item with Reddit comments
        // Process in smaller batches to respect Reddit rate limits
        const newsWithSentiment: NewsItem[] = [];

        for (let i = 0; i < freshNews.length; i++) {
          const item = freshNews[i];
          const sentiment = await analyzeNewsItemSentiment(
            item.headline || '',
            item.summary || ''
          );

          newsWithSentiment.push({
            ...item,
            sentiment_score: sentiment.score,
            sentiment_label: sentiment.label,
            sentiment_breakdown: sentiment.breakdown,
            created_at: new Date().toISOString(),
          } as NewsItem);

          // Small delay between Reddit API calls to respect rate limits
          if (i < freshNews.length - 1 && sentiment.source === 'reddit') {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        // Upsert to Supabase
        const { error } = await supabase
          .from(TABLES.NEWS_ITEMS)
          .upsert(newsWithSentiment, { onConflict: 'url' });

        if (error) {
          console.error('Error caching news to Supabase:', error);
        }

        newsItems = newsWithSentiment;
        lastUpdated = new Date().toISOString();
      }
    } else {
      // Use in-memory cache when Supabase is not configured
      if (
        !forceRefresh &&
        memoryCache &&
        now - memoryCache.lastUpdated < CACHE_DURATION.NEWS
      ) {
        newsItems = memoryCache.items;
        cached = true;
        lastUpdated = new Date(memoryCache.lastUpdated).toISOString();
      } else {
        const freshNews = await fetchAllNews();

        // Analyze sentiment with Reddit comments
        const newsWithSentiment: NewsItem[] = [];

        for (let i = 0; i < freshNews.length; i++) {
          const item = freshNews[i];
          const sentiment = await analyzeNewsItemSentiment(
            item.headline || '',
            item.summary || ''
          );

          newsWithSentiment.push({
            ...item,
            sentiment_score: sentiment.score,
            sentiment_label: sentiment.label,
            sentiment_breakdown: sentiment.breakdown,
            created_at: new Date().toISOString(),
          } as NewsItem);

          // Small delay between Reddit API calls
          if (i < freshNews.length - 1 && sentiment.source === 'reddit') {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        memoryCache = {
          items: newsWithSentiment,
          lastUpdated: now,
        };

        newsItems = newsWithSentiment;
        lastUpdated = new Date().toISOString();
      }
    }

    // Apply team filter
    const filteredNews = filterNewsByTeam(newsItems, teamFilter);

    return NextResponse.json({
      items: filteredNews,
      cached,
      lastUpdated,
      total: filteredNews.length,
    });
  } catch (error) {
    console.error('Error in news API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', details: String(error) },
      { status: 500 }
    );
  }
}
