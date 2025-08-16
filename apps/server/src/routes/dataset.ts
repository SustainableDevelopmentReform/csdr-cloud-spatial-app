import { zValidator } from '@hono/zod-validator'
import { count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { dataset } from '../schemas'

const datasetQuery = {
  columns: {
    id: true,
    name: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    metadata: true,
  },
  with: {},
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
      permission: 'read:dataset',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(dataset)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.dataset.findMany({
        ...datasetQuery,
        limit: size,
        offset: skip,
        orderBy: desc(dataset.createdAt),
      })

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  .get('/:id', authMiddleware({ permission: 'read:dataset' }), async (c) => {
    const id = c.req.param('id')
    const dataset = await db.query.dataset.findFirst({
      where: (dataset, { eq }) => eq(dataset.id, id),
      ...datasetQuery,
    })

    if (!dataset) {
      throw new ServerError({
        statusCode: 404,
        message: 'Failed to get dataset',
        description: "Dataset you're looking for is not found",
      })
    }

    return generateJsonResponse(c, dataset)
  })

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
        metadata: z.any().optional(),
      }),
    ),
    authMiddleware({
      permission: 'write:dataset',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newDataset = await db
        .insert(dataset)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newDataset[0], 201)
    },
  )
  .patch(
    '/:id',
    zValidator(
      'json',
      z.object({
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        metadata: z.any().optional(),
      }),
    ),
    authMiddleware({
      permission: 'write:dataset',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(dataset)
        .set(data)
        .where(eq(dataset.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:dataset',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(dataset).where(eq(dataset.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
