import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/openapi.json',
        destination: '/api/openapi.json',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
