import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OPXE - Omega ProblemX Exchange',
    short_name: 'OPXE',
    description: 'Community marketplace for local exchange and campus listings.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020817',
    theme_color: '#020817',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
