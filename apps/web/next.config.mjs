/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/ui', '@repo/schemas', '@repo/plot'],
  output: 'standalone',
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true,
    }
    // Ensure webpack outputs modern JS that supports top-level await
    // Needed for @developmentseed/lzw-tiff-decoder/index.mjs
    config.output = {
      ...config.output,
      environment: {
        ...config.output?.environment,
        module: true,
      },
    }
    return config
  },
  devIndicators: {
    position: 'bottom-right',
  },
}

export default nextConfig
