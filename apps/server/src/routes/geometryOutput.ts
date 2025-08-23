import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { geometryOutput } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import {
  baseCreateResourceSchema,
  baseUpdateResourceSchema,
  transformCreateResource,
  transformUpdateResource,
} from './util'

// Define shared query configuration
export const geometryOutputQuery = {
  columns: {
    ...baseColumns,
    properties: true,
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
      transformCreateResource(
        baseCreateResourceSchema.extend({
          // Name is mandatory
          name: z.string(),
          geometriesRunId: z.string(),
          geometry: z.any().optional(),
          properties: z.any().optional(),
        }),
      ),
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
  .patch(
    '/:id',
    zValidator(
      'json',
      transformUpdateResource(
        baseUpdateResourceSchema.extend({
          // Don't allow name to be updated
          name: z.undefined(),
        }),
      ),
    ),
    authMiddleware({
      permission: 'write:geometryOutput',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(geometryOutput)
        .set(data)
        .where(eq(geometryOutput.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
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
