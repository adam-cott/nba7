/**
 * Header Component
 *
 * App header with logo, title, and News/Polls navigation.
 * Shared across all pages via root layout.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
              <span className="text-2xl">🏀</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">NBA News Hub</h1>
              <p className="text-xs text-blue-200 hidden sm:block">
                News & Fan Sentiment
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'text-white border-b-2 border-orange-500 pb-1'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              News
            </Link>
            <Link
              href="/polls"
              className={`text-sm font-medium transition-colors ${
                pathname === '/polls'
                  ? 'text-white border-b-2 border-orange-500 pb-1'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Polls
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
