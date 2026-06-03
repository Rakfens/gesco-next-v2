/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@supabase/supabase-js'],
  // Disable static generation to avoid Tailwind SSR issues
  experimental: {
    isrMemoryCacheSize: 0,
  },
};

module.exports = nextConfig;
