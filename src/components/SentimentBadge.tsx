/**
 * SentimentBadge Component
 *
 * Displays a sentiment indicator with emoji and optional percentage breakdown.
 * Shows positive (green), neutral (yellow), or negative (red) sentiment.
 */

'use client';

import { SentimentLabel, SentimentBreakdown } from '@/lib/types';

interface SentimentBadgeProps {
  label: SentimentLabel;
  breakdown?: SentimentBreakdown;
  showBreakdown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SENTIMENT_CONFIG = {
  positive: {
    emoji: '🟢',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    label: 'Positive',
  },
  neutral: {
    emoji: '🟡',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    label: 'Neutral',
  },
  negative: {
    emoji: '🔴',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    label: 'Negative',
  },
};

export default function SentimentBadge({
  label,
  breakdown,
  showBreakdown = false,
  size = 'md',
}: SentimentBadgeProps) {
  const config = SENTIMENT_CONFIG[label];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {/* Main badge */}
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full border
          ${config.bgColor} ${config.textColor} ${config.borderColor}
          ${sizeClasses[size]}
          font-medium
        `}
        title={`Fan sentiment: ${config.label}`}
      >
        <span>{config.emoji}</span>
        <span>{config.label}</span>
      </span>

      {/* Optional breakdown */}
      {showBreakdown && breakdown && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="text-green-600">{breakdown.positive}% pos</span>
          <span className="text-yellow-600">{breakdown.neutral}% neu</span>
          <span className="text-red-600">{breakdown.negative}% neg</span>
        </div>
      )}
    </div>
  );
}
