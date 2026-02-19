/**
 * HeroArticle Component
 *
 * Featured article display in hero section (left 60%).
 * Shows large image, headline, excerpt, sentiment, teams, and source.
 */

'use client';

import { NewsItem } from '@/lib/types';
import { TEAM_NAME_MAP } from '@/lib/constants';
import SentimentBadge from './SentimentBadge';
import { formatDistanceToNow } from 'date-fns';

interface HeroArticleProps {
  article: NewsItem;
}

const SOURCE_STYLES: Record<string, { bg: string; text: string }> = {
  'espn': { bg: 'bg-red-600', text: 'text-white' },
  'cbs-sports': { bg: 'bg-blue-500', text: 'text-white' },
  'default': { bg: 'bg-gray-600', text: 'text-white' },
};

function getSourceStyle(sourceId?: string) {
  return SOURCE_STYLES[sourceId || 'default'] || SOURCE_STYLES.default;
}

export default function HeroArticle({ article }: HeroArticleProps) {
  const timeAgo = formatDistanceToNow(new Date(article.published_at), {
    addSuffix: true,
  });
  const sourceStyle = getSourceStyle(article.source_id);

  return (
    <article className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
      {/* Large hero image */}
      {article.image_url && (
        <div className="relative h-64 lg:h-80 w-full overflow-hidden bg-gray-100">
          <img
            src={article.image_url}
            alt={article.headline}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span
            className={`absolute top-3 left-3 px-3 py-1.5 rounded text-sm font-bold uppercase ${sourceStyle.bg} ${sourceStyle.text} shadow-lg`}
          >
            {article.source}
          </span>
          <span className="absolute top-3 right-3 px-3 py-1.5 rounded text-sm font-bold bg-orange-500 text-white shadow-lg">
            FEATURED
          </span>
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          {!article.image_url && (
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${sourceStyle.bg} ${sourceStyle.text}`}>
              {article.source}
            </span>
          )}
          {article.image_url && <div />}
          <span className="text-sm text-gray-500">{timeAgo}</span>
        </div>

        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 leading-tight">
          {article.headline}
        </h2>

        {article.summary && (
          <p className="text-base text-gray-700 mb-6 leading-relaxed line-clamp-4">
            {article.summary}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {article.teams.slice(0, 4).map((teamAbbr) => (
                <span
                  key={teamAbbr}
                  className="inline-block px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-full"
                  title={TEAM_NAME_MAP[teamAbbr] || teamAbbr}
                >
                  {teamAbbr}
                </span>
              ))}
              {article.teams.length > 4 && (
                <span className="text-sm text-gray-500">+{article.teams.length - 4} more</span>
              )}
            </div>

            {article.sentiment_label && (
              <SentimentBadge
                label={article.sentiment_label}
                breakdown={article.sentiment_breakdown}
                sentimentSource={article.sentiment_source}
                showBreakdown={false}
                size="lg"
              />
            )}
          </div>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Read full article
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </article>
  );
}
