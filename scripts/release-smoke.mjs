const baseUrlValue = process.env.SMOKE_BASE_URL ?? process.env.APP_URL

if (!baseUrlValue) {
  process.stderr.write(
    'Set SMOKE_BASE_URL or APP_URL before running smoke tests.\n',
  )
  process.exit(1)
}

const baseUrl = new URL(baseUrlValue)

async function readJson(path) {
  const url = new URL(path, baseUrl)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`${url.toString()} returned ${response.status}`)
  }

  return response.json()
}

const checks = [
  {
    name: 'API healthcheck',
    path: '/api/v0/healthcheck',
    validate: (json) => json?.data?.message === 'OK',
  },
  {
    name: 'API readiness',
    path: '/api/v0/readiness',
    validate: (json) =>
      json?.data?.status === 'ready' && json?.data?.checks?.database === 'ok',
  },
  {
    name: 'API version',
    path: '/api/v0/version',
    validate: (json) =>
      typeof json?.data?.version === 'string' &&
      typeof json?.data?.databaseMigrationCount === 'number',
  },
]

for (const check of checks) {
  const json = await readJson(check.path)

  if (!check.validate(json)) {
    throw new Error(`${check.name} returned an unexpected response shape`)
  }

  process.stdout.write(`${check.name} passed.\n`)
}
