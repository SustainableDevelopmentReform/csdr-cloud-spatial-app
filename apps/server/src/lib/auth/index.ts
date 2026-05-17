import { betterAuth } from 'better-auth'
import * as schema from '~/schemas/db'
import { authConfig } from './better-auth-config'
import type { RequestActor } from './request-actor'

export const auth = betterAuth(authConfig)

export type AppSessionUser = typeof auth.$Infer.Session.user
export type AppSession = typeof auth.$Infer.Session.session
export type AppMember = typeof schema.member.$inferSelect

export type AuthType = {
  user: AppSessionUser | null
  session: AppSession | null
  activeMember: AppMember | null
  activeOrganizationId: string | null
  accessLogDetails?: Record<string, unknown>
  requestActor: RequestActor | null
  requestId: string
}
