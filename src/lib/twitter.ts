/**
 * Twitter/X API Utilities
 *
 * Fetches recent tweets about NBA news stories for sentiment analysis.
 * Uses Twitter API v2 with Bearer Token authentication.
 */

import { TwitterApi } from 'twitter-api-v2';

const client = process.env.TWITTER_BEARER_TOKEN
  ? new TwitterApi(process.env.TWITTER_BEARER_TOKEN)
  : null;

/**
 * Fetches recent tweets about an NBA news story
 * @param searchQuery - Keywords from the article headline
 * @returns Array of tweet texts for sentiment analysis
 */
export async function fetchTweets(searchQuery: string): Promise<string[]> {
  if (!client) {
    console.log('Twitter API not configured, skipping tweet fetch');
    return [];
  }

  try {
    // Clean up query - keep only key terms, add NBA context
    const cleanQuery = `${searchQuery} NBA -is:retweet lang:en`;

    const response = await client.v2.search(cleanQuery, {
      max_results: 20,
      'tweet.fields': ['text'],
    });

    if (!response.data.data || response.data.data.length === 0) {
      return [];
    }

    // Extract and clean tweet text
    return response.data.data
      .map((tweet) =>
        tweet.text
          .replace(/https?:\/\/\S+/g, '') // Remove URLs
          .replace(/@\w+/g, '')           // Remove mentions
          .replace(/#\w+/g, '')           // Remove hashtags
          .trim()
      )
      .filter((text) => text.length > 10); // Filter out empty tweets
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    // Handle rate limiting gracefully
    if (err.code === 429) {
      console.log('Twitter rate limit hit, falling back to headline sentiment');
    } else {
      console.error('Twitter API error:', err.message);
    }
    return [];
  }
}

/**
 * Extract meaningful keywords from a headline for Twitter search
 */
export function extractKeywords(headline: string): string {
  if (!headline) return '';

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
    'nba', 'basketball', 'game', 'team', 'player', 'season', 'news',
    'report', 'reports', 'says', 'said', 'according', 'sources', 'per',
  ]);

  const words = headline
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length > 2 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    );

  return words.slice(0, 5).join(' ');
}
