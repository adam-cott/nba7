import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NBA News Hub',
    short_name: 'NBA News',
    description: 'NBA news aggregation with real-time fan sentiment analysis',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#1e3a8a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
