import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import { ensureIconsExist } from './lib/generate-icons';

ensureIconsExist();

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  transpilePackages: ['@offload/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default withSerwist(nextConfig);
