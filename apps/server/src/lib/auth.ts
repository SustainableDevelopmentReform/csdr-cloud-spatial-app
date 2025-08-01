import { betterAuth, BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
// import { env } from '~/env'
import * as schema from '~/schemas'
import {
  admin,
  twoFactor,
  openAPI,
  organization,
  anonymous,
} from 'better-auth/plugins'
// import { oidcProvider } from 'better-auth/plugins'

const authConfig = {
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  plugins: [admin(), twoFactor(), openAPI(), organization(), anonymous()],
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
    requireEmailVerification: true,
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
