/**
 * News Fetching Utilities
 *
 * Handles fetching NBA news from multiple RSS feeds (ESPN, CBS Sports).
 * Implements smart duplicate detection that keeps the higher-quality article.
 */

import Parser from 'rss-parser';
import { randomUUID } from 'crypto';
import { NewsItem } from './types';
import { TEAM_KEYWORDS, NEWS_SOURCES, CLICKBAIT_PHRASES } from './constants';

/**
 * Betting-related keywords to filter out sports betting / gambling articles.
 * "odds" and "picks" have been made more specific to avoid false positives
 * on legitimate articles (e.g., "odds of making the playoffs", "top draft picks").
 */
const BETTING_KEYWORDS = [
  'promo code',
  'bonus bets',
  'best bets',
  'player props',
  'betting odds',
  'betting',
  'wager',
  'sportsline',
  'draftkings',
  'fanduel',
  'betmgm',
  'affiliate',
  'expert picks',
  'against the spread',
  'parlay',
];

/**
 * Check if an article is betting/gambling content based on title and description.
 */
function isBettingContent(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return BETTING_KEYWORDS.some(keyword => text.includes(keyword));
}

const OG_IMAGE_TIMEOUT_MS = 5000;

/**
 * Fetch the og:image meta tag from an article URL.
 * Returns undefined if the fetch fails or times out.
 */
async function fetchOgImage(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OG_IMAGE_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NBANewsHub/1.0' },
    });
    clearTimeout(timeout);

    // Only read enough of the HTML to find the og:image (usually in <head>)
    const html = await response.text();
    const head = html.substring(0, 15000);
    const match = head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    return match?.[1] || undefined;
  } catch {
    return undefined;
  }
}

type NewsItemWithSource = Partial<NewsItem>;

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'thumbnail'],
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
    ],
  },
});

/**
 * Extract image URL from RSS item
 * Different feeds use different fields for images
 */
function extractImageUrl(item: Parser.Item & {
  thumbnail?: { $?: { url?: string } };
  mediaContent?: { $?: { url?: string } };
  enclosure?: { url?: string }
}): string | undefined {
  // Try various common image fields
  if (item.thumbnail?.$?.url) return item.thumbnail.$.url;
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.enclosure?.url) return item.enclosure.url;

  // Try to extract from content
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }

  return undefined;
}

/**
 * Match headline/content to NBA teams
 * Returns array of team abbreviations that are mentioned
 */
export function matchTeams(headline: string, content?: string): string[] {
  const text = `${headline} ${content || ''}`.toLowerCase();
  const matchedTeams: string[] = [];

  for (const [abbr, keywords] of Object.entries(TEAM_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        if (!matchedTeams.includes(abbr)) {
          matchedTeams.push(abbr);
        }
        break;
      }
    }
  }

  return matchedTeams;
}

/**
 * Calculate quality score for an article
 * Higher score = better quality, should be kept over duplicates
 */
function calculateArticleQuality(article: NewsItemWithSource): number {
  let score = 0;
  const headline = article.headline?.toLowerCase() || '';
  const summary = article.summary || '';

  // 1. Prefer longer, more detailed summaries (up to 200 chars)
  const summaryLength = Math.min(summary.length, 200);
  score += summaryLength;

  // 2. Source preference (configured in constants)
  if (article.source_id === 'cbs-sports') {
    score += NEWS_SOURCES.CBS_SPORTS.qualityBonus;
  } else if (article.source_id === 'espn') {
    score += NEWS_SOURCES.ESPN.qualityBonus;
  }

  // 3. Penalize clickbait indicators in headlines
  for (const phrase of CLICKBAIT_PHRASES) {
    if (headline.includes(phrase.toLowerCase())) {
      score -= 150; // Heavy penalty for clickbait
      break;
    }
  }

  // 4. Penalize excessive punctuation (clickbait signals)
  const exclamationCount = (article.headline?.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    score -= 50 * exclamationCount;
  }

  // 5. Penalize ALL CAPS words (except common acronyms like NBA, MVP)
  const words = article.headline?.split(/\s+/) || [];
  const capsWords = words.filter(w =>
    w.length > 2 &&
    w === w.toUpperCase() &&
    !['NBA', 'MVP', 'ESPN', 'NFL', 'USA', 'TNT'].includes(w)
  );
  if (capsWords.length > 1) {
    score -= 30 * capsWords.length;
  }

  // 6. Prefer more recent articles (small bonus)
  if (article.published_at) {
    const articleAge = Date.now() - new Date(article.published_at).getTime();
    const hoursOld = articleAge / (1000 * 60 * 60);
    if (hoursOld < 1) {
      score += 20; // Small bonus for very recent
    }
  }

  return score;
}

/**
 * Remove duplicate articles and keep the best version of each story.
 * Enforces source balance — at least 40% from each source.
 */
