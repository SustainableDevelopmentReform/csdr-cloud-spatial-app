import { createRoute, z } from '@hono/zod-openapi'
import {
  baseGeometriesRunSchema,
  createGeometryOutputSchema,
  createManyGeometryOutputSchema,
  fullGeometryOutputSchema,
  importGeometryOutputsSchema,
  updateGeometryOutputSchema,
} from '@repo/schemas/crud'
import { MultiPolygonSchema, PolygonSchema } from '@repo/schemas/geojson'
import { DrizzleQueryError, eq, inArray } from 'drizzle-orm'
import { MultiPolygon } from 'geojson'
import { DatabaseError } from 'pg'
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
import { geometryOutput } from '../schemas/db'
import {
  baseColumns,
  createPayload,
  idColumns,
  idColumnsWithMainRunId,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { fetchBaseGeometriesRunOrThrow } from './geometriesRun'

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

const geometryOutputNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get geometryOutput',
    description: "geometryOutput you're looking for is not found",
  })

const geoJsonFeatureSchema = z
  .object({
    type: z.literal('Feature'),
    properties: z.record(z.string(), z.unknown()).nullable().optional(),
    geometry: z.union([PolygonSchema, MultiPolygonSchema]).nullable(),
  })
  .passthrough()

const geoJsonFeatureCollectionSchema = z
  .object({
    type: z.literal('FeatureCollection'),
    features: z
      .array(geoJsonFeatureSchema)
      .min(1, 'GeoJSON file does not contain any features'),
  })
  .passthrough()

type UploadedGeoJsonFeature = z.infer<typeof geoJsonFeatureSchema>

export const fetchFullGeometryOutput = async (id: string) => {
  const record = await db.query.geometryOutput.findFirst({
    where: (geometryOutput, { eq }) => eq(geometryOutput.id, id),
    ...fullGeometryOutputQuery,
  })

  return record ?? null
}

export const fetchFullGeometryOutputOrThrow = async (id: string) => {
  const record = await fetchFullGeometryOutput(id)

  if (!record) {
    throw geometryOutputNotFoundError()
  }

  return record
}

const parseGeoJsonFile = async (file: File) => {
  try {
    const raw = await file.text()
    return geoJsonFeatureCollectionSchema.parse(JSON.parse(raw))
  } catch (error) {
    throw new ServerError({
      statusCode: 400,
      message: 'Invalid GeoJSON upload',
      description:
        error instanceof Error
          ? error.message
          : 'Failed to parse uploaded GeoJSON file',
    })
  }
}

