# NBA News Hub

## Project Overview
NBA news aggregator built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS 4. Fetches articles from ESPN and CBS Sports RSS feeds, analyzes fan sentiment via YouTube comments + VADER, and includes interactive polls. Uses Supabase (PostgreSQL) for persistence with an in-memory fallback.

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm start` — Start production server

## Architecture

### Directory Structure
- `src/app/` — Next.js App Router pages and API routes
- `src/app/api/news/route.ts` — Main news API (fetching + sentiment pipeline)
- `src/app/api/polls/route.ts` — Poll fetching and voting
- `src/components/` — React client components (Header, NewsFeed, NewsCard, TeamFilter, Poll, PollSection, SentimentBadge)
- `src/lib/` — Core logic (news-fetcher, sentiment, youtube, supabase, constants, types). No dead modules (twitter.ts, reddit.ts removed).
- `supabase/schema.sql` — Database schema (tables, indexes, RLS policies, seed data)

### Key Files
- `src/lib/news-fetcher.ts` — RSS ingestion, filtering pipeline, fuzzy deduplication
- `src/lib/sentiment.ts` — VADER sentiment analysis with percentage normalization
- `src/lib/youtube.ts` — YouTube Data API search + comment fetching for sentiment
- `src/lib/constants.ts` — NBA teams, team keywords, news source config, cache durations

### Data Flow
1. RSS feeds fetched in parallel (ESPN + CBS Sports)
2. Non-NBA content filtered (URL path + keyword checks)
3. Betting/gambling content filtered
4. Fuzzy deduplication (Jaccard similarity + entity overlap)
5. Sentiment analyzed per article (YouTube comments → VADER, with headline fallback)
6. Results cached in Supabase (15-min news cache, 6-hour sentiment cache)
7. Writes use `supabaseAdmin` (service role key); reads use `supabase` (anon key)

### Filtering Pipeline (in order)
1. **Non-NBA filter** — Blocks articles from /nfl/, /olympics/, /mlb/ etc. URL paths + non-NBA title keywords
2. **Betting filter** — Blocks gambling content (sportsline, draftkings, parlay, etc.)
3. **Fuzzy dedup** — Two criteria: Jaccard similarity >= 0.45 on stemmed word sets OR >= 2 shared proper noun entities. 12-hour time window. Keeps newer article.

### Sentiment
- VADER compound score thresholds: >= 0.05 positive, <= -0.05 negative, else neutral
- YouTube keyword extraction prioritizes proper nouns (player/team names), max 4 terms
- Percentages always sum to 100% via `normalizePercentages()` rounding correction

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon/public key (reads)
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key (writes — server-side only)
YOUTUBE_API_KEY=                # Optional — YouTube Data API v3
```

## Conventions
- Path alias: `@/*` maps to `./src/*`
- Client components use `'use client'` directive
- TypeScript strict mode enabled
- Tailwind CSS 4 with `@import "tailwindcss"` syntax
- All components are in `src/components/`, all shared logic in `src/lib/`
- News source config (RSS URLs, quality bonuses) lives in `src/lib/constants.ts`
- Database operations check `isSupabaseConfigured()` and fall back to in-memory when not set up
- Supabase has two clients: `supabase` (anon key, reads) and `supabaseAdmin` (service role key, writes). Both exported from `src/lib/supabase.ts`
- Poll voting is IP-based (via `x-forwarded-for` header), not session-based

## Gotchas
- ESPN RSS doesn't include thumbnails — og:image is fetched from article pages (5s timeout)
- CBS Sports RSS leaks non-NBA articles despite the /nba/ feed URL
- "odds" and "picks" in betting filter are intentionally specific ("betting odds", "expert picks") to avoid filtering legitimate NBA content
- The `overflow-hidden` was removed from NewsCard's `<article>` element so the sentiment tooltip can render outside card bounds
- Mock draft filter only blocks "nfl mock draft", "mlb mock draft", "nhl mock draft" — NBA mock drafts are kept
