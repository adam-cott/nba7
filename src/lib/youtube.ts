/**
 * YouTube Data API v3 Utilities
 *
 * Searches for NBA-related videos and fetches comments for sentiment analysis.
 * Uses YouTube Data API v3 with API key authentication.
 */

import { google } from 'googleapis';
import { YouTubeComment } from './types';
import { TEAM_KEYWORDS, TEAM_NAME_MAP } from './constants';

const youtube = process.env.YOUTUBE_API_KEY
  ? google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    })
  : null;

// Stop words shared by extractKeywords and extractHeadlineEntities
const STOP_WORDS = new Set([
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

/**
 * Minimum relevance score for a YouTube video to be accepted.
 * Score breakdown:
 *   +2 per team whose TEAM_KEYWORDS appear in the video title/description
 *   +1 per mid-sentence proper noun from the article headline found in the video
 * A score of 2 means at least one team keyword matched — the strongest signal.
 */
const MIN_RELEVANCE_SCORE = 2;

/**
 * Extract proper nouns from a headline, intentionally skipping the first word.
 * The first word is always capitalized due to sentence position, not because
 * it is a named entity — treating it as a proper noun produces false positives
 * (e.g. "Worst teams" → "Worst" incorrectly treated as a name).
 * Returns lowercase strings for case-insensitive comparison.
 */
function extractHeadlineEntities(headline: string): string[] {
  const words = headline.replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const entities: string[] = [];

  for (let i = 1; i < words.length; i++) { // i=0 skipped — sentence-start capital
    const word = words[i];
    const lower = word.toLowerCase();
    if (STOP_WORDS.has(lower) || /^\d+$/.test(lower)) continue;

    const isCapitalized = word[0] >= 'A' && word[0] <= 'Z' && word[0] !== word[0].toLowerCase();
    if (isCapitalized) {
      entities.push(lower);
    }
  }

  return entities;
}

/**
 * Score how relevant a YouTube video is to the given article.
 *
 * +2 for each team (from the article's teams[]) whose TEAM_KEYWORDS appear
 *    in the video title or description. These are curated multi-word phrases
 *    ("stephen curry", "golden state") so a match is a strong signal.
 * +1 for each mid-sentence proper noun from the article headline found in
 *    the video title or description.
 *
 * Articles about specific players/teams easily reach ≥2.
 * Broad articles with no named entities score 0 and are rejected.
 */
function scoreVideoRelevance(
  videoTitle: string,
  videoDescription: string,
  headline: string,
  teams: string[],
): number {
  const videoText = `${videoTitle} ${videoDescription}`.toLowerCase();
  let score = 0;

  for (const abbr of teams) {
    const keywords = TEAM_KEYWORDS[abbr] || [];
    if (keywords.some(kw => videoText.includes(kw.toLowerCase()))) {
      score += 2;
    }
  }

  const entities = extractHeadlineEntities(headline);
  for (const entity of entities) {
    if (videoText.includes(entity)) {
      score += 1;
    }
  }

  return score;
}

/**
 * Fetches comments from YouTube videos related to an NBA news story.
 *
 * Validates relevance before accepting any video — if no candidate from the
 * search results scores ≥ MIN_RELEVANCE_SCORE against the article's entities
 * and teams, returns [] rather than surfacing unrelated comments.
 *
 * @param searchQuery - Keywords from the article headline (via extractKeywords)
 * @param headline    - Original article headline, used for entity matching
 * @param teams       - Team abbreviations matched to the article (e.g. ['LAL'])
 */
export async function fetchYouTubeComments(
  searchQuery: string,
  headline: string,
  teams: string[],
): Promise<YouTubeComment[]> {
  if (!youtube) {
    console.log('YouTube API not configured, skipping comment fetch');
    return [];
  }

  try {
    // Step 1: Search for relevant NBA videos — fetch 5 candidates to give the
    // relevance scorer more to work with
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: `${searchQuery} NBA`,
      type: ['video'],
      maxResults: 5,
      order: 'relevance',
      publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const videos = searchResponse.data.items;

    if (!videos || videos.length === 0) {
      console.log(`No YouTube videos found for: ${searchQuery}`);
      return [];
    }

    // Step 2: Score each candidate and pick the most relevant one
    let bestVideoId: string | null = null;
    let bestScore = -1;

    for (const video of videos) {
      const videoId = video.id?.videoId;
      if (!videoId) continue;

      const title = video.snippet?.title || '';
      const description = video.snippet?.description || '';
      const score = scoreVideoRelevance(title, description, headline, teams);

      console.log(`YouTube relevance [${score}] "${title}" (query: "${searchQuery}")`);

      if (score > bestScore) {
        bestScore = score;
        bestVideoId = videoId;
      }
    }

    // Step 3: Reject if no candidate meets the minimum relevance bar
    if (bestScore < MIN_RELEVANCE_SCORE || !bestVideoId) {
      console.log(
        `Skipping YouTube comments for "${searchQuery}" — best relevance score ${bestScore} < ${MIN_RELEVANCE_SCORE}`
      );
      return [];
    }

    // Step 4: Fetch comments from the best-matching video
    const commentsResponse = await youtube.commentThreads.list({
      part: ['snippet'],
      videoId: bestVideoId,
      maxResults: 30,
      order: 'relevance',
      textFormat: 'plainText',
    });

    const commentThreads = commentsResponse.data.items;

    if (!commentThreads || commentThreads.length === 0) {
      return [];
    }

    // Step 5: Extract comment text + metadata (author, timestamp, likes)
    const comments: YouTubeComment[] = commentThreads
      .map((thread) => {
        const snippet = thread.snippet?.topLevelComment?.snippet;
        if (!snippet?.textDisplay) return null;
        const text = snippet.textDisplay;
        if (text.length <= 10 || text.length >= 500) return null;
        return {
          text,
          author: snippet.authorDisplayName || 'Anonymous',
          publishedAt: snippet.publishedAt || new Date().toISOString(),
          likeCount: snippet.likeCount || 0,
        };
      })
      .filter((c): c is YouTubeComment => c !== null)
      .slice(0, 25);

    console.log(
      `YouTube: ${comments.length} comments for "${searchQuery}" (relevance score: ${bestScore})`
    );
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
 *
 * Changes from the original:
 * 1. Accepts a teams[] array and injects full team names as the most specific
 *    anchors (e.g. ['LAL'] → "Los Angeles Lakers" leads the query).
 * 2. The first word of the headline is excluded from proper noun detection —
 *    it is always capitalized due to sentence position, not entity status.
 * 3. When team names are present, freeform keyword slots are reduced (the team
 *    name already narrows the search enough).
 */
export function extractKeywords(headline: string, teams: string[] = []): string {
  if (!headline) return '';

  // Inject full team names as the strongest anchors (cap at 2 teams)
  const teamNames: string[] = [];
  for (const abbr of teams.slice(0, 2)) {
    const fullName = TEAM_NAME_MAP[abbr];
    if (fullName) teamNames.push(fullName);
  }

  const cleaned = headline.replace(/[^\w\s'-]/g, ' ');
  const rawWords = cleaned.split(/\s+/).filter(w => w.length > 1);

  const properNouns: string[] = [];
  const regularWords: string[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i];
    const lower = word.toLowerCase();
    if (STOP_WORDS.has(lower) || /^\d+$/.test(lower)) continue;

    // i === 0 is skipped for proper noun detection: the first word of any
    // headline is capitalized by convention, not because it is a named entity.
    const isProperNoun = i > 0 &&
      word[0] === word[0].toUpperCase() &&
      word[0] !== word[0].toLowerCase();

    if (isProperNoun) {
      properNouns.push(word);
    } else {
      regularWords.push(lower);
    }
  }

  // When team names anchor the query, fewer freeform slots are needed
  const maxFreeform = teamNames.length > 0 ? 2 : 4;
  const freeform = [...properNouns, ...regularWords].slice(0, maxFreeform);

  return [...teamNames, ...freeform].join(' ');
}
