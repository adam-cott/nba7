export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  source_id?: string; // e.g., 'espn', 'cbs-sports'
  url: string;
  published_at: string;
  image_url?: string;
  teams: string[]; // Team abbreviations, e.g., ['LAL', 'GSW']
  sentiment_score: number | null; // -1 to 1
  sentiment_label: SentimentLabel | null;
  sentiment_breakdown?: SentimentBreakdown;
  sentiment_source?: string;
  sentiment_comment_count?: number;
  sentiment_analyzed_at?: string;
  created_at: string;
}

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentBreakdown {
  positive: number; // 0-100
  neutral: number;
  negative: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  event_context: string;
  active: boolean;
  created_at: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface YouTubeComment {
  text: string;
  author: string;
  publishedAt: string;
  likeCount: number;
}

export interface ArticleComment {
  id: string;
  article_url: string;
  comment_text: string;
  author_name: string;
  published_at: string;
  like_count: number;
  created_at: string;
}

export interface NBATeam {
  abbreviation: string;
  name: string;
  city: string;
  conference: 'Eastern' | 'Western';
  division: string;
}
