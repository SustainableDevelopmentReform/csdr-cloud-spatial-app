import { InferSessionFromClient, InferUserFromClient } from 'better-auth'
import {
  adminClient,
  anonymousClient,
  twoFactorClient,
  apiKeyClient,
} from 'better-auth/client/plugins'
import { createAuthClient as createReactAuthClient } from 'better-auth/react'

const authConfig = {
  plugins: [
    adminClient(),
    twoFactorClient(),
    anonymousClient(),
    apiKeyClient(),
    // Note there are issues with typing with organization plugin (we don't need it yet)
    // organization(),
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
