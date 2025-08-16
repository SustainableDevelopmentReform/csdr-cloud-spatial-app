import { zValidator } from '@hono/zod-validator'
import { count, desc, eq, getTableColumns } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { dataset, geometries, product } from '../schemas'

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
      permission: 'read:product',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(product)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db
        .select({
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          metadata: product.metadata,
          dataset: { id: dataset.id, name: dataset.name, slug: dataset.slug },
          geometries: {
            id: geometries.id,
            name: geometries.name,
            slug: geometries.slug,
          },
          timePrecision: product.timePrecision,
        })
        .from(product)
        .leftJoin(dataset, eq(product.datasetId, dataset.id))
        .leftJoin(geometries, eq(product.geometriesId, geometries.id))
        .groupBy(product.id)
        .limit(size)
        .offset(skip)
        .orderBy(desc(product.createdAt))

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  .get('/:id', authMiddleware({ permission: 'read:product' }), async (c) => {
    const id = c.req.param('id')
    const product = await db.query.product.findFirst({
      where: (product, { eq }) => eq(product.id, id),
    })

    if (!product) {
      throw new ServerError({
        statusCode: 404,
        message: 'Failed to get product',
        description: "Product you're looking for is not found",
      })
    }

    return generateJsonResponse(c, product)
  })

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        metadata: z.any().optional(),
        datasetId: z.string(),
        geometriesId: z.string(),
        timePrecision: z.enum(['hour', 'day', 'month', 'year']),
      }),
    ),
    authMiddleware({
      permission: 'write:product',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newProduct = await db
        .insert(product)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newProduct[0], 201)
    },
  )
  .patch(
    '/:id',
    zValidator(
      'json',
      z.object({
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        metadata: z.any().optional(),
        datasetId: z.string().optional(),
        geometriesId: z.string().optional(),
        timePrecision: z.enum(['hour', 'day', 'month', 'year']).optional(),
      }),
    ),
    authMiddleware({
      permission: 'write:product',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(product)
        .set(data)
        .where(eq(product.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:product',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(product).where(eq(product.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
