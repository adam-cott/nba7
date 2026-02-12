/**
 * YouTube Data API v3 Utilities
 *
 * Searches for NBA-related videos and fetches comments for sentiment analysis.
 * Uses YouTube Data API v3 with API key authentication.
 */

import { google } from 'googleapis';

const youtube = process.env.YOUTUBE_API_KEY
  ? google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    })
  : null;

/**
 * Fetches comments from YouTube videos related to an NBA news story
 * @param searchQuery - Keywords from the article headline
 * @returns Array of comment texts for sentiment analysis
 */
export async function fetchYouTubeComments(searchQuery: string): Promise<string[]> {
  if (!youtube) {
    console.log('YouTube API not configured, skipping comment fetch');
    return [];
  }

  try {
    // Step 1: Search for relevant NBA videos
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: `${searchQuery} NBA`,
      type: ['video'],
      maxResults: 3,
      order: 'relevance',
      publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const videos = searchResponse.data.items;

    if (!videos || videos.length === 0) {
      console.log(`No YouTube videos found for: ${searchQuery}`);
      return [];
    }

    // Step 2: Fetch comments from the top video
    const topVideoId = videos[0].id?.videoId;

    if (!topVideoId) {
      return [];
    }

    const commentsResponse = await youtube.commentThreads.list({
      part: ['snippet'],
      videoId: topVideoId,
      maxResults: 30,
      order: 'relevance',
      textFormat: 'plainText',
    });

    const commentThreads = commentsResponse.data.items;

    if (!commentThreads || commentThreads.length === 0) {
      return [];
    }

    // Step 3: Extract and clean comment text
    const comments = commentThreads
      .map((thread) => thread.snippet?.topLevelComment?.snippet?.textDisplay || '')
      .filter((text) => text.length > 10 && text.length < 500)
      .slice(0, 25);

    console.log(`YouTube: Found ${comments.length} comments for "${searchQuery}"`);
    return comments;
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 403) {
      console.error('YouTube API quota exceeded or key issue:', err.message);
    } else if (err.code === 400) {
      console.error('YouTube API bad request:', err.message);
    } else {
      console.error('YouTube API error:', err.message);
    }
    return [];
  }
}

/**
 * Extract meaningful keywords from a headline for YouTube search.
 * Prioritizes proper nouns (player/team names) and keeps basketball action
 * words like "trade", "injury", "fired", etc. Only strips generic English
 * stop words and "nba" (which is appended separately by the caller).
 */
export function extractKeywords(headline: string): string {
  if (!headline) return '';

  // Only strip truly generic English words — keep all basketball-meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'this', 'that', 'these', 'those', 'it', 'its', 'he', 'she', 'they',
    'we', 'you', 'i', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
    'his', 'their', 'our', 'who', 'what', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than', 'too',
    'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
    'nba', 'says', 'said', 'according', 'per', 'via', 'new', 'latest',
    'update', 'breaking', 'report', 'reports', 'sources',
  ]);

  const cleaned = headline.replace(/[^\w\s'-]/g, ' ');

  // Split into words, preserving original casing for proper noun detection
  const rawWords = cleaned.split(/\s+/).filter(w => w.length > 1);

  // Separate proper nouns (capitalized words) from regular words
  const properNouns: string[] = [];
  const regularWords: string[] = [];

  for (const word of rawWords) {
    const lower = word.toLowerCase();
    if (stopWords.has(lower) || /^\d+$/.test(lower)) continue;

    // Proper noun: starts with uppercase and isn't the first word (which is always capitalized)
    const isProperNoun = word[0] === word[0].toUpperCase() &&
      word[0] !== word[0].toLowerCase();

    if (isProperNoun) {
      properNouns.push(word);
    } else {
      regularWords.push(lower);
    }
  }

  // Build query: proper nouns first (most specific), then action words
  const selected = [...properNouns, ...regularWords].slice(0, 4);

  return selected.join(' ');
}
