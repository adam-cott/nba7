/**
 * ArticleCard Component
 *
 * Clickable article card for the news grid.
 * Selects on click (shows comments in sidebar) rather than navigating away.
 * Blue border + ring when selected.
 */

'use client';

import { NewsItem } from '@/lib/types';
import { TEAM_NAME_MAP } from '@/lib/constants';
import SentimentBadge from './SentimentBadge';
import { formatDistanceToNow } from 'date-fns';

interface ArticleCardProps {
  article: NewsItem;
  isSelected: boolean;
  onClick: () => void;
}

const SOURCE_STYLES: Record<string, { bg: string; text: string }> = {
  'espn': { bg: 'bg-red-600', text: 'text-white' },
  'cbs-sports': { bg: 'bg-blue-500', text: 'text-white' },
  'default': { bg: 'bg-gray-600', text: 'text-white' },
};

function getSourceStyle(sourceId?: string) {
  return SOURCE_STYLES[sourceId || 'default'] || SOURCE_STYLES.default;
}

export default function ArticleCard({ article, isSelected, onClick }: ArticleCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.published_at), {
    addSuffix: true,
  });
  const sourceStyle = getSourceStyle(article.source_id);

  return (
    <article
      onClick={onClick}
      className={`
        bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200
        border-2 cursor-pointer
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100 hover:border-gray-200'}
      `}
    >
      {article.image_url && (
        <div className="relative h-40 w-full overflow-hidden bg-gray-100 rounded-t-lg">
          <img
            src={article.image_url}
            alt={article.headline}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span
            className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold uppercase ${sourceStyle.bg} ${sourceStyle.text} shadow-sm`}
          >
            {article.source}
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          {!article.image_url && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${sourceStyle.bg} ${sourceStyle.text}`}>
              {article.source}
            </span>
          )}
          {article.image_url && <div />}
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">
          {article.headline}
        </h3>

        {article.summary && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{article.summary}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-1">
            {article.teams.slice(0, 2).map((teamAbbr) => (
              <span
                key={teamAbbr}
                className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded"
                title={TEAM_NAME_MAP[teamAbbr] || teamAbbr}
              >
                {teamAbbr}
              </span>
            ))}
            {article.teams.length > 2 && (
              <span className="text-xs text-gray-500">+{article.teams.length - 2}</span>
            )}
          </div>

          {article.sentiment_label && (
            <SentimentBadge
              label={article.sentiment_label}
              breakdown={article.sentiment_breakdown}
              sentimentSource={article.sentiment_source}
              showBreakdown={false}
              size="sm"
            />
          )}
        </div>

        <div className="mt-3 text-xs text-center font-medium text-blue-600">
          {isSelected ? 'Showing comments' : 'Click to see fan reactions'}
        </div>
      </div>
    </article>
  );
}