function removeDuplicates(articles: NewsItemWithSource[]): NewsItemWithSource[] {
  const duplicateGroups = new Map<string, NewsItemWithSource[]>();

  // Group articles with similar headlines together
  for (const article of articles) {
    const fingerprint = (article.headline || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .substring(0, 50);

    if (!fingerprint) continue;

    if (!duplicateGroups.has(fingerprint)) {
      duplicateGroups.set(fingerprint, []);
    }
    duplicateGroups.get(fingerprint)!.push(article);
  }

  // For true duplicates (same story), pick the better one using quality score
  const deduped = Array.from(duplicateGroups.values()).map(group => {
    if (group.length === 1) return group[0];
    return group.reduce((best, current) =>
      calculateArticleQuality(current) > calculateArticleQuality(best) ? current : best
    );
  });

  // Enforce source balance — guarantee at least 40% from each source
  const espnArticles = deduped.filter(a => a.source_id === 'espn');
  const cbsArticles = deduped.filter(a => a.source_id === 'cbs-sports');

  const total = deduped.length;
  const minPerSource = Math.floor(total * 0.4);

  const espnPick = espnArticles.slice(0, Math.max(minPerSource, espnArticles.length));
  const cbsPick = cbsArticles.slice(0, Math.max(minPerSource, cbsArticles.length));

  // Merge and re-sort by recency
  return [...espnPick, ...cbsPick]
    .sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());
}

/**
 * Fetch news from ESPN RSS feed.
 * ESPN's RSS doesn't include thumbnails, so we fetch og:image from article pages
 * in parallel for any items missing an image.
 */
async function fetchESPNNews(): Promise<NewsItemWithSource[]> {
  try {
    const feed = await parser.parseURL(NEWS_SOURCES.ESPN.rssUrl);

    const articles = feed.items.map((item) => ({
      id: randomUUID(),
      headline: item.title || 'No title',
      summary: item.contentSnippet || item.content?.slice(0, 300) || '',
      source: NEWS_SOURCES.ESPN.name,
      source_id: NEWS_SOURCES.ESPN.id,
      url: item.link || '',
      published_at: item.pubDate || new Date().toISOString(),
      image_url: extractImageUrl(item),
      teams: matchTeams(item.title || '', item.contentSnippet),
    }));

    // Fetch og:image in parallel for articles missing an image
    const articlesNeedingImages = articles.filter(a => !a.image_url && a.url);
    if (articlesNeedingImages.length > 0) {
      console.log(`Fetching og:image for ${articlesNeedingImages.length} ESPN articles...`);
      const ogResults = await Promise.allSettled(
        articlesNeedingImages.map(a => fetchOgImage(a.url))
      );
      ogResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
          articlesNeedingImages[i].image_url = result.value;
        }
      });
      const found = ogResults.filter(r => r.status === 'fulfilled' && r.value).length;
      console.log(`Found og:image for ${found}/${articlesNeedingImages.length} ESPN articles`);
    }

    return articles;
  } catch (error) {
    console.error('Error fetching ESPN news:', error);
    return [];
  }
}

/**
 * Fetch news from CBS Sports RSS feed
 */
async function fetchCBSSportsNews(): Promise<NewsItemWithSource[]> {
  try {
    const feed = await parser.parseURL(NEWS_SOURCES.CBS_SPORTS.rssUrl);

    return feed.items.map((item) => ({
      id: randomUUID(),
      headline: item.title || 'No title',
      summary: item.contentSnippet || item.content?.slice(0, 300) || '',
      source: NEWS_SOURCES.CBS_SPORTS.name,
      source_id: NEWS_SOURCES.CBS_SPORTS.id,
      url: item.link || '',
      published_at: item.pubDate || new Date().toISOString(),
      image_url: extractImageUrl(item),
      teams: matchTeams(item.title || '', item.contentSnippet),
    }));
  } catch (error) {
    console.error('Error fetching CBS Sports news:', error);
    return [];
  }
}

/**
 * Fetch all NBA news from all configured sources
 * Returns combined, de-duplicated, and sorted results
 */
export async function fetchAllNews(): Promise<Partial<NewsItem>[]> {
  // Fetch from all sources in parallel using Promise.allSettled for resilience
  const results = await Promise.allSettled([
    fetchESPNNews(),
    fetchCBSSportsNews(),
  ]);

  // Combine results from successful fetches
  const allNews: NewsItemWithSource[] = [];

  results.forEach((result, index) => {
    const sourceName = index === 0 ? 'ESPN' : 'CBS Sports';
    if (result.status === 'fulfilled') {
      console.log(`Fetched ${result.value.length} articles from ${sourceName}`);
      allNews.push(...result.value);
    } else {
      console.error(`Failed to fetch from ${sourceName}:`, result.reason);
    }
  });

  // Filter out betting/gambling content
  const filteredNews = allNews.filter(article => {
    const isBetting = isBettingContent(article.headline || '', article.summary || '');
    if (isBetting) {
      console.log(`Filtered out betting article: "${article.headline}" [${article.source}]`);
    }
    return !isBetting;
  });
  console.log(`Filtered out ${allNews.length - filteredNews.length} betting articles`);

  const uniqueNews = removeDuplicates(filteredNews);
  console.log(`Total articles after deduplication: ${uniqueNews.length}`);

  return uniqueNews;
}

/**
 * Filter news by team abbreviation
 */
export function filterNewsByTeam(news: NewsItem[], teamAbbr: string): NewsItem[] {
  if (!teamAbbr || teamAbbr === 'ALL') {
    return news;
  }
  return news.filter((item) => item.teams.includes(teamAbbr));
}
