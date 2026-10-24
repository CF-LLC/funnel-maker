/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Link-in-bio public pages: /@handle -> /u/handle
  async rewrites() {
    return [
      { source: '/@:handle', destination: '/u/:handle' },
      { source: '/@:handle/review', destination: '/u/:handle/review' },
      { source: '/@:handle/reviews', destination: '/u/:handle/reviews' },
      { source: '/@:handle/:form', destination: '/u/:handle/f/:form' },
      { source: '/@:handle/p/:id', destination: '/u/:handle/p/:id' },
    ]
  },
  // Funnel dashboard/builder moved under /funnels (SaaS Nation hub lives at /dashboard).
  async redirects() {
    return [
      { source: '/dashboard/funnels', destination: '/funnels', permanent: true },
      { source: '/dashboard/funnels/:path*', destination: '/funnels/:path*', permanent: true },
      { source: '/dashboard/templates', destination: '/funnels/templates', permanent: true },
    ]
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
