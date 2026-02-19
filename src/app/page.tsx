/**
 * NBA News Hub - Home Page
 *
 * Renders the hero + grid news layout with fan comments.
 * Header is rendered in root layout (shared across all routes).
 * Polls are now on /polls.
 */

import NewsFeed from '@/components/NewsFeed';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NewsFeed />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            NBA News Hub - News aggregation with fan sentiment analysis
          </p>
          <p className="text-xs mt-2">
            Not affiliated with the NBA. News content belongs to respective sources.
          </p>
        </div>
      </footer>
    </div>
  );
}
