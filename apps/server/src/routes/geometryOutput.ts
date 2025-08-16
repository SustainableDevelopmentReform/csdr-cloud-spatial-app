import { zValidator } from '@hono/zod-validator'
import { count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { geometryOutput } from '../schemas'
import { GeoJSONMultiPolygonSchema, GeoJSONPolygonSchema } from 'zod-geojson'

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
      permission: 'read:geometryOutput',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(geometryOutput)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db
        .select({
          id: geometryOutput.id,
          createdAt: geometryOutput.createdAt,
          name: geometryOutput.name,
          properties: geometryOutput.properties,
          geometry: geometryOutput.geometry,
          geometriesRunId: geometryOutput.geometriesRunId,
        })
        .from(geometryOutput)
        .groupBy(geometryOutput.id)
        .limit(size)
        .offset(skip)
        .orderBy(desc(geometryOutput.createdAt))

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  .get(
    '/:id',
    authMiddleware({ permission: 'read:geometryOutput' }),
    async (c) => {
      const id = c.req.param('id')
      const geometryOutput = await db.query.geometryOutput.findFirst({
        where: (geometryOutput, { eq }) => eq(geometryOutput.id, id),
      })

      if (!geometryOutput) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get geometryOutput',
          description: "geometryOutput you're looking for is not found",
        })
      }

      return generateJsonResponse(c, geometryOutput)
    },
  )

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string(),
        geometriesRunId: z.string(),
        properties: z.any().optional(),
        geometry: z.any(),
      }),
    ),
    authMiddleware({
      permission: 'write:geometryOutput',
    }),
    async (c) => {
      const data = c.req.valid('json')
      // TODO figure out why this doesn't work in the validator
      const geometry = z
        .union([GeoJSONPolygonSchema, GeoJSONMultiPolygonSchema])
        .parse(data.geometry)
      const id = crypto.randomUUID()
      const newGeometryOutput = await db
        .insert(geometryOutput)
        .values({ ...data, id, geometry })
        .returning()

      return generateJsonResponse(c, newGeometryOutput[0], 201)
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:geometryOutput',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(geometryOutput).where(eq(geometryOutput.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
