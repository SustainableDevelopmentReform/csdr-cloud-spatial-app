import { zValidator } from '@hono/zod-validator'
import { count, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { geometriesRun, geometryOutput, productRun } from '../schemas'
import { QueryForTable } from '../schemas/util'
import { geometryOutputQuery } from './geometryOutput'

// Define shared query configuration
export const geometriesRunQuery = {
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
} satisfies QueryForTable<'geometriesRun'>

const app = new Hono()
  .get(
    '/:id',
    authMiddleware({ permission: 'read:geometriesRun' }),
    async (c) => {
      const id = c.req.param('id')

      const geometriesRun = await db.query.geometriesRun.findFirst({
        where: (geometriesRun, { eq }) => eq(geometriesRun.id, id),
        ...geometriesRunQuery,
      })

      const outputCount = await db.$count(
        geometryOutput,
        eq(geometryOutput.geometriesRunId, id),
      )

      const productRunCount = await db.$count(
        productRun,
        eq(productRun.geometriesRunId, id),
      )

      if (!geometriesRun) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get geometriesRun',
          description: "geometriesRun you're looking for is not found",
        })
      }

      return generateJsonResponse(c, {
        ...geometriesRun,
        outputCount,
        productRunCount,
      })
    },
  )
  .get(
    '/:id/outputs',
    zValidator(
      'query',
      z.object({
        page: z.number({ coerce: true }).positive().optional(),
        size: z.number({ coerce: true }).optional(),
      }),
    ),
    authMiddleware({
      permission: 'read:geometryOutput',
    }),
    async (c) => {
      const id = c.req.param('id')
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(geometryOutput)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.geometryOutput.findMany({
        ...geometryOutputQuery,
        where: (geometryOutput, { eq }) =>
          eq(geometryOutput.geometriesRunId, id),
        limit: size,
        offset: skip,
        orderBy: desc(geometryOutput.createdAt),
      })

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        description: z.string().nullable().optional(),
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
        description: z.string().nullable().optional(),
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
