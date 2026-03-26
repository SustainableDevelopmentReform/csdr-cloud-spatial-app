'use client'

import {
  anyFullIndicatorSchema,
  anyBaseIndicatorSchema,
  baseDashboardSchema,
  baseDatasetSchema,
  baseGeometriesSchema,
  baseProductSchema,
  baseReportSchema,
  fullDashboardSchema,
  fullDatasetSchema,
  fullGeometriesSchema,
  fullProductSchema,
  fullReportSchema,
  indicatorCategorySchema,
} from '@repo/schemas/crud'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useConfig } from '~/components/providers'

export const explorerResourceSchema = z.enum([
  'dataset',
  'geometries',
  'product',
  'indicator',
  'indicatorCategory',
  'dashboard',
  'report',
])

export type ExplorerResource = z.infer<typeof explorerResourceSchema>

export const explorerPageQuerySchema = z.object({
  id: z.string().optional(),
  page: z.coerce.number().positive().optional(),
  search: z.string().optional(),
  tab: explorerResourceSchema.optional(),
})

const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pageCount: z.number().int(),
    totalCount: z.number().int(),
  })

const countedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    totalCount: z.number().int(),
  })

const responseEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    data: schema,
  })

const datasetListResponseSchema = paginatedResponseSchema(baseDatasetSchema)
const datasetDetailResponseSchema = fullDatasetSchema
const geometriesListResponseSchema =
  paginatedResponseSchema(baseGeometriesSchema)
const geometriesDetailResponseSchema = fullGeometriesSchema
const productListResponseSchema = paginatedResponseSchema(baseProductSchema)
const productDetailResponseSchema = fullProductSchema
const indicatorListResponseSchema = paginatedResponseSchema(
  anyBaseIndicatorSchema,
)
const indicatorDetailResponseSchema = anyFullIndicatorSchema
const indicatorCategoryListResponseSchema = countedResponseSchema(
  indicatorCategorySchema,
)
const indicatorCategoryDetailResponseSchema = indicatorCategorySchema
const dashboardListResponseSchema = paginatedResponseSchema(baseDashboardSchema)
const dashboardDetailResponseSchema = fullDashboardSchema
const reportListResponseSchema = paginatedResponseSchema(baseReportSchema)
const reportDetailResponseSchema = fullReportSchema

export type PublicDatasetListResponse = z.infer<
  typeof datasetListResponseSchema
>
export type PublicDataset = PublicDatasetListResponse['data'][0]
export type PublicDatasetDetail = z.infer<typeof datasetDetailResponseSchema>

export type PublicGeometriesListResponse = z.infer<
  typeof geometriesListResponseSchema
>
export type PublicGeometries = PublicGeometriesListResponse['data'][0]
export type PublicGeometriesDetail = z.infer<
  typeof geometriesDetailResponseSchema
>

export type PublicProductListResponse = z.infer<
  typeof productListResponseSchema
>
export type PublicProduct = PublicProductListResponse['data'][0]
export type PublicProductDetail = z.infer<typeof productDetailResponseSchema>

export type PublicIndicatorListResponse = z.infer<
  typeof indicatorListResponseSchema
>
export type PublicIndicator = PublicIndicatorListResponse['data'][0]
export type PublicIndicatorDetail = z.infer<
  typeof indicatorDetailResponseSchema
>

export type PublicIndicatorCategoryListResponse = z.infer<
  typeof indicatorCategoryListResponseSchema
>
export type PublicIndicatorCategory =
  PublicIndicatorCategoryListResponse['data'][0]
export type PublicIndicatorCategoryDetail = z.infer<
  typeof indicatorCategoryDetailResponseSchema
>

export type PublicDashboardListResponse = z.infer<
  typeof dashboardListResponseSchema
>
export type PublicDashboard = PublicDashboardListResponse['data'][0]
export type PublicDashboardDetail = z.infer<
  typeof dashboardDetailResponseSchema
>

export type PublicReportListResponse = z.infer<typeof reportListResponseSchema>
export type PublicReport = PublicReportListResponse['data'][0]
export type PublicReportDetail = z.infer<typeof reportDetailResponseSchema>

