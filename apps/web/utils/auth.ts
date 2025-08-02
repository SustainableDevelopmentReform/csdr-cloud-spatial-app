import { InferSessionFromClient, InferUserFromClient } from 'better-auth'
import {
  adminClient,
  anonymousClient,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins'
import { createAuthClient as createReactAuthClient } from 'better-auth/react'

const authConfig = {
  baseURL: 'http://localhost:4000',
  plugins: [
    adminClient(),
    twoFactorClient(),
    anonymousClient(),
    organizationClient(),
  ],
}

/** Better auth client to use in React/client components */
export const authClient = createReactAuthClient(authConfig)

export type User = InferUserFromClient<typeof authConfig>
export type Session = InferSessionFromClient<typeof authConfig>

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
