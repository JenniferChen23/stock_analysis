/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate' }],
      },
    ]
  },
}

module.exports = nextConfig
