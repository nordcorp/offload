import type { MetadataRoute } from 'next';
import { ensureIconsExist } from '@/lib/generate-icons';

export default function manifest(): MetadataRoute.Manifest {
  ensureIconsExist();

  return {
    name: 'Offload',
    short_name: 'Offload',
    description: 'Minimalist task tracker with Eisenhower Matrix prioritization',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
