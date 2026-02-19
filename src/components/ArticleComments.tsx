/**
 * ArticleComments Component
 *
 * Interactive comments sidebar (bottom-right 40%).
 * Initially shows "Click an article to see fan reactions".
 * Loads 3-4 cached comments when an article is selected.
 * Falls back to sentiment breakdown when no comments exist.
 */

'use client';

import { ArticleComment, NewsItem } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface ArticleCommentsProps {
  article: NewsItem | null;
  comments: ArticleComment[];
  loading: boolean;
}

export default function ArticleComments({ article, comments, loading }: ArticleCommentsProps) {
  // Initial: no article selected
  if (!article) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-8 h-full flex flex-col items-center justify-center text-center border-2 border-blue-100 min-h-[200px]">
        <div className="text-5xl mb-4">👆</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Click an article to see fan reactions
        </h3>
        <p className="text-gray-600 text-sm max-w-xs">
          Select any article from the grid to view YouTube comments and fan sentiment.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 h-full">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-12 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      {/* Article title */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">
          {article.headline}
        </h3>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
        >
          Read full article
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* No comments fallback */}
      {comments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-gray-700 font-medium mb-1">No fan reactions yet</p>
          <p className="text-gray-500 text-sm">Sentiment based on headline analysis</p>
          {article.sentiment_breakdown && (
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-green-600">👍 {article.sentiment_breakdown.positive}%</span>
              <span className="text-yellow-600">😐 {article.sentiment_breakdown.neutral}%</span>
              <span className="text-red-600">👎 {article.sentiment_breakdown.negative}%</span>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-sm font-bold text-gray-700">Fan Reactions</h4>
            <span className="text-xs text-gray-500">({comments.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {comments.slice(0, 4).map((comment) => {
              let timeAgo: string;
              try {
                timeAgo = formatDistanceToNow(new Date(comment.published_at), { addSuffix: true });
              } catch {
                timeAgo = '';
              }

              return (
                <div key={comment.id} className="pb-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-900">{comment.author_name}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {comment.like_count > 0 && (
                        <span className="flex items-center gap-0.5">👍 {comment.like_count}</span>
                      )}
                      {timeAgo && <span>{timeAgo}</span>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{comment.comment_text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 text-center">
            YouTube comments
          </div>
        </>
      )}
    </div>
  );
}
