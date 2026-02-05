/**
 * News Fetching Utilities
 *
 * Handles fetching NBA news from multiple RSS feeds (ESPN, Bleacher Report).
 * Implements smart duplicate detection that keeps the higher-quality article.
 */

import Parser from 'rss-parser';
import { randomUUID } from 'crypto';
import { NewsItem } from './types';
import { TEAM_KEYWORDS, NEWS_SOURCES, CLICKBAIT_PHRASES } from './constants';

// Extended news item with source_id for quality scoring
interface NewsItemWithSource extends Partial<NewsItem> {
  source_id?: string;
}

// Initialize RSS parser with custom fields
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
      if (text.includes(keyword.toLowerCase())) {
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
  if (article.source_id === 'bleacher-report') {
    score += NEWS_SOURCES.BLEACHER_REPORT.qualityBonus;
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
 * Create a fingerprint from headline for duplicate detection
 */
function createFingerprint(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);
}

/**
 * Remove duplicate articles and keep the best version of each story
 */
function removeDuplicates(articles: NewsItemWithSource[]): NewsItemWithSource[] {
  const duplicateGroups = new Map<string, NewsItemWithSource[]>();

  // Group articles with similar headlines together
  for (const article of articles) {
    const fingerprint = createFingerprint(article.headline || '');

    if (!fingerprint) continue;

    if (!duplicateGroups.has(fingerprint)) {
      duplicateGroups.set(fingerprint, []);
    }
    duplicateGroups.get(fingerprint)!.push(article);
  }

  // For each group of duplicates, select the best article
  const uniqueArticles: NewsItemWithSource[] = [];

  for (const group of duplicateGroups.values()) {
    if (group.length === 1) {
      uniqueArticles.push(group[0]);
    } else {
      // Choose the best article based on quality metrics
      const best = group.reduce((bestSoFar, current) => {
        const bestScore = calculateArticleQuality(bestSoFar);
        const currentScore = calculateArticleQuality(current);
        return currentScore > bestScore ? current : bestSoFar;
      });
      uniqueArticles.push(best);
    }
  }

  return uniqueArticles;
}

/**
 * Fetch news from ESPN RSS feed
 */
async function fetchESPNNews(): Promise<NewsItemWithSource[]> {
  try {
    const feed = await parser.parseURL(NEWS_SOURCES.ESPN.rssUrl);

    return feed.items.map((item) => ({
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
  } catch (error) {
    console.error('Error fetching ESPN news:', error);
    return [];
  }
}

/**
 * Fetch news from Bleacher Report RSS feed
 */
async function fetchBleacherReportNews(): Promise<NewsItemWithSource[]> {
  try {
    const feed = await parser.parseURL(NEWS_SOURCES.BLEACHER_REPORT.rssUrl);

    return feed.items.map((item) => ({
      id: randomUUID(),
      headline: item.title || 'No title',
      summary: item.contentSnippet || item.content?.slice(0, 300) || '',
      source: NEWS_SOURCES.BLEACHER_REPORT.name,
      source_id: NEWS_SOURCES.BLEACHER_REPORT.id,
      url: item.link || '',
      published_at: item.pubDate || new Date().toISOString(),
      image_url: extractImageUrl(item),
      teams: matchTeams(item.title || '', item.contentSnippet),
    }));
  } catch (error) {
    console.error('Error fetching Bleacher Report news:', error);
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
    fetchBleacherReportNews(),
  ]);

  // Combine results from successful fetches
  const allNews: NewsItemWithSource[] = [];

  results.forEach((result, index) => {
    const sourceName = index === 0 ? 'ESPN' : 'Bleacher Report';
    if (result.status === 'fulfilled') {
      console.log(`Fetched ${result.value.length} articles from ${sourceName}`);
      allNews.push(...result.value);
    } else {
      console.error(`Failed to fetch from ${sourceName}:`, result.reason);
    }
  });

  // Remove duplicates and keep best version
  const uniqueNews = removeDuplicates(allNews);

  // Sort by published date (newest first)
  uniqueNews.sort((a, b) => {
    const dateA = new Date(a.published_at || 0).getTime();
    const dateB = new Date(b.published_at || 0).getTime();
    return dateB - dateA;
  });

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
