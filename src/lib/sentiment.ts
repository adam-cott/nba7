/**
 * Sentiment Analysis Utilities
 *
 * Provides sentiment analysis using OpenAI API.
 * Falls back to basic keyword analysis if OpenAI is not configured.
 */

import OpenAI from 'openai';
import { SentimentLabel, SentimentBreakdown } from './types';
import { SENTIMENT_THRESHOLDS } from './constants';

// Initialize OpenAI client (only if API key is available)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Basic sentiment keywords for fallback analysis
const POSITIVE_WORDS = [
  'win', 'won', 'victory', 'champion', 'mvp', 'great', 'amazing', 'dominant',
  'clutch', 'comeback', 'historic', 'record', 'best', 'excellent', 'impressive',
  'stellar', 'outstanding', 'brilliant', 'spectacular', 'triumph', 'success',
  'unstoppable', 'legendary', 'phenomenal', 'incredible'
];

const NEGATIVE_WORDS = [
  'lose', 'lost', 'loss', 'injury', 'injured', 'suspend', 'suspension', 'fine',
  'fined', 'trade', 'traded', 'fire', 'fired', 'struggle', 'struggling', 'worst',
  'terrible', 'disappointing', 'fail', 'failed', 'collapse', 'blowout', 'disaster',
  'controversy', 'controversial', 'trouble', 'problem', 'concern', 'worrying'
];

/**
 * Simple keyword-based sentiment analysis (fallback)
 * Returns a score between -1 and 1
 */
function analyzeWithKeywords(text: string): number {
  const lowerText = text.toLowerCase();
  let score = 0;

  // Count positive words
  for (const word of POSITIVE_WORDS) {
    if (lowerText.includes(word)) {
      score += 0.1;
    }
  }

  // Count negative words
  for (const word of NEGATIVE_WORDS) {
    if (lowerText.includes(word)) {
      score -= 0.1;
    }
  }

  // Clamp score between -1 and 1
  return Math.max(-1, Math.min(1, score));
}

/**
 * Analyze sentiment using OpenAI API
 * Returns a score between -1 (very negative) and 1 (very positive)
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
          content: `You are a sentiment analyzer for NBA news. Analyze the sentiment of the given text and respond with ONLY a number between -1 and 1, where:
- -1 is very negative (bad news, injuries, losses, controversies)
- 0 is neutral (roster moves, schedule updates, general news)
- 1 is very positive (wins, achievements, milestones, celebrations)
Respond with just the number, nothing else.`,
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

    if (isNaN(score)) {
      return 0;
    }

    return Math.max(-1, Math.min(1, score));
  } catch (error) {
    console.error('OpenAI sentiment analysis error:', error);
    throw error;
  }
}

/**
 * Get sentiment label from score
 */
export function getLabel(score: number): SentimentLabel {
  if (score > SENTIMENT_THRESHOLDS.POSITIVE) return 'positive';
  if (score < SENTIMENT_THRESHOLDS.NEGATIVE) return 'negative';
  return 'neutral';
}

/**
 * Convert score to breakdown percentages
 * This creates a simulated breakdown based on the overall score
 */
export function getBreakdown(score: number): SentimentBreakdown {
  // Normalize score to 0-1 range
  const normalized = (score + 1) / 2;

  if (score > SENTIMENT_THRESHOLDS.POSITIVE) {
    // Positive sentiment
    return {
      positive: Math.round(50 + normalized * 40),
      neutral: Math.round(20 + (1 - normalized) * 20),
      negative: Math.round(10 + (1 - normalized) * 10),
    };
  } else if (score < SENTIMENT_THRESHOLDS.NEGATIVE) {
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
 * Main sentiment analysis function
 * Uses OpenAI if available, falls back to keyword analysis
 */
export async function analyzeSentiment(text: string): Promise<{
  score: number;
  label: SentimentLabel;
  breakdown: SentimentBreakdown;
}> {
  let score: number;

  // Try OpenAI first, fall back to keywords
  if (openai) {
    try {
      score = await analyzeWithOpenAI(text);
    } catch {
      console.log('Falling back to keyword analysis');
      score = analyzeWithKeywords(text);
    }
  } else {
    score = analyzeWithKeywords(text);
  }

  return {
    score,
    label: getLabel(score),
    breakdown: getBreakdown(score),
  };
}

/**
 * Batch analyze multiple texts
 * More efficient than calling analyzeSentiment for each item
 */
export async function batchAnalyzeSentiment(
  items: Array<{ id: string; text: string }>
): Promise<Map<string, { score: number; label: SentimentLabel; breakdown: SentimentBreakdown }>> {
  const results = new Map();

  // Process in parallel with a concurrency limit
  const BATCH_SIZE = 5;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (item) => ({
        id: item.id,
        result: await analyzeSentiment(item.text),
      }))
    );

    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
  }

  return results;
}

// Re-export threshold constants
export { SENTIMENT_THRESHOLDS };