const explorerQueryKeys = {
  dashboard: (query: z.infer<typeof explorerPageQuerySchema> | undefined) =>
    ['explorer', 'dashboard', query] as const,
  dashboardDetail: (dashboardId: string | undefined) =>
    ['explorer', 'dashboard', 'detail', dashboardId] as const,
  dataset: (query: z.infer<typeof explorerPageQuerySchema> | undefined) =>
    ['explorer', 'dataset', query] as const,
  datasetDetail: (datasetId: string | undefined) =>
    ['explorer', 'dataset', 'detail', datasetId] as const,
  geometries: (query: z.infer<typeof explorerPageQuerySchema> | undefined) =>
    ['explorer', 'geometries', query] as const,
  geometriesDetail: (geometriesId: string | undefined) =>
    ['explorer', 'geometries', 'detail', geometriesId] as const,
  indicator: (query: z.infer<typeof explorerPageQuerySchema> | undefined) =>
    ['explorer', 'indicator', query] as const,
  indicatorCategory: (
    query: z.infer<typeof explorerPageQuerySchema> | undefined,
  ) => ['explorer', 'indicator-category', query] as const,
  indicatorCategoryDetail: (indicatorCategoryId: string | undefined) =>
    ['explorer', 'indicator-category', 'detail', indicatorCategoryId] as const,
  indicatorDetail: (indicatorId: string | undefined) =>
    ['explorer', 'indicator', 'detail', indicatorId] as const,
  product: (query: z.infer<typeof explorerPageQuerySchema> | undefined) =>
    ['explorer', 'product', query] as const,
  productDetail: (productId: string | undefined) =>
    ['explorer', 'product', 'detail', productId] as const,
  report: (query: z.infer<typeof explorerPageQuerySchema> | undefined) =>
    ['explorer', 'report', query] as const,
  reportDetail: (reportId: string | undefined) =>
    ['explorer', 'report', 'detail', reportId] as const,
}

const readErrorMessage = async (response: Response) => {
  const payload = await response.json().catch(() => null)

  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return 'Request failed'
}

const buildListUrl = (options: {
  apiBaseUrl: string
  path:
    | '/api/v0/public/dashboard'
    | '/api/v0/public/dataset'
    | '/api/v0/public/geometries'
    | '/api/v0/public/indicator'
    | '/api/v0/public/indicator-category'
    | '/api/v0/public/product'
    | '/api/v0/public/report'
  query: z.infer<typeof explorerPageQuerySchema> | undefined
}) => {
  const searchParams = new URLSearchParams()

  if (options.query?.page) {
    searchParams.set('page', String(options.query.page))
  }
  if (options.query?.search) {
    searchParams.set('search', options.query.search)
  }
  searchParams.set('size', '12')

  const queryString = searchParams.toString()

  return `${options.apiBaseUrl}${options.path}${queryString ? `?${queryString}` : ''}`
}

const requestExplorerList = async <T>(options: {
  apiBaseUrl: string
  path:
    | '/api/v0/public/dashboard'
    | '/api/v0/public/dataset'
    | '/api/v0/public/geometries'
    | '/api/v0/public/indicator'
    | '/api/v0/public/indicator-category'
    | '/api/v0/public/product'
    | '/api/v0/public/report'
  query: z.infer<typeof explorerPageQuerySchema> | undefined
  schema: z.ZodSchema<T>
}) => {
  const response = await fetch(buildListUrl(options), {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = await response.json()
  return responseEnvelope(options.schema).parse(payload).data
}

const requestExplorerDetail = async <T>(options: {
  apiBaseUrl: string
  path:
    | '/api/v0/public/dashboard'
    | '/api/v0/public/dataset'
    | '/api/v0/public/geometries'
    | '/api/v0/public/indicator'
    | '/api/v0/public/indicator-category'
    | '/api/v0/public/product'
    | '/api/v0/public/report'
  resourceId: string
  schema: z.ZodSchema<T>
}) => {
  const response = await fetch(
    `${options.apiBaseUrl}${options.path}/${options.resourceId}`,
    {
      credentials: 'include',
    },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = await response.json()
  return responseEnvelope(options.schema).parse(payload).data
}

export const usePublicDatasets = (
  query: z.infer<typeof explorerPageQuerySchema> | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.dataset(query),
    queryFn: () =>
      requestExplorerList({
        apiBaseUrl,
        path: '/api/v0/public/dataset',
        query,
        schema: datasetListResponseSchema,
      }),
    enabled,
  })
}

export const usePublicDataset = (
  datasetId: string | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.datasetDetail(datasetId),
    queryFn: async () => {
      if (!datasetId) {
        return null
      }

      return requestExplorerDetail({
        apiBaseUrl,
        path: '/api/v0/public/dataset',
        resourceId: datasetId,
        schema: datasetDetailResponseSchema,
      })
    },
    enabled: enabled && datasetId !== undefined,
  })
}

