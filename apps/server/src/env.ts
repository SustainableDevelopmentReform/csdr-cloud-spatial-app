import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  shared: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  },
  server: {
    APP_URL: z.url().default('http://localhost:3000'),
    INTERNAL_BACKEND_URL: z.url().optional(),
    DATABASE_HOST: z.string().default('localhost'),
    DATABASE_PORT: z.coerce.number().default(5431),
    DATABASE_USER: z.string().default('admin'),
    DATABASE_PASSWORD: z.string().default('admin'),
    DATABASE_NAME: z.string().default('csdr-dev'),
    TRUSTED_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((val) => val.split(',')),
    DEV_USE_INTERNAL_BACKEND_URL_IN_FRONTEND: z.coerce.boolean().default(false),
    PORT: z.coerce.number().default(4000),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_USERNAME: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    EMAIL_SENDER: z.string().optional(),
    EMAIL_CATCHER: z.string().email().optional(),
    S3_BUCKET_NAME: z.string().optional(),
    S3_SPACES_ENDPOINT: z.string().optional(),
    S3_SPACES_SECRET_KEY: z.string().optional(),
    S3_SPACES_ACCESS_KEY_ID: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().optional(),
    AUTH_REQUIRE_EMAIL_VERIFICATION: z.coerce.boolean().default(false),
  },
  runtimeEnv: {
    APP_URL: process.env.APP_URL,
    TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS,
    INTERNAL_BACKEND_URL: process.env.INTERNAL_BACKEND_URL,
    DEV_USE_INTERNAL_BACKEND_URL_IN_FRONTEND:
      process.env.DEV_USE_INTERNAL_BACKEND_URL_IN_FRONTEND,
    PORT: process.env.PORT,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_USERNAME: process.env.SMTP_USERNAME,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    EMAIL_SENDER: process.env.EMAIL_SENDER,
    EMAIL_CATCHER: process.env.EMAIL_CATCHER,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    S3_SPACES_ENDPOINT: process.env.S3_SPACES_ENDPOINT,
    S3_SPACES_SECRET_KEY: process.env.S3_SPACES_SECRET_KEY,
    S3_SPACES_ACCESS_KEY_ID: process.env.S3_SPACES_ACCESS_KEY_ID,
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    AUTH_REQUIRE_EMAIL_VERIFICATION:
      process.env.AUTH_REQUIRE_EMAIL_VERIFICATION,
  },
})
