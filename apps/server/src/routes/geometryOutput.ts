import { createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  BaseResponseSchema,
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { geometryOutput } from '../schemas/db'
import { MultiPolygonSchema, PolygonSchema } from '@repo/schemas/geojson'
import {
  baseColumns,
  baseIdResourceSchema,
  baseIdResourceSchemaWithMainRunId,
  baseResourceSchema,
  createPayload,
  idColumns,
  idColumnsWithMainRunId,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import {
  createGeometryOutputSchema,
  createManyGeometryOutputSchema,
  updateGeometryOutputSchema,
} from '@repo/schemas/crud'

export const baseGeometryOutputQuery = {
  columns: {
    ...baseColumns,
    properties: true,
  },
  with: {
    geometriesRun: {
      columns: idColumns,
      with: {
        geometries: {
          columns: idColumnsWithMainRunId,
        },
      },
    },
  },
} satisfies QueryForTable<'geometryOutput'>

export const fullGeometryOutputQuery = {
  columns: {
    ...baseGeometryOutputQuery.columns,
    geometry: true,
  },
  with: {
    ...baseGeometryOutputQuery.with,
  },
} satisfies QueryForTable<'geometryOutput'>

export const geometryOutputExportQuery = {
  columns: {
    id: true,
    name: true,
    properties: true,
    geometry: true,
  },
} satisfies QueryForTable<'geometryOutput'>

export const baseGeometryOutputSchema = baseResourceSchema
  .extend({
    properties: z.any(),
    geometriesRun: baseIdResourceSchema.extend({
      geometries: baseIdResourceSchemaWithMainRunId,
    }),
  })
  .openapi('GeometryOutputBase')

const geometrySchema = z
  .union([
    PolygonSchema.openapi({ title: 'GeoJSON Polygon' }),
    MultiPolygonSchema.openapi({ title: 'GeoJSON MultiPolygon' }),
  ])
  .openapi('GeometrySchema')

export const fullGeometryOutputSchema = baseGeometryOutputSchema
  .extend({
    geometry: geometrySchema,
  })
  .openapi('GeometryOutputFull')

export const geometryOutputExportSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    properties: z.any(),
    geometry: geometrySchema,
  })
  .openapi('GeometryOutputExportSchema')

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'Retrieve a geometry output.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:geometryOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a geometry output.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullGeometryOutputSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometry output not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch geometry output'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await db.query.geometryOutput.findFirst({
        where: (geometryOutput, { eq }) => eq(geometryOutput.id, id),
        ...fullGeometryOutputQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get geometryOutput',
          description: "geometryOutput you're looking for is not found",
        })
      }

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a geometry output.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:geometryOutput' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createGeometryOutputSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a geometry output.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                fullGeometryOutputSchema
                  .omit({ geometry: true, geometriesRun: true })
                  .optional(),
              ),
            },
          },
        },
        400: jsonErrorResponse('Geometry is required'),
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create geometry output'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')

      if (!payload.geometry) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to create geometryOutput',
          description: 'Geometry is required',
        })
      }

      const [newGeometryOutput] = await db
        .insert(geometryOutput)
        .values(createPayload(payload))
        .returning()

      return generateJsonResponse(
        c,
        newGeometryOutput,
        201,
        'Geometry output created',
      )
    },
  )
  .openapi(
    createRoute({
      description: 'Create multiple geometry outputs.',
      method: 'post',
      path: '/bulk',
      middleware: [authMiddleware({ permission: 'write:geometryOutput' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createManyGeometryOutputSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created multiple geometry outputs.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.array(
                  fullGeometryOutputSchema.omit({
                    geometry: true,
                    geometriesRun: true,
                  }),
                ),
              ),
            },
          },
        },
        400: jsonErrorResponse('Geometry outputs are required'),
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create geometry outputs'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')

      if (!payload.outputs.every((output) => output.geometry)) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to create geometryOutputs',
          description: 'Geometry outputs are required',
        })
      }

      const newGeometryOutputs = await db
        .insert(geometryOutput)
        .values(
          payload.outputs.map((output) => ({
            ...createPayload(output),
            geometriesRunId: payload.geometriesRunId,
          })),
        )
        .returning()

      return generateJsonResponse(
        c,
        newGeometryOutputs,
        201,
        'Geometry output created',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Update a geometry output.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:geometryOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateGeometryOutputSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a geometry output.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                fullGeometryOutputSchema
                  .omit({ geometry: true, geometriesRun: true })
                  .optional(),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometry output not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update geometry output'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(geometryOutput)
        .set(updatePayload(payload))
        .where(eq(geometryOutput.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Geometry output updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a geometry output.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:geometryOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a geometry output.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometry output not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete geometry output'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await db.delete(geometryOutput).where(eq(geometryOutput.id, id))

      return generateJsonResponse(c, {}, 200, 'Geometry output deleted')
    },
  )

export default app