export const usePublicGeometries = (
  query: z.infer<typeof explorerPageQuerySchema> | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.geometries(query),
    queryFn: () =>
      requestExplorerList({
        apiBaseUrl,
        path: '/api/v0/public/geometries',
        query,
        schema: geometriesListResponseSchema,
      }),
    enabled,
  })
}

export const usePublicGeometriesDetail = (
  geometriesId: string | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.geometriesDetail(geometriesId),
    queryFn: async () => {
      if (!geometriesId) {
        return null
      }

      return requestExplorerDetail({
        apiBaseUrl,
        path: '/api/v0/public/geometries',
        resourceId: geometriesId,
        schema: geometriesDetailResponseSchema,
      })
    },
    enabled: enabled && geometriesId !== undefined,
  })
}

export const usePublicProducts = (
  query: z.infer<typeof explorerPageQuerySchema> | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.product(query),
    queryFn: () =>
      requestExplorerList({
        apiBaseUrl,
        path: '/api/v0/public/product',
        query,
        schema: productListResponseSchema,
      }),
    enabled,
  })
}

export const usePublicProduct = (
  productId: string | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.productDetail(productId),
    queryFn: async () => {
      if (!productId) {
        return null
      }

      return requestExplorerDetail({
        apiBaseUrl,
        path: '/api/v0/public/product',
        resourceId: productId,
        schema: productDetailResponseSchema,
      })
    },
    enabled: enabled && productId !== undefined,
  })
}

export const usePublicIndicators = (
  query: z.infer<typeof explorerPageQuerySchema> | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.indicator(query),
    queryFn: () =>
      requestExplorerList({
        apiBaseUrl,
        path: '/api/v0/public/indicator',
        query,
        schema: indicatorListResponseSchema,
      }),
    enabled,
  })
}

export const usePublicIndicator = (
  indicatorId: string | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.indicatorDetail(indicatorId),
    queryFn: async () => {
      if (!indicatorId) {
        return null
      }

      return requestExplorerDetail({
        apiBaseUrl,
        path: '/api/v0/public/indicator',
        resourceId: indicatorId,
        schema: indicatorDetailResponseSchema,
      })
    },
    enabled: enabled && indicatorId !== undefined,
  })
}

export const usePublicIndicatorCategories = (
  query: z.infer<typeof explorerPageQuerySchema> | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.indicatorCategory(query),
    queryFn: () =>
      requestExplorerList({
        apiBaseUrl,
        path: '/api/v0/public/indicator-category',
        query,
        schema: indicatorCategoryListResponseSchema,
      }),
    enabled,
  })
}

export const usePublicIndicatorCategory = (
  indicatorCategoryId: string | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.indicatorCategoryDetail(indicatorCategoryId),
    queryFn: async () => {
      if (!indicatorCategoryId) {
        return null
      }

      return requestExplorerDetail({
        apiBaseUrl,
        path: '/api/v0/public/indicator-category',
        resourceId: indicatorCategoryId,
        schema: indicatorCategoryDetailResponseSchema,
      })
    },
    enabled: enabled && indicatorCategoryId !== undefined,
  })
}

export const usePublicDashboards = (
  query: z.infer<typeof explorerPageQuerySchema> | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.dashboard(query),
    queryFn: () =>
      requestExplorerList({
        apiBaseUrl,
        path: '/api/v0/public/dashboard',
        query,
        schema: dashboardListResponseSchema,
      }),
    enabled,
  })
}

export const usePublicDashboard = (
  dashboardId: string | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.dashboardDetail(dashboardId),
    queryFn: async () => {
      if (!dashboardId) {
        return null
      }

      return requestExplorerDetail({
        apiBaseUrl,
        path: '/api/v0/public/dashboard',
        resourceId: dashboardId,
        schema: dashboardDetailResponseSchema,
      })
    },
    enabled: enabled && dashboardId !== undefined,
  })
}

export const usePublicReports = (
  query: z.infer<typeof explorerPageQuerySchema> | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.report(query),
    queryFn: () =>
      requestExplorerList({
        apiBaseUrl,
        path: '/api/v0/public/report',
        query,
        schema: reportListResponseSchema,
      }),
    enabled,
  })
}

export const usePublicReport = (
  reportId: string | undefined,
  enabled: boolean,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: explorerQueryKeys.reportDetail(reportId),
    queryFn: async () => {
      if (!reportId) {
        return null
      }

      return requestExplorerDetail({
        apiBaseUrl,
        path: '/api/v0/public/report',
        resourceId: reportId,
        schema: reportDetailResponseSchema,
      })
    },
    enabled: enabled && reportId !== undefined,
  })
}
