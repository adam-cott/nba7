/**
 * Type declarations for vader-sentiment package
 */

declare module 'vader-sentiment' {
  interface PolarityScores {
    neg: number;
    neu: number;
    pos: number;
    compound: number;
  }

  interface SentimentIntensityAnalyzer {
    polarity_scores(text: string): PolarityScores;
  }

  const vader: {
    SentimentIntensityAnalyzer: SentimentIntensityAnalyzer;
  };

  export default vader;
}
