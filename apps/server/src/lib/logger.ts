type LogLevel = 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

const serializeError = (error: Error): LogContext => {
  const serialized: LogContext = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  }

  if (error.cause instanceof Error) {
    serialized.cause = {
      name: error.cause.name,
      message: error.cause.message,
      stack: error.cause.stack,
    }
  } else if (error.cause !== undefined) {
    serialized.cause = error.cause
  }

  return serialized
}

const normalizeContext = (context: LogContext): LogContext => {
  const normalized: LogContext = {}

  for (const [key, value] of Object.entries(context)) {
    normalized[key] = value instanceof Error ? serializeError(value) : value
  }

  return normalized
}

const writeLog = (
  level: LogLevel,
  message: string,
  context: LogContext = {},
): void => {
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.APP_LOGS_IN_TEST !== 'true'
  ) {
    return
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalizeContext(context),
  }
  const line = `${JSON.stringify(payload)}\n`

  if (level === 'error') {
    process.stderr.write(line)
    return
  }

  process.stdout.write(line)
}

export const appLogger = {
  info: (message: string, context?: LogContext): void => {
    writeLog('info', message, context)
  },
  warn: (message: string, context?: LogContext): void => {
    writeLog('warn', message, context)
  },
  error: (message: string, context?: LogContext): void => {
    writeLog('error', message, context)
  },
}
