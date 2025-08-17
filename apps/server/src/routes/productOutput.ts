import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { productOutput } from '../schemas'
import { QueryForTable } from '../schemas/util'

// Define shared query configuration
export const productOutputQuery = {
  columns: {
    id: true,
    createdAt: true,
    value: true,
    timePoint: true,
    productRunId: true,
    geometryOutputId: true,
  },
  with: {
    productRun: {
      columns: {
        id: true,
      },
      with: {
        product: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    },
    variable: {
      columns: {
        id: true,
        name: true,
        unit: true,
      },
    },
    geometryOutput: {
      columns: {
        id: true,
        name: true,
        geometry: true,
      },
      with: {
        geometriesRun: {
          with: {
            geometries: {
              columns: {
                id: true,
                name: true,
              },
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

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        productRunId: z.string(),
        geometryOutputId: z.string(),
        value: z.string(),
        variableId: z.string(),
        timePoint: z.date(),
      }),
    ),
    authMiddleware({
      permission: 'write:productOutput',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newProductOutput = await db
        .insert(productOutput)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newProductOutput[0], 201)
    },
  )

export default app
