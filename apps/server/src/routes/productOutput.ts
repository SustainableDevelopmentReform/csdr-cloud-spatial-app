import { createRoute, z } from '@hono/zod-openapi'
import {
  baseProductOutputSchema,
  createManyProductOutputSchema,
  createProductOutputSchema,
  fullProductOutputSchema,
  importProductOutputsSchema,
  updateProductOutputSchema,
} from '@repo/schemas/crud'
import { DrizzleQueryError, eq, inArray } from 'drizzle-orm'
import Papa from 'papaparse'
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
import { geometryOutput, productOutput } from '../schemas/db'
import {
  baseColumns,
  createPayload,
  idColumns,
  idColumnsWithMainRunId,
  InferQueryModel,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import {
  baseGeometryOutputQuery,
  fetchFullGeometryOutputOrThrow,
} from './geometryOutput'
import {
  baseDerivedIndicatorQuery,
  fullMeasuredIndicatorQuery,
  parseBaseDerivedIndicator,
  parseFullMeasuredIndicator,
} from './indicator'

export const baseProductOutputQuery = {
  columns: {
    ...baseColumns,
    value: true,
    timePoint: true,
  },
  with: {
    productRun: {
      columns: idColumns,
      with: {
        product: {
          columns: idColumnsWithMainRunId,
        },
        datasetRun: {
          columns: idColumns,
          with: {
            dataset: {
              columns: idColumnsWithMainRunId,
            },
          },
        },
        geometriesRun: {
          columns: idColumns,
          with: {
            geometries: {
              columns: idColumnsWithMainRunId,
            },
          },
        },
      },
    },

    indicator: fullMeasuredIndicatorQuery,
    derivedIndicator: baseDerivedIndicatorQuery,
    geometryOutput: baseGeometryOutputQuery,
  },
} satisfies QueryForTable<'productOutput'>

const fullProductOutputQuery = {
  ...baseProductOutputQuery,
  with: {
    ...baseProductOutputQuery.with,
    dependencyProductOutputs: {
      with: {
        dependencyProductOutput: baseProductOutputQuery,
      },
    },
  },
} satisfies QueryForTable<'productOutput'>

const productOutputNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get productOutput',
    description: "productOutput you're looking for is not found",
  })

type BaseProductOutputRecord = InferQueryModel<
  'productOutput',
  typeof baseProductOutputQuery
>
type ParsedMeasuredIndicator = ReturnType<
  typeof parseFullMeasuredIndicator<
    InferQueryModel<'indicator', typeof fullMeasuredIndicatorQuery>
  >
>
type ParsedDerivedIndicator = ReturnType<
  typeof parseBaseDerivedIndicator<
    InferQueryModel<'derivedIndicator', typeof baseDerivedIndicatorQuery>
  >
>
type ParsedBaseProductOutput = Omit<
  BaseProductOutputRecord,
  'indicator' | 'derivedIndicator'
> & {
  indicator: ParsedMeasuredIndicator | ParsedDerivedIndicator | null
  derivedIndicator?: undefined
}

const parseBaseProductOutput = (
  record: BaseProductOutputRecord,
): ParsedBaseProductOutput => {
  return {
    ...record,
    derivedIndicator: undefined,
    indicator: record.indicator
      ? parseFullMeasuredIndicator(record.indicator)
      : record.derivedIndicator
        ? parseBaseDerivedIndicator(record.derivedIndicator)
        : null,
  }
}

const parseFullProductOutput = <
  T extends InferQueryModel<'productOutput', typeof fullProductOutputQuery>,
>(
  record: T,
) => {
  return {
    ...parseBaseProductOutput(record),
    dependencyProductOutputs:
      record.dependencyProductOutputs?.map((dependencyProductOutput) => ({
        ...dependencyProductOutput,
        dependencyProductOutput: parseBaseProductOutput(
          dependencyProductOutput.dependencyProductOutput,
        ),
      })) ?? [],
  }
}

const fetchBaseProductOutput = async (id: string) => {
  const record = await db.query.productOutput.findFirst({
    where: (productOutput, { eq }) => eq(productOutput.id, id),
    ...baseProductOutputQuery,
  })

  return record ? parseBaseProductOutput(record) : null
}

const fetchBaseProductOutputOrThrow = async (id: string) => {
  const record = await fetchBaseProductOutput(id)

  if (!record) {
    throw productOutputNotFoundError()
  }

  return record
}

const fetchFullProductOutput = async (id: string) => {
  const record = await db.query.productOutput.findFirst({
    where: (productOutput, { eq }) => eq(productOutput.id, id),
    ...fullProductOutputQuery,
  })

  return record ? parseFullProductOutput(record) : null
}

const fetchFullProductOutputOrThrow = async (id: string) => {
  const record = await fetchFullProductOutput(id)

  if (!record) {
    throw productOutputNotFoundError()
  }

  return record
}

