import { auditLog } from '~/schemas/db'
import { db } from './db'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { ServerError } from './error'

export type AuthRequestBody = Record<string, unknown> | null

export interface AuthSessionSnapshot {
  user: {
    id: string
    email: string
    twoFactorEnabled?: boolean | null
  } | null
}

const authVerifyIpLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60 * 5,
})

const authSendIpLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60 * 10,
})

const authSendEmailLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60 * 10,
})

const AUTH_VERIFY_PATHS = new Set([
  '/api/auth/sign-in/email',
  '/api/auth/two-factor/verify-totp',
  '/api/auth/two-factor/verify-otp',
  '/api/auth/two-factor/verify-backup-code',
])

const AUTH_SEND_PATHS = new Set([
  '/api/auth/request-password-reset',
  '/api/auth/send-verification-email',
  '/api/auth/two-factor/send-otp',
])

const AUTH_LOG_ACTIONS = {
  '/api/auth/sign-in/email': 'sign_in',
  '/api/auth/sign-out': 'sign_out',
  '/api/auth/two-factor/enable': 'two_factor_enable',
  '/api/auth/two-factor/disable': 'two_factor_disable',
  '/api/auth/two-factor/verify-totp': 'two_factor_verify',
  '/api/auth/two-factor/verify-otp': 'two_factor_verify',
  '/api/auth/two-factor/verify-backup-code': 'two_factor_verify',
  '/api/auth/two-factor/send-otp': 'two_factor_send_otp',
  '/api/auth/two-factor/generate-backup-codes': 'backup_codes_regenerate',
  '/api/auth/api-key/create': 'api_key_create',
  '/api/auth/api-key/delete': 'api_key_delete',
  '/api/auth/organization/set-active': 'set_active_organization',
  '/api/auth/organization/invite-member': 'invite_member',
  '/api/auth/organization/accept-invitation': 'accept_invitation',
  '/api/auth/organization/remove-member': 'remove_member',
  '/api/auth/organization/update-member-role': 'update_member_role',
} as const

export function logAuthSecurity(
  event: string,
  data: Record<string, unknown> = {},
) {
  console.info(
    JSON.stringify({
      channel: 'auth_security',
      event,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  )
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null
  }

  return request.headers.get('x-real-ip')
}

const redactSensitiveValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        const normalizedKey = key.toLowerCase()
        if (
          normalizedKey.includes('password') ||
          normalizedKey.includes('token') ||
          normalizedKey.includes('secret') ||
          normalizedKey === 'code' ||
          normalizedKey.includes('backupcode') ||
          normalizedKey === 'key'
        ) {
          return [key, '[REDACTED]']
        }

        return [key, redactSensitiveValue(nestedValue)]
      }),
    )
  }

  return value
}

export async function persistAuthAuditLog(options: {
  body: AuthRequestBody
  request: Request
  response: Response
  session: AuthSessionSnapshot | null
}): Promise<void> {
  const path = new URL(options.request.url).pathname
  const action = AUTH_LOG_ACTIONS[path as keyof typeof AUTH_LOG_ACTIONS]

  if (!action) {
    return
  }

  const bodyOrganizationId =
    typeof options.body?.organizationId === 'string'
      ? options.body.organizationId
      : null
  const invitationId =
    typeof options.body?.invitationId === 'string'
      ? options.body.invitationId
      : null
  const memberIdOrEmail =
    typeof options.body?.memberIdOrEmail === 'string'
      ? options.body.memberIdOrEmail
      : null

  try {
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorUserId: options.session?.user?.id ?? null,
      actorRole: null,
      activeOrganizationId: bodyOrganizationId,
      targetOrganizationId: bodyOrganizationId,
      resourceType: 'auth',
      resourceId: invitationId ?? memberIdOrEmail,
      action,
      decision: options.response.ok ? 'allow' : 'deny',
      requestPath: path,
      requestMethod: options.request.method,
      ipAddress: getRequestIp(options.request),
      userAgent: options.request.headers.get('user-agent'),
      details: {
        body: redactSensitiveValue(options.body),
        statusCode: options.response.status,
      },
    })
  } catch (error) {
    console.error('Failed to persist auth audit log entry', error)
  }
}

