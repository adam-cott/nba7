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
import { NewsItem, YouTubeComment } from '@/lib/types';
import { CACHE_DURATION, SENTIMENT_CACHE_HOURS } from '@/lib/constants';

// In-memory cache for when Supabase is not configured
let memoryCache: {
  items: NewsItem[];
  lastUpdated: number;
} | null = null;

// Max concurrent YouTube API calls — each call is ~1-2 network round-trips,
// so 4 in parallel cuts wall-clock time ~4x without hammering the quota.
const SENTIMENT_CONCURRENCY = 6;

async function analyzeNewsItemSentiment(headline: string, summary: string, teams: string[] = []) {
  try {
    const searchQuery = extractKeywords(headline, teams);
    const comments = await fetchYouTubeComments(searchQuery, headline, teams);

    if (comments.length > 0) {
      const analysis = await analyzeMultipleSentiments(comments);

      const top10 = [...comments]
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 10);

      return {
        score: analysis.overall.score,
        label: analysis.overall.label,
        emoji: analysis.overall.emoji,
        breakdown: analysis.breakdown,
        source: 'youtube' as const,
        commentCount: analysis.commentCount,
        comments: top10,
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
      comments: [] as YouTubeComment[],
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
      comments: [] as YouTubeComment[],
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

        // Analyze sentiment for each news item, reusing cached sentiment when fresh.
        // Pre-allocate with index assignment to preserve article order after parallel processing.
        const newsWithSentiment: NewsItem[] = new Array(freshNews.length);
        // Collect comments to store AFTER news items are upserted (FK constraint)
        const pendingComments: { url: string; comments: YouTubeComment[] }[] = [];

        // First pass: fill in cached items immediately (no YouTube call needed)
        const staleIndices: number[] = [];
        for (let i = 0; i < freshNews.length; i++) {
          const item = freshNews[i];
          const existing = item.url ? sentimentByUrl.get(item.url) : undefined;
          const hasFreshSentiment = existing?.sentiment_analyzed_at &&
            (Date.now() - new Date(existing.sentiment_analyzed_at).getTime()) < sentimentMaxAge;

          if (hasFreshSentiment) {
            // Reuse cached sentiment — no YouTube API call needed
            console.log(`Using cached sentiment for: ${(item.headline || '').substring(0, 50)}...`);
            newsWithSentiment[i] = {
              ...item,
              sentiment_score: existing.sentiment_score,
              sentiment_label: existing.sentiment_label,
              sentiment_breakdown: existing.sentiment_breakdown,
              sentiment_source: existing.sentiment_source,
              sentiment_comment_count: existing.sentiment_comment_count,
              sentiment_analyzed_at: existing.sentiment_analyzed_at,
              created_at: new Date().toISOString(),
            } as NewsItem;
          } else {
            staleIndices.push(i);
          }
        }

        // Second pass: process stale items in parallel chunks (concurrency cap = SENTIMENT_CONCURRENCY)
        for (let chunkStart = 0; chunkStart < staleIndices.length; chunkStart += SENTIMENT_CONCURRENCY) {
          const chunk = staleIndices.slice(chunkStart, chunkStart + SENTIMENT_CONCURRENCY);
          const results = await Promise.all(
            chunk.map(async (i) => {
              const item = freshNews[i];
              const sentiment = await analyzeNewsItemSentiment(
                item.headline || '',
                item.summary || '',
                item.teams || [],
              );
              return { i, item, sentiment };
            })
          );

          for (const { i, item, sentiment } of results) {
            newsWithSentiment[i] = {
              ...item,
              sentiment_score: sentiment.score,
              sentiment_label: sentiment.label,
              sentiment_breakdown: sentiment.breakdown,
              sentiment_source: sentiment.source,
              sentiment_comment_count: sentiment.commentCount,
              sentiment_analyzed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            } as NewsItem;

            if (sentiment.comments.length > 0 && item.url) {
              pendingComments.push({ url: item.url, comments: sentiment.comments });
            }
          }
        }

        // Upsert news items first so FK constraint is satisfied for comment inserts
        if (supabaseAdmin) {
          const { error } = await supabaseAdmin
            .from(TABLES.NEWS_ITEMS)
            .upsert(newsWithSentiment, { onConflict: 'url' });

          if (error) {
            console.error('Error caching news to Supabase:', error);
          }

          // Now store comments in parallel — parent news_items rows are guaranteed to exist
          const admin = supabaseAdmin;
          await Promise.all(
            pendingComments.map(async ({ url, comments }) => {
              await admin
                .from(TABLES.ARTICLE_COMMENTS)
                .delete()
                .eq('article_url', url);

              const rows = comments.map(c => ({
                article_url: url,
                comment_text: c.text,
                author_name: c.author,
                published_at: c.publishedAt,
                like_count: c.likeCount,
              }));

              const { error: commentError } = await admin
                .from(TABLES.ARTICLE_COMMENTS)
                .insert(rows);

              if (commentError) {
                console.error('Error storing comments for', url, commentError);
              }
            })
          );
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

        // Analyze sentiment with YouTube comments (parallel, concurrency cap = SENTIMENT_CONCURRENCY)
        const newsWithSentiment: NewsItem[] = new Array(freshNews.length);

        for (let chunkStart = 0; chunkStart < freshNews.length; chunkStart += SENTIMENT_CONCURRENCY) {
          const chunk = freshNews.slice(chunkStart, chunkStart + SENTIMENT_CONCURRENCY);
          const results = await Promise.all(
            chunk.map(async (item, chunkIndex) => {
              const sentiment = await analyzeNewsItemSentiment(
                item.headline || '',
                item.summary || '',
                item.teams || [],
              );
              return { index: chunkStart + chunkIndex, item, sentiment };
            })
          );

          for (const { index, item, sentiment } of results) {
            newsWithSentiment[index] = {
              ...item,
              sentiment_score: sentiment.score,
              sentiment_label: sentiment.label,
              sentiment_breakdown: sentiment.breakdown,
              sentiment_source: sentiment.source,
              sentiment_comment_count: sentiment.commentCount,
              sentiment_analyzed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            } as NewsItem;
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
