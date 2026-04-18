import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

const defaultAnonymousPublicAccess =
  process.env.NODE_ENV === 'production' ? 'false' : 'true'

export const env = createEnv({
  shared: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  },
  server: {
    APP_URL: z.url().default('http://localhost:3000'),
    INTERNAL_BACKEND_URL: z.url().optional(),
    INTERNAL_FRONTEND_URL: z.url().optional(),
    MAP_STYLE_URL: z.url().optional(),
    ACCESS_CONTROL_ALLOW_ANONYMOUS_PUBLIC: z
      .string()
      .optional()
      .default(defaultAnonymousPublicAccess)
      .transform((val) => val === 'true'),
    DEV_USE_INTERNAL_BACKEND_URL_IN_FRONTEND: z
      .string()
      .optional()
      .default('false')
      .transform((val) => val === 'true'),
  },
  runtimeEnv: {
    APP_URL: process.env.APP_URL,
    INTERNAL_BACKEND_URL: process.env.INTERNAL_BACKEND_URL,
    INTERNAL_FRONTEND_URL: process.env.INTERNAL_FRONTEND_URL,
    MAP_STYLE_URL: process.env.MAP_STYLE_URL,
    ACCESS_CONTROL_ALLOW_ANONYMOUS_PUBLIC:
      process.env.ACCESS_CONTROL_ALLOW_ANONYMOUS_PUBLIC,
    NODE_ENV: process.env.NODE_ENV,
    DEV_USE_INTERNAL_BACKEND_URL_IN_FRONTEND:
      process.env.DEV_USE_INTERNAL_BACKEND_URL_IN_FRONTEND,
  },
})

export function getApiBaseUrl() {
  return env.DEV_USE_INTERNAL_BACKEND_URL_IN_FRONTEND &&
    env.INTERNAL_BACKEND_URL
    ? env.INTERNAL_BACKEND_URL
    : env.APP_URL
}
