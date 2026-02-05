/**
 * Reddit API Utilities
 *
 * Fetches comments from Reddit's r/nba subreddit for sentiment analysis.
 * Uses Reddit's public JSON API (no authentication required).
 */

interface RedditPost {
  data: {
    title: string;
    permalink: string;
    score: number;
    num_comments: number;
  };
}

interface RedditComment {
  data: {
    body?: string;
    score?: number;
  };
}

/**
 * Fetches Reddit comments related to a news headline
 * @param searchQuery - Keywords from news headline
 * @param subreddit - Subreddit to search (default: 'nba')
 * @returns Array of comment texts
 */
export async function fetchRedditComments(
  searchQuery: string,
  subreddit = 'nba'
): Promise<string[]> {
  try {
    // Clean up search query
    const cleanQuery = extractKeywords(searchQuery);
    if (!cleanQuery) {
      return [];
    }

    // Search Reddit for relevant posts
    const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(cleanQuery)}&sort=relevance&limit=3&t=week&restrict_sr=on`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'NBA-News-Hub/1.0 (News Sentiment Analyzer)',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error('Reddit search API error:', response.status);
      return [];
    }

    const data = await response.json();
    const posts: RedditPost[] = data?.data?.children || [];

    if (posts.length === 0) {
      return [];
    }

    // Get comments from the most relevant post with enough comments
    const topPost = posts.find(p => p.data.num_comments >= 5) || posts[0];

    if (!topPost) {
      return [];
    }

    const commentsUrl = `https://www.reddit.com${topPost.data.permalink}.json?limit=50&sort=top`;

    const commentsResponse = await fetch(commentsUrl, {
      headers: {
        'User-Agent': 'NBA-News-Hub/1.0 (News Sentiment Analyzer)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!commentsResponse.ok) {
      return [];
    }

    const commentsData = await commentsResponse.json();

    // Extract comment texts (filter out deleted/removed/bot comments)
    const comments: string[] = [];

    if (commentsData[1]?.data?.children) {
      for (const child of commentsData[1].data.children as RedditComment[]) {
        const body = child.data?.body;
        if (
          body &&
          body !== '[deleted]' &&
          body !== '[removed]' &&
          body.length > 10 && // Skip very short comments
          body.length < 1000 && // Skip very long comments
          !body.includes('I am a bot') &&
          !body.startsWith('*I am a bot')
        ) {
          comments.push(body);
        }

        // Limit to top 25 comments for performance
        if (comments.length >= 25) break;
      }
    }

    return comments;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('Reddit API timeout');
    } else {
      console.error('Error fetching Reddit comments:', error);
    }
    return [];
  }
}

/**
 * Extract meaningful keywords from a headline for Reddit search
 */
export function extractKeywords(headline: string): string {
  if (!headline) return '';

  // Common words to filter out
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

  // Extract words, keeping player names and team names
  const words = headline
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ') // Keep apostrophes and hyphens
    .split(/\s+/)
    .filter(word =>
      word.length > 2 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word) // Filter out pure numbers
    );

  // Take first 4-5 meaningful words
  return words.slice(0, 5).join(' ');
}

/**
 * Search for Reddit discussions about a specific team
 */
export async function fetchTeamDiscussions(
  teamName: string,
  limit = 5
): Promise<Array<{ title: string; comments: string[]; url: string }>> {
  try {
    const searchUrl = `https://www.reddit.com/r/nba/search.json?q=${encodeURIComponent(teamName)}&sort=hot&limit=${limit}&t=day&restrict_sr=on`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'NBA-News-Hub/1.0 (News Sentiment Analyzer)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const posts: RedditPost[] = data?.data?.children || [];

    const discussions = await Promise.all(
      posts.slice(0, 3).map(async (post) => {
        const comments = await fetchCommentsForPost(post.data.permalink);
        return {
          title: post.data.title,
          comments,
          url: `https://reddit.com${post.data.permalink}`,
        };
      })
    );

    return discussions;
  } catch (error) {
    console.error('Error fetching team discussions:', error);
    return [];
  }
}

/**
 * Fetch comments for a specific Reddit post
 */
async function fetchCommentsForPost(permalink: string): Promise<string[]> {
  try {
    const url = `https://www.reddit.com${permalink}.json?limit=25&sort=top`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NBA-News-Hub/1.0 (News Sentiment Analyzer)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const comments: string[] = [];

    if (data[1]?.data?.children) {
      for (const child of data[1].data.children as RedditComment[]) {
        const body = child.data?.body;
        if (
          body &&
          body !== '[deleted]' &&
          body !== '[removed]' &&
          body.length > 10 &&
          body.length < 500
        ) {
          comments.push(body);
        }
        if (comments.length >= 15) break;
      }
    }

    return comments;
  } catch {
    return [];
  }
}
