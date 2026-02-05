/**
 * NewsFeed Component
 *
 * Main container that fetches and displays the news feed.
 * Handles loading states, errors, and team filtering.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { NewsItem } from '@/lib/types';
import NewsCard from './NewsCard';
import TeamFilter from './TeamFilter';

interface NewsFeedProps {
  initialTeam?: string;
}

export default function NewsFeed({ initialTeam = 'ALL' }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState(initialTeam);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch news from API
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

  // Fetch news on mount and when team changes
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Handle team filter change
  const handleTeamChange = (team: string) => {
    setSelectedTeam(team);
  };

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    fetchNews(true);
  }, [fetchNews]);

  // Expose refresh function to parent via window for Header to access
  useEffect(() => {
    (window as unknown as { refreshNews?: () => void }).refreshNews = handleRefresh;
    return () => {
      delete (window as unknown as { refreshNews?: () => void }).refreshNews;
    };
  }, [handleRefresh]);

  return (
    <div className="space-y-6">
      {/* Filter section */}
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

      {/* Loading state */}
      {loading && news.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse"
            >
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
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
              ? `No news articles found for this team. Try selecting "All Teams".`
              : 'Check back later for the latest NBA news.'}
          </p>
        </div>
      )}

      {/* News grid */}
      {news.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Loading overlay for refresh */}
      {loading && news.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
