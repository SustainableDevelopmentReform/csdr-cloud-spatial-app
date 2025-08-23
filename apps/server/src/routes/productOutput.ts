import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { productOutput } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import {
  baseCreateResourceSchema,
  baseUpdateResourceSchema,
  transformCreateResource,
  transformUpdateResource,
} from './util'

// Define shared query configuration
export const productOutputQuery = {
  columns: {
    ...baseColumns,
    value: true,
    timePoint: true,
    productRunId: true,
    geometryOutputId: true,
  },
  with: {
    productRun: {
      columns: baseColumns,
      with: {
        product: {
          columns: { ...baseColumns, mainRunId: true },
        },
        datasetRun: {
          columns: baseColumns,
          with: {
            dataset: {
              columns: { ...baseColumns, mainRunId: true },
            },
          },
        },
      },
    },
    variable: {
      columns: {
        ...baseColumns,
        unit: true,
      },
    },
    geometryOutput: {
      columns: {
        ...baseColumns,
        geometry: true,
      },
      with: {
        geometriesRun: {
          with: {
            geometries: {
              columns: { ...baseColumns, mainRunId: true },
            },
          },
        },
      },
    },
  },
} satisfies QueryForTable<'productOutput'>

const app = new Hono()
  .get(
    '/:id',
    authMiddleware({ permission: 'read:productOutput' }),
    async (c) => {
      const id = c.req.param('id')
      const productOutput = await db.query.productOutput.findFirst({
        where: (productOutput, { eq }) => eq(productOutput.id, id),
        ...productOutputQuery,
      })

      if (!productOutput) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get productOutput',
          description: "productOutput you're looking for is not found",
        })
      }

      return generateJsonResponse(c, productOutput)
    },
  )
  .patch(
    '/:id',
    zValidator(
      'json',
      transformUpdateResource(
        baseUpdateResourceSchema.extend({
          name: z.string().optional(),
          description: z.string().optional(),
        }),
      ),
    ),
    authMiddleware({
      permission: 'write:productOutput',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(productOutput)
        .set(data)
        .where(eq(productOutput.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )

  .post(
    '/',
    zValidator(
      'json',
      transformCreateResource(
        baseCreateResourceSchema.extend({
          productRunId: z.string(),
          geometryOutputId: z.string(),
          value: z.string(),
          variableId: z.string(),
          timePoint: z.date(),
        }),
      ),
    ),
    authMiddleware({
      permission: 'write:productOutput',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newProductOutput = await db
        .insert(productOutput)
        .values(data)
        .returning()

      return generateJsonResponse(c, newProductOutput[0], 201)
    },
  )

export default app
