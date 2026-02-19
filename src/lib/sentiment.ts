import vader from 'vader-sentiment';
import { SentimentLabel, SentimentBreakdown, YouTubeComment } from './types';

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

/**
 * Ensure three rounded percentages always sum to exactly 100
 * by adjusting the largest value to absorb rounding error.
 */
function normalizePercentages(a: number, b: number, c: number): [number, number, number] {
  const ra = Math.round(a);
  const rb = Math.round(b);
  const rc = Math.round(c);
  const diff = 100 - (ra + rb + rc);
  // Adjust the largest bucket to absorb the rounding error
  const vals: [number, number, number] = [ra, rb, rc];
  const maxIdx = vals.indexOf(Math.max(...vals));
  vals[maxIdx] += diff;
  return vals;
}

function getBreakdown(score: number): SentimentBreakdown {
  // Map compound score (-1 to 1) into rough positive/neutral/negative shares
  // that always sum to 100%.
  const normalized = (score + 1) / 2; // 0 = most negative, 1 = most positive

  let rawPositive: number, rawNeutral: number, rawNegative: number;

  if (score >= 0.05) {
    rawPositive = 50 + normalized * 30;  // ~65-80
    rawNegative = 5 + (1 - normalized) * 10; // ~5-10
    rawNeutral = 100 - rawPositive - rawNegative;
  } else if (score <= -0.05) {
    rawNegative = 50 + (1 - normalized) * 30; // ~65-80
    rawPositive = 5 + normalized * 10; // ~5-10
    rawNeutral = 100 - rawPositive - rawNegative;
  } else {
    rawNeutral = 50 + (1 - Math.abs(score) * 20) * 5; // ~50-55
    rawPositive = (100 - rawNeutral) * (0.5 + score);
    rawNegative = 100 - rawNeutral - rawPositive;
  }

  const [positive, neutral, negative] = normalizePercentages(rawPositive, rawNeutral, rawNegative);
  return { positive, neutral, negative };
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

export async function analyzeMultipleSentiments(inputs: string[] | YouTubeComment[]): Promise<{
  overall: { score: number; label: SentimentLabel; emoji: string };
  breakdown: SentimentBreakdown;
  commentCount: number;
}> {
  if (!inputs || inputs.length === 0) {
    return {
      overall: { label: 'neutral', emoji: '🟡', score: 0 },
      breakdown: { positive: 0, neutral: 100, negative: 0 },
      commentCount: 0,
    };
  }

  const texts = inputs.map(t => typeof t === 'string' ? t : t.text);

  const sentiments = texts.map(text => {
    const score = analyzeWithVADER(text);
    return { score, label: getLabel(score) };
  });

  const total = sentiments.length;
  const positive = sentiments.filter(s => s.label === 'positive').length;
  const neutral = sentiments.filter(s => s.label === 'neutral').length;
  const negative = sentiments.filter(s => s.label === 'negative').length;

  const [pPct, nPct, negPct] = normalizePercentages(
    (positive / total) * 100,
    (neutral / total) * 100,
    (negative / total) * 100,
  );
  const breakdown: SentimentBreakdown = {
    positive: pPct,
    neutral: nPct,
    negative: negPct,
  };

  const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / total;
  const overallLabel = getLabel(avgScore);

  return {
    overall: { score: avgScore, label: overallLabel, emoji: getEmoji(overallLabel) },
    breakdown,
    commentCount: total,
  };
}
