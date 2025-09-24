import { createRoute } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { env } from './env'
import { auth, AuthType } from './lib/auth'
import { ServerError } from './lib/error'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  z,
} from './lib/openapi'
import { generateJsonResponse } from './lib/response'
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
import variable from './routes/variable'
import variableCategory from './routes/variableCategory'

const isProduction = env.NODE_ENV === 'production'

const app = createOpenAPIApp<{ Variables: AuthType }>({
  strict: false,
})

app.use(compress())
app.use(logger())
app.use(
  cors({
    origin: ['http://localhost:3000'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
    return next()
  }

  c.set('user', session.user)
  c.set('session', session.session)

  return next()
})

// Handle auth routes
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

const v1ApiRoutes = app
  .basePath('/api/v1/')
  // .route('/file', file)
  .route('/dataset', dataset)
  .route('/dataset-run', datasetRun)
  .route('/geometries', geometries)
  .route('/geometries-run', geometriesRun)
  .route('/geometry-output', geometryOutput)
  .route('/product', product)
  .route('/product-run', productRun)
  .route('/product-output', productOutput)
  .route('/variable', variable)
  .route('/variable-category', variableCategory)

v1ApiRoutes.openAPIRegistry.registerComponent('securitySchemes', 'ApiKeyAuth', {
  type: 'apiKey',
  in: 'header',
  name: 'x-api-key',
})

v1ApiRoutes
  .doc('/doc', (c) => ({
    openapi: '3.0.0',
    externalDocs: {
      url: '/api/auth/scalar',
      description: 'Auth API Documentation',
    },
    info: {
      version: '1.0.0',
      title: 'CSDR Cloud Spatial API',
    },
    servers: [
      {
        url: new URL(c.req.url).origin,
        description: 'Current environment',
      },
    ],
    security: [
      // We need to include an empty object to make ApiKey authentication optional in the spec
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      {
        ApiKeyAuth: [],
      },
    ],
  }))
  .get('/scalar', Scalar({ url: '/api/v1/doc' }))

app.openapi(
  createRoute({
    method: 'get',
    path: '/api/v1/healthcheck',
    responses: {
      200: {
        description: 'Service healthcheck.',
        content: {
          'application/json': {
            schema: createResponseSchema(
              z.object({
                message: z.string(),
              }),
            ),
          },
        },
      },
      500: jsonErrorResponse('Healthcheck failed'),
    },
  }),
  (c) => generateJsonResponse(c, { message: 'OK' as const }, 200),
)

app.onError(async (err, c) => {
  if (err instanceof ServerError) {
    const error = err as InstanceType<typeof ServerError>
    return c.json(
      error.response,
      error.response.statusCode as ContentfulStatusCode,
    )
  }

  console.error(err)

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
    "Endpoint you're looking for is not found",
  ),
)

export type ApiRoutesType = typeof v1ApiRoutes
export default app as ApiRoutesType
