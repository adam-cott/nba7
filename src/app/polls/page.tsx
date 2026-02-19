/**
 * Polls Page
 *
 * Dedicated page for NBA fan polls.
 * Moved from home page sidebar to give polls more prominence.
 */

import PollSection from '@/components/PollSection';

export default function PollsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Fan Polls</h1>
          <p className="text-gray-600 mt-2">
            Vote on the biggest debates in the NBA and see how your opinions compare.
          </p>
        </div>

        <PollSection />
      </main>
    </div>
  );
}
