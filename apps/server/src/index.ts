import { serve } from '@hono/node-server'
import app from './app'
import { env } from './env'
import { buildInfo } from './lib/build-info'
import { appLogger } from './lib/logger'

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  () => {
    appLogger.info('server_started', {
      port: env.PORT,
      version: buildInfo.version,
      commit: buildInfo.commit,
      buildTime: buildInfo.buildTime,
    })
  },
)

const shutdown = (signal: NodeJS.Signals): void => {
  appLogger.info('server_shutdown_started', { signal })

  const shutdownTimeout = setTimeout(() => {
    appLogger.error('server_shutdown_forced', { signal })
    process.exit(1)
  }, 10000)
  shutdownTimeout.unref()

  server.close(() => {
    clearTimeout(shutdownTimeout)
    appLogger.info('server_shutdown_completed', { signal })
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
