import { relations } from 'drizzle-orm'
import {
  AnyPgColumn,
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
} from 'drizzle-orm/pg-core'
import { multiPolygon } from './customTypes'

export * from './auth'

const baseColumns = {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
    index('dataset_name_idx').on(table.name),
    index('dataset_created_at_idx').on(table.createdAt),
    index('dataset_main_run_id_idx').on(table.mainRunId),
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
    index('geometries_name_idx').on(table.name),
    index('geometries_created_at_idx').on(table.createdAt),
    index('geometries_main_run_id_idx').on(table.mainRunId),
  ],
)

export const timePrecision = pgEnum('time_precision', [
  'hour',
  'day',
  'month',
  'year',
  // 'custom', // TODO: add custom time precision (see productOutput.timeInterval)
])

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

    timePrecision: timePrecision('time_precision').notNull(),
  },
  (table) => [
    index('product_name_idx').on(table.name),
    index('product_dataset_id_idx').on(table.datasetId),
    index('product_geometries_id_idx').on(table.geometriesId),
    index('product_created_at_idx').on(table.createdAt),
    index('product_main_run_id_idx').on(table.mainRunId),
  ],
)

// Run tables - only created for successful runs
export const datasetRun = pgTable(
  'dataset_run',
  {
    ...runBaseColumns,
    dataType: datasetRunDataType('data_type'),
    datasetId: text('dataset_id')
      .notNull()
      .references(() => dataset.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('dataset_run_dataset_idx').on(table.datasetId),
    index('dataset_run_created_at_idx').on(table.createdAt),
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
    index('product_run_dataset_idx').on(table.datasetRunId),
    index('product_run_geometries_idx').on(table.geometriesRunId),
    index('product_run_created_at_idx').on(table.createdAt),
  ],
)

export const productRunAssignedDerivedIndicator = pgTable(
  'product_run_assigned_derived_indicator',
  {
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
    unique('product_run_assigned_derived_indicator_pk').on(
      table.productRunId,
      table.derivedIndicatorId,
    ),
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
    // Will stick to timePoint with timePrecision (see product.timePrecision) for now
    // timeInterval: tstzrange('time_interval'),
  },
  (table) => [
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
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => [
    index('product_output_summary_start_time_idx').on(table.startTime),
    index('product_output_summary_end_time_idx').on(table.endTime),
    index('product_output_summary_last_updated_idx').on(table.lastUpdated),
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
    // Composite index for hierarchical queries with ordering
    index('indicator_category_parent_order_idx').on(
      table.parentId,
      table.displayOrder,
    ),
  ],
)

const indicatorBaseColumns = {
  ...baseColumns,
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
    index('indicator_category_idx').on(table.categoryId),
    index('indicator_name_idx').on(table.name),
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
    index('derived_indicator_category_idx').on(table.categoryId),
    index('derived_indicator_name_idx').on(table.name),
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

export const report = pgTable('report', {
  ...baseColumns,
  content: jsonb('content'),
})

export const dashboard = pgTable('dashboard', {
  ...baseColumns,
  content: jsonb('content').notNull(),
})

// Relations
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
}))

export const productRunAssignedDerivedIndicatorRelations = relations(
  productRunAssignedDerivedIndicator,
  ({ one }) => ({
    productRun: one(productRun, {
      fields: [productRunAssignedDerivedIndicator.productRunId],
      references: [productRun.id],
    }),
    derivedIndicator: one(derivedIndicator, {
      fields: [productRunAssignedDerivedIndicator.derivedIndicatorId],
      references: [derivedIndicator.id],
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
