/**
 * Poll Component
 *
 * Displays a poll with voting functionality.
 * Shows live results after voting and unlocks an insight.
 * Uses localStorage to track votes without authentication.
 */

'use client';

import { useState, useEffect } from 'react';
import { Poll as PollType } from '@/lib/types';

interface PollProps {
  poll: PollType;
  onVote?: (pollId: string, optionIndex: number) => void;
}

// Generate or retrieve session ID for vote tracking
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem('nba_poll_session');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('nba_poll_session', sessionId);
  }
  return sessionId;
}

// Check if user has voted on a poll
function hasVoted(pollId: string): boolean {
  if (typeof window === 'undefined') return false;
  const votes = JSON.parse(localStorage.getItem('nba_poll_votes') || '{}');
  return !!votes[pollId];
}

// Record that user has voted
function recordVote(pollId: string, optionIndex: number): void {
  if (typeof window === 'undefined') return;
  const votes = JSON.parse(localStorage.getItem('nba_poll_votes') || '{}');
  votes[pollId] = optionIndex;
  localStorage.setItem('nba_poll_votes', JSON.stringify(votes));
}

export default function Poll({ poll, onVote }: PollProps) {
  const [hasUserVoted, setHasUserVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [localPoll, setLocalPoll] = useState(poll);

  // Check vote status on mount
  useEffect(() => {
    const voted = hasVoted(poll.id);
    setHasUserVoted(voted);
    if (voted) {
      const votes = JSON.parse(localStorage.getItem('nba_poll_votes') || '{}');
      setSelectedOption(votes[poll.id]);
    }
  }, [poll.id]);

  // Calculate total votes and percentages
  const totalVotes = localPoll.options.reduce((sum, opt) => sum + opt.votes, 0);
  const getPercentage = (votes: number) =>
    totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

  // Handle vote submission
  const handleVote = async (optionIndex: number) => {
    if (hasUserVoted || isSubmitting) return;

    setIsSubmitting(true);
    setSelectedOption(optionIndex);

    try {
      const sessionId = getSessionId();
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll.id,
          optionIndex,
          sessionId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        recordVote(poll.id, optionIndex);
        setHasUserVoted(true);
        setLocalPoll(data.poll);
        setInsight(data.insight);
        onVote?.(poll.id, optionIndex);
      } else if (data.alreadyVoted) {
        recordVote(poll.id, optionIndex);
        setHasUserVoted(true);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      // Still mark as voted locally to prevent spam
      recordVote(poll.id, optionIndex);
      setHasUserVoted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Poll header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <span className="text-xs font-medium text-blue-200 uppercase tracking-wide">
          Fan Poll
        </span>
        <h3 className="text-lg font-bold text-white mt-1">{localPoll.question}</h3>
        <p className="text-sm text-blue-200 mt-1">{localPoll.event_context}</p>
      </div>

      {/* Poll options */}
      <div className="p-4 space-y-3">
        {localPoll.options.map((option, index) => {
          const percentage = getPercentage(option.votes);
          const isSelected = selectedOption === index;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={hasUserVoted || isSubmitting}
              className={`
                relative w-full text-left p-3 rounded-lg border-2 transition-all
                ${
                  hasUserVoted
                    ? isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                }
                ${isSubmitting ? 'opacity-50 cursor-wait' : ''}
              `}
            >
              {/* Progress bar (shown after voting) */}
              {hasUserVoted && (
                <div
                  className={`absolute inset-0 rounded-lg transition-all ${
                    isSelected ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Option content */}
              <div className="relative flex items-center justify-between">
                <span
                  className={`font-medium ${
                    isSelected ? 'text-blue-700' : 'text-gray-800'
                  }`}
                >
                  {option.text}
                </span>
                {hasUserVoted && (
                  <span
                    className={`text-sm font-bold ${
                      isSelected ? 'text-blue-700' : 'text-gray-600'
                    }`}
                  >
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Vote count */}
        <p className="text-xs text-gray-500 text-center pt-2">
          {totalVotes.toLocaleString()} votes
        </p>
      </div>

      {/* Unlocked insight (shown after voting) */}
      {hasUserVoted && insight && (
        <div className="px-4 pb-4">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <div>
                <span className="text-xs font-semibold text-amber-700 uppercase">
                  Unlocked Insight
                </span>
                <p className="text-sm text-amber-900 mt-1">{insight}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
