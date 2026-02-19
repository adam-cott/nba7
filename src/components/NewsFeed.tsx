/**
 * NewsFeed Component (v2 — Hero + Grid Layout)
 *
 * Orchestrates the new layout:
 * - Top: Hero article (60%) + hero comments (40%)
 * - Bottom: Article grid (60%) + selected article comments (40%)
 * - Calculates hero article using recency-weighted scoring
 * - Manages selected article state and comment fetching
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NewsItem, ArticleComment } from '@/lib/types';
import TeamFilter from './TeamFilter';
import HeroArticle from './HeroArticle';
import HeroComments from './HeroComments';
import ArticleGrid from './ArticleGrid';
import ArticleComments from './ArticleComments';

interface NewsFeedProps {
  initialTeam?: string;
}

const STAR_PLAYERS = [
  'lebron', 'curry', 'durant', 'giannis', 'jokic', 'embiid', 'luka',
  'tatum', 'booker', 'shai', 'wembanyama', 'wemby', 'mitchell',
  'brunson', 'haliburton', 'cade', 'cunningham', 'flagg',
];

/**
 * Score an article for hero selection.
 * Recency is the dominant factor; sentiment strength, engagement,
 * image availability, and star player mentions are secondary.
 */
function calculateHeroScore(article: NewsItem, teamFilter: string): number {
  let score = 0;

  // 1. Recency (dominant — decays 5 pts per hour, max 100)
  const ageHours = (Date.now() - new Date(article.published_at).getTime()) / (1000 * 60 * 60);
  score += Math.max(0, 100 - ageHours * 5) * 100;

  // 2. Sentiment strength (distance from neutral)
  if (article.sentiment_score !== null) {
    score += Math.abs(article.sentiment_score) * 100 * 30;
  }

  // 3. Comment count (engagement)
  const commentCount = article.sentiment_comment_count || 0;
  score += Math.min(commentCount, 30) * 20;

  // 4. Has image (visual appeal for hero)
  if (article.image_url) {
    score += 15;
  }

  // 5. Star player mention
  const headline = article.headline.toLowerCase();
  if (STAR_PLAYERS.some(player => headline.includes(player))) {
    score += 10;
  }

  // 6. Team filter match bonus
  if (teamFilter !== 'ALL' && article.teams.includes(teamFilter)) {
    score *= 1.5;
  }

  return score;
}

export default function NewsFeed({ initialTeam = 'ALL' }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState(initialTeam);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Selected article (grid click)
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [selectedComments, setSelectedComments] = useState<ArticleComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Hero comments
  const [heroComments, setHeroComments] = useState<ArticleComment[]>([]);
  const [heroCommentsLoading, setHeroCommentsLoading] = useState(false);

  // Fetch news
  const fetchNews = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          team: selectedTeam,
          ...(refresh && { refresh: 'true' }),
        });

        const response = await fetch(`/api/news?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch news');
        }

        setNews(data.items);
        setLastUpdated(data.lastUpdated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching news:', err);
      } finally {
        setLoading(false);
      }
    },
    [selectedTeam]
  );

  // Fetch comments for an article (cache-only from Supabase)
  const fetchComments = useCallback(async (articleUrl: string): Promise<ArticleComment[]> => {
    try {
      const response = await fetch(`/api/comments?url=${encodeURIComponent(articleUrl)}`);
      const data = await response.json();
      if (!response.ok) return [];
      return data.comments as ArticleComment[];
    } catch (err) {
      console.error('Error fetching comments:', err);
      return [];
    }
  }, []);

  // Fetch news on mount and when team changes
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Hero article (recalculates on news change AND team filter change)
  const heroArticle = useMemo(() => {
    if (news.length === 0) return null;
    const scored = news.map(article => ({
      article,
      score: calculateHeroScore(article, selectedTeam),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].article;
  }, [news, selectedTeam]);

  // Grid articles (everything except hero)
  const gridArticles = useMemo(() => {
    if (!heroArticle) return news;
    return news.filter(a => a.id !== heroArticle.id);
  }, [news, heroArticle]);

  // Fetch hero comments when hero changes
  useEffect(() => {
    if (!heroArticle?.url) return;
    setHeroCommentsLoading(true);
    fetchComments(heroArticle.url).then(comments => {
      setHeroComments(comments);
      setHeroCommentsLoading(false);
    });
  }, [heroArticle?.url, fetchComments]);

  // Handle grid article selection
  const handleArticleSelect = useCallback(async (article: NewsItem) => {
    setSelectedArticle(article);
    setCommentsLoading(true);
    const comments = await fetchComments(article.url);
    setSelectedComments(comments);
    setCommentsLoading(false);
  }, [fetchComments]);

  // Team filter change
  const handleTeamChange = (team: string) => {
    setSelectedTeam(team);
    setSelectedArticle(null);
    setSelectedComments([]);
  };

  // Refresh
  const handleRefresh = useCallback(() => {
    fetchNews(true);
    setSelectedArticle(null);
    setSelectedComments([]);
  }, [fetchNews]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <TeamFilter selectedTeam={selectedTeam} onTeamChange={handleTeamChange} />
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated:{' '}
              {new Date(lastUpdated).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && news.length === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white rounded-lg shadow-md animate-pulse">
              <div className="h-64 bg-gray-200 rounded-t-lg" />
              <div className="p-6 space-y-3">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded mb-3" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 font-medium">Error loading news</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => fetchNews()}
            className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && news.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">📰</div>
          <p className="text-gray-700 font-medium">No news found</p>
          <p className="text-gray-500 text-sm mt-1">
            {selectedTeam !== 'ALL'
              ? 'No news articles found for this team. Try selecting "All Teams".'
              : 'Check back later for the latest NBA news.'}
          </p>
        </div>
      )}

      {/* Main layout: Hero + Grid */}
      {!loading && !error && heroArticle && (
        <div className="space-y-8">
          {/* Hero section: 60% article + 40% comments */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <HeroArticle article={heroArticle} />
              </div>
              <div className="lg:col-span-2">
                <HeroComments comments={heroComments} loading={heroCommentsLoading} />
              </div>
            </div>
          </section>

          {/* Grid section: 60% cards + 40% selected article comments */}
          {gridArticles.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">More Stories</h2>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                  <ArticleGrid
                    articles={gridArticles}
                    selectedArticleUrl={selectedArticle?.url || null}
                    onArticleSelect={handleArticleSelect}
                  />
                </div>
                <div className="lg:col-span-2">
                  <div className="lg:sticky lg:top-24">
                    <ArticleComments
                      article={selectedArticle}
                      comments={selectedComments}
                      loading={commentsLoading}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Refresh overlay */}
      {loading && news.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-sm">Refreshing...</span>
        </div>
      )}
    </div>
  );
}
