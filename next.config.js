/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    // Handle canvas and worker_threads modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        worker_threads: false,
      };
    }

    // Prevent webpack from trying to bundle the PDF.js worker
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
    });

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