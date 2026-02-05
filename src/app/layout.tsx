/**
 * Root Layout
 *
 * Defines the base HTML structure, fonts, and metadata for the app.
 */

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'NBA News Hub | News & Fan Sentiment',
  description:
    'Your one-stop destination for NBA news aggregation with real-time fan sentiment analysis. Stay updated with the latest basketball headlines and see how fans are reacting.',
  keywords: ['NBA', 'basketball', 'news', 'sentiment', 'sports', 'Lakers', 'Warriors', 'Celtics'],
  openGraph: {
    title: 'NBA News Hub',
    description: 'NBA news aggregation with fan sentiment analysis',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
