/**
 * Header Component
 *
 * App header with logo, title, and refresh button.
 * Mobile-responsive design.
 */

'use client';

interface HeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function Header({ onRefresh, isLoading = false }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
              <span className="text-2xl">🏀</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">NBA News Hub</h1>
              <p className="text-xs text-blue-200 hidden sm:block">
                News & Fan Sentiment
              </p>
            </div>
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`
                flex items-center gap-2 px-4 py-2
                bg-white/10 hover:bg-white/20
                rounded-lg transition-colors
                text-sm font-medium
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title="Refresh news"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
