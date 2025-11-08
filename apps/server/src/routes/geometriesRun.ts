import { createRoute, z } from '@hono/zod-openapi'
import {
  baseGeometriesRunSchema,
  baseGeometryOutputSchema,
  createGeometriesRunSchema,
  fullGeometriesRunSchema,
  geometryOutputExportQuerySchema,
  geometryOutputExportSchema,
  geometryOutputQuerySchema,
  updateGeometriesRunSchema,
} from '@repo/schemas/crud'
import { and, desc, eq, inArray, isNotNull, sql, SQL } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import {
  geometries,
  geometriesRun,
  geometryOutput,
  productRun,
} from '../schemas/db'
import {
  baseRunColumns,
  createPayload,
  idColumnsWithMainRunId,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'
import {
  baseGeometryOutputQuery,
  geometryOutputExportQuery,
} from './geometryOutput'

export const baseGeometriesRunQuery = {
  columns: {
    ...baseRunColumns,
    dataPmtilesUrl: true,
  },
  with: {
    geometries: {
      columns: idColumnsWithMainRunId,
    },
  },
} satisfies QueryForTable<'geometriesRun'>

export const fullGeometriesRunQuery = baseGeometriesRunQuery

const TILE_EXTENT = 4096
const TILE_BUFFER = 64

const fetchGeometryOutputsTile = async ({
  geometriesRunId,
  z,
  x,
  y,
}: {
  geometriesRunId: string
  z: number
  x: number
  y: number
}) => {
  const tile = db
    .select({
      geometry_output_id: geometryOutput.id,
      geom: sql<string>`
        ST_AsMVTGeom(
          ST_Transform(${geometryOutput.geometry}, 3857),
          ST_TileEnvelope(${z}, ${x}, ${y}),
          ${TILE_EXTENT},
          ${TILE_BUFFER},
          true
        )
      `.as('geom'),
    })
    .from(geometryOutput)
    .where(
      and(
        eq(geometryOutput.geometriesRunId, geometriesRunId),
        sql`ST_Intersects(
          ST_Transform(${geometryOutput.geometry}, 3857),
          ST_TileEnvelope(${z}, ${x}, ${y})
        )`,
      ),
    )
    .as('tile')

  const tileData = await db
    .select({
      mvt: sql<Buffer | null>`
        ST_AsMVT(tile, 'data', ${TILE_EXTENT}, 'geom')
      `,
    })
    .from(tile)
    .where(isNotNull(tile.geom))

  return tileData[0]?.mvt ?? Buffer.alloc(0)
}

const geometriesRunNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get geometriesRun',
    description: "geometriesRun you're looking for is not found",
  })

const fetchBaseGeometriesRun = async (id: string) => {
  const geometriesRunRecord = await db.query.geometriesRun.findFirst({
    where: (geometriesRun, { eq }) => eq(geometriesRun.id, id),
    ...fullGeometriesRunQuery,
  })

  if (!geometriesRunRecord) {
    return null
  }

  return geometriesRunRecord
}

