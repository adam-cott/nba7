/**
 * Sentiment Analysis Utilities
 *
 * Uses VADER (Valence Aware Dictionary and sEntiment Reasoner) for sentiment analysis.
 * VADER is specifically tuned for social media text, making it ideal for Reddit comments.
 * Falls back to OpenAI if configured, or basic keyword analysis.
 */

import vader from 'vader-sentiment';
import OpenAI from 'openai';
import { SentimentLabel, SentimentBreakdown } from './types';
import { SENTIMENT_THRESHOLDS } from './constants';

// Initialize OpenAI client (optional enhancement)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Analyzes sentiment of text using VADER
 * VADER compound score ranges from -1 (most negative) to +1 (most positive)
 * Thresholds: >= 0.05 is positive, <= -0.05 is negative, else neutral
 */
function analyzeWithVADER(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(text);
  return intensity.compound;
}

/**
 * Analyze sentiment using OpenAI API (optional enhancement)
 */
async function analyzeWithOpenAI(text: string): Promise<number> {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a sentiment analyzer for NBA news and fan reactions. Analyze the sentiment and respond with ONLY a number between -1 and 1.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const scoreText = response.choices[0]?.message?.content?.trim() || '0';
    const score = parseFloat(scoreText);
    return isNaN(score) ? 0 : Math.max(-1, Math.min(1, score));
  } catch (error) {
    console.error('OpenAI sentiment analysis error:', error);
    throw error;
  }
}

/**
 * Get sentiment label from score
 * Using VADER's recommended thresholds
 */
export function getLabel(score: number): SentimentLabel {
  if (score >= 0.05) return 'positive';
  if (score <= -0.05) return 'negative';
  return 'neutral';
}

/**
 * Get emoji for sentiment label
 */
export function getEmoji(label: SentimentLabel): string {
  switch (label) {
    case 'positive': return '🟢';
    case 'negative': return '🔴';
    default: return '🟡';
  }
}

/**
 * Convert score to breakdown percentages
 * Creates a realistic breakdown based on the overall score
 */
export function getBreakdown(score: number): SentimentBreakdown {
  const normalized = (score + 1) / 2; // 0 to 1 range

  if (score >= 0.05) {
    // Positive sentiment
    return {
      positive: Math.round(50 + normalized * 40),
      neutral: Math.round(20 + (1 - normalized) * 20),
      negative: Math.round(10 + (1 - normalized) * 10),
    };
  } else if (score <= -0.05) {
    // Negative sentiment
    return {
      positive: Math.round(10 + normalized * 10),
      neutral: Math.round(20 + normalized * 20),
      negative: Math.round(50 + (1 - normalized) * 40),
    };
  } else {
    // Neutral sentiment
    return {
      positive: Math.round(25 + normalized * 15),
      neutral: Math.round(40 + Math.abs(0.5 - normalized) * 20),
      negative: Math.round(25 + (1 - normalized) * 15),
    };
  }
}

/**
 * Analyze a single text for sentiment using VADER
 */
export async function analyzeSentiment(text: string): Promise<{
  score: number;
  label: SentimentLabel;
  emoji: string;
  breakdown: SentimentBreakdown;
}> {
  // Use VADER as primary analysis (fast and accurate for social media)
  const score = analyzeWithVADER(text);
  const label = getLabel(score);

  return {
    score,
    label,
    emoji: getEmoji(label),
    breakdown: getBreakdown(score),
  };
}

/**
 * Analyze multiple texts (e.g., Reddit comments) and return aggregate sentiment
 * This is the main function for analyzing fan reactions
 */
export async function analyzeMultipleSentiments(texts: string[]): Promise<{
  overall: {
    score: number;
    label: SentimentLabel;
    emoji: string;
  };
  breakdown: SentimentBreakdown;
  commentCount: number;
}> {
  if (!texts || texts.length === 0) {
    return {
      overall: { label: 'neutral', emoji: '🟡', score: 0 },
      breakdown: { positive: 0, neutral: 100, negative: 0 },
      commentCount: 0,
    };
  }

  // Analyze each text with VADER
  const sentiments = texts.map(text => {
    const score = analyzeWithVADER(text);
    return {
      score,
      label: getLabel(score),
    };
  });

  // Calculate breakdown percentages from actual distribution
  const positive = sentiments.filter(s => s.label === 'positive').length;
  const neutral = sentiments.filter(s => s.label === 'neutral').length;
  const negative = sentiments.filter(s => s.label === 'negative').length;
  const total = sentiments.length;

  const breakdown: SentimentBreakdown = {
    positive: Math.round((positive / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((negative / total) * 100),
  };

  // Calculate average compound score for overall sentiment
  const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / total;
  const overallLabel = getLabel(avgScore);

  return {
    overall: {
      score: avgScore,
      label: overallLabel,
      emoji: getEmoji(overallLabel),
    },
    breakdown,
    commentCount: total,
  };
}

/**
 * Analyze sentiment with optional OpenAI enhancement
 * Uses VADER first, then optionally validates with OpenAI for important stories
 */
export async function analyzeWithEnhancement(
  text: string,
  useOpenAI = false
): Promise<{
  score: number;
  label: SentimentLabel;
  emoji: string;
  breakdown: SentimentBreakdown;
}> {
  // Always start with VADER (fast)
  let score = analyzeWithVADER(text);

  // Optionally enhance with OpenAI for more nuanced analysis
  if (useOpenAI && openai) {
    try {
      const openAIScore = await analyzeWithOpenAI(text);
      // Average the two scores for more balanced result
      score = (score + openAIScore) / 2;
    } catch {
      // Keep VADER score if OpenAI fails
      console.log('Using VADER score only');
    }
  }

  const label = getLabel(score);

  return {
    score,
    label,
    emoji: getEmoji(label),
    breakdown: getBreakdown(score),
  };
}

/**
 * Batch analyze multiple items
 */
export async function batchAnalyzeSentiment(
  items: Array<{ id: string; text: string }>
): Promise<Map<string, { score: number; label: SentimentLabel; emoji: string; breakdown: SentimentBreakdown }>> {
  const results = new Map();

  for (const item of items) {
    const result = await analyzeSentiment(item.text);
    results.set(item.id, result);
  }

  return results;
}

// Re-export threshold constants
export { SENTIMENT_THRESHOLDS };
