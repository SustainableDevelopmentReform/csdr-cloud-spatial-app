import type { Env } from 'hono'
import {
  OpenAPIHono,
  type OpenAPIHonoOptions,
  z,
  type Hook,
} from '@hono/zod-openapi'
import { generateJsonResponse } from './response'

const defaultValidationHook: Hook<any, any, any, Response | undefined> = (
  result,
  c,
) => {
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
      code: issue.code,
    }))

    return generateJsonResponse(
      c,
      {
        issues,
      },
      422,
      'Validation Error',
    )
  }
}

export const ValidationIssueSchema = z
  .object({
    path: z.string().openapi({ example: 'json.name' }),
    message: z.string().openapi({ example: 'Required' }),
    code: z.string().openapi({ example: 'invalid_type' }),
  })
  .openapi('ValidationIssue')

export const ValidationErrorResponseSchema = z
  .object({
    statusCode: z.number().int().openapi({ example: 422 }),
    message: z.string().openapi({ example: 'Validation Error' }),
    data: z
      .object({
        issues: z.array(ValidationIssueSchema),
      })
      .openapi({ description: 'Collection of validation issues' }),
  })
  .openapi('ValidationErrorResponse')

export const BaseResponseSchema = z
  .object({
    statusCode: z.number().int().openapi({ example: 200 }),
    message: z.string().openapi({ example: 'OK' }),
    data: z.any().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .openapi('BaseResponse')

export const createResponseSchema = <T extends z.ZodTypeAny>(schema: T) =>
  BaseResponseSchema.extend({
    data: schema,
  })

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  schema: T,
  name?: string,
) =>
  createResponseSchema(
    z
      .object({
        pageCount: z.number().int().openapi({ example: 5 }),
        totalCount: z.number().int().openapi({ example: 25 }),
        data: z.array(schema),
      })
      .openapi(name ?? 'PaginatedPayload'),
  )

export const PaginationQuerySchema = z
  .object({
    page: z
      .number()
      .int()
      .positive()
      .optional()
      .openapi({
        param: {
          name: 'page',
          in: 'query',
        },
        example: 1,
      }),
    size: z
      .number()
      .int()
      .positive()
      .optional()
      .openapi({
        param: {
          name: 'size',
          in: 'query',
        },
        example: 10,
      }),
  })
  .openapi('PaginationQuery')

export const validationErrorResponse = {
  description: 'Validation error',
  content: {
    'application/json': {
      schema: ValidationErrorResponseSchema,
    },
  },
} as const

export const jsonErrorResponse = (
  description: string,
  schema: z.ZodTypeAny = BaseResponseSchema,
) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
})

type CreateAppOptions<E extends Env> = OpenAPIHonoOptions<E> & {
  strict?: boolean
  router?: any
}

export const createOpenAPIApp = <E extends Env = Env>(
  options: CreateAppOptions<E> = {},
) =>
  new OpenAPIHono<E>({
    ...options,
    defaultHook: options.defaultHook ?? defaultValidationHook,
  })

export { z }
