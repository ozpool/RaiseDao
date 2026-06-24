import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Linting runs as its own workspace step (flat config); don't double-run it
  // here with Next's bundled eslint-config-next expectations.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
