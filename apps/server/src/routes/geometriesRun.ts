import { zValidator } from '@hono/zod-validator'
import { count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { geometriesRun } from '../schemas'

// Define shared query configuration
const geometriesRunQuery = {
  columns: {
    id: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    parameters: true,
    geometriesId: true,
  },
  with: {
    geometries: {
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
      permission: 'read:geometriesRun',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(geometriesRun)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.geometriesRun.findMany({
        ...geometriesRunQuery,
        limit: size,
        offset: skip,
        orderBy: desc(geometriesRun.createdAt),
      })

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  .get(
    '/:id',
    authMiddleware({ permission: 'read:geometriesRun' }),
    async (c) => {
      const id = c.req.param('id')
      const geometriesRun = await db.query.geometriesRun.findFirst({
        where: (geometriesRun, { eq }) => eq(geometriesRun.id, id),
        ...geometriesRunQuery,
      })

      if (!geometriesRun) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get geometriesRun',
          description: "geometriesRun you're looking for is not found",
        })
      }

      return generateJsonResponse(c, geometriesRun)
    },
  )

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        description: z.string().optional(),
        parameters: z.any().optional(),
        geometriesId: z.string(),
      }),
    ),
    authMiddleware({
      permission: 'write:geometriesRun',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newGeometriesRun = await db
        .insert(geometriesRun)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newGeometriesRun[0], 201)
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
      permission: 'write:geometriesRun',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(geometriesRun)
        .set(data)
        .where(eq(geometriesRun.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:geometriesRun',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(geometriesRun).where(eq(geometriesRun.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
