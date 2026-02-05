/**
 * PollSection Component
 *
 * Fetches and displays active polls in a sidebar or card format.
 */

'use client';

import { useState, useEffect } from 'react';
import { Poll as PollType } from '@/lib/types';
import Poll from './Poll';

export default function PollSection() {
  const [polls, setPolls] = useState<PollType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch polls on mount
  useEffect(() => {
    async function fetchPolls() {
      try {
        const response = await fetch('/api/polls');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch polls');
        }

        setPolls(data.polls);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching polls:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPolls();
  }, []);

  // Handle vote callback (could be used for analytics)
  const handleVote = (pollId: string, optionIndex: number) => {
    console.log(`Vote recorded: Poll ${pollId}, Option ${optionIndex}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800">Fan Polls</h2>
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse"
          >
            <div className="bg-blue-600 px-4 py-3">
              <div className="h-4 bg-blue-400 rounded w-1/4 mb-2" />
              <div className="h-6 bg-blue-400 rounded w-3/4" />
            </div>
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  // Empty state
  if (polls.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-600 text-sm">No active polls right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">Fan Polls</h2>
      {polls.map((poll) => (
        <Poll key={poll.id} poll={poll} onVote={handleVote} />
      ))}
    </div>
  );
}
