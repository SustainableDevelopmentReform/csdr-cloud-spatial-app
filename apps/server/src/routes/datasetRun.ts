import { zValidator } from '@hono/zod-validator'
import { count, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { datasetRun, productRun } from '../schemas'
import { QueryForTable } from '../schemas/util'

// Define shared query configuration
export const datasetRunQuery = {
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
  // This doesn't work for some reason
  // extras: {
  //   productRunCount: db
  //     .$count(productRun, eq(productRun.datasetRunId, datasetRun.id))
  //     .as('product_run_count'),
  // },
} satisfies QueryForTable<'datasetRun'>

// There is an entry for the table datasetRun, but it cannot be referenced from this part of the query

const app = new Hono()
  .get('/:id', authMiddleware({ permission: 'read:datasetRun' }), async (c) => {
    const id = c.req.param('id')
    const results = await db.query.datasetRun.findFirst({
      where: (datasetRun, { eq }) => eq(datasetRun.id, id),
      ...datasetRunQuery,
    })

    const productRunCount = await db.$count(
      productRun,
      eq(productRun.datasetRunId, id),
    )

    if (!results) {
      throw new ServerError({
        statusCode: 404,
        message: 'Failed to get datasetRun',
        description: "datasetRun you're looking for is not found",
      })
    }

    return generateJsonResponse(c, { ...results, productRunCount })
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
