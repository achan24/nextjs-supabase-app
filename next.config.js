/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    // Add fallback for 'canvas' module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }

    return config;
  },
  images: {
    domains: ['localhost', 'gkigehbjdhsfxbwdqrkq.supabase.co'],
  },
  experimental: {
    serverActions: true,
    esmExternals: 'loose'
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
  transpilePackages: [],
}

module.exports = nextConfig 