export const fetchBaseGeometriesRunOrThrow = async (id: string) => {
  const record = await fetchBaseGeometriesRun(id)

  if (!record) {
    throw geometriesRunNotFoundError()
  }

  return record
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'Retrieve a geometries run with aggregated metadata.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:geometriesRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullGeometriesRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch geometries run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchBaseGeometriesRunOrThrow(id)

      const [outputCount, productRunCount] = await Promise.all([
        db.$count(geometryOutput, eq(geometryOutput.geometriesRunId, id)),
        db.$count(productRun, eq(productRun.geometriesRunId, id)),
      ])

      const [bounds] = await db
        .select({
          minX: sql<number>`ST_XMin(ST_Extent(${geometryOutput.geometry}))`,
          minY: sql<number>`ST_YMin(ST_Extent(${geometryOutput.geometry}))`,
          maxX: sql<number>`ST_XMax(ST_Extent(${geometryOutput.geometry}))`,
          maxY: sql<number>`ST_YMax(ST_Extent(${geometryOutput.geometry}))`,
        })
        .from(geometryOutput)
        .where(eq(geometryOutput.geometriesRunId, id))

      if (!bounds) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to fetch bounds',
          description: 'Failed to fetch bounds for geometries run',
        })
      }

      return generateJsonResponse(
        c,
        { ...record, bounds, outputCount, productRunCount },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      description: 'List outputs for a geometries run.',
      method: 'get',
      path: '/:id/outputs',
      middleware: [
        authMiddleware({
          permission: 'read:geometryOutput',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: geometryOutputQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully listed outputs for a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseGeometryOutputSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list geometry outputs'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { geometryOutputIds } = c.req.valid('query')
      const { pageCount, totalCount, ...query } = await parseQuery(
        geometryOutput,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(geometryOutput.createdAt),
          searchableColumns: [geometryOutput.name],
        },
      )

      if (geometryOutputIds) {
        query.where = and(
          query.where,
          inArray(
            geometryOutput.id,
            Array.isArray(geometryOutputIds)
              ? geometryOutputIds
              : [geometryOutputIds],
          ),
        )
      }

      const data = await db.query.geometryOutput.findMany({
        ...baseGeometryOutputQuery,
        ...query,
        where: and(eq(geometryOutput.geometriesRunId, id), query.where),
      })

      return generateJsonResponse(
        c,
        {
          pageCount,
          data,
          totalCount,
        },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      description: 'MVT for a geometries run.',
      method: 'get',
      path: '/:id/outputs/mvt/:z/:x/:y',
      middleware: [
        authMiddleware({
          permission: 'read:geometryOutput',
        }),
      ],
      request: {
        params: z.object({
          id: z.string().min(1),
          z: z.coerce.number().int(),
          x: z.coerce.number().int(),
          y: z.coerce.number().int(),
        }),
      },
      responses: {
        200: {
          description: 'Successfully listed outputs for a geometries run.',
          content: {
            'image/vnd.mapbox-vector-tile': {
              schema: z.string(),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch tile'),
      },
    }),
    async (c) => {
      const { id, z, x, y } = c.req.valid('param')

      const tileBuffer = await fetchGeometryOutputsTile({
        geometriesRunId: id,
        z,
        x,
        y,
      })

      return c.body(tileBuffer, 200, {
        'Content-Type': 'image/vnd.mapbox-vector-tile',
        'Content-Length': tileBuffer.length.toString(),
      })
    },
  )
  .openapi(
    createRoute({
      description: 'Export outputs for a geometries run.',
      method: 'get',
      path: '/:id/outputs/export',
      middleware: [authMiddleware({ permission: 'read:geometryOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: geometryOutputExportQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully exported outputs for a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  data: z.array(geometryOutputExportSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to export geometry outputs'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { geometryOutputIds } = c.req.valid('query')

      const filters: SQL[] = [eq(geometryOutput.geometriesRunId, id)]

      if (geometryOutputIds) {
        filters.push(
          inArray(
            geometryOutput.id,
            Array.isArray(geometryOutputIds)
              ? geometryOutputIds
              : [geometryOutputIds],
          ),
        )
      }

      const data = await db.query.geometryOutput.findMany({
        ...geometryOutputExportQuery,
        where: and(...filters),
        orderBy: desc(geometryOutput.createdAt),
      })

      return generateJsonResponse(
        c,
        {
          data,
        },
        200,
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Create a geometries run.',
      method: 'post',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'write:geometriesRun',
        }),
      ],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createGeometriesRunSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseGeometriesRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create geometries run'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const [newGeometriesRun] = await db
        .insert(geometriesRun)
        .values(createPayload(payload))
        .returning()

      if (!newGeometriesRun) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create geometriesRun',
          description: 'Geometries run insert did not return a record',
        })
      }

      const record = await fetchBaseGeometriesRunOrThrow(newGeometriesRun.id)

      return generateJsonResponse(c, record, 201, 'Geometries run created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a geometries run.',
      method: 'patch',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:geometriesRun',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateGeometriesRunSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseGeometriesRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update geometries run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(geometriesRun)
        .set(updatePayload(payload))
        .where(eq(geometriesRun.id, id))
        .returning()

      if (!record) {
        throw geometriesRunNotFoundError()
      }

      const fullRecord = await fetchBaseGeometriesRunOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Geometries run updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a geometries run.',
      method: 'delete',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:geometriesRun',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a geometries run.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseGeometriesRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete geometries run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchBaseGeometriesRunOrThrow(id)

      await db.delete(geometriesRun).where(eq(geometriesRun.id, id))

      return generateJsonResponse(c, record, 200, 'Geometries run deleted')
    },
  )

  .openapi(
    createRoute({
      description: 'Mark a geometries run as the main run for its geometries.',
      method: 'post',
      path: '/:id/set-as-main-run',
      middleware: [
        authMiddleware({
          permission: 'write:geometriesRun',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description:
            'Successfully marked a geometries run as the main run for its geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseGeometriesRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to set geometries run as main'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')

      const run = await db.query.geometriesRun.findFirst({
        where: (geometriesRun, { eq }) => eq(geometriesRun.id, id),
        columns: {
          id: true,
          geometriesId: true,
        },
      })

      if (!run) {
        throw new ServerError({
          statusCode: 404,
          message: 'Geometries run not found',
          description: `Geometries run with ID ${id} does not exist`,
        })
      }

      await db
        .update(geometries)
        .set({ mainRunId: id })
        .where(eq(geometries.id, run.geometriesId))

      const record = await fetchBaseGeometriesRunOrThrow(id)

      return generateJsonResponse(c, record, 200, 'Geometries run set as main')
    },
  )

export default app
