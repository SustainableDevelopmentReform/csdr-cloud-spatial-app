import type pg from 'pg'

const accessControlResourceTables = [
  { key: 'dashboard', tableName: 'dashboard' },
  { key: 'dataset', tableName: 'dataset' },
  { key: 'derivedIndicator', tableName: 'derived_indicator' },
  { key: 'geometries', tableName: 'geometries' },
  { key: 'indicator', tableName: 'indicator' },
  { key: 'indicatorCategory', tableName: 'indicator_category' },
  { key: 'product', tableName: 'product' },
  { key: 'report', tableName: 'report' },
] as const

const createEmptyResourceUpdateCounts = () => ({
  dashboard: 0,
  dataset: 0,
  derivedIndicator: 0,
  geometries: 0,
  indicator: 0,
  indicatorCategory: 0,
  product: 0,
  report: 0,
})

export type AccessControlMigrationReport = {
  resourceUpdateCounts: ReturnType<typeof createEmptyResourceUpdateCounts>
  bootstrapOrganizationAssignmentCount: number
  bootstrapUserAssignmentCount: number
  noOp: boolean
}

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replaceAll('"', '""')}"`

const loadSchemaName = async (
  client: pg.Client,
  schemaName?: string,
): Promise<string> => {
  if (schemaName) {
    return schemaName
  }

  const currentSchemaResult = await client.query<{ currentSchema: string }>(
    'SELECT current_schema() AS "currentSchema"',
  )
  const currentSchema = currentSchemaResult.rows[0]?.currentSchema

  if (!currentSchema) {
    throw new Error('Failed to resolve current database schema')
  }

  return currentSchema
}

const tableExists = async (
  client: pg.Client,
  schemaName: string,
  tableName: string,
): Promise<boolean> => {
  const result = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
      ) AS "exists"
    `,
    [schemaName, tableName],
  )

  return result.rows[0]?.exists === true
}

const loadColumnNames = async (
  client: pg.Client,
  schemaName: string,
  tableName: string,
): Promise<Set<string>> => {
  const result = await client.query<{ columnName: string }>(
    `
      SELECT column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
    `,
    [schemaName, tableName],
  )

  return new Set(result.rows.map((row) => row.columnName))
}

const countRows = async (
  client: pg.Client,
  schemaName: string,
  tableName: string,
  whereSql?: string,
): Promise<number> => {
  const qualifiedTableName = `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`
  const query = whereSql
    ? `SELECT COUNT(*)::int AS "count" FROM ${qualifiedTableName} WHERE ${whereSql}`
    : `SELECT COUNT(*)::int AS "count" FROM ${qualifiedTableName}`
  const result = await client.query<{ count: number }>(query)

  return result.rows[0]?.count ?? 0
}

export const collectAccessControlMigrationReport = async (options: {
  client: pg.Client
  schemaName?: string
}): Promise<AccessControlMigrationReport> => {
  const schemaName = await loadSchemaName(options.client, options.schemaName)
  const resourceUpdateCounts = createEmptyResourceUpdateCounts()
  let bootstrapOrganizationAssignmentCount = 0
  let bootstrapUserAssignmentCount = 0

  for (const resourceTable of accessControlResourceTables) {
    const exists = await tableExists(
      options.client,
      schemaName,
      resourceTable.tableName,
    )

    if (!exists) {
      continue
    }

    const columnNames = await loadColumnNames(
      options.client,
      schemaName,
      resourceTable.tableName,
    )
    const hasOrganizationId = columnNames.has('organization_id')
    const hasCreatedByUserId = columnNames.has('created_by_user_id')
    const hasVisibility = columnNames.has('visibility')

    if (!hasOrganizationId || !hasCreatedByUserId || !hasVisibility) {
      const totalRows = await countRows(
        options.client,
        schemaName,
        resourceTable.tableName,
      )

      resourceUpdateCounts[resourceTable.key] = totalRows

      if (!hasOrganizationId) {
        bootstrapOrganizationAssignmentCount += totalRows
      }

      if (!hasCreatedByUserId) {
        bootstrapUserAssignmentCount += totalRows
      }

      continue
    }

    const rowsNeedingUpdate = await countRows(
      options.client,
      schemaName,
      resourceTable.tableName,
      `
        "organization_id" IS NULL
        OR "created_by_user_id" IS NULL
        OR "visibility" IS NULL
      `,
    )
    const missingOrganizationAssignments = await countRows(
      options.client,
      schemaName,
      resourceTable.tableName,
      '"organization_id" IS NULL',
    )
    const missingUserAssignments = await countRows(
      options.client,
      schemaName,
      resourceTable.tableName,
      '"created_by_user_id" IS NULL',
    )

    resourceUpdateCounts[resourceTable.key] = rowsNeedingUpdate
    bootstrapOrganizationAssignmentCount += missingOrganizationAssignments
    bootstrapUserAssignmentCount += missingUserAssignments
  }

  const noOp =
    Object.values(resourceUpdateCounts).every((count) => count === 0) &&
    bootstrapOrganizationAssignmentCount === 0 &&
    bootstrapUserAssignmentCount === 0

  return {
    resourceUpdateCounts,
    bootstrapOrganizationAssignmentCount,
    bootstrapUserAssignmentCount,
    noOp,
  }
}
