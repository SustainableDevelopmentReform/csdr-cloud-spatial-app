export const DASHBOARDS_BASE_PATH = '/console/dashboard'
export const DATA_LIBRARY_BASE_PATH = '/console/library'
export const DATA_LIBRARY_SOURCE_PARAM = 'from'
export const DATA_LIBRARY_SOURCE_VALUE = 'library'
export const RESOURCE_SECTION_PARAM = 'section'
export const RESOURCE_SUB_SECTION_PARAM = 'sub'
export const DATASETS_BASE_PATH = '/console/dataset'
export const DATASETS_RUNS_BASE_PATH = '/console/dataset/run'
export const GEOMETRIES_BASE_PATH = '/console/geometries'
export const GEOMETRIES_RUNS_BASE_PATH = '/console/geometries/run'
export const GEOMETRIES_RUNS_OUTPUTS_BASE_PATH = '/console/geometries/output'
export const PRODUCTS_BASE_PATH = '/console/product'
export const PRODUCTS_RUNS_BASE_PATH = '/console/product/run'
export const PRODUCTS_RUNS_OUTPUTS_BASE_PATH = '/console/product/output'
export const REPORTS_BASE_PATH = '/console/report'
export const INDICATORS_BASE_PATH = '/console/indicator'
export const INDICATORS_DERIVED_BASE_PATH = '/console/indicator/derived'
export const INDICATORS_MEASURED_BASE_PATH = '/console/indicator/measured'
export const SUPER_ADMIN_AUDIT_LOGS_BASE_PATH =
  '/console/super-admin/audit-logs'
export const SUPER_ADMIN_ORGANIZATIONS_BASE_PATH =
  '/console/super-admin/organizations'
export const USERS_BASE_PATH = '/console/super-admin/users'
export const WORKSPACE_BASE_PATH = '/console/workspace'
export const LOGS_BASE_PATH = '/console/logs'
export const LOGIN_BASE_PATH = '/login'
export const ACCOUNT_DETAILS_BASE_PATH = '/console/me/account'
export const API_KEYS_BASE_PATH = '/console/me/api-keys'
export const TWO_FACTOR_BASE_PATH = '/console/me/two-factor'

export const isDataLibrarySource = (value: string | null | undefined) =>
  value === DATA_LIBRARY_SOURCE_VALUE

export const withQueryParams = (
  href: string,
  params: Record<string, string | null | undefined>,
) => {
  const hashIndex = href.indexOf('#')
  const hrefWithoutHash = hashIndex === -1 ? href : href.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex)
  const queryIndex = hrefWithoutHash.indexOf('?')
  const path =
    queryIndex === -1 ? hrefWithoutHash : hrefWithoutHash.slice(0, queryIndex)
  const query = queryIndex === -1 ? '' : hrefWithoutHash.slice(queryIndex + 1)
  const searchParams = new URLSearchParams(query)

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      searchParams.delete(key)
      return
    }

    searchParams.set(key, value)
  })

  const nextQuery = searchParams.toString()

  return `${path}${nextQuery ? `?${nextQuery}` : ''}${hash}`
}

export const withDataLibrarySource = (href: string) =>
  withQueryParams(href, {
    [DATA_LIBRARY_SOURCE_PARAM]: DATA_LIBRARY_SOURCE_VALUE,
  })

export const withResourceSection = (
  href: string,
  section: string,
  subSection?: string | null,
) => {
  const params: Record<string, string | null | undefined> = {
    [RESOURCE_SECTION_PARAM]: section,
  }

  if (subSection !== undefined) {
    params[RESOURCE_SUB_SECTION_PARAM] = subSection
  }

  return withQueryParams(href, params)
}
