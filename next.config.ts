import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // drei <Html> portals double-mount under StrictMode and spam dev warnings
  reactStrictMode: false,
}

export default nextConfig
