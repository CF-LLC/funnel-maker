/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Link-in-bio public pages: /@handle -> /u/handle
  async rewrites() {
    return [{ source: '/@:handle', destination: '/u/:handle' }]
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
