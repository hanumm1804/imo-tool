/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firstsource.com'],
  },
  experimental: {
    typedRoutes: false,
  },
}

module.exports = nextConfig
