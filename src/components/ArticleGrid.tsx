/**
 * ArticleGrid Component
 *
 * Grid of clickable article cards (excludes hero article).
 * Responsive: 1 col mobile, 2 cols md, 3 cols lg.
 */

'use client';

import { NewsItem } from '@/lib/types';
import ArticleCard from './ArticleCard';

interface ArticleGridProps {
  articles: NewsItem[];
  selectedArticleUrl: string | null;
  onArticleSelect: (article: NewsItem) => void;
}

export default function ArticleGrid({
  articles,
  selectedArticleUrl,
  onArticleSelect,
}: ArticleGridProps) {
  if (articles.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">📰</div>
        <p className="text-gray-700 font-medium">No more articles</p>
        <p className="text-gray-500 text-sm mt-1">Check back later for more news.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          isSelected={article.url === selectedArticleUrl}
          onClick={() => onArticleSelect(article)}
        />
      ))}
    </div>
  );
}
