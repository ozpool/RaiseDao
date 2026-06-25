import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Linting runs as its own workspace step (flat config); don't double-run it
  // here with Next's bundled eslint-config-next expectations.
  eslint: { ignoreDuringBuilds: true },
  // Import .glsl shader files as raw strings (UI.md: shaders live in .glsl files,
  // never inlined as template literals). `asset/source` needs no extra loader.
  webpack: (config) => {
    config.module.rules.push({ test: /\.glsl$/, type: 'asset/source' });
    // wagmi's wallet deps optionally pull in modules that have no place in a
    // browser build — the MetaMask SDK's React-Native storage and pino's
    // pretty-printer. Stub them so webpack doesn't emit "module not found".
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    return config;
  },
};

export default nextConfig;
