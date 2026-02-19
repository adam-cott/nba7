/**
 * HeroComments Component
 *
 * Displays cached YouTube comments for the hero article (right 40% of hero).
 * Shows 5-6 comments with author names and like counts.
 * Falls back to "No fan reactions yet" when no comments are cached.
 */

'use client';

import { ArticleComment } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface HeroCommentsProps {
  comments: ArticleComment[];
  loading: boolean;
}

export default function HeroComments({ comments, loading }: HeroCommentsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 h-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Fan Reactions</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="text-5xl mb-4">💬</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Fan Reactions Yet</h3>
        <p className="text-gray-600 text-sm">
          Sentiment is based on headline analysis. Check back later for YouTube fan comments.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        Fan Reactions
        <span className="text-sm font-normal text-gray-500">({comments.length})</span>
      </h3>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {comments.slice(0, 6).map((comment) => {
          let timeAgo: string;
          try {
            timeAgo = formatDistanceToNow(new Date(comment.published_at), { addSuffix: true });
          } catch {
            timeAgo = '';
          }

          return (
            <div key={comment.id} className="pb-4 border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{comment.author_name}</span>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {comment.like_count > 0 && (
                    <span className="flex items-center gap-1">👍 {comment.like_count}</span>
                  )}
                  {timeAgo && <span>{timeAgo}</span>}
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{comment.comment_text}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 text-center">
        Comments from YouTube
      </div>
    </div>
  );
}
