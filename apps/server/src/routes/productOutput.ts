import { zValidator } from '@hono/zod-validator'
import { count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { productOutput, variable } from '../schemas'

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
      permission: 'read:productOutput',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(productOutput)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db
        .select({
          id: productOutput.id,
          createdAt: productOutput.createdAt,
          value: productOutput.value,
          variable: {
            id: variable.id,
            name: variable.name,
            unit: variable.unit,
          },
          timePoint: productOutput.timePoint,
          productRunId: productOutput.productRunId,
          geometryOutputId: productOutput.geometryOutputId,
        })
        .from(productOutput)
        .leftJoin(variable, eq(productOutput.variableId, variable.id))
        .groupBy(productOutput.id)
        .limit(size)
        .offset(skip)
        .orderBy(desc(productOutput.createdAt))

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  .get(
    '/:id',
    authMiddleware({ permission: 'read:productOutput' }),
    async (c) => {
      const id = c.req.param('id')
      const productOutput = await db.query.productOutput.findFirst({
        where: (productOutput, { eq }) => eq(productOutput.id, id),
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
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:productOutput',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(productOutput).where(eq(productOutput.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
