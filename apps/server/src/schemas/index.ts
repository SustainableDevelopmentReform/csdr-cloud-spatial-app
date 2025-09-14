import { relations } from 'drizzle-orm'
import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  ReferenceConfig,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

// AUTH tables

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isAnonymous: boolean('is_anonymous'),
  role: text('role'),
  banned: boolean('banned'),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  twoFactorEnabled: boolean('two_factor_enabled'),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
    activeOrganizationId: text('active_organization_id'),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),

  logo: text('logo'),
  createdAt: timestamp('created_at').notNull(),
  metadata: text('metadata'),
})

export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').default('member').notNull(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [
    index('member_user_id_idx').on(table.userId),
    index('member_organization_id_idx').on(table.organizationId),
  ],
)

export const invitation = pgTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('invitation_email_idx').on(table.email),
    index('invitation_organization_id_idx').on(table.organizationId),
  ],
)

export const twoFactor = pgTable(
  'two_factor',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('two_factor_secret_idx').on(table.secret)],
)

export const apikey = pgTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    start: text('start'),
    prefix: text('prefix'),
    key: text('key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: timestamp('last_refill_at'),
    enabled: boolean('enabled').notNull().default(true),
    rateLimitEnabled: boolean('rate_limit_enabled').notNull().default(false),
    rateLimitTimeWindow: integer('rate_limit_time_window'),
    rateLimitMax: integer('rate_limit_max'),
    requestCount: integer('request_count').notNull().default(0),
    remaining: integer('remaining'),
    lastRequest: timestamp('last_request'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    permissions: text('permissions'),
    metadata: jsonb('metadata'),
  },
  (table) => [
    index('api_key_user_id_idx').on(table.userId),
    index('api_key_prefix_idx').on(table.prefix),
    index('api_key_enabled_idx').on(table.enabled),
    index('api_key_expires_at_idx').on(table.expiresAt),
  ],
)

const baseColumns = {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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

    datasetId: text('dataset_id')
      .notNull()
      .references(() => dataset.id, { onDelete: 'cascade' }),
    geometriesId: text('geometries_id')
      .notNull()
      .references(() => geometries.id, { onDelete: 'cascade' }),

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
    ...baseColumns,
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
    ...baseColumns,
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
    // TODO: add geometry type
    geometry: jsonb('geometry').notNull(),
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
    ...baseColumns,
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    datasetRunId: text('dataset_run_id')
      .notNull()
      .references(() => datasetRun.id, { onDelete: 'cascade' }),
    geometriesRunId: text('geometries_run_id')
      .notNull()
      .references(() => geometriesRun.id, { onDelete: 'cascade' }),

    //Store product output here, as JSON - and then publish to output
  },
  (table) => [
    index('product_run_dataset_idx').on(table.datasetRunId),
    index('product_run_geometries_idx').on(table.geometriesRunId),
    index('product_run_created_at_idx').on(table.createdAt),
  ],
)

export const productOutput = pgTable(
  'product_output',
  {
    ...baseColumns,
    productRunId: text('product_run_id')
      .notNull()
      .references(() => productRun.id, { onDelete: 'cascade' }),
    geometryOutputId: text('geometry_output_id')
      .notNull()
      .references(() => geometryOutput.id, { onDelete: 'cascade' }),

    value: numeric('value').notNull(),
    variableId: text('variable_id')
      .notNull()
      .references(() => variable.id),

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
    index('product_output_variable_id_idx').on(table.variableId),
    // Composite index for querying outputs by multiple criteria
    index('product_output_run_variable_idx').on(
      table.productRunId,
      table.variableId,
    ),
    unique(
      'product_output_run_variable_time_point_geometry_output_id_unique',
    ).on(
      table.productRunId,
      table.variableId,
      table.timePoint,
      table.geometryOutputId,
    ),
  ],
)

// Table for product output summaries - automatically maintained via triggers
// This table aggregates product outputs from each product's runs
// to provide temporal ranges and variable lists for browsing products
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
    outputCount: integer('output_count').notNull().default(0),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => [
    index('product_output_summary_start_time_idx').on(table.startTime),
    index('product_output_summary_end_time_idx').on(table.endTime),
    index('product_output_summary_last_updated_idx').on(table.lastUpdated),
  ],
)

