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
    // @developmentseed/lzw-tiff-decoder/index.mjs
    // The generated code contains 'async/await' because this module is using "topLevelAwait".
    // However, your target environment does not appear to support 'async/await'.
    // As a result, the code may not run as expected or may cause runtime errors.
    config.output = {
      ...config.output,
      environment: {
        ...config.output?.environment,
        module: true,
      },
    }
    // Emit the EPSG CSV as a static asset (used by @developmentseed/epsg)
    config.module.rules.push({
      test: /\/@developmentseed\/epsg\/dist\/all\.csv\.gz$/,
      type: 'asset/resource',
    })

    return config
  },
  devIndicators: {
    position: 'bottom-right',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
