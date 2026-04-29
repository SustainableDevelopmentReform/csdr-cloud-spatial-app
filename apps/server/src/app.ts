import { createRoute, z } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { APIError as BetterAuthApiError } from 'better-auth/api'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { sql } from 'drizzle-orm'
import { env } from './env'
import { auth, AuthType } from './lib/auth'
import { buildInfo } from './lib/build-info'
import { checkDatabaseConnection, db } from './lib/db'
import { ServerError } from './lib/error'
import { appLogger } from './lib/logger'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
} from './lib/openapi'
import { generateJsonResponse } from './lib/response'
import {
  enforceAuthRateLimit,
  enforceProtectedAuthRouteMfa,
  getAuthRequestBody,
  persistAuthAuditLog,
  logTwoFactorRouteResult,
  resolveAuthAuditLogContext,
} from './lib/auth-security'
import {
  ACTIVE_ORGANIZATION_HEADER,
  LEGACY_ACTIVE_ORGANIZATION_HEADER,
  loadRequestActor,
} from './lib/request-actor'
import { logger } from './middlewares/logger'
import { rateLimiter } from './middlewares/rate-limiter'
import dataset from './routes/dataset'
import datasetRun from './routes/datasetRun'
import geometries from './routes/geometries'
import geometriesRun from './routes/geometriesRun'
import geometryOutput from './routes/geometryOutput'
import product from './routes/product'
import productOutput from './routes/productOutput'
import productRun from './routes/productRun'
import indicator from './routes/indicator'
import indicatorCategory from './routes/indicatorCategory'
import report from './routes/report'
import dashboard from './routes/dashboard'
import logs from './routes/logs'
import organization from './routes/organization'

const isProduction = env.NODE_ENV === 'production'
const webUiHomeUrl = new URL('/console', env.APP_URL).toString()
const buildInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  commit: z.string().nullable(),
  buildTime: z.string().nullable(),
  image: z.string().nullable(),
  environment: z.enum(['development', 'production', 'test']),
})
const healthcheckSchema = z.object({
  message: z.string(),
  build: buildInfoSchema,
})
const readinessSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  checks: z.object({
    database: z.enum(['ok', 'failed']),
  }),
  build: buildInfoSchema,
})
const versionSchema = buildInfoSchema.extend({
  databaseMigrationCount: z.number().int(),
})
type ReadinessPayload = z.infer<typeof readinessSchema>
const optionalApiKeySecurity: Record<string, string[]>[] = [
  {},
  {
    ApiKeyAuth: [],
  },
]
const toContentfulStatusCode = (statusCode: number): ContentfulStatusCode => {
  switch (statusCode) {
    case 200:
      return 200
    case 201:
      return 201
    case 400:
      return 400
    case 401:
      return 401
    case 403:
      return 403
    case 404:
      return 404
    case 409:
      return 409
    case 422:
      return 422
    case 429:
      return 429
    case 500:
      return 500
    case 503:
      return 503
    default:
      return 500
  }
}
const apiKeyOrganizationDocs = [
  'Use `x-api-key` header to authenticate requests.',
  'API keys authenticate as the owning user and are not tied to a single organization.',
  `For users who belong to multiple organizations, set \`${ACTIVE_ORGANIZATION_HEADER}\` on each request to select the organization context.`,
  "If no organization header is sent, the server falls back to the persisted active organization on the auth session, then to the user's first membership.",
].join('\n\n')

const app = createOpenAPIApp<{ Variables: AuthType }>({
  strict: false,
})

