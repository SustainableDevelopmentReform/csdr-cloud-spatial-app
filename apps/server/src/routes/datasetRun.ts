import { zValidator } from '@hono/zod-validator'
import { count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { datasetRun } from '../schemas'
import { QueryForTable } from '../schemas/util'

// Define shared query configuration
const datasetRunQuery = {
  columns: {
    id: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    parameters: true,
    datasetId: true,
  },
  with: {
    dataset: {
      columns: {
        id: true,
        name: true,
      },
    },
  },
} satisfies QueryForTable<'datasetRun'>

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
      permission: 'read:datasetRun',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(datasetRun)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.datasetRun.findMany({
        ...datasetRunQuery,
        limit: size,
        offset: skip,
        orderBy: desc(datasetRun.createdAt),
      })

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  .get('/:id', authMiddleware({ permission: 'read:datasetRun' }), async (c) => {
    const id = c.req.param('id')
    const datasetRun = await db.query.datasetRun.findFirst({
      where: (datasetRun, { eq }) => eq(datasetRun.id, id),
      ...datasetRunQuery,
    })

    if (!datasetRun) {
      throw new ServerError({
        statusCode: 404,
        message: 'Failed to get datasetRun',
        description: "datasetRun you're looking for is not found",
      })
    }

    return generateJsonResponse(c, datasetRun)
  })

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        description: z.string().nullable().optional(),
        parameters: z.any().optional(),
        datasetId: z.string(),
      }),
    ),
    authMiddleware({
      permission: 'write:datasetRun',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newdatasetRun = await db
        .insert(datasetRun)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newdatasetRun[0], 201)
    },
  )
  .patch(
    '/:id',
    zValidator(
      'json',
      z.object({
        description: z.string().nullable().optional(),
      }),
    ),
    authMiddleware({
      permission: 'write:datasetRun',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(datasetRun)
        .set(data)
        .where(eq(datasetRun.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:datasetRun',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(datasetRun).where(eq(datasetRun.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
