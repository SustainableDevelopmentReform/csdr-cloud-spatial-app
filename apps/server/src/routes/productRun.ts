import { zValidator } from '@hono/zod-validator'
import { count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { productRun } from '../schemas'

// Define shared query configuration
const productRunQuery = {
  columns: {
    id: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    parameters: true,
    productId: true,
    datasetRunId: true,
    geometriesRunId: true,
  },
  with: {
    product: {
      columns: {
        id: true,
        name: true,
      },
    },
  },
} as const

const app = new Hono()
  .get(
    '/',
    zValidator(
      'query',
      z.object({
        page: z.number({ coerce: true }).positive().optional(),
        size: z.number({ coerce: true }).optional(),
      }),
    ),
    authMiddleware({
      permission: 'read:productRun',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(productRun)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.productRun.findMany({
        ...productRunQuery,
        limit: size,
        offset: skip,
        orderBy: desc(productRun.createdAt),
      })

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  .get('/:id', authMiddleware({ permission: 'read:productRun' }), async (c) => {
    const id = c.req.param('id')
    const productRun = await db.query.productRun.findFirst({
      where: (productRun, { eq }) => eq(productRun.id, id),
      ...productRunQuery,
    })

    if (!productRun) {
      throw new ServerError({
        statusCode: 404,
        message: 'Failed to get productRun',
        description: "productRun you're looking for is not found",
      })
    }

    return generateJsonResponse(c, productRun)
  })

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        description: z.string().optional(),
        parameters: z.any().optional(),
        productId: z.string(),
        datasetRunId: z.string(),
        geometriesRunId: z.string(),
      }),
    ),
    authMiddleware({
      permission: 'write:productRun',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newProductRun = await db
        .insert(productRun)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newProductRun[0], 201)
    },
  )
  .patch(
    '/:id',
    zValidator(
      'json',
      z.object({
        description: z.string().optional(),
      }),
    ),
    authMiddleware({
      permission: 'write:productRun',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(productRun)
        .set(data)
        .where(eq(productRun.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:productRun',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(productRun).where(eq(productRun.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
