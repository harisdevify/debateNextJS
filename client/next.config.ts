import type { NextConfig } from 'next';
import path from 'node:path';

// All browser HTTP requests use the frontend origin. The rewrite forwards
// requests to NestJS server-side, so the auth cookie remains first-party.
const apiTarget = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8800/api/v1'
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: { root: path.resolve(__dirname) },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
