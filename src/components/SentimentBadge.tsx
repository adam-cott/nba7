/**
 * SentimentBadge Component
 *
 * Displays a sentiment indicator with emoji and percentage breakdown.
 * Shows positive (green), neutral (yellow), or negative (red) sentiment.
 * Hover to see detailed breakdown of fan reactions.
 */

'use client';

import { useState } from 'react';
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
    hoverBg: 'hover:bg-green-200',
    label: 'Positive',
    description: 'Fans are reacting positively',
  },
  neutral: {
    emoji: '🟡',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    hoverBg: 'hover:bg-yellow-200',
    label: 'Neutral',
    description: 'Mixed or neutral reactions',
  },
  negative: {
    emoji: '🔴',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    hoverBg: 'hover:bg-red-200',
    label: 'Negative',
    description: 'Fans are reacting negatively',
  },
};

export default function SentimentBadge({
  label,
  breakdown,
  showBreakdown = false,
  size = 'md',
}: SentimentBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = SENTIMENT_CONFIG[label];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div
      className="relative inline-flex flex-col items-start gap-1"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Main badge */}
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full border cursor-help
          ${config.bgColor} ${config.textColor} ${config.borderColor} ${config.hoverBg}
          ${sizeClasses[size]}
          font-medium transition-colors
        `}
      >
        <span>{config.emoji}</span>
        <span>{config.label}</span>
      </span>

      {/* Tooltip with breakdown */}
      {showTooltip && breakdown && (
        <div className="absolute bottom-full left-0 mb-2 z-50 animate-in fade-in duration-150">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg min-w-[160px]">
            <p className="font-medium mb-2">{config.description}</p>

            {/* Breakdown bars */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3">🟢</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${breakdown.positive}%` }}
                  />
                </div>
                <span className="w-8 text-right">{breakdown.positive}%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3">🟡</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full transition-all"
                    style={{ width: `${breakdown.neutral}%` }}
                  />
                </div>
                <span className="w-8 text-right">{breakdown.neutral}%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3">🔴</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${breakdown.negative}%` }}
                  />
                </div>
                <span className="w-8 text-right">{breakdown.negative}%</span>
              </div>
            </div>

            <p className="text-gray-400 text-[10px] mt-2">
              Based on Twitter/X fan reactions
            </p>

            {/* Tooltip arrow */}
            <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900" />
          </div>
        </div>
      )}

      {/* Always-visible breakdown (if enabled) */}
      {showBreakdown && breakdown && !showTooltip && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="text-green-600">{breakdown.positive}%</span>
          <span className="text-yellow-600">{breakdown.neutral}%</span>
          <span className="text-red-600">{breakdown.negative}%</span>
        </div>
      )}
    </div>
  );
}
