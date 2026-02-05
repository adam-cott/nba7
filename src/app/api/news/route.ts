/**
 * News API Route
 *
 * GET /api/news - Fetch NBA news from RSS feeds
 * Query params:
 *   - team: Filter by team abbreviation (e.g., 'LAL', 'GSW')
 *   - refresh: Force refresh cache if 'true'
 *
 * This route fetches news from multiple sources, caches them in Supabase,
 * and returns them with optional team filtering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews, filterNewsByTeam } from '@/lib/news-fetcher';
import { analyzeSentiment } from '@/lib/sentiment';
import { supabase, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import { NewsItem } from '@/lib/types';
import { CACHE_DURATION } from '@/lib/constants';

// In-memory cache for when Supabase is not configured
let memoryCache: {
  items: NewsItem[];
  lastUpdated: number;
} | null = null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamFilter = searchParams.get('team') || 'ALL';
    const forceRefresh = searchParams.get('refresh') === 'true';

    let newsItems: NewsItem[] = [];
    let cached = false;
    let lastUpdated = new Date().toISOString();

    // Check if we should use cached data
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

        // Analyze sentiment for each news item
        const newsWithSentiment = await Promise.all(
          freshNews.map(async (item) => {
            const sentiment = await analyzeSentiment(
              `${item.headline} ${item.summary}`
            );
            return {
              ...item,
              sentiment_score: sentiment.score,
              sentiment_label: sentiment.label,
              sentiment_breakdown: sentiment.breakdown,
              created_at: new Date().toISOString(),
            } as NewsItem;
          })
        );

        // Upsert to Supabase (update if URL exists, insert if new)
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

        // Analyze sentiment for each news item
        const newsWithSentiment = await Promise.all(
          freshNews.map(async (item) => {
            const sentiment = await analyzeSentiment(
              `${item.headline} ${item.summary}`
            );
            return {
              ...item,
              sentiment_score: sentiment.score,
              sentiment_label: sentiment.label,
              sentiment_breakdown: sentiment.breakdown,
              created_at: new Date().toISOString(),
            } as NewsItem;
          })
        );

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
