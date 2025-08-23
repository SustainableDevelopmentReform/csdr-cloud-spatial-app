import { zValidator } from '@hono/zod-validator'
import { count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { variableCategory } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'

// Define shared query configuration
const variableCategoryQuery = {
  columns: {
    ...baseColumns,
    parentId: true,
    displayOrder: true,
  },
  with: {
    parent: {
      columns: baseColumns,
    },
  },
} satisfies QueryForTable<'variableCategory'>

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
      permission: 'read:variableCategory',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(variableCategory)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.variableCategory.findMany({
        ...variableCategoryQuery,
        limit: size,
        offset: skip,
        orderBy: desc(variableCategory.createdAt),
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
    authMiddleware({ permission: 'read:variableCategory' }),
    async (c) => {
      const id = c.req.param('id')
      const variableCategory = await db.query.variableCategory.findFirst({
        where: (variableCategory, { eq }) => eq(variableCategory.id, id),
        ...variableCategoryQuery,
      })

      if (!variableCategory) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get variableCategory',
          description: "variableCategory you're looking for is not found",
        })
      }

      return generateJsonResponse(c, variableCategory)
    },
  )

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
        parentId: z.string().optional(),
        displayOrder: z.number().optional(),
      }),
    ),
    authMiddleware({
      permission: 'write:variableCategory',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newVariableCategory = await db
        .insert(variableCategory)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newVariableCategory[0], 201)
    },
  )
  .patch(
    '/:id',
    zValidator(
      'json',
      z.object({
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        parentId: z.string().optional(),
        displayOrder: z.number().optional(),
      }),
    ),
    authMiddleware({
      permission: 'write:variableCategory',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(variableCategory)
        .set(data)
        .where(eq(variableCategory.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:variableCategory',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(variableCategory).where(eq(variableCategory.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
