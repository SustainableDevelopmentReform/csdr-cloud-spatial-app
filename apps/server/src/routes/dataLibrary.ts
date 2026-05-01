import { createRoute, z } from '@hono/zod-openapi'
import {
  dataLibraryQuerySchema,
  dataLibraryResourceSchema,
} from '@repo/schemas/crud'
import { listDataLibraryResources } from '~/lib/dataLibrary'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'

const app = createOpenAPIApp().openapi(
  createRoute({
    description:
      'Search datasets, boundaries, and products in one data library listing.',
    method: 'get',
    path: '/',
    middleware: [
      authMiddleware({
        permission: 'read:dataset',
        scope: 'explorer',
      }),
    ],
    request: {
      query: dataLibraryQuerySchema,
    },
    responses: {
      200: {
        description:
          'Successfully listed data library resources with pagination metadata.',
        content: {
          'application/json': {
            schema: createResponseSchema(
              z.object({
                pageCount: z.number().int(),
                totalCount: z.number().int(),
                data: z.array(dataLibraryResourceSchema),
              }),
            ),
          },
        },
      },
      401: jsonErrorResponse('Unauthorized'),
      422: validationErrorResponse,
      500: jsonErrorResponse('Failed to list data library resources'),
    },
  }),
  async (c) => {
    const queryParams = c.req.valid('query')
    const dataLibraryResources = await listDataLibraryResources(c, queryParams)

    return generateJsonResponse(c, dataLibraryResources, 200)
  },
)

export default app