const parseCsvFile = async (file: File) => {
  const text = await file.text()

  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })

  if (result.errors.length) {
    throw new ServerError({
      statusCode: 400,
      message: 'Invalid CSV upload',
      description: result.errors[0]?.message ?? 'Failed to parse CSV file',
    })
  }

  const columns = result.meta.fields ?? []

  if (!columns.length) {
    throw new ServerError({
      statusCode: 400,
      message: 'Invalid CSV upload',
      description: 'CSV is missing a header row',
    })
  }

  const rows = result.data
    .map((row) => {
      const normalized: Record<string, string> = {}
      columns.forEach((column) => {
        const value = row[column]
        normalized[column] =
          value === null || value === undefined ? '' : String(value)
      })
      return normalized
    })
    .filter((row) =>
      Object.values(row).some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      ),
    )

  if (!rows.length) {
    throw new ServerError({
      statusCode: 400,
      message: 'Invalid CSV upload',
      description: 'CSV does not contain any data rows',
    })
  }

  return {
    columns,
    rows,
  }
}

const normalizeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'Retrieve a product output.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:productOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a product output.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductOutputSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product output not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch product output'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      // TODO: Use fetchFullProductOutputOrThrow instead
      const record = await fetchBaseProductOutputOrThrow(id)

      const geometryOutput = record.geometryOutput
        ? await fetchFullGeometryOutputOrThrow(record.geometryOutput.id)
        : undefined

      return generateJsonResponse(c, { ...record, geometryOutput }, 200)
    },
  )
  .openapi(
    createRoute({
      description: 'Create a product output.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:productOutput' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createProductOutputSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a product output.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseProductOutputSchema),
            },
          },
        },
        400: jsonErrorResponse('Time point is not a valid date'),
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create product output'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const timePointDate = new Date(payload.timePoint)

      if (Number.isNaN(timePointDate.valueOf())) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to create productOutput',
          description: 'Time point is not a valid date',
        })
      }

      const [newProductOutput] = await db
        .insert(productOutput)
        .values(createPayload({ ...payload, timePoint: timePointDate }))
        .returning()

      if (!newProductOutput) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create productOutput',
          description: 'Product output insert did not return a record',
        })
      }

      const record = await fetchBaseProductOutputOrThrow(newProductOutput.id)

      return generateJsonResponse(c, record, 201, 'Product output created')
    },
  )
  .openapi(
    createRoute({
      description:
        'Create multiple product outputs, for a given product run, indicator, and time point.',
      method: 'post',
      path: '/bulk',
      middleware: [authMiddleware({ permission: 'write:productOutput' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createManyProductOutputSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description:
            'Create multiple product outputs. This allows creating multiple outputs for the same time, indicator, and product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.array(baseProductOutputSchema)),
            },
          },
        },
        400: jsonErrorResponse('Time point is not a valid date'),
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create product output'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const timePointDate = new Date(payload.timePoint)

      if (Number.isNaN(timePointDate.valueOf())) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to create productOutput',
          description: 'Time point is not a valid date',
        })
      }

      const { outputs, ...rest } = payload

      const newProductOutputs = await db
        .insert(productOutput)
        .values(
          outputs.map((output) =>
            createPayload({ ...output, ...rest, timePoint: timePointDate }),
          ),
        )
        .returning()

      const ids = newProductOutputs.map((output) => output.id)

      const fullRecords = ids.length
        ? await db.query.productOutput.findMany({
            ...baseProductOutputQuery,
            where: inArray(productOutput.id, ids),
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
            message: 'Failed to retrieve product outputs',
            description: `Product output with ID ${id} not found after creation`,
          })
        }

        return {
          ...record,
          indicator: record.indicator
            ? parseFullMeasuredIndicator(record.indicator)
            : record.derivedIndicator
              ? parseBaseDerivedIndicator(record.derivedIndicator)
              : null,
        }
      })

      return generateJsonResponse(
        c,
        orderedRecords,
        201,
        'Product output created',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Import product outputs from a CSV file.',
      method: 'post',
      path: '/import',
      middleware: [authMiddleware({ permission: 'write:productOutput' })],
      request: {
        body: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: importProductOutputsSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully imported product outputs from CSV.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  productRunId: z.string(),
                  productId: z.string().optional(),
                  insertedCount: z.number().int(),
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
        400: jsonErrorResponse('Invalid CSV import payload'),
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to import product outputs'),
      },
    }),
    async (c) => {
      const { productRunId, geometryColumn, indicatorMappings, csvFile } =
        c.req.valid('form')

      const productRunRecord = await db.query.productRun.findFirst({
        where: (productRunTable, { eq }) =>
          eq(productRunTable.id, productRunId),
        columns: {
          id: true,
          productId: true,
          geometriesRunId: true,
        },
      })

      if (!productRunRecord) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to import product outputs',
          description: 'Product run not found',
        })
      }

      if (!productRunRecord.geometriesRunId) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to import product outputs',
          description:
            'Product run is not linked to a geometries run, so geometry outputs cannot be resolved',
        })
      }

      const { columns, rows } = await parseCsvFile(csvFile)

      if (!columns.includes(geometryColumn)) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to import product outputs',
          description: `Column "${geometryColumn}" was not found in the CSV header`,
        })
      }

      for (const mapping of indicatorMappings) {
        if (!columns.includes(mapping.column)) {
          throw new ServerError({
            statusCode: 400,
            message: 'Failed to import product outputs',
            description: `Column "${mapping.column}" was not found in the CSV header`,
          })
        }
      }

      const geometryIdPrefix = productRunRecord.geometriesRunId

      const geometryIdentifiers = new Set<string>()
      rows.forEach((row) => {
        const localId = normalizeCsvValue(row[geometryColumn])
        if (localId.length) {
          geometryIdentifiers.add(`${geometryIdPrefix}-${localId}`)
        }
      })

      const knownGeometryOutputs = geometryIdentifiers.size
        ? await db.query.geometryOutput.findMany({
            columns: {
              id: true,
            },
            where: inArray(
              geometryOutput.id,
              Array.from(geometryIdentifiers.values()),
            ),
          })
        : []

      const validGeometryOutputIds = new Set(
        knownGeometryOutputs.map((output) => output.id),
      )

      const pendingOutputs: {
        payload: {
          productRunId: string
          geometryOutputId: string
          indicatorId: string
          value: number
          timePoint: Date
        }
        context: {
          rowNumber: number
          column: string
        }
      }[] = []
      const warnings: { message: string; description?: string }[] = []

      rows.forEach((row, rowIndex) => {
        const localGeometryId = normalizeCsvValue(row[geometryColumn])

        if (!localGeometryId.length) {
          warnings.push({
            message: `Row ${rowIndex + 1} geometry column "${geometryColumn}" was empty.`,
            description: 'Row: ' + JSON.stringify(row, null, 2),
          })
          return
        }

        const geometryOutputId = `${geometryIdPrefix}-${localGeometryId}`

        if (!validGeometryOutputIds.has(geometryOutputId)) {
          warnings.push({
            message: `Row ${rowIndex + 1} referenced geometry output "${geometryOutputId}" that does not exist for geometries run ${geometryIdPrefix}.`,
            description: 'Row: ' + JSON.stringify(row, null, 2),
          })
          return
        }

        indicatorMappings.forEach((mapping) => {
          const rawValue = row[mapping.column]
          const timePointDate = new Date(mapping.timePoint)
          const normalizedValue = normalizeCsvValue(rawValue)
          const numericValue = Number(normalizedValue)
          if (!Number.isFinite(numericValue)) {
            warnings.push({
              message: `Row ${rowIndex + 1} value in column "${mapping.column}" was missing or could not be converted to a number. Value: "${normalizedValue}"`,
              description: 'Row: ' + JSON.stringify(row, null, 2),
            })
            return
          }

          pendingOutputs.push({
            payload: {
              productRunId,
              geometryOutputId,
              indicatorId: mapping.indicatorId,
              value: numericValue,
              timePoint: timePointDate,
            },
            context: {
              rowNumber: rowIndex + 1,
              column: mapping.column,
            },
          })
        })
      })

      let insertedCount = 0
      for (const item of pendingOutputs) {
        try {
          await db.insert(productOutput).values(
            createPayload({
              name: undefined,
              id: undefined,
              ...item.payload,
            }),
          )
          insertedCount++
        } catch (error) {
          if (error instanceof DrizzleQueryError) {
            if (error.cause instanceof DatabaseError) {
              throw new ServerError({
                statusCode: 500,
                message: 'Failed to import product outputs',
                description:
                  error.cause.detail ??
                  `Row ${item.context.rowNumber} (${item.context.column}) failed: ${error.cause.message}`,
              })
            }
          }
          throw error
        }
      }

      if (!insertedCount) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to import product outputs',
          description:
            'No product outputs were imported. Please review the warnings and adjust the CSV or mappings.',
        })
      }

      return generateJsonResponse(
        c,
        {
          productRunId: productRunRecord.id,
          productId: productRunRecord.productId ?? undefined,
          insertedCount,
          warnings,
        },
        201,
        'Product outputs imported successfully',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Update a product output.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:productOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateProductOutputSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a product output.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseProductOutputSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product output not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update product output'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(productOutput)
        .set(updatePayload(payload))
        .where(eq(productOutput.id, id))

        .returning()

      if (!record) {
        throw productOutputNotFoundError()
      }

      const fullRecord = await fetchBaseProductOutputOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Product output updated')
    },
  )

export default app
