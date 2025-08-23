import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { datasetRun, productRun } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import {
  baseCreateResourceSchema,
  baseUpdateResourceSchema,
  transformCreateResource,
  transformUpdateResource,
} from './util'

// Define shared query configuration
export const datasetRunQuery = {
  columns: {
    ...baseColumns,
    metadata: true,
    datasetId: true,
  },
  with: {
    dataset: {
      columns: {
        ...baseColumns,
        mainRunId: true,
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
      transformCreateResource(
        baseCreateResourceSchema.extend({
          datasetId: z.string(),
        }),
      ),
    ),
    authMiddleware({
      permission: 'write:datasetRun',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const newDatasetRun = await db.insert(datasetRun).values(data).returning()

      return generateJsonResponse(c, newDatasetRun[0], 201)
    },
  )
  .patch(
    '/:id',
    zValidator(
      'json',
      transformUpdateResource(
        baseUpdateResourceSchema.extend({
          datasetId: z.string().optional(),
        }),
      ),
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
