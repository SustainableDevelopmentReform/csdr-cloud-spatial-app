import { apiKey } from '@better-auth/api-key'
import { betterAuth, BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { and, eq, isNull } from 'drizzle-orm'
import {
  admin,
  anonymous,
  openAPI,
  organization,
  testUtils,
  twoFactor,
} from 'better-auth/plugins'
import { env } from '~/env'
import * as schema from '~/schemas/db'
import {
  appAdminRoles,
  appOrganizationAccessControl,
  appOrganizationRoles,
  getHighestOrganizationRole,
  parseOrganizationRoles,
} from './access-control'
import {
  sendOrganizationInvitationEmail,
  sendResetPasswordEmail,
  sendTwoFactorOTPEmail,
  sendVerificationEmail,
} from './auth-email'
import { logAuthSecurity } from './auth-security'
import { db } from './db'
import type { RequestActor } from './request-actor'

const createPersonalOrganizationName = (name: string | null | undefined) => {
  const trimmedName = name?.trim()

  if (!trimmedName) {
    return 'Personal Workspace'
  }

  return `${trimmedName}'s Workspace`
}

const createOrganizationSlug = (name: string, userId: string) => {
  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const normalizedBase = slugBase.length > 0 ? slugBase : 'workspace'

  return `${normalizedBase}-${userId.slice(0, 8)}`
}

const listOrganizationAdmins = async (organizationId: string) =>
  db.query.member.findMany({
    columns: {
      id: true,
      role: true,
      userId: true,
    },
    where: (member, { eq }) => eq(member.organizationId, organizationId),
  })

const ensureOrgAdminFloor = async (options: {
  organizationId: string
  memberId: string
  nextRole: string | null
}) => {
  const allMembers = await listOrganizationAdmins(options.organizationId)
  const currentMember = allMembers.find(
    (member) => member.id === options.memberId,
  )

  if (!currentMember) {
    throw APIError.fromStatus('BAD_REQUEST', {
      message: 'Member not found.',
    })
  }

  const currentHighestRole = getHighestOrganizationRole(currentMember.role)

  if (currentHighestRole !== 'org_admin') {
    return
  }

  const nextHighestRole =
    options.nextRole === null
      ? null
      : getHighestOrganizationRole(options.nextRole)

  if (nextHighestRole === 'org_admin') {
    return
  }

  const adminCount = allMembers.filter(
    (member) => getHighestOrganizationRole(member.role) === 'org_admin',
  ).length

  if (adminCount <= 1) {
    throw APIError.fromStatus('BAD_REQUEST', {
      message:
        'An organization must keep at least one org admin. Promote another org admin before removing or demoting this member.',
    })
  }
}

const plugins = [
  admin({
    adminRoles: ['super_admin'],
    defaultRole: 'user',
    roles: appAdminRoles,
  }),
  twoFactor({
    issuer: 'Spatial Data Framework',
    otpOptions: {
      sendOTP: async ({ user, otp }) => {
        // Better-auth recommends not awaiting the email sending to avoid timing attacks
        void sendTwoFactorOTPEmail({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          otp,
        })
      },
      storeOTP: 'encrypted',
    },
    backupCodeOptions: {
      storeBackupCodes: 'encrypted',
    },
  }),
  openAPI({ path: '/scalar' }),
  anonymous(),
  apiKey({
    rateLimit: {
      enabled: true,
      // 10000 requests per hour
      timeWindow: 1000 * 60 * 60,
      maxRequests: 10000,
    },
    enableSessionForAPIKeys: true,
  }),
  organization({
    allowUserToCreateOrganization: false,
    creatorRole: 'org_creator',
    ac: appOrganizationAccessControl,
    roles: appOrganizationRoles,
    sendInvitationEmail: async (data) => {
      const acceptUrl = new URL(`/accept-invitation/${data.id}`, env.APP_URL)

      await sendOrganizationInvitationEmail({
        acceptUrl: acceptUrl.toString(),
        email: data.email,
        invitationId: data.id,
        inviterEmail: data.inviter.user.email,
        inviterName: data.inviter.user.name,
        organizationName: data.organization.name,
        role: Array.isArray(data.role) ? data.role.join(', ') : data.role,
      })
    },
    organizationHooks: {
      beforeAddMember: async ({ member }) => {
        const firstRole = parseOrganizationRoles(member.role)[0] ?? 'org_viewer'

        return {
          data: {
            ...member,
            role: firstRole,
          },
        }
      },
      beforeCreateInvitation: async ({ invitation }) => ({
        data: {
          ...invitation,
          role: invitation.role ?? 'org_viewer',
        },
      }),
      beforeRemoveMember: async ({ member, organization }) => {
        await ensureOrgAdminFloor({
          organizationId: organization.id,
          memberId: member.id,
          nextRole: null,
        })
      },
      beforeUpdateMemberRole: async ({ member, newRole, organization }) => {
        await ensureOrgAdminFloor({
          organizationId: organization.id,
          memberId: member.id,
          nextRole: newRole,
        })
      },
    },
  }),
  ...(env.NODE_ENV === 'production' ? [] : [testUtils()]),
]

const authBaseUrl = env.AUTH_BASE_URL ?? env.INTERNAL_BACKEND_URL ?? env.APP_URL

function logAuthMessage(level: string, message: string): void {
  switch (level) {
    case 'error':
      console.error(message)
      return
    case 'warn':
      console.warn(message)
      return
    default:
      console.info(message)
  }
}

const authConfig = {
  logger: {
    level: 'info',
    disabled: false,
    log: (level, message) => {
      logAuthMessage(level, message)
    },
  },
  appName: 'Spatial Data Framework',
  secret: env.BETTER_AUTH_SECRET,
  baseURL: authBaseUrl,
  trustedOrigins: env.TRUSTED_ORIGINS,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  plugins: plugins,
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 90, // 90 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      // Better-auth recommends not awaiting the email sending to avoid timing attacks
      void sendResetPasswordEmail({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        url,
        token,
      })
    },
    onPasswordReset: async ({ user }) => {
      logAuthSecurity('password_reset_completed', {
        userId: user.id,
        email: user.email,
      })
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }) => {
      // Better-auth recommends not awaiting the email sending to avoid timing attacks
      void sendVerificationEmail({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        url,
        token,
      })
    },
    sendOnSignUp: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    sendOnSignIn: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    expiresIn: 60 * 60 * 24,
    autoSignInAfterVerification: false,
    afterEmailVerification: async (user) => {
      logAuthSecurity('email_verified', {
        userId: user.id,
        email: user.email,
      })
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const existingPersonalMember = await db.query.member.findFirst({
            columns: {
              id: true,
            },
            where: (member, { eq }) => eq(member.userId, createdUser.id),
          })

          if (existingPersonalMember) {
            return
          }

          const organizationName = createPersonalOrganizationName(
            createdUser.name,
          )
          const organizationId = crypto.randomUUID()
          const now = new Date()

          await db.insert(schema.organization).values({
            id: organizationId,
            name: organizationName,
            slug: createOrganizationSlug(organizationName, createdUser.id),
            logo: null,
            createdAt: now,
            metadata: JSON.stringify({
              kind: 'personal_workspace',
            }),
          })

          await db.insert(schema.member).values({
            id: crypto.randomUUID(),
            organizationId,
            userId: createdUser.id,
            role: 'org_creator',
            createdAt: now,
          })

          await db
            .update(schema.session)
            .set({
              activeOrganizationId: organizationId,
            })
            .where(
              and(
                eq(schema.session.userId, createdUser.id),
                isNull(schema.session.activeOrganizationId),
              ),
            )
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const firstMembership = await db.query.member.findFirst({
            columns: {
              organizationId: true,
            },
            where: (member, { eq }) => eq(member.userId, session.userId),
            orderBy: (member, { asc }) => asc(member.createdAt),
          })

          return {
            data: {
              ...session,
              activeOrganizationId:
                session.activeOrganizationId ??
                firstMembership?.organizationId ??
                null,
            },
          }
        },
      },
    },
  },
  // socialProviders: {
  //   google: {
  //     clientId: env.GOOGLE_CLIENT_ID,
  //     clientSecret: env.GOOGLE_CLIENT_SECRET,
  //     redirectUri: env.GOOGLE_REDIRECT_URI,
  //   },
  // },
  advanced: {
    // cookiePrefix: 'csdr-dev',
    useSecureCookies: true,
  },
} satisfies BetterAuthOptions

export const auth = betterAuth(authConfig)

export type AppSessionUser = typeof auth.$Infer.Session.user
export type AppSession = typeof auth.$Infer.Session.session
export type AppMember = typeof schema.member.$inferSelect

export type AuthType = {
  user: AppSessionUser | null
  session: AppSession | null
  activeMember: AppMember | null
  activeOrganizationId: string | null
  requestActor: RequestActor | null
}
