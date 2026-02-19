/**
 * News API Route
 *
 * GET /api/news - Fetch NBA news from RSS feeds with VADER sentiment analysis
 * Query params:
 *   - team: Filter by team abbreviation (e.g., 'LAL', 'GSW')
 *   - refresh: Force refresh cache if 'true'
 *
 * Sentiment is analyzed using VADER on YouTube comments when available,
 * falling back to headline analysis if no comments are found.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews, filterNewsByTeam } from '@/lib/news-fetcher';
import { analyzeSentiment, analyzeMultipleSentiments } from '@/lib/sentiment';
import { fetchYouTubeComments, extractKeywords } from '@/lib/youtube';
import { supabase, supabaseAdmin, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import { NewsItem } from '@/lib/types';
import { CACHE_DURATION, SENTIMENT_CACHE_HOURS } from '@/lib/constants';

// In-memory cache for when Supabase is not configured
let memoryCache: {
  items: NewsItem[];
  lastUpdated: number;
} | null = null;

async function analyzeNewsItemSentiment(headline: string, summary: string, articleUrl: string) {
  try {
    const searchQuery = extractKeywords(headline);
    const comments = await fetchYouTubeComments(searchQuery);

    if (comments.length > 0) {
      const analysis = await analyzeMultipleSentiments(comments);

      // Store top 10 comments in article_comments table
      if (supabaseAdmin && articleUrl) {
        const top10 = [...comments]
          .sort((a, b) => b.likeCount - a.likeCount)
          .slice(0, 10);

        // Delete existing comments for this article (handles re-fetch)
        await supabaseAdmin
          .from(TABLES.ARTICLE_COMMENTS)
          .delete()
          .eq('article_url', articleUrl);

        const rows = top10.map(c => ({
          article_url: articleUrl,
          comment_text: c.text,
          author_name: c.author,
          published_at: c.publishedAt,
          like_count: c.likeCount,
        }));

        const { error } = await supabaseAdmin
          .from(TABLES.ARTICLE_COMMENTS)
          .insert(rows);

        if (error) {
          console.error('Error storing comments:', error);
        }
      }

      return {
        score: analysis.overall.score,
        label: analysis.overall.label,
        emoji: analysis.overall.emoji,
        breakdown: analysis.breakdown,
        source: 'youtube' as const,
        commentCount: analysis.commentCount,
      };
    }

    const sentiment = await analyzeSentiment(`${headline} ${summary}`);
    return {
      score: sentiment.score,
      label: sentiment.label,
      emoji: sentiment.emoji,
      breakdown: sentiment.breakdown,
      source: 'headline' as const,
      commentCount: 0,
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
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
          const newestItem = cachedNews[0];
          const cacheAge = now - new Date(newestItem.created_at).getTime();

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

        // Batch-fetch existing sentiment to avoid redundant YouTube API calls
        const freshUrls = freshNews.map(item => item.url).filter(Boolean) as string[];
        const sentimentByUrl = new Map();

        if (freshUrls.length > 0) {
          const { data } = await supabase
            .from(TABLES.NEWS_ITEMS)
            .select('url, sentiment_score, sentiment_label, sentiment_breakdown, sentiment_source, sentiment_comment_count, sentiment_analyzed_at')
            .in('url', freshUrls);

          for (const row of data || []) {
            sentimentByUrl.set(row.url, row);
          }
        }

        const sentimentMaxAge = SENTIMENT_CACHE_HOURS * 60 * 60 * 1000;

        // Analyze sentiment for each news item, reusing cached sentiment when fresh
        const newsWithSentiment: NewsItem[] = [];

        for (let i = 0; i < freshNews.length; i++) {
          const item = freshNews[i];
          const existing = item.url ? sentimentByUrl.get(item.url) : undefined;
          const hasFreshSentiment = existing?.sentiment_analyzed_at &&
            (Date.now() - new Date(existing.sentiment_analyzed_at).getTime()) < sentimentMaxAge;

          if (hasFreshSentiment) {
            // Reuse cached sentiment — no YouTube API call needed
            console.log(`Using cached sentiment for: ${(item.headline || '').substring(0, 50)}...`);
            newsWithSentiment.push({
              ...item,
              sentiment_score: existing.sentiment_score,
              sentiment_label: existing.sentiment_label,
              sentiment_breakdown: existing.sentiment_breakdown,
              sentiment_source: existing.sentiment_source,
              sentiment_comment_count: existing.sentiment_comment_count,
              sentiment_analyzed_at: existing.sentiment_analyzed_at,
              created_at: new Date().toISOString(),
            } as NewsItem);
          } else {
            // Cache miss or stale — analyze fresh via YouTube
            const sentiment = await analyzeNewsItemSentiment(
              item.headline || '',
              item.summary || '',
              item.url || ''
            );

            newsWithSentiment.push({
              ...item,
              sentiment_score: sentiment.score,
              sentiment_label: sentiment.label,
              sentiment_breakdown: sentiment.breakdown,
              sentiment_source: sentiment.source,
              sentiment_comment_count: sentiment.commentCount,
              sentiment_analyzed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            } as NewsItem);

            // Small delay between YouTube API calls to respect rate limits
            if (i < freshNews.length - 1 && sentiment.source === 'youtube') {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        }

        // Upsert to Supabase (using admin client to bypass RLS)
        if (supabaseAdmin) {
          const { error } = await supabaseAdmin
            .from(TABLES.NEWS_ITEMS)
            .upsert(newsWithSentiment, { onConflict: 'url' });

          if (error) {
            console.error('Error caching news to Supabase:', error);
          }
        } else {
          console.warn('supabaseAdmin not configured — skipping cache write');
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

        // Analyze sentiment with YouTube comments
        const newsWithSentiment: NewsItem[] = [];

        for (let i = 0; i < freshNews.length; i++) {
          const item = freshNews[i];
          const sentiment = await analyzeNewsItemSentiment(
            item.headline || '',
            item.summary || '',
            item.url || ''
          );

          newsWithSentiment.push({
            ...item,
            sentiment_score: sentiment.score,
            sentiment_label: sentiment.label,
            sentiment_breakdown: sentiment.breakdown,
            sentiment_source: sentiment.source,
            sentiment_comment_count: sentiment.commentCount,
            sentiment_analyzed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          } as NewsItem);

          // Small delay between YouTube API calls
          if (i < freshNews.length - 1 && sentiment.source === 'youtube') {
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
