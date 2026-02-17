/**
 * Header Component
 *
 * App header with logo and title.
 * Mobile-responsive design.
 */

export default function Header() {
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
        </div>
      </div>
    </header>
  );
}
