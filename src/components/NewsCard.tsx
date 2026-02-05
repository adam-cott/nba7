/**
 * NewsCard Component
 *
 * Displays a single news item with headline, summary, source,
 * timestamp, thumbnail, and sentiment indicator.
 */

'use client';

import { NewsItem } from '@/lib/types';
import { TEAM_NAME_MAP } from '@/lib/constants';
import SentimentBadge from './SentimentBadge';
import { formatDistanceToNow } from 'date-fns';

interface NewsCardProps {
  item: NewsItem;
}

export default function NewsCard({ item }: NewsCardProps) {
  const timeAgo = formatDistanceToNow(new Date(item.published_at), {
    addSuffix: true,
  });

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 border border-gray-100">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* Image section */}
        {item.image_url && (
          <div className="relative h-48 w-full overflow-hidden bg-gray-100">
            <img
              src={item.image_url}
              alt={item.headline}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image on error
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content section */}
        <div className="p-4">
          {/* Source and time */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              {item.source}
            </span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>

          {/* Headline */}
          <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
            {item.headline}
          </h2>

          {/* Summary */}
          {item.summary && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-3">
              {item.summary}
            </p>
          )}

          {/* Teams and Sentiment */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
            {/* Team tags */}
            <div className="flex flex-wrap gap-1">
              {item.teams.slice(0, 3).map((teamAbbr) => (
                <span
                  key={teamAbbr}
                  className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded"
                  title={TEAM_NAME_MAP[teamAbbr] || teamAbbr}
                >
                  {teamAbbr}
                </span>
              ))}
              {item.teams.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{item.teams.length - 3} more
                </span>
              )}
            </div>

            {/* Sentiment badge */}
            {item.sentiment_label && (
              <SentimentBadge
                label={item.sentiment_label}
                breakdown={item.sentiment_breakdown}
                showBreakdown={false}
                size="sm"
              />
            )}
          </div>
        </div>
      </a>
    </article>
  );
}
