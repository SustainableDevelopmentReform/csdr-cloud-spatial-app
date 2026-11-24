import { DrizzleQueryError } from 'drizzle-orm'
import { type StatusCode } from 'hono/utils/http-status'
import { DatabaseError } from 'pg'

interface ServerErrorOptions {
  data?: unknown
  statusCode?: StatusCode
  message?: string
  description?: string
}

export class ServerError extends Error {
  private statusCode: StatusCode = 500
  public message = 'Something went wrong'
  private data: unknown
  private description: string | null = null

  constructor(options: ServerErrorOptions) {
    super(options.message)
    this.statusCode = options.statusCode || 500
    this.message = options.message || 'Something went wrong'
    this.data = options.data
    this.description = options.description || null
  }

  get response(): {
    statusCode: StatusCode
    message: string
    data: unknown
    description: string | null
  } {
    return {
      statusCode: this.statusCode,
      message: this.message,
      data: this.data || null,
      description: this.description,
    }
  }
}

// Postgres SQLSTATE for foreign_key_violation.
const FOREIGN_KEY_VIOLATION = '23503'

const getDatabaseError = (error: unknown): DatabaseError | null => {
  if (error instanceof DatabaseError) {
    return error
  }
  if (
    error instanceof DrizzleQueryError &&
    error.cause instanceof DatabaseError
  ) {
    return error.cause
  }
  return null
}

/**
 * Maps an unhandled Postgres foreign key violation to a 409 Conflict.
 *
 * A violation means the request conflicts with the current state of related
 * records (for example deleting a record that other records still reference),
 * which is a client-resolvable conflict, not a server fault. Returns null for
 * any other error.
 */
export const foreignKeyConflictError = (
  error: unknown,
  options: { includeDetail?: boolean } = {},
): ServerError | null => {
  const databaseError = getDatabaseError(error)
  if (databaseError?.code !== FOREIGN_KEY_VIOLATION) {
    return null
  }
  return new ServerError({
    statusCode: 409,
    message: 'Conflict with related records',
    description:
      'This change conflicts with related records: the record is still referenced by other records, or it references a record that does not exist.',
    data: options.includeDetail
      ? {
          constraint: databaseError.constraint ?? null,
          table: databaseError.table ?? null,
          detail: databaseError.detail ?? null,
        }
      : undefined,
  })
}
