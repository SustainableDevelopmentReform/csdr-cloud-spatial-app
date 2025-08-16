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
  slug: text('slug').unique(),
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

// DATA RELATED TABLES

export const dataset = pgTable(
  'dataset',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('dataset_name_idx').on(table.name),
    index('dataset_created_at_idx').on(table.createdAt),
  ],
)

export const geometries = pgTable(
  'geometries',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('geometries_name_idx').on(table.name),
    index('geometries_created_at_idx').on(table.createdAt),
  ],
)

export const timePrecision = pgEnum('time_precision', [
  'hour',
  'day',
  'month',
  'year',
  // 'custom', // TODO: add custom time precision (see productOutput.timeInterval)
])

export const product = pgTable(
  'product',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

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
  ],
)

const baseRunColumns = {
  id: text('id').primaryKey(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // Processing parameters
  parameters: jsonb('parameters'),
}

// Run tables - only created for successful runs
export const datasetRun = pgTable(
  'dataset_run',
  {
    ...baseRunColumns,
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
    ...baseRunColumns,
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
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    geometriesRunId: text('geometries_run_id')
      .notNull()
      .references(() => geometriesRun.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
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
    ...baseRunColumns,
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    datasetRunId: text('dataset_run_id')
      .notNull()
      .references(() => datasetRun.id, { onDelete: 'cascade' }),
    geometriesRunId: text('geometries_run_id')
      .notNull()
      .references(() => geometriesRun.id, { onDelete: 'cascade' }),
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
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
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
  ],
)

// Taxonomy/category tree structure
export const variableCategory = pgTable(
  'variable_category',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),

    // Tree structure
    parentId: text('parent_id').references(
      (): AnyPgColumn => variableCategory.id,
      { onDelete: 'set null' },
    ),

    // TODO: add path
    // path: text('path').notNull(), // '/ecology/coverage'
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    unit: text('unit'),
    displayOrder: integer('display_order').default(0),
    // Link to category
    categoryId: text('category_id')
      .notNull()
      .references(() => variableCategory.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('variable_category_idx').on(table.categoryId),
    unique('variable_name_category_unique').on(table.name, table.categoryId),
    index('variable_name_idx').on(table.name),
    // Composite index for listing variables within a category with ordering
    index('variable_category_order_idx').on(
      table.categoryId,
      table.displayOrder,
    ),
  ],
)

// Relations
export const datasetRelations = relations(dataset, ({ many }) => ({
  runs: many(datasetRun),
  products: many(product),
}))

export const datasetRunRelations = relations(datasetRun, ({ one, many }) => ({
  dataset: one(dataset, {
    fields: [datasetRun.datasetId],
    references: [dataset.id],
  }),
  productRuns: many(productRun),
}))

export const geometriesRelations = relations(geometries, ({ many }) => ({
  runs: many(geometriesRun),
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
}))
