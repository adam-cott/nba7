/**
 * News Fetching Utilities
 *
 * Handles fetching NBA news from RSS feeds and matching them to teams.
 * Uses rss-parser to parse feeds from ESPN and Bleacher Report.
 */

import Parser from 'rss-parser';
import { randomUUID } from 'crypto';
import { NewsItem } from './types';
import { TEAM_KEYWORDS, NEWS_SOURCES } from './constants';

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
function extractImageUrl(item: Parser.Item & { thumbnail?: { $?: { url?: string } }; mediaContent?: { $?: { url?: string } }; enclosure?: { url?: string } }): string | undefined {
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
        break; // Found a match for this team, move to next team
      }
    }
  }

  return matchedTeams;
}

/**
 * Fetch news from ESPN RSS feed
 */
async function fetchESPNNews(): Promise<Partial<NewsItem>[]> {
  try {
    const feed = await parser.parseURL(NEWS_SOURCES.ESPN.rssUrl);

    return feed.items.map((item) => ({
      id: randomUUID(),
      headline: item.title || 'No title',
      summary: item.contentSnippet || item.content?.slice(0, 200) || '',
      source: 'ESPN',
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
async function fetchBleacherReportNews(): Promise<Partial<NewsItem>[]> {
  try {
    const feed = await parser.parseURL(NEWS_SOURCES.BLEACHER_REPORT.rssUrl);

    return feed.items.map((item) => ({
      id: randomUUID(),
      headline: item.title || 'No title',
      summary: item.contentSnippet || item.content?.slice(0, 200) || '',
      source: 'Bleacher Report',
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
 * Returns combined and sorted results
 */
export async function fetchAllNews(): Promise<Partial<NewsItem>[]> {
  // Fetch from all sources in parallel
  const [espnNews, brNews] = await Promise.all([
    fetchESPNNews(),
    fetchBleacherReportNews(),
  ]);

  // Combine all news
  const allNews = [...espnNews, ...brNews];

  // Sort by published date (newest first)
  allNews.sort((a, b) => {
    const dateA = new Date(a.published_at || 0).getTime();
    const dateB = new Date(b.published_at || 0).getTime();
    return dateB - dateA;
  });

  // Remove duplicates based on similar headlines
  const seenHeadlines = new Set<string>();
  const uniqueNews = allNews.filter((item) => {
    const normalizedHeadline = item.headline?.toLowerCase().slice(0, 50);
    if (seenHeadlines.has(normalizedHeadline || '')) {
      return false;
    }
    seenHeadlines.add(normalizedHeadline || '');
    return true;
  });

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
