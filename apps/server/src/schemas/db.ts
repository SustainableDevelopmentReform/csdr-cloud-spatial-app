import { relations, sql } from 'drizzle-orm'
import {
  AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  ReferenceConfig,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { organization, user } from './auth'
import { multiPolygon, polygon } from './customTypes'

export * from './auth'

const baseColumns = {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}

export const resourceVisibilityEnum = pgEnum('resource_visibility', [
  'private',
  'public',
  'global',
])

const topLevelAclColumns = {
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, {
      onDelete: 'restrict',
    }),
  createdByUserId: text('created_by_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  visibility: resourceVisibilityEnum('visibility').default('private').notNull(),
}

export const datasetRunDataType = pgEnum('dataset_run_data_type', [
  'parquet',
  'geoparquet',
  'stac-geoparquet',
  'zarr',
])
export const geometriesRunDataType = pgEnum('geometries_run_data_type', [
  'geoparquet',
])
export const productRunDataType = pgEnum('product_run_data_type', ['parquet'])

const runBaseColumns = {
  ...baseColumns,
  imageCode: text('image_code'),
  imageTag: text('image_tag'),
  provenanceJson: jsonb('provenance_json'),
  provenanceUrl: text('provenance_url'),
  dataUrl: text('data_url'),
  dataSize: integer('data_size'),
  dataEtag: text('data_etag'),
}

// DATA RELATED TABLES
const coreBaseResourceColumns = (mainRunRelation: ReferenceConfig['ref']) => ({
  ...baseColumns,
  ...topLevelAclColumns,
  mainRunId: text('main_run_id').references(mainRunRelation, {
    onDelete: 'cascade',
  }),
})

export const dataset = pgTable(
  'dataset',
  {
    ...coreBaseResourceColumns((): AnyPgColumn => datasetRun.id),
    sourceUrl: text('source_url'),
    sourceMetadataUrl: text('source_metadata_url'),
  },
  (table) => [
    // Substring search indexes require the pg_trgm extension.
    index('dataset_search_trgm_idx').using(
      'gin',
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('dataset_name_idx').on(table.name),
    index('dataset_created_at_idx').on(table.createdAt),
    index('dataset_main_run_id_idx').on(table.mainRunId),
    index('dataset_organization_id_idx').on(table.organizationId),
    index('dataset_visibility_idx').on(table.visibility),
  ],
)

export const geometries = pgTable(
  'geometries',
  {
    ...coreBaseResourceColumns((): AnyPgColumn => geometriesRun.id),
    sourceUrl: text('source_url'),
    sourceMetadataUrl: text('source_metadata_url'),
  },
  (table) => [
    index('geometries_search_trgm_idx').using(
      'gin',
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('geometries_name_idx').on(table.name),
    index('geometries_created_at_idx').on(table.createdAt),
    index('geometries_main_run_id_idx').on(table.mainRunId),
    index('geometries_organization_id_idx').on(table.organizationId),
    index('geometries_visibility_idx').on(table.visibility),
  ],
)

/** This need more though...
 * For example - how could this be used to run generic workflows for
 */
export const product = pgTable(
  'product',
  {
    ...coreBaseResourceColumns((): AnyPgColumn => productRun.id),

    datasetId: text('dataset_id').references(() => dataset.id, {
      onDelete: 'cascade',
    }),
    geometriesId: text('geometries_id').references(() => geometries.id, {
      onDelete: 'cascade',
    }),
  },
  (table) => [
    index('product_search_trgm_idx').using(
      'gin',
      table.id.op('gin_trgm_ops'),
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('product_name_idx').on(table.name),
    index('product_dataset_id_idx').on(table.datasetId),
    index('product_geometries_id_idx').on(table.geometriesId),
    index('product_created_at_idx').on(table.createdAt),
    index('product_main_run_id_idx').on(table.mainRunId),
    index('product_organization_id_idx').on(table.organizationId),
    index('product_visibility_idx').on(table.visibility),
  ],
)

// Run tables - only created for successful runs
export const datasetRun = pgTable(
  'dataset_run',
  {
    ...runBaseColumns,
    dataType: datasetRunDataType('data_type'),
    bounds: polygon('bounds', { srid: 4326 }),
    datasetId: text('dataset_id')
      .notNull()
      .references(() => dataset.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('dataset_run_search_trgm_idx').using(
      'gin',
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('dataset_run_dataset_idx').on(table.datasetId),
    index('dataset_run_created_at_idx').on(table.createdAt),
    index('dataset_run_bounds_gist_idx').using('gist', table.bounds),
  ],
)

export const geometriesRun = pgTable(
  'geometries_run',
  {
    ...runBaseColumns,
    dataPmtilesUrl: text('data_pmtiles_url'),
    dataType: geometriesRunDataType('data_type'),
    geometriesId: text('geometries_id')
      .notNull()
      .references(() => geometries.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('geometries_run_search_trgm_idx').using(
      'gin',
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('geometries_run_geometries_idx').on(table.geometriesId),
    index('geometries_run_created_at_idx').on(table.createdAt),
  ],
)

export const geometryOutput = pgTable(
  'geometry_output',
  {
    ...baseColumns,
    geometriesRunId: text('geometries_run_id')
      .notNull()
      .references(() => geometriesRun.id, { onDelete: 'cascade' }),
    properties: jsonb('properties'),

    geometry: multiPolygon('geometry', { srid: 4326 }).notNull(),
  },
  (table) => [
    index('geometry_geometries_run_idx').on(table.geometriesRunId),
    index('geometry_geometry_gist_idx').using('gist', table.geometry),
    // Ensure unique geometry names per run
    unique('geometry_name_per_run').on(table.geometriesRunId, table.name),
  ],
)

export const productRun = pgTable(
  'product_run',
  {
    ...runBaseColumns,
    dataType: productRunDataType('data_type'),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    datasetRunId: text('dataset_run_id').references(() => datasetRun.id, {
      onDelete: 'cascade',
    }),
    geometriesRunId: text('geometries_run_id').references(
      () => geometriesRun.id,
      { onDelete: 'cascade' },
    ),
  },
  (table) => [
    index('product_run_search_trgm_idx').using(
      'gin',
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('product_run_product_created_at_idx').on(
      table.productId,
      table.createdAt,
    ),
    index('product_run_dataset_idx').on(table.datasetRunId),
    index('product_run_geometries_idx').on(table.geometriesRunId),
    index('product_run_created_at_idx').on(table.createdAt),
  ],
)

export const productRunAssignedDerivedIndicator = pgTable(
  'product_run_assigned_derived_indicator',
  {
    id: text('id').primaryKey(),
    productRunId: text('product_run_id')
      .notNull()
      .references(() => productRun.id, { onDelete: 'cascade' }),
    derivedIndicatorId: text('derived_indicator_id')
      .notNull()
      .references(() => derivedIndicator.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('product_run_assigned_derived_indicator_product_run_idx').on(
      table.productRunId,
    ),
    index('product_run_assigned_derived_indicator_derived_indicator_idx').on(
      table.derivedIndicatorId,
    ),
    unique('product_run_assigned_derived_indicator_unique').on(
      table.productRunId,
      table.derivedIndicatorId,
    ),
  ],
)

// Junction table for tracking which product run each dependency indicator comes from
// Using shorter table name to avoid PostgreSQL's 63-char identifier limit
export const productRunAssignedDerivedIndicatorDependency = pgTable(
  'assigned_derived_indicator_dep',
  {
    assignedDerivedIndicatorId: text('assigned_derived_indicator_id')
      .notNull()
      .references(() => productRunAssignedDerivedIndicator.id, {
        onDelete: 'cascade',
      }),
    // The dependency indicator (from derivedIndicatorToIndicator)
    indicatorId: text('indicator_id')
      .notNull()
      .references(() => indicator.id, { onDelete: 'cascade' }),
    // The source product run for this dependency
    sourceProductRunId: text('source_product_run_id')
      .notNull()
      .references(() => productRun.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      columns: [table.assignedDerivedIndicatorId, table.indicatorId],
    }),
    index('assigned_di_dep_assigned_idx').on(table.assignedDerivedIndicatorId),
    index('assigned_di_dep_indicator_idx').on(table.indicatorId),
    index('assigned_di_dep_source_run_idx').on(table.sourceProductRunId),
  ],
)

export const productOutput = pgTable(
  'product_output',
  {
    ...baseColumns,
    productRunId: text('product_run_id')
      .notNull()
      .references(() => productRun.id, { onDelete: 'cascade' }),
    geometryOutputId: text('geometry_output_id').references(
      () => geometryOutput.id,
      { onDelete: 'cascade' },
    ),

    value: numeric('value', { mode: 'number' }).notNull(),
    indicatorId: text('indicator_id').references(() => indicator.id, {
      onDelete: 'cascade',
    }),

    derivedIndicatorId: text('derived_indicator_id').references(
      () => derivedIndicator.id,
      { onDelete: 'cascade' },
    ),

    timePoint: timestamp('time_point', {
      mode: 'date',
      withTimezone: false,
    }).notNull(),
    // Will stick to timePoint for now
    // timeInterval: tstzrange('time_interval'),
  },
  (table) => [
    index('product_output_run_created_at_idx').on(
      table.productRunId,
      table.createdAt,
    ),
    index('product_output_product_run_idx').on(table.productRunId),
    index('product_output_created_at_idx').on(table.createdAt),
    index('product_output_geometry_output_id_idx').on(table.geometryOutputId),
    index('product_output_indicator_id_idx').on(table.indicatorId),
    // Composite index for querying outputs by multiple criteria
    index('product_output_run_indicator_idx').on(
      table.productRunId,
      table.indicatorId,
    ),
    unique(
      'product_output_run_indicator_time_point_geometry_output_id_unique',
    ).on(
      table.productRunId,
      table.indicatorId,
      table.derivedIndicatorId,
      table.timePoint,
      table.geometryOutputId,
    ),
  ],
)

export const productOutputDependency = pgTable(
  'product_output_dependency',
  {
    derivedProductOutputId: text('derived_product_output_id')
      .notNull()
      .references(() => productOutput.id, { onDelete: 'cascade' }),
    dependencyProductOutputId: text('dependency_product_output_id')
      .notNull()
      .references(() => productOutput.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      columns: [table.derivedProductOutputId, table.dependencyProductOutputId],
    }),
    index('product_output_dependency_derived_product_output_idx').on(
      table.derivedProductOutputId,
    ),
    index('product_output_dependency_dependency_product_output_idx').on(
      table.dependencyProductOutputId,
    ),
  ],
)

// Table for product output summaries - automatically maintained via triggers
// This table aggregates product outputs from each product's runs
// to provide temporal ranges and indicator lists for browsing products
export const productOutputSummary = pgTable(
  'product_output_summary',
  {
    productRunId: text('product_run_id')
      .primaryKey()
      .references(() => productRun.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time', {
      mode: 'date',
      withTimezone: false,
    }),
    endTime: timestamp('end_time', {
      mode: 'date',
      withTimezone: false,
    }),
    timePoints: timestamp('time_points', {
      mode: 'date',
      withTimezone: false,
    }).array(),
    outputCount: integer('output_count').notNull().default(0),
    bounds: polygon('bounds', { srid: 4326 }),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => [
    index('product_output_summary_start_time_idx').on(table.startTime),
    index('product_output_summary_end_time_idx').on(table.endTime),
    index('product_output_summary_last_updated_idx').on(table.lastUpdated),
    index('product_output_summary_bounds_gist_idx').using('gist', table.bounds),
  ],
)

// Junction table for many-to-many relationship between productOutputSummary and indicators
export const productOutputSummaryIndicator = pgTable(
  'product_output_summary_indicator',
  {
    productRunId: text('product_run_id')
      .notNull()
      .references(() => productOutputSummary.productRunId, {
        onDelete: 'cascade',
      }),
    indicatorId: text('indicator_id').references(() => indicator.id, {
      onDelete: 'cascade',
    }),

    derivedIndicatorId: text('derived_indicator_id').references(
      () => derivedIndicator.id,
      { onDelete: 'cascade' },
    ),
    // Optional: track aggregated stats per indicator
    minValue: numeric('min_value', { mode: 'number' }),
    maxValue: numeric('max_value', { mode: 'number' }),
    avgValue: numeric('avg_value', { mode: 'number' }),
    count: integer('count').notNull().default(0),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => [
    index('summary_indicator_product_run_idx').on(table.productRunId),
    index('summary_indicator_indicator_idx').on(table.indicatorId),
    index('summary_indicator_derived_indicator_idx').on(
      table.derivedIndicatorId,
    ),
    // Composite primary key for the junction table
    unique('summary_indicator_pk').on(
      table.productRunId,
      table.indicatorId,
      table.derivedIndicatorId,
    ),
  ],
)

// Taxonomy/category tree structure
export const indicatorCategory = pgTable(
  'indicator_category',
  {
    ...baseColumns,
    ...topLevelAclColumns,

    // Tree structure
    parentId: text('parent_id').references(
      (): AnyPgColumn => indicatorCategory.id,
      { onDelete: 'set null' },
    ),

    // TODO: add path
    // path: text('path').notNull(), // '/ecology/coverage'
    displayOrder: integer('display_order').default(0),
  },
  (table) => [
    index('indicator_category_parent_idx').on(table.parentId),
    index('indicator_category_name_idx').on(table.name),
    index('indicator_category_organization_id_idx').on(table.organizationId),
    index('indicator_category_visibility_idx').on(table.visibility),
    // Composite index for hierarchical queries with ordering
    index('indicator_category_parent_order_idx').on(
      table.parentId,
      table.displayOrder,
    ),
  ],
)

const indicatorBaseColumns = {
  ...baseColumns,
  ...topLevelAclColumns,
  unit: text('unit').notNull(),
  displayOrder: integer('display_order').default(0),
  // Link to category
  categoryId: text('category_id').references(() => indicatorCategory.id, {
    onDelete: 'cascade',
  }),
}

export const indicator = pgTable(
  'indicator',
  {
    ...indicatorBaseColumns,
  },
  (table) => [
    index('indicator_search_trgm_idx').using(
      'gin',
      table.id.op('gin_trgm_ops'),
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('indicator_category_idx').on(table.categoryId),
    index('indicator_name_idx').on(table.name),
    index('indicator_organization_id_idx').on(table.organizationId),
    index('indicator_visibility_idx').on(table.visibility),
    // Composite index for listing indicators within a category with ordering
    index('indicator_category_order_idx').on(
      table.categoryId,
      table.displayOrder,
    ),
  ],
)

export const derivedIndicator = pgTable(
  'derived_indicator',
  {
    ...indicatorBaseColumns,
    expression: text('expression').notNull(),
  },
  (table) => [
    index('derived_indicator_search_trgm_idx').using(
      'gin',
      table.id.op('gin_trgm_ops'),
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('derived_indicator_category_idx').on(table.categoryId),
    index('derived_indicator_name_idx').on(table.name),
    index('derived_indicator_organization_id_idx').on(table.organizationId),
    index('derived_indicator_visibility_idx').on(table.visibility),
    // Composite index for listing indicators within a category with ordering
    index('derived_indicator_category_order_idx').on(
      table.categoryId,
      table.displayOrder,
    ),
  ],
)

export const derivedIndicatorToIndicator = pgTable(
  'derived_indicator_to_indicator',
  {
    derivedIndicatorId: text('derived_indicator_id')
      .notNull()
      .references(() => derivedIndicator.id, { onDelete: 'cascade' }),
    indicatorId: text('indicator_id')
      .notNull()
      .references(() => indicator.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.derivedIndicatorId, table.indicatorId] }),
  ],
)

export const report = pgTable(
  'report',
  {
    ...baseColumns,
    ...topLevelAclColumns,
    bounds: polygon('bounds', { srid: 4326 }),
    content: jsonb('content'),
    publishedAt: timestamp('published_at'),
    publishedByUserId: text('published_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    publishedPdfKey: text('published_pdf_key'),
  },
  (table) => [
    index('report_search_trgm_idx').using(
      'gin',
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('report_organization_id_idx').on(table.organizationId),
    index('report_visibility_idx').on(table.visibility),
    index('report_published_at_idx').on(table.publishedAt),
    index('report_bounds_gist_idx').using('gist', table.bounds),
  ],
)

export const dashboard = pgTable(
  'dashboard',
  {
    ...baseColumns,
    ...topLevelAclColumns,
    bounds: polygon('bounds', { srid: 4326 }),
    content: jsonb('content').notNull(),
  },
  (table) => [
    index('dashboard_search_trgm_idx').using(
      'gin',
      table.name.op('gin_trgm_ops'),
      table.description.op('gin_trgm_ops'),
    ),
    index('dashboard_organization_id_idx').on(table.organizationId),
    index('dashboard_visibility_idx').on(table.visibility),
    index('dashboard_bounds_gist_idx').using('gist', table.bounds),
  ],
)

export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    actorUserId: text('actor_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    actorRole: text('actor_role'),
    activeOrganizationId: text('active_organization_id').references(
      () => organization.id,
      {
        onDelete: 'set null',
      },
    ),
    targetOrganizationId: text('target_organization_id').references(
      () => organization.id,
      {
        onDelete: 'set null',
      },
    ),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    action: text('action').notNull(),
    decision: text('decision').notNull(),
    requestPath: text('request_path').notNull(),
    requestMethod: text('request_method').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    details: jsonb('details'),
  },
  (table) => [
    index('audit_log_created_at_idx').on(table.createdAt),
    index('audit_log_target_organization_id_idx').on(
      table.targetOrganizationId,
    ),
    index('audit_log_actor_user_id_idx').on(table.actorUserId),
    index('audit_log_resource_idx').on(table.resourceType, table.resourceId),
  ],
)

export const reportIndicatorUsage = pgTable(
  'report_indicator_usage',
  {
    reportId: text('report_id')
      .notNull()
      .references(() => report.id, { onDelete: 'cascade' }),
    productRunId: text('product_run_id')
      .notNull()
      .references(() => productRun.id),
    indicatorId: text('indicator_id').references(() => indicator.id),
    derivedIndicatorId: text('derived_indicator_id').references(
      () => derivedIndicator.id,
    ),
  },
  (table) => [
    check(
      'report_indicator_usage_indicator_xor_chk',
      sql`(
        ("indicator_id" is not null and "derived_indicator_id" is null)
        or
        ("indicator_id" is null and "derived_indicator_id" is not null)
      )`,
    ),
    index('report_indicator_usage_report_idx').on(table.reportId),
    index('report_indicator_usage_product_run_idx').on(table.productRunId),
    index('report_indicator_usage_indicator_idx').on(table.indicatorId),
    index('report_indicator_usage_derived_indicator_idx').on(
      table.derivedIndicatorId,
    ),
    uniqueIndex('report_indicator_usage_measured_uidx')
      .on(table.reportId, table.productRunId, table.indicatorId)
      .where(sql`${table.indicatorId} is not null`),
    uniqueIndex('report_indicator_usage_derived_uidx')
      .on(table.reportId, table.productRunId, table.derivedIndicatorId)
      .where(sql`${table.derivedIndicatorId} is not null`),
  ],
)

export const dashboardIndicatorUsage = pgTable(
  'dashboard_indicator_usage',
  {
    dashboardId: text('dashboard_id')
      .notNull()
      .references(() => dashboard.id, { onDelete: 'cascade' }),
    productRunId: text('product_run_id')
      .notNull()
      .references(() => productRun.id),
    indicatorId: text('indicator_id').references(() => indicator.id),
    derivedIndicatorId: text('derived_indicator_id').references(
      () => derivedIndicator.id,
    ),
  },
  (table) => [
    check(
      'dashboard_indicator_usage_indicator_xor_chk',
      sql`(
        ("indicator_id" is not null and "derived_indicator_id" is null)
        or
        ("indicator_id" is null and "derived_indicator_id" is not null)
      )`,
    ),
    index('dashboard_indicator_usage_dashboard_idx').on(table.dashboardId),
    index('dashboard_indicator_usage_product_run_idx').on(table.productRunId),
    index('dashboard_indicator_usage_indicator_idx').on(table.indicatorId),
    index('dashboard_indicator_usage_derived_indicator_idx').on(
      table.derivedIndicatorId,
    ),
    uniqueIndex('dashboard_indicator_usage_measured_uidx')
      .on(table.dashboardId, table.productRunId, table.indicatorId)
      .where(sql`${table.indicatorId} is not null`),
    uniqueIndex('dashboard_indicator_usage_derived_uidx')
      .on(table.dashboardId, table.productRunId, table.derivedIndicatorId)
      .where(sql`${table.derivedIndicatorId} is not null`),
  ],
)

// Relations
export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actorUser: one(user, {
    fields: [auditLog.actorUserId],
    references: [user.id],
  }),
}))

export const datasetRelations = relations(dataset, ({ many, one }) => ({
  runs: many(datasetRun),
  mainRun: one(datasetRun, {
    fields: [dataset.mainRunId],
    references: [datasetRun.id],
  }),
  products: many(product),
}))

export const datasetRunRelations = relations(datasetRun, ({ one, many }) => ({
  dataset: one(dataset, {
    fields: [datasetRun.datasetId],
    references: [dataset.id],
  }),
  productRuns: many(productRun),
}))

export const geometriesRelations = relations(geometries, ({ many, one }) => ({
  runs: many(geometriesRun),
  mainRun: one(geometriesRun, {
    fields: [geometries.mainRunId],
    references: [geometriesRun.id],
  }),
  products: many(product),
}))

export const geometriesRunRelations = relations(
  geometriesRun,
  ({ one, many }) => ({
    geometries: one(geometries, {
      fields: [geometriesRun.geometriesId],
      references: [geometries.id],
    }),
    geometryOutputs: many(geometryOutput),
    productRuns: many(productRun),
  }),
)

export const geometryOutputRelations = relations(
  geometryOutput,
  ({ one, many }) => ({
    geometriesRun: one(geometriesRun, {
      fields: [geometryOutput.geometriesRunId],
      references: [geometriesRun.id],
    }),
    productOutputs: many(productOutput),
  }),
)

export const productRelations = relations(product, ({ many, one }) => ({
  runs: many(productRun),
  mainRun: one(productRun, {
    fields: [product.mainRunId],
    references: [productRun.id],
  }),
  dataset: one(dataset, {
    fields: [product.datasetId],
    references: [dataset.id],
  }),
  geometries: one(geometries, {
    fields: [product.geometriesId],
    references: [geometries.id],
  }),
}))

export const productRunRelations = relations(productRun, ({ one, many }) => ({
  product: one(product, {
    fields: [productRun.productId],
    references: [product.id],
  }),
  datasetRun: one(datasetRun, {
    fields: [productRun.datasetRunId],
    references: [datasetRun.id],
  }),
  geometriesRun: one(geometriesRun, {
    fields: [productRun.geometriesRunId],
    references: [geometriesRun.id],
  }),
  productOutputs: many(productOutput),
  outputSummary: one(productOutputSummary, {
    fields: [productRun.id],
    references: [productOutputSummary.productRunId],
  }),
  outputSummaryIndicators: many(productOutputSummaryIndicator),
  assignedDerivedIndicators: many(productRunAssignedDerivedIndicator),
  reportIndicatorUsages: many(reportIndicatorUsage),
  dashboardIndicatorUsages: many(dashboardIndicatorUsage),
}))

export const productRunAssignedDerivedIndicatorRelations = relations(
  productRunAssignedDerivedIndicator,
  ({ one, many }) => ({
    productRun: one(productRun, {
      fields: [productRunAssignedDerivedIndicator.productRunId],
      references: [productRun.id],
    }),
    derivedIndicator: one(derivedIndicator, {
      fields: [productRunAssignedDerivedIndicator.derivedIndicatorId],
      references: [derivedIndicator.id],
    }),
    dependencies: many(productRunAssignedDerivedIndicatorDependency),
  }),
)

export const productRunAssignedDerivedIndicatorDependencyRelations = relations(
  productRunAssignedDerivedIndicatorDependency,
  ({ one }) => ({
    assignedDerivedIndicator: one(productRunAssignedDerivedIndicator, {
      fields: [
        productRunAssignedDerivedIndicatorDependency.assignedDerivedIndicatorId,
      ],
      references: [productRunAssignedDerivedIndicator.id],
    }),
    indicator: one(indicator, {
      fields: [productRunAssignedDerivedIndicatorDependency.indicatorId],
      references: [indicator.id],
    }),
    sourceProductRun: one(productRun, {
      fields: [productRunAssignedDerivedIndicatorDependency.sourceProductRunId],
      references: [productRun.id],
      relationName: 'source_product_run',
    }),
  }),
)

export const productOutputRelations = relations(
  productOutput,
  ({ one, many }) => ({
    productRun: one(productRun, {
      fields: [productOutput.productRunId],
      references: [productRun.id],
    }),
    geometryOutput: one(geometryOutput, {
      fields: [productOutput.geometryOutputId],
      references: [geometryOutput.id],
    }),
    indicator: one(indicator, {
      fields: [productOutput.indicatorId],
      references: [indicator.id],
    }),
    derivedIndicator: one(derivedIndicator, {
      fields: [productOutput.derivedIndicatorId],
      references: [derivedIndicator.id],
    }),
    dependencyProductOutputs: many(productOutputDependency, {
      relationName: 'dependency_product_output',
    }),
  }),
)

export const productOutputDependencyRelations = relations(
  productOutputDependency,
  ({ one }) => ({
    derivedProductOutput: one(productOutput, {
      fields: [productOutputDependency.derivedProductOutputId],
      references: [productOutput.id],
      relationName: 'derived_product_output',
    }),
    dependencyProductOutput: one(productOutput, {
      fields: [productOutputDependency.dependencyProductOutputId],
      references: [productOutput.id],
      relationName: 'dependency_product_output',
    }),
  }),
)

export const indicatorCategoryRelations = relations(
  indicatorCategory,
  ({ one, many }) => ({
    parent: one(indicatorCategory, {
      fields: [indicatorCategory.parentId],
      references: [indicatorCategory.id],
      relationName: 'category_tree',
    }),
    children: many(indicatorCategory, {
      relationName: 'category_tree',
    }),
    indicators: many(indicator),
    derivedIndicators: many(derivedIndicator),
  }),
)

export const indicatorRelations = relations(indicator, ({ one, many }) => ({
  category: one(indicatorCategory, {
    fields: [indicator.categoryId],
    references: [indicatorCategory.id],
  }),
  derivedIndicators: many(derivedIndicatorToIndicator),
  productOutputs: many(productOutput),
  productSummaries: many(productOutputSummaryIndicator),
  assignedDerivedIndicatorDependencies: many(
    productRunAssignedDerivedIndicatorDependency,
  ),
  reportUsages: many(reportIndicatorUsage),
  dashboardUsages: many(dashboardIndicatorUsage),
}))

export const derivedIndicatorRelations = relations(
  derivedIndicator,
  ({ one, many }) => ({
    category: one(indicatorCategory, {
      fields: [derivedIndicator.categoryId],
      references: [indicatorCategory.id],
    }),
    indicators: many(derivedIndicatorToIndicator),
    productOutputs: many(productOutput),
    reportUsages: many(reportIndicatorUsage),
    dashboardUsages: many(dashboardIndicatorUsage),
  }),
)

export const derivedIndicatorToIndicatorRelations = relations(
  derivedIndicatorToIndicator,
  ({ one }) => ({
    derivedIndicator: one(derivedIndicator, {
      fields: [derivedIndicatorToIndicator.derivedIndicatorId],
      references: [derivedIndicator.id],
    }),
    indicator: one(indicator, {
      fields: [derivedIndicatorToIndicator.indicatorId],
      references: [indicator.id],
    }),
  }),
)

export const productOutputSummaryRelations = relations(
  productOutputSummary,
  ({ one, many }) => ({
    productRun: one(productRun, {
      fields: [productOutputSummary.productRunId],
      references: [productRun.id],
    }),
    indicators: many(productOutputSummaryIndicator),
  }),
)

export const productOutputSummaryIndicatorRelations = relations(
  productOutputSummaryIndicator,
  ({ one }) => ({
    productRun: one(productRun, {
      fields: [productOutputSummaryIndicator.productRunId],
      references: [productRun.id],
    }),
    productOutputSummary: one(productOutputSummary, {
      fields: [productOutputSummaryIndicator.productRunId],
      references: [productOutputSummary.productRunId],
    }),
    indicator: one(indicator, {
      fields: [productOutputSummaryIndicator.indicatorId],
      references: [indicator.id],
    }),
    derivedIndicator: one(derivedIndicator, {
      fields: [productOutputSummaryIndicator.derivedIndicatorId],
      references: [derivedIndicator.id],
    }),
  }),
)

export const reportRelations = relations(report, ({ many }) => ({
  indicatorUsages: many(reportIndicatorUsage),
}))

export const dashboardRelations = relations(dashboard, ({ many }) => ({
  indicatorUsages: many(dashboardIndicatorUsage),
}))

export const reportIndicatorUsageRelations = relations(
  reportIndicatorUsage,
  ({ one }) => ({
    report: one(report, {
      fields: [reportIndicatorUsage.reportId],
      references: [report.id],
    }),
    productRun: one(productRun, {
      fields: [reportIndicatorUsage.productRunId],
      references: [productRun.id],
    }),
    indicator: one(indicator, {
      fields: [reportIndicatorUsage.indicatorId],
      references: [indicator.id],
    }),
    derivedIndicator: one(derivedIndicator, {
      fields: [reportIndicatorUsage.derivedIndicatorId],
      references: [derivedIndicator.id],
    }),
  }),
)

export const dashboardIndicatorUsageRelations = relations(
  dashboardIndicatorUsage,
  ({ one }) => ({
    dashboard: one(dashboard, {
      fields: [dashboardIndicatorUsage.dashboardId],
      references: [dashboard.id],
    }),
    productRun: one(productRun, {
      fields: [dashboardIndicatorUsage.productRunId],
      references: [productRun.id],
    }),
    indicator: one(indicator, {
      fields: [dashboardIndicatorUsage.indicatorId],
      references: [indicator.id],
    }),
    derivedIndicator: one(derivedIndicator, {
      fields: [dashboardIndicatorUsage.derivedIndicatorId],
      references: [derivedIndicator.id],
    }),
  }),
)
