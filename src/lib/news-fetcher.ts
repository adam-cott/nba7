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
 * Non-NBA URL path segments to block from CBS Sports.
 * If a CBS Sports article URL contains any of these, it's from another sport's section.
 */
const BLOCKED_CBS_PATH_SEGMENTS = [
  '/olympics/',
  '/nfl/',
  '/mlb/',
  '/nhl/',
  '/college-basketball/',
  '/college-football/',
  '/golf/',
  '/soccer/',
  '/tennis/',
  '/boxing/',
  '/mma/',
  '/racing/',
  '/fantasy/',
  '/what-to-watch/',
];

/**
 * Non-NBA keywords to filter out articles about other sports.
 * Checked against title and description.
 */
const NON_NBA_KEYWORDS = [
  'nfl mock draft',
  'nfl draft',
  'mlb mock draft',
  'nhl mock draft',
  'nfl free agency',
  'winter olympics',
  'summer olympics',
  'super bowl',
  'world series',
  'stanley cup',
  'college football playoff',
];

/**
 * Check if an article is betting/gambling content based on title and description.
 */
function isBettingContent(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return BETTING_KEYWORDS.some(keyword => text.includes(keyword));
}

/**
 * Check if an article is from a non-NBA sport section (URL path) or
 * contains non-NBA keywords in the title/description.
 */
function isNonNbaContent(url: string, title: string, description: string): boolean {
  const lowerUrl = url.toLowerCase();
  const text = `${title} ${description}`.toLowerCase();

  // Block CBS Sports articles from non-NBA sport sections
  if (lowerUrl.includes('cbssports.com')) {
    const hasBlockedPath = BLOCKED_CBS_PATH_SEGMENTS.some(seg => lowerUrl.includes(seg));
    if (hasBlockedPath) return true;
  }

  // Block articles matching non-NBA keywords in title/description
  return NON_NBA_KEYWORDS.some(keyword => text.includes(keyword));
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

/** Words to strip before comparing headlines for fuzzy deduplication */
const DEDUP_STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'as',
  'and', 'or', 'but', 'not', 'no', 'so', 'if', 'than', 'too', 'very',
  'after', 'before', 'into', 'about', 'up', 'out', 'off', 'over',
  'he', 'she', 'it', 'its', 'his', 'her', 'they', 'their', 'we',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'may', 'might', 'can', 'should', 'shall', 'must',
  'this', 'that', 'these', 'those', 'who', 'what', 'when', 'where',
  'how', 'why', 'all', 'each', 'both', 'more', 'most', 'some', 'any',
  'new', 'per', 'via', 'says', 'said', 'just', 'also', 'now',
]);

const FUZZY_SIMILARITY_THRESHOLD = 0.45;
const DEDUP_TIME_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Basic stemming: strip common suffixes so "trade"/"trades"/"trading" match.
 */
function simpleStem(word: string): string {
  if (word.length <= 3) return word;
  return word
    .replace(/ing$/, '')
    .replace(/tion$/, 't')
    .replace(/sion$/, 's')
    .replace(/ment$/, '')
    .replace(/ness$/, '')
    .replace(/able$/, '')
    .replace(/ible$/, '')
    .replace(/ies$/, 'y')
    .replace(/ves$/, 'f')
    .replace(/ed$/, '')
    .replace(/es$/, '')
    .replace(/s$/, '')
    || word;
}

/**
 * Extract a set of meaningful stemmed words from headline + summary for comparison.
 */
function articleWordSet(headline: string, summary: string): Set<string> {
  const text = `${headline} ${summary}`;
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !DEDUP_STOP_WORDS.has(w))
      .map(simpleStem)
      .filter(w => w.length > 1)
  );
}

/**
 * Extract proper nouns (entity names) from headline text.
 * These are the strongest signal for same-story detection.
 */
function extractEntities(headline: string): Set<string> {
  const words = headline
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);

  const entities = new Set<string>();
  for (const word of words) {
    // Proper noun: starts with uppercase letter
    if (word[0] >= 'A' && word[0] <= 'Z' && !DEDUP_STOP_WORDS.has(word.toLowerCase())) {
      entities.add(word.toLowerCase());
    }
  }
  return entities;
}

/** Minimum shared entities required to treat articles as duplicates */
const MIN_SHARED_ENTITIES = 2;

/**
 * Jaccard similarity: |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Remove duplicate articles using fuzzy Jaccard similarity on headlines.
 * Keeps the newer article when two cover the same story.
 * Only considers articles within a 12-hour window as potential duplicates.
 */
function removeDuplicates(articles: NewsItemWithSource[]): NewsItemWithSource[] {
  if (articles.length === 0) return [];

  // Precompute word sets, entity sets, and timestamps
  const items = articles.map(article => ({
    article,
    words: articleWordSet(article.headline || '', article.summary || ''),
    entities: extractEntities(article.headline || ''),
    time: new Date(article.published_at || 0).getTime(),
  }));

  // Track which articles are marked as duplicates
  const isDuplicate = new Array(items.length).fill(false);

  for (let i = 0; i < items.length; i++) {
    if (isDuplicate[i]) continue;

    for (let j = i + 1; j < items.length; j++) {
      if (isDuplicate[j]) continue;

      // Skip if articles are more than 12 hours apart
      if (Math.abs(items[i].time - items[j].time) > DEDUP_TIME_WINDOW_MS) continue;

      const similarity = jaccardSimilarity(items[i].words, items[j].words);

      // Count shared entities (proper nouns like player/team names)
      let sharedEntities = 0;
      for (const entity of items[i].entities) {
        if (items[j].entities.has(entity)) sharedEntities++;
      }

      // Duplicate if word sets are similar enough OR if 2+ named entities match
      const isDup = similarity >= FUZZY_SIMILARITY_THRESHOLD || sharedEntities >= MIN_SHARED_ENTITIES;

      if (isDup) {
        // Keep the newer article, mark the older one as duplicate
        const olderIdx = items[i].time >= items[j].time ? j : i;
        const newerIdx = olderIdx === i ? j : i;
        isDuplicate[olderIdx] = true;
        const reason = sharedEntities >= MIN_SHARED_ENTITIES
          ? `${sharedEntities} shared entities`
          : `${(similarity * 100).toFixed(0)}% word similarity`;
        console.log(
          `Fuzzy dedup (${reason}): keeping "${items[newerIdx].article.headline}" [${items[newerIdx].article.source}], ` +
          `removing "${items[olderIdx].article.headline}" [${items[olderIdx].article.source}]`
        );
      }
    }
  }

  const deduped = items
    .filter((_, i) => !isDuplicate[i])
    .map(item => item.article);

  // Sort by recency
  return deduped.sort(
    (a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
  );
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

  // Filter out non-NBA content (other sports sections, roundups)
  const nbaOnly = allNews.filter(article => {
    const isNonNba = isNonNbaContent(article.url || '', article.headline || '', article.summary || '');
    if (isNonNba) {
      console.log(`Filtered out non-NBA article: "${article.headline}" [${article.source}] (${article.url})`);
    }
    return !isNonNba;
  });
  console.log(`Filtered out ${allNews.length - nbaOnly.length} non-NBA articles`);

  // Filter out betting/gambling content
  const filteredNews = nbaOnly.filter(article => {
    const isBetting = isBettingContent(article.headline || '', article.summary || '');
    if (isBetting) {
      console.log(`Filtered out betting article: "${article.headline}" [${article.source}]`);
    }
    return !isBetting;
  });
  console.log(`Filtered out ${nbaOnly.length - filteredNews.length} betting articles`);

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
