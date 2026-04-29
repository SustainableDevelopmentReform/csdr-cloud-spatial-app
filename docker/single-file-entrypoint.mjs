import { spawn } from 'node:child_process'

const services = [
  {
    name: 'web',
    command: 'node',
    args: ['/app/frontend/standalone/apps/web/server.js'],
    defaults: {
      INTERNAL_BACKEND_URL: 'http://localhost:4000',
      INTERNAL_FRONTEND_URL: 'http://localhost:3000',
    },
    env: {
      PORT: '3000',
    },
  },
  {
    name: 'api',
    command: 'node',
    args: ['/app/backend/app/index.js'],
    env: {
      PORT: '4000',
    },
  },
]

const children = new Map()
let shuttingDown = false

function log(message, context = {}) {
  process.stdout.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      message,
      ...context,
    })}\n`,
  )
}

function shutdown(signal, exitCode) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  log('single_file_shutdown_started', { signal, exitCode })

  const timeout = setTimeout(() => {
    for (const child of children.values()) {
      child.kill('SIGKILL')
    }
    process.exit(exitCode)
  }, 10000)
  timeout.unref()

  for (const child of children.values()) {
    child.kill(signal)
  }

  const interval = setInterval(() => {
    if (children.size === 0) {
      clearInterval(interval)
      clearTimeout(timeout)
      log('single_file_shutdown_completed', { signal, exitCode })
      process.exit(exitCode)
    }
  }, 100)
  interval.unref()
}

for (const service of services) {
  const child = spawn(service.command, service.args, {
    env: {
      ...service.defaults,
      ...process.env,
      ...service.env,
    },
    stdio: 'inherit',
  })

  children.set(service.name, child)

  child.on('exit', (code, signal) => {
    children.delete(service.name)

    if (!shuttingDown) {
      shutdown(signal ?? 'SIGTERM', code ?? 1)
    }
  })
}

process.on('SIGINT', () => {
  shutdown('SIGINT', 0)
})

process.on('SIGTERM', () => {
  shutdown('SIGTERM', 0)
})
