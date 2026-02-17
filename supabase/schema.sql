-- NBA News Hub - Supabase Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- News items cache table
-- Stores fetched news articles with sentiment analysis
CREATE TABLE IF NOT EXISTS news_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  source_id TEXT, -- Source identifier (e.g., 'espn', 'cbs-sports')
  url TEXT UNIQUE NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  image_url TEXT,
  teams TEXT[] DEFAULT '{}', -- Array of team abbreviations (e.g., ['LAL', 'GSW'])
  sentiment_score NUMERIC, -- Score from -1 (negative) to 1 (positive)
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
  sentiment_breakdown JSONB, -- { positive: number, neutral: number, negative: number }
  sentiment_source TEXT, -- Where sentiment came from ('youtube', 'headline', 'fallback')
  sentiment_comment_count INTEGER DEFAULT 0, -- Number of YouTube comments analyzed
  sentiment_analyzed_at TIMESTAMPTZ, -- When sentiment was last analyzed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on URL for upsert operations
CREATE INDEX IF NOT EXISTS idx_news_items_url ON news_items(url);

-- Create index on published_at for sorting
CREATE INDEX IF NOT EXISTS idx_news_items_published ON news_items(published_at DESC);

-- Create index on teams array for filtering
CREATE INDEX IF NOT EXISTS idx_news_items_teams ON news_items USING GIN(teams);

-- Polls table
-- Stores poll questions and voting options
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]', -- Array of { text: string, votes: number }
  event_context TEXT, -- Brief context about the NBA event
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active polls
CREATE INDEX IF NOT EXISTS idx_polls_active ON polls(active) WHERE active = TRUE;

-- Poll responses table
-- Tracks individual votes (for preventing duplicate votes by IP)
CREATE TABLE IF NOT EXISTS poll_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  ip_address TEXT NOT NULL, -- Voter IP address for duplicate prevention
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate votes from same IP
  UNIQUE(poll_id, ip_address)
);

-- Create index for checking existing votes
CREATE INDEX IF NOT EXISTS idx_poll_responses_lookup ON poll_responses(poll_id, ip_address);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

-- News items: Anyone can read
CREATE POLICY "News items are viewable by everyone" ON news_items
  FOR SELECT USING (true);

-- News items: Only service role can insert/update (server-side only)
CREATE POLICY "News items are insertable by service role" ON news_items
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "News items are updatable by service role" ON news_items
  FOR UPDATE USING (auth.role() = 'service_role');

-- Polls: Anyone can read active polls
CREATE POLICY "Polls are viewable by everyone" ON polls
  FOR SELECT USING (true);

-- Polls: Only service role can create/update polls
CREATE POLICY "Polls are insertable by service role" ON polls
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Polls are updatable by service role" ON polls
  FOR UPDATE USING (auth.role() = 'service_role');

-- Poll responses: Only service role can insert (votes go through API)
CREATE POLICY "Poll responses are insertable by service role" ON poll_responses
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Poll responses: Only service role can read (for vote checking)
CREATE POLICY "Poll responses are viewable by service role" ON poll_responses
  FOR SELECT USING (auth.role() = 'service_role');

-- Sample data: Insert initial polls (all votes start at 0)
INSERT INTO polls (question, options, event_context, active) VALUES
(
  'Who wins the 2025-26 NBA MVP?',
  '[{"text": "Shai Gilgeous-Alexander", "votes": 0}, {"text": "Cade Cunningham", "votes": 0}, {"text": "Nikola Jokic", "votes": 0}, {"text": "Victor Wembanyama", "votes": 0}]',
  '2025-26 NBA MVP Race',
  true
),
(
  'Who wins 2025-26 Rookie of the Year?',
  '[{"text": "Cooper Flagg", "votes": 0}, {"text": "Ace Bailey", "votes": 0}, {"text": "Dylan Harper", "votes": 0}, {"text": "Kon Knueppel", "votes": 0}, {"text": "Someone else", "votes": 0}]',
  '2025-26 Rookie of the Year',
  true
),
(
  'Are the Detroit Pistons a legitimate championship contender?',
  '[{"text": "Yes, they''re for real", "votes": 0}, {"text": "No, they''ll fold in the playoffs", "votes": 0}, {"text": "Ask me in April", "votes": 0}]',
  '2025-26 Pistons Contender Debate',
  true
),
(
  'Who finishes as the 2 seed in the West?',
  '[{"text": "Oklahoma City Thunder", "votes": 0}, {"text": "San Antonio Spurs", "votes": 0}, {"text": "Denver Nuggets", "votes": 0}, {"text": "Houston Rockets", "votes": 0}, {"text": "Minnesota Timberwolves", "votes": 0}]',
  '2025-26 Western Conference Race',
  true
);

-- Function to clean up old news items (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_news()
RETURNS void AS $$
BEGIN
  DELETE FROM news_items
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-news', '0 0 * * *', 'SELECT cleanup_old_news();');
