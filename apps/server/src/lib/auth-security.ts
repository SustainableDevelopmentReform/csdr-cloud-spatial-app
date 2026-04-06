import { eq } from 'drizzle-orm'
import { organization, invitation } from '~/schemas/db'
import { getRequestIp, persistAccessLog } from './access-log'
import { db } from './db'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { ServerError } from './error'
import {
  type RequestActor,
  requireAuthenticatedActor,
  requireMfaIfNeeded,
} from './request-actor'

export type AuthRequestBody = Record<string, unknown> | null

export interface AuthSessionSnapshot {
  user: {
    id: string
    email: string
    twoFactorEnabled?: boolean | null
  } | null
}

export type AuthAuditLogContext = {
  action: string | null
  resourceId: string | null
  targetOrganizationId: string | null
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

const MFA_PROTECTED_ORGANIZATION_PATHS = new Set([
  '/api/auth/organization/set-active',
  '/api/auth/organization/invite-member',
  '/api/auth/organization/remove-member',
  '/api/auth/organization/update-member-role',
])

const AUTH_ORGANIZATION_TARGET_PATHS = new Set([
  '/api/auth/organization/set-active',
  '/api/auth/organization/invite-member',
  '/api/auth/organization/remove-member',
  '/api/auth/organization/update-member-role',
])

const AUTH_ADMIN_PATH_PREFIX = '/api/auth/admin/'

const AUTH_LOG_ACTIONS = new Map<string, string>([
  ['/api/auth/sign-in/email', 'sign_in'],
  ['/api/auth/sign-out', 'sign_out'],
  ['/api/auth/two-factor/enable', 'two_factor_enable'],
  ['/api/auth/two-factor/disable', 'two_factor_disable'],
  ['/api/auth/two-factor/verify-totp', 'two_factor_verify'],
  ['/api/auth/two-factor/verify-otp', 'two_factor_verify'],
  ['/api/auth/two-factor/verify-backup-code', 'two_factor_verify'],
  ['/api/auth/two-factor/send-otp', 'two_factor_send_otp'],
  ['/api/auth/two-factor/generate-backup-codes', 'backup_codes_regenerate'],
  ['/api/auth/api-key/create', 'api_key_create'],
  ['/api/auth/api-key/delete', 'api_key_delete'],
  ['/api/auth/organization/set-active', 'set_active_organization'],
  ['/api/auth/organization/invite-member', 'invite_member'],
  ['/api/auth/organization/accept-invitation', 'accept_invitation'],
  ['/api/auth/organization/remove-member', 'remove_member'],
  ['/api/auth/organization/update-member-role', 'update_member_role'],
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getStringValue = (body: AuthRequestBody, key: string): string | null => {
  const value = body?.[key]

  return typeof value === 'string' ? value : null
}

const resolveExistingOrganizationId = async (
  organizationId: string | null,
): Promise<string | null> => {
  if (!organizationId) {
    return null
  }

  const currentOrganization = await db.query.organization.findFirst({
    columns: {
      id: true,
    },
    where: (table, { eq }) => eq(table.id, organizationId),
  })

  return currentOrganization?.id ?? null
}

const resolveInvitationOrganizationId = async (
  invitationId: string | null,
): Promise<string | null> => {
  if (!invitationId) {
    return null
  }

  const currentInvitation = await db.query.invitation.findFirst({
    columns: {
      organizationId: true,
    },
    where: (table, { eq }) => eq(table.id, invitationId),
  })

  return currentInvitation?.organizationId ?? null
}

const redactSensitiveValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValue)
  }

  if (isRecord(value)) {
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

const resolveAuthTargetOrganizationId = async (options: {
  actor: RequestActor | null
  body: AuthRequestBody
  path: string
}): Promise<string | null> => {
  if (options.path === '/api/auth/organization/accept-invitation') {
    return resolveInvitationOrganizationId(
      getStringValue(options.body, 'invitationId'),
    )
  }

  if (AUTH_ORGANIZATION_TARGET_PATHS.has(options.path)) {
    const organizationId = await resolveExistingOrganizationId(
      getStringValue(options.body, 'organizationId'),
    )

    return organizationId ?? options.actor?.activeOrganizationId ?? null
  }

  return null
}

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

export const enforceProtectedAuthRouteMfa = (options: {
  actor: RequestActor | null
  request: Request
}): void => {
  const path = new URL(options.request.url).pathname

  if (MFA_PROTECTED_ORGANIZATION_PATHS.has(path)) {
    requireMfaIfNeeded(requireAuthenticatedActor(options.actor))
    return
  }

  if (!path.startsWith(AUTH_ADMIN_PATH_PREFIX)) {
    return
  }

  const actor = requireAuthenticatedActor(options.actor)

  if (!actor.isSuperAdmin) {
    return
  }

  requireMfaIfNeeded(actor)
}

export const resolveAuthAuditLogContext = async (options: {
  actor: RequestActor | null
  body: AuthRequestBody
  request: Request
}): Promise<AuthAuditLogContext> => {
  const path = new URL(options.request.url).pathname
  const action = AUTH_LOG_ACTIONS.get(path) ?? null

  if (!action) {
    return {
      action: null,
      resourceId: null,
      targetOrganizationId: null,
    }
  }

  const invitationId = getStringValue(options.body, 'invitationId')
  const memberIdOrEmail = getStringValue(options.body, 'memberIdOrEmail')

  return {
    action,
    resourceId: invitationId ?? memberIdOrEmail,
    targetOrganizationId: await resolveAuthTargetOrganizationId({
      actor: options.actor,
      body: options.body,
      path,
    }),
  }
}

export async function persistAuthAuditLog(options: {
  actor: RequestActor | null
  body: AuthRequestBody
  request: Request
  statusCode: number
  logContext?: AuthAuditLogContext | null
}): Promise<void> {
  const logContext =
    options.logContext ??
    (await resolveAuthAuditLogContext({
      actor: options.actor,
      body: options.body,
      request: options.request,
    }))

  if (!logContext.action) {
    return
  }

  await persistAccessLog({
    actor: options.actor,
    action: logContext.action,
    decision:
      options.statusCode >= 200 && options.statusCode < 400 ? 'allow' : 'deny',
    destination: 'audit',
    request: options.request,
    resourceType: 'auth',
    resourceId: logContext.resourceId,
    statusCode: options.statusCode,
    targetOrganizationId: logContext.targetOrganizationId,
    details: {
      body: redactSensitiveValue(options.body),
    },
  })
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

    if (isRecord(parsed)) {
      return parsed
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
