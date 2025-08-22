import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { geometryOutput } from '../schemas'
import { QueryForTable } from '../schemas/util'

// Define shared query configuration
export const geometryOutputQuery = {
  columns: {
    id: true,
    createdAt: true,
    name: true,
    properties: true,
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
} satisfies QueryForTable<'geometryOutput'>

const app = new Hono()
  .get(
    '/:id',
    authMiddleware({ permission: 'read:geometryOutput' }),
    async (c) => {
      const id = c.req.param('id')
      const geometryOutput = await db.query.geometryOutput.findFirst({
        where: (geometryOutput, { eq }) => eq(geometryOutput.id, id),
        ...geometryOutputQuery,
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
      const geometry = data.geometry
      // TODO figure out why this doesn't work in the validator
      if (!geometry) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to create geometryOutput',
          description: 'Geometry is required',
        })
      }
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
