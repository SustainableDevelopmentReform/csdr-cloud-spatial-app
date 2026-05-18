import { serve } from '@hono/node-server'
import app from './app'
import { env } from './env'
import { buildInfo } from './lib/build-info'
import { checkDatabaseConnection } from './lib/db'
import { appLogger } from './lib/logger'

const getDatabaseTarget = (): string => {
  if (env.DATABASE_URL) {
    return `DATABASE_URL is configured (value redacted)${
      env.DATABASE_SCHEMA ? `, schema=${env.DATABASE_SCHEMA}` : ''
    }`
  }

  return [
    `host=${env.DATABASE_HOST}`,
    `port=${env.DATABASE_PORT}`,
    `database=${env.DATABASE_NAME}`,
    `user=${env.DATABASE_USER}`,
    env.DATABASE_SCHEMA ? `schema=${env.DATABASE_SCHEMA}` : null,
  ]
    .filter((part) => part !== null)
    .join(', ')
}

const formatError = (error: unknown): string => {
  if (error instanceof AggregateError) {
    const messages = error.errors.map(formatError).filter(Boolean)
    return messages.length > 0
      ? `${error.name} (${messages.join('; ')})`
      : error.name
  }

  if (error instanceof Error) {
    return error.message ? `${error.name}: ${error.message}` : error.name
  }

  return String(error)
}

const startServer = async (): Promise<void> => {
  try {
    await checkDatabaseConnection()
  } catch (error) {
    appLogger.error('database_startup_check_failed', {
      databaseTarget: getDatabaseTarget(),
      error,
    })

    process.stderr.write(
      [
        '',
        'DATABASE STARTUP CHECK FAILED',
        'The API server could not connect to PostgreSQL, so startup has been aborted before opening the HTTP port.',
        `Database target: ${getDatabaseTarget()}`,
        `Connection error: ${formatError(error)}`,
        'Start Docker/PostgreSQL or fix the DATABASE_* environment variables, then restart the server.',
        '',
      ].join('\n'),
    )
    process.exit(1)
  }

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
}

startServer().catch((error) => {
  appLogger.error('server_startup_failed', { error })
  process.stderr.write(
    '\nSERVER STARTUP FAILED\nThe API server failed during startup before opening the HTTP port. Check the structured error log above.\n\n',
  )
  process.exit(1)
})
