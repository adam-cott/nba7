# NBA News Hub

A modern NBA news aggregator with fan sentiment analysis. Built with Next.js 14, Tailwind CSS, and Supabase.

## Features

- **League-Wide News Feed**: Aggregates NBA headlines from ESPN and Bleacher Report
- **Sentiment Analysis**: Shows fan sentiment (positive/neutral/negative) for each story
- **Team Filtering**: Filter news by any of the 30 NBA teams
- **Fan Polls**: Interactive polls with live results and unlocked insights
- **Mobile-First Design**: Responsive, clean interface optimized for readability

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **APIs**: RSS feeds (ESPN, Bleacher Report), OpenAI (optional for sentiment)
- **Deployment**: Vercel-ready

## Quick Start

### 1. Install Dependencies

```bash
cd nbanewsapp
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase (required for full functionality)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI (optional - falls back to keyword analysis)
OPENAI_API_KEY=your_openai_key
```

### 3. Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor
3. Copy and run the contents of `supabase/schema.sql`
4. Copy your project URL and anon key to `.env.local`

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
nbanewsapp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── news/         # News fetching endpoint
│   │   │   └── polls/        # Poll voting endpoint
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/            # React components
│   │   ├── Header.tsx        # App header
│   │   ├── NewsFeed.tsx      # News feed container
│   │   ├── NewsCard.tsx      # Individual news item
│   │   ├── TeamFilter.tsx    # Team dropdown filter
│   │   ├── Poll.tsx          # Poll voting component
│   │   ├── PollSection.tsx   # Poll container
│   │   └── SentimentBadge.tsx # Sentiment indicator
│   └── lib/                   # Utilities and config
│       ├── constants.ts      # NBA teams, settings
│       ├── news-fetcher.ts   # RSS feed parser
│       ├── sentiment.ts      # Sentiment analysis
│       ├── supabase.ts       # Database client
│       └── types.ts          # TypeScript interfaces
├── supabase/
│   └── schema.sql            # Database schema
├── .env.local.example        # Environment template
└── README.md
```

## API Endpoints

### GET /api/news

Fetch NBA news with optional filtering.

Query parameters:
- `team` - Filter by team abbreviation (e.g., `LAL`, `GSW`)
- `refresh` - Force refresh cache (`true`)

### GET /api/polls

Get all active polls.

### POST /api/polls

Submit a vote.

Body:
```json
{
  "pollId": "poll-uuid",
  "optionIndex": 0,
  "sessionId": "client-session-id"
}
```

## Extending the App

### Adding New News Sources

Edit `src/lib/constants.ts` to add new RSS feeds:

```typescript
export const NEWS_SOURCES = {
  // Add your source
  YOUR_SOURCE: {
    name: 'Source Name',
    rssUrl: 'https://example.com/rss',
    baseUrl: 'https://example.com',
  },
};
```

Then update `src/lib/news-fetcher.ts` to fetch from the new source.

### Adding New Teams Keywords

Edit `TEAM_KEYWORDS` in `src/lib/constants.ts` to improve team matching:

```typescript
export const TEAM_KEYWORDS: Record<string, string[]> = {
  LAL: ['lakers', 'lebron', 'your-new-keyword'],
  // ...
};
```

### Customizing Sentiment Analysis

Edit `src/lib/sentiment.ts` to:
- Add more positive/negative keywords
- Adjust the OpenAI prompt
- Change sentiment thresholds

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

## MVP Constraints (by design)

- No user authentication (polls use localStorage)
- Manual refresh (no real-time updates)
- Simple sentiment (positive/neutral/negative only)
- No personalization/recommendations
- No push notifications

These are intentional for MVP validation. Extend as needed.

## License

MIT