// Junction table for many-to-many relationship between productOutputSummary and variables
export const productOutputSummaryVariable = pgTable(
  'product_output_summary_variable',
  {
    productRunId: text('product_run_id')
      .notNull()
      .references(() => productOutputSummary.productRunId, {
        onDelete: 'cascade',
      }),
    variableId: text('variable_id')
      .notNull()
      .references(() => variable.id, { onDelete: 'cascade' }),
    // Optional: track aggregated stats per variable
    minValue: numeric('min_value'),
    maxValue: numeric('max_value'),
    avgValue: numeric('avg_value'),
    count: integer('count').notNull().default(0),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => [
    index('summary_variable_product_run_idx').on(table.productRunId),
    index('summary_variable_variable_idx').on(table.variableId),
    // Composite primary key for the junction table
    unique('summary_variable_pk').on(table.productRunId, table.variableId),
  ],
)

// Taxonomy/category tree structure
export const variableCategory = pgTable(
  'variable_category',
  {
    ...baseColumns,

    // Tree structure
    parentId: text('parent_id').references(
      (): AnyPgColumn => variableCategory.id,
      { onDelete: 'set null' },
    ),

    // TODO: add path
    // path: text('path').notNull(), // '/ecology/coverage'
    displayOrder: integer('display_order').default(0),
  },
  (table) => [
    index('variable_category_parent_idx').on(table.parentId),
    index('variable_category_name_idx').on(table.name),
    // Composite index for hierarchical queries with ordering
    index('variable_category_parent_order_idx').on(
      table.parentId,
      table.displayOrder,
    ),
  ],
)

// Actual measurable variables
export const variable = pgTable(
  'variable',
  {
    ...baseColumns,
    unit: text('unit').notNull(),
    displayOrder: integer('display_order').default(0),
    // Link to category
    categoryId: text('category_id').references(() => variableCategory.id, {
      onDelete: 'cascade',
    }),
  },
  (table) => [
    index('variable_category_idx').on(table.categoryId),
    index('variable_name_idx').on(table.name),
    // Composite index for listing variables within a category with ordering
    index('variable_category_order_idx').on(
      table.categoryId,
      table.displayOrder,
    ),
  ],
)

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
  outputSummaryVariables: many(productOutputSummaryVariable),
}))

export const productOutputRelations = relations(productOutput, ({ one }) => ({
  productRun: one(productRun, {
    fields: [productOutput.productRunId],
    references: [productRun.id],
  }),
  geometryOutput: one(geometryOutput, {
    fields: [productOutput.geometryOutputId],
    references: [geometryOutput.id],
  }),
  variable: one(variable, {
    fields: [productOutput.variableId],
    references: [variable.id],
  }),
}))

export const variableCategoryRelations = relations(
  variableCategory,
  ({ one, many }) => ({
    parent: one(variableCategory, {
      fields: [variableCategory.parentId],
      references: [variableCategory.id],
      relationName: 'category_tree',
    }),
    children: many(variableCategory, {
      relationName: 'category_tree',
    }),
    variables: many(variable),
  }),
)

export const variableRelations = relations(variable, ({ one, many }) => ({
  category: one(variableCategory, {
    fields: [variable.categoryId],
    references: [variableCategory.id],
  }),
  productOutputs: many(productOutput),
  productSummaries: many(productOutputSummaryVariable),
}))

export const productOutputSummaryRelations = relations(
  productOutputSummary,
  ({ one, many }) => ({
    productRun: one(productRun, {
      fields: [productOutputSummary.productRunId],
      references: [productRun.id],
    }),
    variables: many(productOutputSummaryVariable),
  }),
)

export const productOutputSummaryVariableRelations = relations(
  productOutputSummaryVariable,
  ({ one }) => ({
    productRun: one(productRun, {
      fields: [productOutputSummaryVariable.productRunId],
      references: [productRun.id],
    }),
    productOutputSummary: one(productOutputSummary, {
      fields: [productOutputSummaryVariable.productRunId],
      references: [productOutputSummary.productRunId],
    }),
    variable: one(variable, {
      fields: [productOutputSummaryVariable.variableId],
      references: [variable.id],
    }),
  }),
)