const extractValidatedFeatures = ({
  features,
  idProperty,
  nameProperty,
}: {
  features: UploadedGeoJsonFeature[]
  idProperty: string
  nameProperty: string
}) => {
  const warnings: { message: string; description?: string }[] = []
  const parsedFeatures: {
    featureId: string
    name: string
    geometry: MultiPolygon
    properties: Record<string, unknown>
  }[] = []

  features.forEach((feature, index) => {
    if (!feature.geometry) {
      warnings.push({
        message: `Feature at index ${index} is missing geometry`,
        description:
          'Feature: ' +
          JSON.stringify({ ...feature, geometry: undefined }, null, 2),
      })
      return
    }

    if (
      feature.geometry.type !== 'Polygon' &&
      feature.geometry.type !== 'MultiPolygon'
    ) {
      warnings.push({
        message: `Feature at index ${index} must be a Polygon or MultiPolygon`,
        description:
          'Feature: ' +
          JSON.stringify({ ...feature, geometry: undefined }, null, 2),
      })
      return
    }

    const properties = feature.properties ?? {}
    const featureIdRaw = properties[idProperty]
    const featureNameRaw = properties[nameProperty]

    if (featureIdRaw === undefined || featureIdRaw === null) {
      warnings.push({
        message: `Feature at index ${index} does not contain property ${idProperty}`,
        description:
          'Feature: ' +
          JSON.stringify({ ...feature, properties: undefined }, null, 2),
      })
      return
    }

    if (featureNameRaw === undefined || featureNameRaw === null) {
      warnings.push({
        message: `Feature at index ${index} does not contain property ${nameProperty}`,
        description:
          'Feature: ' +
          JSON.stringify({ ...feature, properties: undefined }, null, 2),
      })
      return
    }

    const featureId = String(featureIdRaw)
    const featureName = String(featureNameRaw)

    if (!featureId.length) {
      warnings.push({
        message: `Feature at index ${index} has an empty ${idProperty} value`,
        description:
          'Feature: ' +
          JSON.stringify({ ...feature, properties: undefined }, null, 2),
      })
      return
    }

    if (!featureName.length) {
      warnings.push({
        message: `Feature at index ${index} has an empty ${nameProperty} value`,
        description:
          'Feature: ' +
          JSON.stringify({ ...feature, properties: undefined }, null, 2),
      })
      return
    }

    // Convert Polygon to MultiPolygon
    let geometry: MultiPolygon
    if (feature.geometry.type === 'Polygon') {
      geometry = {
        type: 'MultiPolygon',
        coordinates: [feature.geometry.coordinates],
      }
    } else {
      geometry = feature.geometry
    }

    parsedFeatures.push({
      featureId,
      name: featureName,
      geometry,
      properties,
    })
  })

  return {
    features: parsedFeatures,
    warnings,
  }
}

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
      const record = await fetchFullGeometryOutputOrThrow(id)

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
              schema: createResponseSchema(fullGeometryOutputSchema),
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

      if (!newGeometryOutput) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create geometryOutput',
          description: 'Geometry output insert did not return a record',
        })
      }

      const record = await fetchFullGeometryOutputOrThrow(newGeometryOutput.id)

      return generateJsonResponse(c, record, 201, 'Geometry output created')
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
              schema: createResponseSchema(z.array(fullGeometryOutputSchema)),
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

      const ids = newGeometryOutputs.map((output) => output.id)

      const fullRecords = ids.length
        ? await db.query.geometryOutput.findMany({
            ...fullGeometryOutputQuery,
            where: inArray(geometryOutput.id, ids),
          })
        : []

      const recordMap = new Map(
        fullRecords.map((record) => [record.id, record]),
      )

      const orderedRecords = ids.map((id) => {
        const record = recordMap.get(id)
        if (!record) {
          throw new ServerError({
            statusCode: 500,
            message: 'Failed to retrieve geometry outputs',
            description: `Geometry output with ID ${id} not found after creation`,
          })
        }

        return record
      })

      return generateJsonResponse(
        c,
        orderedRecords,
        201,
        'Geometry output created',
      )
    },
  )

  .openapi(
    createRoute({
      description:
        'Create a geometries run by importing GeoJSON features as geometry outputs.',
      method: 'post',
      path: '/import',
      middleware: [
        authMiddleware({
          permission: 'write:geometriesRun',
        }),
      ],
      request: {
        body: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: importGeometryOutputsSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description:
            'Successfully created a geometries run and imported geometry outputs.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  geometriesRun: baseGeometriesRunSchema,
                  numberOfFeatures: z.number().int(),
                  warnings: z.array(
                    z.object({
                      message: z.string(),
                      description: z.string().optional(),
                    }),
                  ),
                }),
              ),
            },
          },
        },
        400: jsonErrorResponse('Invalid GeoJSON import payload'),
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse(
          'Failed to import geometries run from GeoJSON file',
        ),
      },
    }),
    async (c) => {
      const {
        geometriesRunId,
        geojsonFile,
        geojsonIdProperty: idProperty,
        geojsonNameProperty: nameProperty,
      } = c.req.valid('form')

      const featureCollection = await parseGeoJsonFile(geojsonFile)

      const normalizedFeatures = extractValidatedFeatures({
        features: featureCollection.features,
        idProperty,
        nameProperty,
      })

      const geometriesRun = await fetchBaseGeometriesRunOrThrow(geometriesRunId)

      let successCount = 0
      for (const [index, feature] of normalizedFeatures.features.entries()) {
        const validatedOutput = {
          id: `${geometriesRun.id}-${feature.featureId}`,
          name: feature.name,
          geometry: feature.geometry,
          properties: feature.properties,
          geometriesRunId: geometriesRun.id,
        }
        try {
          await db.insert(geometryOutput).values(createPayload(validatedOutput))
          successCount++
        } catch (error) {
          if (error instanceof DrizzleQueryError) {
            if (error.cause instanceof DatabaseError) {
              throw new ServerError({
                statusCode: 500,
                message: `Failed to create geometry output (name:${feature.name}, id:${feature.featureId}, index:${index})`,
                description: error.cause.detail ?? error.cause.message,
              })
            }
          }
          throw error
        }
      }

      return generateJsonResponse(
        c,
        {
          geometriesRun: geometriesRun,
          numberOfFeatures: successCount,
          warnings: normalizedFeatures.warnings,
        },
        201,
        'Geometries run imported successfully',
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
              schema: createResponseSchema(fullGeometryOutputSchema),
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

      if (!record) {
        throw geometryOutputNotFoundError()
      }

      const fullRecord = await fetchFullGeometryOutputOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Geometry output updated')
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
              schema: createResponseSchema(fullGeometryOutputSchema),
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
      const record = await fetchFullGeometryOutputOrThrow(id)

      await db.delete(geometryOutput).where(eq(geometryOutput.id, id))

      return generateJsonResponse(c, record, 200, 'Geometry output deleted')
    },
  )

export default app
