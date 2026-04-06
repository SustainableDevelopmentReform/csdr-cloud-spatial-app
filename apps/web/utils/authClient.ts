import { apiKeyClient } from '@better-auth/api-key/client'
import { InferSessionFromClient, InferUserFromClient } from 'better-auth'
import { createAccessControl } from 'better-auth/plugins/access'
import {
  adminClient,
  anonymousClient,
  twoFactorClient,
  organizationClient,
} from 'better-auth/client/plugins'
import { createAuthClient as createReactAuthClient } from 'better-auth/react'

const appOrganizationStatements = {
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
} as const

const appOrganizationAccessControl = createAccessControl(
  appOrganizationStatements,
)

const createEmptyOrganizationRole = () =>
  appOrganizationAccessControl.newRole({
    organization: [],
    member: [],
    invitation: [],
  })

const appOrganizationRoles = {
  org_viewer: createEmptyOrganizationRole(),
  org_creator: createEmptyOrganizationRole(),
  org_admin: appOrganizationAccessControl.newRole({
    organization: ['update'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
  }),
}

const authConfig = {
  plugins: [
    adminClient(),
    twoFactorClient(),
    anonymousClient(),
    apiKeyClient(),
    organizationClient({
      ac: appOrganizationAccessControl,
      roles: appOrganizationRoles,
    }),
  ],
}

export const createAuthClient = (baseURL: string) => {
  /** Better auth client to use in React/client components */
  return createReactAuthClient({
    ...authConfig,
    baseURL,
  })
}

export type AuthClient = ReturnType<
  typeof createReactAuthClient<typeof authConfig>
>

export type User = InferUserFromClient<typeof authConfig>
export type Session = InferSessionFromClient<typeof authConfig>

export function somePermissions(permissions: string[]) {
  void permissions
  return true
}

export function everyPermissions(permissions: string[]) {
  void permissions
  return true
}
