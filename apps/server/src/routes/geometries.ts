import { zValidator } from '@hono/zod-validator'
import { count, desc, eq, getTableColumns } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { geometries } from '../schemas'

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
      permission: 'read:geometries',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(geometries)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db
        .select({
          id: geometries.id,
          name: geometries.name,
          slug: geometries.slug,
          description: geometries.description,
          createdAt: geometries.createdAt,
          updatedAt: geometries.updatedAt,
          metadata: geometries.metadata,
        })
        .from(geometries)
        .groupBy(geometries.id)
        .limit(size)
        .offset(skip)
        .orderBy(desc(geometries.createdAt))

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  .get('/:id', authMiddleware({ permission: 'read:geometries' }), async (c) => {
    const id = c.req.param('id')
    const geometries = await db.query.geometries.findFirst({
      where: (geometries, { eq }) => eq(geometries.id, id),
    })

    if (!geometries) {
      throw new ServerError({
        statusCode: 404,
        message: 'Failed to get geometries',
        description: "Geometries you're looking for is not found",
      })
    }

    return generateJsonResponse(c, geometries)
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
      }),
    ),
    authMiddleware({
      permission: 'write:geometries',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newGeometries = await db
        .insert(geometries)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newGeometries[0], 201)
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
      }),
    ),
    authMiddleware({
      permission: 'write:geometries',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(geometries)
        .set(data)
        .where(eq(geometries.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:geometries',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(geometries).where(eq(geometries.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
