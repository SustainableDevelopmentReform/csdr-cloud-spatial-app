import { zValidator } from '@hono/zod-validator'
import { count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { variable } from '../schemas'
import { QueryForTable } from '../schemas/util'

// Define shared query configuration
const variableQuery = {
  columns: {
    id: true,
    name: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    displayOrder: true,
    unit: true,
    categoryId: true,
  },
  with: {
    category: {
      columns: {
        id: true,
        name: true,
      },
    },
  },
} satisfies QueryForTable<'variable'>

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
      permission: 'read:variable',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(variable)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.variable.findMany({
        ...variableQuery,
        limit: size,
        offset: skip,
        orderBy: desc(variable.createdAt),
      })

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  .get('/:id', authMiddleware({ permission: 'read:variable' }), async (c) => {
    const id = c.req.param('id')
    const variable = await db.query.variable.findFirst({
      where: (variable, { eq }) => eq(variable.id, id),
      ...variableQuery,
    })

    if (!variable) {
      throw new ServerError({
        statusCode: 404,
        message: 'Failed to get variable',
        description: "variable you're looking for is not found",
      })
    }

    return generateJsonResponse(c, variable)
  })

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
        unit: z.string(),
        categoryId: z.string(),
        displayOrder: z.number().optional(),
      }),
    ),
    authMiddleware({
      permission: 'write:variable',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newVariable = await db
        .insert(variable)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newVariable[0], 201)
    },
  )
  .patch(
    '/:id',
    zValidator(
      'json',
      z.object({
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        unit: z.string().optional(),
        categoryId: z.string().optional(),
        displayOrder: z.number().optional(),
      }),
    ),
    authMiddleware({
      permission: 'write:variable',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(variable)
        .set(data)
        .where(eq(variable.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:variable',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(variable).where(eq(variable.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
