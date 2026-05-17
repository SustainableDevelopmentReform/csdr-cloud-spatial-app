import { isIP } from 'node:net'
import { env } from '~/env'
import { ServerError } from './error'

const privateHostnames = new Set([
  'localhost',
  'localhost.localdomain',
  'host.docker.internal',
])

const isPrivateIpv4 = (hostname: string): boolean => {
  const parts = hostname.split('.').map((part) => Number(part))

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false
  }

  const first = parts[0]
  const second = parts[1]

  if (first === undefined || second === undefined) {
    return false
  }

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  )
}

const normalizeHostname = (hostname: string): string =>
  hostname.replace(/^\[|\]$/g, '').toLowerCase()

export const isBlockedNetworkHostname = (hostname: string): boolean => {
  const normalizedHostname = normalizeHostname(hostname)

  if (
    privateHostnames.has(normalizedHostname) ||
    normalizedHostname.endsWith('.localhost') ||
    normalizedHostname.endsWith('.local')
  ) {
    return true
  }

  const ipVersion = isIP(normalizedHostname)

  if (ipVersion === 4) {
    return isPrivateIpv4(normalizedHostname)
  }

  if (ipVersion === 6) {
    return (
      normalizedHostname === '::1' ||
      normalizedHostname.startsWith('fc') ||
      normalizedHostname.startsWith('fd') ||
      normalizedHostname.startsWith('fe80:')
    )
  }

  return false
}

const parseS3PmtilesUrl = (rawUrl: string): URL | null => {
  if (!rawUrl.startsWith('s3://')) {
    return null
  }

  const withoutScheme = rawUrl.slice('s3://'.length)
  const [bucket, ...pathParts] = withoutScheme.split('/')
  const key = pathParts.join('/')

  if (!bucket || !key) {
    return null
  }

  return new URL(`https://${bucket}.s3.amazonaws.com/${key}`)
}

export const resolvePmtilesHttpUrl = (rawUrl: string): URL | null => {
  const trimmedUrl = rawUrl.trim()
  const s3Url = parseS3PmtilesUrl(trimmedUrl)

  if (s3Url) {
    return s3Url
  }

  try {
    return new URL(trimmedUrl)
  } catch {
    return null
  }
}

export const validatePmtilesUrl = (rawUrl: string | null | undefined): void => {
  if (!rawUrl) {
    return
  }

  const resolvedUrl = resolvePmtilesHttpUrl(rawUrl)

  if (!resolvedUrl) {
    throw new ServerError({
      statusCode: 422,
      message: 'Invalid PMTiles URL',
      description: 'PMTiles URLs must be valid https:// or s3:// URLs.',
    })
  }

  if (resolvedUrl.protocol !== 'https:') {
    throw new ServerError({
      statusCode: 422,
      message: 'Invalid PMTiles URL',
      description: 'PMTiles URLs must resolve to HTTPS.',
    })
  }

  if (isBlockedNetworkHostname(resolvedUrl.hostname)) {
    throw new ServerError({
      statusCode: 422,
      message: 'Invalid PMTiles URL',
      description: 'PMTiles URLs cannot target local or private network hosts.',
    })
  }

  if (!env.PMTILES_ALLOWED_ORIGINS.includes(resolvedUrl.origin)) {
    throw new ServerError({
      statusCode: 422,
      message: 'Invalid PMTiles URL',
      description: 'PMTiles URL origin is not allowed.',
    })
  }
}
