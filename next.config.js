/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    // Add support for ESM modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "supports-color": require.resolve("supports-color"),
    };
    return config;
  },
  images: {
    domains: ['localhost', 'gkigehbjdhsfxbwdqrkq.supabase.co'],
  },
  experimental: {
    serverActions: true
  },
  // Add PWA-specific headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ]
      }
    ]
  },
  transpilePackages: ['supports-color'],
}

module.exports = nextConfig 