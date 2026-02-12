import vader from 'vader-sentiment';
import { SentimentLabel, SentimentBreakdown } from './types';

function analyzeWithVADER(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(text);
  return intensity.compound;
}

function getLabel(score: number): SentimentLabel {
  if (score >= 0.05) return 'positive';
  if (score <= -0.05) return 'negative';
  return 'neutral';
}

function getEmoji(label: SentimentLabel): string {
  switch (label) {
    case 'positive': return '🟢';
    case 'negative': return '🔴';
    default: return '🟡';
  }
}

function getBreakdown(score: number): SentimentBreakdown {
  const normalized = (score + 1) / 2;

  if (score >= 0.05) {
    return {
      positive: Math.round(50 + normalized * 40),
      neutral: Math.round(20 + (1 - normalized) * 20),
      negative: Math.round(10 + (1 - normalized) * 10),
    };
  } else if (score <= -0.05) {
    return {
      positive: Math.round(10 + normalized * 10),
      neutral: Math.round(20 + normalized * 20),
      negative: Math.round(50 + (1 - normalized) * 40),
    };
  } else {
    return {
      positive: Math.round(25 + normalized * 15),
      neutral: Math.round(40 + Math.abs(0.5 - normalized) * 20),
      negative: Math.round(25 + (1 - normalized) * 15),
    };
  }
}

export async function analyzeSentiment(text: string): Promise<{
  score: number;
  label: SentimentLabel;
  emoji: string;
  breakdown: SentimentBreakdown;
}> {
  const score = analyzeWithVADER(text);
  const label = getLabel(score);
  return {
    score,
    label,
    emoji: getEmoji(label),
    breakdown: getBreakdown(score),
  };
}

export async function analyzeMultipleSentiments(texts: string[]): Promise<{
  overall: { score: number; label: SentimentLabel; emoji: string };
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

  const sentiments = texts.map(text => {
    const score = analyzeWithVADER(text);
    return { score, label: getLabel(score) };
  });

  const total = sentiments.length;
  const positive = sentiments.filter(s => s.label === 'positive').length;
  const neutral = sentiments.filter(s => s.label === 'neutral').length;
  const negative = sentiments.filter(s => s.label === 'negative').length;

  const breakdown: SentimentBreakdown = {
    positive: Math.round((positive / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((negative / total) * 100),
  };

  const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / total;
  const overallLabel = getLabel(avgScore);

  return {
    overall: { score: avgScore, label: overallLabel, emoji: getEmoji(overallLabel) },
    breakdown,
    commentCount: total,
  };
}
