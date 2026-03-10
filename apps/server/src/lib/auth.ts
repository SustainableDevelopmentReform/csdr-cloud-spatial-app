import { betterAuth, BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import {
  admin,
  anonymous,
  apiKey,
  openAPI,
  organization,
  twoFactor,
} from 'better-auth/plugins'
import { env } from '~/env'
import * as schema from '~/schemas/db'
import { db } from './db'

export type Plugins = [
  ReturnType<typeof admin>,
  ReturnType<typeof twoFactor>,
  ReturnType<typeof openAPI>,
  ReturnType<typeof anonymous>,
  ReturnType<typeof apiKey>,
  ReturnType<typeof organization>,
]

const plugins: Plugins = [
  admin(),
  twoFactor(),
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
  organization(),
]

const authConfig = {
  logger: {
    level: 'info',
    disabled: false,
    log: (level, message) => {
      console.log(level, message)
    },
  },
  baseURL: env.INTERNAL_BACKEND_URL,
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
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 90, // 90 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },
  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    requireEmailVerification: false,
    minPasswordLength: 8,
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

export const auth = betterAuth(authConfig) as ReturnType<
  typeof betterAuth<typeof authConfig>
>

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}