app.use(compress())
app.use(logger())
app.use(
  cors({
    origin: env.TRUSTED_ORIGINS,
    allowHeaders: [
      'Content-Type',
      'Authorization',
      ACTIVE_ORGANIZATION_HEADER,
      LEGACY_ACTIVE_ORGANIZATION_HEADER,
      'x-organization-id',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
    exposeHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use('*', secureHeaders())
app.use('*', rateLimiter())

app.use('*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    c.set('user', null)
    c.set('session', null)
    c.set('activeMember', null)
    c.set('activeOrganizationId', null)
    c.set('requestActor', null)
    return next()
  }

  const actor = await loadRequestActor({
    headers: c.req.raw.headers,
    user: session.user,
    session: session.session,
  })

  c.set('user', session.user)
  c.set('session', session.session)
  c.set('activeMember', actor?.activeMember ?? null)
  c.set('activeOrganizationId', actor?.activeOrganizationId ?? null)
  c.set('requestActor', actor)

  return next()
})

// Handle auth routes
app.on(['POST', 'GET'], '/api/auth/*', async (c) => {
  const body = await getAuthRequestBody(c.req.raw)
  const actor = c.get('requestActor')
  const user = c.get('user')
  const logContext = await resolveAuthAuditLogContext({
    actor,
    body,
    request: c.req.raw,
  })

  try {
    await enforceAuthRateLimit(c.req.raw, body)
    enforceProtectedAuthRouteMfa({
      actor,
      request: c.req.raw,
    })

    const response = await auth.handler(c.req.raw)

    logTwoFactorRouteResult({
      request: c.req.raw,
      response,
      session: user ? { user } : null,
    })

    await persistAuthAuditLog({
      actor,
      request: c.req.raw,
      body,
      statusCode: response.status,
      logContext,
    })

    return response
  } catch (error) {
    if (error instanceof ServerError) {
      await persistAuthAuditLog({
        actor,
        request: c.req.raw,
        body,
        statusCode: error.response.statusCode,
        logContext,
      })
    }

    if (error instanceof BetterAuthApiError) {
      await persistAuthAuditLog({
        actor,
        request: c.req.raw,
        body,
        statusCode: error.statusCode,
        logContext,
      })
    }

    throw error
  }
})

const v0ApiBase = app
  .basePath('/api/v0/')
  // .route('/file', file)
  .route('/dataset', dataset)
  .route('/dataset-run', datasetRun)
  .route('/geometries', geometries)
  .route('/geometries-run', geometriesRun)
  .route('/geometry-output', geometryOutput)
  .route('/product', product)
  .route('/product-run', productRun)
  .route('/product-output', productOutput)
  .route('/indicator', indicator)
  .route('/indicator-category', indicatorCategory)
  .route('/organization', organization)
  .route('/report', report)
  .route('/dashboard', dashboard)
  .route('/logs', logs)

v0ApiBase.openAPIRegistry.registerComponent('securitySchemes', 'ApiKeyAuth', {
  type: 'apiKey',
  in: 'header',
  name: 'x-api-key',
  description: apiKeyOrganizationDocs,
})

// TODO: add better auth responses here (eg 429 rate limit)

const v0ApiRoutes = v0ApiBase
  .openapi(
    createRoute({
      method: 'get',
      path: '/healthcheck',
      responses: {
        200: {
          description: 'Service healthcheck.',
          content: {
            'application/json': {
              schema: createResponseSchema(healthcheckSchema),
            },
          },
        },
        500: jsonErrorResponse('Healthcheck failed'),
      },
    }),
    (c) =>
      generateJsonResponse(
        c,
        {
          message: 'OK',
          build: buildInfo,
        },
        200,
      ),
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/readiness',
      responses: {
        200: {
          description: 'Service is ready to receive traffic.',
          content: {
            'application/json': {
              schema: createResponseSchema(readinessSchema),
            },
          },
        },
        503: {
          description: 'Service is not ready to receive traffic.',
          content: {
            'application/json': {
              schema: createResponseSchema(readinessSchema),
            },
          },
        },
      },
    }),
    async (c) => {
      try {
        await checkDatabaseConnection()
        const payload: ReadinessPayload = {
          status: 'ready',
          checks: {
            database: 'ok',
          },
          build: buildInfo,
        }

        return generateJsonResponse(c, payload, 200)
      } catch (error) {
        appLogger.error('readiness_check_failed', {
          requestId: c.get('requestId'),
          error,
        })
        const payload: ReadinessPayload = {
          status: 'not_ready',
          checks: {
            database: 'failed',
          },
          build: buildInfo,
        }

        return generateJsonResponse(c, payload, 503, 'Service Unavailable')
      }
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/version',
      responses: {
        200: {
          description: 'Application build and schema version metadata.',
          content: {
            'application/json': {
              schema: createResponseSchema(versionSchema),
            },
          },
        },
        500: jsonErrorResponse('Version metadata failed'),
      },
    }),
    async (c) => {
      const migrationCountResult = await db.execute(
        sql`SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations`,
      )
      const row = migrationCountResult.rows[0]
      const databaseMigrationCount =
        typeof row?.count === 'number' ? row.count : 0

      return generateJsonResponse(
        c,
        {
          ...buildInfo,
          databaseMigrationCount,
        },
        200,
      )
    },
  )
  .doc('/doc', (c) => ({
    openapi: '3.0.0',
    externalDocs: {
      url: '/api/auth/scalar',
      description: 'Auth API Documentation',
    },
    info: {
      version: buildInfo.version,
      title: 'Spatial Data Framework API',
      description:
        `This is the API for the Spatial Data Framework. Current version is ${buildInfo.version}.\n\n## API keys and organization context\n\n` +
        apiKeyOrganizationDocs,
    },
    servers: [
      {
        url: (() => {
          const proto = c.req.header('x-forwarded-proto')
          const host = c.req.header('x-forwarded-host') ?? c.req.header('host')
          if (proto && host) return `${proto}://${host}`
          return new URL(c.req.url).origin
        })(),
        description: 'Current environment',
      },
    ],
    // Include an empty requirement so ApiKey authentication stays optional.
    security: optionalApiKeySecurity,
  }))
  .get('/scalar', Scalar({ url: '/api/v0/doc' }))

app.onError(async (err, c) => {
  appLogger.error('request_error', {
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    error: err,
  })

  if (err instanceof ServerError) {
    return c.json(err.response, toContentfulStatusCode(err.response.statusCode))
  }

  if (err instanceof BetterAuthApiError) {
    return c.json(
      { ...err.body, statusCode: err.statusCode },
      toContentfulStatusCode(err.statusCode),
    )
  }

  if (err instanceof Error) {
    return generateJsonResponse(
      c,
      isProduction
        ? null
        : {
            cause: err.cause,
            stack: err.stack,
          },
      500,
      'Internal Server Error',
    )
  }

  return generateJsonResponse(
    c,
    isProduction ? null : err,
    500,
    'Internal Server Error',
  )
})

app.notFound((c) =>
  generateJsonResponse(
    c,
    null,
    404,
    `Endpoint you're looking for is not found: ${c.req.url}. See API docs at ${new URL('/api/v0/scalar', c.req.url).toString()} or return to the web UI home at ${webUiHomeUrl}.`,
  ),
)

export const apiRoutes = v0ApiRoutes
export type ApiRoutesType = typeof apiRoutes
export default app
