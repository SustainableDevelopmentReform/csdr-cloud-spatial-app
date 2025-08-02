import { createAuthClient as createReactAuthClient } from 'better-auth/react'
import {
  anonymousClient,
  adminClient,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins'
import { cookies, headers } from 'next/headers'

const authConfig = {
  baseURL: 'http://localhost:4000',
  basePath: '/api/v1/auth',
  fetchOptions: {
    throw: true,
  },
  plugins: [
    anonymousClient(),
    adminClient(),
    organizationClient(),
    twoFactorClient(),
  ],
}

/** Better auth client to use in React/client components */
export const authClient = createReactAuthClient(authConfig)

export interface Permission {
  key: string
}

export function somePermissions(permissions: string[]) {
  return true
  // return (p: Permission[]) => {
  //   const onlyKeys = p.map((p) => p.key)
  //   return permissions.some((permission) => onlyKeys.includes(permission))
  // }
}

export function everyPermissions(permissions: string[]) {
  return true
  // return (p: Permission[]) => {
  //   const onlyKeys = p.map((p) => p.key)
  //   return permissions.every((permission) => onlyKeys.includes(permission))
  // }
}
