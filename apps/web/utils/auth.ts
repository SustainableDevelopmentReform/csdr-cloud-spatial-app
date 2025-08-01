import { createAuthClient } from 'better-auth/react'
import {
  anonymousClient,
  adminClient,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    anonymousClient(),
    adminClient(),
    organizationClient(),
    twoFactorClient(),
  ],
})

export interface Permission {
  key: string
}

export function somePermissions(permissions: string[]) {
  return (p: Permission[]) => {
    const onlyKeys = p.map((p) => p.key)
    return permissions.some((permission) => onlyKeys.includes(permission))
  }
}

export function everyPermissions(permissions: string[]) {
  return (p: Permission[]) => {
    const onlyKeys = p.map((p) => p.key)
    return permissions.every((permission) => onlyKeys.includes(permission))
  }
}
