import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RequestActor } from '../request-actor'

const isServerErrorLike = (
  value: unknown,
): value is {
  message: string
  response: {
    statusCode: number
    description: string | null
    message: string
  }
} => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string' &&
    'response' in value &&
    typeof value.response === 'object' &&
    value.response !== null &&
    'statusCode' in value.response &&
    typeof value.response.statusCode === 'number' &&
    'description' in value.response &&
    'message' in value.response &&
    typeof value.response.message === 'string'
  )
}

const createRequestActor = (): RequestActor => {
  const user = {
    id: 'user-1',
    name: 'Org Admin',
    email: 'org-admin@example.com',
    emailVerified: true,
    image: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    role: 'user',
    banned: false,
    banReason: null,
    banExpires: null,
    twoFactorEnabled: false,
    isAnonymous: false,
  }
  const session = {
    id: 'session-1',
    expiresAt: new Date('2025-01-02T00:00:00.000Z'),
    token: 'session-token',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
    userId: user.id,
    impersonatedBy: null,
    activeOrganizationId: 'org-1',
  }
  const membership = {
    id: 'member-1',
    organizationId: 'org-1',
    userId: user.id,
    role: 'org_admin',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  }

  return {
    user,
    session,
    memberships: [membership],
    activeMember: membership,
    activeOrganizationId: 'org-1',
    organizationRole: 'org_admin',
    isSuperAdmin: false,
    twoFactorEnabled: false,
  }
}

describe('requireMfaIfNeeded', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('still enforces MFA in development when the bypass flag is disabled', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ACCESS_CONTROL_ALLOW_INSECURE_DEV_MFA_BYPASS', 'false')

    const { requireMfaIfNeeded } = await import('../request-actor')

    try {
      requireMfaIfNeeded(createRequestActor())
      throw new Error('Expected requireMfaIfNeeded to throw')
    } catch (error) {
      if (!isServerErrorLike(error)) {
        throw error
      }

      expect(error.response.statusCode).toBe(403)
      expect(error.message).toBe('Two-factor authentication is required')
      expect(error.response.description).toBe(
        'Enable two-factor authentication before performing this action.',
      )
    }
  })

  it('warns and skips MFA enforcement only when the development bypass flag is enabled', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ACCESS_CONTROL_ALLOW_INSECURE_DEV_MFA_BYPASS', 'true')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { requireMfaIfNeeded } = await import('../request-actor')

    expect(() => requireMfaIfNeeded(createRequestActor())).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(
      'MFA requirement bypassed in development mode for user user-1 with global role user, organization role org_admin, and active organization org-1.',
    )
  })

  it('still enforces MFA outside development', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('ACCESS_CONTROL_ALLOW_INSECURE_DEV_MFA_BYPASS', 'false')

    const { requireMfaIfNeeded } = await import('../request-actor')

    try {
      requireMfaIfNeeded(createRequestActor())
      throw new Error('Expected requireMfaIfNeeded to throw')
    } catch (error) {
      if (!isServerErrorLike(error)) {
        throw error
      }

      expect(error.response.statusCode).toBe(403)
      expect(error.message).toBe('Two-factor authentication is required')
      expect(error.response.description).toBe(
        'Enable two-factor authentication before performing this action.',
      )
    }
  })
})
