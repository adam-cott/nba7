/**
 * NewsCard Component
 *
 * Displays a single news item with headline, summary, source,
 * timestamp, thumbnail, and sentiment indicator.
 * Source badges are color-coded (ESPN = red, CBS Sports = blue).
 */

'use client';

import { NewsItem } from '@/lib/types';
import { TEAM_NAME_MAP } from '@/lib/constants';
import SentimentBadge from './SentimentBadge';
import { formatDistanceToNow } from 'date-fns';

interface NewsCardProps {
  item: NewsItem;
}

// Source-specific styling
const SOURCE_STYLES: Record<string, { bg: string; text: string }> = {
  'espn': {
    bg: 'bg-red-600',
    text: 'text-white',
  },
  'cbs-sports': {
    bg: 'bg-blue-500',
    text: 'text-white',
  },
  'default': {
    bg: 'bg-gray-600',
    text: 'text-white',
  },
};

function getSourceStyle(sourceId?: string) {
  return SOURCE_STYLES[sourceId || 'default'] || SOURCE_STYLES.default;
}

export default function NewsCard({ item }: NewsCardProps) {
  const timeAgo = formatDistanceToNow(new Date(item.published_at), {
    addSuffix: true,
  });

  const sourceStyle = getSourceStyle(item.source_id);

  return (
    <article className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
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
            {/* Source badge overlay on image */}
            <span
              className={`
                absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold uppercase
                ${sourceStyle.bg} ${sourceStyle.text}
                shadow-sm
              `}
            >
              {item.source}
            </span>
          </div>
        )}

        {/* Content section */}
        <div className="p-4">
          {/* Source (if no image) and time */}
          <div className="flex items-center justify-between mb-2">
            {!item.image_url && (
              <span
                className={`
                  px-2 py-0.5 rounded text-xs font-bold uppercase
                  ${sourceStyle.bg} ${sourceStyle.text}
                `}
              >
                {item.source}
              </span>
            )}
            {item.image_url && <div />}
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
                sentimentSource={item.sentiment_source}
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
