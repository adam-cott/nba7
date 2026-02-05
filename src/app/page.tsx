/**
 * NBA News Hub - Home Page
 *
 * Main page displaying the news feed with team filtering,
 * sentiment indicators, and fan polls.
 */

import Header from '@/components/Header';
import NewsFeed from '@/components/NewsFeed';
import PollSection from '@/components/PollSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* News feed - main column */}
          <div className="flex-1 min-w-0">
            <NewsFeed />
          </div>

          {/* Sidebar - polls */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-24">
              <PollSection />

              {/* Additional sidebar content */}
              <div className="mt-6 bg-white rounded-lg shadow-md border border-gray-100 p-4">
                <h3 className="font-bold text-gray-800 mb-2">About</h3>
                <p className="text-sm text-gray-600">
                  NBA News Hub aggregates the latest basketball news and analyzes
                  fan sentiment to give you a complete picture of what&apos;s happening
                  in the league.
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Sentiment Guide
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span>🟢</span>
                      <span className="text-gray-600">Positive reaction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🟡</span>
                      <span className="text-gray-600">Neutral reaction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🔴</span>
                      <span className="text-gray-600">Negative reaction</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
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
