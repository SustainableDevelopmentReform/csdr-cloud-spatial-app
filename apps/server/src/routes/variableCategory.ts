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
import { baseCreateResourceSchema } from './util'
import { baseUpdateResourceSchema } from './util'

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
    authMiddleware({
      permission: 'read:variableCategory',
    }),
    async (c) => {
      const totalCount = await db
        .select({
          count: count(),
        })
        .from(variableCategory)

      const data = await db.query.variableCategory.findMany({
        ...variableCategoryQuery,
        orderBy: desc(variableCategory.createdAt),
      })

      return generateJsonResponse(c, {
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
      baseCreateResourceSchema.extend({
        // Name is mandatory
        name: z.string(),
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
      baseUpdateResourceSchema.extend({
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