export async function getAuthRequestBody(
  request: Request,
): Promise<AuthRequestBody> {
  const contentType = request.headers.get('content-type')

  if (!contentType?.includes('application/json')) {
    return null
  }

  try {
    const parsed = await request.clone().json()

    if (typeof parsed === 'object' && parsed && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return null
  }

  return null
}

async function consumeRateLimit(options: {
  limiter: RateLimiterMemory
  key: string
  message: string
  description: string
  event: string
  extra: Record<string, unknown>
}) {
  try {
    await options.limiter.consume(options.key)
  } catch {
    logAuthSecurity(options.event, options.extra)

    throw new ServerError({
      statusCode: 429,
      message: options.message,
      description: options.description,
    })
  }
}

function getEmailValue(body: AuthRequestBody) {
  const rawEmail = body?.email

  if (typeof rawEmail !== 'string') {
    return null
  }

  return rawEmail.toLowerCase().trim()
}

export async function enforceAuthRateLimit(
  request: Request,
  body: AuthRequestBody,
) {
  const path = new URL(request.url).pathname
  const ip = getRequestIp(request)

  if (AUTH_VERIFY_PATHS.has(path) && ip) {
    await consumeRateLimit({
      limiter: authVerifyIpLimiter,
      key: `verify:${path}:${ip}`,
      message: 'Too many authentication attempts',
      description: 'Please wait a few minutes before trying again.',
      event: 'auth_rate_limited',
      extra: { bucket: 'verify-ip', ip, path },
    })
  }

  if (!AUTH_SEND_PATHS.has(path)) {
    return
  }

  if (ip) {
    await consumeRateLimit({
      limiter: authSendIpLimiter,
      key: `send:${path}:${ip}`,
      message: 'Too many authentication messages requested',
      description: 'Please wait a few minutes before requesting another code.',
      event: 'auth_rate_limited',
      extra: { bucket: 'send-ip', ip, path },
    })
  }

  const email = getEmailValue(body)

  if (!email) {
    return
  }

  await consumeRateLimit({
    limiter: authSendEmailLimiter,
    key: `send:${path}:${email}`,
    message: 'Too many authentication messages requested',
    description: 'Please wait a few minutes before requesting another code.',
    event: 'auth_rate_limited',
    extra: { bucket: 'send-email', email, path },
  })
}

export function logTwoFactorRouteResult(options: {
  request: Request
  response: Response
  session: AuthSessionSnapshot | null
}) {
  const path = new URL(options.request.url).pathname

  const commonData = {
    ip: getRequestIp(options.request),
    path,
    statusCode: options.response.status,
    userId: options.session?.user?.id ?? null,
    email: options.session?.user?.email ?? null,
  }

  if (
    path === '/api/auth/two-factor/verify-totp' ||
    path === '/api/auth/two-factor/verify-otp' ||
    path === '/api/auth/two-factor/verify-backup-code'
  ) {
    if (options.response.ok) {
      if (
        path === '/api/auth/two-factor/verify-totp' &&
        options.session?.user &&
        !options.session.user.twoFactorEnabled
      ) {
        logAuthSecurity('two_factor_enabled', commonData)
        return
      }

      logAuthSecurity('two_factor_verification_succeeded', commonData)
      return
    }

    logAuthSecurity('two_factor_verification_failed', commonData)
    return
  }

  if (path === '/api/auth/two-factor/disable' && options.response.ok) {
    logAuthSecurity('two_factor_disabled', commonData)
    return
  }

  if (
    path === '/api/auth/two-factor/generate-backup-codes' &&
    options.response.ok
  ) {
    logAuthSecurity('backup_codes_regenerated', commonData)
  }
}
