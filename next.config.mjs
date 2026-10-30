const PDFKIT_FILES = ['./node_modules/pdfkit/js/standard-fonts/**/*', './node_modules/pdfkit/js/data/**/*']

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // @react-pdf -> pdfkit loads its standard fonts (Helvetica.cjs etc.) with a dynamic require that file tracing
  // can't see, so the standalone/Docker bundle missed them and every PDF route returned 500. Keep pdfkit external
  // and ship its font/data files with each PDF route.
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: {
    '/i/[token]/pdf': PDFKIT_FILES,
    '/r/[token]/pdf': PDFKIT_FILES,
    '/api/reports/reports/[id]/pdf': PDFKIT_FILES,
  },
  // Link-in-bio public pages: /@handle -> /u/handle
  async rewrites() {
    return [
      { source: '/@:handle', destination: '/u/:handle' },
      { source: '/@:handle/review', destination: '/u/:handle/review' },
      { source: '/@:handle/reviews', destination: '/u/:handle/reviews' },
      { source: '/@:handle/book', destination: '/u/:handle/book' },
      { source: '/@:handle/book/:type', destination: '/u/:handle/book/:type' },
      { source: '/@:handle/:form', destination: '/u/:handle/f/:form' },
      { source: '/@:handle/p/:id', destination: '/u/:handle/p/:id' },
    ]
  },
  // Funnel dashboard/builder moved under /funnels (SaaS Nation hub lives at /dashboard).
  // Admin dashboard: never indexed, never cached.
  async headers() {
    const h = [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
    ]
    return [
      { source: '/admin', headers: h },
      { source: '/admin/:path*', headers: h },
      { source: '/api/admin/:path*', headers: h },
    ]
  },
  async redirects() {
    return [
      { source: '/dashboard/funnels', destination: '/funnels', permanent: true },
      { source: '/dashboard/funnels/:path*', destination: '/funnels/:path*', permanent: true },
      { source: '/dashboard/templates', destination: '/funnels/templates', permanent: true },
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/signup', destination: '/auth/register', permanent: true },
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
