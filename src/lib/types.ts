/**
 * Core TypeScript interfaces for the NBA News Aggregator
 * These types match the Supabase schema and are used throughout the app
 */

// News item from the database/API
export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  source_id?: string; // Source identifier for styling (e.g., 'espn', 'cbs-sports')
  url: string;
  published_at: string;
  image_url?: string;
  teams: string[]; // Array of team abbreviations (e.g., ['LAL', 'GSW'])
  sentiment_score: number | null; // -1 to 1 scale
  sentiment_label: SentimentLabel | null;
  sentiment_breakdown?: SentimentBreakdown;
  created_at: string;
}

// Sentiment analysis result
export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentBreakdown {
  positive: number; // Percentage 0-100
  neutral: number;
  negative: number;
}

// Poll data structure
export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  event_context: string; // Brief context about the NBA event
  active: boolean;
  created_at: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

// Poll response tracking
export interface PollResponse {
  id: string;
  poll_id: string;
  option_index: number;
  session_id: string;
  created_at: string;
}

// NBA Team data
export interface NBATeam {
  abbreviation: string;
  name: string;
  city: string;
  conference: 'Eastern' | 'Western';
  division: string;
}

// API response types
export interface NewsApiResponse {
  items: NewsItem[];
  cached: boolean;
  lastUpdated: string;
}

export interface PollVoteRequest {
  pollId: string;
  optionIndex: number;
  sessionId: string;
}

export interface SentimentAnalysisRequest {
  newsId: string;
  headline: string;
  teamAbbreviations: string[];
}
